# Diagnostico cuando el movil no carga Agua Alerta (misma WiFi / red).
$ErrorActionPreference = "Continue"

function Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[!] $m" -ForegroundColor Yellow }
function Bad($m) { Write-Host "[X] $m" -ForegroundColor Red }

Write-Host "Diagnostico acceso movil - Agua Alerta" -ForegroundColor Cyan
Write-Host ""

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" }
foreach ($a in $ips) {
    $tag = if ($a.IPAddress -like "169.254.*") { " (sin DHCP / mal enlace)" } else { "" }
    Write-Host "  $($a.InterfaceAlias): $($a.IPAddress)$tag"
}

$lanIp = $ips |
    Where-Object { $_.PrefixOrigin -eq "Dhcp" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $lanIp) {
    $lanIp = ($ips | Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
}

if ($lanIp) {
    Ok "IP sugerida para compartir: $lanIp"
    Write-Host "    URL movil: http://${lanIp}:3080"
} else {
    Bad "No hay IPv4 usable. Conecta Ethernet o Wi-Fi con DHCP."
}

$profiles = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq "Internet" -or $_.IPv4Connectivity -eq "LocalNetwork" }
foreach ($p in $profiles) {
    if ($p.NetworkCategory -eq "Public") {
        Warn "Perfil '$($p.Name)' ($($p.InterfaceAlias)) es PUBLICO: Windows bloquea conexiones entrantes por defecto."
        Write-Host "    Solucion: clic derecho en firewall-lan.ps1 -> Ejecutar como administrador"
        Write-Host "    (o PowerShell admin: .\scripts\firewall-lan.ps1)"
    }
}

$docker = docker ps --filter "name=hackapony-web" --format "{{.Ports}}" 2>$null
if ($docker -match "0.0.0.0:3080") {
    Ok "Docker publica 3080 en todas las interfaces"
} else {
    Bad "Contenedor web no escucha en :3080. Ejecuta: .\scripts\team-up.ps1"
}

if ($lanIp) {
    $code = curl.exe -s -o NUL -w "%{http_code}" "http://${lanIp}:3080/"
    if ($code -eq "200") {
        Ok "HTTP 200 desde esta PC a http://${lanIp}:3080"
    } else {
        Bad "HTTP $code en :3080"
    }
}

Write-Host ""
Write-Host "Checklist en el telefono:" -ForegroundColor Cyan
Write-Host "  1. Misma red que la PC (no datos moviles)."
Write-Host "  2. Si el movil es 192.168.x y la PC es 10.x, NO estan en la misma LAN."
Write-Host "  3. URL con http:// (no https). Puerto :3080"
Write-Host "  4. Red corporativa: puede haber aislamiento AP -> probar hotspot de Windows:"
Write-Host "     Configuracion > Red e Internet > Zona con cobertura inalambrica movil"
Write-Host "  5. Wi-Fi de la PC en 169.254.x = adaptador sin conexion real al router."

$rules = Get-NetFirewallRule -DisplayName "Agua Alerta nginx (3080)" -ErrorAction SilentlyContinue
if ($rules) { Ok "Regla firewall 3080 existe" } else { Bad "Falta regla firewall (ejecuta firewall-lan.ps1 como admin)" }