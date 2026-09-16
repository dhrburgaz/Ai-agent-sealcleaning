import { redirect } from 'next/navigation';
import { hasAnyUser, isSetupCompleted } from '@/lib/server/repo';
import { requireAuth } from '@/lib/auth/guard';

export default async function RootPage() {
  const setupDone = await isSetupCompleted();
  const anyUser = await hasAnyUser();

  if (!setupDone || !anyUser) {
    redirect('/setup');
  }

  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect('/login');
  }

  redirect('/dashboard');
}
