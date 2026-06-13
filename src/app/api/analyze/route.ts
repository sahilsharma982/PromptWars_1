import { NextResponse } from 'next/server';
import { callModel } from '@/lib/modelRouter';
import { saveJournalEntry, DEMO_USER_ID } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { mood, journal } = await req.json();

    if (!journal?.trim()) {
      return NextResponse.json({ error: 'Journal content is required' }, { status: 400 });
    }

    const prompt = `You are an empathetic AI psychology companion for students preparing for high-stakes exams (JEE, NEET, CAT, UPSC, etc.).
The student has just written a journal entry and recorded their mood (1-10 scale).

Mood: ${mood}/10
Journal Entry: "${journal}"

Analyze this entry to:
1. Detect up to 3 specific stress triggers or themes (e.g., "Mock Test Anxiety", "Sleep Deprivation", "Peer Comparison"). Keep them very brief (2-3 words each).
2. Provide a short, empathetic support message (2-3 sentences) acknowledging their feelings.
3. Suggest 2-3 actionable coping strategies specific to their situation and exam prep.

Respond ONLY with valid JSON:
{
  "triggers": ["Trigger 1", "Trigger 2"],
  "supportMessage": "Your empathetic message...",
  "strategies": ["Strategy 1", "Strategy 2"]
}`;

    const result = await callModel({
      userPrompt: prompt,
      tier: 1,          // standard tier — good quality, not overkill
      jsonMode: true,
      temperature: 0.7,
    });

    let parsed: { triggers: string[]; supportMessage: string; strategies: string[] };
    try {
      parsed = JSON.parse(result.text);
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 });
    }

    // ── Persist to Supabase ──
    const saved = await saveJournalEntry({
      user_id:         DEMO_USER_ID,
      mood:            Number(mood),
      content:         journal,
      triggers:        parsed.triggers        ?? [],
      support_message: parsed.supportMessage  ?? null,
      strategies:      parsed.strategies      ?? [],
    });

    const now = new Date().toISOString();
    const entry = saved ?? {
      id: `local-${Date.now()}`,
      user_id: DEMO_USER_ID,
      mood: Number(mood),
      content: journal,
      triggers: parsed.triggers ?? [],
      support_message: parsed.supportMessage ?? null,
      strategies: parsed.strategies ?? [],
      created_at: now,
    };

    return NextResponse.json({
      ...parsed,
      entry,
      persisted: !!saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[analyze] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
