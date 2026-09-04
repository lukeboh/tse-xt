import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasHEAuthFetch: F } = loadModule('heAuthFetch.js');

// Linhas reais do endpoint AutorizacaoHoraExcedenteAction_execute (ago/2026, mat 30000000)
// [num, desc, horas, validade, tipo, limUteis, limSab, limDom, periodo]
const ROW_900002 = ['900002', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '02/08/2026 a 09/08/2026'];
const ROW_900004 = ['900004', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:54', '29/02/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/08/2026 a 09/08/2026'];
const ROW_900003 = ['900003', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '10/08/2026 a 11/08/2026'];
const ROW_900001 = ['900001', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '12/08/2026 a 31/08/2026'];

test('parseAuthRows — extrai campos e converte horas', () => {
  const [a] = F.parseAuthRows([ROW_900004]);
  assert.equal(a.num, '900004');
  assert.equal(a.horasMin, 8 * 60 + 54);
  assert.equal(a.tipo, 'Pecúnia');
  assert.equal(a.limUteisMin, 120);
  assert.equal(a.limSabMin, 600);
  assert.equal(a.limDomMin, 0);
  assert.equal(a.periodo, '01/08/2026 a 09/08/2026');
});

test('parseAuthRows — descarta linhas sem número', () => {
  assert.equal(F.parseAuthRows([['', 'x', '', '', '', '', '', '', '']]).length, 0);
});

test('classifyAuth — só limite de domingo => sunHol; senão wkSat', () => {
  assert.equal(F.classifyAuth(F.parseAuthRows([ROW_900002])[0]), 'sunHol');
  assert.equal(F.classifyAuth(F.parseAuthRows([ROW_900004])[0]), 'wkSat');
  // limite útil + domingo => wkSat (não é dom-only)
  assert.equal(F.classifyAuth({ limUteisMin: 60, limSabMin: 0, limDomMin: 600 }), 'wkSat');
});

test('aggregate — ago/2026: dedup por número e soma por bloco', () => {
  const byDay = {
    '02/08/2026': F.parseAuthRows([ROW_900002]),
    '03/08/2026': F.parseAuthRows([ROW_900004]),
    '04/08/2026': F.parseAuthRows([ROW_900004]), // mesmo número, outro dia
    '05/08/2026': F.parseAuthRows([ROW_900004]),
    '10/08/2026': F.parseAuthRows([ROW_900003]),
    '16/08/2026': F.parseAuthRows([ROW_900001])
  };
  const r = F.aggregate(byDay);
  assert.equal(r.auths.length, 4, '4 autorizações distintas (900004 contado 1x)');
  assert.equal(r.wkSatMin, 8 * 60 + 54, 'Semana/Sábado = 08:54 (só a 900004)');
  assert.equal(r.sunHolMin, 3 * (8 * 60), 'Dom/Feriado = 24:00 (900002 + 900003 + 900001)');
});

test('aggregate — vazio', () => {
  const r = F.aggregate({});
  assert.deepEqual({ wk: r.wkSatMin, sh: r.sunHolMin, n: r.auths.length }, { wk: 0, sh: 0, n: 0 });
});
