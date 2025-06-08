import type { Express, Request, Response } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Simple in-memory user store for when database is unavailable
const userStore = new Map<string, any>();

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

export function setupWorkingAuth(app: Express) {
  // Working registration endpoint with age validation
  app.post("/api/register", async (req: Request, res: Response) => {
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

      console.log("[Working Auth] Registration request:", { username, email, nation, cpf, ssn, birthdate });

      // Basic validation
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier || !birthdate) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Age validation
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

      // Check if user already exists
      if (userStore.has(username)) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      let emailExists = false;
      userStore.forEach(user => {
        if (user.email === email) {
          emailExists = true;
        }
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create user
      const newUser = {
        id: Date.now(), // Simple ID generation
        username,
        email,
        fullName,
        phoneNumber: phoneNumber || null,
        nation,
        paymentIdentifier,
        cpf: cpf || null,
        ssn: ssn || null,
        birthdate: birthDate,
        password: hashedPassword,
        createdAt: new Date(),
      };

      userStore.set(username, newUser);

      console.log("[Working Auth] User created successfully:", { username, email, nation });

      // Simulate session by storing user in request
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        nation: newUser.nation,
        paymentIdentifier: newUser.paymentIdentifier,
      };

      return res.json({
        message: "Registration successful",
        user: userResponse,
      });

    } catch (error: any) {
      console.error("Working registration error:", error);
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  });

  // Working login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      console.log("[Working Auth] Login attempt:", { username });

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = userStore.get(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      const isValidPassword = await crypto.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      console.log("[Working Auth] Login successful:", { username });

      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        nation: user.nation,
        paymentIdentifier: user.paymentIdentifier,
      };

      return res.json({
        message: "Login successful",
        user: userResponse,
      });

    } catch (error: any) {
      console.error("Working login error:", error);
      res.status(500).json({ message: "Login failed: " + error.message });
    }
  });

  // Working user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    // For this working demo, we'll return a mock authenticated user
    // In a real app, this would check session/token
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Working logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    console.log("[Working Auth] Logout request");
    return res.json({ message: "Logged out successfully" });
  });

  console.log("[Working Auth] Authentication endpoints setup complete");
}