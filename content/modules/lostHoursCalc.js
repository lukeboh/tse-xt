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

  // Vocabulário comum: linha "Destino do mês" do Espelho de Ponto, selos da
  // coluna Ocorrência e relatórios usam o mesmo nome e a mesma explicação.
  const TERMS = {
    excedente: { label: 'Excedente', tip: 'Tudo o que passou da jornada em dia útil, somado às horas de sábado, domingo e feriado.' },
    compensou: { label: 'Compensou dias curtos', tip: 'Excedente de dia útil usado para completar dias curtos do mesmo mês.' },
    pago: { label: 'Pago', tip: 'Pecúnia e adicional noturno em pecúnia do rodapé.' },
    banco: { label: 'Banco', tip: 'Horas homologadas. Entram no banco com os fatores ×1 (dia útil), ×1,5 (sábado) e ×2 (domingo e feriado).' },
    perdido: { label: 'Perdido', tip: 'Não virou pecúnia nem banco e não compensou dia curto. Os motivos estão nos selos da coluna Ocorrência.' },
    debito: { label: 'Débito do mês', tip: 'Resíduo de Horas negativo no rodapé.' },
    naoConciliado: { label: 'Não conciliado', tip: 'Diferença entre o excedente e os destinos. Costuma vir de jornada diferente da esperada no dia; vale conferir.' }
  };

  /** Rótulo, tom e explicação de cada motivo de perda (selo da coluna Ocorrência). */
  function reasonInfo(code, hasAuth) {
    const map = {
      'teto-10h': { label: 'Acima de 10h', tone: 'perda', tip: 'Acima do teto de 10h em sábado, domingo ou feriado (Res. 22.901/2008 art. 4º): não gera pecúnia nem banco.' },
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

  /**
   * Para onde foi o excedente de um mês fechado: linha "Destino do mês" do
   * Espelho de Ponto. unexplainedMin expõe o que a conta não fechou.
   */
  function computeMonthDestination(a, loss) {
    const f = a.footer;
    let surplus = 0;
    let deficit = 0;
    let weekendWorked = 0;
    a.days.forEach((d) => {
      if (isWeekendOrHoliday(d)) {
        if (d.totalMin > 0) weekendWorked += d.totalMin;
      } else if (!d.isDispensed) {
        const e = d.totalMin - d.targetMin;
        if (e > 0) surplus += e; else deficit -= e;
      }
    });
    const paidWeekday = f.pecunia.uteis + f.noturnoPec.uteis;
    const lostWeekday = f.naoHomolog.uteis + loss.p2;
    const compensatedMin = Math.max(0, Math.min(deficit, surplus - paidWeekday - f.homolog.uteis - lostWeekday));
    const paid = f.pecunia.total + f.noturnoPec.total;
    const lost = loss.p1 + loss.p2 + loss.p3 + loss.p5;
    const excess = surplus + weekendWorked;
    return {
      excessMin: excess,
      compensatedMin,
      paidMin: paid,
      homologMin: f.homolog.total,
      creditMin: Math.round(f.homolog.uteis + f.homolog.sab * 1.5 + f.homolog.domfer * 2),
      lostMin: lost,
      debitMin: Math.max(0, -f.residuoMin),
      unexplainedMin: excess - compensatedMin - paid - f.homolog.total - lost
    };
  }

  return { computeMonthLoss, computeMonthDestination, CODES, TERMS, reasonInfo };
})();
