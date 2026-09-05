# 🎨 Roadmap de Arquitetura Visual — Expansão do TSE XT às demais funcionalidades

**Versão do documento:** 1.3.0
**Data:** 05/09/2026

> Plano de implantação para levar o padrão visual do TSE XT (hoje restrito ao Espelho de Ponto e à Alteração de Ponto) às demais ~50 funcionalidades do menu do Meu Espaço. Diagnóstico da arquitetura atual, evidências e decisões de escopo estão registrados como memória de projeto da sessão que originou este documento. Os IDs `F#` (fase) são estáveis para rastreio em commits. Severidade/risco: 🔴 alto · 🟡 médio · 🟢 baixo.

| ID | Fase | Risco | Depende de | Status |
| :--- | :--- | :--: | :--- | :--- |
| F1 | Abrir injeção e criar registro de páginas suportadas | 🔴 | — | ✅ v0.6.1 |
| F2 | Título de página genérico (extraído do `<h2>` nativo) | 🟡 | F1 | ✅ v0.6.2 |
| F3 | Modernizador de tabela genérico (por texto de cabeçalho) | 🔴 | F1 | ✅ v0.6.3 |
| F4 | Reorganização física do `content.css` (design system × página) | 🟢 | F1 | ✅ v0.6.4 |
| F5 | Piloto: Extrato do Banco de Horas | 🟡 | F1, F2, F3 | ✅ v0.6.5 |
| F6 | Piloto: tela só-formulário (Contracheque) | 🟢 | F1, F2 | ✅ v0.6.5 |
| F7 | Expansão incremental para as demais funcionalidades do menu | 🟡 | F5, F6 | ⏳ |

---

## Diagnóstico resumido

Inspeção ao vivo (via CDP, sessão de 04/09/2026) confirmou:

1. **O bloqueio nº 1 é o `manifest.json`**, não o CSS: `content_scripts.matches` só injeta JS+CSS em URLs `EspelhoPontoMesAction_*` e `EspelhoPontoDiaAction_*`. Nenhuma outra tela do menu recebe o `content.css` hoje.
2. **O bloqueio nº 2 é `content.js`**: `isSupportedPage` só monta a UI se achar `#tblEspelhoPontoMesCorrente` ou `#formEspelhoPontoDia` — um booleano único, não um registro por página.
3. **A "casca" genérica já funciona em qualquer tela**: `.servidor`/`.matricula`/`.lotacao`/`.ipServidorLogado` (dados do servidor), `#container`/`#topo`/`#menu-lateral`/`#barra-superior`/`.span-*` (grid legado) existem em todo o portal. `navDrawer.js` já lê o `#menu-lateral` nativo em runtime. Command palette, FAB de ações rápidas, toggle de tema e o sistema de modal (`.je-modal-overlay`) são estruturalmente agnósticos de página. O botão principal de busca usa o texto **"CONSULTAR"** tanto no Espelho quanto no Contracheque — convenção real do portal já coberta pelo seletor `input[value="CONSULTAR"]`.
4. **Dois pontos hardcoded para o Espelho travam qualquer expansão:**
   - `injectPageTitleHeader()` ([domModernizer.js](../content/modules/domModernizer.js)) é um `if/else` fechado (breadcrumb/título/pill de referência só para Espelho-Mês vs Espelho-Dia).
   - `modernizeTable()` depende de `#tblEspelhoPontoMesCorrente` e das classes de coluna `h01`–`h17`, geradas pelo iterator Struts **só** daquela tela.
5. **A estrutura nativa varia muito entre páginas** — confirmado em 3 telas reais:
   - Extrato do Banco de Horas: `<table>` **sem nenhuma classe**, nem na tabela nem em `<tr>`/`<td>`.
   - Contracheque (tela de filtro): **sem tabela nenhuma** antes de consultar.
   - Homologação de Banco de Horas: idem, sem tabela no estado vazio.
   - Toda página tem um `<h2>` nativo solto com o nome exato da funcionalidade (ex.: `<h2>Contracheque e Rendimentos</h2>`), hoje escondido genericamente pela regra `#container > h2 { display:none }` — dá para ler esse texto antes de escondê-lo.

---

## F1 — ✅ Abrir injeção e criar registro de páginas suportadas (v0.6.1)

- **Era:** `manifest.json` restringia `content_scripts.matches` a `EspelhoPontoMesAction_*`/`EspelhoPontoDiaAction_*`; `content.js` decidia "página suportada" com um único booleano (`isSupportedPage`).
- **Implementado:** `matches` ampliado para `*://meuespaco.tse.jus.br/portalservidor2/*` (e equivalente `*.tse.jus.br`), com `exclude_matches` para `Login*`/`Logout*`; `content.js` ganhou `PAGE_PROFILES`/`resolveProfileId()` no lugar do booleano — a casca genérica (topbar, drawer, busca, FAB, toggle) monta em qualquer tela com `#container`, enquanto formulário/tabela seguem restritos aos perfis conhecidos.
- **Validado ao vivo (CDP):** Espelho de Ponto idêntico; Extrato do Banco de Horas ganhou topbar/menu/busca sem título nem KPIs indevidos.

## F2 — ✅ Título de página genérico (v0.6.2)

- **Era:** título/breadcrumb/pill de referência eram texto fixo por `if/else` (Espelho-Mês vs Espelho-Dia).
- **Implementado:** `injectPageTitleHeader(profileId)` usa um mapa `KNOWN_PAGE_TITLES` para os dois perfis já portados (texto idêntico a antes) e, para qualquer outra página, extrai o título do `<h2>` nativo (`extractNativePageTitle()` — primeiro `<h2>` fora do `#menu-lateral` e fora de qualquer contêiner injetado pelo próprio TSE XT) e infere a categoria do breadcrumb reaproveitando `navDrawer.extractMenuData()` (`findBreadcrumbCategory()` — casa o texto do `<h2>` com o nome de algum link do menu). A pill de referência só renderiza se `#mesSelecionado`/`#anoSelecionado` existirem.
- **Cuidado registrado:** a exclusão de UI injetada não pode usar `.closest('[class*="je-"]')` — `<body class="je-xt-enabled">` sempre bate com esse seletor e faz a extração falhar para todo mundo (caiu num bug assim na implementação; corrigido checando só `id` com prefixo `je-`, parando a subida em `document.body`).
- **Validado ao vivo (CDP):** Espelho de Ponto idêntico; Contracheque → "Meu Espaço / Financeiro / Contracheque e Rendimentos"; Extrato do Banco de Horas → "Meu Espaço / Banco de Horas / Extrato do banco de horas".

## F3 — ✅ Modernizador de tabela genérico (v0.6.3)

- **Era:** `modernizeTable()` só entendia a tabela do Espelho (ID fixo + classes de coluna `h01`–`h17`).
- **Implementado:** novo módulo `tableModernizer.js` (`modernizeGenericTables()`, só roda quando não há perfil de página conhecido). `isDataTable()` distingue tabela de resultados de tabela de layout de formulário pela densidade de `input/select/textarea/button` dentro das células (acima de 25% das células com controle ⇒ é layout, ignora); tabelas aprovadas ganham as classes `je-modernized-table` (reaproveita o visual completo já existente para `.je-modernized-table`/`table.grid`) e `je-generic-data-table` (zebra + suporte a `.je-col-numeric`). `classifyNumericColumns()` marca como numérica qualquer coluna onde ≥80% das células não-vazias batem com número/moeda ou `hh:mm`. `classifyStatusBadges()` troca células de texto puro que batem exatamente com uma palavra-chave conhecida (Sim/Não, Homologado, Pendente, etc.) por um badge colorido, reaproveitando os tokens semânticos de sucesso/alerta/erro.
- **Critério de pronto:** atingido — a tabela do Extrato do Banco de Horas (nativamente sem nenhuma classe) recebeu zebra, alinhamento numérico nas 4 colunas de hora e o visual completo do design system sem nenhum CSS específico daquela página.
- **Validado ao vivo (CDP):** Extrato do Banco de Horas — colunas "Horas Adquiridas/Utilizadas/Vencidas/Saldo" corretamente marcadas `.je-col-numeric`, zebra alternando linha a linha; Contracheque (sem tabela) sem erro nenhum; Espelho de Ponto sem nenhuma marca `.je-generic-data-table` (path genérico nunca roda lá, confirmado).

## F4 — ✅ Reorganização física do `content.css` (v0.6.4)

- **Era:** 3985 linhas num arquivo só, sem separação entre design system (tokens/reset/chrome) e específico de página; alguns comentários de seção nomeavam como "Espelho de Ponto" componentes que já eram genéricos.
- **Implementado:** `content.css` (2247 linhas) ficou só com o design system — tokens, reset de layout legado, topbar, banner de título, drawer, busca rápida, ações rápidas, toggle, popup de calendário e a base compartilhada `table.je-modernized-table`/`table.grid` que o modernizador genérico de tabela (F3) usa. Novo `content/espelho-ponto.css` (1983 linhas) recebeu tudo que depende de estrutura nativa exclusiva do Espelho/Alteração de Ponto: `#tblEspelhoPontoMesCorrente`, `#opcoes-consulta`, `#formEspelhoPontoMes`, classes de coluna `h01`-`h17`, KPIs, coluna de saldo acumulado, auditoria de horas perdidas. Nas duas seções mistas (reset e painel de filtros) e na base da tabela, regras com seletores combinados (ex.: `.moldura, #conteudo > div:nth-child(2) > div.moldura`) foram separadas por arquivo, duplicando a declaração quando necessário — CSS não tem como uma regra "continuar" em outro arquivo.
- **Manifest:** `content_scripts.css` agora lista os dois arquivos, `content.css` primeiro (design system) e `espelho-ponto.css` depois — ambos carregam em toda página autenticada do Meu Espaço (o manifest não tem carregamento condicional por página), então a separação é só organizacional, sem risco funcional de "faltar" um arquivo em alguma tela.
- **Verificação:** script que extrai todo par (seletor, propriedade) do CSS original e dos dois novos arquivos e compara os conjuntos — confirmou **zero** declaração perdida (o conjunto original é subconjunto exato do novo); as únicas 6 diferenças "a mais" são um reforço intencional (o hover dos botões da `.moldura` passou a valer pela classe genérica também, não só pelo seletor posicional antigo — aditivo, sem regressão).
- **Critério de pronto:** atingido — reorganização pura, sem mudança visual (validado ao vivo via CDP no Espelho de Ponto, Alteração de Ponto e Extrato do Banco de Horas).

## F5 — ✅ Piloto: Extrato do Banco de Horas (v0.6.5)

- **Por quê primeiro:** já ganha topbar/menu/busca de graça (F1); testa o modernizador de tabela genérico (F3) numa tabela real e simples (5 colunas, sem paginação).
- **Resultado:** título/breadcrumb (F2) e tabela genérica (F3) já validados ao vivo nas fases anteriores. O único gap encontrado ao revisar de perto foi o botão de busca "CONSULTAR" — ainda não virava o `<button>` moderno fora do Espelho, porque `modernizeForm()` só roda com perfil conhecido. Corrigido nesta fase (ver F5/F6 abaixo): nova `modernizeGenericFormButtons()`.
- **Sem perfil de página dedicado:** não foi necessário criar um perfil específico em `PAGE_PROFILES` — o caminho genérico (F1-F3 + o botão novo) já cobre 100% do que essa tela precisa. Perfis dedicados ficam reservados para telas que realmente precisem de lógica de negócio própria (como o Espelho).

## F6 — ✅ Piloto: tela só-formulário (Contracheque e Rendimentos) (v0.6.5)

- **Por quê:** valida que o template tolera telas sem grade de resultados (filtro puro) e reaproveita `.moldura`/`.campoPesquisa`/`input[value="CONSULTAR"]` já genéricos.
- **Resultado:** confirmado nas fases anteriores (título "Meu Espaço / Financeiro / Contracheque e Rendimentos", sem erro por não ter tabela). Mesmo gap do F5 (botão "CONSULTAR" cru) corrigido pela `modernizeGenericFormButtons()`.
- **Entregue nesta fase:** `domModernizer.js` ganhou `modernizeGenericFormButtons()` — mesma troca visual de `input[value="CONSULTAR"]`/`input[type="submit"]` por um `<button>` moderno que o Espelho já tinha, mas sem nenhuma parte específica daquelas telas (nome de função Struts, motivo de esquecimento, moldura de ajuste de ponto): o clique só reaproveita `legacyBtn.click()`. `modernizeCalendarIcons()` e `highlightUserAndManagerNames()` (já genéricos, só não eram chamados fora do Espelho) subiram para a casca genérica em `content.js`, rodando em qualquer página. Com isso o trio título+tabela+formulário fica genérico por completo — nenhuma tela nova precisa de código JS dedicado a menos que tenha lógica de negócio própria.
- **Validado ao vivo (CDP):** botão "CONSULTAR" vira `<button class="je-btn-consultar">` em ambas as telas; Espelho de Ponto sem duplicação (modernizeCalendarIcons/highlightUserAndManagerNames idempotentes, chamadas uma vez só efetivamente).

## F7 — 🟡 Expansão incremental para as demais funcionalidades

- **Ação:** portar as demais telas do menu uma a uma, priorizando por uso, cada uma como um perfil de página curto (a maior parte do trabalho pesado já foi feito em F1–F4). Registrar aqui cada tela portada e eventuais desvios de padrão encontrados.

### Cobertura verificada ao vivo (CDP) — v0.6.6

Nenhuma das telas abaixo precisou de perfil de página dedicado — o caminho genérico (F1-F6) já cobre título, tabela e formulário sem código específico:

| Tela | Categoria | Título | Categoria no breadcrumb | Tabela | Botão |
| :--- | :--- | :--- | :--: | :--: | :--: |
| Extrato do Banco de Horas | Banco de Horas | ✅ | ✅ | ✅ genérica | n/a |
| Contracheque e Rendimentos | Financeiro | ✅ | ✅ | n/a (sem tabela) | ✅ |
| Ficha Financeira | Financeiro | ✅ | ✅ | n/a | ✅ "EMITIR FICHA" |
| Declaração de Nepotismo | Declaração | ✅ | ✅ | n/a (lista vazia) | — |
| Afastamentos na equipe | Frequência | ✅ | ✅ (após fix) | n/a | ✅ |
| Teletrabalho | Frequência | ✅ | ✅ | ✅ (vazia até consultar) | ✅ |
| Consulta Benefícios | Benefícios | ✅ | ❌ (sem overlap léxico) | ✅ genérica | n/a |
| Consulta situação dos servidores | Frequência | ✅ | ❌ (sem overlap léxico) | ✅ genérica | ✅ + calendário |
| Dados cadastrais | Assentamentos funcionais | ✅ | ✅ | ✅ genérica (histórico de FC) | n/a |
| Solicitar Horas Extras (SAEX) | Serviço Extraordinário | ✅ (após fix h3) | ❌ | n/a | ✅ + calendário |
| Autorização de compensação de horas | Banco de Horas | ✅ | ❌ | ✅ genérica | ✅ + calendário |
| Capacitação (relatório) | Capacitação | — | — | — | — |

**2 bugs reais encontrados e corrigidos nesta rodada** (`domModernizer.js`):
1. `findBreadcrumbCategory()` só casava por igualdade exata entre o `<h2>` e o texto do link do menu — falhava quando o título nativo é mais específico (`"Afastamentos na equipe"` vs. link `"Afastamentos"`). Ganhou uma 2ª passada por substring (mínimo 4 caracteres) antes de desistir.
2. `extractNativePageTitle()` só olhava `<h2>`. A tela do SAEX (Solicitar/Gerir Horas Extras) não tem nenhum `<h2>` de título, só `<h3>` — caía no fallback genérico "Meu Espaço". Ganhou fallback pra `<h3>` quando não há `<h2>` aproveitável.

**Limitação conhecida, não corrigida (custo/benefício baixo):** quando o `<h2>` nativo e o texto do link do menu não compartilham nenhuma substring em comum (ex.: `"Benefícios Concedidos"` vs. link `"Consulta Benefícios"`; `"Acompanhamento da unidade"` vs. `"Consulta situação dos servidores"`), o breadcrumb fica só com `"Meu Espaço / <título>"`, sem a categoria intermediária. Cosmético — o título e a tabela continuam corretos. Um matching por sobreposição de palavras resolveria, mas não parece valer o risco de falsos positivos por enquanto.

**Confirmado, não é regressão:** `Capacitação (relatório)` não tem `#container` — é um arquétipo de página diferente (relatório), o F1 já reage bem (não monta nada, não quebra). Ainda não mapeado quantas outras telas do menu compartilham esse arquétipo; fica para a próxima rodada de F7.

---

## Tarefas transversais

| # | Tarefa | Serve a |
| :--- | :--- | :--- |
| T1 | Registro central de perfis de página (`{ matcher, mountGeneric, mountTitle?, mountTable?, mountForm? }`) | F1 |
| T2 | Extrator de título genérico reutilizável entre perfis | F2 |
| T3 | Módulo `tableModernizer.js` (novo) desacoplado do Espelho | F3 |
| T4 | Split de `content.css` sem alterar seletores existentes | F4 |
