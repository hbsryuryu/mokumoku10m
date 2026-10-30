# apps/api — バックエンド API（FastAPI）

めぐる市のバックエンド API です。起動の基本手順はリポジトリ直下の [`README.md`](../../README.md)、詳しい手順とトラブル対応は [`docs/runbooks/local-backend.md`](../../docs/runbooks/local-backend.md) を参照してください。

- フレームワーク：FastAPI（[ADR-0001](../../docs/architecture/adr/0001-backend-framework.md)）
- データベース：開発初期は SQLite3、本番前に PostgreSQL へ移行（[ADR-0006](../../docs/architecture/adr/0006-database-sqlite-to-postgresql.md)）
- ORM / マイグレーション：SQLAlchemy 2.x + Alembic（ADR-0006 で合意待ち）

## フォルダ構成

```text
apps/api/
├── Dockerfile
├── pyproject.toml       # 依存パッケージ（dependencies と dev 用）
├── alembic.ini          # Alembic の設定（Windows で読めるよう ASCII 文字だけで書く）
├── alembic/             # マイグレーション
│   ├── env.py           # 接続先は app.config から読む。SQLite3 用に batch モード
│   └── versions/        # マイグレーションファイル（まだなし）
├── app/
│   ├── main.py          # FastAPI のアプリ本体（今は /health のみ）
│   ├── config.py        # 環境変数の読み込み
│   └── db.py            # DB 接続（SQLite3 の PRAGMA 設定を含む）
└── tests/               # pytest のテスト
```

## よく使うコマンド（Docker Compose）

リポジトリ直下で実行します。

```powershell
# テストを実行する
docker compose run --rm api pytest

# マイグレーションを適用する
docker compose run --rm api alembic upgrade head

# モデルを変えたあと、マイグレーションファイルを自動生成する
docker compose run --rm api alembic revision --autogenerate -m "変更内容"
```

## Docker を使わずに動かす場合

Python 3.11 以上が必要です。`apps/api` フォルダで実行します。

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"

pytest                      # テスト
uvicorn app.main:app --reload   # http://localhost:8000 で起動
```

環境変数 `DATABASE_URL` を指定しないと、`apps/api/app.sqlite3` に DB ファイルが作られます（Git には入りません）。

## 環境変数

| 名前 | 意味 | 既定値 |
|---|---|---|
| `DATABASE_URL` | DB の接続先（SQLAlchemy の URL 形式） | Docker：`sqlite:////data/app.sqlite3`／Docker なし：`sqlite:///./app.sqlite3` |
| `GOOGLE_CLIENT_ID` など | Google ログイン（AUTH-001）用。まだ使っていない | なし |

見本はリポジトリ直下の [`.env.example`](../../.env.example) にあります。秘密情報は `.env` に書き、コミットしないでください。

## 開発のルール（ADR-0006 より）

- DB 固有の機能をアプリのコードに直接書かない。SQLAlchemy を通して書く。
- 金額は整数（円）、日時は UTC で保存する。
- 入札を受け付けるときのロックは、SQLite3 と PostgreSQL の違いを吸収する関数1か所にまとめる。
- マイグレーションは必ず Alembic で作り、PR に含める。
