# 📐 Regras de Cálculo da Frequência — Sistema Oficial do TSE (verificadas)

**Versão do documento:** 1.2.0
**Data:** 02/09/2026
**Escopo:** Espelho de Ponto Mensal (`EspelhoPontoMesAction`), Extrato do Banco de Horas (`BancoHorasAction`) e módulo de cálculo do TSE XT (`content/modules/balanceCalc.js`).
**Método:** leitura do DOM autenticado via Chrome DevTools Protocol (porta 9222); texto das normas no site público do TSE (`tse.jus.br/legislacao/compilada`); estudo empírico de 2009–2026 dos espelhos e do Extrato do Banco de Horas do servidor 30901018 (SETOT).

> Este documento descreve **como o sistema oficial do TSE calcula**, com base normativa e confirmação empírica, e aponta o que o **TSE XT já reproduz corretamente**. Itens a implementar/ajustar estão em [roadmap-conformidade.md](roadmap-conformidade.md). Perguntas ainda sem resposta estão em [duvidas-normativas.md](duvidas-normativas.md).

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

## 2. Síntese da legislação

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

## 3. Regras verificadas do sistema oficial

### 3.1. Os três destinos do excedente diário

O excedente de um dia tem **três destinos mutuamente exclusivos**:

| Destino | Quando ocorre | Efeito no saldo do servidor |
| :--- | :--- | :--- |
| **Pecúnia** (`.h12`) | Serviço extraordinário autorizado e pago (SAEX). Domina nos meses eleitorais recentes (2016, 2022, 2024). | **Não vai ao banco.** Horas cruas na tela; acréscimo de 50%/100% incide **só no valor monetário** (art. 9º). |
| **Horas Excedentes Homologadas** | Aprovadas pela chefia para compensação. Padrão comum até ~2019. | **Creditadas no Banco de Horas com fator por tipo de dia** (ver 3.2). |
| **Horas Excedentes Não Homologadas** | Trabalhadas em excesso, sem aprovação da chefia. | **Perdidas** (fator zero). Aparecem no rodapé do espelho mas não entram no banco. |

O **Espelho de Ponto mostra sempre horas cruas** em todas as colunas. Nenhum fator multiplicador aparece na tela — ele só se materializa na coluna **`Horas Adquiridas`** do Extrato do Banco de Horas.

### 3.2. Multiplicador do Banco de Horas — **CONFIRMADO** (2009–2026)

Sobre as **horas homologadas** creditadas no banco:

| Tipo de dia | Fator | Constante no TSE XT |
| :--- | :--: | :--- |
| Dia útil | **×1,0** | — |
| Sábado | **×1,5** | `SATURDAY_FACTOR = 1.5` |
| Domingo / feriado / recesso / facultativo | **×2,0** | `SUNDAY_HOLIDAY_FACTOR = 2.0` |

São os mesmos percentuais do art. 9º da Res. 22.901/2008 (que os cita para o *valor* da pecúnia); o sistema TSE **também** os aplica ao *crédito de horas* no banco. Evidência exata em [§5.1](#51-multiplicador-do-banco-de-horas). Os fatores do TSE XT **estão corretos**.

### 3.3. Pecúnia

- Registrada em **horas cruas** no espelho (coluna `.h12`).
- O acréscimo de 50% (dia útil/sábado) e 100% (domingo/feriado) é **monetário** — remuneração ÷ 200 × fator (art. 9º) — e **não** aparece na contagem de horas.
- **Pecúnia e compensação são vias excludentes:** hora paga não vai a banco ("Regra de Ouro").

### 3.4. Tetos de fim de semana e feriado

- Limite de **10h por dia** aos sábados, domingos e feriados (art. 4º). O que passa disso é **descartado**: ex. **06/10/2016 (domingo)** — trabalhadas 11h52, reconhecidas 10h00 (08h13 pecúnia + 01h47 adic. noturno), 1h52 perdidas.
- **Pagamento aos domingos e feriados é vedado** fora de plantão eleitoral / dias de eleição (art. 4º §2º; art. 5º da Portaria 380/2026).

### 3.5. Mês fechado — coluna "HORAS AJUST."

Em mês fechado/homologado, a coluna física `h10` deixa de ser "HORAS EXCED." e passa a **"HORAS AJUST."** = **jornada ordinária reconhecida**. Quando falta marcação, a chefia lança apenas as horas suficientes para fechar a jornada ordinária (art. 6º §2º da Portaria 380/2026; art. 2º §2º da Portaria 642/2020). Ex.: **03/10/2024** — trabalhadas 05h21, `HORAS AJUST. = 07h00` (dia completado à jornada, sem débito).

### 3.6. Jornada diária por padrão de marcação (7h / 8h / 5h)

- **8h (40h/semana)** é a jornada padrão do servidor do TSE (Lei 8.112/1990 art. 19). Admite-se **7h (35h/semana)** para quem cumpre a jornada em **turno único** — 1 entrada e 1 saída, **sem intervalo**. O gatilho de 8h é a existência de uma **2ª entrada** (`E2`): registrou 2ª entrada ⇒ tirou intervalo ⇒ o dia é de 8h e o excedente só conta a partir daí.
- O intervalo mínimo de 1h só é exigível **quando a jornada excede 8h**; nesse caso, sem registro do intervalo, o sistema **desconta 1h automaticamente** (art. 7º caput/§1º da Portaria 380/2026).
- Para o turno único, a jornada que **excede a 7ª hora sem passar da 8ª** é **complementação da jornada mensal ordinária**, **não serviço extraordinário** (art. 7º §2º).
- **Confirmação no DOM (via CDP):** o espelho tem uma coluna nativa **`Compl. Jorn. Mínima`** (entre `ADIC. NOTURNO` e `Ocorrência`) que isola a parcela de dias úteis **acima da 7ª hora**, usada para fechar a jornada mensal ordinária. Ex. 03/2024: dia com `TOTAL 07:42` → `Compl. Jorn. Mínima 00:42`; `08:34` → `01:34`; `08:59` → `01:59`. Reforça o [roadmap-conformidade.md R4](roadmap-conformidade.md): essa faixa não entra como excedente/crédito.

### 3.10. Recesso — jornada reduzida a 5h e acúmulo de banco restrito

- Em **janeiro** (todo ano) e em **julho de anos não eleitorais**, o expediente presencial é das 13h às 18h e a jornada em **turno único** passa a **5h** (Portaria-TSE 885/2024 e sucessoras anuais; para julho, Res.-TSE 461/2023). Dias com intervalo de almoço seguem 8h.
- No recesso, **as horas que excedem o limite diário de 5h só podem virar banco de horas por decisão da Diretoria-Geral** — não há acúmulo automático (Portaria-TSE 885/2024). Na prática, para a Auditoria de Horas Perdidas, o excedente de recesso não pago nem homologado entra em **P2** — **exceto** se o mês também for de regime híbrido, caso em que nada conta como perda (ver §3.7).
- "Ano eleitoral" = todo ano **par** (o Brasil tem eleição geral ou municipal a cada ano par). "Julho não eleitoral" = julho de ano **ímpar**.
- **A confirmar** (ver [duvidas-normativas.md D7](duvidas-normativas.md)): se a redução para 5h alcança também quem faz jornada com intervalo, e o recorte exato de datas em janeiro (o recesso forense de 20/12 a 06/01 já é dispensa).
- **Confirmação no DOM (via CDP):** o espelho tem uma coluna nativa **`Compl. Jorn. Mínima`** (entre `ADIC. NOTURNO` e `Ocorrência`) que isola a parcela de dias úteis **acima da 7ª hora**, usada para fechar a jornada mensal ordinária. Ex. 03/2024: dia com `TOTAL 07:42` → `Compl. Jorn. Mínima 00:42`; dia com `TOTAL 08:34` → `01:34`; dia com `08:59` → `01:59`. Reforça o [roadmap-conformidade.md R4](roadmap-conformidade.md): o alvo é 7h e essa faixa não entra como excedente/crédito.

### 3.7. Trabalho híbrido / teletrabalho — supressão integral do serviço extraordinário

Verificado em **16 meses com dias de `TRABALHO HIBRIDO`** (2022–2026), sem exceção ([§5.2](#52-pecúnia-em-meses-de-trabalho-híbrido)):

- `Pecúnia`, `Horas Excedentes Homologadas`, `Horas Excedentes Não Homologadas` e `Horas Adquiridas` no banco = **00:00**.
- **Trabalho real de fim de semana é descartado.** Ex.: **04/07/2026 (sábado)** dentro de mês híbrido — trabalhadas 08h03, `HORAS AJUST. = 00:00`, `PECÚNIA = 00:00`; as horas não geraram pecúnia, não entraram no banco e não figuram sequer como "não homologadas". Outro caso: **10/2022** — 2 fins de semana trabalhados (15/10 09h08 sáb, 30/10 12h29 dom) + excedente de dias úteis presenciais, `Resíduo de Horas = 00:00`, tudo absorvido em `HORAS AJUST.`.
- Base: art. 22-23 da Portaria 490/2022; art. 12 da Portaria 380/2026.
- **Na Auditoria de Horas Perdidas** esse descarte **não** é contado como "perda" (a partir da v0.4.9): como a norma suprime o serviço extraordinário e veda o acúmulo de banco no mês, não há direito a compensar — é estrutural do regime. O total descartado fica registrado só como informação (tooltip do selo "Híbrido" e coluna `DescartadoHibrido_info` no CSV). Meses híbridos passam a somar 0 à perda (só P1/P4, que já são 00:00 nesses meses).

### 3.8. "Resíduo de Horas" em mês híbrido é cosmético

Meses híbridos fecham com `Resíduo de Horas` de **−70h a −98h** (ex.: 03/2026 = −98:04) porque os dias híbridos não somam horas ao `TOTAL` mensal, mas a meta ordinária continua contando os dias. Esse débito **não é levado ao banco** (`Horas Utilizadas do Banco = 00:00`, saldo do Extrato inalterado) — é um número de exibição, não uma dívida real.

### 3.9. Excedente além do quantitativo de HE autorizado — homologação é a única porta para o banco

Num mês com serviço extraordinário **autorizado**, o excedente diário segue os três destinos de §3.1, com o recorte abaixo — confirmado por cruzamento **Espelho × Extrato do Banco de Horas** do servidor 30901018 ([§5.3](#53-excedente-em-meses-com-he-autorizada)):

| Situação do excedente | Para onde vai | Efeito no banco |
| :--- | :--- | :--- |
| Dentro do quantitativo autorizado e pago via SAEX | **Pecúnia** (`.h12`) | Nada (Regra de Ouro, §3.3) |
| Fora do quantitativo autorizado, **não** homologado pela chefia | **"Horas Excedentes Não Homologadas"** no rodapé; ou, nos dias úteis, absorvido como **`Compl. Jorn. Mínima`** / travado no teto da jornada ordinária (`HORAS AJUST. = 07:00`) | **Nada — perda.** Não gera linha no Extrato. |
| Fora do quantitativo autorizado, **homologado** pela chefia | **"Horas Excedentes Homologadas"** | **Creditado no banco** com fator por tipo de dia (§3.2), **mesmo no mês que também teve pecúnia** |

**Não há conversão automática.** O único caminho do excedente não pago para o banco é a **homologação ativa pela chefia**. Sem ela, o excedente some: cai em "Não Homologadas" (fim de semana/feriado) ou é reclassificado como complementação da jornada ordinária (dias úteis).

**Não há vedação à *aquisição* de banco no mês com HE autorizado.** A Portaria 380/2026 art. 13 veda a **utilização** (consumo) do saldo, não o **crédito**. Meses com pecúnia **e** homologadas simultâneas que creditaram o Extrato:

| Mês (com HE autorizado) | Pecúnia | Homologadas | `Horas Adquiridas` no Extrato |
| :--- | :--- | :--- | :--- |
| **04/2026** (Portaria 380/2026 vigente) | 06:00 (Dom) | 05:50 (Úteis) | **05:50** — ×1,0 exato |
| **09/2025** | 05:34 (Dom) | 04:36 (Úteis) | **04:36** — ×1,0 exato |
| **01/2016** | 15:00 (Dom) | 19:28 (Úteis) | **19:28** — ×1,0 exato |
| **12/2015** | 10:00 (Dom) | 21:42 (Úteis+Dom) | 40:10 — maior que a fórmula, ver [duvidas-normativas.md D4](duvidas-normativas.md) |

**Caso-referência de perda — 03/2024** (mês fechado, HE autorizado em 13 dias): trabalhadas 183h05; **38h19 pagas em pecúnia** (sáb/dom/feriado autorizados); **15h34 de excedente não autorizado → "Horas Excedentes Não Homologadas"**; `Horas Excedentes Homologadas = 00:00`; **nenhuma linha de 03/2024 no Extrato** → as 15h34 **não viraram banco, foram perdidas**. `Resíduo` e `Utilizadas do Banco` = 00:00. Mesmo padrão em 11/2024 (pecúnia 08:00 + não homologadas 03:15, zero no Extrato) e 12/2020.

> **Resposta à dúvida prática** ("fiz 60h excedentes, só 30h de HE autorizadas"): as 30h autorizadas vão para **pecúnia**; as outras 30h **não viram banco de horas automaticamente**. Só entram no banco se a chefia **homologar** essa parcela (aí com fator por tipo de dia). Caso contrário, aparecem como **"Horas Excedentes Não Homologadas"** (perda) ou são absorvidas como complementação da jornada ordinária. A Portaria 380/2026 art. 13 **não** impede esse crédito — impede apenas **usar** o saldo do banco naquele mês. Ver limite ainda em aberto em [duvidas-normativas.md D6](duvidas-normativas.md).

---

## 4. O que o TSE XT já implementa em conformidade

| Regra do TSE XT | Fundamento | Verificação |
| :--- | :--- | :--- |
| Fatores **sábado ×1,5** / **domingo-feriado ×2,0** no crédito do banco | Res. 22.901/2008 art. 9º + prática do sistema | Confirmado — [§5.1](#51-multiplicador-do-banco-de-horas) |
| Acréscimos de 50%/100% para **pecúnia** | Res. 22.901/2008 art. 9º | Síntese §2 |
| Pecúnia **nunca** entra no saldo de compensação ("Regra de Ouro") | Vias excludentes — art. 9º × art. 11 | §3.3 |
| Mês fechado: `h10` = "HORAS AJUST." ≈ jornada reconhecida | Portaria 380/2026 art. 6º §2º; Portaria 642/2020 art. 2º §2º | §3.5 |
| Não acumula BH em regime híbrido/teletrabalho | Portaria 490/2022 art. 22 | §3.7 *(mas ver [ROADMAP R3](roadmap-conformidade.md) sobre o usufruto do saldo)* |
| Dias de licença/afastamento/férias fora do denominador da meta | Portaria 490/2022 art. 12 §6 | Síntese §2 |
| Guarda de dispensa (licença, férias, viagem, abono integral) não debita jornada inteira em mês fechado | Portaria 490/2022 art. 12 §6 | `balanceCalc.js` L72 |

---

## 5. Estudos empíricos

### 5.1. Multiplicador do Banco de Horas

**Método:** `fetch()` autenticado ao `EspelhoPontoMesAction_recuperar.action` e ao `BancoHorasAction_recuperarExtrato.action`; cruzamento do rodapé `Horas Excedentes Homologadas` (quebrado em *Dias Úteis / Sábados / Domingos-Feriados-Recessos*) com a coluna `Horas Adquiridas` do Extrato, mês a mês, **2/2009 a 4/2026**.

Casos limpos (sem pecúnia, sem utilização, resíduo 00:00):

| Mês | Homologadas (Úteis / Sáb / Dom-Fer) | `Horas Adquiridas` | Cálculo `Úteis×1 + Sáb×1,5 + DomFer×2` | Bate? |
| :--- | :--- | :--- | :--- | :--- |
| **11/2017** | 00:00 / 00:00 / **15:29** | **30:58** | 15:29 × 2,0 = 30:58 | ✅ exato |
| **08/2019** | 00:00 / 00:00 / **04:59** | **09:58** | 04:59 × 2,0 = 09:58 | ✅ exato |
| **11/2015** | 27:44 / **02:16** / 00:00 | **31:08** | 27:44 + 02:16×1,5 (=03:24) = 31:08 | ✅ exato |
| **03/2016** | 12:51 / 00:00 / 07:11 | **27:13** | 12:51 + 07:11×2,0 = 27:13 | ✅ exato |
| **04/2016** | 19:28 / 00:00 / 06:12 | **31:52** | 19:28 + 06:12×2,0 = 31:52 | ✅ exato |
| **11/2014** | 03:24 / 00:00 / 04:42 | **12:48** | 03:24 + 04:42×2,0 = 12:48 | ✅ exato |
| **09/2013** | 12:49 / 00:00 / 00:00 | **12:49** | 12:49 × 1,0 = 12:49 | ✅ exato |

Alguns meses "sujos" (09–10/2009, 12/2015, 07/2016, 03/2014) têm `Horas Adquiridas` **maior** que a fórmula — nunca menor — provavelmente por reconciliação de resíduo mensal e por horas já exibidas com teto de autorização. Nenhum caso contradiz os fatores. (Ver [duvidas-normativas.md D4](duvidas-normativas.md).)

### 5.2. Pecúnia em meses de trabalho híbrido

**Método:** varredura de 2022–2026 do espelho, cruzando a coluna Ocorrência (`TRABALHO HIBRIDO`) com o rodapé.

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

**Em 100% dos meses híbridos: tudo zerado.** Nos meses com pecúnia > 0 (03,04,09,10/2024; 06,07/2025; 08/2026) **não há** nenhum dia híbrido. Caso decisivo: 04/07/2026 (§3.7).

### 5.3. Excedente em meses com HE autorizada

**Método:** varredura via CDP (porta 9222) do `EspelhoPontoMesAction_recuperar.action` de **01/2014 a 12/2026** e do `BancoHorasAction_recuperarExtrato.action` completo (105 lançamentos, 2009–2026), cruzando, mês a mês, o rodapé do espelho (`Pecúnia`, `Horas Excedentes Homologadas`, `Horas Excedentes Não Homologadas`, `Horas Utilizadas do Banco`, `Resíduo`) com as colunas `Horas Adquiridas` / `Horas Utilizadas` do Extrato. "HE autorizado" = presença de chamadas `detalharAutorizacao(` nas linhas do dia e/ou `Pecúnia > 0`.

**Achado 1 — o excedente não pago só chega ao banco via homologação da chefia.**

| Mês | HE autoriz. | Pecúnia | Homologadas | Não Homolog. | `Adquiridas` (Extrato) | Leitura |
| :--- | :--: | :--: | :--: | :--: | :--: | :--- |
| **03/2024** (fechado) | 13 dias | 38:19 | **00:00** | **15:34** | *(sem linha)* | excedente não autorizado → perda total |
| **11/2024** (fechado) | 1 dia | 08:00 | 00:00 | 03:15 | *(sem linha)* | idem |
| **12/2020** (fechado) | 19 dias | 49:39 | 00:00 | 01:13 | *(sem linha)* | idem |
| **10/2024** (fechado) | 20 dias | 50:55 | 00:00 | 00:00 | *(sem linha)* | excedente de dia útil travado em `HORAS AJUST. = 07:00`, some sem virar "não homologada" |
| **12/2015** | 25 dias | 10:00 | 21:42 | 00:00 | **40:10** | chefia homologou → creditou (valor > fórmula, ver D4) |
| **01/2016** | 28 dias | 15:00 | 19:28 | 00:00 | **19:28** | homologado → creditou ×1,0 exato |
| **09/2025** | 30 dias | 05:34 | 04:36 | 00:00 | **04:36** | homologado → creditou ×1,0 exato |
| **04/2026** | 4 dias | 06:00 | 05:50 | 00:00 | **05:50** | **Portaria 380/2026 vigente** → homologado ainda credita |

**Achado 2 — a Portaria 380/2026 art. 13 veda o *consumo*, não a *aquisição*.** Em 04/2026 e 09/2025 (meses com HE autorizado e pecúnia) o Extrato registrou `Horas Adquiridas` da parcela homologada, com `Horas Utilizadas = 00:00`. Não há, na base do servidor 30901018, um mês de 2026 com HE autorizado **e** tentativa de usufruto do banco — a metade "veda a utilização" do art. 13 fica sem caso de teste (ver [duvidas-normativas.md D3](duvidas-normativas.md)).

**Achado 3 — antes da Portaria 380/2026, banco creditava e debitava livremente em mês de pecúnia.** Ex.: 04/2018 (pecúnia 22:18 + `Utilizadas 44:13`), 05/2018 (pecúnia 39:29 + `Utilizadas 59:02`), 01/2020 (pecúnia 10:00 + homologadas 02:47 + não homologadas 02:51 + `Utilizadas 07:20`, os quatro destinos no mesmo mês).

---

## 6. Fontes

- [Resolução-TSE nº 22.901/2008](https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008) · [Resolução-TSE nº 23.629/2020](https://www.tse.jus.br/legislacao/compilada/res/2020/resolucao-no-23-629-de-27-de-agosto-de-2020) · [Resolução-TSE nº 23.615/2020](https://www.tse.jus.br/legislacao/compilada/res/2020/resolucao-no-23-6152-de-19-de-marco-de-2020)
- [Portaria-TSE nº 380/2026](https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026) · [Portaria-TSE nº 490/2022](https://www.tse.jus.br/legislacao/compilada/prt/2022/portaria-no-490-de-20-de-maio-de-2022) · [Portaria-TSE nº 642/2020](https://www.tse.jus.br/legislacao/compilada/prt/2020/portaria-no-642-de-1o-de-setembro-de-2020) · [Portaria-TSE nº 641/2020](https://www.tse.jus.br/legislacao/compilada/prt/2020/portaria-no-641-de-1o-de-setembro-de-2020) · [Portaria-TSE nº 829/2021](https://www.tse.jus.br/legislacao/compilada/prt/2021/portaria-no-829-de-14-de-dezembro-de-2021) · [Portaria-TSE nº 378/2019](https://www.tse.jus.br/legislacao/compilada/prt/2019/portaria-no-378-de-23-de-maio-de-2019)
- Lei nº 8.112/1990, arts. 74 e 75
