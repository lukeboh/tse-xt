/**
 * TSE XT - Módulo Central de Cálculo do Saldo Diário / Acumulado
 *
 * Fonte única de verdade para a variação de saldo de banco de horas de um dia
 * do Espelho de Ponto. Usado tanto pela coluna "SALDO ACUM." (domModernizer)
 * quanto pelo card de KPI "Saldo Acumulado" (kpiExtractor), evitando que as
 * duas implementações divirjam.
 *
 * REGRA CENTRAL (a coluna física `td.h10` muda de significado):
 *   - Mês ABERTO  -> h10 = "HORAS EXCED."  = saldo líquido do dia já calculado pelo TSE.
 *   - Mês FECHADO -> h10 = "HORAS AJUST."  = horas homologadas/reconhecidas (≈ jornada
 *                    cheia em dia normal). NÃO representa excedente e não pode ser
 *                    usada como tal. Nesse caso o saldo real vem de TOTAL (h09).
 */

window.JEPessoasBalance = (function () {
  'use strict';

  // Fatores de multiplicador do saldo por tipo de dia sem jornada ordinária
  const SUNDAY_HOLIDAY_FACTOR = 2.0; // +100% (domingo, feriado, recesso, facultativo)
  const SATURDAY_FACTOR = 1.5;       // +50%  (sábado)

  /**
   * Calcula a variação de saldo (em minutos) de um único dia.
   *
   * @param {Object}  o
   * @param {number}  o.dayOfWeek          0=Dom ... 6=Sáb
   * @param {boolean} o.isClosedMonth      mês homologado (coluna nativa "HORAS AJUST.")
   * @param {boolean} o.isHolidayOrRecess  feriado / recesso / ponto facultativo
   * @param {boolean} o.isDispensed        dispensa da jornada (licença, férias, viagem, abono integral)
   * @param {number}  o.totalMin           coluna TOTAL (h09), em minutos
   * @param {number}  o.exceedMin          coluna nativa h10, em minutos
   *                                       (aberto = HORAS EXCED. líquida; fechado = HORAS AJUST.)
   * @param {number}  o.pecuniaMin         coluna PECÚNIA, em minutos
   * @param {number}  o.dayTargetMinutes   jornada esperada do dia (ex.: 420 = 7h, 480 = 8h, 300 = 5h)
   * @param {boolean} o.projectFromTotal   dia corrente de mês aberto: projeta o saldo
   *                                        a partir do TOTAL quando a coluna nativa (noturna)
   *                                        ainda não foi processada
   * @returns {{delta:number, multiplierPct:(0|50|100), bucket:('weekday'|'sunday'), projected?:boolean}}
   */
  function computeDailyDelta(o) {
    o = o || {};
    const totalMin = o.totalMin || 0;
    const exceedMin = o.exceedMin || 0;
    const pecuniaMin = o.pecuniaMin || 0;
    const target = o.dayTargetMinutes || 0;
    const isClosedMonth = !!o.isClosedMonth;

    // 1. Domingo, feriado, recesso e facultativo: +100% sobre o excedente líquido trabalhado.
    if (o.dayOfWeek === 0 || o.isHolidayOrRecess) {
      const raw = totalMin > 0 ? totalMin : exceedMin;
      const net = Math.max(0, raw - pecuniaMin);
      return {
        delta: Math.round(net * SUNDAY_HOLIDAY_FACTOR),
        multiplierPct: net > 0 ? 100 : 0,
        bucket: 'sunday'
      };
    }

    // 2. Sábado: +50% sobre o excedente líquido trabalhado.
    if (o.dayOfWeek === 6) {
      // Em mês fechado a h10 é "HORAS AJUST." e não serve de excedente -> usa o TOTAL.
      const raw = isClosedMonth ? totalMin : (exceedMin > 0 ? exceedMin : totalMin);
      const net = Math.max(0, raw - pecuniaMin);
      return {
        delta: Math.round(net * SATURDAY_FACTOR),
        multiplierPct: net > 0 ? 50 : 0,
        bucket: 'weekday'
      };
    }

    // 3. Dia útil dispensado da jornada em mês fechado (licença/férias/viagem/abono integral):
    //    não credita nem debita. (Em mês aberto mantém-se a regra antiga para não alterar
    //    comportamento já validado.)
    if (o.isDispensed && isClosedMonth) {
      return { delta: 0, multiplierPct: 0, bucket: 'weekday' };
    }

    // 4. Dia útil normal.
    if (isClosedMonth) {
      // h10 = "HORAS AJUST." ≈ jornada reconhecida. Saldo real do dia = TOTAL - jornada esperada.
      return { delta: totalMin - target, multiplierPct: 0, bucket: 'weekday' };
    }

    // Mês aberto: h10 = "HORAS EXCED." já é o saldo líquido do dia.
    // Exceção — dia corrente: a coluna nativa só é processada à noite. Se pedido
    // (projectFromTotal) e ela ainda está zerada, o TSE XT projeta o saldo do dia
    // a partir do TOTAL, como num mês fechado, e marca o resultado como projetado.
    if (o.projectFromTotal && exceedMin === 0 && totalMin > 0) {
      return { delta: totalMin - target, multiplierPct: 0, bucket: 'weekday', projected: true };
    }

    return { delta: exceedMin - pecuniaMin, multiplierPct: 0, bucket: 'weekday' };
  }

  return { computeDailyDelta, SUNDAY_HOLIDAY_FACTOR, SATURDAY_FACTOR };
})();
