import { sleep } from "./terminal";

// Where typed commands are shown
const input = () =>
    document.querySelector<HTMLElement>("[data-console-input]");

// Types the command char by char at a human, uneven pace
export async function type(command: string) {
    const el = input();
    if (!el) return;

    for (const char of command) {
        el.textContent += char;
        await sleep(45 + Math.random() * 70);
    }
}

// Empties the input, as if enter was pressed
export function clear() {
    const el = input();
    if (el) el.textContent = "";
}

// Cursor hidden while a command runs
export function busy(value: boolean) {
    document.querySelector(".console")?.classList.toggle("is-busy", value);
}
