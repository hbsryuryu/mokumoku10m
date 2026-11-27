import Link from "next/link";

import { formatYen, remainingLabel, STATUS_LABELS } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";

/** 商品カード（静的デモの .product-card と同じ見た目）。 */
export function ListingCard({ item }: { item: ListingSummary }) {
  const urgent = item.endsAt !== null && Date.parse(item.endsAt) - Date.now() < 3 * 3600_000;
  return (
    <Link href={`/listings/${item.id}`} className="product-card" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="product-image">
        <div className={`image-placeholder tone-${item.id % 4}`} aria-hidden="true">
          ✦
        </div>
        <span className="badge">{STATUS_LABELS[item.status] ?? item.status}</span>
      </div>
      <div className="product-meta">
        <div className="product-category">{item.category.name}</div>
        <h3 className="product-title">{item.title}</h3>
        <div className="product-price-row">
          <div className="product-price">{formatYen(item.currentPriceYen)}</div>
          <span className="bid-count">{item.bidCount} 入札</span>
        </div>
        <div className={`product-timer${urgent ? " urgent" : ""}`}>
          <span className="clock-icon">◷</span> {remainingLabel(item.endsAt)}
        </div>
      </div>
    </Link>
  );
}
