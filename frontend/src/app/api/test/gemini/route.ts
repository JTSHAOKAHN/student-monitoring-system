import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY not found in environment variables',
        hasKey: false
      }, { status: 500 });
    }

    // Test with the working model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    // Simple test - generate a short response
    const result = await model.generateContent('Say "Hello from Gemini!" in exactly these words.');
    const response = result.response.text();

    return NextResponse.json({ 
      success: true,
      message: 'Gemini API key is working with gemini-2.5-flash!',
      hasKey: true,
      apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
      testResponse: response,
      model: 'gemini-3.5-flash'
    });
  } catch (error) {
    console.error('Gemini API test error:', error);
    
    return NextResponse.json({ 
      error: 'Gemini API key test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      hasKey: !!process.env.GEMINI_API_KEY,
      apiKeyPreview: process.env.GEMINI_API_KEY 
        ? `${process.env.GEMINI_API_KEY.substring(0, 8)}...${process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4)}`
        : 'none'
    }, { status: 500 });
  }
}