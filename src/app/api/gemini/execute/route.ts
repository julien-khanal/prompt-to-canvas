import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { AspectRatio, GeminiImageModel, ImageResolution } from "@/lib/canvas/types";

export const runtime = "nodejs";

interface GeminiExecuteReq {
  model: GeminiImageModel;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  refImages?: string[];
  apiKey: string;
}

export async function POST(req: NextRequest) {
  let body: GeminiExecuteReq;
  try {
    body = (await req.json()) as GeminiExecuteReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "placeholder")
    return NextResponse.json({ error: "Gemini key missing" }, { status: 400 });
  if (!body.prompt?.trim())
    return NextResponse.json({ error: "empty prompt" }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: body.prompt },
  ];
  for (const ref of body.refImages ?? []) {
    const parsed = parseDataUrl(ref);
    if (parsed) parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mime } });
  }

  const imageConfig: Record<string, string> = { aspectRatio: body.aspectRatio };
  if (body.model === "gemini-3-pro-image-preview") {
    imageConfig.imageSize = body.resolution;
  }

  const config: Record<string, unknown> = {
    responseModalities: ["IMAGE"],
    imageConfig,
  };

  try {
    const res = await ai.models.generateContent({
      model: body.model,
      contents: [{ role: "user", parts }],
      config,
    });

    const candidate = res.candidates?.[0];
    const inline = candidate?.content?.parts?.find(
      (p): p is { inlineData: { data: string; mimeType: string } } =>
        !!(p as { inlineData?: unknown }).inlineData
    );
    if (!inline) {
      // Surface what Gemini actually said so the user can diagnose:
      // SAFETY → prompt tripped a content filter (alcohol, violence, etc.)
      // RECITATION → too close to copyrighted material
      // STOP / MAX_TOKENS → text-only candidate, model treated as text task
      // Empty parts → safety block at the API level
      const finishReason = (candidate as { finishReason?: string } | undefined)?.finishReason;
      const promptFeedback = (res as { promptFeedback?: { blockReason?: string; safetyRatings?: unknown[] } })
        .promptFeedback;
      const textFallback = candidate?.content?.parts
        ?.filter((p): p is { text: string } => typeof (p as { text?: unknown }).text === "string")
        ?.map((p) => p.text)
        ?.join(" ")
        ?.slice(0, 240);
      const reason =
        finishReason === "SAFETY"
          ? "Gemini blocked this prompt for safety reasons. Try removing alcohol references, weapon mentions, large unmoderated crowds, or named real people."
          : finishReason === "RECITATION"
            ? "Gemini blocked this prompt for recitation (too close to copyrighted material). Rephrase more abstractly."
            : finishReason === "PROHIBITED_CONTENT"
              ? "Gemini refused this prompt as prohibited content. Rephrase or remove the offending element."
              : promptFeedback?.blockReason
                ? `Gemini blocked the prompt: ${promptFeedback.blockReason}.`
                : finishReason
                  ? `Gemini stopped without an image (finishReason=${finishReason}).${textFallback ? " Model said: " + textFallback : ""}`
                  : "no image in response";
      return NextResponse.json({ error: reason, finishReason, promptFeedback }, { status: 502 });
    }

    return NextResponse.json({
      dataUrl: `data:${inline.inlineData.mimeType};base64,${inline.inlineData.data}`,
      mime: inline.inlineData.mimeType,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function parseDataUrl(url: string): { mime: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}
