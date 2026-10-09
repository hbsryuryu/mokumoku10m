(() => {
  'use strict';

  const DAY = 86_400_000;
  const now = Date.now();
  const starters = [
    { id: 'vase-01', title: '手仕事のぬくもり、白釉の花器', category: 'インテリア', condition: '目立った傷や汚れなし', price: 2400, increment: 100, bids: 8, endsAt: now + 2 * 60 * 60 * 1000 + 36 * 60 * 1000, seller: '小春', icon: '◉', tone: 0, description: 'やわらかな白釉が気に入って大切に飾っていました。高さ約18cm。花を一輪飾るだけでも素敵です。', shipping: '出品者負担・丁寧に梱包して発送' },
    { id: 'bag-02', title: '使うほどに馴染む、帆布のミニトート', category: 'ファッション', condition: 'やや傷や汚れあり', price: 1800, increment: 100, bids: 12, endsAt: now + 5 * 60 * 60 * 1000 + 14 * 60 * 1000, seller: 'nagi', icon: '▱', tone: 1, description: '生成りの帆布に革の持ち手を合わせた小さなトートです。角に少し使用感がありますが、まだまだお使いいただけます。', shipping: '出品者負担' },
    { id: 'lamp-03', title: '夜の読書に。小さな木製テーブルランプ', category: 'インテリア', condition: '目立った傷や汚れなし', price: 3200, increment: 100, bids: 6, endsAt: now + 10 * 60 * 60 * 1000 + 42 * 60 * 1000, seller: '灯り好き', icon: '◐', tone: 2, description: 'あたたかい光が広がるテーブルランプ。ベッドサイドにちょうどよいサイズです。電球もお付けします。', shipping: '送料込み（出品者負担）' },
    { id: 'book-04', title: '季節をめぐる、草花のスケッチ帖', category: '本・ホビー', condition: '目立った傷や汚れなし', price: 900, increment: 100, bids: 3, endsAt: now + 16 * 60 * 60 * 1000 + 8 * 60 * 1000, seller: 'mori', icon: '▤', tone: 3, description: 'ページをめくるたび、野の草花に出会える一冊。数回読んだだけなので、ページはきれいです。', shipping: '出品者負担・ゆうパケット相当' },
    { id: 'chair-05', title: '経年変化が美しい、折りたたみ木椅子', category: 'インテリア', condition: 'やや傷や汚れあり', price: 4600, increment: 100, bids: 17, endsAt: now + 21 * 60 * 60 * 1000, seller: '木と暮らす', icon: '⌑', tone: 1, description: '木目の表情が豊かな折りたたみ椅子。小さな傷はありますが、ぐらつきはなくしっかり座れます。', shipping: '送料別・大型便' },
    { id: 'camera-06', title: '旅の記録に。フィルムカメラとケース', category: '家電', condition: '目立った傷や汚れなし', price: 5800, increment: 100, bids: 9, endsAt: now + DAY + 2 * 60 * 60 * 1000, seller: 'そら色', icon: '◎', tone: 2, description: '動作確認済みのフィルムカメラです。革ケースとストラップをセットにしました。フィルムは付属しません。', shipping: '出品者負担・緩衝材で梱包' },
    { id: 'scarf-07', title: 'ふんわり軽い、草木染めのストール', category: 'ファッション', condition: '新品・未使用', price: 1500, increment: 100, bids: 0, endsAt: now + DAY + 8 * 60 * 60 * 1000, seller: 'ao', icon: '〰', tone: 0, description: '植物から抽出した色で染めた、薄手のコットンストール。肌寒い日の羽織りにも。', shipping: '出品者負担' },
    { id: 'mug-08', title: '毎日のコーヒーに、手びねりのマグカップ', category: 'その他', condition: '目立った傷や汚れなし', price: 1200, increment: 100, bids: 5, endsAt: now + 2 * DAY + 3 * 60 * 60 * 1000, seller: '土のひと', icon: '◡', tone: 3, description: '作家ものの手びねりマグカップです。約250ml。手づくりならではの形のゆらぎをお楽しみください。', shipping: '出品者負担・割れ物として発送' },
  ];

  const storage = {
    get(key, fallback) {
      try { const value = localStorage.getItem(`meguru:${key}`); return value ? JSON.parse(value) : fallback; }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(`meguru:${key}`, JSON.stringify(value)); } catch { showToast('ブラウザの保存領域を利用できませんでした'); } },
  };

  let custom = storage.get('listings', []);
  let watched = new Set(storage.get('watched', []));
  let bidsByItem = storage.get('bids', {});
  let currentCategory = 'すべて';
  let query = '';
  let visibleCount = 8;
  let activeItemId = null;
  let toastTimer;

  const grid = document.querySelector('#listing-grid');
  const emptyState = document.querySelector('#empty-state');
  const watchCount = document.querySelector('#watch-count');
  const yen = new Intl.NumberFormat('ja-JP');
  const allItems = () => [...custom, ...starters].map((item) => {
    const bids = bidsByItem[item.id] || [];
    return bids.length ? { ...item, price: bids[bids.length - 1].amount, bids: item.bids + bids.length } : item;
  });

  function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function remaining(endsAt) {
    const ms = endsAt - Date.now();
    if (ms <= 0) return { label: '終了', urgent: true };
    const days = Math.floor(ms / DAY);
    const hours = Math.floor((ms % DAY) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    if (days) return { label: `あと ${days}日 ${hours}時間`, urgent: days === 0 };
    return { label: `あと ${hours}時間 ${minutes}分`, urgent: hours < 3 };
  }

  function imageMarkup(item) {
    if (item.image && /^https:\/\//i.test(item.image)) {
      const safeUrl = item.image.replaceAll('"', '%22');
      return `<img src="${safeUrl}" alt="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`;
    }
    return `<div class="image-placeholder tone-${Number(item.tone) % 4}" aria-hidden="true">${escapeHtml(item.icon || '✦')}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function filteredItems() {
    let items = allItems().filter((item) => currentCategory === 'すべて' || item.category === currentCategory)
      .filter((item) => !query || `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
    const sort = document.querySelector('#sort-select').value;
    if (sort === 'ending') items.sort((a, b) => a.endsAt - b.endsAt);
    if (sort === 'newest') items.sort((a, b) => b.createdAt - a.createdAt || b.endsAt - a.endsAt);
    if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
    if (sort === 'bids') items.sort((a, b) => b.bids - a.bids);
    return items;
  }

  function cardMarkup(item) {
    const time = remaining(item.endsAt);
    const isWatched = watched.has(item.id);
    return `<article class="product-card" tabindex="0" data-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}、現在価格 ${yen.format(item.price)}円">
      <div class="product-image">${imageMarkup(item)}<span class="badge">${escapeHtml(item.condition === '新品・未使用' ? '新品' : item.condition.includes('傷') ? '状態良好' : '一点もの')}</span><button class="watch-toggle ${isWatched ? 'is-watched' : ''}" type="button" data-watch="${escapeHtml(item.id)}" aria-label="${isWatched ? 'ウォッチを解除' : 'ウォッチに追加'}" aria-pressed="${isWatched}">${isWatched ? '♥' : '♡'}</button></div>
      <div class="product-meta"><div class="product-category">${escapeHtml(item.category)}</div><h3 class="product-title">${escapeHtml(item.title)}</h3><div class="product-price-row"><div class="product-price">¥${yen.format(item.price)}<small>〜</small></div><span class="bid-count">${item.bids} 入札</span></div><div class="product-timer ${time.urgent ? 'urgent' : ''}"><span class="clock-icon">◷</span>${time.label}</div></div>
    </article>`;
  }

  function render() {
    const items = filteredItems();
    grid.innerHTML = items.slice(0, visibleCount).map(cardMarkup).join('');
    emptyState.hidden = items.length !== 0;
    document.querySelector('#show-more').hidden = items.length <= visibleCount;
    watchCount.textContent = watched.size;
    document.querySelector('#listing-title').textContent = currentCategory === 'すべて' ? (query ? '検索結果' : 'いま、注目のアイテム') : currentCategory;
  }

  function openDetail(id) {
    const item = allItems().find((candidate) => candidate.id === id);
    if (!item) return;
    activeItemId = id;
    const time = remaining(item.endsAt);
    const bids = (bidsByItem[id] || []).slice().reverse();
    document.querySelector('#detail-content').innerHTML = `<div class="detail-layout"><div class="product-image">${imageMarkup(item)}</div><div><span class="product-category">${escapeHtml(item.category)} · ${escapeHtml(item.condition)}</span><h2>${escapeHtml(item.title)}</h2><p class="detail-description">${escapeHtml(item.description)}</p><div class="detail-price">¥${yen.format(item.price)}</div><p class="detail-condition">現在価格 · ${item.bids} 入札 · ${time.label}</p><p class="detail-condition">出品者：${escapeHtml(item.seller || 'めぐる市メンバー')}</p><p class="detail-condition">配送：${escapeHtml(item.shipping || '出品者負担')}</p><div class="detail-actions"><button class="primary-link" type="button" data-bid="${escapeHtml(id)}">入札する <span>↗</span></button><button class="secondary-button" type="button" data-watch="${escapeHtml(id)}">${watched.has(id) ? '♥ ウォッチ中' : '♡ ウォッチ'}</button></div></div></div>${bids.length ? `<div class="bid-history"><p class="product-category">入札履歴（このブラウザのデモ入札）</p>${bids.map((bid) => `<p class="product-timer">¥${yen.format(bid.amount)} · ${escapeHtml(bid.at)}</p>`).join('')}</div>` : ''}`;
    document.querySelector('#detail-dialog').showModal();
  }

  function toggleWatch(id) {
    if (watched.has(id)) { watched.delete(id); showToast('ウォッチを解除しました'); }
    else { watched.add(id); showToast('ウォッチに追加しました'); }
    storage.set('watched', [...watched]);
    render();
    if (document.querySelector('#detail-dialog').open) openDetail(id);
  }

  function openBid(id) {
    const item = allItems().find((candidate) => candidate.id === id);
    if (!item) return;
    if (remaining(item.endsAt).label === '終了') { showToast('このオークションは終了しています'); return; }
    activeItemId = id;
    document.querySelector('#bid-item').textContent = item.title;
    document.querySelector('#bid-amount').min = String(item.price + item.increment);
    document.querySelector('#bid-amount').value = String(item.price + item.increment);
    document.querySelector('#bid-hint').textContent = `現在価格 ¥${yen.format(item.price)} · 最低入札額 ¥${yen.format(item.price + item.increment)}（現在価格＋最低入札増分）`;
    document.querySelector('#bid-dialog').showModal();
  }

  grid.addEventListener('click', (event) => {
    const watch = event.target.closest('[data-watch]');
    if (watch) { event.stopPropagation(); toggleWatch(watch.dataset.watch); return; }
    const card = event.target.closest('[data-open]');
    if (card) openDetail(card.dataset.open);
  });
  grid.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open]')) { event.preventDefault(); openDetail(event.target.dataset.open); }
  });
  document.querySelector('#detail-content').addEventListener('click', (event) => {
    const bid = event.target.closest('[data-bid]');
    const watch = event.target.closest('[data-watch]');
    if (bid) { document.querySelector('#detail-dialog').close(); openBid(bid.dataset.bid); }
    if (watch) toggleWatch(watch.dataset.watch);
  });
  document.querySelector('#bid-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const item = allItems().find((candidate) => candidate.id === activeItemId);
    const amount = Number(document.querySelector('#bid-amount').value);
    if (!item || !Number.isSafeInteger(amount) || amount < item.price + item.increment || amount > 10_000_000) { showToast('最低入札額以上の金額を入力してください'); return; }
    if (item.endsAt <= Date.now()) { showToast('終了時刻を過ぎているため入札できません'); return; }
    const history = bidsByItem[activeItemId] || [];
    history.push({ amount, at: new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()) });
    bidsByItem[activeItemId] = history;
    storage.set('bids', bidsByItem);
    document.querySelector('#bid-dialog').close();
    render();
    showToast(`¥${yen.format(amount)}で入札しました（デモ）`);
  });

  document.querySelector('#sell-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.querySelector('#sell-title').value.trim();
    const description = document.querySelector('#sell-description').value.trim();
    const price = Number(document.querySelector('#sell-price').value);
    const image = document.querySelector('#sell-image').value.trim();
    if (!title || !description || !Number.isSafeInteger(price) || price < 1 || price > 10_000_000) { showToast('商品名・説明・価格をご確認ください'); return; }
    if (image && !/^https:\/\//i.test(image)) { showToast('画像URLはHTTPSのURLを入力してください'); return; }
    const id = `user-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const duration = Number(document.querySelector('#sell-duration').value);
    custom.unshift({ id, title, description, category: document.querySelector('#sell-category').value, condition: document.querySelector('#sell-condition').value, price, increment: price < 5000 ? 100 : 500, bids: 0, endsAt: Date.now() + duration * DAY, createdAt: Date.now(), seller: 'デモユーザー', shipping: document.querySelector('#sell-shipping').value.trim(), image, icon: '✦', tone: custom.length % 4 });
    storage.set('listings', custom);
    event.currentTarget.reset();
    document.querySelector('#sell-price').value = '1000';
    document.querySelector('#sell-dialog').close();
    currentCategory = 'すべて'; query = ''; document.querySelector('#search-input').value = '';
    document.querySelectorAll('.category').forEach((button) => button.classList.toggle('active', button.dataset.category === 'すべて'));
    render();
    showToast('出品情報をこのブラウザに保存しました（デモ）');
    document.querySelector('#listings').scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelector('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    document.querySelector('#login-dialog').close();
    event.currentTarget.reset();
    showToast('デモで続行しました。認証機能は未接続です');
  });
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
  document.querySelector('#sell-open').addEventListener('click', () => document.querySelector('#sell-dialog').showModal());
  document.querySelector('#login-open').addEventListener('click', () => document.querySelector('#login-dialog').showModal());
  document.querySelector('#watch-nav').addEventListener('click', () => {
    currentCategory = 'すべて'; query = '';
    document.querySelector('#search-input').value = '';
    document.querySelectorAll('.category').forEach((button) => button.classList.toggle('active', button.dataset.category === 'すべて'));
    const watchedItems = allItems().filter((item) => watched.has(item.id));
    grid.innerHTML = watchedItems.map(cardMarkup).join('');
    emptyState.hidden = watchedItems.length !== 0;
    document.querySelector('#listing-title').textContent = 'ウォッチリスト';
    document.querySelector('#show-more').hidden = true;
    document.querySelector('#listings').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelector('#categories').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    currentCategory = button.dataset.category; visibleCount = 8;
    document.querySelectorAll('.category').forEach((category) => category.classList.toggle('active', category === button));
    render();
  });
  document.querySelector('#search-form').addEventListener('submit', (event) => {
    event.preventDefault(); query = document.querySelector('#search-input').value.trim(); visibleCount = 8; render();
    document.querySelector('#listings').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelector('#search-input').addEventListener('input', (event) => { if (!event.target.value) { query = ''; render(); } });
  document.querySelector('#sort-select').addEventListener('change', render);
  document.querySelector('#show-more').addEventListener('click', () => { visibleCount += 8; render(); });
  document.querySelector('#clear-filters').addEventListener('click', () => {
    currentCategory = 'すべて'; query = ''; document.querySelector('#search-input').value = '';
    document.querySelectorAll('.category').forEach((button) => button.classList.toggle('active', button.dataset.category === 'すべて'));
    render();
  });
  document.querySelector('.category-next').addEventListener('click', () => document.querySelector('#categories').scrollBy({ left: 170, behavior: 'smooth' }));

  render();
  setInterval(render, 60_000);
})();
