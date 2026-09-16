import { redirect } from 'next/navigation';
import { hasAnyUser } from '@/lib/server/repo';
import { SetupWizard } from '@/components/setup/SetupWizard';

export default async function SetupPage() {
  if (await hasAnyUser()) {
    redirect('/dashboard');
  }

  return (
    <main className="mosque-skyline-backdrop flex min-h-screen items-center justify-center px-4 py-12">
      <SetupWizard />
    </main>
  );
}
