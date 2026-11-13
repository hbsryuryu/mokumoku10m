(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const yen = new Intl.NumberFormat('ja-JP');
  const jst = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' });
  const messages = {
    network: '通信できませんでした。接続を確認して再読み込みしてください。',
    unavailable: 'この機能はまだ利用できません。',
    unauthorized: 'ログインが必要です。入力内容を保持しています。ログイン後に再操作してください。',
    conflict: '別の操作で内容が更新されました。自分の出品から最新内容を開き直してください。',
    pending: '送信結果を確認できません。重複作成を避けるため、自分の出品で保存状況を確認してください。',
  };
  const state = { user: null, categories: [], items: [], own: false, offset: 0, more: false, request: 0, editor: null, busy: false, uncertainCreate: false, devLogin: false };
  let toastTimer;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
  }
  function sessionUI() {
    $('#login-open').textContent = state.user ? state.user.displayName : 'ログイン';
    $('#logout').hidden = !state.user;
    $('#my-listings').hidden = !state.user;
  }
  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(`/api/v1${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    } catch { const error = new Error(messages.network); error.uncertain = true; throw error; }
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const code = body?.error?.code;
      const fields = body?.error?.details?.fields;
      const fieldMessage = Array.isArray(fields) ? fields.map(field => `${field.field}: ${field.message}`).join('\n') : '';
      if (response.status === 401) { state.user = null; sessionUI(); }
      const error = new Error(response.status === 401 ? messages.unauthorized : code === 'VERSION_CONFLICT' ? messages.conflict : fieldMessage || body?.error?.message || '処理できませんでした。入力内容と接続を確認してください。');
      error.status = response.status;
      error.uncertain = response.status >= 500;
      throw error;
    }
    return body;
  }
  const send = (path, method, body) => api(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  function requireLogin() {
    if (state.user) return true;
    if (state.devLogin) $('#login-dialog').showModal();
    else toast('現在ログインを利用できません。');
    return false;
  }
  function timeLabel(value) {
    if (!value) return '下書き';
    const minutes = Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 60000));
    return minutes ? `あと ${Math.floor(minutes / 60)}時間 ${minutes % 60}分` : '終了時刻を経過';
  }
  function card(item) {
    const labels = { draft: '下書き', published: '公開中', ended: '終了', suspended: '停止中', cancelled: '取り下げ済み' };
    return `<article class="product-card" tabindex="0" data-open="${item.id}" aria-label="${escapeHtml(item.title)}"><div class="product-image"><div class="image-placeholder tone-${item.id % 4}" aria-hidden="true">✦</div><span class="badge">${escapeHtml(labels[item.status] || item.status)}</span></div><div class="product-meta"><div class="product-category">${escapeHtml(item.category.name)}</div><h3 class="product-title">${escapeHtml(item.title)}</h3><div class="product-price-row"><div class="product-price">¥${yen.format(item.currentPriceYen)}</div><span class="bid-count">${item.bidCount} 入札</span></div><div class="product-timer">${timeLabel(item.endsAt)}</div></div></article>`;
  }
  function render() {
    $('#listing-grid').innerHTML = state.items.map(card).join('');
    $('#empty-state').hidden = state.items.length !== 0;
    $('#show-more').hidden = !state.more;
    $('#listing-title').textContent = state.own ? '自分の出品' : '出品一覧';
    $('#sort-select').disabled = state.own;
    $('#search-input').disabled = state.own;
  }
  async function load(append = false) {
    const request = ++state.request;
    $('#listing-status').textContent = '読み込み中…';
    $('#retry-load').hidden = true;
    $('#show-more').disabled = true;
    if (!append) { state.items = []; state.offset = 0; render(); $('#empty-state').hidden = true; }
    const offset = append ? state.offset : 0;
    const params = new URLSearchParams({ limit: '8', offset: String(offset) });
    if (!state.own) {
      params.set('sort', $('#sort-select').value);
      if ($('#search-input').value.trim()) params.set('q', $('#search-input').value.trim());
      const category = $('#categories .active')?.dataset.category;
      if (category && category !== 'all') params.set('categoryId', category);
    }
    try {
      const page = await api(`${state.own ? '/me/listings' : '/listings'}?${params}`);
      if (request !== state.request) return;
      state.items = append ? [...state.items, ...page.items] : page.items;
      state.offset = offset + page.items.length;
      state.more = page.hasMore;
      render();
      $('#listing-status').textContent = state.items.length ? `${state.items.length}件を表示中` : state.own ? '出品はまだありません。' : '公開中の商品はありません。';
    } catch (error) {
      if (request !== state.request) return;
      $('#listing-status').textContent = error.message;
      $('#empty-state').hidden = true;
      $('#retry-load').hidden = false;
    } finally { if (request === state.request) $('#show-more').disabled = false; }
  }
  async function openDetail(id) {
    try {
      const item = await api(`/listings/${id}`);
      const auction = item.auction;
      const owner = state.user?.id === item.seller.id;
      $('#detail-content').innerHTML = `<h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.category.name)} · ${escapeHtml(item.conditionLabel)}</p><p class="detail-description">${escapeHtml(item.description)}</p><div class="detail-price">¥${yen.format(auction?.currentPriceYen ?? item.startPriceYen)}</div><p>出品者：${escapeHtml(item.seller.displayName)}</p><p>配送：${item.shippingPayer === 'seller' ? '出品者負担' : '落札者負担'} · ${escapeHtml(item.shippingMethod)}</p><p>終了日時：${auction ? escapeHtml(jst.format(new Date(auction.endsAt))) + ' JST' : '公開後に確定'}</p><p>即決価格：${item.buyoutPriceYen ? '¥' + yen.format(item.buyoutPriceYen) : 'なし'}</p><p>自動延長：${item.autoExtension ? 'あり' : 'なし'}</p><p>入札・ウォッチはまだ利用できません。</p>${owner && item.status === 'draft' ? '<button class="primary-link" type="button" id="edit-draft">下書きを編集・公開</button>' : ''}${owner && item.status === 'published' ? '<button class="secondary-button" type="button" id="withdraw-listing">取り下げる</button>' : ''}<p id="detail-error" role="alert"></p>`;
      if ($('#edit-draft')) $('#edit-draft').onclick = () => { $('#detail-dialog').close(); openEditor(item); };
      if ($('#withdraw-listing')) $('#withdraw-listing').onclick = async event => {
        if (!confirm('この出品を取り下げますか？ 公開一覧から削除されます。')) return;
        event.target.disabled = true;
        try { await send(`/listings/${id}/withdraw`, 'POST', { expectedVersion: item.version }); $('#detail-dialog').close(); toast('取り下げました'); await load(); }
        catch (error) { $('#detail-error').textContent = error.message; event.target.disabled = false; }
      };
      $('#detail-dialog').showModal();
    } catch (error) { toast(error.message); }
  }
  function openEditor(item = null) {
    if (!requireLogin()) return;
    state.editor = item;
    state.uncertainCreate = false;
    $('#sell-form').reset();
    $('#sell-heading').textContent = item ? '下書きを編集' : '新しい出品';
    $('#sell-error').textContent = '';
    if (item) {
      const values = { title: item.title, description: item.description, category: item.category.id, condition: item.condition, price: item.startPriceYen, buyout: item.buyoutPriceYen ?? '', duration: item.durationHours, shipping: item.shippingMethod, 'shipping-payer': item.shippingPayer };
      for (const [key, value] of Object.entries(values)) $(`#sell-${key}`).value = value;
      $('#sell-extension').checked = item.autoExtension;
    }
    $('#sell-dialog').showModal();
  }
  $('#sell-form').onsubmit = async event => {
    event.preventDefault();
    if (state.busy || !requireLogin()) return;
    if (state.uncertainCreate) { $('#sell-error').textContent = messages.pending; return; }
    const publish = event.submitter?.value === 'publish';
    const data = { title: $('#sell-title').value.trim(), description: $('#sell-description').value.trim(), categoryId: Number($('#sell-category').value), condition: $('#sell-condition').value, shippingPayer: $('#sell-shipping-payer').value, shippingMethod: $('#sell-shipping').value.trim(), startPriceYen: Number($('#sell-price').value), buyoutPriceYen: $('#sell-buyout').value ? Number($('#sell-buyout').value) : null, autoExtension: $('#sell-extension').checked, durationHours: Number($('#sell-duration').value) };
    state.busy = true;
    $('#sell-error').textContent = '';
    const buttons = [...$('#sell-form').querySelectorAll('button')]; buttons.forEach(button => button.disabled = true);
    let creating = !state.editor;
    try {
      state.editor = state.editor ? await send(`/listings/${state.editor.id}`, 'PATCH', { ...data, expectedVersion: state.editor.version }) : await send('/listings', 'POST', data);
      creating = false;
      if (publish) state.editor = await send(`/listings/${state.editor.id}/publish`, 'POST', { expectedVersion: state.editor.version });
      $('#sell-dialog').close();
      toast(publish ? '出品を公開しました' : '下書きを保存しました');
      state.own = true;
      await load();
    } catch (error) {
      if (creating && error.uncertain) state.uncertainCreate = true;
      $('#sell-error').textContent = state.uncertainCreate ? messages.pending : error.message;
    } finally { state.busy = false; buttons.forEach(button => button.disabled = false); }
  };
  $('#login-form').onsubmit = async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type=submit]'); button.disabled = true;
    try {
      state.user = await send('/dev/login', 'POST', { displayName: $('#login-name').value.trim() });
      sessionUI(); $('#login-dialog').close(); toast('ログインしました');
      // 別会員への切替時は、前の会員の編集状態を引き継がない。
      state.editor = null; $('#sell-dialog').close(); state.own = false; await load();
    } catch (error) { $('#login-error').textContent = error.message; }
    finally { button.disabled = false; }
  };
  $('#logout').onclick = async event => {
    event.target.disabled = true;
    try { await send('/auth/logout', 'POST'); state.user = null; state.editor = null; $('#sell-dialog').close(); $('#detail-dialog').close(); state.own = false; sessionUI(); await load(); toast('ログアウトしました'); }
    catch (error) { toast(error.message); }
    finally { event.target.disabled = false; }
  };
  $('#login-open').onclick = () => { if (state.user) { state.own = true; load(); } else requireLogin(); };
  $('#sell-open').onclick = () => openEditor();
  $('#my-listings').onclick = () => { if (requireLogin()) { state.own = true; load(); } };
  $('#watch-nav').onclick = () => toast(messages.unavailable);
  $('#search-form').onsubmit = event => { event.preventDefault(); state.own = false; load(); };
  $('#sort-select').onchange = () => load();
  $('#categories').onclick = event => {
    const button = event.target.closest('[data-category]'); if (!button) return;
    state.own = false;
    $('#categories').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
    load();
  };
  $('#listing-grid').onclick = event => { const item = event.target.closest('[data-open]'); if (item) openDetail(item.dataset.open); };
  $('#listing-grid').onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open]')) { event.preventDefault(); openDetail(event.target.dataset.open); } };
  $('#show-more').onclick = () => load(true);
  $('#retry-load').onclick = () => load();
  $('#clear-filters').onclick = () => { state.own = false; $('#search-input').value = ''; $('#categories button').click(); };
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => document.getElementById(button.dataset.close).close());
  $('.category-next').onclick = () => $('#categories').scrollBy({ left: 170, behavior: 'smooth' });
  $('.footer-links a[href="#sell-open"]').onclick = event => { event.preventDefault(); openEditor(); };
  async function initialize() {
    sessionUI();
    $('#listing-status').textContent = '接続中…';
    try {
      const [config, categories] = await Promise.all([api('/frontend-config'), api('/categories')]);
      state.devLogin = config.devLoginEnabled;
      state.categories = categories;
      $('#sell-category').innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      $('#categories').innerHTML = '<button class="category active" data-category="all">すべて</button>' + categories.map(c => `<button class="category" data-category="${c.id}">${escapeHtml(c.name)}</button>`).join('');
      try { state.user = await api('/me'); } catch (error) { if (error.status !== 401) throw error; }
      sessionUI();
      await load();
    } catch (error) {
      $('#listing-status').textContent = error.message;
      $('#retry-load').hidden = false;
      $('#retry-load').onclick = () => { $('#retry-load').onclick = () => load(); initialize(); };
    }
  }
  initialize();
})();
