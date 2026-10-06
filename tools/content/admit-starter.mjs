import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importSampleCheck } from './import-sample-check.mjs';
import { compilePack } from './compile-pack.mjs';

/** Read-only admission inspection: no producer statuses can bypass a missing raw response. */
export function admitStarter({
  state,
  packet,
  response,
  responsePath,
  packId,
  version,
  evidence = {},
}) {
  if (response === null || response === undefined)
    return {
      status: 'blocked',
      blockers: [`Missing committed sample-check response: ${responsePath}`],
      eligible_entries: 0,
      eligible_tasks: 0,
    };
  const checked = importSampleCheck(response, { state, packet });
  const compiled = compilePack(checked.state, { packId, version, evidence });
  return {
    status: checked.report.outcome === 'passed' ? 'inspected' : 'blocked',
    blockers:
      checked.report.outcome === 'passed'
        ? []
        : ['Sample check failed; repair and recheck the batch'],
    eligible_entries: compiled.report.eligible_entries,
    eligible_tasks: compiled.report.eligible_tasks,
    sample_check: checked.report,
    compilation: compiled,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 2) {
      if (
        !['--state', '--packet', '--response', '--evidence', '--pack-id', '--version'].includes(
          args[i],
        ) ||
        !args[i + 1] ||
        options[args[i]]
      )
        throw new Error(
          'Expected --state, --packet, --response, --evidence, --pack-id or --version PATH/VALUE once each',
        );
      options[args[i]] = args[i + 1];
    }
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const batch = read('content/pilot/batch.json');
    const responsePath =
      options['--response'] ??
      `research/content-2026-10/review/sample-checks/${batch.batch_id}.json`;
    const available = existsSync(responsePath);
    if (available && (!options['--state'] || !options['--packet']))
      throw new Error(
        'A response requires --state from the draft importer and its matching --packet; raw pilot producer data is not operator-owned state',
      );
    const pilot = read('content/pilot/pilot.json');
    const state = options['--state'] ? read(options['--state']) : pilot;
    const packet = options['--packet'] ? read(options['--packet']) : null;
    if (available) {
      const ids = new Set(pilot.entries.map((entry) => entry.id));
      if (
        packet?.batch_manifest?.batch_id !== batch.batch_id ||
        packet.batch_manifest.entries.length !== ids.size ||
        !packet.batch_manifest.entries.every((entry) => ids.has(entry.id)) ||
        state.entries.length !== ids.size ||
        !state.entries.every((entry) => ids.has(entry.id))
      )
        throw new Error(
          'Starter admission requires the current pilot batch and its sixty issued identities',
        );
    }
    const report = admitStarter({
      state,
      packet,
      response: available ? readFileSync(responsePath) : null,
      responsePath,
      packId: options['--pack-id'] ?? pilot.pack_id,
      version: options['--version'] ?? pilot.version,
      evidence: options['--evidence'] ? read(options['--evidence']) : {},
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'blocked') process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Starter admission failed');
    process.exitCode = 1;
  }
}
