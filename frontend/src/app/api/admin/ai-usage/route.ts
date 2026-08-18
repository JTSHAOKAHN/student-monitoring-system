import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';
import aiUsageTracker from '@/lib/ai-usage-tracker';

export async function GET(request: Request) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (userId) {
      // Get specific user's usage
      const stats = aiUsageTracker.getUserStats(userId);
      return NextResponse.json({ userId, stats });
    } else {
      // Get all usage (admin overview)
      const allUsage = aiUsageTracker.getAllUsage();
      
      // Calculate totals
      const totals = allUsage.reduce((acc, record) => ({
        totalCost: acc.totalCost + record.costEstimate,
        totalTokens: acc.totalTokens + record.tokensUsed,
        totalQuestions: acc.totalQuestions + record.questionsGenerated,
        totalPdfs: acc.totalPdfs + (record.pdfPages > 0 ? 1 : 0),
      }), { totalCost: 0, totalTokens: 0, totalQuestions: 0, totalPdfs: 0 });

      // Group by user
      const byUser = new Map<string, AIUsageRecord[]>();
      for (const record of allUsage) {
        const userRecords = byUser.get(record.userId) || [];
        userRecords.push(record);
        byUser.set(record.userId, userRecords);
      }

      const userSummaries = Array.from(byUser.entries()).map(([userId, records]) => ({
        userId,
        records: records.length,
        totalCost: records.reduce((sum, r) => sum + r.costEstimate, 0),
        totalTokens: records.reduce((sum, r) => sum + r.tokensUsed, 0),
        totalQuestions: records.reduce((sum, r) => sum + r.questionsGenerated, 0),
        totalPdfs: records.filter(r => r.pdfPages > 0).length,
        lastActivity: Math.max(...records.map(r => r.timestamp)),
      }));

      return NextResponse.json({
        totals,
        userSummaries: userSummaries.sort((a, b) => b.lastActivity - a.lastActivity),
        recentActivity: allUsage.slice(0, 50),
      });
    }
  } catch (error) {
    console.error('AI usage fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI usage' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (userId) {
      // Reset specific user's usage
      aiUsageTracker.resetUserUsage(userId);
      return NextResponse.json({ success: true, message: `Usage reset for user ${userId}` });
    } else {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI usage reset error:', error);
    return NextResponse.json({ error: 'Failed to reset AI usage' }, { status: 500 });
  }
}