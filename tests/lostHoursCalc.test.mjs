import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasLostCalc: calc } = loadModule('lostHoursCalc.js');
const { JEPessoasAuthScan: scan } = loadModule('authorizationScan.js');

const H = (h, m = 0) => h * 60 + m;
const zero = () => ({ uteis: 0, sab: 0, domfer: 0, total: 0 });

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
const month = (days, f, extra = {}) => Object.assign({ found: true, closed: true, hybrid: false, days, footer: footer(f) }, extra);
const codes = (entry) => entry.items.map((i) => [i.code, i.min]);

test('dia útil acima de 2h compensa dia curto do mês e não vira perda', () => {
  const r = calc.computeMonthLoss(month([day({ totalMin: H(10) }), day({ totalMin: H(4) })]));
  assert.equal(r.netWeekdayMin, 0);
  assert.equal(r.p2, 0);
  assert.deepEqual(r.days, {});
});

test('sobra do mês fica nos últimos dias com excedente', () => {
  const a = day({ totalMin: H(9) });
  const b = day({ totalMin: H(8) });
  const c = day({ totalMin: H(6) });
  const r = calc.computeMonthLoss(month([a, b, c]));
  assert.equal(r.p2, H(2));
  assert.deepEqual(codes(r.days[b.date]), [['sobra-mes', H(1)]]);
  assert.deepEqual(codes(r.days[a.date]), [['sobra-mes', H(1)]]);
});

test('não homologadas de dia útil são identificadas e não entram em P2', () => {
  const a = day({ totalMin: H(9) });
  const r = calc.computeMonthLoss(month([a], { naoHomolog: { uteis: H(2), sab: 0, domfer: 0, total: H(2) } }));
  assert.equal(r.p1, H(2));
  assert.equal(r.p2, 0);
  assert.deepEqual(codes(r.days[a.date]), [['nao-homologada', H(2)]]);
});

test('pecúnia noturna conta como paga no dia útil e no fim de semana', () => {
  const r = calc.computeMonthLoss(month(
    [day({ totalMin: H(9), pecuniaMin: H(1, 30), noturnoPecMin: 30 }), sun({ totalMin: H(10), pecuniaMin: H(9, 28), noturnoPecMin: 32 })],
    { pecunia: { uteis: H(1, 30), sab: 0, domfer: H(9, 28), total: H(10, 58) }, noturnoPec: { uteis: 30, sab: 0, domfer: 32, total: 62 } }
  ));
  assert.equal(r.p2, 0);
  assert.equal(r.p5, 0);
  assert.deepEqual(r.days, {});
});

test('acima de 10h é perda exata em fim de semana', () => {
  const d = sun({ totalMin: H(11, 41), pecuniaMin: H(10) });
  const r = calc.computeMonthLoss(month([d], { pecunia: { uteis: 0, sab: 0, domfer: H(10), total: H(10) } }));
  assert.equal(r.p3, H(1, 41));
  assert.deepEqual(codes(r.days[d.date]), [['teto-10h', H(1, 41)]]);
});

test('fim de semana sem destino separa autorizado acima do limite e a conferir', () => {
  const d = sat({ totalMin: H(8), pecuniaMin: H(5), hasAuth: true });
  const r = calc.computeMonthLoss(month([d], {
    pecunia: { uteis: 0, sab: H(5), domfer: 0, total: H(5) },
    excedeu: { uteis: 0, sab: H(1), domfer: 0, total: H(1) }
  }));
  assert.equal(r.p5, H(3));
  assert.deepEqual(codes(r.days[d.date]), [['acima-autorizado', H(1)], ['sem-destino', H(2)]]);
  assert.deepEqual(r.alerts, [{ date: d.date, min: H(2) }]);
});

test('fim de semana sem autorização não gera alerta de conferência', () => {
  const r = calc.computeMonthLoss(month([sat({ totalMin: H(3) })]));
  assert.equal(r.p5, H(3));
  assert.deepEqual(r.alerts, []);
});

test('homologadas de fim de semana não são perda; não homologadas vão para P1', () => {
  const d = sun({ totalMin: H(6) });
  const r = calc.computeMonthLoss(month([d], {
    homolog: { uteis: 0, sab: 0, domfer: H(4), total: H(4) },
    naoHomolog: { uteis: 0, sab: 0, domfer: H(2), total: H(2) }
  }));
  assert.equal(r.p1, H(2));
  assert.equal(r.p5, 0);
  assert.deepEqual(codes(r.days[d.date]), [['nao-homologada', H(2)]]);
});

test('sábado feriado usa o saldo de domingo/feriado', () => {
  const d = sat({ totalMin: H(4), isHoliday: true });
  const r = calc.computeMonthLoss(month([d], { homolog: { uteis: 0, sab: 0, domfer: H(4), total: H(4) } }));
  assert.equal(r.p5, 0);
});

test('mês híbrido não gera perda e deixa o descarte como informação', () => {
  const d = sat({ totalMin: H(8) });
  const r = calc.computeMonthLoss(month([d, day({ totalMin: H(9) })], {}, { hybrid: true }));
  assert.equal(r.p1 + r.p2 + r.p3 + r.p5, 0);
  assert.equal(r.discardedHybridMin, H(10));
  assert.equal(r.days[d.date].lostMin, 0);
  assert.deepEqual(codes(r.days[d.date]), [['hibrido', H(8)]]);
});

test('mês aberto não apura perda', () => {
  const r = calc.computeMonthLoss(month([sun({ totalMin: H(12) })], {}, { closed: false }));
  assert.equal(r.p3, 0);
  assert.deepEqual(r.days, {});
});

test('dia dispensado fica fora da conta do mês', () => {
  const r = calc.computeMonthLoss(month([day({ totalMin: 0, isDispensed: true }), day({ totalMin: H(7) })]));
  assert.equal(r.netWeekdayMin, 0);
});

test('abono em faixa de horário vale a duração da faixa', () => {
  assert.equal(scan.parseAbonoMin('12:00 a 15:30'), H(3, 30));
  assert.equal(scan.parseAbonoMin('03:00'), H(3));
  assert.equal(scan.parseAbonoMin(''), 0);
});

test('destino do mês fecha: excedente = compensado + pago + banco + perdido', () => {
  const longo = day({ totalMin: H(10) });
  const curto = day({ totalMin: H(6) });
  const dom = sun({ totalMin: H(4), pecuniaMin: H(4) });
  const f = { pecunia: { uteis: 0, sab: 0, domfer: H(4), total: H(4) }, homolog: { uteis: H(1), sab: 0, domfer: 0, total: H(1) } };
  const a = month([longo, curto, dom], f);
  const d = calc.computeMonthDestination(a, calc.computeMonthLoss(a));
  assert.equal(d.excessMin, H(7));
  assert.equal(d.compensatedMin, H(1));
  assert.equal(d.paidMin, H(4));
  assert.equal(d.homologMin, H(1));
  assert.equal(d.lostMin, H(1));
  assert.equal(d.unexplainedMin, 0);
});

test('destino do mês: débito vem do Resíduo negativo', () => {
  const a = month([day({ totalMin: H(5) })], { residuoMin: -H(2) });
  const d = calc.computeMonthDestination(a, calc.computeMonthLoss(a));
  assert.equal(d.debitMin, H(2));
  assert.equal(d.excessMin, 0);
});

test('vocabulário comum: termos do Destino do mês e selos dos motivos de perda', () => {
  const { JEPessoasLostCalc: L } = loadModule('lostHoursCalc.js');
  assert.deepEqual(['excedente', 'compensou', 'pago', 'banco', 'perdido', 'debito', 'naoConciliado'].map((k) => L.TERMS[k].label),
    ['Excedente', 'Compensou dias curtos', 'Pago', 'Banco', 'Perdido', 'Débito do mês', 'Não conciliado']);
  Object.values(L.TERMS).forEach((t) => assert.ok(t.tip.length > 20, t.label));
  assert.equal(L.reasonInfo('teto-10h').label, 'Acima de 10h');
  assert.equal(L.reasonInfo('sobra-mes').label, 'Sobra do mês');
  assert.equal(L.reasonInfo('sem-destino', true).label, 'Não paga: conferir');
  assert.equal(L.reasonInfo('sem-destino', false).label, 'Sem autorização');
  assert.equal(L.reasonInfo('codigo-novo').label, 'codigo-novo');
});
