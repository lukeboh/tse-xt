# 🎨 Roadmap de Arquitetura Visual — Expansão do TSE XT às demais funcionalidades

**Versão do documento:** 1.1.0
**Data:** 04/09/2026

> Plano de implantação para levar o padrão visual do TSE XT (hoje restrito ao Espelho de Ponto e à Alteração de Ponto) às demais ~50 funcionalidades do menu do Meu Espaço. Diagnóstico da arquitetura atual, evidências e decisões de escopo estão registrados como memória de projeto da sessão que originou este documento. Os IDs `F#` (fase) são estáveis para rastreio em commits. Severidade/risco: 🔴 alto · 🟡 médio · 🟢 baixo.

| ID | Fase | Risco | Depende de | Status |
| :--- | :--- | :--: | :--- | :--- |
| F1 | Abrir injeção e criar registro de páginas suportadas | 🔴 | — | ✅ v0.6.1 |
| F2 | Título de página genérico (extraído do `<h2>` nativo) | 🟡 | F1 | ✅ v0.6.2 |
| F3 | Modernizador de tabela genérico (por texto de cabeçalho) | 🔴 | F1 | ⏳ |
| F4 | Reorganização física do `content.css` (design system × página) | 🟢 | F1 | ⏳ |
| F5 | Piloto: Extrato do Banco de Horas | 🟡 | F1, F2, F3 | ⏳ |
| F6 | Piloto: tela só-formulário (Contracheque) | 🟢 | F1, F2 | ⏳ |
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

## F3 — 🔴 Modernizador de tabela genérico

- **Hoje:** `modernizeTable()` só entende a tabela do Espelho (ID fixo + classes de coluna `h01`–`h17`).
- **Ação:** novo módulo que decora **qualquer** tabela de resultados a partir do texto do `<th>` (zebra, alinhamento numérico, badges de status por palavra-chave), sem exigir classes nativas. Deve tolerar página sem tabela nenhuma (estado vazio/tela de filtro).
- **Critério de pronto:** a tabela do Extrato do Banco de Horas (hoje sem nenhuma classe) recebe estilo coerente com o design system sem CSS específico de página.

## F4 — 🟢 Reorganização física do `content.css`

- **Hoje:** 3935 linhas num arquivo só, sem separação entre design system (tokens/reset/chrome) e específico de página (tabela do Espelho, coluna de saldo acumulado, auditoria de horas perdidas); alguns comentários de seção nomeiam como "Espelho de Ponto" componentes que já são genéricos.
- **Ação:** dividir fisicamente em `design-system.css` (tokens, reset, chrome, componentes genéricos) + `espelho-ponto.css` (tabela e features específicas). O manifest MV3 já aceita múltiplos arquivos em `content_scripts.css` — sem bundler envolvido.
- **Critério de pronto:** nenhuma mudança visual; só reorganização, com o objetivo de deixar óbvio o que é seguro reaproveitar ao abrir uma página nova.

## F5 — 🟡 Piloto: Extrato do Banco de Horas

- **Por quê primeiro:** já ganha topbar/menu/busca de graça (F1); testa o modernizador de tabela genérico (F3) numa tabela real e simples (5 colunas, sem paginação).
- **Ação:** criar o perfil de página, aplicar título genérico (F2) e tabela genérica (F3), validar visualmente.

## F6 — 🟢 Piloto: tela só-formulário (Contracheque e Rendimentos)

- **Por quê:** valida que o template tolera telas sem grade de resultados (filtro puro) e reaproveita `.moldura`/`.campoPesquisa`/`input[value="CONSULTAR"]` já genéricos.
- **Ação:** criar o perfil de página, validar o formulário de filtro com o design system sem tabela.

## F7 — 🟡 Expansão incremental para as demais funcionalidades

- **Ação:** portar as demais telas do menu uma a uma, priorizando por uso, cada uma como um perfil de página curto (a maior parte do trabalho pesado já foi feito em F1–F4). Registrar aqui cada tela portada e eventuais desvios de padrão encontrados.

---

## Tarefas transversais

| # | Tarefa | Serve a |
| :--- | :--- | :--- |
| T1 | Registro central de perfis de página (`{ matcher, mountGeneric, mountTitle?, mountTable?, mountForm? }`) | F1 |
| T2 | Extrator de título genérico reutilizável entre perfis | F2 |
| T3 | Módulo `tableModernizer.js` (novo) desacoplado do Espelho | F3 |
| T4 | Split de `content.css` sem alterar seletores existentes | F4 |
