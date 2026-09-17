import { describe, it, expect } from 'vitest';
import { buildIcsCalendar, parseIcsCalendar } from '@/lib/scheduling/ics';

describe('buildIcsCalendar', () => {
  it('produces a well-formed VCALENDAR with one VEVENT', () => {
    const ics = buildIcsCalendar([
      {
        uid: 'appt-1@beyza',
        title: 'Keşif — Jansen',
        startsAt: new Date('2026-01-10T09:00:00Z'),
        endsAt: new Date('2026-01-10T10:00:00Z'),
        location: 'Dordrecht',
      },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:appt-1@beyza');
    expect(ics).toContain('DTSTART:20260110T090000Z');
    expect(ics).toContain('DTEND:20260110T100000Z');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    // CRLF line endings per RFC 5545.
    expect(ics).toContain('\r\n');
  });

  it('escapes special characters in text fields', () => {
    const ics = buildIcsCalendar([
      {
        uid: 'appt-2@beyza',
        title: 'Klant; wil, iets\nextra',
        startsAt: new Date('2026-01-10T09:00:00Z'),
        endsAt: new Date('2026-01-10T10:00:00Z'),
      },
    ]);
    expect(ics).toContain('Klant\\; wil\\, iets\\nextra');
  });
});

describe('parseIcsCalendar', () => {
  it('round-trips events built by buildIcsCalendar', () => {
    const original = [
      {
        uid: 'appt-3@beyza',
        title: 'Terrace job',
        startsAt: new Date('2026-02-01T08:00:00Z'),
        endsAt: new Date('2026-02-01T16:00:00Z'),
      },
    ];
    const ics = buildIcsCalendar(original);
    const parsed = parseIcsCalendar(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.uid).toBe('appt-3@beyza');
    expect(parsed[0]!.title).toBe('Terrace job');
    expect(parsed[0]!.startsAt.toISOString()).toBe('2026-02-01T08:00:00.000Z');
    expect(parsed[0]!.endsAt.toISOString()).toBe('2026-02-01T16:00:00.000Z');
  });

  it('returns an empty array for text with no VEVENT blocks', () => {
    expect(parseIcsCalendar('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')).toEqual([]);
  });
});
