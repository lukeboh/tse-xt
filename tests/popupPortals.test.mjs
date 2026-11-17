import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('popup.html — declara os 2 portais suportados com links oficiais e chaves habilitadoras', () => {
  const html = readFileSync(path.join(rootDir, 'popup/popup.html'), 'utf8');

  assert.match(html, /data-portal="meuespaco"/);
  assert.match(html, /data-portal="spt"/);
  assert.match(html, /data-portal-url="https:\/\/meuespaco\.tse\.jus\.br\/portalservidor2\/"/);
  assert.match(html, /data-portal-url="https:\/\/spt-consultafrequencia\.tse\.jus\.br\/spt-consultafrequencia\/gestao"/);
  assert.match(html, /id="toggleMeuEspaco"[^>]*data-portal-key="xtEnabledMeuEspaco"/);
  assert.match(html, /id="toggleSpt"[^>]*data-portal-key="xtEnabledSpt"/);
});

test('popup.js — carrega estado independente de cada portal, persiste alternancia e abre link via chrome.tabs.create', () => {
  const code = readFileSync(path.join(rootDir, 'popup/popup.js'), 'utf8');

  let domReadyHandler = null;
  const store = {
    kpiCardStyle: 'flat',
    kpiCardEmphasis: 'glow',
    navMenuMode: 'hover',
    xtThemeEnabled: true,
    xtEnabledMeuEspaco: true,
    xtEnabledSpt: false
  };
  const openedTabs = [];
  let closedPopup = false;

  const toggleMeuEspaco = {
    checked: false,
    _listeners: {},
    getAttribute: (k) => (k === 'data-portal-key' ? 'xtEnabledMeuEspaco' : null),
    addEventListener(evt, fn) { this._listeners[evt] = fn; }
  };
  const toggleSpt = {
    checked: true,
    _listeners: {},
    getAttribute: (k) => (k === 'data-portal-key' ? 'xtEnabledSpt' : null),
    addEventListener(evt, fn) { this._listeners[evt] = fn; }
  };
  const statusMeuEspaco = {
    textContent: '',
    classList: {
      _set: new Set(),
      toggle(cls, force) { if (force) this._set.add(cls); else this._set.delete(cls); }
    }
  };
  const statusSpt = {
    textContent: '',
    classList: {
      _set: new Set(),
      toggle(cls, force) { if (force) this._set.add(cls); else this._set.delete(cls); }
    }
  };
  const linkMeuEspaco = {
    _listeners: {},
    getAttribute: (k) => (k === 'data-portal-url' ? 'https://meuespaco.tse.jus.br/portalservidor2/' : null),
    addEventListener(evt, fn) { this._listeners[evt] = fn; }
  };
  const linkSpt = {
    _listeners: {},
    getAttribute: (k) => (k === 'data-portal-url' ? 'https://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/gestao' : null),
    addEventListener(evt, fn) { this._listeners[evt] = fn; }
  };
  const popupVersion = { textContent: '' };

  const document = {
    addEventListener(evt, fn) {
      if (evt === 'DOMContentLoaded') domReadyHandler = fn;
    },
    getElementById(id) {
      if (id === 'popupVersion') return popupVersion;
      if (id === 'toggleMeuEspaco') return toggleMeuEspaco;
      if (id === 'toggleSpt') return toggleSpt;
      if (id === 'statusMeuEspaco') return statusMeuEspaco;
      if (id === 'statusSpt') return statusSpt;
      return null;
    },
    querySelector() { return null; },
    querySelectorAll(sel) {
      if (sel === 'input[data-portal-key]') return [toggleMeuEspaco, toggleSpt];
      if (sel === 'a.portal-link[data-portal-url]') return [linkMeuEspaco, linkSpt];
      return [];
    }
  };

  const chrome = {
    runtime: {
      getManifest: () => ({ version: '1.2.10', version_name: '1.2.10-Snapshot' })
    },
    storage: {
      local: {
        get(defaults, cb) {
          cb(Object.assign({}, defaults, store));
        },
        set(patch) {
          Object.assign(store, patch);
        }
      }
    },
    tabs: {
      create(opts) { openedTabs.push(opts.url); }
    }
  };

  const ctx = vm.createContext({
    document,
    chrome,
    window: { close: () => { closedPopup = true; } }
  });
  vm.runInContext(code, ctx);
  assert.ok(domReadyHandler);
  domReadyHandler();

  assert.equal(popupVersion.textContent, 'v1.2.10-Snapshot');
  assert.equal(toggleMeuEspaco.checked, true);
  assert.equal(statusMeuEspaco.textContent, 'Ativo');
  assert.equal(toggleSpt.checked, false);
  assert.equal(statusSpt.textContent, 'Desligado');
  assert.equal(statusSpt.classList._set.has('is-off'), true);

  // Liga o SPT pelo popup
  toggleSpt.checked = true;
  toggleSpt._listeners.change();
  assert.equal(store.xtEnabledSpt, true);
  assert.equal(statusSpt.textContent, 'Ativo');

  // Desliga o Meu Espaco pelo popup
  toggleMeuEspaco.checked = false;
  toggleMeuEspaco._listeners.change();
  assert.equal(store.xtEnabledMeuEspaco, false);
  assert.equal(store.xtThemeEnabled, false);
  assert.equal(statusMeuEspaco.textContent, 'Desligado');

  // Clica no link do SPT
  let prevented = false;
  linkSpt._listeners.click({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(openedTabs, ['https://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/gestao']);
  assert.equal(closedPopup, true);
});
