# apps/api — バックエンド API（FastAPI）

めぐる市のバックエンド API です。起動の基本手順はリポジトリ直下の [`README.md`](../../README.md)、詳しい手順とトラブル対応は [`docs/runbooks/local-backend.md`](../../docs/runbooks/local-backend.md) を参照してください。

- フレームワーク：FastAPI（[ADR-0001](../../docs/adr/0001-backend-framework.md)）
- データベース：開発初期は SQLite3、本番前に PostgreSQL へ移行（[ADR-0006](../../docs/adr/0006-database-sqlite-to-postgresql.md)）
- ORM / マイグレーション：SQLAlchemy 2.x + Alembic（ADR-0006）

## フォルダ構成

```text
apps/api/
├── Dockerfile
├── pyproject.toml       # 依存パッケージ（dependencies と dev 用）
├── alembic.ini          # Alembic の設定（Windows で読めるよう ASCII 文字だけで書く）
├── alembic/             # マイグレーション
│   ├── env.py           # 接続先は app.config から読む。SQLite3 用に batch モード
│   └── versions/        # マイグレーションファイル（0001, 0002 … の連番）
├── app/
│   ├── main.py          # FastAPI のアプリ本体（create_app で組み立てる）
│   ├── config.py        # 環境変数の読み込みと、危険な設定の起動前チェック
│   ├── db.py            # DB 接続、UTC 日時の型、制約の命名規則
│   ├── errors.py        # 共通のエラー形式 {"error": {"code", "message", "details"}}
│   ├── schemas.py       # API の入出力の共通設定（JSON は camelCase）
│   ├── locking.py       # オークションの悲観ロック（SQLite3 と PostgreSQL の違いをここに閉じ込める）
│   ├── models/          # テーブル定義（user.py：会員・認証・セッション、listing.py：カテゴリ・出品・オークション、bid.py：入札・冪等性の記録、order.py：取引）
│   ├── auth/            # セッション、ログイン中の会員の取り出し、/me・ログアウト、開発用ログイン
│   ├── listings/        # 出品 API（schemas.py：入出力、service.py：業務ルール、router.py：URL）
│   ├── bids/            # 入札 API（pricing.py：入札単位・自動入札の計算、service.py：受付の手順、router.py：URL）
│   ├── auctions/        # 終了処理・早期終了・自分の取引一覧（service.py：終了の判定、router.py：URL）
│   └── jobs/            # 定期実行・手動実行する処理（finalize.py：終了処理。python -m app.jobs.finalize）
└── tests/               # pytest のテスト（conftest.py がテスト専用の DB を用意する）
```

## よく使うコマンド（Docker Compose）

リポジトリ直下で実行します。

```powershell
# テストを実行する
docker compose run --rm api pytest

# マイグレーションを適用する
docker compose run --rm api alembic upgrade head

# モデルを変えたあと、マイグレーションファイルを自動生成する（--rev-id は次の連番）
docker compose run --rm api alembic revision --autogenerate --rev-id 0002 -m "add bids table"
```

自動生成したマイグレーションは必ず中身を確認し、PR に含めてください。テストは Alembic でテーブルを作るので、マイグレーションの間違いはテストで分かります。

## Docker を使わずに動かす場合

Python 3.11 以上が必要です。`apps/api` フォルダで実行します。

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"

pytest                      # テスト（テスト専用の一時 DB を使う）

# ローカル開発環境として動かす（指定しないと本番扱いになり、開発用ログインが使えない）
$env:APP_ENV = "local"
$env:DEV_LOGIN_ENABLED = "true"
alembic upgrade head            # テーブルを作る
uvicorn app.main:app --reload   # http://localhost:8000 で起動
```

環境変数 `DATABASE_URL` を指定しないと、`apps/api/app.sqlite3` に DB ファイルが作られます（Git には入りません）。

## 環境変数

| 名前 | 意味 | 既定値 |
|---|---|---|
| `DATABASE_URL` | DB の接続先（SQLAlchemy の URL 形式） | Docker：`sqlite:////data/app.sqlite3`／Docker なし：`sqlite:///./app.sqlite3` |
| `APP_ENV` | 実行環境。`local` のときだけ開発用の機能を使える | Docker：`local`／Docker なし：`production`（安全のため） |
| `DEV_LOGIN_ENABLED` | 開発用ログイン（AUTH-002）。`APP_ENV=local` 以外で `true` にすると起動を拒否する | Docker：`true`／Docker なし：`false` |
| `SESSION_TTL_HOURS` | ログインセッションの有効期間（時間） | `720`（30日、仮の値） |
| `FINALIZER_INTERVAL_SECONDS` | 終了処理を API サーバーの中で実行する間隔（秒）。`0` で止める | `30` |
| `GOOGLE_CLIENT_ID` など | Google ログイン（AUTH-001）用。まだ使っていない | なし |

空の値（`DEV_LOGIN_ENABLED=` など）は「未指定」として扱い、既定値を使います。

見本はリポジトリ直下の [`.env.example`](../../.env.example) にあります。秘密情報は `.env` に書き、コミットしないでください。

## 開発のルール（ADR-0006 より）

- DB 固有の機能をアプリのコードに直接書かない。SQLAlchemy を通して書く。
- 金額は整数（円）、日時は UTC で保存する。
- 入札を受け付けるときのロックは、SQLite3 と PostgreSQL の違いを吸収する関数1か所にまとめる。
- マイグレーションは必ず Alembic で作り、PR に含める。マイグレーションの中でアプリのコード（`app.*`）を import しない。
- 日時の列は `app.db.UTCDateTime` を使う（タイムゾーンのない日時は保存時にエラーになる）。
- ログインが必要な API は `Depends(get_current_user)`（`app/auth/deps.py`）で会員を受け取る。ログイン方式（Google / 開発用）を意識しない。ゲストも使える API は `get_optional_user`。
- エラーは `app.errors.ApiError(status, code, message, details)` を raise する。`HTTPException` は使わない（形式がそろわないため）。
- JSON の入出力のモデルは `app.schemas.ApiModel` を継承する（Python は snake_case、JSON は camelCase）。
- 同じオークションの状態を変える処理（取り下げ・入札・終了・運営停止）は、最初に `app.locking.lock_auction` でロックを取ってから状態を確認する。
- 権限のない対象には 404 を返す（存在を知られないため）。
