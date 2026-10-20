// Directory under F:\WEB, e.g. F:\WEB\PROJECTS
export const path = (dir = "") =>
    `F:\\WEB${dir && `\\${dir.toUpperCase()}`}`;

// Prompt in that directory, e.g. F:\WEB\PROJECTS>
export const prompt = (dir = "") => `${path(dir)}>`;

export const PROMPT = prompt();

// Waits the given milliseconds
export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

// Below md: no console, no lens, faster reveal
export const isMobile = () => matchMedia("(max-width: 47.999rem)").matches;

// Page path without the .html of the file build, /about.html to /about
export const cleanPath = (path: string) =>
    path.replace(/(\/index)?\.html$/, "").replace(/(.)\/$/, "$1") || "/";
