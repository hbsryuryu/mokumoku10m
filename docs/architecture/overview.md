# 全体構成

> 出典: AGENTS.md 3章。表は初期候補であり、採用済みの決定ではない。確定したものは ADR を参照。

| 領域 | 初期候補 | 決定 |
|---|---|---|
| フロントエンド | Next.js + TypeScript | TBD |
| UI | Tailwind CSS + コンポーネントライブラリ | TBD |
| バックエンド | Python + FastAPI（モジュラーモノリス）。Hono はサブ候補 | **FastAPI に決定**（[ADR-0001](adr/0001-backend-framework.md)） |
| データベース | PostgreSQL | TBD |
| ORM / Migration | SQLAlchemy + Alembic、SQLModel 等（FastAPI 採用に伴い Prisma / Drizzle から変更） | TBD |
| キャッシュ・ジョブ | Redis + Python のワーカー（必要時） | TBD |
| 画像保存 | S3 互換オブジェクトストレージ | TBD |
| 検索 | 当初は PostgreSQL 全文検索 | TBD |
| 認証 | 実績のある認証基盤／ライブラリ | Google 認証（OIDC）。ライブラリは Python 向け（候補: Authlib）から選定（[AUTH-001](auth-001-google-login-design.md)） |
| デプロイ | マネージド環境（staging / production 分離） | TBD |

## 構成図

TBD

## モジュール境界

`auth / users / listings / auctions / bids / orders / payments / notifications / moderation`
