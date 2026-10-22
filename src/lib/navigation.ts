import { busy, clear, type } from "./console";
import { erase } from "./curtain";
import { cleanPath, isMobile, path, sleep } from "./terminal";

const parts = (url: string) =>
    cleanPath(new URL(url, location.href).pathname).split("/")
        .filter(Boolean);
const same = (a: string[], b: string[], length: number) =>
    a.slice(0, length).every((part, i) => part === b[i]);

// The cd that walks from one page to the other, e.g. cd ..\charlie
export function commandFor(from: string, to: string) {
    const a = parts(from);
    const b = parts(to);
    if (!b.length) return "cd \\";
    if (b.length === a.length + 1 && same(a, b, a.length)) {
        return `cd ${b.at(-1)}`;
    }
    if (a.length === b.length + 1 && same(b, a, b.length)) return "cd ..";
    if (a.length === b.length && same(a, b, a.length - 1)) {
        return `cd ..\\${b.at(-1)}`;
    }
    return `cd \\${b.join("\\")}`;
}

// What the next page echoes, the command typed here and where from
let arrival: string | undefined;
export const takeArrival = () => {
    const echo = arrival;
    arrival = undefined;
    return echo;
};

let leaving = false;

// Types the command and wipes the screen while the next page loads
document.addEventListener("astro:before-preparation", (event) => {
    const root = document.querySelector<HTMLElement>("[data-session]");
    const crt = document.documentElement.classList.contains("crt");
    const from = location.href;
    const to = event.to.href;
    if (!root || !crt || leaving || cleanPath(new URL(to).pathname)
        === cleanPath(location.pathname)) return;

    const command = commandFor(from, to);
    const load = event.loader;
    event.loader = async () => {
        leaving = true;
        const mobile = isMobile();
        const out = (async () => {
            if (!mobile) {
                await type(command);
                await sleep(200);
                clear();
            }
            busy(true);
            document.dispatchEvent(new Event("curtain:erase"));
            await erase(root, mobile ? 300 : 500, mobile ? 0 : 6);
        })();
        try {
            await Promise.all([load(), out]);
        } finally {
            leaving = false;
        }
        arrival = `${path(parts(from).join("\\"))}>${command}`;
    };
});

// The root keeps its classes, the new document only has its defaults
document.addEventListener("astro:before-swap", (event) => {
    const next = event.newDocument.documentElement;
    const keep = [...document.documentElement.classList]
        .filter((name) => name !== "crt-power-on");
    next.classList.add(...keep);
    // The screen shape too, so the new page shows bent from its first frame
    const screen = document.querySelector(".screen");
    const nextScreen = event.newDocument.querySelector(".screen");
    for (const name of ["screen--lens", "screen--tube"]) {
        if (screen?.classList.contains(name)) nextScreen?.classList.add(name);
    }
    const tube = screen?.parentElement?.style.getPropertyValue("--tube");
    if (tube) nextScreen?.parentElement?.style.setProperty("--tube", tube);
});
