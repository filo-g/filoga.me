import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
    loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            year: z.number(),
            type: z.string(),
            summary: z.string(),
            stack: z.array(z.string()),
            url: z.url().optional(),
            repo: z.url().optional(),
            images: z.array(z.object({ src: image(), alt: z.string() })),
            order: z.number(),
        }),
});

export const collections = { projects };
