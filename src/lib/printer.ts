// Printable lines of a block, in document order
export const lines = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLElement>("[data-line]")];

// Reveals a line left to right, one character per step
export function print(el: HTMLElement, pace = 1) {
    const msPerChar = Number(el.dataset.speed ?? 12) * pace;
    el.setAttribute("data-printed", "");
    const chars = el.textContent?.length ?? 0;
    // Blank or single char lines just appear
    if (chars < 2) return Promise.resolve();

    return el
        .animate(
            [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0)" }],
            { duration: chars * msPerChar, easing: `steps(${chars})` },
        )
        .finished.then(() => {});
}
