/**
 * Agent 14 — Labour & Crew Planner (master spec section 9 / 14).
 * Estimates crew time/cost from production rates and shows the profit effect of
 * adding a worker, hiring a machine, or extending duration. Production rates are
 * never auto-recalibrated from a single job; calibration is only ever suggested.
 */

export interface CrewMemberInput {
  kind: 'owner' | 'employee' | 'helper' | 'subcontractor';
  hourlyCost: number;
  employerBurdenPercent?: number;
}

export interface LabourPlanInput {
  crew: CrewMemberInput[];
  taskHours: number;
  setupHours?: number;
  loadUnloadHours?: number;
  travelHours?: number;
  disposalTripHours?: number;
  cleanupHours?: number;
  weatherBufferHours?: number;
  accessPenaltyHours?: number;
}

export interface LabourPlanResult {
  totalHoursPerCrewMember: number;
  totalCrewHours: number;
  totalLabourCost: number;
}

export function calculateLabourPlan(input: LabourPlanInput): LabourPlanResult {
  const totalHoursPerCrewMember =
    input.taskHours +
    (input.setupHours ?? 0) +
    (input.loadUnloadHours ?? 0) +
    (input.travelHours ?? 0) +
    (input.disposalTripHours ?? 0) +
    (input.cleanupHours ?? 0) +
    (input.weatherBufferHours ?? 0) +
    (input.accessPenaltyHours ?? 0);

  const totalCrewHours = totalHoursPerCrewMember * input.crew.length;

  const totalLabourCost = input.crew.reduce((sum, member) => {
    const burden = 1 + (member.employerBurdenPercent ?? 0) / 100;
    return sum + member.hourlyCost * burden * totalHoursPerCrewMember;
  }, 0);

  return { totalHoursPerCrewMember, totalCrewHours, totalLabourCost };
}

export interface ProductionRateEvidence {
  taskKey: string;
  currentUnitsPerHour: number;
  observedUnitsPerHour: number;
  sampleSize: number;
}

export interface CalibrationSuggestion {
  taskKey: string;
  suggestedUnitsPerHour: number | null;
  reason: string;
}

const MIN_SAMPLE_SIZE_FOR_SUGGESTION = 3;

/**
 * A single job's actual-vs-estimate variance is evidence, not a rate change.
 * Only proposes recalibration once enough evidence has accumulated, and even then
 * it is a suggestion the owner must approve — never an automatic overwrite.
 */
export function suggestProductionRateCalibration(
  evidence: ProductionRateEvidence,
): CalibrationSuggestion {
  if (evidence.sampleSize < MIN_SAMPLE_SIZE_FOR_SUGGESTION) {
    return {
      taskKey: evidence.taskKey,
      suggestedUnitsPerHour: null,
      reason: `Yetersiz veri (${evidence.sampleSize} iş). En az ${MIN_SAMPLE_SIZE_FOR_SUGGESTION} iş sonrası öneri sunulur.`,
    };
  }
  return {
    taskKey: evidence.taskKey,
    suggestedUnitsPerHour: evidence.observedUnitsPerHour,
    reason: `${evidence.sampleSize} iş sonrası öneri: ${evidence.currentUnitsPerHour} yerine ${evidence.observedUnitsPerHour} birim/saat. Onayınız gerekli.`,
  };
}
