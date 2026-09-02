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

Por padrão, a função não sincroniza campanhas concluídas há mais de 180 dias e não reimporta eventos de campanhas concluídas há mais de 90 dias. Para mudar os períodos, configure também:

```text
BEEPHISH_RESULTS_RETENTION_DAYS=180
BEEPHISH_EVENTS_RETENTION_DAYS=90
```

Não coloque a credencial da Beephish no frontend.
