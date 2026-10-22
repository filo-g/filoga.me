// What a visitor can turn off, all on by default
export const SETTINGS = [
    {
        key: "keys",
        label: "Keyboard shortcuts",
        hint: "Number keys jump to sections, arrows browse, Esc goes up",
    },
    {
        key: "lens",
        label: "Screen curvature",
        hint: "Curved CRT glass, flat when off",
    },
    {
        key: "scanlines",
        label: "Scanlines",
        hint: "Lines and the refresh band over the screen",
    },
    {
        key: "trail",
        label: "Background trail",
        hint: "ASCII glow that follows the pointer",
    },
    {
        key: "ascii",
        label: "ASCII images",
        hint: "Images drawn in characters, plain when off",
    },
] as const;

export type Setting = (typeof SETTINGS)[number]["key"];

const STORE = "settings";

// Saved values, missing ones are on
export function read(): Record<string, boolean> {
    try {
        return JSON.parse(localStorage.getItem(STORE) ?? "{}");
    } catch {
        return {};
    }
}

export const isOn = (key: Setting) => read()[key] !== false;

// Turned off settings show as no-* classes on the root, see Head.astro
export function apply() {
    const saved = read();
    for (const { key } of SETTINGS) {
        document.documentElement.classList.toggle(
            `no-${key}`,
            saved[key] === false,
        );
    }
}

export function set(key: Setting, on: boolean) {
    const saved = read();
    saved[key] = on;
    try {
        localStorage.setItem(STORE, JSON.stringify(saved));
    } catch {}
    apply();
    document.dispatchEvent(
        new CustomEvent("settings:change", { detail: { key, on } }),
    );
}
