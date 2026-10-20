import { bend } from "./crt";

// Glyphs from faint to dense
const RAMP = " .:-=+*#%@";
// Energy kept per 16ms frame, a full glow fades out in about 2s
const DECAY = 0.97;
// Reach of the pointer, in cell heights
const RADIUS = 16;
// Opacity of the chars at full energy, kept low to sit behind the text
const ALPHA = 0.25;

interface Cell {
    x: number;
    y: number;
}

// Background grid of chars lit by the pointer, fading on their own.
// It reads as a trail although no path is kept, only energy per cell
export function asciiField(canvas: HTMLCanvasElement, screen: HTMLElement) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    const root = getComputedStyle(document.documentElement);

    let cells: Cell[] = [];
    let energy = new Float32Array(0);
    let width = 0;
    let height = 0;
    let radius = 0;
    let frame = 0;
    let last = 0;
    let colors = { screen: "", phosphor: "" };

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
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const x = (column + 0.5) * cellWidth;
                const y = (row + 0.5) * cellHeight;
                cells.push(lens ? bend(x, y, box) : { x, y });
            }
        }
        // Same grid keeps its glow, only a new one starts dark
        if (energy.length !== cells.length) {
            energy = new Float32Array(cells.length);
        }

        const family = root.getPropertyValue("--font-anonymous-pro");
        ctx.font = `${size}px ${family || "monospace"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        colors = {
            screen: root.getPropertyValue("--color-screen"),
            phosphor: root.getPropertyValue("--color-phosphor"),
        };
        draw();
    }

    function draw() {
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.screen;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = colors.phosphor;

        const top = RAMP.length - 1;
        for (let i = 0; i < cells.length; i++) {
            const e = energy[i];
            if (!e) continue;
            // A little flicker on the way down keeps it alive
            const jitter = e < 0.9 && Math.random() < 0.15 ? 1 : 0;
            const glyph = RAMP[Math.min(top, Math.ceil(e * top) + jitter)];
            // Square root so the fading tail stays visible for longer
            ctx.globalAlpha = Math.sqrt(e) * ALPHA;
            ctx.fillText(glyph, cells[i].x, cells[i].y);
        }
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
        draw();
        // Idle once everything faded, nothing runs while still
        frame = alive ? requestAnimationFrame(tick) : 0;
    }

    // Lights the cells around a point, more the faster it moves
    function stir(x: number, y: number, speed: number) {
        const strength = Math.min(1, 0.3 + speed / 40) * 0.18;
        for (let i = 0; i < cells.length; i++) {
            const dx = cells[i].x - x;
            const dy = cells[i].y - y;
            if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;
            const d = Math.hypot(dx, dy) / radius;
            if (d >= 1) continue;
            // Bell shaped, a wide soft glow rather than a spot
            const glow = Math.exp(-d * d * 4);
            energy[i] = Math.min(1, energy[i] + strength * glow);
        }
        if (!frame) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        }
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
    document.addEventListener("mouseleave", () => (previous = undefined));

    new ResizeObserver(layout).observe(canvas);
    // The lens turns on and off with the window, the cells follow it.
    // Other classes change on hover, those leave the grid alone
    const lensOn = () => screen.classList.contains("screen--lens");
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
}
