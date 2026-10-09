# API設計案（未実装）

この文書は将来のサーバーAPIのリソース境界と振る舞いを示す案です。現在のプロトタイプにHTTP APIはありません。技術スタック・認証方式・ページネーション等の採用時にOpenAPI定義へ具体化してください。

## 共通契約案

- JSONはUTF-8。日時はUTCのRFC 3339、金額は小数でなく整数のJPY。
- 更新系操作は認証・認可を必須とし、サーバー側で所有権・状態・時刻・入力を再検証する。
- エラーは共通形式 `{ "error": { "code": "...", "message": "...", "details": {} } }` とする案。内部情報、秘密、他ユーザーの個人情報は返さない。
- 一覧はカーソル方式等を採用し、安定した並び順と上限を定義する。具体値は未決。
- 入札作成には `Idempotency-Key` を要求する案。同一キーと同一内容の再送は以前の結果を返し、異なる内容でのキー再利用は拒否する。
- クライアントの価格・終了判定・ユーザーIDを正として扱わない。

## リソース案

| メソッド・パス | 用途 | 認証 | 状態 |
|---|---|---|---|
| `GET /api/v1/listings` | 公開出品検索・カテゴリ・並び替え | 不要 | 将来案 |
| `GET /api/v1/listings/{listingId}` | 出品詳細と公開入札情報 | 不要 | 将来案 |
| `POST /api/v1/listings` | 下書き出品作成 | 必要 | 将来案 |
| `PATCH /api/v1/listings/{listingId}` | 所有者による編集 | 必要 | 将来案・編集可能状態は未決 |
| `POST /api/v1/listings/{listingId}/publish` | 入力検証後に公開 | 必要 | 将来案 |
| `GET /api/v1/listings/{listingId}/bids` | 入札履歴 | 方針未決 | 個人情報表示設計が必要 |
| `POST /api/v1/listings/{listingId}/bids` | 入札を原子的に受付 | 必要 | 将来案 |
| `GET /api/v1/me/watchlist` | 自分のウォッチ一覧 | 必要 | 将来案 |
| `PUT /api/v1/me/watchlist/{listingId}` | ウォッチ追加（冪等） | 必要 | 将来案 |
| `DELETE /api/v1/me/watchlist/{listingId}` | ウォッチ解除 | 必要 | 将来案 |
| `GET /api/v1/me/orders` | 自分の取引一覧 | 必要 | 将来案 |
| `GET /api/v1/me/notifications` | 通知一覧 | 必要 | 将来案 |
| `POST /api/v1/reports` | 出品等を通報 | 必要 | 将来案 |

## 入札リクエスト案

```json
{
  "amountYen": 2500
}
```

サーバーは認証ユーザーから入札者を決め、トランザクション内で対象出品・オークション行をロックまたは同等の直列化を行う。サーバー時刻、公開状態、出品者本人でないこと、整数JPYと設定上限、現在価格と最低増分を確認してから入札履歴を追記する。`amountYen` はJavaScript安全整数かつ採用するDB型の範囲内で検証する。

成功レスポンス案:

```json
{
  "bid": { "id": "bid_...", "amountYen": 2500, "acceptedAt": "2026-10-10T03:00:00Z" },
  "auction": { "currentPriceYen": 2500, "bidCount": 9, "endsAt": "2026-10-12T12:00:00Z" }
}
```

エラーコード案: `UNAUTHENTICATED`, `ACCOUNT_SUSPENDED`, `LISTING_NOT_FOUND`, `AUCTION_NOT_ACTIVE`, `SELLER_CANNOT_BID`, `BID_TOO_LOW`, `BID_LIMIT_EXCEEDED`, `IDEMPOTENCY_KEY_REUSED`。同時入札で先行入札が確定した場合、後続に新しい最低額を返して再入力を促す。

## 終了処理（内部コマンド案）

ワーカーは終了候補を列挙しても、候補抽出時刻だけで落札を確定しない。各対象についてDB状態と時刻を再確認し、終了状態・最高入札者・注文をトランザクションで一度だけ確定する。通知はOutbox等でコミット後に送信し、重複・失敗を再処理可能にする。

## 未決事項

セッション/JWT方式、CSRF対策方式、レート制限値、公開入札履歴での匿名化、ページサイズ、検索仕様、画像署名アップロード、注文・決済API、管理者API、バージョニング方針は未決。決済APIを追加するのは決済ADRと運用準備の承認後に限る。
