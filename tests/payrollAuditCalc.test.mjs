import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasPayroll: pay } = loadModule('payrollAuditCalc.js');
const S = pay.STATUS;

const H = (h, m = 0) => h * 60 + m;
const quad = (uteis = 0, sab = 0, domfer = 0) => ({ uteis, sab, domfer, total: uteis + sab + domfer });
const TODAY = new Date(2025, 5, 15); // 15/06/2025

function espelho(year, month, pecunia, noturnoPec = quad(), closed = true) {
  return { found: true, year, month, closed, footer: { pecunia, noturnoPec } };
}
const exp = (...args) => pay.expectedFromEspelho(espelho(...args));

// Tabela de rubricas no formato do portal (dados fictícios).
const HEADER = ['Código', 'Tipo', 'Discriminação', 'Ref.', 'Qtd.', 'Parcela', 'Valor (R$)'];
const row = (desc, ref, qty, value, tipo = 'C') => ['100001', tipo, desc, ref, qty, '001', value];
const UTIL = 'SERV. EXTRA - ÚTIL - PLEITOS - RPPS';
const SAB = 'SERV. EXTRA - SÁBADO - PLEITOS - RPPS';
const DOM = 'SERV. EXTRA. - DOMINGO - PLEITOS - RPPS';
const NOT_HE = 'ADIC NOTURNO SOBRE SERV. EXTRA ÚTIL - PLEITOS - RP';
const NOT = 'ADIC. NOTURNO - RPPS';

const lines = (...rows) => pay.parseRubricTable(HEADER, rows).lines;
function slip(key, ...rows) {
  return { key, status: pay.SLIP.LIDO, sheets: [{ n: '3', name: 'Normal', lines: lines(...rows) }] };
}
const empty = (key) => ({ key, status: pay.SLIP.LIDO, sheets: [] });
const run = (expected, slips) => pay.reconcile(expected, slips, { today: TODAY });

// ---------------------------------------------------------------------------
// Espelho
// ---------------------------------------------------------------------------
test('expectedFromEspelho soma pecúnia e noturno por faixa', () => {
  const e = exp(2024, 10, quad(H(2, 55), H(25, 5), H(22, 55)), quad(0, 0, H(2)));
  assert.equal(e.key, '2024-10');
  assert.equal(e.utilMin, H(2, 55));
  assert.equal(e.sabMin, H(25, 5));
  assert.equal(e.domferMin, H(24, 55));
  assert.equal(e.h50Min, H(28));
  assert.equal(e.h100Min, H(24, 55));
  assert.equal(e.nightMin, H(2));
  assert.deepEqual(e.night, { util: 0, sab: 0, domfer: H(2) });
  assert.equal(e.totalMin, H(52, 55));
  assert.equal(e.closed, true);
});

test('expectedFromEspelho recusa espelho não encontrado', () => {
  assert.deepEqual(pay.expectedFromEspelho(null), { found: false });
  assert.deepEqual(pay.expectedFromEspelho({ found: false }), { found: false });
});

test('neededPayslipKeys lista a janela dos meses fechados com pecúnia', () => {
  const expected = [
    exp(2025, 1, quad(0, H(8), 0)),
    exp(2025, 2, quad()),                         // sem pecúnia
    exp(2025, 4, quad(0, 0, H(6))),
    exp(2025, 5, quad(0, 0, H(6)), quad(), false) // mês aberto
  ];
  // 04/2025 -> 05, 06 (07 é futuro em relação a 15/06/2025)
  assert.deepEqual(pay.neededPayslipKeys(expected, { today: TODAY }), ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
  assert.deepEqual(pay.neededPayslipKeys(expected, { today: TODAY, skip: ['2025-02', '2025-06'] }), ['2025-03', '2025-04', '2025-05']);
  assert.deepEqual(
    pay.neededPayslipKeys([exp(2024, 12, quad(H(1), 0, 0))], { today: TODAY, windowMonths: 12 }),
    ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']
  );
});

// ---------------------------------------------------------------------------
// Contracheque
// ---------------------------------------------------------------------------
test('parseRubricTable guarda só serviço extraordinário e adicional noturno', () => {
  const t = pay.parseRubricTable(HEADER, [
    row('VENCIMENTO BÁSICO', '02/2025', '', '1.000,00'),
    row(UTIL, '01/2025', '004:33', '150,00'),
    row(SAB, '01/2025', '007:00', '210,00'),
    row(DOM, '01/2025', '018:00', '720,00'),
    row('SERV. EXTRA. - DOMINGO - ADM - RPPS', '01/2025', '002:00', '80,00'),
    row('SERV. EXTRAORDINÁRIO - SÁBADO', '01/2025', '001:30', '45,00'),
    row(NOT_HE, '01/2025', '000:16', '2,00'),
    row('ADIC. NOTURNO SOBRE SERV.EXTRA.ÚTIL', '01/2025', '000:08', '1,00'),
    row('ADIC NOTURNO SOBRE SERV. EXTRA DOM - PLEITOS - RPP', '01/2025', '002:17', '22,00'),
    row(NOT, '01/2025', '001:17', '9,00'),
    row('IMPOSTO DE RENDA SOBRE SERV. EXTRA', '02/2025', '', '99,00', 'D')
  ]);
  assert.equal(t.ok, true);
  assert.deepEqual(t.lines.map((l) => [l.kind, l.bucket, l.hoursMin]), [
    ['he', 'util', H(4, 33)],
    ['he', 'sab', H(7)],
    ['he', 'domfer', H(18)],
    ['he', 'domfer', H(2)],
    ['he', 'sab', H(1, 30)],
    ['noturno-he', 'util', 16],
    ['noturno-he', 'util', 8],
    ['noturno-he', 'domfer', H(2, 17)],
    ['noturno', '', H(1, 17)]
  ]);
  assert.equal(t.lines[0].refKey, '2025-01');
  assert.equal(t.lines[0].value, 150);
  assert.equal(t.lines[2].value, 720);
  assert.equal(t.lines[0].debit, false);
});

test('parseRubricTable lê desconto, exercício anterior e acessórios sem quantidade', () => {
  const [d, dea, atm, juros, semQtd] = lines(
    row(DOM, '09/2024', '000:01', '0,40', 'D'),
    row('SERV. EXTRA. - DOMINGO - PLEITOS - RPPS_DEA', '11/2024', '008:00', '1.320,50'),
    row('SERV. EXTRA - SÁBADO - PLEITOS - RPPS_DEA_ATM', '11/2024', '', '3,10'),
    row('SERV. EXTRAORDINÁRIO - DOMINGO_DEA_JUROS', '11/2024', '', '1,05'),
    row(SAB, '11/2024', '', '50,00')
  );
  assert.equal(d.debit, true);
  assert.equal(d.hoursMin, 1);
  assert.equal(dea.bucket, 'domfer');
  assert.equal(dea.value, 1320.5);
  assert.equal(dea.accessory, false);
  assert.deepEqual([atm.accessory, atm.hoursMin, atm.bucket], [true, null, 'sab']);
  assert.deepEqual([juros.accessory, juros.bucket], [true, 'domfer']);
  assert.deepEqual([semQtd.accessory, semQtd.hoursMin], [false, null]);
});

test('parseRubricTable acha as colunas pelo título e recusa tabela desconhecida', () => {
  const t = pay.parseRubricTable(['Discriminação', 'Valor (R$)', 'Ref.', 'Tipo', 'Qtd.'], [[SAB, '210,00', '01/2025', 'C', '007:00']]);
  assert.deepEqual([t.lines[0].bucket, t.lines[0].hoursMin, t.lines[0].value, t.lines[0].refKey], ['sab', H(7), 210, '2025-01']);
  assert.equal(pay.parseRubricTable(['Matrícula', 'CPF', 'Nome'], [['1', '2', '3']]).ok, false);
});

test('detectCompetence lê o título do contracheque', () => {
  assert.equal(pay.detectCompetence('Contracheque de Outubro de 2026'), '2026-10');
  assert.equal(pay.detectCompetence('Contracheque de março de 2024'), '2024-03');
  assert.equal(pay.detectCompetence('Mês/Ano: 05/2022'), '2022-05');
  assert.equal(pay.detectCompetence('Meu Espaço'), '');
});

// ---------------------------------------------------------------------------
// Conciliação
// ---------------------------------------------------------------------------
const JAN = () => exp(2025, 1, quad(H(4, 33), H(7), H(18)));
const WINDOW = (...slips) => {
  const have = new Set(slips.map((s) => s.key));
  return slips.concat(['2025-02', '2025-03', '2025-04'].filter((k) => !have.has(k)).map(empty));
};

test('pagamento no mês seguinte, faixa a faixa, fica conferido', () => {
  const r = run([JAN()], WINDOW(slip('2025-02',
    row(UTIL, '01/2025', '004:33', '136,50'),
    row(SAB, '01/2025', '007:00', '210,00'),
    row(DOM, '01/2025', '018:00', '720,00')
  )));
  const m = r.months[0];
  assert.equal(m.status, S.CONFERIDO);
  assert.equal(m.diffMin, 0);
  assert.deepEqual([m.buckets.util.paid, m.buckets.sab.paid, m.buckets.domfer.paid], [H(4, 33), H(7), H(18)]);
  assert.deepEqual(m.payslips, ['2025-02']);
  assert.equal(m.value, 1066.5);
  assert.equal(m.lines[0].sheetName, 'Normal');
  assert.equal(r.totals.count[S.CONFERIDO], 1);
  assert.equal(r.totals.missingMin, 0);
});

test('mês pago em duas folhas soma os pagamentos', () => {
  const r = run([JAN()], WINDOW(
    slip('2025-02', row(UTIL, '01/2025', '004:33', '136,50'), row(SAB, '01/2025', '007:00', '210,00')),
    slip('2025-04', row(DOM, '01/2025', '018:00', '720,00'))
  ));
  assert.equal(r.months[0].status, S.CONFERIDO);
  assert.deepEqual(r.months[0].payslips, ['2025-02', '2025-04']);
});

test('desconto de um minuto por faixa fica dentro da tolerância', () => {
  const r = run([JAN()], WINDOW(slip('2025-02',
    row(UTIL, '01/2025', '004:33', '136,50'), row(SAB, '01/2025', '007:00', '210,00'), row(DOM, '01/2025', '018:00', '720,00'),
    row(UTIL, '01/2025', '000:01', '0,50', 'D'), row(SAB, '01/2025', '000:01', '0,50', 'D'), row(DOM, '01/2025', '000:01', '0,67', 'D')
  )));
  assert.equal(r.months[0].status, S.CONFERIDO);
  assert.equal(r.months[0].diffMin, -3);
  assert.equal(Math.round(r.months[0].value * 100), 106483);
});

test('contracheque com menos horas que o espelho é pago a menor', () => {
  const r = run([JAN()], WINDOW(slip('2025-02',
    row(UTIL, '01/2025', '004:33', '136,50'), row(SAB, '01/2025', '007:00', '210,00'), row(DOM, '01/2025', '010:00', '400,00')
  )));
  assert.equal(r.months[0].status, S.A_MENOR);
  assert.equal(r.months[0].diffMin, -H(8));
  assert.equal(r.totals.missingMin, H(8));
});

test('contracheque com mais horas que o espelho é pago a maior', () => {
  const r = run([exp(2025, 1, quad(0, H(13, 34), H(24, 45)))], WINDOW(
    slip('2025-02', row(SAB, '01/2025', '013:34', '400,00'), row(DOM, '01/2025', '024:45', '990,00')),
    slip('2025-03', row(DOM, '01/2025', '024:00', '960,00'))
  ));
  assert.equal(r.months[0].status, S.A_MAIOR);
  assert.equal(r.months[0].diffMin, H(24));
  assert.equal(r.totals.excessMin, H(24));
  assert.equal(r.totals.missingMin, 0);
});

test('total certo em faixa de acréscimo errada é sinalizado', () => {
  const r = run([exp(2025, 1, quad(0, 0, H(10)))], WINDOW(slip('2025-02', row(SAB, '01/2025', '010:00', '300,00'))));
  assert.equal(r.months[0].status, S.FAIXA);
  assert.equal(r.months[0].diffMin, 0);
  // dia útil x sábado têm o mesmo acréscimo: não é divergência
  const ok = run([exp(2025, 1, quad(H(10), 0, 0))], WINDOW(slip('2025-02', row(SAB, '01/2025', '010:00', '300,00'))));
  assert.equal(ok.months[0].status, S.CONFERIDO);
});

test('janela toda lida sem pagamento: não localizado', () => {
  const r = run([JAN()], WINDOW());
  assert.equal(r.months[0].status, S.NAO_LOCALIZADO);
  assert.equal(r.months[0].value, null);
  assert.equal(r.totals.missingMin, H(29, 33));
});

test('contracheque da janela não lido nunca vira falha', () => {
  const unread = [empty('2025-02'), { key: '2025-03', status: pay.SLIP.NAO_LIDO, sheets: [] }, empty('2025-04')];
  const r = run([JAN()], unread);
  assert.equal(r.months[0].status, S.NAO_LIDO);
  assert.equal(r.months[0].windowUnread, true);
  assert.equal(r.totals.missingMin, 0);
  // contracheque que nem entrou na lista também conta como não lido
  assert.equal(run([JAN()], [empty('2025-02')]).months[0].status, S.NAO_LIDO);
  // pagamento parcial com janela incompleta também espera
  const partial = run([JAN()], [slip('2025-02', row(SAB, '01/2025', '007:00', '210,00'))]);
  assert.equal(partial.months[0].status, S.NAO_LIDO);
  assert.equal(partial.months[0].paidMin, H(7));
});

test('contracheque futuro ou ainda não publicado: aguardando', () => {
  const may = exp(2025, 5, quad(0, 0, H(6)));
  // 06/2025 é o mês corrente e não tem folha; 07 e 08 são futuros
  const r = run([may], [{ key: '2025-06', status: pay.SLIP.INDISPONIVEL, sheets: [] }]);
  assert.equal(r.months[0].status, S.AGUARDANDO);
  assert.equal(r.totals.missingMin, 0);
  // pago no contracheque já publicado: conferido mesmo com janela aberta
  const paid = run([may], [slip('2025-06', row(DOM, '05/2025', '006:00', '240,00'))]);
  assert.equal(paid.months[0].status, S.CONFERIDO);
});

test('linha de horas sem quantidade não permite conferir', () => {
  const r = run([exp(2025, 1, quad(0, H(7), 0))], WINDOW(slip('2025-02', row(SAB, '01/2025', '', '210,00'))));
  assert.equal(r.months[0].status, S.SEM_QTD);
  assert.equal(r.months[0].noQty, true);
  assert.equal(r.totals.missingMin, 0);
});

test('acessório sem quantidade soma valor e não mexe nas horas', () => {
  const r = run([exp(2025, 1, quad(0, H(7), 0))], WINDOW(slip('2025-03',
    row('SERV. EXTRA - SÁBADO - PLEITOS - RPPS_DEA', '01/2025', '007:00', '210,00'),
    row('SERV. EXTRA - SÁBADO - PLEITOS - RPPS_DEA_ATM', '01/2025', '', '3,00'),
    row('SERV. EXTRA - SÁBADO - PLEITOS - RPPS_DEA_JUROS', '01/2025', '', '1,00')
  )));
  assert.equal(r.months[0].status, S.CONFERIDO);
  assert.equal(r.months[0].noQty, false);
  assert.equal(r.months[0].value, 214);
});

test('pagamento sem horas correspondentes no espelho é listado à parte', () => {
  const expected = [JAN(), exp(2025, 2, quad()), exp(2025, 5, quad(0, 0, H(6)), quad(), false)];
  const r = run(expected, WINDOW(
    slip('2025-02', row(UTIL, '01/2025', '004:33', '136,50'), row(SAB, '01/2025', '007:00', '210,00'), row(DOM, '01/2025', '018:00', '720,00')),
    slip('2025-03',
      row(UTIL, '02/2025', '000:01', '0,50'), row(DOM, '02/2025', '000:01', '0,67'), // mês sem pecúnia
      row(DOM, '08/2024', '004:00', '160,00'),                                         // fora do período
      row(DOM, '05/2025', '006:00', '240,00'),                                         // mês ainda aberto
      row(SAB, '', '002:00', '60,00')                                                  // sem referência
    )
  ));
  assert.equal(r.months.length, 1);
  assert.equal(r.months[0].status, S.CONFERIDO);
  assert.deepEqual(r.orphans.map((o) => [o.refKey, o.payslipKey, o.count, o.hoursMin, o.why]), [
    ['2024-08', '2025-03', 1, H(4), 'fora-do-periodo'],
    ['2025-02', '2025-03', 2, 2, 'sem-pecunia-no-espelho'],
    ['2025-05', '2025-03', 1, H(6), 'mes-aberto']
  ]);
  assert.equal(Math.round(r.orphans[1].value * 100), 117);
  assert.equal(r.unallocated.length, 1);
  assert.equal(r.unallocated[0].why, 'sem-referencia');
  assert.equal(r.totals.orphans, 3);
});

test('adicional noturno sobre serviço extraordinário é conferido com o fator 8/7', () => {
  // 2:04 noturnas -> 2:22 na quantidade do adicional
  const e = exp(2025, 1, quad(H(12, 15), 0, 0), quad(H(2, 4), 0, 0));
  const he = row(UTIL, '01/2025', '014:19', '430,00');
  const ok = run([e], WINDOW(slip('2025-02', he, row(NOT_HE, '01/2025', '002:22', '18,00'), row(NOT, '01/2025', '003:00', '20,00'))));
  assert.equal(ok.months[0].status, S.CONFERIDO);
  assert.equal(ok.months[0].night.expectedMin, H(2, 22));
  assert.equal(ok.months[0].night.status, 'ok');
  assert.equal(ok.months[0].night.commonMin, H(3));
  assert.equal(ok.totals.nightFlags, 0);

  const less = run([e], WINDOW(slip('2025-02', he, row(NOT_HE, '01/2025', '001:00', '8,00'))));
  assert.equal(less.months[0].night.status, 'a-menor');
  assert.equal(less.totals.nightFlags, 1);

  const none = run([e], WINDOW(slip('2025-02', he)));
  assert.equal(none.months[0].night.status, 'nao-localizado');
  assert.equal(none.months[0].status, S.CONFERIDO);

  const waiting = run([e], [slip('2025-02', he)]);
  assert.equal(waiting.months[0].night.status, 'pendente');
  assert.equal(waiting.totals.nightFlags, 0);

  assert.equal(run([JAN()], WINDOW()).months[0].night.status, null);
});

test('valor por hora destoante entre as linhas do mês é sinalizado', () => {
  // base 20,00/h: sábado 10h x 1,5 = 300,00; domingo 10h x 2 = 400,00
  const e = exp(2025, 1, quad(0, H(10), H(10)));
  const ok = run([e], WINDOW(slip('2025-02', row(SAB, '01/2025', '010:00', '300,00'), row(DOM, '01/2025', '010:00', '400,00'))));
  assert.equal(ok.months[0].rate.base, 20);
  assert.equal(ok.months[0].rate.flag, false);
  assert.equal(ok.totals.rateFlags, 0);
  // domingo pago com acréscimo de 50%
  const bad = run([e], WINDOW(slip('2025-02', row(SAB, '01/2025', '010:00', '300,00'), row(DOM, '01/2025', '010:00', '300,00'))));
  assert.equal(bad.months[0].status, S.CONFERIDO);
  assert.equal(bad.months[0].rate.flag, true);
  assert.equal(bad.totals.rateFlags, 1);
  // linha de poucos minutos não entra na comparação
  const tiny = run([e], WINDOW(slip('2025-02',
    row(SAB, '01/2025', '009:59', '299,50'), row(SAB, '01/2025', '000:01', '0,60'), row(DOM, '01/2025', '010:00', '400,00'))));
  assert.equal(tiny.months[0].rate.flag, false);
});

test('totais somam horas e meses por situação', () => {
  const expected = [JAN(), exp(2025, 2, quad(0, 0, H(8))), exp(2025, 3, quad(0, H(5), 0))];
  const r = run(expected, [
    slip('2025-02', row(UTIL, '01/2025', '004:33', '136,50'), row(SAB, '01/2025', '007:00', '210,00'), row(DOM, '01/2025', '018:00', '720,00')),
    empty('2025-03'), empty('2025-04'), empty('2025-05'), empty('2025-06')
  ]);
  assert.deepEqual(r.months.map((m) => m.status), [S.CONFERIDO, S.NAO_LOCALIZADO, S.NAO_LOCALIZADO]);
  assert.equal(r.totals.months, 3);
  assert.equal(r.totals.expectedMin, H(42, 33));
  assert.equal(r.totals.paidMin, H(29, 33));
  assert.equal(r.totals.min[S.NAO_LOCALIZADO], H(13));
  assert.equal(r.totals.missingMin, H(13));
  assert.equal(r.totals.valueTotal, 1066.5);
});
