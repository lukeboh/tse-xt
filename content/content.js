/**
 * JE Pessoas XT - Script Principal de Inicialização (Content Script v0.1.8)
 */

(function () {
  'use strict';

  // Registro de perfis de página (roadmap F1 — docs/roadmap-arquitetura-visual.md).
  // Cada perfil sabe modernizar título/formulário/tabela de UMA tela específica.
  // Páginas sem perfil correspondente ainda recebem a casca genérica (topbar,
  // drawer, busca, ações rápidas, toggle) montada mais abaixo — só não passam
  // pelos modernizadores de título/formulário/tabela, que hoje são hardcoded
  // para o Espelho de Ponto (ver injectPageTitleHeader/modernizeTable em
  // domModernizer.js). Novas telas ganham um perfil aqui à medida que forem
  // portadas (F5-F7).
  const PAGE_PROFILES = [
    {
      // Tela de login (pré-autenticação) — Logout e Login_verTelaInicial*
      // mostram o mesmo formulário nativo (#box-login), então casamos pelo
      // próprio elemento em vez de enumerar toda variação de URL possível.
      // Nunca detectar por URL sozinha aqui: mais seguro depender só de o
      // formulário de login realmente existir na página.
      // PRECISA vir ANTES dos perfis abaixo (find() para no 1º match): a
      // sessão expirada redireciona pra Login_verTelaInicialSemLogout com
      // a URL de destino original na query string (?url=/EspelhoPontoDia
      // Action_consultar.action) — o href.includes(...) dos perfis
      // espelhoMes/espelhoDia batia nessa query string mesmo sendo a tela
      // de login, pulando mountLoginPage() e aplicando a casca genérica
      // (com título/breadcrumb do Espelho) por cima do formulário nativo
      // cru.
      id: 'login',
      isMatch: () => !!document.getElementById('box-login'),
    },
    {
      id: 'espelhoMes',
      isMatch: () => window.location.href.includes('EspelhoPontoMesAction') || !!document.getElementById('tblEspelhoPontoMesCorrente'),
    },
    {
      id: 'espelhoDia',
      isMatch: () => window.location.href.includes('EspelhoPontoDiaAction') || !!document.getElementById('formEspelhoPontoDia'),
    },
    {
      // Gestão de Serviço Extraordinário (visão do chefe) — tem lógica de
      // negócio própria (o painel de KPI por servidor, ver heGestaoKpi.js),
      // mas o formulário/tabela em si já ficam bons só com os modernizadores
      // genéricos (roadmap F5/F6) — por isso NÃO entra no branch
      // modernizeForm()/modernizeTable() abaixo, que é hardcoded pro Espelho.
      id: 'heGestaoChefes',
      isMatch: () => window.location.href.includes('HoraExtraGestao_visaoChefes') || !!document.getElementById('tbServidoresAutorizados'),
    },
  ];

  function resolveProfileId() {
    const profile = PAGE_PROFILES.find((p) => p.isMatch());
    return profile ? profile.id : null;
  }

  // Splash de carregamento (ver #je-boot-splash em content.css): cobre a
  // tela escondida por je-xt-boot com a marca do TSE XT + barra de
  // progresso, em vez de deixar branco enquanto a página autenticada
  // (às vezes lenta no backend Struts) termina de montar. Criado direto
  // em <html> porque roda em document_start, antes de <body> existir —
  // é escondido via CSS (display:none) na tela de login e com o tema
  // desligado, então não precisa de nenhuma checagem de perfil aqui.
  let splashStartTime = 0;
  function injectBootSplash() {
    try {
      if (document.getElementById('je-boot-splash')) return;
      splashStartTime = Date.now();
      const splash = document.createElement('div');
      splash.id = 'je-boot-splash';
      splash.setAttribute('aria-hidden', 'true');
      // Ícone real da extensão em alta resolução (icons/base.png, 512x512,
      // listado em web_accessible_resources) em vez de um SVG genérico —
      // pedido explícito do usuário pra reforçar a marca no splash. Usa a
      // versão base (não a já reduzida icon-128.png) pra ficar nítido em
      // qualquer densidade de tela, já que aqui é exibido bem pequeno.
      const iconUrl = chrome.runtime.getURL('icons/base.png');
      // .je-boot-backdrop e .je-boot-glow são só decoração (glow azul
      // crescendo do centro, na linguagem visual de glassmorfismo já usada
      // no resto da extensão — ver content.css); .je-boot-content (ícone,
      // título, barra) entra com fade+scale um instante depois.
      splash.innerHTML = `
        <div class="je-boot-backdrop"></div>
        <div class="je-boot-glow"></div>
        <div class="je-boot-content">
          <div class="je-boot-logo">
            <img src="${iconUrl}" alt="" width="40" height="40" />
          </div>
          <div class="je-boot-title">TSE <span>XT</span></div>
          <div class="je-boot-tagline">Preparando sua área de trabalho&hellip;</div>
          <div class="je-boot-progress-track"><div class="je-boot-progress-fill"></div></div>
        </div>
      `;
      document.documentElement.appendChild(splash);
    } catch (e) {}
  }

  // Ativação explícita do splash para cobrir transições ativas (ex.: clique de login)
  function showSplash(tagline) {
    try {
      sessionStorage.setItem('je_logging_in', '1');
      // Persiste a legenda: a próxima página (destino da navegação) recria a
      // splash do zero no document_start (ver mais abaixo) — sem isso ela
      // nascia sempre com a legenda padrão "Preparando sua área de
      // trabalho…", diferente da legenda desta splash ("Autenticando suas
      // credenciais…"/"Conectando via Acesso Extranet…"). Como o Chrome
      // mantém o último frame desta página desenhado por cima durante a
      // troca (Paint Holding), a legenda trocando de texto no meio da
      // transição dava a impressão de duas splashes/um "pulo" no meio dela
      // (achado real, 2026-09-22).
      if (tagline) sessionStorage.setItem('je_logging_in_tagline', tagline);
    } catch (e) {}
    let splash = document.getElementById('je-boot-splash');
    if (!splash) {
      injectBootSplash();
      splash = document.getElementById('je-boot-splash');
    }
    if (splash) {
      splash.classList.remove('je-boot-complete', 'je-boot-hide');
      if (tagline) {
        const tagEl = splash.querySelector('.je-boot-tagline');
        if (tagEl) tagEl.textContent = tagline;
      }
      splash.style.display = 'flex';
      // Reinicia as animações CSS para florescimento imediato
      const glow = splash.querySelector('.je-boot-glow');
      const content = splash.querySelector('.je-boot-content');
      const bar = splash.querySelector('.je-boot-bar-progress, .je-boot-progress-fill');
      if (glow) {
        glow.style.animation = 'none';
        void glow.offsetHeight;
        glow.style.animation = '';
      }
      if (content) {
        content.style.animation = 'none';
        void content.offsetHeight;
        content.style.animation = '';
      }
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetHeight;
        bar.style.animation = '';
      }
    }
    document.documentElement.classList.add('je-logging-in', 'je-xt-boot');
    document.documentElement.style.backgroundColor = '#0a2540';
    if (document.body) document.body.classList.add('je-logging-in');
  }

  // Exporta para outros módulos (ex.: acionar o splash no clique do login)
  window.JEPessoasBoot = { injectBootSplash, showSplash };

  // Anti-FOUC: revela a página (remove je-xt-boot) uma única vez. Chamada ao
  // fim da montagem estrutural e por uma válvula de segurança abaixo, para
  // nunca deixar a tela escondida caso algo falhe.
  let revealed = false;
  const MIN_SPLASH_DISPLAY_MS = 650;
  function reveal(forceImmediate = false) {
    if (revealed) return;
    revealed = true;
    const splash = document.getElementById('je-boot-splash');
    let isLoginBoot = false;
    try {
      isLoginBoot = sessionStorage.getItem('je_logging_in') === '1';
    } catch (e) {}

    const executeDissolve = () => {
      if (splash) {
        // Completa a barra até 100% e dissolve o splash por cima do conteúdo
        splash.classList.add('je-boot-complete', 'je-boot-hide');
        const isLogin = !!document.getElementById('box-login');
        if (!isLogin) {
          setTimeout(() => splash.remove(), 400);
        }
      }
      document.documentElement.classList.remove('je-xt-boot', 'je-logging-in');
      document.documentElement.style.backgroundColor = '';
      try {
        sessionStorage.removeItem('je_logging_in');
        sessionStorage.removeItem('je_logging_in_tagline');
      } catch (e) {}
    };

    // Em trocas normais de tela (fora do login inicial), a revelação é instantânea (0ms)
    if (forceImmediate || !splash || !isLoginBoot) {
      executeDissolve();
    } else {
      const elapsed = Date.now() - splashStartTime;
      const remaining = Math.max(0, MIN_SPLASH_DISPLAY_MS - elapsed);
      setTimeout(executeDissolve, remaining);
    }
  }

  // Injeção síncrona ultra-rápida de estado no <html> ao nível de document_start
  // (antes do DOM carregar). Com o tema ativo, esconde a página (je-xt-boot) até a
  // montagem terminar. O Splash com tela azul #0a2540 SÓ é ativado no momento do
  // logon inicial (je_logging_in === '1'). Em trocas normais de tela, a navegação é direta.
  try {
    if (localStorage.getItem('je_xt_theme_enabled') !== 'false') {
      document.documentElement.classList.add('je-xt-enabled', 'je-xt-boot');
      document.documentElement.classList.remove('je-xt-disabled');

      // Pré-cria a splash (fica oculta por padrão via CSS — só aparece com
      // .je-logging-in) já aqui, em QUALQUER página, não só quando já em
      // meio a um login. Isso dá tempo de sobra pro <img> do ícone
      // (icons/base.png) carregar e decodificar ANTES de a splash
      // precisar aparecer de verdade. Sem isso, a splash da TELA DE LOGIN
      // só era criada dentro de showSplash() (mountLoginPage, ao clicar em
      // "Entrar"), bem perto do beforeunload — o pedido do <img> não tinha
      // tempo de terminar antes da navegação começar e o ícone aparecia em
      // branco na splash que fica visível durante a transição (achado
      // real, 2026-09-22).
      injectBootSplash();

      if (sessionStorage.getItem('je_logging_in') === '1') {
        document.documentElement.classList.add('je-logging-in');
        document.documentElement.style.backgroundColor = '#0a2540';
        // Mesma legenda da splash da página anterior (persistida por
        // showSplash()) — ver comentário lá sobre o "pulo" que a legenda
        // padrão diferente causava no meio da transição.
        try {
          const savedTagline = sessionStorage.getItem('je_logging_in_tagline');
          if (savedTagline) {
            const tagEl = document.getElementById('je-boot-splash')?.querySelector('.je-boot-tagline');
            if (tagEl) tagEl.textContent = savedTagline;
          }
        } catch (e) {}
      }
    } else {
      document.documentElement.classList.add('je-xt-disabled');
      document.documentElement.classList.remove('je-xt-enabled');
    }
  } catch (e) {}

  // Válvula de segurança: nunca deixa a página escondida por mais de ~1.8s,
  // mesmo se a montagem falhar ou a URL não for uma página suportada (ou
  // uma tela transitória sem #container, ver o "return" sem reveal() em
  // init() abaixo). Melhor um flash raro do que travar a tela do usuário.
  // Levemente maior que antes (1.2s→1.8s): HAR real do fluxo "Acesso
  // Extranet" (SSO) mostrou uma tela intermediária que fica visível por
  // ~1-2s antes de redirecionar adiante — a folga extra ajuda o splash a
  // continuar cobrindo esse trecho em vez de revelar cedo demais.
  setTimeout(() => reveal(true), 1800);

  function init() {
    if (!document.body) return;

    // Se document.body já existe, sincroniza a classe imediatamente sem transição
    const isThemeEnabled = localStorage.getItem('je_xt_theme_enabled') !== 'false';
    if (isThemeEnabled) {
      document.body.classList.add('je-xt-enabled');
      document.body.classList.remove('je-xt-disabled');
    } else {
      document.body.classList.add('je-xt-disabled');
      document.body.classList.remove('je-xt-enabled');
    }

    // Aplica as preferências de aparência dos KPIs (chrome.storage → atributos
    // no <html>/<body>). Assíncrono, mas os cards só são injetados depois.
    if (window.JEPessoasSettings) window.JEPessoasSettings.load();

    // Páginas fora do shell padrão do portal (sem div#container) não têm
    // o que modernizar — mas NÃO revela na hora: telas transitórias do
    // fluxo de login (ex.: o retorno do SSO/RH-SSO em
    // .../jsp/rhsso/login-rhsso.jsp, sem #container) só ficam na tela por
    // um instante antes de redirecionar adiante, e revelar cedo demais
    // aqui deixava o usuário vendo a página nativa (ou em branco) daquele
    // instante em vez do splash continuar cobrindo. Só sai daqui sem
    // montar nada — quem revela é a válvula de segurança abaixo (ou uma
    // nova chamada de init() se essa mesma página navegar via SPA, o que
    // não é o caso aqui). Confirmado com HAR real: o tempo realmente
    // gasto no fluxo de "Acesso Extranet" (SSO) é majoritariamente TTFB
    // do backend (até a resposta começar a chegar) — isso nenhum content
    // script alcança, não tem documento pra rodar ainda.
    if (!document.getElementById('container')) {
      return;
    }

    const profileId = resolveProfileId();
    const isEspelhoMes = profileId === 'espelhoMes';
    const isEspelhoDia = profileId === 'espelhoDia';
    const isHeGestao = profileId === 'heGestaoChefes';

    // Carrega preferências salvas ou padrão (7h para JE/TSE, XT Ativo)
    chrome.storage?.local?.get({ targetHours: 7, xtThemeEnabled: true }, (items) => {
      const targetHours = items.targetHours || 7;
      const isEnabled = items.xtThemeEnabled !== false;

      // Executa toda a montagem do DOM em um único frame atômico do navegador.
      // requestAnimationFrame é pausado em abas em segundo plano — um fallback
      // por setTimeout garante a montagem mesmo assim (aba restaurada, etc.).
      // As funções de montagem são idempotentes, então rodar duas vezes é seguro.
      let mounted = false;
      const mountOnce = () => {
        if (mounted) return;
        mounted = true;
        mountXT();
      };
      requestAnimationFrame(mountOnce);
      setTimeout(mountOnce, 400);

      function mountXT() {
        // Montagem estrutural (topbar, formulário, tabela, KPIs) num
        // try/finally: reveal() tem que rodar mesmo se algo aqui lançar,
        // senão a página fica escondida até a válvula de segurança.
        try {
          if (window.JEPessoasModernizer) {
            window.JEPessoasModernizer.applyThemeState(isEnabled, false);
          }

          // Com o TSE XT desligado, NENHUMA modernização pode rodar — só o
          // interruptor flutuante precisa existir, pra dar pro usuário como
          // ligar de volta. createPersistentToggle() só adiciona um <aside>
          // novo (escondido via CSS quando ligado, ver
          // body.je-xt-disabled .je-persistent-toggle-bar em content.css) —
          // nunca move nó nativo nenhum. Já modernizeGenericMoldura(), por
          // exemplo, MOVE label/input nativos pra dentro de wrappers novos:
          // isso muda o layout mesmo sem nenhuma classe CSS aplicada (divs
          // são block por padrão), então não é seguro só "criar escondido"
          // — tem que nem rodar enquanto o tema estiver desligado.
          if (!isEnabled) {
            if (window.JEPessoasModernizer && window.JEPessoasModernizer.createPersistentToggle) {
              window.JEPessoasModernizer.createPersistentToggle();
            }
            return;
          }

          if (window.JEPessoasModernizer) {
            if (profileId === 'login') {
              // Tela de login (pré-autenticação): nenhuma parte da casca
              // autenticada faz sentido aqui (sem servidor logado, o menu
              // de serviços e a busca ficariam vazios/quebrados) — só um
              // embelezamento visual do próprio formulário nativo, via CSS
              // (ver .je-login-page em content.css). Nunca substitui nem
              // esconde os campos matrícula/senha ou os botões de
              // autenticação — só troca a classe do <body> que o CSS usa.
              window.JEPessoasModernizer.mountLoginPage();
            } else {
              // Casca genérica: topbar, banner de título, ícones de
              // calendário, ícones nativos de ação/status (detalhar/editar/
              // aprovar/excluir), contador de caracteres e destaque de
              // nomes de servidor/responsável já são agnósticos de página
              // (lêem o DOM nativo com fallback), rodam em qualquer tela
              // autenticada do portal (roadmap F1/F2/F5/F6/F7).
              window.JEPessoasModernizer.modernizeHeader();
              window.JEPessoasModernizer.injectPageTitleHeader(profileId);
              window.JEPessoasModernizer.modernizeCalendarIcons();
              window.JEPessoasModernizer.modernizeNativeIcons();
              window.JEPessoasModernizer.setupGenericCharCounters();
              window.JEPessoasModernizer.highlightUserAndManagerNames();

              // Modernização específica de página: formulário e tabela do
              // Espelho/Alteração de Ponto ainda são hardcoded (exigem as
              // classes de coluna h01-h17, motivo de esquecimento, moldura
              // de ajuste de ponto etc., que só essas duas telas têm) — só
              // rodam quando a página bate com um desses dois perfis.
              // Qualquer outra tela (incluindo perfis com lógica de negócio
              // própria mas sem tabela especial, ex.: heGestaoChefes) cai
              // nos modernizadores genéricos (roadmap F3/F5/F6): o botão de
              // busca vira o mesmo <button> moderno sem depender de função
              // Struts nenhuma, e a tabela é decorada por texto de
              // cabeçalho em vez de classe nativa.
              if (isEspelhoMes || isEspelhoDia) {
                window.JEPessoasModernizer.modernizeForm();
                window.JEPessoasModernizer.modernizeTable(targetHours);
              } else {
                window.JEPessoasModernizer.modernizeGenericFormButtons();
                window.JEPessoasModernizer.modernizeGenericMoldura();
                window.JEPessoasModernizer.setupSelectAutoSubmit();
                if (window.JEPessoasTableModernizer) window.JEPessoasTableModernizer.modernizeGenericTables();
              }

              // Depende da classificação acima (table.je-filter-table-card é
              // atribuída por modernizeGenericTables(), não é nativa do
              // portal) — por isso roda só depois do if/else, nunca antes.
              window.JEPessoasModernizer.modernizeFilterCardRefreshIcon();
            }
          }

          // Painel de KPI por servidor (Gestão de Serviço Extraordinário) —
          // depende da tabela #tbServidoresAutorizados já modernizada acima.
          if (isHeGestao && window.JEPessoasHeGestaoKpi) {
            window.JEPessoasHeGestaoKpi.mount();
          }

          // Extrai e Injeta KPIs (Apenas para Espelho de Ponto Mensal)
          if (isEspelhoMes && window.JEPessoasKPI && window.JEPessoasModernizer) {
            const renderKpis = (heAut) => {
              const kpis = window.JEPessoasKPI.extractKPIs(targetHours, { heAutorizado: heAut });
              if (kpis) window.JEPessoasModernizer.injectKPICards(kpis);
            };

            // Hora extra autorizada do mês: única fonte é o SAEX (backend do ícone
            // de relógio) — não existe opção pro servidor definir a própria meta.
            // A consulta ao SAEX é assíncrona e pode levar um instante (raspa um
            // dia por autorização) — a 1ª pintura já avisa "carregando" pro card
            // mostrar um spinner no lugar do denominador em vez de sumir com ele.
            // Roda em segundo plano (após a revelação) — é um refinamento do card,
            // não faz parte da montagem estrutural que precisa ficar escondida.
            const HEF = window.JEPessoasHEAuthFetch;
            if (HEF) {
              renderKpis({ loading: true });
              const mat = HEF.getMatricula();
              const mk = HEF.getMonthKey();
              HEF.getForCurrentMonth(mat, mk, {}, (saex) => {
                renderKpis(saex && (saex.wkSatMin || saex.sunHolMin)
                  ? { wkSatMin: saex.wkSatMin, sunHolMin: saex.sunHolMin, source: 'saex' }
                  : null);
              });
            } else {
              renderKpis(null);
            }
          }
        } finally {
          reveal();
        }

        // Inicializa modais e atalhos — nenhum faz sentido pré-autenticação
        // (menu de serviços e busca indexam telas que o usuário ainda não
        // pode acessar), então não rodam na tela de login.
        if (profileId !== 'login') {
          if (window.JEPessoasSearch) window.JEPessoasSearch.init();
          if (window.JEPessoasQuickActions) window.JEPessoasQuickActions.init();
          if (window.JEPessoasNavDrawer) window.JEPessoasNavDrawer.init();
          if (window.JEPessoasPointModal) window.JEPessoasPointModal.init();
          if (window.JEPessoasDetailModal) window.JEPessoasDetailModal.init();
          if (window.JEPessoasHEAuthModal) window.JEPessoasHEAuthModal.init();
          if (window.JEPessoasReembolsoFarmaceutico) window.JEPessoasReembolsoFarmaceutico.init();
          if (isEspelhoMes && window.JEPessoasLostHours) window.JEPessoasLostHours.init();

          // Aviso de aplicação experimental (1º uso e a cada atualização de versão)
          if (window.JEPessoasVersion) window.JEPessoasVersion.maybeShowDisclaimer();
        }
      }
    });
  }

  // Executa no DOMContentLoaded ou imediatamente se já carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Detecta e corrige uma corrida rara: o TSE XT pode montar (criar a
  // topbar e a barra de KPIs) ANTES de o portal terminar de preencher as
  // linhas da tabela. O cabeçalho sintético "SALDO ACUM." chega a ser
  // criado, mas nenhuma célula de dado — e como .je-kpi-dashboard já
  // existe, nada indicava que a modernização ficou pela metade (isso
  // também desalinha colunas nativas seguintes: o botão de hora extra do
  // h17 passa a cair visualmente em cima da coluna Ocorrência).
  // dateCellCount vs. accumCellCount detecta esse descompasso (tolera até
  // 2 de diferença — linhas h01 legitimamente em branco); staleRetries
  // limita as re-tentativas pra não virar loop se o mês realmente não
  // tiver dias com data válida.
  let staleRetries = 0;
  const MAX_STALE_RETRIES = 5;
  function checkStaleAndRetry() {
    // Com o tema desligado a topbar nunca é criada (de propósito — ver
    // mountXT()), então "!hasTopBar" abaixo seria sempre verdadeiro e
    // chamaria init() a cada mutação da página pra sempre. Sair cedo aqui
    // evita esse loop inútil enquanto o TSE XT estiver desligado.
    if (localStorage.getItem('je_xt_theme_enabled') === 'false') return;

    // Mesmo problema na tela de LOGIN (pré-autenticação): mountLoginPage()
    // nunca cria `.je-topbar` (não faz sentido nessa tela, ver o perfil
    // 'login' em PAGE_PROFILES) — então "!hasTopBar" também seria sempre
    // verdadeiro aqui, chamando init() (com um round-trip assíncrono de
    // chrome.storage.local.get a cada vez) em TODA mutação do DOM da
    // página, pra sempre, sem nenhum teto (staleRetries só conta a branch
    // isStale, não esta). A tela de login/captcha do hCaptcha gera muitas
    // mutações no frame principal enquanto verifica/atualiza o token
    // (mesmo frame onde este content script roda) — vira uma enxurrada de
    // chamadas que trava a aba inteira. Achado ao vivo (2026-09-22): com a
    // TSE XT ligada, a aba de login ficava 100% de CPU e sem resposta por
    // vários minutos depois do hCaptcha validar; com a TSE XT desligada
    // (que já cai no early-return acima) o mesmo fluxo levava poucos
    // segundos. Sai cedo aqui pelo mesmo motivo do early-return acima.
    if (resolveProfileId() === 'login') return;

    const tableMes = document.getElementById('tblEspelhoPontoMesCorrente');
    const hasTopBar = !!document.querySelector('.je-topbar');
    const hasKpiDash = !!document.querySelector('.je-kpi-dashboard');
    const dateCellCount = tableMes ? tableMes.querySelectorAll('td.h01').length : 0;
    const accumCellCount = tableMes ? tableMes.querySelectorAll('td.je-col-accumulated-balance').length : 0;
    const isStale = tableMes && dateCellCount > 0 && (dateCellCount - accumCellCount) > 2 && staleRetries < MAX_STALE_RETRIES;
    if ((tableMes && !hasKpiDash) || !hasTopBar || isStale) {
      if (isStale) staleRetries++;
      init();
    }

    // Página genérica: uma tabela de resultados recarregada via AJAX (filtro
    // que volta vazio e depois com dados, ou vice-versa) precisa ser
    // re-classificada — senão fica o <thead> cinza nativo. modernizeGenericTables()
    // é idempotente e barato; só faz trabalho real se achar um grid ainda cru.
    if (hasTopBar && !tableMes && window.JEPessoasTableModernizer) {
      const crua = document.querySelector('#container table:not(.je-modernized-table):not(.je-topbar)');
      if (crua && (crua.tHead || (crua.rows[0] && crua.rows[0].cells.length > 1 &&
          Array.prototype.every.call(crua.rows[0].cells, function (c) { return c.tagName === 'TH'; })))) {
        try { window.JEPessoasTableModernizer.modernizeGenericTables(); } catch (e) {}
      }
    }
  }

  // Observador para caso a tabela/formulário seja recarregado via Ajax/Struts
  // sem refresh total (e como um dos gatilhos de checkStaleAndRetry).
  const observer = new MutationObserver(checkStaleAndRetry);

  // O observer só reage a NOVAS mutações — se a tabela terminar de carregar
  // num único lote e depois ficar quieta, nenhuma mutação nova dispara o
  // callback pra pegar o descompasso. Por isso também checamos de forma
  // ativa, algumas vezes, nos primeiros segundos após o carregamento.
  [800, 1600, 3000].forEach((delay) => setTimeout(checkStaleAndRetry, delay));

  // Causa raiz mais comum do descompasso: a aba está em segundo plano
  // (document.hidden) quando a montagem roda — innerText não é computado
  // pra elementos de uma aba oculta (o navegador pula o layout pra
  // economizar recurso), então a leitura de data/cabeçalho em
  // modernizeTable() encontra tudo em branco e a modernização "trava" com
  // zero linhas processadas. Nenhuma re-tentativa ajuda enquanto a aba
  // seguir oculta — só reavaliar quando ela volta a ficar visível resolve.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkStaleAndRetry();
  });
  // Rede extra: em alguns fluxos (troca de janela do SO, não só de aba) o
  // Chrome dispara focus sem um visibilitychange correspondente.
  window.addEventListener('focus', checkStaleAndRetry);

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }
})();
