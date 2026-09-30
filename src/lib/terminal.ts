export const PROMPT = "F:\\WEB>";

// Waits the given milliseconds
export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

// Below md: no console, no lens, faster prints
export const isMobile = () => matchMedia("(max-width: 47.999rem)").matches;

// Text progress bar, e.g. [#####.....]  50%
export function progressBar(percent: number, width = 20) {
    const filled = Math.round((percent / 100) * width);
    const bar = "#".repeat(filled) + ".".repeat(width - filled);
    return `[${bar}] ${String(percent).padStart(3)}%`;
}
