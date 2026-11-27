"use client";

// 商品詳細の右側：現在の価格・残り時間・入札（BID-001）・出品者の操作・落札の結果（AUC-001）。
// 表示する価格や残り時間は案内で、入札できるか・落札者は誰かは、すべてサーバーが決める（仕様書 6.2）。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { ApiError, apiFetch, apiPost } from "@/lib/api-client";
import { formatYen, remainingLabel } from "@/lib/format";
import type { BidResult, Listing, OrderSummary } from "@/lib/types";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function AuctionPanel({ listing }: { listing: Listing }) {
  const { me, loading } = useMe();
  const router = useRouter();
  const now = useNow();
  const auction = listing.auction;
  const isSeller = me?.id === listing.seller.id;
  const isActive =
    listing.status === "published" && auction?.status === "active" && Date.parse(auction.endsAt) > now;
  // 入札の結果はここで持つ。即決で落札するとオークションが終わり入札欄が消えるが、結果の表示は残す。
  const [lastBid, setLastBid] = useState<BidResult | null>(null);

  return (
    <aside className="panel" aria-label="オークション">
      {auction ? (
        <>
          <p className="price-label">{auction.bidCount > 0 ? "現在の価格" : "開始価格"}</p>
          <div className="price-block">
            <span className="detail-price">{formatYen(auction.currentPriceYen)}</span>
            <span className="bid-count">{auction.bidCount} 入札</span>
          </div>
          <p className="product-timer">◷ {isActive ? remainingLabel(auction.endsAt, now) : "受付終了"}</p>
        </>
      ) : (
        <p className="notice notice-info">まだ公開されていません（下書き）。</p>
      )}

      {lastBid && (
        <p className={`notice ${lastBid.result === "outbid" ? "notice-warn" : "notice-success"}`} role="status">
          {RESULT_MESSAGES[lastBid.result]}（あなたの最高入札額 {formatYen(lastBid.bid.amountYen)}、現在の価格{" "}
          {formatYen(lastBid.auction.currentPriceYen)}）
        </p>
      )}
      {!isActive && auction && <Result listing={listing} />}

      {loading ? null : isSeller ? (
        <SellerActions listing={listing} onDone={() => router.refresh()} />
      ) : isActive ? (
        me ? (
          <BidForm
            listing={listing}
            onBid={(result) => {
              setLastBid(result);
              router.refresh();
            }}
          />
        ) : (
          <p className="notice notice-info">
            入札するにはログインしてください。{" "}
            <Link href={`/login?next=/listings/${listing.id}`}>ログインへ</Link>
          </p>
        )
      ) : null}
    </aside>
  );
}

// --- 入札 ---------------------------------------------------------------------

const RESULT_MESSAGES: Record<BidResult["result"], string> = {
  leading: "入札しました。あなたが最高額入札者です。",
  outbid: "入札しましたが、ほかの方の最高入札額のほうが高いため、現在はほかの方が最高額入札者です。",
  won: "即決価格で落札しました！",
};

function BidForm({ listing, onBid }: { listing: Listing; onBid: (result: BidResult | null) => void }) {
  const auction = listing.auction!;
  const [amount, setAmount] = useState(String(auction.minimumBidYen));
  const [confirming, setConfirming] = useState(false);
  // 同じ入札の再送（通信エラー後など）には同じキーを使い、二重に入札しない（冪等性）
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const isBuyout = auction.buyoutPriceYen !== null && value >= auction.buyoutPriceYen;

  function startConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIdempotencyKey(crypto.randomUUID());
    setConfirming(true);
  }

  async function placeBid() {
    if (!idempotencyKey) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiPost<BidResult>(
        `/listings/${listing.id}/bids`,
        { amountYen: value },
        { "Idempotency-Key": idempotencyKey },
      );
      setConfirming(false);
      setIdempotencyKey(null);
      onBid(response);
    } catch (e) {
      if (e instanceof ApiError && e.code === "NETWORK_ERROR") {
        // 結果が分からないので、キーを保ったまま再送できるようにする
        setError("通信できませんでした。「入札を確定する」をもう一度押すと、同じ入札として送り直します。");
      } else {
        setConfirming(false);
        setIdempotencyKey(null);
        if (e instanceof ApiError && e.code === "BID_TOO_LOW") {
          const minimum = Number(e.details.minimumBidYen);
          setAmount(String(minimum));
          setError(`入札額が最低入札額に足りません。${formatYen(minimum)} 以上で入札してください。`);
        } else {
          setError(e instanceof Error ? e.message : "入札できませんでした");
        }
        onBid(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {!confirming ? (
        <form className="form-grid" onSubmit={startConfirm}>
          <label htmlFor="bid-amount">
            最高入札額（円） <small>最低 {formatYen(auction.minimumBidYen)}</small>
          </label>
          <input
            id="bid-amount"
            className="form-input"
            type="number"
            min={auction.minimumBidYen}
            max={10_000_000}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="field-hint">
            ほかの入札があると、この金額まで自動で入札します（自動入札）。
            {auction.buyoutPriceYen !== null && ` ${formatYen(auction.buyoutPriceYen)} 以上で即決落札です。`}
          </p>
          <div className="button-row">
            <button className="primary-link" type="submit" disabled={!Number.isInteger(value) || value < 1}>
              入札内容を確認する <span>↗</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="notice notice-info" role="dialog" aria-label="入札の確認">
          <p style={{ margin: "0 0 6px" }}>
            <strong>{listing.title}</strong> に、最高入札額 <strong>{formatYen(value)}</strong> で入札します。
          </p>
          <p style={{ margin: "0 0 10px" }}>
            {isBuyout
              ? "即決価格以上のため、確定するとその場で落札となり、取り消しはできません。"
              : "確定後は取り消しできません。落札した場合は、取引に進む必要があります。"}
          </p>
          <div className="button-row" style={{ marginTop: 0 }}>
            <button className="primary-link" type="button" onClick={placeBid} disabled={busy}>
              入札を確定する <span>↗</span>
            </button>
            <button className="secondary-button" type="button" onClick={() => setConfirming(false)} disabled={busy}>
              戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 出品者の操作 -------------------------------------------------------------

function SellerActions({ listing, onDone }: { listing: Listing; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auction = listing.auction;
  const active = listing.status === "published" && auction?.status === "active";

  async function run(path: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/listings/${listing.id}/${path}`, { expectedVersion: listing.version });
      onDone();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "VERSION_CONFLICT"
          ? "ほかの画面で出品が更新されています。ページを読み込み直してください。"
          : e instanceof Error
            ? e.message
            : "操作できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="notice notice-info">あなたの出品です（自分の出品には入札できません）。</p>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        {listing.status === "draft" && (
          <button className="primary-link" disabled={busy} onClick={() => run("publish", "公開すると、すぐにオークションが始まります。公開しますか？")}>
            公開する <span>↗</span>
          </button>
        )}
        {active && (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() =>
              run(
                "end-early",
                auction!.bidCount > 0
                  ? `今すぐ終了すると、現在の最高額入札者が ${formatYen(auction!.currentPriceYen)} で落札します。終了しますか？`
                  : "入札がないため、落札者なしで終了します。終了しますか？",
              )
            }
          >
            早期終了する
          </button>
        )}
        {active && auction!.bidCount === 0 && (
          <button className="danger-button" disabled={busy} onClick={() => run("withdraw", "この出品を取り下げますか？ 一覧から消えます。")}>
            取り下げる
          </button>
        )}
      </div>
    </div>
  );
}

// --- 落札の結果 ---------------------------------------------------------------

function Result({ listing }: { listing: Listing }) {
  const { me } = useMe();
  const [order, setOrder] = useState<OrderSummary | null | undefined>(undefined);
  const auction = listing.auction!;

  useEffect(() => {
    if (!me) {
      setOrder(null);
      return;
    }
    apiFetch<OrderSummary[]>("/me/orders")
      .then((orders) => setOrder(orders.find((o) => o.listingId === listing.id) ?? null))
      .catch(() => setOrder(null));
  }, [me, listing.id]);

  if (listing.status === "cancelled" || auction.status === "cancelled") {
    return <p className="notice notice-warn">この出品は取り下げ・キャンセルされました。</p>;
  }
  if (auction.status === "active") {
    return <p className="notice notice-info">終了時刻を過ぎました。まもなく落札者が確定します。</p>;
  }
  if (order?.role === "buyer") {
    return (
      <p className="notice notice-success">
        🎉 あなたが {formatYen(order.amountYen)} で落札しました！ <Link href="/me">マイページの取引</Link>
      </p>
    );
  }
  if (order?.role === "seller") {
    return (
      <p className="notice notice-success">
        {formatYen(order.amountYen)} で落札されました。 <Link href="/me">マイページの取引</Link>
      </p>
    );
  }
  return (
    <p className="notice notice-info">
      このオークションは終了しました{auction.bidCount === 0 ? "（入札なし）" : `（落札価格 ${formatYen(auction.currentPriceYen)}）`}。
    </p>
  );
}
