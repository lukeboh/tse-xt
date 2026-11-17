/**
 * TSE XT - Motor de Cálculo CLT e Parser de Frequência do SPT
 *
 * Regras aplicadas para consolidação mensal e espelho diário de prestadores:
 *   - Jornada diária padrão CLT: 8h00 (480 min) por dia trabalhado.
 *   - Intervalo intrajornada (almoço — CLT art. 71): mínimo de 1h00 (60 min)
 *     para jornadas superiores a 6h00 (360 min).
 *   - Horas excedentes: tempo líquido trabalhado acima de 8h00 no dia.
 *   - Horas a menos: tempo faltante para completar 8h00 no dia trabalhado.
 *   - Compensação dentro do mês (CLT art. 59 §6º): excedentes do mês
 *     compensam horas a menos dentro do próprio mês; o saldo líquido do mês
 *     mostra o excedente líquido ou o débito remanescente.
 */

window.JEPessoasSptCltCalc = (function () {
  'use strict';

  const DAILY_TARGET_MIN = 480; // 8h00
  const MIN_LUNCH_SHIFT_MIN = 360; // > 6h00 exige intervalo mínimo de 1h
  const MIN_LUNCH_MIN = 60; // 1h00 de almoço
  const MAX_DAILY_OVERTIME_MIN = 120; // 2h00 extras/dia (CLT art. 59)

  const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function parseTimeMin(str) {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.trim();
    if (!clean || clean === '::00' || clean === '--:--') return 0;
    const m = /^(-?)(\d{1,4}):(\d{2})(?::(\d{2}))?$/.exec(clean);
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    const hours = parseInt(m[2], 10);
    const mins = parseInt(m[3], 10);
    return sign * (hours * 60 + mins);
  }

  function formatMin(min, signed = false) {
    const n = Math.round(Number(min) || 0);
    const neg = n < 0;
    const abs = Math.abs(n);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const prefix = neg ? '-' : (signed && n > 0 ? '+' : '');
    return `${prefix}${hh}:${mm}`;
  }

  function normalizeText(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isoToBr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  function brToIso(br) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '').trim());
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  function previousMonthPeriod(now = new Date()) {
    const ref = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    const firstPrev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const lastPrev = new Date(ref.getFullYear(), ref.getMonth(), 0);
    const y = firstPrev.getFullYear();
    const m = String(firstPrev.getMonth() + 1).padStart(2, '0');
    const lastDay = String(lastPrev.getDate()).padStart(2, '0');
    const fromIso = `${y}-${m}-01`;
    const toIso = `${y}-${m}-${lastDay}`;
    return {
      year: y,
      month: firstPrev.getMonth() + 1,
      ymKey: `${y}-${m}`,
      label: `${m}/${y}`,
      fromIso,
      toIso,
      fromBr: `01/${m}/${y}`,
      toBr: `${lastDay}/${m}/${y}`
    };
  }

  function splitDateRangeByMonth(fromIso, toIso) {
    const startIso = /^(\d{4})-(\d{2})-(\d{2})$/.test(fromIso) ? fromIso : brToIso(fromIso);
    const endIso = /^(\d{4})-(\d{2})-(\d{2})$/.test(toIso) ? toIso : brToIso(toIso);
    if (!startIso || !endIso) return [];

    const [sY, sM, sD] = startIso.split('-').map(Number);
    const [eY, eM, eD] = endIso.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD);
    const endDate = new Date(eY, eM - 1, eD);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
      return [];
    }

    const slices = [];
    let curY = sY;
    let curM = sM;
    while (curY < eY || (curY === eY && curM <= eM)) {
      const mm = String(curM).padStart(2, '0');
      const lastOfMonth = new Date(curY, curM, 0).getDate();
      const firstDay = (curY === sY && curM === sM) ? sD : 1;
      const lastDay = (curY === eY && curM === eM) ? Math.min(eD, lastOfMonth) : lastOfMonth;
      const dIni = String(firstDay).padStart(2, '0');
      const dFim = String(lastDay).padStart(2, '0');
      const dtInicioIso = `${curY}-${mm}-${dIni}`;
      const dtFinalIso = `${curY}-${mm}-${dFim}`;
      slices.push({
        year: curY,
        month: curM,
        ymKey: `${curY}-${mm}`,
        periodoDescricao: `${mm}/${curY}`,
        dtInicioIso,
        dtFinalIso,
        dtInicioBr: `${dIni}/${mm}/${curY}`,
        dtFinalBr: `${dFim}/${mm}/${curY}`
      });
      curM += 1;
      if (curM > 12) {
        curM = 1;
        curY += 1;
      }
    }
    return slices;
  }

  function parseUnitsFromSelect(selectEl) {
    if (!selectEl || !selectEl.options) return [];
    const stack = [];
    const units = [];
    Array.from(selectEl.options).forEach((opt) => {
      const id = String(opt.value || '').trim();
      const rawText = String(opt.textContent || opt.title || '').replace(/\s+/g, ' ').trim();
      if (!id || !rawText) return;
      const dashMatch = /^((?:-\s*)+)(.*)$/.exec(rawText);
      const level = dashMatch ? (dashMatch[1].match(/-/g) || []).length : 0;
      const cleanName = (dashMatch ? dashMatch[2] : rawText).trim();
      if (level > 0) {
        stack.length = level - 1;
        stack[level - 1] = cleanName;
      } else {
        stack.length = 0;
        stack[0] = cleanName;
      }
      const hierarchy = stack.filter(Boolean);
      const parentPath = hierarchy.length > 1 ? hierarchy.slice(0, -1).join(' › ') : '';
      const searchBlob = normalizeText(`${id} ${cleanName} ${parentPath}`);
      units.push({
        id,
        rawText,
        cleanName,
        level,
        parentPath,
        searchBlob
      });
    });
    return units;
  }

  function filterUnits(units, query) {
    if (!Array.isArray(units)) return [];
    const tokens = normalizeText(query).split(' ').filter(Boolean);
    if (!tokens.length) return units;
    return units.filter((u) => tokens.every((t) => u.searchBlob.includes(t)));
  }

  function parseWorkersFromConsultationDoc(doc) {
    if (!doc || !doc.querySelectorAll) return [];
    const seen = new Set();
    const list = [];
    const links = doc.querySelectorAll('#maintable a[data-codigo]');
    links.forEach((a) => {
      const codigo = String(a.getAttribute('data-codigo') || '').trim();
      if (!codigo || seen.has(codigo)) return;
      seen.add(codigo);
      const contrato = String(a.getAttribute('data-contrato') || '').trim();
      const matricula = String(a.getAttribute('data-matricula') || '').trim();
      const cpf = String(a.getAttribute('data-cpf') || a.textContent || '').replace(/\D/g, '');
      const numContrato = String(a.getAttribute('data-num-contrato') || '').trim();
      const nome = String(a.getAttribute('data-nome-escaped') || '').replace(/\s+/g, ' ').trim();
      list.push({
        codigo,
        matricula,
        cpf,
        contrato,
        numContrato,
        nome
      });
    });
    list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return list;
  }

  function parseDateInfo(dateBr) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dateBr || '').trim());
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo - 1, d);
    if (isNaN(dt.getTime())) return null;
    const dow = dt.getDay();
    return {
      dateBr: `${m[1]}/${m[2]}/${m[3]}`,
      dateIso: `${m[3]}-${m[2]}-${m[1]}`,
      ymKey: `${m[3]}-${m[2]}`,
      monthLabel: `${m[2]}/${m[3]}`,
      dayOfWeek: dow,
      dayLabel: WEEKDAY_SHORT[dow] || '',
      isWeekend: dow === 0 || dow === 6
    };
  }

  function analyzeDayClt(rawDay, prevRawDay = null) {
    const info = parseDateInfo(rawDay.date);
    const punches = (rawDay.punches || []).map((p) => String(p || '').trim());
    const nonEmptyPunches = punches.filter(Boolean);
    const punchCount = nonEmptyPunches.length;
    const sptTotalMin = parseTimeMin(rawDay.total);
    const justificativa = String(rawDay.justificativa || '').trim();

    // Detecta continuação pós-meia-noite (ex.: saída 23:59 no dia anterior e
    // entrada 00:00 no dia atual com Total SPT = 00:00 porque já foi somado no dia anterior).
    const prevEndedMidnight = !!(prevRawDay && Array.isArray(prevRawDay.punches) && prevRawDay.punches.some((p) => String(p || '').trim() === '23:59'));
    const isPostMidnightContinuation = punchCount >= 2 && punches[0] === '00:00' && sptTotalMin === 0 && prevEndedMidnight;

    // Soma pares válidos (E1..S1, E2..S2, E3..S3, E4..S4) e intervalos entre pares
    let rawWorkedMin = 0;
    let measuredLunchMin = 0;
    let validPairs = 0;
    let firstEntryMin = null;
    let lastExitMin = null;

    for (let i = 0; i + 1 < punches.length; i += 2) {
      const eStr = punches[i];
      const sStr = punches[i + 1];
      if (!eStr || !sStr) continue;
      const eMin = parseTimeMin(eStr);
      const sMin = parseTimeMin(sStr);
      if (sMin >= eMin) {
        if (firstEntryMin === null) firstEntryMin = eMin;
        if (lastExitMin !== null && eMin > lastExitMin) {
          measuredLunchMin += (eMin - lastExitMin);
        }
        rawWorkedMin += (sMin - eMin);
        lastExitMin = sMin;
        validPairs += 1;
      }
    }

    const totalPresenceMin = (firstEntryMin !== null && lastExitMin !== null && lastExitMin >= firstEntryMin)
      ? (lastExitMin - firstEntryMin)
      : rawWorkedMin;

    let cltWorkedMin = 0;
    let effectiveLunchMin = measuredLunchMin;
    let lunchMode = 'none'; // 'none' | 'measured' | 'auto-1h' | 'adjusted-1h'
    let lunchDeductionDiffMin = 0;
    const alerts = [];

    if (isPostMidnightContinuation) {
      cltWorkedMin = 0;
      effectiveLunchMin = 0;
      alerts.push({
        code: 'pos-meia-noite',
        label: 'Pós-00h (no dia ant.)',
        tip: 'Continuação após meia-noite já computada pelo SPT no total do dia anterior.'
      });
    } else if (validPairs > 0 || sptTotalMin > 0) {
      const baseWorked = sptTotalMin > 0 ? sptTotalMin : rawWorkedMin;
      const isCrossMidnightOrigin = sptTotalMin > totalPresenceMin && punches.includes('23:59');

      if (validPairs === 1 && measuredLunchMin === 0) {
        // Apenas 1 par de batidas (sem registro de saída/retorno de almoço)
        if (isCrossMidnightOrigin) {
          // No cruzamento de meia-noite o SPT já desconta 1h de intervalo no Total
          cltWorkedMin = sptTotalMin;
          effectiveLunchMin = MIN_LUNCH_MIN;
          lunchMode = 'auto-1h';
          alerts.push({
            code: 'almoco-auto',
            label: 'Almoço 1h auto',
            tip: 'Jornada acima de 6h sem batida de intervalo: 1h de almoço descontada (CLT art. 71).'
          });
        } else if (rawWorkedMin > MIN_LUNCH_SHIFT_MIN || baseWorked > MIN_LUNCH_SHIFT_MIN) {
          const maxAllowed = Math.max(0, rawWorkedMin - MIN_LUNCH_MIN);
          cltWorkedMin = sptTotalMin > 0 ? Math.min(sptTotalMin, maxAllowed) : maxAllowed;
          effectiveLunchMin = MIN_LUNCH_MIN;
          lunchMode = 'auto-1h';
          lunchDeductionDiffMin = Math.max(0, baseWorked - cltWorkedMin);
          alerts.push({
            code: 'almoco-auto',
            label: 'Almoço 1h auto',
            tip: 'Jornada acima de 6h sem batida de intervalo: 1h de almoço descontada (CLT art. 71).'
          });
        } else {
          cltWorkedMin = baseWorked;
        }
      } else if (validPairs >= 2) {
        // Há batida de intervalo
        if ((rawWorkedMin > MIN_LUNCH_SHIFT_MIN || totalPresenceMin > MIN_LUNCH_SHIFT_MIN) && measuredLunchMin < MIN_LUNCH_MIN) {
          const missingLunch = MIN_LUNCH_MIN - measuredLunchMin;
          const maxAllowed = Math.max(0, rawWorkedMin - missingLunch);
          cltWorkedMin = sptTotalMin > 0 ? Math.min(sptTotalMin, maxAllowed) : maxAllowed;
          effectiveLunchMin = MIN_LUNCH_MIN;
          lunchMode = 'adjusted-1h';
          lunchDeductionDiffMin = Math.max(0, baseWorked - cltWorkedMin);
          alerts.push({
            code: 'intervalo-curto',
            label: `Almoço ${formatMin(measuredLunchMin)} (< 1h)`,
            tip: `Intervalo registrado de ${formatMin(measuredLunchMin)} é inferior ao mínimo de 1h da CLT (art. 71). Ajustado para 1h de desconto.`
          });
        } else {
          cltWorkedMin = baseWorked;
          effectiveLunchMin = measuredLunchMin;
          lunchMode = measuredLunchMin > 0 ? 'measured' : 'none';
        }
      } else {
        cltWorkedMin = baseWorked;
      }
    }

    if (punchCount % 2 === 1) {
      alerts.push({
        code: 'batida-impar',
        label: 'Batida ímpar',
        tip: `Quantidade ímpar de batidas no dia (${punchCount}). Verifique possível esquecimento de marcação.`
      });
    }

    const isWorkedDay = cltWorkedMin > 0;
    const targetMin = isWorkedDay ? DAILY_TARGET_MIN : 0;
    const excedenteMin = isWorkedDay ? Math.max(0, cltWorkedMin - targetMin) : 0;
    const aMenosMin = isWorkedDay ? Math.max(0, targetMin - cltWorkedMin) : 0;
    const deltaMin = isWorkedDay ? (cltWorkedMin - targetMin) : 0;

    if (excedenteMin > MAX_DAILY_OVERTIME_MIN) {
      alerts.push({
        code: 'acima-2h-extra',
        label: `> 2h extras (${formatMin(excedenteMin)})`,
        tip: 'Excedente diário superior ao limite de 2h extras da CLT (art. 59).'
      });
    }

    if (isWorkedDay && info && info.isWeekend) {
      alerts.push({
        code: 'fim-de-semana',
        label: info.dayOfWeek === 0 ? 'Domingo' : 'Sábado',
        tip: 'Trabalho registrado em final de semana.'
      });
    }

    return {
      date: info ? info.dateBr : String(rawDay.date || ''),
      dateIso: info ? info.dateIso : '',
      ymKey: info ? info.ymKey : '',
      monthLabel: info ? info.monthLabel : '',
      dayOfWeek: info ? info.dayOfWeek : -1,
      dayLabel: info ? info.dayLabel : '',
      isWeekend: info ? info.isWeekend : false,
      punches: punches.slice(0, 6),
      punchCount,
      justificativa,
      sptTotalMin,
      rawWorkedMin,
      measuredLunchMin,
      effectiveLunchMin,
      lunchMode,
      lunchDeductionDiffMin,
      cltWorkedMin,
      isWorkedDay,
      isPostMidnightContinuation,
      targetMin,
      excedenteMin,
      aMenosMin,
      deltaMin,
      accumulatedBalanceMin: 0,
      alerts
    };
  }

  function parseWorkerSheetDoc(doc, filterRange = null) {
    if (!doc || !doc.querySelectorAll) {
      return { meta: {}, days: [] };
    }
    const meta = {
      nome: '',
      cpf: '',
      contrato: '',
      periodo: '',
      totalSptHeader: ''
    };

    const cardBody = doc.querySelector('.card .card-body');
    if (cardBody) {
      const text = cardBody.textContent.replace(/\s+/g, ' ').trim();
      const mNome = /Nome:\s*([^]+?)(?=\s+CPF:|$)/i.exec(text);
      const mCpf = /CPF:\s*([0-9.\-]+)/i.exec(text);
      const mContrato = /Contrato\s+([^\s]+(?:\s*-\s*[^]+?)?)(?=\s+Per[ií]odo:|$)/i.exec(text);
      const mPeriodo = /Per[ií]odo:\s*([0-9/]+)/i.exec(text);
      const mTotal = /Total de horas:\s*([0-9:]+)/i.exec(text);
      if (mNome) meta.nome = mNome[1].trim();
      if (mCpf) meta.cpf = mCpf[1].trim();
      if (mContrato) meta.contrato = mContrato[1].trim();
      if (mPeriodo) meta.periodo = mPeriodo[1].trim();
      if (mTotal) meta.totalSptHeader = mTotal[1].trim();
    }

    const startIso = filterRange && filterRange.dtInicioIso ? filterRange.dtInicioIso : '';
    const endIso = filterRange && filterRange.dtFinalIso ? filterRange.dtFinalIso : '';

    const rawRows = [];
    const trs = doc.querySelectorAll('#maintable tbody tr');
    trs.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (!tds || tds.length < 9) return;
      const dateText = tds[0].textContent.trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)) return;
      const punches = [
        tds[1]?.textContent.trim() || '',
        tds[2]?.textContent.trim() || '',
        tds[3]?.textContent.trim() || '',
        tds[4]?.textContent.trim() || '',
        tds[5]?.textContent.trim() || '',
        tds[6]?.textContent.trim() || ''
      ];
      const justificativa = tds[7]?.textContent.trim() || '';
      const total = tds[8]?.textContent.trim() || '';
      rawRows.push({ date: dateText, punches, justificativa, total });
    });

    const analyzed = [];
    for (let i = 0; i < rawRows.length; i += 1) {
      const prev = i > 0 ? rawRows[i - 1] : null;
      const day = analyzeDayClt(rawRows[i], prev);
      if (startIso && day.dateIso && day.dateIso < startIso) continue;
      if (endIso && day.dateIso && day.dateIso > endIso) continue;
      analyzed.push(day);
    }

    return { meta, days: analyzed };
  }

  function summarizeMonthClt(days, meta = {}) {
    const list = Array.isArray(days) ? days : [];
    let workedDays = 0;
    let weekdaysInPeriod = 0;
    let weekdaysWithoutRecord = 0;
    let sptTotalMin = 0;
    let cltWorkedMin = 0;
    let lunchAdjustmentMin = 0;
    let expectedJourneyMin = 0;
    let excedenteBrutoMin = 0;
    let aMenosBrutoMin = 0;
    let intervaloCurtoDays = 0;
    let almocoAutoDays = 0;
    let batidaImparDays = 0;
    let acima2hExtraDays = 0;
    let fdsDays = 0;
    let runningBalance = 0;

    const enrichedDays = list.map((d) => {
      if (!d.isWeekend) {
        weekdaysInPeriod += 1;
        if (!d.isWorkedDay && !d.justificativa && !d.isPostMidnightContinuation) {
          weekdaysWithoutRecord += 1;
        }
      }
      if (d.isWorkedDay) {
        workedDays += 1;
        sptTotalMin += d.sptTotalMin;
        cltWorkedMin += d.cltWorkedMin;
        lunchAdjustmentMin += d.lunchDeductionDiffMin || 0;
        expectedJourneyMin += d.targetMin;
        excedenteBrutoMin += d.excedenteMin;
        aMenosBrutoMin += d.aMenosMin;
        runningBalance += d.deltaMin;
      }
      if (d.alerts && d.alerts.length) {
        if (d.alerts.some((a) => a.code === 'intervalo-curto')) intervaloCurtoDays += 1;
        if (d.alerts.some((a) => a.code === 'almoco-auto')) almocoAutoDays += 1;
        if (d.alerts.some((a) => a.code === 'batida-impar')) batidaImparDays += 1;
        if (d.alerts.some((a) => a.code === 'acima-2h-extra')) acima2hExtraDays += 1;
        if (d.alerts.some((a) => a.code === 'fim-de-semana')) fdsDays += 1;
      }
      return Object.assign({}, d, {
        accumulatedBalanceMin: d.isWorkedDay ? runningBalance : runningBalance
      });
    });

    const compensadoNoMesMin = Math.min(excedenteBrutoMin, aMenosBrutoMin);
    const excedenteLiquidoMin = Math.max(0, excedenteBrutoMin - compensadoNoMesMin);
    const aMenosLiquidoMin = Math.max(0, aMenosBrutoMin - compensadoNoMesMin);
    const saldoMesMin = cltWorkedMin - expectedJourneyMin;

    return {
      ymKey: meta.ymKey || (enrichedDays[0] && enrichedDays[0].ymKey) || '',
      monthLabel: meta.monthLabel || (enrichedDays[0] && enrichedDays[0].monthLabel) || '',
      workedDays,
      weekdaysInPeriod,
      weekdaysWithoutRecord,
      sptTotalMin,
      cltWorkedMin,
      lunchAdjustmentMin,
      expectedJourneyMin,
      fullMonthReferenceMin: weekdaysInPeriod * DAILY_TARGET_MIN,
      excedenteBrutoMin,
      aMenosBrutoMin,
      compensadoNoMesMin,
      excedenteLiquidoMin,
      aMenosLiquidoMin,
      saldoMesMin,
      alerts: {
        intervaloCurtoDays,
        almocoAutoDays,
        batidaImparDays,
        acima2hExtraDays,
        fdsDays
      },
      days: enrichedDays
    };
  }

  function summarizeWorkerMonths(months) {
    const list = Array.isArray(months) ? months : [];
    const acc = {
      monthsCount: list.length,
      workedDays: 0,
      weekdaysInPeriod: 0,
      weekdaysWithoutRecord: 0,
      sptTotalMin: 0,
      cltWorkedMin: 0,
      lunchAdjustmentMin: 0,
      expectedJourneyMin: 0,
      excedenteBrutoMin: 0,
      aMenosBrutoMin: 0,
      compensadoNoMesMin: 0,
      excedenteLiquidoMin: 0,
      aMenosLiquidoMin: 0,
      saldoMesMin: 0,
      alerts: {
        intervaloCurtoDays: 0,
        almocoAutoDays: 0,
        batidaImparDays: 0,
        acima2hExtraDays: 0,
        fdsDays: 0
      }
    };
    list.forEach((m) => {
      acc.workedDays += m.workedDays || 0;
      acc.weekdaysInPeriod += m.weekdaysInPeriod || 0;
      acc.weekdaysWithoutRecord += m.weekdaysWithoutRecord || 0;
      acc.sptTotalMin += m.sptTotalMin || 0;
      acc.cltWorkedMin += m.cltWorkedMin || 0;
      acc.lunchAdjustmentMin += m.lunchAdjustmentMin || 0;
      acc.expectedJourneyMin += m.expectedJourneyMin || 0;
      acc.excedenteBrutoMin += m.excedenteBrutoMin || 0;
      acc.aMenosBrutoMin += m.aMenosBrutoMin || 0;
      acc.compensadoNoMesMin += m.compensadoNoMesMin || 0;
      acc.excedenteLiquidoMin += m.excedenteLiquidoMin || 0;
      acc.aMenosLiquidoMin += m.aMenosLiquidoMin || 0;
      acc.saldoMesMin += m.saldoMesMin || 0;
      if (m.alerts) {
        acc.alerts.intervaloCurtoDays += m.alerts.intervaloCurtoDays || 0;
        acc.alerts.almocoAutoDays += m.alerts.almocoAutoDays || 0;
        acc.alerts.batidaImparDays += m.alerts.batidaImparDays || 0;
        acc.alerts.acima2hExtraDays += m.alerts.acima2hExtraDays || 0;
        acc.alerts.fdsDays += m.alerts.fdsDays || 0;
      }
    });
    return acc;
  }

  function summarizeUnitReport(workers) {
    const list = Array.isArray(workers) ? workers : [];
    const totals = list.map((w) => w.totals || summarizeWorkerMonths(w.months));
    const unit = summarizeWorkerMonths(totals);
    unit.workersCount = list.length;
    unit.activeWorkersCount = totals.filter((t) => t.workedDays > 0).length;
    return unit;
  }

  return {
    DAILY_TARGET_MIN,
    MIN_LUNCH_SHIFT_MIN,
    MIN_LUNCH_MIN,
    MAX_DAILY_OVERTIME_MIN,
    parseTimeMin,
    formatMin,
    normalizeText,
    isoToBr,
    brToIso,
    previousMonthPeriod,
    splitDateRangeByMonth,
    parseUnitsFromSelect,
    filterUnits,
    parseWorkersFromConsultationDoc,
    parseDateInfo,
    analyzeDayClt,
    parseWorkerSheetDoc,
    summarizeMonthClt,
    summarizeWorkerMonths,
    summarizeUnitReport
  };
})();
