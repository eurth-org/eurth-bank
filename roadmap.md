# Roadmap

Bank designs banknotes for fictional currencies, one note or a whole series, at bank.eurth.org. It is door 9 of Eurth's 2026 advent calendar and opens on 18 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Where to pick up

**15 November 2026.** Bank is built: the engine, the four pages, the designer, saving, exports, the delights and the launch workflow. `npm run check`, `npm run build`, `npm test` (310 tests) and `npm run axe` all pass, and the site has been looked at in Chrome through `npm run preview`. It is not deployed and must not be before its door. What is left is the list under "Before the door" below, starting at the top.

To carry on: Node 22.23.4 or newer (Astro needs it; this machine's newer Node is in `/opt/homebrew/bin`), then `npm install`, `npm run check`, `npm run build`, `npm test`.

Decided along the way; say if you'd rather not:

- **The SPECIMEN overprint has a switch, on by default.** The fine print "fictional currency, bank.eurth.org" has no switch and is on every picture.
- **No picture upload at all.** That keeps photos of real banknotes out by construction. The portrait slot takes our own line art, or the arms and flag from a loaded profile.
- **The paper of a note has a texture,** which the suite's flat look (no gradients, glows or shadows) would rule out on a page. The handbook's rule is for the site; a note is the picture the site makes. The texture can be set to plain.
- **A real ISO 4217 code is refused wherever it comes from:** typed, in a link or in a profile file. Names and signs are free to type (plenty of invented nations have a dollar or a crown); only our own templates and Random stay clear of real names, signs and codes.
- **The link is in the suite's own form** (`?d=1.…`, as `encodeState` writes it), with the note in view beside it (`&n=100&s=back`).
- **The profile's `bank` section gets three fields beyond the schema's:** `plural`, `symbol` and `design`. The schema allows extra keys and the real checker passes them.

## Next

### Before the door (18 December 2026)

- **Look at it in Safari and Firefox,** on a phone too. The paper textures are SVG filters and the arms and flag are SVG images inside the SVG; both must survive being drawn to a canvas for PNG and WebP. Chrome does it. If a browser doesn't, fall back to plain paper for that export and say so in a toast.
- **Load a real profile by hand** (`node_modules/@eurth/profile/examples/calderwyn.eurth.json`): the currency arrives, the arms and flag show in the slots, and Save profile writes only the `bank` section. The tests cover all of it; nobody has clicked it yet.
- **Ask Foundations to document `plural`, `symbol` and `design`** in the profile's `bank` section, since Wiki and Card read the symbol.
- **Lighthouse:** CI runs it on `main`. Check the first run and fix what it finds; the start page carries one note as a picture inside the page, which is the thing to watch.
- **The launch:** the workflow is in place (`LAUNCH_AT` is `2026-12-18T00:00:00+01:00`; the run starts at 22:30 UTC on 17 December). If it hasn't started by 22:45 UTC, start it by hand. After the launch, delete `.github/workflows/launch.yml`.

### After the launch

- Coins, to go with the notes.
- A watermark window and a security thread as drawn features on the note (the guide explains why they are left out for now).
- The value in words in the nation's own language.
- A second serial number, and a choice of where it stands.
- More line art: animals, ships, plants, and a second set of silhouettes in profile.
- The whole series as one sharing picture in the suite's sizes, laid out by Bank, not letterboxed.
- A sound for the note sliding off the stack, behind the footer's sound switch.

## 15 November 2026: 0.1.0, built and waiting for its door

The first version. Not deployed: the site opens on 18 December 2026.

- **The designer:** a currency (name, plural, sign, code, issuer), a series of up to twelve values, and one note design that the whole series follows. Three layouts (portrait left, centred, upright), six borders, four paper textures, a rosette set by six numbers, a portrait slot and a vignette, two signatures, serial numbers and the SPECIMEN overprint. Front, back and the whole series side by side.
- **Fiction only:** every real ISO 4217 code, in use or withdrawn, is refused with a kind sentence and a row of free codes to use instead; no uploads; the fine print on every picture; the specimen mark on by default.
- **Guilloche from numbers:** rosettes and borders are drawn by trigonometry, the same on every device, never traced from anything.
- **Line art of our own:** six silhouettes, six buildings and four landscapes, or the arms and flag from the nation's profile, placed as images.
- **Generated signatures and serial numbers:** the same name always signs the same way; a note keeps its number until a new print run is asked for.
- **Paper textures:** a fine grain, laid, aged or plain, made by an SVG filter. Asked for by Stijn on 14 November.
- **Random:** a whole invented currency at a press, nation, bank, signatories and all, never landing on a real name or code.
- **Twelve templates,** from the selun of Teland to a nation whose money has run away with it, and seven ready-made series of values.
- **Saving:** the whole series in its link; the profile's `bank` section, which leaves every other section as it was.
- **Pictures:** SVG, PNG and WebP of either side of any note or of the whole series, in the note's own shape or the suite's six sizes; Copy link, Copy picture, Copy description and the Share dialog. Every picture has a written description.
- **The guide:** the anatomy of a banknote, feature by feature, how a series is designed and why Bank is fiction only, with two labelled figures drawn by the designer's own engine and twenty sources checked on 15 November 2026. **The glossary:** 49 terms.
- **Delight:** a note slides off a stack as if counted when the value changes; a 69 note gets the suite's "Nice."; a note worth 0 gets "Priceless."
- **The kit:** the starter of @eurth/style 1: an Astro static site with the designer as a Svelte island, the shared shell, strict security headers, offline use, and the launch, CI and nightly workflows. 310 tests, and axe on every page in both themes.

## Not planned

- **Real currencies.** No real names, signs or codes in templates, and no real ISO 4217 code anywhere. Bank is for money that doesn't exist.
- **Uploading pictures.** A photo of a real banknote, or of a real person, has no place on a specimen, and a tool that takes no uploads can't be handed one.
- **Print-ready output.** No bleed, crop marks or sheets for a press, and no picture without the fine print. These are pictures for wikis and stories.
- **Imitations of real security features.** The guide explains them; the designer draws none that a machine or a cashier would check, and none of the marks that make copiers refuse a note.
- **Accounts, or designs kept on a server.** A design lives in its link or its profile file; nothing is stored.
- **A Markdown engine with plugins.** The guide is written in a small subset of Markdown and rendered by forty lines of our own (`src/site/markdown.ts`), which is what gives every outbound link its `?ref=` without another dependency.
