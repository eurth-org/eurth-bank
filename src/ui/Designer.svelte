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
  import { faArrowsRotate, faCheck, faDice, faDownload, faPlus, faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
  import { createProfile, getSection, setSection, svgDataUrl, type EurthProfile } from '@eurth/profile';
  import ProfileButtons from '@eurth/profile/ProfileButtons.svelte';
  import { PICTURE_SIZES, download, fileSlug, nice, svgToPicture, toast } from '@eurth/style';
  import Icon from '@eurth/style/components/Icon.svelte';
  import ShareButtons from '@eurth/style/components/ShareButtons.svelte';
  import { onMount, tick } from 'svelte';
  import { artKinds, artList, type ArtKind } from '../bank/art';
  import { describeDesign, describeNote, describeSeries, noteName } from '../bank/describe';
  import { checkCode } from '../bank/fiction';
  import { toastForChange } from '../bank/fun';
  import { inventCurrency } from '../bank/invent';
  import { designQuery, readQuery } from '../bank/link';
  import { LIMITS, borders, cleanDesign, cleanValue, defaultDesign, layouts, textures, type Border, type Denomination, type Design, type Layout, type Side, type SlotKind, type Texture } from '../bank/model';
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
  const SLOTS: Record<SlotKind, string> = { none: 'Nothing', silhouette: 'Silhouette', building: 'Building', landscape: 'Landscape', arms: 'Arms, from the profile', flag: 'Flag, from the profile' };
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
  let rosettePreset = $state('');
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
    rosettePreset = '';
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

  function applyScheme() {
    take(withScheme(safe, scheme), true);
  }

  function applyRosette() {
    const preset = rosettePresets.find((p) => p.id === rosettePreset);
    if (preset) design.note.rosette = { ...preset.rosette };
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

<div class="designer">
  <form class="controls eu-stack" bind:this={form} onsubmit={(e) => e.preventDefault()}>
    <div class="eu-row">
      <button type="button" class="eu-btn" data-click="tumble" onclick={random}><Icon icon={faDice} /> Random</button>
      <button type="button" class="eu-btn" data-click="spin" onclick={startAgain}><Icon icon={faRotateLeft} /> Start again</button>
    </div>

    <details class="eu-card" open>
      <summary><h2>Currency</h2></summary>
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
      <div id="code-help" class="eu-stack code-help" aria-live="polite">
        {#if code.ok || design.currency.code === ''}
          <p class="eu-help">Three letters, like a real code, but never a real one: Bank is for fiction only.</p>
        {:else}
          <p class="eu-error">{code.message}</p>
        {/if}
        {#if !code.ok && code.suggestions.length}
          <div class="eu-row">
            <span class="eu-help">Free to use:</span>
            {#each code.suggestions as suggestion (suggestion)}
              <button type="button" class="eu-btn eu-btn--quiet eu-data" onclick={() => (design.currency.code = suggestion)} aria-label={`Use the code ${suggestion}`}>{suggestion}</button>
            {/each}
          </div>
        {/if}
      </div>
      <label class="eu-field">
        <span class="eu-label">Issued by</span>
        <input class="eu-input" bind:value={design.currency.issuer} maxlength={LIMITS.issuer} autocomplete="off" placeholder="Bank of Teland" />
      </label>
    </details>

    <details class="eu-card" open>
      <summary><h2>Series</h2></summary>
      <ul class="values">
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
                <input class="colour" type="color" value={d[part]} oninput={(e) => recolour(i, part, e.currentTarget.value)} aria-label={`${label} of the ${formatNumeral(d.value)}`} data-tip={label} />
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
      <div class="eu-row">
        <button type="button" class="eu-btn" data-click="pop" onclick={addValue} disabled={safe.series.denominations.length >= LIMITS.denominations || nextValue() === null}>
          <Icon icon={faPlus} /> Add a value
        </button>
        <span class="eu-help">Up to {LIMITS.denominations} values. Each has an ink, a paper and a border colour.</span>
      </div>

      <div class="pair">
        <label class="eu-field">
          <span class="eu-label">A ready-made series</span>
          <select class="eu-select" bind:value={seriesPreset} onchange={applySeries}>
            <option value="">Choose…</option>
            {#each seriesPresets as preset (preset.id)}
              <option value={preset.id}>{preset.name}</option>
            {/each}
          </select>
        </label>
        <label class="eu-field">
          <span class="eu-label">Colours</span>
          <select class="eu-select" bind:value={scheme} onchange={applyScheme}>
            {#each colourSchemes as option (option.id)}
              <option value={option.id}>{option.name}</option>
            {/each}
          </select>
        </label>
      </div>

      {#each SIZES as item (item.key)}
        {@const [min, max] = LIMITS[item.key]}
        <label class="eu-field">
          <span class="eu-label">{item.name}: <output class="eu-data">{design.series[item.key]} mm</output></span>
          <input class="eu-range" type="range" {min} {max} step={item.step} bind:value={design.series[item.key]} style:--fill={percent(design.series[item.key], min, max)} />
        </label>
      {/each}
    </details>

    <details class="eu-card">
      <summary><h2>Note</h2></summary>
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
      <div class="pair">
        <label class="eu-field">
          <span class="eu-label">Border</span>
          <select class="eu-select" bind:value={design.note.border}>
            {#each borders as option (option)}
              <option value={option}>{BORDERS[option]}</option>
            {/each}
          </select>
        </label>
        <label class="eu-field">
          <span class="eu-label">Paper</span>
          <select class="eu-select" bind:value={design.note.texture}>
            {#each textures as option (option)}
              <option value={option}>{TEXTURES[option]}</option>
            {/each}
          </select>
        </label>
      </div>
      <label class="eu-pill specimen">
        <input type="checkbox" bind:checked={design.note.specimen} />
        <span class="eu-check"><Icon icon={faCheck} /></span>
        SPECIMEN overprint
      </label>
      <p class="eu-help">The fine print, "fictional currency, bank.eurth.org", stays on every picture.</p>
    </details>

    <details class="eu-card">
      <summary><h2>Pictures</h2></summary>
      {#each [{ which: 'front', name: 'Portrait, on the front' }, { which: 'back', name: 'Vignette, on the back' }] as const as slot (slot.which)}
        {@const kind = design.note[slot.which].kind}
        <div class="pair">
          <label class="eu-field">
            <span class="eu-label">{slot.name}</span>
            <select class="eu-select" value={kind} onchange={(e) => slotKind(slot.which, e.currentTarget.value as SlotKind)}>
              {#each Object.entries(SLOTS) as [id, label] (id)}
                <option value={id}>{label}</option>
              {/each}
            </select>
          </label>
          {#if (artKinds as readonly string[]).includes(kind)}
            <label class="eu-field">
              <span class="eu-label">Which one</span>
              <select class="eu-select" bind:value={design.note[slot.which].art}>
                {#each artList(kind as ArtKind) as art (art.id)}
                  <option value={art.id}>{art.name}</option>
                {/each}
              </select>
            </label>
          {/if}
        </div>
        {#if (kind === 'arms' && !hasArms) || (kind === 'flag' && !hasFlag)}
          <p class="eu-help">Load a profile that has {kind === 'arms' ? 'a coat of arms' : 'a flag'} and it appears here. Until then, one of our drawings stands in.</p>
        {/if}
      {/each}
      <p class="eu-help">Every drawing is Bank's own. It takes no photographs, of real notes or of anything else.</p>
    </details>

    <details class="eu-card">
      <summary><h2>Rosette</h2></summary>
      <label class="eu-field">
        <span class="eu-label">Start from</span>
        <select class="eu-select" bind:value={rosettePreset} onchange={applyRosette}>
          <option value="">Choose…</option>
          {#each rosettePresets as preset (preset.id)}
            <option value={preset.id}>{preset.name}</option>
          {/each}
        </select>
      </label>
      {#each ROSETTE as item (item.key)}
        <label class="eu-field">
          <span class="eu-label">{item.name}: <output class="eu-data">{design.note.rosette[item.key]}</output></span>
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
    </details>

    <details class="eu-card">
      <summary><h2>Signatures and numbers</h2></summary>
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
    </details>
  </form>

  <section class="result" aria-labelledby="result-title">
    <h2 id="result-title" class="eu-visually-hidden">Your banknote</h2>

    <div class="eu-row" role="group" aria-label="What to look at">
      <button type="button" class="eu-btn" aria-pressed={show === 'note' && side === 'front'} onclick={() => ((show = 'note'), (side = 'front'))}>Front</button>
      <button type="button" class="eu-btn" aria-pressed={show === 'note' && side === 'back'} onclick={() => ((show = 'note'), (side = 'back'))}>Back</button>
      <button type="button" class="eu-btn" aria-pressed={show === 'series'} onclick={() => (show = 'series')}>Whole series</button>
    </div>

    <div class="stage" class:upright bind:this={stage}>
      {#if show === 'series'}
        <img class="sheet" src={dataUrl(sheet)} alt={description} />
      {:else}
        <!-- The signature touch: each time the value changes, the note slides off the stack as if counted. -->
        <div class="pile">
          {#key current.value}
            <img class="note" src={dataUrl(svg)} alt={description} />
          {/key}
        </div>
      {/if}
    </div>

    {#if show === 'note'}
      <div class="eu-row" role="group" aria-label="Value">
        {#each safe.series.denominations as d (d.value)}
          <button type="button" class="eu-btn eu-data" aria-pressed={d.value === current.value} onclick={() => (value = d.value)} aria-label={`The ${formatNumeral(d.value)} note`}>
            <span class="eu-swatch" style:--swatch={d.ink}></span>
            {formatNumeral(d.value)}
          </button>
        {/each}
      </div>
    {/if}

    <p class="eu-muted" aria-hidden="true">{description}</p>

    <ShareButtons
      url={link}
      {title}
      text={`${bankSummary(safe)} Made with ${siteName}.`}
      description={() => describeDesign(safe, index)}
      picture={() => svgToPicture(svg, { width: 1200, height: 630 })}
      heading={safe.currency.name ? `Share the ${safe.currency.name}` : 'Share your banknote'}
      said={{ link: 'Link copied: the whole series is in it.' }}
    />

    <div class="eu-card eu-card--outline">
      <h3>Download</h3>
      <div class="pair">
        <label class="eu-field">
          <span class="eu-label">Picture</span>
          <select class="eu-select" bind:value={what}>
            {#each WHAT as option (option.id)}
              <option value={option.id}>{option.name}</option>
            {/each}
          </select>
        </label>
        <label class="eu-field">
          <span class="eu-label">Size, for PNG and WebP</span>
          <select class="eu-select" bind:value={size}>
            <option value="own">Its own shape</option>
            {#each PICTURE_SIZES as option (option.id)}
              <option value={option.id}>{option.name}, {option.width} x {option.height}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="eu-row">
        <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('svg')}><Icon icon={faDownload} /> SVG</button>
        <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('png')} disabled={busy}><Icon icon={faDownload} /> PNG</button>
        <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('webp')} disabled={busy}><Icon icon={faDownload} /> WebP</button>
      </div>
    </div>

    <div class="eu-card eu-card--outline">
      <h3>Nation profile</h3>
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
    gap: var(--space-4);
  }

  summary {
    display: flex;
    align-items: center;
    min-height: var(--size-target);
    cursor: pointer;
  }

  summary h2,
  h3 {
    font: var(--type-heading);
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: end;
  }

  .code-help {
    gap: var(--space-2);
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .specimen {
    align-self: start;
  }

  .values {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .values li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(4, var(--size-target));
    gap: var(--space-2);
    align-items: center;
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

  .result {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .stage {
    display: flex;
    justify-content: center;
    padding: var(--space-3) var(--space-3) var(--space-4) var(--space-4);
  }

  /* The stack the note is counted from: two more notes' worth of paper, a little out of line. */
  .pile {
    position: relative;
    width: 100%;
  }

  .upright .pile {
    width: 50%;
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

  .note,
  .sheet {
    display: block;
    width: 100%;
    height: auto;
  }

  .note {
    position: relative;
    z-index: 1;
    animation: counted 0.4s ease-out;
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
    }

    /* On a phone the result comes first: it is what the visitor came for. */
    .result {
      order: -1;
    }
  }

  @media (max-width: 420px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
