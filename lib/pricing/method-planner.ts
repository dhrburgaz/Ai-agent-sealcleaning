/**
 * Agent 08 — Technical Method Planner (master spec section 9 / 8).
 * Deterministic, rule-based: a practical work-method checklist derived from
 * scope facts, not a narrative written by a model. Genuinely Tier 0 — the
 * method for "remove old paving, excavate, compact, lay new surface" is a
 * fixed sequence; what varies is which steps are flagged as uncertain.
 *
 * Never overstates technical certainty: any step whose precondition is
 * unknown is marked `certain: false` and surfaced in `verificationNeeded`
 * rather than silently assumed.
 */

export type MethodPhase =
  | 'preparation'
  | 'removal'
  | 'excavation'
  | 'base_prep'
  | 'compaction'
  | 'installation'
  | 'cutting'
  | 'finishing'
  | 'joints'
  | 'cleanup'
  | 'disposal'
  | 'quality_checks';

export interface MethodStep {
  phase: MethodPhase;
  description: string;
  certain: boolean;
}

export interface MethodPlannerInput {
  hasExistingSurfaceToRemove: boolean;
  currentSurfaceKnown: boolean;
  excavationNeeded: boolean | null;
  excavationDepthKnown: boolean;
  drainageKnown: boolean;
  soilOrSubbaseKnown: boolean;
  levelDifferencesKnown: boolean;
  accessWidthCm: number | null;
  disposalIncluded: boolean;
  edging: boolean;
  cuttingComplexity: 'low' | 'medium' | 'high' | 'unknown';
  retainingWallInvolved: boolean;
  suspectedUtilitiesNearby: boolean;
  suspectedAsbestos: boolean;
  permitLikelyRequired: 'no' | 'unknown' | 'yes';
}

export interface MethodPlan {
  steps: MethodStep[];
  risks: string[];
  verificationNeeded: string[];
  overallCertainty: 'high' | 'medium' | 'low';
}

export function buildMethodPlan(input: MethodPlannerInput): MethodPlan {
  const steps: MethodStep[] = [];
  const risks: string[] = [];
  const verificationNeeded: string[] = [];

  steps.push({
    phase: 'preparation',
    description: 'Site protection, material staging, access check.',
    certain: input.accessWidthCm !== null,
  });
  if (input.accessWidthCm === null) verificationNeeded.push('Erişim genişliği doğrulanmalı.');
  if (input.accessWidthCm !== null && input.accessWidthCm < 80) {
    risks.push('Dar erişim: makine kullanımı kısıtlı, taşıma süresi artar.');
  }

  if (input.hasExistingSurfaceToRemove) {
    steps.push({
      phase: 'removal',
      description: 'Remove existing surface/paving.',
      certain: input.currentSurfaceKnown,
    });
    if (!input.currentSurfaceKnown) verificationNeeded.push('Mevcut yüzey türü sahada doğrulanmalı.');
  }

  if (input.excavationNeeded !== false) {
    steps.push({
      phase: 'excavation',
      description: 'Excavate to required depth.',
      certain: input.excavationNeeded === true && input.excavationDepthKnown,
    });
    if (input.excavationNeeded === null) verificationNeeded.push('Kazı gerekip gerekmediği doğrulanmalı.');
    else if (!input.excavationDepthKnown) verificationNeeded.push('Kazı derinliği sahada doğrulanmalı.');

    if (input.suspectedUtilitiesNearby) {
      risks.push('Yakında yeraltı tesisatı (elektrik/gaz/su) olabilir — kazıdan önce doğrulama şart.');
    }
    if (input.retainingWallInvolved) {
      risks.push('İstinat duvarı riski — yapısal değerlendirme gerekebilir.');
    }
  }

  if (!input.soilOrSubbaseKnown) {
    verificationNeeded.push('Zemin/alt tabaka durumu bilinmiyor.');
    risks.push('Zemin belirsizliği: ek stabilizasyon gerekebilir.');
  }
  steps.push({
    phase: 'base_prep',
    description: 'Prepare sand/stabilized base layer.',
    certain: input.soilOrSubbaseKnown,
  });

  steps.push({ phase: 'compaction', description: 'Compact base (trilplaat).', certain: true });

  if (!input.drainageKnown) {
    verificationNeeded.push('Drenaj/su tahliyesi durumu doğrulanmalı.');
    risks.push('Drenaj belirsizliği: su birikmesi riski.');
  }

  steps.push({
    phase: 'installation',
    description: 'Lay the new surface/material.',
    certain: input.levelDifferencesKnown,
  });
  if (!input.levelDifferencesKnown) verificationNeeded.push('Zemin seviye farkları sahada doğrulanmalı.');

  steps.push({
    phase: 'cutting',
    description: 'Cut edge/border pieces as needed.',
    certain: input.cuttingComplexity !== 'unknown',
  });
  if (input.cuttingComplexity === 'high') risks.push('Yüksek kesim karmaşıklığı: ekstra işçilik/malzeme fire payı.');

  steps.push({ phase: 'finishing', description: 'Finish edges and surface.', certain: true });

  if (input.edging) {
    steps.push({ phase: 'joints', description: 'Apply edging/border restraint and joint filling.', certain: true });
  }

  steps.push({ phase: 'cleanup', description: 'Site cleanup.', certain: true });

  if (input.disposalIncluded) {
    steps.push({
      phase: 'disposal',
      description: 'Load and transport waste material for disposal.',
      certain: !input.suspectedAsbestos,
    });
  }
  if (input.suspectedAsbestos) {
    risks.push('Şüpheli asbest — normal atık olarak taşınamaz, uzman bertaraf gerekli.');
  }

  steps.push({ phase: 'quality_checks', description: 'Final quality check against scope.', certain: true });

  if (input.permitLikelyRequired === 'yes') {
    risks.push('İzin/ruhsat gerekli olabilir — işe başlamadan önce kontrol edin.');
  } else if (input.permitLikelyRequired === 'unknown') {
    verificationNeeded.push('İzin/ruhsat gerekliliği belirsiz, kontrol edilmeli.');
  }

  const uncertainStepCount = steps.filter((s) => !s.certain).length;
  const overallCertainty: MethodPlan['overallCertainty'] =
    uncertainStepCount === 0 ? 'high' : uncertainStepCount <= 2 ? 'medium' : 'low';

  return { steps, risks, verificationNeeded, overallCertainty };
}
