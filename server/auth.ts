import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser, passwordResetTokens, inviteCodes } from "@db/schema";
import { db, pool } from "@db";
import { eq, sql, and, gt, isNull } from "drizzle-orm";
import nodemailer from "nodemailer";
import { genAndStoreToken, validateAndConsumeToken } from "./token-utils";

/**
 * Atomically claim a beta invite code. Returns true if the code existed
 * and was unused at the moment of the UPDATE, false otherwise. Concurrent
 * registrations using the same code are guaranteed to see exactly one true.
 */
async function consumeInviteCode(rawCode: string | undefined): Promise<boolean> {
  const code = rawCode?.trim();
  if (!code) return false;
  const claimed = await db
    .update(inviteCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedAt)))
    .returning({ code: inviteCodes.code });
  return claimed.length === 1;
}

/**
 * Release a previously-claimed invite code back to the unused pool.
 * Used when registration fails after the claim succeeded, so a real
 * user doesn't burn a code they never got an account from.
 */
async function releaseInviteCode(rawCode: string | undefined): Promise<void> {
  const code = rawCode?.trim();
  if (!code) return;
  try {
    await db
      .update(inviteCodes)
      .set({ usedAt: null, usedByUserId: null })
      .where(eq(inviteCodes.code, code));
  } catch (err) {
    console.error('[releaseInviteCode] Failed to release code:', err);
  }
}

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || process.env.REPL_ID;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production (REPL_ID accepted as legacy fallback)."
    );
  }

  // Postgres-backed session store (Neon pool reused from db/index.ts).
  // Persistent across serverless invocations and shared between deploys.
  // Cast to any: connect-pg-simple's pg-style typings don't quite match
  // @neondatabase/serverless's Pool, but the runtime API surface used
  // (query) is identical.
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool: pool as any,
    tableName: "session",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60, // prune expired sessions every hour
  });

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "porygon-supremacy-dev-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
    store,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('[passport] Login attempt for username:', username);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log('[passport] User not found for username:', username);
          return done(null, false, { message: "Incorrect username." });
        }
        
        console.log('[passport] User found, verifying password...');
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log('[passport] Password verification failed');
          return done(null, false, { message: "Incorrect password." });
        }
        console.log('[passport] Login successful');
        return done(null, user);
      } catch (err) {
        console.error('[passport] Login error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Reset Password Endpoint
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.HEDGI_APP_SECRET 
    }
  })

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    // Basic validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Valid email required" });
    }
    
    try {
      // First check if user exists without generating token
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);
      
      if (!user) {
        // User doesn't exist - return success message immediately without any processing
        console.log('[forgot-password] User not found for email, skipping all processing');
        return res.json({ message: "If that email exists, you'll get a link shortly." });
      }
      
      // User exists, proceed with token generation and email sending
      const token = await genAndStoreToken(email);
      
      if (!token) {
        // This shouldn't happen since we verified user exists, but safety check
        return res.status(500).json({ error: "Unable to process request" });
      }
      
      const baseUrl =
        process.env.APP_URL ||
        process.env.REPLIT_DOMAIN ||
        `${req.protocol}://${req.get('host')}`;
      const link = `${baseUrl}/reset-password?token=${token}`;
      
      console.log('[forgot-password] Generated link:', link);
      console.log('[forgot-password] Base URL:', baseUrl);
      console.log('[forgot-password] Token length:', token.length);
      
      // Send email from hjalmar@hedgi.ai with enhanced security message and Hedgi green button
      const emailResult = await transporter.sendMail({
        to: email,
        from: "hjalmar@hedgi.ai",
        subject: "Reset your Hedgi password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Reset Your Hedgi Password</h2>
            <p>You requested to reset your password. Click the secure link below to create a new password:</p>
            <div style="margin: 20px 0;">
              <a href="${link}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Security notice:</strong> This link expires in 1 hour and can only be used once. If you didn't request this, please ignore this email.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Link: <a href="${link}">${link}</a>
            </p>
          </div>
        `
      });
      
      console.log('[forgot-password] Email sent successfully:', emailResult.messageId);
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: "Unable to process request" });
    }
    res.json({ message: "If that email exists, you’ll get a link shortly." });
  });

  // API endpoint to validate token without consuming it
  app.get("/api/validate-reset-token", async (req, res) => {
    const { token } = req.query as { token: string };
    
    if (!token) {
      console.log('[validate-reset-token] No token provided');
      return res.status(400).json({ error: "No token provided" });
    }
    
    try {
      // Validate token exists and isn't expired (don't consume it yet)
      const tokenHash = createHash('sha256').update(token).digest('hex');
      console.log('[validate-reset-token] Token hash:', tokenHash.substring(0, 10) + '...');
      
      // First, let's check if there are any tokens in the database at all
      const allTokens = await db.select().from(passwordResetTokens);
      console.log('[validate-reset-token] Total tokens in DB:', allTokens.length);
      
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!tokenRecord) {
        console.log('[validate-reset-token] Token not found or expired');
        // Let's check if the token exists without expiry check
        const [tokenWithoutExpiry] = await db
          .select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.tokenHash, tokenHash))
          .limit(1);
        
        if (tokenWithoutExpiry) {
          console.log('[validate-reset-token] Token exists but expired. Expiry:', tokenWithoutExpiry.expiresAt);
        } else {
          console.log('[validate-reset-token] Token hash not found in database');
        }
        
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      
      console.log('[validate-reset-token] Token validated successfully');
      return res.json({ valid: true });
    } catch (error) {
      console.error('[validate-reset-token] Error:', error);
      return res.status(500).json({ error: "Token validation failed" });
    }
  });
  app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    const userId = await validateAndConsumeToken(token);
    if (!userId) return res.status(400).json({ error: "Invalid or expired token." });
    
    // Hash the new password
    const hashedPassword = await crypto.hash(newPassword);
    
    // Update the user's password in the database
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    res.json({ message: "Password has been reset." });
  })

  app.post("/api/register", async (req, res, next) => {
    const { inviteCode } = req.body;

    // Atomically claim the invite code first. If the rest of registration
    // fails, we release the claim so the code stays available.
    const claimed = await consumeInviteCode(inviteCode);
    if (!claimed) {
      console.log(`[register] Invalid or already-used invite code: "${inviteCode}"`);
      return res.status(400).send("Valid invite code required for beta access");
    }
    console.log(`[register] Invite code "${inviteCode?.trim()}" claimed`);

    let userCreated = false;
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, email } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(400).send("Email already exists");
      }

      const hashedPassword = await crypto.hash(result.data.password);

      const [createdUser] = await db
        .insert(users)
        .values({
          username: result.data.username,
          email: result.data.email,
          fullName: result.data.fullName,
          phoneNumber: result.data.phoneNumber || null,
          nation: result.data.nation || null,
          paymentIdentifier: result.data.paymentIdentifier || null,
          cpf: result.data.cpf || null,
          birthdate: result.data.birthdate ? new Date(result.data.birthdate) : null,
          password: hashedPassword,
          googleCalendarEnabled: false,
          googleRefreshToken: null,
          userType: result.data.userType || 'individual',
          companyName: result.data.companyName || null,
          companyRole: result.data.companyRole || null,
        })
        .returning();

      userCreated = true;

      // Best-effort: link the claimed code to the new user for auditing.
      try {
        await db
          .update(inviteCodes)
          .set({ usedByUserId: createdUser.id })
          .where(eq(inviteCodes.code, inviteCode.trim()));
      } catch (linkErr) {
        console.error('[register] Failed to link invite code to user (non-fatal):', linkErr);
      }

      // Log the user in after registration
      req.login(createdUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { 
            id: createdUser.id, 
            username: createdUser.username,
            email: createdUser.email,
            fullName: createdUser.fullName,
            phoneNumber: createdUser.phoneNumber,
            nation: createdUser.nation,
            paymentIdentifier: createdUser.paymentIdentifier,
            cpf: createdUser.cpf,
            userType: createdUser.userType,
            companyName: createdUser.companyName,
            companyRole: createdUser.companyRole,
          },
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    } finally {
      if (!userCreated) {
        await releaseInviteCode(inviteCode);
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: { 
            id: user.id, 
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user;
      return res.json(userWithoutPassword);
    }

    res.status(401).send("Not logged in");
  });
}