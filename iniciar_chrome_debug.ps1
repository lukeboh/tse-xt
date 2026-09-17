$dstDir = "$env:LOCALAPPDATA\Google\Chrome\DebugProfile"
$extDir = "d:\git\lukeboh\tse-xt"

Write-Host "1. Encerrando apenas o Chrome de depuracao (perfil isolado, nao mexe no seu Chrome normal)..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$dstDir*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

if (!(Test-Path "$dstDir\Default")) {
    New-Item -ItemType Directory -Force -Path "$dstDir\Default" | Out-Null
}

Write-Host "2. Iniciando Chrome com o profile de depuracao (independente do seu perfil padrao) + Porta 9222..." -ForegroundColor Green
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$dstDir", "--load-extension=$extDir", "--remote-allow-origins=*", "https://meuespaco.tse.jus.br/portalservidor2/EspelhoPontoDiaAction_consultar.action"
