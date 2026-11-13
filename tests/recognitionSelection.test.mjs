import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadModule } from './helpers.mjs';

// Exerce os eventos da tela e as consultas reais de run(), com portal sintético.
function screen() {
  const elements = new Map();
  function element() {
    return { value: '', disabled: false, hidden: false, dataset: {}, handlers: {}, style: {},
      classList: { add() {}, remove() {}, contains() { return true; } },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      querySelector(s) { return elements.get(s) || null; }, querySelectorAll() { return []; },
      appendChild(el) { if (el.id) elements.set('#' + el.id, el); }, click() {}, remove() {},
      set innerHTML(html) {
        this.html = html;
        for (const [, id] of html.matchAll(/id="([^"]+)"/g)) if (!elements.has('#' + id)) elements.set('#' + id, element());
        if (!elements.has('.je-audit-x')) elements.set('.je-audit-x', element());
      }, get innerHTML() { return this.html || ''; }
    };
  }
  const roster = ['1001', '1002', '1003'].map((value, i) => ({ value, textContent: `Servidor Exemplo ${i + 1}` }));
  const queries = [];
  let exported = '';
  let saved;
  const document = {
    createElement: element, addEventListener() {}, body: element(), head: element(),
    getElementById(id) { return elements.get('#' + id); },
    querySelector(s) { return s.startsWith('select[name="servidorSelecionado') ? { options: roster } : null; }
  };
  const legal = loadModule('legalConfig.js');
  const lost = loadModule('lostHoursCalc.js', legal);
  const recognition = loadModule('recognitionCalc.js', { ...legal, ...lost });
  const window = {
    ...legal, ...lost, ...recognition,
    print() {}, addEventListener() {}, removeEventListener() {},
    JEPessoasAuthScan: { analyzeEspelho: () => ({ found: true, year: 2026, month: 10, closed: true,
      days: [{ date: '01/10/2026', totalMin: 480, targetMin: 420 }],
      footer: { ...Object.fromEntries(['homolog', 'naoHomolog', 'pecunia', 'noturnoPec', 'excedeu'].map(k => [k, { uteis: 0, sab: 0, domfer: 0, total: 0 }])), residuoMin: 0 }
    }) },
  };
  vm.runInNewContext(readFileSync(new URL('../content/modules/recognitionReport.js', import.meta.url), 'utf8'), {
    window, document, chrome: { storage: { local: {
      get: (defaults, cb) => cb({}), set: (data, cb) => { saved = Object.values(data)[0]; cb(); }
    } } }, URLSearchParams, Date, Set, Map, console,
    Blob: class { constructor(parts) { exported = parts.join(''); } },
    URL: { createObjectURL: () => 'blob:synthetic-report', revokeObjectURL() {} },
    setTimeout: (fn) => { fn(); }, alert: (message) => { throw Error(message); }, confirm: () => true,
    DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
    fetch: async (url, options) => { queries.push(new URLSearchParams(options.body).get('servidorSelecionado.matricula')); return { url, text: async () => '<html></html>' }; }
  });
  return { api: window.JEPessoasRecognitionReport, elements, queries, saved: () => saved, exported: () => exported,
    click: async (id) => elements.get(id).handlers.click(),
    check(i, checked) { elements.get('#je-recog-team-list').handlers.change({ target: { dataset: { i: String(i) }, checked } }); }
  };
}

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
