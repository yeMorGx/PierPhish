param()

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw "O conector precisa do PowerShell 7. Execute-o com pwsh."
}
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw "Este conector protege as chaves com DPAPI e só pode rodar no Windows."
}

Add-Type -TypeDefinition @"
using System.Text.Json.Serialization;

namespace Piersec.GoPhishConnector {
  public sealed class CampaignTemplate {
    [JsonPropertyName("name")] public string Name { get; set; } = "";
  }
  public sealed class CampaignPage {
    [JsonPropertyName("name")] public string Name { get; set; } = "";
  }
  public sealed class CampaignGroup {
    [JsonPropertyName("name")] public string Name { get; set; } = "";
  }
  public sealed class GroupSummary {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("num_targets")] public int NumTargets { get; set; }
    [JsonPropertyName("modified_date")] public string ModifiedDate { get; set; } = "";
  }
  public sealed class SafeTemplate {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("modified_date")] public string ModifiedDate { get; set; } = "";
  }
  public sealed class SafePage {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("capture_credentials")] public bool? CaptureCredentials { get; set; }
    [JsonPropertyName("capture_passwords")] public bool? CapturePasswords { get; set; }
    [JsonPropertyName("modified_date")] public string ModifiedDate { get; set; } = "";
  }
  public sealed class SafeSendingProfile {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("modified_date")] public string ModifiedDate { get; set; } = "";
  }
  public sealed class CampaignStats {
    [JsonPropertyName("total")] public int Total { get; set; }
    [JsonPropertyName("sent")] public int Sent { get; set; }
    [JsonPropertyName("opened")] public int Opened { get; set; }
    [JsonPropertyName("clicked")] public int Clicked { get; set; }
    [JsonPropertyName("submitted_data")] public int SubmittedData { get; set; }
    [JsonPropertyName("email_reported")] public int EmailReported { get; set; }
    [JsonPropertyName("error")] public int Error { get; set; }
  }
  public sealed class CampaignSummary {
    [JsonPropertyName("stats")] public CampaignStats Stats { get; set; } = new();
  }
  public sealed class CreatedCampaign {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("launch_date")] public string LaunchDate { get; set; } = "";
  }
  public sealed class Campaign {
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("created_date")] public string CreatedDate { get; set; } = "";
    [JsonPropertyName("launch_date")] public string LaunchDate { get; set; } = "";
    [JsonPropertyName("completed_date")] public string CompletedDate { get; set; } = "";
    [JsonPropertyName("template")] public CampaignTemplate Template { get; set; } = new();
    [JsonPropertyName("page")] public CampaignPage Page { get; set; } = new();
    [JsonPropertyName("groups")] public CampaignGroup[] Groups { get; set; } = System.Array.Empty<CampaignGroup>();
  }
}
"@ | Out-Null

$stateDirectory = Join-Path $env:LOCALAPPDATA "Piersec\GoPhishConnector"
$configPath = Join-Path $stateDirectory "config.json"

function ConvertTo-PlainText([Security.SecureString]$Secret) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Protect-LocalSecret([string]$Secret) {
  $secure = ConvertTo-SecureString -String $Secret -AsPlainText -Force
  return ConvertFrom-SecureString -SecureString $secure
}

function Unprotect-LocalSecret([string]$Ciphertext) {
  $secure = ConvertTo-SecureString -String $Ciphertext
  return ConvertTo-PlainText $secure
}

function Initialize-PrivateDirectory {
  New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  & icacls.exe $stateDirectory /inheritance:r /grant:r `
    "$($identity.Name):(OI)(CI)F" "NT AUTHORITY\SYSTEM:(OI)(CI)F" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível restringir as permissões do arquivo local."
  }
}

function Save-Configuration($Configuration) {
  Initialize-PrivateDirectory
  $json = $Configuration | ConvertTo-Json -Depth 5
  Set-Content -LiteralPath $configPath -Value $json -Encoding utf8
}

function Invoke-GoPhishGet {
  param(
    [Parameter(Mandatory)][System.Net.Http.HttpClient]$Client,
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$ApiKey
  )

  if ($Path -notmatch '^api/(campaigns|groups|templates|pages|smtp)(/summary)?/?$' -and
      $Path -notmatch '^api/campaigns/[0-9]+/summary/?$') {
    throw "O conector bloqueou um endpoint GoPhish fora da lista de leitura."
  }

  $request = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::Get,
    "https://127.0.0.1:3333/$Path"
  )
  $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
    "Bearer",
    $ApiKey
  )
  $response = $Client.Send($request)
  try {
    if (-not $response.IsSuccessStatusCode) {
      throw "GoPhish respondeu HTTP $([int]$response.StatusCode). Confira a chave e o serviço local."
    }
    $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return ConvertFrom-Json -InputObject $responseBody
  } finally {
    $response.Dispose()
    $request.Dispose()
  }
}

function Read-GoPhishObjects {
  param(
    [Parameter(Mandatory)][System.Net.Http.HttpClient]$Client,
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][type]$ObjectType,
    [Parameter(Mandatory)][string]$ApiKey
  )
  if ($Path -notmatch '^api/(groups/summary|templates|pages|smtp)/?$') {
    throw "O conector bloqueou uma leitura GoPhish fora da lista permitida."
  }
  $request = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::Get,
    "https://127.0.0.1:3333/$Path"
  )
  $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
    "Bearer",
    $ApiKey
  )
  $response = $Client.Send($request)
  try {
    if (-not $response.IsSuccessStatusCode) {
      throw "GoPhish respondeu HTTP $([int]$response.StatusCode). Confira a chave e o serviço local."
    }
    $stream = $response.Content.ReadAsStream()
    return [System.Text.Json.JsonSerializer]::Deserialize(
      $stream,
      $ObjectType,
      [System.Text.Json.JsonSerializerOptions]::new()
    )
  } finally {
    $response.Dispose()
    $request.Dispose()
  }
}

function Read-GoPhishCampaignMetadata {
  param(
    [System.Net.Http.HttpClient]$Client,
    [string]$ApiKey
  )

  # Deserialize only allowlisted properties from the response stream. Unknown
  # fields such as results, timeline, event details, and submitted data are skipped.
  $request = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::Get,
    "https://127.0.0.1:3333/api/campaigns/"
  )
  $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
    "Bearer",
    $ApiKey
  )
  $response = $Client.Send($request)
  try {
    if (-not $response.IsSuccessStatusCode) {
      throw "GoPhish respondeu HTTP $([int]$response.StatusCode). Confira a chave e o serviço local."
    }
    $stream = $response.Content.ReadAsStream()
    $parsedCampaigns = [System.Text.Json.JsonSerializer]::Deserialize(
      $stream,
      [Piersec.GoPhishConnector.Campaign[]],
      [System.Text.Json.JsonSerializerOptions]::new()
    )
    $campaigns = @(
      foreach ($campaign in $parsedCampaigns) {
        [ordered]@{
          id = $campaign.Id
          name = $campaign.Name
          status = $campaign.Status
          created_date = $campaign.CreatedDate
          launch_date = $campaign.LaunchDate
          completed_date = $campaign.CompletedDate
          template_name = if ($null -ne $campaign.Template) { $campaign.Template.Name } else { "" }
          page_name = if ($null -ne $campaign.Page) { $campaign.Page.Name } else { "" }
          groups = @($campaign.Groups | ForEach-Object { $_.Name })
        }
      }
    )
    return ,$campaigns
  } finally {
    $response.Dispose()
    $request.Dispose()
  }
}

function New-GoPhishHttpClient([string]$CertificatePath) {
  if (-not (Test-Path -LiteralPath $CertificatePath -PathType Leaf)) {
    throw "O certificado de administração do GoPhish não foi encontrado."
  }
  $trustedCertificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
    (Resolve-Path -LiteralPath $CertificatePath).Path
  )
  $script:trustedCertificateHash = [Security.Cryptography.SHA256]::HashData(
    $trustedCertificate.RawData
  )

  $handler = [System.Net.Http.HttpClientHandler]::new()
  $handler.ServerCertificateCustomValidationCallback = {
    param($request, $certificate, $chain, $policyErrors)
    if (
      $request.RequestUri.Scheme -ne "https" -or
      $request.RequestUri.Host -ne "127.0.0.1" -or
      $request.RequestUri.Port -ne 3333 -or
      $null -eq $certificate
    ) {
      return $false
    }
    $actualHash = [Security.Cryptography.SHA256]::HashData($certificate.RawData)
    return [Security.Cryptography.CryptographicOperations]::FixedTimeEquals(
      $actualHash,
      $script:trustedCertificateHash
    )
  }

  return [System.Net.Http.HttpClient]::new($handler)
}

function Get-SanitizedSnapshot {
  param(
    [System.Net.Http.HttpClient]$Client,
    [string]$ApiKey
  )

  # GoPhish's list response may include recipients and an event timeline.
  # The DTO above ignores those values and this snapshot contains only summaries.
  $sourceCampaigns = @(Read-GoPhishCampaignMetadata $Client $ApiKey)
  $sourceGroups = @(
    Read-GoPhishObjects $Client "api/groups/summary/" `
      ([Piersec.GoPhishConnector.GroupSummary[]]) $ApiKey
  )
  $sourceTemplates = @(
    Read-GoPhishObjects $Client "api/templates/" `
      ([Piersec.GoPhishConnector.SafeTemplate[]]) $ApiKey
  )
  $sourcePages = @(
    Read-GoPhishObjects $Client "api/pages/" `
      ([Piersec.GoPhishConnector.SafePage[]]) $ApiKey
  )
  $sourceSendingProfiles = @(
    Read-GoPhishObjects $Client "api/smtp/" `
      ([Piersec.GoPhishConnector.SafeSendingProfile[]]) $ApiKey
  )
  $groups = @(
    foreach ($group in $sourceGroups) {
      [ordered]@{
        id = $group.Id
        name = $group.Name
        numTargets = $group.NumTargets
        modifiedDate = $group.ModifiedDate
      }
    }
  )
  $templates = @(
    foreach ($template in $sourceTemplates) {
      [ordered]@{
        id = $template.Id
        name = $template.Name
        modifiedDate = $template.ModifiedDate
      }
    }
  )
  $pages = @(
    foreach ($page in $sourcePages) {
      [ordered]@{
        id = $page.Id
        name = $page.Name
        captureCredentials = $page.CaptureCredentials
        capturePasswords = $page.CapturePasswords
        modifiedDate = $page.ModifiedDate
      }
    }
  )
  $sendingProfiles = @(
    foreach ($profile in $sourceSendingProfiles) {
      [ordered]@{
        id = $profile.Id
        name = $profile.Name
        modifiedDate = $profile.ModifiedDate
      }
    }
  )

  $campaigns = @(
    foreach ($campaign in $sourceCampaigns) {
      $summary = Invoke-GoPhishGet $Client `
        "api/campaigns/$([int64]$campaign.id)/summary" $ApiKey
      $stats = $summary.stats
      [ordered]@{
        id = [int64]$campaign.id
        name = [string]$campaign.name
        status = [string]$campaign.status
        createdAt = [string]$campaign.created_date
        launchAt = [string]$campaign.launch_date
        completedAt = [string]$campaign.completed_date
        template = [string]$campaign.template_name
        page = [string]$campaign.page_name
        groups = @($campaign.groups)
        stats = [ordered]@{
          total = [int]$stats.total
          sent = [int]$stats.sent
          opened = [int]$stats.opened
          clicked = [int]$stats.clicked
          submittedData = [int]$stats.submitted_data
          emailReported = [int]$stats.email_reported
          error = [int]$stats.error
        }
      }
    }
  )

  return [ordered]@{
    updatedAt = [DateTime]::UtcNow.ToString("o")
    groups = $groups
    campaigns = $campaigns
    templates = $templates
    pages = $pages
    sendingProfiles = $sendingProfiles
  }
}

function Test-CurrentAsset($Current, $Expected, [string]$Label) {
  if ($null -eq $Expected) { throw "A prévia não contém $Label." }
  if (
    $null -eq $Current -or
    $Current.Id -ne [int64]$Expected.id -or
    $Current.Name -cne [string]$Expected.name -or
    $Current.ModifiedDate -cne [string]$Expected.modifiedDate
  ) {
    throw "$Label mudou desde a prévia. Gere uma nova prévia antes de tentar novamente."
  }
}

function Invoke-GoPhishCampaignCreate {
  param(
    [System.Net.Http.HttpClient]$Client,
    [string]$ApiKey,
    [System.Collections.IDictionary]$Campaign
  )
  $request = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::Post,
    "https://127.0.0.1:3333/api/campaigns/"
  )
  $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
    "Bearer",
    $ApiKey
  )
  $request.Content = [System.Net.Http.StringContent]::new(
    ($Campaign | ConvertTo-Json -Depth 8 -Compress),
    [System.Text.Encoding]::UTF8,
    "application/json"
  )
  try {
    $response = $Client.Send($request)
  } catch {
    return [ordered]@{
      status = "uncertain"
      campaignId = $null
      message = "A conexão foi interrompida durante a chamada ao GoPhish; confira o painel local antes de qualquer nova ação."
    }
  }
  try {
    if (-not $response.IsSuccessStatusCode) {
      if ([int]$response.StatusCode -ge 500) {
        return [ordered]@{
          status = "uncertain"
          campaignId = $null
          message = "GoPhish retornou HTTP $([int]$response.StatusCode); confira o painel local para confirmar o estado."
        }
      }
      return [ordered]@{
        status = "failed"
        campaignId = $null
        message = "GoPhish recusou a criação com HTTP $([int]$response.StatusCode)."
      }
    }
    try {
      $stream = $response.Content.ReadAsStream()
      $created = [System.Text.Json.JsonSerializer]::Deserialize(
        $stream,
        [Piersec.GoPhishConnector.CreatedCampaign],
        [System.Text.Json.JsonSerializerOptions]::new()
      )
    } catch {
      return [ordered]@{
        status = "uncertain"
        campaignId = $null
        message = "GoPhish aceitou a chamada, mas o conector não conseguiu ler o recibo. Confira o painel local."
      }
    }
    if ($null -eq $created -or $created.Id -lt 1) {
      return [ordered]@{
        status = "uncertain"
        campaignId = $null
        message = "GoPhish respondeu sem um recibo válido. Confira o painel local."
      }
    }
    return [ordered]@{
      status = "succeeded"
      campaignId = $created.Id
      message = "Campanha registrada no GoPhish local."
    }
  } finally {
    $response.Dispose()
    $request.Dispose()
  }
}

function Start-ConfirmedCampaign {
  param(
    [System.Net.Http.HttpClient]$Client,
    [string]$ApiKey,
    $Payload
  )
  if ($null -eq $Payload.campaign -or $null -eq $Payload.selected) {
    throw "O comando recebido não contém uma campanha confirmada válida."
  }
  $selection = $Payload.selected
  $currentGroups = @(
    Read-GoPhishObjects $Client "api/groups/summary/" `
      ([Piersec.GoPhishConnector.GroupSummary[]]) $ApiKey
  )
  foreach ($expectedGroup in @($selection.groups)) {
    $currentGroup = $currentGroups | Where-Object { $_.Id -eq [int64]$expectedGroup.id } | Select-Object -First 1
    Test-CurrentAsset $currentGroup $expectedGroup "O grupo $($expectedGroup.name)"
    if ($currentGroup.NumTargets -ne [int]$expectedGroup.numTargets) {
      throw "A quantidade de destinatários do grupo $($expectedGroup.name) mudou. Gere uma nova prévia."
    }
  }
  $templates = @(
    Read-GoPhishObjects $Client "api/templates/" `
      ([Piersec.GoPhishConnector.SafeTemplate[]]) $ApiKey
  )
  $template = $templates | Where-Object { $_.Id -eq [int64]$selection.template.id } | Select-Object -First 1
  Test-CurrentAsset $template $selection.template "O modelo"

  $pages = @(
    Read-GoPhishObjects $Client "api/pages/" `
      ([Piersec.GoPhishConnector.SafePage[]]) $ApiKey
  )
  $page = $pages | Where-Object { $_.Id -eq [int64]$selection.page.id } | Select-Object -First 1
  Test-CurrentAsset $page $selection.page "A página de destino"
  if (
    $null -eq $page.CaptureCredentials -or
    $null -eq $page.CapturePasswords -or
    $page.CaptureCredentials -or
    $page.CapturePasswords
  ) {
    throw "A página captura ou não permite confirmar a ausência de captura de credenciais. O envio foi bloqueado."
  }

  $profiles = @(
    Read-GoPhishObjects $Client "api/smtp/" `
      ([Piersec.GoPhishConnector.SafeSendingProfile[]]) $ApiKey
  )
  $profile = $profiles | Where-Object { $_.Id -eq [int64]$selection.sendingProfile.id } | Select-Object -First 1
  Test-CurrentAsset $profile $selection.sendingProfile "O perfil de envio"

  $requested = $Payload.campaign
  $destination = $null
  if (
    -not [Uri]::TryCreate([string]$requested.url, [UriKind]::Absolute, [ref]$destination) -or
    $destination.Scheme -ne "https" -or
    $destination.UserInfo
  ) {
    throw "A URL da campanha não passou pela validação local HTTPS."
  }
  if (
    [string]$requested.name -cne [string]$selection.campaignName -and
    -not [string]::IsNullOrWhiteSpace([string]$selection.campaignName)
  ) {
    throw "O nome da campanha não corresponde à seleção confirmada."
  }

  $campaign = [ordered]@{
    name = [string]$requested.name
    template = @{ name = $template.Name }
    page = @{ name = $page.Name }
    smtp = @{ name = $profile.Name }
    url = $destination.AbsoluteUri
    groups = @($selection.groups | ForEach-Object { @{ name = [string]$_.name } })
  }
  if ($requested.launch_date) {
    $launch = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse([string]$requested.launch_date, [ref]$launch) -or $launch -le [DateTimeOffset]::UtcNow) {
      throw "O horário agendado já passou ou não é válido. Gere uma nova prévia."
    }
    $campaign.launch_date = $launch.ToUniversalTime().ToString("o")
  }
  if ($requested.send_by_date) {
    if (-not $requested.launch_date) {
      throw "O prazo final só pode ser usado em uma campanha agendada."
    }
    $sendBy = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse([string]$requested.send_by_date, [ref]$sendBy) -or $sendBy -le $launch) {
      throw "O prazo final não é posterior ao horário de início."
    }
    $campaign.send_by_date = $sendBy.ToUniversalTime().ToString("o")
  }
  return Invoke-GoPhishCampaignCreate $Client $ApiKey $campaign
}

function Get-PiersecCommand {
  param([string]$PiersecUrl, [string]$ConnectorToken)
  return Invoke-RestMethod `
    -Uri "$PiersecUrl/api/gophish/dispatch" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ConnectorToken" } `
    -ContentType "application/json" `
    -Body "{}"
}

function Send-PiersecCommandResult {
  param(
    [string]$PiersecUrl,
    [string]$ConnectorToken,
    [string]$CommandId,
    [string]$Status,
    [Nullable[long]]$CampaignId,
    [string]$Message
  )
  $body = @{
    commandId = $CommandId
    status = $Status
    campaignId = if ($CampaignId.HasValue) { $CampaignId.Value } else { $null }
    message = $Message
  } | ConvertTo-Json -Compress
  Invoke-RestMethod `
    -Uri "$PiersecUrl/api/gophish/dispatch/result" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ConnectorToken" } `
    -ContentType "application/json" `
    -Body $body | Out-Null
}

if (Test-Path -LiteralPath $configPath -PathType Leaf) {
  $configuration = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  $piersecUrl = [string]$configuration.piersecUrl
  $certificatePath = [string]$configuration.certificatePath
  $apiKey = Unprotect-LocalSecret ([string]$configuration.apiKeyCiphertext)
  $connectorToken = Unprotect-LocalSecret ([string]$configuration.connectorTokenCiphertext)
  Write-Host "Configuração local encontrada; iniciando leitura do GoPhish."
} else {
  Write-Host "Pareamento local do GoPhish com o Piersec"
  $piersecUrlInput = (Read-Host "URL HTTPS do Piersec (ex.: https://piersec.vercel.app)").Trim()
  $piersecUri = $null
  if (
    -not [Uri]::TryCreate($piersecUrlInput, [UriKind]::Absolute, [ref]$piersecUri) -or
    $piersecUri.Scheme -ne "https" -or
    $piersecUri.UserInfo -or
    $piersecUri.Query -or
    $piersecUri.Fragment
  ) {
    throw "Informe uma URL HTTPS válida do Piersec, sem credenciais nem parâmetros."
  }
  $piersecUrl = $piersecUri.AbsoluteUri.TrimEnd('/')
  $pairingCode = (Read-Host "Código temporário gerado na tela GoPhish do Piersec").Trim()
  $certificatePath = (Read-Host "Caminho do certificado admin.crt do GoPhish").Trim().Trim('"')
  $apiKeySecure = Read-Host "Chave API local do GoPhish" -AsSecureString
  $apiKey = ConvertTo-PlainText $apiKeySecure

  $client = New-GoPhishHttpClient $certificatePath
  try {
    $null = Get-SanitizedSnapshot $client $apiKey
  } catch {
    $client.Dispose()
    throw "Não foi possível validar o GoPhish em 127.0.0.1:3333. Confira a porta, o certificado e a chave da API."
  }

  $pairingBody = @{ pairingCode = $pairingCode } | ConvertTo-Json -Compress
  try {
    $enrollment = Invoke-RestMethod `
      -Uri "$piersecUrl/api/gophish/enroll" `
      -Method Post `
      -ContentType "application/json" `
      -Body $pairingBody
  } catch {
    $client.Dispose()
    throw "O pareamento no Piersec falhou. Gere um novo código e tente novamente."
  }

  $connectorToken = [string]$enrollment.connectorToken
  if ([string]::IsNullOrWhiteSpace($connectorToken)) {
    $client.Dispose()
    throw "O Piersec não retornou a credencial do conector."
  }
  $configuration = [ordered]@{
    piersecUrl = $piersecUrl
    certificatePath = (Resolve-Path -LiteralPath $certificatePath).Path
    apiKeyCiphertext = Protect-LocalSecret $apiKey
    connectorTokenCiphertext = Protect-LocalSecret $connectorToken
  }
  Save-Configuration $configuration
  Write-Host "Conector pareado. As chaves foram protegidas com DPAPI no perfil do Windows."
}

$client = New-GoPhishHttpClient $certificatePath
try {
  Write-Host "Sincronizando GoPhish e aguardando comandos explicitamente confirmados. Pressione Ctrl+C para sair."
  while ($true) {
    try {
      $snapshot = Get-SanitizedSnapshot $client $apiKey
      $payload = @{ snapshot = $snapshot } | ConvertTo-Json -Depth 12 -Compress
      $null = Invoke-RestMethod `
        -Uri "$piersecUrl/api/gophish/snapshot" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $connectorToken" } `
        -ContentType "application/json" `
        -Body $payload
      Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Sincronizado: $($snapshot.campaigns.Count) campanha(s), $($snapshot.groups.Count) grupo(s)."
    } catch {
      Write-Warning "Sincronização indisponível; nova tentativa em 30 segundos."
    }
    try {
      $dispatch = Get-PiersecCommand $piersecUrl $connectorToken
      if ($dispatch.commandId) {
        $result = $null
        try {
          $result = Start-ConfirmedCampaign $client $apiKey $dispatch.payload
        } catch {
          $result = [ordered]@{
            status = "failed"
            campaignId = $null
            message = ([string]$_.Exception.Message).Trim().Substring(
              0,
              [Math]::Min(500, ([string]$_.Exception.Message).Trim().Length)
            )
          }
        }
        $campaignId = $null
        if ($null -ne $result.campaignId) { $campaignId = [Nullable[long]]([long]$result.campaignId) }
        try {
          Send-PiersecCommandResult `
            $piersecUrl `
            $connectorToken `
            ([string]$dispatch.commandId) `
            ([string]$result.status) `
            $campaignId `
            ([string]$result.message)
          Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Ordem de campanha concluída: $($result.status)."
        } catch {
          Write-Warning "Não foi possível registrar o recibo da ordem. Ela não será enviada novamente automaticamente."
        }
      }
    } catch {
      Write-Warning "Fila do Piersec indisponível; nova consulta em 30 segundos."
    }
    Start-Sleep -Seconds 30
  }
} finally {
  $client.Dispose()
  $apiKey = $null
  $connectorToken = $null
}
