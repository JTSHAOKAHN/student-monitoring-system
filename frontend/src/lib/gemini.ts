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

function getModel() {
  if (!apiKey) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
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

function parseGeneratedQuestions(raw: string): GeneratedQuestion[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { questions?: GeneratedQuestion[] };

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Invalid question payload from Gemini.');
  }

  return parsed.questions.slice(0, 10).map((q) => ({
    prompt: q.prompt,
    question_type: q.question_type || 'short_answer',
    options: q.options,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty || 'medium',
  }));
}

export async function generateQuestionsFromFile(file: File, sourceName: string): Promise<GeneratedQuestion[]> {
  const model = getModel();
  if (!model) {
    return fallbackQuestions(sourceName);
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'application/pdf';

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    {
      text: `Source file name: ${sourceName}\n\nRead and understand all text and images in this document. Generate 5-8 exam questions following the JSON schema.`,
    },
  ]);

  const text = result.response.text();
  try {
    return parseGeneratedQuestions(text);
  } catch {
    return fallbackQuestions(sourceName);
  }
}

export async function generateQuestionsFromText(text: string, sourceName: string): Promise<GeneratedQuestion[]> {
  const model = getModel();
  if (!model) {
    return fallbackQuestions(sourceName);
  }

  const result = await model.generateContent(
    `Source name: ${sourceName}\n\nMaterial:\n${text.slice(0, 30000)}\n\nGenerate 5-8 exam questions following the JSON schema.`
  );

  const responseText = result.response.text();
  try {
    return parseGeneratedQuestions(responseText);
  } catch {
    return fallbackQuestions(sourceName);
  }
}
