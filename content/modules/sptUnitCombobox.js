/**
 * TSE XT - Combobox Pesquisável de Unidades para o SPT
 *
 * Permite selecionar a unidade (seção/coordenadoria/secretaria) tanto por
 * digitação (busca por nome, caminho hierárquico ou código) quanto pela lista
 * suspensa, mantendo o <select id="cbUnidades"> nativo sincronizado para
 * submissão do formulário e reutilizando o mesmo componente no modal de
 * Relatório Consolidado (+).
 */

window.JEPessoasSptCombobox = (function () {
  'use strict';

  const UNITS_CACHE_KEY = 'je_spt_units_cache_v1';
  const CONTRATOS_CACHE_KEY = 'je_spt_contratos_cache_v1';
  const PERIODOS_CACHE_KEY = 'je_spt_periodos_cache_v1';

  const calc = () => window.JEPessoasSptCltCalc;

  function createSvgIcon(paths, size = 16) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    paths.forEach((item) => {
      const el = document.createElementNS(ns, item.tag);
      Object.keys(item.attrs).forEach((k) => el.setAttribute(k, item.attrs[k]));
      svg.appendChild(el);
    });
    return svg;
  }

  function cacheUnitsAndContractsFromDOM(doc = document) {
    const c = calc();
    if (!c) return;
    const selUnidades = doc.querySelector('#cbUnidades, select[name="cbUnidades"]');
    if (selUnidades && selUnidades.options && selUnidades.options.length > 0) {
      const parsed = c.parseUnitsFromSelect(selUnidades);
      try {
        sessionStorage.setItem(UNITS_CACHE_KEY, JSON.stringify(parsed));
      } catch (_) {}
    }
    const selContratos = doc.querySelector('#cbContratos, select[name="cbContratos"]');
    if (selContratos && selContratos.options && selContratos.options.length > 0) {
      const contratos = Array.from(selContratos.options)
        .map((o) => ({ value: String(o.value || '').trim(), text: String(o.textContent || '').trim() }))
        .filter((o) => o.value && o.value !== '-1');
      try {
        sessionStorage.setItem(CONTRATOS_CACHE_KEY, JSON.stringify(contratos));
      } catch (_) {}
    }
    if (c.parsePeriodosFromDoc) {
      const periodos = c.parsePeriodosFromDoc(doc);
      if (Array.isArray(periodos) && periodos.length > 0) {
        try {
          sessionStorage.setItem(PERIODOS_CACHE_KEY, JSON.stringify(periodos));
        } catch (_) {}
      }
    }
  }

  function getAvailableUnits(doc = document) {
    const c = calc();
    if (!c) return [];
    const sel = doc.querySelector('#cbUnidades, select[name="cbUnidades"]');
    if (sel && sel.options && sel.options.length > 0) {
      const parsed = c.parseUnitsFromSelect(sel);
      try {
        sessionStorage.setItem(UNITS_CACHE_KEY, JSON.stringify(parsed));
      } catch (_) {}
      return parsed;
    }
    try {
      const raw = sessionStorage.getItem(UNITS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function getAvailableContracts(doc = document) {
    const sel = doc.querySelector('#cbContratos, select[name="cbContratos"]');
    if (sel && sel.options && sel.options.length > 0) {
      const list = Array.from(sel.options)
        .map((o) => ({ value: String(o.value || '').trim(), text: String(o.textContent || '').trim() }))
        .filter((o) => o.value && o.value !== '-1');
      try {
        sessionStorage.setItem(CONTRATOS_CACHE_KEY, JSON.stringify(list));
      } catch (_) {}
      return list;
    }
    try {
      const raw = sessionStorage.getItem(CONTRATOS_CACHE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch (_) {}
    return [];
  }

  function getAvailablePeriodos(doc = document) {
    const c = calc();
    if (c && c.parsePeriodosFromDoc) {
      const parsed = c.parsePeriodosFromDoc(doc);
      if (Array.isArray(parsed) && parsed.length > 0) {
        try {
          sessionStorage.setItem(PERIODOS_CACHE_KEY, JSON.stringify(parsed));
        } catch (_) {}
        return parsed;
      }
    }
    try {
      const raw = sessionStorage.getItem(PERIODOS_CACHE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (_) {}
    return [];
  }

  function mountComboboxWidget(config) {
    const {
      units,
      initialUnitId,
      placeholder = 'Digite para filtrar ou selecione a unidade...',
      inputId = '',
      onSelect
    } = config;

    const c = calc();
    let selectedUnit = units.find((u) => u.id === String(initialUnitId || '')) || units[0] || null;
    let filtered = units.slice();
    let activeIndex = -1;
    let isOpen = false;

    const root = document.createElement('div');
    root.className = 'je-spt-combobox';

    const control = document.createElement('div');
    control.className = 'je-spt-combobox-control';

    const searchIconWrap = document.createElement('span');
    searchIconWrap.className = 'je-spt-combobox-icon';
    searchIconWrap.appendChild(createSvgIcon([
      { tag: 'circle', attrs: { cx: '11', cy: '11', r: '8' } },
      { tag: 'line', attrs: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' } }
    ], 15));

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'je-spt-combobox-input';
    if (inputId) input.id = inputId;
    input.placeholder = placeholder;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');
    const listboxId = (inputId || 'je-spt-unit') + '-listbox';
    input.setAttribute('aria-controls', listboxId);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'je-spt-combobox-clear';
    clearBtn.title = 'Limpar filtro para pesquisar outra unidade';
    clearBtn.setAttribute('aria-label', 'Limpar busca de unidade');
    clearBtn.textContent = '×';

    const chevronBtn = document.createElement('button');
    chevronBtn.type = 'button';
    chevronBtn.className = 'je-spt-combobox-toggle';
    chevronBtn.title = 'Abrir lista de unidades';
    chevronBtn.setAttribute('aria-label', 'Alternar lista de unidades');
    chevronBtn.appendChild(createSvgIcon([
      { tag: 'polyline', attrs: { points: '6 9 12 15 18 9' } }
    ], 15));

    control.appendChild(searchIconWrap);
    control.appendChild(input);
    control.appendChild(clearBtn);
    control.appendChild(chevronBtn);

    const dropdown = document.createElement('div');
    dropdown.className = 'je-spt-combobox-dropdown';
    dropdown.id = listboxId;
    dropdown.setAttribute('role', 'listbox');
    dropdown.hidden = true;

    root.appendChild(control);
    root.appendChild(dropdown);

    function syncInputDisplay() {
      if (selectedUnit) {
        input.value = selectedUnit.cleanName;
        input.title = selectedUnit.parentPath
          ? `${selectedUnit.parentPath} › ${selectedUnit.cleanName} (#${selectedUnit.id})`
          : `${selectedUnit.cleanName} (#${selectedUnit.id})`;
      } else {
        input.value = '';
        input.title = '';
      }
    }

    function optionElementId(unitId) {
      return `${listboxId}-opt-${String(unitId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }

    function updateActiveOptionInPlace(nextIndex) {
      if (!filtered.length) {
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        return;
      }
      const prevEl = activeIndex >= 0 ? dropdown.children[activeIndex] : null;
      if (prevEl && prevEl.classList) {
        prevEl.classList.remove('is-active');
      }
      activeIndex = nextIndex;
      const activeEl = dropdown.children[activeIndex];
      if (activeEl && activeEl.classList) {
        activeEl.classList.add('is-active');
        if (activeEl.id) {
          input.setAttribute('aria-activedescendant', activeEl.id);
        }
        if (typeof activeEl.scrollIntoView === 'function') {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function renderDropdown(queryText) {
      filtered = c ? c.filterUnits(units, queryText) : units;
      dropdown.replaceChildren();

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'je-spt-combobox-empty';
        empty.textContent = 'Nenhuma unidade encontrada para o termo digitado.';
        dropdown.appendChild(empty);
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        return;
      }

      if (activeIndex < 0 || activeIndex >= filtered.length) {
        const idxSelected = selectedUnit ? filtered.findIndex((u) => u.id === selectedUnit.id) : 0;
        activeIndex = idxSelected >= 0 ? idxSelected : 0;
      }

      filtered.forEach((u, idx) => {
        const item = document.createElement('div');
        item.id = optionElementId(u.id);
        item.className = 'je-spt-combobox-option';
        if (selectedUnit && u.id === selectedUnit.id) item.classList.add('is-selected');
        if (idx === activeIndex) item.classList.add('is-active');
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', selectedUnit && u.id === selectedUnit.id ? 'true' : 'false');
        item.dataset.unitId = u.id;
        item.style.paddingInlineStart = `${Math.min(40, 12 + Math.max(0, u.level - 1) * 10)}px`;

        const mainRow = document.createElement('div');
        mainRow.className = 'je-spt-combobox-opt-main';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'je-spt-combobox-opt-name';
        nameSpan.textContent = u.cleanName;

        const codeBadge = document.createElement('span');
        codeBadge.className = 'je-spt-combobox-opt-code';
        codeBadge.textContent = `#${u.id}`;

        mainRow.appendChild(nameSpan);
        mainRow.appendChild(codeBadge);
        item.appendChild(mainRow);

        if (u.parentPath) {
          const pathRow = document.createElement('div');
          pathRow.className = 'je-spt-combobox-opt-path';
          pathRow.textContent = u.parentPath;
          item.appendChild(pathRow);
        }

        item.addEventListener('mousedown', (e) => {
          // Previne blur do input antes da seleção
          e.preventDefault();
          chooseUnit(u);
        });

        dropdown.appendChild(item);
      });

      const activeEl = dropdown.children[activeIndex];
      if (activeEl) {
        if (activeEl.id) input.setAttribute('aria-activedescendant', activeEl.id);
        if (typeof activeEl.scrollIntoView === 'function') {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function openDropdown(queryText = '') {
      isOpen = true;
      root.classList.add('is-open');
      dropdown.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      renderDropdown(queryText);
    }

    function closeDropdown(restoreText = true) {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove('is-open');
      dropdown.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      if (restoreText) syncInputDisplay();
    }

    function chooseUnit(unit) {
      if (!unit) return;
      selectedUnit = unit;
      syncInputDisplay();
      closeDropdown(false);
      if (typeof onSelect === 'function') {
        onSelect(unit);
      }
    }

    input.addEventListener('focus', () => {
      openDropdown('');
      setTimeout(() => {
        try { input.select(); } catch (_) {}
      }, 0);
    });

    input.addEventListener('click', () => {
      if (!isOpen) openDropdown('');
    });

    input.addEventListener('input', () => {
      activeIndex = 0;
      openDropdown(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          openDropdown('');
          return;
        }
        if (filtered.length > 0) {
          const nextIdx = (activeIndex + 1) % filtered.length;
          updateActiveOptionInPlace(nextIdx);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          openDropdown('');
          return;
        }
        if (filtered.length > 0) {
          const prevIdx = (activeIndex - 1 + filtered.length) % filtered.length;
          updateActiveOptionInPlace(prevIdx);
        }
      } else if (e.key === 'Enter') {
        if (isOpen && filtered.length > 0) {
          e.preventDefault();
          const picked = filtered[Math.max(0, activeIndex)] || filtered[0];
          chooseUnit(picked);
        }
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeDropdown(true);
        }
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => closeDropdown(true), 150);
    });

    clearBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = '';
      activeIndex = 0;
      openDropdown('');
      input.focus();
    });

    chevronBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (isOpen) {
        closeDropdown(true);
      } else {
        openDropdown('');
        input.focus();
      }
    });

    syncInputDisplay();

    return {
      root,
      input,
      getValue: () => (selectedUnit ? selectedUnit.id : ''),
      getSelectedUnit: () => selectedUnit,
      setValue: (unitId, triggerCallback = false) => {
        const found = units.find((u) => u.id === String(unitId || ''));
        if (found) {
          selectedUnit = found;
          syncInputDisplay();
          if (triggerCallback && typeof onSelect === 'function') onSelect(found);
        }
      },
      setDisabled: (disabled) => {
        input.disabled = !!disabled;
        clearBtn.disabled = !!disabled;
        chevronBtn.disabled = !!disabled;
      }
    };
  }

  function enhanceNativeUnitSelect(selectEl = document.getElementById('cbUnidades')) {
    if (!selectEl || selectEl.dataset.jeComboboxMounted === 'true') return null;
    cacheUnitsAndContractsFromDOM(selectEl.ownerDocument || document);
    const units = getAvailableUnits(selectEl.ownerDocument || document);
    if (!units.length) return null;

    selectEl.dataset.jeComboboxMounted = 'true';
    selectEl.classList.add('je-spt-native-select-hidden');
    selectEl.setAttribute('tabindex', '-1');
    selectEl.setAttribute('aria-hidden', 'true');

    const comboboxInputId = 'je-cbUnidades-combobox';
    const ownerDoc = selectEl.ownerDocument || document;
    const selectId = selectEl.id || 'cbUnidades';
    const associatedLabel = (ownerDoc.querySelector && ownerDoc.querySelector(`label[for="${selectId}"]`))
      || (selectEl.parentElement && selectEl.parentElement.querySelector && selectEl.parentElement.querySelector('label'));
    if (associatedLabel && associatedLabel.setAttribute) {
      associatedLabel.setAttribute('for', comboboxInputId);
      if (!associatedLabel.id) {
        associatedLabel.id = `${comboboxInputId}-label`;
      }
    }

    const widget = mountComboboxWidget({
      units,
      initialUnitId: selectEl.value,
      inputId: comboboxInputId,
      placeholder: 'Digite o nome, sigla ou código da unidade (ex.: Totalização, 1184)...',
      onSelect: (unit) => {
        if (selectEl.value !== unit.id) {
          selectEl.value = unit.id;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    if (associatedLabel && associatedLabel.id && widget.input && widget.input.setAttribute) {
      widget.input.setAttribute('aria-labelledby', associatedLabel.id);
    }

    selectEl.parentNode.insertBefore(widget.root, selectEl.nextSibling);

    selectEl.addEventListener('change', () => {
      if (widget.getValue() !== selectEl.value) {
        widget.setValue(selectEl.value, false);
      }
    });

    return widget;
  }

  return {
    cacheUnitsAndContractsFromDOM,
    getAvailableUnits,
    getAvailableContracts,
    getAvailablePeriodos,
    mountComboboxWidget,
    enhanceNativeUnitSelect
  };
})();
