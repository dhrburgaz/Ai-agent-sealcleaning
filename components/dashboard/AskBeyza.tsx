'use client';

import { useActionState } from 'react';
import { askBeyzaAction, type AskBeyzaState } from '@/app/dashboard/actions';

const initialState: AskBeyzaState = {};

export function AskBeyza() {
  const [state, formAction, pending] = useActionState(askBeyzaAction, initialState);

  return (
    <div className="rounded-2xl border border-border bg-surface-raised/80 p-6 shadow-premium backdrop-blur">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gold">Beyza&apos;ya Sor</h2>
      <form action={formAction} className="flex gap-2">
        <input
          name="command"
          placeholder="Beyza, durumlar ne?"
          required
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? '…' : 'Sor'}
        </button>
      </form>
      {state.answer && (
        <p className="mt-4 whitespace-pre-line rounded-lg bg-surface p-4 text-sm text-ink/90">
          {state.answer}
        </p>
      )}
    </div>
  );
}
