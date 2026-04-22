"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Radio, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, Hint, Input, Label } from "@/components/ui/field";
import { useApiKeys, type ApiKeyId } from "@/lib/hooks/useApiKeys";
import { getCoworkSecret, setCoworkSecret } from "@/lib/cowork/clientApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: Props) {
  const { state, loading, save, clear } = useApiKeys();
  const [anthropic, setAnthropic] = useState("");
  const [gemini, setGemini] = useState("");
  const [showAnth, setShowAnth] = useState(false);
  const [showGem, setShowGem] = useState(false);
  const [showFal, setShowFal] = useState(false);
  const [showCowork, setShowCowork] = useState(false);
  const [fal, setFal] = useState("");
  const [coworkSecret, setCoworkSecretLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && !loading) {
      setAnthropic(state.anthropic.value);
      setGemini(state.gemini.value);
      setFal(state.fal.value);
      setCoworkSecretLocal(getCoworkSecret() ?? "");
      setSaved(false);
    }
  }, [open, loading, state.anthropic.value, state.gemini.value, state.fal.value]);

  const onSave = async () => {
    setSaving(true);
    await Promise.all([
      save("anthropic", anthropic),
      save("gemini", gemini),
      save("fal", fal),
    ]);
    setCoworkSecret(coworkSecret);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const onClear = async (id: ApiKeyId) => {
    await clear(id);
    if (id === "anthropic") setAnthropic("");
    else setGemini("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="text-gradient-primary">Settings</span>
          </DialogTitle>
          <DialogDescription>
            API keys stay in your browser. Encrypted with AES-GCM in IndexedDB.
            No server storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <KeyField
            label="Anthropic API key"
            placeholder="sk-ant-…"
            value={anthropic}
            onChange={setAnthropic}
            show={showAnth}
            onToggleShow={() => setShowAnth((v) => !v)}
            isSet={state.anthropic.set}
            onClear={() => onClear("anthropic")}
            hint="Used for Claude Opus / Sonnet / Haiku calls."
          />

          <KeyField
            label="Google Gemini API key"
            placeholder="AI…"
            value={gemini}
            onChange={setGemini}
            show={showGem}
            onToggleShow={() => setShowGem((v) => !v)}
            isSet={state.gemini.set}
            onClear={() => onClear("gemini")}
            hint="Used for Nano Banana (Pro / Flash) image generation."
          />

          <KeyField
            label="fal.ai API key (optional)"
            placeholder="fal_…"
            value={fal}
            onChange={setFal}
            show={showFal}
            onToggleShow={() => setShowFal((v) => !v)}
            isSet={state.fal.set}
            onClear={() => onClear("fal")}
            hint="Required to use Flux Schnell/Dev/Pro models and custom LoRAs in ImageGen nodes."
          />

          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[11.5px] text-[var(--color-text-faint)]">
            <ShieldCheck className="h-3.5 w-3.5 flex-none text-[var(--color-g-green)]" />
            Keys are AES-GCM encrypted with a per-browser-fingerprint key. Clear
            your browser data to delete them.
          </div>

          <div className="space-y-1.5 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <Label>
                <span className="inline-flex items-center gap-1.5">
                  <Radio className="h-3 w-3" /> Cowork bridge secret
                </span>
              </Label>
              {coworkSecret && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--color-g-green)]">
                  <CheckCircle2 className="h-3 w-3" /> connected
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showCowork ? "text" : "password"}
                value={coworkSecret}
                onChange={(e) => setCoworkSecretLocal(e.target.value)}
                placeholder="Same value as COWORK_API_SECRET in .env.local"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShowCowork((v) => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
                >
                  {showCowork ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <Hint>
              Optional. Set to enable Claude Cowork to read this canvas + run commands. Stored in
              localStorage (not encrypted), used only as a header on requests to /api/external/*.
            </Hint>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          {saved && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-g-green)]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  isSet,
  onClear,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  isSet: boolean;
  onClear: () => void;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {isSet && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--color-g-green)]">
            <CheckCircle2 className="h-3 w-3" /> stored
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? "Hide" : "Show"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          {isSet && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] hover:text-[var(--color-g-red)]"
            >
              clear
            </button>
          )}
        </div>
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}
