"""Feature BID-001: 入札単位と自動入札の計算の単体テスト（docs/testing/auction-test-cases.md）。"""

import pytest

from app.bids.pricing import AcceptedBid, bid_increment, compute_price, minimum_bid, minimum_bid_for

A, B, C = 1, 2, 3


def bids(*pairs):
    """(入札者, 最高入札額) を受付順に並べた入札。"""
    return [AcceptedBid(bidder, amount, order) for order, (bidder, amount) in enumerate(pairs)]


@pytest.mark.parametrize(
    "case, price, increment, minimum",
    [
        ("UNIT-01", 999, 10, 1_009),
        ("UNIT-02", 1_000, 100, 1_100),
        ("UNIT-03", 4_999, 100, 5_099),
        ("UNIT-04", 5_000, 250, 5_250),
        ("UNIT-05", 9_999, 250, 10_249),
        ("UNIT-06", 10_000, 500, 10_500),
        ("UNIT-07", 49_999, 500, 50_499),
        ("UNIT-08", 50_000, 1_000, 51_000),
    ],
)
def test_increment_boundaries(case, price, increment, minimum):
    assert bid_increment(price) == increment
    # 現在の価格が P になる履歴：A と B が同額 P で、先に入れた A が最高額入札者
    state = compute_price(1, bids((A, price), (B, price)))
    assert state.current_price == price
    assert minimum_bid(1, state) == minimum


def test_small_prices_use_10_yen():
    assert bid_increment(1) == 10


def test_no_bids():
    state = compute_price(100, [])
    assert (state.current_price, state.leader_id, state.bid_count) == (100, None, 0)
    assert minimum_bid(100, state) == 100  # BID-01: 入札がなければ開始価格


def test_single_bidder_pays_start_price():
    # BID-05: 開始価格100円に1,000万円で入札しても、現在の価格は100円
    state = compute_price(100, bids((A, 10_000_000)))
    assert (state.current_price, state.leader_id) == (100, A)


def test_auto_01_lower_bid_is_outbid():
    state = compute_price(100, bids((A, 700), (B, 500)))
    assert (state.current_price, state.leader_id) == (510, A)


def test_auto_02_higher_bid_leads():
    state = compute_price(100, bids((A, 700), (B, 715)))
    assert (state.current_price, state.leader_id) == (710, B)


def test_higher_bid_close_to_leader_is_capped():
    # 2番目＋入札単位が1番目を超えるときは、1番目の最高入札額が上限
    state = compute_price(100, bids((A, 700), (B, 705)))
    assert (state.current_price, state.leader_id) == (705, B)


def test_auto_03_same_amount_earlier_bidder_wins():
    state = compute_price(100, bids((A, 700), (B, 700)))
    assert (state.current_price, state.leader_id) == (700, A)


def test_auto_04_leader_raises_alone():
    state = compute_price(100, bids((A, 700), (A, 900)))
    assert (state.current_price, state.leader_id, state.bidder_count) == (100, A, 1)


def test_auto_05_own_bids_are_not_competitors():
    state = compute_price(100, bids((A, 700), (B, 500), (A, 900)))
    assert (state.current_price, state.leader_id) == (510, A)


def test_three_bidders():
    state = compute_price(100, bids((A, 700), (B, 500), (C, 650)))
    assert (state.current_price, state.leader_id) == (660, A)


def test_same_amount_tie_uses_order_of_that_amount():
    # B が先に 600、A が後から 600 に引き上げた → 600 を先に出した B が優先
    state = compute_price(100, bids((A, 500), (B, 600), (A, 600)))
    assert state.leader_id == B


def test_minimum_for_leader_requires_raising_own_max():
    state = compute_price(100, bids((A, 700), (B, 500)))  # 現在の価格 510
    assert minimum_bid(100, state) == 520
    assert minimum_bid_for(B, 100, state) == 520
    assert minimum_bid_for(A, 100, state) == 701  # 最高入札額を下げる操作はできない


def test_bid_06():
    # 現在価格1,000円 → 1,099円は不可、1,100円から可
    state = compute_price(1, bids((A, 1_000), (C, 1_000)))
    assert minimum_bid_for(B, 1, state) == 1_100
