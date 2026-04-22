import type {
  AspectRatio,
  CanvasNodeData,
  ClaudeModel,
  GeminiImageModel,
  ImageResolution,
  RefRole,
} from "@/lib/canvas/types";

type Kind = CanvasNodeData["kind"];

const CLAUDE_MODELS = new Set<ClaudeModel>([
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5",
]);
const GEMINI_MODELS = new Set<GeminiImageModel>([
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
]);
const ASPECTS = new Set<AspectRatio>(["1:1", "16:9", "9:16", "4:3"]);
const RESOLUTIONS = new Set<ImageResolution>(["1K", "2K", "4K"]);
const REF_ROLES = new Set<RefRole>(["style", "subject", "palette", "composition", "pose"]);

const APPLYABLE_FIELDS: Record<Kind, Set<string>> = {
  prompt: new Set(["label", "model", "prompt", "systemPrompt", "temperature"]),
  imageGen: new Set(["label", "model", "prompt", "aspectRatio", "resolution"]),
  imageRef: new Set(["label", "role", "url"]),
  output: new Set(["label"]),
};

export interface ApplyValidationOk {
  ok: true;
  value: unknown;
}
export interface ApplyValidationErr {
  ok: false;
  error: string;
}
export type ApplyValidation = ApplyValidationOk | ApplyValidationErr;

export function validateApply(
  kind: Kind,
  field: string,
  raw: string
): ApplyValidation {
  const allowed = APPLYABLE_FIELDS[kind];
  if (!allowed.has(field))
    return {
      ok: false,
      error: `Field "${field}" cannot be applied to a ${kind} node.`,
    };

  const trimmed = raw.trim();

  if (kind === "prompt" && field === "model") {
    if (!CLAUDE_MODELS.has(trimmed as ClaudeModel))
      return { ok: false, error: `"${trimmed}" is not a Claude model.` };
    return { ok: true, value: trimmed };
  }
  if (kind === "imageGen" && field === "model") {
    if (!GEMINI_MODELS.has(trimmed as GeminiImageModel))
      return { ok: false, error: `"${trimmed}" is not a Gemini image model.` };
    return { ok: true, value: trimmed };
  }
  if (kind === "imageGen" && field === "aspectRatio") {
    if (!ASPECTS.has(trimmed as AspectRatio))
      return { ok: false, error: `"${trimmed}" is not a valid aspect ratio.` };
    return { ok: true, value: trimmed };
  }
  if (kind === "imageGen" && field === "resolution") {
    if (!RESOLUTIONS.has(trimmed as ImageResolution))
      return { ok: false, error: `"${trimmed}" is not a valid resolution.` };
    return { ok: true, value: trimmed };
  }
  if (kind === "imageRef" && field === "role") {
    if (!REF_ROLES.has(trimmed as RefRole))
      return { ok: false, error: `"${trimmed}" is not a valid reference role.` };
    return { ok: true, value: trimmed };
  }
  if (kind === "prompt" && field === "temperature") {
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 1)
      return { ok: false, error: `Temperature must be a number 0–1.` };
    return { ok: true, value: n };
  }
  return { ok: true, value: trimmed };
}
