# Pruebas de conectividad LAN desde la anfitriona (no sustituye prueba en movil).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ip = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -eq "Dhcp" } |
    Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $ip) { $ip = "127.0.0.1" }

function Test-JsonUrl($name, $url) {
    $r = curl.exe -sf $url
    if ($LASTEXITCODE -ne 0) { throw "$name fallo: $url" }
    Write-Host "[OK] $name" -ForegroundColor Green
    return $r
}

Write-Host "Verificacion LAN ($ip)..." -ForegroundColor Cyan
Test-JsonUrl "health local" "http://localhost:3080/health" | Out-Null
Test-JsonUrl "health/ready local" "http://localhost:3080/health/ready" | Out-Null
Test-JsonUrl "health LAN" "http://${ip}:3080/health" | Out-Null

$inc = Test-JsonUrl "incidencias publicas" "http://${ip}:3080/api/v1/incidents/public?page_size=10"
$data = $inc | ConvertFrom-Json
if ($data.total -lt 1) {
    Write-Warning "Mapa publico sin incidencias. Ejecuta: docker compose exec api python -m scripts.seed_dev"
} else {
    Write-Host "[OK] Mapa tiene $($data.total) incidencia(s) publica(s)" -ForegroundColor Green
}

$cors = (curl.exe -s -I -X OPTIONS "http://${ip}:8000/api/v1/incidents/public" `
    -H "Origin: http://${ip}:5173" -H "Access-Control-Request-Method: GET") -join "`n"
if ($cors -notmatch "(?i)access-control-allow-origin") {
    throw "CORS preflight sin access-control-allow-origin"
}
Write-Host "[OK] CORS preflight Vite LAN" -ForegroundColor Green

Write-Host ""
Write-Host "Comparte con el equipo: http://${ip}:3080"
Write-Host "Pendiente manual: abrir esa URL en un telefono (misma WiFi)."