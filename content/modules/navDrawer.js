/**
 * JE Pessoas XT - Menu de Navegação e Serviços em Drawer Glassmorphic (v0.1.7)
 */

window.JEPessoasNavDrawer = (function () {
  'use strict';

  const CATEGORY_ICONS = {
    'assentamentos': '📁',
    'banco de horas': '⏱️',
    'benefícios': '🎁',
    'capacitação': '🎓',
    'catálogo': '📖',
    'declaração': '📑',
    'declarações': '📑',
    'financeiro': '💰',
    'frequência': '📅',
    'férias': '🌴',
    'serviço extraordinário': '⚡',
    'default': '📌'
  };

  function getCategoryIcon(title) {
    const t = title.toLowerCase();
    for (const key in CATEGORY_ICONS) {
      if (t.includes(key)) return CATEGORY_ICONS[key];
    }
    return CATEGORY_ICONS['default'];
  }

  function extractMenuData() {
    const legacyMenu = document.getElementById('menu-lateral');
    if (!legacyMenu) return [];

    const categories = [];
    const rootItems = legacyMenu.querySelectorAll(':scope > ul > li');

    rootItems.forEach((li) => {
      const linkOrTitle = li.querySelector('a, span');
      if (!linkOrTitle) return;

      const title = linkOrTitle.innerText.trim();
      const directHref = linkOrTitle.getAttribute('href');
      const submenu = li.querySelector('ul.submenu');

      if (submenu) {
        const subLinks = [];
        submenu.querySelectorAll('li').forEach((subLi) => {
          const a = subLi.querySelector('a');
          if (a) {
            const isChefe = subLi.classList.contains('chefe') || a.classList.contains('chefe');
            const isRestrito = subLi.classList.contains('restrito') || a.classList.contains('restrito');
            subLinks.push({
              name: a.innerText.trim(),
              href: a.getAttribute('href'),
              target: a.getAttribute('target') || '_self',
              isChefe,
              isRestrito
            });
          }
        });

        categories.push({
          title,
          icon: getCategoryIcon(title),
          links: subLinks
        });
      } else if (directHref && !directHref.startsWith('#')) {
        categories.push({
          title,
          icon: getCategoryIcon(title),
          links: [
            {
              name: title,
              href: directHref,
              target: linkOrTitle.getAttribute('target') || '_self',
              isChefe: false,
              isRestrito: false
            }
          ]
        });
      }
    });

    return categories;
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

  function sanitizeHref(url) {
    if (!url || typeof url !== 'string') return '#';
    const clean = url.trim();
    // Permite apenas URLs relativas, https ou http
    if (clean.startsWith('/') || clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('#')) {
      return escapeHTML(clean);
    }
    return '#';
  }

  function createDrawerDOM() {
    if (document.getElementById('je-services-drawer-overlay')) return;

    const categories = extractMenuData();

    const overlay = document.createElement('div');
    overlay.id = 'je-services-drawer-overlay';
    overlay.className = 'je-drawer-overlay';

    overlay.innerHTML = `
      <div class="je-drawer-panel" id="je-drawer-panel">
        <div class="je-drawer-header">
          <div class="je-drawer-brand">
            <div class="je-drawer-logo-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </div>
            <div>
              <h2 class="je-drawer-title">Menu de Serviços</h2>
              <span class="je-drawer-subtitle">Meu Espaço • Tribunal Superior Eleitoral</span>
            </div>
          </div>
          <button class="je-drawer-close-btn" id="je-drawer-close" title="Fechar Menu (ESC)">✕</button>
        </div>

        <div class="je-drawer-search-wrapper">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="je-drawer-search-input" id="je-drawer-search" placeholder="Filtrar serviços e funcionalidades..." />
        </div>

        <div class="je-drawer-content" id="je-drawer-content">
          ${renderCategoriesHTML(categories)}
        </div>

        <div class="je-drawer-footer">
          <span>Atalho rápido: <kbd>Alt + M</kbd> ou clique no botão Menu</span>
          <span style="color:#0077ff; font-weight:700;">JE XT v${window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '0.1.7'}</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Eventos de fechar
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#je-drawer-close').addEventListener('click', close);

    // Delegação de evento para expandir/recolher categorias sem inline onclick
    const drawerContent = overlay.querySelector('#je-drawer-content');
    if (drawerContent) {
      drawerContent.addEventListener('click', (e) => {
        const header = e.target.closest('.je-drawer-category-header');
        if (header && header.parentElement) {
          header.parentElement.classList.toggle('collapsed');
        }
      });
    }

    // Filtro de busca dentro do drawer
    const searchInput = overlay.querySelector('#je-drawer-search');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      filterDrawerItems(q);
    });

    // Atalho global Alt+M
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function renderCategoriesHTML(categories) {
    if (!categories || categories.length === 0) {
      return `<div style="padding:24px; text-align:center; color:#94a3b8;">Nenhum serviço carregado.</div>`;
    }

    return categories.map((cat) => `
      <div class="je-drawer-category-card" data-category="${escapeHTML(cat.title.toLowerCase())}">
        <div class="je-drawer-category-header" style="cursor:pointer;">
          <div class="je-category-header-left">
            <span class="je-cat-icon">${cat.icon}</span>
            <strong class="je-cat-title">${escapeHTML(cat.title)}</strong>
            <span class="je-cat-count">${cat.links.length}</span>
          </div>
          <svg class="je-cat-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <ul class="je-drawer-links-list">
          ${cat.links.map(link => `
            <li class="je-drawer-link-item">
              <a href="${sanitizeHref(link.href)}" target="${escapeHTML(link.target)}" class="je-drawer-link">
                <span>${escapeHTML(link.name)}</span>
                ${link.isChefe ? `<span class="je-badge-chefe">Chefia</span>` : ''}
                ${link.isRestrito ? `<span class="je-badge-restrito">Restrito</span>` : ''}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  function filterDrawerItems(query) {
    const cards = document.querySelectorAll('.je-drawer-category-card');
    cards.forEach((card) => {
      let hasVisibleLink = false;
      const links = card.querySelectorAll('.je-drawer-link-item');
      links.forEach((li) => {
        const text = li.innerText.toLowerCase();
        if (text.includes(query)) {
          li.style.display = 'block';
          hasVisibleLink = true;
        } else {
          li.style.display = 'none';
        }
      });

      if (hasVisibleLink || card.getAttribute('data-category').includes(query)) {
        card.style.display = 'block';
        card.classList.remove('collapsed');
      } else {
        card.style.display = 'none';
      }
    });
  }

  function open() {
    createDrawerDOM();
    const overlay = document.getElementById('je-services-drawer-overlay');
    if (overlay) {
      overlay.classList.add('active');
      const input = overlay.querySelector('#je-drawer-search');
      if (input) {
        input.value = '';
        filterDrawerItems('');
        setTimeout(() => input.focus(), 150);
      }
    }
  }

  function close() {
    const overlay = document.getElementById('je-services-drawer-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function toggle() {
    const overlay = document.getElementById('je-services-drawer-overlay');
    if (overlay && overlay.classList.contains('active')) {
      close();
    } else {
      open();
    }
  }

  return {
    init: createDrawerDOM,
    open,
    close,
    toggle
  };
})();
