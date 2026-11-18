/* Max Diary — helpers shared by the public site and the dashboard */
(function () {
  const ROMAN = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];

  function roman(n) {
    let out = '';
    for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
    return out || '—';
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* Blank lines separate stanzas; single newlines are line breaks. */
  function stanzas(body) {
    return String(body || '').replace(/\r/g, '').trim().split(/\n\s*\n/).map(s => s.split('\n'));
  }

  function poemToHtml(body) {
    return stanzas(body)
      .map(lines => '<p class="stanza">' + lines.map(escapeHtml).join('<br>') + '</p>')
      .join('');
  }

  function excerpt(body, maxLines = 4) {
    return String(body || '').replace(/\r/g, '').split('\n').filter(l => l.trim()).slice(0, maxLines);
  }

  /* Attributes for a poem written in Arabic (right-to-left) */
  function langAttrs(p) {
    return p && p.lang === 'ar' ? ' lang="ar" dir="rtl"' : ' lang="fr"';
  }

  /* Accent- and harakat-insensitive text for search */
  function fold(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036F\u064B-\u0652\u0670]/g, '').toLowerCase();
  }

  function slugify(str) {
    return String(str || '')
      .normalize('NFD').replace(/[\u0300-\u036F]/g, '')
      .toLowerCase().replace(/['’]/g, '-')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'poeme';
  }

  /* Oldest first gets N° I; returned list is newest first. */
  function numberPoems(poems) {
    const asc = [...poems].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.title || '').localeCompare(b.title || ''));
    asc.forEach((p, i) => { p.number = i + 1; });
    return asc.reverse();
  }

  function formatDate(iso, lang) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function normalize(data) {
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.poems) ? data.poems : []);
    return list.filter(p => p && p.title && p.body).map(p => ({
      id: p.id || 'p-' + slugify(p.title),
      slug: p.slug || slugify(p.title),
      title: p.title,
      date: p.date || '',
      lang: p.lang === 'ar' ? 'ar' : 'fr',
      tags: Array.isArray(p.tags) ? p.tags : [],
      featured: !!p.featured,
      body: p.body,
      translation: p.translation || '',
      image: p.image || ''
    }));
  }

  async function loadPoems(url = 'poems.json') {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return normalize(await res.json());
  }

  const store = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
  };

  window.MD = { roman, escapeHtml, stanzas, poemToHtml, excerpt, slugify, langAttrs, fold, numberPoems, formatDate, normalize, loadPoems, store };
})();
