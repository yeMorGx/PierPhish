# Beephish Lens

Dashboard Next.js para acompanhar campanhas Beephish, resultados individuais e eventos sincronizados no Supabase.

## Rodar

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Preencha `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A chave publishable é a única chave usada no navegador. A `service_role` e os secrets da Beephish continuam somente na Edge Function.

Sem `.env.local`, a aplicação abre em modo demonstração para validar o layout.
