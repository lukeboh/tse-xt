# 🔒 Política de Privacidade — TSE XT

**Última atualização:** 17 de setembro de 2026  
**Versão:** 1.1.0  
**Repositório:** [https://github.com/lukeboh/tse-xt](https://github.com/lukeboh/tse-xt)

---

## 1. Introdução e Compromisso
O **TSE XT** é uma extensão de navegador desenvolvida para aprimorar a usabilidade, a interface visual e, em telas específicas (como o Espelho de Ponto), os cálculos analíticos de frequência no portal **Meu Espaço** do **Tribunal Superior Eleitoral (TSE)**. Esta Política de Privacidade estabelece o compromisso com a proteção, sigilo e transparência total dos dados do usuário.

---

## 2. Não Coleta de Dados Pessoais
O TSE XT adota o princípio de **Privacidade por Design (*Privacy by Design*)**:
- **Zero Coleta:** A extensão **NÃO** coleta, **NÃO** armazena externamente, **NÃO** rastreia e **NÃO** transmite nenhuma informação pessoal, funcional, matrícula, dados de folha de ponto, horários ou credenciais de acesso.
- **Processamento 100% Local (*Client-Side*):** Todo o processamento de regras de negócio, cálculos dos 5 KPIs e renderização visual ocorre única e exclusivamente na memória local do navegador do próprio usuário.
- **Sem Servidores Externos:** A extensão não se comunica com nenhum servidor remoto ou banco de dados externo.

---

## 3. Finalidade das Permissões Utilizadas
As permissões declaradas no manifesto seguem o **Princípio do Menor Privilégio (*Least Privilege*)**:
- `storage` (**Armazenamento Local**): Utilizada unicamente para persistir preferências locais de configuração (tema ativo/desligado, estilo e destaque dos cards de KPI, modo de abertura do menu de serviços) no `chrome.storage.local` do navegador.
- `activeTab`: Utilizada temporariamente apenas quando o usuário clica no botão "Atualizar Página do Portal" no popup, permitindo recarregar a aba ativa para aplicar as preferências selecionadas.
- `host_permissions` (`*://meuespaco.tse.jus.br/*` e `*://*.tse.jus.br/*`): Restrita exclusivamente aos domínios oficiais do Tribunal para permitir a injeção de estilos e funcionalidades nas páginas do portal Meu Espaço (Espelho de Ponto, Reembolso Farmacêutico, Gestão de Serviço Extraordinário e demais telas do menu clássico).

---

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
