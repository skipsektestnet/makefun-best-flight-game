// Kutilang Valley Run — hand-in program (Node 22, standard library only).
//
// The game lives in game/ (plain static files a desktop browser loads
// offline) and its screenshots in screenshots/. This program hands them in:
// it copies both folders into the output directory and writes dossier.json
// there, the summary the judge reads, built by the kit's vendored library
// from the files themselves.
//
// Check the hand-in locally before entering:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  console.error(`hand-in failed: ${message}`);
  process.exit(1);
}

const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');

const shotDir = join(repoRoot, 'screenshots');
const shots = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shots.length}`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (shots.length > 0) cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`handed in ${shots.length} screenshots, dossier written to ${outputDir}`);
