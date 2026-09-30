import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function fakeElement(opts = {}) {
  const children = [];
  const classSet = new Set(opts.classes || []);
  if (opts.className) {
    opts.className.split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
  }
  const attrs = opts.attrs || {};
  const listeners = {};
  const el = {
    tagName: opts.tagName || 'DIV',
    id: opts.id || '',
    innerText: opts.innerText || opts.textContent || '',
    textContent: opts.textContent || opts.innerText || '',
    value: opts.value || '',
    selectedIndex: opts.selectedIndex ?? 0,
    options: opts.options || [],
    children,
    childNodes: children,
    style: { setProperty() {}, removeProperty() {} },
    get title() {
      return attrs.title || '';
    },
    set title(val) {
      attrs.title = val;
    },
    get className() {
      return Array.from(classSet).join(' ');
    },
    set className(val) {
      classSet.clear();
      (val || '').split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
    },
    classList: {
      add(...cls) { cls.forEach((c) => classSet.add(c)); },
      remove(...cls) { cls.forEach((c) => classSet.delete(c)); },
      contains(c) { return classSet.has(c); },
      toggle(c, force) {
        if (force !== undefined) {
          if (force) classSet.add(c); else classSet.delete(c);
          return force;
        }
        if (classSet.has(c)) { classSet.delete(c); return false; }
        classSet.add(c); return true;
      }
    },
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, val) { attrs[name] = String(val); },
    removeAttribute(name) { delete attrs[name]; },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent(e) {
      if (listeners[e.type]) {
        listeners[e.type].forEach((fn) => fn(e));
      }
    },
    closest(sel) {
      if (opts.closest) return opts.closest(sel);
      return null;
    },
    querySelector(sel) {
      if (opts.querySelector) return opts.querySelector(sel);
      return null;
    },
    querySelectorAll(sel) {
      if (opts.querySelectorAll) return opts.querySelectorAll(sel);
      return [];
    },
    appendChild(node) {
      children.push(node);
      if (opts.onAppendChild) opts.onAppendChild(node);
      return node;
    },
    insertBefore(newChild, refChild) {
      const idx = children.indexOf(refChild);
      if (idx !== -1) children.splice(idx, 0, newChild);
      else children.push(newChild);
      if (opts.onAppendChild) opts.onAppendChild(newChild);
      return newChild;
    },
    remove() { opts.removed = true; }
  };
  return el;
}

test('pointAdjustmentModal — canAdjustCurrentTimesheet retorna false quando o servidor vê seu próprio espelho', () => {
  const doc = {
    querySelector(sel) {
      if (sel.includes('.matricula') || sel.includes('#topo')) {
        return fakeElement({ innerText: 'Matrícula: 30001111' });
      }
      return null;
    },
    querySelectorAll() { return []; }
  };

  const mod = loadModule('pointAdjustmentModal.js', { document: doc, window: { location: { search: '' } } });
  const P = mod.JEPessoasPointModal;

  assert.equal(P.getLoggedInMatricula(), '30001111');
  assert.equal(P.canAdjustCurrentTimesheet(), false);
});

test('pointAdjustmentModal — canAdjustCurrentTimesheet retorna true quando o chefe seleciona um servidor subordinado no select', () => {
  const selectServidor = fakeElement({
    id: 'servidorSelecionado_matricula',
    value: '30002222',
    selectedIndex: 1,
    options: [
      { text: '-- Selecione o Servidor --', value: '0' },
      { text: '30002222 - JOAO SUBORDINADO', value: '30002222' }
    ]
  });

  const doc = {
    querySelector(sel) {
      if (sel.includes('#topo .matricula') || sel.includes('.barra-superior .matricula')) {
        return fakeElement({ innerText: '30001111' });
      }
      if (sel.includes('servidorSelecionado_matricula') || sel.includes('select[name*="servidor"')) {
        return selectServidor;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes('h3')) return [];
      if (sel.includes('.matricula')) return [fakeElement({ innerText: '30001111' })];
      return [];
    }
  };

  const mod = loadModule('pointAdjustmentModal.js', { document: doc, window: { location: { search: '' } } });
  const P = mod.JEPessoasPointModal;

  assert.equal(P.getLoggedInMatricula(), '30001111');
  assert.equal(P.getViewedMatricula(), '30002222');
  assert.equal(P.canAdjustCurrentTimesheet(), true);
});

test('pointAdjustmentModal — canAdjustCurrentTimesheet retorna true quando a matrícula do subordinado vem pelo heading <h3> de conteúdo', () => {
  const h3Content = fakeElement({
    innerText: 'Servidor: MARIA SUBORDINADA - Matrícula: 30003333 - Lotação: GAB-DG'
  });

  const doc = {
    querySelector(sel) {
      if (sel.includes('#topo .matricula') || sel.includes('.barra-superior .matricula')) {
        return fakeElement({ innerText: '30001111' });
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes('h3')) {
        return [h3Content];
      }
      return [];
    }
  };

  const mod = loadModule('pointAdjustmentModal.js', { document: doc, window: { location: { search: '' } } });
  const P = mod.JEPessoasPointModal;

  assert.equal(P.getLoggedInMatricula(), '30001111');
  assert.equal(P.getViewedMatricula(), '30003333');
  assert.equal(P.canAdjustCurrentTimesheet(), true);
});

test('pointAdjustmentModal — injectAdjustmentButtons injeta botões ⚡ nas linhas da tabela para visão de chefia', () => {
  const insertedButtons = [];

  const tdH01 = fakeElement({ textContent: '01/09/2026', classes: ['h01'] });
  const tdH17 = fakeElement({
    textContent: '-',
    classes: ['h17'],
    onAppendChild(btn) {
      if (btn && btn.classList && btn.classList.contains('je-btn-ajustar-ponto')) {
        insertedButtons.push(btn);
      }
    }
  });

  const row = fakeElement({
    tagName: 'TR',
    querySelector(sel) {
      if (sel === 'th') return null;
      if (sel === 'td.h01') return tdH01;
      if (sel === 'td.h17') return tdH17;
      if (sel === '.je-btn-ajustar-ponto') return null;
      if (sel.includes('je-overtime-clock-btn')) return null;
      return null;
    },
    querySelectorAll() { return []; }
  });

  const table = fakeElement({
    id: 'tblEspelhoPontoMesCorrente',
    querySelectorAll(sel) {
      if (sel === 'tr') return [row];
      if (sel === '.je-btn-ajustar-ponto') return insertedButtons;
      return [];
    }
  });

  const doc = {
    querySelector(sel) {
      if (sel.includes('#topo .matricula')) return fakeElement({ innerText: '30001111' });
      if (sel.includes('servidorSelecionado_matricula') || sel.includes('select[name*="servidor"')) {
        return fakeElement({
          id: 'servidorSelecionado_matricula',
          value: '30002222',
          selectedIndex: 1,
          options: [
            { text: '-- Selecione o Servidor --', value: '0' },
            { text: '30002222 - SUBORDINADO', value: '30002222' }
          ]
        });
      }
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) {
      return fakeElement({ tagName: tag.toUpperCase() });
    },
    createTextNode(t) {
      return { nodeType: 3, nodeValue: t };
    }
  };

  const mod = loadModule('pointAdjustmentModal.js', { document: doc, window: { location: { search: '' } } });
  const P = mod.JEPessoasPointModal;

  P.injectAdjustmentButtons(table);

  assert.equal(insertedButtons.length, 1);
  assert.equal(insertedButtons[0].classList.contains('je-btn-ajustar-ponto'), true);
  assert.equal(insertedButtons[0].title, '⚡ Ajustar Ponto para 01/09/2026');
});
