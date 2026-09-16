'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/login/actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-muted">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-lg border border-border bg-surface-raised px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </div>
      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </button>
    </form>
  );
}
