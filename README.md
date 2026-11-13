# めぐる市 — オークションMVP

個人間（C2C）オンラインオークションサービスを、3人チームで学びながら段階的に作るプロジェクトです。

- 全体方針：[`AGENTS.md`](AGENTS.md)
- 開発の進め方（ブランチ・PR のルール）：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- 要件・設計・ADR：[`docs/`](docs/README.md)

## 現在の状態

| 部分 | 状態 |
|---|---|
| フロントエンド | 静的なデモ（`index.html` / `styles.css` / `app.js`）。サーバーとはまだ接続していない |
| バックエンド API | FastAPI（`apps/api/`、[ADR-0001](docs/adr/0001-backend-framework.md)）。開発用ログイン・ログアウト・`/me`、**出品**（[出品 API](docs/api/listings.md)）、**入札**（自動入札・自動延長・即決、[入札 API](docs/api/bids.md)）まで。通常の終了処理・早期終了（AUC-001）は次の PR から |
| データベース | 開発初期は SQLite3、本番前に PostgreSQL へ移行（[ADR-0006](docs/adr/0006-database-sqlite-to-postgresql.md)）。会員・セッション・カテゴリ・出品・オークションのテーブルまで（[テーブル設計](docs/architecture/database-schema.md)） |
| 認証 | **Google ログインのみ**（[ADR-0005](docs/adr/0005-google-only-authentication.md)）。Google ログイン（AUTH-001）は未実装。ローカル開発では **開発用ログイン**（AUTH-002、[ADR-0008](docs/adr/0008-mvp-implementation-provisional-decisions.md)）を使う |

## ディレクトリ構成

```text
/
├── README.md              # このファイル（全体の入口）
├── AGENTS.md              # プロジェクト全体の方針（AI エージェントも読む）
├── CONTRIBUTING.md        # ブランチ・コミット・PR のルール
├── compose.yaml           # ローカル開発用の Docker Compose 設定
├── .env.example           # 環境変数の見本（コピーして .env を作る）
├── apps/
│   └── api/               # バックエンド API（FastAPI）→ apps/api/README.md
├── docs/                  # 要件・設計・ADR・運用手順 → docs/README.md
└── index.html, styles.css, app.js   # 静的デモ（将来 apps/web/ に移す候補）
```

## ローカル開発の始め方（バックエンド API）

必要なもの：[Docker Desktop](https://www.docker.com/products/docker-desktop/)（起動しておく）

```powershell
# 1. 環境変数のファイルを作る（最初の1回だけ）
Copy-Item .env.example .env

# 2. 起動する（初回はイメージのビルドに数分かかる）
#    起動のたびに DB のマイグレーション（テーブル作成・更新）も自動で行う
docker compose up --build
```

ブラウザで次を開いて確認します。

- http://localhost:8000/health → `{"status":"ok","database":"sqlite","env":"local"}` と表示されれば成功
- http://localhost:8000/docs → API ドキュメント（FastAPI が自動で作る画面。ここから API を試せる）

### 開発用ログインを試す

Google ログインはまだないので、ローカルでは開発用ログインで会員になります（`APP_ENV=local` のときだけ使えます）。

1. http://localhost:8000/docs を開く
2. `POST /api/v1/dev/login` →「Try it out」→ `{"display_name": "seller1"}` を送る（同じ名前なら同じ会員になる）
3. `GET /api/v1/me` を実行すると、ログイン中の会員が表示される
4. `POST /api/v1/auth/logout` でログアウト

### 出品を試す

1. 開発用ログインで `seller1` としてログイン
2. `GET /api/v1/categories` でカテゴリの ID を確認
3. `POST /api/v1/listings` で下書きを作る（入力例は [出品 API](docs/api/listings.md)）
4. `POST /api/v1/listings/{id}/publish` に `{"expectedVersion": 1}` を送って公開
5. `GET /api/v1/listings` で一覧に出ることを確認（ログインしていなくても見られる）

### 入札を試す

1. 別の名前（例: `buyerA`）で開発用ログインし直す（出品者は自分の出品に入札できない）
2. `POST /api/v1/listings/{id}/bids` に `{"amountYen": 700}` を送る。ヘッダー `Idempotency-Key` に任意の文字列（例: `try-1`）が必要
3. さらに別の名前（例: `buyerB`）で `{"amountYen": 500}` を入札すると、自動入札で `buyerA` が最高額入札者のまま、現在の価格が 510円になる（`result: "outbid"`）
4. 即決価格を設定した出品に、即決価格以上で入札すると `result: "won"` になり、取引が作られる

詳しくは [入札 API](docs/api/bids.md) を参照してください。

別の会員として試したいときは、別の名前でログインし直します。

止めるときは `Ctrl+C`、片付けるときは `docker compose down` を実行します。テストやマイグレーションの実行方法、トラブル対応は [`docs/runbooks/local-backend.md`](docs/runbooks/local-backend.md) を見てください。

## 静的デモの起動方法

`index.html` をブラウザで開くか、リポジトリのルートで静的ファイルサーバーを起動してください。

```powershell
py -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。商品画像URLにはHTTPSのURLを指定してください。

**API と同時に動かす場合はポートが重なります。** `py -m http.server 5500` のように別の番号で起動するか、`.env` の `API_PORT` を変えてください。詳しくは [`docs/runbooks/local-prototype.md`](docs/runbooks/local-prototype.md) を参照してください。

### 静的デモの実装範囲と制約

- 商品一覧、キーワード検索、カテゴリ、並び替え、商品詳細、ウォッチ、デモ入札、ブラウザ内の出品保存を実装しています。
- 出品、ウォッチ、入札は `localStorage` に保存され、同一ブラウザ内でのみ保持されます。ログインフォームはデモ案内のみで、入力情報は保存しません。
- 入札処理・オークション終了・落札・取引・通知はサーバーに接続されていません。複数ユーザー間の同期、Google認証、画像アップロード、管理機能、決済はありません。実際の取引や決済は発生しません。
- サンプル出品は画面確認用の架空データです。外部画像は使わず、CSSの図形とアイコンで表示します。
- このプロトタイプを本番取引に使用しないでください。サーバー基準の時刻、DBトランザクションによる入札直列化、冪等性、終了確定、権限検証を備えたAPIとDBが別途必要です。

## 次の実装段階

MVPの本番相当化には、Google OIDCログインの実装、DBスキーマとマイグレーション、出品画像の検査付きアップロード、入札の原子性と競合テスト、終了処理と冪等な取引作成、通知Outbox、通報・運営監査、運用監視・バックアップ、法務・決済・本人確認設計が必要です。決済を伴う本番公開は、これらの運用準備が整うまで行いません。
