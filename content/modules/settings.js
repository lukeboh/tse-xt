/**
 * TSE XT — Preferências de aparência do painel de KPIs
 *
 * Guardado em localStorage (síncrono, sem "flash" na montagem — mesmo padrão do
 * toggle de tema `je_xt_theme_enabled`):
 *
 *   je_xt_kpi_style    : 'flat'  (padrão) | 'gradient'
 *   je_xt_kpi_emphasis : 'soft'  (padrão) | 'glow'
 *
 * apply() reflete os valores em atributos no <html> e no <body>; todo o resto é
 * feito por CSS (body.je-xt-enabled[data-je-kpi-style="gradient"] .je-kpi-card …),
 * então os cards não precisam ser re-renderizados.
 */

window.JEPessoasSettings = (function () {
  'use strict';

  const DEFS = {
    'je_xt_kpi_style': {
      attr: 'data-je-kpi-style',
      values: ['flat', 'gradient'],
      def: 'flat'
    },
    'je_xt_kpi_emphasis': {
      attr: 'data-je-kpi-emphasis',
      values: ['soft', 'glow'],
      def: 'soft'
    }
  };

  function normalize(key, raw) {
    const d = DEFS[key];
    if (!d) return raw;
    return d.values.indexOf(raw) >= 0 ? raw : d.def;
  }

  function get(key) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch (e) {}
    return normalize(key, raw);
  }

  function set(key, val) {
    if (!DEFS[key]) return;
    const v = normalize(key, val);
    try { localStorage.setItem(key, v); } catch (e) {}
    apply();
  }

  function getAll() {
    const out = {};
    for (const k in DEFS) out[k] = get(k);
    return out;
  }

  function apply() {
    const targets = [];
    if (typeof document !== 'undefined') {
      if (document.documentElement) targets.push(document.documentElement);
      if (document.body) targets.push(document.body);
    }
    for (const k in DEFS) {
      const d = DEFS[k];
      const v = get(k);
      targets.forEach((t) => {
        if (t && typeof t.setAttribute === 'function') t.setAttribute(d.attr, v);
      });
    }
  }

  // -------------------------------------------------------------------------

  const GROUPS = [
    {
      key: 'je_xt_kpi_style',
      label: 'Preenchimento dos cards',
      options: [
        { value: 'flat', title: 'Clássico', hint: 'Vidro translúcido, como hoje.' },
        { value: 'gradient', title: 'Gradiente', hint: 'Leve degradê azul → ciano, como na proposta.' }
      ]
    },
    {
      key: 'je_xt_kpi_emphasis',
      label: 'Destaque dos cards',
      options: [
        { value: 'soft', title: 'Suave', hint: 'Sombra tátil atual.' },
        { value: 'glow', title: 'Glow azul', hint: 'Brilho azul mais profundo, sempre visível.' }
      ]
    }
  ];

  function segButtonHTML(groupKey, opt, isActive) {
    return `
      <button type="button" class="je-settings-seg-btn${isActive ? ' active' : ''}"
        data-setting="${groupKey}" data-value="${opt.value}"
        style="flex:1; border:none; background:${isActive ? '#ffffff' : 'transparent'};
               color:${isActive ? '#0056b3' : '#475569'}; font-size:12px; font-weight:700;
               padding:8px 10px; border-radius:7px; cursor:pointer; box-shadow:${isActive ? '0 2px 8px rgba(10,37,64,0.12)' : 'none'};
               height:auto; transition:all 0.16s ease;">
        ${opt.title}
      </button>`;
  }

  function groupHTML(group, current) {
    return `
      <div style="margin-bottom:16px;">
        <span style="display:block; font-size:12px; font-weight:800; color:#0a2540; margin-bottom:7px;">${group.label}</span>
        <div class="je-settings-seg" data-setting-group="${group.key}"
          style="display:flex; gap:6px; background:rgba(226,232,240,0.65); padding:4px; border-radius:10px;">
          ${group.options.map((o) => segButtonHTML(group.key, o, o.value === current)).join('')}
        </div>
        <p class="je-settings-hint" data-hint-for="${group.key}"
          style="margin:6px 2px 0; font-size:10.5px; color:#94a3b8; line-height:1.4;">
          ${(group.options.find((o) => o.value === current) || group.options[0]).hint}
        </p>
      </div>`;
  }

  function openModal() {
    const cur = getAll();

    let overlay = document.getElementById('je-settings-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'je-settings-modal';
    overlay.className = 'je-modal-overlay';
    overlay.innerHTML = `
      <div class="je-modal-content" style="max-width: 400px; padding: 0;">
        <div style="padding: 14px 18px; border-bottom: 1px solid rgba(226,232,240,0.85); background: rgba(248,250,252,0.85); display:flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0056b3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <h3 style="margin:0; font-size:14px; font-weight:800; color:#0a2540;">Aparência do painel de KPIs</h3>
        </div>
        <div style="padding: 16px 18px 6px;">
          ${GROUPS.map((g) => groupHTML(g, cur[g.key])).join('')}
          <p style="margin:2px 2px 0; font-size:10px; color:#94a3b8;">A mudança é aplicada na hora e vale para todas as telas do TSE XT.</p>
        </div>
        <div style="padding: 12px 18px 16px; display:flex; justify-content:flex-end;">
          <button type="button" id="je-settings-close"
            style="font-size:12px; font-weight:700; padding:7px 16px; border-radius:8px; border:none;
                   background:linear-gradient(135deg,#0056b3,#0077ff); color:#fff; cursor:pointer; box-shadow:none; height:auto;">
            Concluir
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const close = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 220);
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#je-settings-close').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    overlay.querySelectorAll('.je-settings-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-setting');
        const value = btn.getAttribute('data-value');
        set(key, value);

        const group = GROUPS.find((g) => g.key === key);
        const seg = overlay.querySelector(`[data-setting-group="${key}"]`);
        seg.querySelectorAll('.je-settings-seg-btn').forEach((b) => {
          const on = b.getAttribute('data-value') === value;
          b.classList.toggle('active', on);
          b.style.background = on ? '#ffffff' : 'transparent';
          b.style.color = on ? '#0056b3' : '#475569';
          b.style.boxShadow = on ? '0 2px 8px rgba(10,37,64,0.12)' : 'none';
        });
        const hintEl = overlay.querySelector(`[data-hint-for="${key}"]`);
        const opt = group && group.options.find((o) => o.value === value);
        if (hintEl && opt) hintEl.textContent = opt.hint;
      });
    });
  }

  return { get, set, getAll, apply, normalize, openModal, DEFS };
})();
