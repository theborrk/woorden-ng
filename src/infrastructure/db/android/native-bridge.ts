import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import type { capSQLiteChanges } from '@capacitor-community/sqlite';
import type { NativeSqliteBridge, SqlRow } from './bridge';

function checkChanges(result: capSQLiteChanges): void {
  if (result.changes?.changes === undefined || result.changes.changes < 0) {
    throw new Error('Native SQLite did not acknowledge the operation.');
  }
}

export const nativeSqliteBridge: NativeSqliteBridge = {
  isAvailable: () =>
    Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CapacitorSQLite'),
  async connect(database, readonly = false) {
    const options = { database, readonly };
    // App-owned transactional migrations use user_version; do not register the plugin's
    // file-copy upgrade mechanism (it is unsuitable for copying a live WAL database).
    await CapacitorSQLite.createConnection({
      ...options,
      version: 1,
      encrypted: false,
      mode: 'no-encryption',
    });
    try {
      await CapacitorSQLite.open(options);
    } catch (error) {
      try {
        await CapacitorSQLite.closeConnection(options);
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Native SQLite open and cleanup failed.', {
          cause: cleanupError,
        });
      }
      throw error;
    }
    return {
      async execute(statements) {
        checkChanges(await CapacitorSQLite.execute({ ...options, statements, transaction: false }));
      },
      async run(statement, values) {
        // An enclosing explicit transaction owns commit/rollback; never auto-commit each write.
        checkChanges(
          await CapacitorSQLite.run({ ...options, statement, values, transaction: false }),
        );
      },
      async query(statement, values = []) {
        // Android requires the values field even for parameterless PRAGMAs/SELECTs.
        const result = await CapacitorSQLite.query({ ...options, statement, values });
        const rows: unknown = result.values;
        if (!Array.isArray(rows) || rows.some((row: unknown) => !row || typeof row !== 'object')) {
          throw new Error('Native SQLite returned invalid rows.');
        }
        return rows as SqlRow[];
      },
      async begin() {
        checkChanges(await CapacitorSQLite.beginTransaction(options));
      },
      async commit() {
        checkChanges(await CapacitorSQLite.commitTransaction(options));
      },
      async rollback() {
        checkChanges(await CapacitorSQLite.rollbackTransaction(options));
      },
      close: () => CapacitorSQLite.closeConnection(options),
    };
  },
};

/** Capacitor's Android JSExport derives this flag from ApplicationInfo.FLAG_DEBUGGABLE. */
export function isNativeDebugBuild(): boolean {
  return Capacitor.getPlatform() === 'android' && window.Capacitor?.DEBUG === true;
}
