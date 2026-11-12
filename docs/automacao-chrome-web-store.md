# Automação oficial da Chrome Web Store

Verificado em **12/11/2026**, para a preparação do TSE XT 1.2.0.

## O que pode ser automatizado

A **Chrome Web Store API v2** permite atualizar um item já existente: enviar o ZIP, consultar o processamento, submeter à revisão e acompanhar o estado. O primeiro item precisa ser criado pelo Developer Dashboard. [Visão geral oficial](https://developer.chrome.com/docs/webstore/api).

Fluxo documentado pelo Google:

1. Gerar e validar o pacote com uma versão maior no manifesto.
2. Chamar `media.upload` enviando o ZIP como corpo binário para `https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload`.
3. Aguardar o processamento com `fetchStatus`.
4. Chamar `publish` para submeter à revisão.
5. Consultar `fetchStatus` até a decisão. A revisão da loja continua sendo uma etapa do Google.

Fontes: [guia de uso](https://developer.chrome.com/docs/webstore/using-api), [upload](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/media/upload) e [publish](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish).

## Autenticação e CI

- Habilitar a Chrome Web Store API em um projeto Google Cloud e obter o publisher ID e o item ID.
- Usar OAuth 2.0 do publicador ou uma **service account vinculada no Developer Dashboard**. O escopo de escrita é `https://www.googleapis.com/auth/chromewebstore`.
- A service account é oficialmente suportada para CI/CD. A autenticação pode usar tokens de curta duração por impersonação, conforme as permissões da infraestrutura; não é necessário colocar uma chave JSON no repositório.
- Um fluxo do GitHub Actions pode executar testes, gerar o ZIP de uma tag estável, enviá-lo e consultar seu estado. A autenticação e as permissões precisam ser configuradas antes.

Fonte: [service accounts na API](https://developer.chrome.com/docs/webstore/service-accounts).

## Publicação após a revisão

`DEFAULT_PUBLISH` publica quando a revisão é aprovada; `STAGED_PUBLISH` mantém a versão aprovada aguardando a publicação pelo desenvolvedor. `blockOnWarnings: true` faz a submissão falhar diante de avisos de validação. A opção `skipReview` não garante dispensa: o Google valida a elegibilidade. [Referência de publish](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish).

## Limites e estado deste projeto

O conjunto de métodos da API v2 consultado não expõe edição da descrição da página, imagens promocionais e declarações de privacidade. Para esta liberação, esses materiais estão preparados para o **Developer Dashboard**. Isso é uma conclusão a partir da [referência de métodos](https://developer.chrome.com/docs/webstore/api/reference/rest), não uma promessa de automação dessas telas.

**Nesta tarefa não foi configurada autenticação de publicação, feito upload nem submetido o item à revisão.** Foram preparados o pacote e os materiais. Uma futura automação deve usar credenciais fora do Git e separar envio do pacote, submissão à revisão e publicação após aprovação.
