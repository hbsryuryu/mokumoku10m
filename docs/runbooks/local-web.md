# ローカル開発手順（Web 画面・Next.js）

画面（`apps/web/`、Next.js）を動かす手順です。API の手順は [`local-backend.md`](local-backend.md) を参照してください。

## Docker で起動する（おすすめ）

```powershell
Copy-Item .env.example .env   # 最初の1回だけ（既にあれば不要）
docker compose up --build     # API と画面がいっしょに起動する
```

- 画面：http://localhost:3000
- API：http://localhost:8000（API の確認画面は http://localhost:8000/docs）
- 初回は `web` サービスが `npm ci` で依存パッケージを入れるので、数分かかります（`docker compose logs -f web` で様子を見られます）。
- コードを保存すると、数秒（約6秒）で自動で画面に反映されます。Docker では Windows のフォルダの変更を定期的に確認しているため、少し時間がかかります（`next dev --webpack`、ADR-0011）。

## 一周を試す（ログイン → 出品 → 入札 → 落札）

ブラウザを3つ用意すると分かりやすいです（通常のウィンドウ・シークレットウィンドウ・別のブラウザなど。ログインの Cookie はブラウザごとに別になります）。

1. **出品者**：右上の「ログイン」→ 表示名 `seller1` → 「出品する」→ 入力して「出品する（公開）」
2. **入札者 A**：`buyerA` でログイン → トップから商品を開く → 最高入札額（例: 2000）→「入札内容を確認する」→「入札を確定する」
3. **入札者 B**：`buyerB` でログイン → 同じ商品に 1500 で入札 →「ほかの方の最高入札額のほうが高い」と表示され、現在の価格は 1,600円（自動入札）
4. **落札**：次のどちらか
   - 出品者が商品ページの「早期終了する」→ その時点の最高額入札者（A）が落札
   - 即決価格を付けた出品に、即決価格以上で入札 → その場で落札
   - 終了時刻を過ぎると、API が30秒ごとに自動で落札を確定する（開催期間は最短13時間）
5. **結果の確認**：落札者・出品者それぞれの「マイページ」の「取引」

## Docker を使わずに動かす場合

Node.js 20.9 以上（22 推奨）が必要です。API は別に起動しておきます（`local-backend.md`）。

```powershell
cd apps/web
npm ci
$env:API_ORIGIN = "http://localhost:8000"   # 既定値なので省略可
npm run dev                                 # http://localhost:3000
```

API 側の `ALLOWED_ORIGINS` に `http://localhost:3000` が必要です（Docker では自動で設定されます。Docker なしで API を動かすときは `$env:ALLOWED_ORIGINS = "http://localhost:3000"`）。

## E2E（ブラウザで一周）を回す

`apps/web/e2e/flow.cjs` の先頭のコメントの手順で実行します（Playwright は一時的に入れる。Windows の Edge を使う）。商品名に実行ごとの印を付けるので、開発用の DB にデータが残っていても何度でも回せます。

## 確認コマンド

```powershell
cd apps/web
npm run typecheck   # 型チェック
npm run build       # 本番用のビルド（型チェックも行う）
```

## トラブル対応

| 症状 | 原因と対処 |
|---|---|
| トップに「出品を読み込めませんでした」 | API が起動していないか、`API_ORIGIN` が違います。`docker compose ps` で `api` が動いているか確認してください |
| ログイン・出品・入札で「許可されていない接続元です」（`ORIGIN_NOT_ALLOWED`） | API の `ALLOWED_ORIGINS` に画面の URL（例: `http://localhost:3000`）が入っていません。`WEB_PORT` を変えた場合は `ALLOWED_ORIGINS` も合わせてください |
| ログインで「開発用ログインが無効です」 | API の `APP_ENV=local` と `DEV_LOGIN_ENABLED=true` が必要です（`local-backend.md`） |
| `port is already allocated`（3000番） | ほかのプログラムが 3000 番を使っています。`.env` の `WEB_PORT=3001` のように変えてください |
| コードを変えても画面が変わらない（10秒以上待っても） | `docker compose restart web`。それでも直らなければ `docker compose down` のあと `docker volume rm github_and_code_web-next` で Next.js のキャッシュを消す |
| `web` が `npm ci` で失敗する | `apps/web/package-lock.json` が `package.json` と合っていません。手元で `npm install` してロックファイルを更新し、コミットしてください |
