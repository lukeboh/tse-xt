# Chrome Web Store — TSE XT

> Fonte de verdade de tudo que é preenchido no Developer Dashboard. Atualizar aqui a cada liberação (ver [roteiro-liberacao.md](roteiro-liberacao.md)) e copiar para a loja.
> Versão de referência: **1.2.0** (12/11/2026)

---

## 1. Descrição (aba "Página na loja" → Descrição)

Copiar o bloco abaixo inteiro. O campo da loja é texto puro (sem Markdown) e aceita até 16.000 caracteres.

```text
✨ TSE XT — Usabilidade Moderna para todo o Meu Espaço do TSE (Versão 1.2)

O TSE XT é uma extensão de produtividade desenvolvida para modernizar a interface visual e a usabilidade de todo o portal Meu Espaço do Tribunal Superior Eleitoral (TSE) — desde as telas de frequência (Espelho de Ponto Mensal e Alteração de Ponto) até as dezenas de telas do menu clássico, com painéis dedicados para Reembolso Farmacêutico e Gestão de Serviço Extraordinário.

Com design em Glassmorfismo Tátil, o TSE XT elimina telas em branco, calcula previsões de jornada em tempo real, audita saldos dia a dia e automatiza formulários complexos com total privacidade (100% no seu navegador).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PRINCIPAIS FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 1. BOOT SPLASH INSTANTÂNEO & TRANSIÇÃO SUAVE DE LOGIN
• Carregamento cinematográfico em azul institucional (#0a2540) com glow radiante e o logo oficial em alta definição.
• Transição sem clarão: assim que o login realmente começa (credenciais enviadas ou "Acesso Extranet" via Keycloak/RH-SSO), o splash cobre a troca de páginas, eliminando o clarão branco e as telas intermediárias sem estilo — e nunca cobre uma verificação de captcha ainda em andamento.
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
• Varre o Espelho de Ponto desde 2009 e quantifica, mês a mês, as horas trabalhadas que nunca viraram pecúnia nem banco de horas — que também não compensaram dias curtos — separadas em cinco categorias explicadas em linguagem clara, cada uma com a origem do número e o artigo da norma que a fundamenta.
• Gráfico cronológico das perdas por ano, tabela ordenável por qualquer coluna e clique na linha para abrir o mês correspondente.
• Resultado persistido por matrícula: reabre com a última varredura e atualiza só o que mudou (ou refaça tudo com Full Update).
• Meses de trabalho híbrido/teletrabalho não entram como perda — a norma suprime o serviço extraordinário nesse regime, então o excedente é estrutural, não um direito perdido.

• Antes de contar a perda, horas não pagas de sábado cobrem faltas úteis com ×1,5; domingos e feriados, com ×2, inclusive acima de 10h. Só a sobra entra como perda.
• Progresso com previsão de término. Resultados anteriores à regra de cobertura pedem Full Update.

📈 5. COLUNAS ANALÍTICAS NA TABELA DE FREQUÊNCIA (ESPELHO DE PONTO)
• SALDO ACUM.: acompanhe a evolução dia a dia do seu saldo diretamente na tabela, com badges de acréscimo +50% (sábado) e +100% (domingo/feriado) e coloração imediata (verde para crédito, rosa para débito, neutro para zero).
• HORAS EXCED. (meses fechados): quando o mês é homologado e a coluna nativa passa a se chamar "HORAS AJUST.", o TSE XT injeta uma coluna própria com o saldo líquido real de cada dia (total trabalhado − jornada esperada), mantendo a leitura consistente com os meses abertos.
• Destino do mês: excedente, compensação entre dias úteis, cobertura pelo fim de semana, pago, banco, perdido e débito oficial; divergências ficam sinalizadas para conferência. O controle diário não é um novo crédito no banco.
• Cabeçalho fixo durante a rolagem para facilitar a leitura dos meses extensos.
• Dia corrente: antes de a coluna oficial "HORAS EXCED." ser processada à noite, o TSE XT já projeta o saldo do dia a partir do total trabalhado, com selo próprio.
• Destaque visual de horas extras em pecúnia: células com valores a serem pagos em folha ganham badges destacados (+50% em dias úteis/sábados e +100% em domingos/feriados), com totalizador mensal exclusivo na linha de totais.
• Cálculo rigoroso que desconsidera valores já pagos em Pecúnia, garantindo que horas indenizadas não distorçam o saldo a compensar.
• Detecção automática de regime e de jornada (7h/8h/5h no recesso), com selos de teto legal de hora extra por dia (art. 4º) diretamente na tabela.

📝 6. AJUSTE DE PONTO DE SUBORDINADOS PARA CHEFIAS (ESPELHO DE PONTO)
• Botões rápidos ⚡ Ajustar Ponto nas linhas da tabela do espelho ao consultar integrantes da equipe (visão de chefia), abrindo o formulário modal integrado já preenchido com a matrícula do subordinado e a data selecionada.
• Detalhe de cada autorização de hora extra do dia num modal integrado com cartões organizados por autorização.

💊 7. REEMBOLSO FARMACÊUTICO RECONSTRUÍDO
• Formulário de Novo Pedido reconstruído em cartão com grid de campos responsivo e instruções em acordeão recolhível.
• Busca inteligente e mais esperta de medicamentos: auto-busca enquanto digita (debounced em 800ms), sem precisar clicar na lupa.
• Arquitetura híbrida com refino esperto: envia a 1ª palavra para o backend Struts e refina localmente e instantaneamente em memória termos compostos por dosagem, apresentação e exigência de laudo — pesquisar "Exodus 15 mg" localiza direto o item exato em vez de retornar vazio no sistema clássico.
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

📄 14. RECONHECIMENTO POSTERIOR DA EQUIPE
• Por servidor ou por mês: horas excedentes, pagas, homologadas, compensadas e que ficaram sem destino, com as alternativas de pecúnia ou banco.
• A cobertura de dias curtos pelo fim de semana fica fora da solicitação. Meses abertos e híbridos ficam fora dos totais.
• Período livre, previsão de término, CSV e impressão A4 retrato por padrão, com tabelas organizadas para encaminhar o pedido.

🧾 15. AUDITORIA DE PAGAMENTO DE PECÚNIAS
• Confere suas horas de pecúnia do espelho com as rubricas e referências dos seus próprios contracheques, incluindo folhas suplementares e adicional noturno.
• Aponta diferenças de horas, de faixas de acréscimo e pagamentos sem correspondência; permite conferir os lançamentos, exportar CSV e imprimir.
• Sem limite fixo de meses; progresso e previsão de término durante as consultas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACIDADE & SEGURANÇA POR DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 100% Local (Client-side): Nenhum dado funcional, horário, matrícula ou informação pessoal é coletado ou transmitido para fora do seu navegador. O que a extensão guarda (preferências, resultado da Auditoria de Horas Perdidas, último Relatório de Reconhecimento Posterior, última Auditoria de Pagamento de Pecúnias e cache de autorizações de hora extra) fica apenas no armazenamento local do próprio Chrome.
• Zero Requisições Externas: A extensão não se conecta a nenhum servidor de terceiros; a comunicação ocorre apenas com os próprios sistemas do TSE, no seu contexto de sessão.
• Manifest V3 Conforme: Construída seguindo os mais altos padrões de segurança do Google Chrome (sem scripts inline inseguros e com sanitização rigorosa de DOM contra XSS).
• Permissões Mínimas: apenas armazenamento local (preferências e resultados calculados), acesso à aba ativa para recarregá-la ao aplicar preferências e acesso restrito aos domínios oficiais do TSE.

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
```

## 2. Resumo (vem do manifest.json)

O campo "Resumo" da loja é o `description` do manifest.json (máximo 132 caracteres). Hoje:

> Interface moderna com Glassmorfismo, 5 KPIs e usabilidade aprimorada para sistemas do Tribunal Superior Eleitoral (TSE).

## 3. Imagens (aba "Página na loja" → Recursos gráficos)

Todas regeradas a partir da aplicação real, com dados pessoais anonimizados (ver [roteiro-liberacao.md](roteiro-liberacao.md), passo 4). Formato exigido: PNG RGB 24 bits sem alfa. Conferir com `node tools/loja/verificar-assets.mjs`.

| Campo da loja | Arquivo | Conteúdo |
|---|---|---|
| Ícone da loja (128x128) | `icons/icon-128.png` | Ícone oficial |
| Captura 1 (1280x800) | `docs/tela-exemplo.png` | Espelho de Ponto: 5 KPIs e regime do mês |
| Captura 2 (1280x800) | `docs/tela-auditoria-horas-perdidas.png` | Auditoria de Horas Perdidas: total, cinco categorias e gráfico por ano |
| Captura 3 (1280x800) | `docs/tela-reconhecimento-posterior.png` | Reconhecimento Posterior da equipe, destinos, alternativas e exportações |
| Captura 4 (1280x800) | `docs/tela-auditoria-pagamento.png` | Auditoria de Pagamento de Pecúnias; valores em reais ocultados |
| Captura 5 (1280x800) | `docs/tela-gestao-he.png` | Gestão de Serviço Extraordinário: barras por servidor; valores em reais ocultados |
| Bloco promocional pequeno (440x280) | `docs/promo-pequeno-440x280.png` | Logo, nome, versão e três destaques |
| Bloco promocional de letreiro (1400x560) | `docs/promo-letreiro-1400x560.png` | Logo, proposta de valor e recortes do Espelho e do Reconhecimento Posterior |

Os blocos promocionais são gerados de `tools/loja/promo.html` por `node tools/loja/gerar-promos.mjs` — não editar os PNGs à mão. As capturas antigas de Reembolso e do modo desligado ficam como histórico no repositório e não integram a seleção de cinco imagens da versão 1.2.0.

## 4. Aba "Privacidade"

**Finalidade única:**

> Melhorar a interface e a usabilidade do portal Meu Espaço do Tribunal Superior Eleitoral (TSE), com cálculos auxiliares de frequência feitos localmente no navegador.

**Justificativas de permissão:**

| Permissão | Justificativa |
|---|---|
| `storage` | Guardar localmente preferências de aparência, a confirmação do aviso de aplicação experimental, o resultado da Auditoria de Horas Perdidas, o último Relatório de Reconhecimento Posterior gerado pela chefia, a última Auditoria de Pagamento de Pecúnias (só as linhas de serviço extraordinário e de adicional noturno dos seus contracheques) e um cache das autorizações de hora extra lidas do próprio portal. Nada sai do navegador. |
| `activeTab` | Recarregar a aba ativa quando o usuário pede, na janela da extensão, para aplicar as preferências escolhidas. |
| Permissão de host (`*://meuespaco.tse.jus.br/*`, `*://*.tse.jus.br/*`) | Injetar o visual e as funcionalidades nas páginas do portal Meu Espaço e ler, com a sessão do próprio usuário, as páginas do portal usadas nos cálculos (Espelho de Ponto próprio e da equipe, autorizações de hora extra e contracheques próprios). Nenhum outro domínio é acessado. |
| Código remoto | Não usa. Todo o JavaScript está no pacote. |

**Uso de dados:** marcar que a extensão **não coleta** nenhuma das categorias listadas (dados pessoais, de saúde, financeiros, autenticação, comunicações, localização, histórico da web, atividade do usuário, conteúdo do site). O processamento é todo local e nada é transmitido ao desenvolvedor nem a terceiros. Marcar as três declarações de conformidade (não vende dados, não usa para fins alheios à finalidade única, não usa para crédito).

**URL da Política de Privacidade:** `https://github.com/lukeboh/tse-xt/blob/main/PRIVACY.md`

## 5. Aba "Distribuição"

- Visibilidade: preservar a configuração atual do item; a última referência documentada é **Não listado**. Mudar para Público só por decisão explícita.
- Regiões: todas.


## 6. Novidades para o envio da versão 1.2.0

- Novo Relatório de Reconhecimento Posterior para a equipe: destinos das horas, alternativas de pecúnia ou banco, agrupamentos por servidor ou por mês, CSV e impressão A4 retrato.
- Nova Auditoria de Pagamento de Pecúnias: compara o espelho com rubricas e referências dos próprios contracheques, incluindo folhas suplementares e adicional noturno; CSV e impressão.
- Auditoria de Horas Perdidas com cinco categorias, motivos por dia e avisos para conferência; mês aberto e regime híbrido tratados separadamente.
- Horas não pagas de sábado cobrem dias curtos com ×1,5; domingo e feriado, com ×2, inclusive acima de 10h, antes de contar a sobra como perda.
- SALDO ACUM. de controle dia a dia, linha Destino do mês e avisos de divergência; o crédito oficial continua restrito às horas homologadas.
- Relatórios sem limite fixo de período, com progresso e previsão de término; resultados anteriores à regra de cobertura pedem recálculo.
- Ajuste de ponto de integrantes da equipe pela chefia, com identidade e data preenchidas no modal e validação de permissão.
- Destaque e totais de pecúnia e adicional noturno, renderização idempotente e cabeçalho do Espelho fixo durante a rolagem.

A publicação desta versão foi preparada localmente; enviar pacote, descrição e imagens pelo Dashboard é uma etapa separada. Ver [release-1.2.0.md](release-1.2.0.md) e [automação oficial](automacao-chrome-web-store.md).
