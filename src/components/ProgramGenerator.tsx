import { useState } from "react";
import { generateTrainingProgram } from "../lib/trainingSplit";
import {
  exportOutcomeMessage,
  exportResultAsImage,
  type ExportOutcome,
} from "../lib/exportImage";
import type {
  DaysPerWeek,
  Equipment,
  InjuryFlag,
  TrainingProgram,
} from "../lib/types";

const DAYS_OPTIONS: DaysPerWeek[] = [2, 3, 4, 5, 6];
const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "full_gym", label: "Full gym" },
  { value: "home_gym_basic", label: "Home gym (barbell + dumbbells)" },
  { value: "dumbbells_only", label: "Dumbbells only" },
  { value: "bodyweight_only", label: "Bodyweight only" },
];
const INJURY_OPTIONS: { value: InjuryFlag; label: string }[] = [
  { value: "shoulder", label: "Shoulder" },
  { value: "lower_back", label: "Lower back" },
  { value: "knee", label: "Knee" },
  { value: "wrist", label: "Wrist" },
  { value: "hip", label: "Hip" },
];

export function ProgramGenerator() {
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek>(4);
  const [equipment, setEquipment] = useState<Equipment>("full_gym");
  const [injuries, setInjuries] = useState<InjuryFlag[]>([]);
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<ExportOutcome | null>(null);

  function toggleInjury(flag: InjuryFlag) {
    setInjuries((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  }

  function handleGenerate() {
    setProgram(generateTrainingProgram({ daysPerWeek, equipment, injuries }));
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 650);
  }

  async function handleSaveImage() {
    if (!program) return;
    setSaving(true);
    setSaveOutcome(null);
    const lines: string[] = [];
    for (const day of program.days) {
      lines.push(`${day.dayLabel} — ${day.focus}`);
      for (const ex of day.exercises) {
        lines.push(
          `  ${ex.name} — ${ex.sets} x ${ex.reps}${ex.notes ? ` (${ex.notes})` : ""}`,
        );
      }
      lines.push("");
    }
    const outcome = await exportResultAsImage(
      { title: "Training Split — 1 Week", subtitle: program.splitName, lines },
      "training-split.png",
    );
    setSaving(false);
    setSaveOutcome(outcome);
  }

  return (
    <section className="tool">
      <h2>Training Program Generator</h2>
      <p className="tool-copy">
        One week. Built from a fixed split-selection table, not generated on
        the fly. Pick your days, your equipment, and anything you're working
        around.
      </p>

      <div className="field">
        <label>Days per week</label>
        <div className="pill-row">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={d === daysPerWeek ? "pill pill-active" : "pill"}
              onClick={() => setDaysPerWeek(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Equipment</label>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
        >
          {EQUIPMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Injury flags (optional)</label>
        <div className="pill-row">
          {INJURY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={
                injuries.includes(opt.value) ? "pill pill-active" : "pill"
              }
              onClick={() => toggleInjury(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={justGenerated ? "primary btn-confirm" : "primary"}
        onClick={handleGenerate}
      >
        Generate week
      </button>

      {program && (
        <div className="result">
          <span className="confirm-badge" aria-hidden="true">
            ✓
          </span>
          <h3>{program.splitName} — {program.daysPerWeek} days</h3>
          <div className="split-grid">
            {program.days.map((day) => (
              <div key={day.dayLabel} className="result-day bento-tile">
                <h4>
                  {day.dayLabel} — {day.focus}
                </h4>
                <ul>
                  {day.exercises.map((ex) => (
                    <li key={ex.name}>
                      {ex.name} — {ex.sets} x {ex.reps}
                      {ex.notes ? ` (${ex.notes})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="disclaimer">{program.disclaimer}</p>
          <button
            type="button"
            className="secondary"
            onClick={handleSaveImage}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save to Photos / Files"}
          </button>
          {saveOutcome && (
            <p
              className={
                saveOutcome === "failed" ? "field-error" : "result-note"
              }
              role="status"
            >
              {exportOutcomeMessage(saveOutcome)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
