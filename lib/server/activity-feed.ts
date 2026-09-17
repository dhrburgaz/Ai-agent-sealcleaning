/**
 * Command Center "live activity" stream (section 47 / this session's UX
 * redesign instruction #6). Reads real `agent_runs` rows — never a fake
 * "constant activity" simulation — and renders each into a short Turkish
 * description using the agent's own display name plus whatever structured
 * outputSummary that run actually recorded. A run with nothing distinctive
 * to say still gets an honest generic line rather than an invented one.
 */
import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { agentRuns } from '@/db/schema';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';

export interface ActivityFeedItem {
  id: string;
  agentKey: string;
  agentDisplayName: string;
  description: string;
  status: string;
  cacheHit: boolean;
  confidence: number | null;
  createdAt: Date;
}

const AGENT_DISPLAY_NAME = new Map(AGENT_DEFINITIONS.map((a) => [a.key, a.displayName]));

function describeRun(run: typeof agentRuns.$inferSelect): string {
  const out = (run.outputSummary ?? {}) as Record<string, unknown>;

  if (run.status === 'failed') {
    return `Çalıştırma başarısız oldu${run.errorMessage ? `: ${run.errorMessage}` : '.'}`;
  }

  switch (run.agentKey) {
    case 'agent01_orchestrator':
      return 'Yeni lead sisteme yönlendirildi.';
    case 'agent06_photo_vision':
      return out.reusedExistingAnalysis
        ? 'Fotoğraf daha önce analiz edilmişti — önbellekten kullanıldı.'
        : 'Yeni fotoğraf incelemeye alındı.';
    case 'agent15_scheduling_route':
      return 'İş takvime planlandı, çakışma bulunmadı.';
    case 'agent16_calendar':
      return 'Randevu takvime eklendi.';
    case 'agent17_crm_followup':
      if (typeof out.scheduled === 'boolean') {
        return out.scheduled
          ? 'Takip mesajı otomatik olarak planlandı.'
          : `Takip planlanmadı (${String(out.reason ?? 'sebep belirtilmedi')}).`;
      }
      if (typeof out.sent === 'boolean') {
        return out.sent ? 'Takip mesajı gönderildi.' : 'Takip mesajı taslak olarak hazırlandı.';
      }
      return 'Müşteri kaydı güncellendi.';
    case 'agent19_reputation_content':
      return 'Değerlendirme talebi taslağı hazırlandı.';
    case 'agent20_qa_compliance':
      if (typeof out.blocked === 'boolean') {
        return out.blocked
          ? 'Fiyat kontrolü: teklif engellendi (kâr tabanı veya doğrulama eksik).'
          : 'Fiyat kontrolü: teklif onaylandı.';
      }
      return 'Kalite kontrolü çalıştırıldı.';
    default:
      return `${AGENT_DISPLAY_NAME.get(run.agentKey) ?? run.agentKey} çalıştırıldı.`;
  }
}

export async function buildActivityFeed(limit = 12): Promise<ActivityFeedItem[]> {
  const rows = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);
  return rows.map((run) => ({
    id: run.id,
    agentKey: run.agentKey,
    agentDisplayName: AGENT_DISPLAY_NAME.get(run.agentKey) ?? run.agentKey,
    description: describeRun(run),
    status: run.status,
    cacheHit: run.cacheHit,
    confidence: run.confidence,
    createdAt: run.createdAt,
  }));
}
