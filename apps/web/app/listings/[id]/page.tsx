import { notFound } from "next/navigation";

import { AuctionPanel } from "@/components/AuctionPanel";
import { ServerApiError, serverFetch } from "@/lib/api-server";
import { END_REASON_LABELS, formatJst, formatYen, STATUS_LABELS } from "@/lib/format";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  let listing: Listing;
  try {
    // 受け取った Cookie を API に渡すので、出品者本人なら下書きも見られる
    listing = await serverFetch<Listing>(`/listings/${id}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
  const auction = listing.auction;
  // 公開後はオークションの値が正（下書きの間は出品の値）
  const buyout = auction ? auction.buyoutPriceYen : listing.buyoutPriceYen;
  const autoExtension = auction ? auction.autoExtension : listing.autoExtension;

  return (
    <main className="page">
      <div className="detail-page">
        <div>
          <div className="product-image" style={{ maxHeight: 360 }}>
            <div className={`image-placeholder tone-${listing.id % 4}`} aria-hidden="true">
              ✦
            </div>
          </div>
          <p style={{ marginTop: 18 }}>
            <span className={`status-badge ${listing.status}`}>{STATUS_LABELS[listing.status]}</span>
            <span className="product-category">
              {listing.category.name} · {listing.conditionLabel}
            </span>
          </p>
          <h1>{listing.title}</h1>
          <p className="detail-description">{listing.description}</p>
          <dl className="spec-list">
            <dt>出品者</dt>
            <dd>{listing.seller.displayName ?? "（未設定）"}</dd>
            <dt>配送</dt>
            <dd>
              {listing.shippingPayer === "seller" ? "送料は出品者が負担" : "送料は落札者が負担"} ·{" "}
              {listing.shippingMethod}
            </dd>
            <dt>開始価格</dt>
            <dd>{formatYen(auction?.startPriceYen ?? listing.startPriceYen)}</dd>
            <dt>即決価格</dt>
            <dd>{buyout !== null ? formatYen(buyout) : "なし"}</dd>
            <dt>自動延長</dt>
            <dd>{autoExtension ? "あり" : "なし"}</dd>
            <dt>終了日時</dt>
            <dd>{auction ? formatJst(auction.endsAt) : `公開から ${listing.durationHours} 時間後`}</dd>
            {auction?.endReason && (
              <>
                <dt>終了の理由</dt>
                <dd>{END_REASON_LABELS[auction.endReason]}</dd>
              </>
            )}
          </dl>
        </div>
        <AuctionPanel listing={listing} />
      </div>
    </main>
  );
}
