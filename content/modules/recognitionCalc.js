/**
 * TSE XT - Cálculo do Relatório de Reconhecimento Posterior
 *
 * Resume, por mês do Espelho de Ponto, quantas horas o servidor fez além da
 * jornada, quantas foram pagas em pecúnia, quantas viraram banco, quantas
 * compensaram dia curto do mesmo mês e quantas ficaram sem destino. Estas
 * últimas são as horas "a reconhecer": o relatório serve de anexo ao pedido de
 * (a) pagamento em pecúnia ou (b) registro em banco de horas.
 *
 * Recebe o resultado de JEPessoasAuthScan.analyzeEspelho() e reaproveita
 * JEPessoasLostCalc (regras-calculo-frequencia.md §3.11 a §3.13). Só mês
 * fechado e fora do regime híbrido entra nos totais; mês aberto é estimativa
 * parcial e mês híbrido é informativo.
 */

window.JEPessoasRecognition = (function () {
  'use strict';

  const STATUS = { FECHADO: 'fechado', HIBRIDO: 'hibrido', ABERTO: 'aberto' };
  const KINDS = ['uteis', 'sab', 'domfer'];

  const zero = () => ({ uteis: 0, sab: 0, domfer: 0, total: 0 });

  function legal(name, fallback) {
    const L = (typeof window !== 'undefined') ? window.JEPessoasLegal : null;
    return (L && L[name] && L[name].valor) || fallback;
  }

  function withTotal(q) {
    q.total = q.uteis + q.sab + q.domfer;
    return q;
  }

  function isWeekendOrHoliday(d) {
    return !!(d.isWeekend || d.isHoliday);
  }

  function dayKind(d) {
    if (!isWeekendOrHoliday(d)) return 'uteis';
    return (d.isSaturday && !d.isHoliday) ? 'sab' : 'domfer';
  }

  function paidMin(d) {
    return (d.pecuniaMin || 0) + (d.noturnoPecMin || 0);
  }

  // Horas feitas além da jornada no dia: tudo em sábado, domingo e feriado; o
  // que passou da jornada em dia útil. Dia dispensado (férias, licença) não conta.
  function workedBeyondMin(d) {
    if (isWeekendOrHoliday(d)) return Math.max(0, d.totalMin || 0);
    if (d.isDispensed) return 0;
    return Math.max(0, (d.totalMin || 0) - (d.targetMin || 0));
  }

  // "DD/MM/AAAA" -> AAAAMMDD
  function dateKey(text) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || '');
    return m ? (+m[3]) * 10000 + (+m[2]) * 100 + (+m[1]) : 0;
  }

  function todayKey(today) {
    const t = today || new Date();
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  }

  function creditFor(q) {
    return Math.round(q.uteis + q.sab * legal('SATURDAY_FACTOR', 1.5) + q.domfer * legal('SUNDAY_HOLIDAY_FACTOR', 2));
  }

  function sumWorked(days) {
    const worked = zero();
    days.forEach((d) => { worked[dayKind(d)] += workedBeyondMin(d); });
    return withTotal(worked);
  }

  function baseSummary(a, status) {
    return {
      found: true,
      year: a.year,
      month: a.month,
      status,
      estimate: status === STATUS.ABERTO,
      heAuthorized: !!a.heAuthorized,
      reducedJourney: !!(window.JEPessoasLegal && window.JEPessoasLegal.isReducedRecessMonth(a.year, a.month)),
      worked: zero(),
      paid: zero(),
      bank: zero(),
      compensatedMin: 0,
      weekendCompensatedMin: 0,
      weekendCoverageMin: 0,
      debitDifferenceMin: 0,
      pending: zero(),
      aboveCap: zero(),
      undistributedMin: 0,
      hybridMin: 0,
      unexplainedMin: 0,
      days: []
    };
  }

  function finish(s) {
    withTotal(s.pending);
    withTotal(s.aboveCap);
    // Opção (a): horas a pagar por faixa de acréscimo. Opção (b): crédito no banco.
    s.pay50Min = s.pending.uteis + s.pending.sab;
    s.pay100Min = s.pending.domfer;
    s.creditMin = creditFor(s.pending);
    // Simulação para instruir o pedido: nunca um lançamento automático no banco.
    s.reducedJourneyPendingMin = s.reducedJourney ? s.pending.total : 0;
    s.reducedJourneyCreditMin = s.reducedJourney ? s.creditMin : 0;
    s.extraordinaryMin = s.paid.total + s.bank.total + s.pending.total;
    s.overMonthlyMin = Math.max(0, s.extraordinaryMin - legal('MAX_HE_MES_MIN', 3600));
    s.unexplainedMin = s.worked.total - s.paid.total - s.bank.total - s.compensatedMin - s.weekendCompensatedMin - s.pending.total - s.hybridMin;
    return s;
  }

  function dayRow(d, pendingMin, items) {
    return {
      date: d.date,
      kind: dayKind(d),
      totalMin: d.totalMin || 0,
      targetMin: isWeekendOrHoliday(d) ? 0 : (d.targetMin || 0),
      workedMin: workedBeyondMin(d),
      paidMin: paidMin(d),
      pendingMin,
      hasAuth: !!d.hasAuth,
      items
    };
  }

  function summarizeClosed(a, s) {
    const calc = window.JEPessoasLostCalc;
    const CODES = calc.CODES;
    const f = a.footer;
    const loss = calc.computeMonthLoss(a);
    const dest = calc.computeMonthDestination(a, loss);

    s.worked = sumWorked(a.days);
    KINDS.forEach((k) => {
      s.paid[k] = f.pecunia[k] + f.noturnoPec[k];
      s.bank[k] = f.homolog[k];
    });
    withTotal(s.paid);
    withTotal(s.bank);
    s.compensatedMin = dest.compensatedMin;
    s.weekendCompensatedMin = dest.weekendCompensatedMin;
    s.weekendCoverageMin = dest.weekendCoverageMin;
    s.debitDifferenceMin = dest.debitDifferenceMin;

    // Dia útil: o total do mês é o que vale; a divisão entre os dias é estimada.
    s.pending.uteis = f.naoHomolog.uteis + loss.p2;
    let distributedWeekday = 0;
    a.days.forEach((d) => {
      const entry = loss.days[d.date];
      if (!entry || !(entry.lostMin > 0)) return;
      const kind = dayKind(d);
      if (kind === 'uteis') {
        distributedWeekday += entry.lostMin;
      } else {
        s.pending[kind] += entry.lostMin;
        entry.items.forEach((it) => { if (it.code === CODES.TETO_10H) s.aboveCap[kind] += it.min; });
      }
      s.days.push(dayRow(d, entry.lostMin, entry.items.map((it) => ({ code: it.code, min: it.min }))));
    });
    s.undistributedMin = Math.max(0, s.pending.uteis - distributedWeekday);
    return finish(s);
  }

  // Mês híbrido: a norma suprime o serviço extraordinário e veda o banco. As
  // horas ficam só como informação, fora de "a reconhecer".
  function summarizeHybrid(a, s) {
    const f = a.footer;
    const loss = window.JEPessoasLostCalc.computeMonthLoss(a);
    s.worked = sumWorked(a.days);
    KINDS.forEach((k) => {
      s.paid[k] = f.pecunia[k] + f.noturnoPec[k];
      s.bank[k] = f.homolog[k];
    });
    withTotal(s.paid);
    withTotal(s.bank);
    s.hybridMin = loss.discardedHybridMin;
    a.days.forEach((d) => {
      const entry = loss.days[d.date];
      if (!entry || !entry.items.length) return;
      s.days.push(dayRow(d, 0, entry.items.map((it) => ({ code: it.code, min: it.min }))));
    });
    finish(s);
    // O que o regime híbrido absorve além do descartado não é "não conciliado".
    s.unexplainedMin = 0;
    return s;
  }

  // Mês aberto: a chefia ainda pode homologar. Conta só os dias já encerrados
  // e não entra nos totais.
  function summarizeOpen(a, s, opts) {
    const cut = todayKey(opts.today);
    const cap = legal('MAX_HE_FDS_MIN', 600);
    const days = a.days.filter((d) => dateKey(d.date) < cut);
    let surplus = 0;
    let deficit = 0;

    s.worked = sumWorked(days);
    days.forEach((d) => {
      const kind = dayKind(d);
      s.paid[kind] += paidMin(d);
      if (kind === 'uteis') {
        if (d.isDispensed) return;
        const e = (d.totalMin || 0) - (d.targetMin || 0);
        if (e > 0) surplus += e; else deficit -= e;
        return;
      }
      if (!(d.totalMin > 0)) return;
      const above = Math.max(0, d.totalMin - cap);
      const rest = Math.max(0, Math.min(d.totalMin, cap) - paidMin(d));
      if (above + rest <= 0) return;
      s.pending[kind] += above + rest;
      s.aboveCap[kind] += above;
      const items = [];
      if (above > 0) items.push({ code: window.JEPessoasLostCalc.CODES.TETO_10H, min: above });
      if (rest > 0) items.push({ code: window.JEPessoasLostCalc.CODES.SEM_DESTINO, min: rest });
      s.days.push(dayRow(d, above + rest, items));
    });
    withTotal(s.paid);
    s.pending.uteis = Math.max(0, surplus - deficit - s.paid.uteis);
    s.undistributedMin = s.pending.uteis;
    s.compensatedMin = Math.max(0, Math.min(deficit, surplus - s.paid.uteis - s.pending.uteis));
    return finish(s);
  }

  /**
   * @param {object} a  resultado de JEPessoasAuthScan.analyzeEspelho()
   * @param {{today?:Date}} [opts]  today: corte do mês aberto (padrão: agora)
   */
  function summarizeMonth(a, opts) {
    if (!a || !a.found || !a.days || !a.days.length) return { found: false };
    if (!a.closed) return summarizeOpen(a, baseSummary(a, STATUS.ABERTO), opts || {});
    if (a.hybrid) return summarizeHybrid(a, baseSummary(a, STATUS.HIBRIDO));
    return summarizeClosed(a, baseSummary(a, STATUS.FECHADO));
  }

  function addQuad(acc, q) {
    KINDS.forEach((k) => { acc[k] += (q && q[k]) || 0; });
    return withTotal(acc);
  }

  function emptyTotals() {
    return {
      months: 0,
      monthsWithPending: 0,
      monthsWithDebitDifference: 0,
      reducedJourneyMonths: 0,
      reducedJourneyPendingMin: 0,
      reducedJourneyCreditMin: 0,
      worked: zero(),
      paid: zero(),
      bank: zero(),
      compensatedMin: 0,
      weekendCompensatedMin: 0,
      weekendCoverageMin: 0,
      pending: zero(),
      aboveCap: zero(),
      pay50Min: 0,
      pay100Min: 0,
      creditMin: 0,
      unexplainedMin: 0,
      overMonthlyMin: 0,
      hybridMonths: 0,
      hybridMin: 0,
      openMonths: 0,
      openPendingMin: 0
    };
  }

  function addClosed(t, s) {
    t.months += 1;
    if (s.pending.total > 0) t.monthsWithPending += 1;
    if (s.debitDifferenceMin) t.monthsWithDebitDifference += 1;
    if (s.reducedJourney) t.reducedJourneyMonths += 1;
    t.reducedJourneyPendingMin += s.reducedJourneyPendingMin || 0;
    t.reducedJourneyCreditMin += s.reducedJourneyCreditMin || 0;
    addQuad(t.worked, s.worked);
    addQuad(t.paid, s.paid);
    addQuad(t.bank, s.bank);
    addQuad(t.pending, s.pending);
    addQuad(t.aboveCap, s.aboveCap);
    t.compensatedMin += s.compensatedMin;
    t.weekendCompensatedMin += s.weekendCompensatedMin || 0;
    t.weekendCoverageMin += s.weekendCoverageMin || 0;
    t.pay50Min += s.pay50Min;
    t.pay100Min += s.pay100Min;
    t.unexplainedMin += s.unexplainedMin;
    t.overMonthlyMin += s.overMonthlyMin;
  }

  /** Totais de um servidor: só mês fechado e fora do híbrido soma. */
  function summarizeServer(months) {
    const t = emptyTotals();
    (months || []).forEach((s) => {
      if (!s || !s.found) return;
      if (s.status === STATUS.FECHADO) {
        addClosed(t, s);
      } else if (s.status === STATUS.HIBRIDO) {
        t.hybridMonths += 1;
        t.hybridMin += s.hybridMin;
      } else {
        t.openMonths += 1;
        t.openPendingMin += s.pending.total;
      }
    });
    t.creditMin = creditFor(t.pending);
    return t;
  }

  /** Totais da equipe a partir dos totais de cada servidor. */
  function summarizeTeam(serverTotals) {
    const t = emptyTotals();
    (serverTotals || []).forEach((s) => {
      if (!s) return;
      ['months', 'monthsWithPending', 'monthsWithDebitDifference', 'reducedJourneyMonths', 'reducedJourneyPendingMin', 'reducedJourneyCreditMin', 'compensatedMin', 'weekendCompensatedMin', 'weekendCoverageMin', 'pay50Min', 'pay100Min', 'unexplainedMin',
        'overMonthlyMin', 'hybridMonths', 'hybridMin', 'openMonths', 'openPendingMin'].forEach((k) => { t[k] += s[k] || 0; });
      ['worked', 'paid', 'bank', 'pending', 'aboveCap'].forEach((k) => addQuad(t[k], s[k]));
    });
    t.creditMin = creditFor(t.pending);
    return t;
  }

  /**
   * Agrupamento mês → servidor: um grupo por mês, em ordem cronológica, com os
   * meses de cada servidor e os totais do mês. Em `totals.months` fica o número
   * de servidores com o mês fechado (os que entram no total).
   * @param {Array<{name:string, matricula:string, months:Array}>} servers
   */
  function groupByMonth(servers) {
    const groups = new Map();
    (servers || []).forEach((srv, index) => {
      (srv.months || []).forEach((s) => {
        if (!s || !s.found) return;
        if (!groups.has(s.key)) groups.set(s.key, { key: s.key, label: s.label, rows: [] });
        groups.get(s.key).rows.push({ index, name: srv.name, matricula: srv.matricula, month: s });
      });
    });
    return Array.from(groups.values())
      .sort((x, y) => (x.key < y.key ? -1 : (x.key > y.key ? 1 : 0)))
      .map((g) => Object.assign(g, { totals: summarizeServer(g.rows.map((r) => r.month)) }));
  }

  /** Meses de "AAAA-MM" a "AAAA-MM", inclusive, em ordem cronológica. */
  function monthRange(from, to) {
    const p = (v) => { const m = /^(\d{4})-(\d{1,2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2] } : null; };
    let a = p(from);
    let b = p(to);
    if (!a || !b) return [];
    if (a.y * 12 + a.m > b.y * 12 + b.m) { const x = a; a = b; b = x; }
    const out = [];
    for (let i = a.y * 12 + a.m - 1; i <= b.y * 12 + b.m - 1; i++) {
      const y = Math.floor(i / 12);
      const m = (i % 12) + 1;
      out.push({ y, m, key: y + '-' + String(m).padStart(2, '0') });
    }
    return out;
  }

  return { summarizeMonth, summarizeServer, summarizeTeam, groupByMonth, monthRange, dayKind, STATUS };
})();
