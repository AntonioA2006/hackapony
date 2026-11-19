# Abre puertos en el firewall de Windows (requiere ejecucion como administrador).
$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Host "Se necesitan permisos de administrador. Abriendo ventana elevada..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
    )
    exit
}

# Perfil Public incluido: muchas PCs corporativas bloquean entradas si no hay regla explicita.
$ports = @(
    @{ Port = 3080; Name = "Agua Alerta nginx (3080)" },
    @{ Port = 8000; Name = "Agua Alerta API (8000)" },
    @{ Port = 5173; Name = "Agua Alerta Vite (5173)" }
)

foreach ($p in $ports) {
    $existing = Get-NetFirewallRule -DisplayName $p.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Set-NetFirewallRule -DisplayName $p.Name -Enabled True -Profile Domain,Private,Public | Out-Null
        Write-Host "Regla actualizada: $($p.Name)" -ForegroundColor Yellow
        continue
    }
    New-NetFirewallRule -DisplayName $p.Name -Direction Inbound -Protocol TCP `
        -LocalPort $p.Port -Profile Domain,Private,Public -Action Allow | Out-Null
    Write-Host "Regla creada: $($p.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Firewall listo. Prueba en el movil: http://TU_IP:3080" -ForegroundColor Green
Write-Host "Si sigue sin cargar, ejecuta: .\scripts\diagnose-mobile.ps1"