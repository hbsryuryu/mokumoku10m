# API仕様書

- 文書状態: レビュー中（チーム合意前）。未決の内容は「未決事項」および各項目に明記する。

この文書はサーバーAPIのリソース境界、入出力、認証・認可、処理結果を定義する。実装状況はルートの [README](../../README.md)、実装計画は [バックログ](../product/feature-backlog.md) で管理する。未決事項があるAPIは、記載済みの要件と未決の詳細を区別して扱う。

## 共通契約

- JSONはUTF-8。日時はUTCのRFC 3339、金額は小数でなく整数のJPY。
- 更新系操作は認証・認可を必須とし、サーバー側で所有権・状態・時刻・入力を再検証する。
- エラーは共通形式 `{ "error": { "code": "...", "message": "...", "details": {} } }` とする。内部情報、秘密、他ユーザーの個人情報は返さない。
- 一覧はカーソル方式等を採用し、安定した並び順と上限を定義する。具体値は未決。
- 入札作成には `Idempotency-Key` を要求する。同一キーと同一内容の再送は以前の結果を返し、異なる内容でのキー再利用は拒否する。
- クライアントの価格・終了判定・ユーザーIDを正として扱わない。

## API一覧

| メソッド・パス | 用途 | 認証 | 仕様・未決事項 |
|---|---|---|---|
| `GET /api/v1/listings` | 公開出品検索・カテゴリ・並び替え | 不要 | 入出力の詳細は未決 |
| `GET /api/v1/listings/{listingId}` | 出品詳細と公開入札情報 | 不要 | 入出力の詳細は未決 |
| `POST /api/v1/listings` | 下書き出品作成 | 必要 | 入出力の詳細は未決 |
| `PATCH /api/v1/listings/{listingId}` | 所有者による編集 | 必要 | 編集条件は [業務ルール](../product/auction-rules.md#出品情報の編集) に従う。入出力の詳細は未決 |
| `POST /api/v1/listings/{listingId}/publish` | 入力検証後に公開 | 必要 | 入出力の詳細は未決 |
| `GET /api/v1/listings/{listingId}/bids` | 入札履歴 | 方針未決 | 個人情報表示設計が必要 |
| `POST /api/v1/listings/{listingId}/bids` | 入札を原子的に受付 | 必要 | `amountYen` は最高入札額。即決価格以上なら即落札、最高額入札者の再入札は最高入札額の引き上げとして扱う（ADR-0007）。専用の API は作らない |
| `POST /api/v1/listings/{listingId}/end-early` | 出品者による早期終了 | 必要（出品者本人） | 早期終了の条件は ADR-0007 に従う。入出力の詳細は未決 |
| `POST /api/v1/listings/{listingId}/withdraw` | 出品者による取り下げ（入札がない場合のみ） | 必要（出品者本人） | 取り下げの条件は ADR-0004 に従う。入出力の詳細は未決 |
| `GET /api/v1/me/watchlist` | 自分のウォッチ一覧 | 必要 | 入出力の詳細は未決 |
| `PUT /api/v1/me/watchlist/{listingId}` | ウォッチ追加（冪等） | 必要 | 入出力の詳細は未決 |
| `DELETE /api/v1/me/watchlist/{listingId}` | ウォッチ解除 | 必要 | 入出力の詳細は未決 |
| `GET /api/v1/me/orders` | 自分の取引一覧 | 必要 | 入出力の詳細は未決 |
| `GET /api/v1/me/notifications` | 通知一覧 | 必要 | 入出力の詳細は未決 |
| `POST /api/v1/reports` | 出品等を通報 | 必要 | 入出力の詳細は未決 |

## 開発用ログイン（AUTH-002）

| メソッド・パス | 用途 | 動作 |
|---|---|---|
| `POST /api/v1/dev/login` | 開発用の会員でログイン | `APP_ENV=local` かつ `DEV_LOGIN_ENABLED=true` のときだけ存在する。Google ログインと同じアプリセッションを発行する（[ADR-0008](../adr/0008-mvp-implementation-provisional-decisions.md)） |

## Google認証フロー

認証プロバイダーはGoogle OIDCのみとする。以下に認証APIの責務と動作を定義する。セッション有効期限・CSRF対策方式などの未決事項は末尾に記載する。

| メソッド・パス | 用途 | 動作 |
|---|---|---|
| `GET /api/v1/auth/google/start` | Google認証を開始 | サーバーが `state`、`nonce`、PKCE verifier/challengeを作り、Googleへリダイレクト |
| `GET /api/v1/auth/google/callback` | Googleからの復帰 | code/stateを検証し、サーバーがトークン交換・IDトークン検証。初回は会員作成し、アプリセッションCookieを設定 |
| `GET /api/v1/me` | 現在の会員と状態を取得 | アプリセッションから会員を特定。Google tokenやユーザーIDをクライアント入力から採用しない |
| `POST /api/v1/auth/logout` | アプリからログアウト | サーバーセッションを失効させ、Cookieを削除 |

サーバーはIDトークンの署名、issuer、許可済みGoogle Client IDとのaudience一致、有効期限、nonceを検証します。`email_verified` が真でない場合は会員ログインを完了せず、`sub` をAuthIdentityの識別子にします。メールアドレス一致だけで別Googleアカウントの既存レコードを統合しません。認証後はGoogle IDトークンをアプリの長期セッションとして使わず、Secure/HttpOnly/SameSite属性とCSRF対策を備えたアプリセッションを使います。

ログイン開始時の `returnTo` を受け付ける場合は、同一オリジンの許可パスに限定し、任意URLへのリダイレクトを拒否します。Client Secretとセッション秘密情報はサーバーのSecret Storeに置き、ログへ記録しません。

## 出品編集の競合制御

出品取得時に `version` を返し、編集要求には正の整数 `expectedVersion` を必須とする。認証・所有者・編集可能状態を検証したうえで、DBの条件付き更新によりversion一致時だけ更新し、versionを増やす。不一致は `409 Conflict` / `VERSION_CONFLICT` を返す。利用者には再取得して変更内容を確認してもらい、古い本文を自動再送しない。詳細は[トランザクション仕様](../architecture/auction-bid-transaction.md)を参照。入札APIにはこのversion条件を流用せず、悲観ロック下の検証と冪等性キーを用いる。

## 入札リクエスト

```json
{
  "amountYen": 2500
}
```

サーバーは認証ユーザーから入札者を決め、トランザクション内で対象出品・オークション行をロックまたは同等の直列化を行う。サーバー時刻、公開状態、出品者本人でないこと、整数JPYと設定上限、最低入札額（自動入札・入札単位、[ADR-0007](../adr/0007-align-with-yahoo-auctions.md)）を確認してから入札履歴を追記する。`amountYen` は最高入札額として扱う。`amountYen` はJavaScript安全整数かつ採用するDB型の範囲内で検証する。ロック順、冪等性、終了処理との競合、再試行の詳細は[入札・終了処理のトランザクション仕様](../architecture/auction-bid-transaction.md)に従う。

### 入札成功レスポンス（BID-001）

対象は `POST /api/v1/listings/{listingId}/bids`。入札・自動入札・即決は ADR-0007 および入札トランザクション仕様に従う。

入札の受付がコミットできた場合は `201 Created` を返す。自動入札で他の入札者が最高額入札者のままでも、要求を受け付けて Bid を作成したなら成功となる。「受付成功」と「落札」は区別する。

すべての項目を必須とし、該当しない値は下表のとおり `null` にする。ID は空でない文字列の不透明な識別子として扱い、例の接頭辞や形式には依存しない。

| 項目 | 型 | 意味 |
|---|---|---|
| `bid.id` | string | 今回受け付けた Bid の ID |
| `bid.amountYen` | integer | 今回本人が指定した最高入札額。1〜10,000,000円（ADR-0008）。現在価格・落札価格とは異なる |
| `bid.acceptedAt` | string（RFC 3339、UTC） | ロック取得後にDB基準で確定した受付時刻 |
| `result` | string（enum） | `leading`（開催中・本人が最高額入札者）、`outbid`（開催中・他の入札者が最高額入札者）、`won`（今回の即決で本人の落札が確定）のいずれか |
| `auction.status` | string（enum） | 今回の成功結果では `active` または `ended` |
| `auction.currentPriceYen` | integer | 自動入札計算後の現在価格。即決なら即決価格で確定した落札価格 |
| `auction.endsAt` | string（RFC 3339、UTC） | この処理で保存された終了日時。自動延長があれば延長後の日時。即決時はこの値だけで終了を判断せず `status` を使う |
| `order` | object または null | `won` の場合だけ作成済み注文の情報。それ以外は `null` |
| `order.id` | string | この入札と同一トランザクションで確定した Order の ID |
| `order.status` | string（enum） | 初回成功結果では `awaiting_payment`（ADR-0008）。支払い成功を意味しない |
| `order.amountYen` | integer | 確定した落札価格。即決価格を超えて入札しても即決価格を返す。送料・手数料等を含む支払総額を意味しない |

#### 通常入札の例

開始価格1,000円に、初めて2,500円の最高入札額を指定した場合。入札者が1人なので現在価格は1,000円で、開催は継続する。

```json
{
  "bid": {
    "id": "bid_example_1",
    "amountYen": 2500,
    "acceptedAt": "2026-11-13T03:00:00Z"
  },
  "result": "leading",
  "auction": {
    "status": "active",
    "currentPriceYen": 1000,
    "endsAt": "2026-11-14T03:00:00Z"
  },
  "order": null
}
```

#### 即決の例

即決価格3,000円に対して3,500円を指定した場合。最高入札額と落札価格を分けて返す。

```json
{
  "bid": {
    "id": "bid_example_2",
    "amountYen": 3500,
    "acceptedAt": "2026-11-13T03:00:00Z"
  },
  "result": "won",
  "auction": {
    "status": "ended",
    "currentPriceYen": 3000,
    "endsAt": "2026-11-14T03:00:00Z"
  },
  "order": {
    "id": "order_example_1",
    "status": "awaiting_payment",
    "amountYen": 3000
  }
}
```

#### 整合性・公開範囲・再送

- `leading` / `outbid` は `auction.status = active` かつ `order = null`。`won` は `auction.status = ended` かつ `order != null`、`order.amountYen = auction.currentPriceYen` とする。
- `bid.amountYen` は要求した本人の値だけを返す。他の入札者の最高入札額・会員ID・注文IDは含めない。この本人向けレスポンスを公開入札履歴へ流用しない。レスポンスには `Cache-Control: no-store` を付け、本文をアクセスログ等へ記録しない。
- Bid、価格、延長、即決の終了状態、Order、冪等性結果は同じトランザクションで確定し、コミット後だけ成功を返す。注文作成に失敗した即決を `won` として返さない。通知失敗で確定済み結果は変更しない。
- 同一ユーザー・オークション・冪等性キーと同一本文の再送は、初回のHTTPステータスと本文をそのまま返す（成功なら `201`）。Bid・Orderを増やさず、後続入札や終了によって `result` を再計算しない。
- 各値は今回の受付トランザクションで確定した時点のスナップショット。`leading` は将来の落札を保証しない。再送時には既に終了・取引進行している場合もあるため、最新状況は商品詳細や認可された取引取得APIで確認する。
- タイムアウト等で結果が不明なら同一キー・同一本文で再送する。拒否・一時障害は成功レスポンスの `result` に混在させず、共通エラー形式で返す。業務拒否の固定と一時障害の再試行はトランザクション仕様4章・8章に従う。
- `bidCount` は入札成功レスポンスには含めない。公開履歴の件数定義と併せて別途定義し、入札結果の判定には利用しない。

#### 受け入れ条件

| 条件 | 期待する結果 |
|---|---|
| 初回入札 | `201`、`leading`、現在価格は開始価格、`active`、`order = null` |
| Aの最高入札額700円に対しBが500円を入札（開始価格は500円未満、現在価格＋入札単位を満たす） | Bにも `201`、`outbid`、現在価格510円、`active`、`order = null`。Aの最高入札額は含めない |
| Aの最高入札額700円に対しBが715円を入札（入札可能額を満たす） | Bに `leading`、現在価格710円 |
| 他人と同額の最高入札額で入札（入札可能額を満たす） | 後に受け付けた本人には `outbid`。先の入札者が優先される |
| 最高額入札者が自分の最高入札額を増額 | `leading`、現在価格は変化しない、`order = null` |
| 自動延長条件を満たす入札 | `leading` または `outbid`、`endsAt` は延長後の日時 |
| 即決価格ちょうど／超過の入札 | `won`、`ended`、注文は1件、落札価格は即決価格 |
| 即決の注文作成・コミット失敗 | 成功を返さず、部分的なBid・終了状態・Orderが残らない |
| 同一キーの並行送信／タイムアウト後の再送 | 初回と同じHTTPステータス・本文。Bid・Orderは重複しない |
| `leading` の受付後に他人が上回る入札をし、元のキーで再送 | 元の `leading` の本文を返す。最新状態とは区別する |
| 受付拒否／同一キーで異なる本文を送信 | 共通エラー形式。成功結果や注文作成を返さない |

エラーコード: `UNAUTHENTICATED`, `ACCOUNT_SUSPENDED`, `LISTING_NOT_FOUND`, `AUCTION_NOT_ACTIVE`, `SELLER_CANNOT_BID`, `BID_TOO_LOW`, `BID_LIMIT_EXCEEDED`, `IDEMPOTENCY_KEY_REUSED`。同時入札で先行入札が確定した場合、後続に新しい最低額を返して再入力を促す。

## 終了処理（内部コマンド）

ワーカーは終了候補を列挙しても、候補抽出時刻だけで落札を確定しない。各対象についてDB状態と時刻を再確認し、終了状態・最高入札者・注文をトランザクションで一度だけ確定する。通知はOutbox等でコミット後に送信し、重複・失敗を再処理可能にする。

## 未決事項

セッション有効期限、CSRF対策方式、レート制限値、公開入札履歴での匿名化、ページサイズ、検索仕様、画像署名アップロード、注文・決済API、管理者API、バージョニング方針は未決。決済APIを追加するのは決済ADRと運用準備の承認後に限る。
