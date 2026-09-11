/**
 * TSE XT - Módulo Central de Versões e Changelog
 */

window.JEPessoasVersion = (function () {
  'use strict';

  const CURRENT_VERSION = '0.6.17';

  const CHANGELOG = [
    {
      version: '0.6.17',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: Resumo do Pedido mais largo, sem rótulos cinzas e contador na cor da marca',
      features: [
        'Coluna lateral do Resumo do Pedido de Reembolso mais larga (280-360px -> 320-460px), e a tabela interna passa a ocupar a largura toda do card (era width:auto, pensado pra painel de filtro solto — aqui sobrava espaço morto e o campo de Observações ficava espremido).',
        'Rótulos "Valor referência para reembolso:" e "Observações:" não ficam mais cinzas: o portal tem uma regra nativa "th { background: #ccc }" sem !important em duas folhas de estilo, e a neutralização existente só cobria a 1ª linha de cada tabela (certo pra cabeçalho de resultado, onde só a 1ª linha tem <th> — errado nestas tabelas "rótulo: valor", onde toda linha tem um).',
        'Número do contador de caracteres das Observações usa a cor azul padrão do projeto (--je-primary) em vez do navy escuro de texto comum.'
      ]
    },
    {
      version: '0.6.16',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: instruções somem por inteiro, Resumo vira sidebar, contador nas Observações',
      features: [
        'Bloco de instruções agora some por inteiro por padrão (título "Informações..." incluso, não só a lista) — toggle próprio, fora do bloco, sempre visível. O Formulário para Novo Pedido sobe no lugar do espaço que o título ocupava.',
        'Resumo do Pedido de Reembolso vai para a lateral direita, ao lado do Formulário + Lista de Medicamentos, enquanto houver espaço — só desce pra baixo deles por responsividade (abaixo de ~900px de largura).',
        'Campo Observações do Resumo ganhou o mesmo contador dinâmico de caracteres do resto do TSE XT, no lugar do "(máx. 1000 caracteres)" estático — era um <input> comum, não um <textarea>, então o contador genérico (que só olha textarea) não pegava.'
      ]
    },
    {
      version: '0.6.15',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: correção definitiva do "Calcular Desconto" vazando',
      features: [
        'O white-space:normal do 0.6.14 ainda perdia: table.je-generic-data-table td.je-cell-actions tem 3 classes no seletor contra as 2 do meu (mesmo com mais tipos via combinador >), logo mais especificidade. Repetido com o mesmo peso de classes pra pelo menos empatar — no empate, quem carrega por último no manifest (este arquivo) vence.'
      ]
    },
    {
      version: '0.6.14',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: "Calcular Desconto" vazando pra coluna vizinha do grid',
      features: [
        'A célula do Valor Total Pago foi classificada .je-cell-actions pelo modernizador genérico de tabelas (a tabela do formulário inteiro é .je-generic-data-table) e herdou white-space:nowrap — bom numa coluna de ícone/ação estreita de tabela de resultados, ruim aqui: o link "Calcular Desconto" não quebrava linha e vazava por cima da coluna vizinha (Beneficiário) do grid.'
      ]
    },
    {
      version: '0.6.13',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: resultado da busca ao lado do campo em vez de embaixo',
      features: [
        'O <input> do Medicamento (e outros campos do formulário) também tem float:left nativo — sem neutralizar, o que vem depois (o resultado da busca, o link "Calcular Desconto") contornava o campo flutuante em vez de cair numa linha nova embaixo, ou vazava pra célula vizinha do grid.'
      ]
    },
    {
      version: '0.6.12',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: auto-busca do medicamento não disparava de verdade',
      features: [
        'A auto-busca (0.6.9) chamava window.pesquisaMedicamento() diretamente, mas essa função é da página, definida num <script> nativo — content script roda em mundo JS isolado por padrão, e a função simplesmente não existe nesse mundo (mesmo presente no mundo principal), então a checagem "typeof === function" sempre falhava, silenciosa. Corrigido clicando no próprio elemento nativo #lupa: o DOM é compartilhado entre os dois mundos, e seu onclick roda no mundo certo independente de quem disparou o clique.'
      ]
    },
    {
      version: '0.6.11',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: linha vazia reaparecendo e ícone da calculadora gigante',
      features: [
        'A linha "&nbsp;" de espaçamento nativa (sem função num grid com gap) voltava a aparecer: a regra genérica que transforma cada <tr> em item flex tinha mais classes no seletor (logo mais especificidade) que a regra de escondê-la, mesmo esta vindo depois no arquivo. Linhas especiais (Medicamento, espaçador, botão) agora são marcadas por classe via JS em vez de disputar especificidade com :has().',
        '#imgCalculadora ("Calcular Desconto") é um <input type="image"> sem width/height no HTML — sem tamanho reservado, ocupava ~196x294px em vez do ícone pequeno que o nome do arquivo (calculadora18px.jpg) promete.'
      ]
    },
    {
      version: '0.6.10',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: título das seções flutuando por cima do conteúdo',
      features: [
        'Os <h4> "Informações..." e "Formulário para Novo Pedido" têm float:left nativo (CSS antigo do portal) — sem neutralizar isso, o <div> pai colapsava pra altura 0 e o título ficava flutuando por cima do que vem depois em vez de empurrar o conteúdo pra baixo (o cabeçalho das instruções sumia atrás do card do formulário). Corrigido com float:none nos dois.'
      ]
    },
    {
      version: '0.6.9',
      date: '2026-09-11',
      title: 'Revisão de UX do cadastro de Reembolso Farmacêutico (Novo Pedido)',
      features: [
        'Bloco de instruções ("Leia as instruções antes de solicitar o reembolso") virou um acordeão fechado por padrão — o próprio sistema já valida as regras nele descritas, então o texto raramente precisa ficar aberto ocupando a tela; um clique reabre a qualquer momento.',
        'A busca de medicamento dispara sozinha enquanto o usuário digita (debounced, 800ms sem digitar e mínimo de 3 caracteres) — não precisa mais clicar na lupa.',
        'Clique em qualquer parte da linha da "Lista de Apresentações" seleciona o radio — antes só o próprio radio (um alvo minúsculo) respondia ao clique.',
        'Resultado da busca ganhou rolagem própria (cabeçalho fixo) em vez de esticar a página toda quando a lista passa de 15 itens.',
        'Formulário inteiro reorganizado num cartão com grid de campos responsivo (2-3 colunas conforme a largura da tela) em vez de uma tabela de 1 coluna só — o "tamanho satisfatório" deixa de depender de já ter pesquisado um medicamento. Radios do Beneficiário ganharam o mesmo estilo do resto do design system.'
      ]
    },
    {
      version: '0.6.8',
      date: '2026-09-11',
      title: 'Formulário de Novo Pedido (Reembolso Farmacêutico) não vira mais modal de detalhamento',
      features: [
        'A tela de cadastro (ReembolsoFarmaceuticoAction_registrarPedidoload) tinha o formulário inteiro sequestrado pro modal de "Detalhamento": .grupoTopicos é reaproveitado pelo portal tanto pro detalhe read-only de um pedido já existente quanto pra seções de um formulário ativo (o próprio formulário, e um resumo de totais dentro dele) — e ambos batiam na mesma regra "grupoTopicos = sempre visível, mostra em modal". Como havia 2 candidatos na mesma página, um sobrepunha o outro (o form principal ficava escondido igual antes de o módulo existir, só o resumo de totais aparecia, isolado, dentro do modal). Agora um .grupoTopicos com campo de entrada de dados de verdade (input/select/textarea, fora do botão Retornar) é tratado como formulário, não detalhe: fica no lugar, visível, sem virar modal.'
      ]
    },
    {
      version: '0.6.7',
      date: '2026-09-11',
      title: 'Header "MEDICAMENTO" também alinhado à direita no modal de detalhamento',
      features: [
        'O <th> "MEDICAMENTO" continuava centralizado mesmo depois do alinhamento à direita do 0.6.4: cada linha "rótulo: valor" desse detalhamento é a tr:first-child da própria mini-tabela, batendo numa regra genérica de cabeçalho de tabela de dados com mais especificidade que a regra de alinhamento do modal (0-2-4 contra 0-2-3, os dois !important). Acrescentadas variantes explícitas por classe de tabela (.je-generic-data-table/.je-filter-table-card/.je-modernized-table/.grid) pra vencer em todos os casos.'
      ]
    },
    {
      version: '0.6.6',
      date: '2026-09-11',
      title: 'X do modal de detalhamento não deixa mais página em branco',
      features: [
        'Telas onde o detalhamento é uma página própria (não anexada por AJAX à listagem, ex.: Reembolso Farmacêutico) tinham um botão "Retornar" que navega de volta de verdade — mas o X/Esc/clique-fora do modal só escondia o bloco de novo, sem navegar, deixando uma página em branco atrás do overlay fechado. Agora X/Esc/clique-fora detectam um botão "Retornar"/"Voltar" dentro do próprio detalhe e disparam a mesma navegação nativa. Onde o padrão é outro (grupoTopicos + .grupoBotoes "Fechar", a lista já viva por trás), nada muda — continua só escondendo.'
      ]
    },
    {
      version: '0.6.5',
      date: '2026-09-11',
      title: 'Modal de Detalhamento ainda mais larga (900px)',
      features: [
        'Nomes de servidor com 3-4 palavras (ex. "DORACY COSTA VIANNA EDINGTON") ainda quebravam em 2 linhas nos 820px do 0.6.3 — data/hora já cabiam numa linha só. Subiu pra 900px.'
      ]
    },
    {
      version: '0.6.4',
      date: '2026-09-11',
      title: 'Modal de Detalhamento: alinhamento original das tabelas + corrige regressão de abertura',
      features: [
        'Rótulo (th, ex. "MEDICAMENTO") volta a alinhar à direita e o valor (td, última coluna) à esquerda nas tabelas de detalhamento — como no layout original do portal; o th caía no center padrão do navegador.',
        'Corrigida regressão do fix do botão Fechar (0.6.1): em telas onde o detalhamento é acessado por navegação direta em vez de AJAX da listagem (Reembolso Farmacêutico), o bloco já chega do servidor com display:none inline — a blindagem contra reabertura em loop (que também usa display:none pra reconhecer "acabei de fechar") estava barrando a primeira abertura também. Agora só um marcador que a própria closeCurrent() grava é que impede reabrir; um display:none "de fábrica" continua abrindo normalmente.'
      ]
    },
    {
      version: '0.6.3',
      date: '2026-09-11',
      title: 'Modal de Detalhamento mais larga',
      features: [
        'Card do modal de detalhamento (Reembolso Farmacêutico e afins) passou de 640px para 820px de largura máxima — nomes de servidor e "dd/mm/aaaa - hh:mm:ss" quebravam linha à toa num card estreito demais pro conteúdo.'
      ]
    },
    {
      version: '0.6.2',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: follow-up do 0.6.1 — botões do filtro, lupa nativa e "Retornar" duplicado',
      features: [
        'Botões PESQUISAR/NOVO ainda desalinhados: causa diferente do CONSULTAR do Espelho (0.6.58) — aqui cada botão fica no seu próprio .campoPesquisa (coluna vertical), então quem manda é justify-content (não align-self). Sem rótulo, o botão ficava grudado no topo da coluna de 58px em vez de embaixo, na mesma faixa dos demais campos.',
        'Ícone de lupa da linha da tabela continuava nativo: o padrão de arquivo desta tela (img/lupa16x16.gif) não batia com a regex "detalhar" usada pra reconhecer o ícone — agora cobre também "lupa".',
        'Modal de detalhe: o table-layout: fixed do 0.6.1 piorou o problema que tentava resolver — com o <colgroup> nativo (248/""/208/148px) somando mais que a largura do modal, a coluna sem largura ficava espremida a quase zero e o texto virava uma letra por linha. Voltou pro layout automático (o padrão), que quebra no limite da palavra dentro do espaço real disponível.',
        '"Retornar" duplicado: o botão nativo, escondido via .je-legacy-btn-consultar, reaparecia porque vive dentro de uma <table class="je-filter-table-card"> própria (#tblBotoes) — e a regra genérica que força os controles de tabela-filtro a display:block (para inputs/selects de verdade) tinha especificidade maior que a regra que esconde o botão legado, e não tinha a mesma exclusão que as outras 3 regras parecidas já tinham.'
      ]
    },
    {
      version: '0.6.1',
      date: '2026-09-11',
      title: 'Reembolso Farmacêutico: modal de detalhe utilizável, mais status com badge e ícone de lupa padronizado',
      features: [
        'Modal de detalhamento tinha uma <li> por bloco tratada com grid de 2 colunas (rótulo/valor) genérico — mas aqui cada item é uma <table> inteira; a tabela não cabia na coluna e ficava praticamente invisível, empurrada pra fora do card. <li> com tabela agora fica em bloco normal de largura cheia, e a tabela usa table-layout: fixed (a largura fixa em px do <colgroup> nativo virava overflow em vez de proporção).',
        'Corrigido bug que impedia fechar esse mesmo modal: o botão Fechar/X escondia o bloco de detalhe via style.display, mas isVisibleDetail() tinha uma regra que considerava qualquer .grupoTopicos sempre visível, ignorando esse display:none — a primeira varredura do observer depois de fechar reabria o modal na hora.',
        'Badge de status: além de REPROVADO, agora ENCAMINHADO PARA PAGAMENTO, PAGO, EM ANÁLISE, AGUARDANDO DOCUMENTAÇÃO/HOMOLOGAÇÃO e afins também ganham o chip colorido (limite de tamanho da célula subiu de 24 para 40 caracteres — a checagem continua sendo por correspondência exata com a lista de status conhecidos, não por trecho de frase).',
        'Ícone de "ver detalhes" nas tabelas: era um olho (SVG de visibilidade); virou a mesma lupa (círculo + traço) usada no resto do TSE XT.'
      ]
    },
    {
      version: '0.6.0',
      date: '2026-09-11',
      title: 'Série 0.6.x consolidada — arquitetura CSS genérica chega a todas as telas do Meu Espaço',
      features: [
        'Rollout do design system para além do Espelho de Ponto: as ~30 telas do menu clássico do Meu Espaço passaram a herdar automaticamente topbar, menu de serviços, título de página, tabelas, formulários e botões modernizados — sem precisar de um perfil dedicado por tela (Fases 1 a 7 do roadmap de arquitetura visual, concluído). Cobre título de página genérico, modernizador genérico de tabela (com colunas de nome alinhadas à esquerda), reconhecimento de botão de ação por texto (CONSULTAR/PESQUISAR/SALVAR/CONFIRMAR/GRAVAR/ENVIAR/NOVO) e agrupamento de campo + rótulo + contador de caracteres.',
        'Espelho de Ponto: cabeçalho da tabela no mesmo padrão das demais telas (com tinta condicional pra não se fundir com a 1ª linha), "Totais:" alinhado à direita, espaçadores do resumo mais finos, fim do "buraco" branco nas últimas linhas; colunas SALDO ACUM. e HORAS EXCED. centralizadas e com tons de verde/vermelho translúcidos que preservam o zebrado e o realce de fim de semana/feriado por baixo (hover aprofunda a cor em vez de apagá-la); filtro de pesquisa alinhado à largura da tabela e botão CONSULTAR alinhado com os demais campos.',
        'Menu de Serviços (drawer): ícones de categoria trocados de emoji para o mesmo estilo de traço (SVG) do design system, lupa do campo de busca sem sobrepor o placeholder, autorrolagem suave até revelar a categoria aberta por inteiro, e nova preferência no popup da extensão pra escolher entre abrir só com o mouse em cima ou por clique.',
        'Varredura do subsistema SAEX (Devolução, Gestão de Serviço Extraordinário, Realizar Horas, Homologar, Trabalho Híbrido, Liberação Médica): botões de ação, combos e rótulos de filtro formatados e alinhados, tabelas que formatam mesmo vazias, ícones nativos (rostinho, +/-) trocados pelos do design system, calendários órfãos e botão duplicado corrigidos, checkboxes de periodicidade organizados dentro do card.',
        'Modais e diálogos: detalhamento de linha de tabela passou a abrir num modal central com desfoque de fundo (sem "piscar" o formato nativo antes de mover); diálogo nativo de mensagem (#mensagem) mais compacto, fecha corretamente ao clicar em FECHAR e não aparece mais vazio em toda página autenticada; botão CONFIRMAR fantasma do diálogo de sessão encerrada removido.',
        'Tela de login modernizada (glassmorfismo, glow, logos harmonizadas), com garantia explícita de que nenhuma tela muda visualmente com o TSE XT desligado.',
        'Robustez: correção de crash silencioso em telas com campo de formulário chamado "id", ajustes de breadcrumb por sobreposição de palavras, e recuperação total do código-fonte após perda do disco de trabalho em 10/09 — JavaScript extraído byte-a-byte da memória do Chrome ao vivo (CDP) e CSS reconstruído a partir do histórico de desenvolvimento, com os 50 testes automatizados voltando a passar.'
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
