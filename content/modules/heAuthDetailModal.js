/**
 * TSE XT - Modal "Autorização de Hora Extra" (detalhe do dia)
 *
 * O ícone de relógio do Espelho de Ponto (onclick="formEspelhoPontoMes_
 * detalharAutorizacao('DD/MM/AAAA','MATRICULA')") abre uma JANELA de popup
 * nativa (window.open, sem chrome do navegador) pra
 * AutorizacaoHoraExcedenteAction_execute — uma tabela crua "Núm. | Descrição
 * | Horas Autorizadas | Validade | Tipo | Lim. Úteis | Lim. Sáb. | Lim. Dom.
 * | Período". Vira um modal in-page no mesmo padrão dos demais diálogos do
 * TSE XT (.je-detail-modal-*, já estilizado em content.css), com cada
 * autorização do dia organizada num cartão próprio — não a tabela crua.
 *
 * Reaproveita fetchDayDetail()/parseAuthRows()/classifyAuth() de
 * heAuthFetch.js (mesma fonte que já alimenta o KPI de Hora Extra Pecúnia)
 * em vez de duplicar a lógica de busca/parsing.
 */
window.JEPessoasHEAuthModal = (function () {
  'use strict';

  var overlay = null;
  var requestSeq = 0; // ignora respostas de cliques anteriores que chegam atrasadas

  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function fmtMin(min) {
    min = Math.max(0, min || 0);
    var h = Math.floor(min / 60);
    var m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function fmtDate(dateStr) {
    var m = String(dateStr || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return escapeHTML(dateStr || '');
    var d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    var dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return escapeHTML(dateStr) + ' <span class="je-heauth-dow">(' + dias[d.getDay()] + ')</span>';
  }

  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'je-detail-modal-overlay je-heauth-modal-overlay';
    overlay.innerHTML =
      '<div class="je-detail-modal-card je-heauth-modal-card" role="dialog" aria-modal="true" aria-label="Autorização de Hora Extra">' +
        '<div class="je-detail-modal-header">' +
          '<span class="je-detail-modal-title">Autorização de Hora Extra</span>' +
          '<button type="button" class="je-detail-modal-close" aria-label="Fechar">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
        '<div class="je-detail-modal-body je-heauth-modal-body" id="je-heauth-modal-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.je-detail-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });

    return overlay;
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.documentElement.style.overflow = '';
  }

  function renderLoading(body) {
    body.innerHTML =
      '<div class="je-modal-loading">' +
        '<div class="je-spinner"></div>' +
        '<span>Buscando autorizações...</span>' +
      '</div>';
  }

  function renderError(body, dateStr) {
    body.innerHTML =
      '<div class="je-modal-alert je-modal-alert-error">' +
        '<span>Não foi possível consultar as autorizações de ' + fmtDate(dateStr) + '. Tente novamente.</span>' +
      '</div>';
  }

  function renderEmpty(body, dateStr) {
    body.innerHTML =
      '<div class="je-heauth-subtitle">' + fmtDate(dateStr) + '</div>' +
      '<div class="je-modal-alert je-modal-alert-warning">' +
        '<span>Nenhuma autorização de hora extra encontrada para esta data.</span>' +
      '</div>';
  }

  // Rótulo/cor do tipo de dia — mesma leitura de classifyAuth() (só o limite
  // de domingo preenchido = domingo/feriado, senão semana/sábado), coerente
  // com os 2 blocos do KPI de Hora Extra (Pecúnia).
  function dayTypeBadge(auth) {
    var HEF = window.JEPessoasHEAuthFetch;
    var kind = HEF ? HEF.classifyAuth(auth) : (auth.limDomMin > 0 && !auth.limUteisMin && !auth.limSabMin ? 'sunHol' : 'wkSat');
    if (kind === 'sunHol') {
      return '<span class="je-heauth-badge je-heauth-badge-sunhol">Domingo/Feriado &nbsp;+100%</span>';
    }
    return '<span class="je-heauth-badge je-heauth-badge-wksat">Semana/Sábado &nbsp;+50%</span>';
  }

  function renderAuthCard(auth) {
    var desc = auth.desc && !/^AUTORIZA[ÇC][ÃA]O DE PEC[ÚU]NIA - PORTAL DO SERVIDOR \(SAEX\)$/i.test(auth.desc)
      ? '<div class="je-heauth-desc">' + escapeHTML(auth.desc) + '</div>'
      : '';
    return (
      '<div class="je-heauth-card">' +
        '<div class="je-heauth-card-head">' +
          '<span class="je-heauth-num">Nº ' + escapeHTML(auth.num) + '</span>' +
          dayTypeBadge(auth) +
        '</div>' +
        desc +
        '<div class="je-heauth-hours-row">' +
          '<div class="je-heauth-hours">' +
            '<span class="je-heauth-hours-value">' + fmtMin(auth.horasMin) + '</span>' +
            '<span class="je-heauth-hours-label">horas autorizadas</span>' +
          '</div>' +
          '<div class="je-heauth-field">' +
            '<label>Tipo</label>' +
            '<span>' + escapeHTML(auth.tipo || '—') + '</span>' +
          '</div>' +
          '<div class="je-heauth-field">' +
            '<label>Validade</label>' +
            '<span>' + escapeHTML(auth.validade || '—') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="je-heauth-field je-heauth-field-full">' +
          '<label>Período</label>' +
          '<span>' + escapeHTML(auth.periodo || '—') + '</span>' +
        '</div>' +
        '<div class="je-heauth-limits">' +
          '<div class="je-heauth-limit">' +
            '<label>Dias úteis</label>' +
            '<span>' + fmtMin(auth.limUteisMin) + '</span>' +
          '</div>' +
          '<div class="je-heauth-limit">' +
            '<label>Sábado</label>' +
            '<span>' + fmtMin(auth.limSabMin) + '</span>' +
          '</div>' +
          '<div class="je-heauth-limit">' +
            '<label>Domingo/Feriado</label>' +
            '<span>' + fmtMin(auth.limDomMin) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderAuths(body, dateStr, auths) {
    var html = '<div class="je-heauth-subtitle">' + fmtDate(dateStr) + '</div>';
    if (auths.length > 1) {
      var total = auths.reduce(function (sum, a) { return sum + (a.horasMin || 0); }, 0);
      html += '<div class="je-heauth-total">' + auths.length + ' autorizações cobrindo este dia — ' + fmtMin(total) + ' no total</div>';
    }
    html += auths.map(renderAuthCard).join('');
    body.innerHTML = html;
  }

  async function openForDayMatricula(dateStr, matricula) {
    var ov = buildOverlay();
    var body = ov.querySelector('#je-heauth-modal-body');
    var mySeq = ++requestSeq;

    renderLoading(body);
    ov.classList.add('active');
    document.documentElement.style.overflow = 'hidden';

    var HEF = window.JEPessoasHEAuthFetch;
    if (!HEF) { renderError(body, dateStr); return; }

    try {
      var res = await HEF.fetchDayDetail(dateStr, matricula);
      if (mySeq !== requestSeq) return; // usuário já abriu outro dia enquanto isto carregava
      if (res.loggedOut) { renderError(body, dateStr); return; }
      var auths = HEF.parseAuthRows(res.rows);
      if (!auths.length) { renderEmpty(body, dateStr); return; }
      renderAuths(body, dateStr, auths);
    } catch (e) {
      if (mySeq === requestSeq) renderError(body, dateStr);
    }
  }

  // --------------------------------------------------------------------
  // Intercepta o clique no ícone/botão de relógio ANTES da janela nativa
  // abrir — delegado no document (captura), então funciona tanto pro <img>
  // nativo quanto pro .je-overtime-clock-btn que domModernizer.js insere
  // no lugar dele (e sobrevive a novas linhas da tabela sem religar nada).
  // stopPropagation() na fase de CAPTURA impede o evento de sequer chegar
  // no alvo — nem o onclick inline nativo, nem o listener que
  // domModernizer.js registra (que tentaria reexecutar o mesmo onclick),
  // chegam a rodar.
  // --------------------------------------------------------------------
  var ONCLICK_RE = /formEspelhoPontoMes_detalharAutorizacao\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/;

  function handleCapture(e) {
    var el = e.target.closest('[onclick*="formEspelhoPontoMes_detalharAutorizacao"], .je-overtime-clock-btn');
    if (!el) return;
    var onclickAttr = el.getAttribute('onclick') || '';
    var m = onclickAttr.match(ONCLICK_RE);
    if (!m) return; // ícone de relógio de outra função — não mexe
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openForDayMatricula(m[1], m[2]);
  }

  var listening = false;
  function init() {
    if (listening) return;
    listening = true;
    document.addEventListener('click', handleCapture, true);
  }

  return { init: init, openForDayMatricula: openForDayMatricula };
})();
