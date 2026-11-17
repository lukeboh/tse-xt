import test from 'node:test';
import assert from 'node:assert/strict';
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
  const pNov = C.previousMonthPeriod(new Date(2026, 10, 17)); // 17/11/2026
  assert.equal(pNov.fromIso, '2026-10-01');
  assert.equal(pNov.toIso, '2026-10-31');
  assert.equal(pNov.fromBr, '01/10/2026');
  assert.equal(pNov.toBr, '31/10/2026');
  assert.equal(pNov.label, '10/2026');

  const pJan = C.previousMonthPeriod(new Date(2027, 0, 5)); // 05/01/2027
  assert.equal(pJan.fromIso, '2026-12-01');
  assert.equal(pJan.toIso, '2026-12-31');
  assert.equal(pJan.label, '12/2026');
});

test('sptCltCalc — splitDateRangeByMonth fatia periodo multi-mes corretamente', () => {
  const slices = C.splitDateRangeByMonth('2026-09-15', '2026-11-10');
  assert.equal(slices.length, 3);
  assert.deepEqual(slices[0], {
    year: 2026,
    month: 9,
    ymKey: '2026-09',
    periodoDescricao: '09/2026',
    dtInicioIso: '2026-09-15',
    dtFinalIso: '2026-09-30',
    dtInicioBr: '15/09/2026',
    dtFinalBr: '30/09/2026'
  });
  assert.equal(slices[1].periodoDescricao, '10/2026');
  assert.equal(slices[1].dtInicioBr, '01/10/2026');
  assert.equal(slices[1].dtFinalBr, '31/10/2026');
  assert.equal(slices[2].periodoDescricao, '11/2026');
  assert.equal(slices[2].dtInicioBr, '01/11/2026');
  assert.equal(slices[2].dtFinalBr, '10/11/2026');
});

test('sptCltCalc — parseUnitsFromSelect e filterUnits constroem hierarquia e filtram por nome/codigo', () => {
  const fakeSelect = {
    options: [
      { value: '1', textContent: '-TRIBUNAL SUPERIOR ELEITORAL' },
      { value: '518', textContent: '- - -SECRETARIA DO TRIBUNAL' },
      { value: '787', textContent: '- - - -SECRETARIA DE TECNOLOGIA DA INFORMAÇÃO' },
      { value: '1181', textContent: '- - - - -COORDENADORIA DE SISTEMAS ELEITORIAS' },
      { value: '1184', textContent: '- - - - - -SEÇÃO DE TOTALIZAÇÃO E DIVULGAÇÃO DE RESULTADOS' }
    ]
  };
  const units = C.parseUnitsFromSelect(fakeSelect);
  assert.equal(units.length, 5);
  const setot = units.find((u) => u.id === '1184');
  assert.equal(setot.cleanName, 'SEÇÃO DE TOTALIZAÇÃO E DIVULGAÇÃO DE RESULTADOS');
  assert.ok(setot.parentPath.includes('SECRETARIA DE TECNOLOGIA DA INFORMAÇÃO'));
  assert.ok(setot.parentPath.includes('COORDENADORIA DE SISTEMAS ELEITORIAS'));

  const byText = C.filterUnits(units, 'totalizacao resultados');
  assert.equal(byText.length, 1);
  assert.equal(byText[0].id, '1184');

  const byId = C.filterUnits(units, '1184');
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, '1184');
});

test('sptCltCalc — analyzeDayClt aplica jornada de 8h e regra de pelo menos 1h de almoco', () => {
  // Caso 1: 4 batidas com intervalo >= 1h (08:46-12:06 e 13:10-19:41 = 9h51, intervalo 1h04)
  const d1 = C.analyzeDayClt({
    date: '02/10/2026',
    punches: ['08:46', '12:06', '13:10', '19:41', '', ''],
    justificativa: '',
    total: '09:51:00'
  });
  assert.equal(d1.cltWorkedMin, 591);
  assert.equal(d1.effectiveLunchMin, 64);
  assert.equal(d1.targetMin, 480);
  assert.equal(d1.excedenteMin, 111); // +01:51
  assert.equal(d1.aMenosMin, 0);

  // Caso 2: 2 batidas > 6h onde o SPT NAO descontou 1h (ex.: 10:59-17:02 = 06:03 no SPT)
  const d2 = C.analyzeDayClt({
    date: '10/10/2026',
    punches: ['10:59', '17:02', '', '', '', ''],
    justificativa: '',
    total: '06:03:00'
  });
  assert.equal(d2.sptTotalMin, 363);
  assert.equal(d2.cltWorkedMin, 303); // 05:03 após descontar 1h de almoço CLT
  assert.equal(d2.lunchMode, 'auto-1h');
  assert.equal(d2.aMenosMin, 177); // 08:00 - 05:03 = 02:57

  // Caso 3: 4 batidas com intervalo < 1h (ex.: 58 min, onde o SPT ja descontou os 2 min faltantes: 08:09)
  const d3 = C.analyzeDayClt({
    date: '24/10/2026',
    punches: ['11:02', '14:06', '15:04', '20:11', '', ''],
    justificativa: '',
    total: '08:09:00'
  });
  assert.equal(d3.measuredLunchMin, 58);
  assert.equal(d3.cltWorkedMin, 489); // 08:09, sem descontar em dobro
  assert.ok(d3.alerts.some((a) => a.code === 'intervalo-curto'));

  // Caso 4: 4 batidas com intervalo < 1h (16 min) onde o SPT nao descontou os 44 min faltantes (08:19-12:23 e 12:39-14:35 = 06:00)
  const d4 = C.analyzeDayClt({
    date: '17/10/2026',
    punches: ['08:19', '12:23', '12:39', '14:35', '', ''],
    justificativa: '',
    total: '06:00:00'
  });
  assert.equal(d4.measuredLunchMin, 16);
  assert.equal(d4.cltWorkedMin, 316); // 360 - (60 - 16) = 316 (05:16)
  assert.equal(d4.lunchDeductionDiffMin, 44);
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

  assert.equal(dPrev.cltWorkedMin, 682); // 11:22
  assert.equal(dPrev.excedenteMin, 202); // +03:22
  assert.equal(dNext.isPostMidnightContinuation, true);
  assert.equal(dNext.isWorkedDay, false);
  assert.equal(dNext.cltWorkedMin, 0);
  assert.equal(dNext.targetMin, 0);
  assert.equal(dNext.aMenosMin, 0);
});

test('sptCltCalc — summarizeMonthClt consolida excedentes, horas a menos e compensacao intra-mes', () => {
  const days = [
    C.analyzeDayClt({ date: '01/10/2026', punches: ['08:54', '12:00', '13:29', '17:46', '', ''], total: '07:23:00' }), // -37m
    C.analyzeDayClt({ date: '02/10/2026', punches: ['09:56', '18:26', '', '', '', ''], total: '07:30:00' }), // -30m
    C.analyzeDayClt({ date: '03/10/2026', punches: ['09:25', '19:00', '', '', '', ''], total: '08:35:00' }), // +35m
    C.analyzeDayClt({ date: '04/10/2026', punches: ['14:18', '23:39', '', '', '', ''], total: '08:21:00' }), // +21m
    C.analyzeDayClt({ date: '05/10/2026', punches: ['', '', '', '', '', ''], total: '' }) // dia em branco
  ];

  const m = C.summarizeMonthClt(days, { ymKey: '2026-10', monthLabel: '10/2026' });
  assert.equal(m.workedDays, 4);
  assert.equal(m.expectedJourneyMin, 4 * 480);
  assert.equal(m.excedenteBrutoMin, 56); // 35 + 21
  assert.equal(m.aMenosBrutoMin, 67); // 37 + 30
  assert.equal(m.compensadoNoMesMin, 56); // min(56, 67)
  assert.equal(m.excedenteLiquidoMin, 0);
  assert.equal(m.aMenosLiquidoMin, 11); // 67 - 56 = 11 min a menos líquidos
  assert.equal(m.saldoMesMin, -11);
});
