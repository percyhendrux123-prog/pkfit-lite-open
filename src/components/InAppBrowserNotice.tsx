import { useState } from "react";
import {
  buildAndroidChromeIntent,
  copyToClipboard,
  detectInAppBrowser,
} from "../lib/inAppBrowser";

// Shown above the email step. In-app webviews (Instagram, TikTok...) can
// wipe this page's storage, which means the visitor is asked for their
// email again next time. Opening in the phone's own browser avoids that.
//
// Dismissal is remembered for the session so someone who wants to stay
// in-app is not nagged on every reload.

const DISMISS_KEY = "lite_tools_inapp_dismissed";

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // storage blocked — the notice simply reappears next load
  }
}

export function InAppBrowserNotice() {
  const [info] = useState(() =>
    detectInAppBrowser(
      typeof navigator === "undefined" ? undefined : navigator.userAgent,
    ),
  );
  const [dismissed, setDismissed] = useState(() => wasDismissed());
  const [copied, setCopied] = useState<null | boolean>(null);

  // Null means "normal browser, or we could not tell" — show nothing.
  if (!info || dismissed) return null;

  const url = window.location.href;
  const browserName = info.platform === "ios" ? "Safari" : "Chrome";

  function handleDismiss() {
    rememberDismissal();
    setDismissed(true);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(url);
    setCopied(ok);
  }

  return (
    <aside className="inapp-notice" role="note">
      <p className="inapp-title">
        Open in {browserName} for the best result.
      </p>
      <p className="inapp-copy">
        You&rsquo;re in {info.name}&rsquo;s built-in browser. It can forget
        this page between visits — open it in {browserName} and the tools
        stay one tap away.
      </p>

      {info.canOpenExternally ? (
        <a className="inapp-action" href={buildAndroidChromeIntent(url)}>
          Open in Chrome
        </a>
      ) : (
        <>
          <button type="button" className="inapp-action" onClick={handleCopy}>
            {copied === true ? "Link copied" : "Copy link"}
          </button>
          <p className="inapp-steps">
            Then tap the <strong>•••</strong> or share icon at the
            {" "}{info.name === "Instagram" ? "top" : "bottom"} of this
            screen and choose <strong>Open in Safari</strong> — or paste the
            link into Safari yourself.
          </p>
          {copied === false && (
            <p className="inapp-steps">
              Couldn&rsquo;t copy automatically. The link is{" "}
              <span className="inapp-url">{window.location.host}</span>
            </p>
          )}
        </>
      )}

      <button type="button" className="inapp-dismiss" onClick={handleDismiss}>
        Continue here anyway
      </button>
    </aside>
  );
}
