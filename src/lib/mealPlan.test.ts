import { describe, expect, it } from "vitest";
import { calculateBMR, calculateMacros, generateMealPlan } from "./mealPlan";
import type { MealPlanInput } from "./types";

const baseMale: MealPlanInput = {
  sex: "male",
  ageYears: 30,
  heightCm: 180,
  weightKg: 85,
  activityLevel: "moderate",
  goal: "maintenance",
  healthFlags: false,
};

const baseFemale: MealPlanInput = {
  sex: "female",
  ageYears: 28,
  heightCm: 165,
  weightKg: 60,
  activityLevel: "light",
  goal: "fat_loss",
  healthFlags: false,
};

describe("calculateBMR", () => {
  it("matches the Mifflin-St Jeor formula for men (+5)", () => {
    // 10*85 + 6.25*180 - 5*30 + 5 = 850 + 1125 - 150 + 5 = 1830
    expect(calculateBMR("male", 85, 180, 30)).toBeCloseTo(1830, 5);
  });

  it("matches the Mifflin-St Jeor formula for women (-161)", () => {
    // 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25
    expect(calculateBMR("female", 60, 165, 28)).toBeCloseTo(1330.25, 5);
  });
});

describe("calculateMacros", () => {
  it("is fully deterministic — identical input always yields identical output", () => {
    const a = calculateMacros(baseMale);
    const b = calculateMacros(baseMale);
    expect(a).toEqual(b);
  });

  it("protein target is ~2.0-2.2 g/kg bodyweight", () => {
    const macros = calculateMacros(baseMale);
    const gPerKg = macros.proteinG / baseMale.weightKg;
    expect(gPerKg).toBeGreaterThanOrEqual(2.0);
    expect(gPerKg).toBeLessThanOrEqual(2.2);
  });

  it("fat is never below the 0.5 g/kg floor", () => {
    const macros = calculateMacros(baseMale);
    expect(macros.fatG).toBeGreaterThanOrEqual(baseMale.weightKg * 0.5);
  });

  it("fat is never below 25% of total calories", () => {
    const macros = calculateMacros(baseMale);
    const fatCalories = macros.fatG * 9;
    expect(fatCalories / macros.calories).toBeGreaterThanOrEqual(0.25 - 0.01);
  });

  it("protein + fat + carbs (in calories) reconcile to the displayed total calories", () => {
    const macros = calculateMacros(baseMale);
    const total = macros.proteinG * 4 + macros.fatG * 9 + macros.carbsG * 4;
    // allow rounding slack from independent gram rounding
    expect(Math.abs(total - macros.calories)).toBeLessThanOrEqual(12);
  });

  it("carbs are never negative", () => {
    // Extreme low-weight, low-activity, fat_loss case that could stress the remainder math
    const macros = calculateMacros({
      sex: "female",
      ageYears: 60,
      heightCm: 150,
      weightKg: 45,
      activityLevel: "sedentary",
      goal: "fat_loss",
      healthFlags: false,
    });
    expect(macros.carbsG).toBeGreaterThanOrEqual(0);
  });

  it("never outputs calories below 1600 for a male", () => {
    // Deliberately small/inactive male stat set that would otherwise fall
    // below the floor after a fat_loss deduction.
    const macros = calculateMacros({
      sex: "male",
      ageYears: 45,
      heightCm: 160,
      weightKg: 55,
      activityLevel: "sedentary",
      goal: "fat_loss",
      healthFlags: false,
    });
    expect(macros.calories).toBeGreaterThanOrEqual(1600);
  });

  it("never outputs calories below 1300 for a female", () => {
    const macros = calculateMacros({
      sex: "female",
      ageYears: 45,
      heightCm: 150,
      weightKg: 42,
      activityLevel: "sedentary",
      goal: "fat_loss",
      healthFlags: false,
    });
    expect(macros.calories).toBeGreaterThanOrEqual(1300);
  });

  it("muscle_gain calories exceed maintenance calories for the same stats", () => {
    const maintenance = calculateMacros({ ...baseMale, goal: "maintenance" });
    const gain = calculateMacros({ ...baseMale, goal: "muscle_gain" });
    expect(gain.calories).toBeGreaterThan(maintenance.calories);
  });

  it("fat_loss calories are lower than maintenance calories for the same stats", () => {
    const maintenance = calculateMacros({ ...baseMale, goal: "maintenance" });
    const loss = calculateMacros({ ...baseMale, goal: "fat_loss" });
    expect(loss.calories).toBeLessThan(maintenance.calories);
  });
});

describe("generateMealPlan", () => {
  it("blocks generation entirely when a health flag is raised — no macros computed", () => {
    const result = generateMealPlan({ ...baseFemale, healthFlags: true });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.reason.toLowerCase()).toContain("consult");
    }
  });

  it("produces exactly 7 days when not blocked", () => {
    const result = generateMealPlan(baseMale);
    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect(result.days).toHaveLength(7);
    }
  });

  it("is fully deterministic end to end", () => {
    const a = generateMealPlan(baseFemale);
    const b = generateMealPlan(baseFemale);
    expect(a).toEqual(b);
  });
});
