/**
 * TSE XT - Auditoria de Horas Perdidas
 *
 * Varre o Espelho de Ponto mês a mês e quantifica as horas adicionais
 * trabalhadas que NÃO viraram pecúnia NEM crédito no Banco de Horas.
 *
 * Quatro categorias (ver docs/regras-calculo-frequencia.md §3.9 e §5.3):
 *   P1  Não Homologadas ....... linha "Horas Excedentes Não Homologadas" do rodapé
 *   P2  Excedente de dia útil .. saldo de dias úteis acima da jornada absorvido
 *                               como HORAS AJUST./Compl. Jorn. Mínima (estimativa)
 *   P3  Descarte de FDS/feriado  acima do teto de 10h, ou trabalho de fim de
 *                               semana em mês híbrido (Portaria 380/2026 art. 12)
 *   P4  Crédito aquém da fórmula homologadas cujo crédito no Extrato ficou
 *                               abaixo de Úteis×1 + Sáb×1,5 + DomFer×2
 * (P de "Perda". Os registros anteriores usavam b1..b4 — normalizados na leitura.)
 *
 * Persiste o resultado em chrome.storage.local por matrícula. A tela abre
 * sempre com o último resultado + delta (meses novos ou reabríveis). Um
 * "Full Update" refaz a varredura desde 2009.
 */

window.JEPessoasLostHours = (function () {
  'use strict';

  const STORAGE_VERSION = 1;
  const FIRST_YEAR = 2009;
  const FETCH_THROTTLE_MS = 90;

  let running = false;
  let aborted = false;
  let overlay = null;

  // Paleta categórica P1–P4 (validada pelo método dataviz; harmoniza com o azul
  // institucional). Ordem fixa, nunca reciclada.
  const CAT_COLOR = { p1: '#2a78d6', p2: '#eb6834', p3: '#1baf7a', p4: '#eda100' };

  function legalUrl(k) {
    const U = (window.JEPessoasLegal && window.JEPessoasLegal.URLS) || {};
    return U[k] || {
      res22901: 'https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008',
      prt380_2026: 'https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026',
      prt490_2022: 'https://www.tse.jus.br/legislacao/compilada/prt/2022/portaria-no-490-de-20-de-maio-de-2022'
    }[k];
  }
  const lk = (k, txt) => `<a href="${legalUrl(k)}" target="_blank" rel="noopener">${txt}</a>`;

  // Definição completa de cada categoria — reusada nos tooltips de coluna.
  const DEF = {
    p1: 'P1 · Não Homologadas — horas que o espelho reconhece como excedente mas a chefia não homologou (linha "Horas Excedentes Não Homologadas" do rodapé). Sem homologação: fator zero, não entram no banco e não são pagas. Valor exato. Base: Res. 22.901/2008 art. 11.',
    p2: 'P2 · Excedente de dia útil absorvido — o que você trabalhou além da jornada (7h/8h) nos dias úteis e o sistema não pagou nem homologou; é absorvido pela coluna HORAS AJUST./Compl. Jorn. Mínima para fechar a jornada do mês. Reconstruído dia a dia (total do dia − jornada, líquido do pago/homologado). Estimativa. Base: Portaria 380/2026 art. 6º §2º e art. 7º §2º.',
    p3: 'P3 · Descarte de fim de semana/feriado — (a) horas acima do teto de 10h em sábado/domingo/feriado, cortadas; (b) trabalho de fim de semana em mês de regime híbrido/teletrabalho, descartado por inteiro. Estimativa. Base: Res. 22.901/2008 art. 4º; Portaria 380/2026 art. 12; Portaria 490/2022 art. 23.',
    p4: 'P4 · Crédito aquém da fórmula — quando a chefia homologou horas mas o Extrato do Banco creditou menos que Dias úteis ×1 + Sábados ×1,5 + Domingos/feriados ×2. Quase sempre 00:00. Valor exato. Base: Res. 22.901/2008 art. 9º.',
    pecunia: 'Pecúnia — horas de serviço extraordinário autorizadas e pagas no mês (coluna PECÚNIA do espelho). Não entram no banco de horas.',
    homolog: 'Homologadas — horas de excedente aprovadas pela chefia para compensação no mês; entram no banco de horas com fator por tipo de dia.',
    perdido: 'Perdido — soma de P1 + P2 + P3 + P4 no mês: horas trabalhadas além da jornada que não viraram pecúnia nem crédito no banco.',
    mes: 'Mês de referência. Clique na linha para abrir o Espelho de Ponto correspondente.',
    regime: 'Regime do mês: Normal, HE autoriz. (mês com hora extra autorizada — consumo do banco vedado, Portaria 380/2026 art. 13) ou Híbrido (teletrabalho/híbrido — serviço extraordinário suprimido).'
  };

  // --------------------------------------------------------------------------
  // Utilidades
  // --------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function fmt(min) {
    const neg = min < 0;
    const a = Math.abs(Math.round(min));
    const h = Math.floor(a / 60);
    const m = a % 60;
    return (neg ? '-' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, (t) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
  }

  function storageKey(mat) {
    return 'je_xt_audit_v' + STORAGE_VERSION + '_' + (mat || 'self');
  }

  function loadSnapshot(mat) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [storageKey(mat)]: null }, (items) => {
          resolve((items && items[storageKey(mat)]) || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function saveSnapshot(mat, snap) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [storageKey(mat)]: snap }, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  function getMatricula() {
    const sel = document.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i], select[name*="matricula" i]');
    if (sel && sel.value && sel.value !== '0') return sel.value.replace(/\D/g, '');
    const inp = document.querySelector('input[name="servidorSelecionado.matricula"]');
    if (inp && inp.value && inp.value !== '0') return inp.value.replace(/\D/g, '');
    const el = document.querySelector('.matricula strong, .matricula span, #divTopServidorMatricula, .matricula');
    if (el) {
      const d = (el.innerText || '').replace(/\D/g, '');
      if (d.length >= 6) return d;
    }
    const m = window.location.search.match(/matricula=(\d+)/i);
    if (m && m[1] !== '0') return m[1];
    return '';
  }

  function getServerLabel() {
    const sel = document.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i]');
    if (sel && sel.selectedIndex >= 0) {
      const t = sel.options[sel.selectedIndex].text.trim();
      if (t && !/selecione|--nome--/i.test(t)) return t;
    }
    const el = document.querySelector('#divTopServidorNome, .usuario-logado');
    return el ? el.innerText.trim() : '';
  }

  function getUnidade() {
    const u = document.querySelector('#unidadeSelecionada_idUnidade, select[name*="unidade" i]');
    return u && u.value && u.value !== '0' ? u.value : '';
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

    const resp = await fetch('/portalservidor2/EspelhoPontoMesAction_recuperar.action', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/html,*/*' },
      body: body.toString()
    });
    const html = await resp.text();
    if (/Login_|encerrarSessao/i.test(resp.url) || (html.length < 15000 && /encerrada|autentica/i.test(html))) {
      return { loggedOut: true };
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { doc };
  }

  async function fetchExtratoMap() {
    // "M/YYYY" -> { adq, util } em minutos
    const map = {};
    try {
      const resp = await fetch('/portalservidor2/BancoHorasAction_recuperarExtrato.action', { credentials: 'include' });
      if (/Login_|encerrarSessao/i.test(resp.url)) return map;
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (!table) return map;
      Array.from(table.rows).slice(1).forEach((tr) => {
        const c = Array.from(tr.cells).map((x) => x.innerText.trim());
        if (c.length < 3) return;
        const mm = c[0].match(/^(\d{1,2})\/(\d{4})$/);
        if (!mm) return;
        const key = mm[2] + '-' + String(parseInt(mm[1], 10)).padStart(2, '0');
        map[key] = {
          adq: JEPessoasAuthScan.parseTimeToMinutes(c[1]),
          util: JEPessoasAuthScan.parseTimeToMinutes(c[2])
        };
      });
    } catch (e) { /* Extrato é opcional para B4 */ }
    return map;
  }

  // --------------------------------------------------------------------------
  // Cálculo por mês
  // --------------------------------------------------------------------------
  function computeMonth(a, extrato) {
    const f = a.footer;

    // P1 — rodapé "Não Homologadas"
    const p1 = f.naoHomolog.total;

    // P2 — excedente líquido de dias úteis não contabilizado
    let netWeekday = 0;
    a.days.forEach((d) => {
      if (d.isWeekend || d.isHoliday || d.isDispensed) return;
      netWeekday += d.totalMin - d.targetMin;
    });
    const contabilizadoUtil = f.pecunia.uteis + f.homolog.uteis + f.naoHomolog.uteis;
    const p2 = Math.max(0, netWeekday - contabilizadoUtil);

    // P3 — descarte de fim de semana / feriado
    let p3 = 0;
    a.days.forEach((d) => {
      if (!(d.isWeekend || d.isHoliday)) return;
      const worked = d.totalMin > 0 ? d.totalMin : d.h10Min;
      if (worked <= 0) return;
      if (a.hybrid) {
        if (d.pecuniaMin === 0) p3 += worked; // FDS em mês híbrido: descartado
      } else if (worked > 600) {
        p3 += worked - 600; // acima do teto de 10h
      }
    });

    // P4 — crédito no Extrato aquém da fórmula
    let p4 = 0;
    let adqMin = null;
    const expectedCredit = Math.round(f.homolog.uteis * 1.0 + f.homolog.sab * 1.5 + f.homolog.domfer * 2.0);
    const ext = extrato && (extrato[a.year + '-' + String(a.month).padStart(2, '0')]);
    if (ext) {
      adqMin = ext.adq;
      if (expectedCredit > 0) p4 = Math.max(0, expectedCredit - adqMin);
    }

    return {
      p1, p2, p3, p4,
      totalLost: p1 + p2 + p3 + p4,
      pecuniaMin: f.pecunia.total,
      homologMin: f.homolog.total,
      naoHomologMin: f.naoHomolog.total,
      expectedCredit,
      adqMin,
      netWeekday
    };
  }

  // Registros gravados antes da v0.4.2 usavam b1..b4 — normaliza na leitura.
  function normMonth(r) {
    if (!r) return r;
    if (r.p1 == null && r.b1 != null) {
      r.p1 = r.b1; r.p2 = r.b2; r.p3 = r.b3; r.p4 = r.b4;
    }
    return r;
  }

  function monthLabel(y, m) {
    return String(m).padStart(2, '0') + '/' + y;
  }

  function isReopenable(y, m, analysis) {
    if (analysis && !analysis.closed) return true;
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    const ageMonths = (cy - y) * 12 + (cm - m);
    return ageMonths <= 1; // mês corrente e anterior sempre reprocessam
  }

  // --------------------------------------------------------------------------
  // Varredura
  // --------------------------------------------------------------------------
  function buildMonthList(mode, snapshot) {
    const now = new Date();
    const endY = now.getFullYear();
    const endM = now.getMonth() + 1;
    const all = [];
    for (let y = FIRST_YEAR; y <= endY; y++) {
      const lastM = y === endY ? endM : 12;
      for (let m = 1; m <= lastM; m++) all.push({ y, m, key: y + '-' + String(m).padStart(2, '0') });
    }
    if (mode === 'full' || !snapshot || !snapshot.months) return all;
    return all.filter((it) => {
      const rec = snapshot.months[it.key];
      if (!rec) return true;
      return rec.reopenable;
    });
  }

  async function runUpdate(mode) {
    if (running) return;
    running = true;
    aborted = false;

    const matricula = getMatricula();
    const unidade = getUnidade();
    const prev = (await loadSnapshot(matricula)) || null;

    const months = buildMonthList(mode, prev);
    const snap = prev && prev.months ? JSON.parse(JSON.stringify(prev)) : {
      version: STORAGE_VERSION, matricula, serverLabel: getServerLabel(),
      firstYear: FIRST_YEAR, months: {}
    };
    snap.matricula = matricula;
    snap.serverLabel = getServerLabel() || snap.serverLabel;

    setProgress(0, months.length, 'Preparando…');
    showProgress(true);

    // Extrato do Banco de Horas (uma vez por varredura) para o bucket B4
    setProgress(0, months.length, 'Lendo Extrato do Banco de Horas…');
    const extrato = await fetchExtratoMap();

    let done = 0;
    let loggedOut = false;
    for (const it of months) {
      if (aborted) break;
      setProgress(done, months.length, 'Consultando ' + monthLabel(it.y, it.m) + '…');
      try {
        const res = await fetchEspelho(it.y, it.m, matricula, unidade);
        if (res.loggedOut) { loggedOut = true; break; }
        const a = JEPessoasAuthScan.analyzeEspelho(res.doc, { year: it.y, month: it.m });
        if (a.found && a.days.length) {
          const calc = computeMonth(a, extrato);
          snap.months[it.key] = {
            key: it.key,
            label: monthLabel(it.y, it.m),
            y: it.y, m: it.m,
            closed: a.closed,
            hybrid: a.hybrid,
            heAuthorized: a.heAuthorized,
            reducedRecess: a.reducedRecess,
            authDayCount: a.authDayCount,
            reopenable: isReopenable(it.y, it.m, a),
            ...calc
          };
        } else {
          // mês sem dados: registra vazio p/ não re-consultar sempre (a não ser reabrível)
          snap.months[it.key] = {
            key: it.key, label: monthLabel(it.y, it.m), y: it.y, m: it.m,
            empty: true, reopenable: isReopenable(it.y, it.m, null),
            p1: 0, p2: 0, p3: 0, p4: 0, totalLost: 0,
            pecuniaMin: 0, homologMin: 0, naoHomologMin: 0
          };
        }
      } catch (e) {
        console.warn('[TSE XT] auditoria: falha em', it.key, e);
      }
      done++;
      setProgress(done, months.length, 'Consultando ' + monthLabel(it.y, it.m) + '…');
      await sleep(FETCH_THROTTLE_MS);
    }

    snap.updatedAt = new Date().toISOString();
    snap.lastMode = mode;
    snap.partial = loggedOut || aborted;
    await saveSnapshot(matricula, snap);

    showProgress(false);
    running = false;

    render(snap, { loggedOut, aborted });
  }

  // --------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------
  function createDOM() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'je-audit-modal';
    overlay.className = 'je-modal-overlay je-audit-modal';
    overlay.innerHTML = `
      <div class="je-modal-content je-audit-content" role="dialog" aria-modal="true">
        <div class="je-audit-head">
          <div class="je-audit-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Auditoria de Horas Perdidas</span>
          </div>
          <button type="button" class="je-audit-x" title="Fechar (Esc)">&times;</button>
        </div>

        <div class="je-audit-toolbar">
          <div class="je-audit-updated" id="je-audit-updated">—</div>
          <div class="je-audit-actions">
            <button type="button" class="je-audit-btn" id="je-audit-refresh" title="Consulta apenas meses novos ou ainda abertos">Atualizar</button>
            <button type="button" class="je-audit-btn je-audit-btn-primary" id="je-audit-full" title="Refaz toda a varredura desde 2009">Full Update</button>
            <button type="button" class="je-audit-btn" id="je-audit-csv" title="Exportar CSV">CSV</button>
          </div>
        </div>

        <div class="je-audit-progress" id="je-audit-progress" hidden>
          <div class="je-audit-progress-bar"><div class="je-audit-progress-fill" id="je-audit-progress-fill"></div></div>
          <div class="je-audit-progress-row">
            <span id="je-audit-progress-label">Consultando…</span>
            <button type="button" class="je-audit-btn je-audit-btn-ghost" id="je-audit-cancel">Cancelar</button>
          </div>
        </div>

        <div class="je-audit-body" id="je-audit-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.je-audit-x').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });
    overlay.querySelector('#je-audit-refresh').addEventListener('click', () => runUpdate('incremental'));
    overlay.querySelector('#je-audit-full').addEventListener('click', () => {
      if (confirm('Full Update: refaz a varredura de todos os meses desde 2009. Pode levar alguns minutos. Continuar?')) {
        runUpdate('full');
      }
    });
    overlay.querySelector('#je-audit-cancel').addEventListener('click', () => { aborted = true; });
    overlay.querySelector('#je-audit-csv').addEventListener('click', exportCSV);

    return overlay;
  }

  function showProgress(on) {
    const p = overlay && overlay.querySelector('#je-audit-progress');
    if (p) p.hidden = !on;
    const refresh = overlay && overlay.querySelector('#je-audit-refresh');
    const full = overlay && overlay.querySelector('#je-audit-full');
    if (refresh) refresh.disabled = on;
    if (full) full.disabled = on;
  }

  function setProgress(done, total, label) {
    if (!overlay) return;
    const fill = overlay.querySelector('#je-audit-progress-fill');
    const lbl = overlay.querySelector('#je-audit-progress-label');
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (fill) fill.style.width = pct + '%';
    if (lbl) lbl.textContent = `${label}  (${done}/${total})`;
  }

  let currentSnapshot = null;

  function render(snap, flags) {
    currentSnapshot = snap;
    flags = flags || {};
    const body = overlay.querySelector('#je-audit-body');
    const updatedEl = overlay.querySelector('#je-audit-updated');

    if (!snap || !snap.months || !Object.keys(snap.months).length) {
      updatedEl.textContent = 'Nunca atualizado';
      body.innerHTML = `
        <div class="je-audit-empty">
          <p>Nenhuma auditoria salva para <strong>${escapeHTML(snap && snap.serverLabel || getServerLabel() || 'este servidor')}</strong>.</p>
          <p>Rode um <strong>Full Update</strong> para varrer o Espelho de Ponto desde 2009.</p>
        </div>`;
      return;
    }

    const d = new Date(snap.updatedAt);
    updatedEl.innerHTML = `Última atualização: <strong>${d.toLocaleString('pt-BR')}</strong>`
      + (snap.lastMode === 'full' ? ' · varredura completa' : ' · incremental')
      + (snap.partial ? ' · <span class="je-audit-warn">parcial</span>' : '');

    const list = Object.values(snap.months).map(normMonth).filter((r) => !r.empty).sort((x, y) => (y.y - x.y) || (y.m - x.m));
    const withLoss = list.filter((r) => r.totalLost > 0);

    const sum = (k) => list.reduce((acc, r) => acc + (r[k] || 0), 0);
    const tot = { p1: sum('p1'), p2: sum('p2'), p3: sum('p3'), p4: sum('p4'), totalLost: sum('totalLost') };

    const banner = flags.loggedOut
      ? `<div class="je-audit-alert">Sessão expirada durante a varredura — o resultado abaixo é parcial. Faça login e rode novamente.</div>`
      : (flags.aborted ? `<div class="je-audit-alert">Varredura cancelada — resultado parcial.</div>` : '');

    body.innerHTML = `
      ${banner}
      <div class="je-audit-hero">
        <div class="je-audit-hero-num">${fmt(tot.totalLost)}</div>
        <div class="je-audit-hero-cap">horas que você trabalhou além da jornada e que <strong>não</strong> viraram pecúnia <strong>nem</strong> crédito no banco de horas</div>
        <div class="je-audit-hero-sub">${withLoss.length} de ${list.length} meses com perda · ${escapeHTML(snap.serverLabel || '')}</div>
      </div>

      <p class="je-audit-intro">
        Toda hora extra tem três destinos possíveis: vira <strong>pecúnia</strong> (é paga),
        é <strong>homologada</strong> pela chefia e entra no <strong>banco de horas</strong>, ou
        <strong>se perde</strong>. As 4 categorias abaixo somam tudo que se perdeu.
      </p>

      <div class="je-audit-cards">
        ${bucketCard('p1', 'P1', 'Não Homologadas', tot.p1, 'exato')}
        ${bucketCard('p2', 'P2', 'Excedente de dia útil', tot.p2, 'estimativa')}
        ${bucketCard('p3', 'P3', 'Descarte de FDS/feriado', tot.p3, 'estimativa')}
        ${bucketCard('p4', 'P4', 'Crédito aquém da fórmula', tot.p4, 'exato')}
      </div>

      ${renderChart(list)}

      <details class="je-audit-explain" open>
        <summary>📖 Entenda cada categoria</summary>
        <div class="je-audit-explain-body">
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id" style="background:${CAT_COLOR.p1}">P1</span> Não Homologadas <span class="je-audit-tag je-audit-tag-exato">valor exato</span></div>
            <p>Horas que o espelho <strong>reconhece</strong> como excedente, mas que a chefia <strong>não homologou</strong>. Aparecem na linha <em>"Horas Excedentes Não Homologadas"</em> do rodapé do espelho. Sem homologação elas não entram no banco (fator zero) e não são pagas — ficam registradas só como aviso.</p>
            <p class="je-audit-src">Base: ${lk('res22901', 'Res.-TSE 22.901/2008')}, art. 11 (pecúnia/compensação são vias excludentes) · verificado em <em>regras-calculo-frequencia.md §3.1</em>.</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id" style="background:${CAT_COLOR.p2}">P2</span> Excedente de dia útil absorvido <span class="je-audit-tag je-audit-tag-est">estimativa</span></div>
            <p>Nos dias úteis, o que você trabalhou <strong>além da jornada do dia</strong> e que o sistema não pagou nem homologou. A jornada é <strong>7h</strong> em turno único (1 entrada / 1 saída, sem intervalo), <strong>8h</strong> quando há intervalo de almoço (2ª entrada registrada), e <strong>5h</strong> nos meses de recesso (janeiro; julho de ano não eleitoral). Esse tempo é absorvido pela coluna <em>HORAS AJUST.</em> / <em>Compl. Jorn. Mínima</em> para fechar a jornada do mês e some sem virar crédito. Reconstruído dia a dia (<em>total do dia − jornada</em>, líquido do pago/homologado), por isso é estimativa.</p>
            <p class="je-audit-src">Base: ${lk('prt380_2026', 'Portaria-TSE 380/2026')}, art. 6º §2º e art. 7º §2º · jornada de 5h no recesso: ${lk('prt885_2024', 'Portaria-TSE 885/2024')} e ${lk('res461_2023', 'Res.-TSE 461/2023')} (julho) · <em>regras-calculo-frequencia.md §3.5–3.6 e §3.10</em>.</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id" style="background:${CAT_COLOR.p3}">P3</span> Descarte de fim de semana / feriado <span class="je-audit-tag je-audit-tag-est">estimativa</span></div>
            <p>Duas situações: (a) horas trabalhadas <strong>acima do teto de 10h</strong> num sábado, domingo ou feriado — o que passa disso é cortado; (b) qualquer trabalho de fim de semana feito num <strong>mês de regime híbrido/teletrabalho</strong>, que é descartado por inteiro.</p>
            <p class="je-audit-src">Base: ${lk('res22901', 'Res.-TSE 22.901/2008')}, art. 4º (teto de 10h) · ${lk('prt380_2026', 'Portaria-TSE 380/2026')}, art. 12 e ${lk('prt490_2022', 'Portaria-TSE 490/2022')}, art. 23 (híbrido) · <em>regras-calculo-frequencia.md §3.4 e §3.7</em>.</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id" style="background:${CAT_COLOR.p4}">P4</span> Crédito aquém da fórmula <span class="je-audit-tag je-audit-tag-exato">valor exato</span></div>
            <p>Quando a chefia <strong>homologou</strong> horas mas o <strong>Extrato do Banco de Horas</strong> creditou <strong>menos</strong> do que a fórmula prevê (<em>Dias úteis ×1 + Sábados ×1,5 + Domingos/feriados ×2</em>). Na prática quase sempre fica em <strong>00:00</strong> — o Extrato costuma creditar igual ou a mais.</p>
            <p class="je-audit-src">Base: ${lk('res22901', 'Res.-TSE 22.901/2008')}, art. 9º (acréscimos de 50%/100%) · confirmado empiricamente em <em>regras-calculo-frequencia.md §5.1</em>.</p>
          </div>
          <p class="je-audit-regime-legend">
            <strong>Coluna "Regime":</strong>
            <span class="je-audit-badge je-audit-badge-norm">Normal</span> mês comum ·
            <span class="je-audit-badge je-audit-badge-he">HE autoriz.</span> mês com hora extra autorizada (consumo do banco vedado, ${lk('prt380_2026', 'Portaria 380/2026')} art. 13) ·
            <span class="je-audit-badge je-audit-badge-rec">Recesso 5h</span> janeiro / julho não eleitoral — jornada de 5h, acúmulo de banco só por decisão da DG (${lk('prt885_2024', 'Portaria 885/2024')}) ·
            <span class="je-audit-badge je-audit-badge-hib">Híbrido</span> mês com teletrabalho/híbrido (serviço extraordinário suprimido).
          </p>
        </div>
      </details>

      <div class="je-audit-tablewrap">
        <table class="je-audit-table">
          <thead>
            <tr>
              <th title="${escapeHTML(DEF.mes)}">Mês</th>
              <th title="${escapeHTML(DEF.regime)}">Regime</th>
              <th title="${escapeHTML(DEF.pecunia)}">Pecúnia</th>
              <th title="${escapeHTML(DEF.homolog)}">Homolog.</th>
              <th title="${escapeHTML(DEF.p1)}">P1</th>
              <th title="${escapeHTML(DEF.p2)}">P2</th>
              <th title="${escapeHTML(DEF.p3)}">P3</th>
              <th title="${escapeHTML(DEF.p4)}">P4</th>
              <th title="${escapeHTML(DEF.perdido)}">Perdido</th>
            </tr>
          </thead>
          <tbody>
            ${withLoss.map(rowHTML).join('') || `<tr><td colspan="9" class="je-audit-none">Nenhuma hora perdida detectada 🎉</td></tr>`}
          </tbody>
        </table>
      </div>
      <p class="je-audit-foot">Clique numa linha para abrir o Espelho de Ponto do mês. P2 e P3 são reconstruções dia a dia — trate como ordem de grandeza. Meses ainda abertos são reprocessados a cada "Atualizar". Base normativa: <em>regras-calculo-frequencia.md §3.9</em>.</p>
    `;

    body.querySelectorAll('.je-audit-row').forEach((tr) => {
      const go = () => openEspelhoForMonth(+tr.dataset.y, +tr.dataset.m, tr.dataset.label);
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  function bucketCard(key, code, title, min, precision) {
    const tag = precision === 'exato'
      ? '<span class="je-audit-tag je-audit-tag-exato">exato</span>'
      : '<span class="je-audit-tag je-audit-tag-est">estimativa</span>';
    return `<div class="je-audit-card" title="${escapeHTML(DEF[key])}">
      <div class="je-audit-card-id"><span class="je-audit-swatch" style="background:${CAT_COLOR[key]}"></span>${code} ${tag}</div>
      <div class="je-audit-card-val">${fmt(min)}</div>
      <div class="je-audit-card-title">${escapeHTML(title)}</div>
    </div>`;
  }

  function regimeOf(r) {
    if (r.hybrid) return { cls: 'hib', txt: 'Híbrido' };
    if (r.heAuthorized) return { cls: 'he', txt: 'HE autoriz.' };
    if (r.reducedRecess) return { cls: 'rec', txt: 'Recesso 5h' };
    return { cls: 'norm', txt: r.closed ? 'Normal' : 'Aberto' };
  }

  function rowHTML(r) {
    const rg = regimeOf(r);
    return `<tr class="je-audit-row" data-y="${r.y}" data-m="${r.m}" data-label="${escapeHTML(r.label)}" role="button" tabindex="0" title="Abrir o Espelho de Ponto de ${escapeHTML(r.label)}">
      <td>${escapeHTML(r.label)} <span class="je-audit-open-hint">↗</span></td>
      <td><span class="je-audit-badge je-audit-badge-${rg.cls}">${rg.txt}</span></td>
      <td>${fmt(r.pecuniaMin)}</td>
      <td>${fmt(r.homologMin)}</td>
      <td>${r.p1 ? fmt(r.p1) : '·'}</td>
      <td>${r.p2 ? fmt(r.p2) : '·'}</td>
      <td>${r.p3 ? fmt(r.p3) : '·'}</td>
      <td>${r.p4 ? fmt(r.p4) : '·'}</td>
      <td><strong>${fmt(r.totalLost)}</strong></td>
    </tr>`;
  }

  // ------------------------------------------------------------------------
  // Gráfico de barras empilhadas por ano (cronológico)
  // ------------------------------------------------------------------------
  function renderChart(list) {
    const byYear = {};
    list.forEach((r) => {
      const b = byYear[r.y] || (byYear[r.y] = { y: r.y, p1: 0, p2: 0, p3: 0, p4: 0, total: 0 });
      b.p1 += r.p1 || 0; b.p2 += r.p2 || 0; b.p3 += r.p3 || 0; b.p4 += r.p4 || 0;
      b.total += r.totalLost || 0;
    });
    const years = Object.values(byYear).sort((a, b) => a.y - b.y);
    if (!years.length || !years.some((y) => y.total > 0)) return '';

    const maxT = Math.max(...years.map((y) => y.total)) || 1;
    const W = 660, H = 190, padL = 42, padR = 10, padT = 16, padB = 20;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const base = padT + plotH;
    const slot = plotW / years.length;
    const bw = Math.min(30, slot * 0.6);
    const cats = ['p1', 'p2', 'p3', 'p4'];

    const gridVals = [0, maxT / 2, maxT];
    const grid = gridVals.map((v) => {
      const yy = base - (v / maxT) * plotH;
      return `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" class="je-chart-grid"/>`
        + `<text x="${padL - 6}" y="${(yy + 3).toFixed(1)}" text-anchor="end" class="je-chart-tick">${Math.round(v / 60)}h</text>`;
    }).join('');

    const bars = years.map((yr, i) => {
      const cx = padL + slot * i + (slot - bw) / 2;
      let acc = 0;
      const segs = cats.map((k) => {
        const val = yr[k];
        if (val <= 0) return '';
        const h = (val / maxT) * plotH;
        const y0 = base - ((acc + val) / maxT) * plotH;
        acc += val;
        const gap = h > 3 ? 1.5 : 0; // 2px de folga entre segmentos empilhados
        return `<rect x="${cx.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, h - gap).toFixed(1)}" fill="${CAT_COLOR[k]}" rx="1.5">`
          + `<title>${k.toUpperCase()} · ${yr.y}: ${fmt(val)}</title></rect>`;
      }).join('');
      const totLabel = yr.total > 0
        ? `<text x="${(cx + bw / 2).toFixed(1)}" y="${(base - (yr.total / maxT) * plotH - 4).toFixed(1)}" text-anchor="middle" class="je-chart-total">${fmt(yr.total)}</text>`
        : '';
      const yLabel = `<text x="${(cx + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="je-chart-xlabel">${yr.y}</text>`;
      return segs + totLabel + yLabel;
    }).join('');

    const legend = cats.map((k) => `<span class="je-chart-leg"><span class="je-audit-swatch" style="background:${CAT_COLOR[k]}"></span>${k.toUpperCase()}</span>`).join('');

    return `<div class="je-audit-chart">
      <div class="je-audit-chart-h">Perdas por ano</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gráfico de horas perdidas por ano, empilhado por categoria P1 a P4">
        <line x1="${padL}" y1="${base}" x2="${W - padR}" y2="${base}" class="je-chart-axis"/>
        ${grid}
        ${bars}
      </svg>
      <div class="je-audit-chart-legend">${legend}</div>
    </div>`;
  }

  function executePageScript(code) {
    try {
      const s = document.createElement('script');
      s.textContent = code;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e) { /* noop */ }
  }

  function openEspelhoForMonth(y, m, label) {
    if (!window.confirm(`Abrir o Espelho de Ponto de ${label}? A Auditoria será fechada.`)) return;
    const mes = document.getElementById('mesSelecionado');
    const ano = document.getElementById('anoSelecionado');
    close();
    if (mes && ano) {
      mes.value = String(m);
      ano.value = String(y);
      executePageScript('if (typeof formEspelhoPontoMes_consultar === "function") { formEspelhoPontoMes_consultar(); } else { var f = document.getElementById("formEspelhoPontoMes"); if (f) f.submit(); }');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function exportCSV() {
    if (!currentSnapshot || !currentSnapshot.months) return;
    const rows = [['Mes', 'Regime', 'Fechado', 'Pecunia', 'Homologadas', 'P1_NaoHomologadas', 'P2_DiaUtilAbsorvido', 'P3_DescarteFDS', 'P4_CreditoAquemFormula', 'TotalPerdido']];
    Object.values(currentSnapshot.months).map(normMonth).filter((r) => !r.empty).sort((x, y) => (x.y - y.y) || (x.m - y.m)).forEach((r) => {
      rows.push([
        r.label,
        r.hybrid ? 'Hibrido' : (r.heAuthorized ? 'HE autorizado' : (r.reducedRecess ? 'Recesso 5h' : 'Normal')),
        r.closed ? 'Sim' : 'Nao',
        fmt(r.pecuniaMin), fmt(r.homologMin),
        fmt(r.p1), fmt(r.p2), fmt(r.p3), fmt(r.p4), fmt(r.totalLost)
      ]);
    });
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSE_XT_Horas_Perdidas_${currentSnapshot.matricula || ''}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function close() {
    if (overlay) overlay.classList.remove('active');
  }

  async function open() {
    createDOM();
    overlay.classList.add('active');
    const mat = getMatricula();
    const snap = await loadSnapshot(mat);
    render(snap);
    // Abre sempre com o último resultado + delta: dispara incremental se já há histórico.
    if (snap && snap.months && Object.keys(snap.months).length && !running) {
      runUpdate('incremental');
    }
  }

  return { init: createDOM, open, close };
})();
