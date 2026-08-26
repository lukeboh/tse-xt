/**
 * TSE XT - Módulo Central de Versões e Changelog
 */

window.JEPessoasVersion = (function () {
  'use strict';

  const CURRENT_VERSION = '0.2.0';

  const CHANGELOG = [
    {
      version: '0.2.0',
      date: '2026-08-26',
      title: 'Renomeação para TSE XT & Expansão de Escopo Multi-Sistemas',
      features: [
        'A extensão agora se chama oficialmente TSE XT para expandir sua atuação para múltiplos portais e sistemas internos do Tribunal Superior Eleitoral',
        'Atualização dos botões, chips e rótulos de controle para ✨ TSE XT Ativo / 🏛️ TSE XT Desligado',
        'Preparação arquitetural do escopo de injeção em todos os domínios internos (*://*.tse.jus.br/*)'
      ]
    },
    {
      version: '0.1.15',
      date: '2026-08-26',
      title: 'Isolamento Rigoroso de Estilos XT (100% Legado no Modo OFF)',
      features: [
        'Garantia de que absolutamente nenhuma melhoria visual seja apresentada com o interruptor TSE XT desligado',
        'Restauração completa da imagem legada original de relógio e tabelas quando desativado',
        'Ocultação estrita de todos os badges SVG e componentes modernos no modo desligado'
      ]
    },
    {
      version: '0.1.14',
      date: '2026-08-26',
      title: 'Grid Uniforme de 5 KPIs, Previsão Zerar Saldo & Horas Extras Detalhadas',
      features: [
        'Distribuição uniforme com largura idêntica para todos os cards de KPIs no espaço widescreen disponível',
        'Novo Card: "Previsão Saída p/ Zerar Saldo do Mês", informando a hora exata para zerar o saldo acumulado (compensando débitos ou saindo mais cedo em caso de crédito)',
        'Novo Card: "Saldo de Horas Extras" com duas linhas dedicadas (Dias Úteis/Sábados e Domingos/Feriados)',
        'Renomeação de "Previsão de Saída" para "Saída Expediente" (completar a jornada diária)'
      ]
    },
    {
      version: '0.1.13',
      date: '2026-08-26',
      title: 'Ícone Moderno de Hora Extra Autorizada',
      features: [
        'Substituição do relógio legado pixelado por um badge tátil SVG de alta resolução',
        'Micro-interação suave com rotação no hover e brilho azul sutil',
        'Preservação total da ação nativa de clique e abertura dos detalhes de autorização'
      ]
    },
    {
      version: '0.1.12',
      date: '2026-08-26',
      title: 'Auto-Consulta Automática nos Filtros',
      features: [
        'Disparo automático da consulta ao alterar qualquer campo do formulário (Unidade, Nome, Ano ou Mês)',
        'Feedback visual imediato no botão com estado de carregamento',
        'Elimina a necessidade de clicar manualmente no botão "CONSULTAR" após selecionar uma opção'
      ]
    },
    {
      version: '0.1.11',
      date: '2026-08-26',
      title: 'Harmonização dos Textos e Dimensões dos KPIs (Sem Truncamento)',
      features: [
        'Ajuste nos títulos e textos secundários dos 4 cards de KPIs para evitar quebras e truncamentos',
        'Largura mínima e altura dos cards calibradas com flexibilidade (minmax 230px e min-height 98px)',
        'Garantia de leitura 100% fluida dos saldos, previsões e contagens de dias úteis'
      ]
    },
    {
      version: '0.1.10',
      date: '2026-08-26',
      title: 'Alinhamento Vertical Perfeito do Botão CONSULTAR',
      features: [
        'Estruturação em Flexbox moderno com alinhamento na linha de base inferior (align-items: flex-end)',
        'Alinhamento milimétrico do botão CONSULTAR em relação aos campos suspensos com labels (Unidade, Nome, Ano e Mês)',
        'Eliminação de espaçamentos residuais herdados do CSS legado'
      ]
    },
    {
      version: '0.1.9',
      date: '2026-08-25',
      title: 'KPIs Compactos (-30%) & Densidade Visual Otimizada',
      features: [
        'Redução proporcional de 30% no tamanho dos 4 cards de KPIs (Previsão, Banco, Meta e Saldo)',
        'Micro-espaçamentos reduzidos e tipografia mais refinada para priorizar o espaço útil da tabela de ponto',
        'Barra de progresso e badges adaptados para o formato compacto'
      ]
    },
    {
      version: '0.1.8',
      date: '2026-08-25',
      title: 'Destaque para Espelho de Ponto & Filtros Harmônicos sem Cortes',
      features: [
        'Novo Banner de Título com destaque para "Espelho de Ponto", ícone dedicado, breadcrumb e tag do mês/ano de referência',
        'Caixa de opções de pesquisa totalmente harmonizada em Glassmorphism integrado à página',
        'Correção definitiva da altura e corte de texto dos seletores suspensos (Unidade, Nome, Ano e Mês)',
        'Botão "CONSULTAR" alinhado perfeitamente com os campos de filtro'
      ]
    },
    {
      version: '0.1.7',
      date: '2026-08-25',
      title: 'Drawer de Serviços & Eliminação de Sobreposição',
      features: [
        'Novo Menu de Serviços em Drawer lateral com Glassmorfismo Tátil (acesso pelo botão "Menu" na Topbar ou atalho Alt+M)',
        'Eliminação total do acavalamento e sobreposição do menu antigo sobre os cards de KPIs e formulários',
        'Organização por categorias com ícones visuais, badges de permissão (Chefia / Restrito) e busca rápida interna',
        'Abertura e fechamento suaves com animação lateral e backdrop blur sem deslocar o layout'
      ]
    },
    {
      version: '0.1.6',
      date: '2026-08-25',
      title: 'Integração do IP no Topo & Limpeza da Linha Legada',
      features: [
        'O endereço IP do servidor logado agora é exibido diretamente no chip da barra superior compacta com ícone de rede',
        'Ocultação completa da linha legada `#barra-superior` (que continha os dados duplicados dos anos 90)',
        'Otimização do espaço vertical útil para exibição dos KPIs e tabela do ponto'
      ]
    },
    {
      version: '0.1.5',
      date: '2026-08-25',
      title: 'Toggle Switch Persistente & Independente',
      features: [
        'O botão de ligar/desligar o TSE XT agora é um componente independente e flutuante no topo',
        'Garantia de visibilidade 100% permanente tanto no modo XT quanto no layout legado (z-index máximo)',
        'Rótulos e estados visuais mais claros (✨ TSE XT Ativo / 🏛️ TSE XT Desligado)',
        'Transição instantânea e fluida entre os modos'
      ]
    },
    {
      version: '0.1.4',
      date: '2026-08-25',
      title: 'Interruptor de Visual XT (ON/OFF) com Transições Animadas',
      features: [
        'Novo botão de alternância (Toggle Switch) para ligar e desligar o visual do TSE XT',
        'Permite alternar instantaneamente para o layout legado original do portal para conferência',
        'Transições animadas fluidas (efeitos de slide, fade, blur e escala suaves com curva spring 2026)',
        'Persistência do estado do tema nas preferências do navegador'
      ]
    },
    {
      version: '0.1.3',
      date: '2026-08-25',
      title: 'Restauração do Logo Oficial do Meu Espaço',
      features: [
        'Reintegração do logotipo oficial original do Meu Espaço na barra superior slim',
        'Alinhamento proporcional mantendo o topo compacto e preservando a credibilidade institucional',
        'Micro-transição e efeito de profundidade sutil no logo ao passar o mouse'
      ]
    },
    {
      version: '0.1.2',
      date: '2026-08-25',
      title: 'Simulador de Metas & Progresso Mensal',
      features: [
        'Barra de progresso visual com gradiente no Card de Horas do Mês (percentual atingido)',
        'Cálculo e exibição de dias úteis restantes no mês',
        'Contagem de tempo restante de jornada de trabalho para o dia de hoje',
        'Detecção inteligente de feriados e recessos no cálculo de dias úteis esperados'
      ]
    },
    {
      version: '0.1.1',
      date: '2026-08-25',
      title: 'Barra de Ações Rápidas & Exportação',
      features: [
        'Novo Botão Flutuante (FAB) de Ações Rápidas com animações táteis suaves',
        'Exportação completa da tabela do espelho de ponto para CSV/Excel com formatação e acentuação UTF-8',
        'Atalho rápido para centralizar a visualização no dia de hoje com efeito luminoso',
        'Otimização de impressão limpa da folha de ponto',
        'Ajustes nos micro-espaçamentos dos cartões de KPIs'
      ]
    },
    {
      version: '0.1.0',
      date: '2026-08-25',
      title: 'Versão Inicial de Modernização',
      features: [
        'Design System completo em Glassmorfismo Tátil (acrílico fosco e sombras 3D táteis)',
        'Efeito Glow Azul nos inputs, botões, filtros e na linha do dia atual',
        'Topbar Slim compacta com identificação do servidor e atalho de logout',
        'Dashboard com 4 KPIs: Previsão de Saída, Saldo do Banco, Horas no Mês e Saldo do Mês',
        'Command Palette com busca textual rápida em mais de 60 opções (Ctrl+K)',
        'Esquema de versionamento visível e interativo'
      ]
    }
  ];

  function openChangelogModal() {
    let overlay = document.getElementById('je-version-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'je-version-modal';
      overlay.className = 'je-modal-overlay';

      const changelogHtml = CHANGELOG.map((item) => `
        <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(226, 232, 240, 0.7); padding-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background: linear-gradient(135deg, #0056b3, #0077ff); color: #fff; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 999px;">v${item.version}</span>
              <strong style="font-size: 14px; color: #0a2540;">${item.title}</strong>
            </div>
            <span style="font-size: 11.5px; color: #64748b;">${item.date}</span>
          </div>
          <ul style="margin: 6px 0 0 18px; padding: 0; color: #334155; font-size: 13px; line-height: 1.6;">
            ${item.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      `).join('');

      overlay.innerHTML = `
        <div class="je-modal-content" style="max-width: 540px; padding: 0;">
          <div style="padding: 16px 20px; border-bottom: 1px solid rgba(226, 232, 240, 0.8); display: flex; justify-content: space-between; align-items: center; background: rgba(248, 250, 252, 0.8);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <h3 style="margin:0; font-size: 15px; font-weight: 700; color: #0a2540;">Histórico de Versões - TSE XT</h3>
            </div>
            <button id="je-version-modal-close" style="background: transparent !important; border: none !important; color: #64748b !important; font-size: 18px; cursor: pointer; padding: 4px 8px; box-shadow: none !important; height: auto !important;">✕</button>
          </div>
          <div style="padding: 20px; max-height: 420px; overflow-y: auto;">
            ${changelogHtml}
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });

      overlay.querySelector('#je-version-modal-close').addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }

    overlay.classList.add('active');
  }

  return {
    getVersion: () => CURRENT_VERSION,
    getChangelog: () => CHANGELOG,
    openChangelogModal
  };
})();
