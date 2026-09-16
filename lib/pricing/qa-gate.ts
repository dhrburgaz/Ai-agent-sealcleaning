/**
 * Agent 20 — QA, Compliance & System Health Agent (master spec section 9 / 20).
 * Deterministic final gate before a quote or outbound message can be sent.
 * Returns `blocked: true` with human-readable Turkish reasons rather than throwing,
 * so callers can surface the reasons in the UI ("Why blocked?").
 */
import type { FactStatus } from '@/db/schema/scope';
import {
  calculatePrice,
  type OwnerOverride,
  type PricingCostInputs,
  type PricingPolicyInputs,
  type PricingResult,
} from './engine';

export interface StaleItem {
  label: string;
  staleAfter: Date | null;
  now?: Date;
}

export interface QaGateInput {
  costs: PricingCostInputs;
  policy: PricingPolicyInputs;
  storedResult: PricingResult;
  ownerOverride?: OwnerOverride;
  bindingQuote: boolean;
  factStatuses: FactStatus[];
  criticalUnknownLabels: string[];
  staleItems?: StaleItem[];
  requiredFields: Record<string, unknown>;
  sendRequested?: boolean;
  approved?: boolean;
}

export interface QaResult {
  blocked: boolean;
  reasons: string[];
}

const EPSILON = 0.01;

export function runQaGate(input: QaGateInput): QaResult {
  const reasons: string[] = [];
  const recompute = calculatePrice(input.costs, input.policy);

  if (Math.abs(recompute.recommendedExVat - input.storedResult.recommendedExVat) > EPSILON) {
    reasons.push(
      'Fiyat hesaplaması güncel değil: kayıtlı tutar mevcut maliyet/politika verileriyle uyuşmuyor.',
    );
  }

  if (!Number.isFinite(input.policy.vatRatePercent) || input.policy.vatRatePercent < 0) {
    reasons.push('KDV oranı eksik veya geçersiz.');
  }

  for (const [field, value] of Object.entries(input.requiredFields)) {
    if (value === null || value === undefined || value === '') {
      reasons.push(`Eksik alan: ${field}`);
    }
  }

  if (recompute.grossMargin < 0) {
    reasons.push('Negatif kâr marjı: bu fiyat maliyetin altında.');
  }

  if (input.ownerOverride) {
    if (
      input.ownerOverride.price < recompute.priceForProfitFloor &&
      !input.ownerOverride.reason.trim()
    ) {
      reasons.push('Kâr hedefinin altındaki manuel fiyat için gerekçe girilmemiş.');
    }
  } else if (input.storedResult.recommendedExVat < recompute.priceForProfitFloor - EPSILON) {
    reasons.push('Fiyat, kâr hedefinin altında ve onaylanmış bir yönetici override yok.');
  }

  if (input.bindingQuote && input.criticalUnknownLabels.length > 0) {
    reasons.push(
      `Bağlayıcı teklif için doğrulanmamış bilgiler var: ${input.criticalUnknownLabels.join(', ')}. Önce keşif/doğrulama gerekli.`,
    );
  }

  const mustVerifyCount = input.factStatuses.filter((s) => s === 'must_verify_on_site').length;
  if (input.bindingQuote && mustVerifyCount > 0) {
    reasons.push(
      `${mustVerifyCount} ölçüm sahada doğrulanmadan bağlayıcı teklif verilemez.`,
    );
  }

  const now = new Date();
  for (const item of input.staleItems ?? []) {
    if (item.staleAfter && (item.now ?? now) > item.staleAfter) {
      reasons.push(`Güncelliğini yitirmiş fiyat bilgisi: ${item.label}.`);
    }
  }

  if (input.sendRequested && !input.approved) {
    reasons.push('Gönderim onay olmadan engellendi (Smart Approval modu).');
  }

  return { blocked: reasons.length > 0, reasons };
}
