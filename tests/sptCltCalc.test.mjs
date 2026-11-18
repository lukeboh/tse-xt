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

// ---------------------------------------------------------------------------
// BLOCO B — Consultas ao SPT (B1 a B6)
// ---------------------------------------------------------------------------

// Fixture de HTML real do SPT (com window.lPeriodos em <script> inline + tabela #maintable)
const SPT_CONSULTA_HTML_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <script>/*<![CDATA[*/
    window.lPeriodos = [
      ["2862","10\\/2026","01\\/10\\/2026","31\\/10\\/2026","0","Outubro 2026"],
      ["2862","09\\/2026","01\\/09\\/2026","30\\/09\\/2026","0","Setembro 2026"],
      ["9901","10\\/2026","01\\/10\\/2026","31\\/10\\/2026","0","Outubro 2026"]
    ];
  /*]]>*/</script>
</head>
<body>
  <form id="formulario" method="post" action="/spt-consultafrequencia/gestao/ponto-gestao">
    <input type="hidden" name="_csrf" value="csrf-token-fixture-123" />
    <input type="hidden" name="cmd" value="" />
    <input type="hidden" name="periodoCodigo" value="" />
    <input type="hidden" name="periodoDescricao" value="" />
    <input type="hidden" name="periodoDtInicio" value="" />
    <input type="hidden" name="periodoDtFinal" value="" />
    <input type="hidden" name="codContrato" value="" />
    <input type="hidden" name="codTSE" value="" />
    <input type="hidden" name="cpf" value="" />
    <input type="hidden" name="numContrato" value="" />
    <input type="hidden" name="cdFunc" value="" />
    <input type="hidden" name="matFunc" value="" />
    <input type="hidden" name="nome" value="" />
    <select id="cbUnidades" name="cbUnidades">
      <option value="1184" selected>- - - - - -SEÇÃO DE TOTALIZAÇÃO E DIVULGAÇÃO DE RESULTADOS</option>
    </select>
    <select id="cbContratos" name="cbContratos">
      <option value="-1">Todos</option>
      <option value="2862">77/2023 - DIGISYSTEM</option>
    </select>
    <select id="cbPeriodos" name="cbPeriodos">
      <option value="-1">Selecione</option>
      <option value="0">10/2026</option>
      <option value="1">09/2026</option>
    </select>
    <input id="edtdataponto" name="edtdataponto" value="2026-10-31" />
    <button type="submit" name="btnPesquisar">Pesquisar</button>
  </form>
  <table id="maintable">
    <tbody>
      <tr>
        <td><a data-contrato="2862" data-codigo="75645" data-matricula="22990" data-cpf="00011122233" data-cod-tse="TSE-75645" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR ALFA">000.111.222-33</a></td>
        <td>PRESTADOR ALFA</td>
      </tr>
      <tr>
        <td><a data-contrato="2862" data-codigo="75646" data-matricula="22991" data-cpf="44455566677" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR BETA">444.555.666-77</a></td>
        <td>PRESTADOR BETA</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

function createMinimalDocFromHtml(html) {
  const scripts = [];
  for (const [, content] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    scripts.push({ textContent: content });
  }
  const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/i);
  const csrfInput = csrfMatch ? { value: csrfMatch[1] } : null;

  const links = [];
  for (const [fullTag] of html.matchAll(/<a\s+[^>]*data-codigo="[^"]+"[^>]*>/gi)) {
    const attrs = {};
    for (const [, k, v] of fullTag.matchAll(/([a-z0-9-]+)="([^"]*)"/gi)) {
      attrs[k] = v;
    }
    links.push({
      dataset: {},
      handlers: {},
      getAttribute: (name) => (name in attrs ? attrs[name] : null),
      removeAttribute(name) { delete attrs[name]; },
      addEventListener(type, fn) { this.handlers[type] = fn; }
    });
  }

  const unitOptions = [];
  const unitSelectMatch = html.match(/<select[^>]*id="cbUnidades"[^>]*>([\s\S]*?)<\/select>/i);
  if (unitSelectMatch) {
    for (const [, val, text] of unitSelectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)) {
      unitOptions.push({ value: val, textContent: text.trim() });
    }
  }

  const contractOptions = [];
  const contractSelectMatch = html.match(/<select[^>]*id="cbContratos"[^>]*>([\s\S]*?)<\/select>/i);
  if (contractSelectMatch) {
    for (const [, val, text] of contractSelectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)) {
      contractOptions.push({ value: val, textContent: text.trim() });
    }
  }

  const dayRows = [];
  for (const [, rowHtml] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi), (m) => ({
      textContent: m[1].replace(/<[^>]+>/g, '').trim()
    }));
    if (cells.length >= 9 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[0].textContent)) {
      dayRows.push({
        querySelectorAll: (sel) => (sel === 'td' ? cells : [])
      });
    }
  }

  const hasMaintable = /id="maintable"/i.test(html);
  const isLoginForm = /process-login|type="password"/i.test(html);

  return {
    links,
    getElementById(id) {
      if (id === 'cbUnidades' && unitOptions.length) return { options: unitOptions, value: unitOptions[0].value, addEventListener() {} };
      if (id === 'cbContratos' && contractOptions.length) return { options: contractOptions, value: '-1', addEventListener() {} };
      return null;
    },
    querySelector(sel) {
      if (sel === 'input[name="_csrf"]') return csrfInput;
      if (sel === '#cbUnidades' && unitOptions.length) return { options: unitOptions };
      if (sel === '#cbContratos' && contractOptions.length) return { options: contractOptions };
      if (sel === '#maintable') return hasMaintable ? { querySelectorAll: (s) => (s === 'tbody tr' ? dayRows : []) } : null;
      if (sel.includes('process-login')) return isLoginForm ? {} : null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'script') return scripts;
      if (sel === '#maintable a[data-codigo]') return links;
      if (sel === '#maintable tbody tr') return dayRows;
      return [];
    }
  };
}

test('B1 e B6 — parsePeriodosFromDoc extrai window.lPeriodos do HTML sem depender do escopo isolado e parseWorkersFromConsultationDoc preserva data-cod-tse / fallback CPF', () => {
  const doc = createMinimalDocFromHtml(SPT_CONSULTA_HTML_FIXTURE);
  const periodos = C.parsePeriodosFromDoc(doc);
  assert.equal(periodos.length, 3);
  assert.deepEqual(periodos[0], ['2862', '10/2026', '01/10/2026', '31/10/2026', '0', 'Outubro 2026']);
  assert.deepEqual(periodos[1], ['2862', '09/2026', '01/09/2026', '30/09/2026', '0', 'Setembro 2026']);

  const workers = C.parseWorkersFromConsultationDoc(doc);
  assert.equal(workers.length, 2);
  // Prestador Alfa tem data-cod-tse explícito ("TSE-75645") e CPF "00011122233"
  assert.equal(workers[0].codigo, '75645');
  assert.equal(workers[0].cpf, '00011122233');
  assert.equal(workers[0].codTse, 'TSE-75645');
  // Prestador Beta não tem data-cod-tse; deve fazer fallback para data-cpf ("44455566677"), igual ao gestao-ponto.js do SPT
  assert.equal(workers[1].codigo, '75646');
  assert.equal(workers[1].cpf, '44455566677');
  assert.equal(workers[1].codTse, '44455566677');
});

test('B1 e B6 — sptModernizer extrai lPeriodos do HTML ao clicar no CPF quando Contrato = Todos (-1) e preenche codTSE + período', () => {
  const doc = createMinimalDocFromHtml(SPT_CONSULTA_HTML_FIXTURE);
  let submitted = false;
  const formFields = {
    cmd: { value: '' },
    periodoCodigo: { value: '' },
    periodoDescricao: { value: '' },
    periodoDtInicio: { value: '' },
    periodoDtFinal: { value: '' },
    codContrato: { value: '' },
    codTSE: { value: '' },
    cpf: { value: '' },
    numContrato: { value: '' },
    cdFunc: { value: '' },
    matFunc: { value: '' },
    nome: { value: '' },
    cbContratos: { value: '-1' },
    cbPeriodos: { value: '-1' },
    edtdataponto: { value: '2026-09-30' }
  };
  const btnPesquisar = {
    dataset: {},
    removeAttribute() {},
    addEventListener(type, fn) { this.onClick = fn; }
  };
  const form = {
    elements: formFields,
    querySelector: (s) => (s === 'button[name="btnPesquisar"]' ? btnPesquisar : null),
    submit() { submitted = true; }
  };

  const customDoc = Object.assign({}, doc, {
    addEventListener() {},
    body: {
      classList: { add() {}, remove() {}, contains: () => true },
      dataset: {},
      insertBefore() {},
      appendChild() {},
      firstChild: null
    },
    createElement: () => ({
      className: '',
      id: '',
      dataset: {},
      style: {},
      addEventListener() {},
      removeAttribute() {},
      appendChild() {},
      insertBefore() {},
      replaceChildren() {},
      querySelector: () => null,
      querySelectorAll: () => []
    }),
    getElementById(id) {
      if (id === 'formulario') return form;
      if (id === 'edtdataponto') return formFields.edtdataponto;
      return doc.getElementById(id);
    }
  });

  const window = {
    location: { pathname: '/spt-consultafrequencia/gestao/ponto-gestao' },
    JEPessoasSptCltCalc: C
  };
  vm.runInNewContext(readFileSync(new URL('../content/modules/sptModernizer.js', import.meta.url), 'utf8'), {
    window,
    document: customDoc,
    chrome: { runtime: { getURL: () => '' } },
    DOMParser: class { parseFromString() { return { body: { childNodes: [] } }; } }
  });
  window.JEPessoasSptModernizer.mount('sptGestao');

  // Simula clique no CPF do Prestador Alfa com edtdataponto = 2026-09-30 e cbPeriodos = -1
  doc.links[0].handlers.click({ preventDefault() {} });
  assert.equal(submitted, true);
  assert.equal(formFields.cmd.value, 'cmdVerPeriodoContrato');
  assert.equal(formFields.codTSE.value, 'TSE-75645');
  assert.equal(formFields.cpf.value, '00011122233');
  assert.equal(formFields.periodoCodigo.value, '2862');
  assert.equal(formFields.periodoDescricao.value, '09/2026');
  assert.equal(formFields.periodoDtInicio.value, '01/09/2026');
  assert.equal(formFields.periodoDtFinal.value, '30/09/2026');
});

function createSptReportModalHarness(fetchHandler, store = {}) {
  const elements = new Map();
  function makeEl(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      value: '',
      checked: false,
      disabled: false,
      hidden: false,
      textContent: '',
      dataset: {},
      style: {},
      handlers: {},
      children: [],
      options: [],
      classList: {
        _set: new Set(),
        add(...c) { c.forEach((x) => this._set.add(x)); },
        remove(...c) { c.forEach((x) => this._set.delete(x)); },
        toggle(c, force) {
          const on = force !== undefined ? !!force : !this._set.has(c);
          if (on) this._set.add(c); else this._set.delete(c);
        },
        contains(c) { return this._set.has(c); }
      },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      removeAttribute() {},
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] || null; },
      appendChild(child) {
        this.children.push(child);
        if (child && child.tagName === 'OPTION') this.options.push(child);
        if (child && child.id) elements.set('#' + child.id, child);
        return child;
      },
      replaceChildren(...nodes) {
        this.children = [...nodes];
        this.options = nodes.filter((n) => n && n.tagName === 'OPTION');
      },
      querySelector(sel) {
        if (sel === 'option:checked') {
          return this.options.find((o) => o.value === this.value) || this.options[0] || null;
        }
        if (sel.startsWith('option[value="')) {
          const v = sel.slice(14, -2);
          return this.options.find((o) => o.value === v) || null;
        }
        return elements.get(sel) || null;
      },
      querySelectorAll(sel) {
        if (sel === 'input[name="je-spt-rep-mode"]') return modeRadios;
        if (sel === 'input[name="je-spt-rep-detail"]') return detailRadios;
        return [];
      },
      click() { if (this.handlers.click) this.handlers.click({ preventDefault() {}, target: this }); },
      remove() {}
    };
    return el;
  }

  const modeRadios = ['xt_digi', 'spt_puro'].map((v) => Object.assign(makeEl('input'), { value: v, checked: v === 'xt_digi' }));
  const detailRadios = ['mensal', 'diario'].map((v) => Object.assign(makeEl('input'), { value: v, checked: v === 'mensal' }));

  const preCreatedIds = [
    'je-spt-rep-close', 'je-spt-rep-subunits', 'je-spt-rep-unit-mount',
    'je-spt-rep-from', 'je-spt-rep-to', 'je-spt-rep-contrato',
    'je-spt-rep-worker-select', 'je-spt-seg-mode-xt', 'je-spt-seg-mode-raw',
    'je-spt-seg-mensal', 'je-spt-seg-diario', 'je-spt-rep-team',
    'je-spt-rep-team-summary', 'je-spt-rep-worker-search', 'je-spt-rep-all',
    'je-spt-rep-none', 'je-spt-rep-team-list', 'je-spt-rep-ho-wrap',
    'je-spt-rep-homeoffice', 'je-spt-rep-special-lunch-wrap',
    'je-spt-rep-special-lunch', 'je-spt-rep-holidays', 'je-spt-rep-run',
    'je-spt-rep-csv', 'je-spt-rep-print', 'je-spt-rep-clear', 'je-spt-rep-progress',
    'je-spt-rep-progress-fill', 'je-spt-rep-progress-label',
    'je-spt-rep-cancel', 'je-spt-rep-body', 'je-spt-only-active-days'
  ];
  preCreatedIds.forEach((id) => {
    const el = makeEl();
    el.id = id;
    if (id === 'je-spt-rep-subunits' || id === 'je-spt-rep-special-lunch') el.checked = true;
    elements.set('#' + id, el);
  });

  let selectedUnitId = '1184';
  const comboStub = {
    getAvailableUnits: () => [],
    getAvailableContracts: () => [],
    getAvailablePeriodos: () => [],
    cacheUnitsAndContractsFromDOM: () => {},
    mountComboboxWidget: ({ initialUnitId }) => {
      selectedUnitId = initialUnitId || '1184';
      return {
        root: makeEl(),
        getValue: () => selectedUnitId,
        getSelectedUnit: () => ({ id: selectedUnitId, cleanName: 'SETOT', parentPath: 'STI › COSE › SETOT' }),
        setDisabled: () => {}
      };
    }
  };

  let exportedCsv = '';
  const document = {
    createElement: (tag) => makeEl(tag),
    addEventListener: () => {},
    body: makeEl('body'),
    head: makeEl('head'),
    getElementById: (id) => elements.get('#' + id) || null,
    querySelector: (sel) => elements.get(sel) || null,
    querySelectorAll: () => []
  };

  const chrome = {
    runtime: { getManifest: () => ({ version: '1.2.18', version_name: '1.2.18-Snapshot' }) },
    storage: {
      local: {
        get: (defaults, cb) => cb(Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, store[k] ?? v]))),
        set: (data, cb) => { Object.assign(store, data); cb?.(); },
        remove: (keys, cb) => {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((k) => { delete store[k]; });
          cb?.();
        }
      }
    }
  };

  class SyntheticDOMParser {
    parseFromString(html) {
      const parsed = createMinimalDocFromHtml(html);
      parsed.body = {
        innerHTML: html,
        childNodes: [{ html }]
      };
      return parsed;
    }
  }

  // Intercepta replaceChildren para guardar o HTML passado a setSafeHTML
  for (const el of elements.values()) {
    const origReplace = el.replaceChildren.bind(el);
    el.replaceChildren = (...nodes) => {
      origReplace(...nodes);
      if (nodes.length === 1 && nodes[0] && typeof nodes[0].html === 'string') {
        el.innerHTML = nodes[0].html;
      }
    };
  }

  const window = {
    JEPessoasSptCltCalc: C,
    JEPessoasSptCombobox: comboStub,
    print: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const src = readFileSync(new URL('../content/modules/sptReportModal.js', import.meta.url), 'utf8');
  vm.runInNewContext(src, {
    window,
    document,
    chrome,
    URLSearchParams,
    Date,
    Set,
    Map,
    console,
    Blob: class { constructor(parts) { exportedCsv = parts.join(''); } },
    URL: { createObjectURL: () => 'blob:spt-test', revokeObjectURL: () => {} },
    setTimeout: (fn) => { fn(); return 1; },
    alert: (msg) => { throw new Error(msg); },
    DOMParser: SyntheticDOMParser,
    fetch: fetchHandler
  });

  return {
    api: window.JEPessoasSptReport,
    elements,
    store,
    getExportedCsv: () => exportedCsv
  };
}

test('B2, B4 e B5 — período multi-mês consulta prestadores em cada mês do intervalo, une por código, faz cache de metadados e renova CSRF quando expira (403)', async () => {
  const calls = [];
  let csrfRefreshCount = 0;
  let firstSeptConsultFailedCsrf = false;

  const harness = createSptReportModalHarness(async (url, opts = {}) => {
    if (url === '/spt-consultafrequencia/gestao') {
      csrfRefreshCount += 1;
      calls.push({ type: 'GET_HOME', csrfRefreshCount });
      return {
        ok: true,
        status: 200,
        text: async () => SPT_CONSULTA_HTML_FIXTURE.replace('csrf-token-fixture-123', `csrf-token-${csrfRefreshCount}`)
      };
    }

    const params = new URLSearchParams(opts.body || '');
    const cmd = params.get('cmd');
    const dt = params.get('edtdataponto');
    const csrf = params.get('_csrf');
    calls.push({ type: cmd, edtdataponto: dt, periodoDescricao: params.get('periodoDescricao'), csrf, codTSE: params.get('codTSE') });

    // Simula expiração de CSRF na 1ª consulta de 09/2026 para testar renovação automática (B5)
    if (cmd === 'cmdConsultar' && dt === '2026-09-30' && !firstSeptConsultFailedCsrf) {
      firstSeptConsultFailedCsrf = true;
      return {
        ok: false,
        status: 403,
        text: async () => '<html><body>Invalid CSRF Token</body></html>'
      };
    }

    if (cmd === 'cmdConsultar' && dt === '2026-09-30') {
      return {
        ok: true,
        status: 200,
        text: async () => `<table id="maintable"><tbody>
          <tr><td><a data-contrato="2862" data-codigo="101" data-matricula="1" data-cpf="11111111111" data-cod-tse="COD-101" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR SETEMBRO">111</a></td></tr>
          <tr><td><a data-contrato="2862" data-codigo="102" data-matricula="2" data-cpf="22222222222" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR AMBOS">222</a></td></tr>
        </tbody></table>`
      };
    }

    if (cmd === 'cmdConsultar' && dt === '2026-10-31') {
      return {
        ok: true,
        status: 200,
        text: async () => `<table id="maintable"><tbody>
          <tr><td><a data-contrato="2862" data-codigo="102" data-matricula="2" data-cpf="22222222222" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR AMBOS">222</a></td></tr>
          <tr><td><a data-contrato="2862" data-codigo="103" data-matricula="3" data-cpf="33333333333" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR OUTUBRO">333</a></td></tr>
        </tbody></table>`
      };
    }

    return { ok: true, status: 200, text: async () => '<table id="maintable"><tbody></tbody></table>' };
  }, {
    je_xt_spt_report_prefs_v2: {
      unitId: '1184',
      fromIso: '2026-09-01',
      toIso: '2026-10-31',
      contrato: '2862',
      hoDefaultMigratedV2: true
    }
  });

  await harness.api.open();

  // 1) B2 e B4: Deve ter consultado 2026-09-30 e 2026-10-31 (e nenhuma data fixa como 2026-10-15)
  const consultDates = calls.filter((c) => c.type === 'cmdConsultar').map((c) => c.edtdataponto);
  assert.ok(consultDates.includes('2026-09-30'));
  assert.ok(consultDates.includes('2026-10-31'));
  assert.ok(!consultDates.includes('2026-10-15'));

  // 2) B5: GET_HOME foi chamado apenas 2 vezes: 1 no carregamento inicial + 1 quando o CSRF retornou 403
  assert.equal(csrfRefreshCount, 2);

  // 3) B2: Os 3 prestadores distintos (101 de set, 102 de ambos, 103 de out) foram unidos por código sem duplicar o 102
  const options = harness.elements.get('#je-spt-rep-worker-select').options.map((o) => o.value);
  assert.deepEqual(options, ['__ALL__', '102', '103', '101']);
});

test('B3 e B6 — falha em mês durante geração registra em report.failures, marca partial = true e exibe aviso na tela, no PDF e no CSV', async () => {
  const postedCodTse = [];

  const harness = createSptReportModalHarness(async (url, opts = {}) => {
    if (url === '/spt-consultafrequencia/gestao') {
      return { ok: true, status: 200, text: async () => SPT_CONSULTA_HTML_FIXTURE };
    }
    const params = new URLSearchParams(opts.body || '');
    const cmd = params.get('cmd');
    if (cmd === 'cmdConsultar') {
      return {
        ok: true,
        status: 200,
        text: async () => `<table id="maintable"><tbody>
          <tr><td><a data-contrato="2862" data-codigo="75645" data-matricula="22990" data-cpf="00011122233" data-cod-tse="TSE-75645" data-num-contrato="77/2023" data-nome-escaped="PRESTADOR ALFA">000</a></td></tr>
        </tbody></table>`
      };
    }
    if (cmd === 'cmdVerPeriodoContrato') {
      postedCodTse.push(params.get('codTSE'));
      const mes = params.get('periodoDescricao');
      if (mes === '09/2026') {
        return {
          ok: true,
          status: 200,
          text: async () => `<table id="maintable"><tbody>
            <tr><td>01/09/2026</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td><td></td><td></td><td></td><td>08:00:00</td></tr>
          </tbody></table>`
        };
      }
      // Outubro falha com HTTP 500!
      return {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      };
    }
    return { ok: true, status: 200, text: async () => '' };
  }, {
    je_xt_spt_report_prefs_v2: {
      unitId: '1184',
      fromIso: '2026-09-01',
      toIso: '2026-10-31',
      contrato: '2862',
      hoDefaultMigratedV2: true
    }
  });

  await harness.api.open();
  await harness.elements.get('#je-spt-rep-run').handlers.click();

  const saved = harness.store.je_xt_spt_report_v2;
  assert.ok(saved);
  // B6: Verifica que codTSE enviado ao SPT usou data-cod-tse ("TSE-75645")
  assert.deepEqual(postedCodTse, ['TSE-75645', 'TSE-75645']);

  // B3: Relatório marcado como parcial e lista a falha de 10/2026 sem omitir o mês
  assert.equal(saved.partial, true);
  assert.equal(saved.failures.length, 1);
  assert.match(saved.failures[0], /PRESTADOR ALFA — 10\/2026: falha na consulta \(HTTP 500\)/);
  assert.equal(saved.workers[0].months.length, 2);
  assert.equal(saved.workers[0].months[0].fetchError, undefined);
  assert.equal(saved.workers[0].months[1].fetchError, true);

  // Tela mostra o banner parcial e a linha de falha
  const bodyHtml = harness.elements.get('#je-spt-rep-body').innerHTML;
  assert.match(bodyHtml, /Relatório Parcial/i);
  assert.match(bodyHtml, /PRESTADOR ALFA — 10\/2026: falha na consulta \(HTTP 500\)/);

  // CSV inclui o aviso de relatório parcial e a linha com StatusConsulta = falha na consulta (HTTP 500)
  harness.elements.get('#je-spt-rep-csv').handlers.click();
  const csv = harness.getExportedCsv();
  assert.match(csv, /AVISO_RELATORIO_PARCIAL/);
  assert.match(csv, /falha na consulta \(HTTP 500\)/);
});

// ---------------------------------------------------------------------------
// BLOCO C — Privacidade e Segurança (C1 a C4)
// ---------------------------------------------------------------------------

test('C2 — relatório salvo expira automaticamente após 7 dias ao abrir o modal e botão Apagar relatório salvo limpa chrome.storage.local', async () => {
  const eightDaysAgoIso = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)).toISOString();
  const expiredReport = {
    version: 4,
    generatedAt: eightDaysAgoIso,
    unitId: '1184',
    unitName: 'SETOT',
    fromIso: '2026-10-01',
    toIso: '2026-10-31',
    fromBr: '01/10/2026',
    toBr: '31/10/2026',
    contratoLabel: 'Todos',
    workers: [{ codigo: '1', nome: 'TESTE', months: [] }],
    unitTotals: { workersCount: 1, activeWorkersCount: 1, sptTotalMin: 480, cltWorkedMin: 480 }
  };

  const harnessExpired = createSptReportModalHarness(async () => ({
    ok: true,
    status: 200,
    text: async () => SPT_CONSULTA_HTML_FIXTURE
  }), {
    je_xt_spt_report_v2: expiredReport,
    je_xt_spt_report_prefs_v2: { unitId: '1184', fromIso: '2026-10-01', toIso: '2026-10-31', hoDefaultMigratedV2: true }
  });

  await harnessExpired.api.open();
  // Relatório de 8 dias atrás deve ter sido removido do storage automaticamente e botões desabilitados
  assert.equal(harnessExpired.store.je_xt_spt_report_v2, undefined);
  assert.equal(harnessExpired.elements.get('#je-spt-rep-csv').disabled, true);
  assert.equal(harnessExpired.elements.get('#je-spt-rep-clear').disabled, true);

  // Agora testa um relatório recente (1 dia atrás) + clique em "Apagar relatório salvo"
  const oneDayAgoIso = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString();
  const validReport = Object.assign({}, expiredReport, {
    generatedAt: oneDayAgoIso,
    workers: [{
      codigo: '1',
      nome: 'PRESTADOR RECENTE',
      cpf: '00011122233',
      numContrato: '77/2023',
      months: [{
        ymKey: '2026-10',
        monthLabel: '10/2026',
        days: [C.analyzeDayClt({ date: '01/10/2026', punches: ['08:00', '12:00', '13:00', '17:00', '', ''], total: '08:00:00' })]
      }]
    }]
  });

  const harnessValid = createSptReportModalHarness(async () => ({
    ok: true,
    status: 200,
    text: async () => SPT_CONSULTA_HTML_FIXTURE
  }), {
    je_xt_spt_report_v2: validReport,
    je_xt_spt_report_prefs_v2: { unitId: '1184', fromIso: '2026-10-01', toIso: '2026-10-31', hoDefaultMigratedV2: true }
  });

  await harnessValid.api.open();
  assert.ok(harnessValid.store.je_xt_spt_report_v2);
  assert.equal(harnessValid.elements.get('#je-spt-rep-clear').disabled, false);

  // Clica em "Apagar relatório salvo"
  await harnessValid.elements.get('#je-spt-rep-clear').handlers.click();
  assert.equal(harnessValid.store.je_xt_spt_report_v2, undefined);
  assert.equal(harnessValid.elements.get('#je-spt-rep-clear').disabled, true);
  assert.equal(harnessValid.elements.get('#je-spt-rep-csv').disabled, true);
  assert.match(harnessValid.elements.get('#je-spt-rep-body').innerHTML, /Selecione a <strong>Unidade<\/strong>/);
});

test('C3 — background.js: onInstalled consulta apenas portais suportados (Meu Espaço e SPT) e reloadExtension é bloqueado em versão de produção (com update_url)', () => {
  let installedListener = null;
  let messageListener = null;
  let queriedUrls = null;
  let reloadCalled = 0;
  let currentManifest = { version: '1.2.19', update_url: 'https://clients2.google.com/service/update2/crx' };

  const chrome = {
    runtime: {
      getManifest: () => currentManifest,
      reload: () => { reloadCalled += 1; },
      onInstalled: { addListener: (fn) => { installedListener = fn; } },
      onMessage: { addListener: (fn) => { messageListener = fn; } }
    },
    tabs: {
      query: (q, cb) => { queriedUrls = q.url; cb([]); },
      reload: () => {}
    }
  };

  const bgSrc = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
  vm.runInNewContext(bgSrc, { chrome, console });

  // 1) Verifica filtro de URLs no onInstalled: não pode conter '*://*.tse.jus.br/*' genérico
  installedListener({ reason: 'update' });
  assert.ok(Array.isArray(queriedUrls));
  assert.ok(!queriedUrls.includes('*://*.tse.jus.br/*'));
  assert.ok(queriedUrls.every((u) => u.includes('/portalservidor2/') || u.includes('/spt-consultafrequencia/')));

  // 2) Em instalação de produção (com update_url), reloadExtension é recusado
  let prodResp = null;
  messageListener({ action: 'reloadExtension' }, {}, (r) => { prodResp = r; });
  assert.equal(reloadCalled, 0);
  assert.equal(prodResp.status, 'forbidden_in_production');

  // 3) Em instalação de desenvolvimento (sem update_url), reloadExtension é permitido
  currentManifest = { version: '1.2.19' };
  let devResp = null;
  messageListener({ action: 'reloadExtension' }, {}, (r) => { devResp = r; });
  assert.equal(reloadCalled, 1);
  assert.equal(devResp.status, 'reloading');
});

test('C4 — alternar a chave do portal adia o reload da aba enquanto um relatório estiver sendo gerado', () => {
  let reportRunning = true;
  let reloadCalls = 0;
  const scheduled = [];

  const window = {
    location: {
      pathname: '/spt-consultafrequencia/gestao',
      reload: () => { reloadCalls += 1; }
    },
    JEPessoasSptReport: {
      isRunning: () => reportRunning
    }
  };
  const document = {
    body: { classList: { add() {}, remove() {}, contains: () => true } },
    documentElement: { classList: { add() {}, remove() {} } },
    querySelectorAll: () => []
  };

  const domSrc = readFileSync(new URL('../content/modules/domModernizer.js', import.meta.url), 'utf8');
  vm.runInNewContext(domSrc, {
    window,
    document,
    chrome: {},
    localStorage: { setItem() {}, getItem: () => 'true' },
    setTimeout: (fn) => { scheduled.push(fn); return scheduled.length; },
    clearTimeout: () => {}
  });

  // Solicita reload após troca de chave enquanto o relatório do SPT está rodando
  window.JEPessoasModernizer.reloadAfterThemeToggle();
  assert.equal(reloadCalls, 0);
  assert.equal(scheduled.length, 1);

  // Dispara o 1º timer ainda com o relatório em execução: não deve recarregar a página
  scheduled.shift()();
  assert.equal(reloadCalls, 0);
  assert.equal(scheduled.length, 1);

  // Quando o relatório termina (reportRunning = false), o próximo ciclo executa o reload
  reportRunning = false;
  scheduled.shift()();
  assert.equal(reloadCalls, 1);
});


