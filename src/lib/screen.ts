// Resolves once the CRT finished turning on, right away if it doesn't
export function screenReady(): Promise<void> {
    const content = document.querySelector(".screen__content");
    const powerOn = content
        ?.getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "power-on");

    return powerOn ? powerOn.finished.then(() => {}) : Promise.resolve();
}
