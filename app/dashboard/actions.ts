'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  leads,
  customers,
  quotes,
  estimates,
  estimateLines,
  assumptions,
  attachments,
  photoAnalyses,
  jobs,
  actualCosts,
  suppliers,
  supplierProducts,
  supplierPriceObservations,
  appointments,
} from '@/db/schema';
import { parseOwnerCommand, renderStatusBriefing, UNSUPPORTED_COMMAND_REPLY } from '@/lib/agents/beyza-orchestrator';
import { buildStatusSnapshot } from '@/lib/server/status-snapshot';
import { evaluateHypotheticalPrice, type PricingCostInputs } from '@/lib/pricing/engine';
import { compareSuppliers, type SupplierObservationInput } from '@/lib/suppliers/landed-cost';
import { compareEstimateToActuals, sumActualCosts } from '@/lib/jobs/costing';
import { requireAuth } from '@/lib/auth/guard';
import { generateQuoteForEstimate } from './leads/[id]/actions';

export interface AskBeyzaState {
  answer?: string;
  /** Section 17 (AI-controlled UI): when set, the client navigates here
   *  after showing the answer — e.g. opening the lead Beyza just described.
   *  Never used for a high-impact/destructive action; those still require
   *  the owner to act from the opened page (approval rules unchanged). */
  navigateTo?: string;
}

const NEEDS_LEAD_CONTEXT_REPLY =
  'Bu komut belirli bir işe bağlı — ilgili lead sayfasını açıp oradaki "Beyza\'ya Sor" kutusundan tekrar deneyin.';

async function costInputsForEstimate(estimateId: string): Promise<PricingCostInputs> {
  const lines = await db.select().from(estimateLines).where(eq(estimateLines.estimateId, estimateId));
  const find = (category: string) => lines.find((l) => l.category === category)?.totalCost ?? 0;
  return {
    labour: find('labour'),
    materials: find('materials'),
    rentals: 0,
    waste: find('waste'),
    logistics: 0,
    subcontractors: 0,
    permits: 0,
    consumables: find('consumables'),
    overhead: find('overhead'),
    riskReserve: find('risk'),
  };
}

export async function askBeyzaAction(
  _prevState: AskBeyzaState,
  formData: FormData,
): Promise<AskBeyzaState> {
  const text = String(formData.get('command') ?? '');
  const leadId = String(formData.get('leadId') ?? '') || null;
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

    case 'tomorrow_availability': {
      const now = new Date();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
      const tomorrowAppointments = (await db.select().from(appointments))
        .filter(
          (a) => a.status !== 'cancelled' && a.startsAt >= tomorrowStart && a.startsAt < tomorrowEnd,
        )
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      if (tomorrowAppointments.length === 0) {
        return { answer: 'Yarın için planlanmış randevu yok — boşsunuz.', navigateTo: '/dashboard/calendar' };
      }
      const list = tomorrowAppointments
        .map((a) => `${new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(a.startsAt)} — ${a.kind === 'site_visit' ? 'keşif' : 'iş'}`)
        .join(', ');
      return { answer: `Yarın ${tomorrowAppointments.length} randevunuz var: ${list}.`, navigateTo: '/dashboard/calendar' };
    }

    case 'open_hottest_lead': {
      const hottest = (await db.select().from(leads))
        .filter((l) => l.priority === 'hot')
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))[0];
      if (!hottest) return { answer: 'Şu anda sıcak bir lead yok.' };
      const customer = hottest.customerId
        ? (await db.select().from(customers).where(eq(customers.id, hottest.customerId)).limit(1))[0]
        : null;
      return {
        answer: `En yüksek öncelikli lead: ${customer?.name ?? 'bilinmeyen müşteri'} — ${hottest.serviceCategory ?? 'genel talep'} (${hottest.location ?? 'konum belirtilmemiş'}). Açılıyor.`,
        navigateTo: `/dashboard/leads/${hottest.id}`,
      };
    }

    case 'open_quote_for_customer': {
      const matchingCustomers = (await db.select().from(customers)).filter((c) =>
        c.name.toLowerCase().includes(parsed.name.toLowerCase()),
      );
      if (matchingCustomers.length === 0) {
        return { answer: `"${parsed.name}" adında kayıtlı bir müşteri bulamadım.` };
      }
      const customerIds = new Set(matchingCustomers.map((c) => c.id));
      const matchingLeads = (await db.select().from(leads)).filter((l) => l.customerId && customerIds.has(l.customerId));
      const leadIds = new Set(matchingLeads.map((l) => l.id));
      const matchingQuotes = (await db.select().from(quotes))
        .filter((q) => leadIds.has(q.leadId))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (matchingQuotes.length === 0) {
        return { answer: `${matchingCustomers[0]!.name} için hazırlanmış bir teklif bulamadım.` };
      }
      return {
        answer: `${matchingCustomers[0]!.name} için ${matchingQuotes[0]!.quoteNumber} numaralı teklif açılıyor.`,
        navigateTo: `/dashboard/leads/${matchingQuotes[0]!.leadId}`,
      };
    }

    case 'hypothetical_price': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const [estimate] = await db
        .select()
        .from(estimates)
        .where(eq(estimates.leadId, leadId))
        .orderBy(desc(estimates.createdAt))
        .limit(1);
      if (!estimate) return { answer: 'Bu lead için henüz bir fiyat hesaplanmamış.' };
      const costs = await costInputsForEstimate(estimate.id);
      const result = evaluateHypotheticalPrice(costs, parsed.amountEur, estimate.minimumTargetGrossProfit);
      return {
        answer: `${parsed.amountEur} euroya verirseniz: maliyet €${result.costWithOverhead}, kâr €${result.grossProfit} (%${(result.grossMargin * 100).toFixed(0)} marj). ${
          result.meetsProfitFloor
            ? 'Kâr hedefini karşılıyor.'
            : `Kâr hedefinin €${result.shortfallVsFloor} altında kalıyor.`
        }`,
      };
    }

    case 'set_target_margin':
      return {
        answer: `Marjı %${parsed.percent} yapmak genel bir fiyatlandırma ayarıdır ve tüm gelecek teklifleri etkiler. Güvenlik nedeniyle bunu sesli/metin komuttan doğrudan uygulamıyorum — Ayarlar > Fiyatlandırma politikası sayfasından onaylayarak değiştirebilirsiniz.`,
      };

    case 'set_area_m2':
      return {
        answer: `${parsed.value} m² olarak not aldım. Bu bilgiyle fiyat hesaplamak için ilgili lead sayfasındaki "40 m² Keramik Teras Şablonu" formuna bu değeri girip gönderin.`,
      };

    case 'set_material_sourcing':
      return {
        answer: `${parsed.material === 'tiles' ? 'Tegel' : 'Kum'} kaynağını "${
          parsed.suppliedBy === 'customer' ? 'müşteri sağlıyor' : 'biz sağlıyoruz'
        }" olarak not aldım. Fiyatı güncellemek için teklif formunda bu seçimi yapıp yeniden gönderin.`,
      };

    case 'set_disposal_included':
      return {
        answer: 'Afvoer/atık dahil etme seçimini teklif formundaki ilgili kutucuktan işaretleyip fiyatı güncelleyebilirsiniz.',
      };

    case 'cheapest_supplier_for': {
      const products = (await db.select().from(supplierProducts)).filter((p) =>
        p.material.toLowerCase().includes(parsed.material.toLowerCase()),
      );
      if (products.length === 0) {
        return { answer: `"${parsed.material}" için kayıtlı tedarikçi verisi yok.` };
      }
      const supplierRows = await db.select().from(suppliers);
      const allObservations = await db.select().from(supplierPriceObservations);
      const inputs: SupplierObservationInput[] = products.flatMap((product) => {
        const supplier = supplierRows.find((s) => s.id === product.supplierId);
        return allObservations
          .filter((o) => o.supplierProductId === product.id)
          .map((o) => ({
            supplierId: supplier?.id ?? '',
            supplierName: supplier?.name ?? 'Bilinmeyen',
            unitPrice: o.unitPrice,
            vatIncluded: o.vatIncluded,
            vatRatePercent: 21,
            deliveryFee: o.deliveryFee ?? 0,
            pickupAvailable: Boolean(o.pickupAvailable),
            minimumOrder: 0,
            discountLabel: o.discountLabel ?? undefined,
            discountEvidenceUrl: o.discountEvidenceUrl ?? undefined,
            distanceKm: 0,
            preferred: Boolean(supplier?.preferred),
            observedAt: o.observedAt,
            staleAfter: o.staleAfter ?? undefined,
          }));
      });
      if (inputs.length === 0) return { answer: `"${parsed.material}" için fiyat gözlemi kaydı yok.` };
      const comparison = compareSuppliers(inputs, 1);
      if (!comparison.cheapest) return { answer: 'Güncel (güncelliğini yitirmemiş) bir fiyat bulunamadı.' };
      return {
        answer: `En ucuz: ${comparison.cheapest.supplierName}, birim landed maliyet ≈ €${comparison.cheapest.landedCostForJob.toFixed(2)}. Öneri: ${comparison.recommendation}.`,
      };
    }

    case 'job_remaining_days':
    case 'crew_size_needed': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const [estimate] = await db
        .select()
        .from(estimates)
        .where(eq(estimates.leadId, leadId))
        .orderBy(desc(estimates.createdAt))
        .limit(1);
      if (!estimate || !estimate.profitPerLabourHour || estimate.grossProfit === null) {
        return { answer: 'Bu lead için işçilik saati bilgisi henüz hesaplanmamış.' };
      }
      const hours = estimate.grossProfit / estimate.profitPerLabourHour;
      return {
        answer: `Toplam tahmini işçilik saati ≈ ${hours.toFixed(1)} saat. Ekip büyüklüğü teklif başına ayrı saklanmıyor; gün sayısı seçtiğiniz ekip büyüklüğüne göre değişir.`,
      };
    }

    case 'photo_analysis_summary': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const leadAttachments = await db.select().from(attachments).where(eq(attachments.leadId, leadId));
      if (leadAttachments.length === 0) return { answer: 'Bu lead için henüz fotoğraf yüklenmedi.' };
      const allAnalyses = await db.select().from(photoAnalyses);
      const analyses = leadAttachments
        .map((a) => allAnalyses.find((an) => an.attachmentId === a.id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      const reviewed = analyses.filter((a) => (a.observations ?? []).length > 0);
      return {
        answer: `${leadAttachments.length} fotoğraf yüklü, ${reviewed.length} tanesi incelendi. ${
          reviewed.length > 0
            ? `Son incelenenin güveni: %${((reviewed[reviewed.length - 1]!.overallConfidence ?? 0) * 100).toFixed(0)}.`
            : 'Henüz hiçbiri incelenmedi — fotoğrafları açıp gözlemlerinizi girin.'
        }`,
      };
    }

    case 'missing_info_for_job': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const [estimate] = await db
        .select()
        .from(estimates)
        .where(eq(estimates.leadId, leadId))
        .orderBy(desc(estimates.createdAt))
        .limit(1);
      if (!estimate?.scopeId) return { answer: 'Bu lead için henüz bir kapsam/teklif hesaplanmamış.' };
      const scopeAssumptions = (await db.select().from(assumptions).where(eq(assumptions.scopeId, estimate.scopeId))).filter(
        (a) => a.mustVerifyOnSite,
      );
      if (scopeAssumptions.length === 0) return { answer: 'Sahada doğrulanması gereken bilinen bir eksik yok.' };
      return { answer: scopeAssumptions.map((a) => `• ${a.description}`).join('\n') };
    }

    case 'last_job_hours_variance': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const [job] = await db.select().from(jobs).where(eq(jobs.leadId, leadId)).orderBy(desc(jobs.completedAt)).limit(1);
      if (!job) return { answer: 'Bu lead için tamamlanmış bir iş kaydı yok.' };
      const [estimate] = await db
        .select()
        .from(estimates)
        .where(eq(estimates.leadId, leadId))
        .orderBy(desc(estimates.createdAt))
        .limit(1);
      const costs = await db.select().from(actualCosts).where(eq(actualCosts.jobId, job.id));
      if (!estimate || costs.length === 0) return { answer: 'Bu iş için gerçek maliyet kaydı girilmemiş.' };
      const actuals = {
        labour: costs.filter((c) => c.category === 'labour').reduce((s, c) => s + c.amount, 0),
        materials: costs.filter((c) => c.category === 'materials').reduce((s, c) => s + c.amount, 0),
        rental: costs.filter((c) => c.category === 'rental').reduce((s, c) => s + c.amount, 0),
        disposal: costs.filter((c) => c.category === 'disposal').reduce((s, c) => s + c.amount, 0),
        travel: costs.filter((c) => c.category === 'travel').reduce((s, c) => s + c.amount, 0),
        subcontractor: costs.filter((c) => c.category === 'subcontractor').reduce((s, c) => s + c.amount, 0),
        unexpected: costs.filter((c) => c.category === 'unexpected').reduce((s, c) => s + c.amount, 0),
      };
      const comparison = compareEstimateToActuals(
        {
          directCost: estimate.directCost ?? 0,
          costWithOverhead: estimate.costWithOverhead ?? 0,
          recommendedExVat: estimate.recommendedExVat ?? 0,
          minimumTargetGrossProfit: estimate.minimumTargetGrossProfit,
        },
        actuals,
        estimate.recommendedExVat ?? 0,
      );
      return {
        answer: `Saat bazlı sapma ayrı takip edilmiyor; maliyet sapması: €${sumActualCosts(actuals).toFixed(0)} gerçek vs €${(estimate.costWithOverhead ?? 0).toFixed(0)} tahmini (%${(comparison.costVariancePercent * 100).toFixed(0)} sapma).`,
      };
    }

    case 'price_freshness_check': {
      return {
        answer:
          snapshot.supplierAlerts > 0
            ? `${snapshot.supplierAlerts} tedarikçi fiyatı güncelliğini yitirmiş, "Tedarikçiler" sayfasından kontrol edin.`
            : 'Kayıtlı tedarikçi fiyatlarının hepsi güncel.',
      };
    }

    case 'generate_quote_pdf': {
      if (!leadId) return { answer: NEEDS_LEAD_CONTEXT_REPLY };
      const auth = await requireAuth();
      if (!auth.authenticated) return { answer: 'Bu işlem için giriş yapmış olmanız gerekiyor.' };
      const [estimate] = await db
        .select()
        .from(estimates)
        .where(eq(estimates.leadId, leadId))
        .orderBy(desc(estimates.createdAt))
        .limit(1);
      if (!estimate) return { answer: 'Bu lead için önce bir fiyat hesaplamanız gerekiyor.' };
      const result = await generateQuoteForEstimate(leadId, estimate.id, auth.displayName ?? 'owner');
      if (result.blocked) {
        return { answer: `Teklif oluşturulamadı: ${result.reasons.join(' ')}` };
      }
      return { answer: `Teklif oluşturuldu: ${result.quoteNumber}. PDF, teklif sayfasından indirilebilir.` };
    }

    default:
      return { answer: UNSUPPORTED_COMMAND_REPLY };
  }
}
