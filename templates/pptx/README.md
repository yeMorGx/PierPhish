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

## Usar um modelo exportado do Canva

No dashboard, abra **Exportar para Canva** e solte um `.pptx` nesta janela. O
PierSec lê os campos e gera uma cópia preenchida no próprio navegador; o modelo
enviado não é salvo nem enviado ao servidor. O arquivo precisa ter até 20 MB e
conter de 1 a 100 slides.

No Canva, coloque cada marcador em um único trecho de texto. O nome entre chaves
deve ser um dos campos abaixo. O desenho, as imagens, as fontes e o
posicionamento permanecem os do arquivo original.

| Marcador                                                                                                                                                                                                                                                     | Dado inserido                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `{{empresa}}`, `{{periodo}}`                                                                                                                                                                                                                                 | Empresa e período selecionados no dashboard                                |
| `{{campanhas}}`, `{{participantes}}`                                                                                                                                                                                                                         | Número de campanhas e participantes                                        |
| `{{enviados}}`, `{{entregues}}`                                                                                                                                                                                                                              | E-mails enviados e entregues                                               |
| `{{aberturas}}`, `{{taxa_abertura}}`                                                                                                                                                                                                                         | Aberturas e taxa sobre participantes                                       |
| `{{cliques}}`, `{{taxa_cliques}}`                                                                                                                                                                                                                            | Cliques e taxa sobre entregues (ou participantes, se não houver entregues) |
| `{{reportes}}`                                                                                                                                                                                                                                               | Reportes de mensagens                                                      |
| `{{campanha_1_nome}}`, `{{campanha_1_participantes}}`, `{{campanha_1_enviados}}`, `{{campanha_1_entregues}}`, `{{campanha_1_aberturas}}`, `{{campanha_1_taxa_abertura}}`, `{{campanha_1_cliques}}`, `{{campanha_1_taxa_cliques}}`, `{{campanha_1_reportes}}` | Dados da campanha naquela posição do ranking                               |

Troque o número da campanha de `1` a `250`. O ranking prioriza cliques e depois
aberturas. Se o período tiver menos campanhas que o modelo, os campos restantes
ficam vazios. Marcadores desconhecidos são mostrados antes da exportação e
permanecem sem alteração no arquivo.
