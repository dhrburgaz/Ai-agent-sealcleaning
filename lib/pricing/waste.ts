/**
 * Agent 12 — Waste & Disposal Agent (master spec section 9 / 12).
 * Prevents underpricing of disposal by making its cost explicit and by refusing
 * to treat flagged hazardous material as normal waste.
 */

export type WasteCategory =
  | 'concrete_pavers'
  | 'soil'
  | 'sand'
  | 'green_waste'
  | 'timber'
  | 'mixed_construction'
  | 'unknown_hazardous';

export interface WasteEstimateInput {
  category: WasteCategory;
  volumeM3: number;
  weightKg?: number;
  containerSize?: string;
  containerCount: number;
  tripCount: number;
  loadingLabourHours: number;
  loadingLabourHourlyRate: number;
  transportCostPerTrip: number;
  tippingFeePerContainer: number;
  containerFeePerContainer: number;
  suspectedAsbestos?: boolean;
  suspectedContaminatedSoil?: boolean;
}

export interface WasteEstimateResult {
  category: WasteCategory;
  isHazardous: boolean;
  requiresSpecialistDisposal: boolean;
  loadingLabourCost: number;
  transportCost: number;
  tippingCost: number;
  containerFeeCost: number;
  totalCost: number;
  blockingHazardWarning: string | null;
}

export function calculateWasteEstimate(input: WasteEstimateInput): WasteEstimateResult {
  const isHazardous =
    input.category === 'unknown_hazardous' ||
    Boolean(input.suspectedAsbestos) ||
    Boolean(input.suspectedContaminatedSoil);

  const loadingLabourCost = input.loadingLabourHours * input.loadingLabourHourlyRate;
  const transportCost = input.tripCount * input.transportCostPerTrip;
  const tippingCost = input.containerCount * input.tippingFeePerContainer;
  const containerFeeCost = input.containerCount * input.containerFeePerContainer;

  const totalCost = isHazardous
    ? 0 // never silently price hazardous waste as normal disposal
    : loadingLabourCost + transportCost + tippingCost + containerFeeCost;

  return {
    category: input.category,
    isHazardous,
    requiresSpecialistDisposal: isHazardous,
    loadingLabourCost,
    transportCost,
    tippingCost,
    containerFeeCost,
    totalCost,
    blockingHazardWarning: isHazardous
      ? 'Şüpheli tehlikeli atık (asbest/kirlenmiş toprak). Normal atık gibi fiyatlandırılamaz; uzman bertaraf gerekli.'
      : null,
  };
}
