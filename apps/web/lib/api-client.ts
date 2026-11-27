"use client";

// ブラウザから API を呼ぶ。/api/* は Next.js が FastAPI に転送するので、同じオリジンの相対 URL で呼ぶ（ADR-0010）。
// ログインの Cookie は HttpOnly なので JavaScript からは触らず、ブラウザが自動で送る。

import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "通信できませんでした。接続を確認して、もう一度お試しください");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `エラーが発生しました（${response.status}）`,
      error?.details ?? {},
    );
  }
  return body as T;
}

export function apiPost<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), headers });
}

/** 入力エラー（VALIDATION_ERROR）の項目ごとのメッセージを取り出す。 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return {};
  const fields = (error.details.fields as { field: string; message: string }[] | undefined) ?? [];
  return Object.fromEntries(fields.map((f) => [f.field, f.message]));
}
