// Fraction of the screen displaced at the corners
export const CURVATURE = 0.035;

// Where content at (x, y) shows up through the lens, inverse of the
// displacement the lens samples with, see screenLens.ts
export function bend(x: number, y: number, box: DOMRect) {
    let px = x;
    let py = y;
    // The lens maps shown → content, a few steps solve it backwards
    for (let i = 0; i < 4; i++) {
        const u = ((px - box.left) / box.width) * 2 - 1;
        const v = ((py - box.top) / box.height) * 2 - 1;
        const r2 = u * u + v * v;
        px = x - u * r2 * CURVATURE * (box.width / 2);
        py = y - v * r2 * CURVATURE * (box.height / 2);
    }
    return { x: px, y: py };
}
