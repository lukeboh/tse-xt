# TSE XT — Extensão de Usabilidade & Modernização Visual para Sistemas do TSE

Uma extensão Manifest V3 para navegadores Chromium (Google Chrome, Microsoft Edge, Brave) projetada para transformar e modernizar a interface e usabilidade dos portais e sistemas internos do **Tribunal Superior Eleitoral (TSE)** (incluindo o *Meu Espaço* e demais serviços institucionais).

> ⚠️ **Aplicação experimental.** O TSE XT tem o único objetivo de melhorar a experiência do usuário no controle do ponto. Pode conter erros e **não representa nenhuma garantia** de aquisição de bancos de horas, pecúnias ou outros direitos relativos ao cumprimento da jornada de trabalho. Um aviso com esse teor é exibido no primeiro uso e a cada atualização de versão.

---

## ✨ Principais Recursos

1. **Design System Glassmorfismo Tátil 2026**:
   - Acrílico fosco translúcido (`backdrop-filter: blur(20px)`), relevo tátil e halo de foco luminoso azul institucional (*TSE Blue*).
   - Layout Widescreen fluido que aproveita 100% dos monitores modernos.

2. **Dashboard com 5 KPIs Uniformes**:
   - ⏱️ **Saída Expediente**: Estimativa precisa de saída para a jornada diária regular (7h ou 8h). O rodapé "Faltam HH:MM hoje" só aparece quando o mês visualizado contém o dia atual.
   - 🏦 **Banco de Horas**: Saldo acumulado homologado no banco de horas.
   - ⚖️ **Saída p/ Zerar Mês**: Horário exato de saída para zerar o saldo acumulado até o dia (compensando débitos ou saindo mais cedo em caso de crédito).
   - 📊 **Meta do Mês**: Barra visual de progresso e contagem inteligente de dias úteis restantes.
   - ⚡ **Horas Extras (2 Linhas)**: Soma da **pecúnia** (horas a pagar) do mês, separada em "úteis / Sábado" e "Domingo / Feriados"; rodapé com o saldo excedente que foi para o banco.

3. **Colunas Analíticas na Tabela do Espelho**:
   - **SALDO ACUM.**: saldo excedente acumulado dia a dia, com rótulos `+50%` (sábado) e `+100%` (domingo/feriado).
   - **HORAS EXCED.** (meses fechados): saldo líquido do dia calculado pelo TSE XT, já que nesses meses a coluna nativa passa a se chamar "HORAS AJUST.". Mesma formatação de cor da coluna SALDO ACUM. (verde/vermelho/neutro).

4. **Auto-Consulta Instantânea**:
   - Alterar qualquer campo nos filtros de pesquisa (Unidade, Servidor/Nome, Ano ou Mês) dispara a busca automaticamente.

5. **Ajuste de Ponto Inline (Modal)**:
   - Formulário modal Glassmorphic na própria tela do espelho para incluir marcações, com listagem e exclusão individual das marcações do dia via actions oficiais do Struts.

6. **Navegação em Drawer Lateral (Alt + M)**:
   - Menu retrátil com busca rápida e mais de 60 serviços organizados em categorias com ícones visuais e badges de permissão.

7. **Command Palette Global (Ctrl + K)**:
   - Pesquisa instantânea por atalhos, módulos e páginas internas.

8. **Interruptor ON / OFF Independente**:
   - Botão flutuante persistente no topo para alternar a qualquer momento entre o visual moderno XT e o layout clássico original para conferência.

9. **Ações Rápidas & Exportação**:
   - Exportação completa do espelho de ponto para Excel/CSV com formatação e codificação UTF-8.

10. **Auditoria de Horas Perdidas** (v0.4.0):
   - Modal que varre o Espelho de Ponto desde 2009 e quantifica as horas adicionais trabalhadas que **não viraram pecúnia nem banco de horas**, separadas em quatro categorias (Não Homologadas, excedente de dia útil absorvido, descarte de fim de semana/feriado e crédito aquém da fórmula).
   - Resultado persistido por matrícula no navegador: a tela abre com a última varredura e atualiza só o **delta** (meses novos ou ainda abertos); barra de progresso e data da última atualização; **Full Update** refaz tudo. Exportação CSV.

---

## 🧾 Evolução da Série 0.3.x (ago/2026 – set/2026)

A série 0.3.x consolidou o mecanismo de cálculo, o suporte a meses fechados e o ajuste de ponto inline. Principais blocos de trabalho:

### Cálculo de saldo e horas extras
- **Multiplicadores de fim de semana e feriado**: sábado `+50%` (fator 1,5×), domingo e feriado/recesso `+100%` (fator 2,0×), com badges analíticos nas células.
- **Fonte única de cálculo** (`balanceCalc.js`): a coluna `SALDO ACUM.` e o card de KPI passaram a compartilhar exatamente a mesma regra, eliminando divergências.
- **Meses fechados/homologados**: a coluna física `h10` deixa de ser "HORAS EXCED." e passa a "HORAS AJUST." (jornada reconhecida). O saldo do dia útil passou a ser `TOTAL − jornada esperada` (7h, ou 8h com intervalo de almoço); sábado/domingo/feriado usam o `TOTAL` como base. Guarda de dispensa (licença, férias, viagem, abono integral) impede débito de jornada inteira.
- **Detecção robusta de mês fechado**: normalização de whitespace no cabeçalho nativo (`"HORAS<br>AJUST."`), que antes quebrava o reconhecimento e escondia a coluna auxiliar e os rótulos de multiplicador.
- **Card "Horas Extras"**: as duas linhas passaram a somar a **pecúnia** (horas a pagar) por tipo de dia, em vez do saldo multiplicado. A pecúnia não é mais zerada em meses de regime híbrido/teletrabalho.
- **Expurgo de leitura contaminada do DOM** e correções de escopo de variável no acúmulo mensal.

### Ajuste de ponto e integração Struts
- Modal inline de ajuste de ponto com extração assíncrona do contêiner da tela de alteração.
- Inclusão de marcação via `EspelhoPontoDiaAction_incluir.action` e exclusão individual via a action oficial de exclusão do chefe.
- Resolução dinâmica da matrícula do servidor para evitar `ORA-02291`.
- Recarregamento automático da página após o ajuste, garantindo dados atualizados.
- Blindagem integral de endpoints Struts, `type="button"` + `preventDefault()` em menus e FAB para eliminar submissão involuntária, e correção do action de consulta mensal (`EspelhoPontoMesAction_recuperar.action`) com POST.

### Suporte a telas e navegação
- Suporte à tela "Frequência – Alteração de Ponto" (`EspelhoPontoDiaAction`), com modernização da moldura e do formulário em *flex groups*.
- Menu Drawer com expansão por *hover*, exclusão mútua de categorias e varredura completa de subitens legados.
- Calendário Glassmorphic e modernização de ícones de hora extra autorizada (`iconClock` / `detalharAutorizacao`).

### Performance e robustez de carregamento
- Execução antecipada em `document_start`, montagem atômica do topo (`#je-app-header`) em um único `requestAnimationFrame` e supressão total de transições no carregamento, eliminando o *flash* (FOUC).
- Injeção IIFE com identificador único no *main world* e blindagem defensiva de DOM com expansão da correspondência de URLs.

### Refinamento visual
- Data atual em azul Glassmorphic sólido, intensificação estética de linhas com pendência, chips de ocorrência sem emoji e com cursor não clicável.
- Refinamento ultra-suave do desfoque de modais (0,5 px) e do escurecimento de overlays.
- Pílula "Referência: Mês / Ano" com relógio alinhado e mês/ano na cor principal.
- Aviso de aplicação experimental no primeiro uso e a cada atualização (persistido em `chrome.storage.local`).
- Padronização dos espaçamentos verticais do topo em 16px (banner → KPIs → título da página).
- Correção da lupa do campo de busca que se sobrepunha ao *placeholder*.

---

## 🗺️ Roadmap

- **Persistência (sticky) ao rolar a tela**: manter o menu/topbar, a linha de KPIs e os cabeçalhos da tabela fixos durante a rolagem do espelho.
- **R3 — três estados de banco de horas** _(parcial na v0.4.0: detecção de "mês com HE autorizado" e aviso no card Banco de Horas; falta separar o crédito para só a parcela homologada — ver R1)_.
- **R6 — excedente sem autorização prévia** _(parcial na v0.4.0: selo "sem autorização" nos dias; falta cruzar com o valor efetivamente autorizado no SAEX)_.
- **Horas extras autorizadas no card "Horas Extras"**: exibir, junto da pecúnia, a quantidade de horas extras efetivamente **autorizadas** no período.
- **Horas executadas não homologadas no KPI "Banco de Horas"**: destacar na tabela e contabilizar à parte no card **Banco de Horas** as horas efetivamente trabalhadas em excesso que **não foram homologadas pela chefia** (rodapé `Horas Excedentes Não Homologadas` do espelho) — hoje elas não entram no saldo e passam despercebidas. Inclui o excedente feito **além do quantitativo de HE autorizado** num mês com hora extra autorizada: a parcela não paga e não homologada é **perdida** (não vira banco de horas automaticamente). Ver [roadmap-conformidade.md](docs/roadmap-conformidade.md) R1/R6 e [regras-calculo-frequencia.md §3.9](docs/regras-calculo-frequencia.md).
- **Detecção automática de jornada de 7h e 8h**: identificar por dia/servidor se a jornada aplicável é de 7h ou 8h, sem depender de configuração manual nem apenas da presença de intervalo de almoço ([roadmap-conformidade.md](docs/roadmap-conformidade.md) R4).
- **Conformidade com a legislação de referência**: auditar e ajustar as fórmulas de jornada, banco de horas, pecúnia e multiplicadores conforme as regras do TSE. Regras já verificadas em [regras-calculo-frequencia.md](docs/regras-calculo-frequencia.md); ajustes planejados (R1–R10) em [roadmap-conformidade.md](docs/roadmap-conformidade.md); questões abertas em [duvidas-normativas.md](docs/duvidas-normativas.md).

---

## 🚀 Como Instalar no Google Chrome

1. Abra o Chrome e acesse `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta deste projeto (`tse-xt`).
5. Acesse o portal do TSE (ex: [Meu Espaço](https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action)) e aproveite!

---

## 🔒 Privacidade, Segurança e Especificações

- **[Política de Privacidade](PRIVACY.md)**: Declaração de não coleta de dados, processamento 100% local (*client-side*) e conformidade com o Manifest V3.
- **[Especificação de Negócio & Regras de Cálculo](docs/especificacao-negocio.md)**: Detalhamento completo das fórmulas matemáticas, desconsideração de pecúnia, regime híbrido e regras de jornada (7h/8h).
