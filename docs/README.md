# ドキュメント案内

このディレクトリは、オークションMVPの現在のプロトタイプ範囲と、本番化に向けた未決事項を記録します。現時点の実装は静的フロントエンドであり、API・DB・認証・決済はありません。文書中で将来のAPIや運用を説明する場合は「将来案」と明記します。

## 文書一覧

- [プロダクト要件と受け入れ条件](product/mvp-requirements.md): 対象ユーザー、画面、デモで確認できる動作、未実装範囲
- [MVP業務ルール](product/auction-rules.md): 入札・終了・取引のルール案と未決事項
- [ADR-0001 静的フロントエンドプロトタイプ](architecture/ADR-0001-prototype-scope.md): 今の実装スコープを限定する決定
- [ADR-0002 本番技術選定の保留](architecture/ADR-0002-production-stack-pending.md): 技術スタックと未決事項の扱い
- [API設計案](api/openapi.md): 将来APIのリソース・契約案。実装済みAPIではない
- [セキュリティ・プライバシー方針](security/security-and-privacy.md): プロトタイプの限界と本番化の必須要件
- [ローカル運用手順](runbooks/local-prototype.md): 起動、デモデータの扱い、トラブル対応
- [本番準備チェックリスト](runbooks/production-readiness.md): 公開判定前に完了すべき項目

## 仕様の優先順位

1. ユーザーが明示した要件とプロジェクトルートの `AGENTS.md`
2. 採用状態のADR
3. `product/` の受け入れ条件と業務ルール
4. `api/`、`security/`、`runbooks/` の設計・運用案

「未決」「将来案」と記載した項目は、承認済みのプロダクト仕様ではありません。実装で決定が必要になった場合は先にADRを更新します。
