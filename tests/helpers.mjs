// Carrega um módulo de content-script (window.JEPessoas* = (function(){...})())
// num sandbox Node, com shims mínimos de window/document.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MODULES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'modules');

const noopEl = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getAttribute: () => null,
  textContent: '',
  innerText: '',
  classList: { add() {}, remove() {}, contains: () => false }
};

export function loadModule(fileName, deps = {}) {
  const src = readFileSync(path.join(MODULES_DIR, fileName), 'utf8');
  const window = Object.assign({}, deps);
  const document = Object.assign({
    createElement: () => Object.assign({}, noopEl, { style: {}, appendChild() {}, remove() {} }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    head: noopEl,
    documentElement: noopEl,
    body: Object.assign({}, noopEl)
  }, deps.document || {});
  const chrome = deps.chrome || { storage: { local: { get: (d, cb) => cb({}), set: (o, cb) => cb && cb() } } };
  const localStorage = deps.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
  // eslint-disable-next-line no-new-func
  const run = new Function('window', 'document', 'globalThis', 'chrome', 'localStorage',
    `${src}\n;return window;`);
  return run(window, document, window, chrome, localStorage);
}

// Carrega toda a cadeia normalmente usada pelo kpiExtractor / domModernizer.
export function loadStack() {
  const legal = loadModule('legalConfig.js');
  const balance = loadModule('balanceCalc.js', legal);
  const authScan = loadModule('authorizationScan.js', Object.assign({}, legal, balance));
  const kpi = loadModule('kpiExtractor.js', Object.assign({}, legal, balance, authScan));
  const dom = loadModule('domModernizer.js', Object.assign({}, legal, balance, authScan, kpi));
  return {
    JEPessoasLegal: legal.JEPessoasLegal,
    JEPessoasBalance: balance.JEPessoasBalance,
    JEPessoasAuthScan: authScan.JEPessoasAuthScan,
    JEPessoasKPI: kpi.JEPessoasKPI,
    JEPessoasModernizer: dom.JEPessoasModernizer
  };
}
