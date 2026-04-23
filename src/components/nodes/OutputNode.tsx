"use client";

import type { NodeProps } from "@xyflow/react";
import { Download } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNode, OutputNodeData } from "@/lib/canvas/types";

/**
 * Trigger a download for a single dataUrl or remote URL by inserting an
 * anchor with the `download` attribute and clicking it programmatically.
 * Works for image dataUrls (the common case) and any same-origin / CORS-
 * permitted remote URL.
 */
function downloadAsset(src: string, filename: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadAsset(url, filename);
  // Revoke after the click has fired; small delay covers any sync UA quirks.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function inferImageExt(dataUrl: string): string {
  const m = /^data:image\/([a-zA-Z0-9.+-]+)/.exec(dataUrl);
  if (!m) return "png";
  const mime = m[1].toLowerCase();
  if (mime === "jpeg") return "jpg";
  return mime;
}

function safeFilenameStem(label: string): string {
  return (
    label
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "output"
  );
}

export function OutputNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as OutputNodeData;
  void id;
  const hasText = !!d.text;
  const hasImages = !!(d.images && d.images.length);
  const hasAny = hasText || hasImages;

  const onDownload = () => {
    const stem = safeFilenameStem(d.label);
    if (hasImages && d.images) {
      d.images.forEach((src, i) => {
        // Stagger the download triggers slightly so browsers don't drop
        // multiple simultaneous anchor.click() events.
        setTimeout(() => {
          const ext = inferImageExt(src);
          const suffix = d.images!.length > 1 ? `-${i + 1}` : "";
          downloadAsset(src, `${stem}${suffix}.${ext}`);
        }, i * 80);
      });
    }
    if (hasText && d.text) {
      // After images, also drop the consolidated text as markdown.
      const delay = (d.images?.length ?? 0) * 80 + 200;
      setTimeout(() => downloadText(d.text!, `${stem}.md`), delay);
    }
  };

  return (
    <BaseNode
      title={d.label}
      subtitle="Final"
      status={d.status}
      accent="success"
      selected={selected}
      showOutputHandle={false}
      width={320}
      disabled={d.disabled}
      footer={
        hasAny ? (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]"
            title={
              hasImages && hasText
                ? "Download all images + markdown"
                : hasImages
                  ? `Download ${d.images!.length} image${d.images!.length > 1 ? "s" : ""}`
                  : "Download as markdown"
            }
          >
            <Download className="h-3 w-3" /> Export
          </button>
        ) : null
      }
    >
      {!hasAny && (
        <div className="flex h-[110px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-[var(--color-text-faint)]">
          consolidated result
        </div>
      )}
      {d.text && (
        <div className="max-h-[180px] overflow-auto rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[12px] leading-snug">
          {d.text}
        </div>
      )}
      {d.images?.map((src, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`output-${i}`} className="h-auto w-full" />
        </div>
      ))}
    </BaseNode>
  );
}
