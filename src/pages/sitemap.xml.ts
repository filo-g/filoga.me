import type { APIRoute } from "astro";
import { projects } from "../lib/projects";

const pages = ["/", "/projects", "/about", "/contact", "/resume"];

// Every public page, the 404 stays out
export const GET: APIRoute = async ({ site }) => {
    const paths = [
        ...pages,
        ...(await projects()).map(({ id }) => `/projects/${id}`),
    ];
    const urls = paths
        .map((path) => `<url><loc>${new URL(path, site)}</loc></url>`)
        .join("");
    const xml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        `${urls}</urlset>`;
    return new Response(xml, {
        headers: { "Content-Type": "application/xml" },
    });
};
