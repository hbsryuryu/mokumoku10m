"use client";

// ログイン。本番は Google ログインのみ（ADR-0005）だが、まだ実装されていないため、
// ローカルでは開発用ログイン（AUTH-002、APP_ENV=local のときだけ API にある）を使う。

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { ApiError, apiPost } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useMe();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/dev/login", { displayName: name.trim() });
      await refresh();
      // ログイン前に見ていたページに戻す（サイト内のパスだけ）
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "開発用ログインが無効です（APP_ENV=local と DEV_LOGIN_ENABLED=true が必要です）"
          : e instanceof Error
            ? e.message
            : "ログインできませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>ログイン</h1>
      <p className="page-lead">本番は Google アカウントでログインします（準備中）。</p>
      <div className="panel" style={{ maxWidth: 480 }}>
        <h2>開発用ログイン</h2>
        <p className="notice notice-warn">
          ローカル開発専用です。同じ表示名なら同じ会員としてログインします。出品者と入札者を試すときは、
          「seller1」「buyerA」のように名前を分けてください。
        </p>
        <form className="form-grid" onSubmit={submit}>
          <label htmlFor="login-name">表示名</label>
          <input
            id="login-name"
            className="form-input"
            maxLength={30}
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="primary-link" type="submit" disabled={busy || !name.trim()}>
              ログイン <span>↗</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
