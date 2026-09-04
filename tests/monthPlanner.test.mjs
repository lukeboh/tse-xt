import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasPlanner: P } = loadModule('monthPlanner.js');

test('toMin / fmt — com sinal', () => {
  assert.equal(P.toMin('+01:30'), 90);
  assert.equal(P.toMin('-00:30'), -30);
  assert.equal(P.toMin('0130'), 90);
  assert.equal(P.fmt(90, true), '+01:30');
  assert.equal(P.fmt(-30, true), '-00:30');
  assert.equal(P.fmt(0, true), '+00:00');
});

test('simulate — quanto por dia para zerar', () => {
  // devedor de 3h em 6 dias → +30min/dia
  let s = P.simulate(-180, 6);
  assert.equal(s.perDayToZero, 30);
  assert.equal(s.singleDayToZero, 180);
  // credor de 2h em 4 dias → pode fazer -30min/dia
  s = P.simulate(120, 4);
  assert.equal(s.perDayToZero, -30);
});

test('simulate — projeção do fechamento do mês', () => {
  // devedor -180, faço +60/dia por 6 dias → +180
  assert.equal(P.simulate(-180, 6, 60).projected, 180);
  // devedor -180, faço +30/dia por 6 dias → 0 (zera)
  assert.equal(P.simulate(-180, 6, 30).projected, 0);
  // credor +120, saio -30/dia por 4 dias → 0
  assert.equal(P.simulate(120, 4, -30).projected, 0);
  // sem dias restantes → projeção = saldo atual
  assert.equal(P.simulate(-90, 0, 999).projected, -90);
});
