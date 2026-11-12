import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('pacote da loja inclui todas as referencias do manifest e somente arquivos de runtime', () => {
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'package.ps1'], { cwd: root, stdio: 'pipe' });
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  const inspected = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', `
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $file = Join-Path $env:TSE_XT_PACKAGE_ROOT ('dist/tse-xt-v' + $env:TSE_XT_PACKAGE_VERSION + '.zip')
    $zip = [IO.Compression.ZipFile]::OpenRead($file)
    try {
      $reader = [IO.StreamReader]::new($zip.GetEntry('manifest.json').Open())
      try { $manifestText = $reader.ReadToEnd() } finally { $reader.Dispose() }
      @{ entries = @($zip.Entries | ForEach-Object { $_.FullName }); manifest = ($manifestText | ConvertFrom-Json) } | ConvertTo-Json -Depth 20 -Compress
    } finally { $zip.Dispose() }
  `], { cwd: root, encoding: 'utf8', env: { ...process.env, TSE_XT_PACKAGE_ROOT: root, TSE_XT_PACKAGE_VERSION: manifest.version } }));
  assert.deepEqual(inspected.manifest, manifest);
  assert.equal(inspected.entries.length, new Set(inspected.entries).size);
  assert.ok(inspected.entries.every(p => /^(manifest\.json|background\.js|content\/[^.].*|popup\/[^.].*|icons\/[^.].*)$/.test(p)), 'ZIP deve conter somente runtime');
  assert.ok(inspected.entries.every(p => !p.includes('..') && !p.includes('\\')));
  const required = [manifest.background.service_worker, manifest.action.default_popup,
    ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap(s => [...s.js, ...s.css]),
    ...manifest.web_accessible_resources.flatMap(s => s.resources)];
  for (const file of required) assert.ok(inspected.entries.includes(file), `recurso declarado ausente: ${file}`);
});
