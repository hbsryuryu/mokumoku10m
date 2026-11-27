// NODE_PATH=<temporary Playwright install>/node_modules node apps/web/e2e/google-login.cjs
// Google画面への遷移は捕捉し、本人の認証・同意を自動操作しない。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const base = process.env.WEB_URL || 'http://localhost:3000';
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://accounts.google.com/**', route => route.fulfill({
      contentType: 'text/html', body: '<title>Google redirect intercepted</title>',
    }));
    await page.goto(`${base}/login?next=/me`);
    await page.getByRole('link', { name: 'Googleでログイン', exact: true }).click();
    await page.waitForURL('https://accounts.google.com/**');
    const url = new URL(page.url());
    assert.equal(url.searchParams.get('scope'), 'openid email profile');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(url.searchParams.get('state'));
    assert.ok(url.searchParams.get('nonce'));
    const cookie = (await context.cookies(base)).find(c => c.name === 'oauth_browser');
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'Lax');
    await context.close();

    // ニックネーム設定画面だけを模擬会員で確認。DBへ架空のGoogle会員は作らない。
    const setup = await browser.newContext();
    const setupPage = await setup.newPage();
    setupPage.on('pageerror', error => errors.push(error.message));
    let nickname = null;
    await setupPage.route('**/api/v1/me', async route => {
      if (route.request().method() === 'PATCH') {
        nickname = route.request().postDataJSON().displayName;
      }
      await route.fulfill({ json: { id: 42, displayName: nickname, role: 'member' } });
    });
    await setupPage.goto(`${base}/login?setup=1&next=/`);
    await setupPage.getByRole('heading', { name: '公開ニックネームの設定' }).waitFor();
    await setupPage.getByLabel('表示名').fill('公開ニックネーム');
    await setupPage.getByRole('button', { name: /ニックネームを保存して続ける/ }).click();
    await setupPage.waitForURL(`${base}/`);
    assert.equal(nickname, '公開ニックネーム');
    await setupPage.goto(`${base}/login?authError=cancelled`);
    await setupPage.getByText('Googleログインをキャンセルしました。', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: Google redirect + PKCE + HttpOnly binding cookie; nickname UI; cancellation UI; no JS errors. Actual Google consent not automated.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
