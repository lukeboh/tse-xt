import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasBalance: B } = loadModule('balanceCalc.js');
const d = (o) => B.computeDailyDelta(o).delta;

test('dia útil mês aberto — h10 já é o saldo líquido', () => {
  assert.equal(d({ dayOfWeek: 3, exceedMin: 90, pecuniaMin: 0, dayTargetMinutes: 420 }), 90);
  assert.equal(d({ dayOfWeek: 3, exceedMin: 90, pecuniaMin: 30, dayTargetMinutes: 420 }), 60, 'desconta pecúnia');
});

test('dia útil mês fechado — saldo = TOTAL - jornada', () => {
  assert.equal(d({ dayOfWeek: 3, isClosedMonth: true, totalMin: 500, dayTargetMinutes: 420 }), 80);
  assert.equal(d({ dayOfWeek: 3, isClosedMonth: true, totalMin: 360, dayTargetMinutes: 420 }), -60, 'dia curto = débito');
});

test('sábado ×1,5 e domingo ×2,0 sobre o excedente líquido', () => {
  assert.equal(d({ dayOfWeek: 6, isClosedMonth: true, totalMin: 120, pecuniaMin: 0 }), 180, 'sábado ×1,5');
  assert.equal(d({ dayOfWeek: 0, totalMin: 120, pecuniaMin: 0 }), 240, 'domingo ×2,0');
  assert.equal(d({ dayOfWeek: 0, isHolidayOrRecess: true, totalMin: 60, pecuniaMin: 0 }), 120, 'feriado ×2,0');
});

test('dia dispensado em mês fechado não credita nem debita', () => {
  assert.equal(d({ dayOfWeek: 3, isClosedMonth: true, isDispensed: true, totalMin: 0, dayTargetMinutes: 420 }), 0);
});

test('projectFromTotal — dia corrente de mês aberto sem coluna nativa processada', () => {
  const r = B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 0, totalMin: 369, dayTargetMinutes: 420, projectFromTotal: true });
  assert.equal(r.delta, -51, '369 - 420 = -51 (débito projetado)');
  assert.equal(r.projected, true);
  // sem projectFromTotal, fica 0 (coluna nativa ainda zerada)
  assert.equal(d({ dayOfWeek: 3, exceedMin: 0, totalMin: 369, dayTargetMinutes: 420 }), 0);
  // não projeta se não há TOTAL ainda
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 0, totalMin: 0, dayTargetMinutes: 420, projectFromTotal: true }).projected, undefined);
});

test('netExcedenteMin — excedente do dia que NÃO virou pecúnia (base do delta, sem o multiplicador)', () => {
  // Dia útil mês aberto: exceedMin já É o líquido — net = exceedMin - pecuniaMin.
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 90, pecuniaMin: 30, dayTargetMinutes: 420 }).netExcedenteMin, 60);
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 90, pecuniaMin: 90, dayTargetMinutes: 420 }).netExcedenteMin, 0, 'tudo virou pecúnia, nada sobra pro banco');
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 90, pecuniaMin: 120, dayTargetMinutes: 420 }).netExcedenteMin, 0, 'nunca negativo');

  // Sábado: net é sobre o excedente ANTES do ×1,5.
  assert.equal(B.computeDailyDelta({ dayOfWeek: 6, isClosedMonth: true, totalMin: 120, pecuniaMin: 20 }).netExcedenteMin, 100);

  // Domingo/feriado: net é sobre o excedente ANTES do ×2,0.
  assert.equal(B.computeDailyDelta({ dayOfWeek: 0, totalMin: 120, pecuniaMin: 50 }).netExcedenteMin, 70);
  assert.equal(B.computeDailyDelta({ dayOfWeek: 0, isHolidayOrRecess: true, totalMin: 60, pecuniaMin: 0 }).netExcedenteMin, 60);

  // Mês fechado / projeção / dispensa: sem base comparável, fica 0.
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, isClosedMonth: true, totalMin: 500, dayTargetMinutes: 420 }).netExcedenteMin, 0);
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, isClosedMonth: true, isDispensed: true, totalMin: 0, dayTargetMinutes: 420 }).netExcedenteMin, 0);
  assert.equal(B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 0, totalMin: 369, dayTargetMinutes: 420, projectFromTotal: true }).netExcedenteMin, 0);
});

test('netExcedenteMin — capado no teto legal de horas pagáveis em pecúnia por jornada (Res. 22.901/2008 art. 4º)', () => {
  // Caso real (Fernando Lima Rocha, Espelho de setembro/2026): feriado
  // (dayOfWeek=1, isHolidayOrRecess) com 11:24 (684min) trabalhadas e NENHUM
  // minuto de pecúnia nativa. O teto de fim de semana/feriado é 10h (600min)
  // — o que passa disso (84min) nunca vira pecúnia, autorizado ou não, então
  // netExcedenteMin fica em 600, não 684.
  const feriado = B.computeDailyDelta({ dayOfWeek: 1, isHolidayOrRecess: true, totalMin: 684, exceedMin: 684, pecuniaMin: 0 });
  assert.equal(feriado.netExcedenteMin, 600, 'capado em 10h — as 84min acima do teto nunca viram pecúnia');
  // TC-C1-04: Jornada superior a 10h em FDS/feriado expurga o excedente acima do teto
  // do saldo acumulado e credita apenas o teto com dobra (600 × 2 = 1200)
  assert.equal(feriado.delta, 1200, 'teto de 10h (600min) com dobra (×2,0) = +20:00 (1200min)');
  assert.equal(feriado.lostHoursMin, 84, 'as 84min acima do teto viram horas perdidas (+01:24)');

  // Domingo com 08:19 (499min) trabalhadas e 07:49 (469min) já em pecúnia:
  // 499 já está abaixo do teto de 600, então o teto não entra em jogo aqui —
  // mesmo resultado de antes (30min).
  const domingoParcial = B.computeDailyDelta({ dayOfWeek: 0, totalMin: 499, exceedMin: 499, pecuniaMin: 469 });
  assert.equal(domingoParcial.netExcedenteMin, 30);

  // Sábado com 13h (780min) trabalhadas, nada em pecúnia: capa em 10h (600),
  // não nas 13h cheias.
  const sabado = B.computeDailyDelta({ dayOfWeek: 6, isClosedMonth: true, totalMin: 780, pecuniaMin: 0 });
  assert.equal(sabado.netExcedenteMin, 600);
  assert.equal(sabado.lostHoursMin, 180, '13h - 10h = 3h (180min) perdidas');

  // Dia útil com 3h (180min) de excedente, nada em pecúnia: capa em 2h (120),
  // não nas 3h cheias.
  const diaUtil = B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 180, pecuniaMin: 0, dayTargetMinutes: 420 });
  assert.equal(diaUtil.netExcedenteMin, 120);
  assert.equal(diaUtil.lostHoursMin, 0, 'acima de 2h em dia útil não é descarte (regras §3.11)');

  // Teto respeita o valor de legalConfig.js quando disponível (não só o
  // fallback hardcoded) — injeta um teto customizado e confirma que é usado.
  const { JEPessoasBalance: B2 } = loadModule('balanceCalc.js', {
    JEPessoasLegal: { MAX_HE_FDS_MIN: { valor: 300 }, MAX_HE_DIA_UTIL_MIN: { valor: 60 } }
  });
  assert.equal(B2.computeDailyDelta({ dayOfWeek: 0, totalMin: 400, pecuniaMin: 0 }).netExcedenteMin, 300, 'usa o teto de legalConfig.js (300), não o fallback (600)');
  assert.equal(B2.computeDailyDelta({ dayOfWeek: 3, exceedMin: 100, pecuniaMin: 0, dayTargetMinutes: 420 }).netExcedenteMin, 60, 'usa o teto de legalConfig.js (60), não o fallback (120)');
});

// -----------------------------------------------------------------------------
// Casos de Testes Normativos da Trilha C (C1)
// -----------------------------------------------------------------------------

test('TC-C1-01 — Mês fechado com HE autorizada onde 100% do excedente de FDS virou pecúnia (ex.: 10/2024)', () => {
  // Domingo 06/10/2024 (1º Turno das Eleições): 08:00 trabalhadas, todas pagas em pecúnia.
  // Em mês fechado sem homologadas no rodapé, o banco não incorpora FDS e fecha em 00:00.
  const domEleicao = B.computeDailyDelta({
    dayOfWeek: 0,
    totalMin: 480,
    pecuniaMin: 480,
    isClosedMonth: true,
    homologPool: B.createHomologPool({})
  });
  assert.equal(domEleicao.delta, 0, 'todo excedente virou pecúnia -> saldo zero');
  assert.equal(domEleicao.isPecuniaOnly, true);
  assert.equal(domEleicao.lostHoursMin, 0);

  // Sábado 05/10/2024: 08:42 trabalhadas e 08:42 em pecúnia.
  const sabEleicao = B.computeDailyDelta({
    dayOfWeek: 6,
    totalMin: 522,
    pecuniaMin: 522,
    isClosedMonth: true,
    homologPool: B.createHomologPool({})
  });
  assert.equal(sabEleicao.delta, 0);
  assert.equal(sabEleicao.isPecuniaOnly, true);
  assert.equal(sabEleicao.lostHoursMin, 0);

  // Acumulado de um mês fechado com dias úteis normais e FDS 100% pecúnia:
  // SALDO ACUM. fecha rigorosamente em 00:00 (espelha Extrato Oficial de 10/2024).
  let running = 0;
  const monthDays = [
    { dayOfWeek: 2, totalMin: 420, dayTargetMinutes: 420, isClosedMonth: true, homologPool: B.createHomologPool({}) },
    { dayOfWeek: 6, totalMin: 522, pecuniaMin: 522, isClosedMonth: true, homologPool: B.createHomologPool({}) },
    { dayOfWeek: 0, totalMin: 480, pecuniaMin: 480, isClosedMonth: true, homologPool: B.createHomologPool({}) }
  ];
  monthDays.forEach(d => { running += B.computeDailyDelta(d).delta; });
  assert.equal(running, 0, 'saldo final fecha estritamente em 00:00');
});

test('TC-C1-02 — Mês com excedente não homologado pela chefia (ex.: 03/2024)', () => {
  // Domingo com 10h trabalhadas sem homologação pela chefia (pool de homologadas zerado):
  // Excedente é expurgado do banco (delta = 0). As 10h estão no teto legal, logo lostHoursMin = 0.
  const domNaoHomolog = B.computeDailyDelta({
    dayOfWeek: 0,
    totalMin: 600,
    pecuniaMin: 0,
    isClosedMonth: true,
    homologPool: B.createHomologPool({})
  });
  assert.equal(domNaoHomolog.delta, 0, 'fator zero para não homologado no banco');
  assert.equal(domNaoHomolog.lostHoursMin, 0, 'dentro do teto legal de 10h -> 0 perdidas por teto');

  // Domingo com 11h trabalhadas sem homologação: 1h excede o teto legal de 10h -> lostHoursMin = 60
  const domPassouTeto = B.computeDailyDelta({
    dayOfWeek: 0,
    totalMin: 660,
    pecuniaMin: 0,
    isClosedMonth: true,
    homologPool: B.createHomologPool({})
  });
  assert.equal(domPassouTeto.delta, 0);
  assert.equal(domPassouTeto.lostHoursMin, 60, '1h acima do teto de 10h vira perda irrecuperável de teto');

  // Dia útil com 2h de excedente não homologado pela chefia:
  const utilNaoHomolog = B.computeDailyDelta({
    dayOfWeek: 2,
    totalMin: 540,
    dayTargetMinutes: 420,
    isClosedMonth: true,
    homologPool: B.createHomologPool({})
  });
  assert.equal(utilNaoHomolog.delta, 0, 'dia útil não homologado não credita banco');
  assert.equal(utilNaoHomolog.lostHoursMin, 0, 'dia útil não tem descarte por teto');
});

test('TC-C1-03 — Mês com parcela homologada pela chefia (apenas homologadas creditadas com fatores)', () => {
  // Dia útil com homologação de 60min (fator ×1,0):
  const util = B.computeDailyDelta({
    dayOfWeek: 1,
    totalMin: 540,
    dayTargetMinutes: 420,
    isClosedMonth: true,
    homologPool: B.createHomologPool({ uteis: 60 })
  });
  assert.equal(util.delta, 60, 'dia útil homologado credita ×1,0');
  assert.equal(util.lostHoursMin, 0, 'dia útil não tem descarte por teto');

  // Sábado com homologação de 120min (fator ×1,5):
  const sab = B.computeDailyDelta({
    dayOfWeek: 6,
    totalMin: 180,
    isClosedMonth: true,
    homologPool: B.createHomologPool({ sab: 120 })
  });
  assert.equal(sab.delta, 180, 'sábado homologado credita ×1,5 (120 × 1,5 = 180)');
  assert.equal(sab.lostHoursMin, 0, '180min de sábado está dentro do teto de 10h -> 0 perdidas por teto');

  // Domingo com homologação de 120min (fator ×2,0):
  const dom = B.computeDailyDelta({
    dayOfWeek: 0,
    totalMin: 180,
    isClosedMonth: true,
    homologPool: B.createHomologPool({ domfer: 120 })
  });
  assert.equal(dom.delta, 240, 'domingo homologado credita ×2,0 (120 × 2,0 = 240)');
  assert.equal(dom.lostHoursMin, 0, '180min de domingo está dentro do teto de 10h -> 0 perdidas por teto');
});

test('TC-C1-04 — Jornada superior a 10h em FDS/feriado expurga tempo e quantifica HORAS PERDIDAS', () => {
  // Caso real Fernando Lima Rocha (feriado 07/09/2026): 11:24 trabalhadas (684min)
  const r = B.computeDailyDelta({
    dayOfWeek: 1,
    isHolidayOrRecess: true,
    totalMin: 684,
    exceedMin: 684,
    pecuniaMin: 0
  });
  assert.equal(r.lostHoursMin, 84, 'exibe +01:24 de horas perdidas (684 - 600)');
  assert.equal(r.delta, 1200, 'apenas 10h (600min) com dobra (×2,0) = +20:00 vão ao banco');
  assert.equal(r.multiplierPct, 100);
});

test('TC-C1-05 — pool de homologadas: parcela do rodapé distribuída entre os dias fecha com o crédito real', () => {
  // Mês fechado com pecúnia em domingo e 05:50 homologadas em dias úteis: o
  // excedente de útil além da parcela homologada não entra no saldo.
  const pool = B.createHomologPool({ uteis: 350, sab: 0, domfer: 0 });
  const dias = [
    { dayOfWeek: 1, totalMin: 660, dayTargetMinutes: 420 }, // +240 -> credita 240
    { dayOfWeek: 2, totalMin: 400, dayTargetMinutes: 420 }, // dia curto: completado, sem débito
    { dayOfWeek: 3, totalMin: 660, dayTargetMinutes: 420 }, // +240 -> só restam 110
    { dayOfWeek: 4, totalMin: 600, dayTargetMinutes: 420 }, // pool esgotado -> 0
    { dayOfWeek: 0, totalMin: 360, pecuniaMin: 360 }        // 100% pecúnia -> 0
  ];
  const deltas = dias.map((d) => B.computeDailyDelta({ ...d, isClosedMonth: true, homologPool: pool }).delta);
  assert.deepEqual(deltas, [240, 0, 110, 0, 0]);
});

test('TC-C1-06 — sem rodapé legível o mês fechado mantém o excedente bruto', () => {
  const r = B.computeDailyDelta({ dayOfWeek: 1, totalMin: 480, dayTargetMinutes: 420, isClosedMonth: true });
  assert.equal(r.delta, 60);
});

test('dia útil acima de 2h em mês aberto continua na reconciliação do mês (regras §3.11)', () => {
  const longo = B.computeDailyDelta({ dayOfWeek: 1, exceedMin: 180, dayTargetMinutes: 420 });
  const curto = B.computeDailyDelta({ dayOfWeek: 2, exceedMin: -180, dayTargetMinutes: 420 });
  assert.equal(longo.delta + curto.delta, 0, '+3h num dia paga -3h no outro');
  assert.equal(longo.netExcedenteMin, 120, 'só 2h poderiam virar pecúnia');
});

test('coluna de controle em mês fechado acompanha excedente e dia curto, mesmo sem homologadas', () => {
  const pool = B.createHomologPool({ uteis: 0, sab: 0, domfer: 0 });
  const base = { dayOfWeek: 2, isClosedMonth: true, dayTargetMinutes: 420, exceedMin: 420, homologPool: pool };
  const longo = B.computeDailyDelta({ ...base, totalMin: 600 });
  const curto = B.computeDailyDelta({ ...base, totalMin: 300 });
  assert.equal(longo.delta, 0);
  assert.equal(longo.controlDeltaMin, 180);
  assert.equal(curto.controlDeltaMin, -120);
});

test('coluna de controle desconta pecúnia e adicional noturno pagos', () => {
  const r = B.computeDailyDelta({ dayOfWeek: 2, isClosedMonth: true, dayTargetMinutes: 420, totalMin: 600, pecuniaMin: 90, noturnoPecMin: 30, exceedMin: 420 });
  assert.equal(r.controlDeltaMin, 60);
});

test('fim de semana na coluna de controle só soma o crédito homologado', () => {
  const semHomolog = B.computeDailyDelta({ dayOfWeek: 0, isClosedMonth: true, totalMin: 300, exceedMin: 300, homologPool: B.createHomologPool({}) });
  assert.equal(semHomolog.controlDeltaMin, 0);
  const comHomolog = B.computeDailyDelta({ dayOfWeek: 0, isClosedMonth: true, totalMin: 300, exceedMin: 300, homologPool: B.createHomologPool({ domfer: 120 }) });
  assert.equal(comHomolog.controlDeltaMin, 240);
});

test('dia dispensado não mexe na coluna de controle', () => {
  const r = B.computeDailyDelta({ dayOfWeek: 2, isClosedMonth: true, isDispensed: true, dayTargetMinutes: 420, totalMin: 0, exceedMin: 0 });
  assert.equal(r.controlDeltaMin, 0);
});

test('cobertura de fim de semana zera controle de 10/2026 sem inventar crédito no banco', () => {
  const { JEPessoasLostCalc: L } = loadModule('lostHoursCalc.js');
  const zero = () => ({ uteis: 0, sab: 0, domfer: 0, total: 0 });
  const days = [
    { date: '01/10/2026', dow: 4, totalMin: 0, targetMin: 420 },
    { date: '02/10/2026', dow: 5, totalMin: 196, targetMin: 420 },
    { date: '24/10/2026', dow: 6, isWeekend: true, isSaturday: true, totalMin: 701, pecuniaMin: 298 },
    { date: '25/10/2026', dow: 0, isWeekend: true, totalMin: 20 }
  ];
  const a = { found: true, closed: true, days, footer: {
    pecunia: { uteis: 0, sab: 298, domfer: 0, total: 298 },
    noturnoPec: zero(), homolog: zero(), naoHomolog: zero(), excedeu: zero(), residuoMin: 0
  } };
  const loss = L.computeMonthLoss(a);
  const pool = B.createHomologPool({});
  const deltas = days.map(d => B.computeDailyDelta({
    dayOfWeek: d.dow, totalMin: d.totalMin, pecuniaMin: d.pecuniaMin, dayTargetMinutes: d.targetMin,
    isClosedMonth: true, homologPool: pool, weekendCoverageMin: loss.coverageByDate[d.date]?.coverageMin
  }));
  assert.equal(deltas.reduce((sum, d) => sum + d.controlDeltaMin, 0), 0);
  assert.equal(deltas.reduce((sum, d) => sum + d.delta, 0), 0);
});

test('cobertura mensal não altera saldo ou projeção de mês aberto', () => {
  const input = { dayOfWeek: 6, totalMin: 180, exceedMin: 180, weekendCoverageMin: 90 };
  const r = B.computeDailyDelta(input);
  const original = B.computeDailyDelta({ ...input, weekendCoverageMin: 0 });
  assert.deepEqual(r, original);
});
