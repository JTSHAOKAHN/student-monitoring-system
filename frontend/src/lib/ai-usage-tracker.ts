// AI Usage Tracking and Cost Control
// Track Gemini API usage, implement per-user limits, and monitor quotas

interface AIUsageRecord {
  userId: string;
  timestamp: number;
  pdfPages: number;
  questionsGenerated: number;
  tokensUsed: number;
  costEstimate: number;
}

class AIUsageTracker {
  private usage: Map<string, AIUsageRecord[]> = new Map();
  private dailyLimits: Map<string, { limit: number; resetAt: number }> = new Map();
  
  // Cost estimates (in USD) - adjust based on actual Gemini pricing
  private readonly COST_PER_1K_TOKENS = 0.001; // Example: $0.001 per 1K tokens
  private readonly COST_PER_PAGE = 0.01; // Example: $0.01 per PDF page
  private readonly COST_PER_QUESTION = 0.005; // Example: $0.005 per question

  // Default limits
  private readonly DEFAULT_DAILY_TOKEN_LIMIT = 100000; // 100K tokens per day
  private readonly DEFAULT_DAILY_QUESTION_LIMIT = 500; // 500 questions per day
  private readonly DEFAULT_DAILY_PDF_LIMIT = 20; // 20 PDFs per day

  /**
   * Record AI usage for a user
   */
  recordUsage(userId: string, pdfPages: number, questionsGenerated: number, tokensUsed: number): void {
    const record: AIUsageRecord = {
      userId,
      timestamp: Date.now(),
      pdfPages,
      questionsGenerated,
      tokensUsed,
      costEstimate: this.calculateCost(pdfPages, questionsGenerated, tokensUsed),
    };

    const userUsage = this.usage.get(userId) || [];
    userUsage.push(record);
    this.usage.set(userId, userUsage);

    // Clean up old records (older than 24 hours)
    this.cleanupOldRecords(userId);
  }

  /**
   * Check if user has exceeded daily limits
   */
  checkDailyLimit(userId: string, type: 'tokens' | 'questions' | 'pdfs'): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const userUsage = this.usage.get(userId) || [];
    const todayUsage = userUsage.filter(record => record.timestamp > dayAgo);

    let used = 0;
    let limit = 0;

    switch (type) {
      case 'tokens':
        used = todayUsage.reduce((sum, r) => sum + r.tokensUsed, 0);
        limit = this.DEFAULT_DAILY_TOKEN_LIMIT;
        break;
      case 'questions':
        used = todayUsage.reduce((sum, r) => sum + r.questionsGenerated, 0);
        limit = this.DEFAULT_DAILY_QUESTION_LIMIT;
        break;
      case 'pdfs':
        used = todayUsage.filter(r => r.pdfPages > 0).length;
        limit = this.DEFAULT_DAILY_PDF_LIMIT;
        break;
    }

    const remaining = Math.max(0, limit - used);
    const resetAt = this.getResetTime(userId);

    return {
      allowed: used < limit,
      remaining,
      resetAt,
    };
  }

  /**
   * Get usage statistics for a user
   */
  getUserStats(userId: string): {
    today: { tokensUsed: number; questionsGenerated: number; pdfsProcessed: number; costEstimate: number };
    total: { tokensUsed: number; questionsGenerated: number; pdfsProcessed: number; costEstimate: number };
  } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const userUsage = this.usage.get(userId) || [];
    const todayUsage = userUsage.filter(record => record.timestamp > dayAgo);

    const todayStats = {
      tokensUsed: todayUsage.reduce((sum, r) => sum + r.tokensUsed, 0),
      questionsGenerated: todayUsage.reduce((sum, r) => sum + r.questionsGenerated, 0),
      pdfsProcessed: todayUsage.filter(r => r.pdfPages > 0).length,
      costEstimate: todayUsage.reduce((sum, r) => sum + r.costEstimate, 0),
    };

    const totalStats = {
      tokensUsed: userUsage.reduce((sum, r) => sum + r.tokensUsed, 0),
      questionsGenerated: userUsage.reduce((sum, r) => sum + r.questionsGenerated, 0),
      pdfsProcessed: userUsage.filter(r => r.pdfPages > 0).length,
      costEstimate: userUsage.reduce((sum, r) => sum + r.costEstimate, 0),
    };

    return { today: todayStats, total: totalStats };
  }

  /**
   * Get all usage records (for admin monitoring)
   */
  getAllUsage(): AIUsageRecord[] {
    const allRecords: AIUsageRecord[] = [];
    for (const records of this.usage.values()) {
      allRecords.push(...records);
    }
    return allRecords.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Reset usage for a user (admin function)
   */
  resetUserUsage(userId: string): void {
    this.usage.delete(userId);
  }

  /**
   * Calculate cost estimate
   */
  private calculateCost(pdfPages: number, questionsGenerated: number, tokensUsed: number): number {
    const pdfCost = pdfPages * this.COST_PER_PAGE;
    const questionCost = questionsGenerated * this.COST_PER_QUESTION;
    const tokenCost = (tokensUsed / 1000) * this.COST_PER_1K_TOKENS;
    return pdfCost + questionCost + tokenCost;
  }

  /**
   * Clean up records older than 24 hours
   */
  private cleanupOldRecords(userId: string): void {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const userUsage = this.usage.get(userId) || [];
    const recentUsage = userUsage.filter(record => record.timestamp > dayAgo);
    this.usage.set(userId, recentUsage);
  }

  /**
   * Get reset time for daily limits
   */
  private getResetTime(userId: string): number {
    const userUsage = this.usage.get(userId) || [];
    if (userUsage.length === 0) {
      return Date.now() + 24 * 60 * 60 * 1000;
    }

    const oldestRecord = userUsage.reduce((oldest, current) => 
      current.timestamp < oldest.timestamp ? current : oldest
    );

    return oldestRecord.timestamp + 24 * 60 * 60 * 1000;
  }
}

// Singleton instance
const aiUsageTracker = new AIUsageTracker();

export default aiUsageTracker;
export type { AIUsageRecord };
