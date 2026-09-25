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

  if ($Path -notmatch '^api/(campaigns|groups)(/summary)?/?$' -and
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
  $sourceGroups = @(Invoke-GoPhishGet $Client "api/groups/summary" $ApiKey)
  $groups = @(
    foreach ($group in $sourceGroups) {
      [ordered]@{
        id = [int64]$group.id
        name = [string]$group.name
        numTargets = [int]$group.num_targets
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
  }
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
    $null = Read-GoPhishCampaignMetadata $client $apiKey
    $null = Invoke-GoPhishGet $client "api/groups/summary" $apiKey
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
  Write-Host "Sincronizando campanhas e grupos em modo somente leitura. Pressione Ctrl+C para sair."
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
    Start-Sleep -Seconds 30
  }
} finally {
  $client.Dispose()
  $apiKey = $null
  $connectorToken = $null
}
