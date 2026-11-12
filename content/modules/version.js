/**
 * TSE XT - Módulo Central de Versões e Changelog
 */

window.JEPessoasVersion = (function () {
  'use strict';

  const CURRENT_VERSION = '1.1.17-Snapshot';

  const CHANGELOG = [
    {
      version: '1.1.17-Snapshot',
      date: '2026-11-12',
      title: 'Reconhecimento Posterior em A4 retrato',
      features: [
        'A impressão do Relatório de Reconhecimento Posterior usa A4 retrato por padrão, para facilitar o encaminhamento.',
        'Os destinos das horas e a discriminação do Perdido ficam em tabelas separadas na impressão, preservando todos os valores e a fonte legível.',
        'Cabeçalhos, nomes e motivos podem quebrar linha no retrato. A mudança vale para os dois agrupamentos do relatório.'
      ]
    },
    {
      version: '1.1.16-Snapshot',
      date: '2026-11-12',
      title: 'Fim de semana cobre dias curtos antes de virar perda',
      features: [
        'Horas não pagas de sábado cobrem a falta restante de dias úteis com ×1,5; domingos e feriados, com ×2, inclusive acima de 10h. Só a sobra entra nas perdas.',
        'Espelho, Auditoria de Horas Perdidas e Reconhecimento Posterior usam a mesma conta. O tempo trabalhado usado na cobertura fica separado do equivalente com os fatores, inclusive no CSV e na impressão.',
        'A cobertura soma à coluna de controle SALDO ACUM., sem criar crédito no banco. Em 10/2026, o controle fecha em 00:00 e 07:03 deixam de ser classificadas como perdidas.',
        'Resultados salvos antes desta regra pedem recálculo. A Auditoria requer Full Update; o Reconhecimento Posterior requer gerar o relatório novamente.',
        'Jornada preservada: 7h em turno único, 8h com intervalo e o tratamento atual de recesso. Divergências entre débito calculado e Resíduo oficial ficam sinalizadas para conferência.',
        'Verificação: 192 testes passando, Full Update real de 215 meses e CSV/impressão conferidos nos dois agrupamentos do Reconhecimento Posterior.'
      ]
    },
    {
      version: '1.1.15-Snapshot',
      date: '2026-11-11',
      title: 'Reconhecimento Posterior com os nomes do Espelho',
      features: [
        'O Relatório de Reconhecimento Posterior usa os mesmos nomes do Espelho de Ponto: Excedente, Compensou dias curtos, Pago, Banco e Perdido, na ordem da linha "Destino do mês", e os mesmos selos para os motivos.',
        'Cada coluna explica o que mostra ao passar o mouse no título, e a seção "O que cada coluna mostra" repete as explicações na tela e na versão para impressão.',
        'Novo agrupamento mês → servidor, ao lado de servidor → mês. A escolha vale para a tabela, o CSV e a versão para impressão.'
      ]
    },
    {
      version: '1.1.14-Snapshot',
      date: '2026-11-11',
      title: 'Relatórios sem limite de meses, com previsão de término',
      features: [
        'A Auditoria de Pagamento de Pecúnias e o Relatório de Reconhecimento Posterior não limitam mais o período: a escolha é sua, e quanto maior o período, mais demorada a consulta.',
        'A barra de progresso da Auditoria de Pagamento acompanha a varredura inteira (espelhos e contracheques), sem recomeçar a cada etapa.',
        'Os três relatórios (Reconhecimento Posterior, Pagamento de Pecúnias e Horas Perdidas) mostram quanto falta e a hora prevista de término.'
      ]
    },
    {
      version: '1.1.13-Snapshot',
      date: '2026-11-11',
      title: 'Nome do servidor nos relatórios',
      features: [
        'A versão para impressão do Relatório de Reconhecimento Posterior volta a mostrar quem emitiu o relatório.',
        'A versão para impressão da Auditoria de Pagamento de Pecúnias volta a mostrar o nome do servidor ao lado da matrícula.',
        'A Auditoria de Horas Perdidas identifica o servidor logado também nas telas sem a lista de servidores.'
      ]
    },
    {
      version: '1.1.12-Snapshot',
      date: '2026-11-11',
      title: 'Auditoria de Pagamento de Pecúnias',
      features: [
        'Nova auditoria, no botão de ações rápidas e na busca: confere se as horas de pecúnia do espelho de cada mês aparecem nos seus contracheques.',
        'Compara por faixa (dia útil, sábado, domingo e feriado) e pelo mês de referência de cada rubrica, em todas as folhas, inclusive suplementares.',
        'Aponta mês pago a menor, não localizado ou pago a maior, e pagamento sem horas correspondentes no espelho.',
        'Confere o adicional noturno sobre o serviço extraordinário e mostra o valor da hora-base embutido nos pagamentos.',
        'Detalhe dos lançamentos por mês, exportação em CSV e versão para impressão, para apoiar um pedido de revisão.'
      ]
    },
    {
      version: '1.1.11-Snapshot',
      date: '2026-11-11',
      title: 'Relatório de Reconhecimento Posterior',
      features: [
        'Novo relatório para a chefia, no botão de ações rápidas e na busca: horas feitas além da jornada e horas pagas em pecúnia, por servidor da equipe.',
        'Mostra o que ficou a reconhecer nas duas saídas: pecúnia com acréscimo de 50% ou 100%, ou crédito em banco de horas.',
        'Detalhe por mês e por dia, exportação em CSV e versão para impressão, para anexar ao pedido.',
        'Só mês fechado e fora do regime híbrido entra nos totais. Mês aberto e mês híbrido aparecem com selo, fora da soma.'
      ]
    },
    {
      version: '1.1.10-Snapshot',
      date: '2026-11-10',
      title: 'Coluna de controle dia a dia em mês fechado',
      features: [
        'SALDO ACUM. em mês fechado volta a mostrar a conta do mês dia a dia: soma o excedente de dia útil, desconta dia curto e o que foi pago.',
        'Nova linha Destino do mês abaixo dos totais: excedente, compensado, pago, banco, perdido e débito.',
        'A linha avisa quando a conta do mês não fecha, em Não conciliado. O card de KPI continua com o crédito oficial do banco.'
      ]
    },
    {
      version: '1.1.9-Snapshot',
      date: '2026-11-10',
      title: 'Roadmap: alerta de repouso cancelado e conciliação SAEX',
      features: [
        'Sem mudança de comportamento: esta versão só atualiza a documentação.',
        'Item C8 cancelado: o alerta de repouso abaixo de 8h só dispararia por batida logo após a meia-noite.',
        'Documentada a conciliação com o Relatório SAEX: horas realizadas iguais à pecúnia mais adicional noturno em 30 de 31 meses.'
      ]
    },
    {
      version: '1.1.8-Snapshot',
      date: '2026-11-10',
      title: 'Horas perdidas: selo em mês híbrido',
      features: [
        'Mês com trabalho híbrido passa a mostrar o selo "Híbrido: descartado" no sábado, domingo ou feriado trabalhado e não pago.',
        'O selo é informativo: o mês híbrido continua sem as colunas do TSE XT e sem contar como perda.',
        'Documentado o cruzamento dos dias a conferir com o limite autorizado no SAEX.'
      ]
    },
    {
      version: '1.1.7-Snapshot',
      date: '2026-11-10',
      title: 'Horas perdidas: onde cada hora se perdeu',
      features: [
        'Coluna HORAS PERDIDAS em mês fechado mostra tudo o que não virou pecúnia, banco nem compensação do mês, com o motivo no tooltip.',
        'Selos na coluna Ocorrência indicam o motivo da perda; "Não paga: conferir" aponta dia com autorização e horas sem destino, candidato a pedido de correção.',
        'Auditoria: nova categoria P5 (fim de semana e feriado sem destino), coluna Conferir, exportação no CSV e mês aberto fora da apuração. É preciso refazer a varredura uma vez.',
        'Corrigida a leitura de liberação médica em faixa de horário, que tratava como dispensado um dia só parcialmente liberado.',
        'Afastamento, abono de ponto, doação de sangue e greve deixam de contar como falta na apuração.'
      ]
    },
    {
      version: '1.1.6-Snapshot',
      date: '2026-11-10',
      title: 'Regras: revisão do histórico de horas',
      features: [
        'Sem mudança de comportamento: esta versão só atualiza a documentação.',
        'Novo capítulo com o destino de cada hora, verificado em 213 meses fechados: o excedente acima de 2h em dia útil compensa dia curto do mês.',
        'Registradas as linhas "Excedeu" do rodapé e quatro dúvidas novas: vencimento do banco, saldo negativo, crédito sem homologação e jornada de 8h.'
      ]
    },
    {
      version: '1.1.5-Snapshot',
      date: '2026-11-10',
      title: 'Roadmap: decisões sobre plantão/eleição e selo SAEX',
      features: [
        'Sem mudança de comportamento: esta versão só atualiza o planejamento.',
        'Item C7 cancelado: não haverá regra por dia de eleição ou plantão, e o fator ×2 segue valendo para domingo e feriado.',
        'Item C6 adiado: o selo de excedente além do autorizado fica registrado para retomada futura.'
      ]
    },
    {
      version: '1.1.4-Snapshot',
      date: '2026-11-10',
      title: 'Roadmap: situação real dos itens da Trilha C',
      features: [
        'Sem mudança de comportamento na extensão: esta versão só atualiza a documentação.',
        'C2 registrado como entregue na série 0.6.x; C4, C5 e C9 como parciais; C3, C6, C7, C8 e C10 como pendentes.',
        'O roadmap passa a listar o que falta em cada item de conformidade e as dúvidas normativas de que ele depende.'
      ]
    },
    {
      version: '1.1.3-Snapshot',
      date: '2026-11-10',
      title: 'Conformidade normativa (C1): Saldo Acumulado só com horas homologadas e coluna HORAS PERDIDAS',
      features: [
        'Item C1 — Saldo Acumulado fiel ao Extrato: em mês fechado, a coluna SALDO ACUM. e o card de KPI creditam só a parcela de "Horas Excedentes Homologadas" do rodapé, com fator por tipo de dia. Meses pagos em pecúnia ou sem homologação fecham em 00:00, sem inflar o banco com finais de semana.',
        'Nova coluna HORAS PERDIDAS, à direita de Compl. Jorn. Mínima: tempo acima do teto de 10h em sábado, domingo ou feriado (Res. 22.901/2008 art. 4º), que não gera pecúnia nem banco.',
        'O teto de 10h em sábado, domingo e feriado passa a limitar também o crédito no banco de horas. O excedente de dia útil acima de 2h continua na reconciliação do mês.',
        'Selo +25% nas colunas de adicional noturno e totais de adicional noturno e de Compl. Jorn. Mínima no rodapé da tabela.'
      ]
    },
    {
      version: '1.1.2-Snapshot',
      date: '2026-10-13',
      title: 'Ajuste fino visual do cabeçalho sticky: eliminação de borda superior e vedação contra vazamentos',
      features: [
        'Eliminação da Borda Superior: remoção da linha cinza externa no topo do cabeçalho da tabela de frequência em repouso, preservando visual limpo integrado.',
        'Vedação Hermética no Scroll: eliminação de frestas verticais no topo e remoção de transparências nos cantos superiores do cabeçalho fixado, impedindo que linhas de dados ou avisos da página vazem por trás durante a rolagem.',
        'Sombra Superior Estanque: aplicação de cobertura superior nas células cinzas e azuis mantendo vedação contínua mesmo sob subpixel scrolling do navegador.'
      ]
    },
    {
      version: '1.1.1-Snapshot',
      date: '2026-10-13',
      title: 'Fixação (sticky) do cabeçalho da tabela do Espelho de Ponto preservando o design system',
      features: [
        'Cabeçalho Sticky Fiel ao Design Original: a linha de títulos da tabela de frequência permanece fixada no topo da tela durante a rolagem, mantendo os cantos arredondados, fundo cinza característico e sem distorção visual.',
        'Refinamento do container de frequência: border-collapse e border-spacing calibrados para sticky sem necessidade de overflow clipping agressivo.',
        'Recarregamento e bump de versão integrados ao ciclo de desenvolvimento.'
      ]
    },
    {
      version: '1.1.0-Snapshot',
      date: '2026-09-30',
      title: 'Série 1.1.x — Ajuste de ponto de subordinados para chefias e destaque de horas extras em pecúnia',
      features: [
        'Ajuste de Ponto de Subordinados: chefias imediatas agora podem consultar o espelho de ponto de integrantes da unidade e registrar ajustes diretamente pela tabela (botão ⚡ Ajustar Ponto), com pré-carregamento automático da matrícula do subordinado e da data selecionada no modal do TSE XT.',
        'Destaque de Horas Extras em Pecúnia: identificação e realce visual com badges específicos para horas extras pagas em pecúnia (+50% para dias úteis/sábados em azul e +100% para domingos/feriados em roxo), além de totalizador mensal dedicado na linha de totais.',
        'Correções de robustez: proteção rigorosa de idempotência na renderização de células de pecúnia contra corrupção em recálculos sucessivos e validação precisa de permissões de chefia evitando falsos positivos.'
      ]
    },
    {
      version: '1.0.0',
      date: '2026-09-23',
      title: 'Marco 1.0 — Série 0.7.x consolidada: todo o Meu Espaço modernizado, Boot Splash no login e primeira versão pública na Chrome Web Store',
      features: [
        'Marco 1.0: o TSE XT cobre todo o portal Meu Espaço — as ~30 telas do menu clássico herdam automaticamente o design system (glassmorfismo, tabelas com zebrado e alinhamento numérico, botões semânticos, formulários responsivos), com camadas dedicadas para Espelho de Ponto, Reembolso Farmacêutico e Gestão de Serviço Extraordinário.',
        'Boot Splash no login: tela azul institucional (#0a2540) com glow e o logo oficial cobre a transição nos dois métodos de logon (Matrícula/Senha e Acesso Extranet/SSO) e se dissolve ao revelar a página montada. Só aparece no logon inicial, é ativado no beforeunload (nunca cobre um hCaptcha ainda em verificação), é pré-criado no document_start (o ícone já está carregado quando precisa aparecer) e mantém a mesma legenda entre a página de login e a seguinte (sem "pulo" nem duas splashes). O título aparecia como "XTTSE" por herdar a regra global `span { float: left }` do portal — corrigido.',
        'Correção crítica: a tela de login/captcha podia travar a aba por minutos a 100% de CPU — o observador que remonta a extensão (`checkStaleAndRetry`) reexecutava toda a montagem a cada mutação de DOM do hCaptcha, porque a tela de login nunca tem topbar. A tela de login agora sai cedo, como a TSE XT desligada.',
        'Espelho de Ponto: colunas desalinhadas ao logar pelo "Entrar" (botão de hora extra caindo sobre a coluna Ocorrência) e KPI de Hora Extra zerado — ambos por `.innerText` vazio com a aba em segundo plano. Leituras trocadas por `textContent` em domModernizer, authorizationScan e kpiExtractor.',
        'Command Palette (Ctrl+K): a consulta ao Espelho de Ponto por mês voltou a funcionar.',
        'Reembolso Farmacêutico: busca de medicamento mais esperta — envia a 1ª palavra ao backend e refina localmente por dosagem/apresentação (ex.: "Exodus 15 mg"), preservando texto, foco e cursor após o recarregamento da lista.',
        'Licença MIT; README, Política de Privacidade e descrição da loja revisados para todo o Meu Espaço; aviso de aplicação experimental atualizado.',
        'Chrome Web Store: capturas e blocos promocionais regerados a partir da aplicação real (anonimizados), com ferramentas em tools/loja/ e roteiro de liberação em docs/roteiro-liberacao.md.'
      ]
    },
    {
      version: '0.7.0',
      date: '2026-09-17',
      title: 'Série 0.6.x consolidada — Reembolso Farmacêutico refeito, KPI de Gestão de Serviço Extraordinário e ajustes finos de conformidade',
      features: [
        'Reembolso Farmacêutico (Novo Pedido) reconstruído: formulário em cartão com grid de campos responsivo em vez de tabela de 1 coluna; busca de medicamento com auto-busca (debounced), filtro local por palavras extras e seleção pela linha inteira; bloco de instruções vira acordeão fechado por padrão; Observações em textarea que cresce até o fim do card; ícones (lupa, ajuda, calculadora) ao lado do campo em vez de embaixo; calculadora, antes um popup nativo cru, vira modal no padrão do TSE XT (lógica portada 1:1 pro mundo isolado, sem depender de script externo bloqueado pela CSP); botão "Calcular Desconto" e o ícone da calculadora unificados numa única ação. Resumo do Pedido vira sidebar sticky, mais largo, com layout que se adapta ao espaço que sobra do formulário (sem faixa em branco desperdiçada). Beneficiário reorganizado com rótulo sempre em cima do campo (radios e select), select de Nome do Beneficiário sempre visível (habilitado/desabilitado em vez de some/aparece) e ocupando a linha toda. Quantidade e Valor Total Pago lado a lado, alinhados. Diversas correções de vazamento de regras genéricas de outras telas (hover e zebrado de linha em tabelas "rótulo:valor", padding de célula solta, anel de foco em radios, cabeçalho de tabela) que causavam desalinhamentos, fundos azuis indevidos e textos em caixa alta onde não deveriam.',
        'Reembolso Farmacêutico (listagem e modal de detalhamento): modal mais largo (900px, cabe nomes e timestamps sem quebrar linha), rótulo/valor alinhados como no portal original, fecha corretamente (inclusive navegando "Retornar" quando o detalhe é página própria), mais status ganham selo colorido (aprovado, reprovado, em análise, pago, aguardando homologação/documentação etc.) e uma rede de segurança classifica como "em andamento" qualquer status futuro desconhecido na coluna Situação/Status.',
        'Gestão de Serviço Extraordinário: painel de KPI por servidor (barras de progresso Sábado/Domingo, autorizado vs. realizado, primeiro nome com desambiguação de homônimos), incluindo o mesmo indicador "(+HH:MM) horas que poderiam virar pecúnia" do Espelho de Ponto — buscado em segundo plano a partir do Espelho de cada servidor da unidade. Botão ATUALIZAR de verdade dentro do card de filtro, ícones nativos (inserir/cancelar/excluir/alterar) no traço do design system, título duplicado e filetes/fundos indevidos corrigidos.',
        'Espelho de Ponto / KPI Hora Extra Pecúnia: indicador "(+HH:MM)" de excedente que só aparece ao atingir 100% do autorizado (evita alarme falso), respeitando o teto legal diário de horas pagáveis em pecúnia (2h dia útil / 10h fim de semana e feriado — Res. 22.901/2008 art. 4º); corrige contagem duplicada de autorização quando o SAEX atribui números distintos ao mesmo período; modal de Autorização de Hora Extra (antes popup nativo) reconstruído no padrão do TSE XT.',
        'Robustez e consistência: telas de login/sessão-encerrada sem formatação corrigidas (Login_encerrarSessaoMsgPersonalizada e redirecionamentos com URL de Espelho de Ponto na query string); corrigida lupa duplicada ao lado do ícone de relógio de Hora Extra; cores semânticas e raio de pílula (antes hex/px soltos em vários pontos) passam a referenciar os tokens já existentes do design system; script de depuração do Chrome não corrompe mais o perfil de extensões.'
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
              <span style="background: linear-gradient(135deg, #0056b3, #0077ff); color: #fff; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: var(--je-radius-full, 999px);">v${item.version}</span>
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
          <p style="margin: 0 0 12px;">O <strong>TSE XT</strong> é uma aplicação <strong>experimental</strong>, com o único objetivo de melhorar a experiência do usuário no portal <strong>Meu Espaço</strong> (controle de ponto, Reembolso Farmacêutico, Gestão de Serviço Extraordinário e demais serviços).</p>
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
