// Regenerates the project grid in index.html from projects.json.
// Usage: node build.mjs   (no dependencies)
import { readFileSync, writeFileSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const projects = JSON.parse(readFileSync('projects.json', 'utf8'));

const card = (p, i) => `        <a class="card" href="${esc(p.page)}" data-cats="${esc(p.cats.join(' '))}">
          <img src="${esc(p.thumb)}" alt="${esc(p.thumbAlt)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" />
          <span class="card-row"><span class="card-title">${esc(p.title)}</span><span class="card-year">${esc(p.year)}</span></span>
          <span class="card-desc">${esc(p.statement)}</span>
        </a>`;

const html = readFileSync('index.html', 'utf8');
const start = '<!-- projects:start -->';
const end = '<!-- projects:end -->';
const a = html.indexOf(start);
const b = html.indexOf(end);
if (a < 0 || b < 0) throw new Error('index.html is missing the projects:start / projects:end markers');
const out = `${html.slice(0, a + start.length)}\n${projects.map(card).join('\n')}\n        ${html.slice(b)}`;
writeFileSync('index.html', out);
console.log(`wrote ${projects.length} project cards`);
