import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasHEAuthFetch: F } = loadModule('heAuthFetch.js');

// Linhas reais do endpoint AutorizacaoHoraExcedenteAction_execute (ago/2026, mat 30901018)
// [num, desc, horas, validade, tipo, limUteis, limSab, limDom, periodo]
const ROW_179416 = ['179416', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '02/08/2026 a 09/08/2026'];
const ROW_180956 = ['180956', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:54', '29/02/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/08/2026 a 09/08/2026'];
const ROW_179430 = ['179430', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '10/08/2026 a 11/08/2026'];
const ROW_179367 = ['179367', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '008:00', '29/02/2028', 'Pecúnia', '000:00', '000:00', '010:00', '12/08/2026 a 31/08/2026'];

test('parseAuthRows — extrai campos e converte horas', () => {
  const [a] = F.parseAuthRows([ROW_180956]);
  assert.equal(a.num, '180956');
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
  assert.equal(F.classifyAuth(F.parseAuthRows([ROW_179416])[0]), 'sunHol');
  assert.equal(F.classifyAuth(F.parseAuthRows([ROW_180956])[0]), 'wkSat');
  // limite útil + domingo => wkSat (não é dom-only)
  assert.equal(F.classifyAuth({ limUteisMin: 60, limSabMin: 0, limDomMin: 600 }), 'wkSat');
});

test('aggregate — ago/2026: dedup por número e soma por bloco', () => {
  const byDay = {
    '02/08/2026': F.parseAuthRows([ROW_179416]),
    '03/08/2026': F.parseAuthRows([ROW_180956]),
    '04/08/2026': F.parseAuthRows([ROW_180956]), // mesmo número, outro dia
    '05/08/2026': F.parseAuthRows([ROW_180956]),
    '10/08/2026': F.parseAuthRows([ROW_179430]),
    '16/08/2026': F.parseAuthRows([ROW_179367])
  };
  const r = F.aggregate(byDay);
  assert.equal(r.auths.length, 4, '4 autorizações distintas (180956 contado 1x)');
  assert.equal(r.wkSatMin, 8 * 60 + 54, 'Semana/Sábado = 08:54 (só a 180956)');
  assert.equal(r.sunHolMin, 3 * (8 * 60), 'Dom/Feriado = 24:00 (179416 + 179430 + 179367)');
});

test('aggregate — vazio', () => {
  const r = F.aggregate({});
  assert.deepEqual({ wk: r.wkSatMin, sh: r.sunHolMin, n: r.auths.length }, { wk: 0, sh: 0, n: 0 });
});

// Bug reportado pelo usuário (set/2026, mat 30901018): o SAEX às vezes NÃO
// reaproveita o mesmo Núm. nos dias cobertos pela mesma autorização — atribui
// um Núm. NOVO a cada dia (185112 sáb 05/09, 185113 sáb 12/09, 185114 sáb
// 19/09, 185115 sáb 26/09), todos com o MESMO Período/Tipo/Horas/limites
// (24h, só sábado, 01/09/2026 a 30/09/2026). Dedup só por Núm. contava as 4
// como autorizações distintas e somava 24×4=96h em vez de 24h.
const ROW_185112 = ['185112', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '024:00', '31/03/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/09/2026 a 30/09/2026'];
const ROW_185113 = ['185113', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '024:00', '31/03/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/09/2026 a 30/09/2026'];
const ROW_185114 = ['185114', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '024:00', '31/03/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/09/2026 a 30/09/2026'];
const ROW_185115 = ['185115', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '024:00', '31/03/2028', 'Pecúnia', '002:00', '010:00', '000:00', '01/09/2026 a 30/09/2026'];
const ROW_185092 = ['185092', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '016:00', '31/03/2028', 'Pecúnia', '000:00', '000:00', '010:00', '01/09/2026 a 30/09/2026'];
const ROW_185093 = ['185093', 'AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX)', '016:00', '31/03/2028', 'Pecúnia', '000:00', '000:00', '010:00', '01/09/2026 a 30/09/2026'];

test('aggregate — Núm. novo por dia dentro do mesmo Período conta 1x (bug do KPI inflado)', () => {
  const byDay = {
    '05/09/2026': F.parseAuthRows([ROW_185112]),
    '12/09/2026': F.parseAuthRows([ROW_185113]),
    '19/09/2026': F.parseAuthRows([ROW_185114]),
    '26/09/2026': F.parseAuthRows([ROW_185115]),
    '06/09/2026': F.parseAuthRows([ROW_185092]),
    '13/09/2026': F.parseAuthRows([ROW_185093])
  };
  const r = F.aggregate(byDay);
  assert.equal(r.auths.length, 2, '2 autorizações distintas (sábados dedup 1x, domingos dedup 1x)');
  assert.equal(r.wkSatMin, 24 * 60, 'sábados = 24h (não 24×4=96h)');
  assert.equal(r.sunHolMin, 16 * 60, 'domingos = 16h (não 16×2=32h)');
});

test('authKey — mesmo Período/Tipo/Horas/limites gera a mesma chave mesmo com Núm. diferente', () => {
  const [a112] = F.parseAuthRows([ROW_185112]);
  const [a113] = F.parseAuthRows([ROW_185113]);
  assert.equal(F.authKey(a112), F.authKey(a113));
});

test('authKey — Período diferente gera chave diferente (autorizações distintas não colapsam)', () => {
  const [a112] = F.parseAuthRows([ROW_185112]);
  const [a092] = F.parseAuthRows([ROW_185092]);
  assert.notEqual(F.authKey(a112), F.authKey(a092));
});

// chrome.storage.local em memória, pré-semeado (o mock padrão de helpers.mjs
// sempre devolve {} do get, então não dá pra testar leitura de cache com ele).
function mkChrome(seed = {}) {
  const store = { ...seed };
  return {
    _store: store,
    storage: {
      local: {
        get: (defaults, cb) => {
          const out = {};
          Object.keys(defaults || {}).forEach((k) => { out[k] = (k in store) ? store[k] : defaults[k]; });
          cb(out);
        },
        set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); }
      }
    }
  };
}

test('getForCurrentMonth — cache "fechado" zerado e sem autorizações nunca é definitivo', () => {
  // Simula o rastro de uma leitura antiga feita com a aba oculta: o mês foi
  // marcado como fechado, mas authDaysFromEspelho() não achou nenhum dia
  // (innerText em branco) — sem a correção, isFresh() trataria isso como
  // definitivo pra sempre (mês fechado nunca revalida) e o card nunca mais
  // mostraria o autorizado real.
  const mat = '30901018';
  const monthKey = '2026-08';
  const key = 'je_xt_he_saex_v1_' + mat;
  const chrome = mkChrome({
    [key]: { [monthKey]: { wkSatMin: 0, sunHolMin: 0, auths: [], closed: true, fetchedAt: 1 } }
  });
  const { JEPessoasHEAuthFetch: F2 } = loadModule('heAuthFetch.js', { chrome });

  let result;
  F2.getForCurrentMonth(mat, monthKey, {}, (r) => { result = r; });
  assert.equal(result.fromCache, false, 'não aceita o cache zerado como definitivo — revalida em vez de devolver fromCache:true');
});

test('getForCurrentMonth — cache "fechado" COM autorizações continua definitivo (não revalida à toa)', () => {
  const mat = '30901018';
  const monthKey = '2026-08';
  const key = 'je_xt_he_saex_v1_' + mat;
  const chrome = mkChrome({
    [key]: { [monthKey]: { wkSatMin: 534, sunHolMin: 1920, auths: [{ num: '180956' }], closed: true, fetchedAt: 1 } }
  });
  const { JEPessoasHEAuthFetch: F2 } = loadModule('heAuthFetch.js', { chrome });

  let result;
  F2.getForCurrentMonth(mat, monthKey, {}, (r) => { result = r; });
  assert.equal(result.fromCache, true);
  assert.equal(result.wkSatMin, 534);
});
