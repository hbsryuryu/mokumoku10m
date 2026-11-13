// Run with Playwright available on NODE_PATH. Use a disposable local DB/server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.FRONTEND_TEST_URL || 'http://localhost:8001';
  const title = `画面連携テスト${Date.now()}`;
  try {
    await page.goto(origin);
    await page.locator('#login-open').click();
    await page.locator('#login-name').fill('frontend-e2e');
    await page.locator('#login-form [type=submit]').click();
    await page.getByRole('button', { name: 'frontend-e2e', exact: true }).waitFor();
    await page.locator('#sell-open').click();
    await page.locator('#sell-title').fill(title);
    await page.locator('#sell-description').fill('画面からDBに保存する確認用の商品です。');
    await page.locator('#sell-shipping').fill('宅配便');
    await page.locator('#sell-form [value=draft]').click();
    await page.getByRole('heading', { name: title }).waitFor();
    await page.reload();
    await page.locator('#my-listings').click();
    await page.getByRole('heading', { name: title }).click();
    await page.locator('#edit-draft').click();
    await page.locator('#sell-price').fill('2500');
    await page.locator('#sell-form [value=publish]').click();
    await page.getByRole('heading', { name: title }).waitFor();
    await page.locator('#logout').click();
    await page.locator('#listing-title').filter({ hasText: '出品一覧' }).waitFor();
    await page.locator('#search-input').fill(title);
    await page.locator('#search-form button').click();
    await page.getByRole('heading', { name: title }).click();
    await page.getByText('¥2,500', { exact: true }).waitFor();
    assert.equal(await page.locator('#withdraw-listing').count(), 0);
    await page.locator('[data-close=detail-dialog]').click();
    await page.locator('#login-open').click();
    await page.locator('#login-name').fill('frontend-e2e');
    await page.locator('#login-form [type=submit]').click();
    await page.getByRole('button', { name: 'frontend-e2e', exact: true }).waitFor();
    await page.locator('#my-listings').click();
    await page.getByRole('heading', { name: title }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#withdraw-listing').click();
    await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
    await page.locator('#categories [data-category=all]').click();
    await page.getByText('公開中の商品はありません。', { exact: true }).waitFor();
    // A communication failure must show an error, not fallback demo listings.
    await page.route('**/api/v1/listings?**', route => route.abort());
    await page.locator('#search-form button').click();
    await page.locator('#retry-load').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.product-card').count(), 0);
    await page.unroute('**/api/v1/listings?**');
    await page.locator('#retry-load').click();
    await page.getByText('公開中の商品はありません。', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#sell-open').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: browser login, draft, reload persistence, edit, publish, guest search/detail, owner withdrawal, network failure/retry, mobile action, no JS errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
