"""Feature BID-001: 入札単位と自動入札による価格の計算（ADR-0007）。

DB に依存しない純粋な関数だけを置き、境界値を単体テストで確かめる（tests/test_pricing.py）。
"""

from collections.abc import Iterable
from dataclasses import dataclass

# ADR-0007 §2: 現在の価格の価格帯ごとの入札単位（上限は「未満」）
INCREMENT_TABLE: tuple[tuple[int, int], ...] = (
    (1_000, 10),
    (5_000, 100),
    (10_000, 250),
    (50_000, 500),
)
TOP_INCREMENT = 1_000  # 5万円以上


def bid_increment(price: int) -> int:
    """現在の価格に対する入札単位。"""
    for upper, increment in INCREMENT_TABLE:
        if price < upper:
            return increment
    return TOP_INCREMENT


@dataclass(frozen=True)
class AcceptedBid:
    """受付済みの入札。`order` は受付順（小さいほど先）。"""

    bidder_id: int
    max_amount: int
    order: int


@dataclass(frozen=True)
class AuctionPrice:
    current_price: int
    leader_id: int | None
    leader_max: int | None
    bidder_count: int
    bid_count: int


def compute_price(start_price: int, bids: Iterable[AcceptedBid]) -> AuctionPrice:
    """受付済みの入札から、現在の価格と最高額入札者を計算する（ADR-0007 §3）。

    - 入札者ごとに、その人の最も高い最高入札額を使う（自分の過去の入札を競争相手に数えない。AUTO-05）
    - 最高入札額が同じなら、その金額を先に受け付けた入札者を優先する
    - 入札者が1人なら開始価格。2人以上なら「2番目の最高入札額＋その入札単位」（1番目の最高入札額が上限）
    """
    bids = list(bids)
    best: dict[int, AcceptedBid] = {}
    for bid in bids:
        current = best.get(bid.bidder_id)
        if current is None or bid.max_amount > current.max_amount:
            best[bid.bidder_id] = bid

    if not best:
        return AuctionPrice(start_price, None, None, 0, 0)

    ranked = sorted(best.values(), key=lambda b: (-b.max_amount, b.order))
    leader = ranked[0]
    if len(ranked) == 1:
        current_price = start_price
    else:
        second = ranked[1].max_amount
        current_price = min(leader.max_amount, second + bid_increment(second))
    return AuctionPrice(
        current_price=max(current_price, start_price),
        leader_id=leader.bidder_id,
        leader_max=leader.max_amount,
        bidder_count=len(ranked),
        bid_count=len(bids),
    )


def minimum_bid(start_price: int, price: AuctionPrice) -> int:
    """次の入札の最低額。入札者がいなければ開始価格、いれば「現在の価格＋入札単位」。"""
    if price.bid_count == 0:
        return start_price
    return price.current_price + bid_increment(price.current_price)


def minimum_bid_for(bidder_id: int, start_price: int, price: AuctionPrice) -> int:
    """この入札者が次に入札できる最低額。

    最高額入札者が入札し直す場合は「最高入札額の引き上げ」なので、今の最高入札額より高くなければならない
    （下げる操作は MVP では提供しない。ADR-0007 §3）。
    """
    required = minimum_bid(start_price, price)
    if price.leader_id == bidder_id and price.leader_max is not None:
        required = max(required, price.leader_max + 1)
    return required
