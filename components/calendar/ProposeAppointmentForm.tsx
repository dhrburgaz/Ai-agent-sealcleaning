'use client';

import { useActionState } from 'react';
import { proposeAppointmentAction, type ProposeAppointmentState } from '@/app/dashboard/calendar/actions';

const initialState: ProposeAppointmentState = {};

export function ProposeAppointmentForm({ leads }: { leads: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(proposeAppointmentAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <select name="leadId" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2">
        <option value="">— Lead seç —</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <input type="hidden" name="kind" value="site_visit" />
      <label className="flex flex-col gap-1 text-xs text-muted">
        Başlangıç
        <input name="startsAt" type="datetime-local" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Bitiş
        <input name="endsAt" type="datetime-local" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
        Yol payı (dakika)
        <input name="travelBufferMinutes" type="number" defaultValue={15} min={0} className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <button type="submit" disabled={pending} className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">
        {pending ? '…' : 'Keşif randevusu öner'}
      </button>
      {state.error && <p className="text-sm text-accent sm:col-span-2">{state.error}</p>}
    </form>
  );
}
