import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';
const legal=loadModule('legalConfig.js');
const lost=loadModule('lostHoursCalc.js',legal);
const {JEPessoasModernizer:M}=loadModule('domModernizer.js',{...legal,...lost});
const cell=(colSpan=1,textContent='')=>({colSpan,textContent,dataset:{},classList:{add(){} }});

for (const [state, injected, expected] of [['fechado',7,19],['aberto',6,18]]) {
  test(`totais em mês ${state}: reserva nativa não cria colunas extras e suporta reprocessamento`,()=>{
    const native=[cell(8,'Totais:'),cell(1,'160:00'),cell(1,'165:00'),cell(6)];
    const added=Array.from({length:injected},()=>cell());
    const row=[...native.slice(0,3),...added,native[3]];
    const anchor=added.at(-1);
    anchor.parentNode={insertBefore(){throw Error('A reserva existente deve ser reutilizada');}};
    assert.equal(M.fitMonthlyTotalsTail(native,anchor),native[3]);
    assert.equal(row.reduce((n,c)=>n+c.colSpan,0),expected);
    assert.equal(native[3].dataset.jeOrigColspan,'6');
    M.fitMonthlyTotalsTail(native,anchor);
    assert.equal(native[3].dataset.jeOrigColspan,'6');
    native[3].colSpan=+native[3].dataset.jeOrigColspan;
    M.fitMonthlyTotalsTail(native,anchor);
    assert.equal(row.reduce((n,c)=>n+c.colSpan,0),expected);
    assert.deepEqual(native.slice(0,3).map(c=>c.textContent),['Totais:','160:00','165:00']);
  });
}

test('totais sem reserva nativa recebem apenas as duas posições finais',()=>{
  const native=[cell(8,'Totais:'),cell(),cell()];
  const added=Array.from({length:7},()=>cell());
  const row=[...native,...added];
  const anchor=added.at(-1);
  anchor.parentNode={insertBefore(c){row.push(c);}};
  M.fitMonthlyTotalsTail(native,anchor);
  assert.equal(row.reduce((n,c)=>n+c.colSpan,0),19);
});

const headers=[...Array.from({length:8},(_,i)=>'h0'+(i+1)), 'h09','h10','h12','je-col-daily-exceed','je-col-accumulated-balance','h13','h14','h15','je-col-lost-hours','h16','h17'].map(className=>({className,colSpan:1}));
const dest={excessMin:180,compensatedMin:30,weekendCompensatedMin:40,weekendCoverageMin:60,homologMin:120,creditMin:180,debitMin:0,unexplainedMin:0,debitDifferenceMin:0};

test('destinos seguem a grade real e não duplicam os totais de pecúnia e perda',()=>{
  const layout=M.monthlyDestinationLayout(headers,dest);
  assert.equal(layout.reduce((n,c)=>n+c.span,0),19);
  const slot=(name)=>layout.find(c=>c.column===name);
  assert.equal(slot('h09').items[0].min,180);
  assert.equal(slot('h10').items[0].min,30);
  assert.equal(slot('je-col-daily-exceed').items[0].min,120);
  assert.match(slot('je-col-daily-exceed').items[0].title,/03:00/);
  assert.equal(slot('je-col-accumulated-balance').items[0].min,40);
  assert.match(slot('je-col-accumulated-balance').items[0].title,/01:00/);
  for(const key of ['h12','h13','je-col-lost-hours']) {
    assert.equal(slot(key).items.length,0);
    assert.ok(slot(key).reference);
  }
  assert.match(slot('h10').items[0].title,/não é a soma/);
});

test('avisos e débito ficam em Ocorrência, mantendo a largura da tabela',()=>{
  const layout=M.monthlyDestinationLayout(headers,{...dest,debitMin:30,debitDifferenceMin:-10,unexplainedMin:5,calculatedDebitMin:20});
  assert.equal(layout.reduce((n,c)=>n+c.span,0),19);
  assert.deepEqual(layout.find(c=>c.column==='h16').items.map(i=>i.min),[30,5,-10]);
});
