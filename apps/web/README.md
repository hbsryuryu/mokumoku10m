# apps/web — Web フロントエンド（Next.js）

めぐる市の画面です（[ADR-0010](../../docs/adr/0010-web-frontend-nextjs.md)、細部の仮決めは [ADR-0011](../../docs/adr/0011-web-implementation-provisional-decisions.md)）。起動方法は [`docs/runbooks/local-web.md`](../../docs/runbooks/local-web.md) を参照してください。

## いまある画面

| URL | 画面 | 中身 |
|---|---|---|
| `/` | トップ | 一覧・キーワード検索・カテゴリ・並び替え（サーバー側で描画） |
| `/listings/{id}` | 商品詳細 | 現在の価格・残り時間・入札（確認画面つき）・出品者の操作（公開・早期終了・取り下げ）・落札の結果 |
| `/sell` | 出品 | 入力して公開、または下書きとして保存 |
| `/login` | ログイン | Googleログイン・初回ニックネーム設定。localでは開発用ログインも利用可能 |
| `/me` | マイページ | 自分の出品と、落札した・落札された取引 |

## フォルダ構成

```text
apps/web/
├── app/                  # 画面（App Router）
│   ├── layout.tsx        # 共通の枠（お知らせ帯・ヘッダー・フッター）
│   ├── globals.css       # 静的デモの styles.css ＋ 追加分（ADR-0011）
│   ├── page.tsx          # トップ
│   ├── listings/[id]/    # 商品詳細
│   ├── sell/ login/ me/  # 出品・ログイン・マイページ
│   └── not-found.tsx
├── components/           # 画面の部品（AuctionPanel：入札・出品者の操作・落札の結果 など）
├── lib/
│   ├── api-client.ts     # ブラウザから /api/* を呼ぶ（同じオリジン、Cookie はブラウザが送る）
│   ├── api-server.ts     # サーバー側から API を呼ぶ（受け取った Cookie を渡す）
│   ├── types.ts          # API の型（手書き）
│   └── format.ts         # 円・日本時間・残り時間の表示
└── next.config.ts        # /api/* を FastAPI に転送（API_ORIGIN）
```

## 開発のルール

- API は `/api/v1/...` を**相対 URL** で呼ぶ（Next.js が FastAPI に転送する）。API の URL を直接書かない。
- ログインの Cookie は HttpOnly。JavaScript で読み書きしない。ログイン状態は `useMe()` で受け取る。
- 金額・入札できるか・落札者はサーバーが決める。画面の価格や残り時間は案内として表示する（仕様書 6.2）。
- 入札は確認画面を挟み、`Idempotency-Key` を付けて送る。通信エラーで結果が分からないときは、同じキーで送り直す（二重入札を防ぐ）。
- エラーは API の `error.code` で分岐する（`BID_TOO_LOW`、`VERSION_CONFLICT` など）。
- 見た目は `globals.css` のクラス名を使う。新しい画面の CSS は、ファイル末尾の「Next.js の画面で追加」に足す。
- 変更したら `npm run typecheck` と `npm run build` が通ることを確認する。
