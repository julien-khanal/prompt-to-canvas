"use client";

const SECRET_HEADER = "X-Canvas-Secret";

export function getCoworkSecret(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("cowork-secret");
  return v?.trim() || null;
}

export function setCoworkSecret(secret: string): void {
  if (typeof window === "undefined") return;
  if (!secret.trim()) window.localStorage.removeItem("cowork-secret");
  else window.localStorage.setItem("cowork-secret", secret.trim());
}

export interface BridgeCommand {
  id: string;
  type: string;
  payload: unknown;
  status: string;
  createdAt: number;
}

export async function pushSnapshot(snapshot: unknown): Promise<boolean> {
  const secret = getCoworkSecret();
  if (!secret) return false;
  try {
    const res = await fetch("/api/external/snapshot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SECRET_HEADER]: secret,
      },
      body: JSON.stringify({ snapshot }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPendingCommands(): Promise<BridgeCommand[]> {
  const secret = getCoworkSecret();
  if (!secret) return [];
  try {
    const res = await fetch("/api/external/commands/pending?claim=true", {
      headers: { [SECRET_HEADER]: secret },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { commands?: BridgeCommand[] };
    return json.commands ?? [];
  } catch {
    return [];
  }
}

export async function postCommandResult(
  id: string,
  ok: boolean,
  result: unknown,
  error?: string
): Promise<boolean> {
  const secret = getCoworkSecret();
  if (!secret) return false;
  try {
    const res = await fetch(`/api/external/commands/${id}/result`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SECRET_HEADER]: secret,
      },
      body: JSON.stringify({ ok, result, error }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRefAsDataUrl(refId: string): Promise<string | null> {
  const secret = getCoworkSecret();
  if (!secret) return null;
  try {
    const res = await fetch(`/api/external/refs/${refId}`, {
      headers: { [SECRET_HEADER]: secret },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
