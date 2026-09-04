# 🎯 Proposta — Reorganização dos KPIs para planejamento do mês

**Versão do documento:** 1.0.0
**Data:** 03/09/2026
**Escopo:** painel de 5 KPIs do Espelho de Ponto Mensal (`domModernizer.injectKPICards`, `kpiExtractor`).

> Objetivo: o painel deve responder, de forma direta, a três perguntas de planejamento:
> 1. **Quanto estou devendo ou sou credor no mês?**
> 2. **Quanto vai entrar no banco (homologação) ou sair do banco neste mês?**
> 3. **Hora extra em pecúnia:** quanto está autorizado, quanto já fiz, quanto ainda está aberto — separado por **semana/sábado (+50%)** e **domingo/feriado (+100%)**.

---

## 1. Diagnóstico do painel atual

| Card atual | Problema para planejamento |
| :--- | :--- |
| Saída Expediente | ok, mas é "hoje", não "mês" |
| Banco de Horas | só mostra o saldo; não diz o que o mês adiciona/consome |
| Meta do Mês | mostra fração (%), não o número "devo/sou credor" |
| Saída p/ Zerar Mês | é "hoje" de novo — ocupa um slot que poderia ser do mês |
| Horas Extras | só a pecúnia **já feita**; sem autorizado nem aberto |

---

## 2. Painel proposto (5 KPIs)

```
┌────────────────┐┌────────────────┐┌────────────────┐┌────────────────┐┌────────────────┐
│ SAÍDA DE HOJE  ││ SALDO DO MÊS   ││ BANCO DE HORAS ││ HORA EXTRA      ││ META DO MÊS    │
│    19:24       ││    −02:45      ││    12:15       ││  (PECÚNIA)      ││ 88:20 / 133:00 │
│ Jornada: 7h    ││ devedor        ││ +05:50 homolog.││ Sem/Sáb (+50%) ││ ▓▓▓▓▓▓░░ 66%   │
│ Zerar mês:     ││ ▓▓▓▓▓▓░░ 66%   ││ → banco        ││ feito 12:15    ││ Faltam 44:40   │
│ compensar+2h45 ││ 6 dias úteis   ││ (saldo hoje ok)││ Dom/Fer (+100%)││ em 6 dias      │
│ hoje           ││ restantes      ││                ││ feito 06:00    ││ jornada ordin. │
└────────────────┘└────────────────┘└────────────────┘└────────────────┘└────────────────┘
```

### KPI 1 — Saída de Hoje  *(funde "Saída Expediente" + "Saída p/ Zerar Mês")*
- **Valor:** horário para cumprir a jornada de hoje (7h / 8h / 5h — regra R4).
- **Linha 1:** "Faltam HH:MM hoje" / "Jornada cumprida" (some quando o mês visualizado não contém hoje).
- **Linha 2:** "Zerar o mês: saia HH:MM" → *sair X mais cedo* (credor) ou *compensar +X hoje* (devedor). Adapta em mês híbrido / HE autorizado (consumo vedado → "—").

### KPI 2 — Saldo do Mês  ⟵ **pergunta 1**
- **Valor grande:** `+HH:MM` credor / `−HH:MM` devedor / `00:00` — líquido de pecúnia, já com a projeção do dia de hoje e a **compensação intra-mês** (§3.11: o excedente de um dia paga o dia curto de outro).
- **Linha:** mini-barra de progresso + "N dias úteis restantes" ou "meta batida".
- **Cor:** verde credor · âmbar devedor · cinza zero.

### KPI 3 — Banco de Horas  ⟵ **pergunta 2**
- **Valor:** saldo atual do banco (coluna nativa do rodapé).
- **Linha, conforme o mês fecha:**
  - **credor →** `+HH:MM homologáveis → banco` = `homologPreviewMinutes` (Úteis×1 + Sáb×1,5 + DomFer×2 do rodapé "Horas Excedentes Homologadas").
  - **devedor →** `−HH:MM sairão do banco` = `min(|saldo do mês|, saldo do banco)`; se estourar, `· vira débito: HH:MM`.
- **Estados de regime:**
  - Híbrido → "Sem acúmulo (Port. 490/2022 art. 22)".
  - HE autorizado → "Consumo vedado (art. 13) · homologáveis +X".
  - Recesso 5h → "Acúmulo só por decisão da DG (Port. 885/2024)".

### KPI 4 — Hora Extra (Pecúnia)  ⟵ **pergunta 3**
Dois blocos, cada um com **Autorizado / Feito / Aberto** + mini-barra `feito / autorizado`:

| Bloco | Feito (fonte) | Autorizado | Aberto | Teto legal |
| :--- | :--- | :--- | :--- | :--- |
| **Semana / Sábado (+50%)** | `pecuniaWeekdaySatMinutes` (dias úteis + sábado) | campo manual `authWeekdaySat` | `max(0, auth − feito)` | 2h/dia útil · 10h/sábado · conta no teto de **60h/mês** |
| **Domingo / Feriado (+100%)** | `pecuniaSundayHolidayMinutes` (domingo + feriado) | campo manual `authSundayHoliday` | `max(0, auth − feito)` | 10h/dia, mas **pagamento vedado fora de plantão eleitoral** (art. 4º §2º Res. 22.901; art. 5º Port. 380/2026) — fora de eleição fica 00:00 |

- Ícone ⚙ abre os **dois** campos de autorizado (persistidos por matrícula + mês em `chrome.storage.local`).
- Alerta quando o **feito** cruzar o teto do dia (badge R5) ou as 60h do mês.
- Sem HE autorizada e sem campo preenchido → mostra só "feito" + "resta ao teto de 60h: HH:MM".

### KPI 5 — Meta do Mês (jornada ordinária)
- Mantém: barra + fração (`cumprido / esperado`, %) + "Faltam HH:MM em N dias".
- Rótulo deixa explícito: **jornada ordinária** (7h/8h/5h × dias úteis), sem HE.

---

## 3. Matriz de comportamento por regime

| Regime | KPI 2 Saldo | KPI 3 Banco | KPI 4 Pecúnia |
| :--- | :--- | :--- | :--- |
| **Normal** | `+/−` normal | credor → homologável; devedor → puxa do banco | teto legal 60h |
| **HE autorizado** (art. 13) | `+/−` normal | consumo vedado; só mostra homologável | autorizado/feito/aberto **ativo** |
| **Híbrido** | `+/−` com aviso "cosmético" (§3.8) | "Sem acúmulo" | "HE suprimida no regime" |
| **Recesso 5h** | `+/−` sobre jornada de 5h | "acúmulo só por decisão da DG" | igual ao Normal |

---

## 4. Dados — o que já existe × o que falta

**Já disponível** (`kpiExtractor` / `authorizationScan`): saldo net do mês, saldo do banco, `homologPreviewMinutes`, pecúnia feita (total + split semana-sáb / dom-fer), meta (esperado / cumprido / faltam / dias úteis), flags de regime (`hasHybridWorkInMonth`, `hasAuthorizedHEInMonth`, `isReducedRecessMonth`).

**A calcular / obter:**

| Campo | Fórmula / fonte |
| :--- | :--- |
| `balanceStatus` | `credor` se `monthBalanceMin > 0`, `devedor` se `< 0`, senão `zero` |
| `bancoWillAddMin` | mês credor & Normal/HE/recesso → `homologPreviewMinutes` |
| `bancoWillConsumeMin` | mês devedor & regime **Normal** → `min(|monthBalanceMin|, bancoBalanceMin)` |
| `bancoOverdraftMin` | mês devedor & Normal → `max(0, |monthBalanceMin| − bancoBalanceMin)` |
| `pecuniaOpenWeekdaySatMin` | `max(0, authWeekdaySat − pecuniaWeekdaySatMinutes)` |
| `pecuniaOpenSundayHolidayMin` | `max(0, authSundayHoliday − pecuniaSundayHolidayMinutes)` |
| `pecuniaLegalMonthlyRemainingMin` | `max(0, 3600 − pecuniaTotalMinutes)` |
| `authWeekdaySat`, `authSundayHoliday` | **input manual** persistido — o endpoint SAEX (`AutorizacaoHoraExcedenteAction_execute`) é restrito ao perfil comum (verificado via CDP). |

---

## 5. Fases de implementação

| Fase | Entrega | Estado |
| :--- | :--- | :--- |
| **F1** | Reestrutura os 5 cards (funde os 2 de "hoje"; cria "Saldo do Mês"; KPI 3 mostra homologável/consumo; KPI 4 com os 2 blocos mostrando **feito + teto legal**; KPI 5 rotula "jornada ordinária"). `kpiExtractor.deriveMonthPlan()` + `domModernizer.buildKpiCardsHTML()` puros e testados. | ✅ v0.5.0 |
| **F2** | Campos manuais `authWeekdaySat` / `authSundayHoliday` (⚙ no KPI 4, módulo `heAuthEditor.js`), persistidos por matrícula+mês; KPI 4 passa a mostrar **autorizado / feito / aberto** + barra + alerta de estouro. | ✅ v0.5.1 |
| **F3** | Mini-planejador no KPI 2 (`monthPlanner.js`): link "planejar ›" → quanto fazer/dia para zerar + fechamento projetado para um esforço diário informado. | ✅ v0.5.2 |
| **F4** | Investigar leitura do autorizado numa tela SAEX. | ⚠️ conclusão revista pela F5 |
| **F5** | Ler o autorizado direto do backend do ícone de relógio (`heAuthFetch.js`), classificar por bloco e alimentar o KPI 4. | ✅ v0.5.4 |

Ao fim de cada fase: casos de teste (`tests/`, `npm test`), verificação ao vivo via CDP, commit. Ao fim de todas: pronto para teste real de uso.

---

## 6. F5 — leitura automática do autorizado a partir do ícone de relógio

**É acessível pelo próprio servidor.** (A primeira tentativa da F4 falhou por sessão expirada, não por permissão.)

- Endpoint: `GET /portalservidor2/AutorizacaoHoraExcedenteAction_execute?dataDia.asString=DD/MM/AAAA&servidor.matricula=NNN` (a função nativa `formEspelhoPontoMes_detalharAutorizacao`, chamada pelo ícone).
- Resposta — tabela **"Autorizações serviço extraordinário / Limites de horas autorizadas"**, uma linha por autorização que cobre o dia:

  | Núm. | Descrição | Horas Autorizadas | Validade | Tipo | Lim. Úteis | Lim. Sáb. | Lim. Dom. | Período |
  | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
  | 180956 | AUTORIZAÇÃO DE PECÚNIA - PORTAL DO SERVIDOR (SAEX) | 008:54 | 29/02/2028 | Pecúnia | 002:00 | 010:00 | 000:00 | 01/08/2026 a 09/08/2026 |
  | 179416 | " | 008:00 | 29/02/2028 | Pecúnia | 000:00 | 000:00 | 010:00 | 02/08/2026 a 09/08/2026 |

- **Agregação** (`heAuthFetch.aggregate`): consulta todos os dias do mês com ícone, **deduplica por `Núm.`** (a mesma autorização aparece em vários dias) e soma `Horas Autorizadas`.
- **Classificação** (`heAuthFetch.classifyAuth`): `Lim. Dom. > 0` **e** `Lim. Úteis = Lim. Sáb. = 0` → **Domingo/Feriado (+100%)**; caso contrário → **Semana/Sábado (+50%)**.
- **Exemplo verificado — ago/2026:** Semana/Sábado autorizado **08:54** (auth 180956); Domingo/Feriado **32:00** (auths 179416 + 179430 + 179431 + 179367, 8h cada). Pecúnia feita no mês: Sáb 03:45 / Dom-Fer 24:00 → **aberto** 05:09 e 08:00.
- **Cache** por matrícula+mês (`je_xt_he_saex_v1_<mat>`): mês fechado nunca revalida; mês aberto revalida a cada 6h. O KPI 4 mostra o selo **"via SAEX"**.
- O **⚙** (F2) continua: pré-preenche com o valor do SAEX e permite ajuste manual, que passa a ter prioridade sobre o SAEX (some quando zerado).
