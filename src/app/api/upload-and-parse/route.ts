import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMENI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // In a production app, we would upload this file to Supabase Storage,
    // then extract its text using a PDF parser or Gemini's Vision capabilities.
    // For this implementation, we will simulate the extraction and ask Gemini to plan it.

    const prompt = `
You are an expert AI academic scheduler. 
A student has uploaded a study material named "${file.name}".
Please generate a realistic step-by-step study plan to tackle this material over the next 3 days.
Return ONLY a valid JSON object matching this schema:
{
  "title": "Study Plan for [Material]",
  "events": [
    { "title": "Event 1", "date": "2026-06-14T10:00:00Z", "type": "study" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      }
    });

    const text = response.text;
    if (!text) throw new Error('AI failed to generate a plan');
    
    // Harden JSON parsing: strip markdown code blocks if present
    const cleanText = text.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
    const result = JSON.parse(cleanText);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error parsing file:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
