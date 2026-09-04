/**
 * TSE XT - Leitura da hora extra AUTORIZADA a partir do backend do ícone de relógio
 *
 * O ícone de relógio do espelho chama
 *   formEspelhoPontoMes_detalharAutorizacao(data, matricula)
 * que abre AutorizacaoHoraExcedenteAction_execute?dataDia.asString=DD/MM/AAAA&servidor.matricula=NNN
 * — uma tabela com as autorizações de serviço extraordinário que cobrem aquele dia:
 *   Núm. | Descrição | Horas Autorizadas | Validade | Tipo | Lim. Úteis | Lim. Sáb. | Lim. Dom. | Período
 *
 * Este módulo consulta os dias com ícone no mês, deduplica as autorizações por
 * Núm., classifica cada uma como Semana/Sábado (+50%) ou Domingo/Feriado (+100%)
 * e soma as "Horas Autorizadas". Resultado cacheado por matrícula + mês.
 */

window.JEPessoasHEAuthFetch = (function () {
  'use strict';

  const STORAGE_PREFIX = 'je_xt_he_saex_v1_';
  const OPEN_MONTH_TTL_MS = 6 * 60 * 60 * 1000; // 6h para mês ainda aberto

  function storageKey(mat) { return STORAGE_PREFIX + (mat || 'self'); }

  function toMin(str) {
    const m = String(str || '').replace(/\s/g, '').match(/(\d{1,3}):(\d{2})/);
    return m ? (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0) : 0;
  }

  // --- Parsing puro (testado) -------------------------------------------------

  // rows: arrays de células [num, desc, horas, validade, tipo, limUteis, limSab, limDom, periodo]
  function parseAuthRows(rows) {
    return (rows || []).map((c) => ({
      num: (c[0] || '').trim(),
      desc: (c[1] || '').trim(),
      horasMin: toMin(c[2]),
      validade: (c[3] || '').trim(),
      tipo: (c[4] || '').trim(),
      limUteisMin: toMin(c[5]),
      limSabMin: toMin(c[6]),
      limDomMin: toMin(c[7]),
      periodo: (c[8] || '').trim()
    })).filter((a) => a.num);
  }

  // Classifica a autorização pelo(s) limite(s) de tipo de dia não nulo(s).
  function classifyAuth(a) {
    if (a.limDomMin > 0 && a.limUteisMin === 0 && a.limSabMin === 0) return 'sunHol';
    return 'wkSat';
  }

  // authsByDay: { 'DD/MM/AAAA': [ {num,...}, ... ] } -> agrega deduplicando por num
  function aggregate(authsByDay) {
    const seen = {};
    Object.keys(authsByDay || {}).forEach((d) => {
      (authsByDay[d] || []).forEach((a) => { if (a.num && !seen[a.num]) seen[a.num] = a; });
    });
    const auths = Object.values(seen);
    let wkSatMin = 0;
    let sunHolMin = 0;
    auths.forEach((a) => {
      if (classifyAuth(a) === 'sunHol') sunHolMin += a.horasMin;
      else wkSatMin += a.horasMin;
    });
    return { wkSatMin, sunHolMin, auths };
  }

  // --- Rede + cache --------------------------------------------------------

  function authDaysFromEspelho() {
    const tbl = document.getElementById('tblEspelhoPontoMesCorrente');
    if (!tbl) return [];
    const days = [];
    Array.prototype.slice.call(tbl.querySelectorAll('tr')).forEach((tr) => {
      const dc = tr.querySelector('td.h01');
      if (!dc || !/^\d{2}\/\d{2}\/\d{4}$/.test(dc.innerText.trim())) return;
      if (/detalharAutorizacao/.test(tr.innerHTML)) days.push(dc.innerText.trim());
    });
    return days;
  }

  function isClosedEspelho() {
    const tbl = document.getElementById('tblEspelhoPontoMesCorrente');
    if (!tbl) return false;
    return /M[eê]s fechado|fechado pelo sistema|AJUSTAD/i.test(
      Array.prototype.map.call(tbl.querySelectorAll('th'), (th) => (th.getAttribute('title') || '') + th.textContent).join(' ') + ' ' + tbl.innerText
    );
  }

  async function fetchDayDetail(dateStr, matricula) {
    const url = '/portalservidor2/AutorizacaoHoraExcedenteAction_execute?dataDia.asString='
      + encodeURIComponent(dateStr) + '&servidor.matricula=' + matricula;
    const r = await fetch(url, { credentials: 'include' });
    if (/Login_|encerrarSessao/i.test(r.url)) return { loggedOut: true, rows: [] };
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const t = doc.querySelector('table');
    if (!t) return { rows: [] };
    const rows = Array.prototype.slice.call(t.querySelectorAll('tr')).slice(1)
      .map((tr) => Array.prototype.slice.call(tr.children).map((x) => x.innerText.replace(/\s+/g, ' ').trim()))
      .filter((c) => c.length >= 8);
    return { rows };
  }

  function readCache(mat, monthKey, cb) {
    try {
      chrome.storage.local.get({ [storageKey(mat)]: {} }, (items) => {
        cb(((items && items[storageKey(mat)]) || {})[monthKey] || null);
      });
    } catch (e) { cb(null); }
  }

  function writeCache(mat, monthKey, entry, cb) {
    try {
      chrome.storage.local.get({ [storageKey(mat)]: {} }, (items) => {
        const all = (items && items[storageKey(mat)]) || {};
        all[monthKey] = entry;
        chrome.storage.local.set({ [storageKey(mat)]: all }, () => cb && cb());
      });
    } catch (e) { cb && cb(); }
  }

  function isFresh(entry) {
    if (!entry) return false;
    if (entry.closed) return true;
    return (Date.now() - (entry.fetchedAt || 0)) < OPEN_MONTH_TTL_MS;
  }

  /**
   * Devolve { wkSatMin, sunHolMin, auths, fromCache, fetchedAt } para o mês
   * atualmente exibido no espelho. Usa cache; só consulta a rede se necessário
   * ou se opts.force. Silencioso se não houver dias com ícone.
   */
  function getForCurrentMonth(mat, monthKey, opts, cb) {
    opts = opts || {};
    cb = cb || function () {};
    if (!mat || !monthKey) return cb(null);

    readCache(mat, monthKey, (cached) => {
      if (!opts.force && isFresh(cached)) return cb(Object.assign({ fromCache: true }, cached));

      const days = authDaysFromEspelho();
      if (!days.length) {
        // Sem ícones: grava um cache vazio para não reprocessar.
        const empty = { wkSatMin: 0, sunHolMin: 0, auths: [], closed: isClosedEspelho(), fetchedAt: Date.now() };
        writeCache(mat, monthKey, empty, () => cb(Object.assign({ fromCache: false }, empty)));
        return;
      }

      (async () => {
        const byDay = {};
        let loggedOut = false;
        for (const d of days) {
          try {
            const res = await fetchDayDetail(d, mat);
            if (res.loggedOut) { loggedOut = true; break; }
            byDay[d] = parseAuthRows(res.rows);
          } catch (e) { /* ignora o dia */ }
          await new Promise((r) => setTimeout(r, 70));
        }
        if (loggedOut) return cb(cached ? Object.assign({ fromCache: true }, cached) : null);

        const agg = aggregate(byDay);
        const entry = {
          wkSatMin: agg.wkSatMin,
          sunHolMin: agg.sunHolMin,
          auths: agg.auths,
          closed: isClosedEspelho(),
          fetchedAt: Date.now()
        };
        writeCache(mat, monthKey, entry, () => cb(Object.assign({ fromCache: false }, entry)));
      })();
    });
  }

  return {
    parseAuthRows,
    classifyAuth,
    aggregate,
    getForCurrentMonth,
    toMin
  };
})();
