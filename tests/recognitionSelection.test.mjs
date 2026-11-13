import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadModule } from './helpers.mjs';

// Exerce os eventos da tela e as consultas reais de run(), com portal sintético.
function screen(store = {}) {
  const elements = new Map();
  function element() {
    return { value: '', disabled: false, hidden: false, dataset: {}, handlers: {}, style: {},
      classList: { add() {}, remove() {}, contains() { return true; } },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      querySelector(s) { return elements.get(s) || null; },
      querySelectorAll(s) { return s === 'input[name="je-recog-group"]' ? radios : []; },
      appendChild(el) { if (el.id) elements.set('#' + el.id, el); }, click() {}, remove() {},
      set innerHTML(html) {
        this.html = html;
        for (const [, id] of html.matchAll(/id="([^"]+)"/g)) if (!elements.has('#' + id)) elements.set('#' + id, element());
        if (!elements.has('.je-audit-x')) elements.set('.je-audit-x', element());
      }, get innerHTML() { return this.html || ''; }
    };
  }
  const radios = ['server', 'month'].map(value => Object.assign(element(), { value, checked: value === 'server' }));
  const roster = ['1001', '1002', '1003'].map((value, i) => ({ value, textContent: `Servidor Exemplo ${i + 1}` }));
  const queries = [];
  let exported = '';
  const document = {
    createElement: element, addEventListener() {}, body: element(), head: element(),
    getElementById(id) { return elements.get('#' + id); },
    querySelector(s) { return s.startsWith('select[name="servidorSelecionado') ? { options: roster } : null; }
  };
  const legal = loadModule('legalConfig.js');
  const lost = loadModule('lostHoursCalc.js', legal);
  const recognition = loadModule('recognitionCalc.js', { ...legal, ...lost });
  const chrome = { storage: { local: {
    get: (defaults, cb) => cb(Object.fromEntries(Object.entries(defaults).map(([k,v]) => [k, store[k] ?? v]))),
    set: (data, cb) => { Object.assign(store, data); cb?.(); }
  } } };
  const preferences = loadModule('reportPreferences.js', { document, chrome });
  const window = {
    ...legal, ...lost, ...recognition, ...preferences,
    print() {}, addEventListener() {}, removeEventListener() {},
    JEPessoasAuthScan: { analyzeEspelho: () => ({ found: true, year: 2026, month: 10, closed: true,
      days: [{ date: '01/10/2026', totalMin: 480, targetMin: 420 }],
      footer: { ...Object.fromEntries(['homolog', 'naoHomolog', 'pecunia', 'noturnoPec', 'excedeu'].map(k => [k, { uteis: 0, sab: 0, domfer: 0, total: 0 }])), residuoMin: 0 }
    }) },
  };
  vm.runInNewContext(readFileSync(new URL('../content/modules/recognitionReport.js', import.meta.url), 'utf8'), {
    window, document, chrome, URLSearchParams, Date, Set, Map, console,
    Blob: class { constructor(parts) { exported = parts.join(''); } },
    URL: { createObjectURL: () => 'blob:synthetic-report', revokeObjectURL() {} },
    setTimeout: (fn) => { fn(); }, alert: (message) => { throw Error(message); }, confirm: () => true,
    DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
    fetch: async (url, options) => { queries.push(new URLSearchParams(options.body).get('servidorSelecionado.matricula')); return { url, text: async () => '<html></html>' }; }
  });
  return { api: window.JEPessoasRecognitionReport, elements, queries, radios, saved: () => store.je_xt_recog_v1, exported: () => exported,
    click: async (id) => elements.get(id).handlers.click(),
    check(i, checked) { elements.get('#je-recog-team-list').handlers.change({ target: { dataset: { i: String(i) }, checked } }); }
  };
}

test('parâmetros do reconhecimento sobrevivem à recriação da página, mesmo sem gerar outro relatório', async () => {
  const store = {};
  const first = screen(store);
  await first.api.open();
  for (const [id, value] of [['#je-recog-from', '2025-07'], ['#je-recog-to', '2026-01']]) {
    first.elements.get(id).value = value;
    first.elements.get(id).handlers.change();
  }
  await first.click('#je-recog-none');
  first.check(1, true);
  first.radios[1].handlers.change({ target: { value: 'month', checked: true } });
  const next = screen(store);
  await next.api.open();
  assert.equal(next.elements.get('#je-recog-from').value, '2025-07');
  assert.equal(next.elements.get('#je-recog-to').value, '2026-01');
  assert.equal(next.radios[1].checked, true);
  assert.equal(next.elements.get('#je-recog-csv').disabled, true);
  assert.equal(next.elements.get('#je-recog-print').disabled, true);
  assert.match(next.elements.get('#je-recog-team-list').innerHTML, /data-i="1" checked/);
  assert.doesNotMatch(next.elements.get('#je-recog-team-list').innerHTML, /data-i="[02]" checked/);
});

test('limpar seleção permanece vazio após reabrir a página', async () => {
  const store = {};
  const first = screen(store);
  await first.api.open();
  await first.click('#je-recog-none');
  const next = screen(store);
  await next.api.open();
  assert.equal(next.elements.get('#je-recog-run').disabled, true);
  assert.doesNotMatch(next.elements.get('#je-recog-team-list').innerHTML, / checked/);
});

for (const chosen of [[1], [0, 2], [0, 1, 2]]) {
  test(`reconhecimento consulta e guarda somente ${chosen.length} servidor(es) selecionado(s)`, async () => {
    const s = screen();
    await s.api.open();
    s.elements.get('#je-recog-from').value = '2026-10';
    s.elements.get('#je-recog-to').value = '2026-10';
    await s.click('#je-recog-none');
    assert.equal(s.elements.get('#je-recog-run').disabled, true);
    await assert.rejects(s.click('#je-recog-run'), /Selecione ao menos um servidor/);
    if (chosen.length === 3) await s.click('#je-recog-all');
    else chosen.forEach((i) => s.check(i, true));
    assert.equal(s.elements.get('#je-recog-run').disabled, false);
    await s.click('#je-recog-run');
    assert.deepEqual(s.queries, chosen.map((i) => String(1001 + i)));
    assert.deepEqual(Array.from(s.saved().servers, (s) => s.matricula), s.queries);
    await s.click('#je-recog-csv');
    const csv = s.exported();
    assert.equal(csv.split('\r\n').length, chosen.length + 1);
    assert.match(csv, /CreditoSimulado_SujeitoAutorizacao/);
    await s.click('#je-recog-print');
    const print = s.elements.get('#je-recog-printdoc').innerHTML;
    for (const i of [0, 1, 2]) assert.equal(print.includes(`Servidor Exemplo ${i + 1}`), chosen.includes(i));
    assert.match(print, /crédito simulado/);
    assert.match(s.elements.get('#je-recog-print-page').textContent, /A4 portrait/);
    s.check(0, false);
    assert.equal(s.elements.get('#je-recog-csv').disabled, true);
    assert.equal(s.elements.get('#je-recog-print').disabled, true);
    await s.api.open();
    assert.match(s.elements.get('#je-recog-body').innerHTML, /Seleção alterada/);
  });
}
