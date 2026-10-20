interface Row {
    top: number;
    bottom: number;
}

// Curtain rows over the whole block, a base line tall or split in bands
function rows(el: HTMLElement, bands?: number): Row[] {
    const height = el.getBoundingClientRect().height;
    const line = bands
        ? Math.ceil(height / bands)
        : parseFloat(getComputedStyle(el).lineHeight);
    const found: Row[] = [];
    for (let top = 0; top < height; top += line) {
        found.push({ top, bottom: Math.min(top + line, height) });
    }
    return found;
}

// Uncovers the rows above, and the current one up to x
function upTo(row: Row, x: string, last: boolean) {
    // The glow overflows the box, keep it out of the clip
    const glow = "1em";
    const top = row.top ? `${row.top}px` : `-${glow}`;
    const bottom = last ? `calc(100% + ${glow})` : `${row.bottom}px`;
    return `polygon(-${glow} -${glow}, calc(100% + ${glow}) -${glow}, ` +
        `calc(100% + ${glow}) ${top}, ${x} ${top}, ` +
        `${x} ${bottom}, -${glow} ${bottom})`;
}

interface Options {
    // Rows come in at the bottom and push the ones above up
    scroll?: boolean;
    // Fixed number of rows instead of one per line
    bands?: number;
    // Called as each row is done, with its bottom edge on the screen
    onRow?: (bottom: number) => void;
}

// Lifts the curtain row by row, left to right, in a fixed time
export async function reveal(
    el: HTMLElement,
    duration: number,
    { scroll = false, bands, onRow }: Options = {},
) {
    const found = rows(el, bands);
    const style = getComputedStyle(el);
    // A character per step, Anonymous Pro is 0.546em wide
    const columns = Math.round(
        el.offsetWidth / (parseFloat(style.fontSize) * 0.546),
    );
    const done: Animation[] = [];
    el.setAttribute("data-revealed", "");

    for (const [i, row] of found.entries()) {
        const last = i === found.length - 1;
        // Keeps the current row where the last one ends
        const below = scroll ? el.offsetHeight - row.bottom : 0;
        const transform = `translateY(${below}px)`;
        const animation = el.animate(
            [
                { clipPath: upTo(row, `-1em`, last), transform },
                { clipPath: upTo(row, `calc(100% + 1em)`, last), transform },
            ],
            {
                duration: duration / found.length,
                easing: `steps(${columns})`,
                // Holds the clip until the next row starts
                fill: "forwards",
            },
        );
        done.push(animation);
        await animation.finished;
        onRow?.(el.getBoundingClientRect().top + row.bottom + below);
    }
    // Filled animations would keep repainting the lens
    done.forEach((animation) => animation.cancel());
}
