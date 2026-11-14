// Deterministic MET-based cardio calorie calculator.
// Standard ACSM metabolic equations for treadmill (speed + incline aware);
// Compendium-of-Physical-Activities-style fixed MET table for the other
// four modalities, selected by self-reported intensity. No LLM calls.
//
// These are estimates, not medical-grade measurements. The UI must present
// them as such.

import type { CardioInput, CardioModality, CardioResult, IntensityLevel } from "./types";

const MPH_TO_M_PER_MIN = 26.8224;
const WALK_RUN_THRESHOLD_MPH = 4.3; // above this, treat as running gait

// Fixed MET table for modalities without a speed/incline-driven formula
// wired up in this scaffold. Values are standard Compendium-of-Physical-
// Activities-style approximations, selected by self-reported intensity.
const MET_TABLE: Record<Exclude<CardioModality, "treadmill">, Record<IntensityLevel, number>> = {
  elliptical: { low: 4.6, moderate: 5.0, high: 7.0 },
  stationary_bike: { low: 3.5, moderate: 6.8, high: 10.5 },
  stair_climber: { low: 4.0, moderate: 8.0, high: 9.8 },
  rower: { low: 3.5, moderate: 7.0, high: 12.0 },
};

// Intensity-based MET fallback for treadmill when no speed is provided.
const TREADMILL_INTENSITY_MET: Record<IntensityLevel, number> = {
  low: 3.5,
  moderate: 6.0,
  high: 9.8,
};

/**
 * ACSM metabolic equation for walking or running on a treadmill.
 * VO2 (ml/kg/min) = speed-term + grade-term + 3.5 (resting)
 * MET = VO2 / 3.5
 */
export function calculateTreadmillMET(
  speedMph: number,
  inclinePercent: number,
): number {
  const speedMPerMin = speedMph * MPH_TO_M_PER_MIN;
  const grade = inclinePercent / 100;

  const vo2 =
    speedMph <= WALK_RUN_THRESHOLD_MPH
      ? 0.1 * speedMPerMin + 1.8 * speedMPerMin * grade + 3.5 // walking
      : 0.2 * speedMPerMin + 0.9 * speedMPerMin * grade + 3.5; // running

  return vo2 / 3.5;
}

/**
 * Resolves the MET value to use for a given cardio input. Deterministic:
 * treadmill uses the ACSM speed/incline formula when speed is supplied,
 * otherwise every modality falls back to its fixed intensity-based MET.
 */
export function resolveEffectiveSpeedMph(input: CardioInput): number | undefined {
  if (input.speedMph !== undefined) return input.speedMph;
  if (input.distanceMiles !== undefined && input.durationMinutes > 0) {
    return input.distanceMiles / (input.durationMinutes / 60);
  }
  return undefined;
}

export function resolveMET(input: CardioInput): number {
  const effectiveSpeedMph = resolveEffectiveSpeedMph(input);

  if (input.modality === "treadmill" && effectiveSpeedMph !== undefined) {
    return calculateTreadmillMET(effectiveSpeedMph, input.inclinePercent ?? 0);
  }

  if (input.modality === "treadmill") {
    return TREADMILL_INTENSITY_MET[input.intensity];
  }

  return MET_TABLE[input.modality][input.intensity];
}

/**
 * calories = MET * 3.5 * weightKg * minutes / 200
 * (standard MET-to-kcal/min conversion: kcal/min = MET * 3.5 * weightKg / 200)
 */
export function calculateCardioCalories(input: CardioInput): CardioResult {
  const met = resolveMET(input);
  const caloriesBurned = Math.round(
    (met * 3.5 * input.weightKg * input.durationMinutes) / 200,
  );

  return {
    met: Math.round(met * 10) / 10,
    caloriesBurned,
    disclaimer:
      "Estimate only, based on standard MET formulas. Not a medical-grade measurement.",
  };
}
