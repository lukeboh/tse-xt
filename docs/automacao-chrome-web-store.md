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

Na preparação da versão 1.2.0 foram gerados o pacote e os materiais, sem envio à loja. Em continuação autorizada de **12/11/2026 (1.2.1-Snapshot)**, foram configurados um projeto GCP exclusivo, service account vinculada ao publicador, federação OIDC e as variáveis do repositório.

## Operação configurada

O workflow [.github/workflows/chrome-web-store.yml](../.github/workflows/chrome-web-store.yml) é executado na **main**, por acionamento manual. Ele recebe uma tag anotada e estável (por exemplo, `v1.2.0`) e uma operação:

| Operação | Efeito |
| :--- | :--- |
| `status` (padrão) | Testa e empacota a tag, autentica e consulta a API; não modifica a loja. |
| `upload` | Envia o ZIP e aguarda o processamento; não solicita revisão. |
| `submit` | Envia o ZIP e solicita revisão com `STAGED_PUBLISH`, `skipReview: false` e `blockOnWarnings: true`. |

O workflow usa Windows porque o empacotador e seu teste executam Windows PowerShell. Essas etapas usam `shell: powershell`, evitando o ambiente de módulos herdado do PowerShell 7. As Actions são fixadas por SHA. Antes de autenticar, valida a tag, sua versão no manifesto e a inclusão do commit no histórico da main, executa os testes e guarda o pacote como artefato.

O cliente [cws-api.mjs](../tools/loja/cws-api.mjs) não imprime tokens, chaves públicas ou respostas brutas. Não reenvia uma versão já em revisão/aprovada, não substitui outra revisão ativa e impede downgrade. Uma versão aprovada em `STAGED` não é publicada por uma repetição de `submit`.

As variáveis `CWS_PROJECT_ID`, `CWS_WORKLOAD_IDENTITY_PROVIDER`, `CWS_SERVICE_ACCOUNT`, `CWS_PUBLISHER_ID` e `CWS_ITEM_ID` guardam somente identificadores. A confiança OIDC exige os IDs numéricos deste repositório e proprietário, a main e o arquivo específico do workflow. Nenhum segredo de publicação é armazenado no GitHub.

A configuração local está em `D:\git\lukeboh\home-env\configs\tokens\tse-xt-chrome-web-store.json`, ignorada pelo Git. Ela contém referências da configuração; não foi criada chave privada permanente. Tokens de acesso são temporários e ficam na memória da execução.

Para consultar pelo CLI autenticado:

    gh workflow run chrome-web-store.yml --repo lukeboh/tse-xt --ref main -f release_tag=v1.2.0 -f operation=status

Trocar `status` por `upload` ou `submit` provoca a ação correspondente na loja. O teste inicial da implantação usa apenas `status`; upload e submissão exigem uma execução escolhida explicitamente com essa operação.
