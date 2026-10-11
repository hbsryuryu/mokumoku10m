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
- [オークション業務ルール](product/auction-rules.md)
- [画面一覧](product/screens.md)
- [未決事項](product/open-questions.md)

### architecture
- [全体構成](architecture/overview.md)、[ドメインモデル](architecture/domain-model.md)
- ADR（[テンプレート](architecture/adr/template.md)）

| 番号 | タイトル | 状態 |
|---|---|---|
| [ADR-0001](architecture/adr/0001-backend-framework.md) | バックエンドフレームワーク（Hono / FastAPI） | 提案中 |
| [ADR-0002](architecture/adr/0002-prototype-scope.md) | 最初の成果物を静的フロントエンドにする | 採用（プロトタイプ範囲） |
| [ADR-0003](architecture/adr/0003-production-stack-pending.md) | 本番技術スタックと未決プロダクト事項を保留する | 提案 |

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
