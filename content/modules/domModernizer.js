/**
 * TSE XT - Modernizador de DOM e Injeção de Componentes Glassmorphism (v0.2.0)
 */

window.JEPessoasModernizer = (function () {
  'use strict';

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

  function applyThemeState(enabled, isExplicitUserToggle = false) {
    if (isExplicitUserToggle) {
      document.body.classList.add('je-theme-transitioning');
      setTimeout(() => {
        document.body.classList.remove('je-theme-transitioning');
      }, 450);
    } else {
      document.body.classList.remove('je-theme-transitioning');
    }

    if (enabled) {
      document.body.classList.add('je-xt-enabled');
      document.body.classList.remove('je-xt-disabled');
      document.documentElement.classList.add('je-xt-enabled');
      document.documentElement.classList.remove('je-xt-disabled');
      try { localStorage.setItem('je_xt_theme_enabled', 'true'); } catch (e) {}
    } else {
      document.body.classList.add('je-xt-disabled');
      document.body.classList.remove('je-xt-enabled');
      document.documentElement.classList.add('je-xt-disabled');
      document.documentElement.classList.remove('je-xt-enabled');
      try { localStorage.setItem('je_xt_theme_enabled', 'false'); } catch (e) {}
    }

    const toggleLabels = document.querySelectorAll('.je-toggle-label');
    toggleLabels.forEach((label) => {
      label.innerHTML = enabled ? '✨ <strong>TSE XT</strong> Ativo' : '🏛️ <strong>TSE XT</strong> Desligado';
    });
  }

  function modernizeHeader() {
    if (document.querySelector('.je-topbar')) return;

    // Coleta dados do usuário do DOM antigo (incluindo o IP)
    const servidorEl = document.querySelector('.servidor');
    const matriculaEl = document.querySelector('.matricula');
    const lotacaoEl = document.querySelector('.lotacao');
    const ipEl = document.querySelector('.ipServidorLogado');

    const servidorNome = servidorEl ? servidorEl.innerText.replace(/Nome:\s*/i, '').trim() : 'Servidor';
    const matricula = matriculaEl ? matriculaEl.innerText.replace(/Matrícula:\s*/i, '').trim() : '';
    const lotacao = lotacaoEl ? lotacaoEl.innerText.replace(/Lotação:\s*/i, '').trim() : '';
    const ip = ipEl ? ipEl.innerText.replace(/IP:\s*/i, '').trim() : '';
    const versaoExtensao = window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '0.3.5';

    // 1. Cria a Topbar Slim Glass com o Botão de Menu de Serviços Integrado
    const topbar = document.createElement('header');
    topbar.className = 'je-topbar';

    topbar.innerHTML = `
      <div class="je-brand-wrapper">
        <!-- Botão de Menu de Serviços / Drawer -->
        <button type="button" class="je-menu-trigger-btn" id="je-nav-menu-btn" title="Abrir Menu de Serviços (Alt + M)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Menu</span>
        </button>

        <div class="je-brand" id="je-header-brand" style="cursor:pointer;" title="Meu Espaço - Página Inicial">
          <!-- Logo Oficial do Meu Espaço -->
          <div class="je-logo-container">
            <img src="/portalservidor2/_comum/img/espaco_topo.png" alt="Meu Espaço" class="je-official-logo" />
          </div>
          
          <div class="je-brand-divider"></div>

          <div class="je-brand-badge" title="Extensão TSE XT ativa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            TSE XT
          </div>
          <span class="je-brand-version" id="je-version-badge" title="Clique para ver o histórico e novidades da versão" style="cursor: pointer; transition: all 0.2s ease;">
            v${versaoExtensao}
          </span>
        </div>
      </div>

      <div class="je-search-container">
        <svg class="je-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="je-search-input" placeholder="Pesquisar páginas, atalhos..." readonly />
        <span class="je-search-shortcut">Ctrl+K</span>
      </div>

      <div class="je-topbar-actions">
        <div class="je-user-profile">
          <div class="je-user-chip" title="Servidor Logado, Lotação e IP">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <strong>${escapeHTML(servidorNome)}</strong>
            ${matricula ? `<span>(${escapeHTML(matricula)})</span>` : ''}
            ${lotacao ? `<span style="color:#64748b">• ${escapeHTML(lotacao)}</span>` : ''}
            ${ip ? `<span class="je-ip-tag" title="IP de Origem: ${escapeHTML(ip)}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>${escapeHTML(ip)}</span>` : ''}
          </div>
          <a href="https://meuespaco.tse.jus.br/portalservidor2/Logout" class="je-logout-btn" title="Sair da Sessão">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
          </a>
        </div>

        <!-- Interruptor Integrado perfeitamente na barra de menu -->
        <div class="je-toggle-container je-header-toggle" id="je-theme-toggle-header" title="Clique para alternar entre o visual moderno XT e o layout clássico">
          <span class="je-toggle-label">✨ <strong>TSE XT</strong> Ativo</span>
          <div class="je-toggle-switch"></div>
        </div>
      </div>
    `;

    // Conecta clique no Logo/Brand
    const brandLogo = topbar.querySelector('#je-header-brand');
    if (brandLogo) {
      brandLogo.addEventListener('click', () => {
        window.location.href = 'https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action';
      });
    }

    // 2. Cria o Toggle Switch Permanente Flutuante (apenas para exibição no modo OFF legado)
    createPersistentToggle();

    // Conecta o Toggle Integrado da Topbar
    const headerToggle = topbar.querySelector('#je-theme-toggle-header');
    if (headerToggle) {
      headerToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyEnabled = document.body.classList.contains('je-xt-enabled');
        const nextState = !currentlyEnabled;
        
        applyThemeState(nextState, true);
        chrome.storage?.local?.set({ xtThemeEnabled: nextState });
      });
    }

    // 3. Conecta o Botão de Menu ao Drawer
    const menuBtn = topbar.querySelector('#je-nav-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.JEPessoasNavDrawer) window.JEPessoasNavDrawer.toggle();
      });
    }

    // Conecta clique no badge de versão para abrir changelog
    const versionBadge = topbar.querySelector('#je-version-badge');
    if (versionBadge) {
      versionBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.JEPessoasVersion) window.JEPessoasVersion.openChangelogModal();
      });
    }

    // Conecta clique no input de pesquisa para abrir o Command Modal
    const searchInput = topbar.querySelector('.je-search-input');
    if (searchInput) {
      searchInput.addEventListener('click', () => {
        if (window.JEPessoasSearch) window.JEPessoasSearch.open();
      });
    }

    const appHeader = getAppHeaderContainer();
    appHeader.appendChild(topbar);
  }

  function getAppHeaderContainer() {
    let headerWrapper = document.getElementById('je-app-header');
    if (!headerWrapper) {
      headerWrapper = document.createElement('div');
      headerWrapper.id = 'je-app-header';
      headerWrapper.className = 'je-app-header';
      const container = document.getElementById('container') || document.body;
      container.insertBefore(headerWrapper, container.firstChild);
    }
    return headerWrapper;
  }

  function createPersistentToggle() {
    if (document.getElementById('je-persistent-toggle-bar')) return;

    const toggleBar = document.createElement('aside');
    toggleBar.id = 'je-persistent-toggle-bar';
    toggleBar.className = 'je-persistent-toggle-bar';
    toggleBar.setAttribute('aria-label', 'Controle Visual TSE XT');

    toggleBar.innerHTML = `
      <div class="je-toggle-container je-floating-toggle" id="je-theme-toggle-floating" title="Clique para alternar para o visual moderno TSE XT">
        <span class="je-toggle-label">🏛️ <strong>TSE XT</strong> Desligado</span>
        <div class="je-toggle-switch"></div>
      </div>
    `;

    document.body.appendChild(toggleBar);

    const toggleWrapper = toggleBar.querySelector('#je-theme-toggle-floating');
    if (toggleWrapper) {
      toggleWrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyEnabled = document.body.classList.contains('je-xt-enabled');
        const nextState = !currentlyEnabled;
        
        applyThemeState(nextState, true);
        chrome.storage?.local?.set({ xtThemeEnabled: nextState });
      });
    }
  }

  function injectPageTitleHeader() {
    if (document.querySelector('.je-page-title-banner')) return;

    const isEspelhoDia = window.location.href.includes('EspelhoPontoDiaAction') || !!document.getElementById('formEspelhoPontoDia');

    const mesSelect = document.getElementById('mesSelecionado');
    const anoSelect = document.getElementById('anoSelecionado');
    const mesNome = mesSelect && mesSelect.selectedOptions && mesSelect.selectedOptions[0] ? mesSelect.selectedOptions[0].text : 'Mês Atual';
    const anoNome = anoSelect ? anoSelect.value : new Date().getFullYear();

    const titleBanner = document.createElement('div');
    titleBanner.className = 'je-page-title-banner';

    const breadcrumbActiveText = isEspelhoDia ? 'Alteração de Ponto' : 'Consulta Mensal';
    const pageTitleText = isEspelhoDia ? 'Alteração de Ponto' : 'Espelho de Ponto';

    titleBanner.innerHTML = `
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
              <span class="je-breadcrumb-item">Meu Espaço</span>
              <span class="je-breadcrumb-separator">/</span>
              <span class="je-breadcrumb-item">Frequência</span>
              <span class="je-breadcrumb-separator">/</span>
              <span class="je-breadcrumb-item active">${escapeHTML(breadcrumbActiveText)}</span>
            </nav>
            <h1 class="je-page-title">${escapeHTML(pageTitleText)}</h1>
          </div>
        </div>
        <div class="je-reference-pill" title="Período de referência consultado">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Referência: <strong class="je-ref-value">${escapeHTML(mesNome)}</strong><span class="je-ref-sep"> / </span><strong class="je-ref-value">${escapeHTML(String(anoNome))}</strong></span>
        </div>
      </div>
    `;

    const appHeader = getAppHeaderContainer();
    appHeader.appendChild(titleBanner);
  }

  function injectKPICards(kpiData) {
    if (!kpiData) return;
    if (document.querySelector('.je-kpi-dashboard')) {
      document.querySelector('.je-kpi-dashboard').remove();
    }

    const dashboard = document.createElement('div');
    dashboard.className = 'je-kpi-dashboard';

    const isPositiveBank = !kpiData.accumulatedBankBalance.startsWith('-');
    const isZeroMonthPositive = kpiData.zeroMonthStatus === 'positive';
    const isZeroMonthNegative = kpiData.zeroMonthStatus === 'negative';

    dashboard.innerHTML = `
      <!-- Card 1: Previsão Saída p/ Completar Expediente -->
      <div class="je-kpi-card" title="Horário estimado de saída para completar as ${kpiData.targetDailyHours}h de hoje">
        <div class="je-kpi-header">
          <span class="je-kpi-title">Saída Expediente</span>
          <div class="je-kpi-icon-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 15 15"></polyline>
            </svg>
          </div>
        </div>
        <div class="je-kpi-value" style="color: #0077ff;">${kpiData.estimatedExit}</div>
        <div class="je-kpi-subtext">
          ${!kpiData.hasTodayRow
            ? `<span style="opacity: 0.45;">—</span>`
            : (kpiData.remainingMinutesToday > 0
              ? `<span>Faltam <strong>${kpiData.remainingTimeFormatted}</strong> hoje</span>`
              : `<span>Jornada de hoje <strong>cumprida</strong></span>`)}
        </div>
      </div>

      <!-- Card 2: Saldo Acumulado do Banco de Horas -->
      <div class="je-kpi-card" title="${kpiData.hasAuthorizedHEInMonth && !kpiData.hasHybridWorkInMonth ? 'Mês com hora extra autorizada: o consumo do banco é vedado (Portaria 380/2026 art. 13), mas a parcela homologada continua sendo creditada.' : 'Saldo homologado no banco de horas institucional'}">
        <div class="je-kpi-header">
          <span class="je-kpi-title">Banco de Horas</span>
          <div class="je-kpi-icon-wrapper" style="background: ${isPositiveBank ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isPositiveBank ? '#059669' : '#dc2626'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12a10.06 10.06 0 0 0-20 0Z"></path>
              <path d="M12 12v8a2 2 0 0 0 4 0"></path>
              <path d="M12 2v1"></path>
            </svg>
          </div>
        </div>
        <div class="je-kpi-value" style="color: ${isPositiveBank ? '#059669' : '#dc2626'};">
          ${kpiData.accumulatedBankBalance}
        </div>
        <div class="je-kpi-subtext">
          ${kpiData.hasHybridWorkInMonth
            ? `<span class="je-badge-positive" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">Regime Híbrido</span><span>Sem acúmulo de BH</span>`
            : (kpiData.hasAuthorizedHEInMonth
              ? `<span class="je-badge-positive" style="background: rgba(139, 92, 246, 0.14); color: #7c3aed;">HE autorizada</span><span title="Portaria 380/2026 art. 13: neste mês o saldo do banco não pode ser consumido; a parcela homologada continua sendo creditada.">Consumo vedado${kpiData.homologPreviewMinutes > 0 ? ` · +${kpiData.homologPreviewFormatted} homolog.` : ''}</span>`
              : `<span class="${isPositiveBank ? 'je-badge-positive' : 'je-badge-negative'}">${isPositiveBank ? 'Positivo' : 'Débito'}</span><span>Homologado</span>`)}
        </div>
      </div>

      <!-- Card 3: Meta / Progresso do Mês (Fração Ordinária Feito/Esperado) -->
      <div class="je-kpi-card" title="Progresso da meta de horas ordinárias trabalhadas no mês (Meta: ${kpiData.totalExpectedTimeFormatted})">
        <div class="je-kpi-header">
          <span class="je-kpi-title">${kpiData.hasHybridWorkInMonth ? 'Meta Presencial' : (kpiData.isTargetExceeded ? 'Meta Superada' : 'Meta do Mês')} (${kpiData.progressPercent}%)</span>
          <div class="je-kpi-icon-wrapper" style="background: ${kpiData.isTargetExceeded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 102, 204, 0.1)'}; color: ${kpiData.isTargetExceeded ? '#059669' : 'var(--je-primary)'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
        </div>
        <div class="je-kpi-value" style="display: flex; align-items: baseline; justify-content: space-between; gap: 4px;">
          <span>${kpiData.totalWorkedTimeFormatted} <span style="font-size:11px; font-weight:600; color:#64748b;">/ ${kpiData.totalExpectedTimeFormatted}</span></span>
          ${kpiData.isTargetExceeded 
            ? `<span style="font-size: 10.5px; font-weight: 800; color: #059669; background: rgba(16, 185, 129, 0.12); padding: 1px 6px; border-radius: 999px;">+${kpiData.exceededTimeFormatted}</span>` 
            : ''}
        </div>
        
        <!-- Barra de Progresso com Indicador de Meta e Extrapolação -->
        <div style="position: relative; width: 100%; height: 6px; background: rgba(0, 102, 204, 0.08); border-radius: 999px; overflow: hidden; margin: 4px 0 5px 0;">
          <div style="width: ${kpiData.barFillPercent}%; height: 100%; background: ${kpiData.isTargetExceeded ? 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)' : 'linear-gradient(90deg, #0077ff 0%, #00d2ff 100%)'}; border-radius: 999px; transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);"></div>
        </div>

        <div class="je-kpi-subtext">
          ${kpiData.hasHybridWorkInMonth
            ? `<span>${kpiData.totalExpectedMinutesMonth === 0 ? 'Sem exigência presencial' : `Faltam <strong>${kpiData.remainingHoursFormatted}</strong> presencial`}</span>`
            : (kpiData.isTargetExceeded 
              ? `<span style="color: #059669; font-weight: 700;">🎉 Meta extrapolada em +${kpiData.exceededTimeFormatted}</span>`
              : `<span>Faltam <strong>${kpiData.remainingHoursFormatted}</strong> • ${kpiData.remainingWorkingDaysMonth} dias restantes</span>`)}
        </div>
      </div>

      <!-- Card 4: Previsão Saída p/ Zerar Saldo do Mês -->
      <div class="je-kpi-card" title="Horário de saída para zerar o saldo acumulado até hoje (para mais ou para menos)">
        <div class="je-kpi-header">
          <span class="je-kpi-title">Saída p/ Zerar Mês</span>
          <div class="je-kpi-icon-wrapper" style="background: ${isZeroMonthPositive ? 'rgba(14, 165, 233, 0.1)' : (isZeroMonthNegative ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)')}; color: ${isZeroMonthPositive ? '#0284c7' : (isZeroMonthNegative ? '#d97706' : '#64748b')};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="je-kpi-value" style="color: ${isZeroMonthPositive ? '#0284c7' : (isZeroMonthNegative ? '#d97706' : '#1e293b')};">
          ${kpiData.estimatedExitToZeroMonth}
        </div>
        <div class="je-kpi-subtext">
          <span>${kpiData.zeroMonthSubtext}</span>
        </div>
      </div>

      <!-- Card 5: Horas Extras — pecúnia a pagar por tipo de dia + saldo do mês -->
      <div class="je-kpi-card" title="Horas de pecúnia (a pagar) acumuladas no mês, por tipo de dia. Rodapé: saldo excedente que foi para o banco de horas.">
        <div class="je-kpi-header">
          <span class="je-kpi-title">Horas Extras</span>
          <div class="je-kpi-icon-wrapper" style="background: rgba(139, 92, 246, 0.1); color: #7c3aed;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        </div>
        <div class="je-kpi-extra-lines" style="display: flex; flex-direction: column; gap: 3px; margin: 2px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
            <span style="color: #64748b; font-weight: 600;">Pecúnia úteis / Sáb:</span>
            <strong style="color: #0a2540; font-size: 12.5px;">${kpiData.pecuniaWeekdaySat}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
            <span style="color: #64748b; font-weight: 600;">Pecúnia Dom / Feriados:</span>
            <strong style="color: #7c3aed; font-size: 12.5px;">${kpiData.pecuniaSundayHoliday}</strong>
          </div>
        </div>
        <div class="je-kpi-subtext">
          <span>Saldo Mês: <strong>${kpiData.totalExceedTimeFormatted}</strong></span>
        </div>
      </div>
    `;

    const appHeader = getAppHeaderContainer();
    appHeader.appendChild(dashboard);
  }

  function parseMinutes(str) {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.replace(/[\u00a0\s]/g, '').replace(/[\u2212\u2013\u2014\u2010\u2015]/g, '-').trim();
    if (!clean || clean === '--:--' || clean === '-') return 0;
    const isNeg = clean.startsWith('-') || clean.includes('-');
    const digitsOnly = clean.replace(/[^0-9:]/g, '');
    const parts = digitsOnly.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const total = h * 60 + m;
    return isNeg ? -total : total;
  }

  function formatSigned(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return '00:00';
    if (minutes === 0) return '00:00';
    const isNeg = minutes < 0;
    const absM = Math.abs(Math.round(minutes));
    const h = Math.floor(absM / 60);
    const m = absM % 60;
    const strH = String(h).padStart(2, '0');
    const strM = String(m).padStart(2, '0');
    return (isNeg ? '-' : '+') + `${strH}:${strM}`;
  }

  function modernizeTable(targetHours = 7) {
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (table) {
      modernizeMonthlyTable(table, targetHours);
    }

    // Moderniza tabelas adicionais no contêiner principal (como em Alteração de Ponto)
    const otherTables = document.querySelectorAll('table.grid, table[id*="tblEspelhoPontoDia"], form[name*="EspelhoPonto"] table, #container table:not(#tblEspelhoPontoMesCorrente):not(.je-topbar)');
    otherTables.forEach((tbl) => {
      if (tbl.classList.contains('je-modernized-table')) return;
      tbl.classList.add('je-modernized-table');
      modernizeOvertimeClockIcons(tbl);
    });
  }

  function modernizeMonthlyTable(table, targetHours = 7) {

    // Limpa injeções anteriores para garantir idempotência
    table.querySelectorAll('.je-col-daily-exceed, .je-col-accumulated-balance, .je-totais-trailing, .je-totais-pecunia').forEach(el => el.remove());
    table.querySelectorAll('td.h15 .je-occurrence-badge').forEach(el => el.remove());

    // Se o TSE XT estiver desabilitado, interrompe a injeção de colunas customizadas
    const isXTEnabled = document.body.classList.contains('je-xt-enabled') || localStorage.getItem('je_xt_theme_enabled') !== 'false';
    if (!isXTEnabled) return;

    // Normaliza espaços/quebras de linha: os cabeçalhos nativos vêm com <br>
    // (ex.: "HORAS<br>AJUST." => innerText "HORAS\nAJUST."), o que quebrava os
    // matches por substring com espaço.
    const normalizeWs = (s) => (s || '').toUpperCase().replace(/\s+/g, ' ').trim();

    const tableText = normalizeWs(table.innerText);
    const hasHybridWorkInMonth = tableText.includes('TRABALHO HIBRIDO') || tableText.includes('TRABALHO HÍBRIDO') || tableText.includes('TELETRABALHO');

    // Identifica se a tabela possui a coluna "HORAS AJUST." (mês fechado/homologado)
    const headerTexts = Array.from(table.querySelectorAll('th')).map(th => normalizeWs(th.innerText));
    const isClosedMonthTable = headerTexts.some(t => t.includes('HORAS AJUST') || t.includes('HORA AJUST'));

    // 1. Injeta Cabeçalhos das Novas Colunas (APENAS se NÃO houver trabalho híbrido no mês)
    if (!hasHybridWorkInMonth) {
      const headerRows = table.querySelectorAll('tr');
      headerRows.forEach((tr) => {
        const pecuniaTh = tr.querySelector('th.h12') || tr.querySelector('th.h11') || Array.from(tr.querySelectorAll('th')).find(th => normalizeWs(th.innerText).includes('PECÚNIA') || normalizeWs(th.innerText).includes('PECUNIA'));
        const exceedTh = tr.querySelector('th.h10') || Array.from(tr.querySelectorAll('th')).find(th => {
          const text = normalizeWs(th.innerText);
          return text.includes('HORAS AJUST') || text.includes('HORAS EXCED') || text.includes('AJUST') || text.includes('EXCED');
        });
        const anchorTh = pecuniaTh || exceedTh;

        if (anchorTh) {
          // Injeta a coluna HORAS EXCED. APENAS se o mês for FECHADO (quando a coluna nativa se chama HORAS AJUST.)
          if (isClosedMonthTable && !tr.querySelector('th.je-col-daily-exceed')) {
            const deltaTh = document.createElement('th');
            deltaTh.className = 'je-col-daily-exceed';
            deltaTh.title = 'Horas Excedentes Líquidas do Dia (Calculadas pelo TSE XT: Saldo Diário Bruto com multiplicadores de fim de semana - Pecúnia)';
            deltaTh.innerHTML = 'HORAS EXCED.';
            anchorTh.parentNode.insertBefore(deltaTh, anchorTh.nextSibling);
          }

          const insertedDeltaTh = tr.querySelector('th.je-col-daily-exceed') || anchorTh;
          if (!tr.querySelector('th.je-col-accumulated-balance')) {
            const accumTh = document.createElement('th');
            accumTh.className = 'je-col-accumulated-balance';
            accumTh.title = 'Saldo Acumulado do Mês (Calculado pelo TSE XT: Saldo Anterior + Horas Exced. - Pecúnia)';
            accumTh.innerHTML = 'SALDO ACUM.';
            insertedDeltaTh.parentNode.insertBefore(accumTh, insertedDeltaTh.nextSibling);
          }
        }
      });
    }

    const rows = table.querySelectorAll('tr');
    const now = new Date();
    const todayFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let runningBalance = 0;

    rows.forEach((tr) => {
      // Ignora linhas de cabeçalho
      if (tr.querySelector('th')) return;

      const dateCell = tr.querySelector('td.h01');
      if (dateCell) {
        const dateText = dateCell.innerText.trim();
        if (!dateText.match(/^\d{2}\/\d{2}\/\d{4}$/)) return;

        const rawText = tr.innerText.toUpperCase();
        
        // Destaca hoje
        if (dateText === todayFormatted) {
          tr.classList.add('je-row-today');
        }

        // Sábado vs Domingo vs Feriado
        if (rawText.includes('SÁBADO') || rawText.includes('SABADO')) {
          tr.classList.add('je-row-saturday');
        } else if (rawText.includes('DOMINGO')) {
          tr.classList.add('je-row-sunday');
        } else if (rawText.includes('FERIADO') || rawText.includes('RECESSO')) {
          tr.classList.add('je-row-feriado');
        }

        // Leitura de batidas do dia
        const e1 = tr.querySelector('td.h02')?.innerText.trim() || '';
        const s1 = tr.querySelector('td.h03')?.innerText.trim() || '';
        const e2 = tr.querySelector('td.h04')?.innerText.trim() || '';
        const s2 = tr.querySelector('td.h05')?.innerText.trim() || '';
        const e3 = tr.querySelector('td.h06')?.innerText.trim() || '';
        const s3 = tr.querySelector('td.h07')?.innerText.trim() || '';
        const abono = tr.querySelector('td.h08')?.innerText.trim() || '';
        const totalDay = tr.querySelector('td.h09')?.innerText.trim() || '';
        const exceedDay = tr.querySelector('td.h10')?.innerText.trim() || '';
        const occCell = tr.querySelector('td.h16');
        const occText = occCell ? occCell.innerText.trim().toUpperCase() : '';

        // Verificação de Data Passada para Inconsistência de Batida
        const dateParts = dateText.split('/');
        let isPastOrToday = true;
        let isStrictlyPast = false;
        let dayOfWeek = null;
        if (dateParts.length === 3) {
          const dayNum = parseInt(dateParts[0], 10);
          const monthNum = parseInt(dateParts[1], 10);
          const yearNum = parseInt(dateParts[2], 10);
          const dObj = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59);
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const dObjStart = new Date(yearNum, monthNum - 1, dayNum);
          isPastOrToday = dObj <= now || dateText === todayFormatted;
          isStrictlyPast = dObjStart < startOfToday;
          dayOfWeek = dObj.getDay();
        }

        // Detecção de Batida Faltante / Inconsistência em Data Passada
        let missingPunchReason = '';
        if (isStrictlyPast) {
          if (e1 && !s1) {
            missingPunchReason = 'Falta Saída 1';
          } else if (!e1 && s1) {
            missingPunchReason = 'Falta Entrada 1';
          } else if (e2 && !s2) {
            missingPunchReason = 'Falta Saída 2';
          } else if (!e2 && s2) {
            missingPunchReason = 'Falta Entrada 2';
          } else if (e3 && !s3) {
            missingPunchReason = 'Falta Saída 3';
          } else if (!e3 && s3) {
            missingPunchReason = 'Falta Entrada 3';
          } else {
            const rawPunches = [e1, s1, e2, s2, e3, s3].filter(p => p && p !== '--:--' && p !== '-');
            if (rawPunches.length % 2 !== 0) {
              missingPunchReason = 'Batida Incompleta';
            }
          }

          if (!missingPunchReason && occText) {
            if (occText.includes('INCONSIST') || occText.includes('ÍMPAR') || occText.includes('IMPAR') || occText.includes('ESQUECIMENTO')) {
              missingPunchReason = 'Inconsistência de Ponto';
            }
          }
        }

        // Destaca ocorrências e linhas com ajuste de ponto pendente
        const hasAjustePontoText = occText.includes('AJUSTE SEU PONTO') || occText.includes('INCONSIST');
        if (missingPunchReason || hasAjustePontoText) {
          tr.classList.add('je-row-ajuste-pendente');
          if (missingPunchReason) {
            tr.setAttribute('title', `⚠️ Ajuste de Ponto Necessário: ${missingPunchReason}`);
          }
          if (occCell) {
            const existingLink = occCell.querySelector('a');
            if (existingLink) {
              existingLink.classList.add('je-occurrence-badge', 'je-occurrence-ajuste-pendente');
              const rawTitle = existingLink.getAttribute('title') || '';
              if (missingPunchReason && !rawTitle.includes(missingPunchReason)) {
                const fullTitle = rawTitle ? `${rawTitle} | Ajuste necessário: ${missingPunchReason}` : `Ajuste necessário: ${missingPunchReason}`;
                existingLink.setAttribute('title', fullTitle);
              }
              const linkText = existingLink.innerText.trim().replace(/^⚠️\s*/, '');
              const baseText = linkText || 'AJUSTE SEU PONTO';
              existingLink.innerHTML = escapeHTML(baseText);
            } else {
              const originalText = occCell.innerText.trim().replace(/^⚠️\s*/, '');
              const hasExistingText = originalText && originalText !== '-' && originalText !== '--:--';
              const labelText = hasExistingText ? originalText : 'AJUSTE SEU PONTO';
              const tooltip = missingPunchReason ? `Ajuste necessário: ${missingPunchReason}` : 'Ajuste de Ponto Necessário';
              occCell.innerHTML = `<span class="je-occurrence-badge je-occurrence-ajuste-pendente" title="${escapeHTML(tooltip)}">${escapeHTML(labelText)}</span>`;
            }
          }
        } else if (occCell && occText && occText !== '-' && occText !== '--:--') {
          const existingLink = occCell.querySelector('a');
          if (occText.includes('VIAGEM')) {
            if (existingLink) {
              existingLink.classList.add('je-occurrence-badge', 'je-occurrence-viagem');
            } else {
              occCell.innerHTML = `<span class="je-occurrence-badge je-occurrence-viagem">${escapeHTML(occCell.innerText)}</span>`;
            }
          } else if (occText.includes('FERIADO') || occText.includes('RECESSO')) {
            if (existingLink) {
              existingLink.classList.add('je-occurrence-badge', 'je-occurrence-feriado');
            } else {
              occCell.innerHTML = `<span class="je-occurrence-badge je-occurrence-feriado">${escapeHTML(occCell.innerText)}</span>`;
            }
          } else if (!occText.includes('SÁBADO') && !occText.includes('DOMINGO')) {
            if (existingLink) {
              existingLink.classList.add('je-occurrence-badge');
            } else {
              occCell.innerHTML = `<span class="je-occurrence-badge">${escapeHTML(occCell.innerText)}</span>`;
            }
          }
        }

        // Se NÃO estiver em regime híbrido, injeta as células do TSE XT
        if (!hasHybridWorkInMonth) {
          const pecuniaCell = tr.querySelector('td.h12') || tr.querySelector('td.h11');
          const pecunia = pecuniaCell ? pecuniaCell.innerText.trim() : '';

          const exceedMin = parseMinutes(exceedDay);
          const pecuniaMin = parseMinutes(pecunia);
          const totalMin = parseMinutes(totalDay);
          const abonoMin = parseMinutes(abono);

          // Jornada esperada do dia: 8h se houve intervalo de almoço (4 batidas), senão a meta padrão.
          const hasLunchInterval = !!(e1 && s1 && e2 && s2);
          const dayTargetMinutes = hasLunchInterval ? (8 * 60) : (targetHours * 60);

          // Detecção de dispensa da jornada ordinária (espelha a lógica do kpiExtractor).
          const occU = (occText + ' ' + rawText).toUpperCase();
          const isHolidayOrRecess = occU.includes('FERIADO') || occU.includes('RECESSO') || occU.includes('FACULTATIVO');
          const isLicense = occU.includes('LICENÇA') || occU.includes('LICENCA') || occU.includes('MÉDICA') || occU.includes('MEDICA') || occU.includes('LUTO') || occU.includes('NOJO') || occU.includes('GALA') || occU.includes('MATERNIDADE') || occU.includes('PATERNIDADE') || occU.includes('CAPACITAÇÃO') || occU.includes('CAPACITACAO') || occU.includes('PRÊMIO') || occU.includes('PREMIO');
          const isVacation = occU.includes('FÉRIAS') || occU.includes('FERIAS');
          const isTravel = occU.includes('VIAGEM') || occU.includes('MISSÃO') || occU.includes('MISSAO') || (occU.includes('SERVIÇO') && !occU.includes('TEMPO DE'));
          const isDispensed = isLicense || isVacation || isTravel || (abonoMin >= dayTargetMinutes);

          // R6 / R5 — sinalização de excedente irregular em dias já encerrados.
          try {
            const isWeekendOrHoliday = dayOfWeek === 0 || dayOfWeek === 6 || isHolidayOrRecess;
            // Em mês fechado a coluna h10 é "HORAS AJUST." (jornada reconhecida),
            // não excedente — nesse caso o excesso do dia útil vem de TOTAL - jornada.
            const grossExcessMin = isWeekendOrHoliday
              ? (totalMin > 0 ? totalMin : exceedMin)
              : (isClosedMonthTable ? (totalMin - dayTargetMinutes) : exceedMin);
            const hasAuth = window.JEPessoasAuthScan && window.JEPessoasAuthScan.rowHasAuthorization(tr);
            const canBadge = isStrictlyPast && !isDispensed && occCell
              && !occCell.querySelector('.je-occurrence-ajuste-pendente');

            // R6 — excedente sem autorização de serviço extraordinário vinculada
            // e sem pecúnia: não gera pagamento nem compensação automática (art. 3º).
            if (canBadge && pecuniaMin === 0 && !hasAuth && grossExcessMin >= 30
                && !occCell.querySelector('.je-occ-sem-autorizacao')) {
              const tag = document.createElement('span');
              tag.className = 'je-occurrence-badge je-occ-sem-autorizacao';
              tag.textContent = 'sem autorização';
              tag.title = `Excedente de ${formatSigned(grossExcessMin).replace('+', '')} sem autorização de serviço extraordinário vinculada — não gera pecúnia nem compensação automática (Portaria 380/2026 art. 3º).`;
              occCell.appendChild(document.createTextNode(' '));
              occCell.appendChild(tag);
            }

            // R5 — excedente acima do teto legal por jornada, mesmo autorizado:
            // 2h em dia útil, 10h em sábado/domingo/feriado (Res. 22.901/2008 art. 4º).
            // O que passa disso não é compensável.
            const L = window.JEPessoasLegal;
            const capMin = isWeekendOrHoliday
              ? ((L && L.MAX_HE_FDS_MIN.valor) || 600)
              : ((L && L.MAX_HE_DIA_UTIL_MIN.valor) || 120);
            if (canBadge && grossExcessMin > capMin
                && !occCell.querySelector('.je-occ-acima-teto')) {
              const over = grossExcessMin - capMin;
              const tag2 = document.createElement('span');
              tag2.className = 'je-occurrence-badge je-occ-acima-teto';
              tag2.textContent = isWeekendOrHoliday ? '> 10h (art. 4º)' : '> 2h (art. 4º)';
              tag2.title = `Excedente de ${formatSigned(grossExcessMin).replace('+', '')} — ${formatSigned(over).replace('+', '')} acima do teto de ${isWeekendOrHoliday ? '10h' : '2h'} por jornada (Res. 22.901/2008 art. 4º). O que passa do teto não é compensável.`;
              occCell.appendChild(document.createTextNode(' '));
              occCell.appendChild(tag2);
            }
          } catch (e) { /* não bloqueia a modernização */ }

          // Cálculo do saldo do dia pela fonte única (evita divergência com o card de KPI).
          const dayResult = window.JEPessoasBalance.computeDailyDelta({
            dayOfWeek,
            isClosedMonth: isClosedMonthTable,
            isHolidayOrRecess,
            isDispensed,
            totalMin,
            exceedMin,
            pecuniaMin,
            dayTargetMinutes
          });
          const dailyDelta = dayResult.delta;
          let multiplierBadge = '';
          let deltaTooltip = '';

          if (dailyDelta !== 0 && dayResult.multiplierPct === 100) {
            const amount = formatSigned(dailyDelta).replace('+', '');
            multiplierBadge = `<span class="je-multiplier-tag je-multiplier-tag-sun" title="${isHolidayOrRecess ? 'Feriado' : 'Domingo'} com +100% no saldo (+${amount})">+100%</span>`;
            deltaTooltip = `${isHolidayOrRecess ? 'Feriado' : 'Domingo'} (+100%): ${totalDay || exceedDay} bruto com dobra (+100%) = +${amount} no saldo acumulado`;
          } else if (dailyDelta !== 0 && dayResult.multiplierPct === 50) {
            const amount = formatSigned(dailyDelta).replace('+', '');
            multiplierBadge = `<span class="je-multiplier-tag je-multiplier-tag-sat" title="Sábado com +50% no saldo (+${amount})">+50%</span>`;
            deltaTooltip = `Sábado (+50%): ${totalDay || exceedDay} bruto com acréscimo de 50% = +${amount} no saldo acumulado`;
          }

          const hasRecord = !!(e1 || totalDay || (exceedDay && exceedDay !== '00:00' && exceedDay !== '--:--') || (pecunia && pecunia !== '00:00') || abono);
          const shouldCount = (hasRecord || isPastOrToday) && isPastOrToday;

          if (shouldCount) {
            runningBalance += dailyDelta;
          }

          const exceedCell = tr.querySelector('td.h10');
          const pecuniaCellTarget = pecuniaCell || exceedCell;
          let currentAnchor = pecuniaCellTarget;

          // Célula 1: HORAS EXCED. do TSE XT (Injetada APENAS em meses fechados)
          if (isClosedMonthTable) {
            const tdDelta = document.createElement('td');
            tdDelta.className = 'je-col-daily-exceed';

            if (shouldCount) {
              if (dailyDelta > 0) {
                tdDelta.classList.add('je-balance-positive');
              } else if (dailyDelta < 0) {
                tdDelta.classList.add('je-balance-negative');
              } else {
                tdDelta.classList.add('je-balance-zero');
              }
              tdDelta.innerHTML = `<strong>${formatSigned(dailyDelta)}</strong>${multiplierBadge}`;
              if (deltaTooltip) {
                tdDelta.title = deltaTooltip;
              }
            } else {
              tdDelta.innerHTML = `<span style="color:#94a3b8; font-weight:500;">--:--</span>`;
            }

            if (currentAnchor && currentAnchor.parentNode) {
              currentAnchor.parentNode.insertBefore(tdDelta, currentAnchor.nextSibling);
              currentAnchor = tdDelta;
            }
          }

          // Célula 2: SALDO ACUM. do TSE XT (Injetada em todos os meses)
          const tdAccum = document.createElement('td');
          tdAccum.className = 'je-col-accumulated-balance';

          if (shouldCount) {
            if (runningBalance > 0) {
              tdAccum.classList.add('je-balance-positive');
            } else if (runningBalance < 0) {
              tdAccum.classList.add('je-balance-negative');
            } else {
              tdAccum.classList.add('je-balance-zero');
            }
            tdAccum.innerHTML = `<strong>${formatSigned(runningBalance)}</strong>`;
          } else {
            tdAccum.innerHTML = `<span style="color:#94a3b8; font-weight:500;">--:--</span>`;
          }

          if (currentAnchor && currentAnchor.parentNode) {
            currentAnchor.parentNode.insertBefore(tdAccum, currentAnchor.nextSibling);
          }
        }
      }

      // Linha de Totais da Tabela Principal ("Totais:")
      if (!hasHybridWorkInMonth && tr.classList.contains('total-horas') && tr.innerText.includes('Totais:') && !tr.querySelector('.je-col-accumulated-balance')) {
        tr.querySelectorAll('.je-col-daily-exceed, .je-col-accumulated-balance, .je-totais-trailing, .je-totais-pecunia').forEach(el => el.remove());
        const cells = Array.from(tr.querySelectorAll('td'));
        
        if (cells.length >= 2) {
          cells[0].colSpan = 8;
          const targetExcedCell = cells[2] || cells[1];

          // 1. Célula de Pecúnia no Rodapé
          const pecuniaTd = document.createElement('td');
          pecuniaTd.className = 'cellTotais je-totais-pecunia';
          pecuniaTd.innerText = '00:00';
          targetExcedCell.parentNode.insertBefore(pecuniaTd, targetExcedCell.nextSibling);
          let currentFooterAnchor = pecuniaTd;

          // 2. Célula de Total Horas Excedentes no Rodapé (Apenas em Meses Fechados)
          if (isClosedMonthTable) {
            const totalDeltaTd = document.createElement('td');
            totalDeltaTd.className = `je-col-daily-exceed ${runningBalance > 0 ? 'je-balance-positive' : (runningBalance < 0 ? 'je-balance-negative' : 'je-balance-zero')}`;
            totalDeltaTd.innerHTML = `<strong>${formatSigned(runningBalance)}</strong>`;
            currentFooterAnchor.parentNode.insertBefore(totalDeltaTd, currentFooterAnchor.nextSibling);
            currentFooterAnchor = totalDeltaTd;
          }

          // 3. Célula de Saldo Acumulado no Rodapé (TSE XT)
          const totalAccumTd = document.createElement('td');
          totalAccumTd.className = `je-col-accumulated-balance ${runningBalance > 0 ? 'je-balance-positive' : (runningBalance < 0 ? 'je-balance-negative' : 'je-balance-zero')}`;
          totalAccumTd.innerHTML = `<strong>${formatSigned(runningBalance)}</strong>`;
          currentFooterAnchor.parentNode.insertBefore(totalAccumTd, currentFooterAnchor.nextSibling);

          // 4. Célula trailing
          const trailingTd = document.createElement('td');
          trailingTd.className = 'cellTotais je-totais-trailing';
          trailingTd.colSpan = 4;
          totalAccumTd.parentNode.insertBefore(trailingTd, totalAccumTd.nextSibling);
        }
      }
    });

    // Modernização do Ícone de Hora Extra / Hora Excedente Autorizada (v0.2.0)
    modernizeOvertimeClockIcons(table);

    // Injeta botões de formulário modal de ajuste de ponto inline (v0.3.19)
    if (window.JEPessoasPointModal) {
      window.JEPessoasPointModal.injectAdjustmentButtons(table);
    }
  }

  function executePageScript(scriptCode) {
    if (!scriptCode) return;
    try {
      const script = document.createElement('script');
      script.textContent = scriptCode;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (err) {
      console.error('Erro ao executar script da página:', err);
    }
  }

  function modernizeOvertimeClockIcons(table) {
    const clockImgs = table.querySelectorAll('img[src*="iconClock"], img[src*="Clock"], img[src*="relogio"], img[title*="Autorização"], img[title*="Hora Excedente"]');
    
    clockImgs.forEach((img) => {
      const parentTd = img.closest('td');
      if (parentTd) {
        parentTd.style.setProperty('text-align', 'left', 'important');
      }

      const parentLink = img.closest('a');
      const tooltip = img.getAttribute('title') || (parentLink && parentLink.getAttribute('title')) || 'Hora Extra Autorizada (Clique para detalhes)';
      
      const onclickAttr = img.getAttribute('onclick') || (parentLink && parentLink.getAttribute('onclick'));
      const hrefAttr = (parentLink && parentLink.getAttribute('href')) || img.getAttribute('href');

      let modernClockBtn = img.nextElementSibling && img.nextElementSibling.classList.contains('je-overtime-clock-btn')
        ? img.nextElementSibling
        : null;

      const isNew = !modernClockBtn;

      if (isNew) {
        img.classList.add('je-clock-replaced');
        modernClockBtn = document.createElement('button');
        modernClockBtn.type = 'button';
        modernClockBtn.className = 'je-overtime-clock-btn';
        modernClockBtn.title = tooltip;
        modernClockBtn.setAttribute('aria-label', tooltip);

        modernClockBtn.innerHTML = `
          <svg class="je-overtime-clock-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        `;
      }

      // 1. Replicação nativa do atributo onclick para execução direta no Main World
      if (onclickAttr) {
        modernClockBtn.setAttribute('onclick', onclickAttr);
      } else if (hrefAttr && hrefAttr.toLowerCase().startsWith('javascript:')) {
        const code = hrefAttr.replace(/^javascript:/i, '').trim();
        if (code && code !== '#' && !code.includes('javascript:void')) {
          modernClockBtn.setAttribute('onclick', code);
        }
      }

      if (isNew) {
        // 2. Listener de clique de segurança preservando o User Gesture Token no Main World
        modernClockBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const currentOnclick = img.getAttribute('onclick') || (parentLink && parentLink.getAttribute('onclick'));
          if (currentOnclick) {
            const cleanCode = currentOnclick.replace(/^javascript:/i, '').trim();
            try {
              const runCode = new Function(cleanCode);
              runCode.call(window);
              return;
            } catch (err) {
              console.warn('Erro ao executar onclick via Function:', err);
            }
          }

          const currentHref = (parentLink && parentLink.getAttribute('href')) || img.getAttribute('href');
          if (currentHref && currentHref.toLowerCase().startsWith('javascript:')) {
            const cleanCode = currentHref.replace(/^javascript:/i, '').trim();
            try {
              const runCode = new Function(cleanCode);
              runCode.call(window);
              return;
            } catch (err) {
              console.warn('Erro ao executar href via Function:', err);
            }
          }

          try {
            if (parentLink) parentLink.click();
            else img.click();
          } catch (err) {
            console.warn('Erro ao disparar clique residual:', err);
          }
        });

        img.parentNode.insertBefore(modernClockBtn, img.nextSibling);
      }
    });
  }

  function modernizeForm() {
    const forms = document.querySelectorAll('#formEspelhoPontoMes, #formEspelhoPontoDia, form[name*="EspelhoPonto"], form[action*="EspelhoPonto"]');
    if (!forms || forms.length === 0) return;

    forms.forEach((form) => {
      const formActionStr = form.getAttribute('action') || form.action || '';
      const isDia = form.id === 'formEspelhoPontoDia' || formActionStr.includes('EspelhoPontoDiaAction') || window.location.href.includes('EspelhoPontoDiaAction');
      const defaultEndpoint = isDia 
        ? '/portalservidor2/EspelhoPontoDiaAction_consultar.action' 
        : '/portalservidor2/EspelhoPontoMesAction_recuperar.action';

      // Blindagem de Action: Garante que o form aponte sempre para o endpoint mapeado correto
      if (!formActionStr || formActionStr.endsWith('Action') || formActionStr.endsWith('Action.action') || formActionStr.endsWith('EspelhoPontoMesAction') || formActionStr.endsWith('EspelhoPontoDiaAction')) {
        form.action = defaultEndpoint;
        form.setAttribute('action', defaultEndpoint);
      }

      if (form.classList.contains('je-modernized-form')) return;
      form.classList.add('je-modernized-form');

      // Substitui o botão legado por um <button> moderno com alinhamento flex nativo
      const legacyBtn = form.querySelector('#btnConsultar, input[value="CONSULTAR"], input[type="submit"]');
      if (legacyBtn && !form.querySelector('.je-btn-consultar')) {
        legacyBtn.classList.add('je-legacy-btn-consultar');
        
        const modernBtn = document.createElement('button');
        modernBtn.type = 'button';
        modernBtn.className = 'je-btn-consultar';
        const btnText = legacyBtn.value ? escapeHTML(legacyBtn.value.toUpperCase()) : 'CONSULTAR';
        modernBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>${btnText}</span>
        `;
        modernBtn.title = legacyBtn.title || 'Consultar';

        modernBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          modernBtn.innerHTML = `<span>ENVIANDO...</span>`;
          modernBtn.style.opacity = '0.8';
          const fnName = isDia ? 'formEspelhoPontoDia_consultar' : 'formEspelhoPontoMes_consultar';
          if (typeof window[fnName] === 'function') {
            window[fnName]();
          } else {
            legacyBtn.click();
          }
        });

        legacyBtn.parentNode.insertBefore(modernBtn, legacyBtn.nextSibling);
      }

      // Auto-consulta instantânea: Dispara a consulta ao alterar campos de filtro (com action blindada)
      const filterFields = form.querySelectorAll('select, input[type="radio"]');
      filterFields.forEach((field) => {
        field.addEventListener('change', () => {
          const modernBtn = form.querySelector('.je-btn-consultar');
          if (modernBtn) {
            modernBtn.innerHTML = `<span>CONSULTANDO...</span>`;
            modernBtn.style.opacity = '0.8';
          }
          const fnName = isDia ? 'formEspelhoPontoDia_consultar' : 'formEspelhoPontoMes_consultar';
          if (typeof window[fnName] === 'function') {
            window[fnName]();
          } else {
            form.action = defaultEndpoint;
            form.submit();
          }
        });
      });

      // Intercepta qualquer submissão para a action genérica (sem método)
      form.addEventListener('submit', (e) => {
        const curAction = form.getAttribute('action') || form.action || '';
        if (!curAction || curAction.endsWith('Action') || curAction.endsWith('Action.action') || curAction.endsWith('EspelhoPontoMesAction') || curAction.endsWith('EspelhoPontoDiaAction')) {
          e.preventDefault();
          e.stopPropagation();
          const fnName = isDia ? 'formEspelhoPontoDia_consultar' : 'formEspelhoPontoMes_consultar';
          if (typeof window[fnName] === 'function') {
            window[fnName]();
          } else {
            form.action = defaultEndpoint;
            form.submit();
          }
        }
      });

      // Seleciona por padrão o Motivo "Esquecimento" se disponível
      setDefaultMotivoEsquecimento(form);
      setupJustificativaCharCounter(form);
      modernizeMolduraForm(form);
    });

    modernizeCalendarIcons();
    highlightUserAndManagerNames();
  }

  function modernizeMolduraForm(targetRoot) {
    const root = targetRoot || document;
    const moldura = root.classList && root.classList.contains('moldura') ? root : root.querySelector('.moldura');
    if (!moldura || moldura.dataset.jeMolduraModernized) return;
    moldura.dataset.jeMolduraModernized = 'true';

    // Remove br soltos que quebram o layout flex
    moldura.querySelectorAll('br').forEach(br => br.remove());

    // Agrupa 1: Operação
    const labelOperacao = Array.from(moldura.querySelectorAll('label')).find(l => /oper/i.test(l.innerText || ''));
    const spanInclusao = moldura.querySelector('.imitaTextfieldReadonlySemBorda');
    if (labelOperacao && spanInclusao) {
      const group = document.createElement('div');
      group.className = 'je-form-group je-group-operacao';
      labelOperacao.parentNode.insertBefore(group, labelOperacao);
      group.appendChild(labelOperacao);
      group.appendChild(spanInclusao);
    }

    // Agrupa 2: Horário da marcação
    const labelHorario = Array.from(moldura.querySelectorAll('label')).find(l => /hor/i.test(l.innerText || ''));
    const inputHorario = moldura.querySelector('#marcacaoPonto_marcacao, input[name*="marcacao" i]');
    if (labelHorario && inputHorario) {
      const group = document.createElement('div');
      group.className = 'je-form-group je-group-horario';
      labelHorario.parentNode.insertBefore(group, labelHorario);
      group.appendChild(labelHorario);
      group.appendChild(inputHorario);
    }

    // Agrupa 3: Motivo
    const labelMotivo = Array.from(moldura.querySelectorAll('label')).find(l => /motivo/i.test(l.innerText || ''));
    const selectMotivo = moldura.querySelector('#marcacaoPonto_alteracao_motivo_codigo, select[name*="motivo" i]');
    if (labelMotivo && selectMotivo) {
      const group = document.createElement('div');
      group.className = 'je-form-group je-group-motivo';
      labelMotivo.parentNode.insertBefore(group, labelMotivo);
      group.appendChild(labelMotivo);
      group.appendChild(selectMotivo);
    }

    // Agrupa 4: Justificativa (largura total)
    const labelJustificativa = Array.from(moldura.querySelectorAll('label')).find(l => /justificativa/i.test(l.innerText || ''));
    const textareaJustificativa = moldura.querySelector('#marcacaoPonto_alteracao_motivo_justificativa, textarea[name*="justificativa" i]');
    if (labelJustificativa && textareaJustificativa) {
      const group = document.createElement('div');
      group.className = 'je-form-group je-form-group-full';
      labelJustificativa.parentNode.insertBefore(group, labelJustificativa);
      group.appendChild(labelJustificativa);
      group.appendChild(textareaJustificativa);
    }

    // Linha 1 de campos (Operação + Horário + Motivo na mesma linha)
    const row1 = document.createElement('div');
    row1.className = 'je-form-row';
    const groups = Array.from(moldura.querySelectorAll('.je-form-group:not(.je-form-group-full)'));
    if (groups.length > 0) {
      groups[0].parentNode.insertBefore(row1, groups[0]);
      groups.forEach(g => row1.appendChild(g));
    }

    // Linha 4: Botões no canto inferior direito (INCLUIR / LIMPAR)
    const actionsRow = document.createElement('div');
    actionsRow.className = 'je-form-actions-row';

    const nativeBtns = Array.from(moldura.querySelectorAll('input[type="submit"], input[type="button"], button, .botoes input'));
    if (nativeBtns.length > 0) {
      nativeBtns[0].parentNode.insertBefore(actionsRow, nativeBtns[0]);
      nativeBtns.forEach(btn => {
        const isIncluir = (btn.value && (btn.value.includes('INCLUIR') || btn.value.includes('SALVAR'))) || btn.type === 'submit';
        btn.classList.add(isIncluir ? 'je-btn-incluir' : 'je-btn-limpar');
        actionsRow.appendChild(btn);
      });
    }
  }

  function setupJustificativaCharCounter(targetRoot) {
    const root = targetRoot || document;
    const textareas = root.querySelectorAll('#marcacaoPonto_alteracao_motivo_justificativa, textarea[name*="justificativa" i], textarea[id*="justificativa" i]');
    textareas.forEach((ta) => {
      if (ta.dataset.jeCounterSet) return;
      ta.dataset.jeCounterSet = 'true';

      ta.setAttribute('maxlength', '500');

      // Oculta nós de texto soltos legados com a palavra "caracteres"
      const parent = ta.parentElement;
      if (parent) {
        Array.from(parent.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && /caracteres/i.test(node.textContent)) {
            node.textContent = '';
          } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'TEXTAREA' && !node.classList.contains('je-char-counter-container') && /caracteres/i.test(node.innerText || '')) {
            node.style.display = 'none';
          }
        });
      }

      // Oculta elemento irmão contendo textos legados
      let nextElem = ta.nextElementSibling;
      while (nextElem && !nextElem.classList.contains('je-char-counter-container')) {
        if (/caracteres/i.test(nextElem.innerText || '')) {
          nextElem.style.display = 'none';
        }
        nextElem = nextElem.nextElementSibling;
      }

      const counterContainer = document.createElement('div');
      counterContainer.className = 'je-char-counter-container';

      const updateCount = () => {
        const current = ta.value ? ta.value.length : 0;
        const remaining = Math.max(0, 500 - current);
        counterContainer.innerHTML = `
          <span class="je-char-max">Máx. 500 caracteres</span>
          <span class="je-char-rem">Caracteres restantes: <strong class="${remaining < 50 ? 'je-char-warning' : ''}">${remaining}</strong> / 500</span>
        `;
      };

      ta.addEventListener('input', updateCount);
      ta.addEventListener('keyup', updateCount);
      ta.addEventListener('change', updateCount);
      updateCount();

      ta.parentNode.insertBefore(counterContainer, ta.nextSibling);
    });
  }

  function setDefaultMotivoEsquecimento(form) {
    const motiveSelects = (form || document).querySelectorAll('select[name*="motivo" i], select[id*="motivo" i], select[name*="justificativa" i], select[name*="ocorrencia" i], #motivo, #motivoSelecionado');
    motiveSelects.forEach((select) => {
      if (select.dataset.jeMotivoSet) return;

      let foundOption = null;
      Array.from(select.options).forEach((opt) => {
        const txt = (opt.text || opt.value || '').toUpperCase();
        if (txt.includes('ESQUECIMENTO')) {
          foundOption = opt;
        }
      });

      if (foundOption) {
        foundOption.selected = true;
        select.value = foundOption.value;
        select.dataset.jeMotivoSet = 'true';
      }
    });
  }

  function modernizeCalendarIcons() {
    const dateInputs = document.querySelectorAll('input[name*="data" i], input[id*="data" i], input.data, input[name*="Data"], input[id*="Data"]');
    dateInputs.forEach((dateInput) => {
      const parent = dateInput.parentElement;
      if (!parent) return;

      const legacyImg = parent.querySelector('img[src*="cal" i], img[src*="calendar" i], img[title*="Calend" i], img[alt*="Calend" i], .ui-datepicker-trigger');

      let wrapper = dateInput.closest('.je-date-input-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'je-date-input-wrapper';
        dateInput.parentNode.insertBefore(wrapper, dateInput);
        wrapper.appendChild(dateInput);
      }

      if (wrapper.querySelector('.je-calendar-picker-btn')) return;

      const modernCalBtn = document.createElement('button');
      modernCalBtn.type = 'button';
      modernCalBtn.className = 'je-calendar-picker-btn';
      modernCalBtn.title = (legacyImg && legacyImg.title) ? legacyImg.title : 'Selecionar Data no Calendário';
      modernCalBtn.setAttribute('aria-label', modernCalBtn.title);

      modernCalBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      `;

      modernCalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (legacyImg) {
          legacyImg.click();
        } else {
          dateInput.focus();
          if (typeof dateInput.showPicker === 'function') {
            try { dateInput.showPicker(); } catch (err) {}
          }
        }
      });

      wrapper.appendChild(modernCalBtn);
    });
  }

  function highlightUserAndManagerNames() {
    const h3Elements = document.querySelectorAll('#conteudo h3, .form-container h3, #opcoes-consulta h3, .moldura h3');
    h3Elements.forEach((h3) => {
      if (h3.dataset.jeH3Modernized) return;

      const rawText = h3.innerText.trim();
      if (!rawText || (!rawText.includes(':') && !/Matrícula|Servidor|Responsável|Chefia|Nome/i.test(rawText))) {
        return;
      }

      h3.dataset.jeH3Modernized = 'true';

      const parts = rawText.split(/\s+-\s+/);
      const formattedParts = parts.map((part) => {
        const colonIndex = part.indexOf(':');
        if (colonIndex !== -1) {
          const label = part.substring(0, colonIndex + 1);
          const val = part.substring(colonIndex + 1).trim();
          if (val) {
            return `${escapeHTML(label)} <span class="je-header-highlight">${escapeHTML(val)}</span>`;
          }
          return escapeHTML(part);
        } else {
          const trimmed = part.trim();
          if (trimmed) {
            return `<span class="je-header-highlight">${escapeHTML(trimmed)}</span>`;
          }
          return '';
        }
      });

      h3.innerHTML = formattedParts.join(' - ');
    });

    const legacySelectors = [
      '.servidor-nome', '.responsavel-nome', '.nomeServidor', '.nomeResponsavel'
    ];
    document.querySelectorAll(legacySelectors.join(',')).forEach((el) => {
      el.classList.add('je-header-highlight');
    });
  }

  function setDefaultMotivoEsquecimento(form) {
    const motiveSelects = (form || document).querySelectorAll('select[name*="motivo" i], select[id*="motivo" i], select[name*="justificativa" i], select[name*="ocorrencia" i], #motivo, #motivoSelecionado');
    motiveSelects.forEach((select) => {
      if (select.dataset.jeMotivoSet) return;

      let foundOption = null;
      Array.from(select.options).forEach((opt) => {
        const txt = (opt.text || opt.value || '').toUpperCase();
        if (txt.includes('ESQUECIMENTO')) {
          foundOption = opt;
        }
      });

      if (foundOption) {
        foundOption.selected = true;
        select.value = foundOption.value;
        select.dataset.jeMotivoSet = 'true';
      }
    });
  }

  return {
    applyThemeState,
    modernizeHeader,
    injectPageTitleHeader,
    injectKPICards,
    modernizeTable,
    modernizeForm,
    modernizeCalendarIcons,
    highlightUserAndManagerNames
  };
})();
