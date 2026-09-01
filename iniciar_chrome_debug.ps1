Write-Host "1. Encerrando instâncias do Chrome..." -ForegroundColor Yellow
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$srcDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$dstDir = "$env:LOCALAPPDATA\Google\Chrome\DebugProfile"
$extDir = "d:\git\lukeboh\tse-xt"

Write-Host "2. Sincronizando dados do seu Perfil Padrão para o ambiente de depuração..." -ForegroundColor Cyan
if (!(Test-Path "$dstDir\Default")) {
    New-Item -ItemType Directory -Force -Path "$dstDir\Default" | Out-Null
}

# Copiar arquivos de sessão, cookies e configurações para manter seu login
$filesToCopy = @("Network", "Cookies", "Login Data", "Web Data", "Preferences", "Secure Preferences", "Local Storage", "Extension State")
foreach ($item in $filesToCopy) {
    $src = "$srcDir\Default\$item"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination "$dstDir\Default\" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "3. Iniciando Chrome com seu Perfil Sincronizado + Porta 9222..." -ForegroundColor Green
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$dstDir", "--load-extension=$extDir", "--remote-allow-origins=*", "https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoDiaAction_consultar.action"
