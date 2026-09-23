/**
 * TSE XT - Anonimização visual das capturas da loja
 *
 * Gera o código que roda NA PÁGINA (via Runtime.evaluate) e troca, só nos
 * nós de texto e em title/placeholder/aria-label, os dados pessoais por
 * substitutos fictícios. Nunca toca em value de <input>/<select>: o
 * formulário continua funcional (a Auditoria, por exemplo, lê a matrícula do
 * <select>) e nada anonimizado é enviado ao servidor por engano.
 *
 * Regras:
 *  - termos do arquivo local tools/loja/anon.local.json (NÃO versionado —
 *    nomes reais do servidor, dependentes, colegas da unidade), aplicados
 *    do mais longo para o mais curto, como palavra inteira, sem diferenciar
 *    maiúsculas;
 *  - toda matrícula (8 dígitos começando por 3) vira 30000000, 30000001...,
 *    na ordem em que aparece (a primeira é a do usuário, na topbar);
 *  - todo IPv4 vira 10.0.0.1.
 * Depois confere o texto visível e devolve o que ainda sobrou (deve ser []).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ARQUIVO_TERMOS = path.join(DIR, 'anon.local.json');

export function carregarTermos() {
  if (!fs.existsSync(ARQUIVO_TERMOS)) {
    throw new Error(`Crie ${ARQUIVO_TERMOS} a partir de anon.exemplo.json (lista de nomes reais -> fictícios).`);
  }
  const { termos = [] } = JSON.parse(fs.readFileSync(ARQUIVO_TERMOS, 'utf8'));
  return [...termos].sort((a, b) => b[0].length - a[0].length);
}

export function scriptAnonimizar(termos) {
  return `(() => {
    const termos = ${JSON.stringify(termos)};
    const esc = (s) => s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    const regras = termos.map(([de, para]) => [new RegExp('(?<![\\\\p{L}])' + esc(de) + '(?![\\\\p{L}])', 'giu'), para]);
    const mats = (window.__xtAnonMats = window.__xtAnonMats || new Map());
    const trocar = (s) => {
      // Palavra isolada mantém a caixa ("DANIEL" vira "SERVIDOR", como no
      // painel da Gestão de HE). Nome composto usa o substituto como está: a
      // topbar é montada a partir do nome em caixa alta do portal legado.
      const caixa = (m, para) => (!/\\s/.test(m) && m === m.toUpperCase() && m !== m.toLowerCase() ? para.toUpperCase() : para);
      let r = regras.reduce((acc, [re, para]) => acc.replace(re, (m) => caixa(m, para)), s);
      r = r.replace(/\\b3\\d{7}\\b/g, (m) => {
        if (/^3000000\\d$/.test(m)) return m;
        if (!mats.has(m)) mats.set(m, String(30000000 + mats.size));
        return mats.get(m);
      });
      return r.replace(/\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b/g, '10.0.0.1');
    };
    let n = 0;
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) => (/^(SCRIPT|STYLE)$/.test(t.parentNode && t.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (w.nextNode()) {
      const t = w.currentNode;
      const v = trocar(t.nodeValue);
      if (v !== t.nodeValue) { t.nodeValue = v; n++; }
    }
    document.querySelectorAll('[title],[placeholder],[aria-label]').forEach((el) => {
      ['title', 'placeholder', 'aria-label'].forEach((a) => {
        const o = el.getAttribute(a);
        if (o && trocar(o) !== o) { el.setAttribute(a, trocar(o)); n++; }
      });
    });
    const visivel = document.body.innerText;
    const sobras = termos.map(([de]) => de).filter((de) => new RegExp('(?<![\\\\p{L}])' + esc(de) + '(?![\\\\p{L}])', 'iu').test(visivel));
    const matsSobrando = (visivel.match(/\\b3\\d{7}\\b/g) || []).filter((m) => !/^3000000\\d$/.test(m));
    return { trocas: n, sobras: [...sobras, ...matsSobrando] };
  })()`;
}
