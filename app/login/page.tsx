import { redirect } from 'next/navigation';
import { hasAnyUser } from '@/lib/server/repo';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const anyUser = await hasAnyUser();
  if (!anyUser) redirect('/setup');

  return (
    <main className="mosque-skyline-backdrop flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised/90 p-8 shadow-premium backdrop-blur">
        <h1 className="mb-1 text-2xl font-semibold text-ink">BEYZA SECURITY</h1>
        <p className="mb-6 text-sm text-muted">Komuta merkezine giriş yapın.</p>
        <LoginForm />
      </div>
    </main>
  );
}
