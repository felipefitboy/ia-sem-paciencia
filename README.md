# IA Sem Paciência — V6.7 Candidata à Publicação

## O que já está pronto
- Seis personagens no layout: Seu Madruga, Dona Cida, Zé do Boteco, Sincerona, Professor Óbvio e Osvaldo Promessa.
- Caos removido dos assets e do site.
- Osvaldo aparece na seleção, chat e card compartilhável.
- 3 perguntas por dia compartilhadas entre todos os personagens.
- Limite local para testes e limite no servidor para Cloudflare Pages por meio de Pages Function + KV.
- Cards compartilháveis 1080x1350, copiar texto, salvar PNG e compartilhar pelo menu nativo.
- Avisos de humor e personagem político fictício.
- Cabeçalhos básicos de segurança, robots.txt e página 404.
- Site responsivo e pronto para HTTPS no Cloudflare.

## ÚNICA PENDÊNCIA PARA O SEXTO CHAT
No arquivo `app-v4.js`, substitua:

`51bd1249-3291-4f5e-9da2-e728681f4be3` (configurado)

pelo Agent ID público real do Osvaldo Promessa no Relevance AI.

Não publique com esse placeholder, porque o card do Osvaldo aparecerá, mas o chat dele ficará desativado.

## Teste local
Execute `INICIAR_SITE.bat`. Em localhost o limite usa `localStorage`, para não exigir Cloudflare durante o desenvolvimento.

## Publicar no Cloudflare Pages
1. Crie um projeto Pages e envie esta pasta (ou conecte o repositório Git).
2. Em Workers & Pages > seu projeto > Settings > Bindings, crie/associe um namespace KV com o nome de binding **DAILY_USAGE**.
3. Faça novo deploy depois de criar o binding.
4. O endpoint `/api/quota` passará a controlar as 3 perguntas no servidor.
5. Teste os seis personagens em janela anônima e em celular antes de divulgar.

### Por que existem dois limites?
O navegador mantém uma trava visual rápida. No Cloudflare, a Function registra o uso diário por uma identificação anônima combinando cookie e rede, dificultando contornar o limite apenas apagando `localStorage`. Sem login não existe bloqueio impossível de burlar, mas esta camada é adequada para o MVP e protege melhor os créditos do que apenas JavaScript no navegador.

## Relevance AI
Os agentes precisam continuar marcados como Publicly available. Os cinco IDs existentes já estão configurados. O Osvaldo precisa do ID real antes do deploy final.

## Antes de divulgar
- Confirmar o Agent ID do Osvaldo.
- Confirmar que o KV `DAILY_USAGE` está ligado ao projeto.
- Fazer 1 pergunta com cada personagem.
- Confirmar que a 4ª pergunta do dia é bloqueada.
- Testar trocar personagem sem resetar o limite.
- Testar card compartilhável no celular.
- Depois de definir um domínio próprio, adicionar Open Graph URL/imagem e sitemap com a URL definitiva.
