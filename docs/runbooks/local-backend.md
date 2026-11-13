# ローカル開発手順（バックエンド API）

バックエンド API（`apps/api/`、FastAPI）を Docker Compose で動かす手順です。画面も同じAPIサーバーから配信します。操作方法はルートのREADMEを参照してください。旧静的デモとの違いは [`local-prototype.md`](local-prototype.md) を参照してください。

## 前提

- Docker Desktop をインストールし、起動しておく（Windows ではタスクバーにクジラのアイコンが出ていれば起動中）
- コマンドはリポジトリ直下（`compose.yaml` がある場所）で実行する
- DB は SQLite3（[ADR-0006](../adr/0006-database-sqlite-to-postgresql.md)）。DB サーバーのインストールは不要

## 初回の準備

```powershell
Copy-Item .env.example .env
```

`.env` には `APP_ENV=local` と `DEV_LOGIN_ENABLED=true` が入っています（開発用ログインを使うため）。ほかの値は空のままで起動できます。`.env` は Git にコミットしません（`.gitignore` 済み）。

## 起動・停止

| やりたいこと | コマンド |
|---|---|
| 起動する（ログを表示したまま） | `docker compose up --build` |
| 裏で起動する | `docker compose up -d --build` |
| ログを見る | `docker compose logs -f api` |
| 停止する | `Ctrl+C`（裏で起動した場合は `docker compose stop`） |
| コンテナを片付ける（DB は残る） | `docker compose down` |
| **DB も含めて全部消す** | `docker compose down -v`（SQLite3 のデータが消えます） |

`--build` は `pyproject.toml`（依存パッケージ）を変えたときに必要です。Python のコードを変えただけなら、自動で再読み込みされます。

起動するたびに `alembic upgrade head`（マイグレーションの適用）が自動で実行されます。新しいマイグレーションを取り込んだら、起動し直すだけでテーブルが更新されます。

## 動作確認

- http://localhost:8000/ → API接続済みの画面（ログイン・出品・検索）
- http://localhost:8000/health → `{"status":"ok","database":"sqlite","env":"local"}`
- http://localhost:8000/docs → API ドキュメント（ここから API を試せる）

## 開発用ログイン（AUTH-002）

ログインは Google のみ（ADR-0005）ですが、Google ログイン（AUTH-001）はまだ実装されていません。ローカルでは開発用ログインで会員になって、出品・入札などを試します（[ADR-0008](../adr/0008-mvp-implementation-provisional-decisions.md)）。

1. http://localhost:8000/docs を開く
2. `POST /api/v1/dev/login` で `{"display_name": "seller1"}` を送る → ログイン状態になる（Cookie `session` が保存される）
3. `GET /api/v1/me` → ログイン中の会員が表示される
4. `POST /api/v1/auth/logout` → ログアウト

- 同じ表示名でログインすると、同じ会員になります。出品者と入札者を試すときは、`seller1` と `buyer1` のように名前を分けます。
- 開発用ログインは `APP_ENV=local` かつ `DEV_LOGIN_ENABLED=true` のときだけ存在します。`APP_ENV` が `local` 以外で `DEV_LOGIN_ENABLED=true` にすると、**安全のためアプリが起動を拒否します。**

## テスト・マイグレーション

```powershell
docker compose run --rm api pytest
docker compose run --rm api alembic upgrade head
docker compose run --rm api alembic revision --autogenerate --rev-id 0002 -m "add bids table"
```

- テストは一時フォルダのテスト専用 DB を使うので、開発用の DB のデータは消えません。
- テーブルの設計は [`database-schema.md`](../architecture/database-schema.md) を参照してください。

## データの置き場所

SQLite3 の DB ファイルは、Docker の named volume `api-data` の中（コンテナ内の `/data/app.sqlite3`）にあります。

- Windows のフォルダに直接置かないのは、ファイルロックが不安定になることがあるためです（ADR-0006）。
- 中身を確認したいとき：`docker compose run --rm api python -c "import sqlite3; print(sqlite3.connect('/data/app.sqlite3').execute('select name from sqlite_master').fetchall())"`

## トラブル対応

| 症状 | 原因と対処 |
|---|---|
| 起動直後に停止し `ModuleNotFoundError: No module named 'app'` が出る | Alembicからアプリを参照できていません。`apps/api/alembic.ini` の `prepend_sys_path = %(here)s` を確認し、`docker compose up -d --build` で再起動してください。DBの削除は不要です |
| `error during connect ... docker daemon is not running` | Docker Desktop が起動していません。起動してから再実行してください |
| `port is already allocated` / `ポートが使用中` | 8000番を別のプログラム（静的デモの `py -m http.server 8000` など）が使っています。止めるか、`.env` の `API_PORT=8001` のように変えてください |
| 依存パッケージを追加したのに `ModuleNotFoundError` | `docker compose up --build` でイメージを作り直してください |
| `alembic` で `UnicodeDecodeError: 'cp932'` | `alembic.ini` に日本語などの ASCII 以外の文字が入っています。Windows では cp932 で読まれるため、`alembic.ini` は ASCII 文字だけで書いてください |
| DB を最初からやり直したい | `docker compose down -v` で volume ごと消してから起動し直してください |
| 起動時のマイグレーション `0002` で `NOT NULL constraint failed` / `Cannot add a NOT NULL column` | 出品の行がある古い DB に、必須の列（開始価格・開催期間）を追加しようとしています。開発用の DB なので `docker compose down -v` で作り直してください |
| 起動時に `UnsafeSettingsError: DEV_LOGIN_ENABLED=true は APP_ENV=local のときだけ使えます` | `APP_ENV` が `local` 以外なのに開発用ログインが有効になっています。`.env` の `APP_ENV=local` を確認してください（本番では `DEV_LOGIN_ENABLED` を入れない） |
| `/api/v1/dev/login` が 404 になる | `APP_ENV=local` と `DEV_LOGIN_ENABLED=true` の両方が必要です。`docker compose up` で起動し直してください |
| `/api/v1/me` が 401 になる | ログインしていないか、セッションの期限切れ・ログアウト済みです。開発用ログインでログインし直してください |

## PostgreSQL に移行するとき（将来）

ADR-0006 の「移行する条件」に当てはまったら、`compose.yaml` のコメントアウトしてある `db` サービスを有効にし、`DATABASE_URL` を PostgreSQL の URL に変えます。移行作業は別の PR で行い、この手順書も更新してください。

## 画面接続の自動検証

API・静的配信・接続元チェックは `docker compose exec -T api pytest -q` で確認します。
ブラウザ検証は `tests/frontend-flow.cjs`（PlaywrightとEdgeが必要）です。既存DBを変更しないよう、一時DBのコンテナを起動します。

```powershell
docker compose run -d --no-deps --name mokumoku10m-frontend-check -p 127.0.0.1:8001:8000 -e DATABASE_URL=sqlite:////tmp/frontend-check.sqlite3 api
# /health が応答するまで待つ
Invoke-RestMethod http://127.0.0.1:8001/health
npm install --prefix "$env:TEMP/mokumoku10m-browser-check" playwright --no-audit --no-fund
$env:NODE_PATH = "$env:TEMP/mokumoku10m-browser-check/node_modules"
$env:FRONTEND_TEST_URL = 'http://127.0.0.1:8001'
node tests/frontend-flow.cjs
docker stop mokumoku10m-frontend-check
docker rm mokumoku10m-frontend-check
```

検証用Playwrightは一時フォルダへインストールし、アプリの実行依存には追加しません。テスト用DBはコンテナの `/tmp` に保存され、上記コンテナを削除すると消えます。開発用の `api-data` ボリュームは削除しません。
