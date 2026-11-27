"use client";

// ログイン中の会員を画面全体で共有する。状態の正は FastAPI のセッション（GET /api/v1/me）。
// Next.js 側では独自のログイン状態やトークンを持たない（ADR-0005・ADR-0010）。

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api-client";
import type { Me } from "@/lib/types";

type MeState = { me: Me | null; loading: boolean; refresh: () => Promise<void> };

const MeContext = createContext<MeState>({ me: null, loading: true, refresh: async () => {} });

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await apiFetch<Me>("/me"));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <MeContext.Provider value={{ me, loading, refresh }}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  return useContext(MeContext);
}
