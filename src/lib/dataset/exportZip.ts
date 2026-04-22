"use client";

import JSZip from "jszip";
import type { CanvasNode, ImageGenNodeData } from "@/lib/canvas/types";

export interface ExportedDataset {
  blob: Blob;
  filename: string;
  imageCount: number;
}

function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

function extOf(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function slug(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
}

export async function buildDatasetZip(
  workflowName: string,
  nodes: CanvasNode[]
): Promise<ExportedDataset> {
  const zip = new JSZip();
  const meta: Array<{
    file: string;
    nodeId: string;
    nodeLabel: string;
    model: string;
    aspectRatio: string;
    resolution: string;
    prompt: string;
    variantIndex?: number;
  }> = [];

  let imageCount = 0;
  let imgFolder = zip.folder("images")!;

  for (const n of nodes) {
    if (n.data.kind !== "imageGen") continue;
    const d = n.data as ImageGenNodeData;
    const candidates: Array<{ url: string; idx?: number }> = [];
    if (d.outputImages && d.outputImages.length) {
      d.outputImages.forEach((u, i) => candidates.push({ url: u, idx: i }));
    } else if (d.outputImage) {
      candidates.push({ url: d.outputImage });
    }
    for (const c of candidates) {
      const parsed = dataUrlToBytes(c.url);
      if (!parsed) continue;
      const idxSuffix = c.idx !== undefined ? `_v${String(c.idx + 1).padStart(2, "0")}` : "";
      const fname = `${String(imageCount + 1).padStart(3, "0")}_${slug(n.data.label)}${idxSuffix}.${extOf(parsed.mime)}`;
      imgFolder.file(fname, parsed.bytes);
      meta.push({
        file: `images/${fname}`,
        nodeId: n.id,
        nodeLabel: n.data.label,
        model: d.model,
        aspectRatio: d.aspectRatio,
        resolution: d.resolution,
        prompt: d.prompt,
        variantIndex: c.idx,
      });
      imageCount += 1;
    }
  }

  zip.file("metadata.json", JSON.stringify({
    workflow: workflowName,
    exportedAt: new Date().toISOString(),
    imageCount,
    images: meta,
  }, null, 2));

  zip.file(
    "README.txt",
    `Dataset export from Prompt Canvas — workflow "${workflowName}"
Exported: ${new Date().toLocaleString()}
Images: ${imageCount}

Folder structure:
  images/<seq>_<label>[_vNN].<ext>   — one file per generated image
  metadata.json                        — per-image prompt + model + aspect

Use cases:
- Upload images/ folder + metadata.json to fal.ai or Replicate for LoRA training.
  Most LoRA trainers accept a folder of images + a captions file. The prompt field
  in metadata.json doubles as caption.
- Drop into Civitai for review or sharing.
- Manual curation: review images/ in a file browser, then re-import the keepers.
`
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${slug(workflowName)}_dataset_${new Date().toISOString().slice(0, 10)}.zip`;
  return { blob, filename, imageCount };
}
