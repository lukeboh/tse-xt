/**
 * TSE XT - Modernizador Genérico de Tabelas (roadmap F3)
 *
 * A maioria das telas do Meu Espaço não tem uma tabela "instrumentada" como
 * o Espelho de Ponto (sem classes de coluna, às vezes nem <thead>/<tbody> no
 * HTML de origem) — modernizeTable() em domModernizer.js não serve pra elas.
 * Este módulo decora qualquer tabela de RESULTADOS (não de layout/formulário)
 * a partir do texto do cabeçalho e do conteúdo das células, sem exigir
 * nenhuma classe nativa: zebra, alinhamento numérico por coluna e badges de
 * status por palavra-chave exata.
 */

window.JEPessoasTableModernizer = (function () {
  'use strict';

  const NUMERIC_RE = /^-?[\d.,]+%?$/;
  const TIME_RE = /^-?\d{1,3}:\d{2}(:\d{2})?$/;

  // Palavras isoladas (célula só com esse texto) que viram badge colorido.
  // Conservador de propósito: cobre os status mais comuns do português
  // administrativo do TSE; cresce sob demanda ao portar novas telas (F7).
  const STATUS_KEYWORDS = {
    success: ['sim', 'ativo', 'homologado', 'aprovado', 'deferido', 'concluído', 'concluido', 'regular'],
    warning: ['pendente', 'aguardando', 'parcial'],
    danger: ['não', 'nao', 'inativo', 'indeferido', 'reprovado', 'cancelado', 'negado', 'irregular']
  };

  // Mesma lógica de exclusão usada em domModernizer.js (extractNativePageTitle):
  // não usar .closest('[class*="je-"]') porque <body class="je-xt-enabled">
  // sempre bate com esse seletor. Só ids com prefixo "je-" identificam UI
  // que o próprio TSE XT injetou.
  function isInsideInjectedUI(el) {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      // node.id nem sempre é string: um <form> com campo name="id" expõe
      // esse controle como propriedade nomeada, então form.id vira o
      // elemento em vez do atributo — checar o tipo evita
      // "node.id.indexOf is not a function" (achado no roadmap F7).
      if (typeof node.id === 'string' && node.id.indexOf('je-') === 0) return true;
    }
    return false;
  }

  // Distingue tabela de RESULTADOS (o alvo) de tabela usada só pra layout de
  // formulário (padrão comum em telas antigas de Struts/JSP: um <td> por
  // campo). O sinal mais confiável é a densidade de controles de formulário
  // dentro das células — uma tabela de dados não tem quase nenhum.
  function isDataTable(table) {
    if (table.classList.contains('je-generic-data-table')) return false; // já processada
    if (isInsideInjectedUI(table)) return false;
    if (table.closest('.moldura, .opcoes-pesquisa, #opcoes-consulta')) return false;

    const rows = table.rows;
    if (!rows || rows.length < 2) return false; // precisa de cabeçalho + ao menos 1 linha de dado

    const cells = table.querySelectorAll('td, th');
    if (cells.length === 0) return false;

    let controlCells = 0;
    cells.forEach((cell) => {
      if (cell.querySelector('input, select, textarea, button')) controlCells++;
    });
    if (controlCells / cells.length > 0.25) return false;

    return true;
  }

  // Marca como numérica (alinhada à direita) qualquer coluna onde a maioria
  // das células não-vazias parece número, moeda ou hh:mm.
  function classifyNumericColumns(table) {
    const rows = Array.from(table.rows);
    if (rows.length < 2) return;

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const colCount = headerRow.cells.length;

    for (let col = 0; col < colCount; col++) {
      let numericCount = 0;
      let total = 0;
      dataRows.forEach((row) => {
        const cell = row.cells[col];
        if (!cell) return;
        const text = cell.textContent.trim();
        if (!text) return;
        total++;
        if (NUMERIC_RE.test(text) || TIME_RE.test(text)) numericCount++;
      });
      if (total > 0 && numericCount / total >= 0.8) {
        const headerCell = headerRow.cells[col];
        if (headerCell) headerCell.classList.add('je-col-numeric');
        dataRows.forEach((row) => {
          const cell = row.cells[col];
          if (cell) cell.classList.add('je-col-numeric');
        });
      }
    }
  }

  // Envolve em um badge colorido só células com texto puro (sem markup
  // interno) que batem EXATAMENTE com uma palavra-chave conhecida — evita
  // mexer em células com links, ícones ou frases mais longas.
  function classifyStatusBadges(table) {
    const cells = table.querySelectorAll('td');
    cells.forEach((cell) => {
      if (cell.querySelector('*')) return;
      const text = cell.textContent.trim();
      if (!text || text.length > 24) return;

      const normalized = text.toLowerCase();
      let variant = null;
      for (const key in STATUS_KEYWORDS) {
        if (STATUS_KEYWORDS[key].indexOf(normalized) !== -1) {
          variant = key;
          break;
        }
      }
      if (!variant) return;

      const badge = document.createElement('span');
      badge.className = `je-generic-badge je-generic-badge-${variant}`;
      badge.textContent = text;
      cell.textContent = '';
      cell.appendChild(badge);
    });
  }

  function modernizeGenericTables() {
    const tables = document.querySelectorAll('#container table');
    tables.forEach((table) => {
      if (!isDataTable(table)) return;
      table.classList.add('je-modernized-table', 'je-generic-data-table');
      classifyNumericColumns(table);
      classifyStatusBadges(table);
    });
  }

  return { modernizeGenericTables };
})();
