#!/usr/bin/env node
// Renames the app everywhere it is hard-coded (web manifest, Capacitor, Android project).
//
//   npm run rename-app -- --id nl.example.groceries --name "Groceries" [--short-name "Groceries"]
//
// Run this once, before the first public release: the Android application ID is permanent
// after you publish (Play Store and installed apps identify the app by it).

import { existsSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JAVA_KEYWORDS = new Set(
  'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var record yield'.split(
    ' ',
  ),
);

export function validateAppId(id) {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)) {
    return 'App ID must be reverse-domain style, lowercase, at least two segments (e.g. nl.example.groceries).';
  }
  const bad = id.split('.').find((segment) => JAVA_KEYWORDS.has(segment));
  if (bad) return `App ID segment "${bad}" is a Java keyword and cannot be used.`;
  if (id.length > 150) return 'App ID is too long.';
  return null;
}

const tsString = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const xmlText = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const npmName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'app';

function edit(root, file, transform, changed) {
  const path = join(root, file);
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) {
    writeFileSync(path, after);
    changed.push(file);
  }
}

function replaceOrFail(text, pattern, replacement, what) {
  if (!pattern.test(text)) throw new Error(`Could not find ${what}; was the file edited by hand?`);
  return text.replace(pattern, replacement);
}

export function currentAppId(root) {
  const config = readFileSync(join(root, 'capacitor.config.ts'), 'utf8');
  const match = /appId:\s*'([^']+)'/.exec(config);
  if (!match) throw new Error('appId not found in capacitor.config.ts');
  return match[1];
}

/** @returns {string[]} changed files, relative to root */
export function renameApp(root, { id, name, shortName = name }) {
  const error = validateAppId(id);
  if (error) throw new Error(error);
  if (!name || !name.trim()) throw new Error('App name is required.');
  const oldId = currentAppId(root);
  const changed = [];

  edit(
    root,
    'app.config.ts',
    (t) => {
      let out = replaceOrFail(t, /id: '[^']*'/, `id: '${tsString(id)}'`, 'id in app.config.ts');
      out = replaceOrFail(out, /\bname: '[^']*'/, `name: '${tsString(name)}'`, 'name');
      return replaceOrFail(
        out,
        /shortName: '[^']*'/,
        `shortName: '${tsString(shortName)}'`,
        'shortName',
      );
    },
    changed,
  );
  edit(
    root,
    'capacitor.config.ts',
    (t) =>
      replaceOrFail(
        replaceOrFail(t, /appId: '[^']*'/, `appId: '${tsString(id)}'`, 'appId'),
        /appName: '[^']*'/,
        `appName: '${tsString(name)}'`,
        'appName',
      ),
    changed,
  );
  for (const file of ['package.json', 'package-lock.json']) {
    edit(
      root,
      file,
      (t) => {
        const json = JSON.parse(t);
        json.name = npmName(name);
        if (json.packages && json.packages['']) json.packages[''].name = npmName(name);
        return `${JSON.stringify(json, null, 2)}\n`;
      },
      changed,
    );
  }
  edit(
    root,
    'android/app/build.gradle',
    (t) =>
      replaceOrFail(
        replaceOrFail(t, /namespace = "[^"]*"/, `namespace = "${id}"`, 'namespace'),
        /applicationId "[^"]*"/,
        `applicationId "${id}"`,
        'applicationId',
      ),
    changed,
  );
  edit(
    root,
    'android/app/src/main/res/values/strings.xml',
    (t) =>
      t
        .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${xmlText(name)}$2`)
        .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${xmlText(name)}$2`)
        .replace(/(<string name="package_name">)[^<]*(<\/string>)/, `$1${id}$2`)
        .replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${id}$2`),
    changed,
  );

  // Move MainActivity (and anything else in the old package) to the new package directory.
  const javaRoot = join(root, 'android/app/src/main/java');
  const oldDir = join(javaRoot, ...oldId.split('.'));
  const newDir = join(javaRoot, ...id.split('.'));
  const activity = join(oldDir, 'MainActivity.java');
  if (oldId !== id && existsSync(activity)) {
    const source = readFileSync(activity, 'utf8').replace(/^package [\w.]+;/m, `package ${id};`);
    mkdirSync(newDir, { recursive: true });
    writeFileSync(join(newDir, 'MainActivity.java'), source);
    rmSync(activity);
    // Remove now-empty parent folders of the old package.
    let dir = oldDir;
    while (dir.startsWith(javaRoot) && dir !== javaRoot) {
      try {
        rmdirSync(dir); // only succeeds when the folder is empty
      } catch {
        break;
      }
      dir = dirname(dir);
    }
    changed.push(
      `android/app/src/main/java/${oldId.replace(/\./g, '/')}/MainActivity.java -> ${id.replace(/\./g, '/')}/MainActivity.java`,
    );
  }
  return changed;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--id') args.id = argv[++i];
    else if (key === '--name') args.name = argv[++i];
    else if (key === '--short-name') args.shortName = argv[++i];
  }
  return args;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { id, name, shortName } = parseArgs(process.argv.slice(2));
  if (!id || !name) {
    console.error('Usage: npm run rename-app -- --id nl.example.app --name "App name"');
    process.exit(1);
  }
  try {
    const changed = renameApp(process.cwd(), { id, name, shortName: shortName || name });
    console.log(changed.length ? `Updated:\n  ${changed.join('\n  ')}` : 'Nothing to change.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
