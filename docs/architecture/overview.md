# 全体構成

> 出典: AGENTS.md 3章。表は初期候補であり、採用済みの決定ではない。確定したものは ADR を参照。

| 領域 | 初期候補 | 決定 |
|---|---|---|
| フロントエンド | Next.js + TypeScript | TBD |
| UI | Tailwind CSS + コンポーネントライブラリ | TBD |
| バックエンド | TypeScript + Node.js（モジュラーモノリス）。Hono を候補、FastAPI を拡張として検討 | [ADR-0001](adr/0001-backend-framework.md)（検討中） |
| データベース | PostgreSQL | TBD |
| ORM / Migration | Prisma または Drizzle | TBD |
| キャッシュ・ジョブ | Redis + ワーカー（必要時） | TBD |
| 画像保存 | S3 互換オブジェクトストレージ | TBD |
| 検索 | 当初は PostgreSQL 全文検索 | TBD |
| 認証 | 実績のある認証基盤／ライブラリ | TBD |
| デプロイ | マネージド環境（staging / production 分離） | TBD |

## 構成図

TBD

## モジュール境界

`auth / users / listings / auctions / bids / orders / payments / notifications / moderation`
