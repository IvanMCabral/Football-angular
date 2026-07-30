import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src/app', 'src/assets'];
const EXTENSIONS = new Set(['.ts', '.html', '.scss', '.css', '.json']);
const MOJIBAKE_PATTERNS = [
  /Ã/u,
  /Â/u,
  /â/u,
  /ð/u,
  /ï¿½/u,
  /�/u,
  /Fern\?ndez/u,
  /R\?diger/u,
  /Jo\?o/u
];

const allowedGuardLines = [
  'not.toMatch(/Ã|Â|â|ð|ï¿½|�/)',
  'MOJIBAKE_PATTERNS'
];

const visited = [];

for (const root of ROOTS) {
  walk(root);
}

const failures = [];

for (const file of visited) {
  const text = readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (allowedGuardLines.some(allowed => line.includes(allowed))) {
      return;
    }
    if (MOJIBAKE_PATTERNS.some(pattern => pattern.test(line))) {
      failures.push(`${relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (failures.length > 0) {
  console.error('Visible text encoding guard failed. Corrupt UTF-8/mojibake markers found:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Visible text encoding guard passed (${visited.length} files scanned).`);

function walk(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue;
      }
      walk(join(path, entry));
    }
    return;
  }

  const extension = path.slice(path.lastIndexOf('.'));
  if (EXTENSIONS.has(extension)) {
    visited.push(path);
  }
}
