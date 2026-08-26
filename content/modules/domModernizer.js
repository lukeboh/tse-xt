/**
 * TSE XT - Modernizador de DOM e Injeção de Componentes Glassmorphism (v0.2.0)
 */

window.JEPessoasModernizer = (function () {
  'use strict';

  function applyThemeState(enabled) {
    document.body.classList.add('je-theme-transitioning');

    if (enabled) {
      document.body.classList.add('je-xt-enabled');
      document.body.classList.remove('je-xt-disabled');
    } else {
      document.body.classList.add('je-xt-disabled');
      document.body.classList.remove('je-xt-enabled');
    }

    const toggleLabels = document.querySelectorAll('.je-toggle-label');
    toggleLabels.forEach((label) => {
      label.innerHTML = enabled ? '✨ <strong>TSE XT</strong> Ativo' : '🏛️ <strong>TSE XT</strong> Desligado';
    });

    setTimeout(() => {
      document.body.classList.remove('je-theme-transitioning');
    }, 450);
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
    const versaoExtensao = window.JEPessoasVersion ? window.JEPessoasVersion.getVersion() : '0.2.1';

    // 1. Cria a Topbar Slim Glass com o Botão de Menu de Serviços Integrado
    const topbar = document.createElement('header');
    topbar.className = 'je-topbar';

    topbar.innerHTML = `
      <div class="je-brand-wrapper">
        <!-- Botão de Menu de Serviços / Drawer -->
        <button class="je-menu-trigger-btn" id="je-nav-menu-btn" title="Abrir Menu de Serviços (Alt + M)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Menu</span>
        </button>

        <div class="je-brand" onclick="window.location.href='https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action'" title="Meu Espaço - Página Inicial">
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
        <svg class="je-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="je-search-input" placeholder="Pesquisar páginas, atalhos e serviços..." readonly />
        <span class="je-search-shortcut">Ctrl+K</span>
      </div>

      <div class="je-topbar-actions">
        <div class="je-user-profile">
          <div class="je-user-chip" title="Servidor Logado, Lotação e IP">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <strong>${servidorNome}</strong>
            ${matricula ? `<span>(${matricula})</span>` : ''}
            ${lotacao ? `<span style="color:#64748b">• ${lotacao}</span>` : ''}
            ${ip ? `<span class="je-ip-tag" title="IP de Origem: ${ip}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>${ip}</span>` : ''}
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
        
        applyThemeState(nextState);
        chrome.storage?.local?.set({ xtThemeEnabled: nextState });
      });
    }

    // 3. Conecta o Botão de Menu ao Drawer
    const menuBtn = topbar.querySelector('#je-nav-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
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

    const container = document.getElementById('container') || document.body;
    container.insertBefore(topbar, container.firstChild);
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
        
        applyThemeState(nextState);
        chrome.storage?.local?.set({ xtThemeEnabled: nextState });
      });
    }
  }

  function injectPageTitleHeader() {
    if (document.querySelector('.je-page-title-banner')) return;

    const mesSelect = document.getElementById('mesSelecionado');
    const anoSelect = document.getElementById('anoSelecionado');
    const mesNome = mesSelect && mesSelect.selectedOptions[0] ? mesSelect.selectedOptions[0].text : 'Mês Atual';
    const anoNome = anoSelect ? anoSelect.value : new Date().getFullYear();

    const titleBanner = document.createElement('div');
    titleBanner.className = 'je-page-title-banner';

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
              <span class="je-breadcrumb-item active">Consulta Mensal</span>
            </nav>
            <h1 class="je-main-page-title">Espelho de Ponto</h1>
          </div>
        </div>
        <div class="je-current-period-tag" title="Período em visualização">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Referência: <strong>${mesNome} / ${anoNome}</strong></span>
        </div>
      </div>
    `;

    const container = document.getElementById('container') || document.body;
    const topbar = document.querySelector('.je-topbar');
    if (topbar && topbar.nextSibling) {
      container.insertBefore(titleBanner, topbar.nextSibling);
    } else {
      container.insertBefore(titleBanner, container.firstChild);
    }
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
          ${kpiData.remainingMinutesToday > 0 
            ? `<span>Faltam <strong>${kpiData.remainingTimeFormatted}</strong> hoje</span>`
            : `<span>Jornada de hoje <strong>cumprida</strong></span>`}
        </div>
      </div>

      <!-- Card 2: Saldo Acumulado do Banco de Horas -->
      <div class="je-kpi-card" title="Saldo homologado no banco de horas institucional">
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
            : `<span class="${isPositiveBank ? 'je-badge-positive' : 'je-badge-negative'}">${isPositiveBank ? 'Positivo' : 'Débito'}</span><span>Homologado</span>`}
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

      <!-- Card 5: Saldo de Horas Extras (Duas Linhas) -->
      <div class="je-kpi-card" title="Detalhamento de horas extras acumuladas no período">
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
            <span style="color: #64748b; font-weight: 600;">Dias úteis / Sáb:</span>
            <strong style="color: #0a2540; font-size: 12.5px;">${kpiData.extraWeekdayAndSaturday}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
            <span style="color: #64748b; font-weight: 600;">Dom / Feriados:</span>
            <strong style="color: #7c3aed; font-size: 12.5px;">${kpiData.extraSundayAndHoliday}</strong>
          </div>
        </div>
        <div class="je-kpi-subtext">
          <span>Saldo Mês: <strong>${kpiData.totalExceedTimeFormatted}</strong></span>
        </div>
      </div>
    `;

    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (table && table.parentNode) {
      table.parentNode.insertBefore(dashboard, table);
    }
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

  function modernizeTable() {
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (!table) return;

    // Limpa injeções anteriores para garantir idempotência
    table.querySelectorAll('.je-col-accumulated-balance, .je-totais-trailing, .je-totais-pecunia').forEach(el => el.remove());

    const tableText = table.innerText.toUpperCase();
    const hasHybridWorkInMonth = tableText.includes('TRABALHO HIBRIDO') || tableText.includes('TRABALHO HÍBRIDO') || tableText.includes('TELETRABALHO');

    // 1. Injeta Cabeçalho da Nova Coluna "SALDO ACUM." (APENAS se NÃO houver trabalho híbrido no mês)
    if (!hasHybridWorkInMonth) {
      const headerRows = table.querySelectorAll('tr');
      headerRows.forEach((tr) => {
        const pecuniaTh = tr.querySelector('th.h12') || tr.querySelector('th.h11') || Array.from(tr.querySelectorAll('th')).find(th => th.innerText.toUpperCase().includes('PECÚNIA') || th.innerText.toUpperCase().includes('PECUNIA'));
        if (pecuniaTh && !tr.querySelector('th.je-col-accumulated-balance')) {
          const newTh = document.createElement('th');
          newTh.className = 'je-col-accumulated-balance';
          newTh.title = 'Saldo Acumulado do Mês (Calculado pelo TSE XT: Saldo Anterior + Horas Exced. - Pecúnia)';
          newTh.innerHTML = 'SALDO ACUM.';
          pecuniaTh.parentNode.insertBefore(newTh, pecuniaTh.nextSibling);
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

        // Destaca ocorrências
        const occCell = tr.querySelector('td.h16, td.h15');
        const occText = occCell ? occCell.innerText.trim().toUpperCase() : '';

        if (occCell && occText) {
          if (occText.includes('VIAGEM')) {
            occCell.innerHTML = `<span class="je-occurrence-badge je-occurrence-viagem">${occCell.innerText}</span>`;
          } else if (occText.includes('FERIADO') || occText.includes('RECESSO')) {
            occCell.innerHTML = `<span class="je-occurrence-badge je-occurrence-feriado">${occCell.innerText}</span>`;
          } else if (!occText.includes('SÁBADO') && !occText.includes('DOMINGO')) {
            occCell.innerHTML = `<span class="je-occurrence-badge">${occCell.innerText}</span>`;
          }
        }

        // Se NÃO estiver em regime híbrido, injeta a célula de Saldo Acumulado na linha
        if (!hasHybridWorkInMonth) {
          const allTds = tr.querySelectorAll('td:not(.je-col-accumulated-balance)');
          const pecuniaCell = tr.querySelector('.h12') || tr.querySelector('.h11') || (allTds.length >= 11 ? allTds[10] : null);

          const exceedDay = tr.querySelector('.h10')?.innerText.trim() || '';
          const pecunia = (tr.querySelector('.h12') || tr.querySelector('.h11'))?.innerText.trim() || (allTds.length >= 11 ? allTds[10].innerText.trim() : '');

          const exceedMin = parseMinutes(exceedDay);
          const pecuniaMin = parseMinutes(pecunia);
          const dailyDelta = exceedMin - pecuniaMin;

          const dateParts = dateText.split('/');
          let isPastOrToday = true;
          if (dateParts.length === 3) {
            const dObj = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10), 23, 59, 59);
            isPastOrToday = dObj <= now || dateText === todayFormatted;
          }

          const e1 = tr.querySelector('.h02')?.innerText.trim() || '';
          const totalDay = tr.querySelector('.h09')?.innerText.trim() || '';
          const abono = tr.querySelector('.h08')?.innerText.trim() || '';
          const hasRecord = !!(e1 || totalDay || (exceedDay && exceedDay !== '00:00' && exceedDay !== '--:--') || (pecunia && pecunia !== '00:00') || abono);

          const shouldCount = hasRecord || isPastOrToday;

          if (shouldCount) {
            runningBalance += dailyDelta;
          }

          const td = document.createElement('td');
          td.className = 'je-col-accumulated-balance';

          if (shouldCount) {
            if (runningBalance > 0) {
              td.classList.add('je-balance-positive');
            } else if (runningBalance < 0) {
              td.classList.add('je-balance-negative');
            } else {
              td.classList.add('je-balance-zero');
            }
            td.innerHTML = `<strong>${formatSigned(runningBalance)}</strong>`;
          } else {
            td.innerHTML = `<span style="color:#94a3b8; font-weight:500;">--:--</span>`;
          }

          if (pecuniaCell && pecuniaCell.parentNode) {
            pecuniaCell.parentNode.insertBefore(td, pecuniaCell.nextSibling);
          } else if (allTds.length >= 11) {
            allTds[10].parentNode.insertBefore(td, allTds[10].nextSibling);
          }
        }
      }

      // Linha de Totais da Tabela Principal ("Totais:")
      if (!hasHybridWorkInMonth && tr.classList.contains('total-horas') && tr.innerText.includes('Totais:') && !tr.querySelector('.je-col-accumulated-balance')) {
        tr.querySelectorAll('.je-col-accumulated-balance, .je-totais-trailing, .je-totais-pecunia').forEach(el => el.remove());
        const cells = Array.from(tr.querySelectorAll('td'));
        
        if (cells.length >= 2) {
          // cells[0]: "Totais:" (ocupa 8 colunas: Data, E1, S1, E2, S2, E3, S3, Abono)
          cells[0].colSpan = 8;
          
          // cells[1]: Total Trabalhado (ex: 135:23)
          // cells[2]: Total Horas Excedentes (ex: 30:23)
          const targetExcedCell = cells[2] || cells[1];

          // 1. Célula de Pecúnia no Rodapé
          const pecuniaTd = document.createElement('td');
          pecuniaTd.className = 'cellTotais je-totais-pecunia';
          pecuniaTd.innerText = '00:00';
          targetExcedCell.parentNode.insertBefore(pecuniaTd, targetExcedCell.nextSibling);

          // 2. Célula de Saldo Acumulado no Rodapé (TSE XT)
          const totalTd = document.createElement('td');
          totalTd.className = `je-col-accumulated-balance ${runningBalance > 0 ? 'je-balance-positive' : (runningBalance < 0 ? 'je-balance-negative' : 'je-balance-zero')}`;
          totalTd.innerHTML = `<strong>${formatSigned(runningBalance)}</strong>`;
          pecuniaTd.parentNode.insertBefore(totalTd, pecuniaTd.nextSibling);

          // 3. Célula trailing para cobrir as 4 colunas restantes (Adic Not Pec, Adic Not, Compl, Ocorrência)
          const trailingTd = document.createElement('td');
          trailingTd.className = 'cellTotais je-totais-trailing';
          trailingTd.colSpan = 4;
          totalTd.parentNode.insertBefore(trailingTd, totalTd.nextSibling);
        }
      }
    });

    // Modernização do Ícone de Hora Extra / Hora Excedente Autorizada (v0.2.0)
    modernizeOvertimeClockIcons(table);
  }

  function modernizeOvertimeClockIcons(table) {
    const clockImgs = table.querySelectorAll('img[src*="iconClock"], img[src*="Clock"], img[src*="relogio"], img[title*="Autorização"], img[title*="Hora Excedente"]');
    
    clockImgs.forEach((img) => {
      if (img.classList.contains('je-clock-replaced')) return;
      img.classList.add('je-clock-replaced');

      const tooltip = img.getAttribute('title') || 'Hora Extra Autorizada (Clique para detalhes)';
      
      const modernClockBtn = document.createElement('button');
      modernClockBtn.type = 'button';
      modernClockBtn.className = 'je-overtime-clock-btn';
      modernClockBtn.title = tooltip;
      modernClockBtn.setAttribute('aria-label', tooltip);

      modernClockBtn.innerHTML = `
        <svg class="je-overtime-clock-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span class="je-overtime-plus">+</span>
      `;

      // Encaminha o clique para o elemento original mantendo o fluxo Ajax/Struts nativo
      modernClockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        img.click();
      });

      img.parentNode.insertBefore(modernClockBtn, img.nextSibling);
    });
  }

  function modernizeForm() {
    const form = document.getElementById('formEspelhoPontoMes');
    if (!form || form.classList.contains('je-modernized-form')) return;

    form.classList.add('je-modernized-form');

    // Substitui o input[type="button"] por um <button> moderno com alinhamento flex nativo
    const legacyBtn = document.getElementById('btnConsultar') || form.querySelector('input[value="CONSULTAR"]');
    if (legacyBtn && !document.getElementById('je-modern-btn-consultar')) {
      legacyBtn.classList.add('je-legacy-btn-consultar');
      
      const modernBtn = document.createElement('button');
      modernBtn.type = 'button';
      modernBtn.id = 'je-modern-btn-consultar';
      modernBtn.className = 'je-btn-consultar';
      modernBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>CONSULTAR</span>
      `;
      modernBtn.title = 'Consultar Espelho de Ponto';

      modernBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        modernBtn.innerHTML = `<span>CONSULTANDO...</span>`;
        modernBtn.style.opacity = '0.8';
        legacyBtn.click();
      });

      legacyBtn.parentNode.insertBefore(modernBtn, legacyBtn.nextSibling);
    }

    // Auto-consulta instantânea: Dispara o botão Consultar ao alterar qualquer campo de filtro
    const filterFields = form.querySelectorAll('select, input[type="radio"], input[type="checkbox"]');
    filterFields.forEach((field) => {
      field.addEventListener('change', () => {
        const modernBtn = document.getElementById('je-modern-btn-consultar');
        const legacyBtn = document.getElementById('btnConsultar') || form.querySelector('input[value="CONSULTAR"]');
        if (modernBtn) {
          modernBtn.innerHTML = `<span>CONSULTANDO...</span>`;
          modernBtn.style.opacity = '0.8';
        }
        if (legacyBtn && !legacyBtn.disabled) {
          legacyBtn.click();
        }
      });
    });
  }

  return {
    applyThemeState,
    modernizeHeader,
    injectPageTitleHeader,
    injectKPICards,
    modernizeTable,
    modernizeForm
  };
})();
