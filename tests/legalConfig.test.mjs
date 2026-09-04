import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasLegal: L } = loadModule('legalConfig.js');

test('isElectionYear — todo ano par é eleitoral', () => {
  assert.equal(L.isElectionYear(2024), true);
  assert.equal(L.isElectionYear(2025), false);
  assert.equal(L.isElectionYear(2026), true);
  assert.equal(L.isElectionYear(2027), false);
});

test('isReducedRecessMonth — janeiro sempre; julho só ano ímpar', () => {
  assert.equal(L.isReducedRecessMonth(2024, 1), true);
  assert.equal(L.isReducedRecessMonth(2025, 1), true);
  assert.equal(L.isReducedRecessMonth(2025, 7), true, 'julho de ano ímpar');
  assert.equal(L.isReducedRecessMonth(2024, 7), false, 'julho de ano par (eleitoral)');
  assert.equal(L.isReducedRecessMonth(2026, 7), false);
  assert.equal(L.isReducedRecessMonth(2025, 3), false);
});

test('dailyTargetMinutes — 7h turno único, 8h com 2ª entrada, 5h no recesso', () => {
  assert.equal(L.dailyTargetMinutes({ year: 2025, month: 3 }), 420, 'turno único mês normal');
  assert.equal(L.dailyTargetMinutes({ e2: '13:00', year: 2025, month: 3 }), 480, '2ª entrada = intervalo = 8h');
  assert.equal(L.dailyTargetMinutes({ e3: '15:00', year: 2025, month: 3 }), 480, '3ª entrada também');
  assert.equal(L.dailyTargetMinutes({ year: 2025, month: 1 }), 300, 'janeiro recesso');
  assert.equal(L.dailyTargetMinutes({ year: 2025, month: 7 }), 300, 'julho ímpar recesso');
  assert.equal(L.dailyTargetMinutes({ year: 2026, month: 7 }), 420, 'julho par não é recesso');
  assert.equal(L.dailyTargetMinutes({ e2: '13:00', year: 2025, month: 1 }), 480, 'intervalo vence o recesso');
});
