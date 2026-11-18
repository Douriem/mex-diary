# Mex Diary

Gothic journal of philosophical poetry by Mexem — in French and Arabic.

## Files
- `index.html` — the public site (featured poem, searchable archive, reader, about, contact; FR/EN interface).
- `admin.html` — **L’atelier**, the dashboard where Mexem writes and publishes poems. Not linked from the site.
- `poems.json` — every poem. The site reads it; the dashboard writes it.
- `assets/` — styles (`css/`) and scripts (`js/`).

## Posting a poem (one-time setup)
1. On GitHub: **Settings → Developer settings → Fine-grained tokens → Generate new token**.
   - Repository access: *Only select repositories* → `mex-diary`.
   - Permissions → **Contents: Read and write**. Nothing else.
2. Open `https://douriem.github.io/mex-diary/admin.html` → **Réglages**:
   account `Douriem`, repository `mex-diary`, branch `main`, file `poems.json`, paste the token → **Tester la connexion** → **Enregistrer**.
3. Write, preview, then **Publier**. The site updates within a minute or two.

The token stays only in that browser. Without it, the dashboard still works as a local draft space and can download `poems.json`.

## Poem format
Blank line = new stanza. `lang` is `fr` or `ar` (Arabic is shown right-to-left). Optional: `translation` (English), `image` (URL), `featured` (shown first on the home page).
