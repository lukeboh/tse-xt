/**
 * TSE XT - Cálculo das horas perdidas de um mês do Espelho de Ponto
 *
 * Fonte única usada pela coluna HORAS PERDIDAS, pelos selos da coluna
 * Ocorrência e pela Auditoria de Horas Perdidas. Hora perdida é a que passou
 * da jornada e não virou pecúnia, não virou banco e não compensou dia curto
 * do mesmo mês (regras-calculo-frequencia.md §3.11 a §3.13).
 *
 * Recebe o resultado de JEPessoasAuthScan.analyzeEspelho(). O espelho só
 * informa homologadas, não homologadas e "Excedeu" pelo total mensal, então a
 * divisão entre os dias é uma estimativa; o total do mês é o que vale.
 */

window.JEPessoasLostCalc = (function () {
  'use strict';

  const CODES = {
    TETO_10H: 'teto-10h',
    NAO_HOMOLOGADA: 'nao-homologada',
    ACIMA_AUTORIZADO: 'acima-autorizado',
    SEM_DESTINO: 'sem-destino',
    SOBRA_MES: 'sobra-mes',
    HIBRIDO: 'hibrido'
  };

  // Vocabulário comum: linha "Destino do mês" do Espelho de Ponto, selos da
  // coluna Ocorrência e relatórios usam o mesmo nome e a mesma explicação.
  const TERMS = {
    excedente: { label: 'Excedente', tip: 'Tudo o que passou da jornada em dia útil, somado às horas de sábado, domingo e feriado.' },
    compensou: { label: 'Compensou dias curtos', tip: 'Excedente de dia útil usado para completar dias curtos do mesmo mês.' },
    cobriuFds: { label: 'Compensou dias curtos (FDS)', tip: 'Horas trabalhadas de sábado, domingo ou feriado, não pagas nem destinadas ao banco, usadas para compensar a falta restante dos dias úteis, inclusive acima de 10h. O valor é o tempo trabalhado; a compensação aplica ×1,5 no sábado e ×2 no domingo ou feriado.' },
    pago: { label: 'Pago', tip: 'Pecúnia e adicional noturno em pecúnia do rodapé.' },
    banco: { label: 'Banco', tip: 'Horas homologadas. Entram no banco com os fatores ×1 (dia útil), ×1,5 (sábado) e ×2 (domingo e feriado).' },
    perdido: { label: 'Perdido', tip: 'Não virou pecúnia nem banco e não compensou dia curto. Os motivos estão nos selos da coluna Ocorrência.' },
    debito: { label: 'Débito do mês', tip: 'Resíduo de Horas negativo no rodapé.' },
    debitoDivergente: { label: 'Débito a conferir', tip: 'Diferença entre a falta restante calculada após as compensações e o Resíduo de Horas negativo do portal. A jornada e os lançamentos oficiais precisam ser conferidos.' },
    naoConciliado: { label: 'Não conciliado', tip: 'Diferença entre o excedente e os destinos. Costuma vir de jornada diferente da esperada no dia; vale conferir.' }
  };

  /** Rótulo, tom e explicação de cada motivo de perda (selo da coluna Ocorrência). */
  function reasonInfo(code, hasAuth) {
    const map = {
      'teto-10h': { label: 'Acima de 10h', tone: 'perda', tip: 'Parcela acima de 10h em sábado, domingo ou feriado que sobrou após cobrir dias curtos do mês: não gerou pecúnia nem banco.' },
      'nao-homologada': { label: 'Não homologada', tone: 'perda', tip: 'Consta em "Horas Excedentes Não Homologadas" no rodapé: sem homologação da chefia não entra no banco.' },
      'acima-autorizado': { label: 'Acima do autorizado', tone: 'perda', tip: 'Consta nas linhas "Excedeu" do rodapé: passou da quantidade autorizada no SAEX e não foi paga.' },
      'sobra-mes': { label: 'Sobra do mês', tone: 'perda', tip: 'Excedente de dia útil que não compensou dia curto, não foi pago e não foi homologado. A divisão entre os dias é estimada.' },
      'hibrido': { label: 'Híbrido: descartado', tone: 'info', tip: 'Mês de trabalho híbrido: a norma suprime o serviço extraordinário e veda o banco. Não conta como perda.' },
      'sem-destino': hasAuth
        ? { label: 'Não paga: conferir', tone: 'conferir', tip: 'Dia com autorização, mas estas horas não foram pagas, nem homologadas, nem aparecem nas linhas "Excedeu". Confira o limite autorizado: se estava dentro dele, cabe pedir correção.' }
        : { label: 'Sem autorização', tone: 'perda', tip: 'Dia sem autorização de serviço extraordinário: as horas não foram pagas nem homologadas.' }
    };
    return map[code] || { label: code, tone: 'info', tip: '' };
  }

  function weekendCapMin() {
    const L = (typeof window !== 'undefined') ? window.JEPessoasLegal : null;
    return (L && L.MAX_HE_FDS_MIN && L.MAX_HE_FDS_MIN.valor) || 600;
  }

  function takeFrom(pool, key, availableMin) {
    const taken = Math.min(Math.max(0, availableMin), Math.max(0, pool[key] || 0));
    pool[key] = (pool[key] || 0) - taken;
    return taken;
  }

  function addItem(result, day, code, min, countsAsLost) {
    if (min <= 0) return;
    const entry = result.days[day.date] || (result.days[day.date] = { lostMin: 0, items: [], hasAuth: !!day.hasAuth });
    entry.items.push({ code, min });
    if (countsAsLost) entry.lostMin += min;
  }

  function isWeekendOrHoliday(d) {
    return !!(d.isWeekend || d.isHoliday);
  }

  function paidMin(d) {
    return (d.pecuniaMin || 0) + (d.noturnoPecMin || 0);
  }

  function computeWeekendLoss(a, result) {
    const f = a.footer;
    const cap = weekendCapMin();
    const homolog = { sab: f.homolog.sab, domfer: f.homolog.domfer };
    const naoHomolog = { sab: f.naoHomolog.sab, domfer: f.naoHomolog.domfer };
    const excedeu = { sab: f.excedeu.sab, domfer: f.excedeu.domfer };
    let deficit = weekdayDestination(a, result).remainingDeficitMin;
    let exactCoverage = 0;

    a.days.forEach((d) => {
      if (!isWeekendOrHoliday(d) || !(d.totalMin > 0)) return;
      const key = (d.isSaturday && !d.isHoliday) ? 'sab' : 'domfer';
      let above = Math.max(0, d.totalMin - Math.max(cap, paidMin(d)));
      let rest = Math.max(0, Math.min(d.totalMin, cap) - paidMin(d));
      rest -= takeFrom(homolog, key, rest);

      const notHomologated = takeFrom(naoHomolog, key, rest);
      rest -= notHomologated;

      // Pagas, homologadas e explicitamente não homologadas já têm destino.
      // A parcela restante cobre primeiro o déficit útil, com fator, sem teto
      // de 10h. A distribuição por dia segue a ordem das linhas do espelho.
      const L = window.JEPessoasLegal;
      const factor = key === 'sab'
        ? ((L && L.SATURDAY_FACTOR && L.SATURDAY_FACTOR.valor) || 1.5)
        : ((L && L.SUNDAY_HOLIDAY_FACTOR && L.SUNDAY_HOLIDAY_FACTOR.valor) || 2);
      // O espelho tem precisão de minuto: consome o último minuto inteiro,
      // limitando a cobertura ao déficit. Arredonda o acumulado, não cada dia,
      // para não somar artificialmente os meios minutos de vários sábados.
      const used = Math.min(rest + above, Math.ceil(deficit / factor));
      if (used > 0) {
        const coverage = Math.min(deficit, used * factor);
        const roundedBefore = Math.round(exactCoverage);
        exactCoverage += coverage;
        result.coverageByDate[d.date] = { workedMin: used, coverageMin: Math.round(exactCoverage) - roundedBefore };
        result.weekendCompensatedMin += used;
        result.weekendCoverageMin = Math.round(exactCoverage);
        deficit -= coverage;
        const withinCap = Math.min(rest, used);
        rest -= withinCap;
        above -= used - withinCap;
      }
      addItem(result, d, CODES.TETO_10H, above, true);
      result.p3 += above;
      addItem(result, d, CODES.NAO_HOMOLOGADA, notHomologated, true);

      const overAuthorized = takeFrom(excedeu, key, rest);
      rest -= overAuthorized;
      addItem(result, d, CODES.ACIMA_AUTORIZADO, overAuthorized, true);
      addItem(result, d, CODES.SEM_DESTINO, rest, true);
      result.p5 += overAuthorized + rest;

      if (rest > 0 && d.hasAuth) result.alerts.push({ date: d.date, min: rest });
    });
  }

  function isOrdinaryWeekday(d) {
    return !isWeekendOrHoliday(d) && !d.isDispensed;
  }

  function weekdayDestination(a, loss) {
    let surplus = 0;
    let deficit = 0;
    a.days.filter(isOrdinaryWeekday).forEach((d) => {
      const delta = d.totalMin - d.targetMin;
      if (delta > 0) surplus += delta; else deficit -= delta;
    });
    const f = a.footer;
    const available = surplus - f.pecunia.uteis - f.noturnoPec.uteis - f.homolog.uteis - f.naoHomolog.uteis - loss.p2;
    const compensatedMin = Math.max(0, Math.min(deficit, available));
    return { surplus, compensatedMin, remainingDeficitMin: deficit - compensatedMin };
  }

  function computeWeekdayLoss(a, result) {
    const f = a.footer;
    const net = a.days.filter(isOrdinaryWeekday).reduce((acc, d) => acc + d.totalMin - d.targetMin, 0);
    const accounted = f.pecunia.uteis + f.noturnoPec.uteis + f.homolog.uteis + f.naoHomolog.uteis;
    result.netWeekdayMin = net;
    result.p2 = Math.max(0, net - accounted);

    // A compensação consome primeiro o excedente mais antigo do mês; o que
    // sobra fica nos últimos dias com excedente.
    const overAuthorized = Math.min(f.excedeu.uteis, result.p2);
    const queue = [
      [CODES.NAO_HOMOLOGADA, f.naoHomolog.uteis],
      [CODES.ACIMA_AUTORIZADO, overAuthorized],
      [CODES.SOBRA_MES, result.p2 - overAuthorized]
    ];
    a.days.filter(isOrdinaryWeekday).reverse().forEach((d) => {
      let capacity = Math.max(0, d.totalMin - d.targetMin - paidMin(d));
      queue.forEach((slot) => {
        const taken = Math.min(capacity, slot[1]);
        slot[1] -= taken;
        capacity -= taken;
        addItem(result, d, slot[0], taken, true);
      });
    });
  }

  // Mês híbrido: a norma suprime o serviço extraordinário e veda o banco. O
  // descartado é informativo e não conta como perda (regras §3.7).
  function computeHybridInfo(a, result) {
    const f = a.footer;
    const net = a.days.filter(isOrdinaryWeekday).reduce((acc, d) => acc + d.totalMin - d.targetMin, 0);
    const accounted = f.pecunia.uteis + f.noturnoPec.uteis + f.homolog.uteis + f.naoHomolog.uteis;
    result.netWeekdayMin = net;
    result.discardedHybridMin = Math.max(0, net - accounted);
    a.days.forEach((d) => {
      if (!isWeekendOrHoliday(d) || !(d.totalMin > 0) || paidMin(d) > 0) return;
      result.discardedHybridMin += d.totalMin;
      addItem(result, d, CODES.HIBRIDO, d.totalMin, false);
    });
  }

  /**
   * @returns {{days:Object<string,{lostMin:number,items:Array<{code:string,min:number}>,hasAuth:boolean}>,
   *   p1:number, p2:number, p3:number, p5:number, netWeekdayMin:number,
   *   discardedHybridMin:number, alerts:Array<{date:string,min:number}>,
   *   coverageByDate:Object<string,{workedMin:number,coverageMin:number}>,
   *   weekendCompensatedMin:number, weekendCoverageMin:number}}
   */
  function computeMonthLoss(a) {
    const result = { days: {}, p1: 0, p2: 0, p3: 0, p5: 0, netWeekdayMin: 0, discardedHybridMin: 0, alerts: [],
      coverageByDate: {}, weekendCompensatedMin: 0, weekendCoverageMin: 0 };
    if (!a || !a.found || !a.closed) return result;
    if (a.hybrid) {
      computeHybridInfo(a, result);
      return result;
    }
    result.p1 = a.footer.naoHomolog.total;
    computeWeekdayLoss(a, result);
    computeWeekendLoss(a, result);
    return result;
  }

  /**
   * Para onde foi o excedente de um mês fechado: linha "Destino do mês" do
   * Espelho de Ponto. unexplainedMin expõe o que a conta não fechou.
   */
  function computeMonthDestination(a, loss) {
    const f = a.footer;
    const { surplus, compensatedMin, remainingDeficitMin } = weekdayDestination(a, loss);
    let weekendWorked = 0;
    a.days.forEach((d) => {
      if (isWeekendOrHoliday(d)) {
        if (d.totalMin > 0) weekendWorked += d.totalMin;
      }
    });
    const paid = f.pecunia.total + f.noturnoPec.total;
    const lost = loss.p1 + loss.p2 + loss.p3 + loss.p5;
    const excess = surplus + weekendWorked;
    const calculatedDebitMin = Math.max(0, remainingDeficitMin - loss.weekendCoverageMin);
    const debitMin = Math.max(0, -f.residuoMin);
    return {
      excessMin: excess,
      compensatedMin,
      weekendCompensatedMin: loss.weekendCompensatedMin,
      weekendCoverageMin: loss.weekendCoverageMin,
      paidMin: paid,
      homologMin: f.homolog.total,
      creditMin: Math.round(f.homolog.uteis + f.homolog.sab * 1.5 + f.homolog.domfer * 2),
      lostMin: lost,
      debitMin,
      calculatedDebitMin,
      debitDifferenceMin: calculatedDebitMin - debitMin,
      unexplainedMin: excess - compensatedMin - loss.weekendCompensatedMin - paid - f.homolog.total - lost
    };
  }

  return { computeMonthLoss, computeMonthDestination, CODES, TERMS, reasonInfo };
})();
