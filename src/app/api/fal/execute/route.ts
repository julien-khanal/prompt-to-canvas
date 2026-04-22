import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import type {
  AspectRatio,
  FluxModel,
  ImageResolution,
} from "@/lib/canvas/types";

export const runtime = "nodejs";

interface FalExecuteReq {
  model: FluxModel;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  loraUrl?: string;
  loraStrength?: number;
  refImages?: string[];
  apiKey: string;
}

const ASPECT_TO_IMAGE_SIZE: Record<AspectRatio, string> = {
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",
};

const MODEL_ENDPOINT: Record<FluxModel, string> = {
  "fal-flux-schnell": "fal-ai/flux/schnell",
  "fal-flux-dev": "fal-ai/flux/dev",
  "fal-flux-pro": "fal-ai/flux-pro/v1.1",
};

const MODEL_LORA_ENDPOINT: Record<FluxModel, string> = {
  "fal-flux-schnell": "fal-ai/flux-lora",
  "fal-flux-dev": "fal-ai/flux-lora",
  "fal-flux-pro": "fal-ai/flux-lora",
};

export async function POST(req: NextRequest) {
  let body: FalExecuteReq;
  try {
    body = (await req.json()) as FalExecuteReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey)
    return NextResponse.json({ error: "fal.ai API key missing" }, { status: 400 });
  if (!body.prompt?.trim())
    return NextResponse.json({ error: "empty prompt" }, { status: 400 });

  fal.config({ credentials: apiKey });

  const useLora = !!body.loraUrl?.trim();
  const endpoint = useLora ? MODEL_LORA_ENDPOINT[body.model] : MODEL_ENDPOINT[body.model];
  const imageSize = ASPECT_TO_IMAGE_SIZE[body.aspectRatio] ?? "square_hd";

  const input: Record<string, unknown> = {
    prompt: body.prompt,
    image_size: imageSize,
    num_images: 1,
  };
  if (useLora) {
    input.loras = [
      { path: body.loraUrl!.trim(), scale: body.loraStrength ?? 1.0 },
    ];
  }

  try {
    const res = await fal.subscribe(endpoint, { input });
    const data = res.data as { images?: Array<{ url: string }> };
    const url = data.images?.[0]?.url;
    if (!url) {
      return NextResponse.json({ error: "fal returned no image", raw: data }, { status: 502 });
    }
    const fetched = await fetch(url);
    if (!fetched.ok) {
      return NextResponse.json({ error: `failed to fetch fal image: ${fetched.status}` }, { status: 502 });
    }
    const mime = fetched.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await fetched.arrayBuffer());
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return NextResponse.json({ dataUrl, mime });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
