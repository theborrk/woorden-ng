import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateTasks } from '../evidence/repository/scripts/check-tasks.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(`${root}docs/tasks`)
  .filter(name => /^T-\d{3}-.+\.md$/.test(name)).sort()
  .map(file => ({file, text: readFileSync(`${root}docs/tasks/${file}`, 'utf8')}));
const result = validateTasks(files, ['W18', 'W19', 'W20', 'W21', 'F04', 'F08', 'T43', 'T50']);
writeFileSync(`${root}evidence/task-validation.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({tasks: result.tasks.length, errors: result.errors,
  uncoveredRefs: result.uncoveredRefs, ready: result.ready.map(t => t.id)}));
if (result.errors.length || result.uncoveredRefs.length) process.exit(1);
