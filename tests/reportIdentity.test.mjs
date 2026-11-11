import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

// Cabeçalho do portal: <div class="servidor">Nome: <strong>…</strong></div>.
// Os ids #divTopServidorNome / .usuario-logado não existem na página real.
function docWith(els) {
  return {
    querySelector: (sel) => {
      for (const s of sel.split(',').map((x) => x.trim())) if (els[s]) return els[s];
      return null;
    }
  };
}

const PORTAL = { '.servidor': { innerText: 'Nome:                 Servidor Fictício de Souza                 ' } };
const NAME = 'Servidor Fictício de Souza';

const MODULES = [
  ['recognitionReport.js', 'JEPessoasRecognitionReport', 'issuerName'],
  ['payrollAudit.js', 'JEPessoasPayrollAudit', 'issuerName'],
  ['lostHoursAudit.js', 'JEPessoasLostHours', 'getServerLabel']
];

for (const [file, global, fn] of MODULES) {
  const name = (els) => loadModule(file, { document: docWith(els) })[global][fn]();

  test(`${file} — nome do servidor vem do cabeçalho do portal, sem o rótulo "Nome:"`, () => {
    assert.equal(name(PORTAL), NAME);
  });

  test(`${file} — quebras de linha e espaços do cabeçalho viram um espaço só`, () => {
    assert.equal(name({ '.servidor': { innerText: '\n\t Nome:\n\t\tServidor  Fictício\n de Souza\n' } }), NAME);
  });

  test(`${file} — sem cabeçalho reconhecido devolve vazio`, () => {
    assert.equal(name({}), '');
  });
}
