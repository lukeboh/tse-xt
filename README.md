# TSE XT — Extensão de Usabilidade & Modernização Visual para Sistemas do TSE

Uma extensão Manifest V3 para navegadores Chromium (Google Chrome, Microsoft Edge, Brave) projetada para transformar e modernizar a interface e usabilidade dos portais e sistemas internos do **Tribunal Superior Eleitoral (TSE)** (incluindo o *Meu Espaço* e demais serviços institucionais).

---

## ✨ Principais Recursos

1. **Design System Glassmorfismo Tátil 2026**:
   - Acrílico fosco translúcido (`backdrop-filter: blur(20px)`), relevo tátil e halo de foco luminoso azul institucional (*TSE Blue*).
   - Layout Widescreen fluido que aproveita 100% dos monitores modernos.

2. **Dashboard com 5 KPIs Uniformes**:
   - ⏱️ **Saída Expediente**: Estimativa precisa de saída para a jornada diária regular (7h ou 8h).
   - 🏦 **Banco de Horas**: Saldo acumulado homologado no banco de horas.
   - ⚖️ **Saída p/ Zerar Mês**: Horário exato de saída para zerar o saldo acumulado até o dia (compensando débitos ou saindo mais cedo em caso de crédito).
   - 📊 **Meta do Mês**: Barra visual de progresso e contagem inteligente de dias úteis restantes.
   - ⚡ **Horas Extras (2 Linhas)**: Detalhamento por dias úteis/sábados e domingos/feriados.

3. **Auto-Consulta Instantânea**:
   - Alterar qualquer campo nos filtros de pesquisa (Unidade, Servidor/Nome, Ano ou Mês) dispara a busca automaticamente.

4. **Navegação em Drawer Lateral (Alt + M)**:
   - Menu retrátil com busca rápida e mais de 60 serviços organizados em categorias com ícones visuais e badges de permissão.

5. **Command Palette Global (Ctrl + K)**:
   - Pesquisa instantânea por atalhos, módulos e páginas internas.

6. **Interruptor ON / OFF Independente**:
   - Botão flutuante persistente no topo para alternar a qualquer momento entre o visual moderno XT e o layout clássico original para conferência.

7. **Ações Rápidas & Exportação**:
   - Exportação completa do espelho de ponto para Excel/CSV com formatação e codificação UTF-8.

---

## 🚀 Como Instalar no Google Chrome

1. Abra o Chrome e acesse `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta deste projeto (`tse-xt`).
5. Acesse o portal do TSE (ex: [Meu Espaço](https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoMesAction_recuperar.action)) e aproveite!

---

## 🔒 Privacidade, Segurança e Especificações

- **[Política de Privacidade](PRIVACY.md)**: Declaração de não coleta de dados, processamento 100% local (*client-side*) e conformidade com o Manifest V3.
- **[Especificação de Negócio & Regras de Cálculo](docs/ESPECIFICACAO_NEGOCIO.md)**: Detalhamento completo das fórmulas matemáticas, desconsideração de pecúnia, regime híbrido e regras de jornada (7h/8h).

