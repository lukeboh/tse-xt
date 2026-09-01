# =============================================================================
# TSE XT - Script de Empacotamento para a Chrome Web Store
# =============================================================================

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = (Get-Location).Path
}

# 1. Le a versao atual do manifest.json
$manifestPath = Join-Path $projectRoot "manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Error "Arquivo manifest.json nao encontrado em: $manifestPath"
    exit 1
}

$manifestContent = Get-Content $manifestPath -Raw -Encoding UTF8
$manifestJson = ConvertFrom-Json $manifestContent
$version = $manifestJson.version
$extensionName = "tse-xt"

Write-Host ">> [1/5] Empacotando extensao: $extensionName v$version" -ForegroundColor Cyan

# 2. Configura diretorio de saida
$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) {
    $null = New-Item -ItemType Directory -Path $distDir
}

$zipFileName = "$extensionName-v$version.zip"
$zipFilePath = Join-Path $distDir $zipFileName

if (Test-Path $zipFilePath) {
    Remove-Item $zipFilePath -Force
}

# 3. Cria diretorio temporario para isolar os arquivos
$tempBuildDir = Join-Path $distDir "build_temp"
if (Test-Path $tempBuildDir) {
    Remove-Item $tempBuildDir -Recurse -Force
}
$null = New-Item -ItemType Directory -Path $tempBuildDir

try {
    # 4. Copia os arquivos essenciais
    Write-Host ">> [2/5] Copiando manifest.json e background.js..." -ForegroundColor Gray
    Copy-Item (Join-Path $projectRoot "manifest.json") -Destination $tempBuildDir
    if (Test-Path (Join-Path $projectRoot "background.js")) {
        Copy-Item (Join-Path $projectRoot "background.js") -Destination $tempBuildDir
    }

    Write-Host ">> [3/5] Copiando content e popup..." -ForegroundColor Gray
    Copy-Item (Join-Path $projectRoot "content") -Destination $tempBuildDir -Recurse
    Copy-Item (Join-Path $projectRoot "popup") -Destination $tempBuildDir -Recurse

    Write-Host ">> [4/5] Copiando icones de producao..." -ForegroundColor Gray
    $tempIconsDir = Join-Path $tempBuildDir "icons"
    $null = New-Item -ItemType Directory -Path $tempIconsDir
    
    $iconFiles = @("icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png")
    foreach ($icon in $iconFiles) {
        $srcIcon = Join-Path (Join-Path $projectRoot "icons") $icon
        if (Test-Path $srcIcon) {
            Copy-Item $srcIcon -Destination $tempIconsDir
        } else {
            Write-Warning "Icone nao encontrado: $icon"
        }
    }

    # 5. Compacta na raiz do ZIP (padrao Chrome Web Store)
    Write-Host ">> [5/5] Gerando arquivo ZIP: $zipFilePath..." -ForegroundColor Yellow
    Compress-Archive -Path "$tempBuildDir\*" -DestinationPath $zipFilePath -CompressionLevel Optimal

    $zipSize = (Get-Item $zipFilePath).Length
    $zipSizeKB = [math]::Round($zipSize / 1KB, 2)

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " [SUCESSO] Pacote gerado com sucesso para a Chrome Web Store!" -ForegroundColor Green
    Write-Host " Arquivo: $zipFilePath ($zipSizeKB KB)" -ForegroundColor Green
    Write-Host " Pronto para upload no Chrome Web Store Developer Dashboard." -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Green
}
catch {
    Write-Error "Falha no empacotamento: $_"
    throw $_
}
finally {
    if (Test-Path $tempBuildDir) {
        Remove-Item $tempBuildDir -Recurse -Force
    }
}
