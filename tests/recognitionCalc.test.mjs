import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const legal = loadModule('legalConfig.js');
const lost = loadModule('lostHoursCalc.js', legal);
const { JEPessoasRecognition: rec } = loadModule('recognitionCalc.js', Object.assign({}, legal, lost));

const H = (h, m = 0) => h * 60 + m;
const zero = () => ({ uteis: 0, sab: 0, domfer: 0, total: 0 });
const quad = (uteis, sab, domfer) => ({ uteis, sab, domfer, total: uteis + sab + domfer });

function footer(over = {}) {
  return Object.assign({
    pecunia: zero(), noturnoPec: zero(), homolog: zero(), naoHomolog: zero(), excedeu: zero(),
    utilBancoMin: 0, residuoMin: 0
  }, over);
}

let seq = 0;
function day(o) {
  seq += 1;
  return Object.assign({
    date: String(seq).padStart(2, '0') + '/03/2024',
    isWeekend: false, isSaturday: false, isHoliday: false, isDispensed: false, hasAuth: false,
    totalMin: 0, pecuniaMin: 0, noturnoPecMin: 0, targetMin: 420
  }, o);
}
const sat = (o) => day(Object.assign({ isWeekend: true, isSaturday: true, targetMin: 0 }, o));
const sun = (o) => day(Object.assign({ isWeekend: true, targetMin: 0 }, o));
function month(days, f, extra = {}) {
  seq = 0;
  return Object.assign({ found: true, year: 2024, month: 3, closed: true, hybrid: false, days, footer: footer(f) }, extra);
}
const q = (o) => [o.uteis, o.sab, o.domfer, o.total];

test('mês fechado separa feitas, pagas, banco, compensadas e a reconhecer', () => {
  seq = 0;
  const s = rec.summarizeMonth(month([
    day({ totalMin: H(10) }),                    // +3h
    day({ totalMin: H(6) }),                     // -1h (compensa)
    sat({ totalMin: H(5), pecuniaMin: H(5) }),   // pago
    sun({ totalMin: H(4) })                      // homologado
  ], {
    pecunia: quad(0, H(5), 0),
    homolog: quad(H(1), 0, H(4))
  }));
  assert.equal(s.status, 'fechado');
  assert.deepEqual(q(s.worked), [H(3), H(5), H(4), H(12)]);
  assert.deepEqual(q(s.paid), [0, H(5), 0, H(5)]);
  assert.deepEqual(q(s.bank), [H(1), 0, H(4), H(5)]);
  assert.equal(s.compensatedMin, H(1));
  assert.deepEqual(q(s.pending), [H(1), 0, 0, H(1)]);
  assert.equal(s.unexplainedMin, 0);
});

test('a reconhecer é dividido por tipo de dia e destaca o que passou de 10h', () => {
  seq = 0;
  const sabado = sat({ totalMin: H(8), pecuniaMin: H(5), hasAuth: true });
  const domingo = sun({ totalMin: H(11, 30), pecuniaMin: H(10) });
  const s = rec.summarizeMonth(month([day({ totalMin: H(9) }), sabado, domingo], {
    pecunia: quad(0, H(5), H(10))
  }));
  assert.deepEqual(q(s.pending), [H(2), H(3), H(1, 30), H(6, 30)]);
  assert.deepEqual(q(s.aboveCap), [0, 0, H(1, 30), H(1, 30)]);
  assert.equal(s.pay50Min, H(5));
  assert.equal(s.pay100Min, H(1, 30));
  // banco: úteis ×1 + sábado ×1,5 + domingo/feriado ×2
  assert.equal(s.creditMin, H(2) + H(4, 30) + H(3));
  assert.equal(s.unexplainedMin, 0);
});

test('adicional noturno em pecúnia conta como hora paga', () => {
  seq = 0;
  const s = rec.summarizeMonth(month(
    [day({ totalMin: H(9), pecuniaMin: H(1, 30), noturnoPecMin: 30 })],
    { pecunia: quad(H(1, 30), 0, 0), noturnoPec: quad(30, 0, 0) }
  ));
  assert.equal(s.paid.total, H(2));
  assert.equal(s.pending.total, 0);
});

test('não homologadas entram em a reconhecer', () => {
  seq = 0;
  const s = rec.summarizeMonth(month([day({ totalMin: H(9) }), sun({ totalMin: H(6) })], {
    homolog: quad(0, 0, H(4)),
    naoHomolog: quad(H(2), 0, H(2))
  }));
  assert.deepEqual(q(s.pending), [H(2), 0, H(2), H(4)]);
  assert.deepEqual(s.days.map((d) => [d.kind, d.pendingMin, d.items[0].code]),
    [['uteis', H(2), 'nao-homologada'], ['domfer', H(2), 'nao-homologada']]);
});

test('detalhe por dia traz total, jornada, feitas, pagas e a reconhecer', () => {
  seq = 0;
  const d = sat({ totalMin: H(8), pecuniaMin: H(5), hasAuth: true });
  const s = rec.summarizeMonth(month([d], { pecunia: quad(0, H(5), 0) }));
  assert.deepEqual(s.days, [{
    date: d.date, kind: 'sab', totalMin: H(8), targetMin: 0, workedMin: H(8), paidMin: H(5), pendingMin: H(3),
    hasAuth: true, items: [{ code: 'sem-destino', min: H(3) }]
  }]);
});

test('sábado feriado conta como domingo/feriado', () => {
  seq = 0;
  const s = rec.summarizeMonth(month([sat({ totalMin: H(4), isHoliday: true })]));
  assert.deepEqual(q(s.pending), [0, 0, H(4), H(4)]);
  assert.equal(s.pay100Min, H(4));
});

test('mês híbrido é informativo e não gera hora a reconhecer', () => {
  seq = 0;
  const s = rec.summarizeMonth(month([sat({ totalMin: H(8) }), day({ totalMin: H(9) })], {}, { hybrid: true }));
  assert.equal(s.status, 'hibrido');
  assert.equal(s.pending.total, 0);
  assert.equal(s.hybridMin, H(10));
  assert.equal(s.creditMin, 0);
  assert.equal(s.unexplainedMin, 0);
});

test('mês aberto é estimativa e só conta os dias já encerrados', () => {
  seq = 0;
  const a = month([
    day({ totalMin: H(10) }),                     // 01/03 +3h
    day({ totalMin: H(6) }),                      // 02/03 -1h
    sat({ totalMin: H(4), pecuniaMin: H(1) }),    // 03/03 3h sem destino
    day({ totalMin: 0 }),                         // 04/03 hoje: fora
    day({ totalMin: 0 })                          // 05/03 futuro: fora
  ], {}, { closed: false });
  const s = rec.summarizeMonth(a, { today: new Date(2024, 2, 4) });
  assert.equal(s.status, 'aberto');
  assert.equal(s.estimate, true);
  assert.deepEqual(q(s.worked), [H(3), H(4), 0, H(7)]);
  assert.deepEqual(q(s.pending), [H(2), H(3), 0, H(5)]);
  assert.equal(s.compensatedMin, H(1));
  assert.equal(s.unexplainedMin, 0);
});

test('totais do servidor somam só mês fechado fora do híbrido', () => {
  seq = 0;
  const fechado = rec.summarizeMonth(month([day({ totalMin: H(9) }), sat({ totalMin: H(2) })]));
  const hibrido = rec.summarizeMonth(month([sat({ totalMin: H(8) })], {}, { hybrid: true }));
  const aberto = rec.summarizeMonth(month([sun({ totalMin: H(3) })], {}, { closed: false }), { today: new Date(2024, 5, 1) });
  const t = rec.summarizeServer([fechado, hibrido, aberto, { found: false }]);
  assert.equal(t.months, 1);
  assert.equal(t.monthsWithPending, 1);
  assert.deepEqual(q(t.pending), [H(2), H(2), 0, H(4)]);
  assert.equal(t.creditMin, H(2) + H(3));
  assert.equal(t.hybridMonths, 1);
  assert.equal(t.hybridMin, H(8));
  assert.equal(t.openMonths, 1);
  assert.equal(t.openPendingMin, H(3));
});

test('totais da equipe somam os servidores e recalculam o crédito', () => {
  seq = 0;
  const a = rec.summarizeServer([rec.summarizeMonth(month([sat({ totalMin: H(1) })]))]);
  const b = rec.summarizeServer([rec.summarizeMonth(month([sat({ totalMin: H(1) }), sun({ totalMin: H(2) })]))]);
  const t = rec.summarizeTeam([a, b]);
  assert.equal(t.months, 2);
  assert.deepEqual(q(t.pending), [0, H(2), H(2), H(4)]);
  assert.equal(t.pay50Min, H(2));
  assert.equal(t.pay100Min, H(2));
  assert.equal(t.creditMin, H(3) + H(4));
});

test('acima de 60h de serviço extraordinário no mês é sinalizado', () => {
  seq = 0;
  const dias = [];
  for (let i = 0; i < 7; i++) dias.push(sun({ totalMin: H(10), pecuniaMin: H(10) }));
  const s = rec.summarizeMonth(month(dias, { pecunia: quad(0, 0, H(70)) }));
  assert.equal(s.extraordinaryMin, H(70));
  assert.equal(s.overMonthlyMin, H(10));
});

test('espelho sem tabela ou sem dias não gera resumo', () => {
  assert.deepEqual(rec.summarizeMonth({ found: false }), { found: false });
  assert.deepEqual(rec.summarizeMonth({ found: true, days: [] }), { found: false });
});

test('monthRange lista os meses do período, inclusive, em qualquer ordem', () => {
  assert.deepEqual(rec.monthRange('2025-11', '2026-02').map((m) => m.key), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.deepEqual(rec.monthRange('2026-02', '2025-12').map((m) => m.key), ['2025-12', '2026-01', '2026-02']);
  assert.deepEqual(rec.monthRange('', '2026-02'), []);
});

test('agrupamento mês → servidor soma cada mês e conta os servidores com o mês fechado', () => {
  const m = (key, label, extra, days) => Object.assign(rec.summarizeMonth(month(days, {}, extra)), { key, label });
  const ana = { name: 'Servidora Fictícia A', matricula: '0001', months: [
    m('2024-03', '03/2024', {}, [sat({ totalMin: H(2) })]),
    m('2024-04', '04/2024', { month: 4 }, [sat({ totalMin: H(1) })])
  ] };
  const bia = { name: 'Servidor Fictício B', matricula: '0002', months: [
    m('2024-03', '03/2024', { hybrid: true }, [sat({ totalMin: H(3) })]),
    m('2024-04', '04/2024', { month: 4 }, [sun({ totalMin: H(1) })])
  ] };
  const g = rec.groupByMonth([ana, bia, { name: 'Sem espelho', matricula: '0003', months: [] }]);
  assert.deepEqual(g.map((x) => x.key), ['2024-03', '2024-04']);
  assert.deepEqual(g[0].rows.map((r) => [r.index, r.name]), [[0, 'Servidora Fictícia A'], [1, 'Servidor Fictício B']]);
  assert.equal(g[0].totals.months, 1, 'só um servidor com 03/2024 fechado fora do híbrido');
  assert.equal(g[0].totals.hybridMonths, 1);
  assert.equal(g[0].totals.pending.total, H(2));
  assert.equal(g[1].totals.months, 2);
  assert.equal(g[1].totals.pending.sab, H(1));
  assert.equal(g[1].totals.pending.domfer, H(1));
  assert.equal(g[1].totals.creditMin, Math.round(H(1) * 1.5 + H(1) * 2));
});

test('agrupamento mês → servidor sem servidores devolve lista vazia', () => {
  assert.deepEqual(rec.groupByMonth([]), []);
  assert.deepEqual(rec.groupByMonth(null), []);
});
