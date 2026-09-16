import { describe, it, expect } from 'vitest';
import { routeProviderRequest, type BudgetPolicySnapshot } from '@/lib/ai/router';

const zeroBudget: BudgetPolicySnapshot = {
  monthlyCapEur: 0,
  dailyCapEur: 0,
  spentThisMonthEur: 0,
  spentTodayEur: 0,
};

describe('AI provider router — zero-budget enforcement', () => {
  it('always allows Tier 0 (deterministic) and Tier 1 (local/free) regardless of budget', () => {
    expect(
      routeProviderRequest({ tier: 'tier0_deterministic', providerConfigured: false, providerEnabled: false, estimatedCostEur: 0, budget: zeroBudget })
        .allowed,
    ).toBe(true);
    expect(
      routeProviderRequest({ tier: 'tier1_local_free', providerConfigured: false, providerEnabled: false, estimatedCostEur: 0, budget: zeroBudget })
        .allowed,
    ).toBe(true);
  });

  it('blocks any paid tier call when the budget is €0, even with a configured+enabled provider', () => {
    const result = routeProviderRequest({
      tier: 'tier3_economical_paid',
      providerConfigured: true,
      providerEnabled: true,
      estimatedCostEur: 0.01,
      budget: zeroBudget,
    });
    expect(result.allowed).toBe(false);
  });

  it('blocks a paid call without a configured API key even if budget is non-zero', () => {
    const budget: BudgetPolicySnapshot = { monthlyCapEur: 20, dailyCapEur: 2, spentThisMonthEur: 0, spentTodayEur: 0 };
    const result = routeProviderRequest({
      tier: 'tier3_economical_paid',
      providerConfigured: false,
      providerEnabled: true,
      estimatedCostEur: 0.5,
      budget,
    });
    expect(result.allowed).toBe(false);
  });

  it('allows a paid call once configured, enabled, and within budget', () => {
    const budget: BudgetPolicySnapshot = { monthlyCapEur: 20, dailyCapEur: 2, spentThisMonthEur: 1, spentTodayEur: 0.5 };
    const result = routeProviderRequest({
      tier: 'tier3_economical_paid',
      providerConfigured: true,
      providerEnabled: true,
      estimatedCostEur: 0.5,
      budget,
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks a call that would exceed the monthly or daily cap', () => {
    const budget: BudgetPolicySnapshot = { monthlyCapEur: 10, dailyCapEur: 5, spentThisMonthEur: 9.8, spentTodayEur: 1 };
    const result = routeProviderRequest({
      tier: 'tier3_economical_paid',
      providerConfigured: true,
      providerEnabled: true,
      estimatedCostEur: 1,
      budget,
    });
    expect(result.allowed).toBe(false);
  });
});
