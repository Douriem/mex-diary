/* Max Diary — public site */
(function () {
  const { roman, escapeHtml, poemToHtml, excerpt, numberPoems, formatDate, loadPoems, store, langAttrs, fold } = window.MD;

  /* ---------- Language ---------- */
  const I18N = {
    fr: {
      'nav.latest': 'Dernier fragment', 'nav.poems': 'Poèmes', 'nav.about': 'À propos', 'nav.contact': 'Contact',
      'hero.eyebrow': 'Journal de poésie philosophique',
      'hero.lede': 'Fragments d’une âme qui doute — écrits la nuit, en français et en arabe.',
      'hero.read': 'Lire les poèmes', 'hero.latest': 'Le dernier fragment', 'hero.scroll': 'descendre',
      'epigraph.source': 'La nuit étoilée',
      'featured.eyebrow': 'Le dernier fragment', 'featured.open': 'Ouvrir dans le lecteur',
      'archive.eyebrow': 'L’archive', 'archive.title': 'Poèmes', 'archive.search': 'Chercher un poème',
      'archive.searchPh': 'Chercher un mot, un titre…', 'archive.empty': 'Aucun poème ne répond à ce silence.',
      'archive.all': 'Tous', 'archive.fr': 'Français', 'archive.ar': 'العربية', 'archive.read': 'Lire', 'archive.error': 'Les poèmes n’ont pas pu être chargés.',
      'archive.count': n => n === 1 ? '1 poème, une seule nuit.' : `${n} poèmes, autant de nuits.`,
      'about.eyebrow': 'À propos', 'about.title': 'Celle qui écrit la nuit',
      'about.p1': 'Max écrit de la poésie philosophique, en français et en arabe. Ses textes reviennent toujours aux mêmes questions : l’amour qui ne se vit plus que par l’âme, la nuit qui guide, la mort qui inspire, et tout ce que l’on ne dit qu’inconsciemment.',
      'about.p2': 'Max Diary est son journal : un lieu sans bruit, où chaque poème est un fragment daté, publié tel qu’il a été écrit. Pas de vérité à vendre — seulement des questions bien tenues.',
      'about.lineage': 'Dans la lignée de',
      'contact.title': 'Écrire à Max', 'contact.text': 'Pour une lecture, une collaboration, ou simplement pour répondre à un poème.',
      'contact.email': 'Envoyer une lettre',
      'footer.text': '© 2026 Max Diary — Tous les mots sont à elle.',
      'reader.copy': 'Copier le lien', 'reader.close': 'Fermer', 'reader.translation': 'Traduction',
      'reader.prev': 'Précédent', 'reader.next': 'Suivant', 'reader.copied': 'Lien copié'
    },
    en: {
      'nav.latest': 'Latest', 'nav.poems': 'Poems', 'nav.about': 'About', 'nav.contact': 'Contact',
      'hero.eyebrow': 'A journal of philosophical poetry',
      'hero.lede': 'Fragments of a doubting soul — written at night, in French and Arabic.',
      'hero.read': 'Read the poems', 'hero.latest': 'The latest fragment', 'hero.scroll': 'scroll',
      'epigraph.source': 'La nuit étoilée',
      'featured.eyebrow': 'The latest fragment', 'featured.open': 'Open in reader',
      'archive.eyebrow': 'The archive', 'archive.title': 'Poems', 'archive.search': 'Search poems',
      'archive.searchPh': 'Search a word, a title…', 'archive.empty': 'No poem answers this silence.',
      'archive.all': 'All', 'archive.fr': 'French', 'archive.ar': 'العربية', 'archive.read': 'Read', 'archive.error': 'The poems could not be loaded.',
      'archive.count': n => n === 1 ? '1 poem, a single night.' : `${n} poems, as many nights.`,
      'about.eyebrow': 'About', 'about.title': 'She who writes at night',
      'about.p1': 'Max writes philosophical poetry, in French and in Arabic. Her texts keep returning to the same questions: love that can only be lived through the soul, the night that guides, death that inspires, and everything we only ever say unconsciously.',
      'about.p2': 'Max Diary is her journal: a quiet place where every poem is a dated fragment, published exactly as it was written. No truth for sale — only questions, held well.',
      'about.lineage': 'In the line of',
      'contact.title': 'Write to Max', 'contact.text': 'For a reading, a collaboration, or simply to answer a poem.',
      'contact.email': 'Send a letter',
      'footer.text': '© 2026 Max Diary — Every word is hers.',
      'reader.copy': 'Copy link', 'reader.close': 'Close', 'reader.translation': 'Translation',
      'reader.prev': 'Previous', 'reader.next': 'Next', 'reader.copied': 'Link copied'
    }
  };

  let lang = store.get('md-lang', 'fr');
  if (!I18N[lang]) lang = 'fr';
  const t = (key, ...args) => { const v = I18N[lang][key]; return typeof v === 'function' ? v(...args) : (v ?? key); };

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (poems.length) { renderFeatured(); renderChips(); renderGrid(); if (reader.open && current) fillReader(current); }
  }

  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang; store.set('md-lang', lang); applyLang();
  }));

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('navMenu');

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    navMenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', () => setMenu(!navMenu.classList.contains('open')));
  navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', m => { if (m.matches) setMenu(false); });

  /* ---------- Poems ---------- */
  let poems = [];
  let activeTag = null;
  let query = '';

  const grid = document.getElementById('poemGrid');
  const empty = document.getElementById('empty');
  const chips = document.getElementById('chips');
  const count = document.getElementById('archiveCount');

  const featuredPoem = () => poems.find(p => p.featured) || poems[0];

  function setLang(el, p) {
    if (p.lang === 'ar') { el.lang = 'ar'; el.dir = 'rtl'; }
    else { el.lang = 'fr'; el.removeAttribute('dir'); }
  }

  function tagsHtml(tags) {
    return tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  }

  function renderFeatured() {
    const p = featuredPoem();
    if (!p) return;
    document.getElementById('featuredNum').textContent = 'N° ' + roman(p.number);
    const ft = document.getElementById('featuredTitle');
    ft.textContent = p.title;
    setLang(ft, p);
    document.getElementById('featuredDate').textContent = formatDate(p.date, lang);
    document.getElementById('featuredTags').innerHTML = tagsHtml(p.tags);
    const fb = document.getElementById('featuredBody');
    fb.innerHTML = poemToHtml(p.body);
    setLang(fb, p);
  }

  function renderChips() {
    // Only themes shared by 2+ poems become chips (every word is still searchable)
    const freq = {};
    poems.forEach(p => p.tags.forEach(tag => { freq[tag] = (freq[tag] || 0) + 1; }));
    const all = Object.keys(freq)
      .filter(tag => freq[tag] > 1 || tag === activeTag)
      .sort((a, b) => freq[b] - freq[a] || a.localeCompare(b, 'fr'));
    const langs = ['fr', 'ar'].filter(l => poems.some(p => p.lang === l));
    const langChips = langs.length > 1
      ? langs.map(l => `<button type="button" class="chip chip-lang" data-tag="lang:${l}" aria-pressed="${activeTag === 'lang:' + l}"${l === 'ar' ? ' lang="ar"' : ''}>${escapeHtml(t('archive.' + l))}</button>`)
      : [];
    chips.innerHTML = [`<button type="button" class="chip" data-tag="" aria-pressed="${activeTag === null}">${escapeHtml(t('archive.all'))}</button>`]
      .concat(langChips)
      .concat(all.map(tag => `<button type="button" class="chip" data-tag="${escapeHtml(tag)}" aria-pressed="${activeTag === tag}">${escapeHtml(tag)}</button>`))
      .join('');
  }

  chips.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeTag = btn.dataset.tag || null;
    renderChips();
    renderGrid();
  });

  function filtered() {
    const q = fold(query.trim());
    return poems.filter(p =>
      (!activeTag || (activeTag.startsWith('lang:') ? p.lang === activeTag.slice(5) : p.tags.includes(activeTag))) &&
      (!q || fold(p.title + ' ' + p.body + ' ' + p.tags.join(' ')).includes(q))
    );
  }

  function renderGrid() {
    const list = filtered();
    count.textContent = t('archive.count', poems.length);
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(p => `
      <button type="button" class="poem-card reveal" data-id="${escapeHtml(p.id)}">
        <span class="card-top">
          <span class="card-num">${roman(p.number)}</span>
          <span class="card-date">${escapeHtml(formatDate(p.date, lang))}</span>
        </span>
        <span class="card-title"${langAttrs(p)}>${escapeHtml(p.title)}</span>
        <span class="card-excerpt"${langAttrs(p)}>${excerpt(p.body, 4).map(escapeHtml).join('<br>')}</span>
        <span class="card-foot">
          <span class="card-tags">${tagsHtml(p.tags.slice(0, 2))}</span>
          <span class="card-read">${escapeHtml(t('archive.read'))} →</span>
        </span>
      </button>`).join('');
    grid.querySelectorAll('.reveal').forEach(el => revealer.observe(el));
  }

  grid.addEventListener('click', e => {
    const card = e.target.closest('.poem-card');
    if (card) openReader(card.dataset.id);
  });

  document.getElementById('search').addEventListener('input', e => { query = e.target.value; renderGrid(); });
  document.getElementById('featuredOpen').addEventListener('click', () => { const p = featuredPoem(); if (p) openReader(p.id); });

  /* ---------- Reader ---------- */
  const reader = document.getElementById('reader');
  const readerToggle = document.getElementById('readerToggle');
  let current = null;
  let view = 'fr';

  function fillReader(p) {
    document.getElementById('readerNum').textContent = 'N° ' + roman(p.number);
    const rt = document.getElementById('readerTitle');
    rt.textContent = p.title;
    setLang(rt, p);
    document.getElementById('readerDate').textContent = formatDate(p.date, lang);
    document.getElementById('readerTags').innerHTML = tagsHtml(p.tags);

    const fig = document.getElementById('readerFigure');
    fig.hidden = !p.image;
    if (p.image) { const img = document.getElementById('readerImage'); img.src = p.image; img.alt = p.title; }

    readerToggle.hidden = !p.translation;
    if (!p.translation) view = 'fr';
    readerToggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    const rb = document.getElementById('readerBody');
    rb.innerHTML = poemToHtml(view === 'en' ? p.translation : p.body);
    if (view === 'en') { rb.lang = 'en'; rb.removeAttribute('dir'); } else setLang(rb, p);

    const i = poems.indexOf(p);
    document.getElementById('readerPrev').disabled = i >= poems.length - 1; // older
    document.getElementById('readerNext').disabled = i <= 0;               // newer
  }

  function openReader(id, push = true) {
    const p = poems.find(x => x.id === id);
    if (!p) return;
    current = p;
    view = 'fr';
    fillReader(p);
    if (!reader.open) reader.showModal();
    reader.scrollTop = 0;
    if (push) history.replaceState(null, '', '#poeme/' + p.slug);
  }

  function closeReader() {
    if (reader.open) reader.close();
  }

  reader.addEventListener('close', () => {
    current = null;
    if (location.hash.startsWith('#poeme/')) history.replaceState(null, '', location.pathname + location.search);
  });
  reader.addEventListener('click', e => { if (e.target === reader) closeReader(); });
  document.getElementById('readerClose').addEventListener('click', closeReader);
  document.getElementById('readerPrev').addEventListener('click', () => { const i = poems.indexOf(current); if (poems[i + 1]) openReader(poems[i + 1].id); });
  document.getElementById('readerNext').addEventListener('click', () => { const i = poems.indexOf(current); if (poems[i - 1]) openReader(poems[i - 1].id); });
  readerToggle.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !current) return;
    view = b.dataset.view;
    fillReader(current);
  });
  reader.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') document.getElementById('readerPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('readerNext').click();
  });

  document.getElementById('readerCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t('reader.copied')); }
    catch { toast(location.href); }
  });

  function openFromHash() {
    const m = location.hash.match(/^#poeme\/(.+)$/);
    if (!m) return;
    const p = poems.find(x => x.slug === decodeURIComponent(m[1]));
    if (p) openReader(p.id, false);
  }
  window.addEventListener('hashchange', openFromHash);

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- Reveal on scroll ---------- */
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealer.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.featured, .about, .contact').forEach(el => { el.classList.add('reveal'); revealer.observe(el); });

  /* ---------- Boot ---------- */
  applyLang();
  loadPoems('poems.json')
    .then(list => {
      poems = numberPoems(list);
      renderFeatured();
      renderChips();
      renderGrid();
      openFromHash();
    })
    .catch(() => {
      count.textContent = t('archive.error');
      document.getElementById('dernier').hidden = true;
    });
})();
