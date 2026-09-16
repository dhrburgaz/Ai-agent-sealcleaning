'use server';

import { db } from '@/db/client';
import { leads, quotes } from '@/db/schema';
import { parseOwnerCommand, renderStatusBriefing, UNSUPPORTED_COMMAND_REPLY } from '@/lib/agents/beyza-orchestrator';
import { buildStatusSnapshot } from '@/lib/server/status-snapshot';

export interface AskBeyzaState {
  answer?: string;
}

export async function askBeyzaAction(
  _prevState: AskBeyzaState,
  formData: FormData,
): Promise<AskBeyzaState> {
  const text = String(formData.get('command') ?? '');
  const parsed = parseOwnerCommand(text);
  const snapshot = await buildStatusSnapshot();

  switch (parsed.intent) {
    case 'status_briefing':
      return { answer: renderStatusBriefing(snapshot) };

    case 'leads_today_count':
      return { answer: `Bugün ${snapshot.leadsLast24h} yeni lead geldi.` };

    case 'top_hot_leads': {
      const hotLeads = (await db.select().from(leads))
        .filter((l) => l.priority === 'hot')
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, parsed.count);
      if (hotLeads.length === 0) return { answer: 'Şu anda sıcak lead yok.' };
      return {
        answer: hotLeads
          .map((l, i) => `${i + 1}. ${l.serviceCategory ?? 'Genel talep'} — ${l.location ?? 'konum belirtilmemiş'}`)
          .join('\n'),
      };
    }

    case 'leads_in_city': {
      const cityLeads = (await db.select().from(leads)).filter((l) =>
        (l.location ?? '').toLowerCase().includes(parsed.city.toLowerCase()),
      );
      return {
        answer:
          cityLeads.length > 0
            ? `${parsed.city} içinde ${cityLeads.length} lead var.`
            : `${parsed.city} içinde şu anda lead görünmüyor.`,
      };
    }

    case 'pending_quotes':
      return {
        answer:
          snapshot.quotesPending > 0
            ? `${snapshot.quotesPending} bekleyen teklif var, toplam değer ${Math.round(snapshot.quotesPendingValueEur)} euro.`
            : 'Bekleyen teklif yok.',
      };

    case 'unanswered_leads':
      return {
        answer:
          snapshot.unansweredInbound > 0
            ? `${snapshot.unansweredInbound} müşteri mesajı hâlâ cevap bekliyor.`
            : 'Cevap bekleyen müşteri mesajı yok.',
      };

    case 'weekly_profit': {
      const sentOrAccepted = (await db.select().from(quotes)).filter((q) => q.status === 'accepted');
      const total = sentOrAccepted.reduce((sum, q) => sum + q.totalExVat, 0);
      return { answer: `Kabul edilen tekliflerin toplam değeri ${Math.round(total)} euro.` };
    }

    case 'profit_floor_check':
      return {
        answer:
          'Kâr hedefi kontrolü teklif bazında yapılır — bir teklifi açıp "Neden?" görünümünden kontrol edebilirsiniz.',
      };

    default:
      return { answer: UNSUPPORTED_COMMAND_REPLY };
  }
}
