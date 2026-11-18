document.addEventListener('DOMContentLoaded', () => {
  const popupVersion = document.getElementById('popupVersion');
  if (popupVersion && chrome.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    popupVersion.textContent = 'v' + (manifest.version_name || manifest.version);
  }

  // Preferências de aparência do painel de KPIs e chaves habilitadoras por portal
  const DEFAULTS = {
    kpiCardStyle: 'flat',
    kpiCardEmphasis: 'glow',
    navMenuMode: 'hover',
    xtThemeEnabled: true,
    xtEnabledMeuEspaco: null,
    xtEnabledSpt: true
  };
  const VALUES = {
    kpiCardStyle: ['flat', 'gradient'],
    kpiCardEmphasis: ['soft', 'glow'],
    navMenuMode: ['hover', 'click']
  };

  function paintSegment(key, value) {
    const ctrl = document.querySelector(`.segmented-control[data-setting="${key}"]`);
    if (!ctrl) return;
    ctrl.querySelectorAll('.segment-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-value') === value);
    });
  }

  function paintPortalStatus(portalKey, enabled) {
    const isMeuEspaco = portalKey === 'xtEnabledMeuEspaco';
    const toggle = document.getElementById(isMeuEspaco ? 'toggleMeuEspaco' : 'toggleSpt');
    const pill = document.getElementById(isMeuEspaco ? 'statusMeuEspaco' : 'statusSpt');
    if (toggle) toggle.checked = !!enabled;
    if (pill) {
      pill.textContent = enabled ? 'Ativo' : 'Desligado';
      pill.classList.toggle('is-off', !enabled);
    }
  }

  chrome.storage?.local?.get(DEFAULTS, (items) => {
    Object.keys(VALUES).forEach((k) => {
      const v = VALUES[k].indexOf(items[k]) >= 0 ? items[k] : DEFAULTS[k];
      paintSegment(k, v);
    });

    const meuEspacoEnabled = items.xtEnabledMeuEspaco !== null && items.xtEnabledMeuEspaco !== undefined
      ? items.xtEnabledMeuEspaco !== false
      : items.xtThemeEnabled !== false;
    const sptEnabled = items.xtEnabledSpt !== false;

    paintPortalStatus('xtEnabledMeuEspaco', meuEspacoEnabled);
    paintPortalStatus('xtEnabledSpt', sptEnabled);
  });

  // Alternância de chave habilitadora por portal
  document.querySelectorAll('input[data-portal-key]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-portal-key');
      const enabled = !!input.checked;
      paintPortalStatus(key, enabled);
      const payload = { [key]: enabled };
      if (key === 'xtEnabledMeuEspaco') {
        payload.xtThemeEnabled = enabled;
      }
      chrome.storage?.local?.set(payload);
    });
  });

  // Links de acesso rápido a cada portal suportado
  document.querySelectorAll('a.portal-link[data-portal-url]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const url = link.getAttribute('data-portal-url');
      if (!url || !chrome.tabs?.create) return;
      e.preventDefault();
      chrome.tabs.create({ url });
      window.close();
    });
  });

  document.querySelectorAll('.segmented-control[data-setting]').forEach((ctrl) => {
    const key = ctrl.getAttribute('data-setting');
    ctrl.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        paintSegment(key, value);
        chrome.storage?.local?.set({ [key]: value });
      });
    });
  });

  const btnReload = document.getElementById('btnReload');
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        const proceedReload = () => {
          chrome.tabs.reload(tabId);
          window.close();
        };
        if (!chrome.tabs.sendMessage) {
          proceedReload();
          return;
        }
        chrome.tabs.sendMessage(tabId, { action: 'isReportRunning' }, (resp) => {
          if (chrome.runtime?.lastError || !resp || !resp.running) {
            proceedReload();
            return;
          }
          if (window.confirm('Um relatório está sendo gerado nesta aba. Deseja interromper a geração e recarregar a página agora?')) {
            proceedReload();
          }
        });
      });
    });
  }
});
