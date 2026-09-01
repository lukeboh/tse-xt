# Descrição da Chrome Web Store — TSE XT

> Fonte de verdade da descrição publicada na loja. Atualizar aqui a cada release relevante e copiar para o Developer Dashboard.
> Versão de referência: **0.3.0**

---

✨ TSE XT — Usabilidade Moderna, 5 KPIs em Tempo Real e Produtividade para o TSE

O TSE XT é uma extensão moderna desenvolvida para aprimorar a experiência visual, a usabilidade e o controle de jornada dos servidores no portal Meu Espaço e nas telas de frequência (Espelho de Ponto Mensal e Alteração de Ponto) do Tribunal Superior Eleitoral (TSE).

Com um design refinado em Glassmorfismo Tátil, a extensão transforma tabelas e interfaces legadas em um painel analítico inteligente, calculando previsões de saída, saldo acumulado dia a dia e progresso mensal — inclusive com os acréscimos de fim de semana e feriado — com total precisão.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PRINCIPAIS FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 1. DASHBOARD ANALÍTICO COM 5 KPIS UNIFORMES
Tenha clareza instantânea sobre sua jornada de trabalho sem precisar fazer contas manuais:
• ⏱️ Saída Expediente: Previsão exata do horário de término da jornada diária regular (7h ou 8h quando há intervalo de almoço). O tempo restante do dia é exibido apenas no mês corrente.
• 🏦 Banco de Horas: Exibição clara do saldo homologado institucional (positivo ou débito).
• 📊 Meta do Mês: Acompanhamento em tempo real da meta mensal de horas ordinárias com barra de progresso visual (gradiente esmeralda ao superar 100%).
• ⚖️ Saída p/ Zerar Mês: Cálculo inteligente que informa a hora exata de saída no dia de hoje para zerar o saldo acumulado (compensando débitos ou saindo mais cedo em caso de crédito).
• ⚡ Horas Extras: Soma da Pecúnia (horas que serão pagas) do mês, separada em "Úteis / Sábado" e "Domingo / Feriados", com o saldo excedente do mês exibido no rodapé do card.

📈 2. COLUNAS ANALÍTICAS NA TABELA DE FREQUÊNCIA
• SALDO ACUM.: acompanhe a evolução dia a dia do seu saldo diretamente na tabela, com badges de acréscimo +50% (sábado) e +100% (domingo/feriado) e coloração imediata (verde para crédito, vermelho para débito, neutro para zero).
• HORAS EXCED. (meses fechados): quando o mês é homologado e a coluna nativa passa a se chamar "HORAS AJUST.", o TSE XT injeta uma coluna própria com o saldo líquido real de cada dia (total trabalhado − jornada esperada), mantendo a leitura consistente com os meses abertos.
• Cálculo rigoroso que desconsidera valores já pagos em Pecúnia, garantindo que horas indenizadas não distorçam o saldo a compensar.
• Detecção automática de regime: ajusta os indicadores de banco de horas em meses com Trabalho Híbrido / Teletrabalho.

📝 3. AJUSTE DE PONTO INLINE (VISÃO DE CHEFIA)
• Formulário modal glassmorphic na própria tela do espelho para incluir marcações, sem navegar por várias páginas.
• Listagem das marcações já registradas no dia e exclusão individual, usando as rotinas oficiais do sistema.
• Disponível somente quando se visualiza o ponto de outro servidor — quem tem acesso ao ponto de terceiros é quem pode corrigi-lo.

⚡ 4. NAVEGAÇÃO RÁPIDA & COMMAND PALETTE (Ctrl + K)
• Pressione Ctrl + K (ou Cmd + K) para abrir uma busca global instantânea por atalhos, opções do menu, filtros de meses e ações do sistema.
• Navegação ágil com teclado e execução imediata de rotinas.

📁 5. DRAWER LATERAL DE SERVIÇOS (Alt + M)
• Menu moderno retrátil em acrílico translúcido com mais de 60 serviços organizados por categorias temáticas com ícones visuais e badges (Chefia / Restrito).
• Elimina sobreposições e cortes de tela no layout legado.

🔄 6. AUTO-CONSULTA INSTANTÂNEA
• Ao alterar qualquer seletor no formulário de pesquisa (Unidade, Servidor, Ano ou Mês), a consulta é disparada automaticamente, dispensando cliques repetitivos no botão "Consultar".

📑 7. AÇÕES RÁPIDAS & EXPORTAÇÃO EXCEL
• Botão flutuante (FAB) com atalhos de alta produtividade.
• Exportação completa do espelho de ponto para planilha CSV/Excel com codificação UTF-8 (acentuação perfeita) e proteção integrada contra injeção de fórmulas.
• Atalho rápido para rolar a página diretamente para a linha do dia atual com destaque luminoso.

🏛️ 8. INTERRUPTOR VISUAL PERSISTENTE (ON / OFF)
• Permite alternar instantaneamente entre o visual moderno XT e o layout clássico original do portal para fins de conferência, a qualquer momento, com apenas um clique.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACIDADE & SEGURANÇA POR DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 100% Local (Client-side): Nenhum dado funcional, horário, matrícula ou informação pessoal é coletado, transmitido ou armazenado fora do seu próprio navegador.
• Zero Requisições Externas: A extensão não se conecta a nenhum servidor de terceiros; a comunicação ocorre apenas com os próprios sistemas do TSE, no seu contexto de sessão.
• Manifest V3 Conforme: Construída seguindo os mais altos padrões de segurança do Google Chrome (sem scripts inline inseguros e com sanitização rigorosa de DOM contra XSS).
• Permissões Mínimas: Utiliza apenas as permissões estritamente necessárias para o armazenamento de preferências locais (como a jornada padrão de 7h/8h).

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
