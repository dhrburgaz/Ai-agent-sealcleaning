import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guard';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { SessionHeartbeat } from '@/components/dashboard/SessionHeartbeat';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { BootGate } from '@/components/beyza/boot/BootGate';
import { AnimationQualityGate } from '@/components/beyza/AnimationQualityGate';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <BootGate />
      </Suspense>
      <AnimationQualityGate />
      <SessionHeartbeat />
      <DashboardNav displayName={auth.displayName ?? ''} />
      <main className="flex-1 overflow-x-hidden p-6 pb-24 sm:p-10 sm:pb-10">{children}</main>
      <MobileNav />
    </div>
  );
}
