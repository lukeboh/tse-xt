/**
 * JE Pessoas XT - Script Principal de Inicialização (Content Script v0.1.8)
 */

(function () {
  'use strict';

  // Anti-FOUC: revela a página (remove je-xt-boot) uma única vez. Chamada ao
  // fim da montagem estrutural e por uma válvula de segurança abaixo, para
  // nunca deixar a tela escondida caso algo falhe.
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    document.documentElement.classList.remove('je-xt-boot');
  }

  // Injeção síncrona ultra-rápida de estado no <html> ao nível de document_start
  // (antes do DOM carregar). Com o tema ativo, também esconde a página inteira
  // (je-xt-boot, ver content.css) até a montagem terminar — o usuário nunca
  // chega a ver o layout nativo do portal por um instante antes da
  // transformação do TSE XT (topbar, KPIs, tabela modernizada).
  try {
    if (localStorage.getItem('je_xt_theme_enabled') !== 'false') {
      document.documentElement.classList.add('je-xt-enabled', 'je-xt-boot');
      document.documentElement.classList.remove('je-xt-disabled');
    } else {
      document.documentElement.classList.add('je-xt-disabled');
      document.documentElement.classList.remove('je-xt-enabled');
    }
  } catch (e) {}

  // Válvula de segurança: nunca deixa a página escondida por mais de ~1.2s,
  // mesmo se a montagem falhar ou a URL não for uma página suportada.
  // Melhor um flash raro do que travar a tela do usuário.
  setTimeout(reveal, 1200);

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

    // Detecta as páginas suportadas pelo TSE XT (Espelho Mensal e Alteração de Ponto Diária)
    const isEspelhoMes = window.location.href.includes('EspelhoPontoMesAction') || !!document.getElementById('tblEspelhoPontoMesCorrente');
    const isEspelhoDia = window.location.href.includes('EspelhoPontoDiaAction') || !!document.getElementById('formEspelhoPontoDia');
    const isSupportedPage = isEspelhoMes || isEspelhoDia;

    if (!isSupportedPage) {
      reveal();
      return;
    }

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
            window.JEPessoasModernizer.modernizeHeader();
            window.JEPessoasModernizer.injectPageTitleHeader();
            window.JEPessoasModernizer.modernizeForm();
            window.JEPessoasModernizer.modernizeTable(targetHours);
          }

          // Extrai e Injeta KPIs (Apenas para Espelho de Ponto Mensal)
          if (isEspelhoMes && window.JEPessoasKPI && window.JEPessoasModernizer) {
            const renderKpis = (heAut) => {
              const kpis = window.JEPessoasKPI.extractKPIs(targetHours, { heAutorizado: heAut });
              if (kpis) window.JEPessoasModernizer.injectKPICards(kpis);
            };
            renderKpis(null);

            // Hora extra autorizada do mês: única fonte é o SAEX (backend do ícone
            // de relógio) — não existe opção pro servidor definir a própria meta.
            // Roda em segundo plano (após a revelação) — é um refinamento do card,
            // não faz parte da montagem estrutural que precisa ficar escondida.
            const HEF = window.JEPessoasHEAuthFetch;
            if (HEF) {
              const mat = HEF.getMatricula();
              const mk = HEF.getMonthKey();
              HEF.getForCurrentMonth(mat, mk, {}, (saex) => {
                if (!saex || !(saex.wkSatMin || saex.sunHolMin)) return;
                renderKpis({ wkSatMin: saex.wkSatMin, sunHolMin: saex.sunHolMin, source: 'saex' });
              });
            }
          }
        } finally {
          reveal();
        }

        // Inicializa modais e atalhos
        if (window.JEPessoasSearch) window.JEPessoasSearch.init();
        if (window.JEPessoasQuickActions) window.JEPessoasQuickActions.init();
        if (window.JEPessoasNavDrawer) window.JEPessoasNavDrawer.init();
        if (window.JEPessoasPointModal) window.JEPessoasPointModal.init();
        if (isEspelhoMes && window.JEPessoasLostHours) window.JEPessoasLostHours.init();

        // Aviso de aplicação experimental (1º uso e a cada atualização de versão)
        if (window.JEPessoasVersion) window.JEPessoasVersion.maybeShowDisclaimer();
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
