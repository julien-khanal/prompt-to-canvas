/**
 * Browser-side image compressor for Anthropic API calls.
 *
 * The Anthropic API rejects single images larger than 5 MB (base64-encoded).
 * User-uploaded references (especially 2K+ photos with embedded EXIF or
 * transparent PNGs) routinely exceed this. Gemini accepts up to 20 MB so
 * we keep the original dataUrl in IndexedDB; only the Claude pathway calls
 * this helper to produce a compressed copy at send time.
 *
 * Strategy: load into an off-screen canvas, scale down by sqrt(target/actual),
 * re-encode as JPEG at quality 0.85. Retry with progressively smaller scale
 * if the first pass overshoots (mostly for very heavy PNGs that don't shrink
 * proportionally on JPEG re-encode).
 *
 * Pure browser API — no dependencies, no server work. Returns the original
 * dataUrl unchanged if it's already within the limit.
 */

const TARGET_MAX_BYTES = 4_500_000; // 4.5 MB, leaves 500 KB for transport overhead
const MAX_RETRIES = 4;
const MIN_DIMENSION = 64;

function approximateBase64ByteCount(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64Length = dataUrl.length - commaIdx - 1;
  // base64 expands binary by 4/3, so binary ≈ base64 * 0.75
  return Math.floor(base64Length * 0.75);
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("downscaleForClaude: failed to load image"));
    img.src = dataUrl;
  });
}

export async function downscaleForClaude(
  dataUrl: string,
  maxBytes = TARGET_MAX_BYTES
): Promise<string> {
  if (typeof window === "undefined") return dataUrl; // no-op SSR
  if (!dataUrl.startsWith("data:")) return dataUrl; // not a data URL
  const currentBytes = approximateBase64ByteCount(dataUrl);
  if (currentBytes <= maxBytes) return dataUrl;

  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return dataUrl; // give up; let the API reject if it's still too big
  }

  // First-pass scale: sqrt of size ratio, with 5% safety margin.
  let scale = Math.sqrt(maxBytes / currentBytes) * 0.95;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const targetW = Math.max(MIN_DIMENSION, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(MIN_DIMENSION, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const compressed = canvas.toDataURL("image/jpeg", 0.85);
    if (approximateBase64ByteCount(compressed) <= maxBytes) {
      return compressed;
    }
    scale *= 0.7; // shrink more aggressively on each retry
  }

  // Couldn't get under the limit — return last attempt or original.
  return dataUrl;
}

export async function downscaleManyForClaude(
  dataUrls: string[],
  maxBytes = TARGET_MAX_BYTES
): Promise<string[]> {
  return Promise.all(dataUrls.map((u) => downscaleForClaude(u, maxBytes)));
}
