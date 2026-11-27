"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { apiFetch } from "@/lib/api-client";

function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams();
        if (q.trim()) next.set("q", q.trim());
        router.push(`/?${next.toString()}#listings`);
      }}
    >
      <label className="sr-only" htmlFor="search-input">
        商品を検索
      </label>
      <span aria-hidden="true">⌕</span>
      <input
        id="search-input"
        maxLength={100}
        placeholder="何をお探しですか？"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button aria-label="検索">検索</button>
    </form>
  );
}

export function SiteHeader() {
  const { me, loading, refresh } = useMe();
  const router = useRouter();

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    await refresh();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="めぐる市 ホーム">
        <span className="brand-mark">巡</span>
        <span>
          めぐる市<small>meguru ichi</small>
        </span>
      </Link>
      <Suspense fallback={<div className="search" />}>
        <SearchForm />
      </Suspense>
      <nav className="header-actions" aria-label="メインナビゲーション">
        {loading ? null : me ? (
          <>
            <span className="header-user">{me.displayName ?? "会員"} さん</span>
            <Link className="text-button" href="/me">
              マイページ
            </Link>
            <button className="text-button" type="button" onClick={logout}>
              ログアウト
            </button>
          </>
        ) : (
          <Link className="text-button" href="/login">
            ログイン
          </Link>
        )}
        <Link className="sell-button" href="/sell">
          <span>＋</span> 出品する
        </Link>
      </nav>
    </header>
  );
}
