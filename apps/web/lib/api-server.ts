// サーバー側（Server Components）から API を呼ぶ。
// ブラウザから受け取った Cookie をそのまま API に渡し、ログイン中の会員として取得する（ADR-0010）。
// 例: 出品者本人だけが見られる下書きの詳細。

import { cookies } from "next/headers";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

export class ServerApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function serverFetch<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ServerApiError(response.status, body?.error?.code ?? "HTTP_ERROR");
  }
  return (await response.json()) as T;
}
