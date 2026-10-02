import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function boundaryMessages(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === 'native/plugin-boundary');
}

describe('Capacitor plugin import boundary', () => {
  it.each([
    "import '@capacitor-community/sqlite';",
    "import '@capacitor/preferences';",
    "export * from '@capawesome-team/capacitor-sqlite';",
    "export { SQLite } from '@capacitor-community/sqlite';",
    "void import('@capacitor-community/sqlite');",
    'void import(`@capacitor-community/sqlite`);',
    "require('@capacitor/preferences');",
  ])('I20: rejects plugin imports outside native adapters: %s', async (code) => {
    expect(await boundaryMessages(code, 'src/main.ts')).toHaveLength(1);
    expect(await boundaryMessages(code, 'src/targets/android.ts')).toHaveLength(1);
  });

  it.each(['src/platform/android/example.js', 'src/infrastructure/db/android/example.js'])(
    'I20: permits plugin imports in %s',
    async (filePath) => {
      expect(
        await boundaryMessages("import '@capacitor-community/sqlite';", filePath),
      ).toHaveLength(0);
    },
  );

  it('permits Capacitor core and CLI tooling outside adapter folders', async () => {
    expect(
      await boundaryMessages("import '@capacitor/core'; import '@capacitor/cli';", 'src/main.ts'),
    ).toHaveLength(0);
  });
});
