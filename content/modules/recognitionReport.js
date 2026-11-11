/**
 * TSE XT - Relatório de Reconhecimento Posterior
 *
 * Varre o Espelho de Ponto de cada servidor da equipe, mês a mês, e mostra as
 * horas feitas além da jornada ao lado das que foram pagas em pecúnia. O que
 * não foi pago, não virou banco e não compensou dia curto fica "a reconhecer".
 *
 * Serve de anexo ao pedido de reconhecimento posterior, com as duas saídas:
 *   (a) pagamento em pecúnia (acréscimo de 50% ou 100%, Res. 22.901/2008 art. 9º)
 *   (b) registro em banco de horas (úteis ×1, sábados ×1,5, domingos/feriados ×2)
 *
 * A equipe vem do seletor de servidores do Espelho de Ponto. A conta de cada
 * mês é de JEPessoasRecognition (recognitionCalc.js). O último relatório fica
 * em chrome.storage.local, só neste navegador.
 */

window.JEPessoasRecognitionReport = (function () {
  'use strict';

  const STORAGE_KEY = 'je_xt_recog_v1';
  const ESPELHO_URL = '/portalservidor2/EspelhoPontoMesAction_recuperar.action';
  const FETCH_THROTTLE_MS = 120;
  const CONFIRM_REQUESTS = 150;
  const COLS = 12;

  const KIND_LABEL = { uteis: 'Dia útil', sab: 'Sábado', domfer: 'Domingo/feriado' };
  const REASON_LABEL = {
    'teto-10h': 'Acima de 10h no dia',
    'nao-homologada': 'Não homologada',
    'acima-autorizado': 'Acima do autorizado',
    'sem-destino': 'Sem pagamento nem banco',
    'sobra-mes': 'Excedente que sobrou no mês',
    'hibrido': 'Mês híbrido'
  };

  let overlay = null;
  let running = false;
  let aborted = false;
  let team = [];
  let current = null;
  const openServers = new Set();
  const openMonths = new Set();

  // --------------------------------------------------------------------------
  // Utilidades
  // --------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const calc = () => window.JEPessoasRecognition;

  function fmt(min) {
    const neg = min < 0;
    const a = Math.abs(Math.round(min || 0));
    return (neg ? '-' : '') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
  }

  const dot = (min) => (min ? fmt(min) : '·');

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, (t) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
  }

  function legalUrl(k) {
    const U = (window.JEPessoasLegal && window.JEPessoasLegal.URLS) || {};
    return U[k] || {
      res22901: 'https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008',
      prt380_2026: 'https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026',
      prt490_2022: 'https://www.tse.jus.br/legislacao/compilada/prt/2022/portaria-no-490-de-20-de-maio-de-2022'
    }[k];
  }
  const lk = (k, txt) => `<a href="${legalUrl(k)}" target="_blank" rel="noopener">${txt}</a>`;

  function monthLabel(y, m) {
    return String(m).padStart(2, '0') + '/' + y;
  }

  function periodLabel(key) {
    const m = /^(\d{4})-(\d{2})$/.exec(key || '');
    return m ? m[2] + '/' + m[1] : '';
  }

  function ymKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
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

  // --------------------------------------------------------------------------
  // Equipe
  // --------------------------------------------------------------------------
  function teamSelect(doc) {
    return doc.querySelector('select[name="servidorSelecionado.matricula"], #servidorSelecionado_matricula');
  }

  function readTeam(doc) {
    const sel = teamSelect(doc);
    if (!sel) return [];
    const seen = new Set();
    return Array.from(sel.options).map((o) => ({
      matricula: (o.value || '').replace(/\D/g, ''),
      name: (o.textContent || '').replace(/\s+/g, ' ').trim()
    })).filter((s) => {
      if (s.matricula.length < 4 || seen.has(s.matricula)) return false;
      seen.add(s.matricula);
      return true;
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

  function unitInfo(doc) {
    const u = doc.querySelector('#unidadeSelecionada_idUnidade, select[name="unidadeSelecionada.idUnidade"]');
    if (!u || !u.value || u.value === '0') return { id: '', label: '' };
    const opt = u.options[u.selectedIndex];
    return { id: u.value, label: opt ? (opt.textContent || '').replace(/\s+/g, ' ').trim() : '' };
  }

  async function loadTeam() {
    let list = readTeam(document);
    let unit = unitInfo(document);
    if (!list.length) {
      // Fora do Espelho de Ponto: busca a tela para ler o seletor de servidores.
      try {
        const resp = await fetch(ESPELHO_URL, { credentials: 'include' });
        if (!/Login_|encerrarSessao/i.test(resp.url)) {
          const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
          list = readTeam(doc);
          unit = unitInfo(doc);
        }
      } catch (e) { /* segue só com o próprio servidor */ }
    }
    if (!list.length) {
      list = [{ matricula: ownMatricula(), name: issuerName() || 'Meu espelho', self: true }];
    }
    return { list, unit };
  }

  // --------------------------------------------------------------------------
  // Rede
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
    const sel = teamSelect(doc);
    const opt = sel && sel.querySelector('option[selected]');
    const v = opt ? (opt.getAttribute('value') || '').replace(/\D/g, '') : '';
    return v.length >= 4 ? v : '';
  }

  function sameMonth(a, y, m) {
    const first = a.days && a.days[0];
    return !!first && first.date.slice(3) === monthLabel(y, m);
  }

  // --------------------------------------------------------------------------
  // Varredura
  // --------------------------------------------------------------------------
  async function run() {
    if (running) return;
    const from = overlay.querySelector('#je-recog-from').value;
    const to = overlay.querySelector('#je-recog-to').value;
    const months = calc().monthRange(from, to);
    const picked = team.filter((s) => s.checked);

    if (!months.length) { alert('Informe o período do relatório (mês inicial e final).'); return; }
    if (!picked.length) { alert('Selecione ao menos um servidor.'); return; }
    const total = months.length * picked.length;
    if (total > CONFIRM_REQUESTS && !confirm(`Serão ${total} consultas ao Espelho de Ponto (${picked.length} servidores × ${months.length} meses). Pode levar alguns minutos; a barra mostra a previsão de término. Continuar?`)) return;

    running = true;
    aborted = false;
    openServers.clear();
    openMonths.clear();
    showProgress(true);
    tracker = window.JEPessoasProgress ? window.JEPessoasProgress.createTracker() : null;

    const unit = currentUnit;
    const result = {
      version: 1,
      from: months[0].key,
      to: months[months.length - 1].key,
      unit: unit.label,
      issuer: issuerName(),
      servers: [],
      partial: false
    };

    let done = 0;
    let loggedOut = false;
    for (const srv of picked) {
      if (aborted || loggedOut) break;
      const entry = { matricula: srv.matricula, name: srv.name, months: [], error: '' };
      result.servers.push(entry);
      for (const it of months) {
        if (aborted) break;
        setProgress(done, total, `${srv.name} · ${monthLabel(it.y, it.m)}`);
        try {
          const res = await fetchEspelho(it.y, it.m, srv.matricula, unit.id);
          if (res.loggedOut) { loggedOut = true; break; }
          const answered = answeredMatricula(res.doc);
          if (srv.matricula && answered && answered !== srv.matricula) {
            entry.error = 'O portal devolveu o espelho de outro servidor. Nada deste servidor foi contado.';
            entry.months = [];
            done += months.length - months.indexOf(it);
            if (tracker) tracker.step('espelho');
            break;
          }
          const a = window.JEPessoasAuthScan.analyzeEspelho(res.doc, { year: it.y, month: it.m });
          if (a.found && a.days.length && sameMonth(a, it.y, it.m)) {
            const s = calc().summarizeMonth(a);
            if (s.found) entry.months.push(Object.assign({ key: it.key, label: monthLabel(it.y, it.m) }, s));
          }
        } catch (e) {
          console.warn('[TSE XT] reconhecimento: falha em', it.key, e);
          entry.error = 'Um ou mais meses não puderam ser lidos.';
        }
        done++;
        await sleep(FETCH_THROTTLE_MS);
        if (tracker) tracker.step('espelho');
      }
    }

    result.generatedAt = new Date().toISOString();
    result.partial = loggedOut || aborted;
    await saveStored(result);

    running = false;
    showProgress(false);
    render(result, { loggedOut, aborted });
  }

  // --------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------
  let currentUnit = { id: '', label: '' };

  function createDOM() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'je-recog-modal';
    overlay.className = 'je-modal-overlay je-audit-modal je-recog-modal';
    overlay.innerHTML = `
      <div class="je-modal-content je-audit-content" role="dialog" aria-modal="true" aria-label="Relatório de Reconhecimento Posterior">
        <div class="je-audit-head">
          <div class="je-audit-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="stroke: var(--je-primary);" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <polyline points="9 15 11 17 15 13"></polyline>
            </svg>
            <span>Relatório de Reconhecimento Posterior</span>
          </div>
          <button type="button" class="je-audit-x" title="Fechar (Esc)">&times;</button>
        </div>

        <div class="je-audit-toolbar je-recog-toolbar">
          <div class="je-recog-period">
            <label>De <input type="month" id="je-recog-from"></label>
            <label>até <input type="month" id="je-recog-to"></label>
          </div>
          <div class="je-audit-actions">
            <button type="button" class="je-audit-btn je-audit-btn-primary" id="je-recog-run" title="Consulta o Espelho de Ponto de cada servidor no período">Gerar relatório</button>
            <button type="button" class="je-audit-btn" id="je-recog-csv" title="Exportar CSV (uma linha por servidor e mês)">CSV</button>
            <button type="button" class="je-audit-btn" id="je-recog-print" title="Versão para anexar ao pedido">Imprimir / PDF</button>
          </div>
        </div>

        <details class="je-recog-team" id="je-recog-team">
          <summary id="je-recog-team-summary">Servidores</summary>
          <div class="je-recog-team-list" id="je-recog-team-list"></div>
        </details>

        <div class="je-audit-progress" id="je-recog-progress" hidden>
          <div class="je-audit-progress-bar"><div class="je-audit-progress-fill" id="je-recog-progress-fill"></div></div>
          <div class="je-audit-progress-row">
            <span id="je-recog-progress-label">Consultando…</span>
            <button type="button" class="je-audit-btn je-audit-btn-ghost" id="je-recog-cancel">Cancelar</button>
          </div>
        </div>

        <div class="je-audit-body" id="je-recog-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.je-audit-x').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });
    overlay.querySelector('#je-recog-run').addEventListener('click', run);
    overlay.querySelector('#je-recog-cancel').addEventListener('click', () => { aborted = true; });
    overlay.querySelector('#je-recog-csv').addEventListener('click', exportCSV);
    overlay.querySelector('#je-recog-print').addEventListener('click', printReport);
    overlay.querySelector('#je-recog-team-list').addEventListener('change', (e) => {
      const i = e.target && e.target.dataset ? e.target.dataset.i : null;
      if (i == null) return;
      team[+i].checked = e.target.checked;
      paintTeamSummary();
    });
    overlay.querySelector('#je-recog-body').addEventListener('click', onBodyClick);
    overlay.querySelector('#je-recog-body').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.matches || !e.target.matches('tr[data-server], tr[data-month]')) return;
      e.preventDefault();
      onBodyClick(e);
    });

    // Padrão: os 12 meses anteriores ao mês corrente.
    const now = new Date();
    overlay.querySelector('#je-recog-to').value = ymKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    overlay.querySelector('#je-recog-from').value = ymKey(new Date(now.getFullYear(), now.getMonth() - 12, 1));
    return overlay;
  }

  function paintTeam() {
    const box = overlay.querySelector('#je-recog-team-list');
    box.innerHTML = team.map((s, i) => `
      <label class="je-recog-team-item">
        <input type="checkbox" data-i="${i}"${s.checked ? ' checked' : ''}>
        <span>${escapeHTML(s.name)}</span>
      </label>`).join('');
    paintTeamSummary();
  }

  function paintTeamSummary() {
    const n = team.filter((s) => s.checked).length;
    const unit = currentUnit.label ? ' · ' + escapeHTML(currentUnit.label) : '';
    overlay.querySelector('#je-recog-team-summary').innerHTML = team.length === 1 && team[0].self
      ? 'Servidores: só o seu espelho (nenhuma equipe encontrada nesta tela)'
      : `Servidores: <strong>${n}</strong> de ${team.length} selecionados${unit}`;
  }

  function showProgress(on) {
    overlay.querySelector('#je-recog-progress').hidden = !on;
    ['#je-recog-run', '#je-recog-csv', '#je-recog-print'].forEach((s) => { overlay.querySelector(s).disabled = on; });
  }

  // Barra com previsão de término (JEPessoasProgress).
  let tracker = null;

  function setProgress(done, total, label) {
    const Pr = window.JEPessoasProgress;
    const rest = tracker ? tracker.remainingMs({ espelho: total - done }) : null;
    const frac = (Pr && tracker) ? Pr.fraction(tracker.elapsedMs(), rest, done, total) : (total > 0 ? done / total : 0);
    const eta = Pr ? Pr.formatEta(rest) : '';
    overlay.querySelector('#je-recog-progress-fill').style.width = Math.round(frac * 100) + '%';
    overlay.querySelector('#je-recog-progress-label').textContent = `${label}  (${done}/${total}) · ${eta ? 'termina em ' + eta : 'calculando a previsão…'}`;
  }

  // Totais por servidor e da equipe, a partir do relatório guardado.
  function withTotals(result) {
    const servers = result.servers.map((s) => Object.assign({}, s, { totals: calc().summarizeServer(s.months) }));
    return { servers, team: calc().summarizeTeam(servers.map((s) => s.totals)) };
  }

  function render(result, flags) {
    current = result;
    flags = flags || {};
    const body = overlay.querySelector('#je-recog-body');

    if (!result || !result.servers || !result.servers.length) {
      body.innerHTML = `
        <div class="je-audit-empty">
          <p>Escolha o período e os servidores e clique em <strong>Gerar relatório</strong>.</p>
          <p>O relatório compara as horas feitas além da jornada com as horas pagas em pecúnia, para anexar ao pedido de reconhecimento posterior.</p>
        </div>`;
      return;
    }

    const { servers, team: t } = withTotals(result);
    const when = result.generatedAt ? new Date(result.generatedAt).toLocaleString('pt-BR') : '';
    const banner = flags.loggedOut
      ? '<div class="je-audit-alert">Sessão expirada durante a consulta. O resultado abaixo é parcial. Faça login e gere de novo.</div>'
      : ((flags.aborted || result.partial) ? '<div class="je-audit-alert">Consulta interrompida. O resultado abaixo é parcial.</div>' : '');

    const notes = [];
    if (t.aboveCap.total > 0) notes.push(`Das horas a reconhecer, <strong>${fmt(t.aboveCap.total)}</strong> passaram do limite de 10h por dia em sábado, domingo ou feriado.`);
    if (t.overMonthlyMin > 0) notes.push(`Há meses acima de 60h de serviço extraordinário. O que passou soma <strong>${fmt(t.overMonthlyMin)}</strong>.`);
    if (t.unexplainedMin !== 0) notes.push(`Em parte dos meses a conta não fechou: <strong>${fmt(t.unexplainedMin)}</strong> sem conciliação. Confira esses meses no Espelho de Ponto.`);
    if (t.hybridMonths > 0) notes.push(`${t.hybridMonths} mês(es) em regime híbrido ficaram fora do total (${fmt(t.hybridMin)} de trabalho além da jornada, só informativo).`);
    if (t.openMonths > 0) notes.push(`${t.openMonths} mês(es) ainda abertos ficaram fora do total (${fmt(t.openPendingMin)} em estimativa parcial).`);
    servers.filter((s) => s.error).forEach((s) => notes.push(`${escapeHTML(s.name)}: ${escapeHTML(s.error)}`));

    body.innerHTML = `
      ${banner}
      <div class="je-audit-hero">
        <div class="je-audit-hero-num">${fmt(t.pending.total)}</div>
        <div class="je-audit-hero-cap">horas feitas além da jornada que <strong>não</strong> foram pagas, <strong>não</strong> viraram banco e <strong>não</strong> compensaram dia curto</div>
        <div class="je-audit-hero-sub">${servers.length} servidor(es) · ${periodLabel(result.from)} a ${periodLabel(result.to)} · ${t.months} mês(es) fechado(s)${result.unit ? ' · ' + escapeHTML(result.unit) : ''}${when ? ' · gerado em ' + when : ''}</div>
      </div>

      <div class="je-audit-cards">
        ${card('Feitas além da jornada', t.worked.total, 'Em dia útil, o que passou da jornada do dia. Em sábado, domingo e feriado, todas as horas trabalhadas.')}
        ${card('Pagas em pecúnia', t.paid.total, 'Linhas Pecúnia e Adicional Noturno Pecúnia do rodapé do espelho.')}
        ${card('Registradas em banco', t.bank.total, 'Linha Horas Excedentes Homologadas do rodapé do espelho.')}
        ${card('Compensaram dia curto', t.compensatedMin, 'Excedente de dia útil usado para fechar a jornada de dias mais curtos do mesmo mês.')}
      </div>

      <div class="je-recog-options">
        <div class="je-recog-option">
          <div class="je-recog-option-h">Opção (a) · Pagamento em pecúnia</div>
          <div class="je-recog-option-row"><strong>${fmt(t.pay50Min)}</strong> com acréscimo de 50% <span>dias úteis e sábados</span></div>
          <div class="je-recog-option-row"><strong>${fmt(t.pay100Min)}</strong> com acréscimo de 100% <span>domingos e feriados</span></div>
        </div>
        <div class="je-recog-option">
          <div class="je-recog-option-h">Opção (b) · Registro em banco de horas</div>
          <div class="je-recog-option-row"><strong>${fmt(t.creditMin)}</strong> de crédito</div>
          <div class="je-recog-option-row"><span>dias úteis ×1 + sábados ×1,5 + domingos e feriados ×2</span></div>
        </div>
      </div>

      ${notes.length ? `<div class="je-audit-alert je-recog-notes">${notes.map((n) => `<div>${n}</div>`).join('')}</div>` : ''}

      <div class="je-audit-tablewrap">
        <table class="je-audit-table je-recog-table">
          <thead>
            <tr>
              <th>Servidor / mês</th>
              <th title="Meses fechados no período">Meses</th>
              <th title="Horas feitas além da jornada">Feitas</th>
              <th title="Pecúnia + adicional noturno em pecúnia">Pagas</th>
              <th title="Horas excedentes homologadas">Banco</th>
              <th title="Compensaram dia curto do mesmo mês">Compens.</th>
              <th title="Feitas e sem pagamento, banco ou compensação">A reconhecer</th>
              <th title="A reconhecer em dia útil (estimativa)">Dia útil</th>
              <th title="A reconhecer em sábado">Sábado</th>
              <th title="A reconhecer em domingo e feriado">Dom./fer.</th>
              <th title="Parte de sábado, domingo e feriado que passou de 10h no dia">Acima 10h</th>
              <th title="Opção (b): crédito no banco de horas com os fatores ×1, ×1,5 e ×2">Crédito (b)</th>
            </tr>
          </thead>
          <tbody id="je-recog-tbody"></tbody>
        </table>
      </div>
      <p class="je-audit-foot">Clique num servidor para ver os meses e num mês para ver os dias. Só mês fechado e fora do regime híbrido entra nos totais. O valor de dia útil é reconstruído dia a dia (total do dia menos a jornada) e deve ser lido como estimativa.</p>

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

  function explainHTML() {
    return `
      <div class="je-audit-def">
        <div class="je-audit-def-h">Como os números foram apurados</div>
        <p><strong>Feitas além da jornada:</strong> em dia útil, o que passou da jornada do dia (7h em turno único, 8h com intervalo, 5h no recesso). Em sábado, domingo e feriado, todas as horas trabalhadas.</p>
        <p><strong>Pagas em pecúnia:</strong> linhas <em>Pecúnia</em> e <em>Adicional Noturno Pecúnia</em> do rodapé do espelho. <strong>Banco:</strong> linha <em>Horas Excedentes Homologadas</em>. <strong>Compensaram dia curto:</strong> excedente de dia útil que fechou a jornada de dias mais curtos do mesmo mês.</p>
        <p><strong>A reconhecer:</strong> o que sobra. Reúne as horas não homologadas, as que passaram da quantidade autorizada, as acima de 10h em fim de semana e feriado e o excedente de dia útil que sobrou no mês.</p>
        <p>Mês em regime híbrido e mês ainda aberto aparecem na lista, mas ficam fora dos totais.</p>
      </div>
      <div class="je-audit-def">
        <div class="je-audit-def-h">Base normativa</div>
        <p>${lk('res22901', 'Res.-TSE 22.901/2008')}: art. 4º (limites de 2h em dia útil, 10h em sábado, domingo e feriado e 60h no mês); art. 4º §1º (passado o limite mensal, a Diretoria-Geral delibera sobre o registro para compensação, limitada a 30h); art. 4º §2º (pagamento em domingo e feriado só em plantão eleitoral e dias de eleição); art. 9º (acréscimo de 50% em dias úteis e sábados e de 100% em domingos e feriados); art. 11 (horas registradas para compensação podem, excepcionalmente, ser convertidas em pecúnia, havendo disponibilidade orçamentária).</p>
        <p>${lk('prt380_2026', 'Portaria-TSE 380/2026')}: art. 3º (autorização prévia); art. 10 (relatório homologado pela chefia até o 3º dia útil do mês seguinte); art. 11 (a Diretoria-Geral decide sobre o registro das horas excedentes para compensação, mediante solicitação motivada); art. 12 (vedado o pagamento a servidor em teletrabalho ou trabalho híbrido).</p>
        <p class="je-audit-src">Resumo dos dispositivos para orientar o pedido. Vale o texto oficial das normas, e a decisão é da Diretoria-Geral.</p>
      </div>`;
  }

  function numCells(o) {
    return `<td>${dot(o.worked.total)}</td>
      <td>${dot(o.paid.total)}</td>
      <td>${dot(o.bank.total)}</td>
      <td>${dot(o.compensatedMin)}</td>
      <td><strong>${fmt(o.pending.total)}</strong></td>
      <td>${dot(o.pending.uteis)}</td>
      <td>${dot(o.pending.sab)}</td>
      <td>${dot(o.pending.domfer)}</td>
      <td>${dot(o.aboveCap.total)}</td>
      <td>${dot(o.creditMin)}</td>`;
  }

  function statusBadge(s) {
    if (s.status === 'hibrido') return ` <span class="je-audit-badge je-audit-badge-hib" title="Mês em regime híbrido: fora do total. ${fmt(s.hybridMin)} de trabalho além da jornada, só informativo.">Híbrido</span>`;
    if (s.status === 'aberto') return ' <span class="je-audit-badge je-audit-badge-rec" title="Mês ainda aberto: estimativa parcial, fora do total.">Aberto</span>';
    if (s.unexplainedMin !== 0) return ` <span class="je-audit-badge je-audit-badge-he" title="A conta do mês não fechou: ${fmt(s.unexplainedMin)} sem conciliação.">Conferir</span>`;
    return '';
  }

  function reasonText(d) {
    return d.items.map((it) => {
      const label = (it.code === 'sem-destino' && d.hasAuth) ? 'Autorizado e não pago: conferir' : (REASON_LABEL[it.code] || it.code);
      return `${label} (${fmt(it.min)})`;
    }).join(' · ');
  }

  function daysHTML(s) {
    if (!s.days.length && !s.undistributedMin) return '<div class="je-recog-days-none">Nenhum dia com horas a reconhecer neste mês.</div>';
    const rows = s.days.map((d) => `<tr>
        <td>${escapeHTML(d.date)}</td>
        <td>${KIND_LABEL[d.kind]}</td>
        <td>${fmt(d.totalMin)}</td>
        <td>${d.targetMin ? fmt(d.targetMin) : '·'}</td>
        <td>${fmt(d.workedMin)}</td>
        <td>${dot(d.paidMin)}</td>
        <td><strong>${dot(d.pendingMin)}</strong></td>
        <td>${escapeHTML(reasonText(d))}</td>
      </tr>`).join('');
    const rest = s.undistributedMin > 0
      ? `<tr><td colspan="6">Excedente de dia útil sem dia identificado</td><td><strong>${fmt(s.undistributedMin)}</strong></td><td>Saldo do mês</td></tr>`
      : '';
    return `<table class="je-recog-days">
      <thead><tr><th>Dia</th><th>Tipo</th><th>Trabalhado</th><th>Jornada</th><th>Além da jornada</th><th>Pago</th><th>A reconhecer</th><th>Motivo</th></tr></thead>
      <tbody>${rows}${rest}</tbody>
    </table>`;
  }

  function paintTable() {
    const tbody = overlay.querySelector('#je-recog-tbody');
    if (!tbody || !current) return;
    const { servers, team: t } = withTotals(current);
    const html = [];
    servers.forEach((srv, i) => {
      const open = openServers.has(i);
      html.push(`<tr class="je-audit-row je-recog-server" data-server="${i}" role="button" tabindex="0" aria-expanded="${open}">
        <td><span class="je-recog-caret">${open ? '▾' : '▸'}</span> ${escapeHTML(srv.name)}${srv.error ? ` <span class="je-audit-badge je-audit-badge-he" title="${escapeHTML(srv.error)}">Conferir</span>` : ''}</td>
        <td>${srv.totals.months}</td>
        ${numCells(srv.totals)}
      </tr>`);
      if (!open) return;
      if (!srv.months.length) {
        html.push(`<tr class="je-recog-month"><td colspan="${COLS}" class="je-recog-days-none">${escapeHTML(srv.error || 'Nenhum espelho encontrado no período.')}</td></tr>`);
        return;
      }
      srv.months.forEach((s) => {
        const id = i + ':' + s.key;
        const mOpen = openMonths.has(id);
        html.push(`<tr class="je-audit-row je-recog-month" data-month="${id}" role="button" tabindex="0" aria-expanded="${mOpen}">
          <td><span class="je-recog-caret">${mOpen ? '▾' : '▸'}</span> ${escapeHTML(s.label)}${statusBadge(s)}</td>
          <td></td>
          ${numCells(s)}
        </tr>`);
        if (mOpen) html.push(`<tr class="je-recog-daysrow"><td colspan="${COLS}">${daysHTML(s)}</td></tr>`);
      });
    });
    html.push(`<tr class="je-recog-total">
      <td>Total da equipe</td>
      <td>${t.months}</td>
      ${numCells(t)}
    </tr>`);
    tbody.innerHTML = html.join('');
  }

  function onBodyClick(e) {
    const tr = e.target.closest ? e.target.closest('tr[data-server], tr[data-month]') : null;
    if (!tr) return;
    if (tr.dataset.server != null) {
      const i = +tr.dataset.server;
      if (openServers.has(i)) openServers.delete(i); else openServers.add(i);
    } else {
      const id = tr.dataset.month;
      if (openMonths.has(id)) openMonths.delete(id); else openMonths.add(id);
    }
    const sel = tr.dataset.server != null ? `tr[data-server="${tr.dataset.server}"]` : `tr[data-month="${tr.dataset.month}"]`;
    paintTable();
    // A tabela é redesenhada: devolve o foco à linha para quem navega por teclado.
    if (e.type === 'keydown') {
      const again = overlay.querySelector(sel);
      if (again) again.focus();
    }
  }

  // --------------------------------------------------------------------------
  // Exportação
  // --------------------------------------------------------------------------
  function csvCell(v) {
    let text = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
    // Evita fórmula no Excel em texto que comece com =, +, - ou @ (horários ficam).
    if (/^[=+\-@\t]/.test(text) && !/^-?\d{1,4}:\d{2}$/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  const STATUS_CSV = { fechado: 'Fechado', hibrido: 'Hibrido (fora do total)', aberto: 'Aberto (fora do total)' };

  function exportCSV() {
    if (!current || !current.servers || !current.servers.length) { alert('Gere o relatório antes de exportar.'); return; }
    const rows = [['Servidor', 'Matricula', 'Mes', 'Situacao', 'FeitasAlemJornada', 'PagasPecunia', 'Banco', 'CompensaramDiaCurto',
      'AReconhecer', 'AReconhecer_DiaUtil', 'AReconhecer_Sabado', 'AReconhecer_DomFer', 'AcimaDe10h',
      'OpcaoA_Acrescimo50', 'OpcaoA_Acrescimo100', 'OpcaoB_CreditoBanco', 'NaoConciliado', 'Hibrido_info']];
    current.servers.forEach((srv) => {
      srv.months.forEach((s) => {
        rows.push([srv.name, srv.matricula, s.label, STATUS_CSV[s.status] || s.status,
          fmt(s.worked.total), fmt(s.paid.total), fmt(s.bank.total), fmt(s.compensatedMin),
          fmt(s.pending.total), fmt(s.pending.uteis), fmt(s.pending.sab), fmt(s.pending.domfer), fmt(s.aboveCap.total),
          fmt(s.pay50Min), fmt(s.pay100Min), fmt(s.creditMin), fmt(s.unexplainedMin), fmt(s.hybridMin)]);
      });
    });
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSE_XT_Reconhecimento_Posterior_${current.from}_a_${current.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printTable(head, rows) {
    return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }

  function printCells(o) {
    return [fmt(o.worked.total), fmt(o.paid.total), fmt(o.bank.total), fmt(o.compensatedMin), `<strong>${fmt(o.pending.total)}</strong>`,
      fmt(o.pending.uteis), fmt(o.pending.sab), fmt(o.pending.domfer), fmt(o.aboveCap.total)].map((c) => `<td>${c}</td>`).join('');
  }

  // Versão para anexar ao pedido: documento próprio, sem a tela do portal.
  function printHTML() {
    const { servers, team: t } = withTotals(current);
    const version = (window.JEPessoasVersion && window.JEPessoasVersion.getVersion && window.JEPessoasVersion.getVersion()) || '';
    const when = current.generatedAt ? new Date(current.generatedAt).toLocaleString('pt-BR') : '';
    const head = ['Servidor', 'Meses', 'Feitas além da jornada', 'Pagas em pecúnia', 'Banco de horas', 'Compensaram dia curto', 'A reconhecer', 'Dia útil', 'Sábado', 'Domingo/feriado', 'Acima de 10h'];

    const summaryRows = servers.map((s) => `<tr><td>${escapeHTML(s.name)}<br><small>Matrícula ${escapeHTML(s.matricula || '—')}</small></td><td>${s.totals.months}</td>${printCells(s.totals)}</tr>`);
    summaryRows.push(`<tr class="total"><td>Total da equipe</td><td>${t.months}</td>${printCells(t)}</tr>`);

    const optionRows = servers.filter((s) => s.totals.pending.total > 0).map((s) => `<tr><td>${escapeHTML(s.name)}</td><td>${fmt(s.totals.pending.total)}</td><td>${fmt(s.totals.pay50Min)}</td><td>${fmt(s.totals.pay100Min)}</td><td>${fmt(s.totals.creditMin)}</td></tr>`);
    optionRows.push(`<tr class="total"><td>Total da equipe</td><td>${fmt(t.pending.total)}</td><td>${fmt(t.pay50Min)}</td><td>${fmt(t.pay100Min)}</td><td>${fmt(t.creditMin)}</td></tr>`);

    const detail = servers.filter((s) => s.months.some((m) => m.status === 'fechado' && m.pending.total > 0)).map((srv) => {
      const months = srv.months.filter((m) => m.status === 'fechado' && m.pending.total > 0);
      const monthRows = months.map((m) => `<tr><td>${escapeHTML(m.label)}</td>${printCells(m)}</tr>`);
      const dayRows = [];
      months.forEach((m) => {
        m.days.forEach((d) => dayRows.push(`<tr><td>${escapeHTML(d.date)}</td><td class="l">${KIND_LABEL[d.kind]}</td><td>${fmt(d.totalMin)}</td><td>${d.targetMin ? fmt(d.targetMin) : '—'}</td><td>${fmt(d.workedMin)}</td><td>${fmt(d.paidMin)}</td><td><strong>${fmt(d.pendingMin)}</strong></td><td class="l">${escapeHTML(reasonText(d))}</td></tr>`));
        if (m.undistributedMin > 0) dayRows.push(`<tr><td colspan="6" class="l">${escapeHTML(m.label)}: excedente de dia útil sem dia identificado</td><td><strong>${fmt(m.undistributedMin)}</strong></td><td class="l">Saldo do mês</td></tr>`);
      });
      return `<h3>${escapeHTML(srv.name)} · matrícula ${escapeHTML(srv.matricula || '—')}</h3>
        ${printTable(head.filter((h) => h !== 'Meses').map((h) => (h === 'Servidor' ? 'Mês' : h)), monthRows)}
        ${dayRows.length ? printTable(['Dia', 'Tipo', 'Trabalhado', 'Jornada', 'Além da jornada', 'Pago', 'A reconhecer', 'Motivo'], dayRows) : ''}`;
    }).join('');

    const notes = [];
    if (current.partial) notes.push('A consulta foi interrompida antes do fim: este relatório é parcial.');
    if (t.aboveCap.total > 0) notes.push(`Das horas a reconhecer, ${fmt(t.aboveCap.total)} passaram do limite de 10h por dia em sábado, domingo ou feriado.`);
    if (t.overMonthlyMin > 0) notes.push(`Há meses acima de 60h de serviço extraordinário; o que passou soma ${fmt(t.overMonthlyMin)}.`);
    if (t.unexplainedMin !== 0) notes.push(`Em parte dos meses a conta não fechou: ${fmt(t.unexplainedMin)} sem conciliação.`);
    if (t.hybridMonths > 0) notes.push(`${t.hybridMonths} mês(es) em regime híbrido ficaram fora do total (${fmt(t.hybridMin)} de trabalho além da jornada).`);
    if (t.openMonths > 0) notes.push(`${t.openMonths} mês(es) ainda abertos ficaram fora do total.`);
    servers.filter((s) => s.error).forEach((s) => notes.push(`${escapeHTML(s.name)}: ${escapeHTML(s.error)}`));

    return `
      <h1>Horas excedentes para reconhecimento posterior</h1>
      <p class="meta">${current.unit ? 'Unidade: ' + escapeHTML(current.unit) + ' · ' : ''}Período: ${periodLabel(current.from)} a ${periodLabel(current.to)} · Emitido em ${when}${current.issuer ? ' por ' + escapeHTML(current.issuer) : ''}</p>
      <p class="meta">Fonte: Espelho de Ponto do Meu Espaço TSE, lido pelo TSE XT ${escapeHTML(version)}. Documento de apoio; não substitui os registros oficiais.</p>

      <h2>1. Resumo por servidor</h2>
      <p>Horas no formato hh:mm. Em <strong>${t.months}</strong> mês(es) fechado(s), a equipe fez <strong>${fmt(t.worked.total)}</strong> além da jornada e recebeu <strong>${fmt(t.paid.total)}</strong> em pecúnia. Ficaram <strong>${fmt(t.pending.total)}</strong> sem pagamento, sem registro em banco e sem compensação.</p>
      ${printTable(head, summaryRows)}

      <h2>2. Opções de reconhecimento</h2>
      <p><strong>(a) Pagamento em pecúnia:</strong> horas com acréscimo de 50% (dias úteis e sábados) e de 100% (domingos e feriados). <strong>(b) Registro em banco de horas:</strong> crédito com os fatores ×1 (dias úteis), ×1,5 (sábados) e ×2 (domingos e feriados).</p>
      ${printTable(['Servidor', 'A reconhecer', '(a) Horas a 50%', '(a) Horas a 100%', '(b) Crédito em banco'], optionRows)}

      ${notes.length ? `<h2>3. Observações</h2><ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}

      <h2>${notes.length ? 4 : 3}. Detalhe por servidor</h2>
      ${detail || '<p>Nenhum servidor com horas a reconhecer no período.</p>'}

      <h2>${notes.length ? 5 : 4}. Como os números foram apurados e base normativa</h2>
      ${explainHTML()}
    `;
  }

  function printReport() {
    if (!current || !current.servers || !current.servers.length) { alert('Gere o relatório antes de imprimir.'); return; }
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
    if (!current) render(await loadStored());
    if (!team.length) {
      overlay.querySelector('#je-recog-team-summary').textContent = 'Servidores: carregando…';
      const loaded = await loadTeam();
      currentUnit = loaded.unit;
      team = loaded.list.map((s) => Object.assign({ checked: true }, s));
      paintTeam();
    }
  }

  return { open, close, issuerName };
})();
