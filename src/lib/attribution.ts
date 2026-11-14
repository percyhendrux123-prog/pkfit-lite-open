export const ATTRIBUTION_STORAGE_KEY = "pkfit_lite_first_touch";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Attribution {
  src: string;
  med: string;
  camp: string;
  cnt: string;
  firstTouchAt: string;
}

function cleanSlug(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 80);
  return cleaned || fallback;
}

function fromSearch(search: string, now: Date): Attribution {
  const params = new URLSearchParams(search);
  return {
    src: cleanSlug(params.get("src"), "direct"),
    med: cleanSlug(params.get("med"), "none"),
    camp: cleanSlug(params.get("camp"), "none"),
    cnt: cleanSlug(params.get("cnt"), "none"),
    firstTouchAt: now.toISOString(),
  };
}

function readCurrent(storage: Storage, now: Date): Attribution | null {
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Attribution;
    const age = now.getTime() - new Date(saved.firstTouchAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age >= ATTRIBUTION_TTL_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

export function captureFirstTouchAttribution(
  search: string,
  storage: Storage,
  now = new Date(),
): Attribution {
  const current = readCurrent(storage, now);
  if (current) return current;

  const attribution = fromSearch(search, now);
  try {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Checkout still receives the current visit when storage is unavailable.
  }
  return attribution;
}
