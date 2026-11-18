/**
 * TSE XT - Motor de Cálculo CLT / Digisystem e Parser de Frequência do SPT
 *
 * Modos suportados pelo relatório:
 *   1. 'xt_digi' (TSE XT / Digi — padrão):
 *      - Jornada ordinária de 8h00 (480 min) nos dias úteis trabalhados (Seg–Sex).
 *      - Sábados, Domingos e Feriados possuem jornada ordinária 00:00: 100% das horas
 *        trabalhadas contam como HE 100% (nunca gerando "Horas a Menos" / Débito BH
 *        quando o plantão de fim de semana é inferior a 8h).
 *      - Tolerância CLT (art. 58, § 1º): variações de até 10 minutos no total do dia útil
 *        (entre 07:50 e 08:10) contam como jornada normal cumprida (08:00), sem gerar
 *        HE 50% nem Débito BH.
 *      - Opção "Presumir Home Office (8h)" (DESLIGADA por padrão para fiscalização):
 *        quando desligada, dias úteis sem batida e sem justificativa são contabilizados na
 *        coluna visível "Dias úteis sem registro" (sem gerar débito automático). Quando
 *        ligada pelo gestor, todo dia útil sem batida e sem justificativa (até a data atual)
 *        recebe 08:00 de jornada ordinária presumida, com destaque visual próprio.
 *      - Alerta de DSR / > 6 dias consecutivos (CLT art. 67; OJ 410 TST):
 *        identifica trabalho em domingo sem folga compensatória ou sequências superiores
 *        a 6 dias consecutivos trabalhados (inclusive na virada entre meses consecutivos),
 *        emitindo alerta de fiscalização sem alterar nenhum total de horas.
 *      - Intervalo intrajornada (almoço — CLT art. 71): mínimo de 1h00 (60 min) para
 *        jornadas superiores a 6h00 (360 min). Em Sábados, Domingos e Feriados com apenas
 *        1 par de batidas (> 6h), o desconto automático de 1h é configurável (ligado por
 *        padrão conforme CLT art. 71 / SPT; desligado reproduz o cartão Digisystem).
 *   2. 'spt_puro' (SPT Puro — Dados Brutos):
 *      - Exibe exclusivamente as marcações e o Total bruto retornados pelo SPT,
 *        sem deduções adicionais nem cálculo de jornada/excedente/banco.
 */

window.JEPessoasSptCltCalc = (function () {
  'use strict';

  const DAILY_TARGET_MIN = 480; // 8h00 (Seg–Sex)
  const DAILY_TOLERANCE_MIN = 10; // ±10 min diários (CLT art. 58 §1º)
  const MIN_LUNCH_SHIFT_MIN = 360; // > 6h00 exige intervalo mínimo de 1h
  const MIN_LUNCH_MIN = 60; // 1h00 de almoço
  const MAX_DAILY_OVERTIME_MIN = 120; // 2h00 extras 50%/dia útil (CLT art. 59)

  const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Feriados nacionais civis (Leis 662/1949, 6.802/1980 e 14.759/2023) + feriado distrital do DF (Lei 963/1995).
  // Nota: Feriados exclusivamente forenses (11/08, 01/11 e 08/12 — Lei 5.010/1966) NÃO integram a lista
  // padrão CLT para empresas contratadas, podendo ser adicionados manualmente pelo gestor se previstos em CCT.
  const DEFAULT_FIXED_HOLIDAYS = {
    '01-01': 'Confraternização Universal',
    '04-21': 'Tiradentes',
    '05-01': 'Dia do Trabalhador',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Dia Nacional de Zumbi e da Consciência Negra',
    '11-30': 'Dia do Evangélico (DF)',
    '12-25': 'Natal'
  };

  function getLocalTodayIso(now = new Date()) {
    const ref = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(ref);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const d = parts.find((p) => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch (_) {}
    const y = ref.getFullYear();
    const m = String(ref.getMonth() + 1).padStart(2, '0');
    const d = String(ref.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Algoritmo de Meeus/Jones/Butcher para o Domingo de Páscoa e a Sexta-feira Santa (Paixão de Cristo)
  function computeEasterSunday(year) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1900 || y > 2199) return null;
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  function computeGoodFridayMmDd(year) {
    const easter = computeEasterSunday(year);
    if (!easter) return null;
    const gf = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);
    const mm = String(gf.getMonth() + 1).padStart(2, '0');
    const dd = String(gf.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }

  /**
   * Interpreta uma expressão ou objeto de customização de feriados.
   * Aceita:
   *  - string separada por vírgula/ponto-e-vírgula (ex.: "+11/08, -30/11, 20/02/2026")
   *  - objeto { add: ['11/08', '2026-02-17'], remove: ['30/11'] }
   */
  function parseCustomHolidaysConfig(customHolidays) {
    const addMmDd = new Map();
    const addIso = new Map();
    const removeMmDd = new Set();
    const removeIso = new Set();

    function processToken(rawToken, forceRemove = false) {
      let token = String(rawToken || '').trim();
      if (!token) return;
      let isRemove = forceRemove;
      if (token.startsWith('-')) {
        isRemove = true;
        token = token.slice(1).trim();
      } else if (token.startsWith('+')) {
        token = token.slice(1).trim();
      }
      let customLabel = 'Feriado configurado';
      const labelSplit = token.split(':');
      if (labelSplit.length > 1) {
        token = labelSplit[0].trim();
        customLabel = labelSplit.slice(1).join(':').trim() || customLabel;
      }

      let m = /^(\d{2})\/(\d{2})$/.exec(token);
      if (m) {
        const mmdd = `${m[2]}-${m[1]}`;
        if (isRemove) removeMmDd.add(mmdd);
        else addMmDd.set(mmdd, customLabel);
        return;
      }
      m = /^(\d{2})-(\d{2})$/.exec(token);
      if (m) {
        const mmdd = `${m[1]}-${m[2]}`;
        if (isRemove) removeMmDd.add(mmdd);
        else addMmDd.set(mmdd, customLabel);
        return;
      }
      m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(token);
      if (m) {
        const iso = `${m[3]}-${m[2]}-${m[1]}`;
        if (isRemove) removeIso.add(iso);
        else addIso.set(iso, customLabel);
        return;
      }
      m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
      if (m) {
        const iso = `${m[1]}-${m[2]}-${m[3]}`;
        if (isRemove) removeIso.add(iso);
        else addIso.set(iso, customLabel);
      }
    }

    if (typeof customHolidays === 'string') {
      customHolidays.split(/[,;\n]+/).forEach((t) => processToken(t, false));
    } else if (Array.isArray(customHolidays)) {
      customHolidays.forEach((t) => processToken(t, false));
    } else if (customHolidays && typeof customHolidays === 'object') {
      if (Array.isArray(customHolidays.add)) {
        customHolidays.add.forEach((t) => processToken(t, false));
      }
      if (Array.isArray(customHolidays.remove)) {
        customHolidays.remove.forEach((t) => processToken(t, true));
      }
      if (typeof customHolidays.text === 'string') {
        customHolidays.text.split(/[,;\n]+/).forEach((t) => processToken(t, false));
      }
    }

    return { addMmDd, addIso, removeMmDd, removeIso };
  }

  function resolveHolidayMapForYear(year, customHolidays = null) {
    const y = Number(year);
    const parsed = parseCustomHolidaysConfig(customHolidays);
    const map = new Map(); // dateIso -> name

    Object.keys(DEFAULT_FIXED_HOLIDAYS).forEach((mmdd) => {
      if (parsed.removeMmDd.has(mmdd)) return;
      const iso = `${y}-${mmdd}`;
      if (parsed.removeIso.has(iso)) return;
      map.set(iso, DEFAULT_FIXED_HOLIDAYS[mmdd]);
    });

    const gfMmDd = computeGoodFridayMmDd(y);
    if (gfMmDd && !parsed.removeMmDd.has(gfMmDd)) {
      const gfIso = `${y}-${gfMmDd}`;
      if (!parsed.removeIso.has(gfIso)) {
        map.set(gfIso, 'Sexta-feira Santa (Paixão de Cristo)');
      }
    }

    parsed.addMmDd.forEach((label, mmdd) => {
      const iso = `${y}-${mmdd}`;
      if (!parsed.removeIso.has(iso)) {
        map.set(iso, label);
      }
    });

    parsed.addIso.forEach((label, iso) => {
      if (iso.startsWith(`${y}-`) && !parsed.removeIso.has(iso)) {
        map.set(iso, label);
      }
    });

    return map;
  }

  function listAppliedHolidaysInRange(fromIso, toIso, customHolidays = null) {
    const startIso = /^(\d{4})-(\d{2})-(\d{2})$/.test(fromIso) ? fromIso : brToIso(fromIso);
    const endIso = /^(\d{4})-(\d{2})-(\d{2})$/.test(toIso) ? toIso : brToIso(toIso);
    if (!startIso || !endIso || startIso > endIso) return [];
    const sY = parseInt(startIso.slice(0, 4), 10);
    const eY = parseInt(endIso.slice(0, 4), 10);
    const list = [];
    for (let y = sY; y <= eY; y += 1) {
      const map = resolveHolidayMapForYear(y, customHolidays);
      map.forEach((name, iso) => {
        if (iso >= startIso && iso <= endIso) {
          list.push({
            dateIso: iso,
            dateBr: isoToBr(iso),
            name
          });
        }
      });
    }
    list.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    return list;
  }

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

  /**
   * Extrai a lista de períodos contratuais (window.lPeriodos) diretamente do HTML/DOM da página,
   * funcionando mesmo no mundo isolado (isolated world) do content script (MV3).
   */
  function parsePeriodosFromDoc(doc = document) {
    if (!doc) return [];
    const scripts = doc.querySelectorAll ? doc.querySelectorAll('script') : [];
    for (const s of Array.from(scripts)) {
      const text = s.textContent || '';
      if (!text.includes('lPeriodos')) continue;
      const m = /window\.lPeriodos\s*=\s*(\[\s*\[[\s\S]*?\]\s*\])\s*;/.exec(text);
      if (m && m[1]) {
        try {
          const parsed = JSON.parse(m[1]);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
    }
    // Fallback para options de <select name="cbPeriodos"> quando presentes com atributos ou texto
    const sel = doc.querySelector ? doc.querySelector('#cbPeriodos, select[name="cbPeriodos"]') : null;
    if (sel && sel.options && sel.options.length > 0) {
      const fallback = [];
      Array.from(sel.options).forEach((opt) => {
        const val = String(opt.value || '').trim();
        if (!val || val === '-1') return;
        const txt = String(opt.textContent || '').trim();
        const ymMatch = /(\d{2}\/\d{4})/.exec(txt);
        if (ymMatch) {
          const ym = ymMatch[1];
          const [mm, yyyy] = ym.split('/').map(Number);
          const lastDay = new Date(yyyy, mm, 0).getDate();
          const contratoVal = doc.querySelector?.('#cbContratos, select[name="cbContratos"]')?.value || '';
          const idx = parseInt(val, 10);
          const tuple = [
            contratoVal && contratoVal !== '-1' ? contratoVal : '',
            ym,
            `01/${ym}`,
            `${String(lastDay).padStart(2, '0')}/${ym}`,
            '0',
            txt
          ];
          if (!isNaN(idx) && idx >= 0) {
            fallback[idx] = tuple;
          } else {
            fallback.push(tuple);
          }
        }
      });
      if (fallback.length > 0) return fallback;
    }
    if (typeof window !== 'undefined' && Array.isArray(window.lPeriodos)) {
      return window.lPeriodos;
    }
    return [];
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
      const codTseAttr = String(a.getAttribute('data-cod-tse') || '').trim();
      const codTse = codTseAttr || cpf;
      const numContrato = String(a.getAttribute('data-num-contrato') || '').trim();
      const nome = String(a.getAttribute('data-nome-escaped') || '').replace(/\s+/g, ' ').trim();
      list.push({
        codigo,
        matricula,
        cpf,
        codTse,
        contrato,
        numContrato,
        nome
      });
    });
    list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return list;
  }

  function parseDateInfo(dateBr, customHolidays = null) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dateBr || '').trim());
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo - 1, d);
    if (isNaN(dt.getTime())) return null;
    const dow = dt.getDay();
    const dateIso = `${m[3]}-${m[2]}-${m[1]}`;
    const yearMap = resolveHolidayMapForYear(y, customHolidays);
    const holidayName = yearMap.get(dateIso) || '';
    const isHoliday = !!holidayName;
    return {
      dateBr: `${m[1]}/${m[2]}/${m[3]}`,
      dateIso,
      ymKey: `${m[3]}-${m[2]}`,
      monthLabel: `${m[2]}/${m[3]}`,
      dayOfWeek: dow,
      dayLabel: WEEKDAY_SHORT[dow] || '',
      isWeekend: dow === 0 || dow === 6,
      isHoliday,
      holidayName
    };
  }

  function analyzeDayClt(rawDay, prevRawDay = null, options = {}) {
    const customHolidays = options.customHolidays != null ? options.customHolidays : null;
    const deductAutoLunchOnSpecialDays = options.deductAutoLunchOnSpecialDays !== undefined
      ? !!options.deductAutoLunchOnSpecialDays
      : true;
    const toleranceMin = typeof options.toleranceMin === 'number'
      ? options.toleranceMin
      : DAILY_TOLERANCE_MIN;

    const info = parseDateInfo(rawDay.date, customHolidays);
    const punches = (rawDay.punches || []).map((p) => String(p || '').trim());
    const nonEmptyPunches = punches.filter(Boolean);
    const punchCount = nonEmptyPunches.length;
    const sptTotalStr = String(rawDay.total != null ? rawDay.total : (rawDay.sptTotalText || '')).trim();
    const sptTotalMin = typeof rawDay.sptTotalMin === 'number' && !sptTotalStr
      ? rawDay.sptTotalMin
      : parseTimeMin(sptTotalStr);
    const justificativa = String(rawDay.justificativa || '').trim();

    const isHoliday = !!(info && info.isHoliday) || /feriado/i.test(justificativa);
    const holidayName = (info && info.holidayName) || (/feriado/i.test(justificativa) ? justificativa : '');
    const isWeekend = !!(info && info.isWeekend);
    const isSpecialDay = isWeekend || isHoliday;

    // Detecta continuação pós-meia-noite (saída 23:59 no dia anterior e
    // entrada 00:00 no dia atual com Total SPT = 00:00 porque já foi somado no dia anterior).
    const prevEndedMidnight = !!(prevRawDay && Array.isArray(prevRawDay.punches) && prevRawDay.punches.some((p) => String(p || '').trim() === '23:59'));
    const isPostMidnightContinuation = punchCount >= 2 && punches[0] === '00:00' && sptTotalMin === 0 && prevEndedMidnight;

    // Soma pares válidos (E1..S1, E2..S2, E3..S3) e intervalos entre pares
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
    let lunchMode = 'none'; // 'none' | 'measured' | 'auto-1h' | 'adjusted-1h' | 'special-no-deduct'
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
        const shouldDeductAutoLunch = !isSpecialDay || deductAutoLunchOnSpecialDays;
        if (!shouldDeductAutoLunch) {
          // Quando o desconto de intervalo em Sáb/Dom/Feriado está desligado (reproduz cartão Digisystem):
          // considera o tempo bruto entre entrada e saída (ou o maior entre rawWorkedMin e sptTotalMin quando não há virada de meia-noite).
          cltWorkedMin = isCrossMidnightOrigin
            ? (sptTotalMin + MIN_LUNCH_MIN)
            : (rawWorkedMin > 0 ? rawWorkedMin : baseWorked);
          effectiveLunchMin = 0;
          lunchMode = 'special-no-deduct';
        } else if (isCrossMidnightOrigin) {
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

    let targetMin = 0;
    let normalWorkedMin = 0;
    let he50Min = 0;
    let he100Min = 0;
    let excedenteMin = 0;
    let aMenosMin = 0;
    let debitoBhMin = 0;
    let deltaBhMin = 0;
    let deltaMin = 0;
    let withinTolerance = false;

    if (isWorkedDay) {
      if (isSpecialDay) {
        targetMin = 0;
        normalWorkedMin = 0;
        he50Min = 0;
        he100Min = cltWorkedMin;
        excedenteMin = cltWorkedMin;
        aMenosMin = 0;
        debitoBhMin = 0;
        deltaBhMin = 0;
        deltaMin = cltWorkedMin;
      } else {
        targetMin = DAILY_TARGET_MIN;
        const rawDiff = cltWorkedMin - targetMin;
        withinTolerance = Math.abs(rawDiff) <= toleranceMin;
        if (withinTolerance) {
          normalWorkedMin = DAILY_TARGET_MIN;
          he50Min = 0;
          he100Min = 0;
          excedenteMin = 0;
          aMenosMin = 0;
          debitoBhMin = 0;
          deltaBhMin = 0;
          deltaMin = 0;
          if (rawDiff !== 0) {
            alerts.push({
              code: 'tolerancia-clt',
              label: `Tol. CLT (${formatMin(rawDiff, true)})`,
              tip: `Variação de ${formatMin(rawDiff, true)} dentro da tolerância legal de ±${toleranceMin} min/dia (CLT art. 58 §1º). Computado como jornada normal de 08:00.`
            });
          }
        } else if (rawDiff > 0) {
          normalWorkedMin = DAILY_TARGET_MIN;
          he50Min = Math.min(rawDiff, MAX_DAILY_OVERTIME_MIN);
          he100Min = Math.max(0, rawDiff - MAX_DAILY_OVERTIME_MIN);
          excedenteMin = rawDiff;
          aMenosMin = 0;
          debitoBhMin = 0;
          deltaBhMin = he50Min;
          deltaMin = rawDiff;
        } else {
          normalWorkedMin = cltWorkedMin;
          he50Min = 0;
          he100Min = 0;
          excedenteMin = 0;
          aMenosMin = Math.abs(rawDiff);
          debitoBhMin = Math.abs(rawDiff);
          deltaBhMin = rawDiff;
          deltaMin = rawDiff;
        }
      }
    }

    if (!isSpecialDay && excedenteMin > MAX_DAILY_OVERTIME_MIN) {
      alerts.push({
        code: 'acima-2h-extra',
        label: `> 2h extras (${formatMin(excedenteMin)})`,
        tip: 'Excedente em dia útil superior a 2h (CLT art. 59): 02:00 em HE 50% e o restante em HE 100%.'
      });
    }

    if (isWorkedDay && isSpecialDay) {
      const tipoLabel = isHoliday
        ? `Feriado: ${holidayName || 'HE 100%'}`
        : (info && info.dayOfWeek === 0 ? 'Domingo (HE 100%)' : 'Sábado (HE 100%)');
      alerts.push({
        code: 'fim-de-semana',
        label: tipoLabel,
        tip: 'Jornada ordinária 00:00: 100% das horas trabalhadas contam como Hora Extra 100%.'
      });
    }

    return {
      rawInput: {
        date: info ? info.dateBr : String(rawDay.date || ''),
        punches: punches.slice(0, 6),
        justificativa,
        total: sptTotalStr || formatMin(sptTotalMin)
      },
      date: info ? info.dateBr : String(rawDay.date || ''),
      dateIso: info ? info.dateIso : '',
      ymKey: info ? info.ymKey : '',
      monthLabel: info ? info.monthLabel : '',
      dayOfWeek: info ? info.dayOfWeek : -1,
      dayLabel: info ? info.dayLabel : '',
      isWeekend,
      isHoliday,
      holidayName,
      isSpecialDay,
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
      presencialCltWorkedMin: cltWorkedMin,
      isWorkedDay,
      isPresencialWorkedDay: isWorkedDay,
      isHomeOfficeDay: false,
      isUnregisteredWeekday: false,
      isDsrCompensated: false,
      hasDsrStreakAlert: false,
      isPostMidnightContinuation,
      withinTolerance,
      targetMin,
      presencialTargetMin: targetMin,
      normalWorkedMin,
      presencialNormalWorkedMin: normalWorkedMin,
      he50Min,
      he100Min,
      excedenteMin,
      aMenosMin,
      debitoBhMin,
      deltaBhMin,
      deltaMin,
      accumulatedBhMin: 0,
      accumulatedHe100Min: 0,
      accumulatedBalanceMin: 0,
      baseAlerts: alerts.slice(),
      alerts
    };
  }

  function parseWorkerSheetDoc(doc, filterRange = null, options = {}) {
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
      const day = analyzeDayClt(rawRows[i], prev, options);
      if (startIso && day.dateIso && day.dateIso < startIso) continue;
      if (endIso && day.dateIso && day.dateIso > endIso) continue;
      analyzed.push(day);
    }

    return { meta, days: analyzed };
  }

  /**
   * Verifica se duas datas ISO (AAAA-MM-DD) são dias imediatamente consecutivos no calendário.
   */
  function areConsecutiveIsoDates(prevIso, currIso) {
    if (!prevIso || !currIso) return false;
    const [pY, pM, pD] = prevIso.split('-').map(Number);
    const [cY, cM, cD] = currIso.split('-').map(Number);
    const dtPrev = Date.UTC(pY, pM - 1, pD);
    const dtCurr = Date.UTC(cY, cM - 1, cD);
    return (dtCurr - dtPrev) === 86400000;
  }

  /**
   * Aplica (ou remove) a presunção de Home Office (8h) e avalia alertas objetivos de DSR:
   *  - Trabalho em domingo ou sequência > 6 dias consecutivos sem folga identificada
   *    (CLT art. 67; OJ 410 TST). O alerta NÃO altera nenhum total de horas.
   *  - Aceita `initialStreak` e `prevDateIso` para considerar a virada entre meses consecutivos.
   */
  function resolveHomeOfficeAndDsr(daysList, options = {}) {
    const presumeHomeOffice = !!options.presumeHomeOffice;
    const todayIso = options.todayIso || getLocalTodayIso();
    const shouldReanalyze = options.customHolidays !== undefined || options.deductAutoLunchOnSpecialDays !== undefined || options.toleranceMin !== undefined;

    const rawSource = Array.isArray(daysList) ? daysList : [];
    const baseDays = shouldReanalyze
      ? rawSource.map((d, idx) => {
          const raw = d.rawInput || {
            date: d.date,
            punches: d.punches || [],
            justificativa: d.justificativa || '',
            total: formatMin(d.sptTotalMin || 0)
          };
          const prevRaw = idx > 0
            ? (rawSource[idx - 1].rawInput || {
                date: rawSource[idx - 1].date,
                punches: rawSource[idx - 1].punches || [],
                justificativa: rawSource[idx - 1].justificativa || '',
                total: formatMin(rawSource[idx - 1].sptTotalMin || 0)
              })
            : null;
          return analyzeDayClt(raw, prevRaw, options);
        })
      : rawSource;

    const resetList = baseDays.map((d) => {
      const isPresencial = typeof d.isPresencialWorkedDay === 'boolean' ? d.isPresencialWorkedDay : !!d.isWorkedDay;
      const presClt = typeof d.presencialCltWorkedMin === 'number' ? d.presencialCltWorkedMin : d.cltWorkedMin;
      const presTarget = typeof d.presencialTargetMin === 'number' ? d.presencialTargetMin : d.targetMin;
      const presNorm = typeof d.presencialNormalWorkedMin === 'number' ? d.presencialNormalWorkedMin : (d.normalWorkedMin || 0);
      const baseAlerts = Array.isArray(d.baseAlerts)
        ? d.baseAlerts.slice()
        : (d.alerts || []).filter((a) => !['home-office', 'reposicao-dsr', 'dsr-alerta', 'sem-registro', 'feriado'].includes(a.code));

      if (d.isHoliday && !isPresencial && !baseAlerts.some((a) => a.code === 'feriado')) {
        baseAlerts.push({
          code: 'feriado',
          label: d.holidayName ? `Feriado (${d.holidayName})` : 'Feriado',
          tip: 'Feriado civil/distrital (jornada ordinária 00:00).'
        });
      }

      return Object.assign({}, d, {
        isPresencialWorkedDay: isPresencial,
        presencialCltWorkedMin: presClt,
        presencialTargetMin: presTarget,
        presencialNormalWorkedMin: presNorm,
        isWorkedDay: isPresencial,
        isHomeOfficeDay: false,
        isUnregisteredWeekday: false,
        isDsrCompensated: false,
        hasDsrStreakAlert: false,
        cltWorkedMin: presClt,
        targetMin: presTarget,
        normalWorkedMin: presNorm,
        baseAlerts: baseAlerts.filter((a) => a.code !== 'feriado'),
        alerts: baseAlerts
      });
    });

    const isEligibleUnpunchedWeekday = (d) => (
      !d.isSpecialDay &&
      !d.isPresencialWorkedDay &&
      (d.punchCount === 0 || d.isPostMidnightContinuation) &&
      !d.justificativa &&
      (!d.dateIso || d.dateIso <= todayIso)
    );

    // 1. Aplica Home Office (8h) quando ligado, ou marca dia útil sem registro quando desligado
    const step1 = resetList.map((d) => {
      if (!isEligibleUnpunchedWeekday(d)) return d;
      const nextAlerts = d.alerts.slice();
      if (presumeHomeOffice) {
        nextAlerts.push({
          code: 'home-office',
          label: 'Home Office presumido (8h)',
          tip: 'Dia útil sem batida e sem justificativa: jornada ordinária de 08:00 presumida por opção do usuário.'
        });
        return Object.assign({}, d, {
          isWorkedDay: true,
          isHomeOfficeDay: true,
          isUnregisteredWeekday: false,
          cltWorkedMin: DAILY_TARGET_MIN,
          targetMin: DAILY_TARGET_MIN,
          normalWorkedMin: DAILY_TARGET_MIN,
          alerts: nextAlerts
        });
      }

      nextAlerts.push({
        code: 'sem-registro',
        label: 'Dia útil s/ registro',
        tip: 'Dia útil sem marcação de catraca e sem justificativa no SPT (não gera débito automático com Home Office desligado).'
      });
      return Object.assign({}, d, {
        isWorkedDay: false,
        isHomeOfficeDay: false,
        isUnregisteredWeekday: true,
        cltWorkedMin: 0,
        targetMin: 0,
        normalWorkedMin: 0,
        alerts: nextAlerts
      });
    });

    // 2. Avalia sequência de dias trabalhados consecutivos (> 6 dias) e trabalho em domingo sem folga identificada,
    //    considerando a continuidade com o mês anterior quando `initialStreak` e `prevDateIso` são fornecidos.
    let streak = typeof options.initialStreak === 'number' && options.initialStreak > 0 ? options.initialStreak : 0;
    let lastIso = options.prevDateIso || '';

    const finalDays = step1.map((d, idx) => {
      if (d.dateIso && lastIso && !areConsecutiveIsoDates(lastIso, d.dateIso)) {
        streak = 0;
      }
      if (d.dateIso) {
        lastIso = d.dateIso;
      }

      if (d.isWorkedDay) {
        streak += 1;
      } else {
        streak = 0;
      }

      const workedOnSunday = d.dayOfWeek === 0 && d.isWorkedDay;
      // Verifica se houve domingo trabalhado sem folga identificada na semana (6 dias consecutivos anteriores ou posteriores)
      let sundayWithoutFolga = false;
      if (workedOnSunday) {
        // Verifica quantos dias sem trabalho existem nos próximos 6 dias (ou nos 6 dias anteriores se no fim da lista)
        const windowIndices = [];
        for (let k = idx + 1; k <= Math.min(step1.length - 1, idx + 6); k += 1) {
          if (!step1[k].dateIso || step1[k].dateIso <= todayIso) {
            windowIndices.push(k);
          }
        }
        const hasFolgaAhead = windowIndices.some((k) => !step1[k].isWorkedDay);
        if (windowIndices.length >= 6 && !hasFolgaAhead) {
          sundayWithoutFolga = true;
        } else if (windowIndices.length < 6 && streak > 6) {
          sundayWithoutFolga = true;
        }
      }

      if (streak > 6 || workedOnSunday) {
        const nextAlerts = d.alerts.slice();
        const reason = streak > 6
          ? `${streak}º dia consecutivo trabalhado sem folga identificada`
          : (sundayWithoutFolga
            ? 'Trabalho em domingo sem folga compensatória identificada na semana'
            : 'Trabalho em domingo — verificar concessão de folga compensatória de DSR na semana');
        nextAlerts.push({
          code: 'dsr-alerta',
          label: streak > 6 ? `>6d seguidos (${streak}d)` : 'Dom. trabalhado (DSR)',
          tip: `Trabalho em domingo / >6 dias consecutivos sem folga identificada (CLT art. 67; OJ 410 TST) — ${reason}. Não altera os totais.`
        });
        return Object.assign({}, d, {
          hasDsrStreakAlert: true,
          consecutiveWorkDays: streak,
          alerts: nextAlerts
        });
      }

      return Object.assign({}, d, {
        consecutiveWorkDays: streak
      });
    });

    finalDays._endingStreak = streak;
    finalDays._endingDateIso = lastIso;
    return finalDays;
  }

  function summarizeMonthClt(days, meta = {}) {
    const resolvedDays = resolveHomeOfficeAndDsr(Array.isArray(days) ? days : [], {
      presumeHomeOffice: !!meta.presumeHomeOffice,
      deductAutoLunchOnSpecialDays: meta.deductAutoLunchOnSpecialDays !== undefined ? !!meta.deductAutoLunchOnSpecialDays : true,
      customHolidays: meta.customHolidays,
      toleranceMin: meta.toleranceMin,
      todayIso: meta.todayIso,
      initialStreak: meta.initialStreak || 0,
      prevDateIso: meta.prevDateIso || ''
    });

    let workedDays = 0;
    let presencialWorkedDays = 0;
    let workedWeekdays = 0;
    let homeOfficeDays = 0;
    let dsrAlertDays = 0;
    let workedWeekendDays = 0;
    let weekdaysInPeriod = 0;
    let weekdaysWithoutRecord = 0;
    let justifiedDays = 0;
    let sptTotalMin = 0;
    let cltWorkedMin = 0;
    let horasNormaisMin = 0;
    let lunchAdjustmentMin = 0;
    let expectedJourneyMin = 0;
    let he50BrutoMin = 0;
    let he100BrutoMin = 0;
    let excedenteBrutoMin = 0;
    let debitoBhBrutoMin = 0;
    let intervaloCurtoDays = 0;
    let almocoAutoDays = 0;
    let batidaImparDays = 0;
    let acima2hExtraDays = 0;
    let fdsDays = 0;
    let runningBh = 0;
    let runningHe100 = 0;
    let runningTotalBalance = 0;

    const todayIso = meta.todayIso || getLocalTodayIso();

    const enrichedDays = resolvedDays.map((d) => {
      if (d.justificativa) justifiedDays += 1;
      if (!d.isSpecialDay) {
        weekdaysInPeriod += 1;
        if (!d.isPresencialWorkedDay && (d.punchCount === 0 || d.isPostMidnightContinuation) && !d.justificativa && (!d.dateIso || d.dateIso <= todayIso)) {
          weekdaysWithoutRecord += 1;
        }
      }
      if (d.hasDsrStreakAlert) {
        dsrAlertDays += 1;
      }
      if (d.isWorkedDay) {
        workedDays += 1;
        if (d.isHomeOfficeDay) {
          homeOfficeDays += 1;
        } else if (d.isSpecialDay) {
          presencialWorkedDays += 1;
          workedWeekendDays += 1;
        } else {
          presencialWorkedDays += 1;
          workedWeekdays += 1;
        }
        sptTotalMin += d.sptTotalMin || 0;
        cltWorkedMin += d.cltWorkedMin || 0;
        horasNormaisMin += d.normalWorkedMin || 0;
        lunchAdjustmentMin += d.lunchDeductionDiffMin || 0;
        expectedJourneyMin += d.targetMin || 0;
        he50BrutoMin += d.he50Min || 0;
        he100BrutoMin += d.he100Min || 0;
        excedenteBrutoMin += d.excedenteMin || 0;
        debitoBhBrutoMin += d.debitoBhMin || 0;
        runningBh += d.deltaBhMin || 0;
        runningHe100 += d.he100Min || 0;
        runningTotalBalance += d.deltaMin || 0;
      } else if (d.sptTotalMin > 0) {
        sptTotalMin += d.sptTotalMin;
      }
      if (d.alerts && d.alerts.length) {
        if (d.alerts.some((a) => a.code === 'intervalo-curto')) intervaloCurtoDays += 1;
        if (d.alerts.some((a) => a.code === 'almoco-auto')) almocoAutoDays += 1;
        if (d.alerts.some((a) => a.code === 'batida-impar')) batidaImparDays += 1;
        if (d.alerts.some((a) => a.code === 'acima-2h-extra')) acima2hExtraDays += 1;
        if (d.alerts.some((a) => a.code === 'fim-de-semana')) fdsDays += 1;
      }
      return Object.assign({}, d, {
        accumulatedBhMin: runningBh,
        accumulatedHe100Min: runningHe100,
        accumulatedBalanceMin: runningTotalBalance
      });
    });

    const compensadoBhMin = Math.min(he50BrutoMin, debitoBhBrutoMin);
    const he50LiquidoMin = Math.max(0, he50BrutoMin - compensadoBhMin);
    const debitoBhLiquidoMin = Math.max(0, debitoBhBrutoMin - compensadoBhMin);
    const saldoBhMesMin = he50BrutoMin - debitoBhBrutoMin;

    const compensadoNoMesMin = compensadoBhMin;
    const excedenteLiquidoMin = he50LiquidoMin + he100BrutoMin;
    const aMenosBrutoMin = debitoBhBrutoMin;
    const aMenosLiquidoMin = debitoBhLiquidoMin;
    const saldoMesMin = saldoBhMesMin + he100BrutoMin;

    return {
      ymKey: meta.ymKey || (enrichedDays[0] && enrichedDays[0].ymKey) || '',
      monthLabel: meta.monthLabel || (enrichedDays[0] && enrichedDays[0].monthLabel) || '',
      presumeHomeOffice: !!meta.presumeHomeOffice,
      deductAutoLunchOnSpecialDays: meta.deductAutoLunchOnSpecialDays !== undefined ? !!meta.deductAutoLunchOnSpecialDays : true,
      workedDays,
      presencialWorkedDays,
      workedWeekdays,
      homeOfficeDays,
      dsrCompensatedDays: 0,
      dsrAlertDays,
      workedWeekendDays,
      weekdaysInPeriod,
      weekdaysWithoutRecord,
      unregisteredWeekdays: meta.presumeHomeOffice ? 0 : weekdaysWithoutRecord,
      justifiedDays,
      sptTotalMin,
      cltWorkedMin,
      horasNormaisMin,
      lunchAdjustmentMin,
      expectedJourneyMin,
      fullMonthReferenceMin: weekdaysInPeriod * DAILY_TARGET_MIN,
      he50BrutoMin,
      he100BrutoMin,
      excedenteBrutoMin,
      debitoBhBrutoMin,
      aMenosBrutoMin,
      compensadoBhMin,
      compensadoNoMesMin,
      he50LiquidoMin,
      debitoBhLiquidoMin,
      excedenteLiquidoMin,
      aMenosLiquidoMin,
      saldoBhMesMin,
      saldoMesMin,
      endingStreak: resolvedDays._endingStreak || 0,
      endingDateIso: resolvedDays._endingDateIso || '',
      alerts: {
        intervaloCurtoDays,
        almocoAutoDays,
        batidaImparDays,
        acima2hExtraDays,
        fdsDays,
        homeOfficeDays,
        dsrCompensatedDays: 0,
        dsrAlertDays,
        weekdaysWithoutRecord
      },
      days: enrichedDays
    };
  }

  function summarizeWorkerMonths(months) {
    const list = Array.isArray(months) ? months : [];
    const acc = {
      monthsCount: list.length,
      workedDays: 0,
      presencialWorkedDays: 0,
      workedWeekdays: 0,
      homeOfficeDays: 0,
      dsrCompensatedDays: 0,
      dsrAlertDays: 0,
      workedWeekendDays: 0,
      weekdaysInPeriod: 0,
      weekdaysWithoutRecord: 0,
      unregisteredWeekdays: 0,
      justifiedDays: 0,
      sptTotalMin: 0,
      cltWorkedMin: 0,
      horasNormaisMin: 0,
      lunchAdjustmentMin: 0,
      expectedJourneyMin: 0,
      he50BrutoMin: 0,
      he100BrutoMin: 0,
      excedenteBrutoMin: 0,
      debitoBhBrutoMin: 0,
      aMenosBrutoMin: 0,
      compensadoBhMin: 0,
      compensadoNoMesMin: 0,
      he50LiquidoMin: 0,
      debitoBhLiquidoMin: 0,
      excedenteLiquidoMin: 0,
      aMenosLiquidoMin: 0,
      saldoBhMesMin: 0,
      saldoMesMin: 0,
      alerts: {
        intervaloCurtoDays: 0,
        almocoAutoDays: 0,
        batidaImparDays: 0,
        acima2hExtraDays: 0,
        fdsDays: 0,
        homeOfficeDays: 0,
        dsrCompensatedDays: 0,
        dsrAlertDays: 0,
        weekdaysWithoutRecord: 0
      }
    };
    list.forEach((m) => {
      acc.workedDays += m.workedDays || 0;
      acc.presencialWorkedDays += m.presencialWorkedDays != null ? m.presencialWorkedDays : (m.workedDays || 0);
      acc.workedWeekdays += m.workedWeekdays || 0;
      acc.homeOfficeDays += m.homeOfficeDays || 0;
      acc.dsrAlertDays += m.dsrAlertDays || 0;
      acc.workedWeekendDays += m.workedWeekendDays || 0;
      acc.weekdaysInPeriod += m.weekdaysInPeriod || 0;
      acc.weekdaysWithoutRecord += m.weekdaysWithoutRecord || 0;
      acc.unregisteredWeekdays += m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.presumeHomeOffice ? 0 : (m.weekdaysWithoutRecord || 0));
      acc.justifiedDays += m.justifiedDays || 0;
      acc.sptTotalMin += m.sptTotalMin || 0;
      acc.cltWorkedMin += m.cltWorkedMin || 0;
      acc.horasNormaisMin += m.horasNormaisMin || 0;
      acc.lunchAdjustmentMin += m.lunchAdjustmentMin || 0;
      acc.expectedJourneyMin += m.expectedJourneyMin || 0;
      acc.he50BrutoMin += m.he50BrutoMin || 0;
      acc.he100BrutoMin += m.he100BrutoMin || 0;
      acc.excedenteBrutoMin += m.excedenteBrutoMin || 0;
      acc.debitoBhBrutoMin += m.debitoBhBrutoMin || 0;
      acc.aMenosBrutoMin += m.aMenosBrutoMin || 0;
      acc.compensadoBhMin += m.compensadoBhMin || 0;
      acc.compensadoNoMesMin += m.compensadoNoMesMin || 0;
      acc.he50LiquidoMin += m.he50LiquidoMin || 0;
      acc.debitoBhLiquidoMin += m.debitoBhLiquidoMin || 0;
      acc.excedenteLiquidoMin += m.excedenteLiquidoMin || 0;
      acc.aMenosLiquidoMin += m.aMenosLiquidoMin || 0;
      acc.saldoBhMesMin += m.saldoBhMesMin || 0;
      acc.saldoMesMin += m.saldoMesMin || 0;
      if (m.alerts) {
        acc.alerts.intervaloCurtoDays += m.alerts.intervaloCurtoDays || 0;
        acc.alerts.almocoAutoDays += m.alerts.almocoAutoDays || 0;
        acc.alerts.batidaImparDays += m.alerts.batidaImparDays || 0;
        acc.alerts.acima2hExtraDays += m.alerts.acima2hExtraDays || 0;
        acc.alerts.fdsDays += m.alerts.fdsDays || 0;
        acc.alerts.homeOfficeDays += m.alerts.homeOfficeDays || 0;
        acc.alerts.dsrAlertDays += m.alerts.dsrAlertDays || 0;
        acc.alerts.weekdaysWithoutRecord += m.alerts.weekdaysWithoutRecord || 0;
      }
    });
    return acc;
  }

  function summarizeUnitReport(workers) {
    const list = Array.isArray(workers) ? workers : [];
    const totals = list.map((w) => w.totals || summarizeWorkerMonths(w.months));
    const unit = summarizeWorkerMonths(totals);
    unit.workersCount = list.length;
    unit.activeWorkersCount = totals.filter((t) => (t.presencialWorkedDays || t.workedDays) > 0).length;
    return unit;
  }

  /**
   * Recomputa todos os meses de cada prestador encadeando a sequência de dias trabalhados
   * na virada entre meses consecutivos (`initialStreak` / `prevDateIso`).
   */
  function recomputeReportWithOptions(report, options = {}) {
    if (!report || !Array.isArray(report.workers)) return report;
    const presumeHomeOffice = options.presumeHomeOffice !== undefined ? !!options.presumeHomeOffice : !!report.presumeHomeOffice;
    const deductAutoLunchOnSpecialDays = options.deductAutoLunchOnSpecialDays !== undefined
      ? !!options.deductAutoLunchOnSpecialDays
      : (report.deductAutoLunchOnSpecialDays !== undefined ? !!report.deductAutoLunchOnSpecialDays : true);
    const customHolidays = options.customHolidays !== undefined ? options.customHolidays : (report.customHolidays || '');

    const nextWorkers = report.workers.map((w) => {
      let runningStreak = 0;
      let lastDateIso = '';
      const sortedMonths = (w.months || []).slice().sort((a, b) => String(a.ymKey || '').localeCompare(String(b.ymKey || '')));
      const nextMonths = sortedMonths.map((m) => {
        if (m.fetchError) return m;
        const summary = summarizeMonthClt(m.days || [], {
          ymKey: m.ymKey,
          monthLabel: m.monthLabel,
          presumeHomeOffice,
          deductAutoLunchOnSpecialDays,
          customHolidays,
          todayIso: options.todayIso,
          initialStreak: runningStreak,
          prevDateIso: lastDateIso
        });
        runningStreak = summary.endingStreak || 0;
        lastDateIso = summary.endingDateIso || '';
        return summary;
      });
      return Object.assign({}, w, {
        months: nextMonths,
        totals: summarizeWorkerMonths(nextMonths.filter((m) => !m.fetchError))
      });
    });
    return Object.assign({}, report, {
      presumeHomeOffice,
      deductAutoLunchOnSpecialDays,
      customHolidays,
      workers: nextWorkers,
      unitTotals: summarizeUnitReport(nextWorkers)
    });
  }

  return {
    DAILY_TARGET_MIN,
    DAILY_TOLERANCE_MIN,
    MIN_LUNCH_SHIFT_MIN,
    MIN_LUNCH_MIN,
    MAX_DAILY_OVERTIME_MIN,
    DEFAULT_FIXED_HOLIDAYS,
    getLocalTodayIso,
    computeEasterSunday,
    computeGoodFridayMmDd,
    parseCustomHolidaysConfig,
    resolveHolidayMapForYear,
    listAppliedHolidaysInRange,
    parseTimeMin,
    formatMin,
    normalizeText,
    isoToBr,
    brToIso,
    previousMonthPeriod,
    splitDateRangeByMonth,
    parseUnitsFromSelect,
    filterUnits,
    parsePeriodosFromDoc,
    parseWorkersFromConsultationDoc,
    parseDateInfo,
    analyzeDayClt,
    parseWorkerSheetDoc,
    resolveHomeOfficeAndDsr,
    summarizeMonthClt,
    summarizeWorkerMonths,
    summarizeUnitReport,
    recomputeReportWithOptions
  };
})();
