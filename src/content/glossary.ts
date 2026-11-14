/**
 * The glossary: the words of banknotes, each explained in a sentence or two. Kept as data, in
 * alphabetical order, so the Glossary page can list it, link terms to each other and publish it as
 * a DefinedTermSet for search engines.
 */

export interface Term {
  /** A short id for links: "security-thread". */
  id: string;
  term: string;
  definition: string;
  /** Ids of related terms. */
  see?: readonly string[];
  /** True when Bank's designer draws its own version of this. */
  inBank?: boolean;
}

export const GLOSSARY_UPDATED = '2026-11-15';

export const glossary: readonly Term[] = [
  { id: 'banknote', term: 'Banknote', definition: 'Paper or polymer money: a promise by a bank, printed so that it can pass from hand to hand. Often shortened to note.', see: ['issuer', 'substrate'] },
  { id: 'border', term: 'Border', definition: 'The frame of pattern that runs round the edge of a note. It holds the design together and leaves a plain margin outside it.', see: ['guilloche'], inBank: true },
  { id: 'central-bank', term: 'Central bank', definition: 'The bank that issues a nation\'s money and looks after its value. Most notes name it across the top.', see: ['issuer'] },
  { id: 'check-digit', term: 'Check digit', definition: 'A last digit of a serial number that is worked out from the others, so that a mistyped or invented number can be caught.', see: ['serial-number'] },
  { id: 'clear-window', term: 'Clear window', definition: 'A see-through patch in a polymer note, often with a picture or foil in it. Paper can\'t have one.', see: ['polymer'] },
  { id: 'colour-shifting-ink', term: 'Colour-shifting ink', definition: 'Ink that changes colour as the note is tilted, from green to blue, say. Printers call it optically variable ink.', see: ['hologram'] },
  { id: 'commemorative-note', term: 'Commemorative note', definition: 'A note issued to mark an event, an anniversary or a reign, usually in small numbers and often kept, not spent.' },
  { id: 'cotton-paper', term: 'Cotton paper', definition: 'The paper of most paper banknotes, made from cotton fibre and not from wood. It is tough, crisp and survives a wash.', see: ['substrate', 'polymer'] },
  { id: 'counterfeit', term: 'Counterfeit', definition: 'A fake note made to pass as a real one. Most of what is on a banknote is there to make counterfeiting hard.', see: ['security-feature'] },
  { id: 'currency-code', term: 'Currency code', definition: 'Three capital letters that stand for a currency in tables and bank systems, as set by the standard ISO 4217. Bank refuses every real one.', see: ['iso-4217', 'currency-symbol'], inBank: true },
  { id: 'currency-symbol', term: 'Currency symbol', definition: 'A short sign written beside an amount in place of the currency\'s name.', see: ['currency-code'], inBank: true },
  { id: 'demonetisation', term: 'Demonetisation', definition: 'Declaring that a note is no longer money. Old notes can usually be exchanged at the central bank for a time, sometimes for ever.', see: ['legal-tender', 'series'] },
  { id: 'denomination', term: 'Denomination', definition: 'The value a note is printed with: a five, a ten, a hundred. A series is a set of denominations.', see: ['series'], inBank: true },
  { id: 'fine-print', term: 'Fine print', definition: 'Small lettering in the margin of a note. On every picture Bank makes it reads "fictional currency, bank.eurth.org".', see: ['specimen'], inBank: true },
  { id: 'foil-stripe', term: 'Foil stripe', definition: 'A band of metallic foil applied to a note, usually carrying holograms or numbers that move in the light.', see: ['hologram'] },
  { id: 'guilloche', term: 'Guilloche', definition: 'Fine lines that weave over and under each other in bands and rosettes with mechanical precision. First cut on geometric lathes, now made with mathematics.', see: ['rosette', 'lathe-work', 'border'], inBank: true },
  { id: 'hologram', term: 'Hologram', definition: 'A shiny patch whose picture changes or moves as the note is tilted.', see: ['foil-stripe', 'colour-shifting-ink'] },
  { id: 'hyperinflation', term: 'Hyperinflation', definition: 'Prices rising so fast that money loses its value in weeks. On banknotes it shows as ever higher denominations and ever more noughts.', see: ['denomination', 'redenomination'] },
  { id: 'intaglio', term: 'Intaglio', definition: 'Printing from an engraved plate under great pressure, which leaves the ink standing up from the paper so that it can be felt.', see: ['raised-print', 'offset'] },
  { id: 'iso-4217', term: 'ISO 4217', definition: 'The international standard that gives every currency a three-letter code and a number. As a rule the first two letters are the country and the third is the unit.', see: ['currency-code'] },
  { id: 'issuer', term: 'Issuer', definition: 'Whoever puts a note into the world and answers for it: a central bank, a treasury, sometimes a commercial bank or a city.', see: ['central-bank', 'signature'], inBank: true },
  { id: 'laid-paper', term: 'Laid paper', definition: 'Paper with a ribbed look, from the wires of the mould it was made on. One of the paper textures in Bank.', see: ['substrate'], inBank: true },
  { id: 'lathe-work', term: 'Lathe work', definition: 'Patterns cut by a geometric lathe, a machine of gears and cams that draws curves no hand could repeat. The origin of guilloche.', see: ['guilloche'] },
  { id: 'legal-tender', term: 'Legal tender', definition: 'Money that the law says must be accepted in settlement of a debt. The exact meaning differs from country to country.', see: ['demonetisation'] },
  { id: 'microprint', term: 'Microprint', definition: 'Lettering so small that it looks like a line until it is magnified. Copiers can\'t resolve it, so on a fake it is a blur.', see: ['security-feature'], inBank: true },
  { id: 'notaphily', term: 'Notaphily', definition: 'The collecting and study of paper money. A collector is a notaphilist.' },
  { id: 'obverse', term: 'Obverse', definition: 'The front of a note: the side with the main picture, the signatures and the serial number.', see: ['reverse'], inBank: true },
  { id: 'offset', term: 'Offset printing', definition: 'Flat printing that lays down the coloured background of a note, both sides at once on banknote presses, before the intaglio goes on top.', see: ['intaglio', 'see-through-register'] },
  { id: 'overprint', term: 'Overprint', definition: 'Something printed over a finished note: a new value in an emergency, a stamp, or the word SPECIMEN.', see: ['specimen'], inBank: true },
  { id: 'polymer', term: 'Polymer', definition: 'Plastic film used in place of paper for banknotes. It lasts longer, stays cleaner and allows clear windows. First issued in Australia in 1988.', see: ['clear-window', 'substrate'] },
  { id: 'portrait', term: 'Portrait', definition: 'The face on a note. It says who a nation honours, and a badly copied face is easy to spot.', see: ['vignette'], inBank: true },
  { id: 'prefix', term: 'Prefix', definition: 'The letters at the start of a serial number, which often say which printing run or which bank a note came from.', see: ['serial-number'], inBank: true },
  { id: 'raised-print', term: 'Raised print', definition: 'Ink that can be felt with a fingertip, left by intaglio printing. Often used for marks that tell the value by touch.', see: ['intaglio', 'tactile-mark'] },
  { id: 'redenomination', term: 'Redenomination', definition: 'Striking noughts off a currency: a thousand old units become one new one. Usually follows a long inflation.', see: ['hyperinflation'] },
  { id: 'replacement-note', term: 'Replacement note', definition: 'A note printed to take the place of a spoiled one, marked with a star or a special prefix so that the count of the run stays right.', see: ['serial-number', 'prefix'] },
  { id: 'reverse', term: 'Reverse', definition: 'The back of a note, usually with a second picture and the value again.', see: ['obverse'], inBank: true },
  { id: 'rosette', term: 'Rosette', definition: 'A round guilloche pattern: a nest of wavy rings, each turned a little against the next, so that the lines cross like lace.', see: ['guilloche'], inBank: true },
  { id: 'security-feature', term: 'Security feature', definition: 'Anything on a note that is hard to copy. Some are for the public to check by feeling, looking and tilting, some for machines, and some are kept secret.', see: ['counterfeit', 'watermark', 'security-thread'] },
  { id: 'security-thread', term: 'Security thread', definition: 'A thin strip embedded in the paper as it is made. Against the light it shows as a dark line, often with tiny lettering.', see: ['windowed-thread', 'watermark'] },
  { id: 'see-through-register', term: 'See-through register', definition: 'A shape printed half on the front and half on the back, so exactly that the halves make one figure when the note is held to the light.', see: ['offset'] },
  { id: 'serial-number', term: 'Serial number', definition: 'The number that belongs to one note alone, usually printed twice on the front.', see: ['prefix', 'check-digit'], inBank: true },
  { id: 'series', term: 'Series', definition: 'All the denominations issued to one design, with a shared theme, a colour for each value and often a size for each too.', see: ['denomination', 'demonetisation'], inBank: true },
  { id: 'signature', term: 'Signature', definition: 'The signed name of an official who answers for the note, such as a governor or a chief cashier. In Bank, a generated scribble.', see: ['issuer'], inBank: true },
  { id: 'specimen', term: 'Specimen', definition: 'A note made to be shown and not spent, marked SPECIMEN so that nobody can mistake it. Every picture Bank makes is one.', see: ['overprint', 'fine-print'], inBank: true },
  { id: 'substrate', term: 'Substrate', definition: 'What a note is printed on: cotton paper, polymer, or layers of both.', see: ['cotton-paper', 'polymer'] },
  { id: 'tactile-mark', term: 'Tactile mark', definition: 'A raised shape or set of lines that lets blind and partially sighted people tell the value of a note by touch.', see: ['raised-print'] },
  { id: 'vignette', term: 'Vignette', definition: 'An engraved picture without a hard edge: a building, a landscape, a ship. Often the whole back of a note.', see: ['portrait'], inBank: true },
  { id: 'watermark', term: 'Watermark', definition: 'A picture made in the paper itself by varying its thickness. It appears when the note is held to the light.', see: ['security-thread', 'cotton-paper'] },
  { id: 'windowed-thread', term: 'Windowed thread', definition: 'A security thread that comes to the surface at intervals, so that it shows as metallic dashes on the face of the note and as one line against the light.', see: ['security-thread'] },
];

/** A term by its id, or undefined. */
export function term(id: string): Term | undefined {
  return glossary.find((entry) => entry.id === id);
}
