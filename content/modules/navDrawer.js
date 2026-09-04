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

  let flatLinks = [];

  function getCategoryIcon(title) {
    const t = title.toLowerCase();
    for (const key in CATEGORY_ICONS) {
      if (t.includes(key)) return CATEGORY_ICONS[key];
    }
    return CATEGORY_ICONS['default'];
  }

  function extractMenuData() {
    const legacyMenu = document.getElementById('menu-lateral') || document.querySelector('.menu-lateral, #menu, .menu');
    if (!legacyMenu) return [];

    flatLinks = [];
    const categories = [];

    // Seleciona li de primeiro nível dentro do menu lateral legado
    const rootItems = legacyMenu.querySelectorAll('ul > li');

    rootItems.forEach((li) => {
      // Ignora li internos que já pertencem a um submenu
      if (li.parentElement && (li.parentElement.classList.contains('submenu') || li.parentElement.parentElement.tagName === 'LI')) {
        return;
      }

      const linkOrTitle = li.querySelector(':scope > a, :scope > span, :scope > strong');
      if (!linkOrTitle) return;

      const title = linkOrTitle.innerText.trim();
      if (!title) return;

      const submenu = li.querySelector('ul');

      if (submenu) {
        const subLinks = [];
        submenu.querySelectorAll('li a').forEach((a) => {
          const name = a.innerText.trim();
          if (!name) return;

          const parentLi = a.parentElement;
          const isChefe = (parentLi && parentLi.classList.contains('chefe')) || a.classList.contains('chefe');
          const isRestrito = (parentLi && parentLi.classList.contains('restrito')) || a.classList.contains('restrito');

          const linkIdx = flatLinks.length;
          const itemObj = {
            name,
            href: a.href || a.getAttribute('href') || '#',
            target: a.getAttribute('target') || '_self',
            isChefe,
            isRestrito,
            element: a,
            idx: linkIdx
          };

          flatLinks.push(itemObj);
          subLinks.push(itemObj);
        });

        if (subLinks.length > 0) {
          categories.push({
            title,
            icon: getCategoryIcon(title),
            links: subLinks
          });
        }
      } else {
        const a = linkOrTitle.tagName.toLowerCase() === 'a' ? linkOrTitle : li.querySelector('a');
        if (a) {
          const name = a.innerText.trim();
          if (!name) return;

          const linkIdx = flatLinks.length;
          const itemObj = {
            name,
            href: a.href || a.getAttribute('href') || '#',
            target: a.getAttribute('target') || '_self',
            isChefe: false,
            isRestrito: false,
            element: a,
            idx: linkIdx
          };

          flatLinks.push(itemObj);
          categories.push({
            title: name,
            icon: getCategoryIcon(name),
            links: [itemObj]
          });
        }
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
    let clean = url.trim();

    // Normaliza links para EspelhoPontoMesAction e EspelhoPontoDiaAction garantindo que chamem os endpoints de ação corretos
    if (clean.includes('EspelhoPontoMesAction') && !clean.includes('_')) {
      clean = clean.replace(/EspelhoPontoMesAction(\.action)?/g, 'EspelhoPontoMesAction_recuperar.action');
    } else if (clean.includes('EspelhoPontoDiaAction') && !clean.includes('_')) {
      clean = clean.replace(/EspelhoPontoDiaAction(\.action)?/g, 'EspelhoPontoDiaAction_consultar.action');
    }

    // Se o link termina em Action_metodo sem a extensão .action, adiciona .action
    if (/Action_[a-zA-Z0-9]+$/.test(clean)) {
      clean += '.action';
    }

    // Se for URL relativa sem barra inicial, prefixa com o contexto /portalservidor2/
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/') && !clean.startsWith('#')) {
      clean = '/portalservidor2/' + clean;
    }

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
          <button type="button" class="je-drawer-close-btn" id="je-drawer-close" title="Fechar Menu (ESC)">✕</button>
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
          <span style="color:#0077ff; font-weight:700;">TSE XT v${window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '0.3.5'}</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Eventos de fechar
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#je-drawer-close').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });

    // Delegação de evento para expansão mutuamente exclusiva por hover e clique nos links
    const drawerContent = overlay.querySelector('#je-drawer-content');
    if (drawerContent) {
      // Quando o mouse entra na área de um card de categoria diferente: expande o novo e colapsa o anterior
      drawerContent.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.je-drawer-category-card');
        if (!card) return;

        // Se o card já está expandido, ignora
        if (!card.classList.contains('collapsed')) return;

        // Colapsa todas as outras categorias e expande a atual
        const allCards = drawerContent.querySelectorAll('.je-drawer-category-card');
        allCards.forEach((c) => {
          if (c !== card) {
            c.classList.add('collapsed');
          }
        });

        card.classList.remove('collapsed');
      });

      drawerContent.addEventListener('click', (e) => {
        const header = e.target.closest('.je-drawer-category-header');
        if (header && header.parentElement) {
          const targetCard = header.parentElement;
          const isCollapsed = targetCard.classList.contains('collapsed');

          // Colapsa os demais
          drawerContent.querySelectorAll('.je-drawer-category-card').forEach((c) => {
            if (c !== targetCard) c.classList.add('collapsed');
          });

          targetCard.classList.toggle('collapsed', !isCollapsed);
          return;
        }

        const linkEl = e.target.closest('.je-drawer-link');
        if (linkEl) {
          const idx = parseInt(linkEl.getAttribute('data-link-idx'), 10);
          const targetItem = flatLinks[idx];

          if (targetItem && targetItem.element) {
            e.preventDefault();
            e.stopPropagation();
            close();

            // Dispara clique no elemento original do menu do Meu Espaço
            targetItem.element.click();

            // Fallback de navegação se o click() não redirecionar
            const destUrl = sanitizeHref(targetItem.href);
            if (destUrl && destUrl !== '#') {
              setTimeout(() => {
                if (window.location.href !== destUrl) {
                  window.location.href = destUrl;
                }
              }, 120);
            }
          }
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
      <div class="je-drawer-category-card collapsed" data-category="${escapeHTML(cat.title.toLowerCase())}">
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
              <a href="${sanitizeHref(link.href)}" data-link-idx="${link.idx}" target="${escapeHTML(link.target)}" class="je-drawer-link">
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
        if (!query || text.includes(query)) {
          li.style.display = 'block';
          hasVisibleLink = true;
        } else {
          li.style.display = 'none';
        }
      });

      if (!query) {
        card.style.display = 'block';
        card.classList.add('collapsed');
      } else if (hasVisibleLink || card.getAttribute('data-category').includes(query)) {
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
    toggle,
    extractMenuData
  };
})();
