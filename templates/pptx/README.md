# Modelos da exportação para Canva

O arquivo `base.pptx` contém três slides usados pela exportação do dashboard:

| Slide | Modelo      | Formas nomeadas                                                                                                |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | `capa`      | `titulo`, `subtitulo`, `logo`                                                                                  |
| 2     | `metricas`  | `titulo`, `periodo`, `campanhas`, `participantes`, `enviados`, `entregues`, `aberturas`, `cliques`, `reportes` |
| 3     | `campanhas` | `titulo`, `periodo`, `campanhas` (tabela nativa)                                                               |

Os nomes e números estão espelhados em `manifest.ts`. Se renomear uma forma ou
mudar a ordem dos slides, atualize o manifesto e os testes na mesma alteração.
Não adicione animações; o modificador de PPTX não sincroniza IDs de animações.

O modelo atual é um exemplo monocromático para validar a exportação. O design
final pode substituir `base.pptx` quando o responsável fornecer um modelo
PowerPoint. Preserve as formas nomeadas, a ordem dos slides e a tabela nativa do
terceiro slide. Para regenerar o exemplo a partir do código versionado, execute
`pnpm templates:pptx`.

As exportações são montadas no servidor usando somente os dados agregados e
filtrados do dashboard. A tabela inclui todas as campanhas do filtro, ordenadas
por cliques, em páginas de cinco linhas; um arquivo aceita até 250 campanhas.
Logos só entram quando já estão disponíveis como PNG ou JPEG em data URL; a
rota não busca URLs externas.
