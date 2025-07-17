import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser, passwordResetTokens } from "@db/schema";
import { db } from "@db";
import { eq, sql, and, lt, gt } from "drizzle-orm";
import fs from 'node:fs';
import nodemailer from "nodemailer";
import cryptoLib from "crypto";
import { genAndStoreToken, validateAndConsumeToken } from "./token-utils"; 

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
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
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
      // Generate and store token - returns null if user doesn't exist
      const token = await genAndStoreToken(email);
      
      if (!token) {
        // User doesn't exist, but return success message to avoid email enumeration
        console.log('[forgot-password] No user found for email, not sending email');
        return res.json({ message: "If that email exists, you'll get a link shortly." });
      }
      
      const baseUrl = process.env.REPLIT_DOMAIN || `${req.protocol}://${req.get('host')}`;
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
  // Helper function to send verification email

  // Helper functions for reading and writing to .env file
  const readEnvFile = () => {
    try {
      return fs.readFileSync(".env", "utf-8");
    } catch (error) {
      console.error("Error reading .env file:", error);
      return "";
    }
  };

  const writeEnvFile = (data: string) => {
    try {
      fs.writeFileSync(".env", data, "utf-8");
    } catch (error) {
      console.error("Error writing to .env file:", error);
    }
  };

  const removeInviteCodeFromEnv = (usedCode: string) => {
    try {
      console.log(`[removeInviteCodeFromEnv] Attempting to remove code: "${usedCode}"`);

      const envContent = readEnvFile();

      const lines = envContent.split('\n');
      

      const updatedLines = lines.map(line => {
        if (line.startsWith('BETA_INVITE_CODES=')) {
          const currentCodes = line.substring('BETA_INVITE_CODES='.length);
          

          const codeArray = currentCodes.split(',').map(code => code.trim());
          

          const remainingCodes = codeArray.filter(code => code !== usedCode.trim());
          

          const newLine = `BETA_INVITE_CODES=${remainingCodes.join(', ')}`;
          console.log(`[removeInviteCodeFromEnv] New line: "${newLine}"`);
          return newLine;
        }
        return line;
      });

      console.log(`[removeInviteCodeFromEnv] Writing updated content to .env file`);
      writeEnvFile(updatedLines.join('\n'));

      // Update the runtime environment variable as well
      const newEnvValue = updatedLines
        .find(line => line.startsWith('BETA_INVITE_CODES='))
        ?.substring('BETA_INVITE_CODES='.length) || '';

      process.env.BETA_INVITE_CODES = newEnvValue;
    } catch (error) {
      console.error('[removeInviteCodeFromEnv] Error removing invite code from .env:', error);
    }
  };


  app.post("/api/register", async (req, res, next) => {
    try {
      // Check invite code first (for beta access)
      const { inviteCode } = req.body;
      console.log(`[register] Received invite code: "${inviteCode}"`);

      const validCodes = process.env.BETA_INVITE_CODES?.split(',').map(code => code.trim()) || [];
      console.log(`[register] Valid codes from environment:`, validCodes);

      // Require invite code for beta access
      if (!inviteCode || !validCodes.includes(inviteCode.trim())) {
        console.log(`[register] Invalid invite code: "${inviteCode}" not found in valid codes`);
        return res.status(400).send("Valid invite code required for beta access");
      }

      console.log(`[register] Valid invite code found, proceeding with registration`);

      // Remove used code from .env file to make it truly one-time use
      removeInviteCodeFromEnv(inviteCode.trim());

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, email } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Check if email already exists
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(400).send("Email already exists");
      }



      // Hash the password
      const hashedPassword = await crypto.hash(result.data.password);

      // Create user using the Drizzle ORM
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
          googleRefreshToken: null
        })
        .returning();

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
            cpf: createdUser.cpf
          },
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
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