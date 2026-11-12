# Roteiro de liberação — TSE XT

Procedimento vigente a partir de **1.2.0 (12/11/2026)**. Fonte da versão: manifest.json; versão exibida e changelog: content/modules/version.js. Os commits publicados são preservados: consolida-se o changelog da série, sem reset, squash retroativo ou push forçado.

## 1. Fechar o escopo

- Conferir working tree, branches, remotos e regras de versionamento.
- Obter aprovação visual e confirmar o marco. Não encerrar pendências só por editar o roadmap.
- Atualizar manifesto, versão exibida e testes de versão. Uma versão estável não leva Snapshot.
- Consolidar as notas da série em uma entrada do changelog da extensão e sincronizar CHANGELOG.md.

## 2. Validar e revisar a documentação

    npm test

A suíte inclui o teste de empacotamento, que abre o ZIP e verifica todos os recursos declarados no manifesto. Revisar README, PRIVACY, especificação, regras de cálculo, dúvidas, roadmap e descrição da loja. Preservar referências históricas. Não publicar nomes, matrículas, valores individuais ou capturas não anonimizadas.

## 3. Preparar materiais da loja

- Atualizar docs/descricao-loja.md: descrição em texto puro, limite de 16.000 caracteres, novidades, privacidade e permissões.
- Capturar telas da aplicação real no Chrome 9222, com anonimização e conferência visual. Nunca simular as telas da loja.
- Antes de recarregar a extensão, retirar **todas** as abas do Espelho por links reais do menu; recarregar e depois voltar pelo menu. Não navegar diretamente nem enviar o formulário do Espelho via CDP.
- Publicar no máximo cinco capturas, PNG RGB sem alfa de 1280x800. A seleção vigente está em tools/loja/verificar-assets.mjs e docs/descricao-loja.md.
- Regerar os blocos promocionais depois das capturas:

    node tools/loja/gerar-promos.mjs
    node tools/loja/verificar-assets.mjs

A anonimização do utilitário padrão muda o DOM da aba. Usar uma aba dedicada ou restaurar os textos após capturar; não deixar dados fictícios contaminarem a leitura de identidade dos relatórios. Valores individuais em reais também precisam ser ocultados.

## 4. Gerar e inspecionar o pacote

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File package.ps1

Saída: dist/tse-xt-vX.Y.Z.zip. O ZIP contém manifesto na raiz, background.js, content/, popup/ e os ícones de runtime, **incluindo icons/base.png**. Não contém docs, ferramentas, testes ou configuração local de anonimização. Registrar o SHA-256 junto aos materiais de distribuição, fora do ZIP.

## 5. Integrar, commitar e marcar

- Fazer commit no padrão local, depois da revisão de dados pessoais e dos testes.
- Efetuar o push conforme a regra do projeto.
- Integrar a branch aprovada na main normalmente, por fast-forward quando possível; caso haja divergência, revisar o merge e revalidar. Não reescrever commits ou tags publicados.
- Criar tag anotada do marco, sem mover tags existentes:

    git tag -a vX.Y.0 -m "TSE XT vX.Y.0"
    git push origin main vX.Y.0

Conferir que a tag, a main, o manifesto e o ZIP representam o mesmo código. O changelog e o registro da liberação devem identificar as verificações feitas e as limitações que permanecem.

## 6. Enviar à Chrome Web Store

Upload e submissão são etapas separadas da preparação local:

1. No Developer Dashboard do item existente, enviar o ZIP.
2. Colar a descrição e atualizar a seleção de capturas e promoções.
3. Conferir privacidade, justificativas e distribuição, preservando a visibilidade escolhida pelo publicador.
4. Enviar para revisão quando autorizado.
5. Após aprovação, conferir a versão instalada pela loja em perfil limpo.

Há automação oficial para upload e submissão pela API v2. Requisitos, limites e referências em [automacao-chrome-web-store.md](automacao-chrome-web-store.md). Não confundir pacote preparado com item enviado, aprovado ou publicado.

Desde a 1.2.1-Snapshot, o workflow `Chrome Web Store` executa esse fluxo por uma tag estável: `status` consulta, `upload` envia rascunho e `submit` solicita revisão. O pacote continua vindo da tag escolhida, como `v1.2.0`, e a publicação depois da aprovação permanece manual.
