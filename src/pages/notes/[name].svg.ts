// The pictures of notes that the pages show, written out as SVG files when the site is built.
import type { APIRoute, GetStaticPaths } from 'astro';
import { pictures } from '../../site/pictures';

export const getStaticPaths = (() => pictures().map((p) => ({ params: { name: p.name }, props: { svg: p.svg } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(props.svg as string, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
