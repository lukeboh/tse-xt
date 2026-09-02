# 🗺️ Roadmap de Conformidade — Ajustes de regra no TSE XT

**Versão do documento:** 1.1.0
**Data:** 02/09/2026

> Itens **acionáveis** para alinhar o cálculo do TSE XT às regras verificadas do sistema oficial ([regras-calculo-frequencia.md](regras-calculo-frequencia.md)). Perguntas ainda sem resposta estão em [duvidas-normativas.md](duvidas-normativas.md). Os IDs `R#` são estáveis para rastreio em commits e no [README](../README.md#-roadmap). Severidade: 🔴 alto · 🟡 médio · 🟢 baixo.

| ID | Título | Sev. | Origem |
| :--- | :--- | :--: | :--- |
| R1 | `SALDO ACUM.` só creditar horas **homologadas** | 🔴 | ex-C1b |
| R2 | Pecúnia zerada em mês híbrido + alerta de trabalho de FDS perdido | 🟡 | ex-C2 |
| R3 | Três estados de banco de horas | 🔴 | ex-C3 |
| R4 | Jornada-alvo de 7h e faixa de complementação 7h–8h | 🟡 | ex-C4 |
| R5 | Tetos legais de horas extras (2h / 10h / 60h) | 🟡 | ex-C5 |
| R6 | Excedente sem autorização prévia | 🟡 | ex-C6 |
| R7 | Conceito de "plantão/eleição" para pecúnia de domingo/feriado | 🟡 | ex-C7 |
| R8 | Alerta de repouso interjornada < 8h | 🟢 | ex-C8 |
| R9 | Adicional noturno — documentar limitação | 🟢 | ex-C9 |
| R10 | Atualizar a seção "Legislação de referência" injetada | 🟢 | ex-C11 |

---

## R1 — 🔴 `SALDO ACUM.` só creditar horas homologadas

- **Hoje:** todo excedente líquido de sábado/domingo entra no `SALDO ACUM.` com fator 1,5/2,0 ([balanceCalc.js:50](../content/modules/balanceCalc.js#L50), [:62](../content/modules/balanceCalc.js#L62)).
- **Regra oficial:** só as `Horas Excedentes Homologadas` vão ao banco (com fator por tipo de dia). O que virou **pecúnia** ou ficou **não homologado** não entra — ver [regras §3.1](regras-calculo-frequencia.md#31-os-três-destinos-do-excedente-diário).
- **Impacto:** em meses eleitorais recentes (todo o FDS vira pecúnia) o `SALDO ACUM.` sobe dezenas de horas indevidamente.
- **Ação:**
  1. Creditar no `SALDO ACUM.` apenas a parcela `Horas Excedentes Homologadas` do rodapé, aplicando `SATURDAY_FACTOR` / `SUNDAY_HOLIDAY_FACTOR`.
  2. Tratar `Pecúnia` e `Não Homologadas` como fora do banco.
  3. Rotular o `SALDO ACUM.` como **prévia do "Horas Adquiridas" do Extrato do Banco de Horas**, não leitura da coluna nativa.
  4. Reconciliar com o Extrato do Banco de Horas quando disponível.
- **Feature correlata no README:** "Horas executadas não homologadas no KPI Banco de Horas" (destacar/contabilizar à parte as `Horas Excedentes Não Homologadas`).

## R2 — 🟡 Pecúnia zerada em mês híbrido + alerta de trabalho de FDS perdido

- **Hoje:** "a pecúnia não é mais zerada em meses de regime híbrido/teletrabalho" (README, série 0.3.x).
- **Regra oficial:** em mês com trabalho híbrido/teletrabalho o sistema **suprime integralmente** o serviço extraordinário — pecúnia, homologadas e banco = 00:00; trabalho de fim de semana é descartado (art. 22-23 da Portaria 490/2022; art. 12 da Portaria 380/2026). Confirmado em 16 meses — ver [regras §3.7](regras-calculo-frequencia.md#37-trabalho-híbrido--teletrabalho--supressão-integral-do-serviço-extraordinário).
- **Ação:**
  1. Restaurar a zeragem da **pecúnia projetada** (mês corrente) quando o mês tem ≥ 1 dia híbrido/teletrabalho. Meses fechados já vêm com `.h12 = 00:00`.
  2. **Novo:** alertar quando houver marcação de trabalho em fim de semana/feriado num mês híbrido — essas horas não geram pecúnia nem banco.

## R3 — 🔴 Três estados de banco de horas

- **Hoje:** ≥ 1 dia híbrido/teletrabalho ⇒ coluna `SALDO ACUM.` suprimida, KPI de BH "Sem acúmulo", KPI "Saída p/ Zerar Mês" desativado ([especificacao-negocio.md §2.2](especificacao-negocio.md)).
- **Regra oficial:** Portaria 490/2022 art. 22 veda **adquirir** BH mas **assegura o usufruto** do saldo. Portaria 380/2026 art. 13 é mais restritiva: no mês com **HE autorizado**, veda a **utilização** de BH para qualquer fim.
- **Ação:** modelar três estados:
  | Estado | Crédito | Débito (consumo) | Saldo visível |
  | :--- | :--: | :--: | :--: |
  | **Normal** | ✅ | ✅ | ✅ |
  | **Híbrido/teletrabalho sem HE** | ❌ | ✅ | ✅ |
  | **Mês com HE autorizado** (art. 13) | ✅ *(só parcela `Horas Excedentes Homologadas`)* | ❌ | ✅ |
- **Correção empírica (02/09/2026, CDP):** o estado "mês com HE autorizado" **credita sim** a parcela homologada — 04/2026 (Portaria 380/2026 vigente) e 09/2025 registraram `Horas Adquiridas` no Extrato havendo pecúnia no mês. O art. 13 veda a **utilização** (consumo), não a aquisição. Ver [regras §3.9](regras-calculo-frequencia.md#39-excedente-além-do-quantitativo-de-he-autorizado--homologação-é-a-única-porta-para-o-banco) e [§5.3](regras-calculo-frequencia.md#53-excedente-em-meses-com-he-autorizada). Detecção do estado: chamada `detalharAutorizacao(` nas linhas do dia + `Pecúnia > 0`.
- **Implementado (v0.4.0/0.4.1 — parcial):** `kpiExtractor.hasAuthorizedHEInMonth` detecta o estado; o card **Banco de Horas** exibe "HE autorizada · Consumo vedado" + a **prévia das homologadas** (`homologPreviewMinutes` = Úteis×1 + Sáb×1,5 + DomFer×2, do rodapé); o KPI **"Saída p/ Zerar Mês"** é desativado (`--:--`, "Consumo do banco vedado neste mês (art. 13)"). **Falta:** reescrever o `SALDO ACUM.` dia a dia para creditar só a parcela homologada em vez do excedente bruto (converge com R1); e revisar o numerador da "Meta do Mês" quando o saldo do mês não pode ser consumido.
- **Relacionado:** o `Resíduo de Horas` fortemente negativo dos meses híbridos (−70h a −98h) é **cosmético** — não é debitado do banco — e **não pode** alimentar os KPIs "Meta do Mês" / "Saída p/ Zerar Mês" (ver [regras §3.8](regras-calculo-frequencia.md#38-resíduo-de-horas-em-mês-híbrido-é-cosmético)). A guarda de meta precisa do mesmo cuidado que hoje só a coluna tem.
- **Depende de:** [duvidas-normativas.md D3](duvidas-normativas.md) (parcialmente resolvida — falta confirmar a vedação de **consumo** no mês com HE autorizado).

## R4 — 🟡 Jornada-alvo diária (7h / 8h / 5h no recesso)

- **Regra oficial:**
  - Servidor do TSE cumpre **40h/semana** (≈ 8h/dia — Lei 8.112/1990 art. 19).
  - Admite-se **7h/dia** (35h/semana) para quem cumpre a jornada em **turno único** (1 entrada / 1 saída, **sem intervalo**). Havendo **2ª entrada** registrada (intervalo tirado), a jornada do dia é **8h** e o excedente só começa a contar depois disso.
  - A faixa 7ª–8ª hora, para quem faz turno único, é **complementação da jornada mensal ordinária**, não HE (Portaria 380/2026 art. 7º §2º).
  - **Recesso — jornada reduzida a 5h:** em **janeiro** (todo ano) e em **julho de anos não eleitorais**, para o turno único, a jornada passa a **5h** e o acúmulo de banco de horas só ocorre **por decisão da Diretoria-Geral** (Portaria-TSE 885/2024 e sucessoras anuais; Res.-TSE 461/2023 para julho). Dias com intervalo de almoço seguem 8h.
- **Implementado (v0.4.3):** `legalConfig.dailyTargetMinutes({ e2, e3, year, month })` é a fonte única — usada por `kpiExtractor`, `domModernizer` (`modernizeMonthlyTable`) e `authorizationScan.analyzeEspelho` (que alimenta a Auditoria de Horas Perdidas). O gatilho de 8h passou a ser **a 2ª entrada** (`e2`), não mais as 4 batidas completas. O card **Saída Expediente** projeta com a jornada real de hoje. Meses de recesso ganham selo *"Recesso · jornada 5h"* no card Banco de Horas e *"meta reduzida · recesso 5h"* no card Meta; a Auditoria marca o regime `Recesso 5h`.
- **Falta:** classificar a faixa 420–480 min (turno único) como complementação ordinária que **não** credita o `SALDO ACUM.` (converge com R1); e tratar a vedação de acúmulo no recesso no `SALDO ACUM.` (hoje só há aviso).
- **Depende de:** [duvidas-normativas.md D1](duvidas-normativas.md) (a coluna `TOTAL` já vem líquida do intervalo?) e [D7](duvidas-normativas.md) (norma exata e escopo da jornada de 5h no recesso).
- **Feature correlata no README:** "Detecção automática de jornada de 7h e 8h".

## R5 — 🟡 Tetos legais de horas extras

- **Regra oficial:** 2h/dia útil, 10h/sábado-domingo-feriado, 60h/mês; extrapolação excepcional até +30h só para compensação (art. 4º da Portaria 380/2026 e da Res. 22.901/2008).
- **Ação:** badges/alertas na tabela e no card:
  - `> 2h (art. 4º)` em dia útil
  - `> 10h` em fim de semana/feriado
  - `mês > 60h`
  - faixa 60–90h marcada como "sujeita a deliberação da DG"
- **Implementado (v0.4.1 — parcial):** selos por dia `> 2h (art. 4º)` / `> 10h (art. 4º)` quando o excedente do dia passa do teto por jornada, mesmo autorizado ([domModernizer.js](../content/modules/domModernizer.js) `modernizeMonthlyTable`, constantes em `legalConfig.js`). **Falta:** alerta de `mês > 60h` e faixa 60–90h no rodapé/card.

## R6 — 🟡 Excedente sem autorização prévia

- **Regra oficial:** serviço extraordinário exige requerimento até o dia 25 do mês anterior e autorização prévia da DG (art. 3º/§4º da Portaria 380/2026); relatório homologado até o 3º dia útil (art. 10). Excedente **não autorizado** não gera pecúnia nem compensação automática.
- **Confirmado empiricamente** ([regras §3.9](regras-calculo-frequencia.md#39-excedente-além-do-quantitativo-de-he-autorizado--homologação-é-a-única-porta-para-o-banco) / [§5.3](regras-calculo-frequencia.md#53-excedente-em-meses-com-he-autorizada)): num mês com HE autorizado, o excedente **além do quantitativo autorizado** que a chefia **não homologa** cai em `Horas Excedentes Não Homologadas` (perda — zero no Extrato) ou é absorvido como `Compl. Jorn. Mínima` / travado no teto da jornada ordinária. Ex.: 03/2024 — 38h19 pagas, **15h34 perdidas**. Só vira banco de horas o que a chefia homologa ativamente (aí com fator por tipo de dia), como em 12/2015, 01/2016, 09/2025 e 04/2026. **Não há conversão automática de excedente não pago em banco de horas.**
- **Ação:**
  1. Cruzar com o ícone de autorização já existente (`detalharAutorizacao` / `formEspelhoPontoMes_detalharAutorizacao`); sinalizar dias com excedente **sem** autorização vinculada.
  2. Badge/aviso no dia e no card quando o excedente do dia **exceder** o autorizado — deixando claro que a diferença só vira crédito se homologada, senão é perda.
- **Implementado (v0.4.0/0.4.1 — parcial):** `authorizationScan.rowHasAuthorization()` + selo `sem autorização` (âmbar) nos dias já encerrados com excedente ≥ 30 min, sem pecúnia e sem autorização vinculada ([domModernizer.js](../content/modules/domModernizer.js) `modernizeMonthlyTable`). Complementado pelo selo de teto legal do R5.
- **Bloqueio do badge "> autorizado":** o valor exato autorizado por dia sai de `AutorizacaoHoraExcedenteAction_execute?dataDia.asString=DD/MM/AAAA&servidor.matricula=NNN` (função nativa `formEspelhoPontoMes_detalharAutorizacao`, abre em `window.open`). Via `fetch` autenticado esse endpoint **redireciona para a home** (`Login_verTelaInicialSemLogout`) — acesso restrito para o perfil do servidor comum. Sem essa fonte, o badge "> autorizado" fica adiado; a aproximação viável hoje é o teto legal fixo (R5) e a categoria B1/B2 da Auditoria.
- **Feature correlata no README:** "Horas extras autorizadas no card Horas Extras" e "Horas executadas não homologadas no KPI Banco de Horas" (R1).
- **Depende de:** [duvidas-normativas.md D6](duvidas-normativas.md) (a homologação da chefia tem teto no autorizado?).

## R7 — 🟡 Conceito de "plantão/eleição" para pecúnia de domingo/feriado

- **Hoje:** o card "Horas Extras", linha "Domingo / Feriados", soma pecúnia desses dias.
- **Regra oficial:** pagamento aos domingos e feriados é **vedado** fora de plantão eleitoral / dias de eleição (art. 4º §2º da Res. 22.901/2008; art. 5º da Portaria 380/2026). Fora desse contexto a pecúnia de domingo/feriado é normalmente `00:00` e o excedente vai para **compensação** (fator 2,0).
- **Ação:** introduzir o conceito de "dia de plantão/eleição" (lista de datas ou toggle); fora dele, direcionar excedente de domingo/feriado para compensação, não para a linha de pecúnia.

## R8 — 🟢 Alerta de repouso interjornada < 8h

- **Regra oficial:** mínimo de 8h ininterruptas entre jornadas (art. 7º da Res. 22.901/2008).
- **Ação:** alertar quando o intervalo entre a última saída de um dia e a primeira entrada do dia seguinte for < 8h.

## R9 — 🟢 Adicional noturno — documentar limitação

- **Regra oficial:** hora noturna (22h–5h) computada como 52min30s, com adicional (Lei 8.112/1990 art. 75). Colunas `ADIC. NOTURNO` / `ADIC. NOTURNO PECÚNIA` (`.h13`) existem no espelho.
- **Hoje:** o TSE XT não modela hora noturna reduzida nem o adicional; `.h13` fica fora do saldo.
- **Ação:** documentar a limitação de forma visível (tooltip/aviso). Modelagem completa fica como avaliação futura.

## R10 — 🟢 Atualizar a seção "Legislação de referência" injetada

- **Fato:** a página oficial cita só normas de 2019–2021; omite a Portaria 490/2022 e a Portaria 380/2026.
- **Ação:** o TSE XT já reescreve essa página — injetar os links vigentes ou um aviso de "lista possivelmente desatualizada".

---

## Tarefas transversais de código

| # | Tarefa | Serve a |
| :--- | :--- | :--- |
| T1 | **`content/modules/legalConfig.js`** — constantes com `{ valor, norma, artigo, url }`: `SATURDAY_FACTOR`, `SUNDAY_HOLIDAY_FACTOR`, `MAX_HE_DIA_UTIL_MIN = 120`, `MAX_HE_FDS_MIN = 600`, `MAX_HE_MES_MIN = 3600`, `EXTRAPOLACAO_COMP_MIN = 1800`, `REPOUSO_INTRA_MIN = 60`, `REPOUSO_INTER_MIN = 480`, `JORNADA_ORDINARIA_MIN = 420`, `COMPLEMENTACAO_MAX_MIN = 480` | R4, R5, R8 |
| T2 | Separar **pecúnia × compensação** em `balanceCalc.computeDailyDelta` — retornar `{ deltaCompensacao, valorPecunia }` distintos | R1, R7 |
| T3 | **Modo conferência** — `saldo TSE XT` × `saldo oficial` lado a lado, com destaque de divergência, sem sobrescrever a coluna nativa | R1, R3, R4 |
| T4 | **Testes unitários** de `balanceCalc` com casos derivados das normas e dos estudos empíricos (11/2015, 11/2017, 08/2019, 04/07/2026) | todos |
| T5 | **Tooltips** de cada cálculo citando norma + artigo | R1–R9 |
