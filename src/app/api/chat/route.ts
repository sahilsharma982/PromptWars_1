import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMENI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// MOCK CONTEXT ENGINE STATE
// In production, these would be fetched from Supabase based on the user's ID
const CONTEXT = {
  profile: { target_exam: "JEE Advanced 2027", weaknesses: ["Thermodynamics", "Organic Chemistry"] },
  recent_mood: "Stress Level: High. Note: Feeling overwhelmed with physics.",
  uploaded_syllabus: "Physics Chapter 4: Thermodynamics. Exam next week."
};

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const systemPrompt = `
You are MindSpace Companion, a highly context-aware AI tutor and scheduler.
Current Student Context (Context Engine):
- Target Exam: ${CONTEXT.profile.target_exam}
- Weaknesses: ${CONTEXT.profile.weaknesses.join(", ")}
- Recent Mood: ${CONTEXT.recent_mood}
- Uploaded Materials: ${CONTEXT.uploaded_syllabus}

The user is interacting with you. You have two special abilities. You can:
1. "schedule_event": Call this if the user asks you to add something to their calendar.
2. "generate_quiz": Call this if the user asks you to quiz them.

If you don't need to use a special ability, just reply normally.
Always respond with a JSON object exactly matching this schema:
{
  "reply": "Your conversational response",
  "action": "none" | "schedule_event" | "generate_quiz",
  "action_payload": {} // specific to the action, see below
}

For "schedule_event", action_payload must be: { "title": "...", "date": "..." }
For "generate_quiz", action_payload must be: { "topic": "...", "question": "...", "options": ["A","B","C","D"] }
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\\n\\nUser Message: " + message }] }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      }
    });

    const text = response.text;
    if (!text) throw new Error('AI failed to respond');
    
    // Harden JSON parsing: strip markdown code blocks if present
    const cleanText = text.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
    const result = JSON.parse(cleanText);

    // Map the JSON structure to the format our frontend expects
    const uiResponse = {
      reply: result.reply,
      type: 'text',
      metadata: null
    };

    if (result.action === 'schedule_event') {
      uiResponse.type = 'calendar_event';
      uiResponse.metadata = result.action_payload;
    } else if (result.action === 'generate_quiz') {
      uiResponse.type = 'quiz';
      uiResponse.metadata = result.action_payload;
    }

    return NextResponse.json(uiResponse);
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
