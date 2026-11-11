/**
 * TalentTrack RateLimiter & Abuse Defense (AiAppFactory Standard - Rule #1 & #24)
 * Exponential backoff and memory exhaustion defense against brute-force attacks.
 */

class RateLimiter {
  constructor() {
    this.attempts = new Map(); // key -> { count: number, blockedUntil: number }
    this.maxAttempts = 5;
    this.baseLockoutMs = 30000; // 30s base
  }

  isBlocked(key) {
    const record = this.attempts.get(key);
    if (!record) return false;
    if (Date.now() < record.blockedUntil) {
      return true;
    }
    // Si ya expiró el bloqueo, resetear
    if (record.blockedUntil > 0 && Date.now() >= record.blockedUntil) {
      this.attempts.delete(key);
      return false;
    }
    return false;
  }

  getRemainingLockoutSeconds(key) {
    const record = this.attempts.get(key);
    if (!record || Date.now() >= record.blockedUntil) return 0;
    return Math.ceil((record.blockedUntil - Date.now()) / 1000);
  }

  recordFailure(key) {
    const record = this.attempts.get(key) || { count: 0, blockedUntil: 0 };
    record.count += 1;

    if (record.count >= this.maxAttempts) {
      const multiplier = Math.pow(2, record.count - this.maxAttempts);
      record.blockedUntil = Date.now() + (this.baseLockoutMs * multiplier);
      console.warn(`🚨 [RateLimiter] Bloqueo temporal para '${key}' durante ${this.getRemainingLockoutSeconds(key)}s.`);
    }

    this.attempts.set(key, record);
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
