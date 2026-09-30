import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStack, loadModule } from './helpers.mjs';

function fakeCell(text, className = '') {
  let inner = text;
  const classes = new Set(className ? className.split(' ') : []);
  let titleAttr = '';
  const cellObj = {
    nodeType: 1,
    get textContent() { return inner.replace(/<[^>]+>/g, '').trim(); },
    set textContent(v) { inner = v; },
    get innerText() { return inner.replace(/<[^>]+>/g, '').trim(); },
    set innerText(v) { inner = v; },
    get innerHTML() { return inner; },
    set innerHTML(v) { inner = v; },
    get title() { return titleAttr; },
    set title(v) { titleAttr = v; },
    className,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    querySelector: (sel) => {
      if (sel === '.je-pecunia-badge') {
        return inner.includes('je-pecunia-badge') ? { innerHTML: inner } : null;
      }
      if (sel === '.je-pecunia-val') {
        const m = inner.match(/<strong class="je-pecunia-val">([^<]+)<\/strong>/);
        return m ? { textContent: m[1] } : null;
      }
      return null;
    },
    querySelectorAll: () => [],
    removeAttribute: (attr) => {
      if (attr === 'title') titleAttr = '';
    },
    cloneNode: function () {
      return fakeCell(inner, Array.from(classes).join(' '));
    }
  };
  return cellObj;
}

function fakeRow(cells) {
  const rowObj = {
    nodeType: 1,
    cells,
    querySelector: (sel) => {
      if (sel === 'th' || sel.startsWith('th')) return null;
      if (sel.includes('h01')) return cells.h01;
      if (sel.includes('h02')) return cells.h02 || fakeCell('');
      if (sel.includes('h03')) return cells.h03 || fakeCell('');
      if (sel.includes('h04')) return cells.h04 || fakeCell('');
      if (sel.includes('h05')) return cells.h05 || fakeCell('');
      if (sel.includes('h06')) return cells.h06 || fakeCell('');
      if (sel.includes('h07')) return cells.h07 || fakeCell('');
      if (sel.includes('h08')) return cells.h08 || fakeCell('');
      if (sel.includes('h09')) return cells.h09 || fakeCell('');
      if (sel.includes('h10')) return cells.h10 || fakeCell('');
      if (sel.includes('h11') || sel.includes('h12')) return cells.h12 || cells.h11;
      if (sel.includes('h16')) return cells.h16 || fakeCell('');
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'td') return Object.values(cells);
      return [];
    },
    classList: { add: () => {}, contains: () => false },
    textContent: Object.values(cells).map((c) => c.textContent).join(' '),
    cloneNode: function () {
      return {
        querySelectorAll: () => [],
        textContent: Object.values(cells).map((c) => c.textContent).join(' ')
      };
    }
  };
  return rowObj;
}

function fakeTable(rows) {
  return {
    id: 'tblEspelhoPontoMesCorrente',
    querySelectorAll: (sel) => {
      if (sel === 'tr') return rows;
      if (sel === 'th') return [];
      if (sel.includes('.je-cell-pecunia-highlight')) {
        const matching = [];
        rows.forEach((r) => {
          Object.values(r.cells || {}).forEach((c) => {
            if (c.classList && c.classList.contains('je-cell-pecunia-highlight')) {
              matching.push(c);
            }
          });
        });
        return matching;
      }
      return [];
    },
    rows,
    querySelector: (sel) => null,
    classList: { contains: () => false, add: () => {} },
    cloneNode: function () {
      return {
        querySelectorAll: () => [],
        textContent: rows.map((r) => r.textContent).join(' ')
      };
    }
  };
}

test('pecuniaHighlight — destaca célula de pecúnia em dia útil/sábado (+50%)', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('05/09/2026', 'h01'); // 05/09/2026 é sábado
  const h10 = fakeCell('02:00', 'h10');
  const h12 = fakeCell('02:00', 'h12');
  const h16 = fakeCell('SÁBADO', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  M.modernizeMonthlyTable(table, 7);

  assert.equal(h12.classList.contains('je-cell-pecunia-highlight'), true);
  assert.equal(h12.innerHTML.includes('je-pecunia-badge-wksat'), true);
  assert.equal(h12.innerHTML.includes('+50%'), true);
  assert.equal(h12.innerHTML.includes('02:00'), true);
});

test('pecuniaHighlight — destaca célula de pecúnia em domingo/feriado (+100%)', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('06/09/2026', 'h01'); // 06/09/2026 é domingo
  const h10 = fakeCell('04:00', 'h10');
  const h12 = fakeCell('04:00', 'h12');
  const h16 = fakeCell('DOMINGO', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  M.modernizeMonthlyTable(table, 7);

  assert.equal(h12.classList.contains('je-cell-pecunia-highlight'), true);
  assert.equal(h12.innerHTML.includes('je-pecunia-badge-sunhol'), true);
  assert.equal(h12.innerHTML.includes('+100%'), true);
  assert.equal(h12.innerHTML.includes('04:00'), true);
});

test('pecuniaHighlight — não aplica badge quando a pecúnia é 00:00 ou vazia', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('01/09/2026', 'h01');
  const h10 = fakeCell('00:00', 'h10');
  const h12 = fakeCell('00:00', 'h12');
  const h16 = fakeCell('-', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  M.modernizeMonthlyTable(table, 7);

  assert.equal(h12.classList.contains('je-cell-pecunia-highlight'), false);
  assert.equal(h12.innerHTML.includes('je-pecunia-badge'), false);
});

test('pecuniaHighlight — idempotência: reexecução sucessiva preserva horário exato e não corrompe minutos com tag de taxa', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('05/09/2026', 'h01'); // sábado
  const h10 = fakeCell('02:00', 'h10');
  const h12 = fakeCell('02:00', 'h12');
  const h16 = fakeCell('SÁBADO', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  // 1ª passada
  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.classList.contains('je-cell-pecunia-highlight'), true);
  assert.equal(h12.innerHTML.includes('02:00'), true);
  assert.equal(h12.innerHTML.includes('+50%'), true);

  // 2ª passada (simula re-renderização por mutação de DOM ou retorno de aba)
  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.classList.contains('je-cell-pecunia-highlight'), true);
  assert.equal(h12.innerHTML.includes('02:00'), true);
  assert.equal(h12.innerHTML.includes('+50%'), true);
  // Garante que o +50% não se fundiu nos minutos gerando "02:50"
  assert.equal(h12.innerHTML.includes('02:50'), false);

  // 3ª passada
  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.innerHTML.includes('02:00'), true);
  assert.equal(h12.innerHTML.includes('02:50'), false);
});

test('pecuniaHighlight — domingo (+100%) reexecutado não corrompe minutos nem gera 04:100', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('06/09/2026', 'h01'); // domingo
  const h10 = fakeCell('04:00', 'h10');
  const h12 = fakeCell('04:00', 'h12');
  const h16 = fakeCell('DOMINGO', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.innerHTML.includes('04:00'), true);
  assert.equal(h12.innerHTML.includes('+100%'), true);

  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.innerHTML.includes('04:00'), true);
  assert.equal(h12.innerHTML.includes('04:100'), false);
  assert.equal(h12.innerHTML.includes('05:40'), false);
});

test('pecuniaHighlight — kpiExtractor lê pecúnia exata mesmo após modernização da tabela com badges', () => {
  const { JEPessoasModernizer: M } = loadStack();

  const h01 = fakeCell('05/09/2026', 'h01'); // sábado
  const h10 = fakeCell('02:00', 'h10');
  const h12 = fakeCell('02:00', 'h12');
  const h16 = fakeCell('SÁBADO', 'h16');

  const row = fakeRow({ h01, h10, h12, h16 });
  const table = fakeTable([row]);

  // Moderniza a tabela, injetando o badge de pecúnia (+50%)
  M.modernizeMonthlyTable(table, 7);
  assert.equal(h12.innerHTML.includes('je-pecunia-badge-wksat'), true);

  const legal = loadModule('legalConfig.js');
  const balance = loadModule('balanceCalc.js', legal);
  const doc = {
    getElementById: (id) => (id === 'tblEspelhoPontoMesCorrente' ? table : null),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const kpiMod = loadModule('kpiExtractor.js', Object.assign({ document: doc }, legal, balance));
  const K = kpiMod.JEPessoasKPI;

  const kpis = K.extractKPIs(7);
  assert.ok(kpis, 'kpis extraídos');
  // Deve ser 120 minutos (02:00), e NÃO 170 minutos (02:50 por contaminação do +50%)
  assert.equal(kpis.pecuniaWeekdaySatMinutes, 120);
  assert.equal(kpis.pecuniaWeekdaySat, '02:00');
});
