/**
 * Agent 13 — Equipment & Rental Agent (master spec section 9 / 13).
 * Compares renting machinery against doing the task with extra labour hours,
 * quantifying the margin effect of each option.
 */

export interface EquipmentOption {
  label: string;
  ownership: 'owned' | 'rented' | 'buy';
  days: number;
  dailyRentalCost?: number;
  fuelCostPerDay?: number;
  transportCost?: number;
  depositCost?: number;
  damageWaiverCost?: number;
  labourHoursSavedTotal: number;
}

export interface ExtraLabourOption {
  extraHours: number;
  hourlyCost: number;
}

export interface EquipmentComparisonResult {
  equipmentTotalCost: number;
  extraLabourTotalCost: number;
  recommendedOption: 'equipment' | 'extra_labour';
  netSavingsEur: number;
  hoursSaved: number;
}

export function equipmentTotalCost(option: EquipmentOption): number {
  const rentalCost = option.ownership === 'rented' ? (option.dailyRentalCost ?? 0) * option.days : 0;
  const fuelCost = (option.fuelCostPerDay ?? 0) * option.days;
  return (
    rentalCost +
    fuelCost +
    (option.transportCost ?? 0) +
    (option.depositCost ?? 0) +
    (option.damageWaiverCost ?? 0)
  );
}

export function compareEquipmentVsExtraLabour(
  equipment: EquipmentOption,
  extraLabour: ExtraLabourOption,
): EquipmentComparisonResult {
  const equipCost = equipmentTotalCost(equipment);
  const labourCost = extraLabour.extraHours * extraLabour.hourlyCost;

  return {
    equipmentTotalCost: equipCost,
    extraLabourTotalCost: labourCost,
    recommendedOption: equipCost <= labourCost ? 'equipment' : 'extra_labour',
    netSavingsEur: Math.abs(equipCost - labourCost),
    hoursSaved: equipment.labourHoursSavedTotal,
  };
}
