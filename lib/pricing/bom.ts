/**
 * Agent 11 — Bill of Materials / Quantity Agent (master spec section 9 / 11).
 * Pure quantity math: net quantity -> final purchase quantity, with waste/cutting/
 * breakage/spare percentages applied and optional package rounding.
 */

export type SuppliedBy = 'customer' | 'company' | 'rented' | 'in_stock' | 'optional';

export interface MaterialRequirementInput {
  label: string;
  unit: string;
  netQuantity: number;
  wastePercent?: number;
  cuttingPercent?: number;
  breakagePercent?: number;
  sparePercent?: number;
  packageRoundingUnit?: number;
  suppliedBy: SuppliedBy;
}

export interface MaterialRequirementResult extends MaterialRequirementInput {
  finalQuantity: number;
}

export function calculateMaterialRequirement(
  input: MaterialRequirementInput,
): MaterialRequirementResult {
  const waste = (input.wastePercent ?? 0) / 100;
  const cutting = (input.cuttingPercent ?? 0) / 100;
  const breakage = (input.breakagePercent ?? 0) / 100;
  const spare = (input.sparePercent ?? 0) / 100;

  const grossQuantity = input.netQuantity * (1 + waste) * (1 + cutting) * (1 + breakage) * (1 + spare);

  const finalQuantity = input.packageRoundingUnit
    ? Math.ceil(grossQuantity / input.packageRoundingUnit) * input.packageRoundingUnit
    : Math.ceil(grossQuantity * 100) / 100;

  return { ...input, finalQuantity };
}

export function calculateBillOfMaterials(
  items: MaterialRequirementInput[],
): MaterialRequirementResult[] {
  return items.map(calculateMaterialRequirement);
}

/** Company-supplied and rented materials count toward job cost; customer-supplied and in-stock do not. */
export function materialsCostForJob(
  items: MaterialRequirementResult[],
  unitCosts: Record<string, number>,
): number {
  return items.reduce((total, item) => {
    if (item.suppliedBy === 'customer' || item.suppliedBy === 'in_stock') return total;
    const unitCost = unitCosts[item.label] ?? 0;
    return total + unitCost * item.finalQuantity;
  }, 0);
}
