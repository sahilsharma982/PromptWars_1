/**
 * Client-side chat persistence for when Supabase is unavailable.
 */

export interface StoredConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'quiz' | 'calendar_event' | 'insight';
  metadata?: Record<string, unknown> | null;
  agents?: { key: string; name: string; emoji: string; summary: string }[];
  created_at?: string;
}

const CONV_KEY = 'mindspace_conversations';

function messagesKey(id: string) {
  return `mindspace_messages_${id}`;
}

export function loadLocalConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalConversations(conversations: StoredConversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.error('[chatStorage] Failed to save conversations:', err);
  }
}

export function loadLocalMessages(conversationId: string): StoredMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(messagesKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalMessages(conversationId: string, messages: StoredMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(messagesKey(conversationId), JSON.stringify(messages));
  } catch (err) {
    console.error('[chatStorage] Failed to save messages:', err);
  }
}

export function upsertLocalConversation(conversation: StoredConversation): void {
  const list = loadLocalConversations();
  const idx = list.findIndex(c => c.id === conversation.id);
  if (idx >= 0) list[idx] = conversation;
  else list.unshift(conversation);
  list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  saveLocalConversations(list);
}

export function deleteLocalConversation(id: string): void {
  saveLocalConversations(loadLocalConversations().filter(c => c.id !== id));
  localStorage.removeItem(messagesKey(id));
}
