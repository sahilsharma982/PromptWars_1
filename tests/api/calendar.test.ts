import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/calendar/route';
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  getCalendarEvents: vi.fn(),
  createCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  DEMO_USER_ID: '00000000-0000-0000-0000-000000000001',
}));

describe('Calendar API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 200 with list of events from DB', async () => {
      const mockEvents = [
        { id: '1', title: 'Calculus Study Session', event_date: '2026-06-15', type: 'study', ai_scheduled: false }
      ];
      vi.mocked(getCalendarEvents).mockResolvedValue(mockEvents);

      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.events).toEqual(mockEvents);
      expect(getCalendarEvents).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
    });

    it('should handle db errors gracefully returning 500', async () => {
      vi.mocked(getCalendarEvents).mockRejectedValue(new Error('Connection failure'));

      const response = await GET();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Connection failure');
    });
  });

  describe('POST', () => {
    it('should return 400 if title or event_date is missing', async () => {
      const req = new Request('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          event_date: '',
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('required');
    });

    it('should create event and return 200 if Supabase is active', async () => {
      const payload = {
        title: 'Learn Thermochem',
        event_date: '2026-06-16',
        event_time: '14:30',
        type: 'study',
        ai_scheduled: true,
        note: 'High priority topic',
      };

      const createdEvent = { id: 'event-db-123', user_id: '00000000-0000-0000-0000-000000000001', ...payload };
      vi.mocked(createCalendarEvent).mockResolvedValue(createdEvent);

      const req = new Request('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.event).toEqual(createdEvent);
      expect(body.persisted).toBe(true);
      expect(createCalendarEvent).toHaveBeenCalled();
    });

    it('should fall back to local ID if Supabase is inactive/unconfigured', async () => {
      const payload = {
        title: 'Learn Electrostatics',
        event_date: '2026-06-16',
        type: 'study',
      };

      // Create returns null if database unconfigured
      vi.mocked(createCalendarEvent).mockResolvedValue(null);

      const req = new Request('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.event.id).toContain('local-');
      expect(body.persisted).toBe(false);
    });
  });

  describe('DELETE', () => {
    it('should return 400 if id search parameter is missing', async () => {
      const req = new Request('http://localhost/api/calendar');
      const response = await DELETE(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('id is required');
    });

    it('should call delete helper and return status', async () => {
      vi.mocked(deleteCalendarEvent).mockResolvedValue(true);

      const req = new Request('http://localhost/api/calendar?id=event-123');
      const response = await DELETE(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(deleteCalendarEvent).toHaveBeenCalledWith('event-123');
    });
  });
});
