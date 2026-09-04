# Descrição da Chrome Web Store — TSE XT

> Fonte de verdade da descrição publicada na loja. Atualizar aqui a cada release relevante e copiar para o Developer Dashboard.
> Versão de referência: **0.5.0**

---

✨ TSE XT — Usabilidade Moderna, Planejamento de Jornada e Auditoria de Horas para o TSE

O TSE XT é uma extensão moderna desenvolvida para aprimorar a experiência visual, a usabilidade e o controle de jornada dos servidores no portal Meu Espaço e nas telas de frequência (Espelho de Ponto Mensal e Alteração de Ponto) do Tribunal Superior Eleitoral (TSE).

Com um design refinado em Glassmorfismo Tátil, a extensão transforma tabelas e interfaces legadas em um painel analítico inteligente, calculando previsões de saída, saldo acumulado dia a dia e progresso mensal — inclusive com os acréscimos de fim de semana e feriado — com total precisão, e ainda audita o histórico completo do ponto em busca de horas que nunca viraram pecúnia nem banco de horas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PRINCIPAIS FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 1. PAINEL DE 5 KPIS PARA PLANEJAR O MÊS
Tenha clareza instantânea sobre sua jornada de trabalho, sem precisar fazer contas manuais:
• ⏱️ Saída de Hoje: Previsão exata do horário de término da jornada diária (7h em turno único, 8h com intervalo de almoço, 5h no recesso), com o horário para zerar o saldo do mês saindo hoje.
• 💰 Saldo do Mês: Um número único, devedor ou credor, líquido de pecúnia e já com a projeção de hoje — com mini-planejador "planejar ›": quanto fazer por dia útil para zerar o mês, ou o fechamento projetado para um esforço diário informado.
• 🏦 Banco de Horas: Saldo homologado institucional, mais o que o mês tende a adicionar (horas homologáveis) ou consumir do banco — com aviso automático nos regimes de trabalho híbrido, hora extra autorizada (consumo vedado, art. 13 da Portaria 380/2026) e recesso.
• ⚡ Hora Extra (Pecúnia): Executado × Autorizado direto do SAEX, sem digitar nada, separado em "Semana/Sábado (+50%)" e "Domingo/Feriado (+100%)", com barra de progresso e teto legal de 60h/mês.
• 🎯 Meta do Mês: Acompanhamento em tempo real da jornada ordinária do mês com barra de progresso visual (gradiente esmeralda ao superar 100%).

🔎 2. AUDITORIA DE HORAS PERDIDAS
• Varre o Espelho de Ponto desde 2009 e quantifica, mês a mês, as horas trabalhadas que nunca viraram pecúnia nem banco de horas — separadas em quatro categorias explicadas em linguagem clara, cada uma com a origem do número e o artigo da norma que a fundamenta.
• Gráfico cronológico das perdas por ano, tabela ordenável por qualquer coluna e clique na linha para abrir o mês correspondente.
• Resultado persistido por matrícula: reabre com a última varredura e atualiza só o que mudou (ou refaça tudo com Full Update).
• Meses de trabalho híbrido/teletrabalho não entram como perda — a norma suprime o serviço extraordinário nesse regime, então o excedente é estrutural, não um direito perdido.

📈 3. COLUNAS ANALÍTICAS NA TABELA DE FREQUÊNCIA
• SALDO ACUM.: acompanhe a evolução dia a dia do seu saldo diretamente na tabela, com badges de acréscimo +50% (sábado) e +100% (domingo/feriado) e coloração imediata (verde para crédito, rosa para débito, neutro para zero).
• HORAS EXCED. (meses fechados): quando o mês é homologado e a coluna nativa passa a se chamar "HORAS AJUST.", o TSE XT injeta uma coluna própria com o saldo líquido real de cada dia (total trabalhado − jornada esperada), mantendo a leitura consistente com os meses abertos.
• Dia corrente: antes de a coluna oficial "HORAS EXCED." ser processada à noite, o TSE XT já projeta o saldo do dia a partir do total trabalhado, com selo próprio.
• Cálculo rigoroso que desconsidera valores já pagos em Pecúnia, garantindo que horas indenizadas não distorçam o saldo a compensar.
• Detecção automática de regime e de jornada (7h/8h/5h no recesso), com selos de teto legal de hora extra por dia (art. 4º) diretamente na tabela.

📝 4. AJUSTE DE PONTO INLINE (VISÃO DE CHEFIA)
• Formulário modal glassmorphic na própria tela do espelho para incluir marcações, sem navegar por várias páginas.
• Listagem das marcações já registradas no dia e exclusão individual, usando as rotinas oficiais do sistema.
• Disponível somente quando se visualiza o ponto de outro servidor — quem tem acesso ao ponto de terceiros é quem pode corrigi-lo.

⚡ 5. NAVEGAÇÃO RÁPIDA & COMMAND PALETTE (Ctrl + K)
• Pressione Ctrl + K (ou Cmd + K) para abrir uma busca global instantânea por atalhos, opções do menu, filtros de meses e ações do sistema.
• Navegação ágil com teclado e execução imediata de rotinas.

📁 6. DRAWER LATERAL DE SERVIÇOS (Alt + M)
• Menu moderno retrátil em acrílico translúcido com mais de 60 serviços organizados por categorias temáticas com ícones visuais e badges (Chefia / Restrito).
• Elimina sobreposições e cortes de tela no layout legado.

🔄 7. AUTO-CONSULTA INSTANTÂNEA
• Ao alterar qualquer seletor no formulário de pesquisa (Unidade, Servidor, Ano ou Mês), a consulta é disparada automaticamente, dispensando cliques repetitivos no botão "Consultar".

📑 8. AÇÕES RÁPIDAS & EXPORTAÇÃO EXCEL
• Botão flutuante (FAB) com atalhos de alta produtividade.
• Exportação completa do espelho de ponto para planilha CSV/Excel com codificação UTF-8 (acentuação perfeita) e proteção integrada contra injeção de fórmulas.
• Atalho rápido para rolar a página diretamente para a linha do dia atual com destaque luminoso.

🎨 9. APARÊNCIA PERSONALIZÁVEL & CARREGAMENTO SEM FLASH
• Preferências de aparência na janela da extensão: preenchimento dos cards (Clássico ou Gradiente) e destaque (Suave ou Glow azul animado), aplicadas na hora em todas as telas.
• Página só é revelada depois que o TSE XT termina de montar a interface — sem flash do layout nativo original.

🏛️ 10. INTERRUPTOR VISUAL PERSISTENTE (ON / OFF)
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
