import { db } from "../db";
import { users } from "../db/schema";
import bcrypt from "bcrypt";

async function createTestAccount() {
  try {
    const hashedPassword = await bcrypt.hash("testpass123", 10);
    
    const newUser = await db.insert(users).values({
      fullName: "Test User",
      email: "test@example.com", 
      username: "testuser",
      password: hashedPassword
    }).returning();
    
    console.log("✅ Test account created successfully:", newUser[0].username);
    console.log("📧 Email:", newUser[0].email);
    console.log("🔑 Password: testpass123");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test account:", error);
    process.exit(1);
  }
}

createTestAccount();