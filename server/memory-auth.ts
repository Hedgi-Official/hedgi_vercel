import type { Express, Request, Response } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// In-memory user storage
const users = new Map();
let userIdCounter = 1;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return buf.toString("hex") === hashedPassword;
}

export function setupMemoryAuth(app: Express) {
  console.log("[Memory Auth] Setting up memory-based authentication");

  // Registration endpoint
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

      console.log("[Memory Auth] Registration attempt for:", username);

      // Basic validation
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier || !birthdate) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Age validation - must be 18 or older
      const birthDate = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        return res.status(400).json({ message: "You must be at least 18 years old to register" });
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
      users.forEach((user) => {
        if (user.email === email) {
          emailExists = true;
        }
      });
      
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const newUser = {
        id: userIdCounter++,
        username,
        email,
        fullName,
        phoneNumber: phoneNumber || null,
        nation,
        paymentIdentifier,
        cpf: cpf || null,
        ssn: ssn || null,
        birthdate: birthDate.toISOString(),
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };

      users.set(username, newUser);

      console.log("[Memory Auth] User registered successfully:", username);

      // Return user data (without password)
      const { password: _, ...userResponse } = newUser;
      return res.status(201).json({
        message: "Registration successful",
        user: userResponse,
      });

    } catch (error) {
      console.error("[Memory Auth] Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      console.log("[Memory Auth] Login attempt for:", username);

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = users.get(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      console.log("[Memory Auth] Login successful:", username);

      // Return user data (without password)
      const { password: _, ...userResponse } = user;
      return res.json({
        message: "Login successful",
        user: userResponse,
      });

    } catch (error) {
      console.error("[Memory Auth] Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // User endpoint (for checking authentication status)
  app.get("/api/user", (req: Request, res: Response) => {
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    console.log("[Memory Auth] Logout request");
    return res.json({ message: "Logged out successfully" });
  });

  console.log("[Memory Auth] Memory-based authentication setup complete");
}