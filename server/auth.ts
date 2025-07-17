import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser, passwordResetTokens } from "@db/schema";
import { db } from "@db";
import { eq, sql, and, lt } from "drizzle-orm";
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
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
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
    // 1. generate & store token
    const token = await genAndStoreToken(email);
    const baseUrl = process.env.REPLIT_DOMAIN || `${req.protocol}://${req.get('host')}`;
    const link  = `${baseUrl}/confirm-reset?token=${token}`;
    // 2. send email from hjalmar@hedgi.ai
    await transporter.sendMail({
      to:      email,
      from:    "hjalmar@hedgi.ai",
      subject: "Reset your password",
      html:    `<p>Click <a href="${link}">here</a> to reset your password.</p>`
    });
    res.json({ message: "If that email exists, you’ll get a link shortly." });
  });

  app.get("/api/confirm-reset", async (req, res) => {
    const { token } = req.query as { token: string };
    
    if (!token) {
      return res.status(400).send("No token provided");
    }
    
    // Don't consume the token here, just validate it exists and isn't expired
    // We'll consume it when the user actually resets their password
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          lt(new Date(), passwordResetTokens.expiresAt)
        )
      )
      .limit(1);
    
    if (!tokenRecord) {
      return res.status(400).send("Invalid or expired reset link");
    }
    
    // Redirect to your React reset-page with the token
    return res.redirect(`/reset-password?token=${token}`);
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