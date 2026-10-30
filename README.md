# めぐる市 — オークションMVP

個人間（C2C）オンラインオークションサービスを、3人チームで学びながら段階的に作るプロジェクトです。

- 全体方針：[`AGENTS.md`](AGENTS.md)
- 開発の進め方（ブランチ・PR のルール）：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- 要件・設計・ADR：[`docs/`](docs/README.md)

## 現在の状態

| 部分 | 状態 |
|---|---|
| フロントエンド | 静的なデモ（`index.html` / `styles.css` / `app.js`）。サーバーとはまだ接続していない |
| バックエンド API | FastAPI の雛形（`apps/api/`）。今は `/health` だけ（[ADR-0001](docs/architecture/adr/0001-backend-framework.md)） |
| データベース | 開発初期は SQLite3、本番前に PostgreSQL へ移行（[ADR-0006](docs/architecture/adr/0006-database-sqlite-to-postgresql.md)） |
| 認証 | Google ログインの設計のみ（[ADR-0005](docs/architecture/adr/0005-google-only-authentication.md)、[AUTH-001](docs/architecture/auth-001-google-login-design.md)）。未実装 |

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
# 1. 環境変数のファイルを作る（最初の1回だけ。値は空のままでも起動できる）
Copy-Item .env.example .env

# 2. 起動する（初回はイメージのビルドに数分かかる）
docker compose up --build
```

ブラウザで次を開いて確認します。

- http://localhost:8000/health → `{"status":"ok","database":"sqlite"}` と表示されれば成功
- http://localhost:8000/docs → API ドキュメント（FastAPI が自動で作る画面）

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
