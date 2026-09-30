import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStack } from './helpers.mjs';

function fakeCell(text, className = '') {
  let inner = text;
  const classes = new Set(className ? className.split(' ') : []);
  let titleAttr = '';
  const cellObj = {
    nodeType: 1,
    get textContent() { return inner; },
    set textContent(v) { inner = v; },
    get innerText() { return inner; },
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
      return null;
    },
    querySelectorAll: () => [],
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
      if (sel === 'th') return null;
      if (sel === 'td.h01') return cells.h01;
      if (sel === 'td.h02') return cells.h02 || fakeCell('');
      if (sel === 'td.h03') return cells.h03 || fakeCell('');
      if (sel === 'td.h04') return cells.h04 || fakeCell('');
      if (sel === 'td.h05') return cells.h05 || fakeCell('');
      if (sel === 'td.h06') return cells.h06 || fakeCell('');
      if (sel === 'td.h07') return cells.h07 || fakeCell('');
      if (sel === 'td.h08') return cells.h08 || fakeCell('');
      if (sel === 'td.h09') return cells.h09 || fakeCell('');
      if (sel === 'td.h10') return cells.h10 || fakeCell('');
      if (sel === 'td.h11' || sel === 'td.h12') return cells.h12 || cells.h11;
      if (sel === 'td.h16') return cells.h16 || fakeCell('');
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
      return [];
    },
    rows,
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
