// Shared types for the three deterministic calculation engines.
// No LLM calls anywhere in this file or anything it imports from.

export type Sex = "male" | "female";

export type Goal = "fat_loss" | "maintenance" | "muscle_gain";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active";

export type Equipment =
  | "full_gym"
  | "dumbbells_only"
  | "bodyweight_only"
  | "home_gym_basic"; // bench + rack + barbell + dumbbells, no machines

export type InjuryFlag =
  | "shoulder"
  | "lower_back"
  | "knee"
  | "wrist"
  | "hip";

export type DaysPerWeek = 2 | 3 | 4 | 5 | 6;

// --- Training program ---

export interface TrainingInput {
  daysPerWeek: DaysPerWeek;
  equipment: Equipment;
  injuries: InjuryFlag[];
}

export interface ExercisePrescription {
  name: string;
  sets: number;
  reps: string; // rep range as displayed, e.g. "8-12"
  notes?: string; // e.g. substitution reason
}

export interface DayProgram {
  dayLabel: string; // "Day 1", "Day 2", ...
  focus: string; // "Upper Body", "Push", "Legs", etc.
  exercises: ExercisePrescription[];
}

export interface TrainingProgram {
  splitName: string;
  daysPerWeek: DaysPerWeek;
  days: DayProgram[];
  disclaimer: string;
}

// --- Meal plan ---

export interface MealPlanInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  healthFlags: boolean; // true if ANY PAR-Q style flag was raised on intake
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface DayMealPlan {
  dayLabel: string;
  meals: {
    label: string; // "Meal 1", "Meal 2", ...
    description: string;
  }[];
}

export interface MealPlanResult {
  blocked: true;
  reason: string;
}

export interface MealPlanSuccess {
  blocked: false;
  macros: MacroTargets;
  days: DayMealPlan[];
  disclaimer: string;
}

export type MealPlanOutput = MealPlanResult | MealPlanSuccess;

// --- Cardio calculator ---

export type CardioModality =
  | "treadmill"
  | "elliptical"
  | "stationary_bike"
  | "stair_climber"
  | "rower";

export type IntensityLevel = "low" | "moderate" | "high";

export interface CardioInput {
  modality: CardioModality;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  durationMinutes: number;
  intensity: IntensityLevel;
  speedMph?: number; // treadmill / bike — provide this OR distanceMiles
  distanceMiles?: number; // alternative to speedMph; converted using durationMinutes
  inclinePercent?: number; // treadmill only
}

export interface CardioResult {
  met: number;
  caloriesBurned: number;
  disclaimer: string;
}
