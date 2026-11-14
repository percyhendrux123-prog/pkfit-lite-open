import { useState } from "react";
import { captureEmail, type LeadSource } from "../lib/leadCapture";

interface EmailCaptureProps {
  source: LeadSource;
  label?: string;
  buttonLabel?: string;
  onCaptured?: (email: string) => void;
}

export function EmailCapture({
  source,
  label = "Enter your email to view your result.",
  buttonLabel = "Continue",
  onCaptured,
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const result = await captureEmail({ email, source });
    // The lead is recorded on a best-effort basis — if the Google Sheets
    // write fails, that never blocks the user. The tools are free; this
    // form only ever captures a lead (see src/lib/access.ts).
    setStatus(result.ok ? "done" : "done");
    onCaptured?.(email);
  }

  return (
    <form className="email-capture" onSubmit={handleSubmit}>
      <label htmlFor={`email-${source}`}>{label}</label>
      <div className="email-capture-row">
        <input
          id={`email-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Submitting" : buttonLabel}
        </button>
      </div>
      {status === "error" && (
        <p className="field-error">Enter a valid email.</p>
      )}
    </form>
  );
}
