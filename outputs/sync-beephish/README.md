# Edge Function `sync-beephish`

No Supabase Dashboard:

1. Abra **Edge Functions → Create a new function**.
2. Use o nome `sync-beephish`.
3. Copie o conteúdo de `index.ts` para o editor da função.
4. Publique/deploy a função.

A função espera que o chamador esteja autenticado no Supabase e cadastrado em `public.internal_admins`.

Para testar uma campanha específica, envie um `POST` com:

```json
{ "campaignId": 5345 }
```

Se o corpo vier vazio, ela sincroniza todas as campanhas retornadas pela Beephish.

Os Secrets necessários são:

```text
BEEPHISH_BASE_URL=https://portal.beephish.com/api
BEEPHISH_AUTHORIZATION=valor exato usado pelo Swagger
```

Ao sincronizar todas as campanhas, a função importa também campanhas concluídas antigas. Para evitar uma carga desnecessária, eventos de campanhas concluídas há mais de 90 dias continuam sem ser reimportados. Para mudar esse período, configure:

```text
BEEPHISH_EVENTS_RETENTION_DAYS=90
```

As campanhas são sincronizadas em lotes paralelos de 4 por padrão. Para
ajustar esse limite sem alterar o código, configure um valor entre 1 e 6:

```text
BEEPHISH_SYNC_CONCURRENCY=4
```

Não coloque a credencial da Beephish no frontend.
