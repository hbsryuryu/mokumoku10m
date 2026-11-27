// 画面の E2E：ログイン → 出品 → 入札（自動入札）→ 即決・早期終了で落札 を、実際のブラウザで確かめる（ADR-0011）。
//
// Playwright はアプリの依存に入れていないので、一時的に入れて実行する：
//   1. docker compose up -d --build（または API と画面を手元で起動。DB は空のほうが分かりやすい）
//   2. 別のフォルダで  npm i playwright@1.56.1  （ブラウザはダウンロード不要。Windows の Edge を使う）
//   3. NODE_PATH=<そのフォルダ>/node_modules node apps/web/e2e/flow.cjs
//      （WEB_URL で画面の URL を変えられる。既定 http://localhost:3000）

const { chromium } = require("playwright");

const WEB = process.env.WEB_URL || "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const errors = [];

async function newUser(browser, name) {
  const context = await browser.newContext({ locale: "ja-JP" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/status of (401|409)/.test(m.text()) && errors.push(`${name} console: ${m.text()}`));
  await page.goto(`${WEB}/login`);
  await page.getByLabel("表示名").fill(name);
  await page.getByRole("button", { name: /ログイン/ }).click();
  await page.waitForURL(`${WEB}/`);
  await page.getByText(`${name} さん`).waitFor();
  log(`${name} でログイン`);
  return page;
}

async function sell(page, { title, start, buyout }) {
  await page.goto(`${WEB}/sell`);
  await page.getByLabel(/商品名/).fill(title);
  await page.getByLabel(/商品の説明/).fill("E2E テストの出品です");
  await page.getByLabel(/配送方法/).fill("ゆうパケット");
  await page.getByLabel(/^開始価格/).fill(String(start));
  if (buyout) await page.getByLabel(/^即決価格/).fill(String(buyout));
  await page.getByRole("button", { name: /出品する（公開）/ }).click();
  await page.waitForURL(/\/listings\/\d+$/);
  await page.getByText("公開中").first().waitFor();
  await page.getByText("あなたの出品です").waitFor();
  log(`出品・公開: ${title} → ${page.url()}`);
  return page.url();
}

async function bid(page, url, amount, expectText) {
  await page.goto(url);
  await page.getByLabel(/最高入札額/).fill(String(amount));
  await page.getByRole("button", { name: /入札内容を確認する/ }).click();
  await page.getByText(/確定後は取り消しできません|即決価格以上のため/).waitFor();
  await page.getByRole("button", { name: /入札を確定する/ }).click();
  await page.getByText(expectText).waitFor();
  log(`入札 ${amount}円 → 「${expectText}」`);
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    // 0. ゲストでトップ
    const guest = await (await browser.newContext()).newPage();
    guest.on("pageerror", (e) => errors.push(`guest: ${e.message}`));
    await guest.goto(WEB);
    await guest.getByText("好きなものが、").waitFor();
    log("トップ（ゲスト）");

    const seller = await newUser(browser, "seller1");
    const a = await newUser(browser, "buyerA");
    const b = await newUser(browser, "buyerB");

    // 1. 即決：B が即決価格以上で入札 → 落札
    const url1 = await sell(seller, { title: "E2E白釉の花器", start: 1000, buyout: 6000 });
    await bid(a, url1, 2000, "あなたが最高額入札者です");
    await bid(b, url1, 1500, "ほかの方の最高入札額のほうが高い");
    // 自動入札：A 2000、B 1500 → 現在の価格 1,600円
    await b.reload();
    await b.getByText("¥1,600").first().waitFor();
    log("自動入札で現在の価格 ¥1,600");
    await bid(b, url1, 7000, "即決価格で落札しました");
    await b.reload();
    await b.getByText(/あなたが ¥6,000 で落札しました/).waitFor();
    log("即決：B が ¥6,000 で落札（詳細に表示）");
    await seller.goto(url1);
    await seller.getByText(/¥6,000 で落札されました/).waitFor();
    log("出品者側：落札されました と表示");

    // 2. 早期終了：A 3000、B 2500 → 出品者が早期終了 → A が 2,600円で落札
    const url2 = await sell(seller, { title: "E2E木の椅子", start: 1000 });
    await bid(a, url2, 3000, "あなたが最高額入札者です");
    await bid(b, url2, 2500, "ほかの方の最高入札額のほうが高い");
    seller.once("dialog", (d) => d.accept());
    await seller.goto(url2);
    await seller.getByRole("button", { name: "早期終了する" }).click();
    await seller.getByText(/¥2,600 で落札されました/).waitFor();
    log("早期終了 → 出品者側に ¥2,600 で落札されました");
    await a.goto(url2);
    await a.getByText(/あなたが ¥2,600 で落札しました/).waitFor();
    await a.goto(`${WEB}/me`);
    await a.getByRole("cell", { name: "E2E木の椅子" }).waitFor();
    await a.getByText("落札した").first().waitFor();
    log("A のマイページの取引に表示");

    // 3. 自分の出品には入札できない
    const url3 = await sell(seller, { title: "E2E自分の出品", start: 500 });
    if (await seller.getByLabel(/最高入札額/).count()) throw new Error("出品者に入札欄が出ている");
    log("出品者には入札欄が出ない");

    // 4. 最低額未満（サーバーで拒否される）：A が画面を開いている間に B が入札し、A の金額が古くなった
    await a.goto(url3);
    await a.getByLabel(/最高入札額/).fill("500");
    await a.getByRole("button", { name: /入札内容を確認する/ }).click();
    await bid(b, url3, 800, "あなたが最高額入札者です");
    await a.getByRole("button", { name: /入札を確定する/ }).click();
    await a.getByText(/¥510 以上で入札してください/).waitFor();
    if ((await a.getByLabel(/最高入札額/).inputValue()) !== "510") throw new Error("最低入札額が入力欄に反映されていない");
    log("古い金額での入札はサーバーが拒否し、最低入札額 ¥510 を案内・入力欄に反映");

    // 5. ゲストの一覧・検索・未ログインの案内
    await guest.goto(`${WEB}/?q=E2E%E8%87%AA%E5%88%86`);
    await guest.getByText("E2E自分の出品").waitFor();
    await guest.goto(url3);
    await guest.getByText("入札するにはログインしてください").waitFor();
    log("ゲスト：検索・詳細・ログインの案内");

    // 6. ログアウト
    await a.goto(WEB);
    await a.getByRole("button", { name: "ログアウト" }).click();
    await a.getByRole("link", { name: "ログイン" }).waitFor();
    log("ログアウト");

    // 7. モバイル幅で表示が崩れない（横スクロールがない）
    const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await mobile.goto(url3);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`モバイルで横にはみ出している: ${overflow}px`);
    log("モバイル幅（390px）で横スクロールなし");

    if (errors.length) throw new Error("ブラウザのエラー:\n" + errors.join("\n"));
    console.log("\nE2E: すべて成功");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("✘ E2E 失敗:", e.message);
  process.exit(1);
});
