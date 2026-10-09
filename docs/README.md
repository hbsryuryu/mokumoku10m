# docs

プロジェクトの設計・仕様ドキュメント置き場です。全体方針は [`../AGENTS.md`](../AGENTS.md) を参照してください。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`product/`](product/) | 要件・業務ルール・画面・未決事項 |
| [`architecture/`](architecture/) | 全体構成・ドメインモデル・ADR（設計判断の記録） |
| [`api/`](api/) | API 仕様（OpenAPI 等） |
| [`security/`](security/) | セキュリティ・プライバシー方針 |
| [`runbooks/`](runbooks/) | 障害対応・運用手順 |

## 書き方ルール

- 日本語で書く。ファイル名は英小文字のケバブケース（例: `auction-rules.md`）。
- 未確定の内容は **「TBD」** または **「仮定:」** と明記し、勝手に確定事項として書かない。
- 設計判断は `architecture/adr/` に ADR として残す（テンプレート: [`architecture/adr/template.md`](architecture/adr/template.md)）。
- 仕様やルールを変えたら、関連するドキュメントも同じ PR で更新する。
