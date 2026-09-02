# ❓ Dúvidas Normativas em Aberto

**Versão do documento:** 2.0.0
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
| **O que se sabe** | Nenhuma das normas analisadas (Res. 22.901/2008, Portarias 380/2026, 490/2022, 642/2020, 641/2020, 378/2019) fixa tolerância. A regra geral do serviço público federal (fora do TSE) costuma citar 15 min. |
| **Como resolver** | Buscar na legislação compilada do TSE uma portaria de controle de frequência (a lista da página do espelho está desatualizada); confirmar com `frequencia@tse.jus.br`. Alternativamente, inferir empiricamente comparando marcações reais com o `TOTAL` calculado pelo sistema em dias de atraso pequeno. |
| **Status** | Aberta. |

## D3 — O TSE XT deve refletir a vedação total de uso de BH no mês com HE autorizado?

| | |
| :--- | :--- |
| **Por que importa** | A Portaria 380/2026 art. 13 veda a **utilização** de banco de horas para qualquer finalidade no mês em que o servidor for autorizado a realizar serviço extraordinário. É o terceiro estado de [roadmap-conformidade.md R3](roadmap-conformidade.md). |
| **Em aberto** | (a) Como a extensão detecta que o mês tem HE **autorizado** — ícone/coluna de autorização (`detalharAutorizacao`), presença de pecúnia, ou consulta a outra tela? (b) É uma decisão de produto se o TSE XT deve *bloquear* o KPI "Saída p/ Zerar Mês" nesses meses ou apenas *avisar*. |
| **Como resolver** | Levantar via CDP um mês com HE autorizado e ver quais sinais ficam disponíveis no DOM do espelho; decidir o comportamento do KPI. |
| **Status** | Aberta. |

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
