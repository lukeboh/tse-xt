# Changelog — TSE XT

## 1.2.20-Snapshot — 18/11/2026

- **Bloco D — Separação de scripts por portal, acessibilidade/performance da combobox e validação inline (`manifest.json`, `sptUnitCombobox.js`, `sptReportModal.js`)**:
  - **D1**: Separadas as entradas de `content_scripts` no `manifest.json` por portal (`portalservidor2` vs. `spt-consultafrequencia`), carregando no SPT apenas `content/content.css`, `content/spt-gestao.css` e os 9 módulos JS utilizados pelo SPT (sem carregar `espelho-ponto.css`, `reembolso-farmaceutico.css`, `hora-extra-gestao.css` nem os 19 módulos exclusivos do Meu Espaço).
  - **D2**: Na combobox de Unidades (`sptUnitCombobox.js`), cada opção recebe `id` único (`...-opt-<id>`), o input gerencia `aria-activedescendant`, a `<label>` da tela principal é associada ao input (`for` + `aria-labelledby`), o `<select id="cbUnidades">` oculto recebe `tabindex="-1"` e `aria-hidden="true"`, e a navegação por `ArrowDown`/`ArrowUp` move a classe `.is-active` in-place sem recriar os 347 nós de opção no DOM.
  - **D3**: Substituídas as chamadas a `alert()` em `sptReportModal.js` por mensagens de validação inline dentro do próprio modal (`#je-spt-rep-validation` com `role="alert"` e `aria-live="assertive"`).
- Verificação: **248 testes de comportamento passando**.

## 1.2.19-Snapshot — 18/11/2026

- **Bloco C — Privacidade, retenção e segurança no SPT (`PRIVACY.md`, `README.md`, `docs/descricao-loja.md`, `sptReportModal.js`, `background.js`, `domModernizer.js`, `content.js`, `popup/popup.js`)**:
  - **C1**: Atualizados `PRIVACY.md`, `README.md` e `docs/descricao-loja.md` descrevendo o módulo do SPT, quais dados de prestadores (nome, CPF, contrato, batidas e horas) são processados exclusivamente no navegador e o prazo de retenção local (7 dias).
  - **C2**: Adicionado botão **"Apagar relatório salvo"** (`#je-spt-rep-clear`) no modal do SPT e expiração automática de **7 dias** (`REPORT_TTL_MS`) ao carregar o relatório de `chrome.storage.local`.
  - **C3**: Em `background.js`, o `onInstalled` recarrega apenas abas dos portais suportados (`/portalservidor2/*` e `/spt-consultafrequencia/*`), sem varrer `*://*.tse.jus.br/*`, e o handler `reloadExtension` fica restrito a instalações não empacotadas/desenvolvimento (`!('update_url' in manifest)`).
  - **C4**: Alternar a chave do portal (no popup ou na topbar) não recarrega a aba enquanto um relatório estiver em geração (`isAnyReportRunning()`), adiando o reload até o término (ou pedindo confirmação ao clicar em "Atualizar Página do Portal" no popup).
- Verificação: **245 testes de comportamento passando**.

## 1.2.18-Snapshot — 18/11/2026

- **Bloco B — Consultas ao SPT, períodos e tratamento de falhas (`sptCltCalc.js`, `sptUnitCombobox.js`, `sptReportModal.js`, `sptModernizer.js`)**:
  - **B1**: Extraído `window.lPeriodos` diretamente do HTML (`parsePeriodosFromDoc(doc)` lendo `<script>` inline ou `<option>` de `cbPeriodos`), contornando o isolamento de mundo do content script no `sptReportModal` e no clique em CPF / Pesquisar do `sptModernizer`.
  - **B2 e B4**: Períodos de vários meses consultam a lista de prestadores em **cada mês do intervalo** (`slice.dtFinalIso`) e unem por `codigo`, sem mistura com o mês anterior fora do intervalo e sem datas fixas (`'10/2026'` / `'2026-10-15'`).
  - **B3**: Verificação de `resp.ok`, detecção de tela de login/CSRF expirado e validação da tabela de frequência; qualquer mês com falha é registrado em `report.failures` (`"Prestador X — MM/AAAA: falha na consulta (...)"`), incluído como linha de erro e marcado como relatório parcial (`partial = true`) com aviso visível na tela, no PDF e no CSV.
  - **B5**: Resultado de `ensureMetadataLoaded()` (`units`, `contracts`, `periodos`, `csrf`) mantido em cache durante a geração do relatório, renovando o CSRF apenas quando a resposta indicar expiração (`401`/`403` ou erro de CSRF).
  - **B6**: Confirmado no HTML/`gestao-ponto.js` do SPT o preenchimento de `codTSE` (`data-cod-tse || data-cpf`) e aplicado em `parseWorkersFromConsultationDoc`, `sptModernizer` e `sptReportModal`.
- Verificação: **242 testes de comportamento passando**.

## 1.2.17-Snapshot — 18/11/2026

- **Bloco A — Regras de cálculo e fiscalização do SPT (`sptCltCalc.js`, `sptReportModal.js`, `sptModernizer.js`, `spt-gestao.css`)**:
  - **A1**: Home Office presumido (`08:00`) **desligado por padrão** (com migração única de preferências salvas `hoDefaultMigratedV2`), coluna visível **`Dias úteis sem registro`** quando desligado (sem gerar débito automático) e, quando ligado, aplicação a todo dia útil sem batida e sem justificativa (sem exigir dia presencial) com destaque visual `.je-spt-row-homeoffice`.
  - **A2**: Removida a heurística de alocação de segunda/sexta como Reposição de DSR e substituída pelo alerta objetivo **"Trabalho em domingo / >6 dias consecutivos sem folga identificada (CLT art. 67; OJ 410 TST)"**, que considera a sequência na virada entre meses consecutivos e não altera nenhum total.
  - **A3**: Mantidas **`Saldo BH (Úteis) = HE 50% − Débito BH`** e **`HE 100% (FDS)`** como colunas independentes (fiéis ao cartão ponto da empresa) e renomeada a coluna combinada para **`Visão TSE XT: Saldo BH + HE 100% (não é regra da empresa)`**, explicando no anexo que mistura adicionais de 50% e 100%.
  - **A4**: Removidos os feriados forenses (`11/08`, `01/11`, `08/12`) da lista padrão CLT; incluídos **Sexta-feira Santa** (calculada a partir da Páscoa) e **`30/11`** (DF); adicionado controle editável **`Feriados (+/-)`** no modal e listagem no Anexo dos feriados aplicados no período.
  - **A5**: Adicionada opção configurável **"Descontar 1h de intervalo não registrado em Sáb/Dom/Feriado (>6h)"**, ligada por padrão (CLT art. 71 / SPT) e que, quando desligada, reproduz o cartão Digisystem.
  - **A6**: `getLocalTodayIso` passa a usar a data local (`America/Sao_Paulo`) em vez de `toISOString()` (UTC).
  - **A7**: O Anexo de Interpretação lista todas as opções ativas (modo, Home Office, desconto de intervalo em FDS/feriado, tolerância e feriados aplicados no período).
- Verificação: **238 testes de comportamento passando**.

## 1.2.16-Snapshot — 18/11/2026

- **Coluna `HE Líquida (após Débitos)` no Relatório do SPT (`sptReportModal.js`)**:
  - Renomeada a última coluna numérica da consolidação mensal de `Saldo Total` para **`HE Líquida (após Débitos)`** (na tela, na impressão/PDF e no CSV como `HE_Liquida_Apos_Debitos`) e adicionado o 6º card de KPI correspondente, tornando autoexplicativo que o **Débito BH** dos dias úteis (horas faltantes para completar `08:00/dia`) é descontado em 2 etapas: primeiro das **HE 50%** (`Saldo BH Úteis = HE 50% − Débito BH`) e, caso remanesça saldo negativo, das **HE 100%** (`HE Líquida = Saldo BH Úteis + HE 100%`).
- **Tooltips (`title`) em todos os campos (`sptReportModal.js`)**:
  - Adicionados tooltips explicativos em todos os campos de filtro, botões de ação, cards de KPI, mini-KPIs diários, cabeçalhos (`<th>`), células (`<td>`) e rodapés de totais (`<tfoot>`) nas visões Mensal e Diária (modos `TSE XT / Digi` e `SPT Puro`).
- **Anexo de Interpretação no Relatório (`sptReportModal.js` e `spt-gestao.css`)**:
  - Incluída ao final do relatório (tanto no modal em tela quanto no documento impresso/PDF) a seção **"Anexo — Guia de Interpretação, Fórmulas e Regras de Apuração (TSE XT / Digi)"**, documentando o desconto de horas devidas nas Horas Extras, o dicionário de todas as colunas/fórmulas e as 4 regras trabalhistas e contratuais aplicadas.
- Verificação: **237 testes passando**.

## 1.2.15-Snapshot — 17/11/2026

- **Ajuste de impressão na coluna `Dias` do consolidado mensal do SPT (`sptReportModal.js`)**: subtítulo de detalhamento (`u + ho + f + dsr`) quebrado em segunda linha para não invadir a coluna `Total SPT` no rodapé consolidado da unidade.
- Verificação: **235 testes passando**.

## 1.2.14-Snapshot — 17/11/2026

- **Tela de logon do SPT modernizada (`sptModernizer.js`, `content.js`, `spt-gestao.css`)**:
  - Aplicado o mesmo padrão visual da tela de logon do Meu Espaço à página `/spt-consultafrequencia/login`: bloco de marca superior com logo oficial e selo de versão, cartão central (`340px`) com Glassmorfismo e `jeCardGlowPulse`, campos e rótulos padronizados, botão primário `LOGIN` em degradê azul e botão secundário `Recuperar senha`, interruptor flutuante `TSE XT Ativo/Desligado` no canto superior direito e ativação do Boot Splash no `beforeunload`.
- Verificação: **235 testes passando** e conferência visual no Chrome (porta 9222).

## 1.2.13-Snapshot — 17/11/2026

- **Controle de Home Office (8h) + Reposição de DSR no SPT (`sptCltCalc.js` e `sptReportModal.js`)**:
  - Novo checkbox nos filtros do relatório: **"Presumir Home Office (8h) em dias úteis sem batida + Reposição de DSR (> 6d seguidos)"** (ativo por padrão no modo `TSE XT / Digi`, com recálculo instantâneo em memória ao marcar/desmarcar).
  - Nos dias úteis sem passagem na catraca do SPT (para colaboradores ativos no mês), contabiliza a jornada ordinária de `08:00` como concluída (`Home Office (8h)`), **sem gerar batidas fictícias** (`E1..S3` e `Total SPT` permanecem em branco/originais).
  - **Reposição automática de DSR (CLT art. 67 / OJ 410 TST)**: quando o colaborador trabalha no domingo / ultrapassa 6 dias seguidos, aloca automaticamente o dia de folga compensatória (`Reposição de DSR`, com jornada `00:00`, ex.: `05/10` e `30/10`), fechando os mesmos 19 dias úteis (`152:00`) do Cartão Ponto da empresa.
- Verificação: **234 testes passando**.

## 1.2.12-Snapshot — 17/11/2026

- **Novo controle de Modo no Relatório do SPT (`sptReportModal.js`)**: permite alternar entre **TSE XT / Digi** (padrão) e **SPT Puro (Bruto)** (exibe exclusivamente as marcações e o Total bruto do SPT, sem cálculos interpretativos), tanto na tela quanto no CSV e na impressão A4.
- **Regras CLT / Digisystem no modo TSE XT / Digi (`sptCltCalc.js`)**:
  - **Sábados, Domingos e Feriados com jornada ordinária `00:00`**: 100% das horas trabalhadas em fim de semana/feriado contam como **HE 100%** (e nunca geram "Horas a Menos" / Débito BH quando o plantão for inferior a 8h).
  - **Tolerância CLT (art. 58, § 1º — até 10 min/dia)** nos dias úteis: variações diárias entre `07:50` e `08:10` contam como jornada normal (`08:00`), sem gerar HE 50% nem Débito BH.
  - **Separação de colunas igual ao rodapé do Cartão Ponto da Digisystem**: **H. Normais**, **HE 50% (BH)**, **Débito BH**, **Saldo BH (Úteis = HE 50% − Débito BH)** e **HE 100% (FDS / >2h)**.
- Verificação: **233 testes passando** e conferência ao vivo no Chrome (porta 9222).

## 1.2.11-Snapshot — 17/11/2026

- **Posição do botão de liga/desliga no SPT**: quando o TSE XT está desligado no SPT (`body.je-xt-disabled.je-spt-page`), a pílula flutuante `#je-persistent-toggle-bar` passa a ficar posicionada no canto inferior direito (`bottom: 58px; right: 24px`), livre dos botões **Alterar Senha** e **Sair** do cabeçalho principal.
- **Visual da combobox de Unidade no SPT**: neutralizada a regra global `body.je-xt-enabled input[type="text"]` dentro de `.je-spt-combobox`, eliminando a borda e o sombreamento internos duplicados ("componente acavalado no outro"), unificando altura (`38px`) e raio de borda com os demais seletores do cartão e alinhando o checkbox `Buscar unidades abaixo`.
- Verificação: **231 testes passando** e conferência visual no Chrome (porta 9222) nos estados ligado e desligado.

## 1.2.10-Snapshot — 17/11/2026

- Menu do ícone da extensão (`popup`) evoluído com a seção **Portais suportados**, contendo chaves habilitadoras independentes para cada portal (**Meu Espaço TSE** e **SPT — Frequência**) e links diretos para abrir cada portal em nova aba.
- Sincronização bidirecional entre as chaves habilitadoras do popup e o interruptor de tema dentro de cada portal (`xtEnabledMeuEspaco` e `xtEnabledSpt`).
- Verificação: **231 testes passando**, incluindo os novos testes de chaves e links do popup (`popupPortals.test.mjs`), versão e empacotamento; conferência visual do popup no Chrome.

## 1.2.9-Snapshot — 17/11/2026

- Primeira expansão do TSE XT além do Meu Espaço: suporte ao **SPT — Gestão de Frequência de Prestadores** (`https://spt-consultafrequencia.tse.jus.br/spt-consultafrequencia/gestao`), aplicando o Design System Glassmorfismo Tátil (topbar, banner de título, interruptor de tema, cartões, tabelas e 5 KPIs CLT no acompanhamento individual).
- Seleção de **Unidade** por digitação/pesquisa instantânea (combobox pesquisável por nome, caminho hierárquico ou código) na tela principal e no modal de relatório.
- Botão flutuante **(+)** no SPT com o **Relatório Consolidado de Horas por Unidade (Regras CLT)**: parâmetros de Unidade (obrigatório), Período com data inicial e final (obrigatório, pré-preenchido com o mês anterior ao atual), Contrato (opcional), Nome do Prestador (carregado dinamicamente conforme unidade e contrato) e Detalhe **Mensal** (consolidação CLT: jornada de 8h diárias, intervalo mínimo de 1h de almoço, horas excedentes, horas a menos, compensação dentro do mês e saldo líquido) ou **Diário** (espelho de ponto completo por prestador), com exportação CSV e impressão A4.
- Proteção no `background.js` para não recarregar automaticamente abas abertas no Espelho de Ponto durante atualizações da extensão.
- Verificação: **229 testes passando**, incluindo cálculos CLT, fatiamento de períodos multi-mês, hierarquia de unidades, versão e empacotamento; conferência visual ao vivo no SPT via CDP (porta 9222).

## 1.2.8-Snapshot — 13/11/2026

- Rótulos padronizados como **Compensou dias curtos** e **Compensou dias curtos (FDS)**, conforme solicitado. Espelho e Reconhecimento Posterior (tela e impressão) usam o vocabulário compartilhado; cabeçalhos CSV do Reconhecimento e das Horas Perdidas também adotam Compensou.
- Mantidas as explicações de tempo trabalhado e fatores ×1,5/×2; cálculos preservados.
- Verificação: suíte de 222 testes, incluindo destinos mensais, relatórios, versão e empacotamento.

## 1.2.7-Snapshot — 13/11/2026

- Corrigida a coluna excedente nos totais do espelho: a reserva vazia nativa de seis posições era mantida junto às novas células, produzindo 25 posições para um cabeçalho de 19. A reserva passa a ocupar somente as duas posições finais, sem alterar os valores nativos.
- Destino do mês distribuído pela grade do cabeçalho. Pago, Pago noturno e Perdido apontam para seus totais acima, sem repetir valores; excedente, compensações, banco e avisos têm explicações sobre suas fontes.
- Compensações são reconstruídas de TOTAL e jornada diária, sem apresentá-las como soma de HORAS AJUST. ou Compl. Jorn. Mínima. Banco permanece vinculado às Horas Excedentes Homologadas do rodapé; cobertura de fim de semana não cria crédito.
- Verificação: **222 testes passando**, com regressões para meses abertos/fechados, reprocessamento, reserva nativa e alocação dos indicadores. Conferência visual no mês fechado real: cabeçalho, totais e destinos com 19 posições, dados nativos preservados após duas aplicações.
- Correção de desenvolvimento; liberação estável 1.2.6 e sua submissão à loja preservadas.

## 1.2.6 — 13/11/2026

- Liberação estável solicitada pelo responsável, consolidando os desenvolvimentos 1.2.1 a 1.2.6 sem reescrever commits ou mover a tag 1.2.0.
- Seleção individual, múltipla ou de toda a equipe; preferências locais dos três relatórios; PDF institucional em A4 retrato; botão flutuante discreto; ressalvas normativas e proteção de exportação.
- Automação oficial de upload por OIDC sem chave permanente. Descrição e privacidade atualizadas no Developer Dashboard; capturas já revisadas da série 1.2 preservadas. Submissão autorizada para publicação automática após aprovação do Google.
- Verificação: 217 testes, incluindo parâmetros restaurados, isolamento por login/servidor e inspeção do ZIP; conferências autenticadas e PDFs nos dois agrupamentos realizadas na preparação da série.
- Artefatos e limites em [release-1.2.6.md](docs/release-1.2.6.md). As entradas Snapshot abaixo são o histórico de preparação.

## 1.2.6-Snapshot — 13/11/2026

- Parâmetros dos relatórios do botão “+” persistidos em `chrome.storage.local`, separados por login.
- Reconhecimento Posterior: período, matrículas selecionadas, unidade e agrupamento. Seleção vazia preservada; servidores não disponíveis na equipe atual são ignorados.
- Auditoria de Pagamento: período e filtro “Só o que precisa de conferência”. Auditoria de Horas Perdidas: coluna e direção da ordenação, por servidor consultado, mantidas durante atualizações.
- Mudanças são salvas sem exigir geração. Na primeira abertura, períodos dos resultados anteriores são aproveitados. Exportações de resultados com período ou seleção divergentes exigem nova geração.
- Política de privacidade atualizada para descrever os parâmetros locais; nenhuma permissão nova.
- Verificação: **217 testes passando**, incluindo restauração em nova instância, seleção vazia, migração do último período, isolamento por login/servidor e empacotamento. Preferências dos três relatórios conferidas no Chrome após navegação.

## 1.2.5-Snapshot — 13/11/2026

- Botão flutuante de ações rápidas com azul institucional sólido, borda discreta e sombra suave, removendo a borda nativa em relevo, o gradiente e o brilho intenso.
- Estado aberto continua azul; preservada a rotação do ícone para fechar, com movimento sutil ao passar o mouse e foco visível para teclado.
- Conferência visual no Chrome nos estados fechado, aberto e com foco; sem mudança nas ações do menu.
- Verificação: **209 testes passando**, incluindo consistência da versão e empacotamento; acabamento conferido na página real.

## 1.2.4-Snapshot — 13/11/2026

- Reconhecimento Posterior com impressão institucional: tipografia alinhada à tela, azul discreto, metadados organizados e resumo compacto de Excedente, Pago, Banco e Perdido.
- Tabelas com linhas leves, faixas alternadas, totais destacados e cabeçalhos repetidos; rodapé com numeração de páginas. Mantidos A4 retrato e margens de 12mm.
- Estilos de impressão isolados de fundos, sombras e elementos flutuantes do portal. Observações sem divisão interna e critérios de apuração em seção própria.
- Mesmos valores, motivos, ressalvas normativas e agrupamentos; sem mudança nos cálculos.
- Verificação: **209 testes passando**, PDF real nos dois agrupamentos, três páginas na amostra atual, texto dentro da página e paginação conferidos, todas as páginas renderizadas e revisadas.
- Encerrada a pendência visual da 1.2.3 após recuperação da sessão: seleção de 1, 2 e 6 servidores, CSV e impressão conferidos, 72 consultas concluídas sem erros no período original.

## 1.2.3-Snapshot — 13/11/2026

- Reconhecimento Posterior: seleção visível de um, vários ou todos os servidores, com ações de selecionar todos e limpar seleção.
- Mudanças de seleção/período exigem nova geração antes de exportar. Controles bloqueados durante a consulta.
- Excedentes dos meses reduzidos discriminados; opção de banco explicitamente simulada, sujeita ao ato e à autorização, na tela, CSV e impressão A4 retrato.
- Conferência normativa: Portarias 461/2023 e 269/2025 são as fontes de julho; não confirmada proibição geral de banco para todo janeiro/julho. Conversão acima de 5h por decisão da DG nas Portarias 885/2024 e 552/2025 refere-se ao recesso forense (20/12–06/01).
- Preservados os lançamentos homologados oficiais e a apuração de excedentes sem destino. D7 continua aberta para calendário histórico e intervalo.
- Verificação: **209 testes**, incluindo consultas, CSV e impressão para 1/2/todos, invalidação de exportação, cálculos de jornada reduzida nos três consumidores, totais, exclusão de híbrido/aberto e empacotamento.
- Conferência visual autenticada pendente: sessão do Meu Espaço expirada e recuperação automática parou em CAPTCHA. Snapshot de desenvolvimento; a tag estável 1.2.0 e seus materiais de distribuição permanecem preservados.

## 1.2.2-Snapshot — 12/11/2026

- Executar testes e empacotamento da tag com Windows PowerShell no GitHub Actions, evitando herdar o ambiente de módulos do PowerShell 7.
- A primeira execução real identificou `Get-FileHash` indisponível no subprocesso; parou antes de autenticar, fazer upload ou submeter revisão.
- A tag estável 1.2.0 permanece inalterada.

## 1.2.1-Snapshot — 12/11/2026

- Workflow da Chrome Web Store com operações separadas de status, upload e submissão para revisão.
- Google Cloud e GitHub autenticam por Workload Identity Federation/OIDC, sem chave privada permanente.
- O pacote é gerado de uma tag anotada e estável pertencente ao histórico da main, mesmo que a ferramenta de automação esteja numa versão de desenvolvimento posterior.
- Publicação após aprovação permanece manual (`STAGED_PUBLISH`); o cliente impede reenvio de revisão existente e não substitui outra versão pendente.
- Testes do cliente da API cobrem upload binário, processamento assíncrono, revisão, repetição e erros sem vazamento de token.

A última versão estável da extensão continua sendo **1.2.0**. Não foi criada nem movida outra tag estável para esta automação.

## 1.2.0 — 12/11/2026

Consolida as evoluções da série 1.1, com aprovação visual para liberação em 12/11/2026. Fonte do changelog exibido na extensão: `content/modules/version.js`.

- Novo Relatório de Reconhecimento Posterior para a equipe: destinos das horas, alternativas de pecúnia ou banco, agrupamentos por servidor ou por mês, CSV e impressão A4 retrato.
- Nova Auditoria de Pagamento de Pecúnias: compara o espelho com rubricas e referências dos próprios contracheques, incluindo folhas suplementares e adicional noturno; CSV e impressão.
- Auditoria de Horas Perdidas com cinco categorias, motivos por dia e avisos para conferência; mês aberto e regime híbrido tratados separadamente.
- Horas não pagas de sábado cobrem dias curtos com ×1,5; domingo e feriado, com ×2, inclusive acima de 10h, antes de contar a sobra como perda.
- SALDO ACUM. de controle dia a dia, linha Destino do mês e avisos de divergência; o crédito oficial continua restrito às horas homologadas.
- Relatórios sem limite fixo de período, com progresso e previsão de término; resultados anteriores à regra de cobertura pedem recálculo.
- Ajuste de ponto de integrantes da equipe pela chefia, com identidade e data preenchidas no modal e validação de permissão.
- Destaque e totais de pecúnia e adicional noturno, renderização idempotente e cabeçalho do Espelho fixo durante a rolagem.
- Jornada de 7h em turno único, 8h com intervalo e tratamento atual de recesso preservados; dúvidas de fechamento continuam documentadas.
- Dados e resultados permanecem no navegador; leituras autenticadas somente nos próprios sistemas do TSE e exportações por ação do usuário.

### Atualização

- Refaça a Auditoria de Horas Perdidas com **Full Update** e gere novamente os relatórios salvos antes da cobertura de fim de semana.
- Jornada e pendências normativas preservadas; a versão não encerra todos os itens da Trilha C.
- O pacote inclui `icons/base.png`, recurso exigido pelo manifesto e usado no carregamento.

### Verificação

- 193 testes automatizados, incluindo inspeção do ZIP e de todos os arquivos declarados no manifesto.
- Na preparação da série: Full Update real de 215 meses, Reconhecimento Posterior de 6 servidores, CSV e impressão nos dois agrupamentos.
- Pacote e materiais da loja descritos em [release-1.2.0.md](docs/release-1.2.0.md).

## 1.0.0 — 23/09/2026

Marco anterior: modernização do menu clássico, módulos dedicados de frequência, reembolso farmacêutico e gestão de serviço extraordinário, carregamento de login e preferências locais. Histórico completo no changelog da extensão e na [tag v1.0.0](https://github.com/lukeboh/tse-xt/releases/tag/v1.0.0).
