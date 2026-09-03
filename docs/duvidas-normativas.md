# ❓ Dúvidas Normativas em Aberto

**Versão do documento:** 2.3.0
**Data:** 02/09/2026

> Perguntas que **ainda não têm resposta** e afetam o cálculo do TSE XT. Regras já verificadas estão em [regras-calculo-frequencia.md](regras-calculo-frequencia.md); ajustes planejados em [roadmap-conformidade.md](roadmap-conformidade.md).
>
> Histórico: este arquivo foi `CONFLITOS_NORMATIVOS.md` — a matriz de conflitos C1–C11 foi dividida entre os dois documentos acima; sobraram aqui apenas as questões abertas.

---

## D1 — A coluna `TOTAL` do espelho já vem líquida do intervalo de almoço?

| | |
| :--- | :--- |
| **Por que importa** | Define o alvo diário do cálculo ([roadmap-conformidade.md R4](roadmap-conformidade.md)). Se `TOTAL` já exclui o gap entre `S1` e `E2`, o alvo correto é **420 min** e usar 480 gera débito indevido de 1h/dia para quem marca intervalo. Se `TOTAL` incluir o gap, a lógica de 480 min faz sentido. |
| **Como resolver** | Inspecionar via CDP um dia de mês fechado com `E1,S1,E2,S2` (ex.: 19/10/2009 — 07:25/12:09 e 12:58/16:18) e conferir se `TOTAL` = soma dos dois turnos (08:04) ou inclui os 49 min de intervalo. |
| **Status** | Aberta — dado disponível, falta rodar a verificação. |

## D2 — Existe portaria de controle de frequência do TSE com tolerância de marcação?

| | |
| :--- | :--- |
| **Por que importa** | O TSE XT calcula ao minuto exato. Se houver tolerância oficial (5/10/15 min) antes de computar atraso ou excedente, o saldo do TSE XT diverge sistematicamente do oficial. |
| **O que se sabe** | Nenhuma das normas analisadas (Res. 22.901/2008, Portarias 380/2026, 490/2022, 642/2020, 641/2020, 378/2019) fixa tolerância. A regra geral do serviço público federal (fora do TSE) costuma citar 15 min. **Existe** uma regra de compensação intra-mês (pesquisa web, 03/09/2026): *"não cumprida a carga horária mensal e não havendo saldo no banco de horas, a compensação se dará com horas trabalhadas no próprio mês"* — confirmado empiricamente ([regras §3.11](regras-calculo-frequencia.md#311-compensação-intra-mês--o-excedente-de-um-dia-paga-o-débito-de-outro)). Falta identificar a portaria exata (provável "Portaria de Controle de Frequência do TSE") e nela: tolerância de marcação, arredondamento, prazo de compensação. |
| **Como resolver** | Buscar na legislação compilada do TSE a portaria de controle de frequência; confirmar com `frequencia@tse.jus.br`. Alternativamente, inferir empiricamente comparando marcações reais com o `TOTAL` calculado pelo sistema em dias de atraso pequeno. |
| **Status** | Aberta — regra de compensação intra-mês já verificada, mas a portaria-fonte e a tolerância de marcação seguem sem identificação. |

## D3 — O TSE XT deve refletir a vedação total de uso de BH no mês com HE autorizado?

| | |
| :--- | :--- |
| **Por que importa** | A Portaria 380/2026 art. 13 veda a **utilização** de banco de horas para qualquer finalidade no mês em que o servidor for autorizado a realizar serviço extraordinário. É o terceiro estado de [roadmap-conformidade.md R3](roadmap-conformidade.md). |
| **Em aberto** | (a) Como a extensão detecta que o mês tem HE **autorizado** — ícone/coluna de autorização (`detalharAutorizacao`), presença de pecúnia, ou consulta a outra tela? (b) É uma decisão de produto se o TSE XT deve *bloquear* o KPI "Saída p/ Zerar Mês" nesses meses ou apenas *avisar*. (c) **Falta caso de teste** para a metade "veda a **utilização**" do art. 13: na base do servidor 30901018 não há mês de 2026 com HE autorizado **e** tentativa de usufruto do banco. |
| **Verificado (02/09/2026, CDP)** | O art. 13 **não veda a aquisição**: em 04/2026 e 09/2025 (HE autorizado + pecúnia) a parcela homologada creditou `Horas Adquiridas` no Extrato, com `Utilizadas = 00:00` — ver [regras-calculo-frequencia.md §5.3](regras-calculo-frequencia.md#53-excedente-em-meses-com-he-autorizada). O sinal de "mês com HE autorizado" no DOM é a chamada `detalharAutorizacao(` nas linhas do dia (+ `Pecúnia > 0`). Consequência: a tabela de três estados do [roadmap-conformidade.md R3](roadmap-conformidade.md) foi corrigida (crédito ✅ da parcela homologada, débito ❌). |
| **Status** | Parcialmente resolvida — resta confirmar a vedação de **consumo** do saldo no mês com HE autorizado. |

## D4 — Por que alguns meses têm `Horas Adquiridas` maior que a fórmula de multiplicador?

| | |
| :--- | :--- |
| **Por que importa** | O estudo empírico ([regras-calculo-frequencia.md §5.1](regras-calculo-frequencia.md#51-multiplicador-do-banco-de-horas)) confirmou os fatores ×1 / ×1,5 / ×2,0 em casos limpos, mas em 09–10/2009, 12/2015, 07/2016 e 03/2014 a `Horas Adquiridas` do Extrato ficou **maior** que `Úteis×1 + Sáb×1,5 + DomFer×2` (nunca menor). Entender a diferença permite reconstruir o saldo com precisão total. |
| **Hipóteses** | (a) reconciliação de resíduo mensal positivo (horas trabalhadas acima da meta em dias não homologados entram parcialmente); (b) as `Horas Excedentes Homologadas` exibidas já vêm com teto de autorização aplicado, enquanto o crédito usa o valor bruto; (c) arredondamento diário vs. mensal. |
| **Como resolver** | Abrir dia a dia um mês "sujo" (ex.: 10/2009) e comparar cada excedente diário homologado com o incremento correspondente no Extrato. |
| **Status** | Aberta — não bloqueia o [roadmap-conformidade.md R1](roadmap-conformidade.md) (a direção do erro é conservadora). |

## D5 — O `Resíduo de Horas` negativo de mês híbrido é sempre cosmético?

| | |
| :--- | :--- |
| **Por que importa** | Meses híbridos fecham com `Resíduo de Horas` de −70h a −98h ([regras-calculo-frequencia.md §3.8](regras-calculo-frequencia.md#38-resíduo-de-horas-em-mês-híbrido-é-cosmético)). Nos casos observados esse valor **não** foi debitado do banco (`Horas Utilizadas do Banco = 00:00`, saldo do Extrato inalterado). Se em algum cenário ele **for** cobrado (acerto de contas, exoneração — Portaria 378/2019 art. 1º), o TSE XT precisaria tratá-lo. |
| **Como resolver** | Acompanhar o Extrato do Banco de Horas nos meses seguintes a um mês híbrido de resíduo alto e verificar se aparece débito posterior; checar a tela de "Validade" (`BancoHorasAction_recuperarValidade`). |
| **Status** | Aberta. |

## D6 — A homologação de excedente pela chefia tem teto no quantitativo de HE autorizado?

| | |
| :--- | :--- |
| **Por que importa** | Define se a parcela **não paga** de um mês com HE autorizado pode ser resgatada para o banco. Empiricamente ([regras-calculo-frequencia.md §5.3](regras-calculo-frequencia.md#53-excedente-em-meses-com-he-autorizada)): em 12/2015, 01/2016, 09/2025 e 04/2026 a chefia homologou excedente e ele creditou o Extrato **mesmo havendo pecúnia no mês**; já em 03/2024 e 11/2024 o excedente não autorizado foi **100% para "Não Homologadas"** (perda). Não se sabe o que determina um caminho ou outro. |
| **Em aberto** | A chefia pode homologar excedente **acima** do quantitativo que a DG autorizou via SAEX, ou a homologação fica limitada ao autorizado (e o restante é obrigatoriamente "não homologado")? A Res. 22.901/2008 art. 4º §1º e a Portaria 380/2026 art. 11 preveem deliberação da DG "limitada a 30h" apenas para a extrapolação do **teto mensal de 60h** — não para a diferença entre realizado e autorizado. |
| **Como resolver** | Num mês fechado com HE autorizado, comparar excedente bruto diário × autorizado (SAEX / `detalharAutorizacao`) × o que entrou como `Horas Excedentes Homologadas`. Confirmar com `frequencia@tse.jus.br`. |
| **Status** | Aberta. |

## D7 — Jornada de 5h no recesso: escopo e datas exatas

| | |
| :--- | :--- |
| **Por que importa** | O TSE XT já adota jornada de **5h** em janeiro e em julho de ano não eleitoral para o turno único ([regras-calculo-frequencia.md §3.10](regras-calculo-frequencia.md#310-recesso--jornada-reduzida-a-5h-e-acúmulo-de-banco-restrito)). Isso muda a meta do mês e a categoria **P2** da Auditoria de Horas Perdidas. Se o recorte estiver errado, a auditoria super/subestima janeiros e julhos inteiros. |
| **O que se sabe** | Portaria-TSE 885/2024 (e sucessoras anuais, ex. 552/2025): no recesso o trabalho é presencial e observa **limite de 5h diárias**, salvo exceção justificada e pré-autorizada; o que excede 5h **só vira banco por decisão da DG**. Res.-TSE 461/2023: expediente de julho das 13h às 18h. As portarias são **anuais** — a data exata de início/fim em janeiro varia (o recesso forense de 20/12 a 06/01 já é dispensa à parte). |
| **Em aberto** | (a) A redução para 5h vale também para quem cumpre jornada **com intervalo** (8h), ou só para o turno único? (b) Quais os dias exatos de janeiro (todo o mês? a partir de 07/01?). (c) Confirmar que julho de **ano par** (eleitoral) nunca tem redução. (d) A cada dezembro, cadastrar a portaria do ano seguinte. |
| **Como resolver** | Inspecionar via CDP um espelho fechado de janeiro e de julho ímpar (ex.: 01/2025, 07/2025) e ver o alvo diário que o sistema aplicou; confirmar com `frequencia@tse.jus.br`. |
| **Status** | Aberta — implementação atual assume mês inteiro e só turno único. |
