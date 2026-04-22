"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, User } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas/store";
import { getKey } from "@/lib/crypto/keyring";
import { listActiveSkillsFor } from "@/lib/db/skills";
import { buildSnapshot } from "@/lib/chat/snapshot";
import { parseChatMessage, type Suggestion } from "@/lib/chat/parseSuggestions";
import { validateApply } from "@/lib/chat/applyValidation";
import { humanizeError } from "@/lib/errors/humanize";
import { NativeSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ChatModel = "claude-sonnet-4-6" | "claude-opus-4-7";

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState<ChatModel>("claude-sonnet-4-6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const workflowName = useCanvasStore((s) => s.workflowName);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    setError(null);
    const apiKey = await getKey("anthropic");
    if (!apiKey) {
      setError("Add your Anthropic API key in Settings.");
      return;
    }
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setLoading(true);
    try {
      const { nodes, edges, activeSkillIds } = useCanvasStore.getState();
      const snapshot = buildSnapshot(workflowName, nodes, edges);
      const skills = await listActiveSkillsFor(activeSkillIds);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          skills,
          workflow: snapshot,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `http ${res.status}`);
        setMessages(next);
        return;
      }
      setMessages([
        ...next,
        { id: crypto.randomUUID(), role: "assistant", content: json.text },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "network error");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
          Workflow advisor
        </div>
        <NativeSelect
          density="sm"
          value={model}
          onValueChange={(v) => setModel(v as ChatModel)}
          options={[
            { value: "claude-sonnet-4-6", label: "Sonnet" },
            { value: "claude-opus-4-7", label: "Opus" },
          ]}
        />
      </div>

      <div ref={scrollRef} className="nowheel flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <EmptyState />
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-faint)]">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
            {model === "claude-opus-4-7" ? "Opus thinking…" : "Sonnet thinking…"}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-3 py-2 text-[11.5px] text-[var(--color-g-red)]">
            {humanizeError(error)}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about the workflow…"
            rows={1}
            className="nodrag nowheel flex-1 resize-none bg-transparent text-[13px] leading-snug text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={send}
            disabled={loading || !draft.trim()}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow-blue transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
            ) : (
              <Send className="h-3 w-3" strokeWidth={2.2} />
            )}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-faint)]">
          <span>Workflow snapshot sent on each turn · Skills active are included</span>
          <span>Enter to send · Shift+Enter newline</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-[11.5px] leading-relaxed text-[var(--color-text-faint)]">
      <p className="text-[var(--color-text-dim)]">Ask Claude anything about your current workflow:</p>
      <ul className="space-y-1.5">
        <li>· What would make my Concept node more specific?</li>
        <li>· Is the model choice right for each node?</li>
        <li>· What's missing to make 3 variations actually distinct?</li>
        <li>· Suggest a better prompt for Variation B.</li>
      </ul>
      <p className="pt-1">Concrete suggestions get an "Apply to node" button.</p>
    </div>
  );
}

function MessageBubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "flex h-6 w-6 flex-none items-center justify-center rounded-full",
          isUser ? "bg-white/[0.08]" : "bg-gradient-primary shadow-glow-blue"
        )}
      >
        {isUser ? (
          <User className="h-3 w-3 text-[var(--color-text-dim)]" strokeWidth={1.8} />
        ) : (
          <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
        )}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 space-y-2 rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
          isUser
            ? "bg-white/[0.06] text-[var(--color-text)]"
            : "bg-white/[0.03] text-[var(--color-text)]"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <AssistantContent text={message.content} />
        )}
      </div>
    </div>
  );
}

function AssistantContent({ text }: { text: string }) {
  const segments = parseChatMessage(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <div key={i} className="whitespace-pre-wrap">{seg.text}</div>
        ) : seg.suggestion ? (
          <SuggestionCard key={i} s={seg.suggestion} />
        ) : null
      )}
    </>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const nodes = useCanvasStore((st) => st.nodes);
  const patch = useCanvasStore((st) => st.patchNodeData);
  const pushHistory = useCanvasStore((st) => st.pushHistory);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const node = nodes.find((n) => n.id === s.target);
  const exists = !!node;

  const apply = () => {
    if (!node) return;
    const v = validateApply(node.data.kind, s.field, s.value);
    if (!v.ok) {
      setApplyError(v.error);
      return;
    }
    pushHistory(`Apply "${s.field}" via chat`);
    patch(s.target, { [s.field]: v.value, cacheHit: false });
    setApplied(true);
    setApplyError(null);
  };

  return (
    <div className="rounded-xl border border-[var(--color-g-blue)]/30 bg-[var(--color-g-blue)]/[0.05] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
          Suggestion · {s.field} on{" "}
          <span className="text-[var(--color-text-dim)]">
            {node?.data.label ?? s.target}
          </span>
        </div>
        <button
          onClick={apply}
          disabled={!exists || applied}
          className={cn(
            "flex-none rounded-full px-2.5 py-[3px] text-[10.5px] font-medium transition-all",
            applied
              ? "bg-white/[0.06] text-[var(--color-text-faint)]"
              : exists
                ? "bg-gradient-primary text-white shadow-glow-blue hover:brightness-110"
                : "bg-white/[0.04] text-[var(--color-text-faint)] line-through"
          )}
        >
          {applied ? "Applied" : exists ? "Apply" : "Node missing"}
        </button>
      </div>
      <div className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 font-mono text-[11px] leading-snug text-[var(--color-text)]">
        {s.value}
      </div>
      {applyError && (
        <div className="mt-1.5 text-[10.5px] text-[var(--color-g-red)]">
          {applyError}
        </div>
      )}
    </div>
  );
}
