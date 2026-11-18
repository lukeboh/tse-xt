/**
 * TSE XT - Service Worker de Background e Gerenciador de Ciclo de Vida (MV3)
 */

const SUPPORTED_PORTAL_URL_PATTERNS = [
  '*://meuespaco.tse.jus.br/portalservidor2/*',
  '*://*.tse.jus.br/portalservidor2/*',
  '*://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/*',
  '*://*.tse.jus.br/spt-consultafrequencia/*'
];

function isDevelopmentInstall() {
  try {
    const manifest = chrome.runtime?.getManifest ? chrome.runtime.getManifest() : {};
    return !('update_url' in manifest);
  } catch (_) {
    return false;
  }
}

// Ao instalar ou atualizar a extensão, recarrega apenas as abas abertas dos portais suportados (Meu Espaço e SPT)
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[TSE XT] Extensão atualizada para v' + chrome.runtime.getManifest().version, details);

  chrome.tabs?.query({ url: SUPPORTED_PORTAL_URL_PATTERNS }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        if (tab.id && !/EspelhoPonto/i.test(tab.url || '')) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
  });
});

// Listener para receber comandos de recarregamento
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'reloadExtension') {
    if (!isDevelopmentInstall()) {
      if (sendResponse) sendResponse({ status: 'forbidden_in_production' });
      return true;
    }
    chrome.runtime.reload();
    if (sendResponse) sendResponse({ status: 'reloading' });
  } else if (message && message.action === 'reloadActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
    if (sendResponse) sendResponse({ status: 'reloaded' });
  }
  return true;
});
