import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function screen(store, owner = '30000001') {
  const els = new Map();
  function el() {
    return { value: '', checked: false, disabled: false, style: {}, handlers: {},
      classList: { add() {}, remove() {}, contains: () => true },
      addEventListener(t, fn) { this.handlers[t] = fn; },
      querySelector(s) { return els.get(s) || null; }, querySelectorAll: () => [],
      set innerHTML(s) { this.html = s; for (const [,id] of s.matchAll(/id="([^"]+)"/g)) if (!els.has('#' + id)) els.set('#' + id, el()); },
      get innerHTML() { return this.html || ''; }
    };
  }
  els.set('.je-audit-x', el());
  const document = { createElement: el, body: { appendChild() {} }, addEventListener() {},
    querySelector: (s) => s.includes('.matricula') ? { innerText: owner } : null };
  const chrome = { storage: { local: {
    get: (d, cb) => cb(Object.fromEntries(Object.entries(d).map(([k,v]) => [k, store[k] ?? v]))),
    set: (d, cb) => { Object.assign(store, d); cb?.(); }
  } } };
  const preferences = loadModule('reportPreferences.js', { document, chrome });
  return { els, api: loadModule('payrollAudit.js', { document, chrome, ...preferences }).JEPessoasPayrollAudit };
}

test('pagamento restaura período e filtro em nova página, sem exigir execução da auditoria', async () => {
  const store = {};
  const first = screen(store);
  await first.api.open();
  for (const [id, value] of [['#je-pay-from', '2024-07'], ['#je-pay-to', '2025-08']]) {
    first.els.get(id).value = value;
    first.els.get(id).handlers.input();
  }
  first.els.get('#je-pay-only').handlers.change({ target: { checked: true } });
  const next = screen(store);
  await next.api.open();
  assert.equal(next.els.get('#je-pay-from').value, '2024-07');
  assert.equal(next.els.get('#je-pay-to').value, '2025-08');
  assert.equal(next.els.get('#je-pay-only').checked, true);
  const other = screen(store, '30000002');
  await other.api.open();
  assert.notEqual(other.els.get('#je-pay-from').value, '2024-07');
  assert.equal(other.els.get('#je-pay-only').checked, false);
});

test('pagamento migra o período do resultado anterior e impede exportação com outro período restaurado', async () => {
  const store = { je_xt_payroll_v1: { from: '2025-01', to: '2025-07', matricula: '30000001' } };
  const first = screen(store);
  await first.api.open();
  assert.equal(first.els.get('#je-pay-from').value, '2025-01');
  first.els.get('#je-pay-from').value = '2025-02';
  first.els.get('#je-pay-from').handlers.change();
  const next = screen(store);
  await next.api.open();
  assert.equal(next.els.get('#je-pay-from').value, '2025-02');
  assert.equal(next.els.get('#je-pay-csv').disabled, true);
  assert.equal(next.els.get('#je-pay-print').disabled, true);
});
