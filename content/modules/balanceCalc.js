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

  // Teto legal de horas extras PAGÁVEIS EM PECÚNIA por jornada (Res.
  // 22.901/2008 / Portaria 380/2026, art. 4º — mesma fonte já usada no selo
  // "> 2h"/"> 10h" da tabela, ver domModernizer.js). O que excede o teto do
  // dia nunca vira pecúnia, mesmo com autorização — por isso limita
  // netExcedenteMin (o "poderia virar pecúnia se houvesse autorização" do
  // KPI 4), não o delta do banco de horas em si (esse já é outra conta).
  // Lido de window.JEPessoasLegal com fallback pro valor literal — mesmo
  // padrão defensivo do R5, útil tanto se o módulo ainda não carregou quanto
  // nos testes (que não injetam legalConfig.js).
  function dailyPecuniaCapMin(isWeekendOrHoliday) {
    const L = (typeof window !== 'undefined') ? window.JEPessoasLegal : null;
    if (isWeekendOrHoliday) return (L && L.MAX_HE_FDS_MIN && L.MAX_HE_FDS_MIN.valor) || 600;
    return (L && L.MAX_HE_DIA_UTIL_MIN && L.MAX_HE_DIA_UTIL_MIN.valor) || 120;
  }

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
   * @returns {{delta:number, multiplierPct:(0|50|100), bucket:('weekday'|'sunday'), projected?:boolean, netExcedenteMin:number}}
   *   netExcedenteMin — quanto do excedente do dia AINDA poderia virar pecúnia se
   *   houvesse autorização suficiente (o que já não virou pecúnia, capado no teto
   *   legal de horas pagáveis por jornada — 2h em dia útil, 10h em sábado/domingo/
   *   feriado, Res. 22.901/2008 art. 4º: o que passa do teto nunca é pecúnia,
   *   autorizado ou não). NÃO é a mesma base do delta do banco de horas acima (que
   *   não aplica esse teto) — os dois só coincidem quando o excedente bruto do dia
   *   já está dentro do teto. Só populado nos ramos onde essa distinção faz sentido
   *   (mês aberto, dia não dispensado); fica 0 em mês fechado/projeção, onde a
   *   coluna PECÚNIA nativa não é comparável ao excedente do jeito que este cálculo
   *   espera.
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
      // netExcedenteMin é sobre o que AINDA poderia virar pecúnia — capado no
      // teto de 10h/jornada (o que passa do teto nunca é pecúnia, autorizado
      // ou não). Ex.: feriado com 11:24 trabalhadas e 00:00 de pecúnia: só
      // 10:00 (o teto) entram no "poderia virar pecúnia", não as 11:24 cheias.
      const pecuniaEligibleMin = Math.min(raw, dailyPecuniaCapMin(true));
      const netForPecunia = Math.max(0, pecuniaEligibleMin - pecuniaMin);
      return {
        delta: Math.round(net * SUNDAY_HOLIDAY_FACTOR),
        multiplierPct: net > 0 ? 100 : 0,
        bucket: 'sunday',
        netExcedenteMin: netForPecunia
      };
    }

    // 2. Sábado: +50% sobre o excedente líquido trabalhado.
    if (o.dayOfWeek === 6) {
      // Em mês fechado a h10 é "HORAS AJUST." e não serve de excedente -> usa o TOTAL.
      const raw = isClosedMonth ? totalMin : (exceedMin > 0 ? exceedMin : totalMin);
      const net = Math.max(0, raw - pecuniaMin);
      const pecuniaEligibleMin = Math.min(raw, dailyPecuniaCapMin(true));
      const netForPecunia = Math.max(0, pecuniaEligibleMin - pecuniaMin);
      return {
        delta: Math.round(net * SATURDAY_FACTOR),
        multiplierPct: net > 0 ? 50 : 0,
        bucket: 'weekday',
        netExcedenteMin: netForPecunia
      };
    }

    // 3. Dia útil dispensado da jornada em mês fechado (licença/férias/viagem/abono integral):
    //    não credita nem debita. (Em mês aberto mantém-se a regra antiga para não alterar
    //    comportamento já validado.)
    if (o.isDispensed && isClosedMonth) {
      return { delta: 0, multiplierPct: 0, bucket: 'weekday', netExcedenteMin: 0 };
    }

    // 4. Dia útil normal.
    if (isClosedMonth) {
      // h10 = "HORAS AJUST." ≈ jornada reconhecida. Saldo real do dia = TOTAL - jornada esperada.
      return { delta: totalMin - target, multiplierPct: 0, bucket: 'weekday', netExcedenteMin: 0 };
    }

    // Mês aberto: h10 = "HORAS EXCED." já é o saldo líquido do dia.
    // Exceção — dia corrente: a coluna nativa só é processada à noite. Se pedido
    // (projectFromTotal) e ela ainda está zerada, o TSE XT projeta o saldo do dia
    // a partir do TOTAL, como num mês fechado, e marca o resultado como projetado.
    if (o.projectFromTotal && exceedMin === 0 && totalMin > 0) {
      return { delta: totalMin - target, multiplierPct: 0, bucket: 'weekday', projected: true, netExcedenteMin: 0 };
    }

    // Teto de 2h/jornada em dia útil — mesma lógica do fim de semana acima.
    const pecuniaEligibleMin = Math.min(exceedMin, dailyPecuniaCapMin(false));
    return { delta: exceedMin - pecuniaMin, multiplierPct: 0, bucket: 'weekday', netExcedenteMin: Math.max(0, pecuniaEligibleMin - pecuniaMin) };
  }

  return { computeDailyDelta, SUNDAY_HOLIDAY_FACTOR, SATURDAY_FACTOR };
})();
