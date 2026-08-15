import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeneratedQuestion } from './types';

const apiKey = process.env.GEMINI_API_KEY;

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

const COMBINED_PROMPT = `You are an expert at processing educational PDF documents for exam creation.
Your role is to:
1. Extract and structure the text content from the uploaded PDF
2. Generate high-quality exam questions based on the extracted content

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



function getModel() {
  if (!apiKey) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: COMBINED_PROMPT,
  });
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
}

export async function processPDFWithGemini(
  file: File,
  sourceName: string,
  options?: GenerateOptions
): Promise<GeminiProcessingResult> {
  const model = getModel();
  if (!model) {
    return {
      extractedContent: [{
        content: `Unable to process ${sourceName}. Gemini API not configured.`,
        content_type: 'text' as const,
        page_number: 1,
        section_title: 'Error'
      }],
      questions: fallbackQuestions(sourceName)
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'application/pdf';
  const count = options?.count || 5;

  const promptText = `Source file name: ${sourceName}
Target Question Count: ${count}
${options?.difficulty && options.difficulty !== 'mixed' ? `Target Difficulty: ${options.difficulty}` : ''}
${options?.topicFocus ? `Topic Focus: ${options.topicFocus}` : ''}

Process this PDF document:
1. Extract and structure all text content
2. Generate exactly ${count} exam questions based on the content
Return both extracted content and questions following the JSON schema where the extracted content is under the key "extractedContent".`;

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
    const parsed = JSON.parse(cleaned) as { extractedContent?: ExtractedContent[]; questions?: GeneratedQuestion[] };

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

    return {
      extractedContent,
      questions: processedQuestions
    };
  } catch {
    return {
      extractedContent: [{
        content: `Unable to properly process ${sourceName}. Using basic extraction.`,
        content_type: 'text' as const,
        page_number: 1,
        section_title: 'Fallback'
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

