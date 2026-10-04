import { inspectManifest, InventoryError } from '../../src/contracts/backup/manifest.ts';

// Accept a proposed JSON inventory on stdin; never open or extract an archive.
try {
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) input += String(chunk);
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new InventoryError('manifest', 'invalid JSON');
  }
  process.stdout.write(`${JSON.stringify(inspectManifest(value), null, 2)}\n`);
} catch (error) {
  if (!(error instanceof InventoryError)) throw error;
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
