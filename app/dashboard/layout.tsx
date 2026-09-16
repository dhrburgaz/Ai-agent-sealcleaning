import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guard';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { SessionHeartbeat } from '@/components/dashboard/SessionHeartbeat';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <SessionHeartbeat />
      <DashboardNav displayName={auth.displayName ?? ''} />
      <main className="flex-1 overflow-x-hidden p-6 sm:p-10">{children}</main>
    </div>
  );
}
