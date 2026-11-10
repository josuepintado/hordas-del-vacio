# Crea dist/hordas-del-vacio-web.zip listo para subir a itch.io, minijuegos.com, juegos.com, etc.
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $out | Out-Null
$zip = Join-Path $out 'hordas-del-vacio-web.zip'
if (Test-Path $zip) { Remove-Item $zip }
$items = @('index.html', 'css', 'js') | ForEach-Object { Join-Path $root $_ }
if (Test-Path (Join-Path $root 'assets')) { $items += (Join-Path $root 'assets') }
Compress-Archive -Path $items -DestinationPath $zip
Write-Host "Listo: $zip"
