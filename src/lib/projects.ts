import { getCollection } from "astro:content";

// Projects in display order
export const projects = async () =>
    (await getCollection("projects")).sort(
        (a, b) => a.data.order - b.data.order,
    );
