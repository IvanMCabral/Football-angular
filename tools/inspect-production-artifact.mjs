import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'dist', 'demo', 'browser');
const forbiddenPatterns = [
  /debug\/test-harness/i,
  /test-harness-page/i,
  /test harness/i,
  /localhost:4200/i,
  /localhost:8080/i,
  /sourceMappingURL=/i,
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const textFiles = files.filter((file) => /\.(html|js|css|json|txt|map)$/.test(file));
const violations = [];
for (const file of textFiles) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      violations.push(`${relative(root, file)} matches ${pattern}`);
    }
  }
}

const indexExists = files.some((file) => file.endsWith('index.html'));
const jsFiles = files.filter((file) => file.endsWith('.js'));
const unhashedJs = jsFiles.filter((file) => !/[A-Z0-9]{8,}\.js$/.test(file));

if (!indexExists) violations.push('index.html missing');
if (unhashedJs.length) violations.push(`unhashed JS files: ${unhashedJs.map((file) => relative(root, file)).join(', ')}`);

if (violations.length) {
  console.error('Production artifact inspection failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Production artifact inspection passed (${files.length} files scanned).`);
