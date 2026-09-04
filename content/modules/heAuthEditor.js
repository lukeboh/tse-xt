/**
 * TSE XT - Hora Extra Autorizada (input manual, por matrícula + mês)
 *
 * O quantitativo de HE autorizado no SAEX não é acessível pelo perfil comum
 * (endpoint AutorizacaoHoraExcedenteAction_execute redireciona para a home).
 * Então o usuário informa manualmente, separado por bloco:
 *   - Semana / Sábado  (+50%)
 *   - Domingo / Feriado (+100%)
 * Persistido em chrome.storage.local: je_xt_he_autorizado_v1_<matricula>
 *   { "AAAA-MM": { wkSatMin: <min>, sunHolMin: <min> } }
 */

window.JEPessoasHEAuth = (function () {
  'use strict';

  const STORAGE_PREFIX = 'je_xt_he_autorizado_v1_';

  function storageKey(mat) {
    return STORAGE_PREFIX + (mat || 'self');
  }

  function toMin(str) {
    if (!str) return 0;
    str = String(str).replace(/\s/g, '');
    if (str.indexOf(':') >= 0) {
      const p = str.split(':');
      return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    }
    const digits = str.replace(/\D/g, '');
    if (!digits) return 0;
    if (digits.length <= 2) return parseInt(digits, 10) * 60;         // "20" => 20h
    return (parseInt(digits.slice(0, -2), 10) || 0) * 60 + (parseInt(digits.slice(-2), 10) || 0);
  }

  function fmt(min) {
    const a = Math.max(0, Math.round(min || 0));
    return String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
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

  function getMonthKey() {
    const mSel = document.getElementById('mesSelecionado');
    const aSel = document.getElementById('anoSelecionado');
    let mm = mSel && mSel.value ? parseInt(mSel.value, 10) : null;
    let yy = aSel && aSel.value ? parseInt(aSel.value, 10) : null;
    if (!mm || !yy) {
      const dc = document.querySelector('#tblEspelhoPontoMesCorrente td.h01, .h01');
      const md = dc && (dc.innerText || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (md) { mm = parseInt(md[2], 10); yy = parseInt(md[3], 10); }
    }
    if (!mm || !yy) return null;
    return yy + '-' + String(mm).padStart(2, '0');
  }

  function getEntry(mat, monthKey, cb) {
    cb = cb || function () {};
    if (!monthKey) return cb({ wkSatMin: 0, sunHolMin: 0 });
    try {
      chrome.storage.local.get({ [storageKey(mat)]: {} }, (items) => {
        const all = (items && items[storageKey(mat)]) || {};
        const e = all[monthKey] || {};
        cb({ wkSatMin: e.wkSatMin || 0, sunHolMin: e.sunHolMin || 0 });
      });
    } catch (err) {
      cb({ wkSatMin: 0, sunHolMin: 0 });
    }
  }

  function setEntry(mat, monthKey, entry, cb) {
    cb = cb || function () {};
    if (!monthKey) return cb();
    try {
      chrome.storage.local.get({ [storageKey(mat)]: {} }, (items) => {
        const all = (items && items[storageKey(mat)]) || {};
        const wk = Math.max(0, entry.wkSatMin || 0);
        const sh = Math.max(0, entry.sunHolMin || 0);
        if (wk === 0 && sh === 0) {
          delete all[monthKey];
        } else {
          all[monthKey] = { wkSatMin: wk, sunHolMin: sh };
        }
        chrome.storage.local.set({ [storageKey(mat)]: all }, () => cb());
      });
    } catch (err) {
      cb();
    }
  }

  function applyTimeMask(input) {
    input.setAttribute('maxlength', '6');
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('input', () => {
      let raw = input.value.replace(/\D/g, '').slice(0, 5);
      if (raw.length >= 3) input.value = raw.slice(0, raw.length - 2) + ':' + raw.slice(-2);
      else input.value = raw;
    });
  }

  function openEditor(mat, monthKey, current, onSaved, doneHint) {
    current = current || { wkSatMin: 0, sunHolMin: 0 };
    doneHint = doneHint || { wkSatMin: 0, sunHolMin: 0 };
    // Sem valor salvo, começa do que já foi feito (pecúnia paga) — o autorizado é >= isso.
    const initWk = current.wkSatMin > 0 ? current.wkSatMin : (doneHint.wkSatMin || 0);
    const initSh = current.sunHolMin > 0 ? current.sunHolMin : (doneHint.sunHolMin || 0);
    let overlay = document.getElementById('je-heauth-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'je-heauth-modal';
    overlay.className = 'je-modal-overlay';
    overlay.innerHTML = `
      <div class="je-modal-content" style="max-width: 420px; padding: 0;">
        <div style="padding: 14px 18px; border-bottom: 1px solid rgba(226,232,240,0.85); background: rgba(248,250,252,0.85);">
          <h3 style="margin:0; font-size:14px; font-weight:800; color:#0a2540;">Hora extra autorizada — ${monthKey || 'mês'}</h3>
          <p style="margin:4px 0 0; font-size:11px; color:#64748b;">Os campos vêm das autorizações do SAEX (ícone de relógio). Ajuste se precisar — o valor salvo aqui passa a ter prioridade e fica só neste navegador. Zere os dois campos para voltar a usar o SAEX.</p>
        </div>
        <div style="padding: 16px 18px; display:flex; flex-direction:column; gap:12px;">
          <label style="display:flex; align-items:center; justify-content:space-between; font-size:12px; font-weight:600; color:#334155;">
            Semana / Sábado (+50%)
            <input id="je-heauth-wk" type="text" value="${fmt(initWk)}" placeholder="HH:MM"
              style="width:88px; text-align:center; font-size:13px; padding:5px 8px; border:1px solid rgba(10,37,64,0.18); border-radius:8px;">
          </label>
          <label style="display:flex; align-items:center; justify-content:space-between; font-size:12px; font-weight:600; color:#334155;">
            Domingo / Feriado (+100%)
            <input id="je-heauth-sh" type="text" value="${fmt(initSh)}" placeholder="HH:MM"
              style="width:88px; text-align:center; font-size:13px; padding:5px 8px; border:1px solid rgba(10,37,64,0.18); border-radius:8px;">
          </label>
          <p style="margin:0; font-size:10.5px; color:#94a3b8;">Já pago em pecúnia neste mês: Semana/Sáb <strong>${fmt(doneHint.wkSatMin)}</strong> · Dom/Fer <strong>${fmt(doneHint.sunHolMin)}</strong> (o autorizado é pelo menos isso).</p>
        </div>
        <div style="padding: 12px 18px 16px; display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" id="je-heauth-cancel" style="font-size:12px; font-weight:700; padding:7px 14px; border-radius:8px; border:1px solid rgba(10,37,64,0.14); background:#fff; color:#475569; cursor:pointer; box-shadow:none; height:auto;">Cancelar</button>
          <button type="button" id="je-heauth-save" style="font-size:12px; font-weight:700; padding:7px 16px; border-radius:8px; border:none; background:linear-gradient(135deg,#0056b3,#0077ff); color:#fff; cursor:pointer; box-shadow:none; height:auto;">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const wkInput = overlay.querySelector('#je-heauth-wk');
    const shInput = overlay.querySelector('#je-heauth-sh');
    applyTimeMask(wkInput);
    applyTimeMask(shInput);

    const close = () => overlay.classList.remove('active');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#je-heauth-cancel').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
    overlay.querySelector('#je-heauth-save').addEventListener('click', () => {
      const entry = { wkSatMin: toMin(wkInput.value), sunHolMin: toMin(shInput.value) };
      setEntry(mat, monthKey, entry, () => {
        close();
        if (typeof onSaved === 'function') onSaved(entry);
      });
    });
    setTimeout(() => wkInput.focus(), 60);
  }

  return { getMatricula, getMonthKey, getEntry, setEntry, openEditor, fmt, toMin };
})();
