# ローカル開発手順（バックエンド API）

バックエンド API（`apps/api/`、FastAPI）を Docker Compose で動かす手順です。静的デモの手順は [`local-prototype.md`](local-prototype.md) を参照してください。

## 前提

- Docker Desktop をインストールし、起動しておく（Windows ではタスクバーにクジラのアイコンが出ていれば起動中）
- コマンドはリポジトリ直下（`compose.yaml` がある場所）で実行する
- DB は SQLite3（[ADR-0006](../architecture/adr/0006-database-sqlite-to-postgresql.md)）。DB サーバーのインストールは不要

## 初回の準備

```powershell
Copy-Item .env.example .env
```

`.env` の値は空のままでも起動できます。`.env` は Git にコミットしません（`.gitignore` 済み）。

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

## 動作確認

- http://localhost:8000/health → `{"status":"ok","database":"sqlite"}`
- http://localhost:8000/docs → API ドキュメント

## テスト・マイグレーション

```powershell
docker compose run --rm api pytest
docker compose run --rm api alembic upgrade head
docker compose run --rm api alembic revision --autogenerate -m "変更内容"
```

## データの置き場所

SQLite3 の DB ファイルは、Docker の named volume `api-data` の中（コンテナ内の `/data/app.sqlite3`）にあります。

- Windows のフォルダに直接置かないのは、ファイルロックが不安定になることがあるためです（ADR-0006）。
- 中身を確認したいとき：`docker compose run --rm api python -c "import sqlite3; print(sqlite3.connect('/data/app.sqlite3').execute('select name from sqlite_master').fetchall())"`

## トラブル対応

| 症状 | 原因と対処 |
|---|---|
| `error during connect ... docker daemon is not running` | Docker Desktop が起動していません。起動してから再実行してください |
| `port is already allocated` / `ポートが使用中` | 8000番を別のプログラム（静的デモの `py -m http.server 8000` など）が使っています。止めるか、`.env` の `API_PORT=8001` のように変えてください |
| 依存パッケージを追加したのに `ModuleNotFoundError` | `docker compose up --build` でイメージを作り直してください |
| `alembic` で `UnicodeDecodeError: 'cp932'` | `alembic.ini` に日本語などの ASCII 以外の文字が入っています。Windows では cp932 で読まれるため、`alembic.ini` は ASCII 文字だけで書いてください |
| DB を最初からやり直したい | `docker compose down -v` で volume ごと消してから起動し直してください |

## PostgreSQL に移行するとき（将来）

ADR-0006 の「移行する条件」に当てはまったら、`compose.yaml` のコメントアウトしてある `db` サービスを有効にし、`DATABASE_URL` を PostgreSQL の URL に変えます。移行作業は別の PR で行い、この手順書も更新してください。
