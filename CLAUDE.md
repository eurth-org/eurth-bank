You're building Bank (bank.eurth.org), a banknote designer for fictional currencies, one of Eurth's free worldbuilding tools. Eurth (eurth.org) is a worldbuilding and roleplay community since 2004. The attached repo is eurth-org/eurth-bank.

Working order (Foundations and many other tools are being built at the same time tonight):
1. Save this brief as CLAUDE.md.
2. If the repo named above doesn't exist on GitHub yet, create it as a public, empty repo in eurth-org with the gh CLI and connect this folder; if you can't, ask me.
3. Read what already exists of github.com/eurth-org/eurth-style (HANDBOOK.md) and github.com/eurth-org/eurth-profile; they may still be in progress. Write the plan and show it to me.
4. Build the tool's core logic as plain TypeScript modules with thorough tests, and its content and data (guide text, presets, examples, data snapshots). None of that needs eurth-style.
5. Only once @eurth/style 1.0.0 is released (check the releases of github.com/eurth-org/eurth-style), start the site from its starter template and carry on to the end of this brief. Until then, don't scaffold the site, pages or styles.
6. Commit and push after every finished step, and keep roadmap.md up to date with exactly where to pick up, so a new session can continue if this one stops.

Background for every step: Read HANDBOOK.md in github.com/eurth-org/eurth-style and start from its starter template; read the profile schema in github.com/eurth-org/eurth-profile; look at github.com/eurth-org/eurth-flag, the reference build. The handbook wins over this brief on everything shared. Then write a plan and show it to me before you build.

Mock-up: the banknote on the "bank.eurth.org, banknotes" board on https://claude.ai/artifact/32RKDdVTtCfHsL6Qc6LxV6.

Pages: Designer, Guide, Glossary, Templates.

The designer, v1
- Currency: name, plural, symbol, code (three letters, never a real ISO 4217 code), issuing bank, and a denomination series.
- A note, front and back: layout templates (portrait left, centred, vertical), border patterns, guilloche rosettes generated from parameters, a portrait slot (silhouette, building or landscape line art of our own, or the nation's arms and flag from the profile), the value in words and numerals, signatures (generated scribbles), serial numbers, and a colour scheme per denomination.
- The whole series: generate every denomination from one design with a size step and a colour per value.
- Fiction only: no real currency names, symbols or codes in presets; no upload of photos of real banknotes; every export carries a small "SPECIMEN" overprint by default and fine print reading "fictional currency, bank.eurth.org".

Guide: the anatomy of a banknote (portraits, vignettes, guilloche, microprint, watermarks, security threads, all explained, none reproduced), how real series are designed, with sources.

Profile section "bank": the currency (name, code, symbol, issuer) and the series design. Wiki and Card read the currency from it.

Exports: SVG, PNG and WebP of each side and of the full series; Copy description.

Signature touch: a note slides out as if counted from a stack. Easter egg: a 69 note gets the suite's "Nice."; a note worth 0 gets "Priceless."

Done when the handbook's checklist passes and the fiction-only rules are tested (real ISO codes refused, specimen mark on by default).
