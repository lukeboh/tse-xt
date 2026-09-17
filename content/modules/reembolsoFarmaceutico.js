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
  // Auto-busca do medicamento enquanto digita (debounced), com refino
  // local por palavras extras: só a 1ª palavra vai pro backend (query
  // ?nomeMedicamento=...) e preenche a "Lista de Apresentações"; da 2ª
  // em diante, filtra localmente as linhas já carregadas por qualquer
  // coluna (Medicamento, Apresentação, Valor, Exige Laudo) — "Exodus 15
  // mg" busca só "Exodus" no backend e mostra, dos resultados, só quem
  // também tem "15" e "mg" em algum campo.
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
  //
  // Como pesquisaMedicamento() navega de verdade (recarrega a página com
  // só a 1ª palavra na URL), o texto completo (com as palavras extras)
  // não sobrevive à navegação sozinho — é salvo no sessionStorage antes
  // de clicar na lupa e restaurado em setupAutoSearch() no carregamento
  // seguinte, junto com o filtro já aplicado nos resultados novos.
  // --------------------------------------------------------------------
  var SEARCH_STORAGE_KEY = 'je_reembolso_medicamento_filtro';

  function getSearchWords(value) {
    return (value || '').trim().split(/\s+/).filter(Boolean);
  }

  // Anima a troca visível/oculto de uma linha em vez do sumiço abrupto de
  // display:none direto: primeiro encolhe (padding) e esmaece (opacity) —
  // só depois da transição (220ms) aplica display:none de verdade (aí sim
  // o espaço é reaproveitado pelas linhas seguintes). Pra reaparecer, o
  // caminho é o inverso: tira o display:none, força um reflow no estado
  // "encolhido" e só então remove a classe de colapso, disparando a
  // transição de volta ao tamanho cheio.
  function animateRowVisibility(row, show) {
    window.clearTimeout(row._jeRowAnimTimer);
    if (show) {
      if (!row.classList.contains('je-row-hidden') && !row.classList.contains('je-row-collapsing')) return;
      row.classList.remove('je-row-hidden');
      row.classList.add('je-row-collapsing');
      void row.offsetHeight; // força reflow no estado colapsado antes de animar de volta
      row.classList.remove('je-row-collapsing');
    } else {
      if (row.classList.contains('je-row-hidden')) return;
      row.classList.add('je-row-collapsing');
      row._jeRowAnimTimer = window.setTimeout(function () {
        row.classList.add('je-row-hidden');
        row.classList.remove('je-row-collapsing');
      }, 220);
    }
  }

  function applyResultsFilter(extraWords) {
    var table = document.getElementById('tblListaApresentacoes');
    if (!table) return;
    // As palavras extras formam uma única frase contígua (ex.: "15 mg"),
    // que deve aparecer junta em algum campo da linha — e não cada palavra
    // isolada em qualquer posição, o que geraria falsos positivos (ex.:
    // "15 mg" batendo em "10 MG ... 15 COMPRIMIDOS").
    var phrase = (extraWords || []).join(' ').toLowerCase();
    var rows = table.querySelectorAll('tbody tr:not(.cabecalhoColunas)');
    rows.forEach(function (row) {
      var matches = !phrase || row.textContent.replace(/\s+/g, ' ').trim().toLowerCase().indexOf(phrase) !== -1;
      animateRowVisibility(row, matches);
    });
  }

  function triggerSearch(input) {
    var words = getSearchWords(input.value);
    var firstWord = words[0] || '';
    var extraWords = words.slice(1);

    if (firstWord.length < MIN_SEARCH_LEN) {
      applyResultsFilter([]);
      return;
    }

    if (firstWord.toLowerCase() === lastSearched) {
      applyResultsFilter(extraWords);
      return;
    }

    var lupa = document.getElementById('lupa');
    if (!lupa) return;
    try { window.sessionStorage.setItem(SEARCH_STORAGE_KEY, input.value); } catch (e) {}
    input.value = firstWord;
    lastSearched = firstWord.toLowerCase();
    lupa.click();
  }

  function setupAutoSearch() {
    var input = document.querySelector(NOME_MEDICAMENTO_SELECTOR);
    if (!input || input.dataset.jeAutoSearch === '1') return;
    input.dataset.jeAutoSearch = '1';
    // valor que já veio da última busca (ex.: recarregou a página com
    // ?nomeMedicamento=Dipiro) não deve disparar de novo sozinho.
    lastSearched = input.value.trim().toLowerCase();

    // Se a navegação anterior foi um recorte "só a 1ª palavra pro
    // backend", o campo tá exibindo só ela — restaura o texto completo
    // (com as palavras extras) e já filtra os resultados que acabaram
    // de chegar. Devolve o foco pro campo também: sob o ponto de vista do
    // usuário ele nunca parou de digitar na mesma caixa — só por baixo dos
    // panos essa "busca automática" é uma navegação de página de verdade,
    // que descarta o foco (documento novo). Sem isto, cada vez que a 1ª
    // palavra muda, o usuário precisa clicar de novo no campo pra
    // continuar digitando as palavras extras — só um Tab ou um clique em
    // outro lugar deve tirar o foco daqui pra frente, nunca a busca em si.
    try {
      var saved = window.sessionStorage.getItem(SEARCH_STORAGE_KEY);
      if (saved) {
        window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
        var savedWords = getSearchWords(saved);
        if (savedWords[0] && savedWords[0].toLowerCase() === lastSearched) {
          input.value = saved;
          applyResultsFilter(savedWords.slice(1));
          var end = input.value.length;
          var refocus = function () { input.focus(); input.setSelectionRange(end, end); };
          // Chamado bem cedo (requestAnimationFrame do mountXT, content.js)
          // pra logo depois do documento carregar — .focus() síncrono aqui
          // é ignorado pelo navegador (documento ainda "assentando"; testado
          // e confirmado via CDP: focus() imediato falha sempre, um retry
          // 60ms depois sempre funciona). A chamada imediata custa nada e
          // ainda cobre timings mais tardios (2ª+ palavra do usuário).
          refocus();
          window.setTimeout(refocus, 60);
        }
      }
    } catch (e) {}

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
    // Marca a linha pra CSS: é ela quem deve crescer e preencher o espaço
    // vertical que sobrar no card do Resumo (até o fundo), não as demais
    // linhas (Quantidade, Valor referência etc.), que mantêm altura de
    // conteúdo normal.
    if (row) row.classList.add('je-resumo-row-observacoes');

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
      // Sem o "Máx. X caracteres" fixo (redundante com o próprio "/ X" do
      // contador) — só o contador, ocupando a linha toda embaixo do
      // textarea.
      counterContainer.innerHTML =
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

    // Valor total pago + ícone calculadora (modernizeNativeIcons() troca o
    // <input type="image"> nativo — não é um <img>, mas a função cobre os
    // dois — pelo botão .je-native-icon logo depois dele) + link "Calcular
    // Desconto" (que agora abre o modal — ver setupCalculadoraDialog()).
    var valorInput = document.getElementById('VALOR');
    var calcImg = document.getElementById('imgCalculadora');
    var calcIcon = calcImg ? calcImg.nextElementSibling : null;
    var calcLink = valorInput && valorInput.parentElement
      ? valorInput.parentElement.querySelector('a')
      : null;

    // O ícone (calcIcon) e o link "Calcular Desconto" (calcLink) disparam a
    // MESMA função nativa (abrirJanelaCalculadora()), mas só o link é
    // interceptado por setupCalculadoraDialog() pra abrir o modal formatado
    // — clicar no ícone caía direto na janela de popup nativa crua, sem
    // estilo. Em vez de manter 2 controles pra 1 ação só, o ícone entra
    // DENTRO do próprio botão "Calcular Desconto" (como glifo) e o
    // standalone some.
    if (calcIcon && calcLink && !calcLink.dataset.jeCalcIconMerged) {
      calcLink.dataset.jeCalcIconMerged = '1';
      calcIcon.classList.add('je-reembolso-calc-icon-hidden');
      var calcGlyph = document.createElement('span');
      calcGlyph.className = 'je-calc-desconto-btn-icon';
      calcGlyph.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>';
      calcLink.insertBefore(calcGlyph, calcLink.firstChild);
    }
    // calcImg (#imgCalculadora, o <input type="image"> nativo, sempre
    // display:none via .je-legacy-icon-hidden) precisa entrar no embrulho
    // também, mesmo escondido: sozinho, direto filho do <td>, ele ainda
    // BATE na regra genérica table.je-filter-table-card td:has(> input:
    // not([type=radio]):not([type=checkbox]):not([type=hidden])) —
    // type="image" não está excluído dali, e :has() não liga pra
    // display:none, só pra presença no DOM. Resultado: o padding-top
    // gigante daquela regra genérica reaparecia neste <td> mesmo com o
    // campo já embrulhado (mesmo bug do Quantidade, de novo, agora vindo
    // do <input> escondido em vez do visível).
    wrapInline(valorInput, [calcImg, calcIcon, calcLink]);

    // Quantidade não tem ícone (nenhum wrapInline chamado pra ela antes),
    // então o <input> ficava filho direto do <td> — e batia sem querer na
    // regra genérica table.je-filter-table-card td:has(> input...)
    // (content.css), pensada pra painéis de uma linha só (label+campo
    // soltos direto na célula), que aplica um padding-top bem maior. Na
    // prática, deixava só este campo visivelmente mais baixo/desalinhado
    // que os vizinhos (Tipo de Uso, Data da Receita etc., todos já
    // embrulhados). Embrulhar (sem extras) tira o <input> de filho direto
    // do <td> e o :has() para de bater — mesmo tratamento dos outros.
    var qtdInput = document.getElementById('formReembolsoNovoPedido_quantidade');
    wrapInline(qtdInput, []);
  }

  // --------------------------------------------------------------------
  // Quantidade e Valor Total Pago na mesma linha (pedido do usuário). A
  // 1ª tentativa só usava grid-column-start/span no auto-placement do
  // CSS Grid do formulário — funcionava, mas o desalinhamento vertical
  // entre os 2 campos, medido ao vivo, não sumiu (o nº de colunas que o
  // grid cabe lado a lado muda com a largura da tela, e isso influencia
  // onde cada <tr> cai). Mesmo truque, já validado, do Beneficiário:
  // embrulha os 2 <tr> num único <div> flex, garantindo os 2 sempre lado
  // a lado, alinhados pelo topo, sem depender do auto-placement do grid.
  // --------------------------------------------------------------------
  function setupQuantidadeValorLayout() {
    var qtdInput = document.getElementById('formReembolsoNovoPedido_quantidade');
    var qtdRow = qtdInput ? qtdInput.closest('tr') : null;
    var valorInput = document.getElementById('VALOR');
    var valorRow = valorInput ? valorInput.closest('tr') : null;
    if (!qtdRow || !valorRow || qtdRow.dataset.jeQtdValorWrapped === '1') return;
    qtdRow.dataset.jeQtdValorWrapped = '1';

    var wrap = document.createElement('div');
    wrap.className = 'je-reembolso-row-full je-qtd-valor-combo';
    qtdRow.parentNode.insertBefore(wrap, qtdRow);
    wrap.appendChild(qtdRow);
    wrap.appendChild(valorRow);

    qtdRow.classList.add('je-qtd-valor-col-qtd');
    valorRow.classList.add('je-qtd-valor-col-valor');
  }

  // --------------------------------------------------------------------
  // Beneficiário: "Beneficiário:" (radios) e "Nome do Beneficiário:"
  // (select, só aparece com "Dependente" marcado) são 2 <tr> separados,
  // cada um ocupando uma coluna estreita do grid — os 2 rádios quebravam
  // linha dentro da coluna de ~220px e o nome completo do dependente
  // (às vezes 30+ caracteres) estourava o teto de largura do <select>.
  // Embrulha os 2 <tr> (via appendChild — reparenting via API do DOM não
  // passa pelo parser de HTML, então não sofre a correção automática que
  // um <div> com <tr> dentro sofreria vindo de innerHTML) numa única
  // linha cheia do grid, lado a lado. trNomeBeneficiario continua o
  // mesmo nó (mesmo id) que alteraBeneficiario() (função nativa) já
  // manipula por style.display — só mudou de pai, o toggle nativo
  // continua funcionando exatamente igual.
  // --------------------------------------------------------------------
  function setupBeneficiarioLayout() {
    var radio = document.getElementById('beneficiario') || document.getElementById('radioDependente');
    var benefRow = radio ? radio.closest('tr') : null;
    var nomeRow = document.getElementById('trNomeBeneficiario');
    if (!benefRow || !nomeRow || benefRow.dataset.jeBenefWrapped === '1') return;
    benefRow.dataset.jeBenefWrapped = '1';

    var wrap = document.createElement('div');
    wrap.className = 'je-reembolso-row-full je-beneficiario-combo';
    benefRow.parentNode.insertBefore(wrap, benefRow);
    wrap.appendChild(benefRow);
    wrap.appendChild(nomeRow);

    benefRow.classList.add('je-beneficiario-row-radios');
    nomeRow.classList.add('je-beneficiario-row-nome');

    // "O próprio servidor" / "Dependente": <input> e <span class="lblRadio">
    // soltos, 4 irmãos diretos do <td> ("input,span,input,span"). Com
    // align-items:center num flex row de 4 itens soltos, cada radio ganha
    // centralização própria contra sua ALTURA NATIVA (o input, sem
    // wrapper) — pequenas diferenças de renderização nativa entre o
    // estado marcado/desmarcado do radio (accent-color é pintura nativa
    // do navegador) podiam fazer um par parecer alguns pixels mais alto
    // que o outro. Embrulhando cada par num <label> só (clique no texto
    // também marca o radio, de brinde — antes só funcionava clicando
    // exatamente no círculo), a centralização de cada par vira um
    // problema local e idêntico pros 2, eliminando a deriva.
    var td = benefRow.querySelector('td');
    if (td) {
      Array.prototype.slice.call(td.querySelectorAll('input[type="radio"]')).forEach(function (radio) {
        if (radio.closest('.je-radio-option')) return;
        var span = radio.nextElementSibling;
        var pair = document.createElement('label');
        pair.className = 'je-radio-option';
        radio.parentNode.insertBefore(pair, radio);
        pair.appendChild(radio);
        if (span && span.classList.contains('lblRadio')) pair.appendChild(span);
      });
    }
  }

  // --------------------------------------------------------------------
  // "Nome do Beneficiário" (select) alternava de exibido/escondido via
  // style.display (alteraBeneficiario(), nativa) conforme o radio
  // marcado — dava um "pulo" incômodo no layout do formulário a cada
  // troca. Pedido do usuário: manter o campo sempre visível e só
  // habilitar/desabilitar. reembolso-farmaceutico.css já ignora o
  // style.display nativo neste <tr> (!important); aqui só cuidamos do
  // disabled do <select> — desabilitado ele nem é enviado no submit,
  // preservando o mesmo comportamento de "não se aplica quando o
  // beneficiário é o próprio servidor".
  // --------------------------------------------------------------------
  function setupBeneficiarioAlwaysVisible() {
    var radioServidor = document.getElementById('beneficiario');
    var radioDependente = document.getElementById('radioDependente');
    var select = document.getElementById('formReembolsoNovoPedido_codigoDependente');
    if (!radioServidor || !radioDependente || !select || select.dataset.jeAlwaysVisible === '1') return;
    select.dataset.jeAlwaysVisible = '1';

    function sync() {
      select.disabled = !radioDependente.checked;
    }
    radioServidor.addEventListener('change', sync);
    radioDependente.addEventListener('change', sync);
    radioServidor.addEventListener('click', sync);
    radioDependente.addEventListener('click', sync);
    sync();
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
    try { setupQuantidadeValorLayout(); } catch (e) {}
    try { setupBeneficiarioLayout(); } catch (e) {}
    try { setupBeneficiarioAlwaysVisible(); } catch (e) {}
    try { setupCalculadoraDialog(); } catch (e) {}
  }

  return { init: init };
})();
