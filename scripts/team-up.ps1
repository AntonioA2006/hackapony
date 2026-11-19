# Arranca stack Docker y muestra URL LAN para pruebas del equipo (nginx en :3080).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ip = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -eq "Dhcp" } |
    Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $ip) {
    $ip = "localhost"
}

Write-Host "Construyendo y levantando servicios..." -ForegroundColor Cyan
docker compose up -d --build db api web

Write-Host "Sembrando usuarios y demo de mapa..." -ForegroundColor Cyan
docker compose exec -T api python -m scripts.seed_dev

Write-Host "Verificando conectividad..." -ForegroundColor Cyan
& "$PSScriptRoot\verify-lan.ps1"

Write-Host ""
Write-Host "Agua Alerta - acceso equipo (misma WiFi / LAN):" -ForegroundColor Green
Write-Host "  App:    http://${ip}:3080"
Write-Host "  Docs:   http://${ip}:3080/docs"
Write-Host "  Health: http://${ip}:3080/health"
Write-Host ""
Write-Host "Local: http://localhost:3080  |  Respaldo: :8081"
Write-Host "Cuentas: ver backend/scripts/seed_dev.py o README"