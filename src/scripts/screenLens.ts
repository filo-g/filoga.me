// Fraction of the screen displaced at the corners
const CURVATURE = 0.035;
const MAP_RESOLUTION = 0.25;
const TUBE_RESOLUTION = 0.5;

const screenEl = document.querySelector<HTMLElement>(".screen");
const mapX = document.getElementById("screenLensMapX");
const mapY = document.getElementById("screenLensMapY");
const displacement = document.getElementById("screenLensDisplacement");

type Field = (u: number, v: number) => number;

// Alpha channel image from a field over the screen, u and v in [-1, 1]
function alphaMap(width: number, height: number, value: Field) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return "";

    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        const v = ((y + 0.5) / height) * 2 - 1;
        for (let x = 0; x < width; x++) {
            const u = ((x + 0.5) / width) * 2 - 1;
            const i = (y * width + x) * 4;
            image.data[i + 3] = Math.round(value(u, v) * 255);
        }
    }

    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
}

function buildLens(width: number, height: number) {
    const mapWidth = Math.max(2, Math.round(width * MAP_RESOLUTION));
    const mapHeight = Math.max(2, Math.round(height * MAP_RESOLUTION));
    // Max displacement at the corners (r² = 2)
    const scale = 2 * CURVATURE * Math.max(width, height);
    const barrel = (axis: number, u: number, v: number, size: number) =>
        0.5 + (axis * (u * u + v * v) * CURVATURE * (size / 2)) / scale;

    const x = alphaMap(mapWidth, mapHeight, (u, v) => barrel(u, u, v, width));
    const y = alphaMap(mapWidth, mapHeight, (u, v) => barrel(v, u, v, height));

    mapX?.setAttribute("href", x);
    mapY?.setAttribute("href", y);
    displacement?.setAttribute("scale", String(scale));
}

// Tube silhouette, for the glow and to shape the screen without the lens
function buildTube(width: number, height: number) {
    const tubeWidth = Math.max(2, Math.round(width * TUBE_RESOLUTION));
    const tubeHeight = Math.max(2, Math.round(height * TUBE_RESOLUTION));
    // Anti-aliased edge about a pixel wide
    const edge = 2 / Math.min(tubeWidth, tubeHeight);

    const inside = (u: number, v: number) => {
        const bulge = 1 + CURVATURE * (u * u + v * v);
        const reach = Math.max(Math.abs(u * bulge), Math.abs(v * bulge));
        return Math.min(1, Math.max(0, (1 - reach) / edge + 0.5));
    };
    const tube = alphaMap(tubeWidth, tubeHeight, inside);
    screenEl?.parentElement?.style.setProperty("--tube", `url(${tube})`);
}

type UAData = { brands: { brand: string }[] };
const uaData = (navigator as Navigator & { userAgentData?: UAData })
    .userAgentData;
const isChromium = uaData?.brands.some(({ brand }) => brand === "Chromium");
const ua = navigator.userAgent;
const isSafari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

// No CRT shape at all
const flat = [
    matchMedia("(prefers-reduced-motion: reduce)"),
    matchMedia("(max-width: 47.999rem)"),
];
// Tube shape only, the lens would bend wrong or crawl
const noLens = [
    // Chromium color-converts the lens map on wide gamut screens
    ...(isChromium ? [matchMedia("(color-gamut: p3)")] : []),
];

if (screenEl && mapX && mapY && displacement) {
    let frame = 0;
    let size = { width: 0, height: 0 };

    const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const shaped = !flat.some((query) => query.matches);
            const lens = shaped && !isSafari
                && !noLens.some((query) => query.matches);

            if (shaped) buildTube(size.width, size.height);
            if (lens) buildLens(size.width, size.height);
            screenEl.classList.toggle("screen--lens", lens);
            screenEl.classList.toggle("screen--tube", shaped && !lens);
        });
    };

    // Hit testing ignores the lens, map pointers to the DOM point shown
    const bent = (x: number, y: number) => {
        const box = screenEl.getBoundingClientRect();
        const u = ((x - box.left) / box.width) * 2 - 1;
        const v = ((y - box.top) / box.height) * 2 - 1;
        const r2 = u * u + v * v;
        return document.elementFromPoint(
            x + u * r2 * CURVATURE * (box.width / 2),
            y + v * r2 * CURVATURE * (box.height / 2),
        );
    };
    const lensOn = () => screenEl.classList.contains("screen--lens");
    const link = (el: Element | null) => el?.closest("a") ?? null;

    screenEl.addEventListener("click", (event) => {
        // Skip our own redirected click, it has no real coordinates
        if (!lensOn() || !event.isTrusted) return;
        const shown = link(bent(event.clientX, event.clientY));
        if (shown === link(event.target as Element)) return;
        event.preventDefault();
        event.stopPropagation();
        shown?.click();
    }, true);

    screenEl.addEventListener("pointermove", (event) => {
        const pointing = lensOn() && link(bent(event.clientX, event.clientY));
        screenEl.classList.toggle("is-pointing", Boolean(pointing));
    });

    new ResizeObserver(([entry]) => {
        size = entry.contentRect;
        update();
    }).observe(screenEl);
    [...flat, ...noLens].forEach((query) =>
        query.addEventListener("change", update),
    );
}
