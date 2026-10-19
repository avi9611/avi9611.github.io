// Draws the home page sculpture from a year of GitHub contributions.
//
// Seven ribbons of fine gold strands twist through each other across the year,
// in two families turning opposite ways, and come apart into grains at both
// ends. Where a week was busy the form swells; quiet weeks pinch it in. The
// result is a transparent image the hero rebuilds out of particles.
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

// Champagne gold, from bronze shadow to pale highlight, as in the original
// sculpture. Each theme uses the part of the ramp that reads against its page:
// the light page needs the bronze, the dark page the highlights.
const RAMP = [
  [0, [31, 25, 18]],
  [0.3, [90, 74, 55]],
  [0.55, [156, 133, 101]],
  [0.75, [201, 181, 147]],
  [0.9, [230, 217, 191]],
  [1, [251, 245, 234]],
];
const TONES = {
  light: { lo: 0, hi: 0.92 },
  dark: { lo: 0.2, hi: 1 },
};

function gold(t) {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    const [b, cb] = RAMP[i];
    const [a, ca] = RAMP[i - 1];
    if (x <= b) {
      const k = (x - a) / (b - a);
      return ca.map((c, j) => Math.round(c + (cb[j] - c) * k));
    }
  }
  return RAMP[RAMP.length - 1][1];
}

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

function draw({ length, breadth, tall, theme }) {
  const rand = rng(9611);
  const tone = TONES[theme];
  const shade = (t) => gold(tone.lo + (tone.hi - tone.lo) * t);
  const segments = [];
  const RIBBONS = 7;
  const HAIRS = 46;
  const STEPS = 260;
  const reach = breadth * (tall ? 0.4 : 0.33);

  // Lay the form out along its length, then turn it upright for the tall image.
  const place = (along, across) => (tall ? [across, along] : [along, across]);
  // On phones the tall form runs down behind the name, so its lower end fades out.
  const fade = (u) => (tall ? 1 - smoothstep(0.5, 0.86, u) : 1);
  // Towards both ends the ribbon comes apart into grains.
  const loose = (u) => 1 - smoothstep(0.04, 0.24, Math.min(u, 1 - u));
  const spineAt = (u) => breadth / 2 + breadth * 0.05 * Math.sin(Math.PI * 2 * 0.85 * u + 0.6);
  const swellAt = (u) => 0.22 + 0.78 * activityAt(u);
  const taperAt = (u) => Math.pow(Math.sin(Math.PI * u), 0.85);

  // Where each ribbon's centre sits at u, and how it is turned.
  const ribbons = Array.from({ length: RIBBONS }, (_, i) => ({
    dir: i % 2 === 0 ? 1 : -1,
    phase: (i / RIBBONS) * Math.PI * 2 + rand() * 0.4,
    radius: 0.5 + rand() * 0.5,
    turns: 1.2 + rand() * 0.4,
    twist0: rand() * Math.PI * 2,
    twists: 1.5 + rand() * 1.5,
    band: 0.7 + rand() * 0.6,
  }));

  const centre = (r, u) => {
    const theta = r.phase + r.dir * Math.PI * 2 * r.turns * u;
    const scale = reach * taperAt(u) * swellAt(u) * r.radius;
    return { theta, z: r.radius * Math.cos(theta), across: spineAt(u) + scale * Math.sin(theta) };
  };

  for (const r of ribbons) {
    for (let h = 0; h < HAIRS; h++) {
      const offset = h / (HAIRS - 1) - 0.5 + (rand() - 0.5) * 0.04;
      const hairTone = (rand() - 0.5) * 0.18;
      const width = 0.7 + rand() * 0.8;
      const drift = rand() * Math.PI * 2;
      let prev = null;
      for (let s = 0; s <= STEPS; s++) {
        const u = s / STEPS;
        const c = centre(r, u);
        // The ribbon turns about its own length, so it shows its face, then its edge.
        const psi = r.twist0 + Math.PI * 2 * r.twists * u;
        const bandWidth = breadth * (tall ? 0.08 : 0.11) * r.band * (0.45 + swellAt(u)) * (0.3 + 0.7 * taperAt(u));
        const spread = 1 + loose(u) * 2.5;
        const o = offset * bandWidth * spread;
        const wander = loose(u) * breadth * 0.03 * Math.sin(drift + u * 40);
        const z = c.z + (Math.sin(psi) * o) / reach;
        const along = length * (0.05 + 0.9 * u) + z * length * 0.008;
        const across = c.across + Math.cos(psi) * o + wander;
        // Silk sheen: bright where the ribbon's face turns to the light, dark on its edge.
        const facing = Math.abs(Math.cos(psi - 0.5));
        const point = { along, across, z, u, facing };
        if (prev) segments.push({ a: prev, b: point, width, hairTone });
        prev = point;
      }
    }
  }

  // Back to front, so nearer ribbon crosses over farther ribbon.
  segments.sort((p, q) => p.a.z + p.b.z - (q.a.z + q.b.z));

  const lines = segments.map(({ a, b, width, hairTone }) => {
    const z = (a.z + b.z) / 2;
    const near = Math.min(1, Math.max(0, (z + 1) / 2));
    const u = (a.u + b.u) / 2;
    const facing = (a.facing + b.facing) / 2;
    const sheen = Math.pow(facing, 2.2) * 0.6 + Math.pow(facing, 24) * 0.35;
    const t = 0.04 + 0.32 * near + sheen + hairTone;
    const alpha = (0.35 + 0.6 * near) * (1 - 0.85 * loose(u)) * fade(u);
    if (alpha < 0.03) return "";
    const w = width * (0.7 + 0.6 * near);
    const [x1, y1] = place(a.along, a.across);
    const [x2, y2] = place(b.along, b.across);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${rgb(shade(t))}" stroke-opacity="${alpha.toFixed(2)}" stroke-width="${w.toFixed(2)}"/>`;
  });

  // Grains: lit beads clustered on the ribbons, thickest where they come apart.
  const LEVELS = 6;
  const defs = Array.from({ length: LEVELS }, (_, i) => {
    const t = 0.15 + (0.8 * i) / (LEVELS - 1);
    return `<radialGradient id="g${i}" cx="0.5" cy="0.5" r="0.5" fx="0.34" fy="0.3"><stop offset="0" stop-color="${rgb(shade(Math.min(1, t + 0.3)))}"/><stop offset="0.55" stop-color="${rgb(shade(t))}"/><stop offset="1" stop-color="${rgb(shade(Math.max(0, t - 0.25)))}"/></radialGradient>`;
  });
  const grains = [];
  for (let i = 0; i < 15000; i++) {
    const u = rand();
    const looseness = loose(u);
    // Most grains sit near the ends, where the form dissolves; some cling to the body.
    if (rand() > 0.28 + 0.72 * looseness) continue;
    if (fade(u) < 0.4) continue;
    const r = ribbons[Math.floor(rand() * RIBBONS)];
    const c = centre(r, u);
    const scatter = breadth * (0.012 + 0.09 * looseness * looseness);
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
    const along = length * (0.05 + 0.9 * u) + gauss() * scatter * 1.6;
    const across = c.across + gauss() * scatter;
    const big = rand() < 0.035;
    const radius = big ? 3 + rand() * 4.5 : 0.7 + Math.pow(rand(), 2) * 2.6;
    const near = (c.z + 1) / 2;
    const level = Math.min(LEVELS - 1, Math.max(0, Math.floor((0.25 + 0.6 * near + (rand() - 0.5) * 0.5) * LEVELS)));
    const [x, y] = place(along, across);
    grains.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(2)}" fill="url(#g${level})" fill-opacity="${(0.55 + 0.45 * rand()).toFixed(2)}"/>`
    );
  }

  // A fine spray off both tips.
  for (let i = 0; i < 2600; i++) {
    const side = rand() < 0.5 ? 0 : 1;
    const u = side ? 0.9 + rand() * 0.12 : -0.02 + rand() * 0.12;
    if (fade(Math.min(1, Math.max(0, u))) < 0.4) continue;
    const spread = breadth * 0.1 * (0.4 + Math.abs(u - 0.5) * 1.2);
    const along = length * (0.05 + 0.9 * u) + (rand() - 0.5) * length * 0.03;
    const across = spineAt(Math.min(1, Math.max(0, u))) + ((rand() + rand() + rand() - 1.5) / 1.5) * spread;
    const [x, y] = place(along, across);
    grains.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.45 + rand() * 0.9).toFixed(2)}" fill="${rgb(shade(0.2 + rand() * 0.6))}" fill-opacity="${(0.4 + 0.5 * rand()).toFixed(2)}"/>`
    );
  }

  const [w, h] = tall ? [breadth, length] : [length, breadth];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join("")}</defs><g stroke-linecap="round">${lines.join("")}</g>${grains.join("")}</svg>`;
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
