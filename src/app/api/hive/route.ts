/**
 * /api/hive/route.ts
 *
 * Multi-agent orchestration pipeline:
 *  1. Orchestrator (heavy tier) — reads message, assigns complexity, selects agents
 *  2. Specialists  (standard tier) — run in parallel, domain-specific responses
 *  3. Synthesizer  (light tier)  — merges replies into one cohesive answer
 *
 * Model backend is controlled entirely by USE_MODE + model tiers in .env.
 * Switch between NIM / GEMINI / OPENAI by editing USE_MODE.
 */

import { NextResponse } from 'next/server';
import { callModel, resolveTier, getMode, tierLabel, type Tier } from '@/lib/modelRouter';

// ── Agent Definitions ─────────────────────────────────────────────────────────

const AGENT_DEFS = {
  academic:  { name: 'Academic Agent',  emoji: '📚', role: 'Expert in syllabus analysis, concept explanation, quiz generation, and study planning.' },
  wellness:  { name: 'Wellness Agent',  emoji: '🌿', role: 'Expert in emotional support, stress management, burnout detection, and coping strategies.' },
  scheduler: { name: 'Scheduler Agent', emoji: '📅', role: 'Expert in calendar management, event creation, and time-blocking study sessions.' },
  motivator: { name: 'Motivator Agent', emoji: '🔥', role: 'Expert in providing encouragement, goal-tracking updates, and progress celebration.' },
  analyst:   { name: 'Analyst Agent',   emoji: '📊', role: 'Expert in mood trend analysis, performance patterns, and actionable insights from data.' },
} as const;

type AgentKey = keyof typeof AGENT_DEFS;

// ── Student Context Engine ────────────────────────────────────────────────────
// In production this is fetched from Supabase per authenticated user.

const STUDENT_CONTEXT = {
  profile: { name: 'Sahil', target_exam: 'JEE Advanced 2027', weaknesses: ['Thermodynamics', 'Organic Chemistry'] },
  mood_history: [
    { date: '2026-06-10', score: 4, note: 'Feeling very stressed, mock results were bad.' },
    { date: '2026-06-11', score: 5, note: 'A bit better after the break.' },
    { date: '2026-06-12', score: 6, note: 'Focused session on mechanics.' },
  ],
  upcoming_events: [
    { title: 'Physics Mock Test', date: '2026-06-14' },
    { title: 'Math Practice',     date: '2026-06-13' },
  ],
  uploaded_materials: ['Physics Ch4: Thermodynamics', 'JEE 2024 Previous Papers'],
};

// ── Step 1: Orchestrator (heavy tier) ─────────────────────────────────────────

interface OrchestratorPlan {
  complexity: 'light' | 'standard' | 'heavy';
  agents: AgentKey[];
  reasoning: string;
}

async function runOrchestrator(message: string): Promise<OrchestratorPlan> {
  const prompt = `
You are the master orchestrator for a student well-being AI system.

Analyse the student's message and decide:
1. complexity — how complex this task is: "light" (simple chitchat), "standard" (most tasks), "heavy" (deep analysis, complex scheduling, multi-step)
2. agents — which 1-3 specialist agents to invoke from this list: academic, wellness, scheduler, motivator, analyst

Student context:
- Target exam: ${STUDENT_CONTEXT.profile.target_exam}
- Weaknesses: ${STUDENT_CONTEXT.profile.weaknesses.join(', ')}
- Recent mood: score ${STUDENT_CONTEXT.mood_history.at(-1)?.score}/10

Student message: "${message}"

Respond ONLY with valid JSON:
{
  "complexity": "light" | "standard" | "heavy",
  "agents": ["agent1", "agent2"],
  "reasoning": "one sentence explaining why"
}`;

  const result = await callModel({ userPrompt: prompt, tier: 2, jsonMode: true, temperature: 0.1 });
  try {
    const plan = JSON.parse(result.text) as OrchestratorPlan;
    // Guard complexity
    const validComplexity = ['light', 'standard', 'heavy'] as const;
    if (!validComplexity.includes(plan.complexity as any)) plan.complexity = 'standard';
    // Guard agents
    if (!Array.isArray(plan.agents)) plan.agents = ['academic'];
    plan.agents = plan.agents.filter(a => a in AGENT_DEFS) as AgentKey[];
    if (plan.agents.length === 0) plan.agents = ['academic'];
    return plan;
  } catch {
    return { complexity: 'standard', agents: ['academic'], reasoning: 'fallback' };
  }
}

// ── Step 2: Specialist Agents (assigned tier) ─────────────────────────────────

interface SpecialistResult {
  agent: AgentKey;
  summary: string;
  reply: string;
  action: 'none' | 'schedule_event' | 'generate_quiz' | 'show_insight';
  action_payload: Record<string, any>;
}

async function runSpecialist(agentKey: AgentKey, message: string, tier: Tier): Promise<SpecialistResult> {
  const agent = AGENT_DEFS[agentKey];
  const contextStr = JSON.stringify(STUDENT_CONTEXT, null, 2);

  const prompt = `
You are the ${agent.name}.
Role: ${agent.role}

Student context:
${contextStr}

Student message: "${message}"

Respond ONLY with valid JSON matching this schema:
{
  "agent": "${agentKey}",
  "summary": "1-sentence summary of what you are providing",
  "reply": "Your full, helpful, empathetic response (2-4 sentences)",
  "action": "none" | "schedule_event" | "generate_quiz" | "show_insight",
  "action_payload": {}
}

Action payload shapes:
- schedule_event: { "title": "...", "date": "YYYY-MM-DD", "duration_hours": 2 }
- generate_quiz:  { "topic": "...", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": "A" }
- show_insight:   { "label": "...", "value": "...", "trend": "up" | "down" | "stable" }

If none, set action to "none" and action_payload to {}.`;

  const result = await callModel({ userPrompt: prompt, tier, jsonMode: true, temperature: 0.6 });
  try {
    return JSON.parse(result.text) as SpecialistResult;
  } catch {
    return { agent: agentKey, summary: 'Response', reply: result.text || 'I encountered an issue. Please try again.', action: 'none', action_payload: {} };
  }
}

// ── Step 3: Synthesizer (light tier) ─────────────────────────────────────────

async function synthesize(specialists: SpecialistResult[], message: string): Promise<string> {
  if (specialists.length === 1) return specialists[0].reply;

  const repliesStr = specialists.map(r => `[${r.agent}]: ${r.reply}`).join('\n\n');
  const result = await callModel({
    userPrompt: `Merge these specialist responses into ONE cohesive reply (under 120 words, warm and direct, no agent names):

Original question: "${message}"

${repliesStr}

Merged reply:`,
    tier: 0,
    temperature: 0.7,
  });
  return result.text.trim() || specialists[0].reply;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const mode = getMode();

    // 1. Orchestrate
    const plan = await runOrchestrator(message);
    const tier = resolveTier(plan.complexity);

    // 2. Specialists in parallel
    const specialistResults = await Promise.all(
      plan.agents.map(key => runSpecialist(key, message, tier))
    );

    // 3. Synthesize
    const finalReply = await synthesize(specialistResults, message);

    // 4. Pick primary action (first non-none)
    const primaryAction = specialistResults.find(r => r.action !== 'none');

    const response: Record<string, any> = {
      reply: finalReply,
      type: 'text',
      metadata: null,
      agents_invoked: specialistResults.map(r => ({
        key: r.agent,
        name: AGENT_DEFS[r.agent].name,
        emoji: AGENT_DEFS[r.agent].emoji,
        summary: r.summary,
      })),
      meta: {
        provider: mode,
        complexity: plan.complexity,
        tier: tierLabel(tier),
        orchestrator_reasoning: plan.reasoning,
      },
    };

    if (primaryAction?.action === 'schedule_event') {
      response.type = 'calendar_event';
      response.metadata = primaryAction.action_payload;
    } else if (primaryAction?.action === 'generate_quiz') {
      response.type = 'quiz';
      response.metadata = primaryAction.action_payload;
    } else if (primaryAction?.action === 'show_insight') {
      response.type = 'insight';
      response.metadata = primaryAction.action_payload;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Hive API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
