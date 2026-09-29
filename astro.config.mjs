// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

const fonts = "./src/assets/fonts/space-mono";
const font = (name) => [`${fonts}/SpaceMono-${name}.woff2`];

// https://astro.build/config
export default defineConfig({
    fonts: [{
        provider: fontProviders.local(),
        name: "Space Mono",
        cssVariable: "--font-space-mono",
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
