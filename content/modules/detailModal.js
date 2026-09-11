/**
 * TSE XT - Detalhamento em Modal (roadmap F7)
 *
 * Várias telas do portal mostram o "detalhamento" de uma linha de um jeito
 * ruim de usar:
 *   - "Homologação do Relatório de Serviços Realizados": ANEXA um
 *     <div class="grupoTopicos"> (+ um .grupoBotoes com "Fechar") no FIM da
 *     área de resultados, exigindo rolar a página toda;
 *   - "Análise dos pedidos de liberação médica": mostra um
 *     <div class="molduraDetalheLiberacaoMedica exibido"> posicionado
 *     ABSOLUTO dentro da célula, flutuando por cima da tabela, recortado.
 *
 * Este módulo observa esses blocos e os realoca para um modal central com
 * fundo desfocado, no mesmo padrão dos demais modais da extensão. Ao
 * fechar, o bloco volta pro lugar de origem (escondido) — o toggle nativo
 * continua funcionando.
 */

window.JEPessoasDetailModal = (function () {
  'use strict';

  // Blocos de detalhe conhecidos do portal.
  const DETAIL_SELECTOR = [
    '.grupoTopicos',
    '[class*="molduraDetalhe"]',
    '[class*="DetalheLiberacao"]',
    '#divDetalhamento',
    '#detalhamento'
  ].join(',');

  let observer = null;
  let currentOverlay = null;
  let scanTimer = null;

  // O CSS esconde o bloco nativo SEMPRE (até o JS pôr .je-detail-in-modal),
  // pra NÃO piscar no formato antigo. Então não dá pra confiar em
  // offsetParent/computed style — a "intenção de exibir" do portal vem da
  // classe .exibido ou do style.display inline; o .grupoTopicos não tem
  // esquema de classe, mas o portal só o insere no DOM quando quer mostrá-lo
  // (o pesquisar()/Fechar o remove).
  function isVisibleDetail(el) {
    if (el.classList.contains('escondido')) return false;
    if (el.classList.contains('exibido')) return true;
    if (el.style && el.style.display && el.style.display !== 'none') return true;
    if (el.classList.contains('grupoTopicos')) return true;
    return el.offsetParent !== null;
  }

  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'je-detail-modal-overlay';
    overlay.innerHTML =
      '<div class="je-detail-modal-card" role="dialog" aria-modal="true" aria-label="Detalhamento">' +
        '<div class="je-detail-modal-header">' +
          '<span class="je-detail-modal-title">Detalhamento</span>' +
          '<button type="button" class="je-detail-modal-close" aria-label="Fechar">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
        '<div class="je-detail-modal-body"></div>' +
      '</div>';
    return overlay;
  }

  function open(detailEl) {
    if (detailEl.dataset.jeInModal === '1') return;
    if (currentOverlay) closeCurrent();

    detailEl.dataset.jeInModal = '1';

    // âncora pra devolver o bloco ao lugar de origem quando fechar
    const slot = document.createComment('je-detail-slot');
    detailEl.parentNode.insertBefore(slot, detailEl);

    // o portal costuma pôr um .grupoBotoes (com "Fechar") logo depois — leva
    // junto pro modal.
    const btnRow = (detailEl.nextElementSibling &&
      detailEl.nextElementSibling.classList &&
      detailEl.nextElementSibling.classList.contains('grupoBotoes'))
        ? detailEl.nextElementSibling : null;

    const overlay = buildOverlay();
    const bodyEl = overlay.querySelector('.je-detail-modal-body');
    detailEl.classList.add('je-detail-in-modal');
    bodyEl.appendChild(detailEl);
    if (btnRow) bodyEl.appendChild(btnRow);

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { overlay.classList.add('active'); });

    const onKey = function (e) { if (e.key === 'Escape') closeCurrent(); };

    overlay._jeCleanup = function () {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      detailEl.classList.remove('je-detail-in-modal');
      // esconde no esquema que a tela usa e devolve pro DOM
      if (detailEl.classList.contains('exibido')) {
        detailEl.classList.remove('exibido');
        detailEl.classList.add('escondido');
      } else {
        detailEl.style.display = 'none';
      }
      try {
        if (slot.parentNode) {
          slot.parentNode.insertBefore(detailEl, slot);
          if (btnRow) slot.parentNode.insertBefore(btnRow, slot);
          slot.remove();
        }
      } catch (e) { /* nó de origem já não existe — tudo bem */ }
      detailEl.dataset.jeInModal = '';
    };

    overlay.querySelector('.je-detail-modal-close').addEventListener('click', closeCurrent);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeCurrent(); });
    document.addEventListener('keydown', onKey);

    if (btnRow) {
      btnRow.querySelectorAll('button, input[type="button"], input[type="submit"]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeCurrent();
        }, true);
      });
    }

    const closeBtn = overlay.querySelector('.je-detail-modal-close');
    if (closeBtn) closeBtn.focus();
    currentOverlay = overlay;
  }

  function closeCurrent() {
    if (!currentOverlay) return;
    const overlay = currentOverlay;
    currentOverlay = null;
    overlay.classList.remove('active');
    if (overlay._jeCleanup) { try { overlay._jeCleanup(); } catch (e) {} }
    window.setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 220);
  }

  function scan() {
    document.querySelectorAll(DETAIL_SELECTOR).forEach(function (el) {
      if (el.dataset.jeInModal === '1') return;
      if (el.closest('.je-detail-modal-overlay')) return;
      if (!isVisibleDetail(el)) return;
      if ((el.textContent || '').trim().length < 4) return; // casca vazia
      open(el);
    });
  }

  // Injeta a regra que esconde o bloco nativo enquanto o módulo está vivo —
  // fica aqui (não no .css estático) pra que, se o módulo falhar, o detalhe
  // nativo volte a aparecer em vez de sumir de vez.
  function injectHideRule() {
    if (document.getElementById('je-detail-modal-hide')) return;
    const st = document.createElement('style');
    st.id = 'je-detail-modal-hide';
    st.textContent =
      'body.je-xt-enabled .molduraDetalheLiberacaoMedica:not(.je-detail-in-modal),' +
      'body.je-xt-enabled [class*="molduraDetalhe"]:not(.je-detail-in-modal),' +
      'body.je-xt-enabled .grupoTopicos:not(.je-detail-in-modal),' +
      'body.je-xt-enabled #divDetalhamento:not(.je-detail-in-modal),' +
      'body.je-xt-enabled #detalhamento:not(.je-detail-in-modal)' +
      '{display:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function init() {
    injectHideRule();
    try { scan(); } catch (e) { /* não bloqueia o resto da montagem */ }
    if (observer) return;
    const root = document.querySelector('#conteudo') || document.querySelector('#container') || document.body;
    if (!root) return;
    observer = new MutationObserver(function () {
      // scan síncrono imediato (o CSS já esconde o bloco nativo, então não
      // pisca; isto só encurta ao máximo o tempo até o modal aparecer) + um
      // debounced de rede pra pegar mutações em lote.
      try { scan(); } catch (e) {}
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(function () { try { scan(); } catch (e) {} }, 40);
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  return { init: init, close: closeCurrent };
})();
