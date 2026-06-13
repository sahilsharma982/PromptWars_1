/**
 * types/index.ts — MindSpace AI · Central type definitions
 *
 * All shared types are declared here. API routes, components, and
 * agent utilities import from this file to ensure a single source of truth.
 */

// ── Domain ────────────────────────────────────────────────────────────────────

/** One of the five specialist AI agents in the Hive. */
export type AgentKey = 'academic' | 'wellness' | 'scheduler' | 'motivator' | 'analyst';

/** Orchestrator complexity tier — maps to model tier 0/1/2. */
export type ComplexityTier = 'light' | 'standard' | 'heavy';

// ── User / Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  target_exam: string;       // e.g. "JEE Advanced 2027"
  weaknesses: string[];      // e.g. ["Thermodynamics", "Organic Chemistry"]
}

// ── Journal ───────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id?: string;
  user_id: string;
  mood: number;              // 1–10 scale
  content: string;
  triggers: string[];        // e.g. ["Mock Test Anxiety", "Sleep Deprivation"]
  support_message: string | null;
  strategies: string[];
  created_at?: string;       // ISO timestamp
}

/** Payload returned by /api/analyze */
export interface AnalysisResult {
  triggers: string[];
  supportMessage: string;
  strategies: string[];
  entry: JournalEntry;
  persisted: boolean;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export type EventType = 'study' | 'exam' | 'wellness' | 'deadline' | 'ai';

export interface CalendarEvent {
  id?: string;
  user_id: string;
  title: string;
  event_date: string;        // 'YYYY-MM-DD'
  event_time?: string;       // 'HH:MM'
  type: EventType;
  ai_scheduled: boolean;
  note?: string;
  created_at?: string;
}

// ── Chat / Companion ──────────────────────────────────────────────────────────

export type MessageType = 'text' | 'quiz' | 'calendar_event' | 'insight';

export interface AgentInfo {
  key: AgentKey;
  name: string;
  emoji: string;
  summary: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown> | null;
  agents?: AgentInfo[];
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// ── Hive API ──────────────────────────────────────────────────────────────────

/** Request body sent to /api/hive */
export interface HiveRequest {
  message: string;
  conversationId?: string;
}

/** Response returned by /api/hive */
export interface HiveResponse {
  reply: string;
  type: MessageType;
  metadata?: Record<string, unknown>;
  agents_invoked: AgentInfo[];
  model: string;
}

// ── Syllabus Organizer ────────────────────────────────────────────────────────

export type SyllabusWeight     = 'high' | 'medium' | 'low';
export type SyllabusDifficulty = 'easy' | 'medium' | 'hard';
export type SyllabusNodeType   = 'subject' | 'unit' | 'chapter' | 'topic' | 'subtopic';

export interface SyllabusNode {
  id: string;
  name: string;
  type: SyllabusNodeType;
  description?: string;
  weight?: SyllabusWeight;
  difficulty?: SyllabusDifficulty;
  estimatedHours?: number;
  children?: SyllabusNode[];
}

// ── Materials ─────────────────────────────────────────────────────────────────

export interface UploadedMaterial {
  id?: string;
  user_id: string;
  filename: string;
  content_summary?: string;
  created_at?: string;
}

// ── Integrations (device data) ────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'disconnected' | 'pending';

export interface SleepNight {
  date: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'great';
  bedtime: string;
  wakeTime: string;
  deep: number;    // fraction 0–1
  rem: number;     // fraction 0–1
  light: number;   // fraction 0–1
}

// ── Context Engine ────────────────────────────────────────────────────────────

/** Full student context injected into every Hive prompt. */
export interface StudentContext {
  profile: Pick<UserProfile, 'name' | 'target_exam' | 'weaknesses'>;
  mood_history: { date: string; score: number; note?: string }[];
  upcoming_events: { title: string; date: string }[];
  uploaded_materials: string[];
}
