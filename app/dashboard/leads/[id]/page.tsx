import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import {
  leads,
  customers,
  messageThreads,
  messages,
  estimates,
  quotes,
  leadEvents,
  assumptions,
  riskFlags,
  attachments,
  photoAnalyses,
  scopeItems,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { LEAD_STATES } from '@/lib/crm/state-machine';
import { canTransition } from '@/lib/crm/state-machine';
import { availableTemplateKeys } from '@/lib/messaging/templates';
import { transitionLeadStateAction } from '../actions';
import { AskBeyza } from '@/components/dashboard/AskBeyza';
import {
  sendMessageAction,
  createCeramicEstimateAction,
  createQuoteFromEstimateAction,
  logInboundMessageAction,
  uploadPhotoAction,
  updatePhotoAnalysisAction,
} from './actions';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) notFound();

  const customer = lead.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.leadId, id)).limit(1);
  const threadMessages = thread
    ? await db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(messages.createdAt)
    : [];
  const leadEstimates = await db.select().from(estimates).where(eq(estimates.leadId, id)).orderBy(desc(estimates.createdAt));
  const latestEstimate = leadEstimates[0];
  const leadQuotes = await db.select().from(quotes).where(eq(quotes.leadId, id));
  const events = await db.select().from(leadEvents).where(eq(leadEvents.leadId, id)).orderBy(desc(leadEvents.createdAt));
  const scopeAssumptions = latestEstimate?.scopeId
    ? await db.select().from(assumptions).where(eq(assumptions.scopeId, latestEstimate.scopeId))
    : [];
  const scopeRisks = latestEstimate?.scopeId
    ? await db.select().from(riskFlags).where(eq(riskFlags.scopeId, latestEstimate.scopeId))
    : [];
  const scopeMaterialItems = latestEstimate?.scopeId
    ? (await db.select().from(scopeItems).where(eq(scopeItems.scopeId, latestEstimate.scopeId))).filter((s) => s.notes)
    : [];
  const leadAttachments = await db.select().from(attachments).where(eq(attachments.leadId, id)).orderBy(desc(attachments.createdAt));
  const leadPhotoAnalyses = await db.select().from(photoAnalyses);
  const analysisByAttachmentId = new Map(leadPhotoAnalyses.map((a) => [a.attachmentId, a]));

  const validNextStates = LEAD_STATES.filter((s) => canTransition(lead.state, s).allowed);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{customer?.name ?? 'Bilinmeyen müşteri'}</h1>
          <p className="text-sm text-muted">
            {lead.serviceCategory} · {lead.location || 'konum yok'} · Durum: <strong>{lead.state}</strong>
          </p>
        </div>
        {lead.priority && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{lead.priority}</span>
        )}
      </div>

      <AskBeyza leadId={lead.id} />

      {lead.priorityReasons && lead.priorityReasons.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-muted">
          <div className="mb-1 font-medium text-ink">Neden? (nitelendirme skoru: {lead.priorityScore})</div>
          <ul className="list-inside list-disc">
            {lead.priorityReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {lead.nextBestAction && <p className="mt-2 text-ink">Önerilen aksiyon: {lead.nextBestAction}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {validNextStates.map((s) => (
          <form key={s} action={transitionLeadStateAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="toState" value={s} />
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink hover:border-accent">
              → {s}
            </button>
          </form>
        ))}
      </div>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Müşteri iletişimi</h2>
        <div className="mb-4 space-y-2">
          {threadMessages.map((m) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm ${m.direction === 'outbound' ? 'bg-accent-soft/40 text-ink' : 'bg-surface text-ink'}`}>
              <div className="mb-1 text-xs text-muted">
                {m.direction === 'outbound' ? 'Biz' : 'Müşteri'} · {m.status}
              </div>
              {m.body}
            </div>
          ))}
          {threadMessages.length === 0 && <p className="text-sm text-muted">Henüz mesaj yok.</p>}
        </div>
        <form action={sendMessageAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <select name="templateKey" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {availableTemplateKeys().map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input type="checkbox" name="approved" /> Onaylıyorum (Smart Approval)
          </label>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Taslak oluştur / Gönder
          </button>
        </form>
        <form action={logInboundMessageAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <input
            name="body"
            placeholder="Müşteriden gelen cevabı buraya yapıştırın…"
            className="min-w-[16rem] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent">
            Gelen mesajı kaydet
          </button>
        </form>
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">
          Fotoğraflar (Agent 06)
        </h2>
        <form action={uploadPhotoAction} className="mb-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" required className="text-sm text-ink" />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Fotoğraf yükle
          </button>
        </form>
        <div className="space-y-4">
          {leadAttachments.map((att) => {
            const analysis = analysisByAttachmentId.get(att.id);
            return (
              <div key={att.id} className="rounded-lg border border-border bg-surface p-4 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-ink">{att.originalFilename}</span>
                  <span className="text-xs text-muted">
                    Güven: {((analysis?.overallConfidence ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                {analysis?.ownerCorrection && (
                  <p className="mb-2 text-xs text-gold">{analysis.ownerCorrection}</p>
                )}
                {analysis && (analysis.observations ?? []).length === 0 ? (
                  <>
                    <p className="mb-2 text-xs text-muted">
                      Henüz analiz edilmedi. Aşağıya gözlemlerinizi girin (her satır bir gözlem):
                    </p>
                    <form action={updatePhotoAnalysisAction} className="grid gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="analysisId" value={analysis.id} />
                      <textarea
                        name="observations"
                        placeholder="Gözlemler (bir satır = bir gözlem)"
                        className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs"
                      />
                      <textarea
                        name="hazardsOrRisks"
                        placeholder="Tehlike/risk gözlemleri"
                        className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs"
                      />
                      <textarea
                        name="accessObservations"
                        placeholder="Erişim gözlemleri"
                        className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" name="hasScaleReference" /> Fotoğrafta güvenilir bir ölçek referansı var
                        (bilinen boyutlu bir nesne, mezura vb.)
                      </label>
                      <input
                        name="measurementNote"
                        placeholder="Ölçüm notu (yalnızca ölçek referansı varsa kaydedilir)"
                        className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs"
                      />
                      <button type="submit" className="justify-self-start rounded-lg border border-border px-3 py-1.5 text-xs text-ink hover:border-accent">
                        Kaydet
                      </button>
                    </form>
                    {(analysis.questionsToAsk ?? []).length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-xs text-muted">
                        {(analysis.questionsToAsk ?? []).map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  analysis && (
                    <ul className="list-inside list-disc text-xs text-ink/90">
                      {(analysis.observations ?? []).map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            );
          })}
          {leadAttachments.length === 0 && <p className="text-sm text-muted">Henüz fotoğraf yüklenmedi.</p>}
        </div>
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">
          40 m² Keramik Teras Şablonu — Fiyat Teklifi
        </h2>
        <form action={createCeramicEstimateAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input name="areaM2" type="number" step="0.1" placeholder="Alan (m²)" defaultValue="40" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <select name="tileSuppliedBy" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="company">Tegels: wij leveren</option>
            <option value="customer">Tegels: klant levert</option>
          </select>
          <input name="tileUnitCostPerM2" type="number" step="0.01" placeholder="Tegel kosten €/m² (wij leveren)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="accessWidthCm" type="number" placeholder="Toegangsbreedte (cm)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="disposalIncluded" defaultChecked /> Afvoer inbegrepen
          </label>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Fiyat hesapla
          </button>
        </form>

        {latestEstimate && (
          <div className="mt-5 space-y-2 rounded-lg bg-surface p-4 text-sm">
            <div>Direkt maliyet: €{latestEstimate.directCost?.toFixed(2)}</div>
            <div>Genel gider dahil maliyet: €{latestEstimate.costWithOverhead?.toFixed(2)}</div>
            <div>Kâr hedefi fiyatı: €{latestEstimate.priceForProfitFloor?.toFixed(2)}</div>
            <div className="text-lg font-semibold text-ink">
              Önerilen fiyat (KDV hariç): €{latestEstimate.recommendedExVat?.toFixed(2)}
            </div>
            <div>Beklenen kâr: €{latestEstimate.grossProfit?.toFixed(2)} ({((latestEstimate.grossMargin ?? 0) * 100).toFixed(1)}% marj)</div>
            <div>Ticari uyum: <strong>{latestEstimate.commercialFit}</strong></div>
            <div>Teklif güveni: {((latestEstimate.quoteConfidence ?? 0) * 100).toFixed(0)}%</div>
            {latestEstimate.qaBlocked && (
              <div className="rounded bg-accent-soft p-2 text-accent">
                QA engeli: {latestEstimate.qaBlockReasons?.join(' ')}
              </div>
            )}
            <form action={createQuoteFromEstimateAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="estimateId" value={latestEstimate.id} />
              <button type="submit" className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Teklif oluştur (PDF)
              </button>
            </form>
          </div>
        )}

        {scopeMaterialItems.length > 0 && (
          <div className="mt-3 space-y-1 rounded-lg bg-surface p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Envanter kontrolü (Agent 10/33)
            </h3>
            {scopeMaterialItems.map((s) => (
              <p key={s.id} className="text-gold">
                {s.label}: {s.notes}
              </p>
            ))}
          </div>
        )}

        {(scopeAssumptions.length > 0 || scopeRisks.length > 0) && (
          <div className="mt-3 space-y-2 rounded-lg bg-surface p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Teknik yöntem planı (Agent 08) — sahada doğrulanacaklar
            </h3>
            {scopeAssumptions.length > 0 && (
              <ul className="list-inside list-disc text-ink/90">
                {scopeAssumptions.map((a) => (
                  <li key={a.id}>{a.description}</li>
                ))}
              </ul>
            )}
            {scopeRisks.length > 0 && (
              <ul className="list-inside list-disc text-accent">
                {scopeRisks.map((r) => (
                  <li key={r.id}>{r.description}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {leadQuotes.length > 0 && (
        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Teklifler</h2>
          <ul className="space-y-1 text-sm">
            {leadQuotes.map((q) => (
              <li key={q.id}>
                <a href={`/dashboard/quotes/${q.id}`} className="text-accent hover:underline">
                  {q.quoteNumber} — €{q.totalExVat.toFixed(2)} ({q.status})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Geçmiş (audit)</h2>
        <ul className="space-y-1 text-xs text-muted">
          {events.map((e) => (
            <li key={e.id}>
              {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(e.createdAt)} —{' '}
              {e.kind} {e.fromState && `${e.fromState} → ${e.toState}`} {e.detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
