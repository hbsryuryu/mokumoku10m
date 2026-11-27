// API の入出力の型（docs/api/listings.md・bids.md・auctions.md）。
// いまは手書き。API が増えたら FastAPI の OpenAPI から生成する（ADR-0011）。

export type Me = { id: number; displayName: string | null; role: string };

export type Category = { id: number; name: string };

export type ListingStatus = "draft" | "published" | "ended" | "suspended" | "cancelled";

export type AuctionInfo = {
  status: "scheduled" | "active" | "ended" | "suspended" | "cancelled";
  startsAt: string;
  endsAt: string;
  startPriceYen: number;
  buyoutPriceYen: number | null;
  autoExtension: boolean;
  currentPriceYen: number;
  minimumBidYen: number;
  bidCount: number;
  endReason: "expired" | "buyout" | "early_end" | "cancelled" | null;
  endedAt: string | null;
};

export type Listing = {
  id: number;
  status: ListingStatus;
  version: number;
  title: string;
  description: string;
  category: Category;
  condition: string;
  conditionLabel: string;
  shippingPayer: "seller" | "buyer";
  shippingMethod: string;
  startPriceYen: number;
  buyoutPriceYen: number | null;
  autoExtension: boolean;
  durationHours: number;
  seller: { id: number; displayName: string | null };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  auction: AuctionInfo | null;
};

export type ListingSummary = {
  id: number;
  status: ListingStatus;
  title: string;
  category: Category;
  condition: string;
  conditionLabel: string;
  seller: { id: number; displayName: string | null };
  currentPriceYen: number;
  buyoutPriceYen: number | null;
  bidCount: number;
  endsAt: string | null;
  publishedAt: string | null;
};

export type ListingPage = { items: ListingSummary[]; limit: number; offset: number; hasMore: boolean };

export type BidResult = {
  bid: { id: string; amountYen: number; acceptedAt: string };
  result: "leading" | "outbid" | "won";
  auction: { status: string; currentPriceYen: number; endsAt: string };
  order: { id: string; status: string; amountYen: number } | null;
};

export type OrderSummary = {
  id: string;
  role: "buyer" | "seller";
  status: string;
  amountYen: number;
  listingId: number;
  title: string;
  createdAt: string;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: Record<string, unknown> };
};
