document.addEventListener('DOMContentLoaded', () => {
  const popupVersion = document.getElementById('popupVersion');
  if (popupVersion && chrome.runtime?.getManifest) {
    popupVersion.textContent = 'v' + chrome.runtime.getManifest().version;
  }

  // Preferências de aparência do painel de KPIs (lidas pelo content script em
  // content/modules/settings.js via chrome.storage.local).
  const DEFAULTS = { kpiCardStyle: 'flat', kpiCardEmphasis: 'glow' };
  const VALUES = {
    kpiCardStyle: ['flat', 'gradient'],
    kpiCardEmphasis: ['soft', 'glow']
  };

  function paint(key, value) {
    const ctrl = document.querySelector(`.segmented-control[data-setting="${key}"]`);
    if (!ctrl) return;
    ctrl.querySelectorAll('.segment-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-value') === value);
    });
  }

  chrome.storage?.local?.get(DEFAULTS, (items) => {
    Object.keys(DEFAULTS).forEach((k) => {
      const v = VALUES[k].indexOf(items[k]) >= 0 ? items[k] : DEFAULTS[k];
      paint(k, v);
    });
  });

  document.querySelectorAll('.segmented-control[data-setting]').forEach((ctrl) => {
    const key = ctrl.getAttribute('data-setting');
    ctrl.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        paint(key, value);
        chrome.storage?.local?.set({ [key]: value });
      });
    });
  });

  const btnReload = document.getElementById('btnReload');
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);
          window.close();
        }
      });
    });
  }
});
