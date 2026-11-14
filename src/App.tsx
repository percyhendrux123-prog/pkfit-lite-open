import { useEffect, useState } from "react";
import { ProgramGenerator } from "./components/ProgramGenerator";
import { MealPlanGenerator } from "./components/MealPlanGenerator";
import { CardioCalculator } from "./components/CardioCalculator";
import { EmailCapture } from "./components/EmailCapture";
import { InAppBrowserNotice } from "./components/InAppBrowserNotice";
import { PromoStage } from "./components/PromoStage";
import { isCaptureConfigured } from "./lib/leadCapture";
import {
  loadPublishedPromoUrl,
  readLocalPromoUrl,
  writeLocalPromoUrl,
} from "./lib/promo";
import "./App.css";

type Tab = "program" | "meals" | "cardio";

// Both are optional build-time settings (see README). Unset = neutral name,
// no support line.
const PRODUCT_NAME =
  (import.meta.env.VITE_PRODUCT_NAME as string | undefined)?.trim() ||
  "Lite Tools";
const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || "";

const ENTERED_KEY = "lite_tools_entered";

function readEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberEntered() {
  try {
    localStorage.setItem(ENTERED_KEY, "1");
  } catch {
    // storage blocked: the email step shows again next visit
  }
}

// "checking" while we ask the server whether email capture is configured.
// "email" shows the optional email step; "open" shows the tools.
type Gate = "checking" | "email" | "open";

function App() {
  const [gate, setGate] = useState<Gate>(() =>
    readEntered() ? "open" : "checking",
  );
  const [tab, setTab] = useState<Tab>("program");
  const [promoUrl, setPromoUrl] = useState("");
  const [promoDraft, setPromoDraft] = useState("");
  const canEditPromo =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("edit");

  useEffect(() => {
    if (gate !== "checking") return;
    let cancelled = false;
    void isCaptureConfigured().then((configured) => {
      if (!cancelled) setGate(configured ? "email" : "open");
    });
    return () => {
      cancelled = true;
    };
  }, [gate]);

  useEffect(() => {
    let cancelled = false;
    void loadPublishedPromoUrl().then((published) => {
      if (cancelled) return;
      const local = readLocalPromoUrl();
      const next = local || published;
      setPromoUrl(next);
      setPromoDraft(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const supportLine = SUPPORT_EMAIL ? (
    <p>
      Questions:{" "}
      <a className="gate-link" href={`mailto:${SUPPORT_EMAIL}`}>
        {SUPPORT_EMAIL}
      </a>
    </p>
  ) : null;

  if (gate === "checking") {
    return (
      <div className="app app-gate">
        <p className="gate-status">Loading.</p>
      </div>
    );
  }

  if (gate === "email") {
    return (
      <div className="app app-gate">
        <div className="gate-wrap gate-wrap-home">
          <div className="wordmark-row">
            <span className="wordmark">{PRODUCT_NAME}</span>
          </div>

          <InAppBrowserNotice />

          {promoUrl && <PromoStage url={promoUrl} />}

          {canEditPromo && (
            <form
              className="promo-link-field"
              onSubmit={(e) => {
                e.preventDefault();
                writeLocalPromoUrl(promoDraft);
                setPromoUrl(promoDraft.trim());
              }}
            >
              <label htmlFor="promo-url">Add link</label>
              <div className="email-capture-row">
                <input
                  id="promo-url"
                  type="url"
                  value={promoDraft}
                  placeholder="Paste YouTube, Vimeo, or https://...mp4"
                  onChange={(e) => setPromoDraft(e.target.value)}
                />
                <button type="submit">Set</button>
              </div>
              <p className="field-hint">
                Paste and tap Set. This device updates now. Visitors see
                public/promo.json after republish.
              </p>
            </form>
          )}

          <header className="gate-hero">
            <p className="kicker">FREE · NO ACCOUNT</p>
            <h1 className="hero-title">
              <span className="hero-lead">Three tools.</span>{" "}
              <span className="hero-trail">Zero guesswork.</span>
            </h1>
            <p className="hero-copy">
              Training split, macros, and cardio calories — computed from fixed
              tables and formulas, not generated on the fly.
            </p>
            <p className="hero-meta">
              Fixed formulas · No accounts, no workout history
            </p>
          </header>

          <ul className="manifest">
            <li className="manifest-tile">
              <span className="manifest-index">01</span>
              <span className="manifest-name">Training</span>
              <span className="manifest-desc">Split selector</span>
            </li>
            <li className="manifest-tile">
              <span className="manifest-index">02</span>
              <span className="manifest-name">Nutrition</span>
              <span className="manifest-desc">Macros &amp; meals</span>
            </li>
            <li className="manifest-tile">
              <span className="manifest-index">03</span>
              <span className="manifest-name">Cardio</span>
              <span className="manifest-desc">MET calorie math</span>
            </li>
          </ul>

          <div className="paywall">
            <p className="paywall-copy">
              All three tools, free. Enter your email and they open on this
              page.
            </p>
            <EmailCapture
              source="landing"
              label="Your email"
              buttonLabel="Open the tools"
              onCaptured={() => {
                rememberEntered();
                setGate("open");
              }}
            />
          </div>

          <footer className="app-footer">
            <p>Your email is kept by whoever runs this site. No account.</p>
            {supportLine}
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{PRODUCT_NAME}</h1>
        <p className="app-subhead">
          One week. No accounts. No workout history. Save what you need before
          you leave.
        </p>
      </header>

      <nav className="tabs">
        <button
          className={tab === "program" ? "tab tab-active" : "tab"}
          onClick={() => setTab("program")}
        >
          Training
        </button>
        <button
          className={tab === "meals" ? "tab tab-active" : "tab"}
          onClick={() => setTab("meals")}
        >
          Nutrition
        </button>
        <button
          className={tab === "cardio" ? "tab tab-active" : "tab"}
          onClick={() => setTab("cardio")}
        >
          Cardio
        </button>
      </nav>

      <main>
        {tab === "program" && <ProgramGenerator />}
        {tab === "meals" && <MealPlanGenerator />}
        {tab === "cardio" && <CardioCalculator />}
      </main>

      <footer className="app-footer">
        <p>
          General fitness and nutrition education, not medical advice. No
          account or workout history.
        </p>
        {supportLine}
      </footer>
    </div>
  );
}

export default App;
