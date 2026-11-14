export type PromoEmbed =
  | { kind: "empty" }
  | { kind: "invalid"; raw: string }
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "file"; src: string };

export const PROMO_STORAGE_KEY = "pkfit_lite_promo_video_url";

export function parsePromoUrl(raw: string): PromoEmbed {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: "invalid", raw: trimmed };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { kind: "invalid", raw: trimmed };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) return { kind: "invalid", raw: trimmed };
    return youtubeEmbed(id);
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      if (id) return youtubeEmbed(id);
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      if (id) return youtubeEmbed(id);
    }
    const id = url.searchParams.get("v");
    if (id) return youtubeEmbed(id);
    return { kind: "invalid", raw: trimmed };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    if (!id) return { kind: "invalid", raw: trimmed };
    return {
      kind: "vimeo",
      src: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0`,
    };
  }

  if (/\.(mp4|webm|mov)(\?|$)/i.test(url.pathname)) {
    return { kind: "file", src: url.toString() };
  }

  return { kind: "invalid", raw: trimmed };
}

function youtubeEmbed(id: string): PromoEmbed {
  return {
    kind: "youtube",
    src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(id)}&rel=0&modestbranding=1`,
  };
}

export async function loadPublishedPromoUrl(): Promise<string> {
  try {
    const response = await fetch("/promo.json", { cache: "no-store" });
    if (!response.ok) return "";
    const data: unknown = await response.json();
    if (
      data &&
      typeof data === "object" &&
      "url" in data &&
      typeof (data as { url: unknown }).url === "string"
    ) {
      return (data as { url: string }).url.trim();
    }
    return "";
  } catch {
    return "";
  }
}

export function readLocalPromoUrl(): string {
  try {
    return localStorage.getItem(PROMO_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeLocalPromoUrl(url: string): void {
  localStorage.setItem(PROMO_STORAGE_KEY, url.trim());
}
