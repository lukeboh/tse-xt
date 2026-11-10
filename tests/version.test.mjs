import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadModule } from './helpers.mjs';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('version — CURRENT_VERSION em version.js corresponde ao manifest.json', () => {
  const manifest = JSON.parse(readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
  const versionMod = loadModule('version.js');
  const V = versionMod.JEPessoasVersion;

  const currentVersion = V.getVersion();
  assert.equal(currentVersion, '1.1.4-Snapshot');

  // No manifest.json, version_name deve ser o display version (1.1.4-Snapshot)
  // e version deve ser o semver numérico aceito pelo Chrome (1.1.4)
  assert.equal(manifest.version_name, currentVersion);
  assert.equal(manifest.version, '1.1.4');
});

test('version — CHANGELOG tem entrada no topo para a versão corrente', () => {
  const versionMod = loadModule('version.js');
  const V = versionMod.JEPessoasVersion;

  const changelog = V.getChangelog();
  assert.ok(changelog.length > 0);
  assert.equal(changelog[0].version, currentVersionFallback(V.getVersion()));
  assert.ok(changelog[0].features.length >= 3);
});

function currentVersionFallback(v) {
  return v;
}
