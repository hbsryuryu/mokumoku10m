# 未決事項

> 出典: AGENTS.md 2.3。決まったら ADR を作成し、このリストからリンクする。

| # | 項目 | 担当 | 期限 | 状態 | ADR |
|---|---|---|---|---|---|
| 1 | マネタイズ方法（落札手数料・出品手数料等）と税の扱い | TBD | TBD | 未着手 | |
| 2 | 決済プロバイダーと入金・出金フロー | TBD | TBD | 未着手 | |
| 3 | 本人確認（KYC）が必要な条件と出品制限 | TBD | TBD | 未着手 | |
| 4 | キャンセル・返品・返金・未払い・配送事故への対応 | TBD | TBD | 未着手 | |
| 5 | 禁止商品・年齢制限・通報・アカウント停止の基準 | TBD | TBD | 未着手 | |
| 6 | 終了時の延長・自動入札・同額入札 | プロダクトオーナー | 決定済み | MVP方針決定済み: 延長なし・自動入札対象外・受付順で優先 | [ADR-0003](../architecture/ADR-0003-auction-operating-rules.md) |
| 7 | インフラ（クラウド・監視・メール送信事業者） | TBD | TBD | 未着手 | |
| 8 | バックエンドフレームワーク（Hono / FastAPI） | TBD | TBD | 検討中 | [ADR-0001](../architecture/adr/0001-backend-framework.md) |
| 9 | 認証基盤製品・セッション有効期間 | プロダクト/技術担当 | TBD | Google OIDCのみと決定。製品とセッション運用は未決 | [ADR-0004](../architecture/ADR-0004-google-only-authentication.md) |
