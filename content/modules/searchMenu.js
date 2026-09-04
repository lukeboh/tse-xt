/**
 * JE Pessoas XT - Menu de Busca Textual Rápida e Command Palette (Ctrl+K)
 */

window.JEPessoasSearch = (function () {
  'use strict';

  let searchItems = [];
  let modalOverlay = null;
  let modalInput = null;
  let modalResults = null;
  let selectedIndex = 0;

  function executePageScript(scriptCode) {
    if (!scriptCode) return;
    try {
      const script = document.createElement('script');
      script.textContent = scriptCode;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (err) {
      console.error('Erro ao executar script da página:', err);
    }
  }

  function buildSearchIndex() {
    searchItems = [
      {
        title: '⚡ Ajustar Meu Ponto (Hoje)',
        category: 'Ações Rápidas',
        action: () => {
          const now = new Date();
          const todayFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          if (window.JEPessoasPointModal) {
            window.JEPessoasPointModal.openModalForDate(todayFormatted);
          }
        }
      },
      {
        title: '⚠️ Auditoria de Horas Perdidas',
        category: 'Ações Rápidas',
        action: () => {
          if (window.JEPessoasLostHours) {
            window.JEPessoasLostHours.open();
          }
        }
      },
      {
        title: 'Frequência - Alteração de Ponto',
        category: 'Navegação',
        action: () => {
          window.location.href = '/portalservidor2/EspelhoPontoDiaAction_consultar.action';
        }
      },
      {
        title: 'Espelho de Ponto - Mês Atual',
        category: 'Navegação',
        action: () => {
          const now = new Date();
          const mesSelect = document.getElementById('mesSelecionado');
          const anoSelect = document.getElementById('anoSelecionado');
          if (mesSelect && anoSelect) {
            mesSelect.value = String(now.getMonth() + 1);
            anoSelect.value = String(now.getFullYear());
            executePageScript('if (typeof formEspelhoPontoMes_consultar === "function") { formEspelhoPontoMes_consultar(); } else { window.location.reload(); }');
          }
        }
      },
      {
        title: 'Rolar até o Dia de Hoje',
        category: 'Ações Rápidas',
        action: () => {
          const todayRow = document.querySelector('.je-row-today');
          if (todayRow) {
            todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            todayRow.style.outline = '2px solid var(--je-primary-light)';
            setTimeout(() => { todayRow.style.outline = ''; }, 2000);
          }
        }
      },
      {
        title: 'Consultar Mês Anterior',
        category: 'Filtro',
        action: () => {
          const mesSelect = document.getElementById('mesSelecionado');
          if (mesSelect) {
            let cur = parseInt(mesSelect.value, 10);
            if (cur > 1) {
              mesSelect.value = String(cur - 1);
            } else {
              mesSelect.value = '12';
              const anoSelect = document.getElementById('anoSelecionado');
              if (anoSelect) anoSelect.value = String(parseInt(anoSelect.value, 10) - 1);
            }
            executePageScript('if (typeof formEspelhoPontoMes_consultar === "function") { formEspelhoPontoMes_consultar(); } else { window.location.reload(); }');
          }
        }
      },
      {
        title: 'Consultar Próximo Mês',
        category: 'Filtro',
        action: () => {
          const mesSelect = document.getElementById('mesSelecionado');
          if (mesSelect) {
            let cur = parseInt(mesSelect.value, 10);
            if (cur < 12) {
              mesSelect.value = String(cur + 1);
            } else {
              mesSelect.value = '1';
              const anoSelect = document.getElementById('anoSelecionado');
              if (anoSelect) anoSelect.value = String(parseInt(anoSelect.value, 10) + 1);
            }
            executePageScript('if (typeof formEspelhoPontoMes_consultar === "function") { formEspelhoPontoMes_consultar(); } else { window.location.reload(); }');
          }
        }
      },
      {
        title: 'Imprimir Espelho de Ponto',
        category: 'Relatórios',
        action: () => {
          window.print();
        }
      },
      {
        title: 'Encerrar Sessão (Logout)',
        category: 'Sistema',
        action: () => {
          window.location.href = 'https://meuespaco.tse.jus.br/portalservidor2/Logout';
        }
      }
    ];

    // Adiciona links existentes no menu superior / rodapé do portal (filtrando javascript: URLs)
    document.querySelectorAll('a[href]').forEach((link) => {
      const text = link.innerText.trim();
      const href = link.getAttribute('href');
      if (text && href && !href.startsWith('#') && !href.toLowerCase().startsWith('javascript:') && text.length > 2 && text.length < 50) {
        if (!searchItems.some((item) => item.title.toLowerCase() === text.toLowerCase())) {
          searchItems.push({
            title: text,
            category: 'Menu Meu Espaço',
            action: () => {
              window.location.href = href;
            }
          });
        }
      }
    });
  }

  function createModalDOM() {
    if (document.getElementById('je-command-modal')) return;

    modalOverlay = document.createElement('div');
    modalOverlay.id = 'je-command-modal';
    modalOverlay.className = 'je-modal-overlay';

    modalOverlay.innerHTML = `
      <div class="je-modal-content">
        <div class="je-modal-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="je-modal-input" placeholder="Pesquisar opções, meses, atalhos e serviços..." />
          <span style="font-size:11px; color:#94a3b8; background:rgba(0,0,0,0.05); padding:3px 8px; border-radius:4px;">ESC para fechar</span>
        </div>
        <div class="je-modal-results"></div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    modalInput = modalOverlay.querySelector('.je-modal-input');
    modalResults = modalOverlay.querySelector('.je-modal-results');

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        close();
      }
    });

    modalInput.addEventListener('input', () => {
      renderResults(modalInput.value);
    });

    modalInput.addEventListener('keydown', (e) => {
      const items = modalResults.querySelectorAll('.je-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % (items.length || 1);
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % (items.length || 1);
        updateSelection(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    // Atalho global Ctrl+K / Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function renderResults(query = '') {
    const q = query.toLowerCase().trim();
    const filtered = searchItems.filter((item) => {
      return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });

    selectedIndex = 0;
    modalResults.innerHTML = '';

    if (filtered.length === 0) {
      modalResults.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13.5px;">
          Nenhum resultado encontrado para "<strong>${escapeHTML(query)}</strong>"
        </div>
      `;
      return;
    }

    filtered.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = `je-result-item ${idx === selectedIndex ? 'selected' : ''}`;
      div.innerHTML = `
        <div class="je-result-item-title">${escapeHTML(item.title)}</div>
        <span class="je-result-item-badge">${escapeHTML(item.category)}</span>
      `;
      div.addEventListener('click', () => {
        close();
        if (typeof item.action === 'function') {
          item.action();
        }
      });
      modalResults.appendChild(div);
    });
  }

  function updateSelection(items) {
    items.forEach((it, idx) => {
      if (idx === selectedIndex) {
        it.classList.add('selected');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('selected');
      }
    });
  }

  function open() {
    buildSearchIndex();
    createModalDOM();
    modalOverlay.classList.add('active');
    modalInput.value = '';
    renderResults('');
    setTimeout(() => modalInput.focus(), 50);
  }

  function close() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  function toggle() {
    if (modalOverlay && modalOverlay.classList.contains('active')) {
      close();
    } else {
      open();
    }
  }

  return {
    init: () => {
      createModalDOM();
      buildSearchIndex();
    },
    open,
    close,
    toggle
  };
})();
