// node tools/check-tactical-layouts.cjs path/to/lineup-editor-formations.json
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/app/shared/constants/tactical-layouts.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
new Function('exports', js)(exported);
const backend = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const failures = [];
let checked = 0;
for (const formation of backend) {
  const local = exported.TACTICAL_LAYOUTS[formation.name];
  if (!local || local.length !== formation.positions.length) { failures.push(formation.name + ': slots'); continue; }
  for (const position of formation.positions) {
    const slot = local[position.index]; checked++;
    if (!slot || slot.role !== position.role || slot.x !== position.xPercent || slot.y !== position.yPercent || slot.subdivisionId !== position.subdivisionId)
      failures.push(formation.name + ': position ' + position.index);
  }
}
if (Object.keys(exported.TACTICAL_LAYOUTS).length !== backend.length) failures.push('formation count');
process.stdout.write(JSON.stringify({ formations: backend.length, checkedSlots: checked, failures }) + '\n');
if (failures.length) process.exitCode = 1;
