# 🗺️ Roadmap Consolidado de Evoluções — TSE XT

**Versão do documento:** 1.2.0

**Data de consolidação:** 12/11/2026

**Status do projeto:** v1.2.0 estável aprovada · série 1.1 consolidada · itens abertos da Trilha C preservados

> Este documento é a **fonte única e centralizada da verdade** para o backlog de evolução do TSE XT. Reúne em um só lugar as pendências normativas de cálculo, melhorias de interface/experiência de usuário, novos módulos funcionais, débitos técnicos e validações regulatórias.

---

A liberação 1.2.0 reúne M4/M5, a cobertura de dias curtos, as melhorias de frequência e a impressão em retrato. Aprovação visual concedida em 12/11/2026. Ver [changelog](../CHANGELOG.md) e [registro da liberação](release-1.2.0.md).

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
| **C1** | **`SALDO ACUM.` apenas com Horas Homologadas** | ✅ Concluído (v1.1.3) | Portaria 380/2026 · [regras §3.1](regras-calculo-frequencia.md#31-os-três-destinos-do-excedente-diário) | Creditar no saldo diário apenas a parcela `Horas Excedentes Homologadas`. Pecúnia e horas não homologadas ficam fora do banco; injeção da coluna `HORAS PERDIDAS`. |
| **C2** | **Três Estados de Banco de Horas** | ✅ Entregue (série 0.6.x) | Portaria 490/2022 art. 22 · Portaria 380/2026 art. 13 | Segregar regimes: Normal, Híbrido (sem crédito) e Mês com HE Autorizada (crédito restrito a homologadas, consumo vedado). |
| **C3** | **Pecúnia em Mês Híbrido & Alerta de FDS Perdido** | 🟡 Pendente | Portaria 490/2022 art. 22 · Portaria 380/2026 art. 12 | Zerar projeção de pecúnia em mês híbrido; emitir alerta para trabalho em FDS/feriado suprimido pela norma. |
| **C4** | **Faixa de Complementação 7h–8h & Recesso 5h** | 🟡 Parcial | Portaria 380/2026 art. 7º §2º · Portaria 885/2024 | Tratar 7h–8h no turno único como complementação ordinária (não gera crédito imediato); recesso forense 5h. |
| **C5** | **Alertas de Tetos Legais de Horas Extras** | 🟡 Parcial | Res. 22.901/2008 · Portaria 380/2026 art. 4º | Badges e alertas para > 2h em dia útil, > 10h em FDS/feriado, > 60h acumuladas no mês e faixa 60h–90h. |
| **C6** | **Selo Diário de Excedente Além do Autorizado** | ⏸️ Adiado | Portaria 380/2026 art. 3º e 10 | Cruzar excedente com limites diários lidos do SAEX via `heAuthFetch.js`; sinalizar quando realizado superar autorizado. |
| **C7** | **Conceito de Plantão/Eleição para Domingos e Feriados** | ❌ Cancelado | Res. 22.901/2008 art. 4º §2º · Portaria 380/2026 art. 5º | Direcionar domingos/feriados fora de eleição/plantão para compensação (+100%), vedando pecúnia indevida. |
| **C8** | **Alerta de Repouso Interjornada < 8h** | ❌ Cancelado | Res. 22.901/2008 art. 7º | Alerta discreto quando intervalo entre última saída e primeira entrada subsequente for < 8h consecutivas. |
| **C9** | **Documentação / Aviso de Adicional Noturno** | 🟢 Parcial | Lei nº 8.112/1990 art. 75 | Tooltip elucidativo sobre hora ficta noturna de 52m30s e coluna `.h13` não recalculadas sinteticamente. |
| **C10** | **Atualização da Legislação de Referência Injetada** | 🟢 Pendente | Portarias 490/2022 e 380/2026 | Atualizar bloco injetado no rodapé substituindo normas revogadas pelas portarias vigentes. |

---

**O que falta em cada item (levantamento no código em 10/11/2026, v1.1.4-Snapshot):**

* **C2:** nada a implementar: `kpiExtractor.js` já separa os regimes e veda o consumo no mês com HE autorizada. Segue aberta a confirmação normativa de [D3](duvidas-normativas.md).
* **C3:** falta o selo na linha de sábado, domingo ou feriado em mês híbrido e conferir a projeção de pecúnia do KPI 4. A supressão no mês inteiro está confirmada empiricamente ([regras §5.2](regras-calculo-frequencia.md#52-pecúnia-em-meses-de-trabalho-híbrido)).
* **C4:** jornada 7h/8h/5h e selo de recesso já existem, e o mês fechado só credita homologadas (C1). Falta tratar a faixa 7h–8h na projeção do dia corrente. Escopo das 5h depende de [D7](duvidas-normativas.md).
* **C5:** selos diários e referência de 60h no card já existem. Falta o indicador da faixa de 60h a 90h.
* **C6:** adiado por decisão do responsável em 10/11/2026, até voltar a ser priorizado. Quando retomado, o selo deve dizer apenas que a parcela além do autorizado "depende de homologação da chefia", o que vale qualquer que seja a resposta de [D6](duvidas-normativas.md).
* **C7:** cancelado em 10/11/2026. Não haverá regra por dia de eleição ou plantão: o fator ×2 vale para domingo e feriado.
* **C8:** cancelado em 10/11/2026: na revisão do histórico o caso só ocorreu 2 vezes, ambas por batida logo após a meia-noite.
* **C9:** as células de adicional noturno têm tooltip, mas falta explicar a hora ficta de 52min30s e que o valor não é recalculado.
* **C10:** não implementado. A lista desatualizada vem da própria página do portal, e a extensão ainda não acrescenta as normas vigentes.

---

**Horas perdidas (v1.1.7-Snapshot):** a coluna `HORAS PERDIDAS`, os selos da coluna Ocorrência e a Auditoria passaram a usar o mesmo cálculo (`lostHoursCalc.js`), com a nova categoria P5. Aguarda validação na página real.

**Cobertura de dias curtos (v1.1.16-Snapshot, 12/11/2026):** implementada a cobertura pelo fim de semana não pago com ×1,5/×2, inclusive acima de 10h, antes de classificar P3/P5. Espelho, Auditoria de Horas Perdidas e M4 usam a mesma conta; tempo trabalhado e cobertura equivalente ficam separados. Testes de regressão para os meses decisivos e conferência autenticada de oito meses; 10/2026 fecha sem perda nem débito. D11 permanece aberta e a jornada atual foi preservada. Aprovação visual e merge continuam pendentes. Ver [regras §3.13](regras-calculo-frequencia.md#313-fim-de-semana-não-pago-cobre-a-falta-de-dia-útil-11112026).

Verificação da v1.1.16: **192 testes passando**, Full Update real de **215 meses** e Reconhecimento Posterior de **6 servidores em 10/2026**. O Perdido da equipe caiu de **51:36 para 14:20**; CSV e impressão conferidos nos dois agrupamentos. Registro completo em [handoff de 12/11](handoff-2026-11-12.md).

**M4 — impressão em retrato (v1.1.17-Snapshot):** A4 retrato por padrão, conforme pedido de 12/11. As tabelas de destinos e de discriminação do Perdido foram separadas na impressão para manter todos os valores legíveis. Conferidos os dois agrupamentos no Chrome e 192 testes passando.

### Detalhamento Executivo dos Itens da Trilha C

---

#### ✅ C1 — `SALDO ACUM.` apenas com Horas Homologadas (Concluído em v1.1.3-Snapshot)
* **Norma & Fundamentação:** Portaria-TSE nº 380/2026 art. 9º, 10 e 11; [regras §3.1](regras-calculo-frequencia.md#31-os-três-destinos-do-excedente-diário) e [§3.9](regras-calculo-frequencia.md#39-excedente-além-do-quantitativo-de-he-autorizado--homologação-é-a-única-porta-para-o-banco). O excedente diário possui 3 destinos mutuamente excludentes: *Pecúnia* (paga, não vai a banco), *Horas Homologadas* (vai a banco com fator) e *Horas Não Homologadas* (descartadas, perda).
* **Casos de Testes Automatizados:**
  * `TC-C1-01`: Mês fechado com HE autorizada onde 100% do excedente de FDS virou pecúnia $\rightarrow$ `SALDO ACUM.` não incorpora FDS; saldo final fecha em `00:00`.
  * `TC-C1-02`: Mês com excedente não homologado pela chefia $\rightarrow$ `SALDO ACUM.` expurga horas não homologadas (fator zero).
  * `TC-C1-03`: Mês com parcela homologada pela chefia (ex.: abr/2026) $\rightarrow$ apenas a parcela homologada é creditada no `SALDO ACUM.` (aplicando fator ×1,0 para úteis, ×1,5 sábado e ×2,0 domingo/feriado).
  * `TC-C1-04`: Jornada superior a 10h em sábado/domingo/feriado (ex.: 11h52 em 06/10/2016 ou 11h24 em 07/09/2026) $\rightarrow$ coluna injetada `HORAS PERDIDAS` exibe `+01:52` ou `+01:24`, expurgando o tempo do saldo acumulado.
* **Cenário Real & URLs no Meu Espaço:**
  * *Exemplo 1 (Pecúnia pura de eleição):* Mês 10/2024 fechado com 50h55 de pecúnia e 00:00 homologadas.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=10`
    Extrato: `https://meuespaco.tse.jus.br/portalservidor2/BancoHorasAction_recuperarExtrato.action` (nenhuma hora adquirida de 10/2024).
  * *Exemplo 2 (Horas perdidas não homologadas):* Mês 03/2024 com 38h19 de pecúnia e 15h34 não homologadas.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=3`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** A coluna `SALDO ACUM.` somou todos os finais de semana (com fatores 1,5 e 2,0), inflando artificialmente o banco em dezenas de horas que ou já foram pagas em dinheiro ou foram descartadas.
  * **Depois (Solução):**
    1. O saldo acumulado diário só incorpora o que for classificado como homologado para compensação, rotulado como prévia do "Horas Adquiridas" do Extrato oficial.
    2. **Nova Coluna Injetada `HORAS PERDIDAS`:** enxertada no cabeçalho, nas linhas e no rodapé da tabela (à direita de `Compl. Jorn. Mínima`), quantificando para cada dia o tempo acima do teto de $10\text{h}$ em sábados/domingos/feriados (Res. 22.901/2008 art. 4º), que não é pago nem compensado. O excedente de dia útil acima de $2\text{h}$ não entra: continua na reconciliação do mês ([regras §3.11](regras-calculo-frequencia.md#311-compensação-intra-mês--o-excedente-de-um-dia-paga-o-débito-de-outro)).
    3. **Limitações conhecidas:** o espelho só traz o total mensal de homologadas por tipo de dia, então a distribuição entre os dias segue a ordem das linhas e só o fechamento do mês é exato. Mês fechado com consumo de banco (`Horas Utilizadas do Banco`) não mostra esse débito na coluna.
* **Arquivos Impactados:** `content/modules/balanceCalc.js`, `content/modules/domModernizer.js`, `content/modules/kpiExtractor.js`, `content/espelho-ponto.css`, `tests/balanceCalc.test.mjs`.

---

#### 🔴 C2 — Três Estados de Banco de Horas
* **Norma & Fundamentação:** Portaria-TSE nº 490/2022 art. 22; Portaria-TSE nº 380/2026 art. 13; [regras §3.7](regras-calculo-frequencia.md#37-trabalho-híbrido--teletrabalho--supressão-integral-do-serviço-extraordinário) e [§3.8](regras-calculo-frequencia.md#38-resíduo-de-horas-em-mês-híbrido-é-cosmético).
* **Matriz de Regimes:**
  1. *Normal (presencial):* Crédito ✅ / Consumo ✅ / Saldo visível ✅.
  2. *Híbrido/Teletrabalho:* Crédito ❌ / Consumo ✅ / Saldo visível ✅ (resíduo cosmético de −70h a −98h não debita banco).
  3. *Mês com HE Autorizado (art. 13):* Crédito ✅ (apenas homologadas) / Consumo ❌ (vedada utilização no mês) / Saldo visível ✅.
* **Casos de Testes Automatizados:**
  * `TC-C2-01`: Servidor presencial sem HE $\rightarrow$ Crédito e débito fluem normalmente.
  * `TC-C2-02`: Mês com $\ge 1$ dia híbrido $\rightarrow$ Crédito bloqueado, consumo permitido de saldo pré-existente; resíduo negativo não alimenta cálculo de débito.
  * `TC-C2-03`: Mês com autorização de HE $\rightarrow$ Crédito permitido apenas para homologadas; botão/projeção de consumo bloqueado.
* **Cenário Real & URLs no Meu Espaço:**
  * *Híbrido:* Mês 03/2026 (resíduo cosmético de −98:04 sem débito real no extrato).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2026&mesSelecionado=3`
  * *HE Autorizado:* Mês 04/2026 (Portaria 380/2026 vigente, pecúnia 06:00 dom + 05:50 úteis homologadas).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2026&mesSelecionado=4`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Falta de segregação estrita no cálculo diário do saldo acumulado linha a linha e projeções de zeramento de mês tentando consumir banco em mês de HE autorizado.
  * **Depois (Solução):** Bloqueio coerente e unificado em todos os KPIs e na coluna da tabela, refletindo os direitos de aquisição e usufruto de cada modalidade.
* **Arquivos Impactados:** `content/modules/balanceCalc.js`, `content/modules/kpiExtractor.js`, `tests/kpiCards.test.mjs`.

---

#### 🟡 C3 — Pecúnia em Mês Híbrido & Alerta de FDS Perdido
* **Norma & Fundamentação:** Portaria-TSE nº 490/2022 art. 22-23; Portaria-TSE nº 380/2026 art. 12; [regras §3.7](regras-calculo-frequencia.md#37-trabalho-híbrido--teletrabalho--supressão-integral-do-serviço-extraordinário). Em mês com trabalho híbrido/teletrabalho, o serviço extraordinário é suprimido na integralidade.
* **Casos de Testes Automatizados:**
  * `TC-C3-01`: Mês aberto com dia híbrido registrado $\rightarrow$ projeção de pecúnia forçada a `00:00`.
  * `TC-C3-02`: Trabalho registrado em sábado, domingo ou feriado em mês híbrido (ex.: sábado 04/07/2026 com 08h03) $\rightarrow$ emissão de badge de alerta visual de descarte normativo.
* **Cenário Real & URLs no Meu Espaço:**
  * *Trabalho de FDS em híbrido:* Sábado 04/07/2026 com 08h03 trabalhadas e `HORAS AJUST. = 00:00` / `PECÚNIA = 00:00` no sistema oficial.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2026&mesSelecionado=7`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** O TSE XT permitia projeção de pecúnia em mês aberto híbrido e não alertava o servidor que o trabalho prestado no fim de semana não teria qualquer contraprestação de banco ou pecúnia.
  * **Depois (Solução):** Pecúnia projetada zerada automaticamente no KPI 4 e badge na linha do FDS/feriado alertando o servidor sobre a supressão normativa.
* **Arquivos Impactados:** `content/modules/balanceCalc.js`, `content/modules/kpiExtractor.js`, `content/modules/domModernizer.js`.

---

#### 🟡 C4 — Faixa de Complementação 7h–8h & Recesso 5h
* **Norma & Fundamentação:** Portaria-TSE nº 380/2026 art. 7º §2º; Portaria-TSE nº 885/2024; [regras §3.6](regras-calculo-frequencia.md#36-jornada-diária-por-padrão-de-marcação-7h--8h--5h) e [§3.10](regras-calculo-frequencia.md#310-recesso--jornada-reduzida-a-5h-e-acúmulo-de-banco-restrito). Para o turno único, a faixa entre 420min e 480min é computada como complementação ordinária da jornada mensal (coluna nativa `Compl. Jorn. Mínima`), não serviço extraordinário. Em janeiro e julho (ano ímpar), a base é 5h e acúmulo no banco depende de ato da DG.
* **Casos de Testes Automatizados:**
  * `TC-C4-01`: Dia útil em turno único com 7h42 de total $\rightarrow$ os 42min entre 7h e 8h não creditam saldo excedente imediato.
  * `TC-C4-02`: Mês de janeiro em turno único $\rightarrow$ jornada-alvo de 5h (300min); aviso no saldo acumulado de que excedente não vai automaticamente ao banco.
* **Cenário Real & URLs no Meu Espaço:**
  * *Complementação ordinária:* Mês 03/2024 (dias com 07:42 $\rightarrow$ `Compl. Jorn. Mínima 00:42`; 08:34 $\rightarrow$ `01:34`).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=3`
  * *Recesso 5h:* Mês 01/2025.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2025&mesSelecionado=1`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Qualquer minuto acima de 420min em dia útil gerava saldo positivo no `SALDO ACUM.`, divergindo da lógica de fechamento mensal do TSE.
  * **Depois (Solução):** Classificação da faixa 7h–8h como complementação ordinária e isolamento do acúmulo de recesso.
* **Arquivos Impactados:** `content/modules/balanceCalc.js`, `content/modules/legalConfig.js`, `content/modules/domModernizer.js`.

---

#### 🟡 C5 — Alertas de Tetos Legais de Horas Extras
* **Norma & Fundamentação:** Resolução-TSE nº 22.901/2008 art. 4º; Portaria-TSE nº 380/2026 art. 4º; [regras §3.4](regras-calculo-frequencia.md#34-tetos-de-fim-de-semana-e-feriado). Limites de 2h/dia útil, 10h/FDS-feriado, 60h/mês e faixa de 60h–90h para compensação sob deliberação da DG.
* **Casos de Testes Automatizados:**
  * `TC-C5-01`: Excedente diário útil $> 120\text{min}$ $\rightarrow$ badge `> 2h (art. 4º)`.
  * `TC-C5-02`: Trabalho em FDS/feriado $> 600\text{min}$ $\rightarrow$ badge `> 10h (art. 4º)` e descarte do tempo excedente.
  * `TC-C5-03`: Mês com horas extras acumuladas $> 60\text{h}$ $\rightarrow$ badge e alerta no card de teto legal de 60h atingido.
  * `TC-C5-04`: Faixa de 60h a 90h $\rightarrow$ indicador de dependência de deliberação da DG para fins de compensação.
* **Cenário Real & URLs no Meu Espaço:**
  * *Teto de 10h em FDS:* Domingo 06/10/2016 com 11h52 trabalhadas, teto travado em 10h00 e 1h52 descartadas; ou Feriado 07/09/2026 com 11h24 trabalhadas (caso Fernando Lima Rocha).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2026&mesSelecionado=9`
  * *Teto de 60h no mês:* Mês 10/2024 (50h55 de HE executada, próximo ao teto).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=10`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Alertas diários implementados parcialmente; faltava sinalização consolidada do teto mensal de 60h e da faixa especial de 60h–90h no card e rodapé.
  * **Depois (Solução):** Alertas completos e transparentes no card de Horas Extras e nos badges da tabela diária.
* **Arquivos Impactados:** `content/modules/domModernizer.js`, `content/modules/kpiExtractor.js`, `tests/balanceCalc.test.mjs`.

---

#### 🟡 C6 — Selo Diário de Excedente Além do Autorizado
* **Norma & Fundamentação:** Portaria-TSE nº 380/2026 art. 3º e 10; [regras §3.9](regras-calculo-frequencia.md#39-excedente-além-do-quantitativo-de-he-autorizado--homologação-é-a-única-porta-para-o-banco). Excedente executado sem respaldo de autorização prévia no SAEX não gera pecúnia nem banco automático.
* **Casos de Testes Automatizados:**
  * `TC-C6-01`: Dia onde `excedenteRealizado > limiteAutorizadoDoDia` (via `heAuthFetch.js`) $\rightarrow$ badge `> autorizado (SAEX)`.
* **Cenário Real & URLs no Meu Espaço:**
  * *Excedente não autorizado:* Mês 03/2024 em dias com trabalho além do autorizado pelo SAEX.
    URL do Espelho: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=3`
    URL do Backend SAEX: `https://meuespaco.tse.jus.br/portalservidor2/AutorizacaoHoraExcedenteAction_execute?dataDia.asString=15/03/2024&servidor.matricula=30000000`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** O servidor realizava horas excedentes acreditando que seriam pagas ou compensadas, descobrindo apenas no fechamento do mês que viraram "Horas Não Homologadas" perdidas.
  * **Depois (Solução):** Comparação em tempo de execução com os dados da autorização SAEX do dia, alertando visualmente na própria linha que a parcela excedente depende de homologação ativa.
* **Arquivos Impactados:** `content/modules/domModernizer.js`, `content/modules/heAuthFetch.js`.

---

#### ❌ C7 — Conceito de Plantão/Eleição para Domingos e Feriados (Cancelado em 10/11/2026)
* **Decisão:** não haverá regra por dia de eleição ou plantão. O tratamento especial é só de domingo e feriado.
* **Evidência (revisão de 213 meses fechados do histórico):** horas homologadas de domingo/feriado creditaram com fator ×2 também em anos ímpares, e houve pecúnia de domingo/feriado em anos sem eleição. Limitar a pecúnia ao contexto eleitoral contrariaria o que o sistema oficial pratica.

---

#### ❌ C8 — Alerta de Repouso Interjornada < 8h (Cancelado em 10/11/2026)
* **Norma & Fundamentação:** Resolução-TSE nº 22.901/2008 art. 7º. Mínimo de 8h ininterruptas entre o fim de uma jornada e o início da seguinte.
* **Casos de Testes Automatizados:**
  * `TC-C8-01`: $E_1(Dia_{N+1}) - S_{fim}(Dia_N) < 480\text{min}$ $\rightarrow$ emissão de badge `⚠️ Repouso interjornada < 8h (art. 7º)`.
* **Cenário Real & URLs no Meu Espaço:**
  * *Fechamentos eleitorais / plantões:* Dias de apuração ou fechamento de cadastro com saídas noturnas e retornos matutinos.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=5`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Ausência total de controle temporal entre dias consecutivos.
  * **Depois (Solução):** Alerta preventivo e ergonômico na linha do dia subsequente.
* **Arquivos Impactados:** `content/modules/domModernizer.js`.

---

#### 🟢 C9 — Documentação / Aviso de Adicional Noturno
* **Norma & Fundamentação:** Lei nº 8.112/1990 art. 75; hora noturna ficta de 52min30s (22h às 5h) registrada na coluna nativa `.h13`.
* **Casos de Testes Automatizados:**
  * `TC-C9-01`: Célula ou cabeçalho `.h13` renderiza tooltip informativo esclarecendo a limitação de cálculo.
* **Cenário Real & URLs no Meu Espaço:**
  * *Mês com trabalho noturno:* Qualquer mês com marcações após as 22h (ex.: 10/2024).
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action?anoSelecionado=2024&mesSelecionado=10`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Servidor tinha dúvida se a coluna de adicional noturno estava sendo incorporada ao saldo acumulado.
  * **Depois (Solução):** Tooltip claro e normativo informando que o adicional noturno segue o cálculo nativo oficial do TSE.
* **Arquivos Impactados:** `content/modules/domModernizer.js`.

---

#### 🟢 C10 — Atualização da Legislação de Referência Injetada
* **Norma & Fundamentação:** Portarias-TSE nº 490/2022 e 380/2026; Res.-TSE nº 22.901/2008 (redação 23.629/2020); Portaria-TSE nº 885/2024.
* **Casos de Testes Automatizados:**
  * `TC-C10-01`: Bloco injetado no rodapé do espelho deve conter links e citações para as normas vigentes, substituindo as regras legadas de COVID de 2019–2021.
* **Cenário Real & URLs no Meu Espaço:**
  * *Rodapé de legislação do Espelho:* Seção "Legislação de referência" em qualquer mês.
    URL: `https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action`
* **Visualização Antes vs Depois:**
  * **Antes (Problema):** Página oficial e injeção do TSE XT referenciando portarias antigas de teletrabalho na pandemia.
  * **Depois (Solução):** Injeção moderna e padronizada com o quadro normativo pleno e atualizado do TSE.
* **Arquivos Impactados:** `content/modules/domModernizer.js`, `content/modules/legalConfig.js`.

---

## 🎨 Trilha U — Usabilidade, Layout & Experiência Visual

Melhorias para tornar o uso diário mais ergonômico, rápido e produtivo.

| ID | Item | Impacto | Descrição & Ação Necessária |
| :--- | :--- | :---: | :--- |
| **U1** | **Persistência (*Sticky*) de Topbar, KPIs e Cabeçalho da Tabela** | 🔥 Alto | **Problema:** Ao rolar o espelho de ponto em meses longos, perde-se a visão dos KPIs e dos títulos das colunas.<br>**Ação:** Implementar `position: sticky` refinado na topbar, na linha de 5 cards de KPI e no cabeçalho da tabela de frequência.<br>*Status:* Cabeçalho de `#tblEspelhoPontoMesCorrente` concluído (sticky no topo com backdrop opaco, sombra de elevação e suporte a colunas customizadas). |
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
| **M4** | **Relatório de Reconhecimento Posterior** ✅ v1.1.11 | • Por servidor da equipe: horas feitas além da jornada × horas pagas em pecúnia, banco e compensação.<br>• Horas a reconhecer nas duas saídas: pecúnia (50% / 100%) ou banco de horas (×1 / ×1,5 / ×2).<br>• Versão para impressão, para anexar ao pedido, e CSV. |
| **M5** | **Auditoria de Pagamento de Pecúnias** ✅ v1.1.12 | • Confere se as horas de pecúnia do espelho de cada mês aparecem nos contracheques, por faixa (dia útil, sábado, domingo/feriado).<br>• Aponta mês pago a menor, não localizado, pago a maior e pagamento sem horas no espelho.<br>• Confere o adicional noturno sobre o serviço extraordinário. CSV e versão para impressão. |

**M4 — Relatório de Reconhecimento Posterior (v1.1.11-Snapshot):** entregue no botão de ações rápidas e na busca (Ctrl+K). A conta de cada mês está em `recognitionCalc.js`, sobre o mesmo cálculo das horas perdidas (`lostHoursCalc.js`), com testes. A equipe vem do seletor de servidores do Espelho de Ponto. Só mês fechado e fora do regime híbrido entra nos totais. O relatório não calcula valores em reais nem afirma direito: a decisão é da Diretoria-Geral (Res. 22.901/2008 art. 4º §1º e art. 11; Portaria 380/2026 art. 11). Conferido na página real em 11/2026: leitura da equipe, espelho de outros servidores e conferência de que a resposta do portal é do servidor pedido. A conferência mostrou que o nome de quem emite não saía na versão para impressão; corrigido na v1.1.13. Na v1.1.15 passou a usar os nomes do Espelho de Ponto (Excedente, Compensou dias curtos, Pago, Banco, Perdido e os selos dos motivos), com cada coluna explicada no título e no próprio relatório, e ganhou o agrupamento mês → servidor ao lado de servidor → mês.

**M5 — Auditoria de Pagamento de Pecúnias (v1.1.12-Snapshot):** entregue no botão de ações rápidas e na busca (Ctrl+K), só para o próprio servidor. A conta está em `payrollAuditCalc.js`, com testes: o rodapé do espelho (Pecúnia + Adicional Noturno Pecúnia, por faixa) é comparado com a coluna Qtd. das rubricas de serviço extraordinário, ligadas ao mês pela coluna Ref. do contracheque. A leitura cobre todas as folhas (normal e suplementares) dos 3 meses seguintes e vai até 12 meses para o que não fecha. O relatório não calcula quanto deveria ter sido pago nem afirma direito: aponta o que conferir com a unidade de pagamento (Res. 22.901/2008 art. 9º; Lei 8.112/1990 art. 75). Conferida na página real em 11/2026. Na v1.1.14 deixou de ter limite de meses (o período é escolha do servidor), e a barra passou a mostrar o andamento da varredura inteira e a previsão de término, como no Relatório de Reconhecimento Posterior e na Auditoria de Horas Perdidas.

---

## 🛠️ Trilha T — Arquitetura, Qualidade & Testes Automatizados

Débitos técnicos, modularização e robustez da suíte de testes.

| ID | Item | Escopo Técnico |
| :--- | :--- | :--- |
| **T1** | **Refatoração do Core Matemático (`balanceCalc.js`)** | Separar explicitamente o retorno diário em `{ deltaCompensacao, valorPecunia, homologavelBanco, horasNaoHomologadas }` para eliminar acoplamentos entre pecúnia e saldo acumulado. |
| **T2** | **Expansão da Suíte de Testes Unitários (`tests/`)** | Adicionar fixtures automatizadas com meses reais emblemáticos derivados dos estudos empíricos (meses de eleição 10/2022, 10/2024, meses híbridos de 2023/2024 e recesso 01/2025). |
| **T3** | **Monitoramento Automatizado de Regressões Visuais via CDP** | Padronizar scripts de teste e captura automática via CDP (`tools/loja/`) para validar ausência de exceções JS em todas as telas do portal. |
| **T4** | **Envio à Chrome Web Store por CI (1.2.1-Snapshot)** | Workflow manual por tag estável, cliente da API v2 e OIDC GitHub → GCP. Consulta de status separada de upload/submissão; publicação após aprovação permanece manual. Configuração operacional em [automacao-chrome-web-store.md](automacao-chrome-web-store.md). |

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
