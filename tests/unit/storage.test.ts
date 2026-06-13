import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadLocalConversations,
  saveLocalConversations,
  upsertLocalConversation,
  deleteLocalConversation,
} from '@/lib/chatStorage';
import {
  loadLocalCalendarEvents,
  saveLocalCalendarEvents,
  mergeCalendarEvents,
  isLocalOnlyId,
} from '@/lib/calendarStorage';
import {
  loadLocalJournalEntries,
  saveLocalJournalEntries,
  upsertLocalJournalEntry,
  getLocalJournalEntry,
  mergeJournalEntries,
  isLocalOnlyJournalId,
} from '@/lib/journalStorage';

describe('Storage Helpers (chatStorage, calendarStorage, journalStorage)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
    };

    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('chatStorage', () => {
    it('should save and load conversations', () => {
      const mockConvs = [
        { id: '1', title: 'Conversation 1', created_at: '2026-06-13T10:00:00Z', updated_at: '2026-06-13T10:00:00Z' }
      ];

      saveLocalConversations(mockConvs);
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(loadLocalConversations()).toEqual(mockConvs);
    });

    it('should upsert and sort conversations by updated_at', () => {
      const conv1 = { id: '1', title: 'Conv 1', created_at: '2026-06-13T10:00:00Z', updated_at: '2026-06-13T10:00:00Z' };
      const conv2 = { id: '2', title: 'Conv 2', created_at: '2026-06-13T11:00:00Z', updated_at: '2026-06-13T11:00:00Z' };

      upsertLocalConversation(conv1);
      upsertLocalConversation(conv2);

      const list = loadLocalConversations();
      expect(list[0].id).toBe('2'); // Most recently updated first
      expect(list[1].id).toBe('1');
    });

    it('should delete conversation and remove message file key', () => {
      const conv = { id: 'delete-me', title: 'Test', created_at: '2026-06-13T10:00:00Z', updated_at: '2026-06-13T10:00:00Z' };
      upsertLocalConversation(conv);

      deleteLocalConversation('delete-me');
      expect(loadLocalConversations().length).toBe(0);
      expect(localStorage.removeItem).toHaveBeenCalledWith('mindspace_messages_delete-me');
    });
  });

  describe('calendarStorage', () => {
    it('should load and save calendar events', () => {
      const events = [
        { id: 'local-1', title: 'Study', date: '2026-06-14', type: 'study' as const }
      ];
      saveLocalCalendarEvents(events);
      expect(loadLocalCalendarEvents()).toEqual(events);
    });

    it('should identify local-only IDs', () => {
      expect(isLocalOnlyId('local-123')).toBe(true);
      expect(isLocalOnlyId('seed-456')).toBe(true);
      expect(isLocalOnlyId('db-789')).toBe(false);
      expect(isLocalOnlyId(123)).toBe(false);
    });

    it('should merge events correctly prioritising database and sorting by date/time', () => {
      const local = [
        { id: 'local-1', title: 'Study Maths', date: '2026-06-15', time: '14:00', type: 'study' as const },
        { id: '1', title: 'Stale Local Version', date: '2026-06-14', type: 'study' as const }
      ];
      const db = [
        { id: '1', title: 'Fresh DB Version', date: '2026-06-14', type: 'study' as const },
        { id: 'db-2', title: 'Wellness session', date: '2026-06-15', time: '10:00', type: 'wellness' as const }
      ];

      const merged = mergeCalendarEvents(db, local);
      expect(merged.length).toBe(3);
      expect(merged[0].title).toBe('Fresh DB Version'); // Sorted earliest date first
      expect(merged[1].title).toBe('Wellness session'); // Sorted earliest time first (10:00 vs 14:00)
      expect(merged[2].title).toBe('Study Maths');
    });
  });

  describe('journalStorage', () => {
    it('should CRUD journal entries', () => {
      const entry = {
        id: 'local-j1',
        mood: 4,
        content: 'Journal 1',
        triggers: [],
        support_message: null,
        strategies: [],
        created_at: '2026-06-13T10:00:00Z',
      };

      upsertLocalJournalEntry(entry);
      expect(getLocalJournalEntry('local-j1')).toEqual(entry);
      expect(loadLocalJournalEntries()).toContainEqual(entry);
      expect(isLocalOnlyJournalId('local-j1')).toBe(true);
    });

    it('should merge and sort journal entries', () => {
      const local = [{ id: 'local-1', mood: 2, content: 'Old', triggers: [], support_message: null, strategies: [], created_at: '2026-06-11T10:00:00Z' }];
      const db = [{ id: 'db-1', mood: 4, content: 'New', triggers: [], support_message: null, strategies: [], created_at: '2026-06-12T10:00:00Z' }];

      const merged = mergeJournalEntries(db, local);
      expect(merged[0].id).toBe('db-1'); // Most recent first
      expect(merged[1].id).toBe('local-1');
    });
  });
});
