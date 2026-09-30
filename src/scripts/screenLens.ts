// Fraction of the screen displaced at the corners
const CURVATURE = 0.035;
const MAP_RESOLUTION = 0.25;

const screenEl = document.querySelector<HTMLElement>(".screen");
const mapX = document.getElementById("screenLensMapX");
const mapY = document.getElementById("screenLensMapY");
const displacement = document.getElementById("screenLensDisplacement");
const glow = document.querySelector<HTMLElement>(".screen-glow");

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

    // Tube silhouette for the glow
    const inside = (u: number, v: number) => {
        const bulge = 1 + CURVATURE * (u * u + v * v);
        return Math.abs(u * bulge) <= 1 && Math.abs(v * bulge) <= 1 ? 1 : 0;
    };
    glow?.style.setProperty(
        "--tube",
        `url(${alphaMap(mapWidth, mapHeight, inside)})`,
    );
}

type UAData = { brands: { brand: string }[] };
const uaData = (navigator as Navigator & { userAgentData?: UAData })
    .userAgentData;
const isChromium = uaData?.brands.some(({ brand }) => brand === "Chromium");

const unsupported = [
    matchMedia("(prefers-reduced-motion: reduce)"),
    matchMedia("(max-width: 47.999rem)"),
    // Chromium color-converts the lens map on wide gamut screens
    ...(isChromium ? [matchMedia("(color-gamut: p3)")] : []),
];

if (screenEl && mapX && mapY && displacement) {
    let frame = 0;
    let size = { width: 0, height: 0 };

    const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const enabled = !unsupported.some((query) => query.matches);
            if (enabled) buildLens(size.width, size.height);
            screenEl.classList.toggle("screen--lens", enabled);
        });
    };

    new ResizeObserver(([entry]) => {
        size = entry.contentRect;
        update();
    }).observe(screenEl);
    unsupported.forEach((query) => query.addEventListener("change", update));
}
