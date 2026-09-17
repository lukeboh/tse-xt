import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStack } from './helpers.mjs';

const { JEPessoasKPI: K, JEPessoasModernizer: M } = loadStack();

// Monta um kpiData plausível a partir de números crus, passando pelo deriveMonthPlan.
function makeKpi(over = {}) {
  const base = {
    targetDailyHours: 7,
    estimatedExit: '19:24',
    hasTodayRow: true,
    remainingMinutesToday: 72,
    remainingTimeFormatted: '01:12',
    estimatedExitToZeroMonth: '16:39',
    zeroMonthSubtext: 'Sair <strong>02:45</strong> mais cedo',
    zeroMonthStatus: 'positive',
    accumulatedBankBalance: '12:15',
    pecuniaWeekdaySat: '12:15',
    pecuniaSundayHoliday: '06:00',
    pecuniaWeekdaySatMinutes: 735,
    pecuniaSundayHolidayMinutes: 360,
    pecuniaTotalMinutes: 1095,
    totalWorkedTimeFormatted: '88:20',
    totalExpectedTimeFormatted: '133:00',
    totalExpectedMinutesMonth: 7980,
    progressPercent: 66,
    barFillPercent: 66,
    isTargetExceeded: false,
    exceededTimeFormatted: '00:00',
    remainingHoursFormatted: '44:40',
    remainingWorkingDaysMonth: 6,
    homologPreviewMinutes: 0,
    homologPreviewFormatted: '00:00',
    hasHybridWorkInMonth: false,
    hasAuthorizedHEInMonth: false,
    isReducedRecessMonth: false,
    monthBalanceMin: -165,
    monthBalanceFormatted: '-02:45',
    bancoBalanceMin: 735
  };
  const merged = Object.assign(base, over);
  const regime = merged.hasHybridWorkInMonth ? 'hibrido'
    : (merged.hasAuthorizedHEInMonth ? 'he'
      : (merged.isReducedRecessMonth ? 'recesso' : 'normal'));
  const plan = K.deriveMonthPlan({
    monthBalanceMin: merged.monthBalanceMin,
    bancoBalanceMin: merged.bancoBalanceMin,
    regime,
    homologPreviewMinutes: merged.homologPreviewMinutes,
    pecuniaWeekdaySatMinutes: merged.pecuniaWeekdaySatMinutes,
    pecuniaSundayHolidayMinutes: merged.pecuniaSundayHolidayMinutes,
    authWeekdaySatMin: merged.authWeekdaySatMin || 0,
    authSundayHolidayMin: merged.authSundayHolidayMin || 0
  });
  const authTotalMin = (merged.authWeekdaySatMin || 0) + (merged.authSundayHolidayMin || 0);
  return Object.assign(merged, plan, {
    regime,
    bancoWillAddFormatted: K.formatMinutesToTime(plan.bancoWillAddMin),
    bancoWillConsumeFormatted: K.formatMinutesToTime(plan.bancoWillConsumeMin),
    bancoOverdraftFormatted: K.formatMinutesToTime(plan.bancoOverdraftMin),
    pecuniaLegalMonthlyRemainingFormatted: K.formatMinutesToTime(plan.pecuniaLegalMonthlyRemainingMin),
    pecuniaOpenWeekdaySatFormatted: K.formatMinutesToTime(plan.pecuniaOpenWeekdaySatMin),
    pecuniaOpenSundayHolidayFormatted: K.formatMinutesToTime(plan.pecuniaOpenSundayHolidayMin),
    pecuniaTotalFormatted: K.formatMinutesToTime(merged.pecuniaWeekdaySatMinutes + merged.pecuniaSundayHolidayMinutes),
    authTotalMin,
    authTotalHoursFormatted: `${Math.round(authTotalMin / 60)}h`
  });
}

function assertClean(html) {
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'sem undefined/NaN/[object Object]');
  assert.equal((html.match(/je-kpi-card/g) || []).length, 5, 'exatamente 5 cards');
}

test('5 cards, sem lixo, títulos esperados', () => {
  const html = M.buildKpiCardsHTML(makeKpi());
  assertClean(html);
  for (const t of ['Saída de Hoje', 'Saldo do Mês', 'Banco de Horas', 'Hora Extra (Pecúnia)', 'Meta do Mês']) {
    assert.ok(html.includes(t), 'contém ' + t);
  }
  assert.ok(html.includes('je-kpi-planner-link'), 'KPI 2 tem o link do planejador');
});

test('mês encerrado (homologado) — KPI 2 não mostra o botão "planejar"', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ isClosedMonth: true }));
  assertClean(html);
  assert.ok(!html.includes('je-kpi-planner-link'), 'não faz sentido planejar um mês que já fechou');
});

test('mês aberto — KPI 2 continua mostrando "planejar" mesmo sem dias úteis restantes', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ isClosedMonth: false, remainingWorkingDaysMonth: 0 }));
  assertClean(html);
  assert.ok(html.includes('mês encerrado')); // texto do "sem dias restantes" é independente
  assert.ok(html.includes('je-kpi-planner-link'), 'mês só fecha de verdade quando homologado (isClosedMonth)');
});

test('mês devedor Normal — mostra consumo do banco e "devedor"', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ monthBalanceMin: -165, bancoBalanceMin: 735 }));
  assertClean(html);
  assert.ok(html.includes('-02:45'));
  assert.ok(html.includes('devedor'));
  assert.ok(/−02:45 do banco|-02:45 do banco/.test(html), 'linha de consumo do banco');
});

test('mês devedor Normal sem saldo suficiente — mostra "vira débito"', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ monthBalanceMin: -300, bancoBalanceMin: 120, accumulatedBankBalance: '02:00' }));
  assertClean(html);
  assert.ok(html.includes('vira débito'));
});

test('mês credor com homologável — mostra "homologáveis → banco"', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ monthBalanceMin: 300, monthBalanceFormatted: '+05:00', homologPreviewMinutes: 210, homologPreviewFormatted: '03:30' }));
  assertClean(html);
  assert.ok(html.includes('credor'));
  assert.ok(html.includes('homologáveis'));
});

test('regime híbrido — "Sem acúmulo", nada de consumo', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ hasHybridWorkInMonth: true, monthBalanceMin: -300 }));
  assertClean(html);
  assert.ok(html.includes('Sem acúmulo'));
  assert.ok(!html.includes('do banco</span>'), 'não sugere consumo do banco');
});

test('regime HE autorizado — "Consumo vedado (art. 13)"', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ hasAuthorizedHEInMonth: true, monthBalanceMin: 120, homologPreviewMinutes: 90, homologPreviewFormatted: '01:30' }));
  assertClean(html);
  assert.ok(html.includes('Consumo vedado'));
  assert.ok(html.includes('art. 13'));
});

test('recesso 5h — jornada 5 e aviso de acúmulo restrito', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ isReducedRecessMonth: true, targetDailyHours: 5 }));
  assertClean(html);
  assert.ok(html.includes('Recesso 5h'));
  assert.ok(html.includes('Jornada de 5h') || html.includes('Jornada 5h'));
});

test('KPI 4 — blocos +50% e +100%, sem opção de ajuste manual (ícone de $ estático)', () => {
  const html = M.buildKpiCardsHTML(makeKpi());
  assert.ok(html.includes('Semana / Sábado'));
  assert.ok(html.includes('Domingo / Feriado'));
  assert.ok(html.includes('+50%') && html.includes('+100%'));
  assert.ok(html.includes('Teto 60h/mês'));
  assert.ok(html.includes('Executado:'));
  // sem autorizado do SAEX, o "Executado" cai pro teto legal: 60h - 18:15 feito = 41:45
  assert.ok(html.includes('resta 41:45'));
  assert.ok(html.includes('je-kpi-heauth-icon'), 'tem o ícone estático de $ (sem opção de ajuste manual)');
  assert.ok(!html.includes('je-kpi-heauth-gear'), 'a engrenagem de ajuste manual foi removida');
  assert.ok(!html.includes('je-kpi-heauth-spinner'), 'sem heAuthLoading, não mostra spinner nenhum');
});

test('KPI 4 — SAEX ainda carregando: spinner no lugar do denominador (nos 2 blocos e no rodapé)', () => {
  const html = M.buildKpiCardsHTML(makeKpi({ heAuthLoading: true }));
  assertClean(html);
  const spinners = (html.match(/je-kpi-heauth-spinner/g) || []).length;
  assert.equal(spinners, 3, 'um spinner por bloco (2) + um no rodapé "Executado" (1)');
  // sem fração ainda (não virou hasHEAutorizadoConfig) — só o "feito" + spinner
  assert.ok(!html.includes('/07:59') && !html.includes('/12:15'));
});

test('KPI 4 — autorizado do SAEX já carregado não mostra spinner', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    heAuthLoading: true, // se por algum motivo os dois vierem juntos, o dado real manda
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 1200, authWeekdaySatFormatted: '20:00',
    authSundayHolidayMin: 600, authSundayHolidayFormatted: '10:00'
  }));
  assertClean(html);
  assert.ok(!html.includes('je-kpi-heauth-spinner'), 'com autorizado real disponível, o spinner não aparece');
  assert.ok(html.includes('/20:00') && html.includes('/10:00'));
});

test('KPI 4 com HE autorizada do SAEX — mostra fração feito/autorizado + barra', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 1200, authWeekdaySatFormatted: '20:00',
    authSundayHolidayMin: 600, authSundayHolidayFormatted: '10:00'
  }));
  assertClean(html);
  assert.ok(html.includes('/20:00'), 'fração semana/sáb: feito/autorizado');
  assert.ok(html.includes('/10:00'), 'fração dom/fer: feito/autorizado');
  // pecuniaTotalMinutes (735+360=1095=18:15) / authTotalMin (1200+600=1800=30h)
  assert.ok(html.includes('18:15'));
  assert.ok(html.includes('30h Autorizadas'));
  assert.ok(html.includes('(Teto 60h/mês)'));
});

test('KPI 4 — feito passou do autorizado (cor de alerta na fração e na barra)', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    pecuniaWeekdaySatMinutes: 900, pecuniaWeekdaySat: '15:00',
    authWeekdaySatMin: 600, authWeekdaySatFormatted: '10:00'
  }));
  assertClean(html);
  assert.ok(html.includes('/10:00'));
  assert.ok(html.includes('var(--je-danger-text)'), 'cor de alerta quando passa do autorizado');
});

// Isola o trecho de HTML de um card pelo título, pra não contar barras de
// outros KPIs. Âncora em ">título<" (o <span class="je-kpi-title">), não só
// no texto — senão bate primeiro no comentário HTML "<!-- KPI N: título -->".
function extractCard(html, title) {
  const start = html.indexOf('>' + title + '<');
  assert.ok(start >= 0, `card "${title}" encontrado`);
  const nextCard = html.indexOf('je-kpi-card', start + title.length);
  return html.slice(start, nextCard >= 0 ? nextCard : html.length);
}

test('KPI 4 — ícone de $ usa a mesma caixa dos ícones dos demais KPIs', () => {
  const card = extractCard(M.buildKpiCardsHTML(makeKpi()), 'Hora Extra (Pecúnia)');
  assert.ok(/class="je-kpi-icon-wrapper je-kpi-heauth-icon"/.test(card), 'reaproveita .je-kpi-icon-wrapper');
});

test('KPI 4 — sem excedente parado no banco, não mostra a dica "(+HH:MM)"', () => {
  const html = M.buildKpiCardsHTML(makeKpi());
  assertClean(html);
  assert.ok(!html.includes('je-kpi-excedente-hint'));
  assert.ok(!html.includes('je-kpi-pec-track-alert'));
});

test('KPI 4 — barra a 100% do autorizado COM excedente sobrando: mostra "(+HH:MM)" e o glow de alerta', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 600, authWeekdaySatFormatted: '10:00',
    pecuniaWeekdaySatMinutes: 600, pecuniaWeekdaySat: '10:00', // feito == autorizado -> 100%, sem "over"
    // teto total >= feito total (960min) pra "Executado" (rodapé do card) não
    // entrar em "over" por conta própria e confundir a asserção de cor de alerta.
    authSundayHolidayMin: 600, authSundayHolidayFormatted: '10:00',
    excedenteSemPecuniaWeekdaySatMinutes: 45,
    excedenteSemPecuniaWeekdaySatFormatted: '00:45'
  }));
  assertClean(html);
  assert.ok(html.includes('(+00:45)'));
  assert.ok(html.includes('je-kpi-excedente-hint'));
  assert.ok(/title="Horas excedentes de Semana \/ Sábado[^"]*virar pecúnia em vez de saldo\./.test(html), 'tooltip explica o valor');
  assert.ok(html.includes('je-kpi-pec-track-alert'), 'chegou a 100% do autorizado com excedente ainda sobrando');
  assert.ok(!html.includes('var(--je-danger-text)'), 'feito == autorizado não é "over" (só quando ultrapassa)');
  // glow acompanha a cor do PRÓPRIO bloco (Semana/Sábado = navy #0a2540),
  // não uma cor fixa — feedback do usuário após ver um âmbar genérico numa
  // barra roxa.
  assert.ok(html.includes('--je-pec-glow-rgb:10, 37, 64;'), 'glow na cor navy do bloco Semana/Sábado');
});

test('KPI 4 — glow de alerta acompanha a cor roxa do bloco Domingo/Feriado', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 600, authWeekdaySatFormatted: '10:00',
    authSundayHolidayMin: 600, authSundayHolidayFormatted: '10:00',
    pecuniaSundayHolidayMinutes: 600, pecuniaSundayHoliday: '10:00', // feito == autorizado -> 100%
    excedenteSemPecuniaSundayHolidayMinutes: 30,
    excedenteSemPecuniaSundayHolidayFormatted: '00:30'
  }));
  assertClean(html);
  assert.ok(html.includes('je-kpi-pec-track-alert'));
  assert.ok(html.includes('--je-pec-glow-rgb:124, 58, 237;'), 'glow na cor roxa (#7c3aed) do bloco Domingo/Feriado');
});

test('KPI 4 — abaixo de 100% do autorizado, mesmo com excedente no dia, NÃO mostra a dica nem o glow', () => {
  // Reproduz o caso reportado: barra em 41% (09:50/24:00) mas com excedente
  // diário acumulado (dias sem pecúnia isolados) — não indica falta de
  // autorização enquanto o teto nem foi alcançado, então a dica fica muda.
  const html = M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 1200, authWeekdaySatFormatted: '20:00',
    pecuniaWeekdaySatMinutes: 590, pecuniaWeekdaySat: '09:50',
    excedenteSemPecuniaWeekdaySatMinutes: 496, // 08:16
    excedenteSemPecuniaWeekdaySatFormatted: '08:16'
  }));
  assertClean(html);
  assert.ok(!html.includes('je-kpi-excedente-hint'), 'não chegou a 100% do autorizado ainda — dica não faz sentido aqui');
  assert.ok(!html.includes('je-kpi-pec-track-alert'));
});

test('KPI 4 — sem nenhuma autorização lida do SAEX, a dica de excedente NÃO aparece (não há teto pra "atingir")', () => {
  const html = M.buildKpiCardsHTML(makeKpi({
    excedenteSemPecuniaSundayHolidayMinutes: 30,
    excedenteSemPecuniaSundayHolidayFormatted: '00:30'
  }));
  assertClean(html);
  assert.ok(!html.includes('je-kpi-excedente-hint'));
});

test('KPI 4 — sempre 3 barras de progresso (Semana/Sáb, Dom/Fer, Executado), com ou sem SAEX', () => {
  const semAuth = extractCard(M.buildKpiCardsHTML(makeKpi()), 'Hora Extra (Pecúnia)');
  const comAuth = extractCard(M.buildKpiCardsHTML(makeKpi({
    hasHEAutorizadoConfig: true,
    authWeekdaySatMin: 1200, authWeekdaySatFormatted: '20:00',
    authSundayHolidayMin: 600, authSundayHolidayFormatted: '10:00'
  })), 'Hora Extra (Pecúnia)');
  for (const card of [semAuth, comAuth]) {
    const bars = (card.match(/background:rgba\(0, 102, 204, 0\.08\)/g) || []).length;
    assert.equal(bars, 3, 'uma barra por bloco (2) + a do rodapé "Executado" (1)');
  }
});
