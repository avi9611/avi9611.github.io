// Draws the home page sculpture from a year of GitHub contributions.
//
// Seven bundles of wire twist through each other across the year, in two
// families turning opposite ways. Where a week was busy the form swells; quiet
// weeks pinch it in. The result is a transparent image the hero rebuilds out
// of particles.
//
//   node scripts/make-sculpture.mjs            # fetch the live feed
//   node scripts/make-sculpture.mjs days.json  # or use a saved copy
//
// Writes public/images/sculpture/{wide,tall}-{light,dark}.webp. Uses sharp,
// which Astro already installs, to rasterise the SVG.

import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const FEED = "https://raw.githubusercontent.com/avi9611/avi9611/output/days.json";
const OUT = new URL("../public/images/sculpture/", import.meta.url);
const WEEKS = 53;

async function load() {
  if (process.argv[2]) return JSON.parse(await readFile(process.argv[2], "utf8"));
  const response = await fetch(FEED);
  if (!response.ok) throw new Error(`Contribution feed answered ${response.status}`);
  return response.json();
}

const days = await load();
if (!Array.isArray(days) || days.length < 300) {
  throw new Error("Contribution feed is empty or covers well under a year");
}

// Weekly totals for the last 53 weeks, smoothed so the form reads as a shape, not a bar chart.
function weeklyActivity(list) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  // Bucket back from the latest day, so the newest week is always a full one.
  const recent = sorted.slice(-WEEKS * 7);
  const weeks = new Array(WEEKS).fill(0);
  recent.forEach((d, i) => {
    weeks[WEEKS - 1 - Math.floor((recent.length - 1 - i) / 7)] += d.count;
  });
  const sigma = 1.6;
  const smooth = weeks.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let j = 0; j < WEEKS; j++) {
      const k = Math.exp(-((i - j) ** 2) / (2 * sigma * sigma));
      sum += weeks[j] * k;
      weight += k;
    }
    return sum / weight;
  });
  const max = Math.max(...smooth) || 1;
  return smooth.map((v) => v / max);
}

const activity = weeklyActivity(days);
const activityAt = (u) => {
  const x = u * (WEEKS - 1);
  const i = Math.min(WEEKS - 2, Math.floor(x));
  const t = x - i;
  return activity[i] * (1 - t) + activity[i + 1] * t;
};

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Seeded so the same feed always draws the same sculpture.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tones per theme. Far wire fades toward the page and near wire stands out
// from it: darker on the light page, brighter on the dark one.
const TONES = {
  light: { near: 0.13, far: 0.7, glint: 0.3 },
  dark: { near: 0.9, far: 0.3, glint: 0.12 },
};

function draw({ length, breadth, tall, theme }) {
  const rand = rng(9611);
  const tone = TONES[theme];
  const segments = [];
  const PER_DAY = 20;
  const STEPS = 280;
  const reach = breadth * (tall ? 0.46 : 0.4);

  // Lay the form out along its length, then turn it upright for the tall image.
  const place = (along, across) => (tall ? [across, along] : [along, across]);
  // On phones the tall form runs down behind the name, so its lower end fades out.
  const fade = (u) => (tall ? 1 - smoothstep(0.5, 0.86, u) : 1);

  for (let day = 0; day < 7; day++) {
    for (let k = 0; k < PER_DAY; k++) {
      const dir = (day + k) % 2 === 0 ? 1 : -1;
      const phase = (day / 7) * Math.PI * 2 + (k / PER_DAY) * 0.9 + rand() * 0.25;
      const radius = 0.45 + rand() * 0.55;
      const turns = 1.35 + rand() * 0.35;
      const width = 1.6 + rand() * 1.9;
      let prev = null;
      for (let s = 0; s <= STEPS; s++) {
        const u = s / STEPS;
        const taper = Math.pow(Math.sin(Math.PI * u), 0.85);
        const swell = 0.22 + 0.78 * activityAt(u);
        const theta = phase + dir * Math.PI * 2 * turns * u;
        const spine = breadth / 2 + breadth * 0.05 * Math.sin(Math.PI * 2 * 0.85 * u + 0.6);
        const z = radius * Math.cos(theta);
        const along = length * (0.05 + 0.9 * u) + z * length * 0.008;
        const across = spine + reach * taper * swell * radius * Math.sin(theta);
        const point = { along, across, z, u, theta };
        if (prev) segments.push({ a: prev, b: point, width, radius });
        prev = point;
      }
    }
  }

  // Back to front, so nearer wire crosses over farther wire.
  segments.sort((p, q) => p.a.z + p.b.z - (q.a.z + q.b.z));

  const lines = segments.map(({ a, b, width, radius }) => {
    const z = (a.z + b.z) / 2;
    const near = (z / radius + 1) / 2;
    const u = (a.u + b.u) / 2;
    const end = Math.sqrt(Math.sin(Math.PI * u));
    const glint = Math.pow(Math.max(0, Math.sin(a.theta + 0.9)), 16);
    const lum = Math.min(1, tone.far + (tone.near - tone.far) * near + tone.glint * glint * near);
    const r = Math.round(255 * lum * 0.985);
    const g = Math.round(255 * lum * 0.99);
    const bl = Math.round(255 * Math.min(1, lum * 1.01));
    const alpha = (0.3 + 0.66 * near) * (0.35 + 0.65 * end) * fade(u);
    if (alpha < 0.02) return "";
    const w = width * (0.65 + 0.7 * near) * (0.4 + 0.6 * end);
    const [x1, y1] = place(a.along, a.across);
    const [x2, y2] = place(b.along, b.across);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgb(${r},${g},${bl})" stroke-opacity="${alpha.toFixed(2)}" stroke-width="${w.toFixed(2)}"/>`;
  });

  // Loose filings around the form, denser where the year was busier.
  const dust = [];
  for (let i = 0; i < 2600; i++) {
    const u = 0.03 + rand() * 0.94;
    const taper = Math.pow(Math.sin(Math.PI * u), 0.85);
    const swell = 0.22 + 0.78 * activityAt(u);
    if (rand() > 0.35 + 0.65 * swell) continue;
    const gauss = (rand() + rand() + rand() - 1.5) / 1.5;
    const spine = breadth / 2 + breadth * 0.05 * Math.sin(Math.PI * 2 * 0.85 * u + 0.6);
    const along = length * (0.05 + 0.9 * u) + (rand() - 0.5) * length * 0.02;
    const across = spine + reach * taper * swell * gauss * 1.25;
    const lum = tone.far + (tone.near - tone.far) * rand();
    const v = Math.round(255 * lum);
    if (fade(u) < 0.5) continue;
    const [x, y] = place(along, across);
    dust.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + rand() * 1.8).toFixed(2)}" fill="rgb(${v},${v},${Math.min(255, v + 3)})" fill-opacity="${(0.25 + rand() * 0.55).toFixed(2)}"/>`
    );
  }

  const [w, h] = tall ? [breadth, length] : [length, breadth];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g stroke-linecap="round">${lines.join("")}</g>${dust.join("")}</svg>`;
}

await mkdir(OUT, { recursive: true });

const shapes = {
  wide: { length: 2000, breadth: 800, tall: false },
  tall: { length: 1250, breadth: 1000, tall: true },
};

for (const [name, shape] of Object.entries(shapes)) {
  for (const theme of Object.keys(TONES)) {
    const svg = draw({ ...shape, theme });
    const file = new URL(`${name}-${theme}.webp`, OUT);
    await sharp(Buffer.from(svg)).webp({ quality: 78, alphaQuality: 80, effort: 6 }).toFile(file.pathname);
    console.log(`wrote ${file.pathname}`);
  }
}
