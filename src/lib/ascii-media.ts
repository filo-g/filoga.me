import { bend } from "./crt";
import { isMobile } from "./terminal";

// Glyphs from dark to bright
const RAMP = " .:-=+*#%@";
// Cell height against the root font size, smaller means more detail
const DENSITY = 0.6;
// Touch barely sharpens anything, mobile starts finer
const MOBILE_DENSITY = 0.3;
// Fine chars per coarse one and axis under the pointer
const SPLIT = 3;
// Anonymous Pro characters are 0.546em wide
const ASPECT = 0.546;
// How much faster than the background a pass sharpens an image
const BOOST = 3;
// Color strength at rest and under the pointer
const SATURATION = 1.35;
const SATURATION_HOVER = 2.2;
// OKLCH lightness dark tones are lifted to so they read on the screen
const LIFT = 0.55;

interface Style {
    family: string;
}

const canvas = () => document.createElement("canvas");

// An image drawn as ASCII in its own colors in the field layer, below
// the screen.
// Under the pointer each char splits in SPLIT x SPLIT finer ones from a
// sample at that resolution, so it sharpens without leaving the ASCII look.
// Both versions are drawn once, each frame only blends them by energy
export class Media {
    columns = 0;
    rows = 0;
    energy = new Float32Array(0);
    box = new DOMRect();
    // Part of the image shown, top to bottom, 0 to 1
    shown = 0;
    // Room around the image for chars the lens bends past its edges
    pad = 0;
    dpr = 1;
    // Where the mask goes in the layer, the box as the lens shows it
    area = { x: 0, y: 0, width: 0, height: 0 };
    coarse = canvas();
    fine = canvas();
    // Energy as alpha, one pixel per cell, stretched over the image
    mask = canvas();
    blend = [canvas(), canvas()];

    constructor(readonly img: HTMLImageElement) {}

    // Samples and pre-drawn layers for the current size and lens
    layout(rem: number, screen: DOMRect, lens: boolean, style: Style) {
        this.box = this.img.getBoundingClientRect();
        const { left, top, width, height } = this.box;
        if (!width || !height || !this.img.naturalWidth) return;

        const size = rem * (isMobile() ? MOBILE_DENSITY : DENSITY);
        const columns = Math.max(1, Math.floor(width / (size * ASPECT)));
        const rows = Math.max(1, Math.floor(height / size));
        if (columns !== this.columns || rows !== this.rows) {
            this.energy = new Float32Array(columns * rows);
        }
        this.columns = columns;
        this.rows = rows;
        this.mask.width = columns;
        this.mask.height = rows;

        // Bent chars near the screen edge land well past the box
        const shift = lens
            ? Math.max(...[[left, top], [left + width, top],
                [left, top + height], [left + width, top + height]]
                .map(([x, y]) => {
                    const p = bend(x, y, screen);
                    return Math.max(Math.abs(p.x - x), Math.abs(p.y - y));
                }))
            : 0;
        this.pad = size + Math.ceil(shift);
        // Outer chars move with the lens, the mask has to follow them
        const corners = [[0, 0], [width, height]].map(([x, y]) => {
            const p = lens ? bend(left + x, top + y, screen) : {
                x: left + x,
                y: top + y,
            };
            return { x: p.x - left + this.pad, y: p.y - top + this.pad };
        });
        this.area = {
            x: corners[0].x,
            y: corners[0].y,
            width: corners[1].x - corners[0].x,
            height: corners[1].y - corners[0].y,
        };
        this.dpr = Math.min(devicePixelRatio, 2);
        const aspect = width / height;
        // Positions inside the layer, bent like the lens bends the content
        const at = (x: number, y: number) => {
            const p = lens ? bend(left + x, top + y, screen) : {
                x: left + x,
                y: top + y,
            };
            return { x: p.x - left + this.pad, y: p.y - top + this.pad };
        };
        const draw = (layer: HTMLCanvasElement, split: number, vivid = 1) => {
            const { levels, colors } = sample(
                this.img,
                columns * split,
                rows * split,
                aspect,
                vivid,
            );
            const ctx = this.prepare(layer);
            if (!ctx) return;
            // Bold strokes cover more of each cell, so color reads
            ctx.font = `bold ${(height / rows) / split}px ${style.family}`;
            const stepX = width / (columns * split);
            const stepY = height / (rows * split);
            const last = RAMP.length - 1;
            for (let row = 0; row < rows * split; row++) {
                for (let column = 0; column < columns * split; column++) {
                    const level = levels[row * columns * split + column];
                    if (!level) continue;
                    const glyph = RAMP[Math.round(level * last)];
                    const p = at((column + 0.5) * stepX, (row + 0.5) * stepY);
                    ctx.fillStyle = colors[row * columns * split + column];
                    ctx.fillText(glyph, p.x, p.y);
                }
            }
        };
        draw(this.coarse, 1, SATURATION);
        draw(this.fine, SPLIT, SATURATION_HOVER);
        for (const layer of this.blend) this.prepare(layer);
    }

    // Sized to the image plus the padding, in device pixels
    private prepare(layer: HTMLCanvasElement) {
        layer.width = Math.round((this.box.width + this.pad * 2) * this.dpr);
        layer.height = Math.round((this.box.height + this.pad * 2) * this.dpr);
        const ctx = layer.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        return ctx;
    }

    // Follows the image when the page scrolls, the layers stay as they are
    place() {
        this.box = this.img.getBoundingClientRect();
    }

    // Adds energy by distance to (x, y), stronger than the background.
    // Cells are spread evenly over the box, close to the bent ones
    add(x: number, y: number, reach: number, amount: (d: number) => number) {
        const { left, top, width, height } = this.box;
        const stepX = width / this.columns;
        const stepY = height / this.rows;
        for (let row = 0; row < this.rows; row++) {
            const dy = top + (row + 0.5) * stepY - y;
            if (Math.abs(dy) > reach) continue;
            for (let column = 0; column < this.columns; column++) {
                const dx = left + (column + 0.5) * stepX - x;
                const push = amount(Math.hypot(dx, dy));
                if (push <= 0) continue;
                const i = row * this.columns + column;
                this.energy[i] = Math.min(1, this.energy[i] + push * BOOST);
            }
        }
    }

    // Fades the sharpening, true while some is left
    fade(keep: number) {
        let alive = false;
        for (let i = 0; i < this.energy.length; i++) {
            const e = this.energy[i] * keep;
            this.energy[i] = e < 0.02 ? 0 : e;
            if (this.energy[i]) alive = true;
        }
        return alive;
    }

    // Extra sharpening on top of the energy, gone the frame after
    draw(
        ctx: CanvasRenderingContext2D,
        extra?: (x: number, y: number) => number,
    ) {
        if (!this.columns || !this.shown) return;
        const { left, top, width, height } = this.box;
        const x = left - this.pad;
        const y = top - this.pad;
        const w = width + this.pad * 2;
        const h = height + this.pad * 2;

        ctx.save();
        // Comes in top to bottom once the curtain is up
        ctx.beginPath();
        // Once whole it keeps the padding below too, bent chars live there
        const shown = this.shown < 1 ? this.pad + height * this.shown : h;
        ctx.rect(x, y, w, shown);
        ctx.clip();
        ctx.globalAlpha = 1;
        if (!extra && !this.energy.some(Boolean)) {
            ctx.drawImage(this.coarse, x, y, w, h);
            ctx.restore();
            return;
        }

        const mask = this.mask.getContext("2d");
        if (!mask) return ctx.restore();
        const pixels = mask.createImageData(this.columns, this.rows);
        const stepX = width / this.columns;
        const stepY = height / this.rows;
        for (let i = 0; i < this.energy.length; i++) {
            let e = this.energy[i];
            if (extra) {
                const cx = left + ((i % this.columns) + 0.5) * stepX;
                const cy = top + (Math.floor(i / this.columns) + 0.5) * stepY;
                e = Math.max(e, extra(cx, cy));
            }
            pixels.data[i * 4 + 3] = e * 255;
        }
        mask.putImageData(pixels, 0, 0);

        // Coarse where the energy is low, fine where it is high
        const [dull, sharp] = this.blend;
        this.masked(dull, this.coarse, "destination-out");
        this.masked(sharp, this.fine, "destination-in");
        ctx.drawImage(dull, x, y, w, h);
        ctx.drawImage(sharp, x, y, w, h);
        ctx.restore();
    }

    private masked(
        target: HTMLCanvasElement,
        layer: HTMLCanvasElement,
        operation: GlobalCompositeOperation,
    ) {
        const ctx = target.getContext("2d");
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "copy";
        ctx.drawImage(layer, 0, 0);
        ctx.globalCompositeOperation = operation;
        // Smoothed, the sharp area fades softly into the rest
        ctx.imageSmoothingEnabled = true;
        const { x, y, width, height } = this.area;
        const dpr = this.dpr;
        ctx.drawImage(this.mask, x * dpr, y * dpr, width * dpr, height * dpr);
        ctx.restore();
    }
}

// Luminance per cell, 0 to 1, stretched to use the whole ramp, and the
// cell's own color, lifted so dark tones still read on the dark screen
function sample(
    img: HTMLImageElement,
    columns: number,
    rows: number,
    aspect: number,
    saturation: number,
) {
    const grid = document.createElement("canvas");
    grid.width = columns;
    grid.height = rows;
    const ctx = grid.getContext("2d", { willReadFrequently: true });
    const levels = new Float32Array(columns * rows);
    const colors: string[] = [];
    if (!ctx) return { levels, colors };

    // Same crop as object-fit: cover, the browser averages each cell
    const h = Math.min(img.naturalHeight, img.naturalWidth / aspect);
    const w = h * aspect;
    const x = (img.naturalWidth - w) / 2;
    const y = (img.naturalHeight - h) / 2;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, w, h, 0, 0, columns, rows);

    const { data } = ctx.getImageData(0, 0, columns, rows);
    for (let i = 0; i < levels.length; i++) {
        const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
        const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        levels[i] = l;
        // In OKLCH, so lifting dark tones and boosting chroma keep the hue
        // and bright colors don't clip back toward white
        const [lightness, chroma, hue] = oklch(r, g, b);
        const lit = Math.max(lightness, LIFT);
        colors.push(`oklch(${lit} ${chroma * saturation} ${hue})`);
    }
    return { levels: equalize(levels), colors };
}

// sRGB 0-255 to OKLCH lightness, chroma and hue in degrees
function oklch(r: number, g: number, b: number) {
    const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg
        + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg
        + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg
        + 0.6299787005 * lb);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const hue = (Math.atan2(B, A) * 180) / Math.PI;
    return [L, Math.hypot(A, B), hue < 0 ? hue + 360 : hue];
}

// Spreads the tones over the whole ramp by rank, so a mostly bright or
// mostly dark image still keeps its shapes instead of one flat glyph
function equalize(levels: Float32Array) {
    const sorted = Float32Array.from(levels).sort();
    const last = sorted.length - 1 || 1;
    // Share of cells darker than this one, so the darkest stay dark
    const rank = (l: number) => {
        let low = 0;
        let high = last;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (sorted[mid] < l) low = mid + 1;
            else high = mid;
        }
        return low / last;
    };
    // Half and half with the plain level keeps flat areas flat
    const range = sorted[last] - sorted[0] || 1;
    return levels.map((l) => (rank(l) + (l - sorted[0]) / range) / 2);
}
