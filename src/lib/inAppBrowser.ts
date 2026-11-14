// In-app browser detection.
//
// Why this exists: traffic arrives from Instagram. Tapping a link in the
// Instagram app opens it inside Instagram's own embedded webview, not
// Safari or Chrome. That webview has its own isolated storage container
// which the host app can and does clear. So a buyer who completes checkout
// inside it gets their access proof written somewhere disposable — they
// pay, the container is later wiped, they open the site properly in
// Safari, and they are locked out of something they bought.
//
// Persisting the proof (see access.ts) does not solve this on its own: it
// only persists within whichever browser did the purchase. The fix has to
// happen BEFORE the purchase — get the buyer into a real browser first.
//
// Detection rule: FAIL OPEN. If we are not confident this is an in-app
// webview, we return null and show nothing. Nagging a legitimate Safari
// user to "open in Safari" is worse than missing an edge case — the first
// is a visible defect on the paywall, the second just leaves us where we
// already are.

export type InAppBrowserName =
  | "Instagram"
  | "Facebook"
  | "Messenger"
  | "TikTok"
  | "Threads";

export type MobilePlatform = "ios" | "android" | "other";

export interface InAppBrowserInfo {
  name: InAppBrowserName;
  platform: MobilePlatform;
  /**
   * True only on Android, where an intent:// URL can hand the page to
   * Chrome directly. iOS gives a webview no reliable programmatic escape,
   * so there we copy the link and tell the user where to tap instead of
   * wiring up a button that silently does nothing.
   */
  canOpenExternally: boolean;
}

// Ordered: the more specific token wins. Threads and Messenger both ship
// Facebook-family tokens, so they are tested before the generic FB check.
const SIGNATURES: { name: InAppBrowserName; test: RegExp }[] = [
  // Threads for iOS identifies itself as "Barcelona" (its internal name).
  { name: "Threads", test: /\bBarcelona\b/i },
  { name: "Messenger", test: /\b(FB_IAB\/MESSENGER|Messenger(Lite)?For)/i },
  // TikTok webviews: ByteDance's shared shell, plus the legacy musical.ly
  // and "trill" build tokens still present on some regions/versions.
  { name: "TikTok", test: /\b(BytedanceWebview|musical_ly|TikTok|trill_)/i },
  { name: "Instagram", test: /\bInstagram\b/i },
  // FBAN/FBAV = Facebook app name/version; FB_IAB = "in-app browser".
  { name: "Facebook", test: /\b(FBAN|FBAV|FB_IAB|FBIOS)\b/i },
];

export function detectPlatform(userAgent: string): MobilePlatform {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "other";
}

/**
 * Returns info about the in-app browser, or null when this is a normal
 * browser OR when we simply cannot tell. Callers must treat null as
 * "show nothing".
 */
export function detectInAppBrowser(
  userAgent: string | undefined,
): InAppBrowserInfo | null {
  if (!userAgent) return null;

  const match = SIGNATURES.find((sig) => sig.test.test(userAgent));
  if (!match) return null;

  const platform = detectPlatform(userAgent);

  // A desktop UA carrying one of these tokens is almost certainly the
  // desktop web app rather than a phone webview, and desktop storage is
  // not at risk here. Fail open.
  if (platform === "other") return null;

  return {
    name: match.name,
    platform,
    canOpenExternally: platform === "android",
  };
}

/**
 * Android intent URL that hands the current page to Chrome. Falls back to
 * the browser chooser if Chrome is not installed, because the intent
 * carries an https scheme.
 */
export function buildAndroidChromeIntent(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
}

/**
 * Copy to clipboard with a fallback for webviews that do not expose the
 * async Clipboard API (common inside embedded browsers, and it is gated on
 * a secure context plus permissions). The execCommand path is deprecated
 * but still works where the modern one is missing, which is exactly the
 * environment this feature targets.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    // Keep it off-screen but still focusable — display:none cannot be
    // selected, so the copy would silently fail.
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
