/**
 * TSE XT - Relatório Consolidado de Horas por Unidade (SPT / CLT · Digisystem)
 *
 * Acessível pelo botão flutuante (+) e pelo atalho Ctrl+K nas telas do SPT.
 * Parâmetros do relatório:
 *   a) Unidade (obrigatório, pesquisável por digitação/seleção, sincronizado com a tela principal)
 *   b) Período — data inicial e final (obrigatório, pré-preenchido com o mês anterior ao atual)
 *   c) Contrato (opcional — quando vazio, considera todos os contratos da unidade)
 *   d) Nome do prestador (dependente da unidade e do contrato selecionados; permite selecionar todos, filtrar ou escolher um/vários)
 *   e) Modo:
 *      - TSE XT / Digi (padrão): aplica as regras CLT / Digisystem (jornada 8h Seg–Sex, tolerância ±10 min art. 58 §1º, almoço mín. 1h art. 71, Sáb/Dom/Feriado com jornada 00:00 gerando 100% HE 100%, e separação entre Saldo BH 50% × Débito BH e HE 100%).
 *      - SPT Puro: apresenta exclusivamente os dados brutos da catraca do SPT (batidas, justificativa e Total SPT), sem cálculos interpretativos.
 *   f) Controle de Home Office e Reposição de DSR (ativo por padrão no modo TSE XT / Digi):
 *      - Em dias úteis sem batida na catraca, presume-se 8h de Home Office (sem gerar batida fictícia), exceto quando o colaborador trabalhou no domingo / mais de 6 dias seguidos (CLT art. 67 / OJ 410 TST), hipótese em que 1 dia útil sem batida na semana é alocado como "Reposição de DSR" (00:00).
 *   g) Detalhe:
 *      - Mensal: consolidação mensal por prestador.
 *      - Diário: espelho de ponto dia a dia de cada prestador.
 */

window.JEPessoasSptReport = (function () {
  'use strict';

  const STORAGE_KEY = 'je_xt_spt_report_v2';
  const PREFS_KEY = 'je_xt_spt_report_prefs_v2';
  const REPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias de retenção máxima em chrome.storage.local (C2)
  const PONTO_GESTAO_URL = '/spt-consultafrequencia/gestao/ponto-gestao';
  const GESTAO_HOME_URL = '/spt-consultafrequencia/gestao';
  const FETCH_THROTTLE_MS = 80;

  const calc = () => window.JEPessoasSptCltCalc;
  const combo = () => window.JEPessoasSptCombobox;

  let overlay = null;
  let unitWidget = null;
  let running = false;
  let aborted = false;
  let loadingWorkers = false;
  let workersList = []; // [{ codigo, matricula, cpf, contrato, numContrato, nome, checked }]
  let workersFetchStatus = { state: 'ok', failures: [], sessionExpired: false, queriedMonths: 0 };
  let workerSearchQuery = '';
  let selectedSingleWorkerCode = '__ALL__'; // '__ALL__' | '__CUSTOM__' | codigo específico
  let calcMode = 'xt_digi'; // 'xt_digi' (padrão) | 'spt_puro'
  let presumeHomeOffice = false; // padrão de fiscalização: desligado (não presume 8h sem batida)
  let deductAutoLunchOnSpecialDays = true; // padrão CLT art. 71 / SPT: desconta 1h em Sáb/Dom/Fer >6h com 1 par
  let customHolidaysText = ''; // ex.: "+11/08, -30/11, 2026-02-17:Carnaval"
  let detailMode = 'mensal'; // 'mensal' | 'diario'
  let showOnlyActiveDaysInDaily = false;
  let currentResult = null;
  let expandedMonthlyRows = new Set();
  let metadataCache = null; // { units, contracts, periodos, csrf }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, (t) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[t] || t));
  }

  function setSafeHTML(el, htmlString) {
    if (!el) return;
    const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${htmlString}</body></html>`, 'text/html');
    el.replaceChildren(...Array.from(doc.body.childNodes));
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function fmt(min, signed = false) {
    return calc().formatMin(min, signed);
  }

  function dot(min, signed = false) {
    return min ? fmt(min, signed) : '·';
  }

  function formatCpf(cpf) {
    const d = String(cpf || '').replace(/\D/g, '');
    if (d.length !== 11) return cpf || '—';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function loggedUserName() {
    const el = document.querySelector('.user-name, .footer-value');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function getCsrfToken(doc = document) {
    const input = doc.querySelector('input[name="_csrf"]');
    return input ? input.value : '';
  }

  function isSptLoginOrExpiredDoc(resp, html, doc) {
    if (resp && /login|encerrada/i.test(String(resp.url || ''))) return true;
    if (doc && doc.querySelector) {
      if (doc.querySelector('form[action*="process-login"], form[action*="/login"], input[name="password"][type="password"]')) {
        return true;
      }
    }
    if (typeof html === 'string' && html.length < 15000 && /process-login|sess[aã]o\s+expirada|autentica[cç][aã]o/i.test(html)) {
      return true;
    }
    return false;
  }

  function isCsrfErrorResponse(resp, html) {
    if (resp && (resp.status === 403 || resp.status === 401)) return true;
    if (typeof html === 'string' && /Invalid CSRF Token|CSRF token|Forbidden/i.test(html)) return true;
    return false;
  }

  async function ensureMetadataLoaded(options = {}) {
    const forceRefresh = !!(options && options.forceRefresh);
    if (!forceRefresh && metadataCache && metadataCache.csrf && Array.isArray(metadataCache.units) && metadataCache.units.length > 0) {
      return metadataCache;
    }

    const cb = combo();
    const c = calc();
    let units = (!forceRefresh && cb) ? cb.getAvailableUnits(document) : [];
    let contracts = (!forceRefresh && cb) ? cb.getAvailableContracts(document) : [];
    let periodos = (!forceRefresh && cb && cb.getAvailablePeriodos)
      ? cb.getAvailablePeriodos(document)
      : ((!forceRefresh && c && c.parsePeriodosFromDoc) ? c.parsePeriodosFromDoc(document) : []);
    let csrf = !forceRefresh ? getCsrfToken(document) : '';

    if (forceRefresh || !units.length || !csrf || !periodos.length) {
      try {
        const resp = await fetch(GESTAO_HOME_URL, { credentials: 'include' });
        if (resp) {
          const html = typeof resp.text === 'function' ? await resp.text() : '';
          const doc = new DOMParser().parseFromString(html, 'text/html');
          if (isSptLoginOrExpiredDoc(resp, html, doc)) {
            metadataCache = {
              units: Array.isArray(units) ? units : [],
              contracts: Array.isArray(contracts) ? contracts : [],
              periodos: Array.isArray(periodos) ? periodos : [],
              csrf: '',
              sessionExpired: true,
              loadError: 'Sessão do SPT expirada'
            };
            return metadataCache;
          }
          if (resp.ok === false) {
            metadataCache = {
              units: Array.isArray(units) ? units : [],
              contracts: Array.isArray(contracts) ? contracts : [],
              periodos: Array.isArray(periodos) ? periodos : [],
              csrf: csrf || '',
              sessionExpired: false,
              loadError: `HTTP ${resp.status || 'erro'}`
            };
            return metadataCache;
          }
          if (cb) {
            cb.cacheUnitsAndContractsFromDOM(doc);
            const fetchedUnits = cb.getAvailableUnits(doc);
            const fetchedContracts = cb.getAvailableContracts(doc);
            const fetchedPeriodos = cb.getAvailablePeriodos ? cb.getAvailablePeriodos(doc) : [];
            if (fetchedUnits.length) units = fetchedUnits;
            if (fetchedContracts.length) contracts = fetchedContracts;
            if (fetchedPeriodos.length) periodos = fetchedPeriodos;
          }
          if (!units.length && c && c.parseUnitsFromSelect) {
            units = c.parseUnitsFromSelect(doc.getElementById('cbUnidades') || doc.querySelector('#cbUnidades'));
          }
          if (!contracts.length && c && c.parseContractsFromSelect) {
            contracts = c.parseContractsFromSelect(doc.getElementById('cbContratos') || doc.querySelector('#cbContratos'));
          }
          if (!periodos.length && c && c.parsePeriodosFromDoc) {
            periodos = c.parsePeriodosFromDoc(doc);
          }
          const fetchedCsrf = getCsrfToken(doc);
          if (fetchedCsrf) csrf = fetchedCsrf;
        }
      } catch (err) {
        if (!csrf) {
          metadataCache = {
            units: Array.isArray(units) ? units : [],
            contracts: Array.isArray(contracts) ? contracts : [],
            periodos: Array.isArray(periodos) ? periodos : [],
            csrf: '',
            sessionExpired: false,
            loadError: (err && err.message) ? err.message : 'erro de rede'
          };
          return metadataCache;
        }
      }
    }

    metadataCache = {
      units: Array.isArray(units) ? units : [],
      contracts: Array.isArray(contracts) ? contracts : [],
      periodos: Array.isArray(periodos) ? periodos : [],
      csrf: csrf || '',
      sessionExpired: false,
      loadError: ''
    };
    return metadataCache;
  }

  function findPeriodForContractAndMonth(contrato, ymBr, periodosOverride = null) {
    const c = calc();
    const cb = combo();
    const lPeriodos = Array.isArray(periodosOverride) && periodosOverride.length > 0
      ? periodosOverride
      : ((metadataCache && Array.isArray(metadataCache.periodos) && metadataCache.periodos.length > 0)
        ? metadataCache.periodos
        : ((cb && cb.getAvailablePeriodos && cb.getAvailablePeriodos(document))
          || (c && c.parsePeriodosFromDoc && c.parsePeriodosFromDoc(document))
          || []));
    if (!contrato || contrato === '-1') return { idx: -1, tuple: null };
    let idx = lPeriodos.findIndex((p) => Array.isArray(p) && String(p[0]) === String(contrato) && String(p[1]) === String(ymBr));
    if (idx < 0) {
      idx = lPeriodos.findIndex((p) => Array.isArray(p) && String(p[0]) === String(contrato));
    }
    return {
      idx,
      tuple: idx >= 0 ? lPeriodos[idx] : null
    };
  }

  async function fetchWorkersByUnitAndContract(unitId, contrato, fromIso, toIso, buscarAbaixo = true) {
    const c = calc();
    const slices = c.splitDateRangeByMonth(fromIso, toIso);
    if (!unitId || !slices.length) {
      return { workers: [], failures: [], sessionExpired: false, queriedMonths: 0 };
    }

    let meta = await ensureMetadataLoaded();
    if (!meta.csrf) {
      if (meta.sessionExpired) {
        return {
          workers: [],
          failures: [{ kind: 'session', mes: slices[0].periodoDescricao, reason: 'Sessão do SPT expirada' }],
          sessionExpired: true,
          queriedMonths: slices.length
        };
      }
      meta = await ensureMetadataLoaded({ forceRefresh: true });
      if (!meta.csrf) {
        const kind = meta.sessionExpired ? 'session' : 'http';
        const reason = meta.loadError || (meta.sessionExpired ? 'Sessão do SPT expirada' : 'token CSRF indisponível');
        return {
          workers: [],
          failures: [{ kind, mes: slices[0].periodoDescricao, reason }],
          sessionExpired: !!meta.sessionExpired,
          queriedMonths: slices.length
        };
      }
    }

    const contractParam = contrato && contrato !== '-1' ? String(contrato) : '-1';

    async function queryWithDate(dateIso, pInfo, ymBr, allowRetry = true) {
      const tuple = (pInfo && pInfo.tuple) || ['', '', '', ''];
      const body = new URLSearchParams({
        _csrf: meta.csrf,
        cmd: 'cmdConsultar',
        periodoCodigo: tuple[0] || '',
        periodoDescricao: tuple[1] || '',
        periodoDtInicio: tuple[2] || '',
        periodoDtFinal: tuple[3] || '',
        codContrato: '',
        codTSE: '',
        cpf: '',
        numContrato: '',
        cdFunc: '',
        matFunc: '',
        nome: '',
        perfil: document.getElementById('perfilSelect')?.value || 'adm',
        cbUnidades: String(unitId),
        cbContratos: contractParam,
        cbPeriodos: pInfo && pInfo.idx >= 0 ? String(pInfo.idx) : '-1',
        edtdataponto: dateIso
      });
      if (buscarAbaixo) {
        body.set('cbxBuscarUnidAbaixo', 'BuscarUnidAbaixo');
      }
      let resp;
      try {
        resp = await fetch(PONTO_GESTAO_URL, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
      } catch (err) {
        return {
          ok: false,
          error: {
            kind: 'http',
            mes: ymBr,
            reason: (err && err.message) ? err.message : 'erro de rede'
          }
        };
      }
      const html = typeof resp.text === 'function' ? await resp.text() : '';
      if (allowRetry && isCsrfErrorResponse(resp, html)) {
        meta = await ensureMetadataLoaded({ forceRefresh: true });
        if (meta.csrf) {
          return queryWithDate(dateIso, pInfo, ymBr, false);
        }
      }
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (isSptLoginOrExpiredDoc(resp, html, doc)) {
        return {
          ok: false,
          error: {
            kind: 'session',
            mes: ymBr,
            reason: 'Sessão do SPT expirada'
          }
        };
      }
      if (resp && resp.ok === false) {
        return {
          ok: false,
          error: {
            kind: 'http',
            mes: ymBr,
            reason: `HTTP ${resp.status || 'erro'}`
          }
        };
      }
      const hasConsultationStructure = !!(
        doc && doc.querySelector && (
          doc.querySelector('#maintable')
          || doc.querySelector('#formulario')
          || doc.querySelector('#cbUnidades')
          || doc.querySelector('.card')
        )
      );
      if (!hasConsultationStructure) {
        return {
          ok: false,
          error: {
            kind: 'parse',
            mes: ymBr,
            reason: 'resposta inesperada do SPT'
          }
        };
      }
      const inlinePeriodos = c.parsePeriodosFromDoc ? c.parsePeriodosFromDoc(doc) : [];
      if (inlinePeriodos.length > 0 && (!meta.periodos || !meta.periodos.length)) {
        meta.periodos = inlinePeriodos;
      }
      return {
        ok: true,
        workers: c.parseWorkersFromConsultationDoc(doc)
      };
    }

    const byCode = new Map();
    const failures = [];
    let sessionExpired = false;

    for (const slice of slices) {
      const refDateIso = slice.dtFinalIso;
      const ymBr = slice.periodoDescricao;
      if (!refDateIso || !ymBr) continue;
      const periodInfo = findPeriodForContractAndMonth(contractParam, ymBr, meta.periodos);
      let qRes = await queryWithDate(refDateIso, periodInfo, ymBr);
      if (qRes.ok && qRes.workers.length === 0 && periodInfo.tuple && periodInfo.tuple[3]) {
        const fallbackIso = c.brToIso(periodInfo.tuple[3]);
        if (fallbackIso && fallbackIso !== refDateIso) {
          const fbRes = await queryWithDate(fallbackIso, periodInfo, ymBr);
          if (fbRes.ok) {
            qRes = fbRes;
          }
        }
      }
      if (!qRes.ok) {
        failures.push(qRes.error);
        if (qRes.error.kind === 'session') {
          sessionExpired = true;
          break;
        }
        continue;
      }
      qRes.workers.forEach((w) => {
        if (!byCode.has(w.codigo)) {
          byCode.set(w.codigo, w);
        }
      });
    }

    return {
      workers: Array.from(byCode.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      failures,
      sessionExpired,
      queriedMonths: slices.length
    };
  }

  function createFailedMonthSummary(slice, errorReason) {
    return {
      ymKey: slice.ymKey,
      monthLabel: slice.periodoDescricao,
      fetchError: true,
      errorReason: String(errorReason || 'falha na consulta'),
      presumeHomeOffice: false,
      deductAutoLunchOnSpecialDays: true,
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
      fullMonthReferenceMin: 0,
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
      endingStreak: 0,
      endingDateIso: '',
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
      },
      days: []
    };
  }

  async function fetchWorkerMonthSlice(worker, slice, unitId, buscarAbaixo = true, options = {}, allowRetry = true) {
    let meta = await ensureMetadataLoaded();
    const periodInfo = findPeriodForContractAndMonth(worker.contrato, slice.periodoDescricao, meta.periodos);
    const body = new URLSearchParams({
      _csrf: meta.csrf,
      cmd: 'cmdVerPeriodoContrato',
      periodoCodigo: worker.contrato || (periodInfo.tuple && periodInfo.tuple[0]) || '',
      periodoDescricao: slice.periodoDescricao,
      periodoDtInicio: slice.dtInicioBr,
      periodoDtFinal: slice.dtFinalBr,
      codContrato: worker.contrato || '',
      codTSE: worker.codTse || worker.cpf || '',
      cpf: worker.cpf || '',
      numContrato: worker.numContrato || '',
      cdFunc: worker.codigo || '',
      matFunc: worker.matricula || '',
      nome: worker.nome || '',
      perfil: document.getElementById('perfilSelect')?.value || 'adm',
      cbUnidades: String(unitId || '1'),
      cbContratos: worker.contrato || '-1',
      cbPeriodos: periodInfo.idx >= 0 ? String(periodInfo.idx) : '-1',
      edtdataponto: slice.dtFinalIso
    });
    if (buscarAbaixo) {
      body.set('cbxBuscarUnidAbaixo', 'BuscarUnidAbaixo');
    }

    const resp = await fetch(PONTO_GESTAO_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (allowRetry && isCsrfErrorResponse(resp, html)) {
      meta = await ensureMetadataLoaded({ forceRefresh: true });
      if (meta.csrf) {
        return fetchWorkerMonthSlice(worker, slice, unitId, buscarAbaixo, options, false);
      }
    }

    if (isSptLoginOrExpiredDoc(resp, html, doc)) {
      return { loggedOut: true };
    }

    if (resp && resp.ok === false) {
      return {
        loggedOut: false,
        error: `HTTP ${resp.status || 'erro'}`
      };
    }

    const hasSheetTable = !!(doc && doc.querySelector && (doc.querySelector('#maintable') || doc.querySelector('.card .card-body')));
    if (!hasSheetTable) {
      return {
        loggedOut: false,
        error: 'resposta sem tabela de frequência'
      };
    }

    const parsed = calc().parseWorkerSheetDoc(doc, {
      dtInicioIso: slice.dtInicioIso,
      dtFinalIso: slice.dtFinalIso
    }, {
      deductAutoLunchOnSpecialDays: options.deductAutoLunchOnSpecialDays !== undefined
        ? !!options.deductAutoLunchOnSpecialDays
        : deductAutoLunchOnSpecialDays,
      customHolidays: options.customHolidays !== undefined ? options.customHolidays : customHolidaysText
    });
    const summary = calc().summarizeMonthClt(parsed.days, {
      ymKey: slice.ymKey,
      monthLabel: slice.periodoDescricao,
      presumeHomeOffice: options.presumeHomeOffice !== undefined ? !!options.presumeHomeOffice : presumeHomeOffice,
      deductAutoLunchOnSpecialDays: options.deductAutoLunchOnSpecialDays !== undefined
        ? !!options.deductAutoLunchOnSpecialDays
        : deductAutoLunchOnSpecialDays,
      customHolidays: options.customHolidays !== undefined ? options.customHolidays : customHolidaysText,
      initialStreak: options.initialStreak || 0,
      prevDateIso: options.prevDateIso || ''
    });
    return {
      loggedOut: false,
      meta: parsed.meta,
      summary
    };
  }

  function isStoredReportExpired(report, nowMs = Date.now()) {
    if (!report || typeof report !== 'object') return true;
    if (!report.generatedAt) return true;
    const generatedMs = Date.parse(report.generatedAt);
    if (!Number.isFinite(generatedMs)) return true;
    return (nowMs - generatedMs) > REPORT_TTL_MS;
  }

  function clearStoredReport() {
    return new Promise((resolve) => {
      try {
        if (chrome.storage?.local?.remove) {
          chrome.storage.local.remove(STORAGE_KEY, () => resolve());
        } else {
          chrome.storage.local.set({ [STORAGE_KEY]: null }, () => resolve());
        }
      } catch (_) {
        resolve();
      }
    });
  }

  function loadStoredReport() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [STORAGE_KEY]: null }, async (items) => {
          const stored = (items && items[STORAGE_KEY]) || null;
          if (!stored) {
            resolve(null);
            return;
          }
          if (isStoredReportExpired(stored)) {
            await clearStoredReport();
            resolve(null);
            return;
          }
          resolve(stored);
        });
      } catch (_) {
        resolve(null);
      }
    });
  }

  function saveStoredReport(report) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: report }, () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }

  function loadPrefs() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [PREFS_KEY]: null }, (items) => resolve((items && items[PREFS_KEY]) || null));
      } catch (_) {
        resolve(null);
      }
    });
  }

  function savePrefs() {
    if (!overlay) return;
    const prefs = {
      unitId: unitWidget ? unitWidget.getValue() : '',
      buscarAbaixo: !!overlay.querySelector('#je-spt-rep-subunits')?.checked,
      fromIso: overlay.querySelector('#je-spt-rep-from')?.value || '',
      toIso: overlay.querySelector('#je-spt-rep-to')?.value || '',
      contrato: overlay.querySelector('#je-spt-rep-contrato')?.value || '',
      calcMode,
      presumeHomeOffice,
      hoDefaultMigratedV2: true,
      deductAutoLunchOnSpecialDays,
      customHolidays: customHolidaysText,
      detailMode
    };
    try {
      chrome.storage.local.set({ [PREFS_KEY]: prefs });
    } catch (_) {}
  }

  function syncHomeOfficeCheckboxState() {
    if (!overlay) return;
    const hoCheck = overlay.querySelector('#je-spt-rep-homeoffice');
    const hoWrap = overlay.querySelector('#je-spt-rep-ho-wrap');
    const spLunchCheck = overlay.querySelector('#je-spt-rep-special-lunch');
    const spLunchWrap = overlay.querySelector('#je-spt-rep-special-lunch-wrap');
    const holidaysInput = overlay.querySelector('#je-spt-rep-holidays');
    const isRaw = calcMode === 'spt_puro';

    if (hoCheck) {
      hoCheck.checked = presumeHomeOffice;
      hoCheck.disabled = running || isRaw;
    }
    if (hoWrap) {
      hoWrap.style.opacity = isRaw ? '0.45' : '1';
    }
    if (spLunchCheck) {
      spLunchCheck.checked = deductAutoLunchOnSpecialDays;
      spLunchCheck.disabled = running || isRaw;
    }
    if (spLunchWrap) {
      spLunchWrap.style.opacity = isRaw ? '0.45' : '1';
    }
    if (holidaysInput) {
      holidaysInput.value = customHolidaysText;
      holidaysInput.disabled = running || isRaw;
    }
  }

  function createDOM() {
    if (overlay) return overlay;
    const prev = calc().previousMonthPeriod();

    overlay = document.createElement('div');
    overlay.id = 'je-spt-report-modal';
    overlay.className = 'je-modal-overlay je-audit-modal je-recog-modal je-spt-report-modal';

    setSafeHTML(overlay, `
      <div class="je-modal-content je-audit-content je-spt-report-content" role="dialog" aria-modal="true" aria-label="Relatório Consolidado de Horas por Unidade">
        <div class="je-audit-head">
          <div class="je-audit-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="stroke: var(--je-primary);" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
            </svg>
            <span>Relatório Consolidado de Horas por Unidade (SPT · TSE XT / Digi)</span>
          </div>
          <button type="button" class="je-audit-x" id="je-spt-rep-close" title="Fechar (Esc)">&times;</button>
        </div>

        <div class="je-spt-rep-filters">
          <div class="je-spt-rep-grid">
            <div class="je-spt-rep-field je-spt-rep-field-unit" title="Selecione ou digite o nome, sigla ou código da unidade (seção/coordenadoria) para filtrar os prestadores">
              <div class="je-spt-rep-label-row">
                <label for="je-spt-rep-unit-input" title="Unidade organizacional do TSE (obrigatório)">Unidade (Seção / Coordenadoria) <span class="je-req">*</span></label>
                <label class="je-spt-rep-check-inline" title="Quando marcado, inclui também os prestadores alocados nas subunidades subordinadas à unidade selecionada">
                  <input type="checkbox" id="je-spt-rep-subunits" checked>
                  <span>Buscar unidades abaixo</span>
                </label>
              </div>
              <div id="je-spt-rep-unit-mount"></div>
            </div>

            <div class="je-spt-rep-field" title="Data inicial do período de apuração (pré-preenchida com o 1º dia do mês anterior)">
              <label for="je-spt-rep-from" title="Data inicial da consulta (obrigatório)">Data inicial <span class="je-req">*</span></label>
              <input type="date" id="je-spt-rep-from" class="je-spt-input" value="${escapeHTML(prev.fromIso)}" title="Informe a data inicial do período de consulta" required>
            </div>

            <div class="je-spt-rep-field" title="Data final do período de apuração (pré-preenchida com o último dia do mês anterior)">
              <label for="je-spt-rep-to" title="Data final da consulta (obrigatório)">Data final <span class="je-req">*</span></label>
              <input type="date" id="je-spt-rep-to" class="je-spt-input" value="${escapeHTML(prev.toIso)}" title="Informe a data final do período de consulta" required>
            </div>

            <div class="je-spt-rep-field" title="Filtra os prestadores de um contrato específico ou mantém todos os contratos ativos na unidade">
              <label for="je-spt-rep-contrato" title="Contrato administrativo (opcional — deixe em 'Todos os contratos' para listar todos)">Contrato <span class="je-opt">(opcional)</span></label>
              <select id="je-spt-rep-contrato" class="je-spt-select" title="Selecione um contrato específico ou 'Todos os contratos'">
                <option value="">Todos os contratos</option>
              </select>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-prestador" title="Permite escolher rapidamente todos os prestadores da unidade/contrato ou um prestador individual">
              <label for="je-spt-rep-worker-select" title="Seleção rápida de prestador (para seleção múltipla personalizada, use a gaveta 'Prestadores selecionados' abaixo)">Nome do Prestador</label>
              <select id="je-spt-rep-worker-select" class="je-spt-select" title="Escolha 'Todos os prestadores' ou selecione um prestador específico">
                <option value="__ALL__">Carregando prestadores da unidade...</option>
              </select>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-mode" title="Define se o relatório aplica as regras de cálculo CLT / Digisystem (padrão) ou exibe apenas os dados brutos da catraca do SPT">
              <span class="je-spt-rep-label-text" title="Modo de apuração do relatório">Modo</span>
              <div class="je-spt-segmented" role="radiogroup" aria-label="Modo de cálculo do relatório">
                <label class="je-spt-seg-item is-active" id="je-spt-seg-mode-xt" title="Regras CLT / Digisystem (Padrão): jornada 8h Seg–Sex, tolerância ±10 min (art. 58 §1º), Sáb/Dom/Feriado com jornada 00:00 (100% HE 100%) e separação independente entre Saldo BH (50% − Débito BH) e HE 100%">
                  <input type="radio" name="je-spt-rep-mode" value="xt_digi" checked>
                  <span>TSE XT / Digi</span>
                </label>
                <label class="je-spt-seg-item" id="je-spt-seg-mode-raw" title="Dados brutos retornados pelo SPT (batidas de catraca e Total SPT), sem nenhuma interpretação ou cálculo do TSE XT">
                  <input type="radio" name="je-spt-rep-mode" value="spt_puro">
                  <span>SPT Puro (Bruto)</span>
                </label>
              </div>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-detail" title="Alterna a visualização entre a tabela consolidada do mês por prestador e o espelho de ponto diário detalhado">
              <span class="je-spt-rep-label-text" title="Nível de detalhe exibido e impresso">Detalhe</span>
              <div class="je-spt-segmented" role="radiogroup" aria-label="Nível de detalhe do relatório">
                <label class="je-spt-seg-item is-active" id="je-spt-seg-mensal" title="Exibe o quadro consolidado mensal por prestador (clique em qualquer linha para expandir os dias daquele prestador)">
                  <input type="radio" name="je-spt-rep-detail" value="mensal" checked>
                  <span>Mensal</span>
                </label>
                <label class="je-spt-seg-item" id="je-spt-seg-diario" title="Exibe o espelho de ponto dia a dia completo de todos os prestadores selecionados">
                  <input type="radio" name="je-spt-rep-detail" value="diario">
                  <span>Diário (Espelho)</span>
                </label>
              </div>
            </div>
          </div>

          <div class="je-spt-rep-toolbar-bottom">
            <details class="je-recog-team je-spt-team-details" id="je-spt-rep-team" title="Clique para expandir a lista de prestadores e marcar/desmarcar nomes individualmente">
              <summary id="je-spt-rep-team-summary" title="Resumo de prestadores selecionados para o relatório">Prestadores selecionados (carregando...)</summary>
              <div class="je-recog-team-actions je-spt-team-actions">
                <input type="search" id="je-spt-rep-worker-search" class="je-spt-input je-spt-worker-search" placeholder="Filtrar prestador por nome, CPF ou contrato..." title="Digite parte do nome, CPF ou número do contrato para filtrar a lista de prestadores" autocorrect="off" autocapitalize="none" spellcheck="false">
                <button type="button" class="je-audit-btn" id="je-spt-rep-all" title="Marca todos os prestadores visíveis no filtro atual">Selecionar todos</button>
                <button type="button" class="je-audit-btn" id="je-spt-rep-none" title="Desmarca todos os prestadores visíveis no filtro atual">Limpar seleção</button>
              </div>
              <div class="je-recog-team-list" id="je-spt-rep-team-list"></div>
            </details>

            <div class="je-spt-rep-options-row">
              <label class="je-spt-rep-check-inline je-spt-ho-toggle" id="je-spt-rep-ho-wrap" title="Desligado por padrão para fiscalização (mostra coluna 'Dias s/ Reg.' sem gerar débito automático). Quando ligado, presume 08:00 em todo dia útil sem batida e sem justificativa até a data atual, com destaque visual próprio">
                <input type="checkbox" id="je-spt-rep-homeoffice">
                <span>Presumir <strong>Home Office (8h)</strong> em dias úteis sem batida</span>
              </label>

              <label class="je-spt-rep-check-inline je-spt-ho-toggle" id="je-spt-rep-special-lunch-wrap" title="Ligado por padrão (CLT art. 71 / SPT): desconta 1h de intervalo em Sáb/Dom/Feriado com jornada > 6h e apenas 1 par de batidas. Desligado: reproduz o cartão ponto Digisystem (sem desconto de intervalo não batido em fim de semana)">
                <input type="checkbox" id="je-spt-rep-special-lunch" checked>
                <span>Descontar <strong>1h de intervalo</strong> não registrado em Sáb/Dom/Feriado (&gt;6h)</span>
              </label>

              <div class="je-spt-rep-holidays-box" title="Personalize a lista de feriados (padrão: feriados civis nacionais + Sexta-feira Santa + 30/11 DF; sem feriados forenses 11/08, 01/11 e 08/12). Use +DD/MM ou AAAA-MM-DD:Nome para adicionar e -DD/MM para remover">
                <label for="je-spt-rep-holidays">Feriados (+/-):</label>
                <input type="text" id="je-spt-rep-holidays" class="je-spt-input je-spt-holidays-input" placeholder="Ex.: +11/08, -30/11, 2026-02-17:Carnaval" title="Adicione (+DD/MM ou AAAA-MM-DD:Nome) ou remova (-DD/MM) feriados da lista padrão CLT/DF">
              </div>
            </div>

            <div class="je-audit-actions je-spt-rep-actions">
              <button type="button" class="je-audit-btn je-audit-btn-primary" id="je-spt-rep-run" title="Consulta o SPT para todos os prestadores selecionados e gera o relatório consolidado">
                Gerar relatório
              </button>
              <button type="button" class="je-audit-btn" id="je-spt-rep-csv" title="Exporta o relatório atual (Mensal ou Diário, no Modo selecionado) para planilha CSV compatível com Excel" disabled>
                CSV
              </button>
              <button type="button" class="je-audit-btn" id="je-spt-rep-print" title="Abre a visualização de impressão institucional A4 paisagem (com Anexo de Interpretação) para salvar em PDF ou imprimir" disabled>
                Imprimir / PDF
              </button>
              <button type="button" class="je-audit-btn je-audit-btn-ghost" id="je-spt-rep-clear" title="Remove imediatamente o relatório salvo do armazenamento local deste navegador (os relatórios salvos também expiram automaticamente após 7 dias)" disabled>
                Apagar relatório salvo
              </button>
            </div>
          </div>
        </div>

        <div class="je-audit-progress" id="je-spt-rep-progress" hidden>
          <div class="je-audit-progress-bar"><div class="je-audit-progress-fill" id="je-spt-rep-progress-fill"></div></div>
          <div class="je-audit-progress-row">
            <span id="je-spt-rep-progress-label">Consultando frequência dos prestadores…</span>
            <button type="button" class="je-audit-btn je-audit-btn-ghost" id="je-spt-rep-cancel">Cancelar</button>
          </div>
        </div>

        <div class="je-audit-alert je-spt-validation-alert" id="je-spt-rep-validation" role="alert" aria-live="assertive" hidden></div>

        <div class="je-audit-body" id="je-spt-rep-body"></div>
      </div>
    `);

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('#je-spt-rep-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        close();
      }
    });

    overlay.querySelector('#je-spt-rep-subunits').addEventListener('change', () => {
      savePrefs();
      refreshWorkersList();
    });

    overlay.querySelector('#je-spt-rep-contrato').addEventListener('change', () => {
      savePrefs();
      refreshWorkersList();
    });

    ['#je-spt-rep-from', '#je-spt-rep-to'].forEach((sel) => {
      overlay.querySelector(sel).addEventListener('change', () => {
        showValidationMessage('');
        savePrefs();
        refreshWorkersList();
      });
    });

    overlay.querySelector('#je-spt-rep-worker-select').addEventListener('change', (e) => {
      const val = e.target.value;
      selectedSingleWorkerCode = val;
      if (val === '__ALL__') {
        workersList.forEach((w) => { w.checked = true; });
      } else if (val !== '__CUSTOM__') {
        workersList.forEach((w) => { w.checked = w.codigo === val; });
      }
      paintWorkersList();
      markDirtySelection();
    });

    overlay.querySelector('#je-spt-rep-worker-search').addEventListener('input', (e) => {
      workerSearchQuery = e.target.value || '';
      paintWorkersList();
    });

    overlay.querySelector('#je-spt-rep-all').addEventListener('click', () => {
      if (running) return;
      const q = calc().normalizeText(workerSearchQuery);
      workersList.forEach((w) => {
        if (!q || calc().normalizeText(`${w.nome} ${w.cpf} ${w.numContrato}`).includes(q)) {
          w.checked = true;
        }
      });
      syncSingleWorkerDropdownFromCheckboxes();
      paintWorkersList();
      markDirtySelection();
    });

    overlay.querySelector('#je-spt-rep-none').addEventListener('click', () => {
      if (running) return;
      const q = calc().normalizeText(workerSearchQuery);
      workersList.forEach((w) => {
        if (!q || calc().normalizeText(`${w.nome} ${w.cpf} ${w.numContrato}`).includes(q)) {
          w.checked = false;
        }
      });
      syncSingleWorkerDropdownFromCheckboxes();
      paintWorkersList();
      markDirtySelection();
    });

    overlay.querySelector('#je-spt-rep-team-list').addEventListener('change', (e) => {
      const code = e.target && e.target.dataset ? e.target.dataset.codigo : null;
      if (!code) return;
      const w = workersList.find((item) => item.codigo === code);
      if (w) w.checked = !!e.target.checked;
      syncSingleWorkerDropdownFromCheckboxes();
      paintWorkersSummary();
      markDirtySelection();
    });

    async function recomputeAndRenderCurrentResult() {
      if (!currentResult) return;
      currentResult = calc().recomputeReportWithOptions(currentResult, {
        presumeHomeOffice,
        deductAutoLunchOnSpecialDays,
        customHolidays: customHolidaysText
      });
      await saveStoredReport(currentResult);
      renderResult(currentResult);
    }

    overlay.querySelector('#je-spt-rep-homeoffice').addEventListener('change', async (e) => {
      presumeHomeOffice = !!e.target.checked;
      savePrefs();
      await recomputeAndRenderCurrentResult();
    });

    overlay.querySelector('#je-spt-rep-special-lunch').addEventListener('change', async (e) => {
      deductAutoLunchOnSpecialDays = !!e.target.checked;
      savePrefs();
      await recomputeAndRenderCurrentResult();
    });

    overlay.querySelector('#je-spt-rep-holidays').addEventListener('change', async (e) => {
      customHolidaysText = String(e.target.value || '').trim();
      savePrefs();
      await recomputeAndRenderCurrentResult();
    });

    overlay.querySelectorAll('input[name="je-spt-rep-mode"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (!e.target.checked) return;
        calcMode = e.target.value === 'spt_puro' ? 'spt_puro' : 'xt_digi';
        overlay.querySelector('#je-spt-seg-mode-xt').classList.toggle('is-active', calcMode === 'xt_digi');
        overlay.querySelector('#je-spt-seg-mode-raw').classList.toggle('is-active', calcMode === 'spt_puro');
        syncHomeOfficeCheckboxState();
        savePrefs();
        if (currentResult) {
          renderResult(currentResult);
        }
      });
    });

    overlay.querySelectorAll('input[name="je-spt-rep-detail"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (!e.target.checked) return;
        detailMode = e.target.value === 'diario' ? 'diario' : 'mensal';
        overlay.querySelector('#je-spt-seg-mensal').classList.toggle('is-active', detailMode === 'mensal');
        overlay.querySelector('#je-spt-seg-diario').classList.toggle('is-active', detailMode === 'diario');
        savePrefs();
        if (currentResult) {
          renderResult(currentResult);
        }
      });
    });

    overlay.querySelector('#je-spt-rep-run').addEventListener('click', runReport);
    overlay.querySelector('#je-spt-rep-cancel').addEventListener('click', () => { aborted = true; });
    overlay.querySelector('#je-spt-rep-csv').addEventListener('click', exportCSV);
    overlay.querySelector('#je-spt-rep-print').addEventListener('click', printReport);
    overlay.querySelector('#je-spt-rep-clear').addEventListener('click', async () => {
      if (running) return;
      currentResult = null;
      expandedMonthlyRows.clear();
      await clearStoredReport();
      renderResult(null);
    });
    overlay.querySelector('#je-spt-rep-body').addEventListener('click', onBodyClick);

    return overlay;
  }

  function syncSingleWorkerDropdownFromCheckboxes() {
    const sel = overlay.querySelector('#je-spt-rep-worker-select');
    if (!sel) return;
    const checked = workersList.filter((w) => w.checked);
    if (workersList.length > 0 && checked.length === workersList.length) {
      selectedSingleWorkerCode = '__ALL__';
      sel.value = '__ALL__';
    } else if (checked.length === 1) {
      selectedSingleWorkerCode = checked[0].codigo;
      sel.value = checked[0].codigo;
    } else {
      selectedSingleWorkerCode = '__CUSTOM__';
      if (!sel.querySelector('option[value="__CUSTOM__"]')) {
        const opt = document.createElement('option');
        opt.value = '__CUSTOM__';
        opt.textContent = `Seleção personalizada (${checked.length} de ${workersList.length})`;
        sel.appendChild(opt);
      } else {
        sel.querySelector('option[value="__CUSTOM__"]').textContent = `Seleção personalizada (${checked.length} de ${workersList.length})`;
      }
      sel.value = '__CUSTOM__';
    }
  }

  function formatWorkersFetchFailureLabel(failure) {
    if (!failure) return 'Falha ao consultar o SPT — tentar novamente';
    if (failure.kind === 'session') {
      return 'Sessão do SPT expirada — faça login novamente';
    }
    const mes = failure.mes || 'período';
    const motivo = failure.reason || 'erro na consulta';
    return `Falha ao consultar o SPT (${mes}): ${motivo} — tentar novamente`;
  }

  function populateWorkerDropdown() {
    const sel = overlay.querySelector('#je-spt-rep-worker-select');
    if (!sel) return;
    sel.replaceChildren();

    if (loadingWorkers) {
      const opt = document.createElement('option');
      opt.value = '__ALL__';
      opt.textContent = 'Carregando prestadores da unidade...';
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    if (!workersList.length) {
      const opt = document.createElement('option');
      opt.value = '';
      if (workersFetchStatus.sessionExpired) {
        opt.textContent = 'Sessão do SPT expirada — faça login novamente';
      } else if (workersFetchStatus.failures && workersFetchStatus.failures.length > 0) {
        opt.textContent = formatWorkersFetchFailureLabel(workersFetchStatus.failures[0]);
      } else {
        opt.textContent = 'Nenhum prestador encontrado para esta unidade/contrato';
      }
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = running;
    const optAll = document.createElement('option');
    optAll.value = '__ALL__';
    const partialSuffix = (workersFetchStatus.failures && workersFetchStatus.failures.length > 0)
      ? ` — lista parcial (${workersFetchStatus.failures.map((f) => f.mes).join(', ')} falhou)`
      : '';
    optAll.textContent = `Todos os prestadores (${workersList.length})${partialSuffix}`;
    sel.appendChild(optAll);

    workersList.forEach((w) => {
      const opt = document.createElement('option');
      opt.value = w.codigo;
      opt.textContent = `${w.nome} (${w.numContrato || 'Contrato'})`;
      sel.appendChild(opt);
    });

    syncSingleWorkerDropdownFromCheckboxes();
  }

  function bindRetryButton(containerEl) {
    if (!containerEl || !containerEl.querySelector) return;
    const retryBtn = containerEl.querySelector('[data-spt-retry-workers]');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        refreshWorkersList();
      });
    }
  }

  function paintWorkersSummary() {
    const summaryEl = overlay.querySelector('#je-spt-rep-team-summary');
    const runBtn = overlay.querySelector('#je-spt-rep-run');
    if (!summaryEl) return;
    if (loadingWorkers) {
      summaryEl.textContent = 'Prestadores: consultando unidade no SPT…';
      if (runBtn) runBtn.disabled = true;
      return;
    }
    const checkedCount = workersList.filter((w) => w.checked).length;
    const failures = (workersFetchStatus && workersFetchStatus.failures) || [];

    if (!workersList.length) {
      if (workersFetchStatus && workersFetchStatus.sessionExpired) {
        setSafeHTML(
          summaryEl,
          'Prestadores: <strong class="je-spt-neg">Sessão do SPT expirada — faça login novamente</strong>'
        );
      } else if (failures.length > 0) {
        const first = failures[0];
        setSafeHTML(
          summaryEl,
          `Prestadores: <strong class="je-spt-neg">Falha ao consultar o SPT (${escapeHTML(first.mes || 'período')}): ${escapeHTML(first.reason || 'erro')} — tentar novamente</strong>`
        );
      } else {
        setSafeHTML(
          summaryEl,
          'Prestadores: <strong>Nenhum prestador encontrado</strong> (<strong>0</strong> nesta unidade/contrato)'
        );
      }
      if (runBtn) runBtn.disabled = true;
      return;
    }

    const partialWarning = failures.length > 0
      ? ` · <span class="je-spt-neg">Aviso: lista parcial (falha em ${escapeHTML(failures.map((f) => `${f.mes}: ${f.reason}`).join('; '))})</span>`
      : '';

    setSafeHTML(
      summaryEl,
      `Prestadores: <strong>${checkedCount}</strong> de <strong>${workersList.length}</strong> selecionado(s)${partialWarning} · clique para filtrar ou marcar individualmente`
    );
    if (runBtn) runBtn.disabled = running || checkedCount === 0;
  }

  function paintWorkersList() {
    const listEl = overlay.querySelector('#je-spt-rep-team-list');
    if (!listEl) return;
    const failures = (workersFetchStatus && workersFetchStatus.failures) || [];

    if (!workersList.length) {
      if (workersFetchStatus && workersFetchStatus.sessionExpired) {
        setSafeHTML(
          listEl,
          '<div class="je-spt-worker-empty je-spt-worker-error"><strong>Sessão do SPT expirada — faça login novamente.</strong></div>'
        );
      } else if (failures.length > 0) {
        const msg = failures.map((f) => `Falha ao consultar o SPT (${escapeHTML(f.mes || 'período')}): ${escapeHTML(f.reason || 'erro')}`).join('<br>');
        setSafeHTML(
          listEl,
          `<div class="je-spt-worker-empty je-spt-worker-error"><span>${msg}</span> <button type="button" class="je-audit-btn" id="je-spt-rep-retry-workers" data-spt-retry-workers="1">Tentar novamente</button></div>`
        );
        bindRetryButton(listEl);
      } else {
        setSafeHTML(
          listEl,
          '<div class="je-spt-worker-empty">Nenhum prestador encontrado para esta unidade/contrato no período informado.</div>'
        );
      }
      paintWorkersSummary();
      return;
    }

    const q = calc().normalizeText(workerSearchQuery);
    const visible = workersList.filter((w) => {
      if (!q) return true;
      return calc().normalizeText(`${w.nome} ${w.cpf} ${w.numContrato}`).includes(q);
    });

    const partialBanner = failures.length > 0
      ? `<div class="je-spt-worker-partial-warn">Lista parcial: falha ao consultar o SPT em ${failures.map((f) => `<strong>${escapeHTML(f.mes)}</strong> (${escapeHTML(f.reason)})`).join(', ')}. <button type="button" class="je-audit-btn" id="je-spt-rep-retry-workers" data-spt-retry-workers="1">Tentar novamente</button></div>`
      : '';

    const html = visible.map((w) => `
      <label class="je-recog-team-item je-spt-worker-item" title="${escapeHTML(w.nome)} · CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato)}">
        <input type="checkbox" data-codigo="${escapeHTML(w.codigo)}"${w.checked ? ' checked' : ''}${running ? ' disabled' : ''}>
        <span class="je-spt-worker-name">${escapeHTML(w.nome)}</span>
        <small class="je-spt-worker-contract">${escapeHTML(w.numContrato || '')}</small>
      </label>
    `).join('');

    setSafeHTML(listEl, partialBanner + (html || '<div class="je-spt-worker-empty">Nenhum prestador corresponde ao filtro digitado.</div>'));
    bindRetryButton(listEl);
    paintWorkersSummary();
  }

  async function refreshWorkersList() {
    if (!overlay) return;
    const unitId = unitWidget ? unitWidget.getValue() : '';
    const contrato = overlay.querySelector('#je-spt-rep-contrato')?.value || '';
    const fromIso = overlay.querySelector('#je-spt-rep-from')?.value || '';
    const toIso = overlay.querySelector('#je-spt-rep-to')?.value || '';
    const buscarAbaixo = !!overlay.querySelector('#je-spt-rep-subunits')?.checked;

    if (!unitId) {
      workersList = [];
      workersFetchStatus = { state: 'ok', failures: [], sessionExpired: false, queriedMonths: 0 };
      populateWorkerDropdown();
      paintWorkersList();
      return;
    }

    loadingWorkers = true;
    populateWorkerDropdown();
    paintWorkersSummary();

    try {
      const res = await fetchWorkersByUnitAndContract(unitId, contrato, fromIso, toIso, buscarAbaixo);
      const fetchedWorkers = Array.isArray(res) ? res : (res && Array.isArray(res.workers) ? res.workers : []);
      const failures = (!Array.isArray(res) && res && Array.isArray(res.failures)) ? res.failures : [];
      const sessionExpired = Boolean(!Array.isArray(res) && res && res.sessionExpired);
      const queriedMonths = (!Array.isArray(res) && res && typeof res.queriedMonths === 'number') ? res.queriedMonths : 1;

      workersList = fetchedWorkers.map((w) => Object.assign({}, w, { checked: true }));
      selectedSingleWorkerCode = '__ALL__';
      workersFetchStatus = {
        state: sessionExpired ? 'session' : (failures.length > 0 ? (workersList.length > 0 ? 'partial' : 'error') : 'ok'),
        failures,
        sessionExpired,
        queriedMonths
      };

      if (sessionExpired) {
        showValidationMessage('Sessão do SPT expirada — faça login novamente.');
      } else if (failures.length > 0 && workersList.length === 0) {
        const f = failures[0];
        showValidationMessage(`Falha ao consultar o SPT (${f.mes || 'período'}): ${f.reason || 'erro'} — tentar novamente.`, { showRetry: true });
      } else if (failures.length > 0 && workersList.length > 0) {
        const failedMonths = failures.map((f) => `${f.mes} (${f.reason})`).join(', ');
        showValidationMessage(`Lista parcial de prestadores: falha ao consultar o SPT em ${failedMonths} — tentar novamente.`, { showRetry: true });
      } else {
        const currentValMsg = overlay.querySelector('#je-spt-rep-validation')?.textContent || '';
        if (/Falha ao consultar o SPT|Sessão do SPT expirada|Lista parcial de prestadores/i.test(currentValMsg)) {
          showValidationMessage('');
        }
      }
    } catch (e) {
      console.warn('[TSE XT] Falha ao carregar prestadores da unidade:', e);
      workersList = [];
      const reason = (e && e.message) ? e.message : 'erro de rede';
      workersFetchStatus = {
        state: 'error',
        failures: [{ kind: 'http', mes: 'período', reason }],
        sessionExpired: false,
        queriedMonths: 1
      };
      showValidationMessage(`Falha ao consultar o SPT (período): ${reason} — tentar novamente.`, { showRetry: true });
    } finally {
      loadingWorkers = false;
      populateWorkerDropdown();
      paintWorkersList();
      markDirtySelection();
    }
  }

  function showValidationMessage(message, options = {}) {
    if (!overlay) return;
    const box = overlay.querySelector('#je-spt-rep-validation');
    if (!box) return;
    if (!message) {
      box.textContent = '';
      box.hidden = true;
      return;
    }
    if (options && options.showRetry) {
      setSafeHTML(
        box,
        `<span>${escapeHTML(String(message))}</span> <button type="button" class="je-audit-btn" data-spt-retry-workers="1">Tentar novamente</button>`
      );
      bindRetryButton(box);
    } else {
      box.textContent = String(message);
    }
    box.hidden = false;
  }

  function markDirtySelection() {
    if (!overlay) return;
    const checkedCount = workersList.filter((w) => w.checked).length;
    if (checkedCount > 0 && overlay.querySelector('#je-spt-rep-validation')?.textContent === 'Selecione ao menos um prestador.') {
      showValidationMessage('');
    }
    overlay.querySelector('#je-spt-rep-run').disabled = running || loadingWorkers || checkedCount === 0;
  }

  function setProgress(done, total, text) {
    const fill = overlay.querySelector('#je-spt-rep-progress-fill');
    const label = overlay.querySelector('#je-spt-rep-progress-label');
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${text} (${done}/${total} · ${pct}%)`;
  }

  function toggleProgress(on) {
    overlay.querySelector('#je-spt-rep-progress').hidden = !on;
    overlay.querySelector('#je-spt-rep-run').disabled = on;
    overlay.querySelector('#je-spt-rep-from').disabled = on;
    overlay.querySelector('#je-spt-rep-to').disabled = on;
    overlay.querySelector('#je-spt-rep-contrato').disabled = on;
    overlay.querySelector('#je-spt-rep-worker-select').disabled = on;
    overlay.querySelector('#je-spt-rep-subunits').disabled = on;
    const clearBtn = overlay.querySelector('#je-spt-rep-clear');
    if (clearBtn) clearBtn.disabled = on || !currentResult;
    if (unitWidget) unitWidget.setDisabled(on);
    syncHomeOfficeCheckboxState();
  }

  async function runReport() {
    if (running || loadingWorkers) return;
    const unit = unitWidget ? unitWidget.getSelectedUnit() : null;
    const fromIso = overlay.querySelector('#je-spt-rep-from').value;
    const toIso = overlay.querySelector('#je-spt-rep-to').value;
    const contrato = overlay.querySelector('#je-spt-rep-contrato').value;
    const contratoText = contrato
      ? (overlay.querySelector('#je-spt-rep-contrato option:checked')?.textContent || contrato)
      : 'Todos os contratos';
    const buscarAbaixo = !!overlay.querySelector('#je-spt-rep-subunits').checked;
    const picked = workersList.filter((w) => w.checked);

    if (!unit || !unit.id) {
      showValidationMessage('Selecione a Unidade para gerar o relatório.');
      return;
    }
    const slices = calc().splitDateRangeByMonth(fromIso, toIso);
    if (!slices.length) {
      showValidationMessage('Informe um período válido (data inicial menor ou igual à data final).');
      return;
    }
    if (!picked.length) {
      showValidationMessage('Selecione ao menos um prestador.');
      return;
    }

    showValidationMessage('');
    running = true;
    aborted = false;
    expandedMonthlyRows.clear();
    savePrefs();
    toggleProgress(true);

    const totalSteps = picked.length * slices.length;
    let doneSteps = 0;
    let loggedOut = false;
    const failures = [];
    const workersOut = [];

    for (const w of picked) {
      if (aborted || loggedOut) break;
      const wEntry = {
        codigo: w.codigo,
        matricula: w.matricula,
        cpf: w.cpf,
        codTse: w.codTse || w.cpf,
        contrato: w.contrato,
        numContrato: w.numContrato,
        nome: w.nome,
        empresa: '',
        months: []
      };

      let runningStreak = 0;
      let prevDateIso = '';

      for (const slice of slices) {
        if (aborted) break;
        setProgress(doneSteps, totalSteps, `${w.nome} · ${slice.periodoDescricao}`);
        try {
          const res = await fetchWorkerMonthSlice(w, slice, unit.id, buscarAbaixo, {
            presumeHomeOffice,
            deductAutoLunchOnSpecialDays,
            customHolidays: customHolidaysText,
            initialStreak: runningStreak,
            prevDateIso
          });
          if (res.loggedOut) {
            loggedOut = true;
            failures.push(`${w.nome} — ${slice.periodoDescricao}: falha na consulta (sessão expirada no SPT)`);
            wEntry.months.push(createFailedMonthSummary(slice, 'sessão expirada no SPT'));
            break;
          }
          if (res.error) {
            failures.push(`${w.nome} — ${slice.periodoDescricao}: falha na consulta (${res.error})`);
            wEntry.months.push(createFailedMonthSummary(slice, res.error));
            runningStreak = 0;
            prevDateIso = '';
          } else {
            if (res.meta && res.meta.contrato && !wEntry.empresa) {
              wEntry.empresa = res.meta.contrato;
            }
            wEntry.months.push(res.summary);
            runningStreak = res.summary.endingStreak || 0;
            prevDateIso = res.summary.endingDateIso || '';
          }
        } catch (err) {
          const reason = (err && err.message) ? err.message : 'erro de rede';
          console.warn('[TSE XT] Erro ao consultar prestador no SPT:', w.nome, slice.periodoDescricao, err);
          failures.push(`${w.nome} — ${slice.periodoDescricao}: falha na consulta (${reason})`);
          wEntry.months.push(createFailedMonthSummary(slice, reason));
          runningStreak = 0;
          prevDateIso = '';
        }
        doneSteps += 1;
        await sleep(FETCH_THROTTLE_MS);
      }

      wEntry.totals = calc().summarizeWorkerMonths(wEntry.months.filter((m) => !m.fetchError));
      workersOut.push(wEntry);
    }

    const report = {
      version: 4,
      generatedAt: new Date().toISOString(),
      issuer: loggedUserName(),
      unitId: unit.id,
      unitName: unit.cleanName,
      unitPath: unit.parentPath,
      buscarAbaixo,
      presumeHomeOffice,
      deductAutoLunchOnSpecialDays,
      customHolidays: customHolidaysText,
      fromIso,
      toIso,
      fromBr: calc().isoToBr(fromIso),
      toBr: calc().isoToBr(toIso),
      contrato,
      contratoLabel: contratoText,
      partial: aborted || loggedOut || failures.length > 0,
      failures,
      workers: workersOut,
      unitTotals: calc().summarizeUnitReport(workersOut)
    };

    currentResult = report;
    await saveStoredReport(report);

    running = false;
    toggleProgress(false);
    renderResult(report, { loggedOut, aborted });
  }

  function renderBadgesHTML(alertsObj) {
    if (!alertsObj) return '<span class="je-spt-badge-ok" title="Nenhuma ocorrência ou alerta trabalhista identificado no período">Regular</span>';
    const badges = [];
    if (alertsObj.homeOfficeDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-info" title="Dias úteis sem marcação na catraca contabilizados como Home Office presumido (8h)">HO presumido (${alertsObj.homeOfficeDays}d)</span>`);
    }
    if (!presumeHomeOffice && alertsObj.weekdaysWithoutRecord > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-neutral" title="Dias úteis sem batida na catraca e sem justificativa lançada no SPT (não geram débito automático com Home Office desligado)">Sem registro (${alertsObj.weekdaysWithoutRecord}d)</span>`);
    }
    if (alertsObj.dsrAlertDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-warn" title="Trabalho em domingo / >6 dias consecutivos sem folga identificada (CLT art. 67; OJ 410 TST). Alerta de fiscalização: não altera os totais">Dom / &gt;6d s/ folga (${alertsObj.dsrAlertDays}d)</span>`);
    }
    if (alertsObj.intervaloCurtoDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-warn" title="Dias com intervalo de almoço registrado inferior a 1h (ajustado para 1h conforme art. 71 da CLT)">Almoço &lt;1h (${alertsObj.intervaloCurtoDays}d)</span>`);
    }
    if (alertsObj.almocoAutoDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-info" title="Dias com jornada &gt;6h e apenas 2 batidas (1h de almoço descontada automaticamente)">Almoço 1h auto (${alertsObj.almocoAutoDays}d)</span>`);
    }
    if (alertsObj.acima2hExtraDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-danger" title="Dias úteis com mais de 2h excedentes além da jornada de 8h (limite do art. 59 da CLT)">&gt;2h úteis (${alertsObj.acima2hExtraDays}d)</span>`);
    }
    if (alertsObj.batidaImparDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-warn" title="Dias com número ímpar de batidas na catraca">Batida ímpar (${alertsObj.batidaImparDays}d)</span>`);
    }
    if (alertsObj.fdsDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-neutral" title="Dias trabalhados em sábado, domingo ou feriado (HE 100%)">FDS/Fer (${alertsObj.fdsDays}d)</span>`);
    }
    return badges.length ? badges.join(' ') : '<span class="je-spt-badge-ok" title="Nenhuma ocorrência ou alerta trabalhista identificado no período">Regular</span>';
  }

  function renderDayAlertsHTML(day) {
    const parts = [];
    if (day.justificativa) {
      parts.push(`<span class="je-spt-just-tag" title="Justificativa registrada no SPT: ${escapeHTML(day.justificativa)}">${escapeHTML(day.justificativa)}</span>`);
    }
    (day.alerts || []).forEach((a) => {
      const tone = a.code === 'acima-2h-extra'
        ? 'danger'
        : (a.code === 'intervalo-curto' || a.code === 'batida-impar' || a.code === 'dsr-alerta'
          ? 'warn'
          : (a.code === 'sem-registro' || a.code === 'feriado' ? 'neutral' : 'info'));
      parts.push(`<span class="je-occ-perda je-occ-perda-${tone}" title="${escapeHTML(a.tip)}">${escapeHTML(a.label)}</span>`);
    });
    return parts.join(' ') || '<span title="Sem ocorrências ou alertas neste dia">·</span>';
  }

  function formatDaysCell(m) {
    const presU = m.workedWeekdays || 0;
    const ho = m.homeOfficeDays || 0;
    const fds = m.workedWeekendDays || 0;
    const parts = [`${presU}u`];
    if (ho > 0) parts.push(`${ho}ho`);
    parts.push(`${fds}f`);
    return `<strong>${m.workedDays}d</strong><br><small>${parts.join(' + ')}</small>`;
  }

  // ---------------------------------------------------------------------------
  // ANEXO DE INTERPRETAÇÃO, FÓRMULAS E REGRAS DE APURAÇÃO
  // ---------------------------------------------------------------------------
  function renderInterpretationAnnexHTML(report = currentResult, isPrint = false) {
    const annexClass = isPrint ? 'je-print-annex' : 'je-spt-annex';
    const isRaw = calcMode === 'spt_puro';
    const fromIso = (report && report.fromIso) || overlay?.querySelector('#je-spt-rep-from')?.value || '';
    const toIso = (report && report.toIso) || overlay?.querySelector('#je-spt-rep-to')?.value || '';
    const activeHolidays = calc().listAppliedHolidaysInRange(fromIso, toIso, customHolidaysText);
    const holidaysSummaryHTML = activeHolidays.length > 0
      ? activeHolidays.map((h) => `<code>${escapeHTML(h.dateBr)}</code> (${escapeHTML(h.name)})`).join(' · ')
      : 'Nenhum feriado civil/distrital no período consultado';
    const customHolidaysNote = customHolidaysText
      ? ` <small>(Personalização aplicada: <code>${escapeHTML(customHolidaysText)}</code>)</small>`
      : ' <small>(Padrão CLT + Sexta-feira Santa + 30/11 DF; sem feriados forenses 11/08, 01/11 e 08/12)</small>';

    return `
      <section class="${annexClass}" aria-label="Anexo de Interpretação do Relatório">
        <div class="je-spt-annex-header">
          <h3 class="je-spt-annex-title">Anexo — Guia de Interpretação, Parâmetros Ativos, Fórmulas e Regras de Apuração</h3>
          <p class="je-spt-annex-lead">
            Este guia registra os parâmetros ativos nesta emissão, o significado de cada coluna do relatório e a distinção entre as regras do cartão ponto da empresa e a visão analítica de fiscalização do TSE XT.
          </p>
        </div>

        <div class="je-spt-annex-table-wrap">
          <table class="je-spt-annex-table">
            <thead>
              <tr>
                <th colspan="2">Parâmetros Ativos nesta Apuração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Modo de cálculo</strong></td>
                <td>${isRaw ? '<strong>SPT Puro (Dados Brutos)</strong> — exibe exclusivamente as batidas e a soma da coluna Total da catraca do SPT.' : '<strong>TSE XT / Digi</strong> — aplica jornada CLT de 8h/dia útil, tolerância legal e separação entre Banco de Horas (50%) e HE 100%.'}</td>
              </tr>
              <tr>
                <td><strong>Home Office presumido (8h)</strong></td>
                <td>${presumeHomeOffice ? '<strong>Ativado pelo usuário</strong> — todo dia útil sem batida e sem justificativa até a data local atual recebe 08:00 de jornada ordinária presumida (destacado visualmente).' : '<strong>Desligado (padrão de fiscalização)</strong> — dias úteis sem catraca e sem justificativa aparecem na coluna <em>Dias úteis sem registro</em>, sem gerar batida nem débito automático.'}</td>
              </tr>
              <tr>
                <td><strong>Desconto de 1h de intervalo em Sáb/Dom/Feriado (&gt;6h, 1 par)</strong></td>
                <td>${deductAutoLunchOnSpecialDays ? '<strong>Ativado (padrão CLT art. 71 / SPT)</strong> — plantões de fim de semana ou feriado superiores a 6h com apenas 1 par de batidas descontam 01:00 de intervalo intrajornada.' : '<strong>Desligado (reproduz cartão Digisystem)</strong> — plantões de Sáb/Dom/Feriado com apenas 1 par de batidas mantêm a duração bruta entre entrada e saída, sem descontar 1h de intervalo não batido.'}</td>
              </tr>
              <tr>
                <td><strong>Tolerância nos dias úteis</strong></td>
                <td><strong>±10 minutos/dia</strong> (CLT art. 58, § 1º — variações entre <code>07:50</code> e <code>08:10</code> contam como jornada normal de <code>08:00</code>, sem gerar HE 50% nem Débito BH).</td>
              </tr>
              <tr>
                <td><strong>Feriados aplicados no período (${escapeHTML(calc().isoToBr(fromIso))} a ${escapeHTML(calc().isoToBr(toIso))})</strong></td>
                <td>${holidaysSummaryHTML}${customHolidaysNote}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="je-spt-annex-highlight" title="Esclarecimento sobre a separação de adicionais no cartão da empresa vs. soma indicativa do TSE XT">
          <strong>Independência entre Saldo BH (Úteis 50%) e HE 100% (FDS) vs. Visão TSE XT</strong>
          <p>
            No Cartão Ponto da empresa (Digisystem), o <strong>Saldo BH (Úteis) = HE 50% − Débito BH</strong> e as <strong>HE 100% (FDS)</strong> são mantidos em colunas <strong>independentes</strong>: a empresa não consome automaticamente as horas extras 100% com débitos de dias úteis (50%), pois possuem adicionais e naturezas distintas.
          </p>
          <p>
            Para apoiar o fiscal que deseja verificar o balanço global de horas caso os débitos remanescentes de jornada normal sejam confrontados com o total de horas extras, a última coluna numérica — <strong>Visão TSE XT: Saldo BH + HE 100% (não é regra da empresa)</strong> — apresenta a soma aritmética simples (1:1) de <code>Saldo BH (Úteis) + HE 100%</code>. <strong>Atenção:</strong> essa coluna mistura horas de adicional 50% com horas de adicional 100% sem ponderação financeira e serve exclusivamente como indicador gerencial do TSE XT.
          </p>
        </div>

        <div class="je-spt-annex-table-wrap">
          <table class="je-spt-annex-table">
            <thead>
              <tr>
                <th>Coluna / Indicador</th>
                <th>Fórmula / Origem</th>
                <th>O que significa e como interpretar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Dias</strong><br><small><code>u + ho + f</code></small></td>
                <td><code>u + ho + f</code></td>
                <td>
                  Total de dias trabalhados/contabilizados no mês, detalhado por sigla:
                  <strong><code>u</code></strong> = dias úteis presenciais (com batida na catraca);
                  <strong><code>ho</code></strong> = dias úteis em <em>Home Office presumido (8h)</em> (quando a opção está ligada);
                  <strong><code>f</code></strong> = sábados, domingos ou feriados trabalhados.
                </td>
              </tr>
              <tr>
                <td><strong>Dias úteis sem registro</strong></td>
                <td>Contagem de dias úteis sem catraca e sem justificativa</td>
                <td>Exibe quantos dias úteis (Seg–Sex) não tiveram nenhuma batida na catraca nem justificativa lançada no SPT. Com o <em>Home Office presumido</em> desligado (padrão), esses dias ficam visíveis nesta coluna para fiscalização e não geram débito automático.</td>
              </tr>
              <tr>
                <td><strong>Total SPT</strong></td>
                <td>Soma bruta da catraca</td>
                <td>Soma aritmética pura da coluna <em>Total</em> retornada pelo sistema SPT do TSE (apenas intervalos entre entradas e saídas físicas na catraca).</td>
              </tr>
              <tr>
                <td><strong>Trab. CLT</strong><br><small>(ou <em>Líq. CLT</em>)</small></td>
                <td><code>H. Normais + HE 50% + HE 100% − Débito BH</code></td>
                <td>Total líquido de horas trabalhadas segundo as regras configuradas (horas presenciais com dedução mínima de 1h de almoço em turnos &gt; 6h + horas de Home Office quando habilitado).</td>
              </tr>
              <tr>
                <td><strong>H. Normais</strong></td>
                <td><code>Dias Úteis Ativos × 08:00</code><br><small>(ajustado pela tolerância)</small></td>
                <td>Horas ordinárias cumpridas dentro da jornada contratual de <strong>08:00/dia</strong> de segunda a sexta-feira, respeitada a tolerância legal de ±10 min/dia.</td>
              </tr>
              <tr>
                <td><strong>HE 50% (BH)</strong></td>
                <td>Excedente em dia útil (até 2h/dia)</td>
                <td>Horas extras realizadas de segunda a sexta-feira além das 08:00 diárias (quando a variação positiva supera 10 minutos no dia), limitadas a 2h extras por dia útil (art. 59 da CLT). Corresponde a <em>Créditos BH (50%)</em> do cartão ponto da empresa.</td>
              </tr>
              <tr>
                <td><strong>Débito BH</strong></td>
                <td>Falta para 08:00 em dia útil (&gt; 10 min)</td>
                <td>Horas faltantes para completar a jornada ordinária de 08:00 nos dias úteis com batida em que o colaborador trabalhou menos de 07:50. Corresponde a <em>Débito BH</em> do cartão ponto da empresa.</td>
              </tr>
              <tr>
                <td><strong>Saldo BH (Úteis)</strong></td>
                <td><code>HE 50% (BH) − Débito BH</code></td>
                <td>Balanço líquido exclusivo dos dias úteis (Seg–Sex), idêntico ao fechamento de Banco de Horas 50% da empresa.</td>
              </tr>
              <tr>
                <td><strong>HE 100% (FDS)</strong></td>
                <td>100% de Sáb/Dom/Fer + excedente &gt; 2h útil</td>
                <td>Horas extras com adicional de 100% (mantidas separadas no cartão da empresa): inclui 100% das horas trabalhadas em Sábados, Domingos e Feriados (jornada ordinária <code>00:00</code>) mais eventual parcela acima de 2h extras em dia útil.</td>
              </tr>
              <tr>
                <td><strong>Visão TSE XT: Saldo BH + HE 100%</strong><br><small>(não é regra da empresa)</small></td>
                <td><code>Saldo BH (Úteis) + HE 100%</code></td>
                <td>Indicador analítico exclusivo do TSE XT que soma em proporção 1:1 o Saldo BH de dias úteis (50%) e as HE 100% para evidenciar se eventuais débitos de jornada normal superam as horas extras realizadas. <strong>Não é regra da empresa</strong>, pois mistura adicionais de 50% e 100%.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="je-spt-annex-rules">
          <div class="je-spt-annex-rule-card">
            <strong>1. Tolerância Legal (±10 min/dia — CLT art. 58 §1º)</strong>
            <p>Nos dias úteis (jornada de 08:00), variações de até 10 minutos para mais ou para menos (entre <code>07:50</code> e <code>08:10</code>) não geram Hora Extra nem Débito BH, sendo contabilizadas como jornada ordinária cumprida.</p>
          </div>
          <div class="je-spt-annex-rule-card">
            <strong>2. Intervalo de Almoço (Mín. 1h — CLT art. 71)</strong>
            <p>Em jornadas contínuas superiores a 6 horas, aplica-se o intervalo mínimo de <code>01:00</code>. Nos Sábados, Domingos e Feriados com apenas 2 batidas (&gt;6h), a chave <em>Descontar 1h de intervalo</em> vem ligada por padrão (CLT/SPT) e pode ser desligada para reproduzir o cartão Digisystem.</p>
          </div>
          <div class="je-spt-annex-rule-card">
            <strong>3. Feriados Civis e Distritais (Sem Feriados Forenses por Padrão)</strong>
            <p>A lista padrão contempla os feriados nacionais civis, a <strong>Sexta-feira Santa</strong> (calculada pela Páscoa) e <strong>30/11</strong> (DF). Feriados forenses (<code>11/08</code>, <code>01/11</code> e <code>08/12</code>) não se aplicam por padrão às empresas contratadas, mas a lista é totalmente editável no filtro <em>Feriados (+/-)</em>.</p>
          </div>
          <div class="je-spt-annex-rule-card">
            <strong>4. Alerta de Trabalho em Domingo / &gt;6 Dias Consecutivos (CLT art. 67; OJ 410 TST)</strong>
            <p>O relatório não escolhe dias fictícios de folga compensatória: sempre que identifica trabalho em domingo ou mais de 6 dias consecutivos trabalhados (inclusive na virada entre meses consecutivos), emite o alerta <strong>Trabalho em domingo / &gt;6 dias consecutivos sem folga identificada</strong> sem alterar nenhum total.</p>
          </div>
        </div>
      </section>
    `;
  }

  // ---------------------------------------------------------------------------
  // MODO 1: SPT PURO (DADOS BRUTOS)
  // ---------------------------------------------------------------------------
  function renderDailyMirrorRawTableHTML(monthSummary) {
    const days = showOnlyActiveDaysInDaily
      ? monthSummary.days.filter((d) => d.sptTotalMin > 0 || d.punchCount > 0 || d.justificativa)
      : monthSummary.days;

    if (!days.length) {
      return '<div class="je-recog-days-none">Nenhum dia com marcação de ponto neste mês.</div>';
    }

    const rowsHTML = days.map((d) => {
      const p = d.punches || [];
      const rowClass = [
        d.isWeekend ? 'je-spt-row-weekend' : '',
        (d.sptTotalMin > 0 || d.punchCount > 0) ? 'je-spt-row-worked' : 'je-spt-row-empty'
      ].filter(Boolean).join(' ');

      return `<tr class="${rowClass}">
        <td title="Data da frequência: ${escapeHTML(d.date)} (${escapeHTML(d.dayLabel)})"><strong>${escapeHTML(d.date)}</strong></td>
        <td title="Dia da semana: ${escapeHTML(d.dayLabel)}${d.isWeekend ? ' (Fim de semana)' : ' (Dia útil)'}">${escapeHTML(d.dayLabel)}</td>
        <td title="1ª marcação de Entrada registrada na catraca do SPT">${escapeHTML(p[0] || '·')}</td>
        <td title="1ª marcação de Saída registrada na catraca do SPT">${escapeHTML(p[1] || '·')}</td>
        <td title="2ª marcação de Entrada registrada na catraca do SPT">${escapeHTML(p[2] || '·')}</td>
        <td title="2ª marcação de Saída registrada na catraca do SPT">${escapeHTML(p[3] || '·')}</td>
        <td title="3ª marcação de Entrada registrada na catraca do SPT">${escapeHTML(p[4] || '·')}</td>
        <td title="3ª marcação de Saída registrada na catraca do SPT">${escapeHTML(p[5] || '·')}</td>
        <td class="je-spt-col-left" title="${d.justificativa ? 'Justificativa registrada no SPT: ' + escapeHTML(d.justificativa) : 'Sem justificativa lançada no SPT neste dia'}">${d.justificativa ? `<span class="je-spt-just-tag">${escapeHTML(d.justificativa)}</span>` : '·'}</td>
        <td title="Total bruto de horas calculado pelo SPT em ${escapeHTML(d.date)}: ${d.sptTotalMin ? fmt(d.sptTotalMin) : '00:00'}"><strong>${d.sptTotalMin ? fmt(d.sptTotalMin) : '·'}</strong></td>
      </tr>`;
    }).join('');

    const m = monthSummary;
    const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
    return `
      <table class="je-recog-days je-spt-daily-table">
        <thead>
          <tr>
            <th title="Data do registro diário (DD/MM/AAAA)">Data</th>
            <th title="Dia da semana">Dia</th>
            <th title="1ª marcação de Entrada na catraca do SPT">Ent. 1</th>
            <th title="1ª marcação de Saída na catraca do SPT">Saí. 1</th>
            <th title="2ª marcação de Entrada na catraca do SPT">Ent. 2</th>
            <th title="2ª marcação de Saída na catraca do SPT">Saí. 2</th>
            <th title="3ª marcação de Entrada na catraca do SPT">Ent. 3</th>
            <th title="3ª marcação de Saída na catraca do SPT">Saí. 3</th>
            <th class="je-spt-col-left" title="Justificativa ou observação lançada diretamente no sistema SPT">Justificativa (SPT)</th>
            <th title="Total bruto de horas calculado pelo próprio SPT">Total SPT</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
        <tfoot>
          <tr class="je-recog-total">
            <td colspan="9" class="je-spt-col-left" title="Resumo bruto do mês ${escapeHTML(m.monthLabel)}"><strong>Total SPT Bruto (${escapeHTML(m.monthLabel)}) · ${presDays} dia(s) com marcação válida na catraca</strong></td>
            <td title="Soma bruta da coluna Total do SPT no mês: ${fmt(m.sptTotalMin)}"><strong>${fmt(m.sptTotalMin)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  function renderMonthlyRawTableHTML(report) {
    const rows = [];
    report.workers.forEach((w, wIdx) => {
      w.months.forEach((m, mIdx) => {
        if (m.fetchError) {
          rows.push(`
            <tr class="je-audit-row je-recog-server je-spt-row-error">
              <td class="je-spt-col-left">
                <strong>${escapeHTML(w.nome)}</strong>
                <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
              </td>
              <td>${escapeHTML(m.monthLabel)}</td>
              <td colspan="6" class="je-spt-col-left"><span class="je-occ-perda je-occ-perda-danger" title="Mês não pôde ser consultado no SPT">${escapeHTML(w.nome)} — ${escapeHTML(m.monthLabel)}: falha na consulta (${escapeHTML(m.errorReason || 'erro')})</span></td>
            </tr>
          `);
          return;
        }
        const rowId = `${wIdx}:${mIdx}`;
        const isExpanded = expandedMonthlyRows.has(rowId);
        const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
        rows.push(`
          <tr class="je-audit-row je-recog-server" data-expand-row="${rowId}" role="button" tabindex="0" aria-expanded="${isExpanded}">
            <td class="je-spt-col-left" title="Clique para expandir ou recolher o espelho diário bruto de ${escapeHTML(w.nome)}">
              <span class="je-recog-caret">${isExpanded ? '▾' : '▸'}</span>
              <strong>${escapeHTML(w.nome)}</strong>
              <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
            </td>
            <td title="Mês de competência: ${escapeHTML(m.monthLabel)}">${escapeHTML(m.monthLabel)}</td>
            <td title="Total de dias com batida válida registrada na catraca do SPT">${presDays}d</td>
            <td title="Dias de segunda a sexta-feira com marcação na catraca">${m.workedWeekdays || 0}d</td>
            <td title="Sábados, domingos e feriados com marcação na catraca">${m.workedWeekendDays || 0}d</td>
            <td title="Dias com justificativa lançada no SPT">${m.justifiedDays || 0}d</td>
            <td title="Dias com número ímpar de batidas na catraca (marcação incompleta)">${(m.alerts && m.alerts.batidaImparDays) || 0}d</td>
            <td title="Soma aritmética bruta da coluna Total do SPT no mês"><strong>${fmt(m.sptTotalMin)}</strong></td>
          </tr>
        `);
        if (isExpanded) {
          rows.push(`
            <tr class="je-recog-daysrow">
              <td colspan="8">${renderDailyMirrorRawTableHTML(m)}</td>
            </tr>
          `);
        }
      });
    });

    const u = report.unitTotals;
    const uPres = u.presencialWorkedDays != null ? u.presencialWorkedDays : u.workedDays;
    rows.push(`
      <tr class="je-recog-total">
        <td class="je-spt-col-left" title="Soma consolidada de todos os prestadores listados"><strong>Total Bruto da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores c/ marcação)</strong></td>
        <td title="Total consolidado do período">—</td>
        <td title="Total de dias com registro na catraca na unidade"><strong>${uPres}d</strong></td>
        <td title="Total de dias úteis (Seg–Sex) com batida na catraca"><strong>${u.workedWeekdays || 0}d</strong></td>
        <td title="Total de sábados, domingos e feriados com batida na catraca"><strong>${u.workedWeekendDays || 0}d</strong></td>
        <td title="Total de dias com justificativa no SPT"><strong>${u.justifiedDays || 0}d</strong></td>
        <td title="Total de dias com batida ímpar na catraca"><strong>${(u.alerts && u.alerts.batidaImparDays) || 0}d</strong></td>
        <td title="Soma total bruta da coluna Total do SPT na unidade"><strong>${fmt(u.sptTotalMin)}</strong></td>
      </tr>
    `);

    return `
      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-recog-table je-spt-monthly-table">
          <thead>
            <tr>
              <th class="je-spt-col-left" title="Clique em qualquer prestador para abrir ou recolher o espelho bruto do SPT">Prestador / Contrato</th>
              <th title="Mês/Ano de competência">Mês</th>
              <th title="Total de dias com registro de frequência na catraca do SPT">Dias c/ Registro</th>
              <th title="Dias úteis (Seg–Sex) com marcação no SPT">Seg–Sex</th>
              <th title="Sábados, domingos e feriados com marcação no SPT">Sáb/Dom/Fer</th>
              <th title="Dias com justificativa lançada no SPT">Justificados</th>
              <th title="Dias com quantidade ímpar de batidas na catraca">Batidas Ímpares</th>
              <th title="Soma pura da coluna Total retornada pelo SPT">Total de Horas (SPT)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
      <p class="je-audit-foot">Modo <strong>SPT Puro (Bruto)</strong>: exibe estritamente as marcações de catraca e a soma da coluna <em>Total</em> do SPT, sem cálculos interpretativos.</p>
    `;
  }

  // ---------------------------------------------------------------------------
  // MODO 2: TSE XT / DIGI (REGRAS CLT / DIGISYSTEM — PADRÃO)
  // ---------------------------------------------------------------------------
  function renderDailyMirrorTableHTML(monthSummary) {
    if (calcMode === 'spt_puro') {
      return renderDailyMirrorRawTableHTML(monthSummary);
    }

    const days = showOnlyActiveDaysInDaily
      ? monthSummary.days.filter((d) => d.isWorkedDay || d.punchCount > 0 || d.justificativa)
      : monthSummary.days;

    if (!days.length) {
      return '<div class="je-recog-days-none">Nenhum dia com marcação de ponto neste mês.</div>';
    }

    const rowsHTML = days.map((d) => {
      const p = d.punches || [];
      const lunchLabel = d.isPresencialWorkedDay
        ? (d.lunchMode === 'auto-1h'
          ? `${fmt(d.effectiveLunchMin)} (auto)`
          : (d.lunchMode === 'adjusted-1h'
            ? `${fmt(d.measuredLunchMin)} → 01:00`
            : (d.lunchMode === 'special-no-deduct'
              ? '00:00 (s/ desc.)'
              : (d.effectiveLunchMin > 0 ? fmt(d.effectiveLunchMin) : '—'))))
        : '·';
      const lunchTip = d.isPresencialWorkedDay
        ? (d.lunchMode === 'auto-1h'
          ? 'Turnos contínuos > 6h com apenas 1 par de batidas: dedução automática de 01:00 de almoço (CLT art. 71)'
          : (d.lunchMode === 'adjusted-1h'
            ? `Intervalo registrado na catraca (${fmt(d.measuredLunchMin)}) inferior a 1h em jornada > 6h: ajustado para o mínimo legal de 01:00 (CLT art. 71)`
            : (d.lunchMode === 'special-no-deduct'
              ? 'Opção de descontar 1h de intervalo em Sáb/Dom/Feriado desligada: mantido o tempo bruto entre entrada e saída (reproduz cartão Digisystem)'
              : (d.effectiveLunchMin > 0
                ? `Intervalo de almoço medido entre Saída 1 e Entrada 2: ${fmt(d.effectiveLunchMin)}`
                : 'Jornada presencial até 6h sem intervalo intrajornada de almoço'))))
        : (d.isHomeOfficeDay ? 'Dia em Home Office presumido (jornada líquida de 08:00)' : 'Sem intervalo de almoço contabilizado');

      const rowClass = [
        d.isSpecialDay ? 'je-spt-row-weekend' : '',
        d.isHomeOfficeDay ? 'je-spt-row-homeoffice' : '',
        d.isUnregisteredWeekday ? 'je-spt-row-unregistered' : '',
        d.isWorkedDay ? 'je-spt-row-worked' : 'je-spt-row-empty'
      ].filter(Boolean).join(' ');

      const accumBhClass = d.accumulatedBhMin > 0
        ? 'je-spt-pos'
        : (d.accumulatedBhMin < 0 ? 'je-spt-neg' : '');

      const targetText = d.isWorkedDay
        ? (d.isSpecialDay ? '00:00' : fmt(d.targetMin))
        : '·';

      const targetTip = d.isSpecialDay
        ? `Jornada ordinária 00:00 (${d.isHoliday ? 'Feriado: ' + d.holidayName : 'Fim de semana'} — 100% das horas trabalhadas contam como HE 100%)`
        : (d.isWorkedDay
          ? 'Jornada ordinária contratual de dia útil: 08:00 (tolerância de ±10 min — CLT art. 58 §1º)'
          : 'Dia útil sem registro na catraca (não gera débito automático com Home Office desligado)');

      const cltTip = d.isHomeOfficeDay
        ? 'Home Office presumido em dia útil sem batida na catraca: 08:00 de jornada ordinária presumida por opção do usuário'
        : (d.isPresencialWorkedDay
          ? `Horas líquidas trabalhadas conforme CLT em ${d.date}: ${fmt(d.cltWorkedMin)} (Horas normais: ${fmt(d.normalWorkedMin || 0)})`
          : 'Sem horas registradas na catraca neste dia');

      return `<tr class="${rowClass}">
        <td title="Data: ${escapeHTML(d.date)} (${escapeHTML(d.dayLabel)})${d.isHoliday ? ' · Feriado: ' + escapeHTML(d.holidayName) : ''}"><strong>${escapeHTML(d.date)}</strong></td>
        <td title="Dia da semana: ${escapeHTML(d.dayLabel)}${d.isSpecialDay ? ' (Sábado/Domingo/Feriado — HE 100%)' : ' (Dia útil — Jornada 08:00)'}">${escapeHTML(d.dayLabel)}</td>
        <td title="1ª Entrada na catraca do SPT">${escapeHTML(p[0] || '·')}</td>
        <td title="1ª Saída na catraca do SPT">${escapeHTML(p[1] || '·')}</td>
        <td title="2ª Entrada na catraca do SPT">${escapeHTML(p[2] || '·')}</td>
        <td title="2ª Saída na catraca do SPT">${escapeHTML(p[3] || '·')}</td>
        <td title="3ª Entrada na catraca do SPT">${escapeHTML(p[4] || '·')}</td>
        <td title="3ª Saída na catraca do SPT">${escapeHTML(p[5] || '·')}</td>
        <td title="${escapeHTML(lunchTip)}">${escapeHTML(lunchLabel)}</td>
        <td title="Total bruto registrado pela catraca do SPT em ${escapeHTML(d.date)}: ${d.sptTotalMin ? fmt(d.sptTotalMin) : '00:00'}">${d.sptTotalMin ? fmt(d.sptTotalMin) : '·'}</td>
        <td title="${escapeHTML(cltTip)}"><strong>${d.cltWorkedMin ? fmt(d.cltWorkedMin) : '·'}</strong></td>
        <td title="${escapeHTML(targetTip)}">${escapeHTML(targetText)}</td>
        <td class="${d.he50Min ? 'je-spt-pos' : ''}" title="${d.he50Min ? `Crédito de Banco de Horas / HE 50% no dia útil: +${fmt(d.he50Min)} (excedente além de 08:00 até o limite de 2h)` : 'Sem Hora Extra 50% neste dia'}">${d.he50Min ? '+' + fmt(d.he50Min) : '·'}</td>
        <td class="${d.he100Min ? 'je-spt-pos' : ''}" title="${d.he100Min ? `Hora Extra 100% em ${escapeHTML(d.date)}: +${fmt(d.he100Min)} (${d.isSpecialDay ? '100% das horas trabalhadas em Sáb/Dom/Feriado' : 'excedente acima de 2h extras no dia útil'})` : 'Sem Hora Extra 100% neste dia'}">${d.he100Min ? '+' + fmt(d.he100Min) : '·'}</td>
        <td class="${d.debitoBhMin ? 'je-spt-neg' : ''}" title="${d.debitoBhMin ? `Débito de jornada normal no dia útil: -${fmt(d.debitoBhMin)} (horas faltantes para completar 08:00 além da tolerância de 10 min)` : 'Sem débito de horas neste dia'}">${d.debitoBhMin ? '-' + fmt(d.debitoBhMin) : '·'}</td>
        <td class="${accumBhClass}" title="${d.isWorkedDay ? `Saldo acumulado do Banco de Horas de dias úteis (HE 50% − Débito BH) até ${escapeHTML(d.date)}: ${fmt(d.accumulatedBhMin, true)}` : 'Dia sem movimentação no Banco de Horas de dias úteis'}">${d.isWorkedDay ? fmt(d.accumulatedBhMin, true) : '·'}</td>
        <td class="je-spt-col-left">${renderDayAlertsHTML(d)}</td>
      </tr>`;
    }).join('');

    const m = monthSummary;
    const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
    const saldoTotalClass = m.saldoMesMin > 0 ? 'je-spt-pos' : (m.saldoMesMin < 0 ? 'je-spt-neg' : '');

    return `
      <table class="je-recog-days je-spt-daily-table">
        <thead>
          <tr>
            <th title="Data do registro diário (DD/MM/AAAA)">Data</th>
            <th title="Dia da semana (Seg a Dom)">Dia</th>
            <th title="1ª marcação de Entrada na catraca">Ent. 1</th>
            <th title="1ª marcação de Saída na catraca">Saí. 1</th>
            <th title="2ª marcação de Entrada na catraca">Ent. 2</th>
            <th title="2ª marcação de Saída na catraca">Saí. 2</th>
            <th title="3ª marcação de Entrada na catraca">Ent. 3</th>
            <th title="3ª marcação de Saída na catraca">Saí. 3</th>
            <th title="Intervalo intrajornada de almoço (mínimo de 1h para jornadas &gt; 6h — CLT art. 71)">Almoço</th>
            <th title="Total bruto exibido pela catraca do SPT">Total SPT</th>
            <th title="Horas líquidas trabalhadas segundo a CLT (presencial + Home Office quando habilitado)">Líq. CLT</th>
            <th title="Jornada ordinária: 08:00 de Seg–Sex trabalhado e 00:00 em Sábados, Domingos e Feriados">Jornada</th>
            <th title="Horas Extras / Crédito BH 50% (dias úteis até 2h, após tolerância de 10 min da CLT art. 58 §1º)">HE 50% (BH)</th>
            <th title="Horas Extras / Crédito 100% (100% das horas de Sábados, Domingos e Feriados + excedente &gt; 2h em dia útil)">HE 100%</th>
            <th title="Débito de Banco de Horas nos dias úteis com batida (variação negativa superior a 10 min para completar 08:00)">Débito BH</th>
            <th title="Saldo acumulado do Banco de Horas de dias úteis (HE 50% − Débito BH)">Saldo BH Acum.</th>
            <th class="je-spt-col-left" title="Justificativas do SPT, dias sem registro, Home Office presumido e alertas trabalhistas (Dom / >6d seguidos)">Justificativa / Ocorrências</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
        <tfoot>
          <tr class="je-recog-total">
            <td colspan="9" class="je-spt-col-left" title="Resumo mensal de dias e horas normais cumpridas"><strong>Consolidado (${escapeHTML(m.monthLabel)}) · ${m.workedDays}d (${m.workedWeekdays || 0}u pres.${m.homeOfficeDays ? ` + ${m.homeOfficeDays}d HO presumido` : ''} + ${m.workedWeekendDays || 0}d FDS · ${m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.weekdaysWithoutRecord || 0)}d úteis s/ reg.) · H. Normais: ${fmt(m.horasNormaisMin || 0)}</strong></td>
            <td title="Soma bruta da catraca SPT no mês"><strong>${fmt(m.sptTotalMin)}</strong></td>
            <td title="Total líquido trabalhado conforme CLT no mês"><strong>${fmt(m.cltWorkedMin)}</strong></td>
            <td title="Jornada ordinária esperada nos dias úteis contabilizados do mês (${(m.workedWeekdays || 0) + (m.homeOfficeDays || 0)}d × 08:00)"><strong>${fmt(m.expectedJourneyMin)}</strong></td>
            <td class="je-spt-pos" title="Total de Horas Extras 50% (dias úteis) no mês"><strong>+${fmt(m.he50BrutoMin || 0)}</strong></td>
            <td class="je-spt-pos" title="Total de Horas Extras 100% (Sáb/Dom/Feriados + >2h útil) no mês"><strong>+${fmt(m.he100BrutoMin || 0)}</strong></td>
            <td class="je-spt-neg" title="Total de Débitos de jornada normal nos dias úteis"><strong>-${fmt(m.debitoBhBrutoMin || 0)}</strong></td>
            <td class="${saldoBhClass}" title="Saldo final do Banco de Horas de dias úteis: HE 50% (+${fmt(m.he50BrutoMin || 0)}) − Débito BH (-${fmt(m.debitoBhBrutoMin || 0)}) = ${fmt(m.saldoBhMesMin || 0, true)}"><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></td>
            <td class="je-spt-col-left" title="Colunas independentes (Saldo BH e HE 100%) e soma indicativa TSE XT">Saldo BH: <strong>${fmt(m.saldoBhMesMin || 0, true)}</strong> · HE 100%: <strong>+${fmt(m.he100BrutoMin || 0)}</strong> · Visão XT: <strong class="${saldoTotalClass}">${fmt(m.saldoMesMin, true)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  function renderMonthlyTableHTML(report) {
    if (calcMode === 'spt_puro') {
      return renderMonthlyRawTableHTML(report);
    }

    const rows = [];
    report.workers.forEach((w, wIdx) => {
      w.months.forEach((m, mIdx) => {
        if (m.fetchError) {
          rows.push(`
            <tr class="je-audit-row je-recog-server je-spt-row-error">
              <td class="je-spt-col-left">
                <strong>${escapeHTML(w.nome)}</strong>
                <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
              </td>
              <td>${escapeHTML(m.monthLabel)}</td>
              <td colspan="11" class="je-spt-col-left"><span class="je-occ-perda je-occ-perda-danger" title="Mês não pôde ser consultado no SPT">${escapeHTML(w.nome)} — ${escapeHTML(m.monthLabel)}: falha na consulta (${escapeHTML(m.errorReason || 'erro')})</span></td>
            </tr>
          `);
          return;
        }
        const rowId = `${wIdx}:${mIdx}`;
        const isExpanded = expandedMonthlyRows.has(rowId);
        const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
        const saldoTotalClass = m.saldoMesMin > 0 ? 'je-spt-pos' : (m.saldoMesMin < 0 ? 'je-spt-neg' : '');
        const activeWeekdays = (m.workedWeekdays || 0) + (m.homeOfficeDays || 0);
        const unregDays = m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.presumeHomeOffice ? 0 : (m.weekdaysWithoutRecord || 0));
        rows.push(`
          <tr class="je-audit-row je-recog-server" data-expand-row="${rowId}" role="button" tabindex="0" aria-expanded="${isExpanded}">
            <td class="je-spt-col-left" title="Clique para expandir ou recolher o Espelho de Ponto Diário de ${escapeHTML(w.nome)}">
              <span class="je-recog-caret">${isExpanded ? '▾' : '▸'}</span>
              <strong>${escapeHTML(w.nome)}</strong>
              <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
            </td>
            <td title="Mês de competência: ${escapeHTML(m.monthLabel)}">${escapeHTML(m.monthLabel)}</td>
            <td title="${m.workedDays} dias trabalhados/contabilizados: ${m.workedWeekdays || 0}d úteis presenciais (u)${m.homeOfficeDays ? ` + ${m.homeOfficeDays}d Home Office presumido (ho)` : ''} + ${m.workedWeekendDays || 0}d Sáb/Dom/Feriado (f)">${formatDaysCell(m)}</td>
            <td title="${unregDays} dia(s) útil(eis) sem batida na catraca e sem justificativa no SPT${m.presumeHomeOffice ? ' (0d porque foram convertidos em Home Office presumido: ' + (m.homeOfficeDays || 0) + 'd)' : ' (não geram débito automático)'}"><strong>${unregDays}d</strong>${m.homeOfficeDays ? `<br><small class="je-spt-ho-pill">${m.homeOfficeDays}d HO</small>` : ''}</td>
            <td title="Total bruto somado pela catraca do SPT (apenas batidas físicas): ${fmt(m.sptTotalMin)}">${fmt(m.sptTotalMin)}</td>
            <td title="Total líquido trabalhado conforme CLT (H. Normais ${fmt(m.horasNormaisMin || 0)} + HE 50% ${fmt(m.he50BrutoMin || 0)} + HE 100% ${fmt(m.he100BrutoMin || 0)}): ${fmt(m.cltWorkedMin)}"><strong>${fmt(m.cltWorkedMin)}</strong></td>
            <td title="Horas Normais cumpridas nos ${activeWeekdays} dias úteis ativos (jornada esperada de ${fmt(m.expectedJourneyMin)}, respeitada a tolerância de ±10 min/dia): ${fmt(m.horasNormaisMin || 0)}">${fmt(m.horasNormaisMin || 0)}</td>
            <td class="${m.he50BrutoMin ? 'je-spt-pos' : ''}" title="Horas Extras 50% (Créditos BH em dias úteis até 2h/dia): +${fmt(m.he50BrutoMin || 0)}">${dot(m.he50BrutoMin, true)}</td>
            <td class="${m.debitoBhBrutoMin ? 'je-spt-neg' : ''}" title="Débito de horas normais nos dias úteis com batida (horas faltantes para completar 08:00/dia além da tolerância de 10 min): -${fmt(m.debitoBhBrutoMin || 0)}">${m.debitoBhBrutoMin ? '-' + fmt(m.debitoBhBrutoMin) : '·'}</td>
            <td class="${saldoBhClass}" title="Saldo do Banco de Horas nos dias úteis (independente de HE 100%, igual ao cartão da empresa): HE 50% (+${fmt(m.he50BrutoMin || 0)}) − Débito BH (-${fmt(m.debitoBhBrutoMin || 0)}) = ${fmt(m.saldoBhMesMin || 0, true)}"><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></td>
            <td class="${m.he100BrutoMin ? 'je-spt-pos' : ''}" title="Horas Extras 100% (independente do Saldo BH no cartão da empresa): 100% das horas trabalhadas em Sábados, Domingos e Feriados (jornada ordinária 00:00) + excedente > 2h em dia útil: +${fmt(m.he100BrutoMin || 0)}"><strong>${dot(m.he100BrutoMin, true)}</strong></td>
            <td class="${saldoTotalClass}" title="Visão analítica do TSE XT (não é regra da empresa — mistura adicionais de 50% e 100% em proporção 1:1): Saldo BH Úteis (${fmt(m.saldoBhMesMin || 0, true)}) + HE 100% (+${fmt(m.he100BrutoMin || 0)}) = ${fmt(m.saldoMesMin, true)}"><strong>${fmt(m.saldoMesMin, true)}</strong></td>
            <td class="je-spt-col-left" title="Resumo de ocorrências e alertas trabalhistas do mês">${renderBadgesHTML(m.alerts)}</td>
          </tr>
        `);
        if (isExpanded) {
          rows.push(`
            <tr class="je-recog-daysrow">
              <td colspan="13">${renderDailyMirrorTableHTML(m)}</td>
            </tr>
          `);
        }
      });
    });

    const u = report.unitTotals;
    const totalSaldoBhClass = u.saldoBhMesMin > 0 ? 'je-spt-pos' : (u.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
    const totalSaldoClass = u.saldoMesMin > 0 ? 'je-spt-pos' : (u.saldoMesMin < 0 ? 'je-spt-neg' : '');
    const uUnreg = u.unregisteredWeekdays != null ? u.unregisteredWeekdays : (presumeHomeOffice ? 0 : (u.weekdaysWithoutRecord || 0));
    rows.push(`
      <tr class="je-recog-total">
        <td class="je-spt-col-left" title="Soma consolidada de todos os prestadores ativos da unidade no período"><strong>Total Consolidado da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores ativos)</strong></td>
        <td title="Período consolidado">—</td>
        <td title="Total de dias da unidade: ${u.workedWeekdays || 0}u presenciais${u.homeOfficeDays ? ` + ${u.homeOfficeDays}ho Home Office presumido` : ''} + ${u.workedWeekendDays || 0}f FDS/feriado"><strong>${formatDaysCell(u)}</strong></td>
        <td title="Total de dias úteis sem registro na catraca e sem justificativa na unidade"><strong>${uUnreg}d</strong>${u.homeOfficeDays ? `<br><small>${u.homeOfficeDays}d HO</small>` : ''}</td>
        <td title="Soma bruta da coluna Total do SPT na unidade: ${fmt(u.sptTotalMin)}"><strong>${fmt(u.sptTotalMin)}</strong></td>
        <td title="Soma do total líquido trabalhado conforme CLT na unidade: ${fmt(u.cltWorkedMin)}"><strong>${fmt(u.cltWorkedMin)}</strong></td>
        <td title="Soma das Horas Normais cumpridas nos dias úteis na unidade: ${fmt(u.horasNormaisMin || 0)}"><strong>${fmt(u.horasNormaisMin || 0)}</strong></td>
        <td class="je-spt-pos" title="Soma das Horas Extras 50% (dias úteis) da unidade: +${fmt(u.he50BrutoMin || 0)}"><strong>+${fmt(u.he50BrutoMin || 0)}</strong></td>
        <td class="je-spt-neg" title="Soma dos Débitos BH (horas faltantes nos dias úteis com batida) da unidade: -${fmt(u.debitoBhBrutoMin || 0)}"><strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong></td>
        <td class="${totalSaldoBhClass}" title="Saldo BH consolidado dos dias úteis da unidade: HE 50% (+${fmt(u.he50BrutoMin || 0)}) − Débito BH (-${fmt(u.debitoBhBrutoMin || 0)}) = ${fmt(u.saldoBhMesMin || 0, true)}"><strong>${fmt(u.saldoBhMesMin || 0, true)}</strong></td>
        <td class="je-spt-pos" title="Soma das Horas Extras 100% (Sáb/Dom/Feriados) da unidade: +${fmt(u.he100BrutoMin || 0)}"><strong>+${fmt(u.he100BrutoMin || 0)}</strong></td>
        <td class="${totalSaldoClass}" title="Visão TSE XT (Saldo BH + HE 100%, não é regra da empresa): ${fmt(u.saldoMesMin, true)}"><strong>${fmt(u.saldoMesMin, true)}</strong></td>
        <td class="je-spt-col-left" title="Totais de ocorrências da unidade no período">${renderBadgesHTML(u.alerts)}</td>
      </tr>
    `);

    return `
      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-recog-table je-spt-monthly-table">
          <thead>
            <tr>
              <th class="je-spt-col-left" title="Clique em qualquer prestador para abrir ou recolher o espelho de ponto diário">Prestador / Contrato</th>
              <th title="Mês/Ano de competência">Mês</th>
              <th title="Dias contabilizados (u = úteis presenciais, ho = Home Office presumido 8h quando ativo, f = FDS/feriados)">Dias</th>
              <th title="Dias úteis sem registro na catraca e sem justificativa no SPT (não geram débito automático quando Home Office está desligado)">Dias úteis sem registro</th>
              <th title="Soma pura da coluna Total da catraca do SPT">Total SPT</th>
              <th title="Total líquido trabalhado conforme CLT (presencial + Home Office 8h quando ativo)">Trab. CLT</th>
              <th title="Horas Normais cumpridas nos dias úteis (com tolerância de ±10 min)">H. Normais</th>
              <th title="HE / Créditos BH 50% (excedente em dias úteis até 2h/dia, igual ao rodapé do Cartão Ponto Digisystem)">HE 50% (BH)</th>
              <th title="Débito BH nos dias úteis com batida (horas faltantes para 08:00 além da tolerância de 10 min)">Débito BH</th>
              <th title="Saldo de Banco de Horas nos dias úteis (HE 50% − Débito BH — coluna independente no cartão da empresa)">Saldo BH (Úteis)</th>
              <th title="HE / Créditos BH 100% (100% das horas trabalhadas em Sábados, Domingos e Feriados + excedente &gt; 2h em dia útil — coluna independente no cartão da empresa)">HE 100% (FDS)</th>
              <th title="Visão analítica do TSE XT que soma 1:1 Saldo BH (50%) + HE 100% para alerta gerencial de abatimento de débitos (não é regra da empresa)">Visão TSE XT: Saldo BH + HE 100%<br><small>(não é regra da empresa)</small></th>
              <th class="je-spt-col-left" title="Alertas de conformidade CLT e ocorrências de ponto identificadas no mês">Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
      <p class="je-audit-foot">Clique em qualquer linha da tabela para expandir o <strong>Espelho de Ponto Diário</strong> daquele prestador, ou alterne o parâmetro <strong>Detalhe</strong> acima para <em>Diário (Espelho)</em>. Consulte o <strong>Anexo de Interpretação</strong> abaixo para conferir os parâmetros ativos, feriados e regras.</p>
    `;
  }

  function renderDailyViewHTML(report) {
    const isRaw = calcMode === 'spt_puro';
    const blocks = report.workers.map((w) => {
      const monthBlocks = w.months.map((m) => {
        const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
        const saldoTotalClass = m.saldoMesMin > 0 ? 'je-spt-pos' : (m.saldoMesMin < 0 ? 'je-spt-neg' : '');
        const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
        const unregDays = m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.presumeHomeOffice ? 0 : (m.weekdaysWithoutRecord || 0));
        const kpisHTML = isRaw
          ? `
            <div class="je-spt-daily-kpis">
              <div class="je-spt-mini-kpi" title="Total de dias com registro de frequência na catraca do SPT"><span>Dias c/ Registro</span><strong>${presDays}d</strong></div>
              <div class="je-spt-mini-kpi" title="Dias de segunda a sexta com batida na catraca"><span>Seg–Sex</span><strong>${m.workedWeekdays || 0}d</strong></div>
              <div class="je-spt-mini-kpi" title="Sábados, domingos e feriados com batida na catraca"><span>Sáb/Dom/Fer</span><strong>${m.workedWeekendDays || 0}d</strong></div>
              <div class="je-spt-mini-kpi" title="Soma aritmética bruta da coluna Total do SPT no mês"><span>Total SPT (Bruto)</span><strong>${fmt(m.sptTotalMin)}</strong></div>
            </div>
          `
          : `
            <div class="je-spt-daily-kpis">
              <div class="je-spt-mini-kpi" title="Dias úteis sem registro na catraca e sem justificativa">${m.presumeHomeOffice ? `<span>HO Presumido</span><strong>${m.homeOfficeDays || 0}d</strong>` : `<span>Dias s/ Reg.</span><strong>${unregDays}d</strong>`}</div>
              <div class="je-spt-mini-kpi" title="Horas Normais cumpridas nos dias úteis (com tolerância de ±10 min)"><span>H. Normais</span><strong>${fmt(m.horasNormaisMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi" title="Total líquido de horas trabalhadas segundo a CLT no mês"><span>Trab. CLT</span><strong>${fmt(m.cltWorkedMin)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-pos" title="Horas Extras 50% acumuladas nos dias úteis (até 2h/dia)"><span>HE 50% (BH)</span><strong>+${fmt(m.he50BrutoMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-neg" title="Horas faltantes para completar 08:00 nos dias úteis com batida"><span>Débito BH</span><strong>-${fmt(m.debitoBhBrutoMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi ${saldoBhClass}" title="Saldo do Banco de Horas nos dias úteis (HE 50% − Débito BH)"><span>Saldo BH (Úteis)</span><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-pos" title="Horas Extras 100% (100% dos Sábados, Domingos e Feriados + excedente > 2h em dia útil)"><span>HE 100% (FDS)</span><strong>+${fmt(m.he100BrutoMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi ${saldoTotalClass}" title="Visão TSE XT: Saldo BH + HE 100% (não é regra da empresa)"><span>Visão XT (BH+100%)</span><strong>${fmt(m.saldoMesMin, true)}</strong></div>
            </div>
          `;
        return `
          <div class="je-spt-daily-card">
            <div class="je-spt-daily-card-head">
              <div>
                <h4 class="je-spt-daily-worker-title">${escapeHTML(w.nome)} <span class="je-spt-daily-month-pill" title="Mês de competência">${escapeHTML(m.monthLabel)}</span></h4>
                <p class="je-spt-daily-worker-sub">CPF: <strong>${escapeHTML(formatCpf(w.cpf))}</strong> · Contrato: <strong>${escapeHTML(w.empresa || w.numContrato || '—')}</strong> · Dias: <strong title="${m.workedWeekdays || 0}d úteis presenciais${m.homeOfficeDays ? ` + ${m.homeOfficeDays}d Home Office presumido` : ''} + ${m.workedWeekendDays || 0}d FDS/feriado">${m.workedDays}</strong> (${m.workedWeekdays || 0}u pres.${m.homeOfficeDays ? ` + ${m.homeOfficeDays}d HO` : ''} + ${m.workedWeekendDays || 0}d FDS · ${unregDays}d úteis s/ reg.)</p>
              </div>
              ${kpisHTML}
            </div>
            ${renderDailyMirrorTableHTML(m)}
          </div>
        `;
      }).join('');
      return monthBlocks;
    }).join('');

    return `
      <div class="je-spt-daily-Controls">
        <label class="je-spt-rep-check-inline" title="Quando marcado, oculta os dias sem batida e sem Home Office para deixar o espelho mais compacto">
          <input type="checkbox" id="je-spt-daily-only-active"${showOnlyActiveDaysInDaily ? ' checked' : ''}>
          <span>Ocultar dias em branco (mostrar apenas dias trabalhados ou com justificativa)</span>
        </label>
      </div>
      <div class="je-spt-daily-list">
        ${blocks || '<div class="je-audit-empty">Nenhum registro encontrado para os parâmetros selecionados.</div>'}
      </div>
    `;
  }

  function renderResult(report, flags = {}) {
    const body = overlay.querySelector('#je-spt-rep-body');
    const csvBtn = overlay.querySelector('#je-spt-rep-csv');
    const printBtn = overlay.querySelector('#je-spt-rep-print');
    const clearBtn = overlay.querySelector('#je-spt-rep-clear');

    if (!report || !Array.isArray(report.workers) || !report.workers.length) {
      csvBtn.disabled = true;
      printBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
      setSafeHTML(body, `
        <div class="je-audit-empty">
          <p>Selecione a <strong>Unidade</strong>, o <strong>Período</strong>, o <strong>Contrato</strong> (opcional), os <strong>Prestadores</strong> e o <strong>Modo</strong> (<em>TSE XT / Digi</em> ou <em>SPT Puro</em>) e clique em <strong>Gerar relatório</strong>.</p>
          <p>No modo padrão de fiscalização <strong>TSE XT / Digi</strong>, o relatório aplica as regras da CLT: jornada de 8h de segunda a sexta (tolerância de ±10 min do art. 58 §1º), mínimo de 1h de almoço (art. 71), exibição transparente dos <strong>Dias úteis sem registro</strong> (ou presunção opcional de <strong>Home Office 8h</strong> quando ativada pelo gestor), alerta de <strong>Trabalho em domingo / &gt;6 dias consecutivos sem folga identificada</strong> (art. 67 / OJ 410 TST) e colunas independentes para <strong>Saldo BH (Úteis)</strong> e <strong>HE 100% (FDS)</strong>.</p>
        </div>
      `);
      return;
    }

    csvBtn.disabled = false;
    printBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;

    const u = report.unitTotals || calc().summarizeUnitReport(report.workers);
    const when = report.generatedAt ? new Date(report.generatedAt).toLocaleString('pt-BR') : '';
    const failures = Array.isArray(report.failures) ? report.failures : [];
    const failuresListHTML = failures.length > 0
      ? `<ul class="je-spt-failures-list">${failures.map((f) => `<li>${escapeHTML(f)}</li>`).join('')}</ul>`
      : '';
    const alertBanner = flags.loggedOut
      ? `<div class="je-audit-alert"><strong>Relatório Parcial — Sessão expirada no SPT durante a consulta.</strong> Faça login novamente e gere o relatório.${failuresListHTML}</div>`
      : (report.partial
        ? `<div class="je-audit-alert"><strong>Relatório Parcial:</strong> Nem todos os meses/prestadores puderam ser consultados com sucesso.${failuresListHTML}</div>`
        : '');

    if (calcMode === 'spt_puro') {
      const uPres = u.presencialWorkedDays != null ? u.presencialWorkedDays : u.workedDays;
      setSafeHTML(body, `
        ${alertBanner}
        <div class="je-audit-hero">
          <div class="je-audit-hero-num" title="Soma pura da coluna Total retornada pelo SPT">${fmt(u.sptTotalMin)}</div>
          <div class="je-audit-hero-cap">
            <strong>Modo SPT Puro (Dados Brutos)</strong> · Dias com marcação na catraca: <strong>${uPres}d</strong> (${u.workedWeekdays || 0}d Seg–Sex + ${u.workedWeekendDays || 0}d Sáb/Dom/Fer)
          </div>
          <div class="je-audit-hero-sub">
            Unidade: <strong>${escapeHTML(report.unitName)}</strong> · Período: <strong>${escapeHTML(report.fromBr)} a ${escapeHTML(report.toBr)}</strong> · Contrato: <strong>${escapeHTML(report.contratoLabel)}</strong> · ${u.activeWorkersCount} de ${u.workersCount} prestador(es) com marcações${when ? ' · emitido em ' + escapeHTML(when) : ''}
          </div>
        </div>

        <div class="je-audit-cards">
          <div class="je-audit-card" title="Soma bruta da coluna Total do SPT para todos os prestadores selecionados">
            <div class="je-audit-card-val">${fmt(u.sptTotalMin)}</div>
            <div class="je-audit-card-title">Total SPT (Bruto)</div>
          </div>
          <div class="je-audit-card" title="Total de dias com registro de frequência na catraca do SPT">
            <div class="je-audit-card-val">${uPres}d</div>
            <div class="je-audit-card-title">Dias c/ Registro</div>
          </div>
          <div class="je-audit-card" title="Dias de segunda a sexta com registro na catraca do SPT">
            <div class="je-audit-card-val">${u.workedWeekdays || 0}d</div>
            <div class="je-audit-card-title">Seg–Sex c/ Batida</div>
          </div>
          <div class="je-audit-card" title="Sábados, domingos e feriados com registro na catraca do SPT">
            <div class="je-audit-card-val">${u.workedWeekendDays || 0}d</div>
            <div class="je-audit-card-title">Sáb/Dom/Fer</div>
          </div>
          <div class="je-audit-card" title="Dias com quantidade ímpar de batidas na catraca">
            <div class="je-audit-card-val">${(u.alerts && u.alerts.batidaImparDays) || 0}d</div>
            <div class="je-audit-card-title">Batidas Ímpares</div>
          </div>
        </div>

        <p class="je-audit-foot je-recog-equation">
          <strong>Modo SPT Puro:</strong> Exibe exclusivamente os horários de catraca e a coluna <strong>Total</strong> fornecidos pelo sistema SPT do TSE, sem deduções adicionais e sem apuração interpretativa de jornada, banco de horas ou horas extras.
        </p>

        ${detailMode === 'diario' ? renderDailyViewHTML(report) : renderMonthlyTableHTML(report)}
        ${renderInterpretationAnnexHTML(report, false)}
      `);
    } else {
      const saldoBhSign = fmt(u.saldoBhMesMin || 0, true);
      const saldoTotalSign = fmt(u.saldoMesMin || 0, true);
      const uUnreg = u.unregisteredWeekdays != null ? u.unregisteredWeekdays : (presumeHomeOffice ? 0 : (u.weekdaysWithoutRecord || 0));
      const hoBadge = presumeHomeOffice
        ? ` · <strong>Home Office presumido (8h): ${u.homeOfficeDays || 0}d</strong>`
        : ` · <strong>Dias úteis sem registro: ${uUnreg}d</strong>`;
      const spLunchBadge = deductAutoLunchOnSpecialDays
        ? ' · Intervalo 1h em Sáb/Dom/Fer (&gt;6h): <strong>Descontado (CLT/SPT)</strong>'
        : ' · Intervalo 1h em Sáb/Dom/Fer (&gt;6h): <strong>Sem desconto (Digisystem)</strong>';

      setSafeHTML(body, `
        ${alertBanner}
        <div class="je-audit-hero">
          <div class="je-audit-hero-num" title="Total líquido de horas trabalhadas na unidade segundo as regras da CLT">${fmt(u.cltWorkedMin)}</div>
          <div class="je-audit-hero-cap">
            <strong>Modo TSE XT / Digi</strong> · Horas Normais (Seg–Sex): <strong>${fmt(u.horasNormaisMin || 0)}</strong> · Saldo BH (50% − Déb.): <strong>${saldoBhSign}</strong> · HE 100% (FDS): <strong>+${fmt(u.he100BrutoMin || 0)}</strong>${hoBadge}${spLunchBadge}
          </div>
          <div class="je-audit-hero-sub">
            Unidade: <strong>${escapeHTML(report.unitName)}</strong> · Período: <strong>${escapeHTML(report.fromBr)} a ${escapeHTML(report.toBr)}</strong> · Contrato: <strong>${escapeHTML(report.contratoLabel)}</strong> · ${u.activeWorkersCount} de ${u.workersCount} prestador(es) com marcações${when ? ' · emitido em ' + escapeHTML(when) : ''}
          </div>
        </div>

        <div class="je-audit-cards">
          <div class="je-audit-card" title="Soma das horas líquidas trabalhadas (H. Normais: ${fmt(u.horasNormaisMin || 0)} · Catraca SPT: ${fmt(u.sptTotalMin)})">
            <div class="je-audit-card-val">${fmt(u.cltWorkedMin)}</div>
            <div class="je-audit-card-title">Trabalhado CLT</div>
          </div>
          <div class="je-audit-card" title="Horas Normais cumpridas nos dias úteis (${u.workedWeekdays || 0}d presenciais${presumeHomeOffice ? ` + ${u.homeOfficeDays || 0}d Home Office presumido` : ''})">
            <div class="je-audit-card-val">${fmt(u.horasNormaisMin || 0)}</div>
            <div class="je-audit-card-title">Horas Normais</div>
          </div>
          <div class="je-audit-card" title="${presumeHomeOffice ? 'Total de dias úteis sem batida contabilizados como Home Office presumido (8h)' : 'Total de dias úteis sem batida na catraca e sem justificativa (não geram débito automático)'}">
            <div class="je-audit-card-val">${presumeHomeOffice ? `${u.homeOfficeDays || 0}d` : `${uUnreg}d`}</div>
            <div class="je-audit-card-title">${presumeHomeOffice ? 'Dias HO Presumidos' : 'Dias Úteis s/ Reg.'}</div>
          </div>
          <div class="je-audit-card" title="Saldo líquido do Banco de Horas de dias úteis no mês (HE 50% +${fmt(u.he50BrutoMin || 0)} − Débito BH -${fmt(u.debitoBhBrutoMin || 0)} — coluna independente no cartão da empresa)">
            <div class="je-audit-card-val ${(u.saldoBhMesMin || 0) >= 0 ? 'je-spt-pos' : 'je-spt-neg'}">${saldoBhSign}</div>
            <div class="je-audit-card-title">Saldo BH (Úteis)</div>
          </div>
          <div class="je-audit-card" title="Horas Extras / Créditos BH 100% (coluna independente no cartão da empresa): 100% das horas trabalhadas em Sábados, Domingos e Feriados (jornada ordinária 00:00) + excedente &gt; 2h em dia útil">
            <div class="je-audit-card-val je-spt-pos">+${fmt(u.he100BrutoMin || 0)}</div>
            <div class="je-audit-card-title">HE / Créd. 100% (FDS)</div>
          </div>
          <div class="je-audit-card" title="Visão analítica do TSE XT (não é regra da empresa — mistura adicionais de 50% e 100% em proporção 1:1): Saldo BH Úteis (${saldoBhSign}) + HE 100% (+${fmt(u.he100BrutoMin || 0)}) = ${saldoTotalSign}">
            <div class="je-audit-card-val ${(u.saldoMesMin || 0) >= 0 ? 'je-spt-pos' : 'je-spt-neg'}">${saldoTotalSign}</div>
            <div class="je-audit-card-title">Visão XT: BH + HE 100%</div>
          </div>
        </div>

        <p class="je-audit-foot je-recog-equation">
          <strong>Regras ativas:</strong> Jornada de <strong>8h00 (Seg–Sex)</strong> com tolerância de <strong>±10 min/dia</strong> (CLT art. 58 §1º) e mín. de <strong>1h00 de almoço</strong> (&gt; 6h, art. 71) · <strong>Home Office (8h):</strong> <strong>${presumeHomeOffice ? `Ligado (${u.homeOfficeDays || 0}d presumidos)` : `Desligado (${uUnreg}d úteis sem registro)`}</strong> · <strong>Intervalo 1h em Sáb/Dom/Fer (&gt;6h, 1 par):</strong> <strong>${deductAutoLunchOnSpecialDays ? 'Ligado (CLT/SPT)' : 'Desligado (reproduz cartão Digisystem)'}</strong> · <strong>Saldo BH (Úteis):</strong> HE 50% (<strong>+${fmt(u.he50BrutoMin || 0)}</strong>) − Débito BH (<strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong>) = <strong>${saldoBhSign}</strong> · <strong>HE 100% (FDS):</strong> <strong>+${fmt(u.he100BrutoMin || 0)}</strong> · <strong>Visão TSE XT (Saldo BH + HE 100%, não é regra da empresa):</strong> <strong>${saldoTotalSign}</strong>.
        </p>

        ${detailMode === 'diario' ? renderDailyViewHTML(report) : renderMonthlyTableHTML(report)}
        ${renderInterpretationAnnexHTML(report, false)}
      `);
    }

    const toggleActiveEl = body.querySelector('#je-spt-daily-only-active');
    if (toggleActiveEl) {
      toggleActiveEl.addEventListener('change', (e) => {
        showOnlyActiveDaysInDaily = !!e.target.checked;
        renderResult(currentResult);
      });
    }
  }

  function onBodyClick(e) {
    const tr = e.target.closest ? e.target.closest('tr[data-expand-row]') : null;
    if (!tr || !currentResult) return;
    const id = tr.getAttribute('data-expand-row');
    if (expandedMonthlyRows.has(id)) {
      expandedMonthlyRows.delete(id);
    } else {
      expandedMonthlyRows.add(id);
    }
    renderResult(currentResult);
  }

  function csvCell(v) {
    let text = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
    if (/^[=+\-@\t]/.test(text) && !/^[+\-]?\d{1,4}:\d{2}$/.test(text)) {
      text = "'" + text;
    }
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    if (!currentResult || !currentResult.workers || !currentResult.workers.length) return;
    const rows = [];
    const isRaw = calcMode === 'spt_puro';
    if (currentResult.partial) {
      const failSummary = Array.isArray(currentResult.failures) && currentResult.failures.length
        ? currentResult.failures.join(' | ')
        : 'Consulta interrompida ou incompleta';
      rows.push(['AVISO_RELATORIO_PARCIAL', `Relatório parcial — falhas registradas: ${failSummary}`]);
    }

    if (detailMode === 'diario') {
      if (isRaw) {
        rows.push([
          'Modo', 'Unidade', 'Prestador', 'CPF', 'Contrato', 'Mes', 'Data', 'DiaSemana',
          'Entrada1', 'Saida1', 'Entrada2', 'Saida2', 'Entrada3', 'Saida3',
          'JustificativaSPT', 'TotalSPT'
        ]);
        currentResult.workers.forEach((w) => {
          w.months.forEach((m) => {
            m.days.forEach((d) => {
              if (showOnlyActiveDaysInDaily && !d.sptTotalMin && !d.punchCount && !d.justificativa) return;
              const p = d.punches || [];
              rows.push([
                'SPT Puro',
                currentResult.unitName,
                w.nome,
                formatCpf(w.cpf),
                w.numContrato,
                m.monthLabel,
                d.date,
                d.dayLabel,
                p[0] || '',
                p[1] || '',
                p[2] || '',
                p[3] || '',
                p[4] || '',
                p[5] || '',
                d.justificativa || '',
                d.sptTotalMin ? fmt(d.sptTotalMin) : '00:00'
              ]);
            });
          });
        });
      } else {
        rows.push([
          'Modo', 'Unidade', 'Prestador', 'CPF', 'Contrato', 'Mes', 'Data', 'DiaSemana',
          'Entrada1', 'Saida1', 'Entrada2', 'Saida2', 'Entrada3', 'Saida3',
          'IntervaloAlmoco', 'TotalSPT', 'LiquidoCLT', 'JornadaEsperada',
          'HorasNormais', 'HE50_BH', 'HE100_FDS', 'Debito_BH', 'SaldoBH_Acumulado',
          'HomeOfficePresumido', 'DiaUtilSemRegistro', 'AlertaDSR',
          'Justificativa', 'Ocorrencias'
        ]);
        currentResult.workers.forEach((w) => {
          w.months.forEach((m) => {
            m.days.forEach((d) => {
              if (showOnlyActiveDaysInDaily && !d.isWorkedDay && !d.punchCount && !d.justificativa) return;
              const p = d.punches || [];
              rows.push([
                'TSE XT / Digi',
                currentResult.unitName,
                w.nome,
                formatCpf(w.cpf),
                w.numContrato,
                m.monthLabel,
                d.date,
                d.dayLabel,
                p[0] || '',
                p[1] || '',
                p[2] || '',
                p[3] || '',
                p[4] || '',
                p[5] || '',
                d.isPresencialWorkedDay ? fmt(d.effectiveLunchMin) : '',
                d.sptTotalMin ? fmt(d.sptTotalMin) : '00:00',
                d.cltWorkedMin ? fmt(d.cltWorkedMin) : '00:00',
                d.isWorkedDay ? fmt(d.targetMin) : '00:00',
                fmt(d.normalWorkedMin || 0),
                fmt(d.he50Min || 0),
                fmt(d.he100Min || 0),
                fmt(d.debitoBhMin || 0),
                d.isWorkedDay ? fmt(d.accumulatedBhMin || 0, true) : '00:00',
                d.isHomeOfficeDay ? 'Sim' : 'Nao',
                d.isUnregisteredWeekday ? 'Sim' : 'Nao',
                d.hasDsrStreakAlert ? 'Sim' : 'Nao',
                d.justificativa || '',
                (d.alerts || []).map((a) => a.label).join(' | ')
              ]);
            });
          });
        });
      }
    } else if (isRaw) {
      rows.push([
        'Modo', 'Unidade', 'Prestador', 'CPF', 'Contrato', 'Mes',
        'DiasComRegistro', 'DiasSegSex', 'DiasSabDomFer', 'DiasJustificados',
        'DiasBatidaImpar', 'TotalSPT'
      ]);
      currentResult.workers.forEach((w) => {
        w.months.forEach((m) => {
          const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
          rows.push([
            'SPT Puro',
            currentResult.unitName,
            w.nome,
            formatCpf(w.cpf),
            w.numContrato,
            m.monthLabel,
            String(presDays),
            String(m.workedWeekdays || 0),
            String(m.workedWeekendDays || 0),
            String(m.justifiedDays || 0),
            String((m.alerts && m.alerts.batidaImparDays) || 0),
            fmt(m.sptTotalMin)
          ]);
        });
      });
    } else {
      rows.push([
        'Modo', 'Unidade', 'Prestador', 'CPF', 'Contrato', 'Mes',
        'DiasContabilizados', 'DiasUteisPresenciais', 'DiasHomeOfficePresumido', 'DiasUteisSemRegistro', 'DiasFdsTrabalhados',
        'JornadaEsperadaUteis', 'TotalSPT', 'TrabalhadoLiquidoCLT',
        'HorasNormais', 'HE_Credito_BH_50', 'Debito_BH', 'Compensado_BH',
        'Saldo_BH_Uteis', 'HE_Credito_BH_100', 'Visao_TSE_XT_Saldo_BH_Mais_HE_100',
        'DiasAlertaDSR_Dom_Mais6d', 'DiasAlmocoMenor1h', 'DiasAlmocoAuto1h', 'DiasAcima2hExtra', 'DiasBatidaImpar',
        'StatusConsulta'
      ]);
      currentResult.workers.forEach((w) => {
        w.months.forEach((m) => {
          const unregDays = m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.presumeHomeOffice ? 0 : (m.weekdaysWithoutRecord || 0));
          const statusConsulta = m.fetchError ? `falha na consulta (${m.errorReason || 'erro'})` : 'OK';
          rows.push([
            'TSE XT / Digi',
            currentResult.unitName,
            w.nome,
            formatCpf(w.cpf),
            w.numContrato,
            m.monthLabel,
            String(m.workedDays),
            String(m.workedWeekdays || 0),
            String(m.homeOfficeDays || 0),
            String(unregDays),
            String(m.workedWeekendDays || 0),
            fmt(m.expectedJourneyMin),
            fmt(m.sptTotalMin),
            fmt(m.cltWorkedMin),
            fmt(m.horasNormaisMin || 0),
            fmt(m.he50BrutoMin || 0),
            fmt(m.debitoBhBrutoMin || 0),
            fmt(m.compensadoBhMin || 0),
            fmt(m.saldoBhMesMin || 0, true),
            fmt(m.he100BrutoMin || 0),
            fmt(m.saldoMesMin, true),
            String(m.alerts.dsrAlertDays || 0),
            String(m.alerts.intervaloCurtoDays),
            String(m.alerts.almocoAutoDays),
            String(m.alerts.acima2hExtraDays),
            String(m.alerts.batidaImparDays),
            statusConsulta
          ]);
        });
      });
    }

    const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    const modeSlug = isRaw ? 'SPT_Puro' : 'XT_Digi';
    a.download = `TSE_XT_SPT_${modeSlug}_${detailMode === 'diario' ? 'Diario' : 'Mensal'}_${currentResult.fromIso}_a_${currentResult.toIso}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildPrintHTML(report) {
    const u = report.unitTotals || calc().summarizeUnitReport(report.workers);
    const when = report.generatedAt ? new Date(report.generatedAt).toLocaleString('pt-BR') : '';
    const version = (window.JEPessoasVersion && window.JEPessoasVersion.getVersion && window.JEPessoasVersion.getVersion()) || '';
    const isRaw = calcMode === 'spt_puro';
    const failures = Array.isArray(report.failures) ? report.failures : [];
    const printPartialBanner = report.partial
      ? `<div class="je-print-partial-warning"><strong>ATENÇÃO — RELATÓRIO PARCIAL:</strong> Nem todos os meses/prestadores puderam ser consultados.${failures.length ? `<ul>${failures.map((f) => `<li>${escapeHTML(f)}</li>`).join('')}</ul>` : ''}</div>`
      : '';

    if (isRaw) {
      const monthlyRows = [];
      report.workers.forEach((w) => {
        w.months.forEach((m) => {
          const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
          monthlyRows.push(`
            <tr>
              <td class="l"><strong>${escapeHTML(w.nome)}</strong><br><small>CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small></td>
              <td>${escapeHTML(m.monthLabel)}</td>
              <td>${presDays}</td>
              <td>${m.workedWeekdays || 0}</td>
              <td>${m.workedWeekendDays || 0}</td>
              <td>${m.justifiedDays || 0}</td>
              <td>${(m.alerts && m.alerts.batidaImparDays) || 0}</td>
              <td><strong>${fmt(m.sptTotalMin)}</strong></td>
            </tr>
          `);
        });
      });

      const uPres = u.presencialWorkedDays != null ? u.presencialWorkedDays : u.workedDays;
      monthlyRows.push(`
        <tr class="total">
          <td class="l">Total Bruto da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores)</td>
          <td>—</td>
          <td>${uPres}</td>
          <td>${u.workedWeekdays || 0}</td>
          <td>${u.workedWeekendDays || 0}</td>
          <td>${u.justifiedDays || 0}</td>
          <td>${(u.alerts && u.alerts.batidaImparDays) || 0}</td>
          <td>${fmt(u.sptTotalMin)}</td>
        </tr>
      `);

      let dailySection = '';
      if (detailMode === 'diario') {
        const workerTables = report.workers.map((w) => {
          return w.months.map((m) => {
            const days = showOnlyActiveDaysInDaily
              ? m.days.filter((d) => d.sptTotalMin > 0 || d.punchCount > 0 || d.justificativa)
              : m.days;
            if (!days.length) return '';
            const dRows = days.map((d) => {
              const p = d.punches || [];
              return `<tr>
                <td>${escapeHTML(d.date)} (${escapeHTML(d.dayLabel)})</td>
                <td>${escapeHTML(p[0] || '—')}</td>
                <td>${escapeHTML(p[1] || '—')}</td>
                <td>${escapeHTML(p[2] || '—')}</td>
                <td>${escapeHTML(p[3] || '—')}</td>
                <td>${escapeHTML(p[4] || '—')}</td>
                <td>${escapeHTML(p[5] || '—')}</td>
                <td class="l">${escapeHTML(d.justificativa || '—')}</td>
                <td><strong>${d.sptTotalMin ? fmt(d.sptTotalMin) : '—'}</strong></td>
              </tr>`;
            }).join('');
            return `
              <h3>${escapeHTML(w.nome)} · CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato)} · ${escapeHTML(m.monthLabel)}</h3>
              <table class="je-print-table je-print-days">
                <thead>
                  <tr>
                    <th>Data</th><th>E1</th><th>S1</th><th>E2</th><th>S2</th><th>E3</th><th>S3</th><th>Justificativa (SPT)</th><th>Total SPT</th>
                  </tr>
                </thead>
                <tbody>${dRows}</tbody>
              </table>
            `;
          }).join('');
        }).join('');
        dailySection = `<h2>2. Espelho de Ponto Diário — SPT Puro (Dados Brutos)</h2>${workerTables}`;
      }

      return `
        <header class="je-print-header">
          <p class="je-print-eyebrow">TSE XT · SPT <span>Modo: SPT Puro (Dados Brutos)</span></p>
          <h1>Relatório de Horas por Unidade — SPT Puro (${detailMode === 'diario' ? 'Detalhe Diário e Mensal' : 'Consolidado Mensal'})</h1>
          <dl class="je-print-meta">
            <div><dt>Unidade</dt><dd>${escapeHTML(report.unitName)}</dd></div>
            <div><dt>Período</dt><dd>${escapeHTML(report.fromBr)} a ${escapeHTML(report.toBr)}</dd></div>
            <div><dt>Contrato</dt><dd>${escapeHTML(report.contratoLabel)}</dd></div>
            <div><dt>Modo</dt><dd>SPT Puro (Dados Brutos)</dd></div>
            <div><dt>Emissão</dt><dd>${escapeHTML(when)}</dd></div>
          </dl>
          ${report.issuer ? `<p class="meta">Emitido por ${escapeHTML(report.issuer)}</p>` : ''}
          <p class="meta">Fonte: SPT - Gestão de Frequência do TSE · TSE XT v${escapeHTML(version)}. Modo SPT Puro: dados brutos da catraca sem cálculos interpretativos.</p>
        </header>

        <div class="je-print-metrics">
          <div class="je-print-metric-focus"><span>Total SPT (Bruto)</span><strong>${fmt(u.sptTotalMin)}</strong></div>
          <div><span>Dias c/ Registro</span><strong>${uPres}d</strong></div>
          <div><span>Dias Seg–Sex</span><strong>${u.workedWeekdays || 0}d</strong></div>
          <div><span>Dias Sáb/Dom/Fer</span><strong>${u.workedWeekendDays || 0}d</strong></div>
          <div><span>Batidas Ímpares</span><strong>${(u.alerts && u.alerts.batidaImparDays) || 0}d</strong></div>
        </div>

        <h2>1. Consolidação Mensal por Prestador (SPT Puro)</h2>
        <table class="je-print-table">
          <thead>
            <tr>
              <th>Prestador / Contrato</th><th>Mês</th><th>Dias c/ Reg.</th><th>Seg–Sex</th><th>Sáb/Dom/Fer</th><th>Justificados</th><th>Batidas Ímpares</th><th>Total SPT</th>
            </tr>
          </thead>
          <tbody>${monthlyRows.join('')}</tbody>
        </table>

        ${dailySection}
        ${renderInterpretationAnnexHTML(report, true)}
        <footer class="je-print-footer">TSE XT · Relatório de frequência (Modo SPT Puro — Dados Brutos).</footer>
      `;
    }

    // Modo TSE XT / Digi (padrão)
    const monthlyRows = [];
    report.workers.forEach((w) => {
      w.months.forEach((m) => {
        if (m.fetchError) {
          monthlyRows.push(`
            <tr class="je-print-row-error">
              <td class="l"><strong>${escapeHTML(w.nome)}</strong><br><small>CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small></td>
              <td>${escapeHTML(m.monthLabel)}</td>
              <td colspan="10" class="l"><strong>${escapeHTML(w.nome)} — ${escapeHTML(m.monthLabel)}: falha na consulta (${escapeHTML(m.errorReason || 'erro')})</strong></td>
            </tr>
          `);
          return;
        }
        const unregDays = m.unregisteredWeekdays != null ? m.unregisteredWeekdays : (m.presumeHomeOffice ? 0 : (m.weekdaysWithoutRecord || 0));
        monthlyRows.push(`
          <tr>
            <td class="l"><strong>${escapeHTML(w.nome)}</strong><br><small>CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small></td>
            <td>${escapeHTML(m.monthLabel)}</td>
            <td>${formatDaysCell(m)}</td>
            <td>${unregDays}d${m.homeOfficeDays ? `<br><small>${m.homeOfficeDays}d HO</small>` : ''}</td>
            <td>${fmt(m.sptTotalMin)}</td>
            <td><strong>${fmt(m.cltWorkedMin)}</strong></td>
            <td>${fmt(m.horasNormaisMin || 0)}</td>
            <td>+${fmt(m.he50BrutoMin || 0)}</td>
            <td>-${fmt(m.debitoBhBrutoMin || 0)}</td>
            <td><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></td>
            <td><strong>+${fmt(m.he100BrutoMin || 0)}</strong></td>
            <td><strong>${fmt(m.saldoMesMin, true)}</strong></td>
          </tr>
        `);
      });
    });

    const uUnreg = u.unregisteredWeekdays != null ? u.unregisteredWeekdays : (presumeHomeOffice ? 0 : (u.weekdaysWithoutRecord || 0));
    monthlyRows.push(`
      <tr class="total">
        <td class="l">Total Consolidado da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores)</td>
        <td>—</td>
        <td>${formatDaysCell(u)}</td>
        <td>${uUnreg}d${u.homeOfficeDays ? `<br><small>${u.homeOfficeDays}d HO</small>` : ''}</td>
        <td>${fmt(u.sptTotalMin)}</td>
        <td>${fmt(u.cltWorkedMin)}</td>
        <td>${fmt(u.horasNormaisMin || 0)}</td>
        <td>+${fmt(u.he50BrutoMin || 0)}</td>
        <td>-${fmt(u.debitoBhBrutoMin || 0)}</td>
        <td>${fmt(u.saldoBhMesMin || 0, true)}</td>
        <td>+${fmt(u.he100BrutoMin || 0)}</td>
        <td>${fmt(u.saldoMesMin, true)}</td>
      </tr>
    `);

    let dailySection = '';
    if (detailMode === 'diario') {
      const workerTables = report.workers.map((w) => {
        return w.months.map((m) => {
          const days = showOnlyActiveDaysInDaily
            ? m.days.filter((d) => d.isWorkedDay || d.punchCount > 0 || d.justificativa)
            : m.days;
          if (!days.length) return '';
          const dRows = days.map((d) => {
            const p = d.punches || [];
            const alertsTxt = [d.justificativa].concat((d.alerts || []).map((a) => a.label)).filter(Boolean).join(' · ');
            const targetTxt = d.isWorkedDay
              ? (d.isSpecialDay ? '00:00' : fmt(d.targetMin))
              : '—';
            const rowCls = d.isHomeOfficeDay ? ' class="je-print-row-ho"' : '';
            return `<tr${rowCls}>
              <td>${escapeHTML(d.date)} (${escapeHTML(d.dayLabel)})</td>
              <td>${escapeHTML(p[0] || '—')}</td>
              <td>${escapeHTML(p[1] || '—')}</td>
              <td>${escapeHTML(p[2] || '—')}</td>
              <td>${escapeHTML(p[3] || '—')}</td>
              <td>${d.isPresencialWorkedDay ? fmt(d.effectiveLunchMin) : '—'}</td>
              <td>${d.sptTotalMin ? fmt(d.sptTotalMin) : '—'}</td>
              <td><strong>${d.cltWorkedMin ? fmt(d.cltWorkedMin) : '—'}</strong></td>
              <td>${escapeHTML(targetTxt)}</td>
              <td>${d.he50Min ? '+' + fmt(d.he50Min) : '—'}</td>
              <td>${d.he100Min ? '+' + fmt(d.he100Min) : '—'}</td>
              <td>${d.debitoBhMin ? '-' + fmt(d.debitoBhMin) : '—'}</td>
              <td>${d.isWorkedDay ? fmt(d.accumulatedBhMin || 0, true) : '—'}</td>
              <td class="l">${escapeHTML(alertsTxt || '—')}</td>
            </tr>`;
          }).join('');
          return `
            <h3>${escapeHTML(w.nome)} · CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato)} · ${escapeHTML(m.monthLabel)}</h3>
            <table class="je-print-table je-print-days">
              <thead>
                <tr>
                  <th>Data</th><th>E1</th><th>S1</th><th>E2</th><th>S2</th><th>Almoço</th>
                  <th>Total SPT</th><th>Trab. CLT</th><th>Jornada</th><th>HE 50%</th><th>HE 100%</th><th>Débito BH</th><th>Saldo BH Acum.</th><th>Observações</th>
                </tr>
              </thead>
              <tbody>${dRows}</tbody>
            </table>
          `;
        }).join('');
      }).join('');
      dailySection = `<h2>2. Espelho de Ponto Diário por Prestador (TSE XT / Digi)</h2>${workerTables}`;
    }

    return `
      <header class="je-print-header">
        <p class="je-print-eyebrow">TSE XT · SPT <span>Modo: TSE XT / Digi (Fiscalização CLT / Digisystem)</span></p>
        <h1>Relatório Consolidado de Horas por Unidade (${detailMode === 'diario' ? 'Detalhe Diário e Mensal' : 'Consolidado Mensal'})</h1>
        <dl class="je-print-meta">
          <div><dt>Unidade</dt><dd>${escapeHTML(report.unitName)}</dd></div>
          <div><dt>Período</dt><dd>${escapeHTML(report.fromBr)} a ${escapeHTML(report.toBr)}</dd></div>
          <div><dt>Contrato</dt><dd>${escapeHTML(report.contratoLabel)}</dd></div>
          <div><dt>Home Office (8h)</dt><dd>${presumeHomeOffice ? `Ligado (${u.homeOfficeDays || 0}d presumidos)` : `Desligado (${uUnreg}d úteis s/ reg.)`}</dd></div>
          <div><dt>Intervalo FDS (&gt;6h)</dt><dd>${deductAutoLunchOnSpecialDays ? 'Desconta 1h (CLT/SPT)' : 'Sem desconto (Digisystem)'}</dd></div>
          <div><dt>Emissão</dt><dd>${escapeHTML(when)}</dd></div>
        </dl>
        ${report.issuer ? `<p class="meta">Emitido por ${escapeHTML(report.issuer)}</p>` : ''}
        <p class="meta">Fonte: SPT - Gestão de Frequência do TSE · TSE XT v${escapeHTML(version)}. Regras ativas: jornada 8h Seg–Sex (tolerância ±10 min art. 58 §1º), almoço mín. 1h (art. 71), Home Office presumido: ${presumeHomeOffice ? 'Ligado' : 'Desligado (padrão de fiscalização)'}, desconto de 1h de intervalo não batido em Sáb/Dom/Fer (&gt;6h): ${deductAutoLunchOnSpecialDays ? 'Ligado (CLT/SPT)' : 'Desligado (Digisystem)'}, e colunas independentes para Saldo BH (Úteis) e HE 100%.</p>
      </header>
      ${printPartialBanner}

      <div class="je-print-metrics">
        <div><span>Trabalhado CLT</span><strong>${fmt(u.cltWorkedMin)}</strong></div>
        <div><span>Horas Normais</span><strong>${fmt(u.horasNormaisMin || 0)}</strong></div>
        <div><span>${presumeHomeOffice ? 'Dias HO Presumidos' : 'Dias Úteis s/ Reg.'}</span><strong>${presumeHomeOffice ? `${u.homeOfficeDays || 0}d` : `${uUnreg}d`}</strong></div>
        <div><span>HE / Créd. BH 50%</span><strong>+${fmt(u.he50BrutoMin || 0)}</strong></div>
        <div><span>Débito BH</span><strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong></div>
        <div><span>Saldo BH (Úteis)</span><strong>${fmt(u.saldoBhMesMin || 0, true)}</strong></div>
        <div class="je-print-metric-focus"><span>HE 100% (FDS)</span><strong>+${fmt(u.he100BrutoMin || 0)}</strong></div>
        <div><span>Visão XT: BH+100%</span><strong>${fmt(u.saldoMesMin || 0, true)}</strong></div>
      </div>

      <h2>1. Consolidação Mensal por Prestador (TSE XT / Digi)</h2>
      <table class="je-print-table">
        <thead>
          <tr>
            <th>Prestador / Contrato</th><th>Mês</th><th>Dias</th><th>Dias úteis sem registro</th><th>Total SPT</th><th>Trab. CLT</th><th>H. Normais</th>
            <th>HE 50% (BH)</th><th>Débito BH</th><th>Saldo BH (Úteis)</th><th>HE 100% (FDS)</th><th>Visão TSE XT: Saldo BH + HE 100% (não é regra da empresa)</th>
          </tr>
        </thead>
        <tbody>${monthlyRows.join('')}</tbody>
      </table>

      ${dailySection}
      ${renderInterpretationAnnexHTML(report, true)}
      <footer class="je-print-footer">TSE XT · Relatório de apoio à gestão contratual e fiscalização de frequência (SPT/TSE · Modo TSE XT / Digi).</footer>
    `;
  }

  function printReport() {
    if (!currentResult || !currentResult.workers || !currentResult.workers.length) return;
    let box = document.getElementById('je-recog-printdoc');
    if (!box) {
      box = document.createElement('div');
      box.id = 'je-recog-printdoc';
      document.body.appendChild(box);
    }
    setSafeHTML(box, buildPrintHTML(currentResult));
    const page = document.createElement('style');
    page.id = 'je-recog-print-page';
    page.textContent = '@page { size: A4 landscape; margin: 10mm; }';
    document.head.appendChild(page);
    document.body.classList.add('je-recog-printing');

    const cleanup = () => {
      document.body.classList.remove('je-recog-printing');
      page.remove();
      box.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 50);
  }

  function close() {
    if (overlay) overlay.classList.remove('active');
  }

  async function open() {
    createDOM();
    overlay.classList.add('active');

    const { units, contracts } = await ensureMetadataLoaded();
    const prefs = await loadPrefs();
    const stored = await loadStoredReport();
    const mainUnitSelect = document.getElementById('cbUnidades');
    const mainContratoSelect = document.getElementById('cbContratos');
    const mainSubunitsCheck = document.getElementById('cbxBuscarUnidAbaixo');

    const mainUnitId = mainUnitSelect ? mainUnitSelect.value : '';
    const initialUnitId = (mainUnitId && mainUnitId !== '1')
      ? mainUnitId
      : ((prefs && prefs.unitId) || mainUnitId || (units[0] && units[0].id) || '1');

    const unitMount = overlay.querySelector('#je-spt-rep-unit-mount');
    unitMount.replaceChildren();
    unitWidget = combo().mountComboboxWidget({
      units,
      initialUnitId,
      inputId: 'je-spt-rep-unit-input',
      placeholder: 'Digite o nome, sigla ou código da unidade...',
      onSelect: () => {
        savePrefs();
        refreshWorkersList();
      }
    });
    unitMount.appendChild(unitWidget.root);

    const contratoSelect = overlay.querySelector('#je-spt-rep-contrato');
    const currentContractVal = (mainContratoSelect && mainContratoSelect.value && mainContratoSelect.value !== '-1')
      ? mainContratoSelect.value
      : ((prefs && prefs.contrato) || '');
    contratoSelect.replaceChildren();
    const optTodos = document.createElement('option');
    optTodos.value = '';
    optTodos.textContent = 'Todos os contratos (opcional)';
    contratoSelect.appendChild(optTodos);
    contracts.forEach((cItem) => {
      const opt = document.createElement('option');
      opt.value = cItem.value;
      opt.textContent = cItem.text;
      if (cItem.value === currentContractVal) opt.selected = true;
      contratoSelect.appendChild(opt);
    });

    const prev = calc().previousMonthPeriod();
    overlay.querySelector('#je-spt-rep-from').value = (prefs && prefs.fromIso) || prev.fromIso;
    overlay.querySelector('#je-spt-rep-to').value = (prefs && prefs.toIso) || prev.toIso;

    if (mainSubunitsCheck) {
      overlay.querySelector('#je-spt-rep-subunits').checked = mainSubunitsCheck.checked;
    } else if (prefs && typeof prefs.buscarAbaixo === 'boolean') {
      overlay.querySelector('#je-spt-rep-subunits').checked = prefs.buscarAbaixo;
    }

    if (prefs && (prefs.calcMode === 'spt_puro' || prefs.calcMode === 'xt_digi')) {
      calcMode = prefs.calcMode;
    } else {
      calcMode = 'xt_digi';
    }
    overlay.querySelectorAll('input[name="je-spt-rep-mode"]').forEach((r) => {
      r.checked = r.value === calcMode;
    });
    overlay.querySelector('#je-spt-seg-mode-xt').classList.toggle('is-active', calcMode === 'xt_digi');
    overlay.querySelector('#je-spt-seg-mode-raw').classList.toggle('is-active', calcMode === 'spt_puro');

    // Migração única (A1): preferências antigas salvas antes de hoDefaultMigratedV2 tinham presumeHomeOffice = true por padrão;
    // migra uma única vez para false (padrão de fiscalização).
    if (prefs && prefs.hoDefaultMigratedV2) {
      presumeHomeOffice = !!prefs.presumeHomeOffice;
    } else {
      presumeHomeOffice = false;
    }
    if (prefs && typeof prefs.deductAutoLunchOnSpecialDays === 'boolean') {
      deductAutoLunchOnSpecialDays = prefs.deductAutoLunchOnSpecialDays;
    } else {
      deductAutoLunchOnSpecialDays = true;
    }
    customHolidaysText = (prefs && typeof prefs.customHolidays === 'string') ? prefs.customHolidays : '';
    syncHomeOfficeCheckboxState();
    if (!prefs || !prefs.hoDefaultMigratedV2) {
      savePrefs();
    }

    if (prefs && (prefs.detailMode === 'diario' || prefs.detailMode === 'mensal')) {
      detailMode = prefs.detailMode;
      overlay.querySelectorAll('input[name="je-spt-rep-detail"]').forEach((r) => {
        r.checked = r.value === detailMode;
      });
      overlay.querySelector('#je-spt-seg-mensal').classList.toggle('is-active', detailMode === 'mensal');
      overlay.querySelector('#je-spt-seg-diario').classList.toggle('is-active', detailMode === 'diario');
    }

    await refreshWorkersList();

    if (stored && stored.unitId === unitWidget.getValue()) {
      currentResult = calc().recomputeReportWithOptions(stored, {
        presumeHomeOffice,
        deductAutoLunchOnSpecialDays,
        customHolidays: customHolidaysText
      });
      renderResult(currentResult);
    } else {
      renderResult(null);
    }
  }

  return {
    open,
    close,
    isRunning: () => running
  };
})();
