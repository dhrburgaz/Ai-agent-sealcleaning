/**
 * Agents 15/16 — Scheduling & Route Agent / Calendar & Appointment Agent
 * (master spec section 9). Deterministic double-booking prevention: a single
 * crew can only be in one place at a time, and travel between jobs takes real
 * minutes, so a proposed slot must never overlap an existing booking once
 * each side's travel buffer is included.
 */

export interface TimeSlot {
  startsAt: Date;
  endsAt: Date;
  /** Minutes of travel padding required before/after this slot. */
  travelBufferMinutes?: number;
}

export interface ExistingBooking extends TimeSlot {
  id: string;
  title: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ExistingBooking[];
}

function expandWithBuffer(slot: TimeSlot): { start: number; end: number } {
  const bufferMs = (slot.travelBufferMinutes ?? 0) * 60_000;
  return { start: slot.startsAt.getTime() - bufferMs, end: slot.endsAt.getTime() + bufferMs };
}

/**
 * Two time ranges (each padded by its own travel buffer) conflict when they
 * overlap at all. Back-to-back bookings with buffers that exactly touch
 * (end === start) are not a conflict.
 */
export function findSchedulingConflicts(
  candidate: TimeSlot,
  existing: ExistingBooking[],
): ConflictCheckResult {
  const cand = expandWithBuffer(candidate);
  const conflicts = existing.filter((booking) => {
    const other = expandWithBuffer(booking);
    return cand.start < other.end && other.start < cand.end;
  });
  return { hasConflict: conflicts.length > 0, conflicts };
}

export interface AppointmentValidationInput {
  startsAt: Date;
  endsAt: Date;
}

export interface AppointmentValidationResult {
  valid: boolean;
  reason?: string;
}

/** A slot must end after it starts and must not be proposed in the past. */
export function validateAppointmentWindow(
  input: AppointmentValidationInput,
  now: Date = new Date(),
): AppointmentValidationResult {
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    return { valid: false, reason: 'Bitiş zamanı başlangıçtan sonra olmalı.' };
  }
  if (input.startsAt.getTime() < now.getTime()) {
    return { valid: false, reason: 'Randevu geçmiş bir zamana planlanamaz.' };
  }
  return { valid: true };
}
