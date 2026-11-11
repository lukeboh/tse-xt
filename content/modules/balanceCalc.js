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
  // KPI 4). No banco de horas o teto só corta sábado/domingo/feriado.
  // Lido de window.JEPessoasLegal com fallback pro valor literal — mesmo
  // padrão defensivo do R5, útil tanto se o módulo ainda não carregou quanto
  // nos testes (que não injetam legalConfig.js).
  function dailyPecuniaCapMin(isWeekendOrHoliday) {
    const L = (typeof window !== 'undefined') ? window.JEPessoasLegal : null;
    if (isWeekendOrHoliday) return (L && L.MAX_HE_FDS_MIN && L.MAX_HE_FDS_MIN.valor) || 600;
    return (L && L.MAX_HE_DIA_UTIL_MIN && L.MAX_HE_DIA_UTIL_MIN.valor) || 120;
  }

  /**
   * Parcela homologada do mês por tipo de dia (rodapé "Horas Excedentes
   * Homologadas"). O espelho só informa esse total mensal, então computeDailyDelta
   * vai abatendo dele, na ordem das linhas, o que cada dia pode creditar — ao fim
   * do mês o saldo fecha com o crédito real (homologadas × fator).
   *
   * @param {{uteis:number, sab:number, domfer:number}} homolog
   */
  function createHomologPool(homolog) {
    const h = homolog || {};
    return { uteis: h.uteis || 0, sab: h.sab || 0, domfer: h.domfer || 0 };
  }

  /** Lê do rodapé do espelho o pool de homologadas; null se não houver rodapé legível. */
  function homologPoolFromEspelho(doc) {
    try {
      const scan = window.JEPessoasAuthScan && window.JEPessoasAuthScan.analyzeEspelho(doc);
      return (scan && scan.footer && scan.footer.homolog) ? createHomologPool(scan.footer.homolog) : null;
    } catch (e) {
      return null;
    }
  }

  function takeHomolog(pool, key, availableMin) {
    const taken = Math.min(Math.max(0, availableMin), Math.max(0, pool[key]));
    pool[key] -= taken;
    return taken;
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
   * @param {number}  [o.noturnoPecMin]    coluna Adic. Noturno Pecúnia: hora paga, soma com a PECÚNIA
   * @param {boolean} o.projectFromTotal   dia corrente de mês aberto: projeta o saldo
   *                                        a partir do TOTAL quando a coluna nativa (noturna)
   *                                        ainda não foi processada
   * @param {Object}  [o.homologPool]      createHomologPool() do mês fechado, compartilhado entre
   *                                        os dias e abatido aqui. Sem ele o mês fechado usa o
   *                                        excedente bruto (rodapé indisponível).
   * @returns {{delta:number, multiplierPct:(0|50|100), bucket:('weekday'|'sunday'), projected?:boolean, netExcedenteMin:number, lostHoursMin:number, isPecuniaOnly:boolean}}
   *   netExcedenteMin — quanto do excedente do dia AINDA poderia virar pecúnia se
   *   houvesse autorização suficiente (já capado no teto legal de horas pagáveis
   *   por jornada: 2h em dia útil, 10h em sábado/domingo/feriado). Fica 0 em mês
   *   fechado/projeção de dia útil, onde a coluna PECÚNIA nativa não é comparável.
   *   lostHoursMin — tempo descartado acima do teto de 10h em sábado/domingo/
   *   feriado. O excedente de dia útil acima de 2h não é descarte: continua na
   *   reconciliação do mês (regras-calculo-frequencia.md §3.11).
   *   controlDeltaMin — só em mês fechado: variação do dia na coluna de controle
   *   SALDO ACUM. Dia útil entra com o saldo real (positivo ou negativo), líquido
   *   do que foi pago; sábado, domingo e feriado só com o crédito homologado.
   */
  function computeDailyDelta(o) {
    o = o || {};
    const totalMin = o.totalMin || 0;
    const exceedMin = o.exceedMin || 0;
    const pecuniaMin = o.pecuniaMin || 0;
    const paidMin = pecuniaMin + (o.noturnoPecMin || 0);
    const target = o.dayTargetMinutes || 0;
    const isClosedMonth = !!o.isClosedMonth;
    const pool = isClosedMonth ? o.homologPool : null;

    // 1 e 2. Domingo/feriado/recesso/facultativo (+100%) e sábado (+50%), sobre o
    // excedente elegível: o que passa do teto de 10h é descartado.
    const isSundayOrHoliday = o.dayOfWeek === 0 || !!o.isHolidayOrRecess;
    if (isSundayOrHoliday || o.dayOfWeek === 6) {
      let raw;
      if (isSundayOrHoliday) {
        raw = totalMin > 0 ? totalMin : exceedMin;
      } else {
        // Em mês fechado a h10 é "HORAS AJUST." e não serve de excedente -> usa o TOTAL.
        raw = isClosedMonth ? totalMin : (exceedMin > 0 ? exceedMin : totalMin);
      }
      const capMin = dailyPecuniaCapMin(true);
      const eligible = Math.min(raw, capMin);
      const net = Math.max(0, eligible - paidMin);
      const credited = pool ? takeHomolog(pool, isSundayOrHoliday ? 'domfer' : 'sab', net) : net;
      const delta = Math.round(credited * (isSundayOrHoliday ? SUNDAY_HOLIDAY_FACTOR : SATURDAY_FACTOR));

      return {
        delta,
        controlDeltaMin: delta,
        multiplierPct: delta > 0 ? (isSundayOrHoliday ? 100 : 50) : 0,
        bucket: isSundayOrHoliday ? 'sunday' : 'weekday',
        netExcedenteMin: net,
        lostHoursMin: Math.max(0, raw - capMin),
        isPecuniaOnly: eligible > 0 && net === 0
      };
    }

    // 3. Dia útil dispensado da jornada em mês fechado (licença/férias/viagem/abono integral):
    //    não credita nem debita. (Em mês aberto mantém-se a regra antiga para não alterar
    //    comportamento já validado.)
    if (o.isDispensed && isClosedMonth) {
      return { delta: 0, controlDeltaMin: 0, multiplierPct: 0, bucket: 'weekday', netExcedenteMin: 0, lostHoursMin: 0, isPecuniaOnly: false };
    }

    // 4. Dia útil normal.
    if (isClosedMonth) {
      // h10 = "HORAS AJUST." ≈ jornada reconhecida. Saldo real do dia = TOTAL - jornada esperada.
      // Com o rodapé disponível só a parcela homologada credita, e dias curtos não
      // debitam: o sistema já os completou (regras §3.11).
      const gross = totalMin - target;
      const delta = pool ? takeHomolog(pool, 'uteis', gross - pecuniaMin) : gross;
      return { delta, controlDeltaMin: gross - paidMin, multiplierPct: 0, bucket: 'weekday', netExcedenteMin: 0, lostHoursMin: 0, isPecuniaOnly: false };
    }

    // Mês aberto: h10 = "HORAS EXCED." já é o saldo líquido do dia.
    // Exceção — dia corrente: a coluna nativa só é processada à noite. Se pedido
    // (projectFromTotal) e ela ainda está zerada, o TSE XT projeta o saldo do dia
    // a partir do TOTAL, como num mês fechado, e marca o resultado como projetado.
    if (o.projectFromTotal && exceedMin === 0 && totalMin > 0) {
      return { delta: totalMin - target, multiplierPct: 0, bucket: 'weekday', projected: true, netExcedenteMin: 0, lostHoursMin: 0, isPecuniaOnly: false };
    }

    // Teto de 2h/jornada em dia útil — limita só o que poderia virar pecúnia.
    const pecuniaEligibleMin = Math.min(exceedMin, dailyPecuniaCapMin(false));
    const net = Math.max(0, pecuniaEligibleMin - pecuniaMin);
    return {
      delta: exceedMin - pecuniaMin,
      multiplierPct: 0,
      bucket: 'weekday',
      netExcedenteMin: net,
      lostHoursMin: 0,
      isPecuniaOnly: pecuniaEligibleMin > 0 && net === 0
    };
  }

  return { computeDailyDelta, createHomologPool, homologPoolFromEspelho, SUNDAY_HOLIDAY_FACTOR, SATURDAY_FACTOR };
})();
