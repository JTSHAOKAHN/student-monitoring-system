import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeneratedQuestion } from './types';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY is not configured in environment variables');
}

const SYSTEM_PROMPT = `You are an expert exam designer for educational institutions.
Your role is to read and understand uploaded course materials (text and images), then generate high-quality exam questions.

Rules:
- Create exam-like questions suitable for formal assessment
- Prefer a mix of multiple_choice, true_false, short_answer, and fill_blank
- For multiple_choice, provide exactly 4 options with one correct answer
- Questions must be grounded in the provided material
- Return ONLY valid JSON, no markdown fences

JSON schema:
{
  "questions": [
    {
      "prompt": "string",
      "question_type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": [{ "id": "a", "label": "string" }, ...],
      "correct_answer": "string (option id for MC, True/False for TF, expected answer for others)",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

const COMBINED_PROMPT = `You are an expert at processing educational PDF documents for exam creation and study tools.
Your role is to:
1. Extract and structure the text content from the uploaded PDF
2. Generate high-quality questions based on the extracted content

Rules:
- Extract all meaningful text content from the document
- Preserve the structure (headings, paragraphs, sections)
- Identify different content types (headings, body text, tables, code, etc.)
- Track page numbers when possible
- Create exam-like questions suitable for formal assessment
- Prefer a mix of multiple_choice, true_false, short_answer, and fill_blank
- For multiple_choice, provide exactly 4 options with one correct answer
- Questions must be grounded in the extracted material
- Return ONLY valid JSON, no markdown fences

JSON schema:
{
  "extractedContent": [
    {
      "content": "string",
      "content_type": "text" | "heading" | "table" | "image_caption" | "code",
      "page_number": number,
      "section_title": "string"
    }
  ],
  "questions": [
    {
      "prompt": "string",
      "question_type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": [{ "id": "a", "label": "string" }, ...],
      "correct_answer": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

const STUDY_PROMPT = `You are an expert at creating study materials and practice questions from educational PDFs.
Your role is to:
1. Extract and structure the text content from the uploaded PDF
2. Generate practice questions for self-study
3. Identify areas where students typically need more focus

Rules:
- Extract all meaningful text content from the document
- Preserve the structure (headings, paragraphs, sections)
- Identify different content types (headings, body text, tables, code, etc.)
- Track page numbers when possible
- Create practice questions suitable for self-study
- Mix question types: multiple_choice, true_false, short_answer, and fill_blank
- For multiple_choice, provide exactly 4 options with one correct answer
- Questions must be grounded in the extracted material
- Include detailed explanations for answers
- Identify study focus areas based on content complexity
- Return ONLY valid JSON, no markdown fences

JSON schema:
{
  "extractedContent": [
    {
      "content": "string",
      "content_type": "text" | "heading" | "table" | "image_caption" | "code",
      "page_number": number,
      "section_title": "string"
    }
  ],
  "questions": [
    {
      "prompt": "string",
      "question_type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": [{ "id": "a", "label": "string" }, ...],
      "correct_answer": "string",
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "studyFocusAreas": [
    {
      "topic": "string",
      "reason": "string",
      "suggestedStudyTime": "string"
    }
  ]
}`;



function getModel(userType: 'teacher' | 'student' = 'teacher') {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return null;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Changed from gemini-3.5-flash to correct model name
      systemInstruction: userType === 'student' ? STUDY_PROMPT : COMBINED_PROMPT,
    });
  } catch (error) {
    console.error('Failed to initialize Gemini model:', error);
    return null;
  }
}

function fallbackQuestions(sourceName: string): GeneratedQuestion[] {
  return [
    {
      prompt: `Based on ${sourceName}, which statement best summarizes the main topic?`,
      question_type: 'multiple_choice',
      options: [
        { id: 'a', label: 'Core concept from the material' },
        { id: 'b', label: 'Unrelated detail' },
        { id: 'c', label: 'Minor footnote' },
        { id: 'd', label: 'Author biography' },
      ],
      correct_answer: 'a',
      difficulty: 'medium',
    },
    {
      prompt: `The material in ${sourceName} presents information that can be assessed in a formal exam.`,
      question_type: 'true_false',
      correct_answer: 'True',
      difficulty: 'easy',
    },
    {
      prompt: `Explain one key idea from ${sourceName} in your own words.`,
      question_type: 'short_answer',
      difficulty: 'medium',
    },
  ];
}

export interface GenerateOptions {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  topicFocus?: string;
  userType?: 'teacher' | 'student';
  useRandomSeed?: boolean;
}

function parseGeneratedQuestions(raw: string, maxCount: number = 10): GeneratedQuestion[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { questions?: GeneratedQuestion[] };

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Invalid question payload from Gemini.');
  }

  return parsed.questions.slice(0, maxCount).map((q) => ({
    prompt: q.prompt,
    question_type: q.question_type || 'short_answer',
    options: q.options,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty || 'medium',
  }));
}

export async function generateQuestionsFromFile(
  file: File,
  sourceName: string,
  options?: GenerateOptions
): Promise<GeneratedQuestion[]> {
  const model = getModel();
  if (!model) {
    return fallbackQuestions(sourceName);
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'application/pdf';
  const count = options?.count || 5;

  const promptText = `Source file name: ${sourceName}
Target Question Count: ${count}
${options?.difficulty && options.difficulty !== 'mixed' ? `Target Difficulty: ${options.difficulty}` : ''}
${options?.topicFocus ? `Topic Focus: ${options.topicFocus}` : ''}

Read and understand all text and images in this document. Generate exactly ${count} exam questions following the JSON schema.`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    {
      text: promptText,
    },
  ]);

  const text = result.response.text();
  try {
    return parseGeneratedQuestions(text, count);
  } catch {
    return fallbackQuestions(sourceName);
  }
}

export async function generateQuestionsFromText(
  text: string,
  sourceName: string,
  options?: GenerateOptions
): Promise<GeneratedQuestion[]> {
  const model = getModel();
  if (!model) {
    return fallbackQuestions(sourceName);
  }

  const count = options?.count || 5;
  const promptText = `Source name: ${sourceName}
Target Question Count: ${count}
${options?.difficulty && options.difficulty !== 'mixed' ? `Target Difficulty: ${options.difficulty}` : ''}
${options?.topicFocus ? `Topic Focus: ${options.topicFocus}` : ''}

Material:
${text.slice(0, 30000)}

Generate exactly ${count} exam questions following the JSON schema.`;

  const result = await model.generateContent(promptText);

  const responseText = result.response.text();
  try {
    return parseGeneratedQuestions(responseText, count);
  } catch {
    return fallbackQuestions(sourceName);
  }
}

export interface ExtractedContent {
  content: string;
  content_type: 'text' | 'heading' | 'table' | 'image_caption' | 'code';
  page_number?: number;
  section_title?: string;
}

export interface GeminiProcessingResult {
  extractedContent: ExtractedContent[];
  questions: GeneratedQuestion[];
  studyFocusAreas?: StudyFocusArea[];
}

export interface StudyFocusArea {
  topic: string;
  reason: string;
  suggestedStudyTime: string;
}

export async function processPDFWithGemini(
  file: File,
  sourceName: string,
  options?: GenerateOptions
): Promise<GeminiProcessingResult> {
  const userType = options?.userType || 'teacher';
  const model = getModel(userType);
  
  if (!model) {
    console.error('Gemini model initialization failed');
    return {
      extractedContent: [{
        content: `Unable to process ${sourceName}. Gemini API not configured or initialization failed.`,
        content_type: 'text' as const,
        page_number: 1,
        section_title: 'Error'
      }],
      questions: fallbackQuestions(sourceName)
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'application/pdf';
    const count = options?.count || 5;

    // Add random seed to ensure different questions for same PDF
    const randomSeed = options?.useRandomSeed ? Math.random().toString(36).substring(7) : '';
    const seedInstruction = randomSeed ? `Random Seed: ${randomSeed} - Generate unique questions based on this seed.` : '';

    const promptText = `Source file name: ${sourceName}
User Type: ${userType}
Target Question Count: ${count}
${options?.difficulty && options.difficulty !== 'mixed' ? `Target Difficulty: ${options.difficulty}` : ''}
${options?.topicFocus ? `Topic Focus: ${options.topicFocus}` : ''}
${seedInstruction}

${userType === 'student' 
  ? 'Process this PDF document for study purposes: 1. Extract and structure all text content 2. Generate practice questions with explanations 3. Identify study focus areas. Return both extracted content, questions with explanations, and study focus areas following the JSON schema.'
  : 'Process this PDF document: 1. Extract and structure all text content 2. Generate exactly ${count} exam questions based on the content. Return both extracted content and questions following the JSON schema where the extracted content is under the key "extractedContent".'
}`;

    console.log('Starting Gemini processing...');
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: promptText,
      },
    ]);

    const text = result.response.text();
    console.log('Gemini response received, parsing...');
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { 
      extractedContent?: ExtractedContent[]; 
      questions?: GeneratedQuestion[];
      studyFocusAreas?: StudyFocusArea[];
    };

    console.log('Parsed result:', { hasContent: !!parsed.extractedContent, hasQuestions: !!parsed.questions });

    // Validate and provide fallbacks if needed
    const extractedContent = Array.isArray(parsed.extractedContent) && parsed.extractedContent.length > 0 
      ? parsed.extractedContent 
      : [{
        content: `Unable to properly extract structured content from ${sourceName}. Using basic extraction.`,
        content_type: 'text' as const,
        page_number: 1,
        section_title: 'Fallback'
      }];

    const processedQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0
      ? parsed.questions
      : fallbackQuestions(sourceName);

    const studyFocusAreas = userType === 'student' && Array.isArray(parsed.studyFocusAreas)
      ? parsed.studyFocusAreas
      : undefined;

    console.log('Processing complete:', { contentLength: extractedContent.length, questionCount: processedQuestions.length });

    return {
      extractedContent,
      questions: processedQuestions,
      studyFocusAreas
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      extractedContent: [{
        content: `Unable to properly process ${sourceName}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        content_type: 'text' as const,
        page_number: 1,
        section_title: 'Error'
      }],
      questions: fallbackQuestions(sourceName)
    };
  }
}

export async function extractTextFromPDF(
  file: File,
  sourceName: string
): Promise<ExtractedContent[]> {
  const model = getModel();
  if (!model) {
    // Fallback: return basic content
    return [{
      content: `Unable to extract text from ${sourceName}. PDF processing not available.`,
      content_type: 'text' as const,
      page_number: 1,
      section_title: 'Error'
    }];
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'application/pdf';

  const promptText = `Source file name: ${sourceName}

Extract and structure all text content from this PDF document. Use this JSON schema:
{
  "extractedContent": [
    {
      "content": "string",
      "content_type": "text" | "heading" | "table" | "image_caption" | "code",
      "page_number": number,
      "section_title": "string"
    }
  ]
}`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    {
      text: promptText,
    },
  ]);

  const text = result.response.text();
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { extractedContent?: ExtractedContent[] };

    if (!Array.isArray(parsed.extractedContent) || parsed.extractedContent.length === 0) {
      throw new Error('Invalid extraction payload from Gemini.');
    }

    return parsed.extractedContent;
  } catch {
    // Fallback: return basic content
    return [{
      content: `Unable to properly extract structured content from ${sourceName}. Using basic extraction.`,
      content_type: 'text' as const,
      page_number: 1,
      section_title: 'Fallback'
    }];
  }
}

