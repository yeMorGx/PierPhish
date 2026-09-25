# Campanhas no Portainer

O agente de campanhas roda em um contêiner Docker gerenciado pelo Portainer. Ele compartilha uma rede privada com o serviço de campanhas e inicia conexões HTTPS de saída para o Piersec. A Stack não publica portas.

## Preparar os arquivos no host Docker

Crie dois arquivos protegidos no host do Docker:

- `campaign-api-key.txt`: chave de API do serviço, em uma única linha.
- `campaign-admin.crt`: certificado HTTPS usado pelo serviço.

Restringa a leitura desses arquivos à conta administrativa do Docker. Não coloque o conteúdo deles em variáveis de ambiente, no navegador ou no repositório.

## Criar a Stack

No Portainer, crie uma Stack a partir do repositório PierPhish, selecione a branch `main` e use `deploy/portainer/campaign-bridge.compose.yaml` como caminho do arquivo Compose.

Defina as variáveis da Stack:

| Variável                   | Valor                                                                            |
| -------------------------- | -------------------------------------------------------------------------------- |
| `PIERSEC_URL`              | URL HTTPS atual do Piersec                                                       |
| `PIERSEC_PAIRING_CODE`     | Código de uso único gerado em Campanhas → Conexão                                |
| `CAMPAIGN_SERVICE_URL`     | URL HTTPS interna do serviço na rede Docker, incluindo a porta administrativa    |
| `CAMPAIGN_TLS_SERVER_NAME` | Nome DNS presente no certificado, se diferente do host em `CAMPAIGN_SERVICE_URL` |
| `CAMPAIGN_DOCKER_NETWORK`  | Nome da rede Docker privada compartilhada com o serviço                          |
| `CAMPAIGN_API_KEY_FILE`    | Caminho absoluto no host para `campaign-api-key.txt`                             |
| `CAMPAIGN_ADMIN_CERT_FILE` | Caminho absoluto no host para `campaign-admin.crt`                               |

Implante a Stack e aguarde o status **Conectado** no Piersec. Depois, remova `PIERSEC_PAIRING_CODE` das variáveis da Stack e atualize-a. O código expira em 10 minutos e só pode ser usado uma vez.

## Operação

O agente mantém a chave e o token em arquivos montados ou em um volume Docker privado. Ele envia apenas nomes e IDs de ativos, horários e estatísticas agregadas. Não envia listas de pessoas, endereços de e-mail, IPs, eventos individuais, conteúdo submetido ou dados de credenciais.

A criação de campanha revalida grupos, modelo, página e perfil antes da chamada única de criação. Se o resultado da chamada ficar inconclusivo, o histórico pede conferência manual e o agente não repete a operação automaticamente.

Para remover a conexão, pare e exclua a Stack pelo Portainer e remova o volume `campaign_bridge_state` se também quiser descartar o token persistido.
