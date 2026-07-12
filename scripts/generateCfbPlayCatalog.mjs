import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const defaultInput = path.resolve(projectRoot, 'docs/reference/cfb27-formation-plays-source.json');
// Research/calibration only. Never emit licensed source material into public/.
const defaultOutput = path.resolve(projectRoot, 'docs/reference/cfb27-offense-play-catalog.json');

const inputPath = path.resolve(process.argv[2] ?? defaultInput);
const outputPath = path.resolve(process.argv[3] ?? defaultOutput);

function slugFromUrl(url) {
  return url
    .replace(/^https:\/\/cfb\.fan\/playbooks\/(?:formations|plays)\//, '')
    .replace(/\/$/, '');
}

function toPlayType(type) {
  if (type === 'Playaction') return 'playAction';
  return type.toLowerCase();
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

const source = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const formations = new Map();

for (const row of source.rows) {
  const id = slugFromUrl(row.formationUrl);
  const formation = formations.get(id) ?? {
    id,
    family: row.formationFamily,
    name: row.formationShort,
    fullName: row.formation,
    sourceUrl: row.formationUrl,
    playCount: 0,
    playTypes: {},
    plays: [],
  };

  const play = {
    id: slugFromUrl(row.playUrl).split('/').at(-1),
    order: row.playOrder,
    name: row.play,
    type: toPlayType(row.playType),
    sourceUrl: row.playUrl,
    imageUrl: row.imageUrl,
  };

  formation.plays.push(play);
  formation.playCount = formation.plays.length;
  formations.set(id, formation);
}

const formationList = [...formations.values()].map((formation) => ({
  ...formation,
  playTypes: countBy(formation.plays, (play) => play.type),
  plays: formation.plays.sort((a, b) => a.order - b.order),
}));

const catalog = {
  schemaVersion: 1,
  game: 'College Football 27',
  scope: 'offense-formations',
  sourceUrl: source.sourceUrl,
  extractedAt: source.extractedAt,
  generatedAt: new Date().toISOString(),
  classificationNote: 'Play type is inferred from play names because the source pages list play names/images but not type labels.',
  totals: {
    formations: formationList.length,
    plays: formationList.reduce((sum, formation) => sum + formation.playCount, 0),
    playTypes: countBy(formationList.flatMap((formation) => formation.plays), (play) => play.type),
  },
  formations: formationList,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(catalog)}\n`);

console.log(`Wrote ${catalog.totals.plays} plays across ${catalog.totals.formations} formations to ${outputPath}`);
