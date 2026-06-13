import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMENI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(req: Request) {
  try {
    const { mood, journal } = await req.json();

    if (!journal) {
      return NextResponse.json({ error: 'Journal content is required' }, { status: 400 });
    }

    const prompt = `
You are an empathetic, expert AI psychology companion for students preparing for high-stakes exams (JEE, NEET, CAT, UPSC, etc.).
The student has just written a journal entry and recorded their mood (1-10 scale).

Mood: ${mood}/10
Journal Entry: "${journal}"

Please analyze this journal entry to:
1. Detect up to 3 specific stress triggers or themes (e.g., "Mock Test Anxiety", "Sleep Deprivation", "Peer Comparison"). Keep them very brief (2-3 words).
2. Provide a short, empathetic support message (2-3 sentences) acknowledging their feelings and validating their efforts.
3. Suggest 2-3 actionable, context-aware coping strategies specific to their situation and exam prep.

Return ONLY a valid JSON object with the following schema:
{
  "triggers": ["Trigger 1", "Trigger 2"],
  "supportMessage": "Your empathetic message here...",
  "strategies": ["Strategy 1", "Strategy 2"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No content returned from AI');
    }

    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error analyzing journal:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
