/**
 * TSE XT - Controle Compartilhado de Alternância de Tema e Interruptor Persistente
 *
 * Extraído de domModernizer.js para ser compartilhado entre o Meu Espaço
 * e o SPT (Gestão de Frequência) sem carregar o modernizador legado do
 * Meu Espaço nas páginas do SPT.
 */

window.JEPessoasXtToggle = (function () {
  'use strict';

  function isAnyReportRunning() {
    return Boolean(
      (window.JEPessoasSptReport && window.JEPessoasSptReport.isRunning && window.JEPessoasSptReport.isRunning())
      || (window.JEPessoasRecognitionReport && window.JEPessoasRecognitionReport.isRunning && window.JEPessoasRecognitionReport.isRunning())
      || (window.JEPessoasPayrollAudit && window.JEPessoasPayrollAudit.isRunning && window.JEPessoasPayrollAudit.isRunning())
      || (window.JEPessoasLostHours && window.JEPessoasLostHours.isRunning && window.JEPessoasLostHours.isRunning())
    );
  }

  let pendingReloadTimer = null;
  function reloadAfterThemeToggle() {
    if (pendingReloadTimer) {
      clearTimeout(pendingReloadTimer);
      pendingReloadTimer = null;
    }
    if (isAnyReportRunning()) {
      const waitUntilIdle = () => {
        if (isAnyReportRunning()) {
          pendingReloadTimer = setTimeout(waitUntilIdle, 400);
          return;
        }
        pendingReloadTimer = null;
        window.location.reload();
      };
      pendingReloadTimer = setTimeout(waitUntilIdle, 400);
      return;
    }
    pendingReloadTimer = setTimeout(() => {
      pendingReloadTimer = null;
      window.location.reload();
    }, 250);
  }

  function applyThemeState(enabled, isExplicitUserToggle = false) {
    if (isExplicitUserToggle) {
      document.body.classList.add('je-theme-transitioning');
      setTimeout(() => {
        document.body.classList.remove('je-theme-transitioning');
      }, 450);
    } else {
      document.body.classList.remove('je-theme-transitioning');
    }

    if (enabled) {
      document.body.classList.add('je-xt-enabled');
      document.body.classList.remove('je-xt-disabled');
      document.documentElement.classList.add('je-xt-enabled');
      document.documentElement.classList.remove('je-xt-disabled');
      try { localStorage.setItem('je_xt_theme_enabled', 'true'); } catch (e) {}
    } else {
      document.body.classList.add('je-xt-disabled');
      document.body.classList.remove('je-xt-enabled');
      document.documentElement.classList.add('je-xt-disabled');
      document.documentElement.classList.remove('je-xt-enabled');
      try { localStorage.setItem('je_xt_theme_enabled', 'false'); } catch (e) {}
    }

    const toggleLabels = document.querySelectorAll('.je-toggle-label');
    toggleLabels.forEach((label) => {
      label.innerHTML = enabled ? '✨ <strong>TSE XT</strong> Ativo' : '🏛️ <strong>TSE XT</strong> Desligado';
    });
  }

  function createPersistentToggle() {
    if (document.getElementById('je-persistent-toggle-bar')) return;

    const toggleBar = document.createElement('aside');
    toggleBar.id = 'je-persistent-toggle-bar';
    toggleBar.className = 'je-persistent-toggle-bar';
    toggleBar.setAttribute('aria-label', 'Controle Visual TSE XT');

    toggleBar.innerHTML = `
      <div class="je-toggle-container je-floating-toggle" id="je-theme-toggle-floating" title="Clique para alternar para o visual moderno TSE XT">
        <span class="je-toggle-label">🏛️ <strong>TSE XT</strong> Desligado</span>
        <div class="je-toggle-switch"></div>
      </div>
    `;

    document.body.appendChild(toggleBar);

    const toggleWrapper = toggleBar.querySelector('#je-theme-toggle-floating');
    if (toggleWrapper) {
      toggleWrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyEnabled = document.body.classList.contains('je-xt-enabled');
        const nextState = !currentlyEnabled;

        applyThemeState(nextState, true);
        const isSpt = window.location.pathname.includes('/spt-consultafrequencia') || !!document.querySelector('header.navbar-custom');
        const payload = isSpt
          ? { xtEnabledSpt: nextState }
          : { xtThemeEnabled: nextState, xtEnabledMeuEspaco: nextState };
        chrome.storage?.local?.set(payload, () => {
          reloadAfterThemeToggle();
        });
      });
    }
  }

  return {
    isAnyReportRunning,
    reloadAfterThemeToggle,
    applyThemeState,
    createPersistentToggle
  };
})();
