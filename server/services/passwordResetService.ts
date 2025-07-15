import { createHash, randomBytes } from 'crypto';
import { db } from '@db';
import { users, resetTokens } from '@db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { emailService } from './emailService';
import bcrypt from 'bcrypt';

export class PasswordResetService {
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.email, email)
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: "If that email exists, you'll receive reset instructions."
        };
      }

      // Generate secure token
      const plainToken = this.generateSecureToken();
      const tokenHash = this.hashToken(plainToken);
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Clean up any existing tokens for this user
      await db.delete(resetTokens).where(eq(resetTokens.userId, user.id));

      // Insert new reset token
      await db.insert(resetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Send email
      const emailSent = await emailService.sendPasswordResetEmail(email, plainToken);
      
      if (!emailSent) {
        console.error('[Password Reset] Failed to send email to:', email);
        return {
          success: false,
          message: 'Failed to send reset email. Please try again.'
        };
      }

      return {
        success: true,
        message: "If that email exists, you'll receive reset instructions."
      };
    } catch (error) {
      console.error('[Password Reset] Error requesting reset:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.'
      };
    }
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    try {
      const tokenHash = this.hashToken(token);
      
      // Find valid token
      const resetToken = await db.query.resetTokens.findFirst({
        where: and(
          eq(resetTokens.tokenHash, tokenHash),
          eq(resetTokens.used, false)
        )
      });

      if (!resetToken) {
        return { valid: false };
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        // Clean up expired token
        await db.delete(resetTokens).where(eq(resetTokens.id, resetToken.id));
        return { valid: false };
      }

      return { valid: true, userId: resetToken.userId };
    } catch (error) {
      console.error('[Password Reset] Error validating token:', error);
      return { valid: false };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const tokenHash = this.hashToken(token);
      
      // Find and validate token
      const resetToken = await db.query.resetTokens.findFirst({
        where: and(
          eq(resetTokens.tokenHash, tokenHash),
          eq(resetTokens.used, false)
        )
      });

      if (!resetToken) {
        return {
          success: false,
          message: 'Invalid or expired reset token.'
        };
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await db.delete(resetTokens).where(eq(resetTokens.id, resetToken.id));
        return {
          success: false,
          message: 'Reset token has expired.'
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used and delete it
      await db.delete(resetTokens).where(eq(resetTokens.id, resetToken.id));

      return {
        success: true,
        message: 'Password reset successful.'
      };
    } catch (error) {
      console.error('[Password Reset] Error resetting password:', error);
      return {
        success: false,
        message: 'An error occurred while resetting password.'
      };
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      await db.delete(resetTokens).where(lt(resetTokens.expiresAt, now));
      console.log('[Password Reset] Expired tokens cleaned up');
    } catch (error) {
      console.error('[Password Reset] Error cleaning up expired tokens:', error);
    }
  }
}

export const passwordResetService = new PasswordResetService();