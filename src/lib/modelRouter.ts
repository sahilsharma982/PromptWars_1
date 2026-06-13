/**
 * modelRouter.ts
 *
 * Provider-agnostic model selector.
 * Reads USE_MODE and the model-tier strings from .env and exposes a
 * unified `callModel()` function that the Hive orchestrator can call
 * without caring which backend is active.
 *
 * Complexity tiers:
 *   0 → "light"    (fast, cheap  — routing, synthesis, simple replies)
 *   1 → "standard" (balanced     — most specialist agent calls)
 *   2 → "heavy"    (slow, smart  — orchestrator deep reasoning, hard tasks)
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Tier = 0 | 1 | 2;           // light | standard | heavy
export type Mode = 'NIM' | 'GEMINI' | 'OPENAI';

export interface ModelCall {
  systemPrompt?: string;
  userPrompt: string;
  tier: Tier;
  jsonMode?: boolean;
  temperature?: number;
}

export interface ModelResult {
  text: string;
  model: string;
  provider: Mode;
  tier: Tier;
}

// ── Env Helpers ───────────────────────────────────────────────────────────────

function parseModels(envVar: string | undefined): [string, string, string] {
  const parts = (envVar || '').split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length < 3) throw new Error(`Model env var must have 3 comma-separated values: "${envVar}"`);
  return [parts[0], parts[1], parts[2]];
}

function getMode(): Mode {
  const raw = (process.env.USE_MODE || 'GEMINI').trim().toUpperCase();
  if (raw === 'NIM' || raw === 'GEMINI' || raw === 'OPENAI') return raw;
  console.warn(`[modelRouter] Unknown USE_MODE "${raw}", falling back to GEMINI`);
  return 'GEMINI';
}

// ── Clients (lazy) ────────────────────────────────────────────────────────────

let _openaiClient: OpenAI | null = null;
let _nimClient: OpenAI | null = null;
let _geminiClient: GoogleGenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }
  return _openaiClient;
}

function getNIMClient(): OpenAI {
  if (!_nimClient) {
    _nimClient = new OpenAI({
      apiKey: process.env.NIM_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
  }
  return _nimClient;
}

function getGeminiClient(): GoogleGenAI {
  if (!_geminiClient) {
    const key = process.env.GEMENI_API_KEY || process.env.GEMINI_API_KEY;
    _geminiClient = new GoogleGenAI({ apiKey: key! });
  }
  return _geminiClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanJson(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function tierLabel(tier: Tier): string {
  return ['light', 'standard', 'heavy'][tier];
}

// ── Callers ───────────────────────────────────────────────────────────────────

async function callGemini(call: ModelCall, model: string): Promise<string> {
  const client = getGeminiClient();
  const fullPrompt = call.systemPrompt
    ? `${call.systemPrompt}\n\n${call.userPrompt}`
    : call.userPrompt;

  const res = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    config: {
      temperature: call.temperature ?? 0.5,
      ...(call.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  });

  return res.text || '';
}

async function callOpenAICompat(
  call: ModelCall,
  model: string,
  client: OpenAI,
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (call.systemPrompt) {
    messages.push({ role: 'system', content: call.systemPrompt });
  }
  messages.push({ role: 'user', content: call.userPrompt });

  const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    temperature: call.temperature ?? 0.5,
    max_tokens: 4096,
    ...(call.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const res = await client.chat.completions.create(params);
  return res.choices[0]?.message?.content || '';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call the active provider's model at the specified complexity tier.
 */
export async function callModel(call: ModelCall): Promise<ModelResult> {
  const mode = getMode();

  let models: [string, string, string];
  let rawText: string;

  switch (mode) {
    case 'GEMINI': {
      models = parseModels(process.env.GEMINI_MODELS);
      const model = models[call.tier];
      rawText = await callGemini(call, model);
      return { text: call.jsonMode ? cleanJson(rawText) : rawText, model, provider: 'GEMINI', tier: call.tier };
    }

    case 'NIM': {
      models = parseModels(process.env.NIM_MODELS);
      const model = models[call.tier];
      const client = getNIMClient();
      rawText = await callOpenAICompat(call, model, client);
      return { text: call.jsonMode ? cleanJson(rawText) : rawText, model, provider: 'NIM', tier: call.tier };
    }

    case 'OPENAI': {
      models = parseModels(process.env.OPENAI_MODELS);
      const model = models[call.tier];
      const client = getOpenAIClient();
      rawText = await callOpenAICompat(call, model, client);
      return { text: call.jsonMode ? cleanJson(rawText) : rawText, model, provider: 'OPENAI', tier: call.tier };
    }
  }
}

/**
 * Utility: determine the right tier based on a task complexity label from the orchestrator.
 */
export function resolveTier(complexityHint: string | undefined | null): Tier {
  const h = (complexityHint ?? 'standard').toLowerCase().trim();
  if (h === 'heavy' || h === '2') return 2;
  if (h === 'standard' || h === '1') return 1;
  return 0; // light default
}

export { getMode, tierLabel };
