/**
 * The guide is written in a small, strict subset of Markdown, and this turns it into HTML when the
 * site is built: headings (## and ###, each with an id to link to), paragraphs, lists, bold and
 * links. Writing it ourselves keeps the guide's text in one plain file, gives every outbound link
 * its ?ref= as the handbook asks, and leaves no room for markup to slip in: everything is escaped
 * first. Build time only; the text is our own.
 */

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "The value, twice" gives "the-value-twice". */
export function slug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Bold and links inside a line. `link` may rewrite an address (to add ?ref=). */
function inline(text: string, link: (href: string) => string): string {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_, label: string, href: string) => `<a href="${link(href.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}">${label}</a>`);
}

export interface Rendered {
  /** The lines between the --- marks at the top, as key and value. */
  front: Record<string, string>;
  html: string;
  /** Every heading, in order. */
  headings: { level: number; id: string; text: string }[];
}

export function renderMarkdown(source: string, link: (href: string) => string = (href) => href): Rendered {
  const front: Record<string, string> = {};
  const body = source.replace(/^---\n([\s\S]*?)\n---\n/, (_, lines: string) => {
    for (const line of lines.split('\n')) {
      const found = /^([a-z]+): (.+)$/.exec(line);
      if (found) front[found[1] as string] = (found[2] as string).trim();
    }
    return '';
  });
  const headings: Rendered['headings'] = [];
  const html = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const heading = /^(#{2,3}) (.+)$/.exec(block);
      if (heading && lines.length === 1) {
        const level = (heading[1] as string).length;
        const text = heading[2] as string;
        headings.push({ level, id: slug(text), text });
        return `<h${level} id="${slug(text)}">${inline(text, link)}</h${level}>`;
      }
      if (lines.every((line) => /^- /.test(line))) return `<ul>${lines.map((line) => `<li>${inline(line.slice(2), link)}</li>`).join('')}</ul>`;
      if (lines.every((line) => /^\d+\. /.test(line))) return `<ol>${lines.map((line) => `<li>${inline(line.replace(/^\d+\. /, ''), link)}</li>`).join('')}</ol>`;
      return `<p>${inline(lines.join(' '), link)}</p>`;
    })
    .join('\n');
  return { front, html, headings };
}
