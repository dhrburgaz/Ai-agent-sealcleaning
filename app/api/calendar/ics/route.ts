import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { calendarEvents } from '@/db/schema';
import { requireAuth } from '@/lib/auth/guard';
import { buildIcsCalendar } from '@/lib/scheduling/ics';
import { getCompanyProfile } from '@/lib/server/repo';

/** Agent 16 — ICS export (section 16/47). Exports every confirmed calendar
 *  event (site visits, jobs, manual blocks) as a downloadable .ics file that
 *  imports into any standard calendar app. Read-only, zero cost. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await db.select().from(calendarEvents);
  const company = await getCompanyProfile();

  const ics = buildIcsCalendar(
    events.map((e) => ({
      uid: e.icsUid ?? `event-${e.id}@beyza`,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    })),
    `${company?.companyName ?? 'Beyza Security'} — Beyza Security`,
  );

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="beyza-calendar.ics"',
    },
  });
}
