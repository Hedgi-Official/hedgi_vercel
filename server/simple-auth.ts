import { type Express } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

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

export function setupSimpleAuth(app: Express) {
  // Simple registration endpoint that works
  app.post("/api/simple-register", async (req, res) => {
    try {
      const { fullName, email, username, password, phoneNumber } = req.body;

      // Basic validation
      if (!fullName || !email || !username || !password) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Use direct database connection to create user
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      await client.connect();

      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [username, email]
        );

        if (existingUser.rows.length > 0) {
          await client.end();
          return res.status(400).json({ message: "Username or email already exists" });
        }

        // Insert new user
        const result = await client.query(
          `INSERT INTO users (username, email, full_name, phone_number, password, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW()) 
           RETURNING id, username, email, full_name, phone_number, created_at`,
          [username, email, fullName, phoneNumber || null, hashedPassword]
        );

        await client.end();

        const newUser = result.rows[0];
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.full_name,
            phoneNumber: newUser.phone_number,
          },
        });

      } catch (dbError: any) {
        await client.end();
        throw dbError;
      }

    } catch (error: any) {
      console.error("Simple registration error:", error);
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  });
}