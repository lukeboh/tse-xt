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

            // Hora extra autorizada do mês: SAEX (backend do ícone de relógio) como
            // fonte primária; o valor manual do editor (⚙) tem prioridade quando existe.
            // Roda em segundo plano (após a revelação) — é um refinamento do card,
            // não faz parte da montagem estrutural que precisa ficar escondida.
            const HE = window.JEPessoasHEAuth;
            const HEF = window.JEPessoasHEAuthFetch;
            if (HE) {
              const mat = HE.getMatricula();
              const mk = HE.getMonthKey();
              HE.getEntry(mat, mk, (manual) => {
                const hasManual = manual && (manual.wkSatMin || manual.sunHolMin);
                if (hasManual) {
                  renderKpis({ wkSatMin: manual.wkSatMin, sunHolMin: manual.sunHolMin, source: 'manual' });
                }
                if (HEF) {
                  HEF.getForCurrentMonth(mat, mk, {}, (saex) => {
                    if (hasManual || !saex || !(saex.wkSatMin || saex.sunHolMin)) return;
                    renderKpis({ wkSatMin: saex.wkSatMin, sunHolMin: saex.sunHolMin, source: 'saex' });
                  });
                }
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

  // Observador para caso a tabela/formulário seja recarregado via Ajax/Struts sem refresh total
  const observer = new MutationObserver(() => {
    const tableMes = document.getElementById('tblEspelhoPontoMesCorrente');
    const hasTopBar = !!document.querySelector('.je-topbar');
    if ((tableMes && !document.querySelector('.je-kpi-dashboard')) || !hasTopBar) {
      init();
    }
  });

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
