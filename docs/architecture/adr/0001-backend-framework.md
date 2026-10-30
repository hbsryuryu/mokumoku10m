# ADR-0001: バックエンドフレームワーク

- 状態: 採用（FastAPI をメイン、Hono はサブ候補）
- 日付: 2026-10-10（提案）、2026-10-31（決定）
- 決定者: hbsryuryu（チームでの確認は PR で行う）

## 背景

AGENTS.md 3章では、バックエンドの初期候補を「TypeScript + Node.js（モジュラーモノリス）」としていた（採用済みの決定ではない）。
チームでは Hono（TypeScript）と FastAPI（Python）を比較してきた。

## 選択肢

1. **Hono（TypeScript）のみ**
   - 長所: AGENTS.md の初期候補と一致。フロント（Next.js）とドメイン型・バリデーション（Zod 等）を共有しやすい。軽量で学習しやすい。
   - 短所: Python のライブラリ（画像処理・データ分析等）は直接使えない。
2. **FastAPI（Python）のみ**
   - 長所: 型ヒントと Pydantic で入力検証を書け、OpenAPI を自動生成できる。Python のエコシステムが使える。
   - 短所: AGENTS.md の初期候補と言語が異なる。フロントとの型共有は OpenAPI 経由のコード生成が必要。
3. **Hono をメイン + FastAPI を拡張用の別サービス**
   - 長所: 主要な業務ロジックは TypeScript に集約しつつ、Python が得意な処理だけ切り出せる。
   - 短所: 2言語・2サービスの運用コスト。初期はモジュラーモノリス方針と衝突しやすい。

## 決定

**選択肢2（FastAPI）を採用する。** バックエンドは FastAPI のモジュラーモノリスとして作る。

**Hono はサブ候補として残す。** MVP では使わず、次のような必要が出たときに、別の ADR で採用を判断する。
- フロントの近くに置く軽い BFF（Backend for Frontend）や、エッジ環境での配信が必要になったとき
- TypeScript で型を共有したい処理が増え、OpenAPI 経由のコード生成では足りなくなったとき
- チームの得意な言語や運用体制が変わったとき

## 理由

- 型ヒントと Pydantic で入力検証を書け、OpenAPI 定義を自動生成できる。AGENTS.md 8章の「API 契約と入力バリデーションを維持する」と相性がよい。
- 画像の検査・変換など、Python のライブラリが役立つ処理がある。
- 1言語・1サービスのモジュラーモノリスにすることで、MVP の運用を単純にできる（選択肢3を採らない理由）。

## 影響

- **AGENTS.md 3章との差分**：バックエンドは「TypeScript + Node.js」から「Python + FastAPI」に変わる。ORM の初期候補（Prisma / Drizzle）は TypeScript 用なので、Python 向けに選び直す（候補: SQLAlchemy + Alembic、SQLModel。未決）。
- **フロントとの型共有**：FastAPI が出力する OpenAPI から TypeScript の型を生成する（ツールは未決）。
- **認証（AUTH-001 / Google OIDC）**：Python のライブラリ（候補: Authlib）を使う。Google の `google-auth` にある `verify_oauth2_token` は `iss` を検証しないため、使う場合は `iss` を自前で確認する。
- **ワーカー（終了処理・通知）**：Python で作る（ライブラリは未決）。
- **テスト**：pytest を基本にする（AGENTS.md 9章の入札競合テストを含む）。
- **更新した文書**：`../overview.md`、`../../product/open-questions.md` #8、`0003-production-stack-pending.md`、`../auth-001-google-login-design.md`、`../../api/README.md`、`../../README.md`、`AGENTS.md` 3章の表。

## 見直す条件

- FastAPI で入札の直列化・冪等性・終了処理の要件（AGENTS.md 5章）を満たすのが難しいと分かったとき
- 上の「Hono はサブ候補として残す」の条件に当てはまるとき
