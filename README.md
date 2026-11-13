# めぐる市 — オークションMVP

個人間（C2C）オンラインオークションサービスを、3人チームで学びながら段階的に作るプロジェクトです。

- 全体方針：[`AGENTS.md`](AGENTS.md)
- 開発の進め方（ブランチ・PR のルール）：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- 要件・設計・ADR：[`docs/`](docs/README.md)

## 現在の状態

| 部分 | 状態 |
|---|---|
| フロントエンド | HTML/CSS/JavaScript。APIと同じURLで配信し、ログイン・検索・出品をバックエンドに接続 |
| バックエンド API | FastAPI（`apps/api/`、[ADR-0001](docs/adr/0001-backend-framework.md)）。開発用ログイン・ログアウト・`/me`、**出品**（[出品 API](docs/api/listings.md)）、**入札**（自動入札・自動延長・即決、[入札 API](docs/api/bids.md)）、**終了・落札**（30秒ごとの終了処理・早期終了・取引一覧、[終了処理](docs/api/auctions.md)）まで。**出品 → 入札 → 落札が API で一周する** |
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

### 落札を試す

- **早期終了**：出品者でログインし、`POST /api/v1/listings/{id}/end-early` に `{"expectedVersion": 2}` を送ると、その時点の最高額入札者が落札する
- **時間切れ**：API サーバーが30秒ごとに終了処理を実行する（開催期間は最短13時間なので、試すときは早期終了が手軽）。手動で実行するときは `docker compose run --rm api python -m app.jobs.finalize`
- **結果の確認**：落札者・出品者それぞれで `GET /api/v1/me/orders` を開く

詳しくは [終了処理・早期終了](docs/api/auctions.md) を参照してください。

別の会員として試したいときは、別の名前でログインし直します。

止めるときは `Ctrl+C`、片付けるときは `docker compose down` を実行します。テストやマイグレーションの実行方法、トラブル対応は [`docs/runbooks/local-backend.md`](docs/runbooks/local-backend.md) を見てください。

## フロント画面の起動と操作

`docker compose up -d --build` 後、http://localhost:8000/ を開きます（`API_PORT` を変更した場合はそのポート）。画面とAPIは同じオリジンで動き、HttpOnly Cookieのセッションを使用します。別の静的サーバーや `index.html` の直接表示ではAPIに接続できません。

1. 「ログイン」で開発用の表示名を入力する。同じ表示名は同じ会員です。
2. 「出品する」で商品情報・送料負担・配送方法・開催期間（13〜179時間）を入力する。
3. 「下書き保存」または「保存して公開する」を選ぶ。保存後は「自分の出品」に表示される。
4. 下書きの詳細から編集・公開できる。公開中の詳細から取り下げできる（入札がない場合）。
5. カテゴリを選ぶと公開一覧へ戻り、検索・並び替え・追加読み込みを利用できる。

- 商品・会員・出品状態はAPIのDBに保存され、再読み込みや別ブラウザでも共有されます。ブラウザの旧デモデータは読み込みません。
- この画面では入札・ウォッチ・画像登録は利用できません。入札APIは別途実装済みですが、今回の画面接続には含めません。資金移動は発生しません。
- 開発用画面の配信と設定APIは `APP_ENV=local` のときだけ有効。ログインは `DEV_LOGIN_ENABLED=true` のときだけ利用できます。
- 画面配信は `index.html`・`app.js`・`styles.css` の固定ファイルだけに限定します。
- 通信結果が不明な下書き作成は自動再送しません。「自分の出品」で保存状況を確認してください。競合時は最新の下書きを開き直します。

## 次の実装段階

MVPの本番相当化には、Google OIDCログインの実装、DBスキーマとマイグレーション、出品画像の検査付きアップロード、入札の原子性と競合テスト、終了処理と冪等な取引作成、通知Outbox、通報・運営監査、運用監視・バックアップ、法務・決済・本人確認設計が必要です。決済を伴う本番公開は、これらの運用準備が整うまで行いません。
