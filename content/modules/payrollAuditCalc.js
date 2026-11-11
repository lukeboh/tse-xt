/**
 * TSE XT - Cálculo da Auditoria de Pagamento de Pecúnias
 *
 * Confere se as horas que o Espelho de Ponto de cada mês fechado mostra como
 * pagas em pecúnia aparecem nos contracheques seguintes. Três partes:
 *   - expectedFromEspelho(): horas de pecúnia do mês por faixa (dia útil,
 *     sábado, domingo/feriado), a partir de JEPessoasAuthScan.analyzeEspelho().
 *     O contracheque paga, em cada faixa, "Pecúnia" + "Adicional Noturno
 *     Pecúnia" do rodapé do espelho;
 *   - parseRubricTable(): leitura da tabela de rubricas do contracheque
 *     (Código | Tipo | Discriminação | Ref. | Qtd. | Parcela | Valor). Só as
 *     linhas de serviço extraordinário e de adicional noturno são devolvidas;
 *     o resto do contracheque é descartado na leitura;
 *   - reconcile(): liga cada pagamento ao mês da coluna "Ref." e à faixa, e
 *     compara com o espelho.
 *
 * Regra de ouro: "não localizado" e "a menor" só quando todos os contracheques
 * da janela foram lidos. Contracheque não lido nunca vira falha de pagamento.
 */

window.JEPessoasPayroll = (function () {
  'use strict';

  const STATUS = {
    CONFERIDO: 'conferido',
    FAIXA: 'faixa-diferente',
    A_MAIOR: 'a-maior',
    A_MENOR: 'a-menor',
    NAO_LOCALIZADO: 'nao-localizado',
    SEM_QTD: 'sem-quantidade',
    NAO_LIDO: 'nao-lido',
    AGUARDANDO: 'aguardando'
  };
  const SLIP = { LIDO: 'lido', NAO_LIDO: 'nao-lido', INDISPONIVEL: 'indisponivel' };
  const BUCKETS = ['util', 'sab', 'domfer'];

  // Contracheques, depois do mês trabalhado, em que o pagamento é procurado.
  const WINDOW_MONTHS = 3;
  // Até onde a busca se estende quando a janela não fecha a conta.
  const EXTENDED_MONTHS = 12;
  // Folga para arredondamento da quantidade de horas impressa no contracheque.
  const TOLERANCE_MIN = 3;
  // Acréscimos da Res.-TSE 22.901/2008 art. 9º, usados para comparar o valor
  // por hora entre as linhas de um mesmo mês.
  const PAY_FACTOR = { util: 1.5, sab: 1.5, domfer: 2 };
  // Hora noturna de 52min30s (Lei 8.112/1990 art. 75): cada hora de relógio
  // vale 8/7 de hora na quantidade do adicional noturno.
  const NIGHT_FACTOR = 8 / 7;
  // Linha com menos horas que isto não entra na comparação de valor por hora
  // (o arredondamento dos centavos pesa demais).
  const RATE_MIN_QTY = 30;
  const RATE_SPREAD_ALERT = 0.02;

  const MONTHS = [
    ['JAN', 'JANEIRO'], ['FEV', 'FEVEREIRO'], ['MAR', 'MARCO'], ['ABR', 'ABRIL'], ['MAI', 'MAIO'], ['JUN', 'JUNHO'],
    ['JUL', 'JULHO'], ['AGO', 'AGOSTO'], ['SET', 'SETEMBRO'], ['OUT', 'OUTUBRO'], ['NOV', 'NOVEMBRO'], ['DEZ', 'DEZEMBRO']
  ];
  const MONTH_ALT = MONTHS.map((p) => p[1] + '|' + p[0]).join('|');

  const HE_RE = /SERV\.? ?EXTRA|SERVICOS? EXTRAORDINARIOS?|HORAS?[ -]?EXTRAS?/;
  const NIGHT_RE = /ADIC\.? ?NOTURNO|ADICIONAL NOTURNO/;
  // Tributo calculado sobre a rubrica não é pagamento dela.
  const TAX_RE = /\b(IRRF|IRPF|IR|IMPOSTO|PSSS?|INSS|FUNPRESP)\b|PREVID|CONTRIB/;
  // Atualização monetária e juros de exercício anterior: valor sem horas.
  const ACCESSORY_RE = /_ATM\b|_JUROS\b|\bJUROS\b|ATUALIZACAO|CORRECAO MONET/;
  // A faixa pode vir colada a um sufixo ("DOMINGO_DEA"): \b não serve no fim.
  const UTIL_RE = /\b(UTIL|UTEIS)(?![A-Z])/;
  const SAB_RE = /\bSAB(ADOS?)?(?![A-Z])/;
  const DOMFER_RE = /\bDOM(INGOS?)?(?![A-Z])|FERIAD|RECESSO/;

  const TIME_RE = /^-?(\d{1,3}):(\d{2})$/;
  const MONEY_RE = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}$/;
  const REF_RE = /^(0?[1-9]|1[0-2])\/((?:19|20)\d{2})$/;
  const COMPETENCE_RE = new RegExp('(?:CONTRACHEQUE|COMPETENCIA|MES\\/ANO)[^0-9A-Z]{0,12}(?:DE )?(?:(0?[1-9]|1[0-2])\\/((?:19|20)\\d{2})|(' + MONTH_ALT + ')\\.?[ \\/-]*(?:DE )?((?:19|20)\\d{2}))');

  // --------------------------------------------------------------------------
  // Utilidades
  // --------------------------------------------------------------------------
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const keyOf = (y, m) => y + '-' + pad2(m);

  function ymIndex(key) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(key || '');
    return m ? (+m[1]) * 12 + (+m[2]) - 1 : NaN;
  }

  const keyOfIndex = (idx) => keyOf(Math.floor(idx / 12), (idx % 12) + 1);
  const dateIndex = (d) => d.getFullYear() * 12 + d.getMonth();
  const sum = (list, fn) => list.reduce((acc, x) => acc + (fn(x) || 0), 0);
  const signed = (l, v) => (l.debit ? -1 : 1) * (v || 0);

  function monthNumber(name) {
    const n = norm(name);
    const i = MONTHS.findIndex((p) => p[0] === n || p[1] === n);
    return i < 0 ? 0 : i + 1;
  }

  function parseMoney(token) {
    const t = String(token == null ? '' : token).trim();
    return MONEY_RE.test(t) ? Math.abs(parseFloat(t.replace(/\./g, '').replace(',', '.'))) : null;
  }

  function parseQty(token) {
    const m = TIME_RE.exec(String(token == null ? '' : token).trim());
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  function parseRef(token) {
    const m = REF_RE.exec(String(token == null ? '' : token).trim());
    return m ? keyOf(+m[2], +m[1]) : '';
  }

  // --------------------------------------------------------------------------
  // Espelho: o que deveria ter sido pago
  // --------------------------------------------------------------------------
  /**
   * @param {object} a  resultado de JEPessoasAuthScan.analyzeEspelho()
   * Mês aberto volta com closed=false e fica fora da auditoria.
   */
  function expectedFromEspelho(a) {
    if (!a || !a.found || !a.footer || !a.year || !a.month) return { found: false };
    const p = a.footer.pecunia;
    const n = a.footer.noturnoPec;
    const night = { util: n.uteis, sab: n.sab, domfer: n.domfer };
    const utilMin = p.uteis + n.uteis;
    const sabMin = p.sab + n.sab;
    const domferMin = p.domfer + n.domfer;
    return {
      found: true,
      year: a.year,
      month: a.month,
      key: keyOf(a.year, a.month),
      closed: !!a.closed,
      utilMin,
      sabMin,
      domferMin,
      h50Min: utilMin + sabMin,
      h100Min: domferMin,
      night,
      nightMin: night.util + night.sab + night.domfer,
      totalMin: utilMin + sabMin + domferMin
    };
  }

  /**
   * Contracheques a ler: os da janela de cada mês fechado com pecúnia.
   * @param {{today?:Date, windowMonths?:number, skip?:string[]}} [opts]  skip = chaves já lidas
   */
  function neededPayslipKeys(expected, opts) {
    opts = opts || {};
    const win = opts.windowMonths || WINDOW_MONTHS;
    const nowIdx = dateIndex(opts.today || new Date());
    const skip = new Set(opts.skip || []);
    const set = new Set();
    (expected || []).forEach((e) => {
      if (!e || !e.found || !e.closed || !(e.totalMin > 0)) return;
      const idx = ymIndex(e.key);
      for (let k = 1; k <= win; k++) if (idx + k <= nowIdx) set.add(idx + k);
    });
    return Array.from(set).sort((x, y) => x - y).map(keyOfIndex).filter((k) => !skip.has(k));
  }

  // --------------------------------------------------------------------------
  // Contracheque: leitura das rubricas
  // --------------------------------------------------------------------------
  function bucketOf(n) {
    if (DOMFER_RE.test(n)) return 'domfer';
    if (SAB_RE.test(n)) return 'sab';
    return UTIL_RE.test(n) ? 'util' : '';
  }

  /** Posição das colunas pelo título; null se não for a tabela de rubricas. */
  function columnsOf(header) {
    const h = (header || []).map(norm);
    const find = (re) => h.findIndex((c) => re.test(c));
    const cols = {
      tipo: find(/^TIPO/), desc: find(/^DISCRIMINA|^DESCRI|^RUBRICA/), ref: find(/^REF/),
      qty: find(/^QTD|^QUANT/), value: find(/^VALOR/)
    };
    return (cols.desc < 0 || cols.ref < 0 || cols.value < 0) ? null : cols;
  }

  /**
   * Lê uma linha da tabela. Volta null se não for rubrica de serviço
   * extraordinário nem de adicional noturno.
   *   kind: 'he' (serviço extraordinário), 'noturno-he' (adicional noturno
   *         sobre serviço extraordinário) ou 'noturno' (adicional noturno das
   *         horas normais, sem relação com a pecúnia do espelho).
   */
  function parseRubricRow(cells, cols) {
    const cell = (i) => (i < 0 || i >= cells.length ? '' : String(cells[i] == null ? '' : cells[i]).replace(/\s+/g, ' ').trim());
    const desc = cell(cols.desc);
    const n = norm(desc);
    const isNight = NIGHT_RE.test(n);
    const isHE = HE_RE.test(n);
    if ((!isNight && !isHE) || TAX_RE.test(n)) return null;
    const hoursMin = parseQty(cell(cols.qty));
    return {
      desc,
      kind: isNight ? (isHE ? 'noturno-he' : 'noturno') : 'he',
      bucket: bucketOf(n),
      refKey: parseRef(cell(cols.ref)),
      hoursMin,
      value: parseMoney(cell(cols.value)),
      debit: norm(cell(cols.tipo)) === 'D',
      accessory: hoursMin == null && ACCESSORY_RE.test(n)
    };
  }

  /**
   * @param {string[]} header  textos do cabeçalho da tabela de rubricas
   * @param {string[][]} rows  células de cada linha
   * @returns {{ok:boolean, lines:object[]}}  ok=false: tabela em formato desconhecido
   */
  function parseRubricTable(header, rows) {
    const cols = columnsOf(header);
    if (!cols) return { ok: false, lines: [] };
    return { ok: true, lines: (rows || []).map((r) => parseRubricRow(r || [], cols)).filter(Boolean) };
  }

  /** Competência do título ("Contracheque de Outubro de 2026") como "AAAA-MM". */
  function detectCompetence(text) {
    const m = COMPETENCE_RE.exec(norm(text));
    if (!m) return '';
    return m[1] ? keyOf(+m[2], +m[1]) : keyOf(+m[4], monthNumber(m[3]));
  }

  // --------------------------------------------------------------------------
  // Conciliação
  // --------------------------------------------------------------------------
  function nightStatusOf(m, pending, tol) {
    if (!(m.nightMin > 0)) return null;
    const diff = m.night.paidMin - m.night.expectedMin;
    if (Math.abs(diff) <= tol) return 'ok';
    if (diff > 0) return 'a-maior';
    if (pending) return 'pendente';
    return m.night.lines ? 'a-menor' : 'nao-localizado';
  }

  // Valor da hora-base (remuneração ÷ 200) implícito em cada linha paga.
  function rateOf(lines) {
    const bases = [];
    let value = 0;
    let weighted = 0;
    lines.forEach((l) => {
      if (l.kind !== 'he' || l.debit || l.accessory || !l.bucket || !(l.hoursMin > 0) || !(l.value > 0)) return;
      const w = (l.hoursMin / 60) * PAY_FACTOR[l.bucket];
      value += l.value;
      weighted += w;
      if (l.hoursMin >= RATE_MIN_QTY) bases.push(l.value / w);
    });
    if (!(weighted > 0)) return null;
    const spread = bases.length > 1 ? Math.max.apply(null, bases) / Math.min.apply(null, bases) - 1 : 0;
    return { base: value / weighted, flag: spread > RATE_SPREAD_ALERT, spreadPct: Math.round(spread * 1000) / 10 };
  }

  /**
   * @param {object[]} expected  saída de expectedFromEspelho(), um por mês lido
   * @param {Array<{key:string,status:string,sheets:Array<{n,name,lines}>}>} payslips
   * @param {{today?:Date, windowMonths?:number, toleranceMin?:number}} [opts]
   */
  function reconcile(expected, payslips, opts) {
    opts = opts || {};
    const win = opts.windowMonths || WINDOW_MONTHS;
    const tol = opts.toleranceMin == null ? TOLERANCE_MIN : opts.toleranceMin;
    const nowIdx = dateIndex(opts.today || new Date());
    const near = (x) => Math.abs(x) <= tol;

    const slipByIdx = new Map();
    (payslips || []).forEach((s) => { if (s && s.key) slipByIdx.set(ymIndex(s.key), s); });

    const known = new Map();
    (expected || []).forEach((e) => { if (e && e.found) known.set(e.key, e); });

    const months = Array.from(known.values())
      .filter((e) => e.closed && e.totalMin > 0)
      .map((e) => Object.assign({}, e, {
        idx: ymIndex(e.key),
        buckets: {
          util: { exp: e.utilMin, paid: 0 }, sab: { exp: e.sabMin, paid: 0 }, domfer: { exp: e.domferMin, paid: 0 }
        },
        otherPaidMin: 0, noQty: false, value: 0, payslips: [], lines: [],
        night: { expectedMin: Math.round(e.nightMin * NIGHT_FACTOR), paidMin: 0, lines: 0, commonMin: 0 }
      }))
      .sort((x, y) => x.idx - y.idx);
    const byKey = new Map(months.map((m) => [m.key, m]));

    const unallocated = [];
    const orphanMap = new Map();
    const commonNight = new Map();

    function orphan(slip, sheet, l) {
      const e = known.get(l.refKey);
      const why = !e ? 'fora-do-periodo' : (!e.closed ? 'mes-aberto' : 'sem-pecunia-no-espelho');
      const id = l.refKey + '|' + slip.key + '|' + sheet.n;
      let o = orphanMap.get(id);
      if (!o) {
        o = { refKey: l.refKey, payslipKey: slip.key, sheet: String(sheet.n), sheetName: sheet.name || '', count: 0, hoursMin: 0, value: 0, why };
        orphanMap.set(id, o);
      }
      o.count += 1;
      if (l.kind === 'he') o.hoursMin += signed(l, l.hoursMin);
      o.value += signed(l, l.value);
    }

    const read = (payslips || []).filter((s) => s && s.status === SLIP.LIDO).sort((x, y) => ymIndex(x.key) - ymIndex(y.key));
    read.forEach((slip) => (slip.sheets || []).forEach((sheet) => (sheet.lines || []).forEach((l) => {
      if (l.kind === 'noturno') {
        if (l.refKey) commonNight.set(l.refKey, (commonNight.get(l.refKey) || 0) + signed(l, l.hoursMin));
        return;
      }
      if (!l.refKey) {
        unallocated.push(Object.assign({ payslipKey: slip.key, sheet: String(sheet.n), sheetName: sheet.name || '', why: 'sem-referencia' }, l));
        return;
      }
      const m = byKey.get(l.refKey);
      if (!m) { orphan(slip, sheet, l); return; }

      if (!m.payslips.includes(slip.key)) m.payslips.push(slip.key);
      m.lines.push(Object.assign({ payslipKey: slip.key, sheet: String(sheet.n), sheetName: sheet.name || '' }, l));
      m.value += signed(l, l.value);
      if (l.kind === 'noturno-he') {
        m.night.lines += 1;
        m.night.paidMin += signed(l, l.hoursMin);
      } else if (l.accessory) {
        // só valor
      } else if (l.hoursMin == null) {
        m.noQty = true;
      } else if (l.bucket) {
        m.buckets[l.bucket].paid += signed(l, l.hoursMin);
      } else {
        m.otherPaidMin += signed(l, l.hoursMin);
      }
    })));

    months.forEach((m) => {
      let unread = false;
      let future = false;
      for (let k = 1; k <= win; k++) {
        const s = slipByIdx.get(m.idx + k);
        if (s && s.status === SLIP.LIDO) continue;
        if (m.idx + k > nowIdx || (s && s.status === SLIP.INDISPONIVEL)) future = true; else unread = true;
      }
      const pending = unread ? STATUS.NAO_LIDO : (future ? STATUS.AGUARDANDO : null);

      const b = m.buckets;
      m.paid50Min = b.util.paid + b.sab.paid;
      m.paid100Min = b.domfer.paid;
      m.paidMin = m.paid50Min + m.paid100Min + m.otherPaidMin;
      m.diffMin = m.paidMin - m.totalMin;
      const heLines = m.lines.filter((l) => l.kind === 'he');
      const splitOk = m.otherPaidMin !== 0 || (near(m.paid50Min - m.h50Min) && near(m.paid100Min - m.h100Min));

      if (!heLines.length) m.status = pending || STATUS.NAO_LOCALIZADO;
      else if (near(m.diffMin)) m.status = splitOk ? STATUS.CONFERIDO : STATUS.FAIXA;
      else if (m.diffMin > 0) m.status = STATUS.A_MAIOR;
      else if (m.noQty) m.status = STATUS.SEM_QTD;
      else m.status = pending || STATUS.A_MENOR;

      m.windowUnread = unread;
      m.night.commonMin = commonNight.get(m.key) || 0;
      m.night.status = nightStatusOf(m, pending, tol);
      m.rate = rateOf(m.lines);
      if (!m.lines.length) m.value = null;
    });

    const orphans = Array.from(orphanMap.values())
      .sort((x, y) => ymIndex(x.refKey) - ymIndex(y.refKey) || ymIndex(x.payslipKey) - ymIndex(y.payslipKey));

    const totals = {
      months: months.length,
      expectedMin: sum(months, (m) => m.totalMin),
      paidMin: sum(months, (m) => m.paidMin),
      valueTotal: sum(months, (m) => m.value),
      count: {},
      min: {},
      missingMin: 0,
      excessMin: 0,
      nightFlags: months.filter((m) => m.night.status && m.night.status !== 'ok' && m.night.status !== 'pendente').length,
      rateFlags: months.filter((m) => m.rate && m.rate.flag).length,
      orphans: orphans.length
    };
    Object.keys(STATUS).forEach((k) => { totals.count[STATUS[k]] = 0; totals.min[STATUS[k]] = 0; });
    months.forEach((m) => {
      totals.count[m.status] += 1;
      totals.min[m.status] += m.totalMin;
      if (m.status === STATUS.A_MENOR) totals.missingMin += -m.diffMin;
      if (m.status === STATUS.NAO_LOCALIZADO) totals.missingMin += m.totalMin;
      if (m.status === STATUS.A_MAIOR) totals.excessMin += m.diffMin;
    });

    return { months, orphans, unallocated, totals, windowMonths: win };
  }

  return {
    STATUS, SLIP, BUCKETS, WINDOW_MONTHS, EXTENDED_MONTHS, NIGHT_FACTOR,
    keyOf, ymIndex, keyOfIndex,
    expectedFromEspelho, neededPayslipKeys,
    parseRubricTable, detectCompetence, reconcile
  };
})();
