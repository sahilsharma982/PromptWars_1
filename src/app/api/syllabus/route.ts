/**
 * /api/syllabus
 *
 * POST  — parse raw text → AI tree  (uses tier:0 fast model for speed)
 * GET   — load saved syllabus for demo user from DB (falls back to null)
 * PATCH — save a tree to the DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/modelRouter';
import { getAdminClient } from '@/lib/supabaseClient';
import type { SyllabusNode } from '@/types';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// ── DB helpers ────────────────────────────────────────────────────────────────

function isConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

async function loadFromDB(): Promise<{ tree: SyllabusNode[]; raw: string } | null> {
  if (!isConfigured()) return null;
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('syllabus_trees')
      .select('tree, raw_text')
      .eq('user_id', DEMO_USER_ID)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return { tree: data.tree, raw: data.raw_text };
  } catch { return null; }
}

async function saveToDB(tree: SyllabusNode[], raw: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    const db = getAdminClient();
    // Upsert — one syllabus per user
    await db.from('syllabus_trees').upsert(
      {
        user_id: DEMO_USER_ID,
        tree,
        raw_text: raw.slice(0, 50000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (e) {
    console.warn('[syllabus] DB save failed (table may not exist yet):', (e as Error).message);
  }
}

// ── GET — load saved tree ─────────────────────────────────────────────────────

export async function GET() {
  const saved = await loadFromDB();
  return NextResponse.json(saved ?? { tree: null, raw: null });
}

// ── PATCH — save tree ─────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { tree, raw } = await req.json();
    if (!Array.isArray(tree)) return NextResponse.json({ error: 'Invalid tree' }, { status: 400 });
    await saveToDB(tree, raw ?? '');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — parse syllabus text into a tree ────────────────────────────────────

// Compact prompt — fewer tokens = faster response
const PROMPT_TEMPLATE = (content: string) => `You are a curriculum organizer. Convert this syllabus into a JSON tree.

Syllabus:
---
${content}
---

Return a JSON array. Each item:
{"id":"kebab-id","name":"Name","type":"subject|unit|chapter|topic","weight":"high|medium|low","difficulty":"easy|medium|hard","estimatedHours":N,"children":[...]}

Rules:
- Top level = subjects. Nest: subject→unit→chapter→topic only (max 4 levels)
- id must be unique kebab-case
- estimatedHours only on topics/chapters
- Return ONLY the JSON array, nothing else`;

export async function POST(req: NextRequest) {
  try {
    const { content, save } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'No syllabus content provided' }, { status: 400 });
    }

    // Trim input aggressively for speed — 4000 chars is plenty for structure
    const truncated = content.trim().slice(0, 4000);

    const result = await callModel({
      userPrompt: PROMPT_TEMPLATE(truncated),
      tier: 0,          // ← FASTEST model (tier 0 = light: llama-3.1-8b / gemini-flash-lite)
      jsonMode: true,
      temperature: 0.1, // low temp = more deterministic, less wandering
    });

    // Parse and validate
    let tree: SyllabusNode[];
    try {
      const raw = result.text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/,  '')
        .trim();

      const parsed = JSON.parse(raw);
      tree = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      console.error('[syllabus] AI JSON parse failed:', result.text.slice(0, 300));
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Try shorter or simpler syllabus text.' },
        { status: 500 }
      );
    }

    // Background-save to DB (don't await — keeps response fast)
    if (save !== false) {
      saveToDB(tree, content).catch(() => {});
    }

    return NextResponse.json({ tree, model: result.model });
  } catch (err: any) {
    console.error('[syllabus] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
