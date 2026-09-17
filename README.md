# TSE XT — Extensão de Usabilidade & Modernização Visual para o Meu Espaço do TSE

Uma extensão Manifest V3 para navegadores Chromium (Google Chrome, Microsoft Edge, Brave) projetada para transformar e modernizar a interface e usabilidade do portal **Meu Espaço**, do **Tribunal Superior Eleitoral (TSE)** — não apenas o Espelho de Ponto, mas todo o menu de serviços do portal (`meuespaco.tse.jus.br/portalservidor2`).

> ⚠️ **Aplicação experimental.** O TSE XT tem o único objetivo de melhorar a experiência do usuário no portal Meu Espaço (controle de ponto, Reembolso Farmacêutico, Gestão de Serviço Extraordinário e demais serviços). Pode conter erros e **não representa nenhuma garantia** de aquisição de bancos de horas, pecúnias ou outros direitos relativos ao cumprimento da jornada de trabalho. Um aviso com esse teor é exibido no primeiro uso e a cada atualização de versão.

---

## 🧭 Escopo — arquitetura em duas camadas

1. **Camada genérica** (automática, sem código dedicado por tela): topbar, drawer de serviços, título de página, tabelas, formulários, botões e ícones de ação de **todas as ~30 telas do menu clássico** do Meu Espaço herdam o mesmo Design System (glassmorfismo, tabelas com cabeçalho e zebrado padronizados, botões reconhecidos por texto/semântica, campos com rótulo e contador de caracteres) sem precisar de um perfil de página específico.
2. **Camada dedicada** (perfis de página com lógica de negócio própria) para as telas onde a extensão vai além de estilo:
   - **Espelho de Ponto** (`EspelhoPontoMesAction`/`EspelhoPontoDiaAction`): cálculo de saldo, dashboard de KPIs, auditoria de horas perdidas, ajuste de ponto inline.
   - **Reembolso Farmacêutico** (`ReembolsoFarmaceuticoAction`): formulário de novo pedido reconstruído, busca de medicamento, calculadora de desconto, badges de status.
   - **Gestão de Serviço Extraordinário** (`HoraExtraGestao`): painel de KPI por servidor com o mesmo indicador de excedente/pecúnia do Espelho de Ponto.

---

## ✨ Principais Recursos

### Design System e arquitetura genérica
- **Glassmorfismo Tátil 2026**: acrílico fosco translúcido (`backdrop-filter: blur(20px)`), relevo tátil e halo de foco luminoso azul institucional (*TSE Blue*), em layout widescreen fluido.
- **Modernização automática das ~30 telas do menu clássico**: título de página, tabelas de dados/formulário, reconhecimento de botão de ação por texto (CONSULTAR/PESQUISAR/SALVAR/CONFIRMAR/GRAVAR/ENVIAR/NOVO), ícones nativos (pixelados) trocados pelo traço do design system, calendário com o mesmo popup nativo reposicionado ao lado do campo.
- **Navegação em Drawer Lateral (Alt + M)**: menu retrátil com busca rápida e dezenas de serviços organizados em categorias com ícones visuais e badges de permissão.
- **Command Palette Global (Ctrl + K)**: pesquisa instantânea por atalhos, módulos e páginas internas.
- **Interruptor ON / OFF Independente**: botão flutuante persistente para alternar a qualquer momento entre o visual moderno XT e o layout clássico original, para conferência.
- **Modais e diálogos**: detalhamento de linha de tabela e diálogos nativos (calculadora, autorização de hora extra, mensagens do sistema) migrados para o mesmo padrão de modal do TSE XT, no lugar de popups nativos sem estilo.

### Espelho de Ponto
- **Dashboard com 5 KPIs**: Saída de Hoje, Saldo do Mês, Banco de Horas, Hora Extra em Pecúnia (Semana/Sábado +50% e Domingo/Feriado +100%, com fração feito/autorizado lida direto do SAEX e indicador do excedente que poderia virar pecúnia com mais autorização) e Meta do Mês.
- **Colunas analíticas na tabela**: `SALDO ACUM.` (saldo excedente dia a dia) e `HORAS EXCED.` (meses fechados), com coloração verde/vermelho/neutro e badges de teto legal (`> 2h`/`> 10h`, art. 4º).
- **Auditoria de Horas Perdidas**: varre o Espelho desde 2009 e quantifica as horas que nunca viraram pecúnia nem banco de horas, em quatro categorias explicadas com base normativa.
- **Ajuste de Ponto Inline** e **modal de Autorização de Hora Extra**: incluir/excluir marcações e ver o detalhe de autorização do dia sem sair da tela, via actions oficiais do Struts.
- **Auto-Consulta Instantânea** e **exportação** completa para Excel/CSV.

### Reembolso Farmacêutico
- Formulário de Novo Pedido reconstruído em cartão com grid de campos responsivo; busca de medicamento com auto-busca (debounced) e filtro local por palavras extras.
- Calculadora de desconto (antes um popup nativo sem estilo) e modal de detalhamento de pedido no padrão do TSE XT.
- Resumo do Pedido em sidebar que se adapta à largura do formulário; badges de status coloridos na listagem (inclusive um fallback para status futuros ainda não catalogados).

### Gestão de Serviço Extraordinário
- Painel de KPI por servidor autorizado no período, com barras de progresso Sábado/Domingo (autorizado × realizado) e o mesmo indicador "horas que poderiam virar pecúnia" do Espelho de Ponto, buscado em segundo plano.

---

## 🚀 Como Instalar no Google Chrome

1. Abra o Chrome e acesse `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta deste projeto (`tse-xt`).
5. Acesse o [Meu Espaço](https://meuespaco.tse.jus.br/portalservidor2/) e aproveite — a modernização se aplica a qualquer tela do portal, não só ao Espelho de Ponto.

---

## 🗺️ Roadmap

- **Arquitetura visual genérica**: ✅ concluída (Fases F1–F7) — histórico completo em [roadmap-arquitetura-visual.md](docs/roadmap-arquitetura-visual.md).
- **Conformidade normativa do cálculo de frequência**: itens abertos (R1–R10, ex.: três estados de banco de horas, tetos legais, excedente sem autorização prévia) rastreados em [roadmap-conformidade.md](docs/roadmap-conformidade.md), com as regras já verificadas em [regras-calculo-frequencia.md](docs/regras-calculo-frequencia.md) e as questões ainda sem resposta em [duvidas-normativas.md](docs/duvidas-normativas.md).
- **Persistência (sticky) ao rolar a tela**: manter o menu/topbar, a linha de KPIs e os cabeçalhos da tabela fixos durante a rolagem do espelho.

O histórico detalhado de cada versão (o que mudou e por quê) vive no changelog embutido na própria extensão — abra o badge de versão na topbar do Meu Espaço para consultá-lo.

---

## 🔒 Privacidade, Segurança e Especificações

- **[Política de Privacidade](PRIVACY.md)**: Declaração de não coleta de dados, processamento 100% local (*client-side*) e conformidade com o Manifest V3.
- **[Especificação de Negócio & Regras de Cálculo](docs/especificacao-negocio.md)**: Detalhamento completo das fórmulas matemáticas do Espelho de Ponto, desconsideração de pecúnia, regime híbrido e regras de jornada (7h/8h).
- **[Licença](LICENSE)**: MIT.
