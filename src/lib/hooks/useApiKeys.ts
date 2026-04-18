"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteKey, getKey, hasKey, putKey } from "@/lib/crypto/keyring";

export type ApiKeyId = "anthropic" | "gemini";

export interface ApiKeyState {
  anthropic: { set: boolean; value: string };
  gemini: { set: boolean; value: string };
}

const EMPTY: ApiKeyState = {
  anthropic: { set: false, value: "" },
  gemini: { set: false, value: "" },
};

export function useApiKeys() {
  const [state, setState] = useState<ApiKeyState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [a, g] = await Promise.all([
      getKey("anthropic"),
      getKey("gemini"),
    ]);
    setState({
      anthropic: { set: !!a, value: a ?? "" },
      gemini: { set: !!g, value: g ?? "" },
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (id: ApiKeyId, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      await deleteKey(id);
    } else {
      await putKey(id, trimmed);
    }
    await refresh();
  }, [refresh]);

  const clear = useCallback(async (id: ApiKeyId) => {
    await deleteKey(id);
    await refresh();
  }, [refresh]);

  return { state, loading, save, clear, hasKey, refresh };
}
