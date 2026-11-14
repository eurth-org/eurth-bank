# Roadmap

Bank designs banknotes for fictional currencies, one note or a whole series, at bank.eurth.org. It is door 9 of Eurth's 2026 advent calendar and opens on 18 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Where to pick up

**14 November 2026.** The brief is saved, the repository exists, and this plan is written. Nothing is built. The plan is waiting for Stijn's go-ahead; the next step is Phase 1, step 1.

Waiting on others:

- **@eurth/style 1.0.0** is not released. On GitHub the repository holds only its brief: no HANDBOOK.md, starter template or tag yet. Phase 2 can't start until it is: check `gh release list -R eurth-org/eurth-style`. This plan was written from the handbook rules in that brief; when HANDBOOK.md is out, read it first, and where it differs from this plan, the handbook wins.
- **The door.** Door 9 and 18 December come from Foundations' unreleased `tools.json` ("Bank: Money with your nation's face on it"). Confirm both when @eurth/style is released.
- **@eurth/profile 1.0.0** is written but not tagged. Its `bank` section has `currency`, `code`, `issuer` and `denominations` (largest first), plus the shared `link`, `summary` and `updated`. It allows extra keys, so Bank will also write `plural`, `symbol` and `design` (see Phase 1, step 8). Ask Foundations to document those three, since Wiki and Card read the symbol.

Decided here, say if you'd rather not:

- **The SPECIMEN overprint has a switch, on by default.** The fine print "fictional currency, bank.eurth.org" has no switch and is on every export.
- **No picture upload at all in v1.** That keeps photos of real banknotes out by construction. The portrait slot takes our own line art, or the arms and flag from a loaded profile.
- **A real ISO 4217 code is refused wherever it comes from:** typed, in a link or in a profile file. Names and symbols are free for the person to type (plenty of fictional nations have a dollar or a crown); only our own presets must stay clear of real names, symbols and codes.

## Next

### Phase 1: the engine and the words (needs nothing from @eurth/style)

Plain TypeScript in `src/bank/`, tests in `tests/`, as Flagwright keeps its engine in `src/flag/`. Only TypeScript and Vitest are installed. Commit and push after each step.

1. **Model** (`model.ts`): a design is a currency, a series and a note design.
   - Currency: name, plural, symbol, code (exactly three letters), issuing bank.
   - Series: up to 12 denominations, each a whole number from 0 to 1,000,000,000,000 (the profile's limit) with its own paper and ink colours; a base size in millimetres and a size step, so each higher value is a little longer and taller.
   - Note design, shared by the series: layout template (portrait left, centred, vertical), border pattern, rosette settings, what fills the portrait slot on the front and the vignette on the back, the signatories' names and titles, the serial number format, a seed, and the specimen switch.
   - Everything that arrives from a link or a file is checked and clamped: text lengths capped, colours cleaned, unknown values replaced by defaults.
2. **Fiction only** (`fiction.ts`, `data/iso4217.ts`): a dated snapshot of ISO 4217, the codes in use, the fund and metal codes (the X codes) and the withdrawn historic ones, with its source. `checkCode` refuses any of them with a kind sentence and suggests free codes built from the currency's name. Also the lists of real currency names and symbols that the presets are tested against. The specimen switch defaults to on, and the fine print can't be removed.
3. **Value in words** (`words.ts`): numerals with grouping, and British English words ("one hundred and five"), with the currency's singular or plural: "ONE HUNDRED SELUN". 0 is "zero". Tested from 0 to a million million.
4. **Guilloche** (`guilloche.ts`): rosettes as closed curves from a handful of numbers (lobes, rings, two wave amplitudes, a phase step, a twist) and bands of the same for borders. Pure, deterministic and capped in points, so a rosette is the same on every device and never heavy. Border patterns: guilloche band, wave, scallop, key, plain rules.
5. **Signatures and serials** (`signature.ts`, `serial.ts`, `random.ts`): a signature is a seeded scribble drawn from the signatory's name, the same name always signing the same way; a serial number follows a format such as two letters and seven digits ("TL 0447192"), seeded per denomination.
6. **Line art of our own** (`art.ts`): portrait silhouettes (invented, nobody real), buildings (parliament, lighthouse, bridge, tower, observatory, yurt) and landscapes (mountains, coast, river plain, forest), each a small set of paths drawn for Bank. The slot can instead show the nation's arms or flag from a profile: that SVG is only ever placed as an image, never as markup, as @eurth/profile requires.
7. **Drawing** (`render.ts`, `series.ts`, `describe.ts`): one pure function from a design, a denomination and a side to an SVG string with a title and description: border, rosettes, slot, issuer, value in numerals and words, signatures, serial numbers, a line of microprint that repeats the issuer's name, the SPECIMEN overprint and the fine print. The back has the vignette and the value, no signatures. The series sheet lays every denomination out by size. The description is the note in plain words, for Copy description and screen readers. Colours per value differ in lightness, and the numeral is always there, so nothing rests on colour alone.
8. **Saving** (`link.ts`, `profile.ts`): the whole design, compact and versioned, in the link's query string (it holds no pictures, so it always fits; a slot that shows the profile's arms says so by name and falls back to our line art when no profile is loaded). The profile's `bank` section: `currency`, `code`, `issuer`, `denominations` largest first, `summary` and `link`, plus `plural`, `symbol` and a small versioned `design`. Every other section and every unknown key is left alone.
9. **Presets and templates** (`presets.ts`, `templates.ts`): denomination series (1-2-5, 1-5-10, 5-10-20-50-100-200, and an inflation series for a nation in trouble), colour schemes with a paper and an ink per value (the mock-up's parchment, pale blue and lilac among them), and about twelve complete invented currencies for the Templates page, starting with the mock-up's 100 selun note of the Bank of Teland. A test holds every preset to the fiction-only lists.
10. **Guide and glossary** (`src/content/`): the anatomy of a banknote, feature by feature (portrait, vignette, guilloche, microprint, watermark, security thread, see-through register, intaglio, serial numbers, signatures), each explained and none reproduced; how real series are designed (themes, a size and a colour per value, features for blind and partially sighted people, how a new series is rolled out); why Bank is fiction only (the rules on reproducing real notes); with sources from central banks and printers and a last-updated date. A glossary of about 40 terms.
11. **Notes worth a toast** (`fun.ts`): spot a 69 note and a note worth 0, so the site can say "Nice." and "Priceless."

Tested throughout: every real ISO code refused and a set of invented ones accepted; the specimen mark on by default and the fine print in every export; links and profile sections surviving a round trip; hostile links clamped; rosettes deterministic; words right at the awkward numbers.

### Phase 2: the site (only once @eurth/style 1.0.0 is released)

12. Start from the starter template in eurth-style; read HANDBOOK.md first.
13. Pages: Designer, Guide, Glossary, Templates, with titles ("Bank: free online banknote maker for worldbuilders"), descriptions, canonical links, JSON-LD (WebApplication, BreadcrumbList, DefinedTermSet), sitemap.xml, robots.txt, llms.txt and Open Graph images.
14. The designer, as a Svelte 5 island: currency fields with the code check as you type, the denomination series, template, border and rosette controls, the portrait slot picker, signatories, front and back, and the whole series side by side.
15. Save and load: the link, and the profile file (file picker and drag and drop, from @eurth/profile), which also brings in the arms and flag for the slot.
16. Exports: SVG, PNG and WebP of each side and of the full series, in the handbook's sizes for sharing; Copy link, Copy picture, Copy description, and the Share dialog.
17. Delight: a note slides out as if counted from a stack when the value changes; "Nice." for a 69 note (the suite's own) and "Priceless." for a note worth 0; all under half a second and nothing for reduced motion.
18. Offline, install, security headers (with `img-src 'self' data:` for the profile's pictures), axe and Lighthouse checks, as the handbook asks.
19. CI, and the launch workflow: `LAUNCH_AT` is `2026-12-18T00:00:00+01:00`, the scheduled run starts at 22:30 UTC on 17 December, and it also runs by hand. No custom domain and no workers.dev deploy before then.
20. README (use, development, deployment), docs/feedback-log.md, and the handbook's checklist.

### After launch

- Coins, to go with the notes.
- A watermark window and a security thread as drawn features on the note (the guide explains them from the start).
- Value in words in the nation's own language, from the Names tool.

## Releases

None yet.

## Not planned

- **Real currencies.** No real names, symbols or codes in presets, and no real ISO 4217 code anywhere. Bank is for money that doesn't exist.
- **Uploading pictures.** A photo of a real banknote, or of a real person, has no place on a specimen, and a tool that takes no uploads can't be handed one.
- **Print-ready output.** No bleed, crop marks or sheets for a press, and no export without the fine print. These are pictures for wikis and stories.
- **Imitations of real security features.** The guide explains them; the designer draws none that a machine or a cashier would check.
- **Accounts, or designs kept on a server.** A design lives in its link or its profile file; nothing is stored.
