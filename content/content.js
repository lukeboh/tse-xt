/**
 * JE Pessoas XT - Script Principal de Inicialização (Content Script v0.1.8)
 */

(function () {
  'use strict';

  function init() {
    // Restringe estritamente para a página do Espelho de Ponto
    const isEspelhoPontoPage = window.location.href.includes('EspelhoPontoMesAction') || !!document.getElementById('tblEspelhoPontoMesCorrente');
    if (!isEspelhoPontoPage) {
      return;
    }

    // Carrega preferências salvas ou padrão (7h para JE/TSE, XT Ativo)
    chrome.storage?.local?.get({ targetHours: 7, xtThemeEnabled: true }, (items) => {
      const targetHours = items.targetHours || 7;
      const isEnabled = items.xtThemeEnabled !== false;

      // 1. Aplica classe de estado de tema no body e moderniza estrutura
      if (window.JEPessoasModernizer) {
        window.JEPessoasModernizer.applyThemeState(isEnabled);
        window.JEPessoasModernizer.modernizeHeader();
        window.JEPessoasModernizer.injectPageTitleHeader();
        window.JEPessoasModernizer.modernizeForm();
        window.JEPessoasModernizer.modernizeTable();
      }

      // 2. Extrai e Injeta KPIs
      if (window.JEPessoasKPI && window.JEPessoasModernizer) {
        const kpis = window.JEPessoasKPI.extractKPIs(targetHours);
        if (kpis) {
          window.JEPessoasModernizer.injectKPICards(kpis);
        }
      }

      // 3. Inicializa Barra de Busca Textual / Command Palette
      if (window.JEPessoasSearch) {
        window.JEPessoasSearch.init();
      }

      // 4. Inicializa Barra Flutuante de Ações Rápidas
      if (window.JEPessoasQuickActions) {
        window.JEPessoasQuickActions.init();
      }

      // 5. Inicializa Drawer de Serviços
      if (window.JEPessoasNavDrawer) {
        window.JEPessoasNavDrawer.init();
      }
    });
  }

  // Executa após o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Observador para caso a tabela seja recarregada via Ajax/Struts sem refresh total
  const observer = new MutationObserver(() => {
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (table && !document.querySelector('.je-kpi-dashboard')) {
      init();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
