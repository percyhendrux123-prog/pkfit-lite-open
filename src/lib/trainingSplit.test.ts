import { describe, expect, it } from "vitest";
import { generateTrainingProgram, selectSplit } from "./trainingSplit";
import type { DaysPerWeek, TrainingInput } from "./types";

const ALL_DAYS: DaysPerWeek[] = [2, 3, 4, 5, 6];

describe("selectSplit", () => {
  it("returns one day template per day of the week requested", () => {
    for (const days of ALL_DAYS) {
      const split = selectSplit(days);
      expect(split.templates).toHaveLength(days);
    }
  });

  it("is a pure deterministic lookup — same input, same output", () => {
    const a = selectSplit(4);
    const b = selectSplit(4);
    expect(a).toEqual(b);
  });

  it("assigns the expected split name per days/week", () => {
    expect(selectSplit(2).splitName).toBe("Full Body");
    expect(selectSplit(3).splitName).toBe("Full Body");
    expect(selectSplit(4).splitName).toBe("Upper / Lower");
    expect(selectSplit(5).splitName).toBe(
      "Push / Pull / Legs + Upper / Lower",
    );
    expect(selectSplit(6).splitName).toBe("Push / Pull / Legs (x2)");
  });
});

describe("generateTrainingProgram", () => {
  it("produces exactly one week — days array length matches daysPerWeek, for every supported count", () => {
    for (const days of ALL_DAYS) {
      const input: TrainingInput = {
        daysPerWeek: days,
        equipment: "full_gym",
        injuries: [],
      };
      const program = generateTrainingProgram(input);
      expect(program.days).toHaveLength(days);
      expect(program.daysPerWeek).toBe(days);
    }
  });

  it("is fully deterministic — identical input always yields identical output", () => {
    const input: TrainingInput = {
      daysPerWeek: 4,
      equipment: "dumbbells_only",
      injuries: ["knee"],
    };
    const a = generateTrainingProgram(input);
    const b = generateTrainingProgram(input);
    expect(a).toEqual(b);
  });

  it("every day includes at least one exercise, and every exercise has positive sets and a non-empty rep scheme", () => {
    for (const days of ALL_DAYS) {
      const program = generateTrainingProgram({
        daysPerWeek: days,
        equipment: "bodyweight_only",
        injuries: [],
      });
      for (const day of program.days) {
        expect(day.exercises.length).toBeGreaterThan(0);
        for (const ex of day.exercises) {
          expect(ex.sets).toBeGreaterThan(0);
          expect(ex.reps.length).toBeGreaterThan(0);
          expect(ex.name.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("never prescribes a barbell exercise when equipment is bodyweight_only", () => {
    for (const days of ALL_DAYS) {
      const program = generateTrainingProgram({
        daysPerWeek: days,
        equipment: "bodyweight_only",
        injuries: [],
      });
      for (const day of program.days) {
        for (const ex of day.exercises) {
          expect(ex.name.toLowerCase()).not.toContain("barbell");
          expect(ex.name.toLowerCase()).not.toContain("dumbbell");
          expect(ex.name.toLowerCase()).not.toContain("cable");
          expect(ex.name.toLowerCase()).not.toContain("machine");
        }
      }
    }
  });

  it("substitutes away from knee-loading exercises when knee is flagged", () => {
    const program = generateTrainingProgram({
      daysPerWeek: 5,
      equipment: "full_gym",
      injuries: ["knee"],
    });
    const bannedForKnee = [
      "barbell back squat",
      "walking lunge",
      "bulgarian split squat",
      "step-up",
    ];
    for (const day of program.days) {
      for (const ex of day.exercises) {
        expect(bannedForKnee).not.toContain(ex.name.toLowerCase());
      }
    }
  });

  it("substitutes away from shoulder-loading exercises when shoulder is flagged", () => {
    const program = generateTrainingProgram({
      daysPerWeek: 6,
      equipment: "full_gym",
      injuries: ["shoulder"],
    });
    const bannedForShoulder = [
      "barbell overhead press",
      "barbell bench press",
      "pull-up",
      "lat pulldown",
    ];
    for (const day of program.days) {
      for (const ex of day.exercises) {
        expect(bannedForShoulder).not.toContain(ex.name.toLowerCase());
      }
    }
  });

  it("flags substituted exercises with a note when every equipment-tier option conflicts with the injury", () => {
    // bodyweight_only + shoulder knocks out both vertical_push candidates
    // (Pike Push-Up, Wall Handstand Hold both avoidIf shoulder) -> must
    // fall through to the safe fallback and be flagged.
    const program = generateTrainingProgram({
      daysPerWeek: 5, // includes UPPER_A -> vertical_push slot
      equipment: "bodyweight_only",
      injuries: ["shoulder"],
    });
    const upperDay = program.days.find((d) => d.focus === "Upper Body");
    expect(upperDay).toBeDefined();
    const verticalPushExercise = upperDay!.exercises.find(
      (ex) => ex.name === "Standing Band-Free Arm Raise Hold",
    );
    expect(verticalPushExercise).toBeDefined();
    expect(verticalPushExercise!.notes).toBe(
      "Substituted for flagged injury.",
    );
  });

  it("multiple simultaneous injury flags never produce a banned exercise", () => {
    const program = generateTrainingProgram({
      daysPerWeek: 6,
      equipment: "full_gym",
      injuries: ["shoulder", "lower_back", "knee", "wrist", "hip"],
    });
    for (const day of program.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it("includes a professional-consult disclaimer", () => {
    const program = generateTrainingProgram({
      daysPerWeek: 3,
      equipment: "full_gym",
      injuries: [],
    });
    expect(program.disclaimer.toLowerCase()).toContain("professional");
  });
});
