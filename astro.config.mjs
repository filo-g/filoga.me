// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

const fonts = "./src/assets/fonts/anonymous-pro";
/** @type {(name: string) => [string]} */
const font = (name) => [`${fonts}/AnonymousPro-${name}.woff2`];

// https://astro.build/config
export default defineConfig({
    site: "https://filoga.me",
    fonts: [{
        provider: fontProviders.local(),
        name: "Anonymous Pro",
        cssVariable: "--font-anonymous-pro",
        fallbacks: ["monospace"],
        options: {
            variants: [
                { src: font("Regular"), weight: 400 },
                { src: font("Italic"), weight: 400, style: "italic" },
                { src: font("Bold"), weight: 700 },
                { src: font("BoldItalic"), weight: 700, style: "italic" },
            ],
        },
    }],
    vite: {
        plugins: [tailwindcss()],
    },
});
