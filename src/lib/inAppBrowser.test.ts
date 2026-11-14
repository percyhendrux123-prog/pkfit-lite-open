import { describe, expect, it } from "vitest";
import { buildAndroidChromeIntent, detectInAppBrowser } from "./inAppBrowser";

// Real user-agent strings. The whole feature hinges on not firing for
// ordinary browsers, so the negative cases matter more than the positive
// ones — a false positive nags a legitimate Safari user on the paywall.

const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
const CHROME_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FIREFOX_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";

const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 309.0.0.0.0 (iPhone14,2; iOS 17_0; en_US)";
const INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 309.0.0.41.113 Android";
const FACEBOOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/442.0.0.32.109;FBBV/1234;FBDV/iPhone14,2]";
const MESSENGER_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/MessengerForiOS;FBAV/442.0.0.32.109;FBDV/iPhone14,2]";
const MESSENGER_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/442.0.0.32.109;]";
const TIKTOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6 musical_ly_32.5.3";
const TIKTOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a21c6 TikTok 32.5.3";
const THREADS_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 309.0.0.0.0";

describe("detectInAppBrowser — fails open", () => {
  it.each([
    ["iOS Safari", SAFARI_IOS],
    ["Android Chrome", CHROME_ANDROID],
    ["iOS Chrome", CHROME_IOS],
    ["desktop Chrome", CHROME_DESKTOP],
    ["desktop Firefox", FIREFOX_DESKTOP],
  ])("returns null for %s", (_label, ua) => {
    expect(detectInAppBrowser(ua)).toBeNull();
  });

  it("returns null for an undefined user agent", () => {
    expect(detectInAppBrowser(undefined)).toBeNull();
  });

  it("returns null for an empty user agent", () => {
    expect(detectInAppBrowser("")).toBeNull();
  });

  it("returns null on desktop even when an app token is present", () => {
    // A desktop UA carrying the token is not a phone webview at risk.
    expect(
      detectInAppBrowser(`${CHROME_DESKTOP} Instagram 309.0.0.0.0`),
    ).toBeNull();
  });
});

describe("detectInAppBrowser — identifies the app", () => {
  it("detects Instagram on iOS and offers no programmatic escape", () => {
    const info = detectInAppBrowser(INSTAGRAM_IOS);
    expect(info?.name).toBe("Instagram");
    expect(info?.platform).toBe("ios");
    expect(info?.canOpenExternally).toBe(false);
  });

  it("detects Instagram on Android and can hand off to Chrome", () => {
    const info = detectInAppBrowser(INSTAGRAM_ANDROID);
    expect(info?.name).toBe("Instagram");
    expect(info?.platform).toBe("android");
    expect(info?.canOpenExternally).toBe(true);
  });

  it("detects Facebook", () => {
    expect(detectInAppBrowser(FACEBOOK_IOS)?.name).toBe("Facebook");
  });

  it("detects Messenger ahead of the generic Facebook tokens", () => {
    expect(detectInAppBrowser(MESSENGER_IOS)?.name).toBe("Messenger");
    expect(detectInAppBrowser(MESSENGER_ANDROID)?.name).toBe("Messenger");
  });

  it("detects TikTok on both platforms", () => {
    expect(detectInAppBrowser(TIKTOK_ANDROID)?.name).toBe("TikTok");
    expect(detectInAppBrowser(TIKTOK_IOS)?.name).toBe("TikTok");
  });

  it("detects Threads ahead of Instagram when both tokens are present", () => {
    expect(detectInAppBrowser(THREADS_IOS)?.name).toBe("Threads");
    expect(
      detectInAppBrowser(`${THREADS_IOS} Instagram 309.0.0.0.0`)?.name,
    ).toBe("Threads");
  });
});

describe("buildAndroidChromeIntent", () => {
  it("rewrites an https URL into a Chrome intent", () => {
    expect(buildAndroidChromeIntent("https://example.com/")).toBe(
      "intent://example.com/#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("preserves path and query", () => {
    expect(
      buildAndroidChromeIntent("https://example.com/?checkout=x"),
    ).toBe(
      "intent://example.com/?checkout=x#Intent;scheme=https;package=com.android.chrome;end",
    );
  });
});
