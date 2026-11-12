# Changelog — TSE XT

## 1.2.2-Snapshot — 12/11/2026

- Executar testes e empacotamento da tag com Windows PowerShell no GitHub Actions, evitando herdar o ambiente de módulos do PowerShell 7.
- A primeira execução real identificou `Get-FileHash` indisponível no subprocesso; parou antes de autenticar, fazer upload ou submeter revisão.
- A tag estável 1.2.0 permanece inalterada.

## 1.2.1-Snapshot — 12/11/2026

- Workflow da Chrome Web Store com operações separadas de status, upload e submissão para revisão.
- Google Cloud e GitHub autenticam por Workload Identity Federation/OIDC, sem chave privada permanente.
- O pacote é gerado de uma tag anotada e estável pertencente ao histórico da main, mesmo que a ferramenta de automação esteja numa versão de desenvolvimento posterior.
- Publicação após aprovação permanece manual (`STAGED_PUBLISH`); o cliente impede reenvio de revisão existente e não substitui outra versão pendente.
- Testes do cliente da API cobrem upload binário, processamento assíncrono, revisão, repetição e erros sem vazamento de token.

A última versão estável da extensão continua sendo **1.2.0**. Não foi criada nem movida outra tag estável para esta automação.

## 1.2.0 — 12/11/2026

Consolida as evoluções da série 1.1, com aprovação visual para liberação em 12/11/2026. Fonte do changelog exibido na extensão: `content/modules/version.js`.

- Novo Relatório de Reconhecimento Posterior para a equipe: destinos das horas, alternativas de pecúnia ou banco, agrupamentos por servidor ou por mês, CSV e impressão A4 retrato.
- Nova Auditoria de Pagamento de Pecúnias: compara o espelho com rubricas e referências dos próprios contracheques, incluindo folhas suplementares e adicional noturno; CSV e impressão.
- Auditoria de Horas Perdidas com cinco categorias, motivos por dia e avisos para conferência; mês aberto e regime híbrido tratados separadamente.
- Horas não pagas de sábado cobrem dias curtos com ×1,5; domingo e feriado, com ×2, inclusive acima de 10h, antes de contar a sobra como perda.
- SALDO ACUM. de controle dia a dia, linha Destino do mês e avisos de divergência; o crédito oficial continua restrito às horas homologadas.
- Relatórios sem limite fixo de período, com progresso e previsão de término; resultados anteriores à regra de cobertura pedem recálculo.
- Ajuste de ponto de integrantes da equipe pela chefia, com identidade e data preenchidas no modal e validação de permissão.
- Destaque e totais de pecúnia e adicional noturno, renderização idempotente e cabeçalho do Espelho fixo durante a rolagem.
- Jornada de 7h em turno único, 8h com intervalo e tratamento atual de recesso preservados; dúvidas de fechamento continuam documentadas.
- Dados e resultados permanecem no navegador; leituras autenticadas somente nos próprios sistemas do TSE e exportações por ação do usuário.

### Atualização

- Refaça a Auditoria de Horas Perdidas com **Full Update** e gere novamente os relatórios salvos antes da cobertura de fim de semana.
- Jornada e pendências normativas preservadas; a versão não encerra todos os itens da Trilha C.
- O pacote inclui `icons/base.png`, recurso exigido pelo manifesto e usado no carregamento.

### Verificação

- 193 testes automatizados, incluindo inspeção do ZIP e de todos os arquivos declarados no manifesto.
- Na preparação da série: Full Update real de 215 meses, Reconhecimento Posterior de 6 servidores, CSV e impressão nos dois agrupamentos.
- Pacote e materiais da loja descritos em [release-1.2.0.md](docs/release-1.2.0.md).

## 1.0.0 — 23/09/2026

Marco anterior: modernização do menu clássico, módulos dedicados de frequência, reembolso farmacêutico e gestão de serviço extraordinário, carregamento de login e preferências locais. Histórico completo no changelog da extensão e na [tag v1.0.0](https://github.com/lukeboh/tse-xt/releases/tag/v1.0.0).
