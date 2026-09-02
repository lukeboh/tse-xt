# ⚖️ Conflitos Normativos — Regras do TSE XT × Legislação de Referência

**Versão do documento:** 1.0.0
**Data:** 01/09/2026
**Escopo:** Espelho de Ponto Mensal (`EspelhoPontoMesAction`) e módulo de cálculo (`content/modules/balanceCalc.js`)
**Método de levantamento:** leitura do DOM da página autenticada via Chrome DevTools Protocol (porta 9222) para extrair a seção *"Legislação de referência"*, seguida da coleta do texto de cada norma no site público do TSE (`tse.jus.br/legislacao/compilada`).

> Este documento mapeia **onde as regras hoje embutidas no TSE XT podem divergir da legislação**. Nenhum item aqui é afirmação de erro definitivo — vários dependem de validação contra dados reais (mês fechado, Extrato do Banco de Horas) ou de norma interna não publicada. Severidade: 🔴 alto · 🟡 médio · 🟢 atenção.

---

## 1. Inventário de normas

### 1.1. Referenciadas na página do espelho (seção "Legislação de referência")

| Norma | Assunto | Situação |
| :--- | :--- | :--- |
| **Portaria-TSE nº 829/2021** | Retomada pós-COVID; dispensa temporária de ponto | Histórica (contexto pandêmico) |
| **Portaria-TSE nº 642/2020** | Serviço extraordinário na pandemia: limites, intervalo, fechamento de jornada pela chefia, vedação de HE em teletrabalho | Substituída, no ciclo eleitoral vigente, pela **Portaria-TSE nº 380/2026** |
| **Portaria-TSE nº 641/2020** | Autorização de HE via SAEX; período eleitoral; distribuição de plantões | Substituída, no ciclo eleitoral vigente, pela **Portaria-TSE nº 380/2026** |
| **Resolução-TSE nº 23.629/2020** | Altera a Res. 22.901/2008 (limites, repouso, acréscimos, pecúnia, compensação) | **Vigente** |
| **Resolução-TSE nº 23.615/2020** | Trabalho remoto emergencial (COVID) | Histórica |
| **Portaria-TSE nº 378/2019** | Banco de horas × licenças / afastamentos / exoneração | Vigente (efeitos pontuais) |

> ⚠️ A lista da página está **desatualizada**: cinco das seis normas são do ciclo COVID (2019–2021). Não referencia a **Portaria-TSE nº 490/2022** (trabalho híbrido/teletrabalho vigente) nem a **Portaria-TSE nº 380/2026** (serviço extraordinário do ciclo eleitoral de 2026).

### 1.2. Normas-base e vigentes acrescentadas a esta análise

| Norma | Assunto | Peso p/ o cálculo |
| :--- | :--- | :--- |
| **Resolução-TSE nº 22.901/2008** (redação da 23.629/2020) | Regime geral de serviço extraordinário: **art. 4** (limites), **art. 7** (repouso), **art. 9** (acréscimos de 50% e 100%), **art. 11** (conversão em pecúnia) | **Crítico** |
| **Portaria-TSE nº 380/2026** (26/06/2026) | Serviço extraordinário para as **Eleições 2026**. Equivalente atual das Portarias 641/2020 e 642/2020 | **Alto** |
| **Portaria-TSE nº 490/2022** | Trabalho presencial, híbrido e teletrabalho: **art. 20** (ponto só registra presença), **art. 22** (não adquire BH), **art. 23** (veda HE), **art. 30** (saldo negativo), **art. 12 §6** (ausências reduzem meta proporcionalmente) | **Alto** |
| **Lei nº 8.112/1990** | Regime jurídico: **art. 74** (compensação), **art. 75** (adicional e hora noturna) | Referência |

---

## 2. Regras extraídas da legislação (síntese de referência)

### Resolução-TSE nº 22.901/2008 (redação da 23.629/2020)
- **Art. 4º** — serviço extraordinário: até **2h** em dias úteis, **10h** aos sábados/domingos/feriados, teto mensal de **60h**.
- **Art. 4º, §1º** — extrapolado o limite mensal, a Diretoria-Geral delibera sobre o registro das horas **para fins de compensação, limitada a 30h**. *(Sem menção a multiplicador na compensação.)*
- **Art. 4º, §2º** — sábado é excepcional; **pagamento aos domingos e feriados é vedado**, salvo plantão eleitoral e dias de eleição/plebiscito/referendo.
- **Art. 7º** — repouso mínimo de **1h ininterrupta** em cada jornada diária e de **8h ininterruptas entre jornadas**.
- **Art. 9º** — salário-hora do serviço extraordinário = remuneração mensal ÷ 200, **acrescido de 50%** em dias úteis e sábados e de **100%** aos domingos e feriados. *(Acréscimo vinculado ao pagamento/pecúnia.)*
- **Art. 11** — horas registradas para compensação podem, **excepcionalmente**, ser convertidas em pecúnia se houver disponibilidade orçamentária.

### Portaria-TSE nº 380/2026
- **Art. 4º** — limite de **2h** por jornada em dias úteis e **10h** aos sábados/domingos/feriados; §1º fins de semana preferencialmente aos sábados.
- **Art. 5º** — HE aos domingos e feriados só com atividades descritas no SAEX (e documentação comprobatória quando pertinente).
- **Art. 6º, §2º** — sem registro de entrada/saída, a chefia **só pode lançar horas suficientes para a jornada ordinária**. *(Origem da coluna "HORAS AJUST." em meses fechados.)*
- **Art. 7º** — intervalo de **no mínimo 1h ininterrupta** exigível **quando a jornada exceder 8h**; §1º na ausência do registro, o sistema **desconta 1h automaticamente** da jornada que exceder 8h.
- **Art. 7º, §2º** — **a jornada que exceder a 7ª hora sem ultrapassar a 8ª é computada na jornada mensal ordinária** (complementação de carga), **não como serviço extraordinário**.
- **Art. 11** — excedido o limite mensal ou o teto remuneratório, a Diretoria-Geral decide sobre o registro das horas excedentes para compensação, mediante solicitação motivada.
- **Art. 12** — **vedado o pagamento de serviço extraordinário a servidores em teletrabalho ou trabalho híbrido** (remete ao art. 23 da Portaria 490/2022); §3º veda o retorno ao teletrabalho/híbrido no mês em que houver prestação de HE.
- **Art. 13** — **vedada a utilização de banco de horas para qualquer finalidade no mês em que o servidor for autorizado a realizar serviço extraordinário**, independentemente do quantitativo prestado.
- **Art. 3º / §4º** — requerimento à Diretoria-Geral até o **dia 25 do mês anterior**; aprovação condicionada à autorização prévia e à disponibilidade orçamentária.
- **Art. 10** — "Relatório de Serviços Realizados" no SAEX até o último dia do mês, **homologado pela chefia até o 3º dia útil do mês subsequente**.
- Não fixa percentuais (50%/100%) nem tolerância de marcação; não contém cláusula expressa de revogação.

### Portaria-TSE nº 490/2022
- **Art. 20** — dispensada a marcação no trabalho híbrido, **salvo nos dias presenciais**, quando é obrigatória "para fins de registro da presença e não de controle da jornada".
- **Art. 22** — **durante teletrabalho ou trabalho híbrido não pode ser adquirido banco de horas**; assegurado o **usufruto** do saldo existente, com anuência da chefia.
- **Art. 23** — veda o pagamento de serviço extraordinário nessas modalidades.
- **Art. 30** — saldo negativo de BH deve ser compensado em modalidade presencial antes de requerer teletrabalho/híbrido.
- **Art. 12, §6º** — ausências de efetivo exercício, licenças legais, usufruto de BH e atestados homologados **reduzem as metas na proporção dos dias úteis** de afastamento.

### Portaria-TSE nº 378/2019
- **Art. 1º** — exoneração, licenças, afastamentos e remoções condicionados à **inexistência de saldo positivo** no BH; saldo negativo é debitado no acerto de contas.
- **Art. 2º** — licença para capacitação exige férias do ano anterior gozadas e **inexistência de saldo negativo**; admite saldo positivo de **até 35h** até o início da licença.
- **Art. 4º** — a gestão do banco de horas é responsabilidade da chefia imediata.

---

## 3. Matriz de conflitos

### 🟢 C1 — Multiplicador de 50%/100% no banco de horas — **CONFIRMADO empiricamente**

| | |
| :--- | :--- |
| **TSE XT** | `SATURDAY_FACTOR = 1.5` / `SUNDAY_HOLIDAY_FACTOR = 2.0` aplicados ao delta diário do saldo em [balanceCalc.js:20-21](../content/modules/balanceCalc.js#L20-L21), [:50](../content/modules/balanceCalc.js#L50), [:62](../content/modules/balanceCalc.js#L62); coluna `SALDO ACUM.` ([ESPECIFICACAO_NEGOCIO.md §4.2](ESPECIFICACAO_NEGOCIO.md)). |
| **Norma** | Res. 22.901/2008 **art. 9º** amarra os acréscimos de 50%/100% ao **salário-hora**; a compensação (**art. 4º §1º**; Portaria 380/2026 **art. 11**) não cita fator. **Porém**, a prática do sistema TSE (ver §8) aplica o mesmo fator ao crédito no banco. |
| **Evidência** | 18 anos do Extrato do Banco de Horas do servidor (2009–2026), cruzados com o Espelho de Ponto — casos limpos (§8.2): **sábado ×1,5** (11/2015: 02:16 → +03:24) e **domingo/feriado ×2,0** (11/2017: 15:29 → 30:58; 08/2019: 04:59 → 09:58), todos exatos. O fator do TSE XT **está correto**. |
| **Ressalva remanescente** | O fator só incide sobre horas **homologadas pela chefia** e que **não** foram pagas em pecúnia. O `SALDO ACUM.` do TSE XT multiplica **todo** excedente de fim de semana, mesmo o não homologado ou o que virou pecúnia → superestima. Ver **C1b**. |
| **Ação** | Manter o fator. Documentar que `SALDO ACUM.` é uma **prévia do "Horas Adquiridas" do Extrato do Banco de Horas**, não da coluna nativa do espelho (que é sempre crua). |

### 🔴 C1b — `SALDO ACUM.` credita fim de semana sem checar homologação nem destino (pecúnia × banco)

| | |
| :--- | :--- |
| **TSE XT** | Todo excedente líquido de sábado/domingo entra no `SALDO ACUM.` com fator 1,5/2,0. |
| **Realidade (§8)** | O sistema TSE dá **três destinos distintos** ao excedente de fim de semana: (1) **Pecúnia** — hoje o caso dominante em meses eleitorais/SAEX (2016, 2022, 2024): horas cruas, fator só monetário, **nada vai ao banco**; (2) **Horas Excedentes Homologadas** → banco, com fator 1,5/2,0 (comum até ~2019); (3) **Não Homologadas** → **perdidas** (fator zero). O espelho mostra sempre horas cruas; o fator só aparece no Extrato do Banco. |
| **Conflito** | Sem distinguir esses destinos, o `SALDO ACUM.` soma como crédito multiplicado horas que na verdade viraram pecúnia (não vão ao banco) ou não foram homologadas (perdidas). Em um mês eleitoral típico recente isso infla o saldo em dezenas de horas. |
| **Ação** | Usar as agregações do rodapé do próprio espelho: creditar no `SALDO ACUM.` apenas `Horas Excedentes Homologadas` (com fator por tipo de dia); tratar `Pecúnia` e `Não Homologadas` como fora do banco. Reconciliar com o Extrato do Banco de Horas quando disponível. **Roadmap:** "Horas executadas não homologadas no KPI Banco de Horas" ([README](../README.md#-roadmap)). |

### 🟡 C2 — Pecúnia mantida em meses de teletrabalho/trabalho híbrido — *sistema oficial já cumpre; risco só na projeção do TSE XT*

| | |
| :--- | :--- |
| **TSE XT** | "A pecúnia não é mais zerada em meses de regime híbrido/teletrabalho" (README, série 0.3.x); card "Horas Extras" soma pecúnia por tipo de dia. |
| **Norma** | Portaria 380/2026 **art. 12**; Portaria 490/2022 **art. 23**; Portaria 642/2020 **art. 7** — **vedado o pagamento de serviço extraordinário** a quem está em teletrabalho ou trabalho híbrido. |
| **Evidência (§9)** | 16 meses com dias de `TRABALHO HÍBRIDO` (2022–2026): em **todos**, `Pecúnia = 00:00`, `Homologadas = 00:00`, `Não Homologadas = 00:00` e `Horas Adquiridas` no banco = 00:00. Até **trabalho real de sábado** dentro de mês híbrido (04/07/2026, 08:03) foi **descartado** — sem pecúnia, sem banco, sem sequer figurar como "não homologada". O sistema oficial **suprime integralmente** o serviço extraordinário no mês híbrido, conforme a norma. |
| **Conclusão** | O comportamento **oficial** confirma a norma. A regressão do TSE XT (deixar de zerar) só causa dano se a extensão **projetar** pecúnia para o mês corrente antes do fechamento, ou se **calcular** pecúnia a partir de horas trabalhadas em vez de ler a coluna `.h12` (que já vem 00:00). |
| **Ação** | (1) Restaurar a zeragem da pecúnia projetada em meses com ≥ 1 dia híbrido/teletrabalho. (2) Novo: **alertar** quando houver trabalho em fim de semana/feriado dentro de mês híbrido — essas horas são perdidas (nem pecúnia, nem banco), art. 22-23 da Portaria 490/2022. (3) Ver **C3** sobre o `Resíduo de Horas` fortemente negativo desses meses (−78:37, −97:21, −98:04…), que **não** é debitado do banco e **não** pode alimentar os KPIs "Meta do Mês" / "Saída p/ Zerar Mês". |

### 🔴 C3 — Regime híbrido zera a coluna `SALDO ACUM.` e o card de BH inteiros

| | |
| :--- | :--- |
| **TSE XT** | ≥ 1 dia `TRABALHO HÍBRIDO`/`TELETRABALHO` no mês ⇒ coluna suprimida, KPI de BH com "Sem acúmulo de BH", KPI "Saída p/ Zerar Mês" desativado ([ESPECIFICACAO_NEGOCIO.md §2.2](ESPECIFICACAO_NEGOCIO.md)). |
| **Norma** | Portaria 490/2022 **art. 22** veda **adquirir** BH, mas **assegura o usufruto** do saldo existente. Já a Portaria 380/2026 **art. 13** é mais restritiva: no mês com **serviço extraordinário autorizado**, veda a **utilização** de BH para qualquer finalidade. |
| **Conflito** | Duplo: (a) fora de mês com HE, o TSE XT é **restritivo demais** — deveria permitir **débito** (consumo) do saldo; (b) no mês com HE autorizado, a norma é **mais restritiva** e o TSE XT não distingue esse caso. |
| **Ação** | Modelar três estados de BH: **normal** (crédito e débito) · **híbrido/teletrabalho sem HE** (crédito bloqueado, débito permitido, saldo visível) · **mês com HE autorizado** (crédito e débito bloqueados — art. 13). |

### 🟡 C4 — Jornada-alvo de 8h (480 min) e faixa 7h–8h como excedente

| | |
| :--- | :--- |
| **TSE XT** | Alvo diário = 480 min quando há duas entradas e duas saídas; senão 420 min ([ESPECIFICACAO_NEGOCIO.md §2.3](ESPECIFICACAO_NEGOCIO.md); `dayTargetMinutes` em [balanceCalc.js:79](../content/modules/balanceCalc.js#L79)). |
| **Norma** | Portaria 380/2026 **art. 7º §2º** — a jornada que **excede a 7ª hora sem ultrapassar a 8ª** é computada na **jornada mensal ordinária** (complementação), **não como HE**; **art. 7º caput/§1º** — intervalo de 1h só é exigível **acima de 8h**, com desconto automático de 1h nesse caso. |
| **Conflito** | (a) Usar 480 como alvo do dia pode gerar **débito indevido de 1h** para quem registra intervalo, se a coluna `TOTAL` já vier líquida do almoço. (b) Tratar a faixa 420–480 min como excedente/crédito no `SALDO ACUM.` está errado: é **complementação ordinária**. |
| **Ação** | Adotar alvo diário de **420 min**; classificar 420–480 min como complementação ordinária (não entra como crédito no saldo); apenas o que passa de **480 min líquidos de intervalo** é serviço extraordinário. Validar item (a) com dados reais. |

### 🟡 C5 — Ausência de tetos legais de horas extras

| | |
| :--- | :--- |
| **TSE XT** | Acúmulo diário/mensal sem limite nem alerta. |
| **Norma** | Portaria 380/2026 **art. 4º** (2h/dia útil; 10h fim de semana/feriado) + Res. 22.901/2008 **art. 4º** (teto de **60h/mês**; extrapolação excepcional **até +30h**, só para compensação). |
| **Conflito** | Horas acima do teto podem **não ser homologadas** nem convertidas; o TSE XT as exibe como crédito/pecúnia sem ressalva. |
| **Ação** | Badges/alertas: `> 2h (art. 4º)`, `> 10h (fim de semana)`, `mês > 60h`, e marcação da faixa 60–90h como "sujeita a deliberação da DG". |

### 🟡 C6 — Excedente sem autorização prévia tratado como crédito

| | |
| :--- | :--- |
| **TSE XT** | Todo excedente diário entra no saldo (ou soma pecúnia). |
| **Norma** | Portaria 380/2026 **art. 3º / §4º** (requerimento até dia 25, autorização prévia da DG) e **art. 10** (relatório homologado até o 3º dia útil); Res. 22.901/2008 **art. 4º**. |
| **Conflito** | Excedente **não autorizado** não gera pecúnia e, a rigor, não gera compensação automática. |
| **Ação** | Cruzar com o ícone de autorização já existente (`detalharAutorizacao`); sinalizar dias com excedente **sem** autorização vinculada. |

### 🟡 C7 — Domingo/feriado somando pecúnia sem contexto de plantão

| | |
| :--- | :--- |
| **TSE XT** | Card "Horas Extras", linha "Domingo / Feriados", soma pecúnia desses dias. |
| **Norma** | Res. 22.901/2008 **art. 4º §2º** — pagamento aos domingos e feriados **vedado**, salvo plantão eleitoral / dias de eleição; Portaria 380/2026 **art. 5º** — só com atividades descritas no SAEX. |
| **Conflito** | Fora do contexto eleitoral, a pecúnia de domingo/feriado normalmente é `00:00`; o excedente vai para **compensação** (fator 2,0), não para pagamento. |
| **Ação** | Introduzir o conceito de "dia de plantão/eleição"; fora dele, direcionar o excedente de domingo/feriado para compensação, não para a linha de pecúnia. |

### 🟢 C8 — Repouso interjornada não verificado

| | |
| :--- | :--- |
| **Norma** | Res. 22.901/2008 **art. 7º** — mínimo de **8h ininterruptas entre jornadas**. |
| **TSE XT** | Não valida o intervalo entre a última saída de um dia e a primeira entrada do dia seguinte. |
| **Ação** | Alerta quando o interstício for < 8h. |

### 🟢 C9 — Adicional noturno ignorado no cálculo

| | |
| :--- | :--- |
| **Norma** | Lei 8.112/1990 **art. 75** — hora noturna (22h–5h) computada como 52min30s, com adicional. Colunas `ADIC. NOTURNO` / `ADIC. NOTURNO PECÚNIA` (`.h13`) existem no espelho. |
| **TSE XT** | Não modela hora noturna reduzida nem o adicional; colunas `.h13` ficam fora do saldo. |
| **Ação** | Documentar a limitação de forma visível; avaliar modelagem futura. |

### 🟢 C10 — Tolerância de marcação

| | |
| :--- | :--- |
| **Norma** | Nenhuma das normas analisadas fixa tolerância. A regra geral do serviço público federal (fora do TSE) costuma citar 15 min. |
| **TSE XT** | Calcula ao minuto exato. |
| **Ação** | Confirmar se há portaria de controle de frequência do TSE com tolerância (não consta da lista da página); tornar o valor parametrizável nas opções. |

### 🟢 C11 — Seção "Legislação de referência" da página desatualizada

| | |
| :--- | :--- |
| **Fato** | A página cita apenas normas de 2019–2021; omite a Portaria 490/2022 e a Portaria 380/2026. |
| **Ação** | O TSE XT já reescreve essa página — pode injetar os links vigentes ou um aviso de "lista possivelmente desatualizada". |

---

## 4. Regras do TSE XT alinhadas à legislação

| Regra | Fundamento |
| :--- | :--- |
| Acréscimos de **50%** (útil/sábado) e **100%** (domingo/feriado) **para pecúnia** | Res. 22.901/2008 **art. 9º** |
| Pecúnia **nunca** entra no saldo de compensação ("Regra de Ouro") | Vias excludentes — art. 9º (pagamento) × art. 11 (compensação) |
| Mês fechado: `h10` = "HORAS AJUST." ≈ jornada reconhecida | Portaria 380/2026 **art. 6º §2º**; Portaria 642/2020 **art. 2º §2º** |
| Não acumula BH em regime híbrido/teletrabalho | Portaria 490/2022 **art. 22** *(ver ressalva C3 sobre o usufruto)* |
| Dias de licença/afastamento/férias fora do denominador da meta | Portaria 490/2022 **art. 12 §6** |

---

## 5. Backlog de código derivado

1. **`content/modules/legalConfig.js`** — constantes com `{ valor, norma, artigo, url }`:
   `SATURDAY_FACTOR`, `SUNDAY_HOLIDAY_FACTOR`, `MAX_HE_DIA_UTIL_MIN = 120`, `MAX_HE_FDS_MIN = 600`, `MAX_HE_MES_MIN = 3600`, `EXTRAPOLACAO_COMP_MIN = 1800`, `REPOUSO_INTRA_MIN = 60`, `REPOUSO_INTER_MIN = 480`, `JORNADA_ORDINARIA_MIN = 420`, `COMPLEMENTACAO_MAX_MIN = 480`.
2. **Separar pecúnia × compensação** em `balanceCalc.computeDailyDelta` (C1) — retornar `{ deltaCompensacao, valorPecunia }` distintos.
3. **Três estados de banco de horas** (C3): normal / híbrido-sem-HE / mês-com-HE-autorizado.
4. **Alvo diário 420 min + faixa de complementação 420–480** (C4).
5. **Badges de teto e de autorização** (C5, C6).
6. **Conceito de "plantão/eleição"** para direcionar pecúnia de domingo/feriado (C7).
7. **Alertas de repouso** intra e interjornada (C8).
8. **Modo conferência** — `saldo TSE XT` × `saldo oficial` lado a lado, com destaque de divergência, sem sobrescrever a coluna nativa.
9. **Testes unitários** de `balanceCalc` com casos derivados das normas.
10. **Tooltips** de cada cálculo citando norma + artigo.
11. **Atualizar a seção de legislação** injetada na página (C11).

---

## 6. Questões em aberto (a validar)

| # | Pergunta | Como validar |
| :--- | :--- | :--- |
| Q1 | ~~O banco de horas é **1:1** ou aplica o multiplicador de 50%/100%?~~ **RESPONDIDO (§8):** aplica **sábado ×1,5** e **domingo/feriado ×2,0** sobre horas homologadas. | Extrato do Banco de Horas 2009–2026 × Espelho — casos limpos exatos. |
| Q2 | A coluna `TOTAL` do espelho já vem **líquida do intervalo** de almoço? | Inspecionar via CDP um dia de mês fechado com `E1,S1,E2,S2` e conferir se `TOTAL` = soma dos turnos ou inclui o gap. |
| Q3 | Existe portaria de controle de frequência do TSE com **tolerância** de marcação? | Buscar na legislação compilada; confirmar com `frequencia@tse.jus.br`. |
| Q4 | O TSE XT deve refletir a **vedação total de uso de BH** no mês com HE autorizado (Portaria 380/2026 art. 13)? | Depende de a extensão detectar meses com HE autorizado (ícone/coluna de autorização). |

---

## 7. Fontes

- [Resolução-TSE nº 22.901/2008](https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008)
- [Resolução-TSE nº 23.629/2020](https://www.tse.jus.br/legislacao/compilada/res/2020/resolucao-no-23-629-de-27-de-agosto-de-2020)
- [Resolução-TSE nº 23.615/2020](https://www.tse.jus.br/legislacao/compilada/res/2020/resolucao-no-23-6152-de-19-de-marco-de-2020)
- [Portaria-TSE nº 380/2026](https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026)
- [Portaria-TSE nº 490/2022](https://www.tse.jus.br/legislacao/compilada/prt/2022/portaria-no-490-de-20-de-maio-de-2022)
- [Portaria-TSE nº 642/2020](https://www.tse.jus.br/legislacao/compilada/prt/2020/portaria-no-642-de-1o-de-setembro-de-2020)
- [Portaria-TSE nº 641/2020](https://www.tse.jus.br/legislacao/compilada/prt/2020/portaria-no-641-de-1o-de-setembro-de-2020)
- [Portaria-TSE nº 829/2021](https://www.tse.jus.br/legislacao/compilada/prt/2021/portaria-no-829-de-14-de-dezembro-de-2021)
- [Portaria-TSE nº 378/2019](https://www.tse.jus.br/legislacao/compilada/prt/2019/portaria-no-378-de-23-de-maio-de-2019)
- Lei nº 8.112/1990, arts. 74 e 75

---

## 8. Estudo empírico — multiplicador do banco de horas (C1)

**Método:** via CDP (porta 9222), `fetch()` autenticado ao `EspelhoPontoMesAction_recuperar.action` e ao `BancoHorasAction_recuperarExtrato.action`. Cruzamento do rodapé do espelho (`Horas Excedentes Homologadas`, quebrado em *Dias Úteis / Sábados / Domingos-Feriados-Recessos*) com a coluna `Horas Adquiridas` do Extrato do Banco de Horas, mês a mês, de **2/2009 a 4/2026**. Servidor: matrícula 30901018 (SETOT).

### 8.1. Como o sistema TSE trata o excedente

- O **Espelho de Ponto mostra sempre horas cruas** em todas as colunas (`TOTAL`, `HORAS EXCED./AJUST.`, `PECÚNIA`). Nenhum multiplicador aparece na tela.
- O excedente de um dia tem **três destinos mutuamente exclusivos**:
  1. **Pecúnia** — pago; horas cruas na tela; o acréscimo de 50%/100% (art. 9º) incide **só no valor monetário** (salário-hora), nunca na contagem de horas. Domina nos meses eleitorais recentes (2016, 2022, 2024) — nesses meses **nada vai ao banco**.
  2. **Horas Excedentes Homologadas** (aprovadas pela chefia) → **creditadas no Banco de Horas com fator por tipo de dia** (ver 8.2). Padrão comum até ~2019.
  3. **Horas Excedentes Não Homologadas** → **perdidas** (fator zero).
- O fator só se materializa na coluna **`Horas Adquiridas`** do Extrato do Banco de Horas.

### 8.2. Fator confirmado (casos limpos — sem pecúnia, sem utilização, resíduo 00:00)

| Mês | Homologadas (Úteis / Sáb / Dom-Fer) | `Horas Adquiridas` (Extrato) | Cálculo `Úteis×1 + Sáb×1,5 + DomFer×2` | Bate? |
| :--- | :--- | :--- | :--- | :--- |
| **11/2017** | 00:00 / 00:00 / **15:29** | **30:58** | 15:29 × 2,0 = 30:58 | ✅ exato |
| **08/2019** | 00:00 / 00:00 / **04:59** | **09:58** | 04:59 × 2,0 = 09:58 | ✅ exato |
| **11/2015** | 27:44 / **02:16** / 00:00 | **31:08** | 27:44 + 02:16×1,5 (=03:24) = 31:08 | ✅ exato |
| **03/2016** | 12:51 / 00:00 / 07:11 | **27:13** | 12:51 + 07:11×2,0 = 27:13 | ✅ exato |
| **04/2016** | 19:28 / 00:00 / 06:12 | **31:52** | 19:28 + 06:12×2,0 = 31:52 | ✅ exato |
| **11/2014** | 03:24 / 00:00 / 04:42 | **12:48** | 03:24 + 04:42×2,0 = 12:48 | ✅ exato |
| **09/2013** | 12:49 / 00:00 / 00:00 | **12:49** | 12:49 × 1,0 = 12:49 | ✅ exato |

**Conclusões:**
- **Dia útil homologado → ×1,0** no banco.
- **Sábado homologado → ×1,5** no banco (11/2015: 02:16 vira 03:24 de crédito).
- **Domingo / feriado / recesso homologado → ×2,0** no banco (11/2017 e 08/2019: dobra exata).
- Os fatores do TSE XT (`SATURDAY_FACTOR = 1.5`, `SUNDAY_HOLIDAY_FACTOR = 2.0`) **estão corretos** para o crédito no banco.
- Alguns meses "sujos" (09–10/2009, 12/2015, 07/2016, 03/2014) têm `Horas Adquiridas` **maior** que a fórmula — nunca menor —, provavelmente por reconciliação de resíduo mensal e por horas homologadas exibidas já com teto de autorização. Nenhum caso contradiz os fatores.

### 8.3. Implicações para o TSE XT

- **C1 encerrado:** manter o multiplicador; ele reproduz a regra real do Extrato do Banco de Horas.
- **C1b (novo, 🔴):** o `SALDO ACUM.` deve creditar **apenas `Horas Excedentes Homologadas`** (com o fator por tipo de dia). Excedente que virou **pecúnia** ou ficou **não homologado** não entra no banco — hoje o TSE XT credita tudo e infla o saldo, sobretudo em meses eliterais recentes (todo o fim de semana vira pecúnia e o `SALDO ACUM.` não deveria subir por isso).
- **Rótulo:** deixar claro na UI/tooltip que `SALDO ACUM.` é uma **prévia do "Horas Adquiridas" do Extrato do Banco de Horas**, não uma leitura da coluna nativa do espelho.
- **Regime recente:** desde ~2020 o fim de semana do servidor foi 100% pecúnia; o TSE XT precisa detectar isso (rodapé `Pecúnia` > 0 nos sábados/domingos) e **não** creditar essas horas no `SALDO ACUM.`

---

## 9. Estudo empírico — pecúnia em meses de trabalho híbrido (C2)

**Método:** varredura via CDP de 2022–2026 do `EspelhoPontoMesAction_recuperar.action`, cruzando a coluna Ocorrência (`TRABALHO HIBRIDO`) com o rodapé (`Pecúnia`, `Horas Excedentes Homologadas`, `Horas Excedentes Não Homologadas`, `Horas Utilizadas do Banco`, `Resíduo de Horas`). Servidor 30901018.

### 9.1. Resultado — 16 meses com dias de trabalho híbrido

| Mês | Dias híbridos | Pecúnia | Homolog. | Não homolog. | Adq. banco | Resíduo de Horas |
| :--- | :--: | :--: | :--: | :--: | :--: | :--: |
| 08/2022 | 7 | 00:00 | 00:00 | 00:00 | 00:00 | −09:09 |
| 09/2022 | 10 | 00:00 | 00:00 | 00:00 | 00:00 | −05:41 |
| 10/2022 | 10 | 00:00 | 00:00 | 00:00 | 00:00 | 00:00 |
| 11/2022 | 4 | 00:00 | 00:00 | 00:00 | 00:00 | −06:11 |
| 12/2022 | 8 | 00:00 | 00:00 | 00:00 | 00:00 | −12:50 |
| 01/2023 | 9 | 00:00 | 00:00 | 00:00 | 00:00 | −06:37 |
| 02/2023 | 11 | 00:00 | 00:00 | 00:00 | 00:00 | −02:27 |
| 03/2023 | 8 | 00:00 | 00:00 | 00:00 | 00:00 | −90:14 |
| 12/2024 | 8 | 00:00 | 00:00 | 00:00 | 00:00 | −64:07 |
| 02/2025 | 10 | 00:00 | 00:00 | 00:00 | 00:00 | −77:40 |
| 10/2025 | 12 | 00:00 | 00:00 | 00:00 | 00:00 | −97:21 |
| 11/2025 | 2 | 00:00 | 00:00 | 00:00 | 00:00 | −20:31 |
| 03/2026 | 12 | 00:00 | 00:00 | 00:00 | 00:00 | −98:04 |
| 05/2026 | 12 | 00:00 | 00:00 | 00:00 | 00:00 | −95:41 |
| 06/2026 | 9 | 00:00 | 00:00 | 00:00 | 00:00 | −70:15 |
| 07/2026 | 11 | 00:00 | 00:00 | 00:00 | 00:00 | −78:37 |

**Em 100% dos meses híbridos: pecúnia, homologadas, não homologadas e aquisição de banco = zero.** Nos meses com pecúnia > 0 (03,04,09,10/2024; 06,07/2025; 08/2026) **não há** nenhum dia híbrido.

### 9.2. Caso decisivo — trabalho de sábado dentro de mês híbrido

**07/2026** (11 dias híbridos): **04/07/2026 (SÁBADO)** — entrada 08:05, saída 16:08, `TOTAL = 08:03`. Resultado no espelho: `HORAS AJUST. = 00:00`, `PECÚNIA = 00:00`. As 8h03 trabalhadas **não geraram pecúnia, não entraram no banco e não aparecem como "não homologadas"** — foram simplesmente descartadas. Confirma o art. 22-23 da Portaria 490/2022 e o art. 12 da Portaria 380/2026.

### 9.3. Implicações para o TSE XT

- **C2 rebaixado para 🟡:** o sistema oficial já zera tudo. O risco remanescente é o TSE XT **projetar** pecúnia (mês corrente) ou **calcular** pecúnia a partir de horas em vez de ler `.h12`.
  - **Ação 1:** restaurar a zeragem da pecúnia projetada quando o mês tem ≥ 1 dia híbrido/teletrabalho.
  - **Ação 2 (nova feature):** alertar quando houver marcação de trabalho em fim de semana/feriado num mês híbrido — as horas são perdidas.
- **Resíduo de Horas fortemente negativo (C3):** meses híbridos fecham com `Resíduo` de −70h a −98h porque os dias híbridos não somam horas ao `TOTAL` mensal, mas a meta ordinária continua contando. Esse débito **não** é levado ao banco (`Horas Utilizadas do Banco = 00:00`, saldo do Extrato inalterado) — é um número cosmético. O TSE XT **não pode** usar esse `Resíduo` como débito real nos KPIs **"Meta do Mês"** e **"Saída p/ Zerar Mês"**; hoje a supressão da coluna em regime híbrido (§2.2) evita parte disso, mas os KPIs de meta precisam da mesma guarda.
