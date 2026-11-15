// What this tool is called and where it lives. Read at build time only: astro.config.mjs, the
// frontmatter of .astro pages, tests and tools/. Never import this from a Svelte component or a
// <script>: it pulls in the list of every Eurth tool, and browser code must not carry that
// (HANDBOOK.md, Launch). Hand the component what it needs as props instead.
import { defineSite } from '@eurth/style/build';

export const site = defineSite({
  // The subdomain, and the tool's id in @eurth/style's tools.json.
  id: 'bank',
  name: 'Bank',
  url: 'https://bank.eurth.org',
  // "<Name>: free online <thing> maker for worldbuilders"
  title: 'Bank: free online banknote maker for worldbuilders',
  description: 'A free online banknote maker for worldbuilders: design the money of your invented nation, one note or a whole series, and take it with you as a link, a picture or a profile file. No account needed.',
  tagline: "Money with your nation's face on it",
  pages: [
    { href: '/', label: 'Designer' },
    { href: '/templates/', label: 'Templates' },
    { href: '/guide/', label: 'Guide' },
    { href: '/glossary/', label: 'Glossary' },
  ],
  repo: 'https://github.com/eurth-org/eurth-bank',
  ogAlt: 'Bank, the banknote designer for fictional currencies, at bank.eurth.org: the Eurth yurt beside a specimen 100 selun note of the Bank of Teland.',
});
