import { Media } from "./ascii-media";
import { bend, unbend } from "./crt";

// Glyphs from faint to dense
const RAMP = " .:-=+*#%@";
// Energy kept per 16ms frame, a full glow fades out in about 2s
const DECAY = 0.97;
// Reach of the pointer, in cell heights
const RADIUS = 16;
// Opacity of the chars at full energy, kept low to sit behind the text
const ALPHA = 0.25;
// Time images take to show up, top to bottom, once the curtain is up
const SHOW = 600;
// A tap sends a ring across the page, px per ms and cell heights wide
const WAVE_SPEED = 0.45;
const WAVE_WIDTH = 6;
// Energy a ring leaves behind per frame as it passes, fading as usual
const WAVE_WAKE = 0.02;

interface Cell {
    x: number;
    y: number;
}

// Background grid of chars lit by the pointer, fading on their own.
// It reads as a trail although no path is kept, only energy per cell.
// Images marked data-ascii are drawn on top, see ascii-media.ts
export function asciiField(canvas: HTMLCanvasElement, screen: HTMLElement) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    const root = getComputedStyle(document.documentElement);

    let cells: Cell[] = [];
    // Content point each cell shows, the same as cells without the lens
    let sources: Cell[] = [];
    let energy = new Float32Array(0);
    let width = 0;
    let height = 0;
    let radius = 0;
    let frame = 0;
    let last = 0;
    let colors = { screen: "", phosphor: "" };
    let family = "monospace";
    let media: Media[] = [];
    let lifted = 0;
    let waves: { x: number; y: number; start: number }[] = [];
    let clock = 0;

    // Ring strength at a point, passing through without leaving energy
    function ring(x: number, y: number) {
        const band = WAVE_WIDTH * (radius / RADIUS);
        const reach = Math.hypot(width, height);
        let peak = 0;
        for (const wave of waves) {
            const r = (clock - wave.start) * WAVE_SPEED;
            const d = Math.hypot(x - wave.x, y - wave.y);
            const off = Math.abs(d - r) / band;
            if (off >= 1) continue;
            // Holds its strength most of the way, fades near the end
            const fade = Math.sqrt(1 - r / reach);
            peak = Math.max(peak, fade * (1 - off) ** 2);
        }
        return peak;
    }

    // Cells at the size of the screen text, bent like the lens bends it
    function layout() {
        const dpr = Math.min(devicePixelRatio, 2);
        ({ width, height } = canvas.getBoundingClientRect());
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const size = parseFloat(root.fontSize);
        const cellWidth = size * 0.546;
        const cellHeight = size * 1.25;
        radius = RADIUS * cellHeight;
        const columns = Math.ceil(width / cellWidth);
        const rows = Math.ceil(height / cellHeight);

        const lens = screen.classList.contains("screen--lens");
        const box = screen.getBoundingClientRect();
        cells = [];
        sources = [];
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const x = (column + 0.5) * cellWidth;
                const y = (row + 0.5) * cellHeight;
                cells.push(lens ? bend(x, y, box) : { x, y });
                sources.push({ x, y });
            }
        }
        // Same grid keeps its glow, only a new one starts dark
        if (energy.length !== cells.length) {
            energy = new Float32Array(cells.length);
        }
        family = root.getPropertyValue("--font-anonymous-pro") || "monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        colors = {
            screen: root.getPropertyValue("--color-screen"),
            phosphor: root.getPropertyValue("--color-phosphor"),
        };
        const style = { family };
        for (const item of media) item.layout(size, box, lens, style);
        draw();
    }

    // An image takes its place only where it has already been printed.
    // Content coordinates, the image box knows nothing of the lens
    function printed({ x, y }: Cell) {
        return media.some(({ box, shown }) =>
            x > box.left && x < box.right
            && y > box.top && y < box.top + box.height * shown);
    }

    function draw() {
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.screen;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = colors.phosphor;

        ctx.font = `${parseFloat(root.fontSize)}px ${family}`;
        const top = RAMP.length - 1;
        for (let i = 0; i < cells.length; i++) {
            const { x, y } = cells[i];
            const wave = waves.length ? ring(x, y) : 0;
            const e = Math.max(energy[i], wave);
            if (!e || printed(sources[i])) continue;
            // A little flicker on the way down keeps it alive
            const jitter = e < 0.9 && Math.random() < 0.15 ? 1 : 0;
            const glyph = RAMP[Math.min(top, Math.ceil(e * top) + jitter)];
            // Square root so the fading tail stays visible for longer
            ctx.globalAlpha = Math.sqrt(e) * ALPHA;
            ctx.fillText(glyph, cells[i].x, cells[i].y);
        }
        // Images ask in content coordinates, the rings live on the screen
        const box = screen.getBoundingClientRect();
        const extra = waves.length
            ? (x: number, y: number) => {
                const shown = lensOn() ? bend(x, y, box) : { x, y };
                return ring(shown.x, shown.y);
            }
            : undefined;
        for (const item of media) item.draw(ctx, extra);
    }

    function tick(now: number) {
        const keep = DECAY ** (Math.min(64, now - last) / 16);
        last = now;
        let alive = false;
        for (let i = 0; i < energy.length; i++) {
            const e = energy[i] * keep;
            energy[i] = e < 0.02 ? 0 : e;
            if (energy[i]) alive = true;
        }
        // Rings grow from each tap and weaken until past the far corner
        const reach = Math.hypot(width, height);
        waves = waves.filter(
            (wave) => (now - wave.start) * WAVE_SPEED < reach,
        );
        if (waves.length) alive = true;
        clock = now;
        // A little glow stays where the ring went by
        const band = WAVE_WIDTH * (radius / RADIUS);
        for (const wave of waves) {
            const r = (now - wave.start) * WAVE_SPEED;
            add(wave.x, wave.y, r + band, (d) => {
                const off = Math.abs(d - r) / band;
                return off < 1 ? WAVE_WAKE * (1 - off) : 0;
            });
        }
        for (const item of media) {
            if (item.fade(keep)) alive = true;
            if (lifted && item.shown < 1) {
                item.shown = Math.min(1, (now - lifted) / SHOW);
                alive = true;
            }
        }
        draw();
        // Idle once everything faded, nothing runs while still
        frame = alive ? requestAnimationFrame(tick) : 0;
    }

    // Adds energy by distance to (x, y), to the background and images
    function add(
        x: number,
        y: number,
        reach: number,
        amount: (d: number) => number,
    ) {
        for (let i = 0; i < cells.length; i++) {
            const dx = cells[i].x - x;
            const dy = cells[i].y - y;
            if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
            const push = amount(Math.hypot(dx, dy));
            if (push > 0) energy[i] = Math.min(1, energy[i] + push);
        }
        // Images sit in content coordinates, the pointer on the screen
        const at = lensOn()
            ? unbend(x, y, screen.getBoundingClientRect())
            : { x, y };
        for (const item of media) item.add(at.x, at.y, reach, amount);
    }

    // Lights the cells around a point, more the faster it moves
    function stir(x: number, y: number, speed: number) {
        const strength = Math.min(1, 0.3 + speed / 40) * 0.18;
        // Bell shaped, a wide soft glow rather than a spot
        add(x, y, radius, (d) =>
            d < radius ? strength * Math.exp(-((d / radius) ** 2) * 4) : 0);
        wake();
    }

    const now = () => performance.now();

    function wake() {
        if (frame) return;
        last = performance.now();
        frame = requestAnimationFrame(tick);
    }

    // The lens turns on and off with the window, the cells follow it.
    // Other classes change on hover, those leave the grid alone
    function lensOn() {
        return screen.classList.contains("screen--lens");
    }

    let previous: { x: number; y: number } | undefined;
    const move = (x: number, y: number) => {
        const speed = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
        previous = { x, y };
        stir(x, y, speed);
    };

    addEventListener("pointermove", (event) => {
        if (event.pointerType === "mouse") move(event.clientX, event.clientY);
    });
    // Touch scrolls natively, follow the finger without blocking it
    addEventListener("touchmove", (event) => {
        const touch = event.touches[0];
        if (touch) move(touch.clientX, touch.clientY);
    }, { passive: true });
    addEventListener("touchend", () => (previous = undefined));
    addEventListener("touchstart", (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        waves.push({ x: touch.clientX, y: touch.clientY, start: now() });
        wake();
    }, { passive: true });
    document.addEventListener("mouseleave", () => (previous = undefined));

    // Images join once decoded, the real img stays as an empty slot
    for (const img of document.querySelectorAll<HTMLImageElement>(
        "[data-ascii] img",
    )) {
        img.decode().then(() => {
            media.push(new Media(img));
            // Its box can still move once fonts and layout settle
            new ResizeObserver(layout).observe(img);
            layout();
            img.closest("[data-ascii]")?.classList.add("is-ascii");
        }, () => {});
    }
    // Where the curtain has gone so far, images show down to that line
    document.addEventListener("curtain:row", (event) => {
        const bottom = (event as CustomEvent<number>).detail;
        for (const item of media) {
            const { top, height } = item.box;
            const part = Math.min(1, Math.max(0, (bottom - top) / height));
            item.shown = Math.max(item.shown, part);
        }
        draw();
    });
    // Shown after the curtain, so they never come in before the text
    document.addEventListener("curtain:lifted", () => {
        layout();
        lifted = performance.now();
        wake();
    });

    // Mobile scrolls the page under the fixed layer, images follow
    let scrolling = 0;
    addEventListener("scroll", () => {
        cancelAnimationFrame(scrolling);
        scrolling = requestAnimationFrame(() => {
            for (const item of media) item.place();
            draw();
        });
    }, { passive: true });

    new ResizeObserver(layout).observe(canvas);
    let lens = lensOn();
    new MutationObserver(() => {
        if (lens === lensOn()) return;
        lens = lensOn();
        layout();
    }).observe(screen, {
        attributes: true,
        attributeFilter: ["class"],
    });
    document.fonts.ready.then(layout);
    // Images draw in bold, a weight the page may not have loaded yet
    const face = root.getPropertyValue("--font-anonymous-pro");
    if (face) document.fonts.load(`bold 1em ${face}`).then(layout, () => {});
}
