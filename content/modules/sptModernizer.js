/**
 * TSE XT - Modernizador Visual e Funcional do SPT (Gestão de Frequência de Prestadores)
 *
 * Aplica o Design System Glassmorfismo Tátil do TSE XT às telas do SPT
 * (https://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/*):
 *   - Topbar Slim Glass com perfil do gestor, atalho de busca (Ctrl+K),
 *     badge de versão/changelog, alterar senha, logout seguro (CSRF) e
 *     interruptor do tema TSE XT.
 *   - Page Title Banner com breadcrumb semântico, pílula de referência e
 *     atalho direto para o Relatório Consolidado por Unidade (+).
 *   - Combobox pesquisável para o seletor de Unidade (#cbUnidades).
 *   - Painel de 5 KPIs CLT e selos diários na tela de Acompanhamento de
 *     Frequência individual do prestador.
 */

window.JEPessoasSptModernizer = (function () {
  'use strict';

  const calc = () => window.JEPessoasSptCltCalc;
  const combo = () => window.JEPessoasSptCombobox;

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

  function setSafeHTML(el, htmlString) {
    if (!el) return;
    const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${htmlString}</body></html>`, 'text/html');
    el.replaceChildren(...Array.from(doc.body.childNodes));
  }

  function isSptPage() {
    return window.location.pathname.includes('/spt-consultafrequencia') || !!document.querySelector('header.navbar-custom');
  }

  function getMainContainer() {
    return document.querySelector('body > .container-fluid') || document.body;
  }

  function getAppHeaderContainer() {
    let headerWrapper = document.getElementById('je-app-header');
    if (!headerWrapper) {
      headerWrapper = document.createElement('div');
      headerWrapper.id = 'je-app-header';
      headerWrapper.className = 'je-app-header';
      const container = getMainContainer();
      container.insertBefore(headerWrapper, container.firstChild);
    }
    return headerWrapper;
  }

  function modernizeSptTopbar() {
    if (document.querySelector('.je-topbar')) return;

    const userNameEl = document.querySelector('.user-name, .footer-value');
    const userName = userNameEl ? userNameEl.textContent.replace(/\s+/g, ' ').trim() : 'Gestor';
    const perfilSelect = document.getElementById('perfilSelect');
    const perfilLabel = perfilSelect && perfilSelect.selectedOptions && perfilSelect.selectedOptions[0]
      ? perfilSelect.selectedOptions[0].textContent.trim()
      : 'Gestão';
    const versaoExtensao = window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '1.2.9-Snapshot';
    const iconUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('icons/base.png') : '';

    const topbar = document.createElement('header');
    topbar.className = 'je-topbar je-spt-topbar';

    setSafeHTML(topbar, `
      <div class="je-brand-wrapper">
        <div class="je-brand" id="je-header-brand" style="cursor:pointer;" title="SPT - Gestão de Frequência (Início)">
          <div class="je-spt-brand-title">
            ${iconUrl ? `<img src="${escapeHTML(iconUrl)}" alt="" width="24" height="24" class="je-spt-brand-icon" />` : ''}
            <span>SPT <strong>Frequência</strong></span>
          </div>

          <div class="je-brand-divider"></div>

          <div class="je-brand-badge" title="Extensão TSE XT ativa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            TSE XT
          </div>
          <span class="je-brand-version" id="je-version-badge" title="Clique para ver o histórico e novidades da versão" style="cursor: pointer;">
            v${escapeHTML(versaoExtensao)}
          </span>
        </div>
      </div>

      <div class="je-search-container" id="je-spt-quick-search" title="Abrir Relatório Consolidado de Horas por Unidade (Ctrl+K)">
        <svg class="je-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="je-search-input" placeholder="Relatório consolidado por unidade (CLT)..." readonly />
        <span class="je-search-shortcut">Ctrl+K</span>
      </div>

      <div class="je-topbar-actions">
        <div class="je-user-profile">
          <div class="je-user-chip" title="Usuário Autenticado no SPT (${escapeHTML(perfilLabel)})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <strong>${escapeHTML(userName)}</strong>
          </div>
          <a href="/spt-consultafrequencia/gestao/alterar-senha" class="je-spt-pwd-btn" title="Alterar Senha no SPT">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Senha
          </a>
          <button type="button" class="je-logout-btn" id="je-spt-logout-btn" title="Sair da Sessão do SPT">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
          </button>
        </div>

        <div class="je-toggle-container je-header-toggle" id="je-theme-toggle-header" title="Clique para alternar entre o visual moderno XT e o layout clássico">
          <span class="je-toggle-label">✨ <strong>TSE XT</strong> Ativo</span>
          <div class="je-toggle-switch"></div>
        </div>
      </div>
    `);

    const brandEl = topbar.querySelector('#je-header-brand');
    if (brandEl) {
      brandEl.addEventListener('click', () => {
        window.location.href = '/spt-consultafrequencia/gestao';
      });
    }

    const repTopBtn = topbar.querySelector('#je-spt-report-top-btn');
    if (repTopBtn) {
      repTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.JEPessoasSptReport) window.JEPessoasSptReport.open();
      });
    }

    const searchBox = topbar.querySelector('#je-spt-quick-search');
    if (searchBox) {
      searchBox.addEventListener('click', () => {
        if (window.JEPessoasSptReport) window.JEPessoasSptReport.open();
      });
    }

    const versionBadge = topbar.querySelector('#je-version-badge');
    if (versionBadge) {
      versionBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.JEPessoasVersion) window.JEPessoasVersion.openChangelogModal();
      });
    }

    const logoutBtn = topbar.querySelector('#je-spt-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const nativeLogoutForm = document.querySelector('form[action*="/logout"]');
        if (nativeLogoutForm) {
          nativeLogoutForm.submit();
        } else {
          window.location.href = '/spt-consultafrequencia/logout';
        }
      });
    }

    if (window.JEPessoasModernizer && window.JEPessoasModernizer.createPersistentToggle) {
      window.JEPessoasModernizer.createPersistentToggle();
    }

    const headerToggle = topbar.querySelector('#je-theme-toggle-header');
    if (headerToggle && window.JEPessoasModernizer) {
      headerToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyEnabled = document.body.classList.contains('je-xt-enabled');
        const nextState = !currentlyEnabled;
        window.JEPessoasModernizer.applyThemeState(nextState, true);
        chrome.storage?.local?.set({ xtEnabledSpt: nextState }, () => {
          if (window.JEPessoasModernizer.reloadAfterThemeToggle) {
            window.JEPessoasModernizer.reloadAfterThemeToggle();
          } else {
            setTimeout(() => window.location.reload(), 250);
          }
        });
      });
    }

    getAppHeaderContainer().appendChild(topbar);

    // Atalho global Ctrl+K no SPT abre o Relatório Consolidado por Unidade
    if (!document.body.dataset.jeSptCtrlKBound) {
      document.body.dataset.jeSptCtrlKBound = 'true';
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (window.JEPessoasSptReport) window.JEPessoasSptReport.open();
        }
      });
    }
  }

  function getSelectedUnitCleanName() {
    const sel = document.getElementById('cbUnidades');
    if (!sel || !sel.selectedOptions || !sel.selectedOptions[0]) return 'TSE';
    return sel.selectedOptions[0].textContent.replace(/^(?:-\s*)+/, '').trim();
  }

  function getSelectedContratoCleanName() {
    const sel = document.getElementById('cbContratos');
    if (!sel || !sel.selectedOptions || !sel.selectedOptions[0]) return 'Todos';
    return sel.selectedOptions[0].textContent.trim();
  }

  function injectSptTitleBanner(profileId) {
    if (document.querySelector('.je-page-title-banner')) return;

    const isWorkerSheet = profileId === 'sptAcompanhamento';
    let pageTitle = 'Gestão de Frequência de Prestadores';
    let breadcrumbActive = 'Consulta por Unidade';
    let refLeft = getSelectedUnitCleanName();
    let refRight = `Contrato: ${getSelectedContratoCleanName()}`;

    if (isWorkerSheet) {
      const parsed = calc().parseWorkerSheetDoc(document);
      pageTitle = parsed.meta.nome
        ? `Acompanhamento — ${parsed.meta.nome}`
        : 'Acompanhamento de Frequência';
      breadcrumbActive = 'Espelho Mensal do Prestador';
      refLeft = `Período: ${parsed.meta.periodo || 'Atual'}`;
      refRight = parsed.meta.contrato ? `Contrato ${parsed.meta.contrato}` : '';
    }

    const titleBanner = document.createElement('div');
    titleBanner.className = 'je-page-title-banner je-spt-title-banner';

    setSafeHTML(titleBanner, `
      <div class="je-title-content">
        <div class="je-title-badge-wrapper">
          <div class="je-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
            </svg>
          </div>
          <div>
            <nav class="je-breadcrumb" aria-label="Navegação">
              <span class="je-breadcrumb-item">SPT</span>
              <span class="je-breadcrumb-separator">/</span>
              <span class="je-breadcrumb-item">Gestão de Frequência</span>
              <span class="je-breadcrumb-separator">/</span>
              <span class="je-breadcrumb-item active">${escapeHTML(breadcrumbActive)}</span>
            </nav>
            <h1 class="je-page-title">${escapeHTML(pageTitle)}</h1>
          </div>
        </div>
        <div class="je-spt-banner-right">
          <div class="je-reference-pill" id="je-spt-ref-pill" title="Escopo selecionado">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span><strong class="je-ref-value" id="je-spt-ref-left">${escapeHTML(refLeft)}</strong>${refRight ? `<span class="je-ref-sep"> · </span><strong class="je-ref-value" id="je-spt-ref-right">${escapeHTML(refRight)}</strong>` : ''}</span>
          </div>
          <button type="button" class="je-spt-banner-report-btn" id="je-spt-open-report-banner" title="Abrir Relatório Consolidado de Horas por Unidade (CLT)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Relatório Consolidado (CLT)</span>
          </button>
        </div>
      </div>
    `);

    const openBtn = titleBanner.querySelector('#je-spt-open-report-banner');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.JEPessoasSptReport) window.JEPessoasSptReport.open();
      });
    }

    getAppHeaderContainer().appendChild(titleBanner);

    const selUnidades = document.getElementById('cbUnidades');
    const selContratos = document.getElementById('cbContratos');
    const updatePill = () => {
      const leftEl = document.getElementById('je-spt-ref-left');
      const rightEl = document.getElementById('je-spt-ref-right');
      if (leftEl) leftEl.textContent = getSelectedUnitCleanName();
      if (rightEl) rightEl.textContent = `Contrato: ${getSelectedContratoCleanName()}`;
    };
    if (selUnidades) selUnidades.addEventListener('change', updatePill);
    if (selContratos) selContratos.addEventListener('change', updatePill);
  }

  function modernizeMainGestaoScreen() {
    if (combo()) {
      combo().enhanceNativeUnitSelect(document.getElementById('cbUnidades'));
    }

    // Se o campo Data estiver vazio na tela inicial, preenche com o último dia do mês anterior (ou hoje)
    const inputData = document.getElementById('edtdataponto');
    if (inputData && !inputData.value) {
      const prev = calc().previousMonthPeriod();
      inputData.value = prev.toIso;
    }

    // Permite pesquisar na tela principal também quando Contrato = Todos (-1),
    // além de preencher os dados do período do trabalhador ao clicar no CPF
    const form = document.getElementById('formulario');
    const btnPesquisar = form ? form.querySelector('button[name="btnPesquisar"]') : null;
    if (btnPesquisar && !btnPesquisar.dataset.jeSptEnhanced) {
      btnPesquisar.dataset.jeSptEnhanced = 'true';
      btnPesquisar.removeAttribute('onclick');
      btnPesquisar.addEventListener('click', (e) => {
        const contratoField = form.elements['cbContratos'];
        const periodoField = form.elements['cbPeriodos'];
        const dataField = form.elements['edtdataponto'];
        form.elements['cmd'].value = 'cmdConsultar';
        form.target = '';

        const periodosList = (combo() && combo().getAvailablePeriodos && combo().getAvailablePeriodos(document))
          || (calc() && calc().parsePeriodosFromDoc && calc().parsePeriodosFromDoc(document))
          || [];

        if (contratoField && contratoField.value !== '-1' && periodoField && periodoField.value !== '-1') {
          const idx = parseInt(periodoField.value, 10);
          if (!isNaN(idx) && Array.isArray(periodosList) && periodosList[idx]) {
            const p = periodosList[idx];
            form.elements['periodoCodigo'].value = p[0];
            form.elements['periodoDescricao'].value = p[1];
            form.elements['periodoDtInicio'].value = p[2];
            form.elements['periodoDtFinal'].value = p[3];
          }
        } else {
          if (dataField && !dataField.value) {
            dataField.value = calc().previousMonthPeriod().toIso;
          }
          form.elements['periodoCodigo'].value = '';
          form.elements['periodoDescricao'].value = '';
          form.elements['periodoDtInicio'].value = '';
          form.elements['periodoDtFinal'].value = '';
        }
      });
    }

    // Garante que clicar no CPF de um prestador na tabela principal funcione mesmo quando Contrato = Todos (-1)
    const links = document.querySelectorAll('#maintable a[data-codigo]');
    if (links.length > 0) {
      const cardTitle = document.querySelector('.card:not(.filter-card) .card-title');
      if (cardTitle && !cardTitle.querySelector('.je-spt-count-pill')) {
        const pill = document.createElement('span');
        pill.className = 'je-spt-count-pill';
        pill.textContent = `${links.length} prestador(es)`;
        cardTitle.appendChild(pill);
      }

      links.forEach((a) => {
        if (a.dataset.jeSptLinkBound === 'true') return;
        a.dataset.jeSptLinkBound = 'true';
        a.removeAttribute('onclick');
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (!form) return;
          const contrato = a.getAttribute('data-contrato') || '';
          const cdFunc = a.getAttribute('data-codigo') || '';
          const matFunc = a.getAttribute('data-matricula') || '';
          const cpf = a.getAttribute('data-cpf') || '';
          const codTse = a.getAttribute('data-cod-tse') || cpf;
          const numContrato = a.getAttribute('data-num-contrato') || '';
          const nome = a.getAttribute('data-nome-escaped') || '';

          form.elements['cmd'].value = 'cmdVerPeriodoContrato';
          form.elements['codContrato'].value = contrato;
          form.elements['cdFunc'].value = cdFunc;
          form.elements['matFunc'].value = matFunc;
          form.elements['codTSE'].value = codTse;
          form.elements['cpf'].value = cpf;
          form.elements['numContrato'].value = numContrato;
          form.elements['nome'].value = nome;

          const periodosList = (combo() && combo().getAvailablePeriodos && combo().getAvailablePeriodos(document))
            || (calc() && calc().parsePeriodosFromDoc && calc().parsePeriodosFromDoc(document))
            || [];
          const pIdx = parseInt(form.elements['cbPeriodos']?.value || '-1', 10);
          if (!isNaN(pIdx) && pIdx !== -1 && Array.isArray(periodosList) && periodosList[pIdx]) {
            const p = periodosList[pIdx];
            form.elements['periodoCodigo'].value = p[0];
            form.elements['periodoDescricao'].value = p[1];
            form.elements['periodoDtInicio'].value = p[2];
            form.elements['periodoDtFinal'].value = p[3];
          } else if (Array.isArray(periodosList) && periodosList.length > 0) {
            const dataVal = form.elements['edtdataponto']?.value || '';
            const ym = /^\d{4}-\d{2}/.test(dataVal) ? `${dataVal.slice(5, 7)}/${dataVal.slice(0, 4)}` : '';
            const found = periodosList.find((p) => Array.isArray(p) && String(p[0]) === String(contrato) && (!ym || String(p[1]) === ym))
              || periodosList.find((p) => Array.isArray(p) && String(p[0]) === String(contrato));
            if (found) {
              form.elements['periodoCodigo'].value = found[0];
              form.elements['periodoDescricao'].value = found[1];
              form.elements['periodoDtInicio'].value = found[2];
              form.elements['periodoDtFinal'].value = found[3];
            }
          }
          form.submit();
        });
      });
    }
  }

  function modernizeWorkerSheetScreen() {
    const c = calc();
    if (!c) return;
    const parsed = c.parseWorkerSheetDoc(document);
    if (!parsed.days.length) return;
    const summary = c.summarizeMonthClt(parsed.days, {
      monthLabel: parsed.meta.periodo,
      presumeHomeOffice: false
    });
    const fmt = (m, s = false) => c.formatMin(m, s);

    // Injeta os 5 KPIs CLT no topo da tela individual do prestador
    let dashboard = document.querySelector('.je-kpi-dashboard');
    if (dashboard) dashboard.remove();
    dashboard = document.createElement('div');
    dashboard.className = 'je-kpi-dashboard je-spt-kpi-dashboard';

    const isPositive = (summary.saldoBhMesMin || 0) >= 0;
    const saldoBhColor = (summary.saldoBhMesMin || 0) > 0
      ? 'var(--je-success-text)'
      : ((summary.saldoBhMesMin || 0) < 0 ? 'var(--je-danger-text)' : '#475569');

    setSafeHTML(dashboard, `
      <div class="je-kpi-card je-kpi-highlight">
        <div class="je-kpi-header">
          <span class="je-kpi-label">Trabalhado Líquido (CLT)</span>
          <span class="je-kpi-icon" style="background: rgba(0, 119, 255, 0.12); color: var(--je-primary-light);">⏱️</span>
        </div>
        <div class="je-kpi-value">${fmt(summary.cltWorkedMin)}</div>
        <div class="je-kpi-sub">
          <span>H. Normais: <strong>${fmt(summary.horasNormaisMin || 0)}</strong> · Total SPT: <strong>${fmt(summary.sptTotalMin)}</strong></span>
        </div>
      </div>

      <div class="je-kpi-card">
        <div class="je-kpi-header">
          <span class="je-kpi-label">HE / Créd. BH 50%</span>
          <span class="je-kpi-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--je-success-text);">📈</span>
        </div>
        <div class="je-kpi-value" style="color: var(--je-success-text);">+${fmt(summary.he50BrutoMin || 0)}</div>
        <div class="je-kpi-sub">
          <span>${summary.workedWeekdays || 0}d pres.${summary.homeOfficeDays ? ` + ${summary.homeOfficeDays}d HO` : ''}${summary.dsrCompensatedDays ? ` · ${summary.dsrCompensatedDays}d DSR` : ''} (tol. ±10m)</span>
        </div>
      </div>

      <div class="je-kpi-card">
        <div class="je-kpi-header">
          <span class="je-kpi-label">Débito BH (Dias Úteis)</span>
          <span class="je-kpi-icon" style="background: rgba(250, 204, 21, 0.14); color: var(--je-warning-text);">⚖️</span>
        </div>
        <div class="je-kpi-value" style="color: ${(summary.debitoBhBrutoMin || 0) > 0 ? 'var(--je-danger-text)' : '#475569'};">-${fmt(summary.debitoBhBrutoMin || 0)}</div>
        <div class="je-kpi-sub">
          <span>Compensado no BH: <strong>${fmt(summary.compensadoBhMin || 0)}</strong></span>
        </div>
      </div>

      <div class="je-kpi-card">
        <div class="je-kpi-header">
          <span class="je-kpi-label">Saldo BH (50% − Déb.)</span>
          <span class="je-kpi-icon" style="background: ${isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(236, 72, 153, 0.12)'}; color: ${saldoBhColor};">${isPositive ? '✅' : '⚠️'}</span>
        </div>
        <div class="je-kpi-value" style="color: ${saldoBhColor};">${fmt(summary.saldoBhMesMin || 0, true)}</div>
        <div class="je-kpi-sub">
          <span>Variação líquida do BH em dias úteis</span>
        </div>
      </div>

      <div class="je-kpi-card">
        <div class="je-kpi-header">
          <span class="je-kpi-label">HE / Créd. 100% (FDS)</span>
          <span class="je-kpi-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--je-success-text);">🌟</span>
        </div>
        <div class="je-kpi-value" style="color: var(--je-success-text);">+${fmt(summary.he100BrutoMin || 0)}</div>
        <div class="je-kpi-sub">
          <span>${summary.workedWeekendDays || 0}d Sáb/Dom/Fer (jornada 00:00)</span>
        </div>
      </div>
    `);

    getAppHeaderContainer().appendChild(dashboard);

    // Enriquece a tabela diária (#maintable) com coluna de Saldo Dia (CLT 8h) e selos CLT
    const table = document.getElementById('maintable');
    if (table && !table.dataset.jeSptWorkerEnhanced) {
      table.dataset.jeSptWorkerEnhanced = 'true';
      const headRow = table.querySelector('thead tr');
      if (headRow && headRow.cells.length >= 10) {
        const thClt = document.createElement('th');
        thClt.scope = 'col';
        thClt.className = 'text-center';
        thClt.title = 'Saldo diário CLT (Jornada de 8h00 e intervalo mínimo de 1h de almoço)';
        thClt.textContent = 'Saldo CLT (8h)';
        headRow.insertBefore(thClt, headRow.cells[9]);
      }

      const trs = table.querySelectorAll('tbody tr');
      trs.forEach((tr, idx) => {
        const day = summary.days[idx];
        if (!day || tr.cells.length < 10) return;
        if (day.isWeekend) tr.classList.add('je-spt-row-weekend');
        if (day.isWorkedDay) tr.classList.add('je-spt-row-worked');

        const tdClt = document.createElement('td');
        tdClt.className = 'text-center fw-semibold';
        if (day.isWorkedDay) {
          const deltaBadge = document.createElement('span');
          deltaBadge.className = day.deltaMin > 0
            ? 'je-spt-delta-pill je-spt-pos'
            : (day.deltaMin < 0 ? 'je-spt-delta-pill je-spt-neg' : 'je-spt-delta-pill');
          deltaBadge.textContent = fmt(day.deltaMin, true);
          tdClt.appendChild(deltaBadge);
        } else {
          tdClt.textContent = '·';
        }
        tr.insertBefore(tdClt, tr.cells[9]);

        // Adiciona selos de conformidade CLT na célula de Justificativa (célula 7)
        const tdJust = tr.cells[7];
        if (tdJust && day.alerts && day.alerts.length) {
          const badgeWrap = document.createElement('div');
          badgeWrap.className = 'je-spt-cell-badges';
          day.alerts.forEach((a) => {
            const span = document.createElement('span');
            const tone = a.code === 'acima-2h-extra'
              ? 'danger'
              : (a.code === 'intervalo-curto' || a.code === 'batida-impar' ? 'warn' : 'info');
            span.className = `je-occ-perda je-occ-perda-${tone}`;
            span.title = a.tip;
            span.textContent = a.label;
            badgeWrap.appendChild(span);
          });
          tdJust.appendChild(badgeWrap);
        }
      });
    }
  }

  function mountLoginPage() {
    document.body.classList.add('je-spt-page');

    if (window.JEPessoasModernizer && window.JEPessoasModernizer.createPersistentToggle) {
      window.JEPessoasModernizer.createPersistentToggle();
    }
    const loginToggleEnabled = document.body.classList.contains('je-xt-enabled');
    const loginToggleLabel = document.querySelector('#je-persistent-toggle-bar .je-toggle-label');
    if (loginToggleLabel) {
      setSafeHTML(
        loginToggleLabel,
        loginToggleEnabled
          ? '✨ <strong>TSE XT</strong> Ativo'
          : '🏛️ <strong>TSE XT</strong> Desligado'
      );
    }

    if (!loginToggleEnabled) return;

    document.documentElement.classList.add('je-login-page', 'je-spt-login-page');
    document.body.classList.add('je-login-page', 'je-spt-login-page');

    const card = document.querySelector('.card');
    if (card && !document.getElementById('je-spt-login-brand')) {
      const parentFlex = card.parentElement;
      if (parentFlex) {
        parentFlex.classList.add('je-spt-login-wrapper');
      }

      const versaoExtensao = window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '';
      const iconUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('icons/base.png') : '';

      const brandBlock = document.createElement('div');
      brandBlock.id = 'je-spt-login-brand';
      brandBlock.className = 'je-spt-login-brand';
      setSafeHTML(brandBlock, `
        <div class="je-spt-login-logo-row">
          ${iconUrl ? `<img src="${escapeHTML(iconUrl)}" alt="" width="42" height="42" class="je-spt-login-logo" />` : ''}
          <div class="je-spt-login-brand-text">
            <span class="je-spt-login-title">SPT <strong>Frequência</strong></span>
            <span class="je-spt-login-subtitle">Tribunal Superior Eleitoral · Gestão de Prestadores</span>
          </div>
        </div>
        <div class="je-spt-login-badges">
          <span class="je-brand-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            TSE XT
          </span>
          ${versaoExtensao ? `<span class="je-brand-version">v${escapeHTML(versaoExtensao)}</span>` : ''}
        </div>
      `);
      card.parentNode.insertBefore(brandBlock, card);
    }

    // Boot Splash na transição real de login (beforeunload), igual ao Meu Espaço
    let pendingSplashMsg = null;
    const triggerLoginSplash = (msg) => {
      pendingSplashMsg = msg || 'Autenticando suas credenciais no SPT…';
    };

    if (!window.__jeSptLoginSplashBound) {
      window.__jeSptLoginSplashBound = true;
      window.addEventListener('beforeunload', () => {
        if (!pendingSplashMsg) return;
        const msg = pendingSplashMsg;
        document.documentElement.classList.add('je-logging-in', 'je-xt-boot');
        document.body.classList.add('je-logging-in');
        document.documentElement.style.backgroundColor = '#0a2540';
        if (window.JEPessoasBoot && window.JEPessoasBoot.showSplash) {
          window.JEPessoasBoot.showSplash(msg);
        }
      });
    }

    const loginForm = document.querySelector('form[action*="process-login"], form');
    if (loginForm && !loginForm.dataset.jeSptLoginBound) {
      loginForm.dataset.jeSptLoginBound = 'true';
      loginForm.addEventListener('submit', () => triggerLoginSplash('Autenticando suas credenciais no SPT…'), true);
      const submitBtn = loginForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => triggerLoginSplash('Autenticando suas credenciais no SPT…'), true);
      }
    }
  }

  function mount(profileId) {
    if (!isSptPage()) return;
    document.body.classList.add('je-spt-page');
    if (profileId === 'login') {
      mountLoginPage();
      return;
    }
    modernizeSptTopbar();
    injectSptTitleBanner(profileId);

    if (profileId === 'sptAcompanhamento') {
      modernizeWorkerSheetScreen();
    } else {
      modernizeMainGestaoScreen();
    }
  }

  return {
    isSptPage,
    mountLoginPage,
    mount
  };
})();
