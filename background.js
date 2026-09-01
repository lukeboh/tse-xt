/**
 * TSE XT - Service Worker de Background e Gerenciador de Ciclo de Vida (MV3)
 */

// Ao instalar ou atualizar a extensão, recarrega automaticamente as abas abertas dos portais do TSE
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[TSE XT] Extensão atualizada para v' + chrome.runtime.getManifest().version, details);

  chrome.tabs?.query({ url: ['*://meuespaco.tse.jus.br/*', '*://*.tse.jus.br/*'] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
  });
});

// Listener para receber comandos de recarregamento
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reloadExtension') {
    chrome.runtime.reload();
    if (sendResponse) sendResponse({ status: 'reloading' });
  } else if (message.action === 'reloadActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
    if (sendResponse) sendResponse({ status: 'reloaded' });
  }
  return true;
});
