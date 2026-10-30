# 全体構成

> 出典: AGENTS.md 3章。表は初期候補であり、採用済みの決定ではない。確定したものは ADR を参照。

| 領域 | 初期候補 | 決定 |
|---|---|---|
| フロントエンド | Next.js + TypeScript | TBD |
| UI | Tailwind CSS + コンポーネントライブラリ | TBD |
| バックエンド | Python + FastAPI（モジュラーモノリス）。Hono はサブ候補 | **FastAPI に決定**（[ADR-0001](adr/0001-backend-framework.md)） |
| データベース | 開発初期は SQLite3 → staging / production の前に PostgreSQL | **決定**（[ADR-0006](adr/0006-database-sqlite-to-postgresql.md)） |
| ORM / Migration | SQLAlchemy 2.x + Alembic（SQLModel を使う場合も Alembic で管理） | 候補・合意待ち（[ADR-0006](adr/0006-database-sqlite-to-postgresql.md)） |
| キャッシュ・ジョブ | Redis + Python のワーカー（必要時） | TBD |
| 画像保存 | S3 互換オブジェクトストレージ | TBD |
| 検索 | SQLite3 の間は `LIKE` の簡易検索、PostgreSQL 移行後に全文検索 | [ADR-0006](adr/0006-database-sqlite-to-postgresql.md) |
| 認証 | 実績のある認証基盤／ライブラリ | Google 認証（OIDC）。ライブラリは Python 向け（候補: Authlib）から選定（[AUTH-001](auth-001-google-login-design.md)） |
| デプロイ | マネージド環境（staging / production 分離） | TBD |

## 構成図

TBD

## モジュール境界

`auth / users / listings / auctions / bids / orders / payments / notifications / moderation`
