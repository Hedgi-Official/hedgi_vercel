import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedTestUser() {
  console.log("Creating HedgiTest user...");
  
  const hashedPassword = await hashPassword("Hedgi1!");
  const apiKey = process.env.HEDGI_TEST_API_KEY || "";
  
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, "HedgiTest"))
      .limit(1);
    
    if (existingUser) {
      console.log("HedgiTest user already exists, updating...");
      await db
        .update(users)
        .set({
          password: hashedPassword,
          apiKey: apiKey,
          userType: "business",
          companyName: "Hedgi Test Company",
          companyRole: "Developer",
        })
        .where(eq(users.username, "HedgiTest"));
      console.log("HedgiTest user updated!");
    } else {
      await db.insert(users).values({
        username: "HedgiTest",
        email: "test@hedgi.ai",
        fullName: "Hedgi Test User",
        password: hashedPassword,
        userType: "business",
        companyName: "Hedgi Test Company",
        companyRole: "Developer",
        nation: "BR",
        apiKey: apiKey,
      });
      console.log("HedgiTest user created!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

seedTestUser();
