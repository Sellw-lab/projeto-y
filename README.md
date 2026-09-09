# Álbum das Memórias

Aplicação privada para organizar fotos, músicas do Spotify, mensagens e áudios recebidos.

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

## Variáveis de ambiente

Configure no Vercel as mesmas variáveis usadas pelo backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_FRONTEND_FORGE_API_KEY`

## Deploy

O projeto já inclui `vercel.json`, o entrypoint `api/[...path].ts` e o build Vite configurado. No Vercel, importe este repositório e mantenha o diretório raiz como `/`. O comando de build é `pnpm build` e a saída é `dist/public`.

A aplicação usa uma função serverless para `/api/*` e serve o frontend como arquivos estáticos. O banco e o armazenamento precisam ser serviços externos persistentes; não use arquivos locais para guardar fotos ou áudios.
