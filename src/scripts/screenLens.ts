// Barrel distortion strength (fraction of the screen size displaced at the corners)
const CURVATURE = 0.035;
// Displacement map resolution relative to the screen (it gets smoothed when stretched)
const MAP_RESOLUTION = 0.25;

const screen = document.querySelector<HTMLElement>(".screen");
const mapX = document.getElementById("screenLensMapX");
const mapY = document.getElementById("screenLensMapY");
const displacement = document.getElementById("screenLensDisplacement");

// Image where each pixel alpha stores its displacement (0.5 = no displacement)
function alphaMap(width: number, height: number, value: (u: number, v: number) => number) {
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
    // Max displacement happens at the corners (r² = 2), scale must cover it
    const scale = 2 * CURVATURE * Math.max(width, height);

    // Sample further from the center the closer we are to the edges
    const x = alphaMap(mapWidth, mapHeight, (u, v) => 0.5 + (u * (u * u + v * v) * CURVATURE * (width / 2)) / scale);
    const y = alphaMap(mapWidth, mapHeight, (u, v) => 0.5 + (v * (u * u + v * v) * CURVATURE * (height / 2)) / scale);

    mapX?.setAttribute("href", x);
    mapY?.setAttribute("href", y);
    displacement?.setAttribute("scale", String(scale));
}

// Chromium color-converts the displacement input on wide gamut screens (e.g. Mac P3), bending the lens
const isChromium = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.some(({ brand }) => brand === "Chromium") ?? false;
const unsupported = [
    matchMedia("(prefers-reduced-motion: reduce)"),
    matchMedia("(max-width: 47.999rem)"),
    ...(isChromium ? [matchMedia("(color-gamut: p3)")] : []),
];

if (screen && mapX && mapY && displacement) {
    let frame = 0;
    let size = { width: 0, height: 0 };

    const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const enabled = !unsupported.some((query) => query.matches);
            if (enabled) buildLens(size.width, size.height);
            screen.classList.toggle("screen--lens", enabled);
        });
    };

    new ResizeObserver(([entry]) => {
        size = entry.contentRect;
        update();
    }).observe(screen);
    unsupported.forEach((query) => query.addEventListener("change", update));
}
