// Rate limiting utility for API endpoints
// In-memory implementation - for production with multiple instances, use Redis or similar

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if a request is allowed
   * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
   * @param maxRequests - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and retry time if not allowed
   */
  checkRateLimit(key: string, maxRequests: number, windowMs: number): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      // First request or window expired, create new entry
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { allowed: true };
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment count
    entry.count++;
    return { allowed: true };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset a specific rate limit entry
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limit entries
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Get current usage statistics
   */
  getStats(key: string): { count: number; resetAt: number } | null {
    const entry = this.limits.get(key);
    return entry ? { count: entry.count, resetAt: entry.resetAt } : null;
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Helper function for easier usage
function checkRateLimit(key: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  retryAfter?: number;
} {
  return rateLimiter.checkRateLimit(key, maxRequests, windowMs);
}

export { rateLimiter, checkRateLimit };
