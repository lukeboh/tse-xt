import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

// chrome.storage.local em memória
function fakeChrome() {
  const store = {};
  return {
    _store: store,
    storage: {
      local: {
        get(defaults, cb) {
          const out = {};
          for (const k of Object.keys(defaults)) out[k] = k in store ? store[k] : defaults[k];
          cb(out);
        },
        set(obj, cb) { Object.assign(store, obj); if (cb) cb(); }
      }
    }
  };
}

function load() {
  const chrome = fakeChrome();
  const mod = loadModule('heAuthEditor.js', { chrome });
  return { HE: mod.JEPessoasHEAuth, chrome };
}

test('toMin / fmt — conversões HH:MM ↔ minutos', () => {
  const { HE } = load();
  assert.equal(HE.toMin('20:00'), 1200);
  assert.equal(HE.toMin('7:30'), 450);
  assert.equal(HE.toMin('2000'), 1200, 'sem dois-pontos');
  assert.equal(HE.toMin(''), 0);
  assert.equal(HE.fmt(1200), '20:00');
  assert.equal(HE.fmt(450), '07:30');
  assert.equal(HE.fmt(0), '00:00');
});

test('setEntry + getEntry — round-trip por matrícula e mês', () => {
  const { HE } = load();
  let got;
  HE.setEntry('30901018', '2024-10', { wkSatMin: 1200, sunHolMin: 600 }, () => {
    HE.getEntry('30901018', '2024-10', (e) => { got = e; });
  });
  assert.deepEqual(got, { wkSatMin: 1200, sunHolMin: 600 });

  // outro mês continua vazio
  let other;
  HE.getEntry('30901018', '2024-11', (e) => { other = e; });
  assert.deepEqual(other, { wkSatMin: 0, sunHolMin: 0 });
});

test('setEntry com 0/0 remove o registro do mês', () => {
  const { HE, chrome } = load();
  HE.setEntry('X', '2024-10', { wkSatMin: 60, sunHolMin: 0 }, () => {});
  HE.setEntry('X', '2024-10', { wkSatMin: 0, sunHolMin: 0 }, () => {});
  const all = chrome._store['je_xt_he_autorizado_v1_X'] || {};
  assert.ok(!('2024-10' in all), 'mês removido quando zerado');
});

test('getEntry sem monthKey devolve zeros', () => {
  const { HE } = load();
  let e;
  HE.getEntry('X', null, (r) => { e = r; });
  assert.deepEqual(e, { wkSatMin: 0, sunHolMin: 0 });
});
