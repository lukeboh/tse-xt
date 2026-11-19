# Liberação TSE XT 1.3.0 — 19/11/2026

Liberação estável (marco MINOR **v1.3.0**) solicitada pelo responsável em 19/11/2026. A tag anotada **v1.3.0** consolida os Snapshots `1.2.7-Snapshot` a `1.2.23-Snapshot`, preservando todo o histórico e tags anteriores (`v1.2.0`, `v1.2.6`).

## Conteúdo

- **Portal SPT — Gestão de Frequência (`spt-consultafrequencia.tse.jus.br`)**:
  - Tela de logon no padrão Glassmorfismo + Boot Splash, tela principal de gestão modernizada com combobox pesquisável de Unidades (`sptUnitCombobox.js`), preservação do `onclick` nativo de validação do botão Pesquisar e aviso discreto de data sugerida (`sptModernizer.js`).
  - Espelho individual do prestador com 5 KPIs CLT e selos diários.
  - Isolamento de CSS e JS por portal no `manifest.json`, com casca compartilhada (`content/xt-shell.css` e `content/modules/xtToggle.js`) entre Meu Espaço e SPT sem alterar o layout do Meu Espaço.
- **Relatório Consolidado de Horas por Unidade (`sptCltCalc.js`, `sptReportModal.js`)**:
  - Modos **TSE XT / Digi** (padrão) e **SPT Puro (Dados Brutos)**.
  - Perfis de jornada por contrato (`8h Seg–Sex (40h)`, `6h Seg–Sex (30h)`, `8h48 Seg–Sex (44h)`, `44h com sábado (8h+4h)` e `12x36`), opção de tolerância de 5 min por marcação (CLT art. 58 §1º), Home Office presumido desligado por padrão, desconto configurável de 1h em Sáb/Dom/Fer (>6h, 2 batidas) e feriados civis/DF editáveis (com Sexta-feira Santa e 30/11).
  - Colunas independentes para **Saldo BH (Úteis)** e **HE 100% (FDS)**, coluna **Dias úteis sem registro**, coluna informativa **Noturno (h)** (art. 73 CLT com hora reduzida 52m30s) e alertas normativos informativos sem alteração de totais (CLT arts. 66, 67/OJ 410, 71 §1º e 73).
  - Tratamento explícito de falhas HTTP/sessão expirada/listas parciais com botão *Tentar novamente*, validação inline (`role="alert"`), Anexo de Interpretação completo, exportação CSV e PDF A4 paisagem agrupado por prestador.
- **Popup Multi-Portal & Robustez**:
  - Interruptores independentes para Meu Espaço e SPT no popup (`popup.html`/`popup.js`), proteção contra reload durante geração de relatórios e validação de `sender.id`/portal em `background.js`.

## Verificação e limites

- **255 testes** automatizados (`node --test`), incluindo testes de comportamento para todos os blocos do SPT (A–G), versionamento e integridade do pacote ZIP.
- **Lint estático** (`node scripts/lint-spt.mjs`): 5 arquivos verificados, 0 achados.
- **Validação visual** via Chrome CDP (`127.0.0.1:9222`) nas telas do SPT (principal e modal do relatório) e no Meu Espaço.
- **Assets da loja**: validados via `node tools/loja/verificar-assets.mjs`.
- D7 (calendário histórico de jornadas reduzidas), D11 e demais pendências de conformidade da Trilha C no Meu Espaço permanecem abertas conforme `docs/roadmap.md`.

## Distribuição e estado externo

- Pacote: `dist/tse-xt-v1.3.0.zip` (SHA-256: `58D874A63451AD2F443EE1ACD99148C52700762E007ADA37DDD3FC746B381594`).
- Item existente na Chrome Web Store: `akfmdlefacdimabbnielfadgbabienel` (visibilidade **não listada** preservada).
- Upload e submissão para revisão acionados via workflow oficial `.github/workflows/chrome-web-store.yml` (`release_tag=v1.3.0`, `operation=submit` com `STAGED_PUBLISH` — publicação manual após aprovação do Google).
- Consultar estado em tempo real no [Developer Dashboard](https://chrome.google.com/webstore/devconsole/c69e1920-ca11-4120-9d2f-629d60fc5a15/akfmdlefacdimabbnielfadgbabienel/edit/status) ou no workflow `Chrome Web Store`.
