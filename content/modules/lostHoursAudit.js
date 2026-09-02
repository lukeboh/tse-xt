/**
 * TSE XT - Auditoria de Horas Perdidas
 *
 * Varre o Espelho de Ponto mês a mês e quantifica as horas adicionais
 * trabalhadas que NÃO viraram pecúnia NEM crédito no Banco de Horas.
 *
 * Quatro categorias (ver docs/regras-calculo-frequencia.md §3.9 e §5.3):
 *   B1  Não Homologadas ....... linha "Horas Excedentes Não Homologadas" do rodapé
 *   B2  Excedente de dia útil .. saldo de dias úteis acima da jornada absorvido
 *                               como HORAS AJUST./Compl. Jorn. Mínima (estimativa)
 *   B3  Descarte de FDS/feriado  acima do teto de 10h, ou trabalho de fim de
 *                               semana em mês híbrido (Portaria 380/2026 art. 12)
 *   B4  Crédito aquém da fórmula homologadas cujo crédito no Extrato ficou
 *                               abaixo de Úteis×1 + Sáb×1,5 + DomFer×2
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

    // B1 — rodapé "Não Homologadas"
    const b1 = f.naoHomolog.total;

    // B2 — excedente líquido de dias úteis não contabilizado
    let netWeekday = 0;
    a.days.forEach((d) => {
      if (d.isWeekend || d.isHoliday || d.isDispensed) return;
      netWeekday += d.totalMin - d.targetMin;
    });
    const contabilizadoUtil = f.pecunia.uteis + f.homolog.uteis + f.naoHomolog.uteis;
    const b2 = Math.max(0, netWeekday - contabilizadoUtil);

    // B3 — descarte de fim de semana / feriado
    let b3 = 0;
    a.days.forEach((d) => {
      if (!(d.isWeekend || d.isHoliday)) return;
      const worked = d.totalMin > 0 ? d.totalMin : d.h10Min;
      if (worked <= 0) return;
      if (a.hybrid) {
        if (d.pecuniaMin === 0) b3 += worked; // FDS em mês híbrido: descartado
      } else if (worked > 600) {
        b3 += worked - 600; // acima do teto de 10h
      }
    });

    // B4 — crédito no Extrato aquém da fórmula
    let b4 = 0;
    let adqMin = null;
    const expectedCredit = Math.round(f.homolog.uteis * 1.0 + f.homolog.sab * 1.5 + f.homolog.domfer * 2.0);
    const ext = extrato && (extrato[a.year + '-' + String(a.month).padStart(2, '0')]);
    if (ext) {
      adqMin = ext.adq;
      if (expectedCredit > 0) b4 = Math.max(0, expectedCredit - adqMin);
    }

    return {
      b1, b2, b3, b4,
      totalLost: b1 + b2 + b3 + b4,
      pecuniaMin: f.pecunia.total,
      homologMin: f.homolog.total,
      naoHomologMin: f.naoHomolog.total,
      expectedCredit,
      adqMin,
      netWeekday
    };
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
            authDayCount: a.authDayCount,
            reopenable: isReopenable(it.y, it.m, a),
            ...calc
          };
        } else {
          // mês sem dados: registra vazio p/ não re-consultar sempre (a não ser reabrível)
          snap.months[it.key] = {
            key: it.key, label: monthLabel(it.y, it.m), y: it.y, m: it.m,
            empty: true, reopenable: isReopenable(it.y, it.m, null),
            b1: 0, b2: 0, b3: 0, b4: 0, totalLost: 0,
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

    const list = Object.values(snap.months).filter((r) => !r.empty).sort((x, y) => (y.y - x.y) || (y.m - x.m));
    const withLoss = list.filter((r) => r.totalLost > 0);

    const sum = (k) => list.reduce((acc, r) => acc + (r[k] || 0), 0);
    const tot = { b1: sum('b1'), b2: sum('b2'), b3: sum('b3'), b4: sum('b4'), totalLost: sum('totalLost') };

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
        ${bucketCard('B1', 'Não Homologadas', tot.b1, 'exato')}
        ${bucketCard('B2', 'Excedente de dia útil', tot.b2, 'estimativa')}
        ${bucketCard('B3', 'Descarte de FDS/feriado', tot.b3, 'estimativa')}
        ${bucketCard('B4', 'Crédito aquém da fórmula', tot.b4, 'exato')}
      </div>

      <details class="je-audit-explain" open>
        <summary>📖 Entenda cada categoria</summary>
        <div class="je-audit-explain-body">
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id">B1</span> Não Homologadas <span class="je-audit-tag je-audit-tag-exato">valor exato</span></div>
            <p>Horas que o espelho <strong>reconhece</strong> como excedente, mas que a chefia <strong>não homologou</strong>. Aparecem na linha <em>"Horas Excedentes Não Homologadas"</em> do rodapé do espelho. Sem homologação elas não entram no banco (fator zero) e não são pagas — ficam registradas só como aviso.</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id">B2</span> Excedente de dia útil absorvido <span class="je-audit-tag je-audit-tag-est">estimativa</span></div>
            <p>Nos dias úteis, o que você trabalhou <strong>além da jornada</strong> (7h ou 8h) e que o sistema não pagou nem homologou. Esse tempo é "engolido" pela coluna <em>HORAS AJUST.</em> / <em>Compl. Jorn. Mínima</em> para fechar a jornada do mês e some sem virar crédito. É reconstruído dia a dia (<em>total do dia − jornada</em>, líquido do que foi pago/homologado no mês), por isso é uma estimativa.</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id">B3</span> Descarte de fim de semana / feriado <span class="je-audit-tag je-audit-tag-est">estimativa</span></div>
            <p>Duas situações: (a) horas trabalhadas <strong>acima do teto de 10h</strong> num sábado, domingo ou feriado — o que passa disso é cortado (Res. 22.901/2008 art. 4º); (b) qualquer trabalho de fim de semana feito num <strong>mês de regime híbrido/teletrabalho</strong>, que é descartado por inteiro (Portaria 380/2026 art. 12).</p>
          </div>
          <div class="je-audit-def">
            <div class="je-audit-def-h"><span class="je-audit-def-id">B4</span> Crédito aquém da fórmula <span class="je-audit-tag je-audit-tag-exato">valor exato</span></div>
            <p>Quando a chefia <strong>homologou</strong> horas mas o <strong>Extrato do Banco de Horas</strong> creditou <strong>menos</strong> do que a fórmula prevê (<em>Dias úteis ×1 + Sábados ×1,5 + Domingos/feriados ×2</em>). Na prática quase sempre fica em <strong>00:00</strong> — o Extrato costuma creditar igual ou a mais.</p>
          </div>
          <p class="je-audit-regime-legend">
            <strong>Coluna "Regime":</strong>
            <span class="je-audit-badge je-audit-badge-norm">Normal</span> mês comum ·
            <span class="je-audit-badge je-audit-badge-he">HE autoriz.</span> mês com hora extra autorizada (consumo do banco vedado, art. 13) ·
            <span class="je-audit-badge je-audit-badge-hib">Híbrido</span> mês com teletrabalho/híbrido (serviço extraordinário suprimido).
          </p>
        </div>
      </details>

      <div class="je-audit-tablewrap">
        <table class="je-audit-table">
          <thead>
            <tr>
              <th>Mês</th><th>Regime</th><th title="Horas pagas em pecúnia no mês">Pecúnia</th><th title="Horas homologadas para o banco no mês">Homolog.</th>
              <th title="B1 — Não Homologadas">B1</th><th title="B2 — Excedente de dia útil absorvido">B2</th><th title="B3 — Descarte de fim de semana/feriado">B3</th><th title="B4 — Crédito aquém da fórmula">B4</th><th>Perdido</th>
            </tr>
          </thead>
          <tbody>
            ${withLoss.map(rowHTML).join('') || `<tr><td colspan="9" class="je-audit-none">Nenhuma hora perdida detectada 🎉</td></tr>`}
          </tbody>
        </table>
      </div>
      <p class="je-audit-foot">B2 e B3 são reconstruções dia a dia — trate como ordem de grandeza. Meses ainda abertos são reprocessados a cada "Atualizar". Base normativa: <em>regras-calculo-frequencia.md §3.9</em>.</p>
    `;
  }

  function bucketCard(id, title, min, precision) {
    const tag = precision === 'exato'
      ? '<span class="je-audit-tag je-audit-tag-exato">exato</span>'
      : '<span class="je-audit-tag je-audit-tag-est">estimativa</span>';
    return `<div class="je-audit-card">
      <div class="je-audit-card-id">${id} ${tag}</div>
      <div class="je-audit-card-val">${fmt(min)}</div>
      <div class="je-audit-card-title">${escapeHTML(title)}</div>
    </div>`;
  }

  function rowHTML(r) {
    const regime = r.hybrid ? 'Híbrido' : (r.heAuthorized ? 'HE autoriz.' : (r.closed ? 'Normal' : 'Aberto'));
    return `<tr>
      <td>${escapeHTML(r.label)}</td>
      <td><span class="je-audit-badge je-audit-badge-${r.hybrid ? 'hib' : (r.heAuthorized ? 'he' : 'norm')}">${regime}</span></td>
      <td>${fmt(r.pecuniaMin)}</td>
      <td>${fmt(r.homologMin)}</td>
      <td>${r.b1 ? fmt(r.b1) : '·'}</td>
      <td>${r.b2 ? fmt(r.b2) : '·'}</td>
      <td>${r.b3 ? fmt(r.b3) : '·'}</td>
      <td>${r.b4 ? fmt(r.b4) : '·'}</td>
      <td><strong>${fmt(r.totalLost)}</strong></td>
    </tr>`;
  }

  function exportCSV() {
    if (!currentSnapshot || !currentSnapshot.months) return;
    const rows = [['Mes', 'Regime', 'Fechado', 'Pecunia', 'Homologadas', 'B1_NaoHomologadas', 'B2_DiaUtilAbsorvido', 'B3_DescarteFDS', 'B4_CreditoAquemFormula', 'TotalPerdido']];
    Object.values(currentSnapshot.months).filter((r) => !r.empty).sort((x, y) => (x.y - y.y) || (x.m - y.m)).forEach((r) => {
      rows.push([
        r.label,
        r.hybrid ? 'Hibrido' : (r.heAuthorized ? 'HE autorizado' : 'Normal'),
        r.closed ? 'Sim' : 'Nao',
        fmt(r.pecuniaMin), fmt(r.homologMin),
        fmt(r.b1), fmt(r.b2), fmt(r.b3), fmt(r.b4), fmt(r.totalLost)
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
