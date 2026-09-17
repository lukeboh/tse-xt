import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function fakeCell(text, opts = {}) {
  const children = [];
  return {
    textContent: text,
    tagName: opts.tagName || 'TD',
    cellIndex: opts.cellIndex,
    className: '',
    classList: { add() {}, contains: () => false },
    // '*' simula "tem elemento filho" (célula com ícone/link) — só quando
    // opts.hasChild pede; classifyStatusBadges() pula essas células.
    querySelector: (sel) => (sel === '*' && opts.hasChild ? {} : null),
    appendChild(node) { children.push(node); },
    get badge() { return children[0] || null; }
  };
}

// headerTexts: textos do cabeçalho (viram <th>, uma linha).
// dataRows: array de linhas, cada uma um array de string ou {text, hasChild}.
function fakeTable(headerTexts, dataRows) {
  const headerCells = headerTexts.map((t) => fakeCell(t, { tagName: 'TH' }));
  const bodyRows = dataRows.map((rowSpecs) => ({
    cells: rowSpecs.map((spec, i) => {
      const s = typeof spec === 'string' ? { text: spec } : spec;
      return fakeCell(s.text, { cellIndex: i, hasChild: s.hasChild });
    })
  }));
  const allTds = bodyRows.flatMap((r) => r.cells);
  return {
    classList: { contains: () => false, add() {} },
    closest: () => null,
    tHead: null,
    rows: [{ cells: headerCells }, ...bodyRows],
    querySelectorAll(sel) {
      if (sel === 'td') return allTds;
      if (sel === 'td, th') return [...headerCells, ...allTds];
      return [];
    },
    // usado só pelos data rows na busca de linha de dado (bodyRows), pra
    // localizar depois do modernizeGenericTables() rodar.
    dataRows: bodyRows
  };
}

function loadWithTable(table) {
  return loadModule('tableModernizer.js', {
    document: {
      querySelectorAll: (sel) => (sel === '#container table' ? [table] : [])
    }
  });
}

test('classifyStatusBadges — status conhecido em qualquer coluna vira o badge certo (regressão)', () => {
  const table = fakeTable(['Ativo?', 'Nome'], [['SIM', 'Fulano'], ['NÃO', 'Ciclano']]);
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  assert.equal(table.dataRows[0].cells[0].badge.className, 'je-generic-badge je-generic-badge-success');
  assert.equal(table.dataRows[1].cells[0].badge.className, 'je-generic-badge je-generic-badge-danger');
});

test('classifyStatusBadges — novos status do Reembolso Farmacêutico (achados ao vivo) classificam certo', () => {
  const table = fakeTable(
    ['Data', 'Situação'],
    [
      ['01/09/2026', 'EM HOMOLOGACAO PELA SEÇÃO DE BENEFÍCIOS'],
      ['02/09/2026', 'CANCELADO POR FALTA DE DOCUMENTAÇÃO'],
      ['03/09/2026', 'ENCAMINHADO PARA PAGAMENTO']
    ]
  );
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  assert.equal(table.dataRows[0].cells[1].badge.className, 'je-generic-badge je-generic-badge-warning', 'em homologação = em andamento (amarelo)');
  assert.equal(table.dataRows[1].cells[1].badge.className, 'je-generic-badge je-generic-badge-danger', 'cancelado por falta de documentação = recusa (rosa), não "em andamento"');
  assert.equal(table.dataRows[2].cells[1].badge.className, 'je-generic-badge je-generic-badge-success');
});

test('classifyStatusBadges — fallback "em andamento" só na coluna Situação/Status, pra status futuro desconhecido', () => {
  const table = fakeTable(
    ['Data', 'Situação'],
    [['01/09/2026', 'STATUS NOVO DESCONHECIDO']]
  );
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  const badge = table.dataRows[0].cells[1].badge;
  assert.ok(badge, 'fallback cria o badge mesmo sem bater em nenhuma palavra-chave');
  assert.equal(badge.className, 'je-generic-badge je-generic-badge-warning');
  assert.equal(badge.textContent, 'STATUS NOVO DESCONHECIDO');
});

test('classifyStatusBadges — fallback NÃO se aplica fora da coluna Situação/Status (evita falso positivo)', () => {
  const table = fakeTable(
    ['Situação', 'Observação'],
    [['SIM', 'TEXTO QUALQUER SEM SER STATUS']]
  );
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  assert.equal(table.dataRows[0].cells[0].badge.className, 'je-generic-badge je-generic-badge-success');
  assert.equal(table.dataRows[0].cells[1].badge, null, 'coluna "Observação" não é status — sem fallback');
});

test('classifyStatusBadges — sem coluna Situação/Status na tabela, texto desconhecido fica sem badge (comportamento antigo preservado)', () => {
  const table = fakeTable(
    ['Data', 'Observação'],
    [['01/09/2026', 'TEXTO QUALQUER']]
  );
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  assert.equal(table.dataRows[0].cells[1].badge, null);
});

test('classifyStatusBadges — célula com ícone/link dentro nunca vira badge, nem no fallback', () => {
  const table = fakeTable(
    ['Situação'],
    [[{ text: 'ALGO', hasChild: true }]]
  );
  const { JEPessoasTableModernizer: T } = loadWithTable(table);
  T.modernizeGenericTables();

  assert.equal(table.dataRows[0].cells[0].badge, null);
});
