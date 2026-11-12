# Liberação TSE XT 1.2.0 — 12/11/2026

Versão estável aprovada visualmente pelo responsável. Consolida a série 1.1 na main, com tag anotada **v1.2.0**, preservando os commits publicados. O changelog do produto foi consolidado em uma entrada; o histórico anterior permanece no Git.

## Conteúdo

- Reconhecimento Posterior da equipe, nos dois agrupamentos, com CSV e impressão A4 retrato.
- Auditoria de Pagamento de Pecúnias, incluindo contracheques e folhas suplementares.
- Cinco categorias de horas perdidas, motivos por dia, controle diário e Destino do mês.
- Cobertura de dias curtos por fim de semana não pago com ×1,5/×2, inclusive acima de 10h.
- Ajuste de ponto de subordinados, destaque de pecúnia, cabeçalho fixo e progresso com previsão de término.
- Empacotador corrigido para incluir icons/base.png e validado por teste do ZIP.

Notas completas em [CHANGELOG.md](../CHANGELOG.md); materiais do Dashboard em [descricao-loja.md](descricao-loja.md).

## Verificação e limites

- **193 testes automatizados** passando, incluindo inspeção do manifesto e dos arquivos do ZIP.
- Na preparação da série: Full Update autenticado de 215 meses e Reconhecimento Posterior de 6 servidores; CSV e impressão conferidos nos dois agrupamentos.
- Em 10/2026, controle próprio em 00:00 e perda da equipe de 51:36 para 14:20 após a cobertura; somente dados agregados nos documentos.
- Jornada 7h/8h e o tratamento atual de recesso preservados. D11 e os demais itens abertos de conformidade continuam no roadmap; esta liberação não declara toda a Trilha C encerrada.
- Relatórios salvos antes da regra de cobertura exigem recálculo. A Auditoria de Horas Perdidas pede Full Update.

## Distribuição

- ZIP: dist/tse-xt-v1.2.0.zip, gerado exclusivamente com runtime.
- Textos e imagens para o publicador ficam em dist/loja-v1.2.0/; o hash SHA-256 acompanha os artefatos.
- A versão local do Chrome é conferida antes da entrega.
- Cinco capturas 1280×800 e promoções 440×280/1400×560 renovadas na aplicação real; PNG RGB sem alfa, com revisão visual, nomes/matrículas anonimizados e valores individuais em reais ocultados.
- Conjunto para encaminhamento: dist/tse-xt-loja-v1.2.0.zip, com o ZIP da extensão, descrição em texto puro, novidades, política, instruções e imagens selecionadas.
- **Preparado para envio; não enviado nem submetido à revisão nesta tarefa.** A loja e sua visibilidade permanecem sob controle do publicador.

O Google oferece uma API oficial para automatizar upload e submissão de atualizações. Ver [automacao-chrome-web-store.md](automacao-chrome-web-store.md). Descrição, imagens e privacidade foram preparadas para preenchimento no Dashboard.
