# Empacota somente arquivos de runtime; a versao vem do manifest.json.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$distDir = Join-Path $projectRoot 'dist'
$null = New-Item -ItemType Directory -Path $distDir -Force
$zipFilePath = Join-Path $distDir ('tse-xt-v' + $manifest.version + '.zip')
$files = @('manifest.json', 'background.js')
foreach ($folder in @('content', 'popup')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -Recurse -File | ForEach-Object {
        $_.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    }
}
$files += @('icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png', 'icons/base.png')
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $file) -PathType Leaf)) { throw "Arquivo obrigatorio ausente: $file" }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $zipFilePath) { Remove-Item -LiteralPath $zipFilePath -Force }
$zip = [IO.Compression.ZipFile]::Open($zipFilePath, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in ($files | Sort-Object -Unique)) {
        $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, (Join-Path $projectRoot $file), $file, [IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $zip.Dispose() }
Write-Host ('Pacote: ' + $zipFilePath)
Get-FileHash -LiteralPath $zipFilePath -Algorithm SHA256 | Format-List Algorithm, Hash, Path
