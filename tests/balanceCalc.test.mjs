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
