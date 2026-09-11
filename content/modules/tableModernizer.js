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
    success: [
      'sim', 'ativo', 'homologado', 'aprovado', 'deferido', 'concluído', 'concluido', 'regular',
      'pago', 'encaminhado para pagamento'
    ],
    warning: [
      'pendente', 'aguardando', 'parcial', 'em análise', 'em analise',
      'aguardando documentação', 'aguardando documentacao', 'aguardando homologação',
      'aguardando homologacao', 'em andamento'
    ],
    danger: [
      'não', 'nao', 'inativo', 'indeferido', 'reprovado', 'cancelado', 'negado', 'irregular',
      'rejeitado'
    ]
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
  // Um grid de RESULTADOS reconhecível mesmo VAZIO: 1ª linha toda de <th>
  // (>= 2 colunas) ou a tabela tem <thead>. Sem isto, uma consulta que não
  // retorna nada deixa só o <thead> nativo — o "quadradão cinza" que o
  // usuário reclama. Continua excluindo tabelas de layout de formulário.
  function looksLikeResultGrid(table) {
    if (table.tHead && table.tHead.rows.length) return true;
    const first = table.rows[0];
    if (!first || first.cells.length < 2) return false;
    return Array.from(first.cells).every((c) => c.tagName === 'TH');
  }

  function isDataTable(table) {
    if (table.classList.contains('je-generic-data-table')) return false; // já processada
    if (isInsideInjectedUI(table)) return false;
    if (table.closest('.moldura, .opcoes-pesquisa, #opcoes-consulta')) return false;

    const rows = table.rows;
    if (!rows || rows.length === 0) return false;
    // Menos de 2 linhas só passa se for claramente um grid de resultados
    // (cabeçalho sem dados) — senão é layout/uma linha solta.
    if (rows.length < 2 && !looksLikeResultGrid(table)) return false;

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

  // Coluna de NOME de pessoa (servidor / responsável / requerente…): o
  // cabeçalho e as células vão pra ESQUERDA (pedido do usuário — nome de
  // gente lê melhor alinhado à esquerda, não centralizado). Detecta pelo
  // texto do cabeçalho; exige que a coluna tenha conteúdo de texto (não
  // números) pra não pegar uma coluna "Nome do arquivo" cheia de códigos.
  const NAME_HEADER_RE = /\bnome\b|\bservidor\b|respons[áa]vel|colaborador|requerente|interessado|funcion[áa]rio/i;
  function classifyNameColumns(table) {
    const rows = Array.from(table.rows);
    if (rows.length < 1) return;
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    Array.from(headerRow.cells).forEach((headerCell, col) => {
      const htext = (headerCell.textContent || '').trim();
      if (!NAME_HEADER_RE.test(htext)) return;
      // "Matrícula Servidor" / "Cód. Servidor" etc. são número — pula se a
      // coluna for majoritariamente numérica.
      let numeric = 0, total = 0;
      dataRows.forEach((row) => {
        const c = row.cells[col];
        const t = c && c.textContent.trim();
        if (!t) return;
        total++;
        if (NUMERIC_RE.test(t) || TIME_RE.test(t)) numeric++;
      });
      if (total > 0 && numeric / total > 0.5) return;

      headerCell.classList.add('je-col-name');
      dataRows.forEach((row) => {
        const c = row.cells[col];
        if (c) c.classList.add('je-col-name');
      });
    });
  }

  // Envolve em um badge colorido só células com texto puro (sem markup
  // interno) que batem EXATAMENTE com uma palavra-chave conhecida — evita
  // mexer em células com links, ícones ou frases mais longas.
  function classifyStatusBadges(table) {
    const cells = table.querySelectorAll('td');
    cells.forEach((cell) => {
      if (cell.querySelector('*')) return;
      const text = cell.textContent.trim();
      // 40 (era 24): dá margem pra status de duas/três palavras comuns no
      // domínio administrativo do TSE ("ENCAMINHADO PARA PAGAMENTO",
      // "AGUARDANDO DOCUMENTAÇÃO") — ainda é exact-match contra
      // STATUS_KEYWORDS, então não vira badge em frase livre por acaso.
      if (!text || text.length > 40) return;

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

  // Marca como "célula de ação" (alinha à esquerda) qualquer <td> cujo
  // conteúdo é essencialmente um ícone / link / botão — detalhar, editar,
  // aprovar, excluir, baixar, etc. — sem texto de dado próprio. Assim os
  // ícones/botões das tabelas ficam sempre à esquerda, e os dados de texto
  // seguem centralizados.
  function classifyActionCells(table) {
    const rows = Array.from(table.rows);
    const dataRows = rows.length > 1 ? rows.slice(1) : rows;
    dataRows.forEach((row) => {
      Array.from(row.cells).forEach((cell) => {
        if (cell.classList.contains('je-col-numeric')) return;
        const hasAction = cell.querySelector(
          'a, button, input[type="button"], input[type="submit"], input[type="image"], input[type="checkbox"], input[type="radio"], img, svg'
        );
        if (!hasAction) return;
        // texto "de dado" próprio da célula (ignora o texto de dentro de
        // links/botões) — se houver quase nada, é célula só de ação
        let ownText = '';
        cell.childNodes.forEach((n) => { if (n.nodeType === 3) ownText += n.nodeValue; });
        if (ownText.trim().length > 3) return;
        cell.classList.add('je-cell-actions');
      });
    });
  }

  // <table> usada como painel de FILTRO/layout de formulário (não é tabela de
  // dados): densidade alta de campos, dentro de um <form>, fora de um painel
  // já conhecido. Ex.: telas do SAEX (#tbFiltroUnidades, #tbDevolucao,
  // #tbTipoSolicitacao) — o portal monta o filtro como <table> em vez de
  // .opcoes-pesquisa. Recebe a classe .je-filter-table-card, que o CSS
  // transforma em card glass igual aos demais painéis.
  function isFilterLayoutTable(table) {
    if (isInsideInjectedUI(table)) return false;
    if (table.classList.contains('je-generic-data-table')) return false;
    if (table.closest('.moldura, .opcoes-pesquisa, .box-oc, #opcoes-consulta, fieldset')) return false;
    if (!table.closest('form')) return false;
    const cells = table.querySelectorAll('td');
    if (cells.length === 0) return false;
    let controlCells = 0;
    cells.forEach((cell) => { if (cell.querySelector('input:not([type="hidden"]), select, textarea')) controlCells++; });
    if (controlCells === 0) return false;
    return controlCells / cells.length > 0.2;
  }

  function modernizeGenericTables() {
    const tables = document.querySelectorAll('#container table');
    tables.forEach((table) => {
      if (isDataTable(table)) {
        table.classList.add('je-modernized-table', 'je-generic-data-table');
        classifyNumericColumns(table);
        classifyNameColumns(table);
        classifyActionCells(table);
        classifyStatusBadges(table);
      } else if (isFilterLayoutTable(table)) {
        table.classList.add('je-filter-table-card');
      }
    });
  }

  return { modernizeGenericTables };
})();
