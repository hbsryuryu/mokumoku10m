# ドキュメント案内

このディレクトリには、オークションMVPの要件、設計判断、API案、セキュリティ方針、運用手順を記録します。現時点の実装は静的フロントエンドのプロトタイプであり、API・DB・認証・決済はありません。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`product/`](product/) | 要件・業務ルール・画面・未決事項 |
| [`architecture/`](architecture/) | 全体構成・ドメインモデル・ADR |
| [`api/`](api/) | API仕様案（OpenAPI等） |
| [`security/`](security/) | セキュリティ・プライバシー方針 |
| [`runbooks/`](runbooks/) | ローカル確認・本番準備手順 |

## 文書一覧

- [MVP要件と受け入れ条件](product/mvp-requirements.md)
- [MVPスコープ](product/mvp-scope.md)
- [オークション業務ルール](product/auction-rules.md)
- [画面一覧](product/screens.md)
- [未決事項](product/open-questions.md)
- [全体構成](architecture/overview.md)、[ドメインモデル](architecture/domain-model.md)
- [ADR-0001: バックエンドフレームワーク](architecture/adr/0001-backend-framework.md)（提案中）
- [ADR-0001: 静的フロントエンドプロトタイプ](architecture/ADR-0001-prototype-scope.md)（採用、プロトタイプ範囲）
- [ADR-0002: 本番技術選定の保留](architecture/ADR-0002-production-stack-pending.md)（提案）
- [API設計案](api/openapi.md)、[API文書案内](api/README.md)
- [セキュリティ・プライバシー方針](security/security-and-privacy.md)、[初期セキュリティ方針](security/policy.md)
- [ローカル運用手順](runbooks/local-prototype.md)、[本番準備](runbooks/production-readiness.md)、[運用文書案内](runbooks/README.md)

## 書き方と優先順位

- 日本語で記録し、ファイル名は英小文字のケバブケースを基本とします。
- 未確定の内容は「未決」「TBD」「将来案」と明記し、確定仕様として実装しません。
- 全体方針は [`../AGENTS.md`](../AGENTS.md) を参照します。設計判断は `architecture/adr/` に記録します。
- 要件とルールは `product/`、API・セキュリティ・運用の補足は各ディレクトリの文書を参照します。
- 現行プロトタイプの範囲は採用状態のADR-0001（静的フロントエンド）とREADMEに記載しています。バックエンド候補のADR-0001は別の採番系列で既存提案として保持し、未採用です。
