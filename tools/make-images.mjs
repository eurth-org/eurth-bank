// Makes the pictures that aren't drawn by hand, with the Chrome on this machine: the favicon,
// the home-screen icons and the sharing image. Run it after changing the sharing image, and
// commit what it writes to public/:  npm run images
import { makeImages, sharingImage } from '@eurth/style/images';
import { createServer } from 'vite';
import { site } from '../eurth.config.mjs';

// The note on the sharing image comes from the same code as the site (Vite reads TypeScript):
// Bank's own specimen, the 100 selun note of the Bank of Teland.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { renderNote } = await vite.ssrLoadModule('/src/bank/render.ts');
  const { defaultDesign } = await vite.ssrLoadModule('/src/bank/model.ts');
  const design = defaultDesign();
  const index = design.series.denominations.findIndex((d) => d.value === 100);
  const made = await makeImages({ sharing: [{ file: 'og.png', html: sharingImage({ site, art: renderNote(design, index, 'front', { pixelWidth: 560 }) }) }] });
  console.log(`Made ${made.map((file) => `public/${file}`).join(', ')}`);
} finally {
  await vite.close();
}
