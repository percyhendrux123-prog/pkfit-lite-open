// Deterministic training-split selector + exercise-substitution engine.
// Rule-based only. No LLM calls. No randomness. Same input -> same output, always.

import type {
  DayProgram,
  DaysPerWeek,
  Equipment,
  ExercisePrescription,
  InjuryFlag,
  TrainingInput,
  TrainingProgram,
} from "./types";

type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "unilateral_leg"
  | "core"
  | "biceps"
  | "triceps"
  | "calf"
  | "rear_delt";

interface ExerciseCandidate {
  name: string;
  avoidIf: InjuryFlag[];
}

interface PatternTable {
  full_gym: ExerciseCandidate[];
  home_gym_basic: ExerciseCandidate[];
  dumbbells_only: ExerciseCandidate[];
  bodyweight_only: ExerciseCandidate[];
  safeFallback: ExerciseCandidate; // must always have avoidIf: []
}

const EXERCISE_TABLE: Record<MovementPattern, PatternTable> = {
  squat: {
    full_gym: [
      { name: "Barbell Back Squat", avoidIf: ["knee", "lower_back"] },
      { name: "Leg Press", avoidIf: ["lower_back"] },
      { name: "Goblet Squat", avoidIf: [] },
    ],
    home_gym_basic: [
      { name: "Barbell Back Squat", avoidIf: ["knee", "lower_back"] },
      { name: "Goblet Squat", avoidIf: [] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Goblet Squat", avoidIf: [] },
      { name: "Dumbbell Front Squat", avoidIf: ["wrist"] },
    ],
    bodyweight_only: [
      { name: "Bodyweight Squat", avoidIf: [] },
      { name: "Tempo Bodyweight Squat", avoidIf: [] },
    ],
    safeFallback: { name: "Wall Sit", avoidIf: [] },
  },
  hinge: {
    full_gym: [
      { name: "Barbell Romanian Deadlift", avoidIf: ["lower_back"] },
      { name: "Cable Pull-Through", avoidIf: [] },
      { name: "Glute Bridge", avoidIf: [] },
    ],
    home_gym_basic: [
      { name: "Barbell Romanian Deadlift", avoidIf: ["lower_back"] },
      { name: "Dumbbell Romanian Deadlift", avoidIf: ["lower_back"] },
      { name: "Glute Bridge", avoidIf: [] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Romanian Deadlift", avoidIf: ["lower_back"] },
      { name: "Dumbbell Glute Bridge", avoidIf: [] },
    ],
    bodyweight_only: [
      { name: "Single-Leg Glute Bridge", avoidIf: [] },
      { name: "Bodyweight Good Morning", avoidIf: ["lower_back"] },
    ],
    safeFallback: { name: "Glute Bridge", avoidIf: [] },
  },
  horizontal_push: {
    full_gym: [
      { name: "Barbell Bench Press", avoidIf: ["shoulder", "wrist"] },
      { name: "Machine Chest Press", avoidIf: ["wrist"] },
      { name: "Push-Up", avoidIf: ["wrist"] },
    ],
    home_gym_basic: [
      { name: "Barbell Bench Press", avoidIf: ["shoulder", "wrist"] },
      { name: "Dumbbell Bench Press", avoidIf: ["shoulder", "wrist"] },
      { name: "Push-Up", avoidIf: ["wrist"] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Bench Press", avoidIf: ["shoulder", "wrist"] },
      { name: "Dumbbell Floor Press", avoidIf: ["shoulder"] },
    ],
    bodyweight_only: [
      { name: "Push-Up", avoidIf: ["wrist"] },
      { name: "Incline Push-Up", avoidIf: ["wrist"] },
    ],
    safeFallback: { name: "Incline Push-Up (knees down)", avoidIf: [] },
  },
  vertical_push: {
    full_gym: [
      { name: "Barbell Overhead Press", avoidIf: ["shoulder"] },
      { name: "Machine Shoulder Press", avoidIf: ["shoulder"] },
      { name: "Dumbbell Seated Shoulder Press", avoidIf: ["shoulder"] },
    ],
    home_gym_basic: [
      { name: "Barbell Overhead Press", avoidIf: ["shoulder"] },
      { name: "Dumbbell Seated Shoulder Press", avoidIf: ["shoulder"] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Seated Shoulder Press", avoidIf: ["shoulder"] },
      { name: "Dumbbell Arnold Press", avoidIf: ["shoulder"] },
    ],
    bodyweight_only: [
      { name: "Pike Push-Up", avoidIf: ["shoulder", "wrist"] },
      { name: "Wall Handstand Hold", avoidIf: ["shoulder", "wrist"] },
    ],
    safeFallback: { name: "Standing Band-Free Arm Raise Hold", avoidIf: [] },
  },
  horizontal_pull: {
    full_gym: [
      { name: "Seated Cable Row", avoidIf: ["lower_back"] },
      { name: "Chest-Supported Machine Row", avoidIf: [] },
      { name: "Inverted Row", avoidIf: [] },
    ],
    home_gym_basic: [
      { name: "Barbell Bent-Over Row", avoidIf: ["lower_back"] },
      { name: "Dumbbell Bent-Over Row", avoidIf: ["lower_back"] },
      { name: "Inverted Row", avoidIf: [] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Bent-Over Row", avoidIf: ["lower_back"] },
      { name: "Single-Arm Dumbbell Row (bench supported)", avoidIf: [] },
    ],
    bodyweight_only: [
      { name: "Inverted Row", avoidIf: [] },
      { name: "Doorframe Towel Row", avoidIf: [] },
    ],
    safeFallback: { name: "Chest-Supported Row (bodyweight)", avoidIf: [] },
  },
  vertical_pull: {
    full_gym: [
      { name: "Lat Pulldown", avoidIf: ["shoulder"] },
      { name: "Assisted Pull-Up Machine", avoidIf: ["shoulder"] },
      { name: "Pull-Up", avoidIf: ["shoulder"] },
    ],
    home_gym_basic: [
      { name: "Pull-Up", avoidIf: ["shoulder"] },
      { name: "Band-Assisted Pull-Up", avoidIf: ["shoulder"] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Pullover", avoidIf: ["shoulder"] },
      { name: "Dumbbell Renegade Row", avoidIf: ["wrist", "shoulder"] },
    ],
    bodyweight_only: [
      { name: "Pull-Up", avoidIf: ["shoulder"] },
      { name: "Doorframe Row", avoidIf: [] },
    ],
    safeFallback: { name: "Scapular Retraction Hold", avoidIf: [] },
  },
  unilateral_leg: {
    full_gym: [
      { name: "Walking Lunge", avoidIf: ["knee"] },
      { name: "Bulgarian Split Squat", avoidIf: ["knee", "hip"] },
      { name: "Step-Up", avoidIf: ["knee"] },
    ],
    home_gym_basic: [
      { name: "Dumbbell Walking Lunge", avoidIf: ["knee"] },
      { name: "Dumbbell Bulgarian Split Squat", avoidIf: ["knee", "hip"] },
    ],
    dumbbells_only: [
      { name: "Dumbbell Walking Lunge", avoidIf: ["knee"] },
      { name: "Dumbbell Bulgarian Split Squat", avoidIf: ["knee", "hip"] },
    ],
    bodyweight_only: [
      { name: "Bodyweight Walking Lunge", avoidIf: ["knee"] },
      { name: "Bodyweight Step-Up", avoidIf: ["knee"] },
    ],
    safeFallback: { name: "Standing Hip Hinge to Toe Tap", avoidIf: [] },
  },
  core: {
    full_gym: [
      { name: "Plank", avoidIf: [] },
      { name: "Dead Bug", avoidIf: [] },
    ],
    home_gym_basic: [
      { name: "Plank", avoidIf: [] },
      { name: "Dead Bug", avoidIf: [] },
    ],
    dumbbells_only: [
      { name: "Plank", avoidIf: [] },
      { name: "Dead Bug", avoidIf: [] },
    ],
    bodyweight_only: [
      { name: "Plank", avoidIf: [] },
      { name: "Dead Bug", avoidIf: [] },
    ],
    safeFallback: { name: "Dead Bug", avoidIf: [] },
  },
  biceps: {
    full_gym: [
      { name: "Cable Bicep Curl", avoidIf: ["wrist"] },
      { name: "Dumbbell Bicep Curl", avoidIf: ["wrist"] },
    ],
    home_gym_basic: [{ name: "Dumbbell Bicep Curl", avoidIf: ["wrist"] }],
    dumbbells_only: [{ name: "Dumbbell Bicep Curl", avoidIf: ["wrist"] }],
    bodyweight_only: [
      { name: "Isometric Bicep Hold (towel curl)", avoidIf: [] },
    ],
    safeFallback: { name: "Isometric Bicep Hold", avoidIf: [] },
  },
  triceps: {
    full_gym: [
      { name: "Cable Triceps Pushdown", avoidIf: ["wrist", "shoulder"] },
      {
        name: "Dumbbell Overhead Triceps Extension",
        avoidIf: ["shoulder", "wrist"],
      },
    ],
    home_gym_basic: [
      {
        name: "Dumbbell Overhead Triceps Extension",
        avoidIf: ["shoulder", "wrist"],
      },
      { name: "Dumbbell Skull Crusher", avoidIf: ["wrist", "shoulder"] },
    ],
    dumbbells_only: [
      {
        name: "Dumbbell Overhead Triceps Extension",
        avoidIf: ["shoulder", "wrist"],
      },
      { name: "Dumbbell Skull Crusher", avoidIf: ["wrist", "shoulder"] },
    ],
    bodyweight_only: [
      { name: "Bench Dip", avoidIf: ["shoulder", "wrist"] },
      { name: "Diamond Push-Up", avoidIf: ["wrist"] },
    ],
    safeFallback: { name: "Triceps Kickback (bodyweight arm only)", avoidIf: [] },
  },
  calf: {
    full_gym: [{ name: "Standing Calf Raise", avoidIf: [] }],
    home_gym_basic: [{ name: "Standing Calf Raise", avoidIf: [] }],
    dumbbells_only: [{ name: "Standing Calf Raise", avoidIf: [] }],
    bodyweight_only: [{ name: "Standing Calf Raise", avoidIf: [] }],
    safeFallback: { name: "Standing Calf Raise", avoidIf: [] },
  },
  rear_delt: {
    full_gym: [
      { name: "Cable Face Pull", avoidIf: ["shoulder"] },
      { name: "Reverse Pec Deck", avoidIf: ["shoulder"] },
    ],
    home_gym_basic: [{ name: "Dumbbell Reverse Fly", avoidIf: ["shoulder"] }],
    dumbbells_only: [{ name: "Dumbbell Reverse Fly", avoidIf: ["shoulder"] }],
    bodyweight_only: [{ name: "Prone Y-Raise", avoidIf: ["shoulder"] }],
    safeFallback: { name: "Prone Y-Raise (light)", avoidIf: [] },
  },
};

interface PatternSlot {
  pattern: MovementPattern;
  sets: number;
  reps: string;
}

interface DayTemplate {
  focus: string;
  slots: PatternSlot[];
}

const FULL_BODY_A: DayTemplate = {
  focus: "Full Body",
  slots: [
    { pattern: "squat", sets: 3, reps: "8-12" },
    { pattern: "horizontal_push", sets: 3, reps: "8-12" },
    { pattern: "horizontal_pull", sets: 3, reps: "8-12" },
    { pattern: "hinge", sets: 3, reps: "8-12" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const FULL_BODY_B: DayTemplate = {
  focus: "Full Body",
  slots: [
    { pattern: "hinge", sets: 3, reps: "8-12" },
    { pattern: "vertical_push", sets: 3, reps: "8-12" },
    { pattern: "vertical_pull", sets: 3, reps: "8-12" },
    { pattern: "unilateral_leg", sets: 3, reps: "10-12/leg" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const FULL_BODY_C: DayTemplate = {
  focus: "Full Body",
  slots: [
    { pattern: "squat", sets: 3, reps: "8-12" },
    { pattern: "vertical_push", sets: 3, reps: "8-12" },
    { pattern: "horizontal_pull", sets: 3, reps: "8-12" },
    { pattern: "hinge", sets: 3, reps: "8-12" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const UPPER_A: DayTemplate = {
  focus: "Upper Body",
  slots: [
    { pattern: "horizontal_push", sets: 4, reps: "8-12" },
    { pattern: "horizontal_pull", sets: 4, reps: "8-12" },
    { pattern: "vertical_push", sets: 3, reps: "8-12" },
    { pattern: "vertical_pull", sets: 3, reps: "8-12" },
    { pattern: "biceps", sets: 3, reps: "10-15" },
    { pattern: "triceps", sets: 3, reps: "10-15" },
  ],
};

const UPPER_B: DayTemplate = {
  focus: "Upper Body",
  slots: [
    { pattern: "vertical_push", sets: 4, reps: "8-12" },
    { pattern: "vertical_pull", sets: 4, reps: "8-12" },
    { pattern: "horizontal_push", sets: 3, reps: "8-12" },
    { pattern: "horizontal_pull", sets: 3, reps: "8-12" },
    { pattern: "triceps", sets: 3, reps: "10-15" },
    { pattern: "rear_delt", sets: 3, reps: "12-15" },
  ],
};

const LOWER_A: DayTemplate = {
  focus: "Lower Body",
  slots: [
    { pattern: "squat", sets: 4, reps: "8-12" },
    { pattern: "hinge", sets: 4, reps: "8-12" },
    { pattern: "unilateral_leg", sets: 3, reps: "10-12/leg" },
    { pattern: "calf", sets: 4, reps: "12-15" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const LOWER_B: DayTemplate = {
  focus: "Lower Body",
  slots: [
    { pattern: "hinge", sets: 4, reps: "8-12" },
    { pattern: "squat", sets: 4, reps: "8-12" },
    { pattern: "unilateral_leg", sets: 3, reps: "10-12/leg" },
    { pattern: "calf", sets: 4, reps: "12-15" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const PUSH: DayTemplate = {
  focus: "Push",
  slots: [
    { pattern: "horizontal_push", sets: 4, reps: "8-12" },
    { pattern: "vertical_push", sets: 4, reps: "8-12" },
    { pattern: "triceps", sets: 4, reps: "10-15" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

const PULL: DayTemplate = {
  focus: "Pull",
  slots: [
    { pattern: "vertical_pull", sets: 4, reps: "8-12" },
    { pattern: "horizontal_pull", sets: 4, reps: "8-12" },
    { pattern: "rear_delt", sets: 3, reps: "12-15" },
    { pattern: "biceps", sets: 4, reps: "10-15" },
  ],
};

const LEGS: DayTemplate = {
  focus: "Legs",
  slots: [
    { pattern: "squat", sets: 4, reps: "8-12" },
    { pattern: "hinge", sets: 4, reps: "8-12" },
    { pattern: "unilateral_leg", sets: 3, reps: "10-12/leg" },
    { pattern: "calf", sets: 4, reps: "12-15" },
    { pattern: "core", sets: 3, reps: "30-45s" },
  ],
};

interface SplitDefinition {
  splitName: string;
  templates: DayTemplate[];
}

const SPLIT_TABLE: Record<DaysPerWeek, SplitDefinition> = {
  2: { splitName: "Full Body", templates: [FULL_BODY_A, FULL_BODY_B] },
  3: {
    splitName: "Full Body",
    templates: [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C],
  },
  4: {
    splitName: "Upper / Lower",
    templates: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  },
  5: {
    splitName: "Push / Pull / Legs + Upper / Lower",
    templates: [PUSH, PULL, LEGS, UPPER_A, LOWER_A],
  },
  6: {
    splitName: "Push / Pull / Legs (x2)",
    templates: [PUSH, PULL, LEGS, PUSH, PULL, LEGS],
  },
};

/**
 * Selects the fixed split template for a given days/week count.
 * Pure lookup, no computation beyond a table read.
 */
export function selectSplit(daysPerWeek: DaysPerWeek): SplitDefinition {
  return SPLIT_TABLE[daysPerWeek];
}

/**
 * Picks a concrete exercise for a movement pattern given equipment and
 * injury flags. Walks the ordered candidate list for that equipment tier
 * and returns the first exercise whose avoidIf list does not intersect the
 * user's injuries. Falls back to the pattern's safeFallback (always
 * injury-neutral) if every equipment-tier candidate is disqualified.
 */
interface PickedExercise {
  name: string;
  substituted: boolean;
}

function pickExercise(
  pattern: MovementPattern,
  equipment: Equipment,
  injuries: InjuryFlag[],
): PickedExercise {
  const table = EXERCISE_TABLE[pattern];
  const candidates = table[equipment];

  for (const candidate of candidates) {
    const conflict = candidate.avoidIf.some((flag) => injuries.includes(flag));
    if (!conflict) {
      return { name: candidate.name, substituted: false };
    }
  }

  // Every tier-specific candidate conflicts with a flagged injury.
  return { name: table.safeFallback.name, substituted: true };
}

/**
 * Builds one full week of a training split, deterministically, from the
 * fixed split + exercise tables above. Same TrainingInput always produces
 * the same TrainingProgram.
 */
export function generateTrainingProgram(input: TrainingInput): TrainingProgram {
  const { daysPerWeek, equipment, injuries } = input;
  const split = selectSplit(daysPerWeek);

  const days: DayProgram[] = split.templates.map((template, index) => {
    const exercises: ExercisePrescription[] = template.slots.map((slot) => {
      const picked = pickExercise(slot.pattern, equipment, injuries);
      const exercise: ExercisePrescription = {
        name: picked.name,
        sets: slot.sets,
        reps: slot.reps,
      };
      if (picked.substituted) {
        exercise.notes = "Substituted for flagged injury.";
      }
      return exercise;
    });

    return {
      dayLabel: `Day ${index + 1}`,
      focus: template.focus,
      exercises,
    };
  });

  return {
    splitName: split.splitName,
    daysPerWeek,
    days,
    disclaimer:
      "This is a single-week starting template, not a progressive program. Consult a professional before starting if you have any medical concerns.",
  };
}
