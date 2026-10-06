export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;

/** Private bridge boundary: SQL and native handles never reach feature code. */
export interface NativeConnection {
  execute(sql: string): Promise<void>;
  run(sql: string, values: SqlValue[]): Promise<void>;
  query(sql: string, values?: SqlValue[]): Promise<SqlRow[]>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

export interface NativeSqliteBridge {
  isAvailable(): boolean;
  connect: (database: string, readonly?: boolean) => Promise<NativeConnection>;
}
