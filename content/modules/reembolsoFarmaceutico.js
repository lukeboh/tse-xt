/**
 * TSE XT - Reembolso Farmacêutico: revisão de UX do cadastro de Novo Pedido
 * (ReembolsoFarmaceuticoAction_registrarPedidoload)
 *
 * Uma das telas mais usadas do Meu Espaço e uma das mais cruas: um longo
 * bloco de instruções que só se lê (talvez) uma vez na vida — o próprio
 * sistema já valida as regras nele descritas —, um formulário empilhado em
 * uma única coluna que só parece ter tamanho decente depois que um
 * medicamento é pesquisado, e uma busca que exige clicar na lupa.
 *
 * Este módulo cuida do que precisa de JS:
 *   - bloco de instruções vira acordeão, fechado por padrão;
 *   - pesquisa de medicamento dispara sozinha enquanto o usuário digita
 *     (debounced) — sem precisar clicar na lupa. A pesquisa nativa
 *     (pesquisaMedicamento(), função global da própria página) navega de
 *     verdade pra uma URL com ?nomeMedicamento=...; não há como tornar isso
 *     assíncrono sem reimplementar a busca do zero, então o "auto" aqui é
 *     "dispara a mesma navegação sem exigir o clique", com debounce
 *     generoso pra não recarregar a cada tecla;
 *   - clique em qualquer parte da linha da "Lista de Apresentações" marca o
 *     radio (não só no própio radio, um alvo minúsculo);
 *   - resultado da pesquisa ganha um contêiner com rolagem própria (a lista
 *     pode passar de 15 itens e esticar a página toda).
 * O grid do formulário e o cartão em volta das seções (marcadas
 * .je-detail-form-exempt por detailModal.js) ficam em CSS
 * (reembolso-farmaceutico.css / content.css).
 */
window.JEPessoasReembolsoFarmaceutico = (function () {
  'use strict';

  var NOME_MEDICAMENTO_SELECTOR = 'input[name="nomeMedicamento"]';
  var SEARCH_DEBOUNCE_MS = 800;
  var MIN_SEARCH_LEN = 3;

  var searchTimer = null;
  var lastSearched = null;

  function isNovoPedidoPage() {
    return !!document.querySelector(NOME_MEDICAMENTO_SELECTOR);
  }

  // --------------------------------------------------------------------
  // Acordeão do bloco de instruções (#conteudoFormInstrucoes, precedido
  // por um <div><h4>Informações - Leia as instruções...</h4></div>).
  // --------------------------------------------------------------------
  function setupInstructionsAccordion() {
    var list = document.getElementById('conteudoFormInstrucoes');
    if (!list || list.dataset.jeAccordion === '1') return;
    list.dataset.jeAccordion = '1';

    var headingWrap = list.previousElementSibling;
    var heading = headingWrap ? headingWrap.querySelector('h4') : null;
    if (!heading) return;

    heading.classList.add('je-instrucoes-heading');

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'je-instrucoes-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="9 18 15 12 9 6"></polyline>' +
      '</svg>' +
      '<span>Ver instruções</span>';
    heading.appendChild(toggle);

    list.classList.add('je-instrucoes-collapsed');

    function setOpen(open) {
      list.classList.toggle('je-instrucoes-collapsed', !open);
      toggle.setAttribute('aria-expanded', String(open));
      var label = toggle.querySelector('span');
      if (label) label.textContent = open ? 'Ocultar instruções' : 'Ver instruções';
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(list.classList.contains('je-instrucoes-collapsed'));
    });

    // O <h4> tem um ícone nativo de ajuda (AbrirHelp(), abre outra janela) —
    // clicar nele não deve também abrir/fechar o acordeão.
    var helpIcon = heading.querySelector('img');
    if (helpIcon) {
      helpIcon.addEventListener('click', function (e) { e.stopPropagation(); });
    }
  }

  // --------------------------------------------------------------------
  // Auto-busca do medicamento enquanto digita (debounced).
  //
  // pesquisaMedicamento() é uma função global da PÁGINA (definida num
  // <script> nativo) — content script roda em mundo isolado por padrão, e
  // window.pesquisaMedicamento não existe nesse mundo mesmo com a função
  // presente no mundo principal. O DOM, porém, é compartilhado: clicar no
  // elemento nativo (#lupa, com onclick="pesquisaMedicamento()" já escrito
  // pela própria página) executa o handler no mundo dele, funcionando
  // independente de qual mundo disparou o .click(). Mesmo escondido pelo
  // ícone substituto do TSE XT (modernizeNativeIcons), .click() programático
  // ainda dispara o onclick.
  // --------------------------------------------------------------------
  function triggerSearch(input) {
    var value = input.value.trim();
    if (value.length < MIN_SEARCH_LEN || value === lastSearched) return;
    var lupa = document.getElementById('lupa');
    if (!lupa) return;
    lastSearched = value;
    lupa.click();
  }

  function setupAutoSearch() {
    var input = document.querySelector(NOME_MEDICAMENTO_SELECTOR);
    if (!input || input.dataset.jeAutoSearch === '1') return;
    input.dataset.jeAutoSearch = '1';
    // valor que já veio da última busca (ex.: recarregou a página com
    // ?nomeMedicamento=Dipiro) não deve disparar de novo sozinho.
    lastSearched = input.value.trim();

    input.addEventListener('input', function () {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () { triggerSearch(input); }, SEARCH_DEBOUNCE_MS);
    });
  }

  // --------------------------------------------------------------------
  // Clique em qualquer parte da linha da "Lista de Apresentações" marca
  // o radio — o alvo nativo (só o próprio <input type="radio">) é minúsculo.
  // --------------------------------------------------------------------
  function setupResultRowClick() {
    var table = document.getElementById('tblListaApresentacoes');
    if (!table || table.dataset.jeRowClick === '1') return;
    table.dataset.jeRowClick = '1';

    table.addEventListener('click', function (e) {
      if (e.target.closest('a')) return; // não rouba clique de link dentro da linha
      var row = e.target.closest('tr');
      if (!row || row.classList.contains('cabecalhoColunas')) return;
      var radio = row.querySelector('input[type="radio"]');
      if (!radio || e.target === radio) return;
      radio.click();
    });
  }

  // --------------------------------------------------------------------
  // Resultado da pesquisa (pode passar de 15 itens) ganha rolagem própria
  // em vez de esticar a página toda.
  // --------------------------------------------------------------------
  function setupResultsScroll() {
    var table = document.getElementById('tblListaApresentacoes');
    if (!table || table.dataset.jeScrollWrapped === '1') return;
    table.dataset.jeScrollWrapped = '1';

    var wrap = document.createElement('div');
    wrap.className = 'je-medicamento-results-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  }

  // --------------------------------------------------------------------
  // Marca o <table> do formulário (identificado pelo campo Medicamento)
  // pra virar grid em CSS sem depender de :has() cascateado por telas com
  // tabelas aninhadas (a própria Lista de Apresentações vive dentro dele).
  // --------------------------------------------------------------------
  function setupFormGrid() {
    var input = document.querySelector(NOME_MEDICAMENTO_SELECTOR);
    var table = input ? input.closest('table') : null;
    if (!table || table.classList.contains('je-reembolso-form-grid')) return;
    table.classList.add('je-reembolso-form-grid');

    // Marca as linhas "especiais" (largura toda / escondida) por classe em
    // vez de depender de :has() disputando especificidade CSS com a regra
    // genérica que transforma cada <tr> em item flex — :has() aninhado em
    // vários níveis (linha > coluna com classe) soma menos "peso B" (nº de
    // classes) do que a genérica com dois :not([style...]), mesmo tendo
    // mais seletores de tipo, e perdia a disputa por especificidade.
    var rows = table.querySelectorAll(':scope > tbody > tr');
    rows.forEach(function (row) {
      if (row.querySelector(NOME_MEDICAMENTO_SELECTOR)) {
        row.classList.add('je-reembolso-row-full');
      } else if (row.querySelector('button.je-btn-consultar, button.je-btn-secondary')) {
        row.classList.add('je-reembolso-row-full', 'je-reembolso-row-actions');
      } else {
        var td = row.querySelector(':scope > td.alignCenter');
        var onlyCell = row.children.length === 1 && row.children[0] === td;
        if (td && onlyCell && (row.textContent || '').replace(/[\s ]/g, '').length === 0) {
          row.classList.add('je-reembolso-row-spacer');
        }
      }
    });
  }

  function init() {
    if (!isNovoPedidoPage()) return;
    try { setupFormGrid(); } catch (e) { /* não bloqueia o resto */ }
    try { setupInstructionsAccordion(); } catch (e) {}
    try { setupAutoSearch(); } catch (e) {}
    try { setupResultRowClick(); } catch (e) {}
    try { setupResultsScroll(); } catch (e) {}
  }

  return { init: init };
})();
