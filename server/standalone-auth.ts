import type { Express, Request, Response } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// In-memory user store for authentication
const users = new Map<string, {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  nation: string;
  paymentIdentifier: string;
  cpf?: string;
  ssn?: string;
  birthdate: Date;
  password: string;
  createdAt: Date;
}>();

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return buf.toString("hex") === hashedPassword;
  },
};

export function setupStandaloneAuth(app: Express) {
  console.log("[Standalone Auth] Setting up authentication endpoints");

  // Registration endpoint with age validation and international support
  app.post("/signup", async (req: Request, res: Response) => {
    try {
      const { 
        fullName, 
        email, 
        username, 
        password, 
        phoneNumber, 
        nation, 
        paymentIdentifier,
        cpf,
        ssn,
        birthdate 
      } = req.body;

      console.log("[Standalone Auth] Registration request:", { username, email, nation });

      // Validate required fields
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier || !birthdate) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Age validation - must be 18 or older
      const birthDate = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      
      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      
      if (actualAge < 18) {
        return res.status(400).json({ message: "You must be at least 18 years old to use this service" });
      }

      // Country-specific validation
      if (nation === "BR" && !cpf) {
        return res.status(400).json({ message: "CPF is required for Brazilian users" });
      }

      if (nation === "BR" && cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) {
          return res.status(400).json({ message: "CPF must have 11 digits" });
        }
      }

      // Check if username exists
      if (users.has(username)) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email exists
      let emailExists = false;
      users.forEach(user => {
        if (user.email === email) {
          emailExists = true;
        }
      });
      
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user
      const hashedPassword = await crypto.hash(password);
      const newUser = {
        id: Date.now(),
        username,
        email,
        fullName,
        phoneNumber: phoneNumber || undefined,
        nation,
        paymentIdentifier,
        cpf: cpf || undefined,
        ssn: ssn || undefined,
        birthdate: birthDate,
        password: hashedPassword,
        createdAt: new Date(),
      };

      users.set(username, newUser);

      console.log("[Standalone Auth] User registered successfully:", { username, email, nation });

      return res.json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          phoneNumber: newUser.phoneNumber,
          nation: newUser.nation,
          paymentIdentifier: newUser.paymentIdentifier,
        },
      });

    } catch (error: any) {
      console.error("[Standalone Auth] Registration error:", error);
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      console.log("[Standalone Auth] Login attempt:", { username });

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = users.get(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      const isValidPassword = await crypto.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      console.log("[Standalone Auth] Login successful:", { username });

      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          nation: user.nation,
          paymentIdentifier: user.paymentIdentifier,
        },
      });

    } catch (error: any) {
      console.error("[Standalone Auth] Login error:", error);
      res.status(500).json({ message: "Login failed: " + error.message });
    }
  });

  // User endpoint (for checking authentication status)
  app.get("/api/user", (req: Request, res: Response) => {
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    console.log("[Standalone Auth] Logout request");
    return res.json({ message: "Logged out successfully" });
  });

  console.log("[Standalone Auth] Authentication endpoints configured successfully");
}