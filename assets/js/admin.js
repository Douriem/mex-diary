/* Mex Diary — L'atelier: write poems and publish them to poems.json on GitHub */
(function () {
  const { roman, escapeHtml, poemToHtml, slugify, numberPoems, formatDate, normalize, loadPoems, store, fold } = window.MD;

  const $ = id => document.getElementById(id);
  const KEY_SETTINGS = 'md-settings';
  const KEY_TOKEN = 'md-token';
  const KEY_WORKING = 'md-working';

  /* ---------- State ---------- */
  let poems = [];          // working copy
  let selectedId = null;
  let dirty = false;       // differs from what is published
  let changedIds = new Set();

  const settings = Object.assign({ owner: '', repo: '', branch: 'main', path: 'poems.json' }, store.get(KEY_SETTINGS, {}));
  let token = store.get(KEY_TOKEN, '');

  const connected = () => !!(settings.owner && settings.repo && token);

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, isErr = false) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.toggle('err', isErr);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), isErr ? 5000 : 2800);
  }

  /* ---------- GitHub API ---------- */
  function toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromBase64(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  function apiUrl() {
    const path = settings.path.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${path}`;
  }

  async function gh(method, body) {
    const url = apiUrl() + (method === 'GET' ? `?ref=${encodeURIComponent(settings.branch)}&t=${Date.now()}` : '');
    const res = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    if (method === 'GET' && res.status === 404) return null;
    if (!res.ok) {
      let msg = `GitHub a répondu ${res.status}`;
      if (res.status === 401) msg = 'Jeton refusé (expiré ou mal copié).';
      if (res.status === 403) msg = 'Le jeton n’a pas le droit d’écrire dans ce dépôt.';
      if (res.status === 404) msg = 'Dépôt ou branche introuvable.';
      if (res.status === 409) msg = 'Conflit : le fichier a changé entre-temps. Réessaie.';
      throw new Error(msg);
    }
    return res.json();
  }

  async function fetchRemote() {
    const file = await gh('GET');
    if (!file) return { poems: [], sha: null };
    return { poems: normalize(JSON.parse(fromBase64(file.content))), sha: file.sha };
  }

  function serialize(list) {
    const clean = [...list]
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title))
      .map(p => ({
        id: p.id, slug: p.slug, title: p.title, date: p.date, lang: p.lang,
        tags: p.tags, featured: !!p.featured, body: p.body, translation: p.translation || '', image: p.image || ''
      }));
    return JSON.stringify({ poems: clean }, null, 2) + '\n';
  }

  /* ---------- Status ---------- */
  function setStatus(kind, text) {
    const el = $('status');
    el.classList.toggle('ok', kind === 'ok');
    el.classList.toggle('err', kind === 'err');
    $('statusText').textContent = text;
    el.title = text;
  }
  function refreshStatus() {
    if (connected()) setStatus('ok', `GitHub · ${settings.owner}/${settings.repo}`);
    else setStatus('', 'Mode local');
  }

  /* ---------- Dirty tracking ---------- */
  function markDirty(id) {
    dirty = true;
    if (id) changedIds.add(id);
    store.set(KEY_WORKING, { poems, changed: [...changedIds], at: Date.now() });
    flashSaved();
    renderDirty();
  }
  function clearDirty() {
    dirty = false;
    changedIds = new Set();
    store.remove(KEY_WORKING);
    renderDirty();
    renderList();
  }
  function renderDirty() {
    const n = changedIds.size;
    $('dirtyNote').hidden = !dirty;
    $('dirtyNote').textContent = n > 1 ? `${n} poèmes modifiés, pas encore publiés` : 'Modifications pas encore publiées';
    $('publish').disabled = !dirty;
  }
  let savedTimer;
  function flashSaved() {
    const el = $('savedHint');
    el.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- List ---------- */
  function renderList() {
    const q = fold($('listSearch').value.trim());
    const ordered = numberPoems(poems.map(p => p)); // newest first, sets p.number
    const shown = ordered.filter(p => !q || fold(p.title + ' ' + p.body + ' ' + p.tags.join(' ')).includes(q));
    $('list').innerHTML = shown.length ? shown.map(p => `
      <li>
        <button type="button" data-id="${escapeHtml(p.id)}" aria-current="${p.id === selectedId}">
          <span class="li-title"${p.lang === 'ar' ? ' lang="ar" dir="rtl"' : ''}>${escapeHtml(p.title || 'Sans titre')}</span>
          <span class="li-flags">${p.featured ? '<span title="À la une">★</span>' : ''}${changedIds.has(p.id) ? '<span class="dot" title="Non publié"></span>' : ''}</span>
          <span class="li-meta">N° ${roman(p.number)} · ${escapeHtml(formatDate(p.date, 'fr') || 'sans date')}${p.lang === 'ar' ? ' · العربية' : ''}</span>
        </button>
      </li>`).join('')
      : `<li class="list-empty">${poems.length ? 'Aucun résultat.' : 'Aucun poème pour l’instant.'}</li>`;
  }

  $('list').addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (b) select(b.dataset.id);
  });
  $('listSearch').addEventListener('input', renderList);

  /* ---------- Editor ---------- */
  const f = {
    title: $('fTitle'), date: $('fDate'), lang: $('fLang'), featured: $('fFeatured'),
    tags: $('fTags'), body: $('fBody'), translation: $('fTranslation'), image: $('fImage')
  };
  const current = () => poems.find(p => p.id === selectedId);

  function applyDir(p) {
    const ar = p.lang === 'ar';
    [f.title, f.body].forEach(el => { el.lang = ar ? 'ar' : 'fr'; el.dir = ar ? 'rtl' : 'ltr'; });
    f.body.placeholder = ar ? 'اكتبي هنا…' : 'Écris ici…';
  }

  function select(id) {
    selectedId = id;
    const p = current();
    $('editorEmpty').hidden = !!p;
    $('form').hidden = !p;
    document.body.classList.toggle('editing', !!p);
    if (!p) { renderList(); return; }
    f.title.value = p.title;
    f.date.value = p.date;
    f.lang.value = p.lang;
    f.featured.checked = p.featured;
    f.tags.value = p.tags.join(', ');
    f.body.value = p.body;
    f.translation.value = p.translation;
    f.image.value = p.image;
    applyDir(p);
    showTab('write');
    renderCounts();
    renderList();
    window.scrollTo({ top: 0 });
  }

  function uniqueSlug(base, id) {
    let slug = base, n = 2;
    while (poems.some(p => p.slug === slug && p.id !== id)) slug = `${base}-${n++}`;
    return slug;
  }

  function onField() {
    const p = current();
    if (!p) return;
    p.title = f.title.value;
    p.date = f.date.value;
    p.lang = f.lang.value;
    p.tags = f.tags.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    p.body = f.body.value;
    p.translation = f.translation.value;
    p.image = f.image.value.trim();
    if (p._new) p.slug = uniqueSlug(slugify(p.title), p.id);
    if (f.featured.checked !== p.featured) {
      poems.forEach(x => { if (x.featured && x.id !== p.id) { x.featured = false; changedIds.add(x.id); } });
      p.featured = f.featured.checked;
    }
    applyDir(p);
    renderCounts();
    markDirty(p.id);
    renderList();
  }
  Object.values(f).forEach(el => el.addEventListener('input', onField));
  f.featured.addEventListener('change', onField);
  f.lang.addEventListener('change', onField);

  function renderCounts() {
    const body = f.body.value.replace(/\r/g, '').trim();
    const lines = body ? body.split('\n').filter(l => l.trim()).length : 0;
    const stanzas = body ? body.split(/\n\s*\n/).length : 0;
    const words = body ? body.split(/\s+/).length : 0;
    $('counts').textContent = `${lines} vers · ${stanzas} strophe${stanzas > 1 ? 's' : ''} · ${words} mots`;
  }

  /* Tabs */
  function showTab(which) {
    const preview = which === 'preview';
    $('tabWrite').setAttribute('aria-selected', String(!preview));
    $('tabPreview').setAttribute('aria-selected', String(preview));
    $('paneWrite').hidden = preview;
    $('panePreview').hidden = !preview;
    if (preview) renderPreview();
  }
  $('tabWrite').addEventListener('click', () => showTab('write'));
  $('tabPreview').addEventListener('click', () => showTab('preview'));

  function renderPreview() {
    const p = current();
    if (!p) return;
    const ar = p.lang === 'ar';
    $('pvMeta').textContent = [formatDate(p.date, 'fr'), p.featured ? 'À la une' : ''].filter(Boolean).join(' · ');
    const title = $('pvTitle');
    title.textContent = p.title || 'Sans titre';
    title.lang = ar ? 'ar' : 'fr'; title.dir = ar ? 'rtl' : 'ltr';
    const body = $('pvBody');
    body.innerHTML = poemToHtml(p.body) || '<p class="stanza" style="color:var(--ash)">…</p>';
    body.lang = ar ? 'ar' : 'fr'; body.dir = ar ? 'rtl' : 'ltr';
    $('pvFigure').hidden = !p.image;
    if (p.image) $('pvImage').src = p.image;
    $('pvTags').innerHTML = p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  }

  /* New / delete */
  $('newPoem').addEventListener('click', () => {
    const today = new Date();
    const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const p = { id: 'p-' + Date.now().toString(36), slug: '', title: '', date: iso, lang: 'fr', tags: [], featured: false, body: '', translation: '', image: '', _new: true };
    poems.push(p);
    $('listSearch').value = '';
    select(p.id);
    markDirty(p.id);
    f.title.focus();
  });

  $('deletePoem').addEventListener('click', () => {
    const p = current();
    if (!p) return;
    if (!confirm(`Supprimer « ${p.title || 'Sans titre'} » ?\nIl disparaîtra du site à la prochaine publication.`)) return;
    poems = poems.filter(x => x.id !== p.id);
    changedIds.add(p.id);
    markDirty();
    select(null);
    toast('Poème supprimé — publie pour l’enlever du site.');
  });

  $('backToList').addEventListener('click', () => select(null));

  /* ---------- Publish ---------- */
  $('publish').addEventListener('click', async () => {
    const empty = poems.find(p => !p.title.trim() || !p.body.trim());
    if (empty) { select(empty.id); toast('Chaque poème a besoin d’un titre et d’un texte.', true); return; }

    poems.forEach(p => { if (!p.slug) p.slug = uniqueSlug(slugify(p.title), p.id); });

    if (!connected()) {
      toast('Connecte GitHub dans Réglages pour publier — ou télécharge poems.json.', true);
      openSettings();
      return;
    }

    const btn = $('publish');
    btn.disabled = true;
    btn.textContent = 'Publication…';
    try {
      const latest = await gh('GET');
      const n = changedIds.size;
      await gh('PUT', {
        message: n === 1 ? `Atelier : mise à jour d’un poème` : `Atelier : ${n} poèmes mis à jour`,
        content: toBase64(serialize(poems)),
        branch: settings.branch,
        ...(latest ? { sha: latest.sha } : {})
      });
      poems.forEach(p => { delete p._new; });
      clearDirty();
      toast('Publié ✝ En ligne d’ici une à deux minutes.');
    } catch (err) {
      toast(err.message || 'La publication a échoué.', true);
      setStatus('err', 'Erreur GitHub');
    } finally {
      btn.textContent = 'Publier';
      renderDirty();
    }
  });

  /* ---------- Settings ---------- */
  const s = { owner: $('sOwner'), repo: $('sRepo'), branch: $('sBranch'), path: $('sPath'), token: $('sToken') };

  function openSettings() {
    s.owner.value = settings.owner;
    s.repo.value = settings.repo;
    s.branch.value = settings.branch;
    s.path.value = settings.path;
    s.token.value = token;
    $('connResult').textContent = '';
    $('settings').showModal();
  }
  $('openSettings').addEventListener('click', openSettings);

  function readSettingsForm() {
    settings.owner = s.owner.value.trim();
    settings.repo = s.repo.value.trim();
    settings.branch = s.branch.value.trim() || 'main';
    settings.path = s.path.value.trim() || 'poems.json';
    token = s.token.value.trim();
  }

  $('saveSettings').addEventListener('click', () => {
    readSettingsForm();
    store.set(KEY_SETTINGS, settings);
    store.set(KEY_TOKEN, token);
    refreshStatus();
    $('settings').close();
    toast('Réglages enregistrés.');
  });

  $('forgetToken').addEventListener('click', () => {
    token = '';
    s.token.value = '';
    store.remove(KEY_TOKEN);
    refreshStatus();
    $('connResult').className = 'conn-result';
    $('connResult').textContent = 'Jeton effacé de ce navigateur.';
  });

  $('testConn').addEventListener('click', async () => {
    readSettingsForm();
    const out = $('connResult');
    out.className = 'conn-result';
    if (!connected()) { out.classList.add('err'); out.textContent = 'Il manque le compte, le dépôt ou le jeton.'; return; }
    out.textContent = 'Connexion…';
    try {
      const remote = await fetchRemote();
      out.classList.add('ok');
      out.textContent = remote.sha ? `Connecté ✓ ${remote.poems.length} poèmes trouvés dans ${settings.path}.` : `Connecté ✓ ${settings.path} n’existe pas encore : il sera créé.`;
    } catch (err) {
      out.classList.add('err');
      out.textContent = err.message;
    }
  });

  /* Export / import / reload */
  $('exportJson').addEventListener('click', () => {
    const blob = new Blob([serialize(poems)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'poems.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('importJson').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const list = normalize(JSON.parse(await file.text()));
      if (!list.length) throw new Error('vide');
      if (!confirm(`Remplacer les poèmes de l’atelier par les ${list.length} poèmes du fichier ?`)) return;
      poems = list;
      list.forEach(p => changedIds.add(p.id));
      markDirty();
      select(null);
      $('settings').close();
      toast(`${list.length} poèmes importés — publie pour les mettre en ligne.`);
    } catch {
      toast('Ce fichier n’est pas un poems.json valide.', true);
    }
  });

  $('reloadRemote').addEventListener('click', async () => {
    if (dirty && !confirm('Abandonner les modifications non publiées ?')) return;
    clearDirty();
    $('settings').close();
    await loadInitial(true);
    toast('Poèmes rechargés.');
  });

  /* ---------- Boot ---------- */
  async function loadInitial(ignoreWorking = false) {
    const working = ignoreWorking ? null : store.get(KEY_WORKING, null);
    if (working && Array.isArray(working.poems)) {
      const defaults = { title: '', body: '', date: '', lang: 'fr', tags: [], featured: false, translation: '', image: '', slug: '' };
      poems = working.poems.filter(p => p && p.id).map(p => Object.assign({}, defaults, p));
      changedIds = new Set(working.changed || []);
      dirty = true;
      toast('Brouillon non publié restauré.');
    } else {
      try {
        poems = connected() ? (await fetchRemote()).poems : await loadPoems('poems.json');
      } catch (err) {
        try { poems = await loadPoems('poems.json'); } catch { poems = []; }
        if (connected()) { setStatus('err', 'Erreur GitHub'); toast(err.message, true); }
      }
    }
    renderDirty();
    select(null);
  }

  refreshStatus();
  loadInitial();
})();
