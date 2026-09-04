/**
 * TSE XT - Mini-planejador do mês (F3)
 *
 * A partir do saldo atual do mês e dos dias úteis restantes, mostra quanto
 * fazer por dia para zerar, e simula o fechamento do mês para um esforço
 * diário informado.
 */

window.JEPessoasPlanner = (function () {
  'use strict';

  function fmt(min, signed) {
    const neg = min < 0;
    const a = Math.abs(Math.round(min || 0));
    const s = String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
    return signed ? (neg ? '-' : '+') + s : (neg ? '-' : '') + s;
  }

  function toMin(str) {
    if (!str) return 0;
    str = String(str).replace(/\s/g, '');
    const neg = str.startsWith('-');
    if (str.indexOf(':') >= 0) {
      const p = str.replace('-', '').split(':');
      const v = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
      return neg ? -v : v;
    }
    const d = str.replace(/\D/g, '');
    if (!d) return 0;
    const v = d.length <= 2 ? parseInt(d, 10) * 60 : (parseInt(d.slice(0, -2), 10) || 0) * 60 + (parseInt(d.slice(-2), 10) || 0);
    return neg ? -v : v;
  }

  // Núcleo puro — testado em tests/monthPlanner.test.mjs
  function simulate(balMin, days, perDayMin) {
    balMin = balMin || 0;
    days = Math.max(0, days || 0);
    return {
      perDayToZero: days > 0 ? -balMin / days : 0,   // + = compensar, − = pode fazer menos
      singleDayToZero: -balMin,
      projected: balMin + (perDayMin || 0) * days
    };
  }

  function monthLabel() {
    const m = document.getElementById('mesSelecionado');
    const a = document.getElementById('anoSelecionado');
    if (m && a && m.value && a.value) {
      const nm = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][parseInt(m.value, 10)] || m.value;
      return nm + ' / ' + a.value;
    }
    return 'o mês';
  }

  function open(kpiData) {
    kpiData = kpiData || {};
    const balMin = kpiData.monthBalanceMin || 0;
    const days = Math.max(0, kpiData.remainingWorkingDaysMonth || 0);

    let overlay = document.getElementById('je-planner-modal');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'je-planner-modal';
    overlay.className = 'je-modal-overlay';

    const perDayToZero = simulate(balMin, days).perDayToZero; // + = compensar, - = pode fazer menos
    const zeroLine = days === 0
      ? 'Mês encerrado — não há dias úteis restantes.'
      : (Math.abs(balMin) < 1
        ? 'O mês já está zerado. 🎯'
        : (balMin < 0
          ? `Compensar <strong>${fmt(perDayToZero)}</strong> por dia útil (ou <strong>${fmt(-balMin)}</strong> num único dia).`
          : `Pode fazer <strong>${fmt(perDayToZero)}</strong> a menos por dia (sair mais cedo) e ainda zerar.`));

    overlay.innerHTML = `
      <div class="je-modal-content" style="max-width: 440px; padding: 0;">
        <div style="padding: 14px 18px; border-bottom: 1px solid rgba(226,232,240,0.85); background: rgba(248,250,252,0.85); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:14px; font-weight:800; color:#0a2540;">Planejar ${monthLabel()}</h3>
          <button type="button" id="je-planner-x" style="background:transparent; border:none; color:#64748b; font-size:18px; cursor:pointer; box-shadow:none; height:auto; padding:2px 6px;">&times;</button>
        </div>
        <div style="padding: 16px 18px; display:flex; flex-direction:column; gap:12px; font-size:12.5px; color:#334155;">
          <div style="display:flex; justify-content:space-between;">
            <span>Saldo agora</span>
            <strong style="color:${balMin > 0 ? '#059669' : (balMin < 0 ? '#a16207' : '#475569')};">${fmt(balMin, true)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Dias úteis restantes</span><strong>${days}</strong>
          </div>
          <div style="background: rgba(0,119,255,0.06); border:1px solid rgba(0,119,255,0.16); border-radius:10px; padding:9px 11px; line-height:1.55;">
            <div style="font-weight:700; color:#0a2540; margin-bottom:2px;">Para zerar o mês</div>
            ${zeroLine}
          </div>
          <div>
            <label style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <span style="font-weight:600;">Vou fazer, por dia útil restante:</span>
              <input id="je-planner-input" type="text" value="+00:00" placeholder="+HH:MM"
                style="width:92px; text-align:center; font-size:13px; padding:5px 8px; border:1px solid rgba(10,37,64,0.18); border-radius:8px;">
            </label>
            <p style="margin:8px 0 0; font-size:10.5px; color:#94a3b8;">Use valor negativo (ex.: -00:30) para simular sair mais cedo.</p>
          </div>
          <div style="border-top:1px solid rgba(226,232,240,0.9); padding-top:10px; display:flex; justify-content:space-between; align-items:baseline;">
            <span style="font-weight:700; color:#0a2540;">O mês fecha em</span>
            <strong id="je-planner-out" style="font-size:16px;">${fmt(balMin, true)}</strong>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const input = overlay.querySelector('#je-planner-input');
    const out = overlay.querySelector('#je-planner-out');
    const recompute = () => {
      const perDay = toMin(input.value);
      const projected = simulate(balMin, days, perDay).projected;
      out.textContent = fmt(projected, true);
      out.style.color = projected > 0 ? '#059669' : (projected < 0 ? '#a16207' : '#475569');
    };
    input.addEventListener('input', () => {
      // máscara leve: mantém sinal, formata HH:MM
      const neg = input.value.trim().startsWith('-');
      let raw = input.value.replace(/[^\d]/g, '').slice(0, 4);
      if (raw.length >= 3) input.value = (neg ? '-' : '+') + raw.slice(0, raw.length - 2) + ':' + raw.slice(-2);
      else if (raw.length) input.value = (neg ? '-' : '+') + raw;
      recompute();
    });

    const close = () => overlay.classList.remove('active');
    overlay.querySelector('#je-planner-x').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
    setTimeout(() => { input.focus(); input.select(); }, 60);
  }

  return { open, simulate, fmt, toMin };
})();
