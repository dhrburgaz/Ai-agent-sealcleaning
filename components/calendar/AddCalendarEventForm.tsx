'use client';

import { useActionState } from 'react';
import { addCalendarEventAction, type AddCalendarEventState } from '@/app/dashboard/calendar/actions';

const initialState: AddCalendarEventState = {};

const KINDS = [
  { value: 'private_block', label: 'Özel / müsait değil' },
  { value: 'supplier_pickup', label: 'Tedarikçi teslim alma' },
  { value: 'rental_pickup', label: 'Kiralık ekipman teslim alma' },
  { value: 'rental_return', label: 'Kiralık ekipman iade' },
  { value: 'disposal_trip', label: 'Atık bertaraf gezisi' },
] as const;

export function AddCalendarEventForm() {
  const [state, formAction, pending] = useActionState(addCalendarEventAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input name="title" placeholder="Başlık" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
      <select name="kind" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2">
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Başlangıç
        <input name="startsAt" type="datetime-local" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Bitiş
        <input name="endsAt" type="datetime-local" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <button type="submit" disabled={pending} className="self-start rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent sm:col-span-2">
        {pending ? '…' : 'Etkinlik ekle'}
      </button>
      {state.error && <p className="text-sm text-accent sm:col-span-2">{state.error}</p>}
    </form>
  );
}
