import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { JEPessoasHeGestaoKpi: K } = loadModule('heGestaoKpi.js');

// Fábrica de uma tabela fake #tbServidoresAutorizados: cada linha nativa é
// (matrícula, nome, tipo, horasAutorizadas, horasRealizadas) — igual ao
// formato real (Domingo/Feriado e Dia Útil/Sábado em linhas separadas por
// servidor, "Horas Autorizadas" é um <input>, não texto puro).
function fakeTable(rows) {
  return {
    rows: [
      { cells: [] }, // cabeçalho — sempre pulado (slice(1))
      ...rows.map(([matricula, nome, tipo, autorizadas, realizadas]) => ({
        cells: [
          { textContent: matricula },
          { textContent: nome },
          { textContent: 'SETOT' },
          { textContent: '01/09/26 até 30/09/26' },
          { textContent: tipo },
          { textContent: '' },
          { textContent: realizadas },
          { textContent: '00:00' }
        ],
        querySelector: (sel) => (sel === 'input[name="listaHorasAprovadas"]' ? { value: autorizadas } : null)
      }))
    ]
  };
}

test('extractServidores — agrega por matrícula, separa Sábado/Domingo', () => {
  const table = fakeTable([
    ['30000001', 'CARLOS HENRIQUE MOREIRA DE OLIVEIRA', 'Domingo/Feriado', '16:00', '13:16'],
    ['30000001', 'CARLOS HENRIQUE MOREIRA DE OLIVEIRA', 'Dia Útil/Sábado', '24:00', '06:39'],
    ['30000002', 'BRUNO RAFAEL DE OLIVEIRA COSTA', 'Dia Útil/Sábado', '24:00', '07:42']
  ]);

  const result = K.extractServidores(table);
  assert.equal(result.length, 2);

  const carlos = result.find((s) => s.matricula === '30000001');
  assert.equal(carlos.dom.autMin, 16 * 60);
  assert.equal(carlos.dom.realMin, 13 * 60 + 16);
  assert.equal(carlos.sab.autMin, 24 * 60);
  assert.equal(carlos.sab.realMin, 6 * 60 + 39);

  const igor = result.find((s) => s.matricula === '30000002');
  assert.equal(igor.dom.autMin, 0);
  assert.equal(igor.dom.realMin, 0);
  assert.equal(igor.sab.autMin, 24 * 60);
});

test('extractServidores — ignora linhas sem matrícula (cabeçalho/linha em branco)', () => {
  const table = fakeTable([['', 'X', 'Domingo/Feriado', '16:00', '00:00']]);
  assert.equal(K.extractServidores(table).length, 0);
});

test('buildDisplayNames — sem homônimo, mostra só o primeiro nome', () => {
  const servidores = [
    { nome: 'CARLOS HENRIQUE MOREIRA DE OLIVEIRA' },
    { nome: 'BRUNO RAFAEL DE OLIVEIRA COSTA' },
    { nome: 'DANIEL SOARES MENEZES' }
  ];
  assert.deepEqual(K.buildDisplayNames(servidores), ['CARLOS', 'BRUNO', 'DANIEL']);
});

test('buildDisplayNames — homônimo com sobrenomes distintos ganha a inicial', () => {
  const servidores = [
    { nome: 'CARLOS HENRIQUE MOREIRA' },
    { nome: 'CARLOS SOARES MENEZES' }
  ];
  assert.deepEqual(K.buildDisplayNames(servidores), ['CARLOS H.', 'CARLOS S.']);
});

test('buildDisplayNames — homônimo com mesma inicial escala pro sobrenome por extenso', () => {
  const servidores = [
    { nome: 'CARLOS SANTOS SILVA' },
    { nome: 'CARLOS SOARES MENEZES' }
  ];
  // "CARLOS S." colidiria pros dois — precisa do sobrenome completo pra distinguir.
  assert.deepEqual(K.buildDisplayNames(servidores), ['CARLOS SANTOS', 'CARLOS SOARES']);
});

test('buildDisplayNames — 3 homônimos, um deles distinguido só na 2ª palavra do sobrenome', () => {
  const servidores = [
    { nome: 'ANA SOARES ALVES' },
    { nome: 'ANA SOARES MENEZES' },
    { nome: 'ANA COSTA VIANA' }
  ];
  const names = K.buildDisplayNames(servidores);
  // únicos entre si — não precisa ser exatamente igual a nenhuma string fixa,
  // só nunca colidir.
  assert.equal(new Set(names).size, 3);
  assert.ok(names.every((n) => n.startsWith('ANA')));
});

test('buildDisplayNames — servidor sem sobrenome nenhum não quebra ao colidir', () => {
  const servidores = [
    { nome: 'MARIA' },
    { nome: 'MARIA APARECIDA SOUZA' }
  ];
  const names = K.buildDisplayNames(servidores);
  assert.equal(names.length, 2);
  assert.notEqual(names[0], names[1]);
});

// --- "Poderia virar pecúnia se houvesse autorização" (excedente por servidor) ---
// Mesma formatação/condição do KPI 4 do Espelho de Ponto: só mostra a dica
// (e o glow) quando a barra já chegou a 100% do autorizado.

function servidorFixture(over) {
  return Object.assign({
    matricula: '30000003',
    nome: 'FERNANDO LIMA ROCHA',
    sab: { autMin: 24 * 60, realMin: 2 * 60 + 22 },
    dom: { autMin: 16 * 60, realMin: 16 * 60 } // 100% do autorizado
  }, over);
}

test('buildRowsHTML — sem excedente resolvido ainda (fetch em segundo plano pendente), não mostra a dica', () => {
  const html = K.buildRowsHTML([servidorFixture()], ['FERNANDO']);
  assert.ok(!html.includes('je-kpi-excedente-hint'));
  assert.ok(!html.includes('je-hegestao-bar-track-alert'));
});

test('buildRowsHTML — Domingo a 100% do autorizado COM excedente: mostra a dica e o glow, na cor roxa do bloco', () => {
  const html = K.buildRowsHTML([servidorFixture({ dom: { autMin: 16 * 60, realMin: 16 * 60, excedenteMin: 714 } })], ['FERNANDO']);
  assert.ok(html.includes('(+11:54)'));
  assert.ok(html.includes('je-kpi-excedente-hint'));
  assert.ok(/title="Horas excedentes de Domingo[^"]*virar pecúnia em vez de saldo\./.test(html));
  assert.ok(html.includes('je-hegestao-bar-track-alert'));
  assert.ok(html.includes('--je-pec-glow-rgb:124, 58, 237;'), 'glow na cor roxa (#7c3aed) do bloco Domingo');
});

test('buildRowsHTML — Sábado abaixo de 100% do autorizado, mesmo com excedente resolvido, não mostra a dica', () => {
  const html = K.buildRowsHTML([servidorFixture({ sab: { autMin: 24 * 60, realMin: 2 * 60 + 22, excedenteMin: 120 } })], ['FERNANDO']);
  const sabBlock = html.slice(0, html.indexOf('Domingo'));
  assert.ok(!sabBlock.includes('je-kpi-excedente-hint'), 'Sábado está em 10% do autorizado, não 100%');
  assert.ok(!sabBlock.includes('je-hegestao-bar-track-alert'));
});

test('buildRowsHTML — cada bloco leva data-matricula/data-bucket pra updateExcedente() localizar depois', () => {
  const html = K.buildRowsHTML([servidorFixture()], ['FERNANDO']);
  assert.ok(html.includes('data-matricula="30000003"'));
  assert.ok(html.includes('data-bucket="sab"'));
  assert.ok(html.includes('data-bucket="dom"'));
});

test('readPeriodoAtual — lê "09/2026" do combo mesAnoAtual', () => {
  const filterTable = {
    querySelector: (sel) => (sel.includes('mesAnoAtual') || sel.includes('mesAno') ? { value: '09/2026' } : null)
  };
  assert.deepEqual(K.readPeriodoAtual(filterTable), { mes: 9, ano: 2026 });
});

test('readPeriodoAtual — sem combo ou valor mal formado retorna null', () => {
  assert.equal(K.readPeriodoAtual({ querySelector: () => null }), null);
  assert.equal(K.readPeriodoAtual({ querySelector: () => ({ value: 'lixo' }) }), null);
});
