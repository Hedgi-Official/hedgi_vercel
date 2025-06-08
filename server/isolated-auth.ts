import type { Express, Request, Response } from "express";

// Simple in-memory storage
const registeredUsers = new Set<string>();

export function setupIsolatedAuth(app: Express) {
  console.log("[Isolated Auth] Setting up completely isolated authentication");

  // Test endpoint
  app.get("/test", (req: Request, res: Response) => {
    res.json({ message: "Test endpoint working", timestamp: new Date().toISOString() });
  });

  // Registration endpoint - completely isolated
  app.post("/signup", (req: Request, res: Response) => {
    try {
      console.log("[Isolated Auth] Registration request received");
      
      const { fullName, email, username, password, nation, paymentIdentifier, cpf, birthdate } = req.body;

      // Basic validation
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier || !birthdate) {
        console.log("[Isolated Auth] Missing required fields");
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Age validation
      const birthDate = new Date(birthdate);
      const today = new Date();
      const ageInMs = today.getTime() - birthDate.getTime();
      const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
      
      if (ageInYears < 18) {
        console.log("[Isolated Auth] User under 18");
        return res.status(400).json({ message: "You must be at least 18 years old to register" });
      }

      // Country-specific validation
      if (nation === "BR" && !cpf) {
        console.log("[Isolated Auth] Missing CPF for Brazilian user");
        return res.status(400).json({ message: "CPF is required for Brazilian users" });
      }

      // Check if user already exists
      if (registeredUsers.has(username)) {
        console.log("[Isolated Auth] Username already exists");
        return res.status(400).json({ message: "Username already exists" });
      }

      // Register user
      registeredUsers.add(username);

      console.log("[Isolated Auth] User registered successfully:", username);

      return res.status(201).json({
        message: "Registration successful",
        user: {
          username,
          email,
          fullName,
          nation,
          paymentIdentifier,
        },
      });

    } catch (error) {
      console.error("[Isolated Auth] Registration error:", error);
      return res.status(500).json({ message: "Registration failed due to internal error" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    if (registeredUsers.has(username)) {
      return res.json({
        message: "Login successful",
        user: { username, email: `${username}@example.com` },
      });
    }
    
    return res.status(400).json({ message: "Invalid credentials" });
  });

  // User status endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    return res.json({ message: "Logged out successfully" });
  });

  console.log("[Isolated Auth] Isolated authentication setup complete");
}