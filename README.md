# avi9611.github.io

My portfolio and CV. Astro + Tailwind, deployed to GitHub Pages.

Live: <https://avi9611.github.io>

## Structure

```text
resume/
  resume.html        the CV, content and print CSS in one file
  build.sh           renders it to public/avinashresume.pdf
src/
  data/*.json        all content lives here, not in components
  components/*.astro one section each
  pages/             home, /projects, /projects/[id], /blog
  styles/global.css  design tokens for light and dark, plus shared classes
public/              images and the built CV
```

Content is in `src/data/`. To change what the site says, edit the JSON, not the
components.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on <http://localhost:4321> |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the build locally |
| `./resume/build.sh` | Rebuild the CV PDF |

## Updating the CV

Edit `resume/resume.html`, then:

```bash
./resume/build.sh
```

It renders through headless Chrome to `public/avinashresume.pdf`. One A4 page,
selectable text so applicant tracking systems can parse it. If you add enough
content to spill onto a second page, cut something rather than shrinking the
type below about 8.5pt.

Check the page count after a change:

```bash
pdftotext -layout public/avinashresume.pdf - | head -40
```

## Tenure that updates itself

No month or year is typed by hand anywhere. Everything derives from one start
date, `currentSinceISO` in `src/data/personal.json`.

- `src/lib/duration.ts` counts months inclusively, the way LinkedIn does: Dec 2025
  to Aug 2026 is 9 months, not 8.
- `src/components/Duration.astro` renders it. The build writes today's value, so
  the HTML is right for crawlers and for anyone with JavaScript off.
- A script in `Layout.astro` re-checks it on page load, so it is still right months
  after the last deploy.
- The workflow also rebuilds on the 1st of each month, which keeps the served HTML
  fresh even with no pushes.
- `resume/resume.html` does the same for the PDF, with its own copy of the logic so
  the file still works opened directly in a browser.

Write `{duration}` inside a string in `personal.json` or `experience.json` and it
gets replaced at render.

## Theme

`src/styles/global.css` holds the tokens. Light is the base; `html[data-theme="dark"]`
overrides only what changes. The toggle writes to `localStorage`, and an inline
script in `Layout.astro` applies the theme before first paint so there is no flash.

Base element resets live inside `@layer base` on purpose. Unlayered CSS beats
layered CSS in the cascade, so an unlayered `p { margin: 0 }` would silently
override every Tailwind margin utility.
