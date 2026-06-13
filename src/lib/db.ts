/**
 * db.ts — Typed database helpers for MindSpace AI.
 *
 * All functions use the SERVICE_ROLE client (server-only).
 * They gracefully degrade (return safe defaults) when Supabase is
 * not yet configured so the app still runs locally without a DB.
 *
 * DEMO_USER_ID matches the seed in database/schema.sql.
 */

import { getAdminClient } from './supabaseClient';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id?: string;
  user_id: string;
  mood: number;
  content: string;
  triggers: string[];
  support_message: string | null;
  strategies: string[];
  created_at?: string;
}

export type EventType = 'study' | 'exam' | 'wellness' | 'deadline' | 'ai';

export interface CalendarEvent {
  id?: string;
  user_id: string;
  title: string;
  event_date: string;     // 'YYYY-MM-DD'
  event_time?: string;    // 'HH:MM'
  type: EventType;
  ai_scheduled: boolean;
  note?: string;
  created_at?: string;
}

export interface UploadedMaterial {
  id?: string;
  user_id: string;
  filename: string;
  content_summary?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  target_exam: string;
  weaknesses: string[];
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageType = 'text' | 'quiz' | 'calendar_event' | 'insight';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown> | null;
  agents?: { key: string; name: string; emoji: string; summary: string }[];
  created_at: string;
}

// ── Flag: is Supabase configured? ─────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== '');
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'created_at'>): Promise<JournalEntry | null> {
  if (!isConfigured()) { console.warn('[db] Supabase not configured, skipping save'); return null; }
  const db = getAdminClient();
  const { data, error } = await db.from('journal_entries').insert(entry).select().single();
  if (error) { console.error('[db] saveJournalEntry:', error.message); return null; }
  return data;
}

export async function getRecentJournalEntries(userId: string, limit = 7): Promise<JournalEntry[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[db] getRecentJournalEntries:', error.message); return []; }
  return data ?? [];
}

export async function getJournalEntries(userId: string, limit = 50): Promise<JournalEntry[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[db] getJournalEntries:', error.message); return []; }
  return data ?? [];
}

export async function getJournalEntry(userId: string, id: string): Promise<JournalEntry | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) { console.error('[db] getJournalEntry:', error.message); return null; }
  return data;
}

// ── Calendar Events ───────────────────────────────────────────────────────────

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: true });
  if (error) { console.error('[db] getCalendarEvents:', error.message); return []; }
  return data ?? [];
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const { data, error } = await db.from('calendar_events').insert(event).select().single();
  if (error) { console.error('[db] createCalendarEvent:', error.message); return null; }
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const db = getAdminClient();
  const { error } = await db.from('calendar_events').delete().eq('id', id);
  if (error) { console.error('[db] deleteCalendarEvent:', error.message); return false; }
  return true;
}

// ── Chat Conversations ────────────────────────────────────────────────────────

export async function getConversations(userId: string, limit = 30): Promise<ChatConversation[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[db] getConversations:', error.message); return []; }
  return data ?? [];
}

export async function getConversation(conversationId: string, userId: string): Promise<ChatConversation | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const { data, error } = await db
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();
  if (error) { console.error('[db] getConversation:', error.message); return null; }
  return data;
}

export async function createConversation(
  userId: string,
  title = 'New conversation',
  id?: string,
): Promise<ChatConversation | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const row: Record<string, string> = { user_id: userId, title };
  if (id) row.id = id;
  const { data, error } = await db.from('chat_conversations').insert(row).select().single();
  if (error) { console.error('[db] createConversation:', error.message); return null; }
  return data;
}

export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  if (!isConfigured()) return false;
  const db = getAdminClient();
  const { error } = await db
    .from('chat_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId);
  if (error) { console.error('[db] updateConversationTitle:', error.message); return false; }
  return true;
}

export async function touchConversation(conversationId: string): Promise<void> {
  if (!isConfigured()) return;
  const db = getAdminClient();
  await db
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[db] getMessages:', error.message); return []; }
  return data ?? [];
}

export async function saveMessage(
  msg: Omit<ChatMessage, 'id' | 'created_at'> & { id?: string },
): Promise<ChatMessage | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const row: Record<string, unknown> = {
    conversation_id: msg.conversation_id,
    role: msg.role,
    content: msg.content,
    type: msg.type,
    metadata: msg.metadata ?? null,
    agents: msg.agents ?? null,
  };
  if (msg.id) row.id = msg.id;
  const { data, error } = await db.from('chat_messages').insert(row).select().single();
  if (error) { console.error('[db] saveMessage:', error.message); return null; }
  return data;
}

// ── Uploaded Materials ────────────────────────────────────────────────────────

export async function saveMaterial(material: Omit<UploadedMaterial, 'id' | 'created_at'>): Promise<UploadedMaterial | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const { data, error } = await db.from('uploaded_materials').insert(material).select().single();
  if (error) { console.error('[db] saveMaterial:', error.message); return null; }
  return data;
}

export async function getUploadedMaterials(userId: string): Promise<UploadedMaterial[]> {
  if (!isConfigured()) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('uploaded_materials')
    .select('id, user_id, filename, content_summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.error('[db] getUploadedMaterials:', error.message); return []; }
  return data ?? [];
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isConfigured()) return null;
  const db = getAdminClient();
  const { data, error } = await db.from('users').select('*').eq('id', userId).single();
  if (error) { console.error('[db] getUserProfile:', error.message); return null; }
  return data;
}

// ── Context Engine (for Hive) ─────────────────────────────────────────────────
// Builds the full student context object from live DB data.
// Falls back to hardcoded mock if DB is not configured.

export interface StudentContext {
  profile: { name: string; target_exam: string; weaknesses: string[] };
  mood_history: { date: string; score: number; note?: string }[];
  upcoming_events: { title: string; date: string }[];
  uploaded_materials: string[];
}

export async function buildStudentContext(userId: string): Promise<StudentContext> {
  const [profile, journals, events, materials] = await Promise.all([
    getUserProfile(userId),
    getRecentJournalEntries(userId, 7),
    getCalendarEvents(userId),
    getUploadedMaterials(userId),
  ]);

  // Upcoming events (next 14 days)
  const today = new Date();
  const in14  = new Date(today); in14.setDate(today.getDate() + 14);
  const fmt   = (d: Date) => d.toISOString().split('T')[0];

  const upcoming = events
    .filter(e => e.event_date >= fmt(today) && e.event_date <= fmt(in14))
    .slice(0, 5)
    .map(e => ({ title: e.title, date: e.event_date }));

  return {
    profile: {
      name:         profile?.name         ?? 'Student',
      target_exam:  profile?.target_exam  ?? 'JEE Advanced 2027',
      weaknesses:   profile?.weaknesses   ?? ['Thermodynamics', 'Organic Chemistry'],
    },
    mood_history: journals.map(j => ({
      date:  j.created_at?.split('T')[0] ?? 'unknown',
      score: j.mood,
      note:  j.content.slice(0, 100),
    })),
    upcoming_events:    upcoming,
    uploaded_materials: materials.map(m => m.filename),
  };
}
