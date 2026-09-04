/**
 * TSE XT - Módulo Central de Versões e Changelog
 */

window.JEPessoasVersion = (function () {
  'use strict';

  const CURRENT_VERSION = '0.5.17';

  const CHANGELOG = [
    {
      version: '0.5.17',
      date: '2026-09-04',
      title: 'Ajustes do card Hora Extra: ícone e barras por bloco',
      features: [
        'O ícone de $ (que substituiu a engrenagem) agora usa a mesma caixinha colorida dos ícones dos demais KPIs, em vez de aparecer sem estilo.',
        'Cada bloco (Semana/Sábado e Domingo/Feriado) ganhou sua própria barra de progresso — antes só uma aparecia quando faltava autorização do SAEX pro outro bloco. As três barras do card (2 blocos + "Executado") passam a usar o mesmo estilo das demais barras de KPI: 6px, trilho translúcido, preenchimento em gradiente com transição suave.'
      ]
    },
    {
      version: '0.5.16',
      date: '2026-09-04',
      title: 'Hora Extra: autorizado só do SAEX, sem ajuste manual',
      features: [
        'Removida a engrenagem do card "Hora Extra (Pecúnia)" que permitia digitar a hora extra autorizada — não existe essa opção para o servidor definir a própria meta; o que o SAEX registrar é o que vale. No lugar, um ícone de $ estático (com dica explicando a fonte).',
        'Cada bloco (Semana/Sábado, Domingo/Feriado) agora mostra feito/autorizado como fração — ex. "07:59/07:59" — com uma barra de progresso proporcional logo abaixo, em vez das linhas separadas de autorizado/aberto.',
        'Rodapé do card reescrito: "Executado: HH:MM / Xh Autorizadas (Teto 60h/mês)" com sua própria barra proporcional; sem autorizado do SAEX, cai para "Executado: HH:MM (Teto 60h/mês: resta HH:MM)".',
        'O módulo heAuthEditor.js (editor manual) foi removido; heAuthFetch.js (leitura do SAEX) passa a ser a única fonte da hora extra autorizada do KPI.'
      ]
    },
    {
      version: '0.5.15',
      date: '2026-09-04',
      title: 'Reforço: modernização também se recupera com a aba em 2º plano',
      features: [
        'Identificada a causa raiz exata da corrida da v0.5.14: o navegador não computa o texto renderizado (innerText) de uma aba em segundo plano, pra economizar recurso — se o TSE XT monta nesse instante, a leitura de data/cabeçalho da tabela encontra tudo em branco.',
        'Além do observador de mutações e das verificações ativas nos primeiros segundos, agora a modernização também é reavaliada quando a aba volta a ficar visível (visibilitychange) ou a janela ganha foco — o momento exato em que a leitura volta a ser confiável.'
      ]
    },
    {
      version: '0.5.14',
      date: '2026-09-04',
      title: 'Correção: corrida rara deixava a tabela pela metade',
      features: [
        'Identificada e corrigida a causa real de "saldo acumulado sempre zerado" e "coluna HORAS EXCED. sumiu em meses fechados": em alguns carregamentos, o TSE XT terminava de montar (criar a topbar e os KPIs) antes de o portal acabar de preencher as linhas da tabela. O cabeçalho sintético "SALDO ACUM." chegava a ser criado, mas nenhuma célula de dado — e como a barra de KPIs já existia, a verificação que existia pra detectar tabela desatualizada nunca disparava de novo, deixando a modernização travada pela metade.',
        'Esse mesmo travamento também podia deixar colunas nativas seguintes desalinhadas — o botão de hora extra (relógio), que é da coluna h17, passava a cair visualmente em cima da coluna Ocorrência.',
        'O observador que já existia pra detectar tabela recarregada via Ajax agora também detecta esse descompasso (linhas com data sem célula de saldo correspondente) e refaz a modernização automaticamente, com um limite de tentativas pra nunca entrar em loop.',
        'Verificado ao vivo: reproduzido o problema, aplicada a correção e confirmado — em carregamento normal, sem qualquer intervenção manual — que a coluna HORAS EXCED., o saldo acumulado (com valores reais, não mais zerados) e o botão de hora extra na coluna certa aparecem corretamente.'
      ]
    },
    {
      version: '0.5.13',
      date: '2026-09-04',
      title: 'Ajustes finos de aparência + correção importante no saldo do dia',
      features: [
        'Correção importante: a projeção de "HORAS EXCED." do dia corrente não era mais restaurada ao valor nativo antes de cada remontagem da tabela. Numa 2ª passagem (reabertura da Auditoria, atualização via Ajax etc.), o texto já sobrescrito era relido como se fosse o valor original, quebrava o cálculo de HH:MM e corrompia (em cascata) o saldo acumulado do resto do mês. Agora a célula é sempre restaurada ao nativo antes de reprocessar — a montagem volta a ser idempotente, como as demais.',
        'Removida a faixa colorida no topo dos cards de KPI — não estava agregando.',
        'Padrão do painel de KPIs: Glow azul ligado, preenchimento em gradiente desligado (continua ajustável na janela da extensão).',
        'Espaçamento consistente de 16px entre a topbar, o banner de título, a barra de KPIs e o conteúdo — um único gap no contêiner do cabeçalho, em vez de margens repetidas em cada peça.',
        'Os cabeçalhos de coluna em destaque (SALDO ACUM., HORAS EXCED. do TSE XT) passam a usar o mesmo degradê azul do botão Consultar, em vez do azul-marinho anterior.'
      ]
    },
    {
      version: '0.5.12',
      date: '2026-09-04',
      title: 'Glow animado em todo componente com foco ou seleção',
      features: [
        'A mesma respiração do "Glow azul" dos KPIs agora aparece em qualquer componente que ganha destaque por interação: campos e selects em foco (formulário de pesquisa, pesquisar no topo, drawer de serviços, motivo do ajuste de ponto, campos dos modais), botões com foco de teclado (Consultar, FAB, "Salvar"/"Concluir" dos modais), item ativo na navegação por setas da paleta de comandos, dia selecionado/atual do calendário, e a linha selecionada por teclado na Auditoria de Horas Perdidas.',
        'Só entra em ação em foco de teclado/seleção — passar o mouse continua com a resposta instantânea de sempre, sem animação, pra não ficar "piscando" ao rolar o cursor pela tela.',
        'Respeita prefers-reduced-motion: quem pede menos movimento no sistema operacional vê um brilho estático em vez de pulsar.'
      ]
    },
    {
      version: '0.5.11',
      date: '2026-09-04',
      title: 'Correção: tag "TSE XT" na célula de HORAS EXCED. do dia',
      features: [
        'Alinhamento vertical: a tag "TSE XT" ao lado do valor projetado (célula do dia corrente, antes de a coluna oficial rodar à noite) agora usa flexbox para centralizar de verdade — antes dependia de vertical-align, que desalinhava por causa da diferença de tamanho entre o valor e o selo.',
        'Correção mais importante: essa célula é nativa do portal (não uma coluna criada pelo TSE XT), e seu conteúdo estava sendo sobrescrito incondicionalmente — a projeção e a tag apareciam mesmo com o TSE XT desligado (ao carregar a página já desabilitado, ou ao desligar o interruptor sem recarregar). Agora a célula guarda os dois conteúdos (o nativo e a projeção) e só o CSS troca qual aparece, conforme o tema está ativo — igual ao resto do app.'
      ]
    },
    {
      version: '0.5.10',
      date: '2026-09-04',
      title: 'Glow azul animado nos KPIs em destaque',
      features: [
        'A opção "Glow azul" (janela da extensão → Destaque dos cards) agora respira: um halo animado pulsa suavemente em torno do card, num ciclo de ~3,2s, em vez de um brilho estático.',
        'Os 5 cards pulsam em leve cascata (delay crescente entre eles) em vez de todos juntos — evita o efeito "pisca-pisca" sincronizado.',
        'Passar o mouse acelera e intensifica a respiração do card, reforçando a resposta ao cursor. O halo é um elemento separado do box-shadow tátil do card, então a transição do hover continua suave.',
        'Respeita "menos movimento" do sistema operacional (prefers-reduced-motion): quando ativo, o halo fica estático em vez de pulsar.'
      ]
    },
    {
      version: '0.5.9',
      date: '2026-09-04',
      title: 'Carregamento sem flash do layout nativo',
      features: [
        'Com o TSE XT ativo, a página inteira fica escondida (mas já sendo montada) desde antes do primeiro paint e só é revelada quando a topbar, o formulário e a tabela já estão totalmente modernizados — o usuário não chega mais a ver, nem por um instante, o layout nativo do portal antes da transformação.',
        'Válvula de segurança: se algo impedir a montagem (erro, página não suportada), a página é revelada em até ~1,2s, para nunca travar a tela do usuário numa tela em branco.',
        'Com o TSE XT desligado a página carrega normalmente, sem qualquer espera — a mudança só existe quando há uma transformação visual a esconder.'
      ]
    },
    {
      version: '0.5.8',
      date: '2026-09-04',
      title: 'Acabamento dos cards e preferências na janela da extensão',
      features: [
        'A faixa de acento no topo do card de KPI agora acompanha as quinas arredondadas — antes as pontas escapavam do card.',
        'As preferências de aparência (preenchimento Clássico/Gradiente e destaque Suave/Glow azul) saíram do ícone de engrenagem e passaram para a janela da extensão (popup), guardadas em chrome.storage e aplicadas na hora, mesmo com a página aberta.',
        'Janela da extensão enxuta: saiu a escolha de jornada 7h/8h (a detecção é automática por dia) e a lista de recursos que não era configuração. Ficaram as duas opções de aparência e o botão de atualizar a página.',
        'Card "Hora Extra (Pecúnia)": o rótulo "auth" virou "aut" (autorizado).'
      ]
    },
    {
      version: '0.5.7',
      date: '2026-09-03',
      title: 'Preferências de aparência do painel de KPIs',
      features: [
        'Nova engrenagem na barra superior abre "Aparência do painel de KPIs" com duas opções, aplicadas na hora e válidas em todas as telas do TSE XT.',
        'Preenchimento dos cards: "Clássico" (vidro translúcido, como antes) ou "Gradiente" (degradê azul → ciano da proposta de identidade visual).',
        'Destaque dos cards: "Suave" (sombra tátil atual) ou "Glow azul" (brilho azul mais profundo, sempre visível). As duas opções são independentes.',
        'As preferências ficam só neste navegador (localStorage je_xt_kpi_style / je_xt_kpi_emphasis) e são aplicadas antes da pintura, sem "flash". Módulo settings.js com testes (tests/settings.test.mjs).'
      ]
    },
    {
      version: '0.5.6',
      date: '2026-09-03',
      title: 'Identidade visual — alerta em amarelo, erro em rosa',
      features: [
        'Ajuste da paleta do TSE XT conforme a proposta de identidade visual: a cor de ALERTA deixa de ser âmbar e passa a amarelo (#facc15 / texto #a16207 / fundo rgba(250,204,21,0.12)); a cor de ERRO deixa de ser vermelho e passa a rosa (#ec4899 / texto #db2777 / fundo rgba(236,72,153,0.12)). Primária (#0056b3), primária clara (#0077ff), acento ciano (#00c6ff), sucesso e superfícies de vidro seguem iguais.',
        'A troca foi propagada por toda a interface: selos de ocorrência (sem autorização, acima do teto), células de saldo devedor/negativo, KPI Saldo do Mês (estado devedor), KPI Banco de Horas (débito), avisos da Auditoria de Horas Perdidas, botões de logout/exclusão, FAB ativo, modais de ajuste de ponto e o ícone do aviso experimental.',
        'Novos tokens --je-warning-accent / --je-danger-accent (tom vívido para ícones e barras) e --je-warning-glow / --je-danger-glow.'
      ]
    },
    {
      version: '0.5.5',
      date: '2026-09-03',
      title: 'Painel de KPIs — planejamento (Fases 1 a 5)',
      features: [
        'Novo painel de 5 KPIs voltado ao planejamento do mês: (1) Saída de Hoje — jornada de hoje + horário para zerar o mês na 2ª linha; (2) Saldo do Mês — número único devedor/credor, líquido de pecúnia e com a projeção de hoje; (3) Banco de Horas — saldo atual + o que o mês tende a adicionar (homologáveis) ou consumir; (4) Hora Extra (Pecúnia) — separada em Semana/Sábado (+50%) e Domingo/Feriado (+100%); (5) Meta do Mês — jornada ordinária.',
        'F2 — controle da hora extra autorizada: o ⚙ do card Hora Extra abre um editor com dois campos (semana/sábado e domingo/feriado), salvos neste navegador por matrícula e mês. Com os campos preenchidos, o card passa a mostrar autorizado / feito / aberto com barra de progresso e alerta quando o feito passa do autorizado.',
        'F3 — mini-planejador: o link "planejar ›" no card Saldo do Mês abre uma simulação — quanto fazer por dia útil para zerar o mês, e o fechamento projetado do mês para um esforço diário informado (aceita valor negativo para simular sair mais cedo).',
        'F5 — hora extra autorizada lida direto do SAEX: o TSE XT consulta as autorizações por trás do ícone de relógio de cada dia do mês, deduplica por número, classifica cada uma como Semana/Sábado ou Domingo/Feriado e soma as horas autorizadas. O card Hora Extra passa a mostrar autorizado / feito / aberto sem você digitar nada (selo "via SAEX"). O resultado é cacheado por mês; o ⚙ continua permitindo ajuste manual.',
        'kpiExtractor.deriveMonthPlan(), domModernizer.buildKpiCardsHTML(), monthPlanner.simulate() e heAuthFetch (parse/classify/aggregate das autorizações do SAEX): funções puras cobertas por testes (tests/, `npm test`).'
      ]
    },
    {
      version: '0.4.9',
      date: '2026-09-03',
      title: 'Série 0.4.x — Conformidade de banco de horas e Auditoria de Horas Perdidas',
      features: [
        'Auditoria: meses de regime híbrido/teletrabalho não contam mais como "horas perdidas" — a norma suprime o serviço extraordinário e veda o acúmulo de banco, então o trabalho extra é estrutural do regime, não perda de um direito. O total descartado fica no tooltip do selo "Híbrido" e no CSV.',
        'Auditoria de Horas Perdidas: as colunas da tabela agora ordenam ao clicar no cabeçalho (mês, regime, pecúnia, homologadas, P1–P4, perdido), e clicar numa linha já dispara a consulta do mês escolhido, sem precisar apertar CONSULTAR.',
        'Dia corrente: a coluna oficial "HORAS EXCED." só é processada à noite. Enquanto isso o TSE XT projeta o saldo do dia de hoje a partir do TOTAL (inclusive débito, quando você trabalhou menos que a jornada) e destaca a célula com selo "TSE XT" na cor institucional. Os KPIs "Saída p/ Zerar Mês" e a coluna SALDO ACUM. passam a considerar esse valor.',
        'Correção: os selos "sem autorização" e "> 2h/> 10h (art. 4º)" não duplicam mais quando a tabela é reprocessada; total de horas perdidas e selo do dia corrente na cor principal do TSE XT.',
        'Auditoria de Horas Perdidas: novo modal que varre o Espelho de Ponto desde 2009 e quantifica as horas adicionais que não viraram pecúnia nem banco de horas, em quatro categorias (Não Homologadas, excedente de dia útil absorvido, descarte de fim de semana/feriado e crédito aquém da fórmula). O resultado é persistido por matrícula; a tela abre sempre com o último resultado e atualiza só o delta, com barra de progresso e data da última varredura. Full Update refaz tudo.',
        'A tela da Auditoria explica cada categoria (P1–P4) em linguagem clara, com a origem de cada número, link para a norma que a fundamenta e marca "valor exato" vs "estimativa"; tem gráfico de barras cronológico das perdas por ano, tooltips completos nas colunas, e cada linha da tabela abre (com confirmação) o Espelho de Ponto do mês correspondente.',
        'R4 — jornada diária automática: 7h em turno único (1 entrada / 1 saída), 8h quando há 2ª entrada (intervalo de almoço), e 5h nos meses de recesso (janeiro; julho de ano não eleitoral — Portaria-TSE 885/2024). Fonte única em legalConfig.js, usada pelo cálculo de saldo, pelos KPIs e pela Auditoria. Selos "Recesso · jornada 5h" e "meta reduzida" nos cards.',
        'R3 — mês com hora extra autorizada reconhecido (Portaria 380/2026 art. 13, agora com link para a norma). O consumo do saldo é vedado (KPI "Saída p/ Zerar Mês" desativado), mas a aquisição continua — o card Banco de Horas mostra a prévia das horas homologadas.',
        'R5/R6 — selos na tabela: "sem autorização" e "> 2h / > 10h (art. 4º)" quando o excedente do dia passa do teto legal por jornada.',
        'Módulo legalConfig.js: constantes e regras de cálculo (jornadas, tetos de HE, fatores, repousos, ano eleitoral, mês de recesso) com norma, artigo e link.',
        'Robustez: a montagem da interface ganhou fallback por setTimeout além do requestAnimationFrame.'
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
