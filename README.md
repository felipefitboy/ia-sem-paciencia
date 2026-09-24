# IA Sem Paciência — V13 Conteúdo de Valor

Versão focada em corrigir o motivo “Low value content” apontado pelo Google AdSense.

Principais mudanças:
- página inicial com novas seções editoriais originais;
- nova página `melhores-respostas.html` com conteúdo próprio dos seis personagens;
- página Sobre ampliada;
- links internos reforçados;
- sitemap atualizado;
- script do AdSense mantido nas páginas públicas;
- chat, agentes, limite diário e infraestrutura preservados.

Não solicite nova revisão do AdSense imediatamente após publicar. Aguarde o site ser rastreado novamente e confira o Search Console.

# IA Sem Paciência — V6.9 Worker

Versão preparada para o fluxo atual do Cloudflare Workers com Static Assets.

## Publicação no Cloudflare

- Build command: deixe vazio.
- Deploy command: `npx wrangler deploy` (ou `npm run deploy`).
- O site está em `public/`.
- A API de cota está em `src/index.js`, rota `/api/quota`.

## Limite de 3 perguntas por dia

O frontend usa fallback local enquanto o KV não estiver vinculado. Para ativar a proteção no servidor, crie um namespace Workers KV e adicione ao Worker um binding com o nome EXATO `DAILY_USAGE`.

No Dashboard: Worker > Settings > Bindings > Add > KV Namespace > Variable name `DAILY_USAGE` > selecione o namespace > Deploy.

Depois teste `/api/quota`: o JSON deve mostrar `"configured": true`.


## V7 — preparação para monetização
- Páginas institucionais: Sobre, Política de Privacidade e Termos de Uso.
- Links institucionais no rodapé.
- Estrutura visual preparada para futura integração com publicidade.
- Nenhum script de anúncios foi ativado nesta versão.
