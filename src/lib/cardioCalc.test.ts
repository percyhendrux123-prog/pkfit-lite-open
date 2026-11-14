import { describe, expect, it } from "vitest";
import {
  calculateCardioCalories,
  calculateTreadmillMET,
  resolveEffectiveSpeedMph,
  resolveMET,
} from "./cardioCalc";
import type { CardioInput } from "./types";

const baseTreadmillInput: CardioInput = {
  modality: "treadmill",
  sex: "male",
  heightCm: 178,
  weightKg: 80,
  durationMinutes: 30,
  intensity: "moderate",
};

describe("calculateTreadmillMET", () => {
  it("uses the ACSM walking formula at/under the walk-run threshold", () => {
    // 3 mph, 0% incline: speed = 80.4672 m/min
    // VO2 = 0.1*80.4672 + 0 + 3.5 = 11.54672
    // MET = VO2 / 3.5
    const met = calculateTreadmillMET(3, 0);
    expect(met).toBeCloseTo(11.54672 / 3.5, 4);
  });

  it("uses the ACSM running formula above the walk-run threshold", () => {
    // 6 mph, 0% incline: speed = 160.9344 m/min
    // VO2 = 0.2*160.9344 + 0 + 3.5 = 35.68688
    const met = calculateTreadmillMET(6, 0);
    expect(met).toBeCloseTo(35.68688 / 3.5, 4);
  });

  it("increases with incline at a fixed speed", () => {
    const flat = calculateTreadmillMET(3, 0);
    const incline = calculateTreadmillMET(3, 5);
    expect(incline).toBeGreaterThan(flat);
  });

  it("increases with speed at fixed incline", () => {
    const slow = calculateTreadmillMET(2.5, 0);
    const fast = calculateTreadmillMET(4, 0);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe("resolveEffectiveSpeedMph", () => {
  it("prefers explicit speedMph when provided", () => {
    const input: CardioInput = {
      ...baseTreadmillInput,
      speedMph: 5,
      distanceMiles: 10,
    };
    expect(resolveEffectiveSpeedMph(input)).toBe(5);
  });

  it("derives speed from distance and duration when speed is absent", () => {
    const input: CardioInput = {
      ...baseTreadmillInput,
      durationMinutes: 30,
      distanceMiles: 2.5,
    };
    // 2.5 miles in 30 min = 5 mph
    expect(resolveEffectiveSpeedMph(input)).toBeCloseTo(5, 6);
  });

  it("returns undefined when neither speed nor distance is provided", () => {
    expect(resolveEffectiveSpeedMph(baseTreadmillInput)).toBeUndefined();
  });
});

describe("resolveMET", () => {
  it("falls back to the intensity-based MET table when treadmill has no speed/distance", () => {
    const met = resolveMET(baseTreadmillInput);
    expect(met).toBe(6.0); // moderate treadmill fallback
  });

  it("uses the ACSM formula when treadmill speed is provided, overriding the intensity table", () => {
    const met = resolveMET({ ...baseTreadmillInput, speedMph: 3, inclinePercent: 0 });
    expect(met).toBeCloseTo(11.54672 / 3.5, 4);
  });

  it("uses the fixed MET table for non-treadmill modalities regardless of intensity label", () => {
    const low = resolveMET({
      ...baseTreadmillInput,
      modality: "rower",
      intensity: "low",
    });
    const high = resolveMET({
      ...baseTreadmillInput,
      modality: "rower",
      intensity: "high",
    });
    expect(low).toBe(3.5);
    expect(high).toBe(12.0);
    expect(high).toBeGreaterThan(low);
  });

  it("every modality x intensity combination resolves to a positive MET", () => {
    const modalities: CardioInput["modality"][] = [
      "treadmill",
      "elliptical",
      "stationary_bike",
      "stair_climber",
      "rower",
    ];
    const intensities: CardioInput["intensity"][] = ["low", "moderate", "high"];
    for (const modality of modalities) {
      for (const intensity of intensities) {
        const met = resolveMET({ ...baseTreadmillInput, modality, intensity });
        expect(met).toBeGreaterThan(0);
      }
    }
  });
});

describe("calculateCardioCalories", () => {
  it("is fully deterministic — identical input always yields identical output", () => {
    const a = calculateCardioCalories(baseTreadmillInput);
    const b = calculateCardioCalories(baseTreadmillInput);
    expect(a).toEqual(b);
  });

  it("calories scale linearly with duration at fixed MET and weight", () => {
    const thirtyMin = calculateCardioCalories({
      ...baseTreadmillInput,
      durationMinutes: 30,
    });
    const sixtyMin = calculateCardioCalories({
      ...baseTreadmillInput,
      durationMinutes: 60,
    });
    // Allow small rounding drift since each is independently rounded.
    expect(sixtyMin.caloriesBurned).toBeGreaterThan(
      thirtyMin.caloriesBurned * 1.9,
    );
  });

  it("calories scale with bodyweight at fixed MET and duration", () => {
    const lighter = calculateCardioCalories({
      ...baseTreadmillInput,
      weightKg: 60,
    });
    const heavier = calculateCardioCalories({
      ...baseTreadmillInput,
      weightKg: 100,
    });
    expect(heavier.caloriesBurned).toBeGreaterThan(lighter.caloriesBurned);
  });

  it("matches the standard MET-to-kcal/min formula exactly (before rounding)", () => {
    // MET * 3.5 * weightKg * minutes / 200
    const input: CardioInput = {
      modality: "stationary_bike",
      sex: "female",
      heightCm: 165,
      weightKg: 70,
      durationMinutes: 45,
      intensity: "moderate",
    };
    const expectedRaw = (6.8 * 3.5 * 70 * 45) / 200;
    const result = calculateCardioCalories(input);
    expect(result.caloriesBurned).toBe(Math.round(expectedRaw));
  });

  it("never produces negative or zero calories for a normal session", () => {
    const result = calculateCardioCalories(baseTreadmillInput);
    expect(result.caloriesBurned).toBeGreaterThan(0);
  });

  it("includes the estimate-only disclaimer", () => {
    const result = calculateCardioCalories(baseTreadmillInput);
    expect(result.disclaimer.toLowerCase()).toContain("estimate");
  });
});
