// Regenerates the project grid in index.html from projects.json.
// Usage: node build.mjs   (no dependencies)
import { readFileSync, writeFileSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const projects = JSON.parse(readFileSync('projects.json', 'utf8'));

const card = (p, i) => {
  const href = p.page ? ` href="${esc(p.page)}"` : '';
  const media = p.thumb
    ? `<img src="${esc(p.thumb)}" alt="${esc(p.thumbAlt || '')}" style="object-position: ${esc(p.thumbPosition || '50% 50%')}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" />`
    : `<span class="project-card-tiles" aria-hidden="true">${(p.tiles || []).map((t) => `<span>${esc(t)}</span>`).join('')}</span>`;
  const links = [
    p.page && `<a href="${esc(p.page)}">read &rarr;</a>`,
    p.live && `<a class="project-card-live" href="${esc(p.live)}" target="_blank" rel="noopener">live build &rarr;</a>`,
    ...(p.extra || []).map((e) => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.label).replace('→', '&rarr;')}</a>`),
  ].filter(Boolean).join('\n          ');
  return `      <article class="project-card">
        <a class="project-card-media"${href} tabindex="-1" aria-hidden="true">
          ${media}
        </a>
        <h3 class="project-card-title">${p.page ? `<a href="${esc(p.page)}">${esc(p.title)}</a>` : esc(p.title)}</h3>
        <p class="project-card-statement">${esc(p.statement)}</p>
        <p class="project-card-tags">${esc(p.tags)}</p>
        <p class="project-card-links">
          ${links}
        </p>
      </article>`;
};

const html = readFileSync('index.html', 'utf8');
const start = '<!-- projects:start -->';
const end = '<!-- projects:end -->';
const a = html.indexOf(start);
const b = html.indexOf(end);
if (a < 0 || b < 0) throw new Error('index.html is missing the projects:start / projects:end markers');
const out = `${html.slice(0, a + start.length)}\n${projects.map(card).join('\n')}\n      ${html.slice(b)}`;
writeFileSync('index.html', out);
console.log(`wrote ${projects.length} project cards`);
