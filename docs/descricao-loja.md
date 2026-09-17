# Descrição da Chrome Web Store — TSE XT

> Fonte de verdade da descrição publicada na loja. Atualizar aqui a cada release relevante e copiar para o Developer Dashboard.
> Versão de referência: **1.0.0**

---

✨ TSE XT — Usabilidade Moderna para todo o Meu Espaço do TSE (Versão 1.0)

O TSE XT é uma extensão de produtividade desenvolvida para modernizar a interface visual e a usabilidade de **todo o portal Meu Espaço** do Tribunal Superior Eleitoral (TSE) — desde as telas de frequência (Espelho de Ponto Mensal e Alteração de Ponto) até as dezenas de telas do menu clássico, com painéis dedicados para Reembolso Farmacêutico e Gestão de Serviço Extraordinário.

Com design em Glassmorfismo Tátil, o TSE XT elimina telas em branco, calcula previsões de jornada em tempo real, audita saldos dia a dia e automatiza formulários complexos com total privacidade (100% no seu navegador).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PRINCIPAIS FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 1. BOOT SPLASH INSTANTÂNEO & TRANSIÇÃO SUAVE DE LOGIN
• Carregamento cinematográfico em azul institucional (#0a2540) com glow radiante e o logo oficial em alta definição.
• Resposta visual em 80ms: ao enviar credenciais ou clicar em "Acesso Extranet" (Keycloak/RH-SSO), o splash cobre a transição imediatamente, eliminando o clarão branco do anti-FOUC e telas intermediárias sem estilo.
• Dissolução suave (reveal): ao concluir a montagem dos componentes, o splash se dissolve suavemente (desfoque de 14px e leve zoom), revelando a página pronta para o trabalho.

🏢 2. MODERNIZAÇÃO AUTOMÁTICA DE TODO O MEU ESPAÇO
• Dezenas de telas do menu clássico (Assentamentos Funcionais, Carteira Funcional, Banco de Horas, Contracheque, Férias e muitas outras) ganham automaticamente o mesmo visual moderno: título dinâmico com breadcrumb temático, tabelas com zebrado inteligente, colunas numéricas alinhadas à direita e botões de ação semânticos (CONSULTAR, PESQUISAR, SALVAR, ENVIAR, NOVO).
• Ícones nativos pixelados são substituídos pelo mesmo traço elegante de linha do design system em qualquer tela onde aparecem.

📊 3. PAINEL DE 5 KPIS PARA PLANEJAR O MÊS (ESPELHO DE PONTO)
Tenha clareza instantânea sobre sua jornada de trabalho, sem precisar fazer contas manuais:
• ⏱️ Saída de Hoje: Previsão exata do horário de término da jornada diária (7h em turno único, 8h com intervalo de almoço, 5h no recesso), com o horário para zerar o saldo do mês saindo hoje.
• 💰 Saldo do Mês: Um número único, devedor ou credor, líquido de pecúnia e já com a projeção de hoje — com mini-planejador "planejar ›": quanto fazer por dia útil para zerar o mês, ou o fechamento projetado para um esforço diário informado.
• 🏦 Banco de Horas: Saldo homologado institucional, mais o que o mês tende a adicionar (horas homologáveis) ou consumir do banco — com aviso automático nos regimes de trabalho híbrido, hora extra autorizada (consumo vedado, art. 13 da Portaria 380/2026) e recesso.
• ⚡ Hora Extra (Pecúnia): Executado × Autorizado direto do SAEX, sem digitar nada, separado em "Semana/Sábado (+50%)" e "Domingo/Feriado (+100%)", com barra de progresso, teto legal de 60h/mês e indicador do excedente que poderia virar pecúnia caso a autorização fosse maior.
• 🎯 Meta do Mês: Acompanhamento em tempo real da jornada ordinária do mês com barra de progresso visual (gradiente esmeralda ao superar 100%).

🔎 4. AUDITORIA DE HORAS PERDIDAS (ESPELHO DE PONTO)
• Varre o Espelho de Ponto desde 2009 e quantifica, mês a mês, as horas trabalhadas que nunca viraram pecúnia nem banco de horas — separadas em quatro categorias explicadas em linguagem clara, cada uma com a origem do número e o artigo da norma que a fundamenta.
• Gráfico cronológico das perdas por ano, tabela ordenável por qualquer coluna e clique na linha para abrir o mês correspondente.
• Resultado persistido por matrícula: reabre com a última varredura e atualiza só o que mudou (ou refaça tudo com Full Update).
• Meses de trabalho híbrido/teletrabalho não entram como perda — a norma suprime o serviço extraordinário nesse regime, então o excedente é estrutural, não um direito perdido.

📈 5. COLUNAS ANALÍTICAS NA TABELA DE FREQUÊNCIA (ESPELHO DE PONTO)
• SALDO ACUM.: acompanhe a evolução dia a dia do seu saldo diretamente na tabela, com badges de acréscimo +50% (sábado) e +100% (domingo/feriado) e coloração imediata (verde para crédito, rosa para débito, neutro para zero).
• HORAS EXCED. (meses fechados): quando o mês é homologado e a coluna nativa passa a se chamar "HORAS AJUST.", o TSE XT injeta uma coluna própria com o saldo líquido real de cada dia (total trabalhado − jornada esperada), mantendo a leitura consistente com os meses abertos.
• Dia corrente: antes de a coluna oficial "HORAS EXCED." ser processada à noite, o TSE XT já projeta o saldo do dia a partir do total trabalhado, com selo próprio.
• Cálculo rigoroso que desconsidera valores já pagos em Pecúnia, garantindo que horas indenizadas não distorçam o saldo a compensar.
• Detecção automática de regime e de jornada (7h/8h/5h no recesso), com selos de teto legal de hora extra por dia (art. 4º) diretamente na tabela.

📝 6. AJUSTE DE PONTO INLINE E AUTORIZAÇÃO DE HORA EXTRA (ESPELHO DE PONTO)
• Formulário modal glassmorphic na própria tela do espelho para incluir marcações, sem navegar por várias páginas; listagem e exclusão individual das marcações do dia via rotinas oficiais do sistema. Disponível somente na visão de chefia (visualizando o ponto de outro servidor).
• Detalhe de cada autorização de hora extra do dia (antes um popup nativo sem estilo) num modal com cartões organizados por autorização.

💊 7. REEMBOLSO FARMACÊUTICO RECONSTRUÍDO
• Formulário de Novo Pedido reconstruído em cartão com grid de campos responsivo e instruções em acordeão recolhível.
• Busca inteligente e mais esperta de medicamentos: auto-busca enquanto digita (debounced em 800ms), sem precisar clicar na lupa.
• Arquitetura híbrida com refino esperto: envia a 1ª palavra para o backend Struts e refina localmente e instantaneamente em memória termos compostos por dosagem, apresentação e exigência de laudo — pesquisar *"Exodus 15 mg"* localiza direto o item exato em vez de retornar vazio no sistema clássico.
• Digitação contínua e sem interrupções: preserva o texto digitado via sessionStorage e restaura o foco e o cursor após o carregamento da lista de apresentações, proporcionando a experiência fluida de uma SPA moderna.
• Seleção de apresentação por clique em qualquer parte da linha (sem precisar mirar no radio button minúsculo) e contêiner com rolagem própria para listas extensas de apresentações.
• Calculadora de desconto e detalhamento de pedido em modais nativos do design system do TSE XT, eliminando popups soltos e requisições bloqueadas por CSP.
• Sidebar de Resumo do Pedido dinâmica e sticky, que acompanha a rolagem e se adapta à largura disponível.
• Badges de status coloridos na listagem de pedidos, com rede de segurança para novos status futuros.

📋 8. GESTÃO DE SERVIÇO EXTRAORDINÁRIO (VISÃO DE CHEFIA)
• Painel de KPIs por servidor autorizado no período, com barras de progresso comparando Sábado (+50%) e Domingo (+100%) entre o autorizado e o realizado.
• Desambiguação inteligente de nomes de servidores (primeiro nome com inicial/sobrenome automático em homônimos).
• Indicador em segundo plano de horas que poderiam virar pecúnia (+HH:MM), lido automaticamente do espelho de cada servidor da unidade respeitando os tetos legais diários (Res. 22.901/2008).

⚡ 9. NAVEGAÇÃO RÁPIDA & COMMAND PALETTE (Ctrl + K)
• Pressione Ctrl + K (ou Cmd + K) para abrir uma busca global instantânea por atalhos, opções do menu, filtros de meses e ações do sistema.
• Navegação ágil com teclado e execução imediata de rotinas.

📁 10. DRAWER LATERAL DE SERVIÇOS (Alt + M)
• Menu moderno retrátil em acrílico translúcido com dezenas de serviços organizados por categorias temáticas com ícones visuais e badges (Chefia / Restrito).
• Elimina sobreposições e cortes de tela no layout legado.

🔄 11. AUTO-CONSULTA INSTANTÂNEA
• Ao alterar qualquer seletor no formulário de pesquisa (Unidade, Servidor, Ano ou Mês), a consulta é disparada automaticamente, dispensando cliques repetitivos no botão "Consultar".

📑 12. AÇÕES RÁPIDAS & EXPORTAÇÃO EXCEL
• Botão flutuante (FAB) com atalhos de alta produtividade.
• Exportação completa do espelho de ponto para planilha CSV/Excel com codificação UTF-8 (acentuação perfeita) e proteção integrada contra injeção de fórmulas.
• Atalho rápido para rolar a página diretamente para a linha do dia atual com destaque luminoso.

🎨 13. APARÊNCIA PERSONALIZÁVEL, CARREGAMENTO SEM FLASH E INTERRUPTOR ON/OFF
• Preferências de aparência na janela da extensão: preenchimento dos cards (Clássico ou Gradiente) e destaque (Suave ou Glow azul animado), aplicadas na hora em todas as telas.
• Página só é revelada depois que o TSE XT termina de montar a interface — sem flash do layout nativo original.
• Interruptor visual persistente: alterna instantaneamente entre o visual moderno XT e o layout clássico original do portal para fins de conferência, a qualquer momento, com um clique.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACIDADE & SEGURANÇA POR DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 100% Local (Client-side): Nenhum dado funcional, horário, matrícula ou informação pessoal é coletado, transmitido ou armazenado fora do seu próprio navegador.
• Zero Requisições Externas: A extensão não se conecta a nenhum servidor de terceiros; a comunicação ocorre apenas com os próprios sistemas do TSE, no seu contexto de sessão.
• Manifest V3 Conforme: Construída seguindo os mais altos padrões de segurança do Google Chrome (sem scripts inline inseguros e com sanitização rigorosa de DOM contra XSS).
• Permissões Mínimas: Utiliza apenas as permissões estritamente necessárias para o armazenamento de preferências locais de aparência (estilo e destaque dos cards de KPI, modo de abertura do menu de serviços).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⌨️ ATALHOS DE TECLADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Ctrl + K (ou Cmd + K): Abrir o Command Palette de busca rápida.
• Alt + M: Abrir ou fechar o Drawer de Serviços.
• ESC: Fechar janelas modais e menus suspensos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 NOTA DE ISENÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O TSE XT é uma ferramenta experimental de produtividade e aprimoramento de interface, com o único objetivo de facilitar a rotina de trabalho. Pode conter erros e não representa nenhuma garantia de aquisição de bancos de horas, pecúnias ou outros direitos relativos ao cumprimento da jornada de trabalho — um aviso nesse sentido é exibido no primeiro uso e a cada atualização. Os dados oficiais de frequência e homologação pertencem e são geridos exclusivamente pelos sistemas institucionais do Tribunal Superior Eleitoral.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ ASSETS PREPARADOS PARA O CHROME WEB STORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Todos os prints atendem às especificações técnicas obrigatórias do portal de desenvolvedor do Google Chrome (1280x800 px, PNG 24-bit Truecolor, colorType 2, sem canal alfa, dados anonimizados):

1. `docs/tela-exemplo.png`:
   • Título: "Espelho de Ponto — Dashboard com 5 KPIs e Auditoria"
   • Foco: Glassmorfismo, 5 KPIs, colunas analíticas e badges de teto legal.
2. `docs/tela-gestao-he.png`:
   • Título: "Gestão de Serviço Extraordinário — Visão de Chefia"
   • Foco: Barras de progresso Sábado/Domingo, saldo e apuração em segundo plano de horas pecúnia.
3. `docs/tela-reembolso-farmaceutico.png`:
   • Título: "Reembolso Farmacêutico — Novo Pedido em Grid Fluido"
   • Foco: Busca debounced com validação, anexos, calculadora modal e resumo sticky.
4. `docs/tela-exemplo-off.png`:
   • Título: "Conferência Instantânea — Interruptor ON/OFF"
   • Foco: Transparência total e alternância rápida entre TSE XT e o layout clássico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 BLOCOS PROMOCIONAIS DA LOJA (CHROME STORE PROMO TILES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Artefatos de divulgação em PNG 24-bit Truecolor (sem alfa), no padrão visual oficial do TSE XT:

1. `docs/promo-pequeno-440x280.png`:
   • Formato: 440 x 280 px (PNG 24 bits, colorType: 2, sem alfa).
   • Tipo: Bloco promocional pequeno (Small Promo Tile).
   • Elementos: Logo oficial em relevo tátil, tipografia TSE XT v1.0, tagline e badges compactas ("5 KPIs", "Design Tátil", "100% Local").

2. `docs/promo-letreiro-1400x560.png`:
   • Formato: 1400 x 560 px (PNG 24 bits, colorType: 2, sem alfa).
   • Tipo: Bloco promocional de letreiro (Marquee Promo Tile / Hero Banner).
   • Elementos: Banner panorâmico widescreen, selo "Marco 1.0", apresentação de valor, cards flutuantes em Glassmorfismo (Dashboard de 5 KPIs, Topbar e Painel de Chefia de HE).


