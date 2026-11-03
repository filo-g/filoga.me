# filoga.me

Personal portfolio of Rodrigo (Filo), styled as an old CRT terminal.

Static site built with [Astro](https://astro.build) and Tailwind CSS,
deployed on Cloudflare Pages.

## Development

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # static output in dist/
pnpm preview   # serves dist/
```

Node version in `.nvmrc`, pnpm version in `package.json`.

## Structure

- `src/content/projects/`: one markdown file per project, with its
  screenshots
- `src/lib/profile.ts`: personal data, stack and experience, shared by
  the home, about and resume pages
- `src/lib/sections.ts`: sections in the menu and their shortcut keys
- `src/lib/`: terminal behaviour (navigation, curtain, console,
  settings) and the ASCII field and images
- `src/styles/effects/`: CRT effects (lens, phosphor, scanlines,
  power on) and the print sheet for the resume

## Branches

`main` deploys to production. Work happens in branches off `develop`,
which goes into `main` when it is ready to ship.
