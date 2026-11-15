<script lang="ts">
  /*
   * The designer: one Svelte component, hydrated on the start page.
   *   - the design lives in the link (?d=1.…), read safely on arrival and kept in step after;
   *   - nothing is stored: "save" is a link, a picture or the nation's profile file;
   *   - every picture has a written description;
   *   - the share row, toasts, "Nice." and click answers come from @eurth/style;
   *   - only tokens and eu- classes. The colours of a note are the visitor's own data.
   * What is typed is kept as typed; everything drawn, linked or saved goes through cleanDesign,
   * so a real currency code never reaches a picture.
   */
  import { faArrowsRotate, faCheck, faChevronDown, faDice, faDownload, faPlus, faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
  import { createProfile, getSection, setSection, svgDataUrl, type EurthProfile } from '@eurth/profile';
  import ProfileButtons from '@eurth/profile/ProfileButtons.svelte';
  import { PICTURE_SIZES, download, fileSlug, nice, svgToPicture, toast } from '@eurth/style';
  import Icon from '@eurth/style/components/Icon.svelte';
  import ShareButtons from '@eurth/style/components/ShareButtons.svelte';
  import { onMount, tick } from 'svelte';
  import { artKinds, artList, drawArt, type Art, type ArtKind } from '../bank/art';
  import { describeDesign, describeNote, describeSeries, noteName } from '../bank/describe';
  import { checkCode } from '../bank/fiction';
  import { rosettePaths } from '../bank/guilloche';
  import { toastForChange } from '../bank/fun';
  import { inventCurrency } from '../bank/invent';
  import { designQuery, readQuery } from '../bank/link';
  import { LIMITS, borders, cleanDesign, cleanValue, defaultDesign, layouts, noteSize, textures, type Border, type Denomination, type Design, type Layout, type Rosette, type Side, type SlotKind, type Texture } from '../bank/model';
  import { rosettePresets, seriesPresets, withScheme, withSeries, withValue, withoutValue } from '../bank/presets';
  import { bankSection, bankSummary, designFromSection } from '../bank/profile';
  import { renderNote } from '../bank/render';
  import { colourSchemes } from '../bank/schemes';
  import { renderSeries } from '../bank/series';
  import { formatNumeral } from '../bank/words';

  // Passed in by the page: browser code never imports eurth.config.mjs (see the note there).
  let { siteName, siteUrl }: { siteName: string; siteUrl: string } = $props();

  const LAYOUTS: Record<Layout, string> = { 'portrait-left': 'Portrait left', centred: 'Centred', vertical: 'Upright' };
  const BORDERS: Record<Border, string> = { rules: 'Plain rules', stitch: 'Stitched line', wave: 'Wave', scallop: 'Scallops', key: 'Key pattern', guilloche: 'Guilloche band' };
  const TEXTURES: Record<Texture, string> = { plain: 'Plain', grain: 'Fine grain', laid: 'Laid', aged: 'Aged' };
  const SLOTS: Record<SlotKind, string> = { none: 'Nothing', silhouette: 'A silhouette', building: 'A building', landscape: 'A landscape', arms: "The nation's arms, from its profile", flag: "The nation's flag, from its profile" };
  const ROSETTE: { key: keyof Design['note']['rosette']; name: string; min: number; max: number; step: number }[] = [
    { key: 'lobes', name: 'Petals', min: 3, max: 24, step: 1 },
    { key: 'rings', name: 'Rings', min: 1, max: 12, step: 1 },
    { key: 'depth', name: 'Depth of the petals', min: 0, max: 0.6, step: 0.01 },
    { key: 'ripple', name: 'Fine wave', min: 0, max: 0.4, step: 0.01 },
    { key: 'turn', name: 'Turn between rings', min: 0, max: 1, step: 0.01 },
    { key: 'twist', name: 'Fine waves to a petal', min: 2, max: 6, step: 1 },
  ];
  const SIZES: { key: 'width' | 'height' | 'stepWidth' | 'stepHeight'; name: string; step: number }[] = [
    { key: 'width', name: 'Long side of the smallest note', step: 1 },
    { key: 'height', name: 'Short side of the smallest note', step: 1 },
    { key: 'stepWidth', name: 'Longer with each value', step: 0.5 },
    { key: 'stepHeight', name: 'Taller with each value', step: 0.5 },
  ];
  const WHAT = [
    { id: 'side', name: 'This side of this note' },
    { id: 'fronts', name: 'The whole series, fronts' },
    { id: 'backs', name: 'The whole series, backs' },
    { id: 'both', name: 'The whole series, both sides' },
  ] as const;

  /** A design ready for the form: always two rows to sign in, filled or not. */
  function draft(from: Design): Design {
    const people = [...from.note.signatories];
    while (people.length < LIMITS.signatories) people.push({ name: '', title: '' });
    return { ...from, note: { ...from.note, signatories: people } };
  }

  let design = $state<Design>(draft(defaultDesign()));
  let value = $state(100);
  let side = $state<Side>('front');
  let show = $state<'note' | 'series'>('note');
  let nation = $state('Teland');
  let profile = $state.raw<EurthProfile | null>(null);
  let scheme = $state('heritage');
  let seriesPreset = $state('');
  let what = $state<(typeof WHAT)[number]['id']>('side');
  let size = $state('own');
  let busy = $state(false);
  let ready = $state(false);
  let stage: HTMLElement | undefined = $state();
  let form: HTMLFormElement | undefined = $state();

  // Everything drawn, linked and saved is the cleaned design, never the raw form.
  const safe = $derived(cleanDesign($state.snapshot(design)));
  const index = $derived(Math.max(0, safe.series.denominations.findIndex((d) => d.value === value)));
  const current = $derived(safe.series.denominations[index] as Denomination);
  const pictures = $derived({ arms: svgDataUrl(getSection(profile, 'arms')?.svg), flag: svgDataUrl(getSection(profile, 'flag')?.svg) });
  const svg = $derived(renderNote(safe, index, side, { pictures }));
  const sheet = $derived(show === 'series' ? renderSeries(safe, { sides: 'both', pictures }) : '');
  const dataUrl = (text: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  // The picture's size on the page, so nothing jumps when it arrives: half a pixel to a tenth of a millimetre.
  const shape = $derived(noteSize(safe, index));

  // Small pictures to choose by, in the colours of the note in view. The colours are the visitor's own data.
  const artThumb = (art: Art): string =>
    dataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${current.paper}"/>${drawArt(art, { x: 8, y: 8, w: 84, h: 84 }, current.ink)}</svg>`);
  const rosetteThumb = (rosette: Rosette): string =>
    dataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${current.paper}"/><g fill="none" stroke="${current.ink}" stroke-width="9">${rosettePaths(rosette, 500, 500, 440)
        .map((d) => `<path d="${d}"/>`)
        .join('')}</g></svg>`,
    );
  const sameRosette = (a: Rosette, b: Rosette): boolean => JSON.stringify(a) === JSON.stringify(b);
  const description = $derived(show === 'series' ? describeSeries(safe) : describeNote(safe, index, side));
  const name = $derived(noteName(safe, index));
  const title = $derived(name.charAt(0).toUpperCase() + name.slice(1));
  const upright = $derived(safe.note.layout === 'vertical');

  const isStart = $derived(JSON.stringify(safe) === JSON.stringify(defaultDesign()) && current.value === 100 && side === 'front');
  // Before the page has loaded there is no address to read: the site's own, then.
  const base = $derived(ready ? `${location.origin}${location.pathname}` : `${siteUrl}/`);
  const link = $derived(isStart ? base : `${base}?${designQuery(safe, { value: current.value, side })}`);

  const code = $derived(checkCode(design.currency.code, { name: safe.currency.name, issuer: safe.currency.issuer }));
  const hasArms = $derived(Boolean(pictures.arms));
  const hasFlag = $derived(Boolean(pictures.flag));

  onMount(() => {
    // A link is someone else's input: readQuery never throws, and cleanDesign clamps every value.
    const arrived = readQuery(location.search);
    if (arrived) {
      design = draft(arrived.design);
      value = arrived.view.value;
      side = arrived.view.side;
      nation = '';
    }
    ready = true;
  });

  // The address bar follows the design, a moment after the last change, so the link can be
  // copied from there too. Nothing is stored: the address is the save.
  $effect(() => {
    const address = link;
    if (!ready) return;
    const timer = setTimeout(() => {
      try {
        history.replaceState(history.state, '', address);
      } catch {
        // Some browsers ration how often the address may change. The Copy link button still works.
      }
    }, 250);
    return () => clearTimeout(timer);
  });

  /** The easter eggs: a 69 note gets the suite's "Nice.", a note worth nothing gets "Priceless." */
  function delight(before: Design, after: Design) {
    const found = toastForChange(before, after);
    if (found?.kind === 'nice' && stage) nice(stage);
    else if (found) toast(found.message);
  }

  /** Takes a whole new design: from Random, a preset, a profile. */
  function take(next: Design, keep = false) {
    const before = safe;
    design = draft(next);
    if (!keep || !next.series.denominations.some((d) => d.value === value)) {
      value = (next.series.denominations[Math.min(2, next.series.denominations.length - 1)] as Denomination).value;
    }
    delight(before, next);
  }

  function random() {
    const invented = inventCurrency(Math.floor(Math.random() * 1_000_000_000));
    take(invented.design);
    if (!profile) nation = invented.nation;
    side = 'front';
    seriesPreset = '';
  }

  function startAgain() {
    design = draft(defaultDesign());
    value = 100;
    side = 'front';
    show = 'note';
    if (!profile) nation = 'Teland';
    toast('Fresh from the press: the selun is back.');
  }

  async function changeValue(i: number, input: HTMLInputElement) {
    const old = (safe.series.denominations[i] as Denomination).value;
    const next = cleanValue(input.value.replace(/[\s,.]/g, ''));
    if (next === null) {
      input.value = String(old);
      toast('A value is a whole number, from 0 to a million million.');
      return;
    }
    if (next === old) return;
    if (safe.series.denominations.some((d) => d.value === next)) {
      input.value = String(old);
      toast(`The series already has a ${formatNumeral(next)}.`);
      return;
    }
    const list = safe.series.denominations.map((d, n) => (n === i ? { ...d, value: next } : d));
    if (value === old) value = next;
    take(cleanDesign({ ...safe, series: { ...safe.series, denominations: list } }), true);
    // The row has moved to its new place in the series: keep the keyboard with it.
    await tick();
    form?.querySelector<HTMLInputElement>(`[data-value="${next}"]`)?.focus();
  }

  function recolour(i: number, part: 'ink' | 'paper' | 'accent', colour: string) {
    const d = design.series.denominations[i];
    if (d && /^#[0-9a-f]{6}$/i.test(colour)) d[part] = colour;
  }

  /** The next value up, in the pattern most series follow: 1, 2, 5, 10, 20, 50 … */
  function nextValue(): number | null {
    const have = new Set(safe.series.denominations.map((d) => d.value));
    const top = Math.max(...have);
    const steps: number[] = [];
    for (let unit = 1; unit <= LIMITS.value; unit *= 10) steps.push(unit, unit * 2, unit * 5);
    const fits = steps.filter((n) => n <= LIMITS.value && !have.has(n));
    return fits.find((n) => n > top) ?? fits[0] ?? null;
  }

  function addValue() {
    const next = nextValue();
    if (next === null || safe.series.denominations.length >= LIMITS.denominations) return;
    take(withValue(safe, next, scheme), true);
    value = next;
  }

  function removeValue(v: number) {
    take(withoutValue(safe, v), true);
  }

  function applySeries() {
    const preset = seriesPresets.find((p) => p.id === seriesPreset);
    if (preset) take(withSeries(safe, preset.values, scheme));
  }

  function applyScheme(id: string) {
    scheme = id;
    take(withScheme(safe, id), true);
  }

  function slotKind(which: 'front' | 'back', kind: SlotKind) {
    const first = (artKinds as readonly string[]).includes(kind) ? (artList(kind as ArtKind)[0]?.id ?? '') : '';
    design.note[which] = { kind, art: first };
  }

  function newNumbers() {
    design.note.seed = Math.floor(Math.random() * LIMITS.seed);
    toast('A new print run: fresh serial numbers.');
  }

  /** The picture to download, as SVG text, with a file name to match. */
  function chosen(): { svg: string; file: string } {
    const slug = fileSlug(safe.currency.name || safe.currency.issuer, 'banknote');
    if (what === 'side') return { svg: renderNote(safe, index, side, { pictures }), file: `${slug}-${current.value}-${side}` };
    const sides = what === 'fronts' ? 'front' : what === 'backs' ? 'back' : 'both';
    return { svg: renderSeries(safe, { sides, pictures }), file: `${slug}-series-${what}` };
  }

  /** The picture's own shape, as large as a phone's canvas is sure to manage. */
  function ownSize(text: string): { width: number; height: number } {
    const box = /viewBox="0 0 (\d+) (\d+)"/.exec(text);
    const [w, h] = [Number(box?.[1] ?? 1600), Number(box?.[2] ?? 800)];
    const scale = Math.min(2400 / w, 6000 / h, Math.sqrt(12_000_000 / (w * h)));
    return { width: Math.round(w * scale), height: Math.round(h * scale) };
  }

  async function save(type: 'svg' | 'png' | 'webp') {
    const picture = chosen();
    if (type === 'svg') {
      download(picture.svg, `${picture.file}.svg`, 'image/svg+xml');
      return;
    }
    const preset = PICTURE_SIZES.find((p) => p.id === size);
    const { width, height } = preset ?? ownSize(picture.svg);
    busy = true;
    try {
      const blob = await svgToPicture(picture.svg, { width, height, type: `image/${type}` });
      download(blob, `${picture.file}${preset ? `-${preset.id}` : ''}.${type}`);
    } catch {
      toast("That picture didn't come out. The SVG always works; so does plain paper.");
    } finally {
      busy = false;
    }
  }

  function loaded(next: EurthProfile) {
    profile = next;
    nation = next.meta.nation;
    // Read what Bank wrote before; never change another tool's section.
    const found = designFromSection(getSection(next, 'bank'));
    if (found) {
      take(found);
      toast(`${next.meta.nation || 'Your nation'} is loaded, money and all.`);
    } else {
      toast(`${next.meta.nation || 'Your nation'} is loaded. It has no currency yet: this is where it gets one.`);
    }
  }

  // What "Save profile" writes: Bank's own section, and every other section exactly as it was.
  const saved = $derived.by(() => {
    const from = profile ?? (nation.trim() ? createProfile(nation.trim()) : null);
    if (!from) return null;
    return setSection(from, 'bank', bankSection(safe, getSection(from, 'bank')) as Parameters<typeof setSection<'bank'>>[2]);
  });

  const percent = (n: number, min: number, max: number): string => `${((n - min) / (max - min)) * 100}%`;
</script>

<!-- A numbered section of the form: the number says where you are, the arrow that it folds away. -->
{#snippet heading(number: number, title: string)}
  <summary>
    <span class="number eu-data" aria-hidden="true">{number}</span>
    <h2><span class="eu-visually-hidden">Step {number}: </span>{title}</h2>
    <span class="fold"><Icon icon={faChevronDown} /></span>
  </summary>
{/snippet}

<div class="designer">
  <form class="controls" bind:this={form} onsubmit={(e) => e.preventDefault()}>
    <div class="eu-row">
      <button type="button" class="eu-btn" data-click="tumble" onclick={random}><Icon icon={faDice} /> Random</button>
      <button type="button" class="eu-btn" data-click="spin" onclick={startAgain}><Icon icon={faRotateLeft} /> Start again</button>
    </div>

    <details class="eu-card" open>
      {@render heading(1, 'Currency')}
      <div class="body">
        <div class="pair">
          <label class="eu-field">
            <span class="eu-label">Name of one</span>
            <input class="eu-input" bind:value={design.currency.name} maxlength={LIMITS.name} autocomplete="off" placeholder="selun" />
          </label>
          <label class="eu-field">
            <span class="eu-label">Name of several</span>
            <input class="eu-input" bind:value={design.currency.plural} maxlength={LIMITS.name} autocomplete="off" placeholder={safe.currency.name || 'selun'} />
          </label>
        </div>
        <div class="pair">
          <label class="eu-field">
            <span class="eu-label">Sign</span>
            <input class="eu-input" bind:value={design.currency.symbol} maxlength={LIMITS.symbol} autocomplete="off" />
          </label>
          <label class="eu-field">
            <span class="eu-label">Code</span>
            <input
              class="eu-input eu-input--data"
              value={design.currency.code}
              oninput={(e) => (design.currency.code = e.currentTarget.value.toUpperCase().slice(0, 3))}
              maxlength="3"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              aria-describedby="code-help"
              aria-invalid={design.currency.code !== '' && !code.ok}
            />
          </label>
        </div>
        <div id="code-help" class="note-text" aria-live="polite">
          {#if code.ok || design.currency.code === ''}
            <p class="eu-help">The code is three letters, like a real one, but never a real one: Bank is for fiction only.</p>
          {:else}
            <p class="eu-error">{code.message}</p>
          {/if}
          {#if !code.ok && code.suggestions.length}
            <div class="eu-row">
              <span class="eu-help">Free to use:</span>
              {#each code.suggestions as suggestion (suggestion)}
                <button type="button" class="eu-btn eu-data" onclick={() => (design.currency.code = suggestion)} aria-label={`Use the code ${suggestion}`}>{suggestion}</button>
              {/each}
            </div>
          {/if}
        </div>
        <label class="eu-field">
          <span class="eu-label">Issued by</span>
          <input class="eu-input" bind:value={design.currency.issuer} maxlength={LIMITS.issuer} autocomplete="off" placeholder="Bank of Teland" />
        </label>
      </div>
    </details>

    <details class="eu-card" open>
      {@render heading(2, 'Series')}
      <div class="body">
        <div class="values" role="group" aria-label="The values of the series">
          <div class="values-head eu-help" aria-hidden="true">
            <span>Value</span><span>Ink</span><span>Paper</span><span>Border</span><span></span>
          </div>
          <ul>
            {#each safe.series.denominations as d, i (d.value)}
              <li>
                <input
                  class="eu-input eu-input--data"
                  value={d.value}
                  data-value={d.value}
                  inputmode="numeric"
                  autocomplete="off"
                  aria-label={`Value ${i + 1} of ${safe.series.denominations.length}`}
                  onchange={(e) => changeValue(i, e.currentTarget)}
                />
                <!-- Colour wells wake up with the page: a browser complains if one is filled in before it is ready. -->
                {#each [['ink', 'Ink'], ['paper', 'Paper'], ['accent', 'Border']] as const as [part, label] (part)}
                  {#if ready}
                    <input class="colour" type="color" value={d[part]} oninput={(e) => recolour(i, part, e.currentTarget.value)} aria-label={`${label} of the ${formatNumeral(d.value)}`} />
                  {:else}
                    <span class="colour" style:background={d[part]}></span>
                  {/if}
                {/each}
                <button
                  type="button"
                  class="eu-btn eu-btn--icon eu-btn--quiet"
                  onclick={() => removeValue(d.value)}
                  disabled={safe.series.denominations.length === 1}
                  aria-label={`Remove the ${formatNumeral(d.value)}`}
                  data-tip="Remove"
                >
                  <Icon icon={faTrash} />
                </button>
              </li>
            {/each}
          </ul>
        </div>
        <div class="eu-row">
          <button type="button" class="eu-btn" data-click="pop" onclick={addValue} disabled={safe.series.denominations.length >= LIMITS.denominations || nextValue() === null}>
            <Icon icon={faPlus} /> Add a value
          </button>
          <span class="eu-help">Up to {LIMITS.denominations} values.</span>
        </div>

        <label class="eu-field">
          <span class="eu-label">Or take a ready-made series</span>
          <span class="picker">
            <select class="eu-select" bind:value={seriesPreset} onchange={applySeries}>
              <option value="">Choose a series…</option>
              {#each seriesPresets as preset (preset.id)}
                <option value={preset.id}>{preset.name}: {preset.values.slice(0, 4).map((v) => formatNumeral(v)).join(', ')}…</option>
              {/each}
            </select>
            <Icon icon={faChevronDown} />
          </span>
        </label>

        <fieldset class="options">
          <legend class="eu-label">Colours for the whole series</legend>
          <div class="eu-row">
            {#each colourSchemes as option (option.id)}
              <button type="button" class="eu-btn" onclick={() => applyScheme(option.id)} data-tip={option.about} data-tip-side="top">
                <span class="swatches" aria-hidden="true">
                  {#each option.colours.slice(0, 4) as c (c.ink + c.paper)}
                    <span class="eu-swatch" style:--swatch={c.ink}></span>
                  {/each}
                </span>
                {option.name}
              </button>
            {/each}
          </div>
          <p class="eu-help">Choosing one recolours every value. Change single colours in the rows above.</p>
        </fieldset>

        <fieldset class="options">
          <legend class="eu-label">Size</legend>
          {#each SIZES as item (item.key)}
            {@const [min, max] = LIMITS[item.key]}
            <label class="eu-field">
              <span class="eu-help">{item.name}: <output class="eu-data">{design.series[item.key]} mm</output></span>
              <input class="eu-range" type="range" {min} {max} step={item.step} bind:value={design.series[item.key]} style:--fill={percent(design.series[item.key], min, max)} />
            </label>
          {/each}
        </fieldset>
      </div>
    </details>

    <details class="eu-card">
      {@render heading(3, 'Note')}
      <div class="body">
        <fieldset class="options">
          <legend class="eu-label">Layout</legend>
          <div class="eu-row">
            {#each layouts as option (option)}
              <label class="eu-pill">
                <input type="radio" name="layout" value={option} bind:group={design.note.layout} />
                <span class="eu-check"><Icon icon={faCheck} /></span>
                {LAYOUTS[option]}
              </label>
            {/each}
          </div>
        </fieldset>
        <fieldset class="options">
          <legend class="eu-label">Border</legend>
          <div class="eu-row">
            {#each borders as option (option)}
              <label class="eu-pill">
                <input type="radio" name="border" value={option} bind:group={design.note.border} />
                <span class="eu-check"><Icon icon={faCheck} /></span>
                {BORDERS[option]}
              </label>
            {/each}
          </div>
        </fieldset>
        <fieldset class="options">
          <legend class="eu-label">Paper</legend>
          <div class="eu-row">
            {#each textures as option (option)}
              <label class="eu-pill">
                <input type="radio" name="texture" value={option} bind:group={design.note.texture} />
                <span class="eu-check"><Icon icon={faCheck} /></span>
                {TEXTURES[option]}
              </label>
            {/each}
          </div>
        </fieldset>
        <fieldset class="options">
          <legend class="eu-label">Overprint</legend>
          <label class="eu-pill specimen">
            <input type="checkbox" bind:checked={design.note.specimen} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            SPECIMEN
          </label>
          <p class="eu-help">The fine print, "fictional currency, bank.eurth.org", stays on every picture.</p>
        </fieldset>
      </div>
    </details>

    <details class="eu-card">
      {@render heading(4, 'Pictures')}
      <div class="body">
        {#each [{ which: 'front', name: 'The portrait, on the front' }, { which: 'back', name: 'The vignette, on the back' }] as const as slot (slot.which)}
          {@const kind = design.note[slot.which].kind}
          <fieldset class="options">
            <legend class="eu-label">{slot.name}</legend>
            <span class="picker">
              <select class="eu-select" value={kind} onchange={(e) => slotKind(slot.which, e.currentTarget.value as SlotKind)} aria-label={`${slot.name}: what it shows`}>
                {#each Object.entries(SLOTS) as [id, label] (id)}
                  <option value={id}>{label}</option>
                {/each}
              </select>
              <Icon icon={faChevronDown} />
            </span>
            {#if (artKinds as readonly string[]).includes(kind)}
              <div class="thumbs" role="group" aria-label={`${slot.name}: which drawing`}>
                {#each artList(kind as ArtKind) as art (art.id)}
                  {@const chosen = design.note[slot.which].art === art.id}
                  <button type="button" class="thumb" aria-pressed={chosen} aria-label={art.name} data-tip={art.name} data-tip-side="top" onclick={() => (design.note[slot.which].art = art.id)}>
                    <img src={artThumb(art)} alt="" width="64" height="64" />
                    {#if chosen}<span class="tick"><Icon icon={faCheck} /></span>{/if}
                  </button>
                {/each}
              </div>
            {/if}
            {#if (kind === 'arms' && !hasArms) || (kind === 'flag' && !hasFlag)}
              <p class="eu-help">Load a profile that has {kind === 'arms' ? 'a coat of arms' : 'a flag'} (step 8) and it appears here. Until then, one of our drawings stands in.</p>
            {/if}
          </fieldset>
        {/each}
        <p class="eu-help">Every drawing is Bank's own. It takes no photographs, of real notes or of anything else.</p>
      </div>
    </details>

    <details class="eu-card">
      {@render heading(5, 'Rosette')}
      <div class="body">
        <fieldset class="options">
          <legend class="eu-label">Start from</legend>
          <div class="thumbs">
            {#each rosettePresets as preset (preset.id)}
              {@const chosen = sameRosette(safe.note.rosette, preset.rosette)}
              <button type="button" class="thumb" aria-pressed={chosen} aria-label={preset.name} data-tip={preset.name} data-tip-side="top" onclick={() => (design.note.rosette = { ...preset.rosette })}>
                <img src={rosetteThumb(preset.rosette)} alt="" width="64" height="64" />
                {#if chosen}<span class="tick"><Icon icon={faCheck} /></span>{/if}
              </button>
            {/each}
          </div>
        </fieldset>
        <fieldset class="options">
          <legend class="eu-label">Then turn the six numbers</legend>
          {#each ROSETTE as item (item.key)}
            <label class="eu-field">
              <span class="eu-help">{item.name}: <output class="eu-data">{design.note.rosette[item.key]}</output></span>
              <input
                class="eu-range"
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                bind:value={design.note.rosette[item.key]}
                style:--fill={percent(design.note.rosette[item.key], item.min, item.max)}
              />
            </label>
          {/each}
        </fieldset>
      </div>
    </details>

    <details class="eu-card">
      {@render heading(6, 'Signatures and numbers')}
      <div class="body">
        {#each design.note.signatories as person, i (i)}
          <div class="pair">
            <label class="eu-field">
              <span class="eu-label">{i === 0 ? 'First' : 'Second'} signature</span>
              <input class="eu-input" bind:value={person.name} maxlength={LIMITS.person} autocomplete="off" placeholder="A name" />
            </label>
            <label class="eu-field">
              <span class="eu-label">Title</span>
              <input class="eu-input" bind:value={person.title} maxlength={LIMITS.title} autocomplete="off" placeholder="Governor" />
            </label>
          </div>
        {/each}
        <p class="eu-help">A signature is a scribble made from the name: the same name always signs the same way.</p>
        <div class="pair">
          <label class="eu-field">
            <span class="eu-label">Serial prefix</span>
            <input
              class="eu-input eu-input--data"
              value={design.note.serial.prefix}
              oninput={(e) => (design.note.serial.prefix = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LIMITS.prefix))}
              maxlength={LIMITS.prefix}
              autocomplete="off"
              spellcheck="false"
            />
          </label>
          <label class="eu-field">
            <span class="eu-label">Digits: <output class="eu-data">{design.note.serial.digits}</output></span>
            <input class="eu-range" type="range" min="4" max="10" step="1" bind:value={design.note.serial.digits} style:--fill={percent(design.note.serial.digits, 4, 10)} />
          </label>
        </div>
        <div class="eu-row">
          <button type="button" class="eu-btn" data-click="spin" onclick={newNumbers}><Icon icon={faArrowsRotate} /> New serial numbers</button>
        </div>
      </div>
    </details>

    <details class="eu-card" open>
      {@render heading(7, 'Download')}
      <div class="body">
        <label class="eu-field">
          <span class="eu-label">Picture</span>
          <span class="picker">
            <select class="eu-select" bind:value={what}>
              {#each WHAT as option (option.id)}
                <option value={option.id}>{option.name}</option>
              {/each}
            </select>
            <Icon icon={faChevronDown} />
          </span>
        </label>
        <label class="eu-field">
          <span class="eu-label">Size, for PNG and WebP</span>
          <span class="picker">
            <select class="eu-select" bind:value={size}>
              <option value="own">Its own shape</option>
              {#each PICTURE_SIZES as option (option.id)}
                <option value={option.id}>{option.name}, {option.width} x {option.height}</option>
              {/each}
            </select>
            <Icon icon={faChevronDown} />
          </span>
        </label>
        <div class="eu-row">
          <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('svg')}><Icon icon={faDownload} /> SVG</button>
          <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('png')} disabled={busy}><Icon icon={faDownload} /> PNG</button>
          <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('webp')} disabled={busy}><Icon icon={faDownload} /> WebP</button>
        </div>
      </div>
    </details>

    <details class="eu-card" open>
      {@render heading(8, 'Nation profile')}
      <div class="body">
        {#if profile}
          <p>Loaded: <strong>{profile.meta.nation || 'a nation without a name'}</strong>. Saving writes the currency into it and leaves the rest as it was.</p>
        {:else}
          <label class="eu-field">
            <span class="eu-label">Nation</span>
            <input class="eu-input" bind:value={nation} maxlength="80" autocomplete="off" placeholder="Whose money is this?" aria-describedby="nation-help" />
            <span class="eu-help" id="nation-help">Names the profile file. Leave it empty if you only want the pictures.</span>
          </label>
        {/if}
        <div class="eu-row">
          <ProfileButtons profile={saved} onload={loaded} onerror={(errors) => toast(errors[0]?.message ?? "That file isn't a nation profile. Pick one that ends in .eurth.json.")} />
        </div>
        <p class="eu-help">The profile file carries your nation from one Eurth tool to the next. The link holds the whole series; nothing is kept in this browser.</p>
      </div>
    </details>
  </form>

  <!-- The result stays in view while the form scrolls, so every change shows at once. -->
  <section class="result" aria-labelledby="result-title">
    <h2 id="result-title" class="eu-visually-hidden">Your banknote</h2>

    <div class="eu-row tabs" role="group" aria-label="What to look at">
      <button type="button" class="eu-btn" aria-pressed={show === 'note' && side === 'front'} onclick={() => ((show = 'note'), (side = 'front'))}>Front</button>
      <button type="button" class="eu-btn" aria-pressed={show === 'note' && side === 'back'} onclick={() => ((show = 'note'), (side = 'back'))}>Back</button>
      <button type="button" class="eu-btn" aria-pressed={show === 'series'} onclick={() => (show = 'series')}>Whole series</button>
    </div>

    <div class="stage" bind:this={stage}>
      {#if show === 'series'}
        <!-- A long sheet scrolls inside its own frame; tabindex lets the keyboard scroll it too. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="sheet-frame" tabindex="0" role="group" aria-label="The whole series, fronts and backs">
          <img class="sheet" src={dataUrl(sheet)} alt={description} />
        </div>
      {:else}
        <!-- The signature touch: each time the value changes, the note slides off the stack as if counted. -->
        <div class="pile">
          {#key current.value}
            <img class="note" src={dataUrl(svg)} alt={description} width={shape.width * 5} height={shape.height * 5} />
          {/key}
        </div>
      {/if}
    </div>

    {#if show === 'note'}
      <div class="eu-row chips" role="group" aria-label="Value">
        {#each safe.series.denominations as d (d.value)}
          <button type="button" class="eu-btn eu-data" aria-pressed={d.value === current.value} onclick={() => (value = d.value)} aria-label={`The ${formatNumeral(d.value)} note`}>
            <span class="eu-swatch" style:--swatch={d.ink}></span>
            {formatNumeral(d.value)}
          </button>
        {/each}
      </div>
    {/if}

    <div class="share">
      <ShareButtons
        url={link}
        {title}
        text={`${bankSummary(safe)} Made with ${siteName}.`}
        description={() => describeDesign(safe, index)}
        picture={() => svgToPicture(svg, { width: 1200, height: 630 })}
        heading={safe.currency.name ? `Share the ${safe.currency.name}` : 'Share your banknote'}
        said={{ link: 'Link copied: the whole series is in it.' }}
      />
    </div>

    <p class="eu-muted description" aria-hidden="true">{description}</p>
  </section>
</div>

<style>
  .designer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: var(--space-6);
    align-items: start;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  /* A section: its number, its name, and an arrow that turns when it is open. */
  summary {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--size-target);
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary h2 {
    flex: 1;
    font: var(--type-heading);
  }

  .number {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--space-8);
    height: var(--space-8);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-full);
    font: var(--type-label);
  }

  details[open] > summary .number {
    border-color: var(--selected);
    background: var(--selected);
    color: var(--on-selected);
  }

  .fold {
    display: inline-flex;
    transition: transform 0.15s;
  }

  details[open] > summary .fold {
    transform: rotate(180deg);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding-top: var(--space-3);
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: end;
  }

  .note-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .specimen {
    align-self: start;
  }

  /* A dropdown with room for its arrow: the arrow is ours, so it sits inside the rounded edge. */
  .picker {
    position: relative;
    display: block;
  }

  .picker select {
    appearance: none;
    padding-right: var(--space-8);
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .picker :global(svg) {
    position: absolute;
    top: 50%;
    right: var(--space-3);
    width: var(--space-3);
    height: var(--space-3);
    margin-top: calc(var(--space-3) / -2);
    pointer-events: none;
  }

  .values ul {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .values li,
  .values-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(4, var(--size-target));
    gap: var(--space-2);
    align-items: center;
  }

  .values-head {
    margin-bottom: var(--space-1);
  }

  .values-head span:not(:first-child) {
    text-align: center;
  }

  /* A colour well the size of any other control. The colour inside is the visitor's own. */
  .colour {
    width: var(--size-target);
    height: var(--size-target);
    padding: var(--space-1);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: transparent;
    cursor: pointer;
  }

  .swatches {
    display: inline-flex;
    gap: var(--space-1);
  }

  /* Drawings and rosettes to choose by sight. The chosen one has a heavier edge and a tick. */
  .thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space-12) + var(--space-3)), 1fr));
    gap: var(--space-2);
  }

  .thumb {
    position: relative;
    display: inline-flex;
    padding: var(--space-1);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: transparent;
    cursor: pointer;
  }

  .thumb img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    border-radius: var(--radius-sm);
  }

  .thumb:hover {
    border-color: var(--ink);
  }

  .thumb[aria-pressed='true'] {
    border-color: var(--selected);
    box-shadow: inset 0 0 0 var(--size-ring) var(--selected);
  }

  .tick {
    position: absolute;
    top: calc(-1 * var(--space-1));
    right: calc(-1 * var(--space-1));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--space-5);
    height: var(--space-5);
    border-radius: var(--radius-full);
    background: var(--selected);
    color: var(--on-selected);
    font: var(--type-note);
  }

  /* The result stays put while the form goes by. If the window is short, it scrolls within itself. */
  .result {
    position: sticky;
    top: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
    max-height: calc(100vh - 2 * var(--space-3));
    overflow-y: auto;
  }

  .stage {
    display: flex;
    justify-content: center;
    padding: var(--space-2) var(--space-2) var(--space-3) var(--space-3);
  }

  /* The stack the note is counted from: two more notes' worth of paper, a little out of line. */
  .pile {
    position: relative;
    max-width: 100%;
  }

  .pile::before,
  .pile::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface-raised);
  }

  .pile::before {
    transform: translate(calc(-1 * var(--space-2)), var(--space-2));
  }

  .pile::after {
    transform: translate(calc(-1 * var(--space-1)), var(--space-1));
  }

  /* The note takes the width it is given, but never more than half the window's height. */
  .note {
    position: relative;
    z-index: 1;
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 48vh;
    animation: counted 0.4s ease-out;
  }

  .sheet-frame {
    width: 100%;
    max-height: 62vh;
    overflow-y: auto;
    border-radius: var(--radius-md);
  }

  .sheet {
    display: block;
    width: 100%;
    height: auto;
  }

  .description {
    font: var(--type-note);
  }

  @keyframes counted {
    from {
      transform: translate(-7%, 9%) rotate(-5deg);
      opacity: 0.3;
    }
  }

  @media (max-width: 900px) {
    .designer {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
    }

    /* On a phone the result comes first, and the note itself stays in view above the form. */
    .result {
      display: contents;
    }

    .tabs,
    .stage,
    .chips,
    .share,
    .description {
      order: -1;
    }

    .stage {
      position: sticky;
      top: 0;
      z-index: 3;
      background: var(--surface);
    }

    .note {
      max-height: 26vh;
    }

    .sheet-frame {
      max-height: 40vh;
    }
  }

  @media (max-width: 420px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
