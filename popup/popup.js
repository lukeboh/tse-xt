document.addEventListener('DOMContentLoaded', () => {
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const btnReload = document.getElementById('btnReload');

  // Carrega configuração salva
  chrome.storage?.local?.get({ targetHours: 7 }, (items) => {
    const savedHours = items.targetHours || 7;
    segmentBtns.forEach((btn) => {
      if (parseInt(btn.getAttribute('data-hours'), 10) === savedHours) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });

  // Alterna configuração de jornada
  segmentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const hours = parseInt(btn.getAttribute('data-hours'), 10);
      chrome.storage?.local?.set({ targetHours: hours });
    });
  });

  // Botão de recarregar a aba ativa
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
