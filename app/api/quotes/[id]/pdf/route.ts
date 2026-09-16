import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { db } from '@/db/client';
import { quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote || !quote.pdfPath || !fs.existsSync(quote.pdfPath)) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }

  const bytes = fs.readFileSync(quote.pdfPath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
