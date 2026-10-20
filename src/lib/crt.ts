// Fraction of the screen displaced at the corners
export const CURVATURE = 0.035;

// Where content at (x, y) shows up through the lens, inverse of the
// displacement the lens samples with, see screenLens.ts
export function bend(x: number, y: number, box: DOMRect) {
    let px = x;
    let py = y;
    // The lens maps shown to content, a few steps solve it backwards
    for (let i = 0; i < 4; i++) {
        const u = ((px - box.left) / box.width) * 2 - 1;
        const v = ((py - box.top) / box.height) * 2 - 1;
        const r2 = u * u + v * v;
        px = x - u * r2 * CURVATURE * (box.width / 2);
        py = y - v * r2 * CURVATURE * (box.height / 2);
    }
    return { x: px, y: py };
}

// The content point the lens shows at (x, y), as clicks are remapped
export function unbend(x: number, y: number, box: DOMRect) {
    const u = ((x - box.left) / box.width) * 2 - 1;
    const v = ((y - box.top) / box.height) * 2 - 1;
    const r2 = u * u + v * v;
    return {
        x: x + u * r2 * CURVATURE * (box.width / 2),
        y: y + v * r2 * CURVATURE * (box.height / 2),
    };
}
