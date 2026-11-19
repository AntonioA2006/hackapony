# Genera frontend/.env.local y actualiza orígenes CORS en .env (IP LAN actual).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ip = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -eq "Dhcp" } |
    Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $ip) {
    Write-Error "No se detectó IPv4 por DHCP. Asigna la IP manualmente en frontend/.env.local"
}

$viteLocal = @"
# Generado por configure-lan.ps1 — no commitear
VITE_API_BASE_URL=http://${ip}:8000/api/v1
"@
$vitePath = Join-Path $root "frontend\.env.local"
Set-Content -Path $vitePath -Value $viteLocal -Encoding utf8

$envFile = Join-Path $root ".env"
$lanOrigins = @(
    "http://localhost:5173",
    "http://localhost:3080",
    "http://localhost:8081",
    "http://${ip}:5173",
    "http://${ip}:3080",
    "http://${ip}:8000"
) -join ","

if (Test-Path $envFile) {
    $lines = Get-Content $envFile
    $out = New-Object System.Collections.Generic.List[string]
    $seenCors = $false
    $seenDockerVite = $false
  foreach ($line in $lines) {
        if ($line -match '^CORS_ORIGINS=') {
            $out.Add("CORS_ORIGINS=$lanOrigins")
            $seenCors = $true
        } elseif ($line -match '^VITE_API_BASE_URL=') {
            continue
        } elseif ($line -match '^DOCKER_WEB_API_BASE_URL=') {
            $out.Add("DOCKER_WEB_API_BASE_URL=/api/v1")
            $seenDockerVite = $true
        } else {
            $out.Add($line)
        }
    }
    if (-not $seenCors) { $out.Add("CORS_ORIGINS=$lanOrigins") }
    if (-not $seenDockerVite) { $out.Add("DOCKER_WEB_API_BASE_URL=/api/v1") }
    Set-Content -Path $envFile -Value $out -Encoding utf8
}

Write-Host "LAN configurada:" -ForegroundColor Green
Write-Host "  Vite (.env.local): http://${ip}:5173 -> API http://${ip}:8000/api/v1"
Write-Host "  Docker equipo:     http://${ip}:3080 (nginx, API relativa /api/v1)"
Write-Host ""
Write-Host "Siguiente: .\scripts\team-up.ps1  o  cd frontend; npm run dev"