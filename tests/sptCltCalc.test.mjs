import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadModule } from './helpers.mjs';

const mod = loadModule('sptCltCalc.js');
const C = mod.JEPessoasSptCltCalc;

test('sptCltCalc — parseTimeMin e formatMin convertem horarios SPT e CLT', () => {
  assert.equal(C.parseTimeMin('09:14:00'), 554);
  assert.equal(C.parseTimeMin('08:00'), 480);
  assert.equal(C.parseTimeMin('::00'), 0);
  assert.equal(C.parseTimeMin(''), 0);
  assert.equal(C.formatMin(554), '09:14');
  assert.equal(C.formatMin(45, true), '+00:45');
  assert.equal(C.formatMin(-37, true), '-00:37');
});

test('sptCltCalc — previousMonthPeriod retorna o mes imediatamente anterior ao atual', () => {
  const pNov = C.previousMonthPeriod(new Date(2026, 10, 17));
  assert.equal(pNov.fromIso, '2026-10-01');
  assert.equal(pNov.toIso, '2026-10-31');
  assert.equal(pNov.fromBr, '01/10/2026');
  assert.equal(pNov.toBr, '31/10/2026');
  assert.equal(pNov.label, '10/2026');

  const pJan = C.previousMonthPeriod(new Date(2027, 0, 5));
  assert.equal(pJan.fromIso, '2026-12-01');
  assert.equal(pJan.toIso, '2026-12-31');
  assert.equal(pJan.label, '12/2026');
});

test('A6 — getLocalTodayIso usa fuso local America/Sao_Paulo em vez de toISOString() UTC', () => {
  // 2026-10-15 às 22h30 em Brasília = 2026-10-16T01:30:00Z em UTC
  const lateNightBrasilia = new Date('2026-10-16T01:30:00.000Z');
  assert.equal(lateNightBrasilia.toISOString().slice(0, 10), '2026-10-16');
  assert.equal(C.getLocalTodayIso(lateNightBrasilia), '2026-10-15');
});

test('sptCltCalc — splitDateRangeByMonth fatia periodo multi-mes corretamente', () => {
  const slices = C.splitDateRangeByMonth('2026-09-10', '2026-11-05');
  assert.equal(slices.length, 3);
  assert.deepEqual(slices[0], {
    year: 2026,
    month: 9,
    ymKey: '2026-09',
    periodoDescricao: '09/2026',
    dtInicioIso: '2026-09-10',
    dtFinalIso: '2026-09-30',
    dtInicioBr: '10/09/2026',
    dtFinalBr: '30/09/2026'
  });
  assert.equal(slices[1].dtInicioBr, '01/10/2026');
  assert.equal(slices[1].dtFinalBr, '31/10/2026');
  assert.equal(slices[2].dtInicioBr, '01/11/2026');
  assert.equal(slices[2].dtFinalBr, '05/11/2026');
});

test('sptCltCalc — parseUnitsFromSelect e filterUnits constroem hierarquia e filtram por nome/codigo', () => {
  const fakeSelect = {
    options: [
      { value: '1', textContent: '-TRIBUNAL SUPERIOR ELEITORAL' },
      { value: '787', textContent: '- - - -SECRETARIA DE TECNOLOGIA DA INFORMAÇÃO' },
      { value: '1181', textContent: '- - - - -COORDENADORIA DE SISTEMAS ELEITORIAS' },
      { value: '1184', textContent: '- - - - - -SEÇÃO DE TOTALIZAÇÃO E DIVULGAÇÃO DE RESULTADOS' }
    ]
  };
  const units = C.parseUnitsFromSelect(fakeSelect);
  assert.equal(units.length, 4);
  const setot = units.find((u) => u.id === '1184');
  assert.equal(setot.cleanName, 'SEÇÃO DE TOTALIZAÇÃO E DIVULGAÇÃO DE RESULTADOS');
  assert.equal(setot.level, 6);
  assert.ok(setot.parentPath.includes('SECRETARIA DE TECNOLOGIA DA INFORMAÇÃO'));
  assert.ok(setot.parentPath.includes('COORDENADORIA DE SISTEMAS ELEITORIAS'));

  const byText = C.filterUnits(units, 'totalizacao');
  assert.equal(byText.length, 1);
  assert.equal(byText[0].id, '1184');

  const byId = C.filterUnits(units, '1184');
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, '1184');
});

test('A4 — feriados: exclui feriados forenses (11/08, 01/11, 08/12) por padrao, inclui Sexta-feira Santa e 30/11 (DF), e permite edicao pelo usuario', () => {
  // Feriados forenses NÃO devem ser feriados por padrão para empresa CLT
  assert.equal(C.parseDateInfo('11/08/2026').isHoliday, false);
  assert.equal(C.parseDateInfo('01/11/2026').isHoliday, false);
  assert.equal(C.parseDateInfo('08/12/2026').isHoliday, false);

  // Sexta-feira Santa (03/04/2026 e 26/03/2027) e 30/11 (DF) DEVEM ser feriados por padrão
  const gf2026 = C.parseDateInfo('03/04/2026');
  assert.equal(gf2026.isHoliday, true);
  assert.match(gf2026.holidayName, /Sexta-feira Santa/);

  const gf2027 = C.parseDateInfo('26/03/2027');
  assert.equal(gf2027.isHoliday, true);

  const df3011 = C.parseDateInfo('30/11/2026');
  assert.equal(df3011.isHoliday, true);
  assert.match(df3011.holidayName, /Evangélico/);

  // Personalização: adicionar 11/08 e remover 30/11
  const custom = '+11/08:Feriado CCT, -30/11, 2026-02-17:Carnaval';
  assert.equal(C.parseDateInfo('11/08/2026', custom).isHoliday, true);
  assert.equal(C.parseDateInfo('11/08/2026', custom).holidayName, 'Feriado CCT');
  assert.equal(C.parseDateInfo('30/11/2026', custom).isHoliday, false);
  assert.equal(C.parseDateInfo('17/02/2026', custom).isHoliday, true);
  assert.equal(C.parseDateInfo('17/02/2026', custom).holidayName, 'Carnaval');

  // Lista feriados aplicados no período
  const applied = C.listAppliedHolidaysInRange('2026-04-01', '2026-04-30');
  assert.deepEqual(applied.map((h) => h.dateBr), ['03/04/2026', '21/04/2026']);
});

test('sptCltCalc — analyzeDayClt aplica jornada 8h em dias uteis e 00:00 em Sabados/Domingos/Feriados', () => {
  const d1 = C.analyzeDayClt({
    date: '02/10/2026',
    punches: ['10:17', '12:07', '13:07', '19:31', '', ''],
    justificativa: '',
    total: '08:14:00'
  });
  assert.equal(d1.cltWorkedMin, 494);
  assert.equal(d1.targetMin, 480);
  assert.equal(d1.normalWorkedMin, 480);
  assert.equal(d1.he50Min, 14);
  assert.equal(d1.he100Min, 0);
  assert.equal(d1.debitoBhMin, 0);

  const d2 = C.analyzeDayClt({
    date: '09/10/2026',
    punches: ['09:00', '18:00', '', '', '', ''],
    justificativa: '',
    total: '09:00:00'
  });
  assert.equal(d2.cltWorkedMin, 480);
  assert.equal(d2.lunchMode, 'auto-1h');
  assert.equal(d2.lunchDeductionDiffMin, 60);
  assert.equal(d2.he50Min, 0);

  const d3 = C.analyzeDayClt({
    date: '15/10/2026',
    punches: ['08:00', '12:00', '12:30', '16:30', '', ''],
    justificativa: '',
    total: '08:00:00'
  });
  assert.equal(d3.measuredLunchMin, 30);
  assert.equal(d3.effectiveLunchMin, 60);
  assert.equal(d3.cltWorkedMin, 450);
  assert.equal(d3.debitoBhMin, 30);

  const d4 = C.analyzeDayClt({
    date: '16/10/2026',
    punches: ['08:00', '12:00', '13:00', '20:30', '', ''],
    justificativa: '',
    total: '11:30:00'
  });
  assert.equal(d4.cltWorkedMin, 690);
  assert.equal(d4.he50Min, 120);
  assert.equal(d4.he100Min, 90);
  assert.ok(d4.alerts.some((a) => a.code === 'acima-2h-extra'));

  const d5 = C.analyzeDayClt({
    date: '17/10/2026',
    punches: ['08:21', '13:26', '', '', '', ''],
    justificativa: '',
    total: '05:05:00'
  });
  assert.equal(d5.isWeekend, true);
  assert.equal(d5.cltWorkedMin, 305);
  assert.equal(d5.targetMin, 0);
  assert.equal(d5.he50Min, 0);
  assert.equal(d5.he100Min, 305);
  assert.equal(d5.debitoBhMin, 0);
});

test('A5 — fim de semana/feriado com 2 batidas e jornada >6h: desconta 1h por padrao (CLT/SPT) e reproduz cartao empresa quando desligado', () => {
  // Domingo 04/10/2026: 14:18 a 23:39 (9h21 brutas = 561 min; SPT já traz 08:21 = 501 min)
  const rawDom = {
    date: '04/10/2026',
    punches: ['14:18', '23:39', '', '', '', ''],
    justificativa: '',
    total: '08:21:00'
  };

  // Ligado por padrão (CLT art. 71 / SPT): 08:21 (501 min)
  const dDefault = C.analyzeDayClt(rawDom, null);
  assert.equal(dDefault.cltWorkedMin, 501);
  assert.equal(dDefault.he100Min, 501);
  assert.equal(dDefault.lunchMode, 'auto-1h');

  // Desligado (reproduz cartão Digisystem): 09:21 (561 min)
  const dNoDeduct = C.analyzeDayClt(rawDom, null, { deductAutoLunchOnSpecialDays: false });
  assert.equal(dNoDeduct.cltWorkedMin, 561);
  assert.equal(dNoDeduct.he100Min, 561);
  assert.equal(dNoDeduct.lunchMode, 'special-no-deduct');
});

test('sptCltCalc — aplica tolerancia CLT de ate 10 min/dia nos dias uteis (art. 58 §1º)', () => {
  const dPos = C.analyzeDayClt({
    date: '06/10/2026',
    punches: ['09:22', '12:12', '13:15', '18:34', '', ''],
    justificativa: '',
    total: '08:09:00'
  });
  assert.equal(dPos.withinTolerance, true);
  assert.equal(dPos.normalWorkedMin, 480);
  assert.equal(dPos.he50Min, 0);
  assert.equal(dPos.debitoBhMin, 0);

  const dNeg = C.analyzeDayClt({
    date: '07/10/2026',
    punches: ['09:00', '12:00', '13:00', '17:52', '', ''],
    justificativa: '',
    total: '07:52:00'
  });
  assert.equal(dNeg.withinTolerance, true);
  assert.equal(dNeg.normalWorkedMin, 480);
  assert.equal(dNeg.debitoBhMin, 0);

  const dOver = C.analyzeDayClt({
    date: '08/10/2026',
    punches: ['09:00', '12:00', '13:00', '18:11', '', ''],
    justificativa: '',
    total: '08:11:00'
  });
  assert.equal(dOver.withinTolerance, false);
  assert.equal(dOver.he50Min, 11);
});

test('sptCltCalc — continuacao pos-meia-noite (00:00 com Total SPT 00:00 apos 23:59) nao duplica nem gera debito de 8h', () => {
  const rawPrev = {
    date: '25/10/2026',
    punches: ['14:13', '23:59', '', '', '', ''],
    justificativa: '',
    total: '11:22:00'
  };
  const rawNext = {
    date: '26/10/2026',
    punches: ['00:00', '02:35', '', '', '', ''],
    justificativa: '',
    total: '00:00'
  };
  const dPrev = C.analyzeDayClt(rawPrev, null);
  const dNext = C.analyzeDayClt(rawNext, rawPrev);

  assert.equal(dPrev.cltWorkedMin, 682);
  assert.equal(dPrev.he100Min, 682);
  assert.equal(dNext.isPostMidnightContinuation, true);
  assert.equal(dNext.isWorkedDay, false);
  assert.equal(dNext.cltWorkedMin, 0);
  assert.equal(dNext.targetMin, 0);
  assert.equal(dNext.debitoBhMin, 0);
});

test('A1 — Home Office presumido (8h) e DESLIGADO por padrao, nao exige 1 dia presencial quando ligado, e mostra dias uteis sem registro quando desligado', () => {
  // Colaborador sem nenhum dia presencial no mês (3 dias úteis sem batida + 1 sábado sem batida)
  const rawDays = [
    C.analyzeDayClt({ date: '01/10/2026', punches: ['', '', '', '', '', ''], total: '' }), // Qui
    C.analyzeDayClt({ date: '02/10/2026', punches: ['', '', '', '', '', ''], total: '' }), // Sex
    C.analyzeDayClt({ date: '03/10/2026', punches: ['', '', '', '', '', ''], total: '' }), // Sáb
    C.analyzeDayClt({ date: '05/10/2026', punches: ['', '', '', '', '', ''], total: '' })  // Seg
  ];

  // 1) Por padrão (presumeHomeOffice omitido -> false): não presume 8h e registra 3 dias úteis sem registro, sem gerar débito
  const mDefault = C.summarizeMonthClt(rawDays, { ymKey: '2026-10', monthLabel: '10/2026', todayIso: '2026-11-18' });
  assert.equal(mDefault.presumeHomeOffice, false);
  assert.equal(mDefault.workedDays, 0);
  assert.equal(mDefault.homeOfficeDays, 0);
  assert.equal(mDefault.weekdaysWithoutRecord, 3);
  assert.equal(mDefault.unregisteredWeekdays, 3);
  assert.equal(mDefault.debitoBhBrutoMin, 0);
  assert.equal(mDefault.days[0].isUnregisteredWeekday, true);

  // 2) Quando ligado (presumeHomeOffice: true), mesmo sem nenhum dia presencial, aplica 8h aos 3 dias úteis sem batida
  const mHo = C.summarizeMonthClt(rawDays, { ymKey: '2026-10', monthLabel: '10/2026', presumeHomeOffice: true, todayIso: '2026-11-18' });
  assert.equal(mHo.presumeHomeOffice, true);
  assert.equal(mHo.workedDays, 3);
  assert.equal(mHo.homeOfficeDays, 3);
  assert.equal(mHo.unregisteredWeekdays, 0);
  assert.equal(mHo.horasNormaisMin, 3 * 480);
  assert.equal(mHo.cltWorkedMin, 3 * 480);
  assert.equal(mHo.days[0].isHomeOfficeDay, true);
  assert.deepEqual(mHo.days[0].punches.filter(Boolean), []);
});

test('A2 — Alerta de domingo trabalhado / >6 dias consecutivos sem folga identificada considera a virada do mes e NAO altera nenhum total', () => {
  // Fim de setembro/2026: 5 dias trabalhados seguidos (26/09 Sáb a 30/09 Qua)
  const sepDays = [
    C.analyzeDayClt({ date: '25/09/2026', punches: ['', '', '', '', '', ''], total: '' }), // Sex (folga)
    C.analyzeDayClt({ date: '26/09/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Sáb (1º)
    C.analyzeDayClt({ date: '27/09/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Dom (2º — alerta domingo)
    C.analyzeDayClt({ date: '28/09/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Seg (3º)
    C.analyzeDayClt({ date: '29/09/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Ter (4º)
    C.analyzeDayClt({ date: '30/09/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' })  // Qua (5º)
  ];
  // Início de outubro/2026: continua trabalhando em 01/10 (6º) e 02/10 (7º dia consecutivo!)
  const octDays = [
    C.analyzeDayClt({ date: '01/10/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Qui (6º)
    C.analyzeDayClt({ date: '02/10/2026', punches: ['09:00', '18:00', '', '', '', ''], total: '08:00:00' }), // Sex (7º -> alerta >6d)
    C.analyzeDayClt({ date: '03/10/2026', punches: ['', '', '', '', '', ''], total: '' }) // Sáb (folga)
  ];

  const report = C.recomputeReportWithOptions({
    workers: [
      {
        codigo: '1',
        nome: 'Prestador Exemplo',
        months: [
          { ymKey: '2026-09', monthLabel: '09/2026', days: sepDays },
          { ymKey: '2026-10', monthLabel: '10/2026', days: octDays }
        ]
      }
    ]
  }, { presumeHomeOffice: false, todayIso: '2026-11-18' });

  const [mSep, mOct] = report.workers[0].months;
  assert.equal(mSep.endingStreak, 5);
  assert.equal(mSep.dsrAlertDays, 1); // Domingo 27/09 trabalhado
  assert.equal(mOct.days[0].consecutiveWorkDays, 6);
  assert.equal(mOct.days[0].hasDsrStreakAlert, false);
  assert.equal(mOct.days[1].consecutiveWorkDays, 7);
  assert.equal(mOct.days[1].hasDsrStreakAlert, true);
  assert.ok(mOct.days[1].alerts.some((a) => a.code === 'dsr-alerta' && /Trabalho em domingo \/ >6 dias consecutivos sem folga identificada/.test(a.tip)));

  // Não altera nenhum total de horas nem converte dia útil em folga fictícia
  assert.equal(mOct.workedDays, 2);
  assert.equal(mOct.cltWorkedMin, 2 * 480);
  assert.equal(mOct.dsrCompensatedDays, 0);
});

test('A3 — summarizeMonthClt mantem Saldo BH (Uteis) e HE 100% independentes e calcula a visao combinada separadamente', () => {
  const days = [
    C.analyzeDayClt({ date: '05/10/2026', punches: ['09:00', '15:00', '', '', '', ''], total: '06:00:00' }), // Seg: -120m Débito BH
    C.analyzeDayClt({ date: '06/10/2026', punches: ['08:00', '12:00', '13:00', '17:30', '', ''], total: '08:30:00' }), // Ter: +30m HE 50%
    C.analyzeDayClt({ date: '10/10/2026', punches: ['08:00', '12:00', '', '', '', ''], total: '04:00:00' }) // Sáb: +240m HE 100%
  ];
  const m = C.summarizeMonthClt(days, { ymKey: '2026-10', monthLabel: '10/2026', presumeHomeOffice: false });
  assert.equal(m.he50BrutoMin, 30);
  assert.equal(m.debitoBhBrutoMin, 120);
  // Coluna independente 1: Saldo BH (Úteis) = 30 - 120 = -90 (-01:30)
  assert.equal(m.saldoBhMesMin, -90);
  // Coluna independente 2: HE 100% (FDS) = +240 (+04:00) — NÃO consumida na coluna HE 100%
  assert.equal(m.he100BrutoMin, 240);
  // Visão analítica combinada TSE XT = -90 + 240 = +150 (+02:30)
  assert.equal(m.saldoMesMin, 150);
});

test('Critério de aceite Bloco A — com Home Office desligado e desconto de intervalo ligado, out/2026 mostra os 16 dias uteis sem catraca e 08:21 no domingo 04/10', () => {
  const punchedMap = {
    '01/10/2026': { punches: ['08:54', '12:00', '13:29', '17:46', '', ''], total: '07:23:00' },
    '02/10/2026': { punches: ['09:56', '18:26', '', '', '', ''], total: '07:30:00' },
    '03/10/2026': { punches: ['09:25', '19:00', '', '', '', ''], total: '08:35:00' },
    '04/10/2026': { punches: ['14:18', '23:39', '', '', '', ''], total: '08:21:00' },
    '06/10/2026': { punches: ['09:22', '12:12', '13:15', '18:34', '', ''], total: '08:09:00' },
    '07/10/2026': { punches: ['10:33', '12:03', '13:13', '19:45', '', ''], total: '08:02:00' },
    '09/10/2026': { punches: ['08:38', '11:52', '13:46', '20:03', '', ''], total: '09:31:00' },
    '10/10/2026': { punches: ['09:31', '18:31', '', '', '', ''], total: '08:00:00' },
    '17/10/2026': { punches: ['08:21', '13:26', '', '', '', ''], total: '05:05:00' },
    '24/10/2026': { punches: ['09:34', '12:58', '14:15', '20:52', '', ''], total: '10:01:00' },
    '25/10/2026': { punches: ['14:13', '23:59', '', '', '', ''], total: '11:22:00' },
    '26/10/2026': { punches: ['00:00', '02:35', '', '', '', ''], total: '00:00' }
  };

  const rawRows = [];
  for (let d = 1; d <= 31; d += 1) {
    const dd = String(d).padStart(2, '0');
    const date = `${dd}/10/2026`;
    const p = punchedMap[date] || { punches: ['', '', '', '', '', ''], total: '' };
    rawRows.push({ date, punches: p.punches, justificativa: '', total: p.total });
  }
  const analyzed = rawRows.map((r, i) => C.analyzeDayClt(r, i > 0 ? rawRows[i - 1] : null));

  // Padrão de fiscalização: Home Office desligado + desconto de 1h de intervalo ligado
  const mFiscal = C.summarizeMonthClt(analyzed, {
    ymKey: '2026-10',
    monthLabel: '10/2026',
    todayIso: '2026-11-18'
  });

  // 21 dias úteis em out/2026 (12/10 é feriado) - 5 dias úteis com batida = 16 dias úteis sem registro!
  assert.equal(mFiscal.workedWeekdays, 5);
  assert.equal(mFiscal.homeOfficeDays, 0);
  assert.equal(mFiscal.unregisteredWeekdays, 16);
  // Domingo 04/10 com desconto de 1h ligado = 08:21 (501 min), somando 51:24 (3084 min) de HE 100%
  const dom04 = mFiscal.days.find((d) => d.date === '04/10/2026');
  assert.equal(dom04.cltWorkedMin, 501);
  assert.equal(C.formatMin(mFiscal.he100BrutoMin), '51:24');

  // Quando o fiscal desliga o desconto de 1h em FDS/feriado para comparar com o cartão Digisystem:
  const mDigiLunch = C.summarizeMonthClt(analyzed, {
    ymKey: '2026-10',
    monthLabel: '10/2026',
    deductAutoLunchOnSpecialDays: false,
    todayIso: '2026-11-18'
  });
  const dom04NoDeduct = mDigiLunch.days.find((d) => d.date === '04/10/2026');
  assert.equal(dom04NoDeduct.cltWorkedMin, 561); // 09:21 (sem desconto de 1h)
  assert.equal(C.formatMin(mDigiLunch.he100BrutoMin), '55:24'); // +4h nos 4 plantões de FDS >6h com 1 par
});
