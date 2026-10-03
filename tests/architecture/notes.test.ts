// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import manifest from '../../package.json';
import lock from '../../package-lock.json';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const notes = read('docs/architecture/notes.md');
const prose = notes.replace(/\s+/g, ' ');

function rows(heading: string): string[][] {
  const section = notes.split(`## ${heading}\n`)[1]?.split('\n## ')[0];
  expect(section, `Missing ${heading} section`).toBeDefined();
  return (section ?? '')
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

it('W03: AC1 listed manifest requirements and resolved versions match the committed lockfile', () => {
  const packages = rows('JavaScript dependencies');
  expect(packages.map(([name]) => name)).toEqual(
    expect.arrayContaining([
      'typescript',
      'vite',
      'react',
      'react-dom',
      '@capacitor/core',
      '@capacitor/android',
      '@capacitor/cli',
      '@capacitor-community/sqlite',
      'ts-fsrs',
      'dexie',
      '@js-temporal/polyfill',
    ]),
  );
  const declarations: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  const locked: Record<
    string,
    {
      version?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }
  > = lock.packages;
  const root = locked[''];
  const lockDeclarations = { ...root?.dependencies, ...root?.devDependencies };
  // Iterate the documented subset so another task can add a plugin without changing these notes.
  for (const [name, requirement, version] of packages) {
    expect(name).toBeDefined();
    expect(requirement).toBeDefined();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(declarations[name!], `${name}: manifest`).toBe(requirement);
    expect(lockDeclarations[name!], `${name}: lockfile declaration`).toBe(requirement);
    expect(locked[`node_modules/${name}`]?.version, `${name}: resolved version`).toBe(version);
  }
});

it('W03: AC1 documented toolchain and SDK settings match repository configuration', () => {
  const settings: Record<string, string | undefined> = {};
  for (const [key, value] of rows('Toolchain')) {
    if (!key) throw new Error('Toolchain row has no setting name');
    settings[key] = value;
  }
  expect(settings['Node major']).toBe(read('.nvmrc').trim());
  expect(settings['Node engine']).toBe(manifest.engines.node);
  expect(settings['JDK major']).toBe(
    read('.github/workflows/android-build.yml').match(/java-version: '(\d+)'/)?.[1],
  );
  expect(settings['Android Gradle Plugin']).toBe(
    read('android/build.gradle').match(/com\.android\.tools\.build:gradle:([\d.]+)/)?.[1],
  );
  expect(settings['Gradle wrapper']).toBe(
    read('android/gradle/wrapper/gradle-wrapper.properties').match(/gradle-([\d.]+)-all\.zip/)?.[1],
  );
  const variables = read('android/variables.gradle');
  for (const key of ['compileSdkVersion', 'targetSdkVersion', 'minSdkVersion']) {
    expect(settings[key], key).toBe(variables.match(new RegExp(`${key} = (\\d+)`))?.[1]);
    expect(settings[key]).toMatch(/^\d+$/);
  }
  // npm and Node patch versions are observations, not nonexistent repository pins.
  expect(notes).toMatch(
    /Observed implementation environment: Node \d+\.\d+\.\d+, npm \d+\.\d+\.\d+/,
  );
  expect(notes).toContain('npm is not independently pinned');
});

it('W03: AC2 records reproducible installs and update checks', () => {
  for (const statement of [
    'Commit `package-lock.json` with dependency changes; use `npm ci` locally and in CI',
    'Do not refresh',
    'regenerate scheduler fixtures as part of ordinary verification',
    'Keep the Android\nproject and Gradle wrapper committed',
    'npm weekly (at most five open PRs)',
    'minor/patch development tooling and\nruntime updates separately',
    'GitHub Actions monthly',
    'Capacitor majors require a\ncoordinated task',
    'Node type majors move with `.nvmrc`',
    'TypeScript majors wait for typescript-eslint\nsupport',
    'normal verify, both-build and web e2e gates',
    'require native compatibility tests',
    'ABI/page-size checks before release',
    'require deterministic scheduler replay checks',
    'inspect changed outcomes before explicitly regenerating fixtures',
    'Native\nrepository/bridge tests run for persistence/plugin changes and on every release',
  ])
    expect(prose).toContain(statement.replace(/\s+/g, ' '));
});

it('W03: AC2 records release targets, current CI coverage and a concrete minimum-SDK gate', () => {
  const policy = JSON.parse(read('.github/ci-policy.json')) as { emulatorApiLevel: number };
  expect(notes).toContain(`API ${policy.emulatorApiLevel} emulator`);
  expect(notes).toContain(
    `Current web CI runs ${manifest.config.playwrightBrowsers.charAt(0).toUpperCase()}${manifest.config.playwrightBrowsers.slice(1)} only`,
  );
  for (const statement of [
    'Chromium, Firefox and WebKit contract/UI checks',
    'actual Android Chrome\n  installed-PWA offline/update checks',
    'Android 7.0 / API 24 and newer',
    'API 36\n  (Android 16)',
    'Minimum-SDK verification is an unresolved release gate owned by W36/W50',
    'old API 24 CI images\n  have an obsolete WebView that cannot update',
    'verify API 24\n  with an updated WebView on a physical device or a Play-enabled image, or raise `minSdk`',
    'test the new minimum',
    'Record exact OS, WebView and device versions and results',
    'API 36 success does not prove API 24 support',
    "a real midrange phone, the owner's available phone",
    'production-like signed upgrades',
    'PWA → Android → PWA backup equivalence',
    'Optional iPhone PWA support requires\n  physical Safari/home-screen verification',
    'no native iOS build is promised',
  ])
    expect(prose).toContain(statement.replace(/\s+/g, ' '));
});
