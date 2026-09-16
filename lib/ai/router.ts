/**
 * Section 15 — AI Provider Router. Phase 1-3 implements only the always-available
 * Tier 0 (deterministic) path plus the budget gate; Tier 1-4 provider adapters
 * (Ollama, OpenAI-compatible, Gemini, NVIDIA, Anthropic) are Phase 5.
 *
 * The gate itself is real and enforced now: a paid call requires a configured key,
 * an enabled provider, AND a non-zero budget. Default budget is €0, so the system
 * runs entirely on deterministic logic out of the box (section 2).
 */

export type ProviderTier = 'tier0_deterministic' | 'tier1_local_free' | 'tier2_hosted_free' | 'tier3_economical_paid' | 'tier4_premium';

export interface BudgetPolicySnapshot {
  monthlyCapEur: number;
  dailyCapEur: number;
  spentThisMonthEur: number;
  spentTodayEur: number;
}

export interface ProviderRequest {
  tier: ProviderTier;
  providerConfigured: boolean;
  providerEnabled: boolean;
  estimatedCostEur: number;
  budget: BudgetPolicySnapshot;
}

export interface RoutingDecision {
  allowed: boolean;
  reason: string;
}

export function routeProviderRequest(request: ProviderRequest): RoutingDecision {
  if (request.tier === 'tier0_deterministic' || request.tier === 'tier1_local_free') {
    return { allowed: true, reason: 'Ücretsiz/yerel katman, bütçe kontrolüne tabi değil.' };
  }

  if (!request.providerConfigured) {
    return { allowed: false, reason: 'Sağlayıcı için API anahtarı yapılandırılmamış.' };
  }
  if (!request.providerEnabled) {
    return { allowed: false, reason: 'Sağlayıcı ayarlardan etkinleştirilmemiş.' };
  }
  if (request.budget.monthlyCapEur <= 0 || request.budget.dailyCapEur <= 0) {
    return { allowed: false, reason: 'AI bütçesi €0. Ücretli çağrılar varsayılan olarak engellenir.' };
  }
  if (request.budget.spentThisMonthEur + request.estimatedCostEur > request.budget.monthlyCapEur) {
    return { allowed: false, reason: 'Aylık AI bütçesi aşılacaktı, çağrı engellendi.' };
  }
  if (request.budget.spentTodayEur + request.estimatedCostEur > request.budget.dailyCapEur) {
    return { allowed: false, reason: 'Günlük AI bütçesi aşılacaktı, çağrı engellendi.' };
  }

  return { allowed: true, reason: 'Bütçe ve yapılandırma kontrolünden geçti.' };
}
