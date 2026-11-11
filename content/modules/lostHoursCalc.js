/**
 * TSE XT - Cálculo das horas perdidas de um mês do Espelho de Ponto
 *
 * Fonte única usada pela coluna HORAS PERDIDAS, pelos selos da coluna
 * Ocorrência e pela Auditoria de Horas Perdidas. Hora perdida é a que passou
 * da jornada e não virou pecúnia, não virou banco e não compensou dia curto
 * do mesmo mês (regras-calculo-frequencia.md §3.11 e §3.12).
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

    a.days.forEach((d) => {
      if (!isWeekendOrHoliday(d) || !(d.totalMin > 0)) return;
      const key = (d.isSaturday && !d.isHoliday) ? 'sab' : 'domfer';
      const above = Math.max(0, d.totalMin - cap);
      addItem(result, d, CODES.TETO_10H, above, true);
      result.p3 += above;

      let rest = Math.max(0, Math.min(d.totalMin, cap) - paidMin(d));
      rest -= takeFrom(homolog, key, rest);

      const notHomologated = takeFrom(naoHomolog, key, rest);
      rest -= notHomologated;
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
   *   discardedHybridMin:number, alerts:Array<{date:string,min:number}>}}
   */
  function computeMonthLoss(a) {
    const result = { days: {}, p1: 0, p2: 0, p3: 0, p5: 0, netWeekdayMin: 0, discardedHybridMin: 0, alerts: [] };
    if (!a || !a.found || !a.closed) return result;
    if (a.hybrid) {
      computeHybridInfo(a, result);
      return result;
    }
    result.p1 = a.footer.naoHomolog.total;
    computeWeekendLoss(a, result);
    computeWeekdayLoss(a, result);
    return result;
  }

  return { computeMonthLoss, CODES };
})();
