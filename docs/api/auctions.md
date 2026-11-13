# 終了処理・早期終了・取引一覧（AUC-001）

- 状態: 実装済み（`apps/api/app/auctions/`、`apps/api/app/jobs/finalize.py`）
- 手順: [トランザクション設計](../architecture/auction-bid-transaction.md) 5章、ルール: [ADR-0007](../adr/0007-align-with-yahoo-auctions.md) §6（早期終了）、[ADR-0008](../adr/0008-mvp-implementation-provisional-decisions.md) §4（終了処理の動かし方）
- テスト: [テスト仕様](../testing/auction-test-cases.md) END-01〜06、CON-03・04

## 終了処理（内部の処理。API はない）

終了時刻を過ぎたオークションを確定し、入札があれば取引（Order）を作る。

| 動かし方 | 内容 |
|---|---|
| 定期実行 | API サーバーの起動中、`FINALIZER_INTERVAL_SECONDS`（既定 30秒）ごとに実行する。`0` で止める。開始時と処理したときにログを出す（`[app.jobs.finalize] 終了処理: {'sold': 1}` など） |
| 手動実行 | `docker compose run --rm api python -m app.jobs.finalize`（テスト・障害からの復旧用） |

1件ずつ、オークション → 出品の順にロックを取り、**ロック取得後の時刻と状態**で次のように判定する。

| 状態 | 結果 |
|---|---|
| すでに終了・キャンセル済み | 何もしない（**Order を二重に作らない**。何度実行しても同じ結果） |
| 運営停止中で、終了時刻前 | 停止のまま |
| 運営停止中で、終了時刻を過ぎた | 出品・オークションを `cancelled`。落札者・Order なし。入札履歴は残す |
| 公開中・開催中で、終了時刻前 | まだ終了しない |
| 公開中・開催中で、**終了時刻ちょうど・以降** | `ended`（理由 `expired`）。入札があれば、**入札の履歴から計算し直した**最高額入札者が現在の価格で落札し、Order（`awaiting_payment`、商品・配送条件のスナップショットつき）を作る |

- 入札と同じロックを使うので、終了処理と入札がぶつかっても、先にロックを取ったほうが先に確定する。終了時刻を過ぎた入札は受け付けない（入札は `受付時刻 < 終了時刻`）。
- 1件が失敗しても、ほかのオークションの処理は続ける。失敗した1件は次の実行で再試行される。
- 通知（落札・終了のお知らせ）は、通知の仕組み（NTF）を作るときに、同じトランザクションで Outbox に書く予定。

## 早期終了 `POST /api/v1/listings/{id}/end-early`

```json
{ "expectedVersion": 2 }
```

- 出品者本人だけ。公開中・開催中で、終了時刻前のオークションを、その場で終了する（理由 `early_end`）。
- 入札があれば、**その時点の最高額入札者が現在の価格で落札**し、Order を作る。なければ落札者なしで終了する（ADR-0007 §6）。
- 返り値は出品の詳細（[出品 API](listings.md)）。

| HTTP | `code` | いつ |
|---|---|---|
| 404 | `LISTING_NOT_FOUND` | 出品がない、または本人の出品でない |
| 409 | `LISTING_NOT_EDITABLE` | 公開中・開催中でない（終了済み・取り下げ済み・停止中など） |
| 409 | `AUCTION_NOT_ACTIVE` | すでに終了時刻を過ぎている（このとき、通常の終了として確定させる） |
| 409 | `VERSION_CONFLICT` | `expectedVersion` が古い |

- 早期終了は「取り下げ」とは別の操作。入札がある出品は取り下げできないが、早期終了はできる。

## 自分の取引一覧 `GET /api/v1/me/orders`

落札した・落札された取引を新しい順に返す（最小限。取引の詳細・支払い・発送などの操作は ORD で作る）。

```json
[
  {
    "id": "1", "role": "buyer", "status": "awaiting_payment",
    "amountYen": 3100, "listingId": 12, "title": "フィルムカメラ",
    "createdAt": "2026-11-14T03:00:00Z"
  }
]
```

| 項目 | 意味 |
|---|---|
| `role` | `buyer`（自分が落札した）/ `seller`（自分の出品が落札された） |
| `amountYen` | 落札価格（送料・手数料を含まない） |
| `title` | 取引時点の商品名（あとで出品が変わっても変わらない） |
