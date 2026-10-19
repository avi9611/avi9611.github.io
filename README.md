# avi9611.github.io

My portfolio and CV. Astro + Tailwind, deployed to GitHub Pages.

Live: <https://avi9611.github.io>

## Deeper documentation

Detailed notes live one level up, in `my-profile/docs/` — file-by-file reference,
the CV build, decisions and why they were made. They are kept **outside this repo
on purpose**: they name client projects, and this repo is public.

## Structure

```text
resume/
  resume.html        the CV, content and print CSS in one file
  build.sh           renders it to public/avinashresume.pdf
src/
  data/*.json        all content lives here, not in components
  components/*.astro one section each
  components/ui/     vendored React components, kept as close to upstream as possible
  pages/             home, /projects, /projects/[id], /blog, /activity
  styles/global.css  design tokens for light and dark, plus shared classes
public/              images, the link-preview card (images/og.png) and the built CV
```

Content is in `src/data/`. To change what the site says, edit the JSON, not the
components.

The home page opens with the sculpture hero (see below): the name, and the
tagline from `personal.json`. Straight after it, "Decided on day one" lists four
decisions from the essay, kept in `decisions.json`. The year of contributions
sits further down, after Experience.

The first client project in `projects.json` is the case study on the home page.
Its `metrics` and `architecture` fields fill the numbers and the flow diagram, on
the home page and on its own page. Its `decisions` field lists the question,
what was decided, and what that buys, on its own page. `roleShort` is the
one-line role on the smaller client cards.

Project screenshots go in `public/images/` as WebP, no wider than 1200px. A raw
full-screen PNG is several megabytes, and everything in `public/` ships whether a
page uses it or not.

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
- The hero is React, so `HomeHero.tsx` does the same re-check for its copy after
  hydration.
- `resume/resume.html` has no tenure in it, so the PDF never goes stale on its own.
  Rebuild it whenever its text changes.

Write `{duration}` inside a string in `personal.json` or `experience.json` and it
gets replaced at render.

## The sculpture hero

The hero is `liquid-sculpture-hero` by Guglielmo Giannattasio, from 21st.dev,
vendored in `src/components/ui/`. It rebuilds an image out of GPU particles that
turn liquid under the cursor, and shows the plain image where WebGL2 is missing.
Edit it as little as possible; `src/components/HomeHero.tsx` wraps it instead, to
follow the site's theme switch and keep the tenure current. The footer credits
the author.

The sculpture images are the component's own, a wide and a tall (phone) version
for each theme, in `public/images/sculpture/`. They are served from this site
rather than the 21st.dev CDN. Each sits on a flat background that the hero keys
out by colour, so the `background` and `darkBackground` passed in `Hero.astro`
must stay equal to `--bg` in `global.css`. Replacement images need a flat
background in that colour too, or a transparent one.

On a first visit nothing in the hero jumps. The server sends the copy but no
sculpture: an inline script in `Hero.astro` starts the right file downloading
(tall below 640px, light or dark) while the page parses, and the hero fades the
sculpture in only once it is drawn in place.

## The site is dated

The footer carries the site's revision number and the date of the last commit,
with a link to the change log on GitHub. Both come from git at build time
(`src/lib/revision.ts`), which is why the workflow checks out the full history
(`fetch-depth: 0`). In a shallow clone the count would be wrong, so the line is
left out instead.

## Theme

`src/styles/global.css` holds the tokens: warm paper and near-black ink, taken
from the sculpture hero, in Geist with Instrument Serif italic for emphasis
(`<em>` inside a `.section-title`). There is no colour accent; `--accent` is the
ink. Light is the base; `html[data-theme="dark"]` overrides only what changes. The toggle writes to `localStorage`, and an inline
script in `Layout.astro` applies the theme before first paint so there is no flash.

The fonts are self-hosted from the Fontsource packages through the `fonts`
setting in `astro.config.mjs`, so a first visit makes no request to Google. The
headline's two faces are preloaded, and Astro sizes the fallbacks to match, so
the text does not reflow when they arrive.

The first page of a visit settles in: the header fades in, then the page, or on
the home page the hero's lines one after another (the Arrival block in
`global.css`). Pages reached through the site's own links only cross-fade.

With no colour accent, a hover can't rely on a colour change. Text links
underline (`.hover-line`), arrows step forward (`.go`, `.go-back`), cards shade,
and buttons change fill. Give anything new that is clickable one of these.

The page column (`.shell`) runs as wide as the screen up to `--shell-max`, with a
side margin (`--gutter`) that grows with it. Prose keeps its own `max-w-[42rem]`.

Base element resets live inside `@layer base` on purpose. Unlayered CSS beats
layered CSS in the cascade, so an unlayered `p { margin: 0 }` would silently
override every Tailwind margin utility.
