# Bank

> A friendly note: Bank is part of Eurth's advent calendar, and its door opens on 18 December 2026. The code is public, the site isn't yet. Please don't spoil the surprise before the door opens.

Bank designs banknotes for fictional currencies: one note, front and back, or a whole series from a single design. It is one of the free worldbuilding tools by [Eurth](https://eurth.org), a worldbuilding and roleplay community since 2004, and will live at bank.eurth.org.

Fiction only: no real currency codes, no uploads, and every picture says it is a specimen of a fictional currency.

What's planned, what each release added and exactly where work stands is in the [roadmap](roadmap.md).

## Use

1. Give the currency a name, a sign, a code of three letters and an issuing bank, or press Random.
2. Choose the values of the series. Each gets its own ink, paper and border colour, and each note is a step larger than the last.
3. Design one note: layout, border, paper, portrait, vignette, rosette, signatures and serial numbers. The whole series follows.
4. Take it with you: the link holds the whole series; pictures download as SVG, PNG or WebP, each side or the whole series on a sheet; the nation's profile file carries the currency to the other Eurth tools.

Nothing is stored in the browser or on a server. A design lives in its link and in the files you save.

## How it's made

- **Astro**, static output, with the designer as a **Svelte 5** island; **TypeScript**; **Vitest**. The look, the shell (header, footer, theme switch, sharing, offline) and the build come from [`@eurth/style`](https://github.com/eurth-org/eurth-style); the nation profile from [`@eurth/profile`](https://github.com/eurth-org/eurth-profile). Its handbook, `node_modules/@eurth/style/HANDBOOK.md`, is the rulebook.
- `src/bank/`: the engine, plain TypeScript with no dependencies. A design goes in, an SVG comes out.
  - `model.ts` (what a design is, and the cleaning of anything that arrives from outside), `fiction.ts` and `data/iso4217.ts` (the fiction-only rules), `words.ts` (values in words), `guilloche.ts` (rosettes and borders), `signature.ts`, `serial.ts`, `art.ts` (our own line art), `render.ts`, `series.ts`, `describe.ts`, `link.ts`, `profile.ts`, `presets.ts`, `templates.ts`, `invent.ts` (Random), `fun.ts`.
- `src/ui/Designer.svelte`: the designer. `src/pages/`: the four pages and the pictures under `/notes/`. `src/content/`: the guide (Markdown) and the glossary (data). `src/site/`: what only the build needs.
- `tests/`: the engine, the content, the site, and the checks every Eurth tool runs (`shell.test.js`).

## Development

Node 22.23.4 or newer (CI uses 26).

```sh
npm install
npm run dev       # the site while you work
npm run check     # types
npm run build     # the site, into dist/
npm test          # run after a build: some tests read the built site
npm run axe       # accessibility, every page, both themes
npm run preview   # the built site with its real headers (wrangler dev)
npm run images    # the icons and the sharing image, into public/
npm run iso4217   # refresh the copy of the ISO 4217 code lists
```

Things to know:

- **Fiction only is tested.** `tests/fiction.test.ts` refuses every real code; `tests/render.test.ts` holds the specimen mark and the fine print on every picture; `tests/presets.test.ts` and `tests/invent.test.ts` keep real names, signs and codes out of the templates and out of Random.
- **A link is someone else's input.** Everything from a link or a file goes through `cleanDesign`. When the shape of a design changes, raise `LINK_VERSION` and keep reading the old ones.
- **Every text on a note is pinned to a width** (`text.ts`), because the device's fonts differ and nothing is downloaded.
- **Pictures are drawn by the engine at build time** (`src/site/pictures.ts`): the templates' notes and the guide's two figures. Nothing is drawn by hand.
- **The guide's sources** are listed at its foot. Check them when you change it, and move its `updated` date.

## Deployment

Bank runs as a Cloudflare Worker serving static files (`wrangler.jsonc`), on the account that holds the eurth.org zone, at its custom domain. There is no Worker script.

- **Before the door, nothing is deployed anywhere.** Pushes to `main` are checked, built and tested, and that is all.
- **The launch workflow** (`.github/workflows/launch.yml`) starts at 22:30 UTC on 17 December 2026, builds the site as it will be at the door's time, waits for the time in `LAUNCH_AT` and deploys. If it hasn't started by 22:45 UTC, run it by hand. After the launch, delete it.
- **After the door,** every green push to `main` deploys, and the nightly workflow rebuilds the site so its menus follow the other doors and new `@eurth/style` releases.
- Deploying uses the organisation secret `CLOUDFLARE_API_TOKEN`; without it the step is skipped with a warning. It is the only secret.

Requests and what became of them are in [the feedback log](docs/feedback-log.md).

Made by Orioni for [Eurth](https://eurth.org), a worldbuilding and roleplay community since 2004. Apache 2.0.
