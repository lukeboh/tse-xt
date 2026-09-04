import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStack } from './helpers.mjs';

const { JEPessoasKPI: K } = loadStack();
const plan = (o) => K.deriveMonthPlan(o);

test('balanceStatus — credor / devedor / zero', () => {
  assert.equal(plan({ monthBalanceMin: 90 }).balanceStatus, 'credor');
  assert.equal(plan({ monthBalanceMin: -90 }).balanceStatus, 'devedor');
  assert.equal(plan({ monthBalanceMin: 0 }).balanceStatus, 'zero');
});

test('mês credor — homologável vai para o banco; nada de consumo', () => {
  const r = plan({ monthBalanceMin: 300, regime: 'normal', homologPreviewMinutes: 210, bancoBalanceMin: 600 });
  assert.equal(r.bancoWillAddMin, 210);
  assert.equal(r.bancoWillConsumeMin, 0);
  assert.equal(r.bancoOverdraftMin, 0);
});

test('mês devedor (Normal) — consome do banco; estoura vira débito', () => {
  const r = plan({ monthBalanceMin: -180, regime: 'normal', bancoBalanceMin: 120 });
  assert.equal(r.bancoWillConsumeMin, 120, 'consome até o saldo');
  assert.equal(r.bancoOverdraftMin, 60, '180 - 120');
  assert.equal(r.bancoWillAddMin, 0);

  const r2 = plan({ monthBalanceMin: -60, regime: 'normal', bancoBalanceMin: 600 });
  assert.equal(r2.bancoWillConsumeMin, 60);
  assert.equal(r2.bancoOverdraftMin, 0);
});

test('mês devedor em regime híbrido / HE autorizado / recesso — NÃO consome banco', () => {
  for (const regime of ['hibrido', 'he', 'recesso']) {
    const r = plan({ monthBalanceMin: -180, regime, bancoBalanceMin: 600 });
    assert.equal(r.bancoWillConsumeMin, 0, regime);
    assert.equal(r.bancoOverdraftMin, 0, regime);
  }
});

test('mês híbrido credor — não credita banco (regime suprime)', () => {
  const r = plan({ monthBalanceMin: 300, regime: 'hibrido', homologPreviewMinutes: 210 });
  assert.equal(r.bancoWillAddMin, 0);
});

test('pecúnia — aberto por bloco e resta ao teto de 60h/mês', () => {
  const r = plan({
    monthBalanceMin: 0,
    pecuniaWeekdaySatMinutes: 12 * 60 + 15,   // 12:15 feito
    pecuniaSundayHolidayMinutes: 6 * 60,       // 06:00 feito
    authWeekdaySatMin: 20 * 60,                // 20:00 autorizado
    authSundayHolidayMin: 10 * 60              // 10:00 autorizado
  });
  assert.equal(r.pecuniaOpenWeekdaySatMin, 7 * 60 + 45, 'aberto semana/sáb = 07:45');
  assert.equal(r.pecuniaOpenSundayHolidayMin, 4 * 60, 'aberto dom/fer = 04:00');
  assert.equal(r.pecuniaTotalDoneMin, 18 * 60 + 15);
  assert.equal(r.pecuniaLegalMonthlyRemainingMin, 3600 - (18 * 60 + 15), 'resta ao teto de 60h');
});

test('pecúnia sem autorizado (F1) — aberto = 0, mas resta ao teto legal', () => {
  const r = plan({ monthBalanceMin: 0, pecuniaWeekdaySatMinutes: 120, pecuniaSundayHolidayMinutes: 0 });
  assert.equal(r.pecuniaOpenWeekdaySatMin, 0);
  assert.equal(r.pecuniaOpenSundayHolidayMin, 0);
  assert.equal(r.pecuniaLegalMonthlyRemainingMin, 3600 - 120);
});

test('feito acima do autorizado não gera aberto negativo', () => {
  const r = plan({ monthBalanceMin: 0, pecuniaWeekdaySatMinutes: 2000, authWeekdaySatMin: 1200 });
  assert.equal(r.pecuniaOpenWeekdaySatMin, 0);
});
