# API 仕様

OpenAPI 定義をここに置く予定。バックエンドは FastAPI に決定した（[ADR-0001](../architecture/adr/0001-backend-framework.md)）ため、OpenAPI 定義は FastAPI のコードから自動生成し、フロントの TypeScript 型もそこから生成する方針（ツールは未決）。設計案は [`openapi.md`](openapi.md) を参照。

## 共通方針（AGENTS.md 8章）

- 入力バリデーションを必ず行い、金額・権限・時刻・ステータスはサーバーで検証する。
- エラー形式、ページネーション、並び順、時刻・通貨の表現を統一する（詳細 TBD）。
- 更新系 API は認証・認可とリソース所有者チェックを行う。入札 API は冪等性キーに対応する。
