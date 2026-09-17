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
  // O delta do banco de horas em si NÃO tem esse teto aplicado (é outra conta) —
  // continua usando o excedente bruto (684) × o multiplicador de feriado (×2,0).
  assert.equal(feriado.delta, 684 * 2, 'delta do banco de horas não muda com este ajuste');

  // Domingo com 08:19 (499min) trabalhadas e 07:49 (469min) já em pecúnia:
  // 499 já está abaixo do teto de 600, então o teto não entra em jogo aqui —
  // mesmo resultado de antes (30min).
  const domingoParcial = B.computeDailyDelta({ dayOfWeek: 0, totalMin: 499, exceedMin: 499, pecuniaMin: 469 });
  assert.equal(domingoParcial.netExcedenteMin, 30);

  // Sábado com 13h (780min) trabalhadas, nada em pecúnia: capa em 10h (600),
  // não nas 13h cheias.
  const sabado = B.computeDailyDelta({ dayOfWeek: 6, isClosedMonth: true, totalMin: 780, pecuniaMin: 0 });
  assert.equal(sabado.netExcedenteMin, 600);

  // Dia útil com 3h (180min) de excedente, nada em pecúnia: capa em 2h (120),
  // não nas 3h cheias.
  const diaUtil = B.computeDailyDelta({ dayOfWeek: 3, exceedMin: 180, pecuniaMin: 0, dayTargetMinutes: 420 });
  assert.equal(diaUtil.netExcedenteMin, 120);

  // Teto respeita o valor de legalConfig.js quando disponível (não só o
  // fallback hardcoded) — injeta um teto customizado e confirma que é usado.
  const { JEPessoasBalance: B2 } = loadModule('balanceCalc.js', {
    JEPessoasLegal: { MAX_HE_FDS_MIN: { valor: 300 }, MAX_HE_DIA_UTIL_MIN: { valor: 60 } }
  });
  assert.equal(B2.computeDailyDelta({ dayOfWeek: 0, totalMin: 400, pecuniaMin: 0 }).netExcedenteMin, 300, 'usa o teto de legalConfig.js (300), não o fallback (600)');
  assert.equal(B2.computeDailyDelta({ dayOfWeek: 3, exceedMin: 100, pecuniaMin: 0, dayTargetMinutes: 420 }).netExcedenteMin, 60, 'usa o teto de legalConfig.js (60), não o fallback (120)');
});
