import { randomBytes, createHash } from "crypto";
import { db } from "@db";
import { passwordResetTokens, users } from "@db/schema";
import { eq, and, lt } from "drizzle-orm";

export async function genAndStoreToken(email: string): Promise<string> {
  // Generate a cryptographically secure random token
  const plainToken = randomBytes(32).toString('hex');
  
  // Hash the token using SHA-256
  const tokenHash = createHash('sha256').update(plainToken).digest('hex');
  
  // Find user by email
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user) {
    // Still return a token to avoid timing attacks, but don't store it
    return plainToken;
  }
  
  // Set expiry to 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  
  // Insert the token hash into the database
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt
  });
  
  return plainToken;
}

export async function validateAndConsumeToken(token: string): Promise<number | null> {
  // Hash the incoming token
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  // Look up non-expired row
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
    return null;
  }
  
  // Delete the token (consume it)
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, tokenRecord.id));
  
  return tokenRecord.userId;
}