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
  // Acordeão do bloco de instruções — #divFormInformacoes envolve tanto o
  // <h4>"Informações..."</h4> quanto a lista (#conteudoFormInstrucoes).
  // Fica oculto por inteiro por padrão (não só a lista): o título nativo
  // some junto, o "Formulário para Novo Pedido" sobe. O toggle próprio
  // (fora do bloco, sempre visível) é quem controla a exibição.
  // --------------------------------------------------------------------
  function setupInstructionsAccordion() {
    var wrap = document.getElementById('divFormInformacoes');
    var list = document.getElementById('conteudoFormInstrucoes');
    if (!wrap || !list || wrap.dataset.jeAccordion === '1') return;
    wrap.dataset.jeAccordion = '1';

    // O <h4> tem um ícone nativo de ajuda (AbrirHelp(), abre outra janela)
    // — deixa como está, só não interfere no toggle (que agora é externo).
    var heading = wrap.querySelector('h4');
    if (heading) heading.classList.add('je-instrucoes-heading');

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'je-instrucoes-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="9 18 15 12 9 6"></polyline>' +
      '</svg>' +
      '<span>Ver instruções</span>';
    var toggleWrap = document.createElement('div');
    toggleWrap.className = 'je-instrucoes-toggle-wrap';
    toggleWrap.appendChild(toggle);
    wrap.parentNode.insertBefore(toggleWrap, wrap);

    wrap.classList.add('je-instrucoes-wrap-collapsed');

    function setOpen(open) {
      wrap.classList.toggle('je-instrucoes-wrap-collapsed', !open);
      toggle.setAttribute('aria-expanded', String(open));
      var label = toggle.querySelector('span');
      if (label) label.textContent = open ? 'Ocultar instruções' : 'Ver instruções';
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(wrap.classList.contains('je-instrucoes-wrap-collapsed'));
    });
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

  // --------------------------------------------------------------------
  // Resumo do Pedido de Reembolso (#divFormFinalizacao) vai pra lateral
  // direita, ao lado do Formulário + Lista de Medicamentos, enquanto
  // houver espaço — só desce pra baixo deles por responsividade (grid com
  // breakpoint em CSS). #divFormInformacoes/#tblListaItensNotas ficam de
  // fora de propósito: as instruções (quando abertas) e a lista de itens
  // continuam ocupando a coluna principal, largura toda.
  // --------------------------------------------------------------------
  function setupSidebarLayout() {
    var formulario = null;
    document.querySelectorAll('.grupoTopicos.je-detail-form-exempt').forEach(function (c) {
      if (/Formulário para Novo Pedido/i.test(c.textContent || '')) formulario = c;
    });
    var resumo = document.getElementById('divFormFinalizacao');
    var lista = document.getElementById('tblListaItensNotas');
    if (!formulario || !resumo || formulario.dataset.jeLayoutWrapped === '1') return;
    formulario.dataset.jeLayoutWrapped = '1';

    var layout = document.createElement('div');
    layout.className = 'je-reembolso-layout';
    formulario.parentNode.insertBefore(layout, formulario);

    formulario.classList.add('je-reembolso-layout-form');
    layout.appendChild(formulario);
    if (lista) {
      lista.classList.add('je-reembolso-layout-list');
      layout.appendChild(lista);
    }
    resumo.classList.add('je-reembolso-layout-aside');
    layout.appendChild(resumo);
  }

  // --------------------------------------------------------------------
  // Observações (dentro do Resumo do Pedido) é um <input type="text"> —
  // não um <textarea>, por isso o contador genérico de caracteres
  // (setupGenericCharCounters em domModernizer.js, que só olha pra
  // <textarea>) não pega esse campo. Mesmo componente visual
  // (.je-char-counter-container), adaptado pra um <input>. O aviso
  // "(máx. 1000 caracteres)" nativo vem dentro do próprio <th> do rótulo
  // (não como texto solto perto do campo, o padrão que o genérico
  // reconhece) — por isso precisa reescrever o rótulo aqui também.
  // --------------------------------------------------------------------
  function setupObservacoesCounter() {
    var input = document.getElementById('formReembolsoNovoPedido_observacoes');
    if (!input || input.dataset.jeCounterSet === '1') return;
    input.dataset.jeCounterSet = '1';

    var max = parseInt(input.getAttribute('maxlength'), 10) || 1000;

    var row = input.closest('tr');
    var label = row ? row.querySelector('th') : null;
    if (label && /caracteres/i.test(label.textContent || '')) {
      label.textContent = 'Observações:';
    }

    // Um <input> de uma linha só não dá pra ler um texto de até 1000
    // caracteres (ou rola na horizontal, ou o texto some pra fora da
    // caixa). Troca visualmente por um <textarea> de várias linhas; o
    // <input> original continua no DOM (só oculto) — é ele que o form
    // nativo envia no submit, então cada digitação no textarea copia o
    // valor de volta pra ele.
    var textarea = document.createElement('textarea');
    textarea.className = 'je-reembolso-observacoes-textarea';
    textarea.value = input.value;
    textarea.maxLength = max;
    textarea.rows = 6;
    textarea.placeholder = input.placeholder || '';
    // Evita que setupGenericCharCounters() (domModernizer.js — varre
    // QUALQUER <textarea> com maxlength detectável) trate este textarea
    // recém-criado como "novo" numa remontagem (checkStaleAndRetry chama
    // init() de novo, e essa criação aqui é ela mesma uma mutação que o
    // observer da página pode pegar) e monte um SEGUNDO contador do lado
    // do meu. Mesma flag/valor que a função genérica usa pra já
    // considerar "processado".
    textarea.dataset.jeCounterSet = 'true';
    input.style.display = 'none';
    input.parentNode.insertBefore(textarea, input);

    var counterContainer = document.createElement('div');
    counterContainer.className = 'je-char-counter-container';

    function updateCount() {
      input.value = textarea.value;
      var current = textarea.value.length;
      var remaining = Math.max(0, max - current);
      var warn = remaining < Math.max(10, max * 0.1) ? 'je-char-warning' : '';
      counterContainer.innerHTML =
        '<span class="je-char-max">Máx. ' + max + ' caracteres</span>' +
        '<span class="je-char-rem">Caracteres restantes: <strong class="' + warn + '">' +
        remaining + '</strong> / ' + max + '</span>';
    }

    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('keyup', updateCount);
    textarea.addEventListener('change', updateCount);
    updateCount();

    input.parentNode.insertBefore(counterContainer, input.nextSibling);
  }

  // --------------------------------------------------------------------
  // Ícones (lupa do Medicamento, ajuda do Tipo de Uso, calculadora do
  // Valor Total Pago) ficam ao lado do respectivo campo, não numa linha
  // embaixo — embrulha [controle + ícone(s)] numa linha flex. A tabela de
  // resultados da busca (quando presente) continua um bloco separado
  // logo abaixo, fora do embrulho.
  // --------------------------------------------------------------------
  function wrapInline(control, extras) {
    if (!control || control.dataset.jeIconWrapped === '1') return;
    control.dataset.jeIconWrapped = '1';
    var wrap = document.createElement('div');
    wrap.className = 'je-reembolso-input-icon-row';
    control.parentNode.insertBefore(wrap, control);
    wrap.appendChild(control);
    extras.forEach(function (el) { if (el) wrap.appendChild(el); });
  }

  function setupInlineIcons() {
    // Medicamento + lupa (o <button> que modernizeNativeIcons() insere
    // logo depois do <img id="lupa"> escondido).
    var nomeMed = document.querySelector(NOME_MEDICAMENTO_SELECTOR);
    var lupaImg = document.getElementById('lupa');
    wrapInline(nomeMed, [lupaImg ? lupaImg.nextElementSibling : null]);

    // Tipo de uso + ícone de ajuda.
    var ajudaImg = document.getElementById('imgAjudaMedicamento');
    var tipoUso = document.getElementById('formReembolsoNovoPedido_codigoModoUtilizacao');
    wrapInline(tipoUso, [ajudaImg ? ajudaImg.nextElementSibling : null]);

    // Valor total pago + ícone calculadora + link "Calcular Desconto"
    // (que agora abre o modal — ver setupCalculadoraDialog()).
    var valorInput = document.getElementById('VALOR');
    var calcImg = document.getElementById('imgCalculadora');
    var calcLink = valorInput && valorInput.parentElement
      ? valorInput.parentElement.querySelector('a')
      : null;
    wrapInline(valorInput, [calcImg, calcLink]);
  }

  // --------------------------------------------------------------------
  // "Calcular Desconto" abre hoje uma JANELA de popup nativa
  // (window.open, sem chrome, 360x260, ver abrirJanelaCalculadora() na
  // própria página) — vira um modal in-page no mesmo padrão dos demais
  // diálogos do TSE XT (.je-detail-modal-*, já estilizado genericamente
  // em content.css).
  //
  // A lógica é uma PORTA 1:1 de reembolsoFarmaceutico/js/calculadora.js
  // — não dá pra só <script src> injetar o arquivo original e chamar
  // suas funções: a CSP da página bloqueia silenciosamente scripts
  // inseridos dinamicamente (a tag chega a aparecer em document.scripts,
  // mas o conteúdo nunca executa em nenhum mundo — nem calcular() nem os
  // helpers de número passam a existir em lugar nenhum). Portada aqui,
  // idêntica ao original, operando só em DOM — sem depender de nenhum
  // script externo, funciona direto no mundo isolado do content script.
  // "Transportar" (copiarValor() no original) também é local: a versão
  // nativa usa window.opener, que não existe fora de um popup de
  // verdade.
  // --------------------------------------------------------------------
  var calcOverlay = null;

  function calcRoundNumber(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  }

  function calcConverteParaNumeroComPonto(valorComVirgula) {
    var posVirgula = valorComVirgula.lastIndexOf(',');
    if (posVirgula < 0) return valorComVirgula;
    return valorComVirgula.substring(0, posVirgula) + '.' + valorComVirgula.substring(posVirgula + 1);
  }

  function calcLimpaStrings(s) {
    var digitos = '0123456789,';
    var temp = '';
    for (var i = 0; i < s.length; i++) {
      var d = s.charAt(i);
      if (digitos.indexOf(d) >= 0) temp += d;
    }
    return temp;
  }

  function calcValidarValorCalc(campo) {
    campo.value = calcLimpaStrings(campo.value);
  }

  function calcSubstituiPontoPorVirgula(campo) {
    var valorComPonto = campo.value;
    var posPonto = valorComPonto.lastIndexOf('.');
    if (posPonto < 0) return;
    if (valorComPonto.length > posPonto + 1) {
      campo.value = valorComPonto.substring(0, posPonto) + ',' + valorComPonto.substring(posPonto + 1);
    } else {
      campo.value = valorComPonto.substring(0, posPonto) + ',';
    }
  }

  function calcCalcular(overlay) {
    var nota = parseFloat(calcConverteParaNumeroComPonto(overlay.querySelector('#VTNOTA').value));
    var desc = parseFloat(calcConverteParaNumeroComPonto(overlay.querySelector('#VTDESC').value));
    var med = parseFloat(calcConverteParaNumeroComPonto(overlay.querySelector('#VMEDI').value));
    var resultEl = overlay.querySelector('#RESULT');

    if (!(nota > 0)) {
      window.alert('o valor da nota deve ser maior que zero !');
      resultEl.value = '0';
      return;
    }
    if (!(nota > desc)) {
      window.alert('O valor do desconto deve ser menor que o valor da nota !');
      return;
    }
    var resultado = calcRoundNumber(med - med * desc / nota, 2) + '';
    var posPonto = resultado.lastIndexOf('.');
    resultEl.value = posPonto >= 0
      ? resultado.substring(0, posPonto) + ',' + resultado.substring(posPonto + 1)
      : resultado + ',00';
  }

  function buildCalculadoraOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'je-detail-modal-overlay';
    overlay.innerHTML =
      '<div class="je-detail-modal-card je-calc-desconto-card" role="dialog" aria-modal="true" aria-label="Cálculo do valor do medicamento com desconto">' +
        '<div class="je-detail-modal-header">' +
          '<span class="je-detail-modal-title">Cálculo do Valor com Desconto</span>' +
          '<button type="button" class="je-detail-modal-close" aria-label="Fechar">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
        '<div class="je-detail-modal-body">' +
          '<div class="je-calc-desconto-row">' +
            '<label for="VMEDI">Valor do medicamento:</label>' +
            '<input id="VMEDI" name="VMEDI" type="text" size="5" maxlength="7">' +
          '</div>' +
          '<div class="je-calc-desconto-row">' +
            '<label for="VTNOTA">Subtotal da nota:</label>' +
            '<input id="VTNOTA" name="VTNOTA" type="text" size="5" maxlength="7">' +
          '</div>' +
          '<div class="je-calc-desconto-row">' +
            '<label for="VTDESC">Valor total do desconto:</label>' +
            '<input id="VTDESC" name="VTDESC" type="text" size="5" maxlength="7">' +
          '</div>' +
          '<div class="je-calc-desconto-row je-calc-desconto-result">' +
            '<label for="RESULT">Valor do medicamento com desconto:</label>' +
            '<input id="RESULT" name="RESULT" type="text" value="0" disabled>' +
          '</div>' +
          '<div class="je-calc-desconto-actions">' +
            '<button type="button" class="je-btn-consultar" id="jeCalcBtnCalcular">Calcular</button>' +
            '<button type="button" class="je-btn-secondary" id="jeCalcBtnTransportar">Transportar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    return overlay;
  }

  function closeCalculadoraModal() {
    if (!calcOverlay) return;
    var overlay = calcOverlay;
    calcOverlay = null;
    overlay.classList.remove('active');
    document.documentElement.style.overflow = '';
    window.setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 220);
  }

  function openCalculadoraModal() {
    if (calcOverlay) return;
    var overlay = buildCalculadoraOverlay();
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { overlay.classList.add('active'); });
    calcOverlay = overlay;

    overlay.querySelectorAll('.je-calc-desconto-row:not(.je-calc-desconto-result) input').forEach(function (input) {
      input.addEventListener('keypress', function () { calcValidarValorCalc(input); });
      input.addEventListener('keyup', function () { calcSubstituiPontoPorVirgula(input); });
    });

    overlay.querySelector('#jeCalcBtnCalcular').addEventListener('click', function () {
      calcCalcular(overlay);
    });

    overlay.querySelector('#jeCalcBtnTransportar').addEventListener('click', function () {
      var valorInput = document.getElementById('VALOR');
      var result = overlay.querySelector('#RESULT');
      if (valorInput && result) {
        valorInput.value = result.value;
        valorInput.dispatchEvent(new Event('input', { bubbles: true }));
        valorInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeCalculadoraModal();
    });

    overlay.querySelector('.je-detail-modal-close').addEventListener('click', closeCalculadoraModal);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeCalculadoraModal(); });
    var onKey = function (e) {
      if (e.key !== 'Escape') return;
      closeCalculadoraModal();
      document.removeEventListener('keydown', onKey);
    };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('#VMEDI').focus();
  }

  function setupCalculadoraDialog() {
    var link = Array.prototype.filter.call(document.querySelectorAll('a'), function (a) {
      return /abrirJanelaCalculadora/.test(a.getAttribute('onclick') || '');
    })[0];
    if (!link || link.dataset.jeCalcDialog === '1') return;
    link.dataset.jeCalcDialog = '1';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openCalculadoraModal();
    }, true);
  }

  function init() {
    if (!isNovoPedidoPage()) return;
    try { setupFormGrid(); } catch (e) { /* não bloqueia o resto */ }
    try { setupInstructionsAccordion(); } catch (e) {}
    try { setupAutoSearch(); } catch (e) {}
    try { setupResultRowClick(); } catch (e) {}
    try { setupResultsScroll(); } catch (e) {}
    try { setupObservacoesCounter(); } catch (e) {}
    try { setupSidebarLayout(); } catch (e) {}
    try { setupInlineIcons(); } catch (e) {}
    try { setupCalculadoraDialog(); } catch (e) {}
  }

  return { init: init };
})();
