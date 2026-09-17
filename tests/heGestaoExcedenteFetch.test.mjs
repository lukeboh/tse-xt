import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const legal = loadModule('legalConfig.js');
const balance = loadModule('balanceCalc.js', legal);
const { JEPessoasHeGestaoExcedente: E } = loadModule('heGestaoExcedenteFetch.js', Object.assign({}, legal, balance));

test('classifyOccurrence — feriado/recesso/facultativo, licença, férias, viagem', () => {
  assert.equal(E.classifyOccurrence('FERIADO').isHolidayOrRecess, true);
  assert.equal(E.classifyOccurrence('RECESSO').isHolidayOrRecess, true);
  assert.equal(E.classifyOccurrence('PONTO FACULTATIVO').isHolidayOrRecess, true);
  assert.equal(E.classifyOccurrence('LICENÇA MÉDICA').isLicense, true);
  assert.equal(E.classifyOccurrence('FÉRIAS').isVacation, true);
  assert.equal(E.classifyOccurrence('VIAGEM A SERVIÇO').isTravel, true);
  assert.equal(E.classifyOccurrence('TEMPO DE SERVIÇO').isTravel, false, 'exclusão específica do kpiExtractor');
  const normal = E.classifyOccurrence('');
  assert.deepEqual(normal, { isHolidayOrRecess: false, isLicense: false, isVacation: false, isTravel: false });
});

// Fake DOM mínimo — só o suficiente pra computeExcedenteFromTable: tr com
// querySelector(".hNN") por classe, table com querySelectorAll("th"|"tr").
function fakeCell(className, text) {
  return { className, textContent: text };
}

function fakeRow(cellsByClass) {
  const cells = Object.keys(cellsByClass).map((cls) => fakeCell(cls, cellsByClass[cls]));
  return {
    querySelector(sel) {
      const cls = sel.replace('.', '');
      return cells.find((c) => c.className === cls) || null;
    },
    textContent: Object.values(cellsByClass).join(' ')
  };
}

function fakeTable(rows, thTexts) {
  return {
    querySelectorAll(sel) {
      if (sel === 'th') return (thTexts || []).map((t) => ({ textContent: t }));
      if (sel === 'tr') return rows;
      return [];
    }
  };
}

test('computeExcedenteFromTable — caso real (Fernando Lima Rocha, feriado 07/09/2026): capa no teto de 10h', () => {
  const row = fakeRow({
    h01: '07/09/2026', h04: '', h06: '', h08: '00:00',
    h09: '11:24', h10: '11:24', h12: '00:00', h16: 'FERIADO > 10h (art. 4º)'
  });
  const table = fakeTable([row]);
  const result = E.computeExcedenteFromTable(table);
  assert.equal(result.domMin, 600, 'feriado -> bucket domingo/feriado, capado em 10h (600min), não nas 11:24 (684min) cheias');
  assert.equal(result.sabMin, 0);
});

test('computeExcedenteFromTable — dia útil soma no bucket sábado/dia útil, capado em 2h', () => {
  // 15/09/2026 é uma terça-feira.
  const row = fakeRow({
    h01: '15/09/2026', h04: '', h06: '', h08: '00:00',
    h09: '10:00', h10: '03:00', h12: '00:00', h16: ''
  });
  const table = fakeTable([row]);
  const result = E.computeExcedenteFromTable(table);
  assert.equal(result.sabMin, 120, 'dia útil -> bucket sábado/dia útil, capado em 2h (120min), não nas 3h (180min) cheias');
  assert.equal(result.domMin, 0);
});

test('computeExcedenteFromTable — soma vários dias e ignora dias futuros/sem data', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const dd = String(futureDate.getDate()).padStart(2, '0');
  const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
  const yyyy = futureDate.getFullYear();

  const rows = [
    fakeRow({ h01: '06/09/2026', h04: '', h06: '', h08: '00:00', h09: '08:11', h10: '08:11', h12: '08:11', h16: 'DOMINGO' }), // net 0
    fakeRow({ h01: '13/09/2026', h04: '', h06: '', h08: '00:00', h09: '08:19', h10: '08:19', h12: '07:49', h16: 'DOMINGO' }), // net 30
    fakeRow({}), // sem .h01 -> ignorada
    fakeRow({ h01: `${dd}/${mm}/${yyyy}`, h04: '', h06: '', h08: '00:00', h09: '05:00', h10: '05:00', h12: '00:00', h16: 'DOMINGO' }) // futuro -> ignorada
  ];
  const table = fakeTable(rows);
  const result = E.computeExcedenteFromTable(table);
  assert.equal(result.domMin, 30);
  assert.equal(result.sabMin, 0);
});

test('computeExcedenteFromTable — tabela/window.JEPessoasBalance ausentes não quebram (retorna zeros)', () => {
  assert.deepEqual(E.computeExcedenteFromTable(null), { sabMin: 0, domMin: 0 });
});
