// Deterministic macro + meal-structure calculator.
// Mifflin-St Jeor BMR -> activity factor -> goal adjustment -> macro split.
// No LLM calls. Same input -> same output, always.

import type {
  ActivityLevel,
  DayMealPlan,
  Goal,
  MacroTargets,
  MealPlanInput,
  MealPlanOutput,
  Sex,
} from "./types";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

// Flat calorie adjustment applied to TDEE per goal.
const GOAL_ADJUSTMENT_KCAL: Record<Goal, number> = {
  fat_loss: -500,
  maintenance: 0,
  muscle_gain: 300,
};

const PROTEIN_G_PER_KG = 2.1; // midpoint of 2.0-2.2 g/kg
const FAT_FLOOR_G_PER_KG = 0.5;
const FAT_FLOOR_PCT_OF_CALORIES = 0.25;

const CALORIE_FLOOR: Record<Sex, number> = {
  female: 1300,
  male: 1600,
};

const DAYS_IN_WEEK = 7;
const MEAL_SPLIT = [
  { label: "Meal 1", share: 0.25 },
  { label: "Meal 2", share: 0.3 },
  { label: "Meal 3", share: 0.3 },
  { label: "Snack", share: 0.15 },
];

/**
 * Mifflin-St Jeor BMR. Pure arithmetic, no lookups beyond the sex-based
 * constant term.
 */
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

/**
 * Computes calorie + macro targets. Applies the goal adjustment, then the
 * sex-based safety floor, then derives protein/fat/carbs off the final
 * calorie number so the macros always sum back to the displayed calories.
 */
export function calculateMacros(input: MealPlanInput): MacroTargets {
  const { sex, ageYears, heightCm, weightKg, activityLevel, goal } = input;

  const bmr = calculateBMR(sex, weightKg, heightCm, ageYears);
  const tdee = calculateTDEE(bmr, activityLevel);
  const adjusted = tdee + GOAL_ADJUSTMENT_KCAL[goal];
  const floored = Math.max(adjusted, CALORIE_FLOOR[sex]);
  const calories = Math.round(floored / 10) * 10;

  const proteinG = Math.round(weightKg * PROTEIN_G_PER_KG);
  const fatFloorFromWeight = weightKg * FAT_FLOOR_G_PER_KG;
  const fatFloorFromCalories =
    (calories * FAT_FLOOR_PCT_OF_CALORIES) / 9;
  const fatG = Math.round(Math.max(fatFloorFromWeight, fatFloorFromCalories));

  const remainingCalories = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingCalories / 4));

  return { calories, proteinG, fatG, carbsG };
}

function buildWeek(): DayMealPlan[] {
  const days: DayMealPlan[] = [];
  for (let i = 1; i <= DAYS_IN_WEEK; i++) {
    days.push({
      dayLabel: `Day ${i}`,
      meals: MEAL_SPLIT.map((m) => ({
        label: m.label,
        description:
          "Lean protein source + complex carbohydrate + vegetables (portion to hit daily macro targets).",
      })),
    });
  }
  return days;
}

/**
 * Top-level entry point. If any PAR-Q-style health flag was raised on
 * intake, generation is blocked entirely — no macros are computed or
 * shown. Otherwise returns one deterministic week of meal structure sized
 * to the computed macro targets.
 */
export function generateMealPlan(input: MealPlanInput): MealPlanOutput {
  if (input.healthFlags) {
    return {
      blocked: true,
      reason:
        "We can't safely auto-generate a nutrition plan based on what you told us. Please consult a qualified health professional before starting a calorie or macro plan.",
    };
  }

  const macros = calculateMacros(input);

  return {
    blocked: false,
    macros,
    days: buildWeek(),
    disclaimer:
      "Estimates based on the Mifflin-St Jeor equation. Not medical advice. Adjust based on real-world progress.",
  };
}
