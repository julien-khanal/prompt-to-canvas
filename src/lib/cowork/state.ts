import "server-only";

const STATE_KEY = Symbol.for("prompt-canvas.coworkState");

export type CommandStatus = "queued" | "running" | "done" | "error";

export interface Command {
  id: string;
  type: string;
  payload: unknown;
  status: CommandStatus;
  result?: unknown;
  error?: string;
  createdAt: number;
  claimedAt?: number;
  completedAt?: number;
}

export interface SnapshotEnvelope {
  snapshot: unknown;
  updatedAt: number;
}

export interface RefBlob {
  id: string;
  buffer: ArrayBuffer;
  mime: string;
  size: number;
  uploadedAt: number;
  expiresAt: number;
}

interface CoworkState {
  snapshot: SnapshotEnvelope | null;
  commands: Map<string, Command>;
  refs: Map<string, RefBlob>;
  lastCleanup: number;
}

const COMMAND_TTL_MS = 10 * 60 * 1000;
const REF_TTL_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function createInitialState(): CoworkState {
  return {
    snapshot: null,
    commands: new Map(),
    refs: new Map(),
    lastCleanup: Date.now(),
  };
}

function getState(): CoworkState {
  const g = globalThis as unknown as { [k: symbol]: CoworkState | undefined };
  if (!g[STATE_KEY]) g[STATE_KEY] = createInitialState();
  return g[STATE_KEY]!;
}

function maybeCleanup(s: CoworkState): void {
  const now = Date.now();
  if (now - s.lastCleanup < CLEANUP_INTERVAL_MS) return;
  s.lastCleanup = now;
  for (const [id, cmd] of s.commands) {
    if (cmd.status === "done" || cmd.status === "error") {
      const age = now - (cmd.completedAt ?? cmd.createdAt);
      if (age > COMMAND_TTL_MS) s.commands.delete(id);
    } else if (now - cmd.createdAt > COMMAND_TTL_MS * 2) {
      s.commands.delete(id);
    }
  }
  for (const [id, ref] of s.refs) {
    if (now > ref.expiresAt) s.refs.delete(id);
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const snapshotStore = {
  set(snapshot: unknown): void {
    const s = getState();
    s.snapshot = { snapshot, updatedAt: Date.now() };
    maybeCleanup(s);
  },
  get(): SnapshotEnvelope | null {
    const s = getState();
    maybeCleanup(s);
    return s.snapshot;
  },
};

export const commandQueue = {
  enqueue(type: string, payload: unknown): Command {
    const s = getState();
    maybeCleanup(s);
    const cmd: Command = {
      id: newId("cmd"),
      type,
      payload,
      status: "queued",
      createdAt: Date.now(),
    };
    s.commands.set(cmd.id, cmd);
    return cmd;
  },
  pending(claim: boolean): Command[] {
    const s = getState();
    maybeCleanup(s);
    const out: Command[] = [];
    for (const cmd of s.commands.values()) {
      if (cmd.status === "queued") {
        if (claim) {
          cmd.status = "running";
          cmd.claimedAt = Date.now();
        }
        out.push(cmd);
      }
    }
    return out;
  },
  complete(id: string, result: unknown): boolean {
    const s = getState();
    const cmd = s.commands.get(id);
    if (!cmd) return false;
    cmd.status = "done";
    cmd.result = result;
    cmd.completedAt = Date.now();
    return true;
  },
  fail(id: string, error: string): boolean {
    const s = getState();
    const cmd = s.commands.get(id);
    if (!cmd) return false;
    cmd.status = "error";
    cmd.error = error;
    cmd.completedAt = Date.now();
    return true;
  },
  get(id: string): Command | null {
    return getState().commands.get(id) ?? null;
  },
};

export const refStore = {
  put(buffer: ArrayBuffer, mime: string): RefBlob {
    const s = getState();
    maybeCleanup(s);
    const id = newId("ref");
    const blob: RefBlob = {
      id,
      buffer,
      mime,
      size: buffer.byteLength,
      uploadedAt: Date.now(),
      expiresAt: Date.now() + REF_TTL_MS,
    };
    s.refs.set(id, blob);
    return blob;
  },
  get(id: string): RefBlob | null {
    const s = getState();
    const ref = s.refs.get(id);
    if (!ref) return null;
    if (Date.now() > ref.expiresAt) {
      s.refs.delete(id);
      return null;
    }
    return ref;
  },
  list(): Array<{ id: string; mime: string; size: number; expiresAt: number }> {
    const s = getState();
    return [...s.refs.values()].map((r) => ({
      id: r.id,
      mime: r.mime,
      size: r.size,
      expiresAt: r.expiresAt,
    }));
  },
};
