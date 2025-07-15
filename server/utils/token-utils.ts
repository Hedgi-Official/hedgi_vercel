import { randomBytes, createHash } from 'crypto';
import { db } from "@db";
import { users, passwordResetTokens } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Generate a secure token and store it in the database
 * @param email - User's email address
 * @returns The plain token for the reset link, or null if user not found
 */
export async function genAndStoreToken(email: string): Promise<string | null> {
  try {
    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0) {
      return null; // User not found
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user[0].id));
    
    // Store the hashed token
    await db.insert(passwordResetTokens).values({
      userId: user[0].id,
      tokenHash,
      expiresAt,
    });
    
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    return null;
  }
}

/**
 * Validate a token and return the user ID if valid
 * @param token - The plain token from the reset link
 * @returns The user ID if valid, null otherwise
 */
export async function validateAndConsumeToken(token: string): Promise<number | null> {
  try {
    // Hash the incoming token
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    // Find non-expired token
    const tokenRecord = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (tokenRecord.length === 0) {
      return null; // Token not found or expired
    }
    
    const userId = tokenRecord[0].userId;
    
    // Delete the token (consume it)
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRecord[0].id));
    
    return userId;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Clean up expired tokens (should be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db.delete(passwordResetTokens).where(gt(new Date(), passwordResetTokens.expiresAt));
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}

