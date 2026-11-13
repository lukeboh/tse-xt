import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function prefs(store, owner = '30000001') {
  return loadModule('reportPreferences.js', {
    document: { querySelector: () => ({ innerText: owner }) },
    chrome: { storage: { local: {
      get: (defaults, cb) => cb(Object.fromEntries(Object.entries(defaults).map(([k,v]) => [k, store[k] ?? v]))),
      set: (data, cb) => { Object.assign(store, data); cb(); }
    } } }
  }).JEPessoasReportPreferences;
}

test('preferências dos três relatórios são independentes e persistem em nova instância', async () => {
  const store = {};
  const first = prefs(store);
  await first.save('recognition', { from: '2025-01', to: '2026-10', groupBy: 'month', selectedMatriculas: ['30000002'], unitId: '1184' });
  await first.save('payroll', { from: '2024-02', to: '2024-11', onlyIssues: true });
  await first.save('lostHours', { sortKey: 'totalLost', sortDir: 'asc' }, '30000002');
  const next = prefs(store);
  assert.equal((await next.load('recognition')).groupBy, 'month');
  assert.equal((await next.load('recognition')).from, '2025-01');
  assert.equal((await next.load('payroll')).from, '2024-02');
  assert.equal((await next.load('payroll')).onlyIssues, true);
  assert.deepEqual(await next.load('lostHours', {}, '30000002'), { sortKey: 'totalLost', sortDir: 'asc' });
});

test('preferências não vazam entre logins nem entre servidores da auditoria de horas perdidas', async () => {
  const store = {};
  await prefs(store).save('recognition', { selectedMatriculas: ['30000002'] });
  await prefs(store).save('lostHours', { sortKey: 'p2', sortDir: 'asc' }, '30000002');
  assert.deepEqual(await prefs(store, '30000003').load('recognition'), {});
  assert.deepEqual(await prefs(store).load('lostHours', {}, '30000004'), {});
});

test('dados inválidos são descartados; seleção vazia e filtro false são valores persistentes', async () => {
  const store = {};
  const p = prefs(store);
  await p.save('recognition', { from: '2026-13', to: '2026-10', groupBy: 'script', selectedMatriculas: [], name: 'Não guardar' });
  assert.deepEqual(await p.load('recognition', { from: '2025-01', groupBy: 'server', selectedMatriculas: ['30000001'] }), {
    from: '2025-01', to: '2026-10', groupBy: 'server', selectedMatriculas: []
  });
  await p.save('payroll', { onlyIssues: false });
  assert.equal((await p.load('payroll', { onlyIssues: true })).onlyIssues, false);
  await p.save('lostHours', { sortKey: '__proto__', sortDir: 'random' });
  assert.deepEqual(await p.load('lostHours'), {});
});

test('sem preferências, aproveita o período do resultado anterior; falha de armazenamento não impede abrir', async () => {
  const seed = { from: '2025-07', to: '2026-01' };
  assert.deepEqual(await prefs({}).load('payroll', seed), seed);
  const p = loadModule('reportPreferences.js', {
    chrome: { storage: { local: { get() { throw Error('indisponível'); }, set() { throw Error('indisponível'); } } } }
  }).JEPessoasReportPreferences;
  assert.deepEqual(await p.load('payroll', seed), seed);
  await p.save('payroll', seed);
});
