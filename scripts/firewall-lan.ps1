# Ejecutar PowerShell como administrador. Reglas entrantes en red Privada.
$ErrorActionPreference = "Stop"
$ports = @(
    @{ Port = 3080; Name = "Agua Alerta nginx (3080)" },
    @{ Port = 8000; Name = "Agua Alerta API (8000)" },
    @{ Port = 5173; Name = "Agua Alerta Vite (5173)" }
)
foreach ($p in $ports) {
    $existing = Get-NetFirewallRule -DisplayName $p.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Regla ya existe: $($p.Name)" -ForegroundColor Yellow
        continue
    }
    New-NetFirewallRule -DisplayName $p.Name -Direction Inbound -Protocol TCP `
        -LocalPort $p.Port -Profile Private -Action Allow | Out-Null
    Write-Host "Regla creada: $($p.Name)" -ForegroundColor Green
}
Write-Host "Listo. No se modifico el firewall en redes Publica o Dominio."