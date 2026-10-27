# Percentuais e conciliação de campanhas

Levantamento do código em 27/10/2026. Descreve a implementação; não comprova a qualidade dos dados remotos. Redis permanece em standby.

## Como ler os totais

**Participações** é a soma dos destinatários das campanhas selecionadas, não o número de pessoas únicas. Quem participa de três campanhas contribui com três participações.

**Entregues** vem do agregado sincronizado. **Falharam** usa os estados individuais quando há resultados completos; caso contrário, usa `stats.error` explicitamente informado. Não se pode inferir falhas pela diferença entre participações e entregues. Sem uma fonte válida, mostrar **Não disponível**.

**Sem confirmação** = participações − entregues − falhas registradas. Só é exibido como número quando as falhas são conhecidas e o saldo não é negativo. É uma diferença contábil, que pode incluir pendências ou estados desatualizados; não é um estado técnico confirmado de cada destinatário.

Exemplo fornecido pelo usuário: **7.038 = 6.778 entregues + 7 falhas + 253 sem confirmação**. Os 260 não entregues confirmados não podem ser apresentados como 260 falhas. Havendo soma maior que a base, a interface informa que a conciliação está indisponível.

Origem: `lib/campaigns/delivery-statistics.ts`, `app/page.tsx` e `components/dashboard/campaign-overview-card.tsx`.

## Filtros e exclusões

- Empresa e período são aplicados antes da consolidação. O período usa o início da campanha; as métricas são acumuladas até a sincronização, não apenas eventos ocorridos dentro do período.
- Campanhas cujo nome contém `teste`, sem distinguir maiúsculas, ficam fora dos indicadores. A correspondência é por trecho, inclusive nomes como “Teste SMTP”.
- `is_test = true` também exclui a campanha dos indicadores. A tabela preserva as campanhas de teste no final, com aparência discreta, permitindo abrir os detalhes e reverter a marcação manual pelo menu do botão direito. Nenhum registro é apagado ao marcar como teste. Exclusão automática pelo nome exige renomear a campanha para voltar a contar.
- O menu de contexto usa a RPC `set_campaign_test_flag`. Ela exige MFA e permissão de gestão no workspace; o servidor registra autor e horário da última marcação.
- A sincronização preserva a marcação manual, pois não inclui essas colunas no payload de atualização.
- Exclusões de pessoas internas continuam sendo feitas no fluxo existente de estatísticas. Não combinar agregados filtrados e resultados brutos sem aplicar as mesmas exclusões.

## Fórmulas por área

As taxas abaixo são multiplicadas por 100. A apresentação usa arredondamento inteiro, em geral `Math.round`. A taxa consolidada usa **soma dos numeradores ÷ soma dos denominadores**, nunca média simples das taxas das campanhas.

| Área / arquivo                                                    | Indicador                                                       | Numerador / denominador                                                             | Observação                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard, `app/page.tsx`                                         | Abertura                                                        | abertos / participações                                                             | Inclui uma participação por pessoa em cada campanha.                                                                           |
| Dashboard, tabela e gráfico de clicados                           | Cliques                                                         | clicados / (entregues ou participações)                                             | Participações são a base alternativa se entregues for zero.                                                                    |
| Dashboard, conciliação                                            | Sem confirmação                                                 | participações − entregues − falhas                                                  | Contagem, não percentual; não implica falha.                                                                                   |
| Detalhes, `components/campaigns/campaign-metrics.tsx`             | Entregues, abertos, clicados, dados enviados, reportes e falhas | cada contagem / `stats.total`                                                       | Base de destinatários da campanha; cliques aqui usam base diferente do dashboard. Campos ausentes não são convertidos em zero. |
| Campanhas locais, `campaign-overview-content.tsx`                 | Abertura e cliques dos gráficos                                 | abertos ou clicados / enviados                                                      | Base de enviados, diferente da tabela consolidada BeePhish.                                                                    |
| Perfil, `profile-summary-card.tsx`                                | Entrega e abertura                                              | entregues ou abertos / participações                                                | Reutiliza agregados das campanhas.                                                                                             |
| Status, `status-content.tsx`                                      | Entrega e abertura                                              | entregues ou abertos / participações                                                | Não é uma taxa de disponibilidade do serviço.                                                                                  |
| Modo visual, `visual-dashboard-content.tsx`                       | Entrega e abertura                                              | entregues ou abertos / participações                                                | Mesma base do dashboard padrão.                                                                                                |
| Modo visual, mesmo arquivo                                        | Cliques e dados enviados nas barras                             | clicados ou dados enviados / participações                                          | Diferem da taxa consolidada de cliques.                                                                                        |
| Modo visual, mesmo arquivo                                        | Reportes                                                        | reportes / entregues                                                                | Sem a base alternativa de participações nessa barra.                                                                           |
| Modo visual, mesmo arquivo                                        | “Exposição”                                                     | (clicados + dados enviados + reportes) / participações                              | **Revisar:** soma eventos sobrepostos e inclui reportes, que não são sinal negativo por si só. Pode exceder 100%.              |
| Detalhe visual, `visual-campaign-content.tsx`                     | Abertura                                                        | abertos na lista carregada / pessoas na lista carregada                             | Pode refletir lista parcial, diferente dos cards que usam o agregado.                                                          |
| Detalhe visual, mesmo arquivo                                     | Exposição                                                       | (clicados + reportes) / pessoas na lista carregada                                  | **Revisar:** sobreposição e classificação de reportes.                                                                         |
| Risco, `people-risk-content.tsx` e `visual-risk-content.tsx`      | Pessoas por nível                                               | pessoas no nível / pessoas únicas consolidadas                                      | Pessoas são agrupadas no fluxo de risco; não confundir com participações.                                                      |
| Apresentação, `presentation-data.ts`                              | Abertura e cliques                                              | abertos / participações; clicados / (entregues ou participações)                    | Calcula taxas sobre os totais consolidados.                                                                                    |
| Slides, `presentation-slides.tsx`                                 | Cliques e reportes em layouts próprios                          | clicados / participações; reportes / entregues                                      | **Revisar:** o primeiro difere da taxa consolidada fornecida aos slides.                                                       |
| Template Canva, `lib/export/canva-template.ts`                    | Abertura e cliques                                              | abertos / participações; clicados / (entregues ou participações)                    | Formatação pt-BR sem casas decimais; denominador zero retorna zero.                                                            |
| Componentes auxiliares `signal-summary-card.tsx`, `risk-card.tsx` | Cliques, dados enviados, reportes                               | cliques / (entregues ou participações); dados / participações; reportes / entregues | Verificar os consumidores antes de alterar; alguns layouts de apresentação usam esses componentes.                             |

## Ranking de pessoas mais recorrentes

O ranking conta, por pessoa, **campanhas com clique ou envio de dados**, não campanhas recebidas e nem a soma de eventos repetidos. Clique e envio de dados na mesma campanha contam uma única vez no total. A linha apresenta as duas contagens separadas, que podem se sobrepor. O status de envio de dados implica clique, seguindo a convenção dos agregados existentes. Pessoas sem essas ações não entram; até cinco são exibidas, respeitando os filtros e exclusões. Empates são ordenados por envios de dados, cliques e nome, mantendo a mesma posição quando o total de campanhas é igual.

Origem: `app/page.tsx`, `lib/campaigns/participant-interactions.ts` e `components/dashboard/people-rankings.tsx`. Os sinais são extraídos do status sincronizado; a contagem não substitui uma análise do histórico individual de eventos.

## Faixas da taxa de cliques

Configuração da operação solicitada pelo usuário, não um benchmark externo. Aplicada sobre o valor **sem arredondar**, evitando que 3,4% seja classificado como excelente apenas por aparecer arredondado como 3%.

| Faixa         | Classificação      |
| ------------- | ------------------ |
| ≤ 3%          | Excelente / maduro |
| > 3% e ≤ 5%   | Bom                |
| > 5% e ≤ 10%  | Aceitável          |
| > 10% e ≤ 15% | Alerta             |
| > 15%         | Crítico            |

A informação de **Maturidade** está integrada ao card principal da visão geral, nos dois modos do dashboard. Mostra a classificação atual, a taxa consolidada e a base; as cinco faixas e a explicação ficam no tooltip “Como a maturidade é calculada”, aberto por hover ou foco no botão de ajuda, sem expandir o hero. O painel de maturidade ocupa a lateral direita do hero no desktop, com Liquid Glass. Usa cliques ÷ entregues, ou participações se não houver entregas registradas. Segue os filtros e exclusões do dashboard. Sem base, não classifica; dados inválidos ou cliques acima da base exibem pedido de conferência. A taxa é apresentada com até duas casas decimais. Sem destinatários, a interface não classifica o ambiente. A função está em `lib/campaigns/metrics.ts`. As cores são semânticas e acompanhadas de texto.

## Arredondamento e ausência de dados

- Divisão por zero costuma produzir **0%** por convenção de apresentação. Isso não prova ausência de eventos ou qualidade da sincronização. A classificação deixa explícita a ausência de base.
- Roscas limitam somente o desenho ao intervalo 0–100. Valores incoerentes na origem precisam de investigação; um gráfico não deve servir de validação de integridade.
- A abertura, o clique, o reporte e o envio de dados não são categorias mutuamente exclusivas. Somá-los não gera um percentual de pessoas únicas afetadas.
- Contadores históricos e listas carregadas parcialmente podem divergir. Confirmar paginação completa, exclusão de pessoas internas e instante da sincronização antes de atribuir erro ao cálculo.

## Percentuais técnicos

`lib/email-sample-quota.ts` calcula uso / limite, limitado visualmente a 100%. Uploads calculam bytes enviados / bytes totais. Esses números não são métricas de campanhas nem entram nas faixas de cliques.

## Próximas decisões

1. Unificar o denominador de cliques entre detalhes, campanhas locais, slides e dashboard, com rótulos explícitos.
2. Substituir “exposição” no modo visual por uma métrica de pessoas únicas, sem tratar reporte como falha humana.
3. Distinguir desconhecido de zero para todos os agregados, preservando os contratos de exportação.
4. Conferir os totais reais após sincronização no banco correto. A migration desta tarefa ainda precisa ser aplicada nesse ambiente.
