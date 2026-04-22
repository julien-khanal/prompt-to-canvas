"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Plug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/field";
import { getCoworkSecret } from "@/lib/cowork/clientApi";
import { humanizeError } from "@/lib/errors/humanize";
import { cn } from "@/lib/utils";

interface ManifestParam {
  type: "string";
  description: string;
}

interface Manifest {
  workflowId: string;
  workflowName: string;
  toolName: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, ManifestParam>;
    required: string[];
  };
}

interface ScriptResponse {
  manifest: Manifest;
  filename: string;
  contents: string;
  configSnippet: string;
}

export function McpExportDialog({
  open,
  onOpenChange,
  workflowId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflowId: string | null;
}) {
  const [data, setData] = useState<ScriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workflowId) {
      setData(null);
      setError(null);
      return;
    }
    const secret = getCoworkSecret();
    if (!secret) {
      setError("Set the Cowork bridge secret in Settings first — MCP export uses the same auth.");
      return;
    }
    setLoading(true);
    fetch(`/api/mcp/script/${workflowId}`, {
      headers: { "X-Canvas-Secret": secret },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? `http ${res.status}`);
          return;
        }
        setData(json as ScriptResponse);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "fetch failed"))
      .finally(() => setLoading(false));
  }, [open, workflowId]);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const downloadScript = () => {
    if (!data) return;
    const blob = new Blob([data.contents], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="text-gradient-primary inline-flex items-center gap-2">
              <Plug className="h-4 w-4" /> Export as MCP tool
            </span>
          </DialogTitle>
          <DialogDescription>
            Turn this workflow into a callable tool any AI agent (Claude Desktop, Cursor, etc.) can use via MCP.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-[12px] text-[var(--color-text-faint)]">
            Building manifest…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-3 py-2 text-[12px] text-[var(--color-g-red)]">
            {humanizeError(error)}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel>Tool name</FieldLabel>
              <CopyRow value={data.manifest.toolName} field="toolName" copied={copiedField} onCopy={copy} />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Detected parameters</FieldLabel>
              {Object.keys(data.manifest.inputSchema.properties).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11.5px] text-[var(--color-text-faint)]">
                  No <code className="font-mono">{`{{name}}`}</code> placeholders found in this
                  workflow. Add some to any prompt to expose them as MCP inputs (example:{" "}
                  <code className="font-mono">{`Hero image for {{brand}}`}</code>).
                </div>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(data.manifest.inputSchema.properties).map(([name, p]) => (
                    <li
                      key={name}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px]"
                    >
                      <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[var(--color-g-blue)]">
                        {name}
                      </code>
                      <span className="flex-1 text-[var(--color-text-dim)]">{p.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <FieldLabel>1. Save the server script</FieldLabel>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-[var(--color-text-dim)]">
                  {data.filename}
                </code>
                <Button onClick={downloadScript}>
                  <Download className="h-3 w-3" /> Download
                </Button>
              </div>
              <Hint>
                Put it anywhere on disk. One-time install of MCP SDK in the same folder:{" "}
                <code className="rounded bg-white/[0.05] px-1.5 font-mono">npm i @modelcontextprotocol/sdk</code>
              </Hint>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>2. Add to Claude Desktop / Cursor MCP config</FieldLabel>
              <CopyRow
                value={data.configSnippet}
                field="config"
                copied={copiedField}
                onCopy={copy}
                multiline
              />
              <Hint>
                Replace <code className="font-mono">/absolute/path/to/{data.filename}</code> with where you saved it.
                Replace <code className="font-mono">{"<same-as-COWORK_API_SECRET>"}</code> with the actual secret value.
              </Hint>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-text-faint)]">
              The tool calls back into this canvas via the Cowork bridge — your browser tab must be open and the cloudflared tunnel running when an MCP client invokes it.
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed text-[var(--color-text-faint)]">{children}</p>
  );
}

function CopyRow({
  value,
  field,
  copied,
  onCopy,
  multiline,
}: {
  value: string;
  field: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="relative">
      {multiline ? (
        <pre className="nowheel max-h-[220px] overflow-auto rounded-xl border border-white/5 bg-black/30 p-3 pr-12 font-mono text-[11px] leading-relaxed text-[var(--color-text)]">
{value}
        </pre>
      ) : (
        <code className="block truncate rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2 pr-12 font-mono text-[12px] text-[var(--color-text)]">
          {value}
        </code>
      )}
      <button
        onClick={() => onCopy(field, value)}
        className={cn(
          "absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          copied === field
            ? "bg-[var(--color-g-green)]/15 text-[var(--color-g-green)]"
            : "text-[var(--color-text-faint)] hover:bg-white/[0.06] hover:text-[var(--color-text)]"
        )}
        aria-label="Copy"
      >
        {copied === field ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
