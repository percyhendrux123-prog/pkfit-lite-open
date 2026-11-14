// "Save to Photos/Files" — the ONLY persistence mechanism in this product.
// Renders a block of text lines to a canvas and hands the user a PNG.
// No server round-trip, no saved history, no library table.
//
// Two delivery paths, because one does not cover both phones and desktop:
//
//   1. Web Share with a File — on iOS Safari and Android Chrome this opens
//      the native share sheet, which is where "Save Image" (Photos) and
//      "Save to Files" actually live. A plain download link cannot reach
//      the photo library at all, and on iOS Safari an <a download> pointed
//      at a canvas URL frequently does nothing visible — which is exactly
//      the bug this replaces.
//   2. A blob-URL download link — desktop browsers and anything without
//      file sharing support.
//
// Timing note: everything up to navigator.share() is synchronous on
// purpose. Safari only allows share() during the user activation from the
// click; awaiting canvas.toBlob() first drops that activation and the
// share sheet silently refuses to open. So the PNG is produced with the
// synchronous toDataURL() and converted to a Blob in-line.

export interface ExportableResult {
  title: string;
  subtitle?: string;
  lines: string[];
}

export type ExportOutcome = "shared" | "downloaded" | "cancelled" | "failed";

/**
 * Short confirmation line shown under the save button. The old button gave
 * no feedback at all, so on any device where the download silently failed
 * it read as broken. Always say something.
 */
export function exportOutcomeMessage(outcome: ExportOutcome): string {
  switch (outcome) {
    case "shared":
      return "Saved.";
    case "downloaded":
      return "Image downloaded — check your downloads or Files.";
    case "cancelled":
      return "Save cancelled.";
    case "failed":
      return "Could not save the image on this browser. Screenshot this screen instead.";
  }
}

const WIDTH = 1080;
const PADDING = 60;
const LINE_HEIGHT = 34;
const TITLE_SIZE = 40;
const SUBTITLE_SIZE = 22;
const BODY_SIZE = 24;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function renderCanvas(result: ExportableResult): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const lineCount = result.lines.length;
  const height =
    PADDING * 2 +
    TITLE_SIZE +
    (result.subtitle ? SUBTITLE_SIZE + 16 : 0) +
    24 +
    lineCount * LINE_HEIGHT +
    40;

  canvas.width = WIDTH;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // background
  ctx.fillStyle = "#0d0d0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = PADDING + TITLE_SIZE;

  ctx.fillStyle = "#f5f5f2";
  ctx.font = `700 ${TITLE_SIZE}px sans-serif`;
  ctx.fillText(result.title, PADDING, y);

  if (result.subtitle) {
    y += SUBTITLE_SIZE + 16;
    ctx.fillStyle = "#c9a84c";
    ctx.font = `500 ${SUBTITLE_SIZE}px sans-serif`;
    ctx.fillText(result.subtitle, PADDING, y);
  }

  y += 40;
  ctx.fillStyle = "#f5f5f2";
  ctx.font = `400 ${BODY_SIZE}px sans-serif`;
  for (const line of result.lines) {
    ctx.fillText(line, PADDING, y);
    y += LINE_HEIGHT;
  }

  return canvas;
}

function downloadBlob(blob: Blob, filename: string): ExportOutcome {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    // Some browsers ignore a click on a detached node.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke late — revoking immediately can cancel an in-flight download.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

export async function exportResultAsImage(
  result: ExportableResult,
  filename: string,
): Promise<ExportOutcome> {
  const canvas = renderCanvas(result);
  if (!canvas) return "failed";

  let blob: Blob;
  try {
    blob = dataUrlToBlob(canvas.toDataURL("image/png"));
  } catch {
    return "failed";
  }

  const file = new File([blob], filename, { type: "image/png" });

  // Path 1: native share sheet — but ONLY on touch devices.
  //
  // Desktop Chrome also reports canShare({files}) === true and will open an
  // OS share dialog. That is the wrong behaviour here (the point of the
  // share sheet is reaching the phone's photo library, which desktop has
  // no equivalent of) and it is actively dangerous: that dialog's promise
  // can sit unsettled indefinitely, which left the button stuck on
  // "Saving…" and permanently disabled. Verified happening on desktop
  // Chrome before this guard existed. Desktop goes straight to download.
  const shareData = { files: [file], title: result.title };
  const isTouchDevice =
    typeof navigator !== "undefined" &&
    (navigator.maxTouchPoints ?? 0) > 0 &&
    typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse)").matches;

  const canShareFiles =
    isTouchDevice &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare(shareData);

  if (canShareFiles) {
    try {
      // Belt and braces: even on mobile, never let an unsettled share
      // promise strand the button. If the sheet has not resolved in 20s,
      // give up on it and fall through to the download.
      const timedOut = Symbol("timeout");
      const outcome = await Promise.race([
        navigator.share(shareData).then(() => "ok" as const),
        new Promise<typeof timedOut>((resolve) =>
          setTimeout(() => resolve(timedOut), 20_000),
        ),
      ]);
      if (outcome === "ok") return "shared";
      // fell through on timeout
    } catch (error) {
      // User dismissed the sheet — that is a choice, not a failure. Do not
      // then shove a download at them.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Anything else (file sharing refused in practice, permission error)
      // falls through to the download path below.
    }
  }

  // Path 2: direct download.
  return downloadBlob(blob, filename);
}
