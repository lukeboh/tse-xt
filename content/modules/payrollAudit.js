/**
 * TSE XT - Auditoria de Pagamento de Pecúnias
 *
 * Confere se as horas que o Espelho de Ponto mostra como pagas em pecúnia
 * aparecem nos contracheques. Só o próprio servidor: o portal só entrega o
 * contracheque de quem está logado.
 *
 * Passos:
 *   1. lê o rodapé do espelho de cada mês do período (Pecúnia e Adicional
 *      Noturno Pecúnia, por faixa);
 *   2. lê todas as folhas dos contracheques dos 3 meses seguintes a cada mês
 *      com pecúnia e guarda só as rubricas de serviço extraordinário e de
 *      adicional noturno;
 *   3. liga cada pagamento ao mês da coluna "Ref." (JEPessoasPayroll);
 *   4. para o que não fechou, estende a busca até 12 meses depois.
 *
 * O relatório aponta o que conferir. Não afirma direito nem calcula quanto
 * deveria ter sido pago. O último resultado fica em chrome.storage.local, só
 * neste navegador.
 */

window.JEPessoasPayrollAudit = (function () {
  'use strict';

  const STORAGE_KEY = 'je_xt_payroll_v1';
  const ESPELHO_URL = '/portalservidor2/EspelhoPontoMesAction_recuperar.action';
  const PAYSLIP_URL = '/portalservidor2/ContrachequeRendimentosAction_verContracheque';
  const SHEET_FIELD = 'contracheque.folhaContracheque.numero';
  const YEAR_FIELD = 'contracheque.folhaContracheque.ano';
  const MONTH_FIELD = 'contracheque.folhaContracheque.mes';
  const FETCH_THROTTLE_MS = 150;
  const DEFAULT_MONTHS = 60;
  const MAX_MONTHS = 120;
  // Tantos contracheques seguidos sem leitura: a sessão deve ter caído.
  const MAX_UNREADABLE = 3;
  const COLS = 10;

  const BUCKET_LABEL = { util: 'Dia útil', sab: 'Sábado', domfer: 'Domingo/feriado' };
  const STATUS_INFO = {
    'conferido': { label: 'Conferido', cls: 'ok' },
    'faixa-diferente': { label: 'Faixa a conferir', cls: 'warn' },
    'a-maior': { label: 'Pago a maior', cls: 'warn' },
    'a-menor': { label: 'Pago a menor', cls: 'bad' },
    'nao-localizado': { label: 'Não localizado', cls: 'bad' },
    'sem-quantidade': { label: 'Sem quantidade', cls: 'warn' },
    'nao-lido': { label: 'Contracheque não lido', cls: 'wait' },
    'aguardando': { label: 'Aguardando contracheque', cls: 'wait' }
  };
  const NIGHT_LABEL = {
    'ok': 'confere', 'a-menor': 'a menor: conferir', 'a-maior': 'a maior: conferir',
    'nao-localizado': 'não localizado: conferir', 'pendente': 'aguardando contracheque'
  };
  const ORPHAN_LABEL = {
    'sem-pecunia-no-espelho': 'O espelho desse mês não tem pecúnia',
    'mes-aberto': 'O espelho desse mês ainda está aberto',
    'fora-do-periodo': 'Mês fora do período auditado'
  };

  let overlay = null;
  let running = false;
  let aborted = false;
  let current = null;
  let view = null;
  let onlyIssues = false;
  const openMonths = new Set();

  // --------------------------------------------------------------------------
  // Utilidades
  // --------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const calc = () => window.JEPessoasPayroll;
  const text = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '');

  function fmt(min) {
    const neg = min < 0;
    const a = Math.abs(Math.round(min || 0));
    return (neg ? '-' : '') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
  }

  const dot = (min) => (min ? fmt(min) : '·');
  const signedFmt = (min) => (min > 0 ? '+' : '') + fmt(min);

  function money(v) {
    return v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, (t) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
  }

  function legalUrl(k) {
    const U = (window.JEPessoasLegal && window.JEPessoasLegal.URLS) || {};
    return U[k] || {
      res22901: 'https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008',
      prt380_2026: 'https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026',
      lei8112: 'http://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm',
      dec20910: 'https://www.planalto.gov.br/ccivil_03/decreto/antigos/d20910.htm'
    }[k];
  }
  const lk = (k, txt) => `<a href="${legalUrl(k)}" target="_blank" rel="noopener">${txt}</a>`;

  function periodLabel(key) {
    const m = /^(\d{4})-(\d{2})$/.exec(key || '');
    return m ? m[2] + '/' + m[1] : '';
  }

  function ymKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function monthRange(from, to) {
    const a = calc().ymIndex(from);
    const b = calc().ymIndex(to);
    const list = [];
    if (isNaN(a) || isNaN(b)) return list;
    for (let i = a; i <= b; i++) list.push({ key: calc().keyOfIndex(i), y: Math.floor(i / 12), m: (i % 12) + 1 });
    return list;
  }

  function loadStored() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [STORAGE_KEY]: null }, (items) => resolve((items && items[STORAGE_KEY]) || null));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function saveStored(result) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: result }, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  function issuerName() {
    const el = document.querySelector('.servidor, #divTopServidorNome, .usuario-logado');
    return el ? (el.innerText || '').replace(/\s+/g, ' ').replace(/^\s*Nome:\s*/i, '').trim() : '';
  }

  function ownMatricula() {
    const el = document.querySelector('#divTopServidorMatricula, .matricula strong, .matricula span, .matricula');
    const d = el ? (el.innerText || '').replace(/\D/g, '') : '';
    return d.length >= 6 ? d : '';
  }

  // Unidade selecionada no Espelho de Ponto, quando a tela atual é a dele.
  function currentUnit() {
    const u = document.querySelector('#unidadeSelecionada_idUnidade, select[name="unidadeSelecionada.idUnidade"]');
    return u && u.value && u.value !== '0' ? u.value : '';
  }

  // --------------------------------------------------------------------------
  // Rede: espelho
  // --------------------------------------------------------------------------
  async function fetchEspelho(ano, mes, matricula, unidade) {
    const body = new URLSearchParams();
    if (unidade) body.set('unidadeSelecionada.idUnidade', unidade);
    if (matricula) body.set('servidorSelecionado.matricula', matricula);
    body.set('anoSelecionado', String(ano));
    body.set('mesSelecionado', String(mes));

    const resp = await fetch(ESPELHO_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/html,*/*' },
      body: body.toString()
    });
    const html = await resp.text();
    if (/Login_|encerrarSessao/i.test(resp.url) || (html.length < 15000 && /encerrada|autentica/i.test(html))) {
      return { loggedOut: true };
    }
    return { doc: new DOMParser().parseFromString(html, 'text/html') };
  }

  // Matrícula que o portal marcou como selecionada na resposta ('' se não marcou).
  function answeredMatricula(doc) {
    const sel = doc.querySelector('select[name="servidorSelecionado.matricula"], #servidorSelecionado_matricula');
    const opt = sel && sel.querySelector('option[selected]');
    const v = opt ? (opt.getAttribute('value') || '').replace(/\D/g, '') : '';
    return v.length >= 4 ? v : '';
  }

  function sameMonth(a, y, m) {
    const first = a.days && a.days[0];
    return !!first && first.date.slice(3) === String(m).padStart(2, '0') + '/' + y;
  }

  // --------------------------------------------------------------------------
  // Rede: contracheque
  // --------------------------------------------------------------------------
  function payslipUrl(y, m, sheet) {
    const q = new URLSearchParams();
    q.set('tipoDocumento', 'verContracheque');
    q.set(YEAR_FIELD, String(y));
    q.set(MONTH_FIELD, String(m));
    q.set(SHEET_FIELD, String(sheet));
    return PAYSLIP_URL + '?' + q.toString();
  }

  async function fetchPayslipDoc(y, m, sheet) {
    const resp = await fetch(payslipUrl(y, m, sheet), { credentials: 'include', headers: { 'Accept': 'text/html,*/*' } });
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    if (/Login_|encerrarSessao/i.test(resp.url) || doc.querySelector('input[type="password"]')) return { loggedOut: true };
    return { doc };
  }

  // Folhas do mês (normal e suplementares). null: a resposta não é a tela esperada.
  function readSheetList(doc, y, m) {
    const sel = doc.querySelector(`select[name="${SHEET_FIELD}"]`);
    const selY = doc.querySelector(`select[name="${YEAR_FIELD}"]`);
    const selM = doc.querySelector(`select[name="${MONTH_FIELD}"]`);
    if (!sel || !selY || !selM) return null;
    // O portal devolve o período pedido marcado nos seletores.
    if (+selY.value !== y || +selM.value !== m) return null;
    return Array.from(sel.options).filter((o) => o.value && o.value !== '0').map((o) => ({ n: o.value, name: text(o) }));
  }

  // Matrícula impressa no cabeçalho do contracheque ('' se não achar).
  function payslipMatricula(doc) {
    for (const t of Array.from(doc.querySelectorAll('table.tblContracheque'))) {
      if (t.rows.length < 2) continue;
      const i = Array.from(t.rows[0].cells).findIndex((c) => /^matr/i.test(text(c)));
      if (i >= 0 && t.rows[1].cells[i]) return text(t.rows[1].cells[i]).replace(/\D/g, '');
    }
    return '';
  }

  /** Lê uma folha. Devolve { lines } ou { error }. */
  function readSheet(doc, key, matricula) {
    const table = doc.querySelector('#tblListaRubricas');
    if (!table || !table.rows.length) return { error: 'A folha veio sem a tabela de rubricas.' };
    const mat = payslipMatricula(doc);
    if (matricula && mat && mat !== matricula) return { error: 'O portal devolveu o contracheque de outra matrícula.' };
    const title = Array.from(doc.querySelectorAll('h1, h2, h3, h4')).map(text).join(' | ');
    const competence = calc().detectCompetence(title);
    if (competence && competence !== key) return { error: 'O portal devolveu o contracheque de outro mês.' };
    const rows = Array.from(table.rows);
    const parsed = calc().parseRubricTable(Array.from(rows[0].cells).map(text), rows.slice(1).map((tr) => Array.from(tr.cells).map(text)));
    return parsed.ok ? { lines: parsed.lines } : { error: 'A tabela de rubricas veio em formato desconhecido.' };
  }

  /**
   * Lê todas as folhas do contracheque de um mês.
   * @returns {{loggedOut?:boolean, slip?:{key,status,sheets,error?}}}
   */
  async function readPayslip(key, matricula, today) {
    const P = calc();
    const idx = P.ymIndex(key);
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const unread = (error) => ({ slip: { key, status: P.SLIP.NAO_LIDO, sheets: [], error } });

    const list = await fetchPayslipDoc(y, m, 0);
    if (list.loggedOut) return { loggedOut: true };
    const sheets = readSheetList(list.doc, y, m);
    if (!sheets) return unread('A lista de folhas do mês não veio como esperado.');
    if (!sheets.length) {
      // Mês corrente sem folha: o contracheque ainda não foi publicado.
      const nowIdx = today.getFullYear() * 12 + today.getMonth();
      return { slip: { key, status: idx >= nowIdx ? P.SLIP.INDISPONIVEL : P.SLIP.LIDO, sheets: [] } };
    }

    const out = [];
    for (const s of sheets) {
      await sleep(FETCH_THROTTLE_MS);
      const res = await fetchPayslipDoc(y, m, s.n);
      if (res.loggedOut) return { loggedOut: true };
      const read = readSheet(res.doc, key, matricula);
      if (read.error) return unread(read.error);
      out.push({ n: s.n, name: s.name, lines: read.lines });
    }
    return { slip: { key, status: P.SLIP.LIDO, sheets: out } };
  }

  // --------------------------------------------------------------------------
  // Varredura
  // --------------------------------------------------------------------------
  async function run() {
    if (running) return;
    const P = calc();
    const from = overlay.querySelector('#je-pay-from').value;
    const to = overlay.querySelector('#je-pay-to').value;
    const months = monthRange(from, to);
    if (!months.length) { alert('Informe o período da auditoria (mês inicial e final).'); return; }
    if (months.length > MAX_MONTHS) { alert(`O período tem ${months.length} meses. O limite é de ${MAX_MONTHS} meses por auditoria.`); return; }

    running = true;
    aborted = false;
    openMonths.clear();
    showProgress(true);

    const today = new Date();
    const matricula = ownMatricula();
    const unidade = currentUnit();
    const result = {
      version: 1,
      matricula,
      issuer: issuerName(),
      from: months[0].key,
      to: months[months.length - 1].key,
      expected: [],
      payslips: [],
      espelhoErrors: [],
      partial: false
    };
    const flags = { loggedOut: false, aborted: false, wrongServer: false, unreadable: false };

    // 1. Espelhos do período.
    let done = 0;
    for (const it of months) {
      if (aborted) break;
      setProgress(done, months.length, `Espelho de ${periodLabel(it.key)}`);
      try {
        const res = await fetchEspelho(it.y, it.m, matricula, unidade);
        if (res.loggedOut) { flags.loggedOut = true; break; }
        const answered = answeredMatricula(res.doc);
        if (matricula && answered && answered !== matricula) { flags.wrongServer = true; break; }
        const a = window.JEPessoasAuthScan.analyzeEspelho(res.doc, { year: it.y, month: it.m });
        if (a.found && a.days.length && sameMonth(a, it.y, it.m)) {
          const e = P.expectedFromEspelho(a);
          if (e.found) result.expected.push(e);
        }
      } catch (e) {
        console.warn('[TSE XT] auditoria de pagamento: falha no espelho de', it.key, e);
        result.espelhoErrors.push(it.key);
      }
      done++;
      await sleep(FETCH_THROTTLE_MS);
    }
    if (flags.wrongServer) result.expected = [];

    // 2 e 4. Contracheques: a janela de cada mês e, para o que não fechou, a busca estendida.
    const stopped = () => aborted || flags.loggedOut || flags.wrongServer || flags.unreadable;
    async function readKeys(keys, label) {
      let n = 0;
      let unreadable = 0;
      for (const key of keys) {
        if (stopped()) break;
        setProgress(n, keys.length, `${label} de ${periodLabel(key)}`);
        try {
          const res = await readPayslip(key, matricula, today);
          if (res.loggedOut) { flags.loggedOut = true; break; }
          result.payslips.push(res.slip);
          unreadable = res.slip.status === P.SLIP.NAO_LIDO ? unreadable + 1 : 0;
        } catch (e) {
          console.warn('[TSE XT] auditoria de pagamento: falha no contracheque de', key, e);
          result.payslips.push({ key, status: P.SLIP.NAO_LIDO, sheets: [], error: 'Falha de rede ao ler o contracheque.' });
          unreadable++;
        }
        if (unreadable >= MAX_UNREADABLE) flags.unreadable = true;
        n++;
        await sleep(FETCH_THROTTLE_MS);
      }
    }

    if (!stopped()) await readKeys(P.neededPayslipKeys(result.expected, { today }), 'Contracheque');
    if (!stopped()) {
      const first = P.reconcile(result.expected, result.payslips, { today });
      const failing = first.months.filter((m) => m.status === P.STATUS.A_MENOR || m.status === P.STATUS.NAO_LOCALIZADO);
      const more = P.neededPayslipKeys(failing, { today, windowMonths: P.EXTENDED_MONTHS, skip: result.payslips.map((s) => s.key) });
      if (more.length) await readKeys(more, 'Busca estendida: contracheque');
    }

    flags.aborted = aborted;
    result.generatedAt = new Date().toISOString();
    result.partial = stopped();
    result.payslips.sort((x, y) => P.ymIndex(x.key) - P.ymIndex(y.key));
    await saveStored(result);

    running = false;
    showProgress(false);
    render(result, flags);
  }

  // --------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------
  function createDOM() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'je-pay-modal';
    overlay.className = 'je-modal-overlay je-audit-modal je-recog-modal je-pay-modal';
    overlay.innerHTML = `
      <div class="je-modal-content je-audit-content" role="dialog" aria-modal="true" aria-label="Auditoria de Pagamento de Pecúnias">
        <div class="je-audit-head">
          <div class="je-audit-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="stroke: var(--je-primary);" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"></rect>
              <circle cx="12" cy="12" r="2.5"></circle>
              <path d="M6 12h.01M18 12h.01"></path>
            </svg>
            <span>Auditoria de Pagamento de Pecúnias</span>
          </div>
          <button type="button" class="je-audit-x" title="Fechar (Esc)">&times;</button>
        </div>

        <div class="je-audit-toolbar je-recog-toolbar">
          <div class="je-recog-period">
            <label>De <input type="month" id="je-pay-from"></label>
            <label>até <input type="month" id="je-pay-to"></label>
            <label class="je-pay-only" title="Esconde os meses conferidos"><input type="checkbox" id="je-pay-only"> Só o que precisa de conferência</label>
          </div>
          <div class="je-audit-actions">
            <button type="button" class="je-audit-btn je-audit-btn-primary" id="je-pay-run" title="Lê o seu Espelho de Ponto e os seus contracheques do período">Auditar</button>
            <button type="button" class="je-audit-btn" id="je-pay-csv" title="Exportar CSV (uma linha por mês)">CSV</button>
            <button type="button" class="je-audit-btn" id="je-pay-print" title="Versão para guardar ou anexar a um pedido de revisão">Imprimir / PDF</button>
          </div>
        </div>

        <div class="je-audit-progress" id="je-pay-progress" hidden>
          <div class="je-audit-progress-bar"><div class="je-audit-progress-fill" id="je-pay-progress-fill"></div></div>
          <div class="je-audit-progress-row">
            <span id="je-pay-progress-label">Consultando…</span>
            <button type="button" class="je-audit-btn je-audit-btn-ghost" id="je-pay-cancel">Cancelar</button>
          </div>
        </div>

        <div class="je-audit-body" id="je-pay-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.je-audit-x').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });
    overlay.querySelector('#je-pay-run').addEventListener('click', run);
    overlay.querySelector('#je-pay-cancel').addEventListener('click', () => { aborted = true; });
    overlay.querySelector('#je-pay-csv').addEventListener('click', exportCSV);
    overlay.querySelector('#je-pay-print').addEventListener('click', printReport);
    overlay.querySelector('#je-pay-only').addEventListener('change', (e) => { onlyIssues = e.target.checked; paintTable(); });
    overlay.querySelector('#je-pay-body').addEventListener('click', onBodyClick);
    overlay.querySelector('#je-pay-body').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.matches || !e.target.matches('tr[data-month]')) return;
      e.preventDefault();
      onBodyClick(e);
    });

    // Padrão: os 60 meses anteriores ao mês corrente (prazo de 5 anos do Decreto 20.910/1932).
    const now = new Date();
    overlay.querySelector('#je-pay-to').value = ymKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    overlay.querySelector('#je-pay-from').value = ymKey(new Date(now.getFullYear(), now.getMonth() - DEFAULT_MONTHS, 1));
    return overlay;
  }

  function showProgress(on) {
    overlay.querySelector('#je-pay-progress').hidden = !on;
    ['#je-pay-run', '#je-pay-csv', '#je-pay-print'].forEach((s) => { overlay.querySelector(s).disabled = on; });
  }

  function setProgress(done, total, label) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    overlay.querySelector('#je-pay-progress-fill').style.width = pct + '%';
    overlay.querySelector('#je-pay-progress-label').textContent = `${label}  (${done + 1}/${total})`;
  }

  function badge(status) {
    const s = STATUS_INFO[status] || { label: status, cls: 'wait' };
    return `<span class="je-audit-badge je-pay-badge-${s.cls}">${s.label}</span>`;
  }

  const needsReview = (m) => m.status !== 'conferido' || (m.rate && m.rate.flag) || (m.night.status && m.night.status !== 'ok' && m.night.status !== 'pendente');
  const hasHours = (m) => m.lines.some((l) => l.kind === 'he');

  function diffCell(m) {
    return hasHours(m) ? signedFmt(m.diffMin) : '—';
  }

  // Avisos do relatório, em texto simples (servem à tela e à impressão).
  function buildNotes(result, v, flags) {
    const t = v.totals;
    const S = calc().STATUS;
    const notes = [];
    const n = (status) => t.count[status];
    if (n(S.A_MAIOR)) notes.push(`Em ${n(S.A_MAIOR)} mês(es) o contracheque traz mais horas que o espelho (${fmt(t.excessMin)} a mais). Pode ser acerto de outro mês lançado com essa referência ou pagamento em duplicidade.`);
    if (n(S.FAIXA)) notes.push(`Em ${n(S.FAIXA)} mês(es) o total de horas confere, mas a divisão entre acréscimo de 50% e de 100% é diferente da do espelho.`);
    if (n(S.SEM_QTD)) notes.push(`Em ${n(S.SEM_QTD)} mês(es) há pagamento sem quantidade de horas. A conferência desses meses é pelo valor.`);
    if (n(S.NAO_LIDO)) notes.push(`${n(S.NAO_LIDO)} mês(es) dependem de contracheque que não pôde ser lido. Rode a auditoria de novo antes de concluir sobre eles.`);
    if (n(S.AGUARDANDO)) notes.push(`${n(S.AGUARDANDO)} mês(es) com ${fmt(t.min[S.AGUARDANDO])} de pecúnia aguardam contracheque ainda não publicado.`);
    if (t.nightFlags) notes.push(`Em ${t.nightFlags} mês(es) o adicional noturno sobre o serviço extraordinário não bate com as horas noturnas do espelho.`);
    if (t.rateFlags) notes.push(`Em ${t.rateFlags} mês(es) as linhas do mesmo mês usam valores de hora diferentes entre si.`);
    if (v.orphans.length) notes.push('Há pagamentos de serviço extraordinário com referência a mês sem pecúnia no espelho. Estão no quadro ao fim da lista.');
    if (v.unallocated.length) notes.push(`${v.unallocated.length} lançamento(s) de serviço extraordinário vieram sem mês de referência e não foram ligados a nenhum espelho.`);
    const open = (result.expected || []).filter((e) => e.found && !e.closed && e.totalMin > 0);
    if (open.length) notes.push(`${open.length} mês(es) ainda abertos no espelho ficaram fora da auditoria (${open.map((e) => periodLabel(e.key)).join(', ')}).`);
    if ((result.espelhoErrors || []).length) notes.push(`O espelho de ${result.espelhoErrors.map(periodLabel).join(', ')} não pôde ser lido e ficou fora da auditoria.`);
    const unread = (result.payslips || []).filter((s) => s.status === calc().SLIP.NAO_LIDO);
    if (unread.length) notes.push(`Contracheques não lidos: ${unread.map((s) => periodLabel(s.key) + (s.error ? ' (' + s.error + ')' : '')).join('; ')}`);
    if (flags && flags.unreadable) notes.push('Vários contracheques seguidos não puderam ser lidos e a leitura foi interrompida. Confira se a sessão do portal continua ativa.');
    return notes;
  }

  function render(result, flags) {
    flags = flags || {};
    const body = overlay.querySelector('#je-pay-body');
    current = null;
    view = null;

    if (flags.wrongServer) {
      body.innerHTML = '<div class="je-audit-alert">O portal devolveu o espelho de outro servidor. Nada foi conferido. Abra o seu próprio Espelho de Ponto e rode a auditoria de novo.</div>';
      return;
    }
    if (!result || !result.expected || !result.generatedAt) {
      body.innerHTML = `
        <div class="je-audit-empty">
          <p>Escolha o período e clique em <strong>Auditar</strong>.</p>
          <p>A auditoria lê o seu Espelho de Ponto e os seus contracheques e confere se as horas de pecúnia de cada mês aparecem como pagas. A leitura de 5 anos leva alguns minutos.</p>
        </div>`;
      return;
    }

    current = result;
    view = calc().reconcile(result.expected, result.payslips, { today: new Date() });
    const t = view.totals;
    const S = calc().STATUS;
    const when = new Date(result.generatedAt).toLocaleString('pt-BR');
    const banner = flags.loggedOut
      ? '<div class="je-audit-alert">Sessão expirada durante a leitura. O resultado abaixo é parcial. Faça login e rode de novo.</div>'
      : ((flags.aborted || result.partial) ? '<div class="je-audit-alert">Leitura interrompida. O resultado abaixo é parcial.</div>' : '');

    if (!view.months.length) {
      body.innerHTML = `${banner}
        <div class="je-audit-empty">
          <p>Nenhum mês fechado com pecúnia entre ${periodLabel(result.from)} e ${periodLabel(result.to)}.</p>
        </div>`;
      return;
    }

    const notes = buildNotes(result, view, flags);
    const heroCap = t.missingMin > 0
      ? 'de pecúnia do espelho <strong>não localizadas</strong> nos contracheques lidos'
      : 'de pecúnia sem pagamento localizado: nenhuma falta nos contracheques lidos';
    const waitingMin = t.min[S.AGUARDANDO] + t.min[S.NAO_LIDO];

    body.innerHTML = `
      ${banner}
      <div class="je-audit-hero${t.missingMin > 0 ? '' : ' je-pay-hero-ok'}">
        <div class="je-audit-hero-num">${fmt(t.missingMin)}</div>
        <div class="je-audit-hero-cap">${heroCap}</div>
        <div class="je-audit-hero-sub">${periodLabel(result.from)} a ${periodLabel(result.to)} · ${t.months} mês(es) com pecúnia · ${(result.payslips || []).filter((s) => s.status === calc().SLIP.LIDO).length} contracheque(s) lido(s) · gerado em ${when}</div>
      </div>

      <div class="je-audit-cards">
        ${card('Pecúnia no espelho', t.expectedMin, 'Linhas Pecúnia e Adicional Noturno Pecúnia do rodapé do espelho, nos meses fechados do período.')}
        ${card('Conferidas no contracheque', t.min[S.CONFERIDO], 'Horas dos meses em que o contracheque traz a mesma quantidade do espelho.')}
        ${card('Pagas acima do espelho', t.excessMin, 'Horas que o contracheque traz a mais que o espelho do mês de referência.')}
        ${card('Aguardando contracheque', waitingMin, 'Horas de meses cujo contracheque ainda não foi publicado ou não pôde ser lido.')}
      </div>

      ${notes.length ? `<div class="je-audit-alert je-recog-notes">${notes.map((x) => `<div>${escapeHTML(x)}</div>`).join('')}</div>` : ''}

      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-pay-table">
          <thead>
            <tr>
              <th>Mês do espelho</th>
              <th title="Pecúnia + adicional noturno em pecúnia, em dia útil">Dia útil</th>
              <th title="Pecúnia + adicional noturno em pecúnia, em sábado">Sábado</th>
              <th title="Pecúnia + adicional noturno em pecúnia, em domingo, feriado e recesso">Dom./fer.</th>
              <th title="Total de horas de pecúnia no rodapé do espelho">Espelho</th>
              <th title="Contracheques que trazem pagamento com referência a este mês">Contracheque(s)</th>
              <th title="Horas de serviço extraordinário pagas com referência a este mês">Pagas</th>
              <th title="Horas pagas menos horas do espelho">Diferença</th>
              <th title="Valor bruto das rubricas de serviço extraordinário e do adicional noturno sobre ele">Valor (R$)</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody id="je-pay-tbody"></tbody>
        </table>
      </div>
      <p class="je-audit-foot">Clique num mês para ver os lançamentos do contracheque. As horas do contracheque são ligadas ao espelho pela coluna Ref. de cada rubrica. Diferença de até 3 minutos é tratada como arredondamento.</p>

      ${orphansHTML(view)}

      <details class="je-audit-explain">
        <summary>📖 Como ler e base normativa</summary>
        <div class="je-audit-explain-body">
          ${explainHTML()}
        </div>
      </details>
    `;
    paintTable();
  }

  function card(title, min, tip) {
    return `<div class="je-audit-card" title="${escapeHTML(tip)}">
      <div class="je-audit-card-val">${fmt(min)}</div>
      <div class="je-audit-card-title">${escapeHTML(title)}</div>
    </div>`;
  }

  function orphanRows(v) {
    return v.orphans.map((o) => `<tr>
        <td>${periodLabel(o.refKey)}</td>
        <td>${periodLabel(o.payslipKey)}</td>
        <td class="l">${escapeHTML(o.sheetName || o.sheet)}</td>
        <td>${o.count}</td>
        <td>${o.hoursMin ? fmt(o.hoursMin) : '—'}</td>
        <td>${money(o.value)}</td>
        <td class="l">${ORPHAN_LABEL[o.why] || o.why}</td>
      </tr>`);
  }

  const ORPHAN_HEAD = ['Ref.', 'Contracheque', 'Folha', 'Lançamentos', 'Horas', 'Valor (R$)', 'Observação'];

  function orphansHTML(v) {
    if (!v.orphans.length) return '';
    return `
      <div class="je-pay-orphans">
        <div class="je-pay-orphans-h">Pagamentos sem horas correspondentes no espelho</div>
        <table class="je-pay-lines">
          <thead><tr>${ORPHAN_HEAD.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${orphanRows(v).join('')}</tbody>
        </table>
      </div>`;
  }

  function explainHTML() {
    return `
      <div class="je-audit-def">
        <div class="je-audit-def-h">Como a conferência é feita</div>
        <p><strong>Espelho:</strong> linhas <em>Pecúnia</em> e <em>Adicional Noturno Pecúnia</em> do rodapé de cada mês fechado, separadas em dia útil, sábado e domingo/feriado. O contracheque paga, em cada faixa, a soma das duas linhas.</p>
        <p><strong>Contracheque:</strong> rubricas de serviço extraordinário de todas as folhas (normal e suplementares) dos 3 meses seguintes. Cada rubrica traz o mês a que se refere na coluna <em>Ref.</em> e a quantidade de horas na coluna <em>Qtd.</em> Lançamento de desconto é abatido. Para o mês que não fecha, a busca segue até 12 meses depois.</p>
        <p><strong>Conferido:</strong> a quantidade do contracheque é a do espelho, com folga de 3 minutos. <strong>Pago a menor</strong> e <strong>Não localizado:</strong> faltam horas mesmo depois de lidos todos os contracheques da busca. <strong>Pago a maior:</strong> o contracheque traz mais horas que o espelho. <strong>Faixa a conferir:</strong> o total bate, mas a divisão entre 50% e 100% não. <strong>Aguardando</strong> e <strong>Contracheque não lido</strong> não são falha: falta ler o contracheque.</p>
        <p><strong>Adicional noturno:</strong> a hora noturna tem 52min30s, então cada hora noturna do espelho aparece como 8/7 de hora na rubrica de adicional noturno sobre serviço extraordinário.</p>
        <p><strong>Valor:</strong> a auditoria não calcula quanto deveria ter sido pago. Mostra o valor bruto das rubricas e o valor da hora-base que elas embutem (valor ÷ horas ÷ 1,5 ou 2), para comparar com a sua remuneração ÷ 200.</p>
      </div>
      <div class="je-audit-def">
        <div class="je-audit-def-h">Base normativa</div>
        <p>${lk('res22901', 'Res.-TSE 22.901/2008')}: art. 9º (o serviço extraordinário é remunerado com acréscimo de 50% em dias úteis e sábados e de 100% em domingos e feriados, sobre a hora normal, obtida pela divisão da remuneração mensal por 200).</p>
        <p>${lk('prt380_2026', 'Portaria-TSE 380/2026')}: art. 10 (o pagamento depende do relatório do serviço extraordinário homologado pela chefia até o 3º dia útil do mês seguinte).</p>
        <p>${lk('lei8112', 'Lei 8.112/1990')}: art. 75 (adicional noturno de 25% entre 22h e 5h, com a hora contada como 52min30s; parágrafo único: sobre o serviço extraordinário, o adicional incide sobre a hora já acrescida).</p>
        <p>${lk('dec20910', 'Decreto 20.910/1932')}: art. 1º (prazo de cinco anos para reclamar valores devidos pela Fazenda Pública). Por isso o período padrão da auditoria é de 60 meses.</p>
        <p class="je-audit-src">Resumo dos dispositivos para orientar a conferência. Vale o texto oficial das normas. Diferença apontada aqui é ponto a conferir com a unidade de pagamento, não reconhecimento de direito.</p>
      </div>`;
  }

  function statusText(m) {
    const slips = m.payslips.map(periodLabel).join(' e ');
    switch (m.status) {
      case 'conferido':
        return `As horas do espelho aparecem no contracheque de ${slips}.` + (m.diffMin ? ` Diferença de ${signedFmt(m.diffMin)}, dentro da folga de arredondamento.` : '');
      case 'faixa-diferente':
        return 'O total de horas confere, mas a divisão entre acréscimo de 50% (dia útil e sábado) e de 100% (domingo e feriado) é diferente da do espelho. Vale conferir o valor pago.';
      case 'a-maior':
        return `O contracheque traz ${fmt(m.diffMin)} a mais que o espelho deste mês. Pode ser acerto de outro mês lançado com esta referência ou pagamento em duplicidade. Vale conferir.`;
      case 'a-menor':
        return `Faltam ${fmt(-m.diffMin)} em relação ao espelho, nos contracheques lidos. Vale conferir e, se for o caso, pedir a revisão.`;
      case 'nao-localizado':
        return 'Nenhum pagamento com referência a este mês apareceu nos contracheques lidos. Vale conferir e, se for o caso, pedir a revisão.';
      case 'sem-quantidade':
        return 'Há pagamento com referência a este mês, mas sem quantidade de horas. A conferência é pelo valor.';
      case 'nao-lido':
        return 'Um ou mais contracheques dos 3 meses seguintes não puderam ser lidos. Rode a auditoria de novo antes de concluir.';
      default:
        return 'O contracheque em que este mês costuma ser pago ainda não foi publicado.';
    }
  }

  function monthNotes(m) {
    const notes = [];
    if (m.nightMin > 0) {
      let n = `Adicional noturno sobre serviço extraordinário: ${fmt(m.nightMin)} de horas noturnas no espelho equivalem a ${fmt(m.night.expectedMin)} no contracheque (hora de 52min30s). Contracheque: ${fmt(m.night.paidMin)} (${NIGHT_LABEL[m.night.status] || ''}).`;
      if (m.night.status !== 'ok' && m.night.commonMin) n += ` Há ${fmt(m.night.commonMin)} de adicional noturno comum com esta referência, que é das horas normais.`;
      notes.push(n);
    }
    if (m.rate) {
      notes.push(`Valor da hora-base embutido nos pagamentos: R$ ${money(m.rate.base)}. Compare com a sua remuneração do mês ÷ 200.`
        + (m.rate.flag ? ` As linhas usam valores de hora diferentes entre si (variação de ${String(m.rate.spreadPct).replace('.', ',')}%). Vale conferir.` : ''));
    }
    if (m.otherPaidMin) notes.push(`${fmt(m.otherPaidMin)} vieram em rubrica sem indicação de dia útil, sábado ou domingo. A divisão por faixa não foi conferida.`);
    return notes;
  }

  function lineRows(m) {
    return m.lines.map((l) => `<tr>
        <td>${periodLabel(l.payslipKey)}</td>
        <td class="l">${escapeHTML(l.sheetName || l.sheet)}</td>
        <td class="l">${escapeHTML(l.desc)}</td>
        <td>${periodLabel(l.refKey)}</td>
        <td>${l.debit ? 'Desconto' : 'Crédito'}</td>
        <td>${l.hoursMin == null ? '—' : fmt(l.hoursMin)}</td>
        <td>${l.debit ? '-' : ''}${money(l.value)}</td>
      </tr>`);
  }

  const LINE_HEAD = ['Contracheque', 'Folha', 'Rubrica', 'Ref.', 'Tipo', 'Qtd.', 'Valor (R$)'];

  function bucketRows(m) {
    return calc().BUCKETS.filter((b) => m.buckets[b].exp || m.buckets[b].paid).map((b) => `<tr>
        <td class="l">${BUCKET_LABEL[b]}</td>
        <td>${fmt(m.buckets[b].exp)}</td>
        <td>${fmt(m.buckets[b].paid)}</td>
        <td>${signedFmt(m.buckets[b].paid - m.buckets[b].exp)}</td>
      </tr>`);
  }

  function detailHTML(m) {
    const notes = monthNotes(m);
    return `
      <div class="je-pay-detail-msg">${escapeHTML(statusText(m))}</div>
      ${m.lines.length ? `
      <table class="je-pay-lines">
        <thead><tr>${LINE_HEAD.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${lineRows(m).join('')}</tbody>
      </table>
      <table class="je-pay-lines je-pay-buckets">
        <thead><tr><th>Faixa</th><th>Espelho</th><th>Contracheque</th><th>Diferença</th></tr></thead>
        <tbody>${bucketRows(m).join('')}</tbody>
      </table>` : ''}
      ${notes.length ? `<ul class="je-pay-notes">${notes.map((n) => `<li>${escapeHTML(n)}</li>`).join('')}</ul>` : ''}`;
  }

  function paintTable() {
    const tbody = overlay.querySelector('#je-pay-tbody');
    if (!tbody || !view) return;
    const t = view.totals;
    const list = onlyIssues ? view.months.filter(needsReview) : view.months;
    const html = [];
    list.forEach((m) => {
      const open = openMonths.has(m.key);
      const extra = m.status === 'conferido' && needsReview(m) ? ' <span class="je-audit-badge je-pay-badge-warn" title="Adicional noturno ou valor por hora a conferir">+ conferir</span>' : '';
      html.push(`<tr class="je-audit-row je-pay-month" data-month="${m.key}" role="button" tabindex="0" aria-expanded="${open}">
        <td><span class="je-recog-caret">${open ? '▾' : '▸'}</span> ${periodLabel(m.key)}</td>
        <td>${dot(m.utilMin)}</td>
        <td>${dot(m.sabMin)}</td>
        <td>${dot(m.domferMin)}</td>
        <td><strong>${fmt(m.totalMin)}</strong></td>
        <td>${m.payslips.map(periodLabel).join(', ') || '—'}</td>
        <td>${hasHours(m) ? fmt(m.paidMin) : '—'}</td>
        <td>${diffCell(m)}</td>
        <td>${money(m.value)}</td>
        <td>${badge(m.status)}${extra}</td>
      </tr>`);
      if (open) html.push(`<tr class="je-recog-daysrow"><td colspan="${COLS}">${detailHTML(m)}</td></tr>`);
    });
    if (!list.length) {
      html.push(`<tr><td colspan="${COLS}" class="je-audit-none">Nenhum mês precisa de conferência.</td></tr>`);
    }
    html.push(`<tr class="je-recog-total">
      <td>Total do período</td>
      <td>${dot(view.months.reduce((s, m) => s + m.utilMin, 0))}</td>
      <td>${dot(view.months.reduce((s, m) => s + m.sabMin, 0))}</td>
      <td>${dot(view.months.reduce((s, m) => s + m.domferMin, 0))}</td>
      <td>${fmt(t.expectedMin)}</td>
      <td></td>
      <td>${fmt(t.paidMin)}</td>
      <td></td>
      <td>${money(t.valueTotal)}</td>
      <td></td>
    </tr>`);
    tbody.innerHTML = html.join('');
  }

  function onBodyClick(e) {
    const tr = e.target.closest ? e.target.closest('tr[data-month]') : null;
    if (!tr) return;
    const key = tr.dataset.month;
    if (openMonths.has(key)) openMonths.delete(key); else openMonths.add(key);
    paintTable();
    // A tabela é redesenhada: devolve o foco à linha para quem navega por teclado.
    if (e.type === 'keydown') {
      const again = overlay.querySelector(`tr[data-month="${key}"]`);
      if (again) again.focus();
    }
  }

  // --------------------------------------------------------------------------
  // Exportação
  // --------------------------------------------------------------------------
  function csvCell(v) {
    let s = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
    // Evita fórmula no Excel em texto que comece com =, +, - ou @ (horários e valores ficam).
    if (/^[=+\-@\t]/.test(s) && !/^[+-]?\d{1,4}:\d{2}$/.test(s) && !/^-?[\d.]+,\d{2}$/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    if (!current || !view || !view.months.length) { alert('Rode a auditoria antes de exportar.'); return; }
    const rows = [['MesEspelho', 'Espelho_DiaUtil', 'Espelho_Sabado', 'Espelho_DomFer', 'Espelho_Total', 'Contracheques',
      'Pago_DiaUtil', 'Pago_Sabado', 'Pago_DomFer', 'Pago_Total', 'Diferenca', 'Valor', 'Situacao',
      'AdicNoturno_Espelho', 'AdicNoturno_Esperado', 'AdicNoturno_Pago', 'AdicNoturno_Situacao', 'HoraBase', 'Observacao']];
    view.months.forEach((m) => {
      const paid = hasHours(m);
      rows.push([periodLabel(m.key), fmt(m.utilMin), fmt(m.sabMin), fmt(m.domferMin), fmt(m.totalMin), m.payslips.map(periodLabel).join(' '),
        paid ? fmt(m.buckets.util.paid) : '', paid ? fmt(m.buckets.sab.paid) : '', paid ? fmt(m.buckets.domfer.paid) : '', paid ? fmt(m.paidMin) : '',
        paid ? fmt(m.diffMin) : '', m.value == null ? '' : money(m.value), (STATUS_INFO[m.status] || {}).label || m.status,
        m.nightMin ? fmt(m.nightMin) : '', m.nightMin ? fmt(m.night.expectedMin) : '', m.nightMin ? fmt(m.night.paidMin) : '', NIGHT_LABEL[m.night.status] || '',
        m.rate ? money(m.rate.base) : '', statusText(m)]);
    });
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSE_XT_Auditoria_Pagamento_Pecunias_${current.from}_a_${current.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printTable(head, rows) {
    return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }

  // Versão para guardar ou anexar: documento próprio, sem a tela do portal.
  function printHTML() {
    const t = view.totals;
    const S = calc().STATUS;
    const version = (window.JEPessoasVersion && window.JEPessoasVersion.getVersion && window.JEPessoasVersion.getVersion()) || '';
    const when = new Date(current.generatedAt).toLocaleString('pt-BR');
    const notes = buildNotes(current, view, {});
    if (current.partial) notes.unshift('A leitura foi interrompida antes do fim: este relatório é parcial.');

    const monthRows = view.months.map((m) => `<tr>
        <td>${periodLabel(m.key)}</td><td>${fmt(m.utilMin)}</td><td>${fmt(m.sabMin)}</td><td>${fmt(m.domferMin)}</td><td><strong>${fmt(m.totalMin)}</strong></td>
        <td>${m.payslips.map(periodLabel).join(', ') || '—'}</td><td>${hasHours(m) ? fmt(m.paidMin) : '—'}</td><td>${diffCell(m)}</td><td>${money(m.value)}</td>
        <td class="l">${(STATUS_INFO[m.status] || {}).label || m.status}</td>
      </tr>`);
    monthRows.push(`<tr class="total"><td>Total</td><td></td><td></td><td></td><td>${fmt(t.expectedMin)}</td><td></td><td>${fmt(t.paidMin)}</td><td></td><td>${money(t.valueTotal)}</td><td></td></tr>`);

    const review = view.months.filter(needsReview).map((m) => `
      <h3>${periodLabel(m.key)} · ${(STATUS_INFO[m.status] || {}).label || m.status}</h3>
      <p>${escapeHTML(statusText(m))}</p>
      ${m.lines.length ? printTable(LINE_HEAD, lineRows(m)) + printTable(['Faixa', 'Espelho', 'Contracheque', 'Diferença'], bucketRows(m)) : ''}
      ${monthNotes(m).map((n) => `<p>${escapeHTML(n)}</p>`).join('')}`).join('');

    let sec = 2;
    return `
      <h1>Conferência do pagamento de serviço extraordinário em pecúnia</h1>
      <p class="meta">${current.issuer ? 'Servidor: ' + escapeHTML(current.issuer) + (current.matricula ? ' · matrícula ' + escapeHTML(current.matricula) : '') + ' · ' : ''}Período: ${periodLabel(current.from)} a ${periodLabel(current.to)} · Emitido em ${when}</p>
      <p class="meta">Fonte: Espelho de Ponto e contracheques do Meu Espaço TSE, lidos pelo TSE XT ${escapeHTML(version)}. Documento de apoio; não substitui os registros oficiais.</p>

      <h2>1. Resumo</h2>
      <p>Horas no formato hh:mm. Em <strong>${t.months}</strong> mês(es) fechado(s) com pecúnia, o espelho soma <strong>${fmt(t.expectedMin)}</strong>. Nos contracheques lidos, <strong>${fmt(t.min[S.CONFERIDO])}</strong> estão conferidas, <strong>${fmt(t.missingMin)}</strong> não foram localizadas e <strong>${fmt(t.excessMin)}</strong> foram pagas acima do espelho.</p>
      ${notes.length ? `<ul>${notes.map((n) => `<li>${escapeHTML(n)}</li>`).join('')}</ul>` : ''}

      <h2>${sec++}. Meses conferidos</h2>
      ${printTable(['Mês do espelho', 'Dia útil', 'Sábado', 'Domingo/feriado', 'Espelho', 'Contracheque(s)', 'Pagas', 'Diferença', 'Valor (R$)', 'Situação'], monthRows)}

      <h2>${sec++}. Pontos a conferir</h2>
      ${review || '<p>Nenhum mês precisa de conferência.</p>'}

      ${view.orphans.length ? `<h2>${sec++}. Pagamentos sem horas correspondentes no espelho</h2>${printTable(ORPHAN_HEAD, orphanRows(view))}` : ''}

      <h2>${sec++}. Como a conferência é feita e base normativa</h2>
      ${explainHTML()}
    `;
  }

  function printReport() {
    if (!current || !view || !view.months.length) { alert('Rode a auditoria antes de imprimir.'); return; }
    let box = document.getElementById('je-recog-printdoc');
    if (!box) {
      box = document.createElement('div');
      box.id = 'je-recog-printdoc';
      document.body.appendChild(box);
    }
    box.innerHTML = printHTML();
    // @page não aceita escopo por classe: a regra só existe durante esta impressão.
    const page = document.createElement('style');
    page.id = 'je-recog-print-page';
    page.textContent = '@page { size: A4 landscape; margin: 12mm; }';
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
    if (current || running) return;
    const stored = await loadStored();
    const own = ownMatricula();
    // Resultado guardado por outro login neste navegador não é mostrado.
    const mine = stored && (!stored.matricula || !own || stored.matricula === own);
    // Resultado guardado antes da v1.1.13 ficou sem o nome do servidor.
    if (mine && !stored.issuer && own && stored.matricula === own) stored.issuer = issuerName();
    render(mine ? stored : null);
  }

  return { open, close, issuerName };
})();
