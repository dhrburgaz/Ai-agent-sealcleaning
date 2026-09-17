'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { db } from '@/db/client';
import { appointments, calendarEvents, leads, leadEvents, jobs, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import {
  findSchedulingConflicts,
  validateAppointmentWindow,
  type ExistingBooking,
} from '@/lib/scheduling/calendar';
import { recordAgentRun } from '@/lib/orchestration';

const DEFAULT_TRAVEL_BUFFER_MINUTES = 15;

async function loadExistingBookings(excludeAppointmentId?: string): Promise<ExistingBooking[]> {
  const allAppointments = await db.select().from(appointments);
  const allCalendarEvents = await db.select().from(calendarEvents);

  const fromAppointments: ExistingBooking[] = allAppointments
    .filter((a) => a.status !== 'cancelled' && a.id !== excludeAppointmentId)
    .map((a) => ({
      id: a.id,
      title: `${a.kind} randevusu`,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      travelBufferMinutes: a.travelBufferMinutes,
    }));

  // calendar_events mirrors confirmed appointments (see confirmAppointmentAction)
  // plus manual/job entries that never go through the appointments table —
  // dedupe by appointmentId so a confirmed site visit isn't checked twice.
  const mirroredAppointmentIds = new Set(fromAppointments.map((a) => a.id));
  const fromCalendarEvents: ExistingBooking[] = allCalendarEvents
    .filter((e) => !e.appointmentId || !mirroredAppointmentIds.has(e.appointmentId))
    .map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      travelBufferMinutes: DEFAULT_TRAVEL_BUFFER_MINUTES,
    }));

  return [...fromAppointments, ...fromCalendarEvents];
}

export interface ProposeAppointmentState {
  error?: string;
}

export async function proposeAppointmentAction(
  _prev: ProposeAppointmentState,
  formData: FormData,
): Promise<ProposeAppointmentState> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '') || null;
  const kind = String(formData.get('kind') ?? 'site_visit') as 'site_visit' | 'job';
  const startsAt = new Date(String(formData.get('startsAt') ?? ''));
  const endsAt = new Date(String(formData.get('endsAt') ?? ''));
  const travelBufferMinutes = Number(formData.get('travelBufferMinutes') ?? DEFAULT_TRAVEL_BUFFER_MINUTES);

  const windowCheck = validateAppointmentWindow({ startsAt, endsAt });
  if (!windowCheck.valid) return { error: windowCheck.reason };

  const existing = await loadExistingBookings();
  const conflictCheck = findSchedulingConflicts({ startsAt, endsAt, travelBufferMinutes }, existing);
  if (conflictCheck.hasConflict) {
    return {
      error: `Bu zaman diliminde ${conflictCheck.conflicts.length} çakışma var: ${conflictCheck.conflicts
        .map((c) => c.title)
        .join(', ')}.`,
    };
  }

  const [appointment] = await db
    .insert(appointments)
    .values({ leadId, kind, startsAt, endsAt, travelBufferMinutes, status: 'proposed' })
    .returning();

  if (leadId && kind === 'site_visit') {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (lead && lead.state === 'QUALIFIED') {
      await db.update(leads).set({ state: 'SITE_VISIT_PROPOSED', updatedAt: new Date() }).where(eq(leads.id, leadId));
      await db.insert(leadEvents).values({
        leadId,
        kind: 'state_transition',
        fromState: 'QUALIFIED',
        toState: 'SITE_VISIT_PROPOSED',
        actor: auth.displayName ?? 'owner',
        detail: 'Keşif randevusu önerildi (Agent 16).',
      });
    }
  }

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'appointment_proposed',
    entityType: 'appointment',
    entityId: appointment!.id,
    after: { leadId, kind, startsAt, endsAt },
  });

  await recordAgentRun({
    agentKey: 'agent16_calendar',
    triggeredBy: 'proposeAppointmentAction',
    entityType: 'appointment',
    entityId: appointment!.id,
    outputSummary: { leadId, kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });

  revalidatePath('/dashboard/calendar');
  if (leadId) revalidatePath(`/dashboard/leads/${leadId}`);
  return {};
}

export async function confirmAppointmentAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const appointmentId = String(formData.get('appointmentId') ?? '');

  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appointment) throw new Error('Appointment not found');

  await db.update(appointments).set({ status: 'confirmed', updatedAt: new Date() }).where(eq(appointments.id, appointmentId));

  await db.insert(calendarEvents).values({
    appointmentId,
    kind: appointment.kind === 'site_visit' ? 'site_visit' : 'job',
    title: appointment.kind === 'site_visit' ? 'Keşif randevusu' : 'İş',
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    jobId: appointment.jobId,
    icsUid: `appointment-${appointmentId}@beyza`,
  });

  if (appointment.leadId && appointment.kind === 'site_visit') {
    const [lead] = await db.select().from(leads).where(eq(leads.id, appointment.leadId)).limit(1);
    if (lead && lead.state === 'SITE_VISIT_PROPOSED') {
      await db.update(leads).set({ state: 'SITE_VISIT_BOOKED', updatedAt: new Date() }).where(eq(leads.id, lead.id));
      await db.insert(leadEvents).values({
        leadId: lead.id,
        kind: 'state_transition',
        fromState: 'SITE_VISIT_PROPOSED',
        toState: 'SITE_VISIT_BOOKED',
        actor: auth.displayName ?? 'owner',
        detail: 'Keşif randevusu onaylandı (Agent 16).',
      });
    }
  }

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'appointment_confirmed',
    entityType: 'appointment',
    entityId: appointmentId,
  });

  revalidatePath('/dashboard/calendar');
  if (appointment.leadId) revalidatePath(`/dashboard/leads/${appointment.leadId}`);
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const appointmentId = String(formData.get('appointmentId') ?? '');

  await db.update(appointments).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(appointments.id, appointmentId));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'appointment_cancelled',
    entityType: 'appointment',
    entityId: appointmentId,
  });

  revalidatePath('/dashboard/calendar');
}

export interface AddCalendarEventState {
  error?: string;
}

export async function addCalendarEventAction(
  _prev: AddCalendarEventState,
  formData: FormData,
): Promise<AddCalendarEventState> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const title = String(formData.get('title') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'private_block');
  const startsAt = new Date(String(formData.get('startsAt') ?? ''));
  const endsAt = new Date(String(formData.get('endsAt') ?? ''));

  if (!title) return { error: 'Başlık gerekli.' };
  const windowCheck = validateAppointmentWindow({ startsAt, endsAt });
  if (!windowCheck.valid) return { error: windowCheck.reason };

  const existing = await loadExistingBookings();
  const conflictCheck = findSchedulingConflicts(
    { startsAt, endsAt, travelBufferMinutes: DEFAULT_TRAVEL_BUFFER_MINUTES },
    existing,
  );
  if (conflictCheck.hasConflict) {
    return {
      error: `Bu zaman diliminde çakışma var: ${conflictCheck.conflicts.map((c) => c.title).join(', ')}.`,
    };
  }

  const [event] = await db
    .insert(calendarEvents)
    .values({ title, kind, startsAt, endsAt, icsUid: `manual-${randomUUID()}@beyza` })
    .returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'calendar_event_added',
    entityType: 'calendar_event',
    entityId: event!.id,
    after: { title, kind, startsAt, endsAt },
  });

  revalidatePath('/dashboard/calendar');
  return {};
}

export interface ScheduleJobState {
  error?: string;
}

export async function scheduleJobAction(_prev: ScheduleJobState, formData: FormData): Promise<ScheduleJobState> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const jobId = String(formData.get('jobId') ?? '');
  const startsAt = new Date(String(formData.get('startsAt') ?? ''));
  const endsAt = new Date(String(formData.get('endsAt') ?? ''));

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return { error: 'İş bulunamadı.' };

  const windowCheck = validateAppointmentWindow({ startsAt, endsAt });
  if (!windowCheck.valid) return { error: windowCheck.reason };

  const existing = await loadExistingBookings();
  const conflictCheck = findSchedulingConflicts(
    { startsAt, endsAt, travelBufferMinutes: DEFAULT_TRAVEL_BUFFER_MINUTES },
    existing,
  );
  if (conflictCheck.hasConflict) {
    return {
      error: `Bu zaman diliminde çakışma var: ${conflictCheck.conflicts.map((c) => c.title).join(', ')}.`,
    };
  }

  await db.update(jobs).set({ scheduledStart: startsAt, scheduledEnd: endsAt, updatedAt: new Date() }).where(eq(jobs.id, jobId));

  await db.insert(calendarEvents).values({
    jobId,
    kind: 'job',
    title: 'Planlanmış iş',
    startsAt,
    endsAt,
    icsUid: `job-${jobId}@beyza`,
  });

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'job_scheduled',
    entityType: 'job',
    entityId: jobId,
    after: { startsAt, endsAt },
  });

  await recordAgentRun({
    agentKey: 'agent15_scheduling_route',
    triggeredBy: 'scheduleJobAction',
    entityType: 'job',
    entityId: jobId,
    outputSummary: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });

  revalidatePath('/dashboard/calendar');
  revalidatePath(`/dashboard/jobs/${jobId}`);
  return {};
}
