import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function extractPdfText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  return parsed.text || '';
}

export async function generateExamQuestionsFromText(text: string, sourceName: string) {
  if (!openai) {
    return [
      `Draft question 1: Summarize the core ideas in ${sourceName}.`,
      `Draft question 2: Identify the most important concept discussed in ${sourceName}.`,
      `Draft question 3: Explain the significance of the main argument in ${sourceName}.`,
    ];
  }

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'You are an expert exam designer. Create 3 concise, teacher-editable exam questions from the supplied course material. Return only a JSON array of strings.'
      },
      {
        role: 'user',
        content: `Source name: ${sourceName}\n\nMaterial:\n${text.slice(0, 12000)}`
      }
    ],
  });

  const content = response.output_text || '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed.slice(0, 3);
    }
  } catch {
    // fall back to simple parsing if the model returns plain text
  }

  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}
