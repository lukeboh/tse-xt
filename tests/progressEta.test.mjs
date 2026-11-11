import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasProgress: P } = loadModule('progressEta.js');

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test('sem nenhuma consulta medida não há previsão', () => {
  const c = clock();
  const tr = P.createTracker({ now: c.now });
  assert.equal(tr.remainingMs({ espelho: 10 }), null);
  assert.equal(P.formatEta(null), '');
});

test('a previsão usa a duração média de cada tipo de consulta', () => {
  const c = clock();
  const tr = P.createTracker({ now: c.now });
  c.advance(400); tr.step('espelho');
  c.advance(600); tr.step('espelho');
  assert.equal(tr.average('espelho'), 500);
  assert.equal(tr.remainingMs({ espelho: 8 }), 4000);
});

test('tipo ainda não medido é estimado a partir de outro tipo', () => {
  const c = clock();
  const tr = P.createTracker({ now: c.now });
  c.advance(300); tr.step('espelho');
  const factors = { contracheque: { of: 'espelho', x: 2 } };
  assert.equal(tr.remainingMs({ espelho: 2, contracheque: 5 }, factors), 600 + 3000);
  assert.equal(tr.remainingMs({ contracheque: 1 }), null, 'sem fator não há como estimar');
});

test('quando o tipo é medido, a medida substitui o fator', () => {
  const c = clock();
  const tr = P.createTracker({ now: c.now });
  c.advance(300); tr.step('espelho');
  c.advance(1000); tr.step('contracheque');
  assert.equal(tr.remainingMs({ contracheque: 3 }, { contracheque: { of: 'espelho', x: 2 } }), 3000);
});

test('fração concluída segue o tempo e, sem previsão, a contagem', () => {
  assert.equal(P.fraction(1000, 3000, 0, 0), 0.25);
  assert.equal(P.fraction(1000, null, 3, 12), 0.25);
  assert.equal(P.fraction(0, 0, 0, 0), 1);
  assert.equal(P.fraction(0, null, 0, 0), 0);
});

test('previsão em minutos e horas, com o horário de término', () => {
  const base = new Date(2026, 10, 11, 14, 0, 0);
  assert.equal(P.formatEta(30000, base), 'menos de 1 min');
  assert.equal(P.formatEta(4 * 60000 + 1, base), 'cerca de 5 min (até 14:04)');
  assert.equal(P.formatEta(90 * 60000, base), 'cerca de 1 h 30 min (até 15:30)');
  assert.equal(P.formatEta(120 * 60000, base), 'cerca de 2 h (até 16:00)');
});
