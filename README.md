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
