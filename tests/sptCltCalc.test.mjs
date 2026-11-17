import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadModule } from './helpers.mjs';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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

test('sptCltCalc — analyzeDayClt aplica jornada 8h em dias uteis e 00:00 em Sabados/Domingos/Feriados', () => {
  // Caso 1: Dia útil (02/10/2026 Sex) com 4 batidas e intervalo >= 1h (9h51 -> +01:51 em HE 50%)
  const d1 = C.analyzeDayClt({
    date: '02/10/2026',
    punches: ['08:46', '12:06', '13:10', '19:41', '', ''],
    justificativa: '',
    total: '09:51:00'
  });
  assert.equal(d1.cltWorkedMin, 591);
  assert.equal(d1.effectiveLunchMin, 64);
  assert.equal(d1.targetMin, 480);
  assert.equal(d1.he50Min, 111); // +01:51 em HE 50%
  assert.equal(d1.he100Min, 0);
  assert.equal(d1.debitoBhMin, 0);

  // Caso 2: Sábado (10/10/2026) com 2 batidas > 6h (10:59-17:02 = 06:03 no SPT -> 05:03 CLT)
  // No Sábado a jornada ordinária é 00:00: 100% das 05:03 vão para HE 100% e Débito BH é 0!
  const d2 = C.analyzeDayClt({
    date: '10/10/2026',
    punches: ['10:59', '17:02', '', '', '', ''],
    justificativa: '',
    total: '06:03:00'
  });
  assert.equal(d2.sptTotalMin, 363);
  assert.equal(d2.cltWorkedMin, 303); // 05:03 após descontar 1h de almoço CLT
  assert.equal(d2.lunchMode, 'auto-1h');
  assert.equal(d2.targetMin, 0);
  assert.equal(d2.he100Min, 303); // +05:03 em HE 100%
  assert.equal(d2.aMenosMin, 0);
  assert.equal(d2.debitoBhMin, 0);

  // Caso 3: Sábado (17/10/2026) Renato 08:21-13:26 = 05:05 -> +05:05 em HE 100%, sem débito
  const dRenatoSab = C.analyzeDayClt({
    date: '17/10/2026',
    punches: ['08:21', '13:26', '', '', '', ''],
    justificativa: '',
    total: '05:05:00'
  });
  assert.equal(dRenatoSab.targetMin, 0);
  assert.equal(dRenatoSab.he100Min, 305); // 05:05
  assert.equal(dRenatoSab.debitoBhMin, 0);

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

test('sptCltCalc — aplica tolerancia CLT de ate 10 min/dia nos dias uteis (art. 58 §1º)', () => {
  // Renato 06/10/2026 (Ter): 08:09 (+9 min <= 10 min) -> 08:00 normais, 0 HE, 0 Débito
  const dMais9 = C.analyzeDayClt({
    date: '06/10/2026',
    punches: ['09:22', '12:12', '13:15', '18:34', '', ''],
    justificativa: '',
    total: '08:09:00'
  });
  assert.equal(dMais9.withinTolerance, true);
  assert.equal(dMais9.normalWorkedMin, 480);
  assert.equal(dMais9.he50Min, 0);
  assert.equal(dMais9.debitoBhMin, 0);

  // Renato 23/10/2026 (Sex): 07:52 (-8 min <= 10 min) -> 08:00 normais, 0 HE, 0 Débito
  const dMenos8 = C.analyzeDayClt({
    date: '23/10/2026',
    punches: ['09:08', '13:00', '14:00', '18:00', '', ''],
    justificativa: '',
    total: '07:52:00'
  });
  assert.equal(dMenos8.withinTolerance, true);
  assert.equal(dMenos8.normalWorkedMin, 480);
  assert.equal(dMenos8.he50Min, 0);
  assert.equal(dMenos8.debitoBhMin, 0);

  // Renato 20/10/2026 (Ter): 08:12 (+12 min > 10 min) -> +00:12 em HE 50%
  const dMais12 = C.analyzeDayClt({
    date: '20/10/2026',
    punches: ['09:15', '13:00', '14:00', '18:27', '', ''],
    justificativa: '',
    total: '08:12:00'
  });
  assert.equal(dMais12.withinTolerance, false);
  assert.equal(dMais12.he50Min, 12);
  assert.equal(dMais12.debitoBhMin, 0);
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

  assert.equal(dPrev.cltWorkedMin, 682); // 11:22 no Domingo -> 100% HE 100%
  assert.equal(dPrev.he100Min, 682);
  assert.equal(dNext.isPostMidnightContinuation, true);
  assert.equal(dNext.isWorkedDay, false);
  assert.equal(dNext.cltWorkedMin, 0);
  assert.equal(dNext.targetMin, 0);
  assert.equal(dNext.debitoBhMin, 0);
});

test('sptCltCalc — summarizeMonthClt separa Saldo BH (50% x Debito BH em dias uteis) de HE 100% (FDS)', () => {
  const days = [
    C.analyzeDayClt({ date: '01/10/2026', punches: ['08:54', '12:00', '13:29', '17:46', '', ''], total: '07:23:00' }), // Qui: -37m Débito BH
    C.analyzeDayClt({ date: '02/10/2026', punches: ['09:56', '18:26', '', '', '', ''], total: '07:30:00' }), // Sex: -30m Débito BH
    C.analyzeDayClt({ date: '03/10/2026', punches: ['09:25', '19:00', '', '', '', ''], total: '08:35:00' }), // Sáb: +08:35 HE 100%
    C.analyzeDayClt({ date: '04/10/2026', punches: ['14:18', '23:39', '', '', '', ''], total: '08:21:00' }), // Dom: +08:21 HE 100%
    C.analyzeDayClt({ date: '09/10/2026', punches: ['08:38', '11:52', '13:46', '20:03', '', ''], total: '09:31:00' }) // Sex: +01:31 HE 50%
  ];

  const m = C.summarizeMonthClt(days, { ymKey: '2026-10', monthLabel: '10/2026' });
  assert.equal(m.workedDays, 5);
  assert.equal(m.workedWeekdays, 3);
  assert.equal(m.workedWeekendDays, 2);
  assert.equal(m.expectedJourneyMin, 3 * 480); // Apenas os 3 dias úteis têm jornada ordinária de 8h
  assert.equal(m.he50BrutoMin, 91); // +01:31
  assert.equal(m.debitoBhBrutoMin, 67); // 37 + 30 = 01:07
  assert.equal(m.compensadoBhMin, 67); // min(91, 67)
  assert.equal(m.saldoBhMesMin, 24); // 91 - 67 = +00:24 de Saldo BH em dias úteis
  assert.equal(m.he100BrutoMin, 515 + 501); // 08:35 + 08:21 = 16:56 (1016 min) em HE 100%
  assert.equal(m.saldoMesMin, 24 + 1016);
});

test('sptReportModal — possui controle Modo com TSE XT / Digi como padrao e SPT Puro para dados brutos', () => {
  const modalSrc = readFileSync(path.join(rootDir, 'content', 'modules', 'sptReportModal.js'), 'utf8');
  assert.match(modalSrc, /let calcMode = 'xt_digi'/);
  assert.match(modalSrc, /let presumeHomeOffice = true/);
  assert.match(modalSrc, /value="xt_digi" checked/);
  assert.match(modalSrc, /value="spt_puro"/);
  assert.match(modalSrc, /id="je-spt-rep-homeoffice" checked/);
  assert.match(modalSrc, /TSE XT \/ Digi/);
  assert.match(modalSrc, /SPT Puro/);
});

test('sptCltCalc — presumeHomeOffice contabiliza 8h sem batida ficticia e aloca Reposicao de DSR apos domingo trabalhado (> 6d)', () => {
  // Simula outubro/2026 completo do Renato Farias de Matos na catraca do SPT
  const punchedMap = {
    '01/10/2026': { punches: ['08:54', '12:00', '13:29', '17:46', '', ''], total: '07:23:00' },
    '02/10/2026': { punches: ['09:56', '18:26', '', '', '', ''], total: '07:30:00' },
    '03/10/2026': { punches: ['09:25', '19:00', '', '', '', ''], total: '08:35:00' }, // Sáb
    '04/10/2026': { punches: ['14:18', '23:39', '', '', '', ''], total: '08:21:00' }, // Dom
    '06/10/2026': { punches: ['09:22', '12:12', '13:15', '18:34', '', ''], total: '08:09:00' },
    '07/10/2026': { punches: ['10:33', '12:03', '13:13', '19:45', '', ''], total: '08:02:00' },
    '09/10/2026': { punches: ['08:38', '11:52', '13:46', '20:03', '', ''], total: '09:31:00' },
    '10/10/2026': { punches: ['09:31', '18:31', '', '', '', ''], total: '08:00:00' }, // Sáb
    '17/10/2026': { punches: ['08:21', '13:26', '', '', '', ''], total: '05:05:00' }, // Sáb
    '24/10/2026': { punches: ['09:34', '12:58', '14:15', '20:52', '', ''], total: '10:01:00' }, // Sáb
    '25/10/2026': { punches: ['14:13', '23:59', '', '', '', ''], total: '11:22:00' }, // Dom
    '26/10/2026': { punches: ['00:00', '02:35', '', '', '', ''], total: '00:00' } // Continuação pós-meia-noite
  };

  const rawRows = [];
  for (let d = 1; d <= 31; d += 1) {
    const dd = String(d).padStart(2, '0');
    const date = `${dd}/10/2026`;
    const p = punchedMap[date] || { punches: ['', '', '', '', '', ''], total: '' };
    rawRows.push({ date, punches: p.punches, justificativa: '', total: p.total });
  }
  const analyzed = rawRows.map((r, i) => C.analyzeDayClt(r, i > 0 ? rawRows[i - 1] : null));

  const mHo = C.summarizeMonthClt(analyzed, {
    ymKey: '2026-10',
    monthLabel: '10/2026',
    presumeHomeOffice: true,
    todayIso: '2026-11-17'
  });

  // 5 dias úteis presenciais + 14 dias em Home Office = 19 dias úteis (152h00 de jornada esperada, igual à Digisystem!)
  assert.equal(mHo.workedWeekdays, 5);
  assert.equal(mHo.homeOfficeDays, 14);
  assert.equal(mHo.dsrCompensatedDays, 2); // 05/10 (Seg) e 30/10 (Sex)
  assert.equal(mHo.workedWeekendDays, 6);
  assert.equal(mHo.expectedJourneyMin, 19 * 480); // 152:00

  const d05 = mHo.days.find((d) => d.date === '05/10/2026');
  const d30 = mHo.days.find((d) => d.date === '30/10/2026');
  const d08 = mHo.days.find((d) => d.date === '08/10/2026');
  assert.equal(d05.isDsrCompensated, true);
  assert.equal(d30.isDsrCompensated, true);
  assert.equal(d08.isHomeOfficeDay, true);
  assert.equal(d08.cltWorkedMin, 480);
  // Não gera batidas fictícias
  assert.deepEqual(d08.punches.filter(Boolean), []);

  // Recomputar com presumeHomeOffice: false restaura os valores puramente presenciais (idempotência)
  const mNoHo = C.summarizeMonthClt(mHo.days, {
    ymKey: '2026-10',
    monthLabel: '10/2026',
    presumeHomeOffice: false
  });
  assert.equal(mNoHo.homeOfficeDays, 0);
  assert.equal(mNoHo.dsrCompensatedDays, 0);
  assert.equal(mNoHo.workedDays, 11);
  assert.equal(mNoHo.expectedJourneyMin, 5 * 480);
});
