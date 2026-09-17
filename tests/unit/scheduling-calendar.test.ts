import { describe, it, expect } from 'vitest';
import { findSchedulingConflicts, validateAppointmentWindow, type ExistingBooking } from '@/lib/scheduling/calendar';

const existing: ExistingBooking[] = [
  {
    id: 'b1',
    title: 'Keşif — Jansen',
    startsAt: new Date('2026-01-10T09:00:00Z'),
    endsAt: new Date('2026-01-10T10:00:00Z'),
    travelBufferMinutes: 15,
  },
];

describe('findSchedulingConflicts', () => {
  it('flags an overlapping slot as a conflict', () => {
    const result = findSchedulingConflicts(
      { startsAt: new Date('2026-01-10T09:30:00Z'), endsAt: new Date('2026-01-10T10:30:00Z') },
      existing,
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it('flags a slot inside another booking travel buffer as a conflict', () => {
    // existing ends 10:00 + 15min buffer = 10:15; candidate starts 10:10.
    const result = findSchedulingConflicts(
      { startsAt: new Date('2026-01-10T10:10:00Z'), endsAt: new Date('2026-01-10T11:00:00Z') },
      existing,
    );
    expect(result.hasConflict).toBe(true);
  });

  it('allows a slot that starts exactly when the buffered window ends', () => {
    const result = findSchedulingConflicts(
      { startsAt: new Date('2026-01-10T10:15:00Z'), endsAt: new Date('2026-01-10T11:00:00Z') },
      existing,
    );
    expect(result.hasConflict).toBe(false);
  });

  it('allows a slot on a different day', () => {
    const result = findSchedulingConflicts(
      { startsAt: new Date('2026-01-11T09:00:00Z'), endsAt: new Date('2026-01-11T10:00:00Z') },
      existing,
    );
    expect(result.hasConflict).toBe(false);
  });
});

describe('validateAppointmentWindow', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('rejects an end before the start', () => {
    const result = validateAppointmentWindow(
      { startsAt: new Date('2026-01-10T10:00:00Z'), endsAt: new Date('2026-01-10T09:00:00Z') },
      now,
    );
    expect(result.valid).toBe(false);
  });

  it('rejects a slot in the past', () => {
    const result = validateAppointmentWindow(
      { startsAt: new Date('2025-01-01T09:00:00Z'), endsAt: new Date('2025-01-01T10:00:00Z') },
      now,
    );
    expect(result.valid).toBe(false);
  });

  it('accepts a valid future slot', () => {
    const result = validateAppointmentWindow(
      { startsAt: new Date('2026-01-10T09:00:00Z'), endsAt: new Date('2026-01-10T10:00:00Z') },
      now,
    );
    expect(result.valid).toBe(true);
  });
});
