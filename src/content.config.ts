import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Posts are Markdown files in src/content/blog/. The filename becomes the URL:
// src/content/blog/day-one-decisions.md -> /blog/day-one-decisions
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    // Set to true while writing. Drafts never appear in the build.
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
