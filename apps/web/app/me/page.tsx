"use client";

// マイページ（最小）：自分の出品と、落札した・落札された取引（USR-001 の一部）。

import Link from "next/link";
import { useEffect, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { apiFetch } from "@/lib/api-client";
import { formatJst, formatYen, STATUS_LABELS } from "@/lib/format";
import type { ListingPage, OrderSummary } from "@/lib/types";

export default function MyPage() {
  const { me, loading } = useMe();
  const [listings, setListings] = useState<ListingPage | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    Promise.all([apiFetch<ListingPage>("/me/listings?limit=50"), apiFetch<OrderSummary[]>("/me/orders")])
      .then(([l, o]) => {
        setListings(l);
        setOrders(o);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込めませんでした"));
  }, [me]);

  if (loading) return <main className="page">読み込み中…</main>;
  if (!me) {
    return (
      <main className="page">
        <h1>マイページ</h1>
        <p className="notice notice-info">
          ログインしてください。 <Link href="/login?next=/me">ログインへ</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>マイページ</h1>
      <p className="page-lead">{me.displayName} さんの出品と取引</p>
      {error && <p className="notice notice-error">{error}</p>}

      <section className="panel">
        <h2>取引（落札した・落札された）</h2>
        {orders === null ? (
          <p>読み込み中…</p>
        ) : orders.length === 0 ? (
          <p className="page-lead">まだ取引はありません。</p>
        ) : (
          <table className="simple-table">
            <thead>
              <tr><th>商品</th><th>立場</th><th>落札価格</th><th>状態</th><th>日時</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/listings/${o.listingId}`}>{o.title}</Link></td>
                  <td>{o.role === "buyer" ? "落札した" : "落札された"}</td>
                  <td>{formatYen(o.amountYen)}</td>
                  <td>{o.status === "awaiting_payment" ? "支払い待ち（準備中）" : o.status}</td>
                  <td>{formatJst(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>自分の出品</h2>
        {listings === null ? (
          <p>読み込み中…</p>
        ) : listings.items.length === 0 ? (
          <p className="page-lead">
            まだ出品はありません。 <Link href="/sell">出品する</Link>
          </p>
        ) : (
          <table className="simple-table">
            <thead>
              <tr><th>商品</th><th>状態</th><th>現在の価格</th><th>入札</th><th>終了日時</th></tr>
            </thead>
            <tbody>
              {listings.items.map((item) => (
                <tr key={item.id}>
                  <td><Link href={`/listings/${item.id}`}>{item.title}</Link></td>
                  <td>{STATUS_LABELS[item.status] ?? item.status}</td>
                  <td>{formatYen(item.currentPriceYen)}</td>
                  <td>{item.bidCount}</td>
                  <td>{item.endsAt ? formatJst(item.endsAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
