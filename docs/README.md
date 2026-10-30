# ドキュメント案内

このディレクトリには、オークションMVPの要件、設計判断、API案、セキュリティ方針、運用手順を記録します。現時点の実装は静的フロントエンドのプロトタイプであり、API・DB・認証・決済はありません。

全体方針は [`../AGENTS.md`](../AGENTS.md)、ブランチ・PR などの開発の進め方は [`../CONTRIBUTING.md`](../CONTRIBUTING.md) を参照してください。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`product/`](product/) | 要件・業務ルール・画面・未決事項 |
| [`architecture/`](architecture/) | 全体構成・ドメインモデル・ADR（`architecture/adr/` に集約） |
| [`api/`](api/) | API仕様案（OpenAPI等） |
| [`security/`](security/) | セキュリティ・プライバシー方針 |
| [`runbooks/`](runbooks/) | ローカル確認・本番準備手順 |

## 文書一覧

### product
- [MVPスコープ](product/mvp-scope.md)：本番MVPの機能範囲
- [プロトタイプ要件と受け入れ条件](product/prototype-requirements.md)：現在の静的プロトタイプの範囲
- [オークションサイト仕様書](product/auction-site-spec.md)：本番MVPの要求仕様
- [AUTH-001: Google ログイン（要件）](product/auth-001-google-login.md)：提案中
- [オークション業務ルール](product/auction-rules.md)
- [画面一覧](product/screens.md)
- [未決事項](product/open-questions.md)

### architecture
- [全体構成](architecture/overview.md)、[ドメインモデル](architecture/domain-model.md)
- [AUTH-001: Google ログイン（設計）](architecture/auth-001-google-login-design.md)：提案中
- ADR（[テンプレート](architecture/adr/template.md)）

| 番号 | タイトル | 状態 |
|---|---|---|
| [ADR-0001](architecture/adr/0001-backend-framework.md) | バックエンドフレームワーク（FastAPI。Hono はサブ候補） | 採用 |
| [ADR-0002](architecture/adr/0002-prototype-scope.md) | 最初の成果物を静的フロントエンドにする | 採用（プロトタイプ範囲） |
| [ADR-0003](architecture/adr/0003-production-stack-pending.md) | 本番技術スタックと未決プロダクト事項を保留する | 提案 |
| [ADR-0004](architecture/adr/0004-auction-operating-rules.md) | MVPオークションの入札・終了・出品変更ルール | 採用 |
| [ADR-0005](architecture/adr/0005-google-only-authentication.md) | Google認証に一本化する | 採用 |
| [ADR-0006](architecture/adr/0006-database-sqlite-to-postgresql.md) | データベースは SQLite3 で始め、PostgreSQL に移行する | 採用（ORM は合意待ち） |

### その他
- [API設計案](api/openapi.md)、[API文書案内](api/README.md)
- [セキュリティ・プライバシー方針](security/security-and-privacy.md)
- [ローカル運用手順](runbooks/local-prototype.md)、[本番準備](runbooks/production-readiness.md)、[運用文書案内](runbooks/README.md)

## 書き方ルール

- 日本語で記録し、ファイル名は英小文字のケバブケースにする。
- 未確定の内容は「未決」「TBD」「将来案」と明記し、確定仕様として実装しない。
- 設計判断は `architecture/adr/NNNN-タイトル.md` に記録する。番号は既存の最大番号 +1 とし、作成前に `main` を最新化して重複がないか確認する。
- 同じテーマの文書を新しく作る前に、既存の文書がないか確認し、あれば追記する。
- 仕様やルールを変えたら、関連する文書も同じ PR で更新する。
