'use client';

import { useActionState } from 'react';
import { parseDictationAction, type ParseDictationState } from '@/app/dashboard/jobs/actions';

const initialState: ParseDictationState = {};

export function DictationParser() {
  const [state, formAction, pending] = useActionState(parseDictationAction, initialState);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <form action={formAction} className="flex flex-col gap-2">
        <textarea
          name="dictation"
          placeholder="Beyza, bu iş 2 gün sürdü. Ben ve bir eleman çalıştık. Çöpe 310 euro, kiraya 145 euro, malzemeye 620 euro gitti."
          className="min-h-20 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent"
        >
          {pending ? '…' : 'Ayrıştır (önizleme, kaydetmez)'}
        </button>
      </form>
      {state.raw && (
        <div className="mt-3 rounded-lg bg-surface-raised p-3 text-xs text-muted">
          <div>Gün: {state.daysWorked ?? '—'}</div>
          <div>Ekip büyüklüğü: {state.crewSize ?? '—'}</div>
          <div>
            Maliyetler:{' '}
            {state.costs && state.costs.length > 0
              ? state.costs.map((c) => `${c.category}: €${c.amount}`).join(', ')
              : '—'}
          </div>
          <p className="mt-2 text-ink">
            Doğruysa, aşağıdaki formdan her kalemi tek tek onaylayıp kaydedin.
          </p>
        </div>
      )}
    </div>
  );
}
