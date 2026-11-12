# 🔒 Política de Privacidade — TSE XT

**Última atualização:** 12 de novembro de 2026

**Versão da política:** 1.3.0

**Extensão de referência:** 1.2.0

**Repositório:** [https://github.com/lukeboh/tse-xt](https://github.com/lukeboh/tse-xt)

---

## 1. Introdução e Compromisso
O **TSE XT** é uma extensão de navegador desenvolvida para aprimorar a usabilidade, a interface visual e, em telas específicas (como o Espelho de Ponto), os cálculos analíticos de frequência no portal **Meu Espaço** do **Tribunal Superior Eleitoral (TSE)**. Esta Política de Privacidade estabelece o compromisso com a proteção, sigilo e transparência total dos dados do usuário.

---

## 2. Não Coleta de Dados Pessoais
O TSE XT adota o princípio de **Privacidade por Design (*Privacy by Design*)**:
- **Zero Coleta:** A extensão **NÃO** coleta, **NÃO** armazena fora do navegador, **NÃO** rastreia e **NÃO** transmite nenhuma informação pessoal, funcional, matrícula, dados de folha de ponto, horários ou credenciais de acesso.
- **Processamento 100% Local (*Client-Side*):** Todo o processamento de regras de negócio, cálculos dos 5 KPIs e renderização visual ocorre única e exclusivamente no próprio navegador do usuário, em memória e no armazenamento local descrito abaixo.
- **Sem Servidores Externos:** A extensão não se comunica com nenhum servidor remoto ou banco de dados externo. As únicas requisições que faz são aos próprios sistemas do TSE, com a sessão já aberta pelo usuário, para ler páginas do portal usadas nos cálculos (por exemplo, meses anteriores do Espelho de Ponto na Auditoria de Horas Perdidas, o Espelho de Ponto dos servidores da equipe no Relatório de Reconhecimento Posterior, os seus próprios contracheques na Auditoria de Pagamento de Pecúnias e as autorizações de hora extra do SAEX).

---

## 3. Finalidade das Permissões Utilizadas
As permissões declaradas no manifesto seguem o **Princípio do Menor Privilégio (*Least Privilege*)**:
- `storage` (**Armazenamento Local**): Utilizada para persistir, apenas no `chrome.storage.local` do próprio navegador:
  - preferências de configuração (tema ativo/desligado, estilo e destaque dos cards de KPI, modo de abertura do menu de serviços);
  - a versão em que o aviso de aplicação experimental foi confirmado;
  - o resultado da Auditoria de Horas Perdidas, por matrícula, para reabrir sem refazer a varredura;
  - o último Relatório de Reconhecimento Posterior gerado pela chefia (nome, matrícula e horas dos servidores da equipe no período), para reabrir sem refazer a consulta;
  - a última Auditoria de Pagamento de Pecúnias (horas de pecúnia do seu espelho e, dos seus contracheques, só as linhas de serviço extraordinário e de adicional noturno, com quantidade e valor), para reabrir sem refazer a leitura. As demais rubricas do contracheque são lidas na memória e descartadas;
  - um cache das autorizações de hora extra e do excedente apurado (inclusive, na visão de chefia, dos servidores da unidade), para não repetir as mesmas consultas ao portal.

  Esses dados não são enviados automaticamente a terceiros e são apagados ao remover a extensão. A extensão também usa `localStorage`/`sessionStorage` da página do portal para lembrar o tema e o estado da tela de login entre uma página e outra.
- `activeTab`: Utilizada temporariamente apenas quando o usuário clica no botão "Atualizar Página do Portal" no popup, permitindo recarregar a aba ativa para aplicar as preferências selecionadas.
- `host_permissions` (`*://meuespaco.tse.jus.br/*` e `*://*.tse.jus.br/*`): Restrita exclusivamente aos domínios oficiais do Tribunal para permitir a injeção de estilos e funcionalidades nas páginas do portal Meu Espaço (Espelho de Ponto, Reembolso Farmacêutico, Gestão de Serviço Extraordinário e demais telas do menu clássico).

---

O usuário pode exportar CSV, salvar uma impressão em PDF ou encaminhar os arquivos por sua própria iniciativa. Esses arquivos podem conter nomes, matrículas, horários e, na auditoria de pagamento, valores; seu armazenamento e compartilhamento passam a ser decididos pelo usuário.

## 4. Compartilhamento de Dados e Terceiros
- A extensão **NÃO** utiliza ferramentas de analytics, telemetria, rastreadores ou bibliotecas externas.
- **Nenhum dado** é compartilhado, comercializado ou transferido para terceiros, anunciantes ou desenvolvedores.

---

## 5. Segurança da Informação
A extensão atende rigorosamente às diretrizes do **Manifest V3** do Google Chrome:
- Não executa código remoto;
- Não utiliza scripts inline inseguros;
- Implementa sanitização rigorosa de DOM contra vulnerabilidades de *Cross-Site Scripting* (XSS);
- Possui proteção contra injeção de fórmulas (*CSV Formula Injection*) na exportação de planilhas.

---

## 6. Contato e Código-Fonte
O código-fonte completo, documentação e canal para reporte de dúvidas ou sugestões estão disponíveis publicamente no repositório oficial:
👉 [https://github.com/lukeboh/tse-xt](https://github.com/lukeboh/tse-xt)
