// Pulls Nik's and Lei's public Letterboxd diary feeds and saves them to data/letterboxd.json.
// Runs on a schedule in GitHub Actions (Letterboxd blocks browsers from reading the feed directly).
// The site reads data/letterboxd.json and turns shared watches into BubFilm pins.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const MEMBERS = [
  { who: 'nik', username: 'ramharakh' },
  { who: 'lei', username: 'leiar' },
];
const OUT = new URL('../data/letterboxd.json', import.meta.url);

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : '';
};

export function parseFeed(xml, who) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((item) => {
    const description = tag(item, 'description');
    const poster = (description.match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
    const review = description
      .replace(/<p>\s*<img[^>]*>\s*<\/p>/g, '')
      .split(/<\/p>/)
      .map((p) => p.replace(/<[^>]+>/g, '').trim())
      .filter((p) => p && !/^Watched on /.test(p))
      .join('\n\n');
    const link = tag(item, 'link');
    const slug = (link.match(/\/film\/([^/]+)/) || [])[1] || '';
    const rating = Number(tag(item, 'letterboxd:memberRating'));
    return {
      guid: tag(item, 'guid'),
      who,
      filmTitle: tag(item, 'letterboxd:filmTitle'),
      filmYear: tag(item, 'letterboxd:filmYear'),
      watchedDate: tag(item, 'letterboxd:watchedDate'),
      rating: Number.isFinite(rating) && rating > 0 ? rating : null, // 0.5–5 stars
      liked: tag(item, 'letterboxd:memberLike') === 'Yes',
      rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
      tmdbId: tag(item, 'tmdb:movieId') || (tag(item, 'tmdb:tvId') ? `tv${tag(item, 'tmdb:tvId')}` : ''),
      poster,
      review,
      filmUrl: slug ? `https://letterboxd.com/film/${slug}/` : link,
      entryUrl: link,
    };
  }).filter((e) => e.guid && e.filmTitle && e.watchedDate);
}

async function main() {
  let existing = { entries: [] };
  try { existing = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }

  // The feed only shows ~50 recent entries, so keep everything we've seen before.
  const byGuid = new Map((existing.entries || []).map((e) => [e.guid, e]));
  for (const { who, username } of MEMBERS) {
    const res = await fetch(`https://letterboxd.com/${username}/rss/`, {
      headers: { 'User-Agent': 'BubWeb diary sync (github.com/LeiaSingh/BubWeb)' },
    });
    if (!res.ok) {
      console.warn(`Skipping ${username}: HTTP ${res.status}`);
      continue;
    }
    const entries = parseFeed(await res.text(), who);
    console.log(`${username}: ${entries.length} diary entries`);
    for (const e of entries) byGuid.set(e.guid, e);
  }

  const entries = [...byGuid.values()].sort((a, b) => b.watchedDate.localeCompare(a.watchedDate));
  const next = JSON.stringify({ entries }, null, 2) + '\n';
  const prev = existing.entries ? JSON.stringify({ entries: existing.entries }, null, 2) + '\n' : '';
  if (next === prev) {
    console.log('No changes');
    return;
  }
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, next);
  console.log(`Saved ${entries.length} entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
