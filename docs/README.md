# ドキュメント案内

このディレクトリには、オークションMVPの要件、設計判断、API案、セキュリティ方針、運用手順を記録します。現在は静的フロントエンドのプロトタイプと、FastAPI・SQLite3 によるバックエンドの雛形（`/health` のみ）があります。フロントエンドとAPIは未接続で、認証・決済は未実装です。実装状況は [ルートのREADME](../README.md) を参照してください。

全体方針は [`../AGENTS.md`](../AGENTS.md)、ブランチ・PR などの開発の進め方は [`../CONTRIBUTING.md`](../CONTRIBUTING.md) を参照してください。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`product/`](product/) | 要件・業務ルール・画面・未決事項 |
| [`architecture/`](architecture/) | 全体構成・ドメインモデル・各機能の詳細設計 |
| [`adr/`](adr/) | 設計判断の履歴・テンプレート |
| [`api/`](api/) | API仕様・共通契約 |
| [`security/`](security/) | セキュリティ・プライバシー方針 |
| [`runbooks/`](runbooks/) | ローカル確認・本番準備手順 |
| [`testing/`](testing/) | テスト条件・期待結果・合否判定 |

## 文書一覧

### product
- [MVPスコープ](product/mvp-scope.md)：本番MVPの機能範囲
- [未定義の機能一覧（バックログ）](product/feature-backlog.md)：要件・設計がまだない機能と優先順位（管理者、マイページ、取引メッセージ、評価など）
- [プロトタイプ要件と受け入れ条件](product/prototype-requirements.md)：現在の静的プロトタイプの範囲
- [オークションサイト仕様書](product/auction-site-spec.md)：本番MVPの要求仕様
- [Yahoo!オークションとの仕様比較](product/yahoo-auctions-alignment.md)：参考サービスの仕様（確認日つき）と、めぐる市の扱い
- [AUTH-001: Google ログイン（要件）](product/auth-001-google-login.md)：提案中
- [オークション業務ルール](product/auction-rules.md)
- [画面一覧](product/screens.md)
- [実装ロードマップ](product/roadmap.md)
- [未決事項](product/open-questions.md)

### architecture
- [全体構成](architecture/overview.md)、[ドメインモデル](architecture/domain-model.md)
- [データベースのテーブル設計](architecture/database-schema.md)：テーブル・列・制約と実装状況
- [入札・終了処理のトランザクション仕様](architecture/auction-bid-transaction.md)
- [AUTH-001: Google ログイン（設計）](architecture/auth-001-google-login-design.md)：提案中

### adr

設計判断の履歴（[テンプレート](adr/template.md)）。

| 番号 | タイトル | 状態 |
|---|---|---|
| [ADR-0001](adr/0001-backend-framework.md) | バックエンドフレームワーク（FastAPI。Hono はサブ候補） | 採用 |
| [ADR-0002](adr/0002-prototype-scope.md) | 最初の成果物を静的フロントエンドにする | 採用（プロトタイプ範囲） |
| [ADR-0003](adr/0003-production-stack-pending.md) | 本番技術スタックと未決プロダクト事項を保留する | 提案 |
| [ADR-0004](adr/0004-auction-operating-rules.md) | MVPオークションの入札・終了・出品変更ルール | 一部置き換え（入札・終了は ADR-0007） |
| [ADR-0005](adr/0005-google-only-authentication.md) | Google認証に一本化する | 採用 |
| [ADR-0006](adr/0006-database-sqlite-to-postgresql.md) | データベースは SQLite3 で始め、PostgreSQL に移行する | 採用（ORM は SQLAlchemy 2.x + Alembic） |
| [ADR-0007](adr/0007-align-with-yahoo-auctions.md) | オークションの仕様を Yahoo!オークションに合わせる | 採用（方針） |
| [ADR-0008](adr/0008-mvp-implementation-provisional-decisions.md) | 出品・入札・落札の実装を始めるための仮決め | 採用（仮決め） |
| [ADR-0009](architecture/adr/0009-fees.md) | 手数料は落札時のみ、落札価格の10%（税込）とする | 提案中 |

### その他
- [オークションサービス テスト仕様書](testing/auction-test-cases.md)：正常系・異常系・境界値・競合・主要フローと仕様確認項目
- [API仕様書](api/openapi.md)、[API文書案内](api/README.md)
- [セキュリティ・プライバシー方針](security/security-and-privacy.md)
- [ローカル開発手順（バックエンド API）](runbooks/local-backend.md)、[ローカル運用手順（静的デモ）](runbooks/local-prototype.md)、[本番準備](runbooks/production-readiness.md)、[運用文書案内](runbooks/README.md)

## 書き方ルール

- 文書は原則として `docs/<分類>/<文書>.md` に置き、分類の下にさらにフォルダを作らない。計画文書は `product/`、詳細設計は `architecture/`、設計判断の履歴は `adr/` にまとめる。
- 日本語で記録し、ファイル名は英小文字のケバブケースにする。
- 未確定の内容は「未決」「TBD」「将来案」と明記し、確定仕様として実装しない。
- 設計判断は `adr/NNNN-タイトル.md` に記録する。番号は既存の最大番号 +1 とし、作成前に `main` を最新化して重複がないか確認する。
- 同じテーマの文書を新しく作る前に、既存の文書がないか確認し、あれば追記する。
- 仕様やルールを変えたら、関連する文書も同じ PR で更新する。
