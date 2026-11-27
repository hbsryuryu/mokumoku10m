"use client";

// Google OIDCはFastAPIで検証し、アプリのCookieセッションを共有する。

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { ApiError, apiFetch, apiPost } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { me, refresh } = useMe();
  const [options, setOptions] = useState<{ googleEnabled: boolean; devLoginEnabled: boolean } | null>(null);
  useEffect(() => {
    apiFetch<{ googleEnabled: boolean; devLoginEnabled: boolean }>("/auth/options")
      .then(setOptions).catch(() => setError("ログイン設定を取得できません。画面を再読み込みしてください"));
  }, []);
  const rawNext = params.get("next") ?? "/";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !/[\\\r\n]/.test(rawNext) ? rawNext : "/";
  const needsName = !!me && !me.displayName;
  const authMessages: Record<string, string> = { failed: "Google認証を完了できませんでした。もう一度お試しください。", cancelled: "Googleログインをキャンセルしました。", suspended: "この会員は利用できません。" };
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsName) {
        await apiFetch("/me", { method: "PATCH", body: JSON.stringify({ displayName: name.trim() }) });
      } else {
        await apiPost("/dev/login", { displayName: name.trim() });
      }
      await refresh();
      // ログイン前に見ていたページに戻す（サイト内のパスだけ）
      router.push(nextPath);
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
      <p className="page-lead">Googleアカウントでログインします。</p>
      {params.get("authError") && <p className="notice notice-error" role="alert">{authMessages[params.get("authError")!] ?? authMessages.failed}</p>}
      {!options && !error && <p role="status">ログイン方法を確認中…</p>}
      {options?.googleEnabled && !needsName && <a className="primary-link" href={`/api/v1/auth/google/start?return_to=${encodeURIComponent(nextPath)}`}>Googleでログイン</a>}
      {options && !options.googleEnabled && !needsName && <p className="notice notice-info">Googleログインの設定が必要です。</p>}
      {error && !needsName && !options?.devLoginEnabled && <p className="notice notice-error" role="alert">{error}</p>}
      {(needsName || options?.devLoginEnabled) &&
      <div className="panel" style={{ maxWidth: 480 }}>
        <h2>{needsName ? "公開ニックネームの設定" : "開発用ログイン"}</h2>
        <p className="notice notice-warn">
          {needsName ? "Googleの氏名や写真は公開されません。商品の出品・入札に使うニックネームを設定してください。" : "ローカル開発専用です。同じ表示名なら同じ会員としてログインします。"}
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
              {needsName ? "ニックネームを保存して続ける" : "開発用ログイン"} <span>↗</span>
            </button>
          </div>
        </form>
      </div>}
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
