import { useState } from "react";
import { captureEmailWithin, type LeadSource } from "../lib/leadCapture";

const CAPTURE_WAIT_MS = 2500;

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
    // Best effort, and never a wall: wait at most CAPTURE_WAIT_MS for the
    // Sheet write, then open the tools whatever happened. A slow or failed
    // write never blocks the visitor; the request keeps going in the
    // background (keepalive).
    await captureEmailWithin({ email, source }, CAPTURE_WAIT_MS);
    setStatus("done");
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
