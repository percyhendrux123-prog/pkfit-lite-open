import { useState } from "react";
import { calculateCardioCalories } from "../lib/cardioCalc";
import {
  exportOutcomeMessage,
  exportResultAsImage,
  type ExportOutcome,
} from "../lib/exportImage";
import { feetInchesToCm, lbToKg } from "../lib/units";
import type {
  CardioModality,
  CardioResult,
  IntensityLevel,
  Sex,
} from "../lib/types";

const MODALITY_OPTIONS: { value: CardioModality; label: string }[] = [
  { value: "treadmill", label: "Treadmill" },
  { value: "elliptical", label: "Elliptical" },
  { value: "stationary_bike", label: "Stationary bike" },
  { value: "stair_climber", label: "Stair climber" },
  { value: "rower", label: "Rower" },
];

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export function CardioCalculator() {
  const [modality, setModality] = useState<CardioModality>("treadmill");
  const [sex, setSex] = useState<Sex>("male");
  // Imperial in the UI, metric at the engine boundary — see lib/units.ts.
  // Weight drives the calorie math; height is collected but unused by the
  // MET formula.
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(10);
  const [weightLb, setWeightLb] = useState(176);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [inputMode, setInputMode] = useState<"speed" | "distance" | "none">(
    "none",
  );
  const [speedMph, setSpeedMph] = useState(3.5);
  const [distanceMiles, setDistanceMiles] = useState(1.5);
  const [inclinePercent, setInclinePercent] = useState(0);
  const [result, setResult] = useState<CardioResult | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<ExportOutcome | null>(null);

  function handleCalculate() {
    setResult(
      calculateCardioCalories({
        modality,
        sex,
        heightCm: feetInchesToCm(heightFt, heightIn),
        weightKg: lbToKg(weightLb),
        durationMinutes,
        intensity,
        speedMph: inputMode === "speed" ? speedMph : undefined,
        distanceMiles: inputMode === "distance" ? distanceMiles : undefined,
        inclinePercent: modality === "treadmill" ? inclinePercent : undefined,
      }),
    );
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 650);
  }

  async function handleSaveImage() {
    if (!result) return;
    setSaving(true);
    setSaveOutcome(null);
    const outcome = await exportResultAsImage(
      {
        title: "Cardio Session Estimate",
        subtitle: `${result.caloriesBurned} kcal`,
        lines: [
          `Modality: ${modality.replace("_", " ")}`,
          `Duration: ${durationMinutes} min`,
          `Body weight: ${weightLb} lbs`,
          `Estimated MET: ${result.met}`,
          `Estimated calories burned: ${result.caloriesBurned}`,
        ],
      },
      "cardio-estimate.png",
    );
    setSaving(false);
    setSaveOutcome(outcome);
  }

  return (
    <section className="tool">
      <h2>Cardio Calorie Calculator</h2>
      <p className="tool-copy">
        MET-based estimate for one session. Approximate by design — not a
        medical-grade measurement.
      </p>

      <div className="field">
        <label>Modality</label>
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value as CardioModality)}
        >
          {MODALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Sex</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="field">
          <label>Height (ft)</label>
          <input
            type="number"
            inputMode="numeric"
            value={heightFt}
            min={4}
            max={7}
            onChange={(e) => setHeightFt(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Height (in)</label>
          <input
            type="number"
            inputMode="numeric"
            value={heightIn}
            min={0}
            max={11}
            onChange={(e) => setHeightIn(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Weight (lbs)</label>
          <input
            type="number"
            inputMode="numeric"
            value={weightLb}
            min={80}
            max={550}
            onChange={(e) => setWeightLb(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label>Duration (minutes)</label>
        <input
          type="number"
          value={durationMinutes}
          min={1}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Difficulty / intensity (self-reported)</label>
        <div className="pill-row">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={
                intensity === opt.value ? "pill pill-active" : "pill"
              }
              onClick={() => setIntensity(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {modality === "treadmill" && (
        <>
          <div className="field">
            <label>Pace input (optional — improves accuracy)</label>
            <div className="pill-row">
              <button
                type="button"
                className={inputMode === "none" ? "pill pill-active" : "pill"}
                onClick={() => setInputMode("none")}
              >
                Use intensity only
              </button>
              <button
                type="button"
                className={
                  inputMode === "speed" ? "pill pill-active" : "pill"
                }
                onClick={() => setInputMode("speed")}
              >
                Speed
              </button>
              <button
                type="button"
                className={
                  inputMode === "distance" ? "pill pill-active" : "pill"
                }
                onClick={() => setInputMode("distance")}
              >
                Distance
              </button>
            </div>
          </div>

          {inputMode === "speed" && (
            <div className="field">
              <label>Speed (mph)</label>
              <input
                type="number"
                step={0.1}
                value={speedMph}
                onChange={(e) => setSpeedMph(Number(e.target.value))}
              />
            </div>
          )}

          {inputMode === "distance" && (
            <div className="field">
              <label>Distance (miles)</label>
              <input
                type="number"
                step={0.1}
                value={distanceMiles}
                onChange={(e) => setDistanceMiles(Number(e.target.value))}
              />
            </div>
          )}

          <div className="field">
            <label>Incline (%)</label>
            <input
              type="number"
              value={inclinePercent}
              min={0}
              max={15}
              onChange={(e) => setInclinePercent(Number(e.target.value))}
            />
          </div>
        </>
      )}

      <button
        type="button"
        className={justGenerated ? "primary btn-confirm" : "primary"}
        onClick={handleCalculate}
      >
        Calculate
      </button>

      {result && (
        <div className="result">
          <span className="confirm-badge" aria-hidden="true">
            ✓
          </span>
          <div className="bento-grid bento-grid-2">
            <div className="bento-tile bento-tile-hero">
              <span className="bento-label">Estimated burn</span>
              <span className="bento-value">{result.caloriesBurned}</span>
              <span className="bento-unit">kcal</span>
            </div>
            <div className="bento-tile">
              <span className="bento-label">Estimated MET</span>
              <span className="bento-value">{result.met}</span>
            </div>
          </div>
          <p className="disclaimer">{result.disclaimer}</p>
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
