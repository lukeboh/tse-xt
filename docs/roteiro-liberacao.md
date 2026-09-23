# Roteiro de liberação de versão — TSE XT

Passo a passo para publicar uma versão na Chrome Web Store. Siga na ordem; cada passo diz como conferir que deu certo.

Convenção: a liberação fecha uma **série** (ex.: 1.0.x → 1.1.0). Os commits da série são consolidados em um só, e esse commit recebe a tag `vX.Y.Z` e é o que vai para a loja.

---

## 0. Pré-requisitos

- Node 22 ou mais novo (as ferramentas usam `WebSocket` e `fetch` nativos, sem `npm install`).
- Chrome de depuração aberto por `iniciar_chrome_debug.ps1` (porta 9222, extensão carregada sem compactação a partir do repositório).
- `tools/loja/anon.local.json` preenchido: copie `tools/loja/anon.exemplo.json` e coloque os nomes reais que aparecem nas telas (servidor, dependentes, colegas da unidade na Gestão de HE). O arquivo é ignorado pelo git e **nunca** pode ser versionado.
- Acesso ao [Developer Dashboard](https://chrome.google.com/webstore/devconsole) com a conta publicadora.

## 1. Definir a versão

1. Escolha o número: `X.Y.0` para uma série consolidada, `X.Y.Z` para correção avulsa. A versão tem de ser maior que a publicada na loja.
2. Atualize **nos dois lugares**:
   - `manifest.json` → `"version"`;
   - `content/modules/version.js` → `CURRENT_VERSION`.
3. Em `CHANGELOG` (mesmo arquivo), substitua as entradas intermediárias da série por **uma** entrada da versão liberada, com data, título e itens (modelo: entradas `0.7.0` e `1.0.0`).

Conferir: `git grep -n "1.0.0" manifest.json content/modules/version.js` mostra a versão nova nos dois.

## 2. Testes

```powershell
npm test
```

Conferir: `fail 0`.

## 3. Revisar documentos

| Arquivo | O que revisar |
|---|---|
| `docs/descricao-loja.md` | Versão de referência, funcionalidades novas ou removidas, bloco da descrição sem Markdown e com até 16.000 caracteres, justificativas de permissão se o manifest mudou |
| `PRIVACY.md` | Data e versão; qualquer novo dado guardado em `chrome.storage`/`localStorage` ou nova requisição feita pela extensão |
| `README.md` | Recursos, tabela de capturas |
| `manifest.json` → `description` | Até 132 caracteres (vira o "Resumo" da loja) |

Dica para achar o que a extensão guarda: `git grep -n "chrome.storage.local.set\|localStorage.setItem\|sessionStorage.setItem" content popup`.

## 4. Regerar as capturas (dados reais, anonimizados)

Nunca desenhar telas: toda imagem sai da aplicação real pelo Chrome de depuração.

1. Recarregue a extensão para a versão nova aparecer na topbar. **Antes, tire todas as abas do Espelho de Ponto** (clique em outra tela no menu): o `background.js` recarrega as abas do TSE quando a extensão é recarregada, e recarregar o Espelho derruba a sessão.
   ```powershell
   node tools/loja/recarregar-extensao.mjs
   ```
2. Faça login no Meu Espaço (se a sessão tiver caído) e deixe duas abas abertas: uma no Espelho de Ponto do mês corrente e outra livre para as demais telas. Para trocar de tela, **sempre clique no menu** — nunca digite a URL nem recarregue o Espelho.
3. Liste as abas para pegar os ids: `curl -s http://127.0.0.1:9222/json/list` (ou use um trecho da URL em `--aba`).
4. Capture (cada comando anonimiza a tela, confere que não sobrou nenhum termo pessoal e só então salva):

   | Tela | Como chegar | Comando |
   |---|---|---|
   | Espelho de Ponto | menu Frequência → Espelho de ponto | `node tools/loja/capturar.mjs --aba EspelhoPonto --saida docs/tela-exemplo.png` |
   | Auditoria | mesma aba do Espelho | `node tools/loja/capturar.mjs --aba EspelhoPonto --acao auditoria --saida docs/tela-auditoria-horas-perdidas.png` |
   | Gestão de HE | menu Serviço Extraordinário → Gestão de Serviço Extraordinário | `node tools/loja/capturar.mjs --aba HoraExtraGestao --desfocar-valores --saida docs/tela-gestao-he.png` |
   | Reembolso | menu Benefícios → Assistência farmacêutica → NOVO → digite "dipirona" no campo Medicamento | `node tools/loja/capturar.mjs --aba ReembolsoFarmaceutico --saida docs/tela-reembolso-farmaceutico.png` |
   | TSE XT desligado | desligue pelo interruptor da topbar **numa tela que não seja o Espelho** (ele recarrega a página), depois abra o Espelho pelo menu | `node tools/loja/capturar.mjs --aba EspelhoPonto --saida docs/tela-exemplo-off.png` |

   Depois da captura com o XT desligado, religue-o também fora do Espelho.

   A Auditoria precisa de um resultado salvo: se ela disser "Nenhuma auditoria salva", clique em **Full Update** e espere (cerca de 20 minutos para varrer desde 2009) antes de capturar.
5. Olhe cada imagem antes de seguir. Nomes, matrículas, IP, dependentes e valores individuais em R$ não podem aparecer.

A anonimização só muda o que aparece na tela. Recarregar a aba (fora do Espelho) volta tudo ao normal.

## 5. Regerar os blocos promocionais

```powershell
node tools/loja/gerar-promos.mjs
node tools/loja/verificar-assets.mjs
```

O letreiro recorta `docs/tela-exemplo.png` e `docs/tela-gestao-he.png`, por isso roda depois do passo 4. A versão exibida vem do `manifest.json`. Para mudar textos ou layout, edite `tools/loja/promo.html`.

Conferir: `verificar-assets.mjs` termina sem nenhum `✘`.

## 6. Consolidar os commits e criar a tag

1. Faça commit das mudanças dos passos 1 a 5.
2. Crie uma branch de segurança com o estado atual: `git branch backup/pre-squash-X.Y.Z`.
3. Ache o commit de liberação anterior (`git log --oneline`, título `🚀 release: ...`).
4. Consolide tudo o que veio depois dele em um commit:
   ```powershell
   git reset --soft <commit-da-liberacao-anterior>
   git commit
   ```
   Mensagem no padrão do repositório, por exemplo:
   ```text
   🔖: release v1.0.0 - Série 0.7.x consolidada

   📝 Resumo do que entrou na versão (mesmo conteúdo da entrada do CHANGELOG).
   ```
5. Confira que nada se perdeu: `git diff backup/pre-squash-X.Y.Z HEAD` tem de sair vazio.
6. Crie a tag anotada: `git tag -a vX.Y.Z -m "TSE XT vX.Y.Z"`.
7. Publique. Como o histórico foi reescrito, o push da `main` precisa de force:
   ```powershell
   git push --force-with-lease origin main
   git push origin vX.Y.Z
   ```

## 7. Empacotar

```powershell
powershell -ExecutionPolicy Bypass -File .\package.ps1
```

Gera `dist/tse-xt-vX.Y.Z.zip` só com `manifest.json`, `background.js`, `content/`, `popup/` e os ícones. Conferir o nome do zip e abrir o conteúdo: não pode haver `docs/`, `tools/`, `tests/` nem `anon.local.json`.

## 8. Publicar no Developer Dashboard

1. Item **TSE XT** → **Pacote** → **Enviar novo pacote** → `dist/tse-xt-vX.Y.Z.zip`.
2. **Página na loja**: colar a descrição (seção 1 de `docs/descricao-loja.md`) e trocar as imagens pelas do passo 4 e 5, na ordem da tabela da seção 3.
3. **Privacidade**: conferir finalidade única, justificativas e declarações (seção 4 de `docs/descricao-loja.md`). Qualquer permissão nova no manifest precisa de justificativa aqui, senão a revisão rejeita.
4. **Distribuição**: manter a visibilidade atual, a não ser que a mudança tenha sido decidida.
5. **Enviar para revisão**.

## 9. Depois da publicação

- Acompanhe o status no Dashboard (a revisão costuma levar de horas a alguns dias). Se for rejeitada, o e-mail diz o motivo; corrija, gere nova versão de correção e volte ao passo 1.
- Com o item publicado, instale pela loja num perfil limpo e confira: a versão na topbar e no `chrome://extensions`, o aviso de aplicação experimental e uma tela do Espelho.
- Apague a branch `backup/pre-squash-X.Y.Z` quando tiver certeza de que não precisa mais dela.
