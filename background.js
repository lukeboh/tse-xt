/**
 * TSE XT - Service Worker de Background e Gerenciador de Ciclo de Vida (MV3)
 */

const MEU_ESPACO_URL_PATTERNS = [
  '*://meuespaco.tse.jus.br/portalservidor2/*',
  '*://*.tse.jus.br/portalservidor2/*'
];

const SPT_URL_PATTERNS = [
  '*://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/*',
  '*://*.tse.jus.br/spt-consultafrequencia/*'
];

const SUPPORTED_PORTAL_URL_PATTERNS = [
  ...MEU_ESPACO_URL_PATTERNS,
  ...SPT_URL_PATTERNS
];

function isDevelopmentInstall() {
  try {
    const manifest = chrome.runtime?.getManifest ? chrome.runtime.getManifest() : {};
    return !('update_url' in manifest);
  } catch (_) {
    return false;
  }
}

function isSupportedPortalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    const isTseHost = host === 'meuespaco.tse.jus.br'
      || host === 'spt-consultafrequencia.tse.jus.br'
      || host.endsWith('.tse.jus.br');
    if (!isTseHost) return false;
    return parsed.pathname.startsWith('/portalservidor2/')
      || parsed.pathname === '/portalservidor2'
      || parsed.pathname.startsWith('/spt-consultafrequencia/')
      || parsed.pathname === '/spt-consultafrequencia';
  } catch (_) {
    return /^https?:\/\/(?:[a-z0-9-]+\.)*tse\.jus\.br\/(?:portalservidor2|spt-consultafrequencia)(?:\/|$)/i.test(url);
  }
}

function isSptPortalUrl(url) {
  return isSupportedPortalUrl(url) && /\/spt-consultafrequencia(?:\/|$)/i.test(String(url || ''));
}

function safeReloadOrNotifyTab(tabId, url, reason) {
  if (!tabId) return;
  const isSpt = isSptPortalUrl(url);
  const doReloadOrNotify = (running) => {
    if (running) {
      if (chrome.tabs?.sendMessage) {
        chrome.tabs.sendMessage(tabId, {
          action: 'extensionUpdatedBanner',
          version: chrome.runtime?.getManifest?.()?.version || ''
        }, () => { void chrome.runtime?.lastError; });
      }
      return;
    }
    if (isSpt && reason !== 'install') {
      if (chrome.tabs?.sendMessage) {
        chrome.tabs.sendMessage(tabId, {
          action: 'extensionUpdatedBanner',
          version: chrome.runtime?.getManifest?.()?.version || ''
        }, () => { void chrome.runtime?.lastError; });
      }
      return;
    }
    if (!/EspelhoPonto/i.test(url || '')) {
      chrome.tabs?.reload?.(tabId);
    }
  };

  if (chrome.tabs?.sendMessage) {
    chrome.tabs.sendMessage(tabId, { action: 'isReportRunning' }, (resp) => {
      const hasErr = !!(chrome.runtime && chrome.runtime.lastError);
      const isRunning = !hasErr && Boolean(resp && resp.running);
      doReloadOrNotify(isRunning);
    });
  } else {
    doReloadOrNotify(false);
  }
}

// Ao instalar ou atualizar a extensão (E2):
// - nunca recarrega uma aba com relatório em andamento;
// - no SPT, só recarrega no motivo 'install' (em 'update', exibe aviso discreto na aba).
chrome.runtime.onInstalled.addListener((details) => {
  const reason = (details && details.reason) || 'update';
  console.log('[TSE XT] Extensão instalada/atualizada para v' + chrome.runtime.getManifest().version, details);

  chrome.tabs?.query({ url: SUPPORTED_PORTAL_URL_PATTERNS }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        if (tab.id) {
          safeReloadOrNotifyTab(tab.id, tab.url || '', reason);
        }
      });
    }
  });
});

// Listener para receber comandos de recarregamento (C3, E3)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'reloadExtension') {
    if (!isDevelopmentInstall()) {
      if (sendResponse) sendResponse({ status: 'forbidden_in_production' });
      return true;
    }
    chrome.runtime.reload();
    if (sendResponse) sendResponse({ status: 'reloading' });
  } else if (message && message.action === 'reloadActiveTab') {
    const ownExtensionId = chrome.runtime?.id;
    if (!sender || !ownExtensionId || sender.id !== ownExtensionId) {
      if (sendResponse) sendResponse({ status: 'forbidden_sender' });
      return true;
    }
    const senderTabUrl = sender.tab && sender.tab.url ? sender.tab.url : '';
    if (sender.tab && !isSupportedPortalUrl(senderTabUrl)) {
      if (sendResponse) sendResponse({ status: 'unsupported_portal' });
      return true;
    }
    if (sender.tab && sender.tab.id && isSupportedPortalUrl(senderTabUrl)) {
      chrome.tabs.reload(sender.tab.id);
      if (sendResponse) sendResponse({ status: 'reloaded' });
      return true;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id || !isSupportedPortalUrl(activeTab.url || '')) {
        if (sendResponse) sendResponse({ status: 'unsupported_portal' });
        return;
      }
      chrome.tabs.reload(activeTab.id);
      if (sendResponse) sendResponse({ status: 'reloaded' });
    });
  }
  return true;
});
