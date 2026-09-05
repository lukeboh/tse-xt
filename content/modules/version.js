/**
 * TSE XT - Módulo Central de Versões e Changelog
 */

window.JEPessoasVersion = (function () {
  'use strict';

  const CURRENT_VERSION = '0.6.9';

  const CHANGELOG = [
    {
      version: '0.6.9',
      date: '2026-09-05',
      title: 'Fase 7 do roadmap de arquitetura visual — botão de busca genérico reconhece mais textos (SALVAR, CONFIRMAR, GRAVAR, ENVIAR, NOVO, PESQUISAR)',
      features: [
        'A tela de Atualização de dados cadastrais usa input[type="button"] com valor "SALVAR" em vez de "CONSULTAR"/type=submit — o botão de salvar ficava sem a modernização visual. modernizeGenericFormButtons() agora reconhece mais textos de ação primária (case-insensitive): SALVAR, PESQUISAR, CONFIRMAR, GRAVAR, ENVIAR, NOVO — sempre ações positivas, nunca Cancelar/Voltar/Excluir. Com esta correção, a varredura de cobertura de telas (roadmap F7) chega a ~30 telas do menu clássico do Meu Espaço sem nenhum código específico de página.'
      ]
    },
    {
      version: '0.6.8',
      date: '2026-09-05',
      title: 'Fase 7 do roadmap de arquitetura visual — corrigido crash silencioso que derrubava a montagem em telas com campo de formulário "id"',
      features: [
        'Corrigido o bug mais sério achado até agora na varredura de telas: em "Requerimento de AQ Treinamento" (e potencialmente qualquer tela com um <form> contendo um campo name="id"), a extensão lançava um erro interno (form.id retorna o próprio campo em vez do texto do id, por causa de como formulários expõem controles filhos como propriedades nomeadas) que derrubava a montagem — título, tabela, botão de busca, FAB e menu de serviços sumiam sem nenhum aviso. Corrigido em domModernizer.js e tableModernizer.js. Também corrigida a tela de confirmação por e-mail (2FA), que mostrava o nome do próprio usuário como se fosse o título da página. Mais 9 telas validadas ao vivo sem precisar de perfil dedicado, completando a cobertura de todo o menu clássico do Meu Espaço.'
      ]
    },
    {
      version: '0.6.7',
      date: '2026-09-05',
      title: 'Fase 7 do roadmap de arquitetura visual — mais 1 correção no título genérico e cobertura de mais 10 telas',
      features: [
        'Testadas ao vivo mais 10 telas (Alteração de dados dos dependentes, Homologação e Validade do banco de horas, Assistência farmacêutica, Trabalho Híbrido, Resumo Anual de Frequência, Autorização das liberações médicas, Gestão de Serviço Extraordinário, Declaração de Acumulação de Cargos, Carteira Funcional) — nenhuma precisou de código específico. Corrigido mais um caso do extrator de título: em "Validade do banco de horas" o primeiro <h2> da página é "Opções de pesquisa:" (rótulo da seção de filtro), não o título — o extrator agora ignora rótulos genéricos conhecidos antes de aceitar um heading como título. Confirmado um terceiro arquétipo de página no portal: o módulo /smvc/ (Carteira Funcional) é uma SPA à parte com login OAuth próprio, sem o shell clássico — a extensão corretamente não monta nada ali.'
      ]
    },
    {
      version: '0.6.6',
      date: '2026-09-05',
      title: 'Início da Fase 7 do roadmap de arquitetura visual — varredura de cobertura e 2 correções no título genérico',
      features: [
        'Testadas ao vivo 9 telas novas fora do Espelho de Ponto (Declaração de Nepotismo, Ficha Financeira, Afastamentos na equipe, Teletrabalho, Consulta Benefícios, Consulta situação dos servidores, Dados cadastrais, Solicitar Horas Extras/SAEX, Autorização de compensação de horas) — nenhuma precisou de código específico de página. Duas correções no extrator de título genérico: a categoria do breadcrumb agora também casa por substring quando o <h2> nativo é mais específico que o texto do link do menu (ex.: "Afastamentos na equipe" vs. link "Afastamentos"); e o título cai para <h3> quando a página não tem nenhum <h2> aproveitável (telas do SAEX usam só <h3>).'
      ]
    },
    {
      version: '0.6.5',
      date: '2026-09-05',
      title: 'Fases 5/6 do roadmap de arquitetura visual — botão de busca genérico completa o trio título+tabela+formulário',
      features: [
        'Novo modernizeGenericFormButtons() troca o botão de busca legado ("CONSULTAR" ou qualquer input[type=submit]) por um <button> moderno em qualquer tela do Meu Espaço, sem depender de função Struts nenhuma (o clique só reaproveita o botão original). modernizeCalendarIcons() e highlightUserAndManagerNames() — já genéricos, mas só rodavam no Espelho/Alteração de Ponto — agora rodam em qualquer página. Com isso os pilotos do Extrato do Banco de Horas e do Contracheque e Rendimentos (roadmap F5/F6) ficam validados: nenhuma das duas telas precisou de perfil de página dedicado, o caminho genérico (título, tabela, formulário) já cobre tudo.'
      ]
    },
    {
      version: '0.6.4',
      date: '2026-09-04',
      title: 'Fase 4 do roadmap de arquitetura visual — content.css dividido em design system × Espelho de Ponto',
      features: [
        'Reorganização interna, sem mudança visual: content.css (2247 linhas) ficou só com o design system reaproveitável em qualquer tela (tokens, reset, topbar, banner de título, drawer, busca rápida, ações rápidas, toggle, calendário, base da tabela modernizada); novo espelho-ponto.css (1983 linhas) recebeu tudo específico do Espelho/Alteração de Ponto (tabela h01-h17, KPIs, saldo acumulado, auditoria de horas perdidas). Verificado por script que nenhuma regra de CSS foi perdida no processo (o conjunto original de seletores é subconjunto exato do novo).'
      ]
    },
    {
      version: '0.6.3',
      date: '2026-09-04',
      title: 'Fase 3 do roadmap de arquitetura visual — modernizador genérico de tabela',
      features: [
        'Novo módulo tableModernizer.js decora qualquer tabela de resultados do Meu Espaço (fora do Espelho/Alteração de Ponto) sem depender de classes nativas: distingue tabela de dados de tabela de layout de formulário pela densidade de campos dentro das células, aplica zebra, alinha colunas numéricas/hh:mm à direita por análise do conteúdo, e transforma células com status isolados (Sim/Não, Homologado, Pendente, etc.) em badges coloridos usando as mesmas cores semânticas do resto da extensão. Validado ao vivo no Extrato do Banco de Horas (tabela nativa sem nenhuma classe) e sem nenhum efeito no Espelho de Ponto.'
      ]
    },
    {
      version: '0.6.2',
      date: '2026-09-04',
      title: 'Fase 2 do roadmap de arquitetura visual — título de página genérico',
      features: [
        'O banner de título (breadcrumb + h1 + pill de referência) deixou de ser hardcoded para o Espelho de Ponto: em qualquer outra tela, o título vem do <h2> nativo da própria página e a categoria do breadcrumb é inferida automaticamente a partir do menu de serviços (ex.: "Meu Espaço / Financeiro / Contracheque e Rendimentos", "Meu Espaço / Banco de Horas / Extrato do banco de horas"). A pill de referência (mês/ano) só aparece quando a página realmente tem esses filtros. Espelho de Ponto e Alteração de Ponto continuam com o texto de sempre. Validado ao vivo em 3 telas via CDP.'
      ]
    },
    {
      version: '0.6.1',
      date: '2026-09-04',
      title: 'Fase 1 do roadmap de arquitetura visual — casca do TSE XT chega às demais telas do Meu Espaço',
      features: [
        'A injeção da extensão deixou de ficar restrita ao Espelho de Ponto e à Alteração de Ponto: agora roda em qualquer tela autenticada do Meu Espaço (exceto login/logout). A topbar, o menu de serviços (drawer), a busca rápida (Ctrl+K), o FAB de ações e o toggle de tema já aparecem em todas as telas do menu — o título de página, o formulário e a modernização de tabela continuam exclusivos do Espelho/Alteração de Ponto até os próximos passos do roadmap (ver docs/roadmap-arquitetura-visual.md).'
      ]
    },
    {
      version: '0.6.0',
      date: '2026-09-04',
      title: 'Início da série 0.6.x — padronização da arquitetura CSS para expansão às demais funcionalidades do Meu Espaço',
      features: [
        'Trabalho em andamento: revisão dos tokens, classes semânticas e componentes de estilo do TSE XT para replicação consistente nas demais telas do Meu Espaço (além do Espelho de Ponto).'
      ]
    },
    {
      version: '0.5.0',
      date: '2026-09-04',
      title: 'Série 0.4.x e 0.5.x consolidada — Auditoria de Horas Perdidas e novo painel de KPIs',
      features: [
        'Auditoria de Horas Perdidas: novo modal que varre o Espelho de Ponto desde 2009 e quantifica as horas adicionais que não viraram pecúnia nem banco de horas, em quatro categorias (Não Homologadas, excedente de dia útil absorvido, descarte de fim de semana/feriado e crédito aquém da fórmula) — cada categoria explicada em linguagem clara, com link para a norma, marca "valor exato" vs "estimativa", gráfico de barras cronológico (nas cores institucionais do TSE XT), ordenação por coluna e clique na linha para abrir o mês. Meses de regime híbrido/teletrabalho não contam como perda (a norma suprime o serviço extraordinário nesse regime). Resultado persistido por matrícula, com atualização incremental (Full Update refaz tudo).',
        'Painel de KPIs reorganizado para planejamento do mês, em 5 fases: Saída de Hoje (funde a previsão diária com "sair X mais cedo/compensar +X" pra zerar o mês), Saldo do Mês (número único devedor/credor, líquido de pecúnia, com mini-planejador "planejar ›" — quanto fazer por dia útil para zerar), Banco de Horas (saldo atual + o que o mês tende a adicionar ou consumir), Hora Extra em Pecúnia (Semana/Sábado +50% e Domingo/Feriado +100%, com fração feito/autorizado e barra) e Meta do Mês (jornada ordinária). A hora extra autorizada é lida direto do SAEX (backend do ícone de relógio de cada dia, deduplicado e classificado por bloco) — sem digitação manual.',
        'Conformidade normativa (R3–R6): jornada diária automática 7h (turno único) / 8h (com 2ª entrada) / 5h (recesso de janeiro e julho de ano não eleitoral); reconhecimento do mês com hora extra autorizada (Portaria 380/2026 art. 13 — consumo do banco vedado, aquisição preservada); selos de teto legal ("> 2h" dia útil / "> 10h" fim de semana, art. 4º) na tabela; e no dia corrente (antes de a coluna oficial "HORAS EXCED." rodar à noite) o saldo é projetado a partir do TOTAL, com selo "TSE XT" na cor institucional.',
        'Identidade visual: paleta de alerta em amarelo e erro em rosa (substituindo âmbar/vermelho) propagada por toda a interface; preferências de aparência (preenchimento Clássico/Gradiente, destaque Suave/Glow azul) movidas para a janela da extensão; glow azul animado nos KPIs em destaque e em qualquer componente com foco/seleção (respeitando prefers-reduced-motion); carregamento sem flash do layout nativo (página só é revelada após a modernização completa).',
        'Robustez: corrigidas corridas de carregamento em aba de segundo plano (leituras via innerText retornavam em branco e contaminavam o cache) que deixavam a tabela pela metade, o saldo acumulado zerado ou o autorizado do SAEX sem aparecer — todas as leituras críticas passaram a textContent, com revalidação ao voltar o foco/visibilidade da aba.',
        'Revisões de produto: o selo diário "sem autorização" foi removido (o excedente sem SAEX vinculado ainda pode virar banco por homologação ativa da chefia — não é perda garantida; quem responde isso com precisão é a Auditoria); e o editor manual de hora extra autorizada foi removido em favor da leitura exclusiva do SAEX, já que não existe opção do servidor definir a própria meta.'
      ]
    },
    {
      version: '0.3.0',
      date: '2026-09-01',
      title: 'Série 0.3.x consolidada',
      features: [
        'Cálculo de saldo unificado: multiplicadores de fim de semana e feriado (+50% sábado, +100% domingo/feriado) e módulo balanceCalc.js como fonte única compartilhada entre a coluna SALDO ACUM. e o card de KPI.',
        'Suporte a meses fechados/homologados: a coluna nativa h10 passa de HORAS EXCED. para HORAS AJUST.; o saldo do dia útil passa a ser TOTAL menos a jornada esperada (7h/8h), com guarda de dispensa (licença, férias, viagem, abono integral).',
        'Coluna auxiliar HORAS EXCED. injetada em meses fechados, com a mesma formatação de cor da coluna SALDO ACUM. (verde/vermelho/neutro).',
        'Card Horas Extras soma a pecúnia (horas a pagar) por tipo de dia; o card Saída Expediente só exibe o tempo restante quando o mês visualizado contém o dia atual.',
        'Ajuste de ponto inline via modal, integrado às actions Struts para inclusão e exclusão de marcações, disponível apenas quando se visualiza o ponto de outra pessoa (visão de chefia).',
        'Suporte à tela Alteração de Ponto (EspelhoPontoDiaAction), menu drawer com expansão por hover, calendário glassmorphic e modernização dos ícones de hora extra autorizada.',
        'Robustez de carregamento: execução em document_start, montagem atômica do topo em um único requestAnimationFrame, supressão do FOUC e blindagem de endpoints Struts.',
        'Refinamento visual: data atual glassmorphic, chips de ocorrência, desfoque suave de modais, pílula de referência, espaçamentos verticais padronizados em 16px e correção da lupa do campo de busca.',
        'Aviso de aplicação experimental exibido no primeiro carregamento e a cada atualização de versão.'
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

  // ---------------------------------------------------------------------------
  // Aviso de aplicação experimental — exibido no 1º carregamento e a cada
  // atualização de versão (guarda a última versão reconhecida em chrome.storage).
  // ---------------------------------------------------------------------------
  const DISCLAIMER_ACK_KEY = 'je_xt_disclaimer_ack_version';
  let disclaimerChecked = false;

  function showDisclaimerModal() {
    let overlay = document.getElementById('je-disclaimer-modal');
    if (overlay) {
      overlay.classList.add('active');
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'je-disclaimer-modal';
    overlay.className = 'je-modal-overlay';
    overlay.innerHTML = `
      <div class="je-modal-content" style="max-width: 460px; padding: 0;">
        <div style="padding: 16px 20px; border-bottom: 1px solid rgba(226, 232, 240, 0.8); display: flex; align-items: center; gap: 8px; background: rgba(248, 250, 252, 0.85);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0a2540;">TSE XT — Aplicação Experimental</h3>
        </div>
        <div style="padding: 20px; font-size: 13.5px; line-height: 1.65; color: #334155;">
          <p style="margin: 0 0 12px;">O <strong>TSE XT</strong> é uma aplicação <strong>experimental</strong>, com o único objetivo de melhorar a experiência do usuário no controle do ponto.</p>
          <p style="margin: 0 0 12px;">Pode conter erros.</p>
          <p style="margin: 0;"><strong>Não representa nenhuma garantia</strong> de aquisição de bancos de horas, pecúnias ou outros direitos relativos ao cumprimento da jornada de trabalho.</p>
        </div>
        <div style="padding: 14px 20px 18px; display: flex; justify-content: flex-end;">
          <button id="je-disclaimer-ok" style="background: linear-gradient(135deg, #0056b3, #0077ff) !important; color: #fff !important; border: none !important; font-weight: 700; font-size: 13px; padding: 8px 20px; border-radius: 8px; cursor: pointer; box-shadow: none !important; height: auto !important;">Entendi</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const acknowledge = () => {
      overlay.classList.remove('active');
      try {
        chrome.storage?.local?.set({ [DISCLAIMER_ACK_KEY]: CURRENT_VERSION });
      } catch (e) {}
    };

    overlay.querySelector('#je-disclaimer-ok').addEventListener('click', acknowledge);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) acknowledge();
    });

    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  function maybeShowDisclaimer() {
    if (disclaimerChecked || !document.body) return;
    disclaimerChecked = true;
    try {
      chrome.storage.local.get({ [DISCLAIMER_ACK_KEY]: null }, (items) => {
        if (!items || items[DISCLAIMER_ACK_KEY] !== CURRENT_VERSION) {
          showDisclaimerModal();
        }
      });
    } catch (e) {
      showDisclaimerModal();
    }
  }

  return {
    getVersion: () => CURRENT_VERSION,
    getChangelog: () => CHANGELOG,
    openChangelogModal,
    maybeShowDisclaimer
  };
})();
