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
  let workerSearchQuery = '';
  let selectedSingleWorkerCode = '__ALL__'; // '__ALL__' | '__CUSTOM__' | codigo específico
  let calcMode = 'xt_digi'; // 'xt_digi' (padrão) | 'spt_puro'
  let presumeHomeOffice = true; // padrão: considera dias úteis sem batida como Home Office (8h) + Reposição de DSR
  let detailMode = 'mensal'; // 'mensal' | 'diario'
  let showOnlyActiveDaysInDaily = false;
  let currentResult = null;
  let expandedMonthlyRows = new Set();

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

  async function ensureMetadataLoaded() {
    const cb = combo();
    let units = cb ? cb.getAvailableUnits(document) : [];
    let contracts = cb ? cb.getAvailableContracts(document) : [];
    let csrf = getCsrfToken(document);

    if (!units.length || !csrf) {
      try {
        const resp = await fetch(GESTAO_HOME_URL, { credentials: 'include' });
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (cb) {
          cb.cacheUnitsAndContractsFromDOM(doc);
          units = cb.getAvailableUnits(doc);
          contracts = cb.getAvailableContracts(doc);
        }
        if (!csrf) csrf = getCsrfToken(doc);
      } catch (_) {}
    }

    return { units, contracts, csrf };
  }

  function findPeriodForContractAndMonth(contrato, ymBr) {
    const lPeriodos = Array.isArray(window.lPeriodos) ? window.lPeriodos : [];
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
    const { csrf } = await ensureMetadataLoaded();
    if (!unitId || !csrf) return [];

    const slices = c.splitDateRangeByMonth(fromIso, toIso);
    const refSlice = slices[slices.length - 1] || c.previousMonthPeriod();
    const ymBr = refSlice.periodoDescricao || refSlice.label || '10/2026';
    const refDateIso = refSlice.dtFinalIso || refSlice.toIso || '2026-10-15';

    const contractParam = contrato && contrato !== '-1' ? String(contrato) : '-1';
    const periodInfo = findPeriodForContractAndMonth(contractParam, ymBr);

    async function queryWithDate(dateIso, pInfo) {
      const tuple = (pInfo && pInfo.tuple) || ['', '', '', ''];
      const body = new URLSearchParams({
        _csrf: csrf,
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
      const resp = await fetch(PONTO_GESTAO_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return c.parseWorkersFromConsultationDoc(doc);
    }

    let list = await queryWithDate(refDateIso, periodInfo);

    if (list.length === 0 && periodInfo.tuple && periodInfo.tuple[3]) {
      const fallbackIso = c.brToIso(periodInfo.tuple[3]);
      if (fallbackIso && fallbackIso !== refDateIso) {
        list = await queryWithDate(fallbackIso, periodInfo);
      }
    }

    const prev = c.previousMonthPeriod();
    if (contractParam === '-1' && prev.toIso && prev.toIso !== refDateIso) {
      try {
        const prevList = await queryWithDate(prev.toIso, { idx: -1, tuple: null });
        const byCode = new Map();
        list.concat(prevList).forEach((w) => {
          if (!byCode.has(w.codigo)) byCode.set(w.codigo, w);
        });
        list = Array.from(byCode.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      } catch (_) {}
    }

    return list;
  }

  async function fetchWorkerMonthSlice(worker, slice, unitId, buscarAbaixo = true, applyHomeOffice = true) {
    const { csrf } = await ensureMetadataLoaded();
    const periodInfo = findPeriodForContractAndMonth(worker.contrato, slice.periodoDescricao);
    const body = new URLSearchParams({
      _csrf: csrf,
      cmd: 'cmdVerPeriodoContrato',
      periodoCodigo: worker.contrato || (periodInfo.tuple && periodInfo.tuple[0]) || '',
      periodoDescricao: slice.periodoDescricao,
      periodoDtInicio: slice.dtInicioBr,
      periodoDtFinal: slice.dtFinalBr,
      codContrato: worker.contrato || '',
      codTSE: worker.cpf || '',
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
    if (/login|encerrada/i.test(resp.url)) {
      return { loggedOut: true };
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parsed = calc().parseWorkerSheetDoc(doc, {
      dtInicioIso: slice.dtInicioIso,
      dtFinalIso: slice.dtFinalIso
    });
    const summary = calc().summarizeMonthClt(parsed.days, {
      ymKey: slice.ymKey,
      monthLabel: slice.periodoDescricao,
      presumeHomeOffice: !!applyHomeOffice
    });
    return {
      loggedOut: false,
      meta: parsed.meta,
      summary
    };
  }

  function loadStoredReport() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [STORAGE_KEY]: null }, (items) => resolve((items && items[STORAGE_KEY]) || null));
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
    if (!hoCheck) return;
    hoCheck.checked = presumeHomeOffice;
    hoCheck.disabled = running || calcMode === 'spt_puro';
    if (hoWrap) {
      hoWrap.style.opacity = calcMode === 'spt_puro' ? '0.45' : '1';
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
            <div class="je-spt-rep-field je-spt-rep-field-unit">
              <div class="je-spt-rep-label-row">
                <label for="je-spt-rep-unit-input">Unidade (Seção / Coordenadoria) <span class="je-req">*</span></label>
                <label class="je-spt-rep-check-inline" title="Inclui os prestadores alocados nas subunidades subordinadas">
                  <input type="checkbox" id="je-spt-rep-subunits" checked>
                  <span>Buscar unidades abaixo</span>
                </label>
              </div>
              <div id="je-spt-rep-unit-mount"></div>
            </div>

            <div class="je-spt-rep-field">
              <label for="je-spt-rep-from">Data inicial <span class="je-req">*</span></label>
              <input type="date" id="je-spt-rep-from" class="je-spt-input" value="${escapeHTML(prev.fromIso)}" required>
            </div>

            <div class="je-spt-rep-field">
              <label for="je-spt-rep-to">Data final <span class="je-req">*</span></label>
              <input type="date" id="je-spt-rep-to" class="je-spt-input" value="${escapeHTML(prev.toIso)}" required>
            </div>

            <div class="je-spt-rep-field">
              <label for="je-spt-rep-contrato">Contrato <span class="je-opt">(opcional)</span></label>
              <select id="je-spt-rep-contrato" class="je-spt-select">
                <option value="">Todos os contratos</option>
              </select>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-prestador">
              <label for="je-spt-rep-worker-select">Nome do Prestador</label>
              <select id="je-spt-rep-worker-select" class="je-spt-select">
                <option value="__ALL__">Carregando prestadores da unidade...</option>
              </select>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-mode">
              <span class="je-spt-rep-label-text">Modo</span>
              <div class="je-spt-segmented" role="radiogroup" aria-label="Modo de cálculo do relatório">
                <label class="je-spt-seg-item is-active" id="je-spt-seg-mode-xt" title="Regras CLT / Digisystem: jornada 8h Seg–Sex, tolerância ±10 min (art. 58 §1º), Sáb/Dom/Feriado com jornada 00:00 (100% HE 100%) e separação entre Saldo BH (50% × Débito) e HE 100%">
                  <input type="radio" name="je-spt-rep-mode" value="xt_digi" checked>
                  <span>TSE XT / Digi</span>
                </label>
                <label class="je-spt-seg-item" id="je-spt-seg-mode-raw" title="Dados brutos retornados pelo SPT (batidas e Total SPT), sem interpretação ou cálculo do TSE XT">
                  <input type="radio" name="je-spt-rep-mode" value="spt_puro">
                  <span>SPT Puro (Bruto)</span>
                </label>
              </div>
            </div>

            <div class="je-spt-rep-field je-spt-rep-field-detail">
              <span class="je-spt-rep-label-text">Detalhe</span>
              <div class="je-spt-segmented" role="radiogroup" aria-label="Nível de detalhe do relatório">
                <label class="je-spt-seg-item is-active" id="je-spt-seg-mensal">
                  <input type="radio" name="je-spt-rep-detail" value="mensal" checked>
                  <span>Mensal</span>
                </label>
                <label class="je-spt-seg-item" id="je-spt-seg-diario">
                  <input type="radio" name="je-spt-rep-detail" value="diario">
                  <span>Diário (Espelho)</span>
                </label>
              </div>
            </div>
          </div>

          <div class="je-spt-rep-toolbar-bottom">
            <details class="je-recog-team je-spt-team-details" id="je-spt-rep-team">
              <summary id="je-spt-rep-team-summary">Prestadores selecionados (carregando...)</summary>
              <div class="je-recog-team-actions je-spt-team-actions">
                <input type="search" id="je-spt-rep-worker-search" class="je-spt-input je-spt-worker-search" placeholder="Filtrar prestador por nome, CPF ou contrato..." autocorrect="off" autocapitalize="none" spellcheck="false">
                <button type="button" class="je-audit-btn" id="je-spt-rep-all">Selecionar todos</button>
                <button type="button" class="je-audit-btn" id="je-spt-rep-none">Limpar seleção</button>
              </div>
              <div class="je-recog-team-list" id="je-spt-rep-team-list"></div>
            </details>

            <label class="je-spt-rep-check-inline je-spt-ho-toggle" id="je-spt-rep-ho-wrap" title="Nos dias úteis sem batida na catraca, considera 8h cumpridas em Home Office (sem gerar batidas fictícias) e aplica folga automática de Reposição de DSR quando o prestador trabalhou no domingo / mais de 6 dias seguidos (CLT art. 67)">
              <input type="checkbox" id="je-spt-rep-homeoffice" checked>
              <span>Presumir <strong>Home Office (8h)</strong> em dias úteis sem batida + <strong>Reposição de DSR</strong> (&gt; 6d seguidos)</span>
            </label>

            <div class="je-audit-actions je-spt-rep-actions">
              <button type="button" class="je-audit-btn je-audit-btn-primary" id="je-spt-rep-run">
                Gerar relatório
              </button>
              <button type="button" class="je-audit-btn" id="je-spt-rep-csv" disabled>
                CSV
              </button>
              <button type="button" class="je-audit-btn" id="je-spt-rep-print" disabled>
                Imprimir / PDF
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
        savePrefs();
        markDirtySelection();
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

    overlay.querySelector('#je-spt-rep-homeoffice').addEventListener('change', async (e) => {
      presumeHomeOffice = !!e.target.checked;
      savePrefs();
      if (currentResult) {
        currentResult = calc().recomputeReportWithOptions(currentResult, { presumeHomeOffice });
        await saveStoredReport(currentResult);
        renderResult(currentResult);
      }
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
      opt.textContent = 'Nenhum prestador encontrado para esta unidade/contrato';
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = running;
    const optAll = document.createElement('option');
    optAll.value = '__ALL__';
    optAll.textContent = `Todos os prestadores (${workersList.length})`;
    sel.appendChild(optAll);

    workersList.forEach((w) => {
      const opt = document.createElement('option');
      opt.value = w.codigo;
      opt.textContent = `${w.nome} (${w.numContrato || 'Contrato'})`;
      sel.appendChild(opt);
    });

    syncSingleWorkerDropdownFromCheckboxes();
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
    setSafeHTML(
      summaryEl,
      workersList.length
        ? `Prestadores: <strong>${checkedCount}</strong> de <strong>${workersList.length}</strong> selecionado(s) · clique para filtrar ou marcar individualmente`
        : 'Prestadores: <strong>0</strong> encontrados nesta unidade/contrato'
    );
    if (runBtn) runBtn.disabled = running || checkedCount === 0;
  }

  function paintWorkersList() {
    const listEl = overlay.querySelector('#je-spt-rep-team-list');
    if (!listEl) return;
    const q = calc().normalizeText(workerSearchQuery);
    const visible = workersList.filter((w) => {
      if (!q) return true;
      return calc().normalizeText(`${w.nome} ${w.cpf} ${w.numContrato}`).includes(q);
    });

    const html = visible.map((w) => `
      <label class="je-recog-team-item je-spt-worker-item" title="${escapeHTML(w.nome)} · CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato)}">
        <input type="checkbox" data-codigo="${escapeHTML(w.codigo)}"${w.checked ? ' checked' : ''}${running ? ' disabled' : ''}>
        <span class="je-spt-worker-name">${escapeHTML(w.nome)}</span>
        <small class="je-spt-worker-contract">${escapeHTML(w.numContrato || '')}</small>
      </label>
    `).join('');

    setSafeHTML(listEl, html || '<div class="je-spt-worker-empty">Nenhum prestador corresponde ao filtro digitado.</div>');
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
      populateWorkerDropdown();
      paintWorkersList();
      return;
    }

    loadingWorkers = true;
    populateWorkerDropdown();
    paintWorkersSummary();

    try {
      const fetched = await fetchWorkersByUnitAndContract(unitId, contrato, fromIso, toIso, buscarAbaixo);
      workersList = fetched.map((w) => Object.assign({}, w, { checked: true }));
      selectedSingleWorkerCode = '__ALL__';
    } catch (e) {
      console.warn('[TSE XT] Falha ao carregar prestadores da unidade:', e);
      workersList = [];
    } finally {
      loadingWorkers = false;
      populateWorkerDropdown();
      paintWorkersList();
      markDirtySelection();
    }
  }

  function markDirtySelection() {
    if (!overlay) return;
    const checkedCount = workersList.filter((w) => w.checked).length;
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
      alert('Selecione a Unidade para gerar o relatório.');
      return;
    }
    const slices = calc().splitDateRangeByMonth(fromIso, toIso);
    if (!slices.length) {
      alert('Informe um período válido (data inicial menor ou igual à data final).');
      return;
    }
    if (!picked.length) {
      alert('Selecione ao menos um prestador.');
      return;
    }

    running = true;
    aborted = false;
    expandedMonthlyRows.clear();
    savePrefs();
    toggleProgress(true);

    const totalSteps = picked.length * slices.length;
    let doneSteps = 0;
    let loggedOut = false;
    const workersOut = [];

    for (const w of picked) {
      if (aborted || loggedOut) break;
      const wEntry = {
        codigo: w.codigo,
        matricula: w.matricula,
        cpf: w.cpf,
        contrato: w.contrato,
        numContrato: w.numContrato,
        nome: w.nome,
        empresa: '',
        months: []
      };

      for (const slice of slices) {
        if (aborted) break;
        setProgress(doneSteps, totalSteps, `${w.nome} · ${slice.periodoDescricao}`);
        try {
          const res = await fetchWorkerMonthSlice(w, slice, unit.id, buscarAbaixo, presumeHomeOffice);
          if (res.loggedOut) {
            loggedOut = true;
            break;
          }
          if (res.meta && res.meta.contrato && !wEntry.empresa) {
            wEntry.empresa = res.meta.contrato;
          }
          wEntry.months.push(res.summary);
        } catch (err) {
          console.warn('[TSE XT] Erro ao consultar prestador no SPT:', w.nome, slice.periodoDescricao, err);
        }
        doneSteps += 1;
        await sleep(FETCH_THROTTLE_MS);
      }

      wEntry.totals = calc().summarizeWorkerMonths(wEntry.months);
      workersOut.push(wEntry);
    }

    const report = {
      version: 3,
      generatedAt: new Date().toISOString(),
      issuer: loggedUserName(),
      unitId: unit.id,
      unitName: unit.cleanName,
      unitPath: unit.parentPath,
      buscarAbaixo,
      presumeHomeOffice,
      fromIso,
      toIso,
      fromBr: calc().isoToBr(fromIso),
      toBr: calc().isoToBr(toIso),
      contrato,
      contratoLabel: contratoText,
      partial: aborted || loggedOut,
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
    if (!alertsObj) return '<span class="je-spt-badge-ok">Regular</span>';
    const badges = [];
    if (alertsObj.homeOfficeDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-info" title="Dias úteis sem marcação na catraca contabilizados como Home Office (8h)">Home Office (${alertsObj.homeOfficeDays}d)</span>`);
    }
    if (alertsObj.dsrCompensatedDays > 0) {
      badges.push(`<span class="je-occ-perda je-occ-perda-neutral" title="Folga compensatória automática (CLT art. 67 / OJ 410 TST) após domingo trabalhado / mais de 6 dias seguidos">Reposição DSR (${alertsObj.dsrCompensatedDays}d)</span>`);
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
    return badges.length ? badges.join(' ') : '<span class="je-spt-badge-ok">Regular</span>';
  }

  function renderDayAlertsHTML(day) {
    const parts = [];
    if (day.justificativa) {
      parts.push(`<span class="je-spt-just-tag">${escapeHTML(day.justificativa)}</span>`);
    }
    (day.alerts || []).forEach((a) => {
      const tone = a.code === 'acima-2h-extra'
        ? 'danger'
        : (a.code === 'intervalo-curto' || a.code === 'batida-impar'
          ? 'warn'
          : (a.code === 'reposicao-dsr' || a.code === 'feriado' ? 'neutral' : 'info'));
      parts.push(`<span class="je-occ-perda je-occ-perda-${tone}" title="${escapeHTML(a.tip)}">${escapeHTML(a.label)}</span>`);
    });
    return parts.join(' ') || '·';
  }

  function formatDaysCell(m) {
    const presU = m.workedWeekdays || 0;
    const ho = m.homeOfficeDays || 0;
    const fds = m.workedWeekendDays || 0;
    const dsr = m.dsrCompensatedDays || 0;
    const parts = [`${presU}u`];
    if (ho > 0) parts.push(`${ho}ho`);
    parts.push(`${fds}f`);
    if (dsr > 0) parts.push(`${dsr}dsr`);
    return `<strong>${m.workedDays}d</strong><br><small>${parts.join(' + ')}</small>`;
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
        <td><strong>${escapeHTML(d.date)}</strong></td>
        <td>${escapeHTML(d.dayLabel)}</td>
        <td>${escapeHTML(p[0] || '·')}</td>
        <td>${escapeHTML(p[1] || '·')}</td>
        <td>${escapeHTML(p[2] || '·')}</td>
        <td>${escapeHTML(p[3] || '·')}</td>
        <td>${escapeHTML(p[4] || '·')}</td>
        <td>${escapeHTML(p[5] || '·')}</td>
        <td class="je-spt-col-left">${d.justificativa ? `<span class="je-spt-just-tag">${escapeHTML(d.justificativa)}</span>` : '·'}</td>
        <td><strong>${d.sptTotalMin ? fmt(d.sptTotalMin) : '·'}</strong></td>
      </tr>`;
    }).join('');

    const m = monthSummary;
    const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
    return `
      <table class="je-recog-days je-spt-daily-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Ent. 1</th>
            <th>Saí. 1</th>
            <th>Ent. 2</th>
            <th>Saí. 2</th>
            <th>Ent. 3</th>
            <th>Saí. 3</th>
            <th class="je-spt-col-left">Justificativa (SPT)</th>
            <th title="Total bruto de horas calculado pelo próprio SPT">Total SPT</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
        <tfoot>
          <tr class="je-recog-total">
            <td colspan="9" class="je-spt-col-left"><strong>Total SPT Bruto (${escapeHTML(m.monthLabel)}) · ${presDays} dia(s) com marcação válida na catraca</strong></td>
            <td><strong>${fmt(m.sptTotalMin)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  function renderMonthlyRawTableHTML(report) {
    const rows = [];
    report.workers.forEach((w, wIdx) => {
      w.months.forEach((m, mIdx) => {
        const rowId = `${wIdx}:${mIdx}`;
        const isExpanded = expandedMonthlyRows.has(rowId);
        const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
        rows.push(`
          <tr class="je-audit-row je-recog-server" data-expand-row="${rowId}" role="button" tabindex="0" aria-expanded="${isExpanded}">
            <td class="je-spt-col-left">
              <span class="je-recog-caret">${isExpanded ? '▾' : '▸'}</span>
              <strong>${escapeHTML(w.nome)}</strong>
              <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
            </td>
            <td>${escapeHTML(m.monthLabel)}</td>
            <td><strong>${presDays}d</strong></td>
            <td>${m.workedWeekdays || 0}d</td>
            <td>${m.workedWeekendDays || 0}d</td>
            <td>${m.justifiedDays || 0}d</td>
            <td>${(m.alerts && m.alerts.batidaImparDays) || 0}d</td>
            <td><strong>${fmt(m.sptTotalMin)}</strong></td>
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
        <td class="je-spt-col-left"><strong>Total Bruto da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores c/ marcação)</strong></td>
        <td>—</td>
        <td><strong>${uPres}d</strong></td>
        <td><strong>${u.workedWeekdays || 0}d</strong></td>
        <td><strong>${u.workedWeekendDays || 0}d</strong></td>
        <td><strong>${u.justifiedDays || 0}d</strong></td>
        <td><strong>${(u.alerts && u.alerts.batidaImparDays) || 0}d</strong></td>
        <td><strong>${fmt(u.sptTotalMin)}</strong></td>
      </tr>
    `);

    return `
      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-recog-table je-spt-monthly-table">
          <thead>
            <tr>
              <th class="je-spt-col-left" title="Clique em qualquer prestador para abrir ou recolher o espelho bruto do SPT">Prestador / Contrato</th>
              <th>Mês</th>
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
      ? monthSummary.days.filter((d) => d.isWorkedDay || d.isDsrCompensated || d.punchCount > 0 || d.justificativa)
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
            : (d.effectiveLunchMin > 0 ? fmt(d.effectiveLunchMin) : '—')))
        : '·';
      const rowClass = [
        d.isSpecialDay ? 'je-spt-row-weekend' : '',
        d.isWorkedDay ? 'je-spt-row-worked' : 'je-spt-row-empty'
      ].filter(Boolean).join(' ');

      const accumBhClass = d.accumulatedBhMin > 0
        ? 'je-spt-pos'
        : (d.accumulatedBhMin < 0 ? 'je-spt-neg' : '');

      const targetText = d.isWorkedDay
        ? (d.isSpecialDay ? '00:00' : fmt(d.targetMin))
        : (d.isDsrCompensated ? '00:00' : '·');

      return `<tr class="${rowClass}">
        <td><strong>${escapeHTML(d.date)}</strong></td>
        <td>${escapeHTML(d.dayLabel)}</td>
        <td>${escapeHTML(p[0] || '·')}</td>
        <td>${escapeHTML(p[1] || '·')}</td>
        <td>${escapeHTML(p[2] || '·')}</td>
        <td>${escapeHTML(p[3] || '·')}</td>
        <td>${escapeHTML(p[4] || '·')}</td>
        <td>${escapeHTML(p[5] || '·')}</td>
        <td>${escapeHTML(lunchLabel)}</td>
        <td>${d.sptTotalMin ? fmt(d.sptTotalMin) : '·'}</td>
        <td><strong>${d.cltWorkedMin ? fmt(d.cltWorkedMin) : '·'}</strong></td>
        <td>${escapeHTML(targetText)}</td>
        <td class="${d.he50Min ? 'je-spt-pos' : ''}">${d.he50Min ? '+' + fmt(d.he50Min) : '·'}</td>
        <td class="${d.he100Min ? 'je-spt-pos' : ''}">${d.he100Min ? '+' + fmt(d.he100Min) : '·'}</td>
        <td class="${d.debitoBhMin ? 'je-spt-neg' : ''}">${d.debitoBhMin ? '-' + fmt(d.debitoBhMin) : '·'}</td>
        <td class="${accumBhClass}">${d.isWorkedDay ? fmt(d.accumulatedBhMin, true) : '·'}</td>
        <td class="je-spt-col-left">${renderDayAlertsHTML(d)}</td>
      </tr>`;
    }).join('');

    const m = monthSummary;
    const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');

    return `
      <table class="je-recog-days je-spt-daily-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Ent. 1</th>
            <th>Saí. 1</th>
            <th>Ent. 2</th>
            <th>Saí. 2</th>
            <th>Ent. 3</th>
            <th>Saí. 3</th>
            <th title="Intervalo intrajornada de almoço (mínimo de 1h para jornadas &gt; 6h — CLT art. 71)">Almoço</th>
            <th title="Total bruto exibido pela catraca do SPT">Total SPT</th>
            <th title="Horas líquidas trabalhadas segundo a CLT (presencial + Home Office quando habilitado)">Líq. CLT</th>
            <th title="Jornada ordinária: 08:00 de Seg–Sex e 00:00 em Sábados, Domingos, Feriados e Reposição de DSR">Jornada</th>
            <th title="Horas Extras / Crédito BH 50% (dias úteis até 2h, após tolerância de 10 min da CLT art. 58 §1º)">HE 50% (BH)</th>
            <th title="Horas Extras / Crédito 100% (100% das horas de Sábados, Domingos e Feriados + excedente &gt; 2h em dia útil)">HE 100%</th>
            <th title="Débito de Banco de Horas nos dias úteis (variação negativa superior a 10 min para completar 08:00)">Débito BH</th>
            <th title="Saldo acumulado do Banco de Horas de dias úteis (HE 50% − Débito BH)">Saldo BH Acum.</th>
            <th class="je-spt-col-left">Justificativa / Ocorrências</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
        <tfoot>
          <tr class="je-recog-total">
            <td colspan="9" class="je-spt-col-left"><strong>Consolidado (${escapeHTML(m.monthLabel)}) · ${m.workedDays}d (${m.workedWeekdays || 0}u pres. + ${m.homeOfficeDays || 0}d HO + ${m.workedWeekendDays || 0}d FDS · ${m.dsrCompensatedDays || 0}d DSR) · H. Normais: ${fmt(m.horasNormaisMin || 0)}</strong></td>
            <td><strong>${fmt(m.sptTotalMin)}</strong></td>
            <td><strong>${fmt(m.cltWorkedMin)}</strong></td>
            <td><strong>${fmt(m.expectedJourneyMin)}</strong></td>
            <td class="je-spt-pos"><strong>+${fmt(m.he50BrutoMin || 0)}</strong></td>
            <td class="je-spt-pos"><strong>+${fmt(m.he100BrutoMin || 0)}</strong></td>
            <td class="je-spt-neg"><strong>-${fmt(m.debitoBhBrutoMin || 0)}</strong></td>
            <td class="${saldoBhClass}"><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></td>
            <td class="je-spt-col-left">Saldo BH: <strong>${fmt(m.saldoBhMesMin || 0, true)}</strong> · HE 100%: <strong>+${fmt(m.he100BrutoMin || 0)}</strong></td>
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
        const rowId = `${wIdx}:${mIdx}`;
        const isExpanded = expandedMonthlyRows.has(rowId);
        const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
        const saldoTotalClass = m.saldoMesMin > 0 ? 'je-spt-pos' : (m.saldoMesMin < 0 ? 'je-spt-neg' : '');
        rows.push(`
          <tr class="je-audit-row je-recog-server" data-expand-row="${rowId}" role="button" tabindex="0" aria-expanded="${isExpanded}">
            <td class="je-spt-col-left">
              <span class="je-recog-caret">${isExpanded ? '▾' : '▸'}</span>
              <strong>${escapeHTML(w.nome)}</strong>
              <small class="je-spt-sub-meta">CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small>
            </td>
            <td>${escapeHTML(m.monthLabel)}</td>
            <td title="${m.workedWeekdays || 0}d úteis presenciais + ${m.homeOfficeDays || 0}d Home Office + ${m.workedWeekendDays || 0}d FDS/feriado (${m.dsrCompensatedDays || 0}d Reposição de DSR)">${formatDaysCell(m)}</td>
            <td>${fmt(m.sptTotalMin)}</td>
            <td><strong>${fmt(m.cltWorkedMin)}</strong></td>
            <td>${fmt(m.horasNormaisMin || 0)}</td>
            <td class="${m.he50BrutoMin ? 'je-spt-pos' : ''}">${dot(m.he50BrutoMin, true)}</td>
            <td class="${m.debitoBhBrutoMin ? 'je-spt-neg' : ''}">${m.debitoBhBrutoMin ? '-' + fmt(m.debitoBhBrutoMin) : '·'}</td>
            <td class="${saldoBhClass}" title="Saldo do Banco de Horas nos dias úteis (HE 50% − Débito BH). Compensado: ${fmt(m.compensadoBhMin || 0)}"><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></td>
            <td class="${m.he100BrutoMin ? 'je-spt-pos' : ''}" title="100% das horas em Sábados, Domingos e Feriados + excedente &gt; 2h em dia útil"><strong>${dot(m.he100BrutoMin, true)}</strong></td>
            <td class="${saldoTotalClass}" title="Saldo BH de dias úteis (${fmt(m.saldoBhMesMin || 0, true)}) + HE 100% (+${fmt(m.he100BrutoMin || 0)})"><strong>${fmt(m.saldoMesMin, true)}</strong></td>
            <td class="je-spt-col-left">${renderBadgesHTML(m.alerts)}</td>
          </tr>
        `);
        if (isExpanded) {
          rows.push(`
            <tr class="je-recog-daysrow">
              <td colspan="12">${renderDailyMirrorTableHTML(m)}</td>
            </tr>
          `);
        }
      });
    });

    const u = report.unitTotals;
    const totalSaldoBhClass = u.saldoBhMesMin > 0 ? 'je-spt-pos' : (u.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
    const totalSaldoClass = u.saldoMesMin > 0 ? 'je-spt-pos' : (u.saldoMesMin < 0 ? 'je-spt-neg' : '');
    rows.push(`
      <tr class="je-recog-total">
        <td class="je-spt-col-left"><strong>Total Consolidado da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores ativos)</strong></td>
        <td>—</td>
        <td><strong>${formatDaysCell(u)}</strong></td>
        <td><strong>${fmt(u.sptTotalMin)}</strong></td>
        <td><strong>${fmt(u.cltWorkedMin)}</strong></td>
        <td><strong>${fmt(u.horasNormaisMin || 0)}</strong></td>
        <td class="je-spt-pos"><strong>+${fmt(u.he50BrutoMin || 0)}</strong></td>
        <td class="je-spt-neg"><strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong></td>
        <td class="${totalSaldoBhClass}"><strong>${fmt(u.saldoBhMesMin || 0, true)}</strong></td>
        <td class="je-spt-pos"><strong>+${fmt(u.he100BrutoMin || 0)}</strong></td>
        <td class="${totalSaldoClass}"><strong>${fmt(u.saldoMesMin, true)}</strong></td>
        <td class="je-spt-col-left">${renderBadgesHTML(u.alerts)}</td>
      </tr>
    `);

    return `
      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-recog-table je-spt-monthly-table">
          <thead>
            <tr>
              <th class="je-spt-col-left" title="Clique em qualquer prestador para abrir ou recolher o espelho de ponto diário">Prestador / Contrato</th>
              <th>Mês</th>
              <th title="Dias contabilizados (u = úteis presenciais, ho = Home Office 8h, f = FDS/feriados, dsr = Reposição de DSR)">Dias</th>
              <th title="Soma pura da coluna Total da catraca do SPT">Total SPT</th>
              <th title="Total líquido trabalhado conforme CLT (presencial + Home Office 8h quando ativo)">Trab. CLT</th>
              <th title="Horas Normais cumpridas nos dias úteis (presencial + Home Office 8h, com tolerância de ±10 min)">H. Normais</th>
              <th title="HE / Créditos BH 50% (excedente em dias úteis até 2h/dia, igual ao rodapé do Cartão Ponto Digisystem)">HE 50% (BH)</th>
              <th title="Débito BH nos dias úteis (horas faltantes para 08:00 além da tolerância de 10 min, igual ao rodapé Digisystem)">Débito BH</th>
              <th title="Saldo de Banco de Horas nos dias úteis (HE 50% − Débito BH)">Saldo BH (Úteis)</th>
              <th title="HE / Créditos BH 100% (100% das horas trabalhadas em Sábados, Domingos e Feriados + excedente &gt; 2h em dia útil)">HE 100% (FDS)</th>
              <th title="Saldo Global no Mês (Saldo BH Úteis + HE 100%)">Saldo Total</th>
              <th class="je-spt-col-left">Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
      <p class="je-audit-foot">Clique em qualquer linha da tabela para expandir o <strong>Espelho de Ponto Diário</strong> daquele prestador, ou alterne o parâmetro <strong>Detalhe</strong> acima para <em>Diário (Espelho)</em>.</p>
    `;
  }

  function renderDailyViewHTML(report) {
    const isRaw = calcMode === 'spt_puro';
    const blocks = report.workers.map((w) => {
      const monthBlocks = w.months.map((m) => {
        const saldoBhClass = m.saldoBhMesMin > 0 ? 'je-spt-pos' : (m.saldoBhMesMin < 0 ? 'je-spt-neg' : '');
        const presDays = m.presencialWorkedDays != null ? m.presencialWorkedDays : m.workedDays;
        const kpisHTML = isRaw
          ? `
            <div class="je-spt-daily-kpis">
              <div class="je-spt-mini-kpi"><span>Dias c/ Registro</span><strong>${presDays}d</strong></div>
              <div class="je-spt-mini-kpi"><span>Seg–Sex</span><strong>${m.workedWeekdays || 0}d</strong></div>
              <div class="je-spt-mini-kpi"><span>Sáb/Dom/Fer</span><strong>${m.workedWeekendDays || 0}d</strong></div>
              <div class="je-spt-mini-kpi"><span>Total SPT (Bruto)</span><strong>${fmt(m.sptTotalMin)}</strong></div>
            </div>
          `
          : `
            <div class="je-spt-daily-kpis">
              <div class="je-spt-mini-kpi"><span>H. Normais</span><strong>${fmt(m.horasNormaisMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi"><span>Trab. CLT</span><strong>${fmt(m.cltWorkedMin)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-pos"><span>HE 50% (BH)</span><strong>+${fmt(m.he50BrutoMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-neg"><span>Débito BH</span><strong>-${fmt(m.debitoBhBrutoMin || 0)}</strong></div>
              <div class="je-spt-mini-kpi ${saldoBhClass}"><span>Saldo BH</span><strong>${fmt(m.saldoBhMesMin || 0, true)}</strong></div>
              <div class="je-spt-mini-kpi je-spt-pos"><span>HE 100% (FDS)</span><strong>+${fmt(m.he100BrutoMin || 0)}</strong></div>
            </div>
          `;
        return `
          <div class="je-spt-daily-card">
            <div class="je-spt-daily-card-head">
              <div>
                <h4 class="je-spt-daily-worker-title">${escapeHTML(w.nome)} <span class="je-spt-daily-month-pill">${escapeHTML(m.monthLabel)}</span></h4>
                <p class="je-spt-daily-worker-sub">CPF: <strong>${escapeHTML(formatCpf(w.cpf))}</strong> · Contrato: <strong>${escapeHTML(w.empresa || w.numContrato || '—')}</strong> · Dias: <strong>${m.workedDays}</strong> (${m.workedWeekdays || 0}u pres. + ${m.homeOfficeDays || 0}d HO + ${m.workedWeekendDays || 0}d FDS · ${m.dsrCompensatedDays || 0}d DSR)</p>
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
        <label class="je-spt-rep-check-inline">
          <input type="checkbox" id="je-spt-daily-only-active"${showOnlyActiveDaysInDaily ? ' checked' : ''}>
          <span>Ocultar dias em branco (mostrar apenas dias com batida, Home Office ou Reposição de DSR)</span>
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

    if (!report || !Array.isArray(report.workers) || !report.workers.length) {
      csvBtn.disabled = true;
      printBtn.disabled = true;
      setSafeHTML(body, `
        <div class="je-audit-empty">
          <p>Selecione a <strong>Unidade</strong>, o <strong>Período</strong>, o <strong>Contrato</strong> (opcional), os <strong>Prestadores</strong> e o <strong>Modo</strong> (<em>TSE XT / Digi</em> ou <em>SPT Puro</em>) e clique em <strong>Gerar relatório</strong>.</p>
          <p>No modo padrão <strong>TSE XT / Digi</strong>, o relatório aplica as regras da CLT e do Cartão Ponto da empresa: jornada de 8h de segunda a sexta (tolerância de ±10 min do art. 58 §1º), mínimo de 1h de almoço (art. 71), presunção opcional de <strong>Home Office (8h)</strong> nos dias úteis sem batida com <strong>Reposição de DSR</strong> após &gt; 6 dias seguidos (art. 67), sábados/domingos/feriados com jornada 00:00 (100% em <strong>HE 100%</strong>) e separação entre <strong>Saldo BH (50% × Débito BH)</strong> e <strong>HE 100%</strong>.</p>
        </div>
      `);
      return;
    }

    csvBtn.disabled = false;
    printBtn.disabled = false;

    const u = report.unitTotals || calc().summarizeUnitReport(report.workers);
    const when = report.generatedAt ? new Date(report.generatedAt).toLocaleString('pt-BR') : '';
    const alertBanner = flags.loggedOut
      ? '<div class="je-audit-alert">Sessão expirada no SPT durante a consulta. Faça login novamente e gere o relatório.</div>'
      : (report.partial ? '<div class="je-audit-alert">Consulta interrompida pelo usuário. O resultado exibido é parcial.</div>' : '');

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
      `);
    } else {
      const saldoBhSign = fmt(u.saldoBhMesMin || 0, true);
      const hoBadge = presumeHomeOffice
        ? ` · Home Office presumido: <strong>${u.homeOfficeDays || 0}d</strong> · Reposição DSR: <strong>${u.dsrCompensatedDays || 0}d</strong>`
        : '';
      setSafeHTML(body, `
        ${alertBanner}
        <div class="je-audit-hero">
          <div class="je-audit-hero-num" title="Total líquido de horas trabalhadas na unidade segundo as regras da CLT">${fmt(u.cltWorkedMin)}</div>
          <div class="je-audit-hero-cap">
            <strong>Modo TSE XT / Digi</strong> · Horas Normais (Seg–Sex): <strong>${fmt(u.horasNormaisMin || 0)}</strong> · Saldo BH (50% − Déb.): <strong>${saldoBhSign}</strong> · HE 100% (FDS): <strong>+${fmt(u.he100BrutoMin || 0)}</strong>${hoBadge}
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
          <div class="je-audit-card" title="Horas Normais cumpridas nos dias úteis (${u.workedWeekdays || 0}d presenciais + ${u.homeOfficeDays || 0}d Home Office · ${u.dsrCompensatedDays || 0}d Reposição DSR)">
            <div class="je-audit-card-val">${fmt(u.horasNormaisMin || 0)}</div>
            <div class="je-audit-card-title">Horas Normais</div>
          </div>
          <div class="je-audit-card" title="Horas Extras / Créditos BH 50% (excedentes em dias úteis até 2h/dia, após tolerância de 10 min da CLT art. 58 §1º)">
            <div class="je-audit-card-val je-spt-pos">+${fmt(u.he50BrutoMin || 0)}</div>
            <div class="je-audit-card-title">HE / Créd. BH 50%</div>
          </div>
          <div class="je-audit-card" title="Saldo líquido do Banco de Horas de dias úteis no mês (HE 50% +${fmt(u.he50BrutoMin || 0)} − Débito BH -${fmt(u.debitoBhBrutoMin || 0)})">
            <div class="je-audit-card-val ${(u.saldoBhMesMin || 0) >= 0 ? 'je-spt-pos' : 'je-spt-neg'}">${saldoBhSign}</div>
            <div class="je-audit-card-title">Saldo BH (Úteis)</div>
          </div>
          <div class="je-audit-card" title="Horas Extras / Créditos BH 100%: 100% das horas trabalhadas em Sábados, Domingos e Feriados (jornada ordinária 00:00) + excedente &gt; 2h em dia útil">
            <div class="je-audit-card-val je-spt-pos">+${fmt(u.he100BrutoMin || 0)}</div>
            <div class="je-audit-card-title">HE / Créd. 100% (FDS)</div>
          </div>
        </div>

        <p class="je-audit-foot je-recog-equation">
          <strong>Regras TSE XT / Digi aplicadas:</strong> Jornada de <strong>8h00 (Seg–Sex)</strong> com tolerância de <strong>±10 min/dia</strong> (CLT art. 58 §1º) e mín. de <strong>1h00 de almoço</strong> (&gt; 6h, art. 71)${presumeHomeOffice ? ' · <strong>Home Office (8h)</strong> presumido em dias úteis sem batida na catraca (sem gerar batida fictícia), com folga automática de <strong>Reposição de DSR</strong> após domingo trabalhado / &gt; 6 dias seguidos (CLT art. 67)' : ''} · <strong>Sáb/Dom/Feriados</strong> com jornada <strong>00:00</strong> (100% em <strong>HE 100%</strong>) · <strong>Banco de Horas (Úteis):</strong> HE 50% (<strong>+${fmt(u.he50BrutoMin || 0)}</strong>) − Débito BH (<strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong>) = <strong>${saldoBhSign}</strong> · <strong>HE 100%:</strong> <strong>+${fmt(u.he100BrutoMin || 0)}</strong>.
        </p>

        ${detailMode === 'diario' ? renderDailyViewHTML(report) : renderMonthlyTableHTML(report)}
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
          'Justificativa', 'Ocorrencias'
        ]);
        currentResult.workers.forEach((w) => {
          w.months.forEach((m) => {
            m.days.forEach((d) => {
              if (showOnlyActiveDaysInDaily && !d.isWorkedDay && !d.isDsrCompensated && !d.punchCount && !d.justificativa) return;
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
        'DiasContabilizados', 'DiasUteisPresenciais', 'DiasHomeOffice8h', 'DiasReposicaoDSR', 'DiasFdsTrabalhados',
        'JornadaEsperadaUteis', 'TotalSPT', 'TrabalhadoLiquidoCLT',
        'HorasNormais', 'HE_Credito_BH_50', 'Debito_BH', 'Compensado_BH',
        'Saldo_BH_Uteis', 'HE_Credito_BH_100', 'SaldoGlobalMes',
        'DiasAlmocoMenor1h', 'DiasAlmocoAuto1h', 'DiasAcima2hExtra', 'DiasBatidaImpar'
      ]);
      currentResult.workers.forEach((w) => {
        w.months.forEach((m) => {
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
            String(m.dsrCompensatedDays || 0),
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
            String(m.alerts.intervaloCurtoDays),
            String(m.alerts.almocoAutoDays),
            String(m.alerts.acima2hExtraDays),
            String(m.alerts.batidaImparDays)
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
        <footer class="je-print-footer">TSE XT · Relatório de frequência (Modo SPT Puro — Dados Brutos).</footer>
      `;
    }

    // Modo TSE XT / Digi (padrão)
    const monthlyRows = [];
    report.workers.forEach((w) => {
      w.months.forEach((m) => {
        monthlyRows.push(`
          <tr>
            <td class="l"><strong>${escapeHTML(w.nome)}</strong><br><small>CPF ${escapeHTML(formatCpf(w.cpf))} · Contrato ${escapeHTML(w.numContrato || '—')}</small></td>
            <td>${escapeHTML(m.monthLabel)}</td>
            <td>${formatDaysCell(m)}</td>
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

    monthlyRows.push(`
      <tr class="total">
        <td class="l">Total Consolidado da Unidade (${u.activeWorkersCount}/${u.workersCount} prestadores)</td>
        <td>—</td>
        <td>${formatDaysCell(u)}</td>
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
            ? m.days.filter((d) => d.isWorkedDay || d.isDsrCompensated || d.punchCount > 0 || d.justificativa)
            : m.days;
          if (!days.length) return '';
          const dRows = days.map((d) => {
            const p = d.punches || [];
            const alertsTxt = [d.justificativa].concat((d.alerts || []).map((a) => a.label)).filter(Boolean).join(' · ');
            const targetTxt = d.isWorkedDay
              ? (d.isSpecialDay ? '00:00' : fmt(d.targetMin))
              : (d.isDsrCompensated ? '00:00' : '—');
            return `<tr>
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
        <p class="je-print-eyebrow">TSE XT · SPT <span>Modo: TSE XT / Digi (Regras CLT / Digisystem)</span></p>
        <h1>Relatório Consolidado de Horas por Unidade (${detailMode === 'diario' ? 'Detalhe Diário e Mensal' : 'Consolidado Mensal'})</h1>
        <dl class="je-print-meta">
          <div><dt>Unidade</dt><dd>${escapeHTML(report.unitName)}</dd></div>
          <div><dt>Período</dt><dd>${escapeHTML(report.fromBr)} a ${escapeHTML(report.toBr)}</dd></div>
          <div><dt>Contrato</dt><dd>${escapeHTML(report.contratoLabel)}</dd></div>
          <div><dt>Modo</dt><dd>TSE XT / Digi${presumeHomeOffice ? ' (c/ Home Office 8h + Reposição DSR)' : ''}</dd></div>
          <div><dt>Emissão</dt><dd>${escapeHTML(when)}</dd></div>
        </dl>
        ${report.issuer ? `<p class="meta">Emitido por ${escapeHTML(report.issuer)}</p>` : ''}
        <p class="meta">Fonte: SPT - Gestão de Frequência do TSE · TSE XT v${escapeHTML(version)}. Regras TSE XT / Digi: jornada 8h Seg–Sex (tolerância ±10 min art. 58 §1º), almoço mín. 1h (art. 71)${presumeHomeOffice ? ', presunção de Home Office (8h) em dias úteis sem batida com Reposição de DSR após > 6d seguidos (art. 67)' : ''}, Sáb/Dom/Feriados com jornada 00:00 (100% em HE 100%) e separação entre Saldo BH (50% − Débito BH) e HE 100%.</p>
      </header>

      <div class="je-print-metrics">
        <div><span>Trabalhado CLT</span><strong>${fmt(u.cltWorkedMin)}</strong></div>
        <div><span>Horas Normais</span><strong>${fmt(u.horasNormaisMin || 0)}</strong></div>
        <div><span>HE / Créd. BH 50%</span><strong>+${fmt(u.he50BrutoMin || 0)}</strong></div>
        <div><span>Débito BH</span><strong>-${fmt(u.debitoBhBrutoMin || 0)}</strong></div>
        <div><span>Saldo BH (Úteis)</span><strong>${fmt(u.saldoBhMesMin || 0, true)}</strong></div>
        <div class="je-print-metric-focus"><span>HE / Créd. 100% (FDS)</span><strong>+${fmt(u.he100BrutoMin || 0)}</strong></div>
      </div>

      <h2>1. Consolidação Mensal por Prestador (TSE XT / Digi)</h2>
      <table class="je-print-table">
        <thead>
          <tr>
            <th>Prestador / Contrato</th><th>Mês</th><th>Dias</th><th>Total SPT</th><th>Trab. CLT</th><th>H. Normais</th>
            <th>HE 50% (BH)</th><th>Débito BH</th><th>Saldo BH (Úteis)</th><th>HE 100% (FDS)</th><th>Saldo Total</th>
          </tr>
        </thead>
        <tbody>${monthlyRows.join('')}</tbody>
      </table>

      ${dailySection}
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

    if (prefs && typeof prefs.presumeHomeOffice === 'boolean') {
      presumeHomeOffice = prefs.presumeHomeOffice;
    } else {
      presumeHomeOffice = true;
    }
    syncHomeOfficeCheckboxState();

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
      currentResult = calc().recomputeReportWithOptions(stored, { presumeHomeOffice });
      renderResult(currentResult);
    } else {
      renderResult(null);
    }
  }

  return {
    open,
    close
  };
})();
