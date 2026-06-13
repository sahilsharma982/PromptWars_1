import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveJournalEntry,
  getRecentJournalEntries,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getUserProfile,
  buildStudentContext,
} from '@/lib/db';

// Chainable thenable query mock helper
function createSupabaseMock(data: any = null, error: any = null) {
  const query: any = {
    insert: vi.fn(() => query),
    upsert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(() => query),
    then: (resolve: any) => resolve({ data, error }),
  };
  return query;
}

const mockFrom = vi.fn();

vi.mock('@/lib/supabaseClient', () => {
  return {
    getAdminClient: () => ({
      from: mockFrom,
    }),
  };
});

describe('Database Helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFrom.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Zero-Config Demo Mode (Supabase not configured)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    });

    it('should degrade saveJournalEntry gracefully', async () => {
      const result = await saveJournalEntry({
        user_id: '123',
        mood: 4,
        content: 'Feeling good',
        triggers: ['study'],
        support_message: 'Keep it up',
        strategies: ['break'],
      });
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should degrade getRecentJournalEntries to empty array', async () => {
      const result = await getRecentJournalEntries('123');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should degrade getCalendarEvents to empty array', async () => {
      const result = await getCalendarEvents('123');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('Configured Mode (Supabase active)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    });

    it('should call select and insert with correct values on saveJournalEntry', async () => {
      const entry = {
        user_id: 'test-user',
        mood: 5,
        content: 'Excited',
        triggers: ['exam'],
        support_message: 'Go win!',
        strategies: ['breath'],
      };

      const mockQuery = createSupabaseMock({ id: 'journal-1', ...entry });
      mockFrom.mockReturnValue(mockQuery);

      const result = await saveJournalEntry(entry);

      expect(mockFrom).toHaveBeenCalledWith('journal_entries');
      expect(mockQuery.insert).toHaveBeenCalledWith(entry);
      expect(result).toEqual({ id: 'journal-1', ...entry });
    });

    it('should return empty list when getRecentJournalEntries is called but DB query fails', async () => {
      const mockQuery = createSupabaseMock(null, { message: 'DB Error' });
      mockFrom.mockReturnValue(mockQuery);

      const result = await getRecentJournalEntries('test-user');
      expect(result).toEqual([]);
    });

    it('should delete calendar events successfully', async () => {
      const mockQuery = createSupabaseMock({ success: true });
      mockFrom.mockReturnValue(mockQuery);

      const ok = await deleteCalendarEvent('event-123');
      expect(ok).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('calendar_events');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'event-123');
    });
  });

  describe('Context Engine Builder', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    });

    it('should compile correct student context structure', async () => {
      // Mock different tables dynamically
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return createSupabaseMock({ id: 'user-1', name: 'Sahil', target_exam: 'JEE', weaknesses: ['Maths'] });
        }
        if (table === 'journal_entries') {
          return createSupabaseMock([
            { mood: 3, content: 'Tired', created_at: '2026-06-13T10:00:00Z' },
          ]);
        }
        if (table === 'calendar_events') {
          return createSupabaseMock([
            { title: 'Physics exam', event_date: '2026-06-15', event_time: '10:00', type: 'exam', ai_scheduled: false },
          ]);
        }
        return createSupabaseMock([]);
      });

      const context = await buildStudentContext('user-1');

      expect(context.profile.name).toBe('Sahil');
      expect(context.profile.target_exam).toBe('JEE');
      expect(context.profile.weaknesses).toEqual(['Maths']);
      expect(context.mood_history).toEqual([
        { date: '2026-06-13', score: 3, note: 'Tired' },
      ]);
      expect(context.upcoming_events).toEqual([
        { title: 'Physics exam', date: '2026-06-15' },
      ]);
    });
  });
});
