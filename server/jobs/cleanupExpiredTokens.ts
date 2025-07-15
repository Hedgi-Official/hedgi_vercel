import { passwordResetService } from '../services/passwordResetService';

// Clean up expired reset tokens every hour
export function startTokenCleanupJob() {
  // Run immediately
  passwordResetService.cleanupExpiredTokens();
  
  // Then run every hour
  setInterval(() => {
    passwordResetService.cleanupExpiredTokens();
  }, 60 * 60 * 1000); // 1 hour in milliseconds
  
  console.log('[Token Cleanup] Job started - will run every hour');
}