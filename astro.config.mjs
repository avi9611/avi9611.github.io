// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://avi9611.github.io',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap(), react()],
  // Self-hosted from the Fontsource packages (OFL), so the first visit makes
  // no third-party request, the hero's faces can be preloaded, and Astro sizes
  // the fallbacks to match while they load. Latin only: the copy is English.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-geist',
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
      options: {
        variants: [{ src: ['@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      fallbacks: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      options: {
        variants: [{ src: ['@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument-serif',
      fallbacks: ['Times New Roman', 'serif'],
      options: {
        variants: [
          { src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'], weight: 400, style: 'normal' },
          { src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'], weight: 400, style: 'italic' },
        ],
      },
    },
  ],
});
