# 🗺️ Roadmap Consolidado de Evoluções — TSE XT

**Versão do documento:** 1.0.0  
**Data de consolidação:** 30/09/2026  
**Status do projeto:** Marco 1.0 entregue (v1.0.0) · Planejamento das próximas versões (v1.1+)

> Este documento é a **fonte única e centralizada da verdade** para o backlog de evolução do TSE XT. Reúne em um só lugar as pendências normativas de cálculo, melhorias de interface/experiência de usuário, novos módulos funcionais, débitos técnicos e validações regulatórias.

---

## 📌 Sumário das Trilhas

1. [Status Atual & Conquistas do Marco 1.0](#-status-atual--conquistas-do-marco-10)
2. [Trilha C — Conformidade Normativa & Regras de Cálculo](#-trilha-c--conformidade-normativa--regras-de-cálculo)
3. [Trilha U — Usabilidade, Layout & Experiência Visual](#-trilha-u--usabilidade-layout--experiência-visual)
4. [Trilha M — Novos Módulos Dedicados & Funcionalidades de Negócio](#-trilha-m--novos-módulos-dedicados--funcionalidades-de-negócio)
5. [Trilha T — Arquitetura, Qualidade & Testes Automatizados](#-trilha-t--arquitetura-qualidade--testes-automatizados)
6. [Apêndice D — Dúvidas Normativas & Bloqueios de Validação](#-apêndice-d--dúvidas-normativas--bloqueios-de-validação)

---

## 🏁 Status Atual & Conquistas do Marco 1.0

A versão **v1.0.0** consolidou a infraestrutura fundamental e o Design System do TSE XT:

* ✅ **Arquitetura Visual Genérica (F1–F7)**: Cobertura automática de todas as ~30 telas do menu clássico Struts do Meu Espaço (títulos, breadcrumbs semânticos, formulários, tabelas zebradas e alinhamento numérico).
* ✅ **Módulos Dedicados**:
  * **Espelho de Ponto**: Painel de 5 KPIs de planejamento, cálculo de saldo diário, auditoria de horas perdidas desde 2009, ajuste de ponto inline.
  * **Reembolso Farmacêutico**: Busca inteligente de medicamentos com debounce e filtro híbrido local, calculadora de desconto e resumo em painel lateral.
  * **Gestão de Serviço Extraordinário**: Painel de chefia com barras de progresso (autorizado × realizado) e monitoramento de excedente com potencial de pecúnia.
* ✅ **Boot Splash Instantâneo (80ms)**: Carregamento suave em azul institucional cobrindo os fluxos de logon tradicional e SSO.

---

## ⚖️ Trilha C — Conformidade Normativa & Regras de Cálculo

Ajustes acionáveis para alinhar as fórmulas do TSE XT às normas vigentes do TSE (Resolução nº 22.901/2008, Portaria nº 490/2022 e Portaria nº 380/2026).

| ID | Item | Severidade | Origem / Norma | Descrição & Ação Necessária |
| :--- | :--- | :---: | :--- | :--- |
| **C1** | **`SALDO ACUM.` apenas com Horas Homologadas** | 🔴 Alta | Portaria 380/2026 · [regras §3.1](regras-calculo-frequencia.md#31-os-três-destinos-do-excedente-diário) | **Problema:** Hoje o saldo acumulado diário incorpora todo o excedente bruto de finais de semana com fator 1,5/2,0.<br>**Ação:** Creditar no saldo diário apenas a parcela classificada como `Horas Excedentes Homologadas`. Tratar `Pecúnia` e horas `Não Homologadas` como externas ao banco de horas. Rotular a coluna como prévia do Extrato do Banco de Horas. |
| **C2** | **Três Estados de Banco de Horas** | 🔴 Alta | Portaria 490/2022 art. 22 · Portaria 380/2026 art. 13 | **Ação:** Implementar explicitamente a matriz de três regimes:<br>1. *Normal*: Crédito ✅ / Consumo ✅ / Saldo visível ✅.<br>2. *Híbrido/Teletrabalho sem HE*: Crédito ❌ / Consumo ✅ / Saldo visível ✅.<br>3. *Mês com HE Autorizado (art. 13)*: Crédito ✅ (apenas homologadas) / Consumo ❌ (vedada a utilização no mês) / Saldo visível ✅. |
| **C3** | **Pecúnia em Mês Híbrido & Alerta de FDS Perdido** | 🟡 Média | Portaria 490/2022 art. 22 · Portaria 380/2026 art. 12 | **Problema:** Em meses com trabalho híbrido/teletrabalho, o serviço extraordinário é suprimido na totalidade.<br>**Ação:** Restaurar a zeragem da pecúnia projetada no mês corrente quando houver $\ge 1$ dia híbrido. Emitir alerta visual se houver trabalho executado em sábado/domingo/feriado em mês híbrido, informando que essas horas não geram pecúnia nem acúmulo no banco. |
| **C4** | **Faixa de Complementação 7h–8h & Recesso 5h** | 🟡 Média | Portaria 380/2026 art. 7º §2º · Portaria 885/2024 | **Ação:** Tratar a faixa da 7ª à 8ª hora no turno único como complementação da jornada mensal ordinária (não gera crédito imediato de saldo excedente). Ajustar o cálculo da meta em meses de recesso forense (janeiro e julho de ano ímpar), onde a jornada-base passa a 5h e o acúmulo no banco depende de decisão da DG. |
| **C5** | **Alertas de Tetos Legais de Horas Extras** | 🟡 Média | Res. 22.901/2008 · Portaria 380/2026 art. 4º | **Ação:** Incluir badges e alertas no card e no rodapé do espelho quando ocorrer extrapolação de:<br>• $> 2\text{h}$ em dia útil;<br>• $> 10\text{h}$ em sábados/domingos/feriados;<br>• $> 60\text{h}$ acumuladas no mês (teto legal);<br>• Destaque da faixa de 60h a 90h ("sujeita a deliberação da DG"). |
| **C6** | **Selo Diário de Excedente Além do Autorizado** | 🟡 Média | Portaria 380/2026 art. 3º e 10 | **Ação:** Cruzar o excedente do dia contra o limite diário da respectiva autorização obtida via `heAuthFetch.js` (backend do SAEX), exibindo aviso diário quando o realizado superar o autorizado. |
| **C7** | **Conceito de Plantão/Eleição para Domingos e Feriados** | 🟡 Média | Res. 22.901/2008 art. 4º §2º · Portaria 380/2026 art. 5º | **Ação:** Fora de períodos de plantão eleitoral/dias de eleição, o pagamento de pecúnia aos domingos e feriados é vedado por norma. Direcionar o excedente desses dias para compensação (+100%), salvo se o mês for identificado como plantão/eleitoral. |
| **C8** | **Alerta de Repouso Interjornada < 8h** | 🟢 Baixa | Res. 22.901/2008 art. 7º | **Ação:** Detectar e emitir alerta discreto quando o intervalo entre a última saída de um dia e a primeira entrada do dia subsequente for inferior ao mínimo de 8 horas consecutivas. |
| **C9** | **Documentação / Aviso de Adicional Noturno** | 🟢 Baixa | Lei nº 8.112/1990 art. 75 | **Ação:** Exibir tooltip informativo esclarecendo que a hora noturna reduzida (52min30s) e a coluna `.h13` não são recalculadas pelo saldo sintético do TSE XT. |
| **C10** | **Atualização da Legislação de Referência Injetada** | 🟢 Baixa | Portarias 490/2022 e 380/2026 | **Ação:** Atualizar a seção injetada de normas oficiais no rodapé da página para referenciar as portarias vigentes no TSE. |

---

## 🎨 Trilha U — Usabilidade, Layout & Experiência Visual

Melhorias para tornar o uso diário mais ergonômico, rápido e produtivo.

| ID | Item | Impacto | Descrição & Ação Necessária |
| :--- | :--- | :---: | :--- |
| **U1** | **Persistência (*Sticky*) de Topbar, KPIs e Cabeçalho da Tabela** | 🔥 Alto | **Problema:** Ao rolar o espelho de ponto em meses longos, perde-se a visão dos KPIs e dos títulos das colunas.<br>**Ação:** Implementar `position: sticky` refinado na topbar, na linha de 5 cards de KPI e no `<thead>` da tabela de frequência com background sólido/glass translúcido e sombra de elevação. |
| **U2** | **Modo Conferência Lado a Lado (XT × Oficial)** | 🔥 Alto | **Ação:** Criar um modo comparativo onde o saldo oficial do portal e o saldo analítico do TSE XT são exibidos lado a lado, com destaque visual de discrepâncias, facilitando auditoria rápida pelo servidor. |
| **U3** | **Exportação Visual Aprimorada & Layout de Impressão (`@media print`)** | 💡 Médio | **Ação:** Criar folha de estilo de impressão limpa que remova botões, drawers e elementos de navegação, formatando o espelho com os 5 KPIs em página única para geração direta de PDF institucional. |
| **U4** | **Central de Preferências Estendida** | 💡 Médio | **Ação:** Expandir a tela de popup da extensão para permitir configurar: regime de trabalho padrão (presencial / híbrido), jornada esperada (7h ou 8h), e ativação/desativação de alertas normativos específicos. |

---

## 📦 Trilha M — Novos Módulos Dedicados & Funcionalidades de Negócio

Evolução de telas secundárias do portal para o status de *Módulo com Lógica Dedicada* (além do revestimento visual genérico).

| ID | Módulo Alvo | Oportunidade / Funcionalidade Proposta |
| :--- | :--- | :--- |
| **M1** | **Extrato do Banco de Horas Inteligente & Alerta de Validade** | • Dashboard de acompanhamento da validade de horas acumuladas.<br>• Painel preditivo de **prescrição/expiração** (alertando sobre horas prestes a vencer em 30/60/90 dias com base na tela `BancoHorasAction_recuperarValidade`).<br>• Gráfico de evolução histórica de acúmulo vs. usufruto. |
| **M2** | **Assistente de Férias e Afastamentos** | • Cálculo automático de períodos aquisitivos abertos e saldo de dias restantes.<br>• Simulador de parcelamento e sugestão de melhor janela de usufruto.<br>• Linha do tempo visual de afastamentos programados na equipe. |
| **M3** | **Central de Contracheque & Ficha Financeira** | • Comparativo mês a mês de proventos, descontos e remuneração líquida.<br>• Destaque visual de rubricas variáveis (horas extras pagas, gratificações, substituições). |

---

## 🛠️ Trilha T — Arquitetura, Qualidade & Testes Automatizados

Débitos técnicos, modularização e robustez da suíte de testes.

| ID | Item | Escopo Técnico |
| :--- | :--- | :--- |
| **T1** | **Refatoração do Core Matemático (`balanceCalc.js`)** | Separar explicitamente o retorno diário em `{ deltaCompensacao, valorPecunia, homologavelBanco, horasNaoHomologadas }` para eliminar acoplamentos entre pecúnia e saldo acumulado. |
| **T2** | **Expansão da Suíte de Testes Unitários (`tests/`)** | Adicionar fixtures automatizadas com meses reais emblemáticos derivados dos estudos empíricos (meses de eleição 10/2022, 10/2024, meses híbridos de 2023/2024 e recesso 01/2025). |
| **T3** | **Monitoramento Automatizado de Regressões Visuais via CDP** | Padronizar scripts de teste e captura automática via CDP (`tools/loja/`) para validar ausência de exceções JS em todas as telas do portal. |

---

## ❓ Apêndice D — Dúvidas Normativas & Bloqueios de Validação

Questões que demandam inspeção empírica ou confirmação com as áreas gestoras (`frequencia@tse.jus.br`) para fechamento dos algoritmos:

* **D1 — Coluna `TOTAL` Líquida de Almoço**: Inspecionar mês fechado com 4 batidas para confirmar se `TOTAL` já exclui o intervalo entre $S_1$ e $E_2$.
* **D2 — Tolerância de Marcação & Compensação Intra-Mês**: Confirmar se existe tolerância oficial em minutos e documentar a portaria exata de controle de frequência.
* **D3 — Vedação de Consumo de BH com HE Autorizado**: Confirmar se o bloqueio de usufruto do art. 13 da Portaria 380/2026 deve bloquear a projeção "Saída p/ Zerar Mês" ou apenas emitir aviso.
* **D4 — Multiplicador de Banco em Meses Antigos**: Reconciliar casos históricos pontuais em que `Horas Adquiridas` foi superior à soma ponderada.
* **D5 — Resíduo de Horas Negativo em Mês Híbrido**: Acompanhar se o resíduo negativo em meses híbridos gera cobrança financeira futura em caso de desligamento/exoneração.
* **D6 — Teto da Homologação da Chefia vs. SAEX**: Esclarecer se a chefia imediata pode homologar excedente além do limite autorizado pela DG no SAEX.
* **D7 — Escopo da Jornada de 5h no Recesso**: Confirmar datas exatas de vigência e se a jornada de 5h contempla apenas turno único ou também servidores com intervalo.
