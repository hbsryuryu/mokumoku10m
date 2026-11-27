# ADR-0011: Web フロントエンド（Next.js）の最初の実装での仮決め

- 状態: 採用（**仮決め**。画面が増えたら見直す）
- 階層: L3 仮決め
- 上位: [ADR-0010](0010-web-frontend-nextjs.md)（Web は Next.js）
- 日付: 2026-11-27
- 決定者: hbsryuryu（チームでの確認は PR で行う）

## 背景

ADR-0010 と AGENTS.md（#55）で、「スタイリング・型の生成・テスト・Lint・型チェックの細部は、最初の Web 実装の PR で決めて記録する」ことになっていた。最初の画面（ログイン・出品・入札・落札）を `apps/web/` に作るにあたって、次のとおり仮決めする。

## 決定

| 項目 | 仮決め | 理由 |
|---|---|---|
| バージョン | Next.js 16.4.6、React 19.3.1、TypeScript 5.9.3（`package.json` で固定し、`package-lock.json` をコミット） | 2026-11-27 時点の安定版。TypeScript は 7.0 が出たばかりで Next.js の対応が不明なため 5 系の最新にした |
| Node.js | 22（Docker は `node:22-slim`。`next` の要件は 20.9 以上） | 手元の Node.js（22.14）と合わせる |
| ルーター | App Router（`app/`） | Next.js の標準。公開ページをサーバー側で描画できる（ADR-0010） |
| スタイリング | **静的デモの `styles.css` をそのまま `app/globals.css` に移し、足りない分だけ追記する**。Tailwind CSS は**採用しない（今は）** | デザインがクラス名ベースの CSS でできており、そのまま使うのが見た目を再現する一番確実な方法。Tailwind への書き直しは作業量が大きく、見た目がずれやすい |
| API の型 | `apps/web/lib/types.ts` に**手書き**する | API がまだ少ない。OpenAPI からの生成（候補: openapi-typescript）は、API が増えて手書きの食い違いが問題になったら導入する |
| 型チェック | `npm run typecheck`（`tsc --noEmit`）と `npm run build` | `next build` が型チェックも行う |
| Lint | まだ入れない | Next.js 16 では `next lint` がなくなり、ESLint の設定を自分で用意する必要がある。次の Web の PR で決める |
| テスト | 自動テストは**まだ入れない**。画面の確認は、PR ごとに Playwright（Edge）の E2E スクリプト `apps/web/e2e/flow.cjs` を手で回す（Playwright は依存に入れず、一時的に入れて実行） | テストの道具（Playwright をリポジトリに入れるか、CI で回すか）は、CI と一緒に決める |
| 画面と API の分担 | 公開ページ（一覧・詳細）は Server Components で、受け取った Cookie を API に渡して取得する。入札・出品など操作は Client Components から `/api/*`（Next.js が FastAPI に転送）を呼ぶ | ADR-0010 |
| ログイン状態 | 画面全体で `GET /api/v1/me` の結果を共有する（`components/MeProvider.tsx`）。Next.js 側でトークンや独自のログイン状態を持たない | ADR-0005・ADR-0010 |
| ローカルの Origin チェック | API の Origin チェック（#54、ローカルだけ）に、`ALLOWED_ORIGINS`（既定 `http://localhost:3000`）を追加して、Next.js 経由の書き込みを許可する | Next.js の転送では、ブラウザの `Origin`（`localhost:3000`）がそのまま API に届くため |

## 影響

- 静的デモ（`index.html` / `app.js` / `styles.css`、http://localhost:8000/）はしばらく残る。デザインを変えるときは `globals.css` と食い違わないよう注意する。Next.js の画面が出品・検索・入札・落札をカバーしたので、静的デモを消すかは次に決める（ADR-0010「影響」）。
- 画像・ウォッチ・Google ログイン・取引の詳細の画面はまだない。

## 見直す条件

- 画面が増えて、CSS の管理（1つの `globals.css`）が難しくなったとき（CSS Modules や Tailwind CSS を検討する）
- API の型の手書きで、API との食い違いが起きたとき（OpenAPI からの生成を導入する）
- CI を作るとき（Lint・E2E を自動で回す）
