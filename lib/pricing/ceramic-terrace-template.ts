/**
 * Section 12 — 40 m² Ceramic Terrace job template.
 * Dedicated template for the most common job type: old concrete paving removed,
 * base reworked, new ceramic outdoor tiles installed. Must never hardcode a total;
 * customer-supplied vs company-supplied tiles must produce different outputs.
 */
import { calculateMaterialRequirement, type MaterialRequirementResult } from './bom';
import { calculateWasteEstimate, type WasteEstimateResult } from './waste';
import { calculateLabourPlan, type CrewMemberInput, type LabourPlanResult } from './labour';
import { calculatePrice, type PricingCostInputs, type PricingPolicyInputs, type PricingResult } from './engine';
import { offsetRequirementWithInventory, type InventoryOffsetResult } from './inventory';
import type { FactStatus } from '@/db/schema/scope';

export const CERAMIC_TERRACE_MANDATORY_QUESTIONS: { key: string; questionNl: string }[] = [
  { key: 'areaM2', questionNl: 'Wat is de exacte of geschatte oppervlakte (m²)?' },
  { key: 'tileProduct', questionNl: 'Welk tegelproduct heeft uw voorkeur?' },
  { key: 'tileDimensions', questionNl: 'Wat zijn de afmetingen van de tegels?' },
  { key: 'tileThickness', questionNl: 'Wat is de dikte van de tegels?' },
  { key: 'tileSuppliedBy', questionNl: 'Levert u de tegels zelf, of verzorgen wij dit?' },
  { key: 'currentPaving', questionNl: 'Wat ligt er momenteel op de grond?' },
  { key: 'currentDepth', questionNl: 'Wat is de huidige diepte/opbouw?' },
  { key: 'excavationNeeded', questionNl: 'Is uitgraven noodzakelijk?' },
  { key: 'accessWidthCm', questionNl: 'Hoe breed is de toegang tot de achtertuin?' },
  { key: 'rearAccess', questionNl: 'Is er een achterpad/steeg beschikbaar?' },
  { key: 'carryingDistanceM', questionNl: 'Hoe ver moet er gedragen worden vanaf de toegang?' },
  { key: 'levelDifferences', questionNl: 'Zijn er hoogteverschillen?' },
  { key: 'drainage', questionNl: 'Hoe is de afwatering geregeld?' },
  { key: 'pooling', questionNl: 'Is er sprake van waterplassen?' },
  { key: 'edging', questionNl: 'Is opsluiting/boordafwerking gewenst?' },
  { key: 'pattern', questionNl: 'Welk legpatroon heeft uw voorkeur?' },
  { key: 'steps', questionNl: 'Zijn er trapjes/opstapjes in de tuin?' },
  { key: 'manholes', questionNl: 'Zijn er putten/kolken aanwezig?' },
  { key: 'machineAccess', questionNl: 'Is er machinetoegang mogelijk?' },
  { key: 'containerPlacement', questionNl: 'Waar kan een container geplaatst worden?' },
  { key: 'disposalIncluded', questionNl: 'Moet afvoer van oud materiaal inbegrepen zijn?' },
  { key: 'preferredDate', questionNl: 'Wat is de gewenste periode voor uitvoering?' },
  { key: 'postcode', questionNl: 'Wat is de postcode van de locatie?' },
  { key: 'photos', questionNl: 'Kunt u meerdere foto\'s sturen van de huidige situatie?' },
];

export interface CeramicTerraceInputs {
  areaM2: number | null;
  tileSuppliedBy: 'customer' | 'company';
  tileUnitCostPerM2: number | null; // required when company-supplied
  currentPavingKnown: boolean;
  excavationNeeded: boolean | null;
  excavationDepthCm: number | null;
  accessWidthCm: number | null;
  carryingDistanceM: number;
  levelDifferencesKnown: boolean;
  drainageKnown: boolean;
  edging: boolean;
  disposalIncluded: boolean;
  crew: CrewMemberInput[];
  labourHourlyRateForDisposalLoading: number;
  sandCostPerM3: number;
  disposalTippingFeePerContainer: number;
  disposalContainerFeePerContainer: number;
  productionRateM2PerHourPerPerson: number;
}

export interface CeramicTerraceScopeResult {
  factStatuses: FactStatus[];
  missingInfo: string[];
  measurementsM2Status: FactStatus;
}

export function buildCeramicTerraceScope(input: CeramicTerraceInputs): CeramicTerraceScopeResult {
  const missingInfo: string[] = [];
  const factStatuses: FactStatus[] = [];

  const areaStatus: FactStatus = input.areaM2 ? 'known' : 'unknown';
  factStatuses.push(areaStatus);
  if (!input.areaM2) missingInfo.push('areaM2');

  if (input.tileSuppliedBy === 'company' && !input.tileUnitCostPerM2) {
    missingInfo.push('tileUnitCostPerM2');
    factStatuses.push('unknown');
  } else {
    factStatuses.push('known');
  }

  factStatuses.push(input.currentPavingKnown ? 'known' : 'must_verify_on_site');
  if (!input.currentPavingKnown) missingInfo.push('currentPaving');

  factStatuses.push(input.excavationNeeded === null ? 'must_verify_on_site' : 'known');
  if (input.excavationNeeded === null) missingInfo.push('excavationNeeded');

  factStatuses.push(input.accessWidthCm ? 'known' : 'assumed');
  if (!input.accessWidthCm) missingInfo.push('accessWidthCm');

  factStatuses.push(input.levelDifferencesKnown ? 'known' : 'must_verify_on_site');
  if (!input.levelDifferencesKnown) missingInfo.push('levelDifferences');

  factStatuses.push(input.drainageKnown ? 'known' : 'must_verify_on_site');
  if (!input.drainageKnown) missingInfo.push('drainage');

  return { factStatuses, missingInfo, measurementsM2Status: areaStatus };
}

export interface CeramicTerraceCostBreakdown {
  materials: MaterialRequirementResult[];
  waste: WasteEstimateResult;
  labour: LabourPlanResult;
  costs: PricingCostInputs;
  pricing: PricingResult;
}

/**
 * Computes the full cost/price breakdown. Customer-supplied vs company-supplied tiles
 * must (and do) diverge here: tile material cost is 0 for customer-supplied jobs.
 */
export function computeCeramicTerraceJob(
  input: CeramicTerraceInputs,
  policy: PricingPolicyInputs,
): CeramicTerraceCostBreakdown {
  const area = input.areaM2 ?? 0;

  const tileRequirement = calculateMaterialRequirement({
    label: 'ceramic_tiles',
    unit: 'm2',
    netQuantity: area,
    wastePercent: 5,
    cuttingPercent: 5,
    suppliedBy: input.tileSuppliedBy,
  });

  const sandRequirement = calculateMaterialRequirement({
    label: 'sand_subbase',
    unit: 'm3',
    netQuantity: area * 0.1,
    wastePercent: 8,
    suppliedBy: 'company',
  });

  const materials = [tileRequirement, sandRequirement];

  const tileMaterialCost =
    input.tileSuppliedBy === 'company' ? tileRequirement.finalQuantity * (input.tileUnitCostPerM2 ?? 0) : 0;
  const sandMaterialCost = sandRequirement.finalQuantity * input.sandCostPerM3;
  const materialsCost = tileMaterialCost + sandMaterialCost;

  const waste = input.disposalIncluded
    ? calculateWasteEstimate({
        category: 'concrete_pavers',
        volumeM3: area * 0.08,
        containerCount: Math.max(1, Math.ceil((area * 0.08) / 6)),
        tripCount: Math.max(1, Math.ceil((area * 0.08) / 6)),
        loadingLabourHours: area * 0.05,
        loadingLabourHourlyRate: input.labourHourlyRateForDisposalLoading,
        transportCostPerTrip: 45,
        tippingFeePerContainer: input.disposalTippingFeePerContainer,
        containerFeePerContainer: input.disposalContainerFeePerContainer,
      })
    : {
        category: 'concrete_pavers' as const,
        isHazardous: false,
        requiresSpecialistDisposal: false,
        loadingLabourCost: 0,
        transportCost: 0,
        tippingCost: 0,
        containerFeeCost: 0,
        totalCost: 0,
        blockingHazardWarning: null,
      };

  const taskHours = area / Math.max(input.productionRateM2PerHourPerPerson, 0.1);
  const labour = calculateLabourPlan({
    crew: input.crew,
    taskHours,
    setupHours: 1,
    cleanupHours: 1,
    accessPenaltyHours: input.accessWidthCm && input.accessWidthCm < 80 ? 2 : 0,
  });

  const costs: PricingCostInputs = {
    labour: labour.totalLabourCost,
    materials: materialsCost,
    rentals: 0,
    waste: waste.totalCost,
    logistics: 0,
    subcontractors: 0,
    permits: 0,
    consumables: area * 1.5,
    overhead: labour.totalLabourCost * 0.1,
    riskReserve: labour.totalLabourCost * 0.05,
  };

  const pricing = calculatePrice(costs, {
    ...policy,
    estimatedLabourHours: labour.totalCrewHours,
  });

  return { materials, waste, labour, costs, pricing };
}

export interface InventoryOnHand {
  ceramicTilesOnHand: number;
  sandSubbaseOnHand: number;
}

export interface InventoryAdjustedResult {
  tileOffset: InventoryOffsetResult;
  sandOffset: InventoryOffsetResult;
  inventorySavingsEur: number;
  adjustedCosts: PricingCostInputs;
  pricing: PricingResult;
}

/**
 * Agent 10/33 — checks inventory before recommending a purchase. Only
 * company-supplied materials cost money to begin with, so customer-supplied
 * tiles get no offset (nothing to save). Never mutates `breakdown` — returns
 * a fresh, correctly-recomputed pricing result so callers can't accidentally
 * mix pre- and post-offset numbers.
 */
export function applyInventoryOffset(
  input: CeramicTerraceInputs,
  breakdown: CeramicTerraceCostBreakdown,
  onHand: InventoryOnHand,
  policy: PricingPolicyInputs,
): InventoryAdjustedResult {
  const tileMaterial = breakdown.materials.find((m) => m.label === 'ceramic_tiles')!;
  const sandMaterial = breakdown.materials.find((m) => m.label === 'sand_subbase')!;

  const tileOffset = offsetRequirementWithInventory(tileMaterial.finalQuantity, onHand.ceramicTilesOnHand);
  const sandOffset = offsetRequirementWithInventory(sandMaterial.finalQuantity, onHand.sandSubbaseOnHand);

  const tileUnitCost = input.tileSuppliedBy === 'company' ? (input.tileUnitCostPerM2 ?? 0) : 0;
  const inventorySavingsEur = tileOffset.quantityFromInventory * tileUnitCost + sandOffset.quantityFromInventory * input.sandCostPerM3;

  const adjustedCosts: PricingCostInputs = {
    ...breakdown.costs,
    materials: Math.max(0, breakdown.costs.materials - inventorySavingsEur),
  };
  const pricing =
    inventorySavingsEur > 0
      ? calculatePrice(adjustedCosts, { ...policy, estimatedLabourHours: breakdown.labour.totalCrewHours })
      : breakdown.pricing;

  return { tileOffset, sandOffset, inventorySavingsEur, adjustedCosts, pricing };
}
