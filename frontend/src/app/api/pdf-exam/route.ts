import { NextResponse } from 'next/server';
import { processPDFWithGemini } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rate-limiter';
import aiUsageTracker from '@/lib/ai-usage-tracker';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_PDF_REQUESTS_PER_HOUR = 10;
const PDF_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    // Get authenticated user for cost tracking
    const { profile } = await getAuthenticatedProfile();
    const userId = profile?.id || 'anonymous';

    // Check AI usage limits
    const pdfLimit = aiUsageTracker.checkDailyLimit(userId, 'pdfs');
    if (!pdfLimit.allowed) {
      return NextResponse.json({ 
        error: 'Daily PDF processing limit reached.',
        retryAfter: Math.ceil((pdfLimit.resetAt - Date.now()) / 1000 / 60), // minutes
        resetAt: new Date(pdfLimit.resetAt).toISOString()
      }, { status: 429 });
    }

    // Rate limiting based on IP (simplified - in production use user ID)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`pdf_upload_${ip}`, MAX_PDF_REQUESTS_PER_HOUR, PDF_WINDOW_MS);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Too many PDF uploads. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      }, { status: 429 });
    }
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only PDF files are allowed for document upload.',
        details: `Received file type: ${file.type}`
      }, { status: 400 });
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'File must have .pdf extension.',
        details: `Received filename: ${file.name}`
      }, { status: 400 });
    }

    // Validate file size (50MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size exceeds 50MB limit.',
        details: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, Maximum: 50MB`
      }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    }

    const count = Number(formData.get('count') || 5);
    const difficulty = (formData.get('difficulty') as 'easy' | 'medium' | 'hard' | 'mixed') || 'medium';
    const topicFocus = (formData.get('topicFocus') as string) || '';
    const userType = (formData.get('userType') as 'teacher' | 'student') || 'teacher';
    const useRandomSeed = formData.get('useRandomSeed') === 'true';

    // Validate question count (1-50)
    if (count < 1 || count > 50) {
      return NextResponse.json({ 
        error: 'Question count must be between 1 and 50.',
        details: `Requested: ${count}, Maximum: 50`
      }, { status: 400 });
    }

    // Process PDF directly with Gemini (no storage needed)
    const processingStartTime = new Date();
    
    const { extractedContent, questions, studyFocusAreas } = await processPDFWithGemini(file, file.name, {
      count,
      difficulty,
      topicFocus,
      userType,
      useRandomSeed,
    });

    // Track AI usage
    const pdfPages = extractedContent.length; // Approximate pages from content length
    const questionsGenerated = questions.length;
    const tokensUsed = Math.ceil((extractedContent.length + JSON.stringify(questions).length) / 4); // Rough estimate
    
    aiUsageTracker.recordUsage(userId, pdfPages, questionsGenerated, tokensUsed);

    // Get usage stats for response
    const usageStats = aiUsageTracker.getUserStats(userId);

    // In Gemini-first approach, we don't need database storage
    // Just return the processed content directly
    
    return NextResponse.json({ 
      questions, 
      extractedContent,
      studyFocusAreas,
      message: userType === 'student' 
        ? 'PDF processed successfully via Gemini AI. Practice questions with explanations and study focus areas generated for self-study.'
        : 'PDF processed successfully via Gemini AI. Questions generated and ready for review.',
      processingTime: `${Date.now() - processingStartTime.getTime()}ms`,
      userType,
      fileName: file.name,
      usage: {
        today: usageStats.today,
        remaining: {
          pdfs: aiUsageTracker.checkDailyLimit(userId, 'pdfs').remaining,
          questions: aiUsageTracker.checkDailyLimit(userId, 'questions').remaining,
          tokens: aiUsageTracker.checkDailyLimit(userId, 'tokens').remaining,
        }
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}