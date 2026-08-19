# Pharmaceutical Influence & Vaccine Evidence

A static website presenting a compilation of five evidence-based reports:

1. **Pharma Money in the U.S. Senate** — `us-senate-contributions.html`
2. **Contributions vs. Drug-Pricing Votes** — `contributions-and-votes.html`
3. **COVID-19 Vaccines: Testing, Surveillance & Evidence Gaps** — `covid-vaccines.html`
4. **Pharma Influence in Canadian Federal Politics** — `canada-pharma-influence.html`
5. **Questions & Answers** — `questions-and-answers.html`

Plus a **Sources & Method** colophon (`about.html`) and the home page (`index.html`).

## Tech

Plain HTML + CSS with one small hand-written vanilla-JS file for the interactive graphics.
**No build step, no dependencies, no JavaScript framework, no CDN scripts.** Fonts load from Google
Fonts. It works by opening `index.html` directly in a browser, and is ready to serve as-is from
GitHub Pages.

```
pharma-influence-reports/
├── index.html
├── us-senate-contributions.html
├── contributions-and-votes.html
├── covid-vaccines.html
├── canada-pharma-influence.html
├── questions-and-answers.html
├── about.html
├── .nojekyll
└── assets/
    ├── styles.css
    └── charts.js        # interactive graphics (progressive enhancement)
```

### Interactive graphics

`assets/charts.js` adds five hand-coded, dependency-free widgets. Each **progressively enhances** a
static fallback that is already in the HTML, so every page is fully readable with JavaScript
disabled:

- **Report 01** — sortable / party-filterable Top-20 chart + table
- **Report 02** — money-vs-vote beeswarm scatter (data lives in an inline `<script type="application/json">`)
- **Report 03** — a relative-vs-absolute risk toggle (95% vs ~0.84% / 119-person waffle)
- **Report 03 & 04** — clickable, keyboard-navigable event timelines (data inline as JSON)

## Preview locally

Just open `index.html` in a browser. Or run a tiny local server from this folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish to GitHub Pages

1. Create a new GitHub repository. The repo name becomes the URL path, e.g. a repo named
   `pharma-influence-reports` publishes to `https://<username>.github.io/pharma-influence-reports/`.
   Rename this folder first if you want a different URL.
2. Put the **contents of this folder** at the root of the repository (so `index.html` is at the
   repo root), then commit and push:
   ```bash
   git init
   git add .
   git commit -m "Add site"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a
   branch"**, choose branch `main` and folder `/ (root)`, then **Save**.
4. Wait a minute; the site appears at the URL shown on that Pages settings screen.

The included `.nojekyll` file tells GitHub Pages to serve the files as-is (no Jekyll processing).

## Editing

All content lives directly in the `.html` files; shared styling is in `assets/styles.css`. Data
tables and the bar chart are plain HTML, so figures can be corrected by editing the numbers in
place. The navigation and footer are duplicated in each page — if you change a nav link, update it
in every file.

## Note on the content

These reports are presented as an informational archive. They preserve the source material's
caveats — including that correlation is not causation, and that the COVID-19 report is a critique of
evidence quality, not medical advice or a recommendation for or against vaccination.
