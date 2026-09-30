const powerOn = () =>
    document
        .querySelector(".screen__content")
        ?.getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "power-on");

// Resolves once the CRT finished turning on, right away if it doesn't
export function screenReady(): Promise<void> {
    const animation = powerOn();
    return animation ? animation.finished.then(() => {}) : Promise.resolve();
}

// Power-on leftovers keep repainting the lens, drop them once done
screenReady().then(() =>
    document.documentElement.classList.remove("crt-power-on"),
);
