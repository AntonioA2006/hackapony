# Smoke E2E INEGI: municipios 09 -> AGEB 09/002 -> relink -> verifica contexto en incidencia demo.
# Requiere API en marcha y acceso a gaia.inegi.org.mx
param(
    [string]$BaseUrl = "http://localhost:3080/api/v1",
    [string]$CveEnt = "09",
    [string]$CveMun = "002"
)

$ErrorActionPreference = "Stop"

function Invoke-Api($Method, $Path, $Token, $Body = $null) {
    $headers = @{ Authorization = "Bearer $Token" }
    if ($Body) {
        $json = $Body | ConvertTo-Json -Compress
        return Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $headers -Body $json -ContentType "application/json"
    }
    return Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $headers
}

Write-Host "INEGI E2E - $BaseUrl (ent $CveEnt mun $CveMun)" -ForegroundColor Cyan

$login = Invoke-RestMethod -Method POST -Uri "$BaseUrl/auth/login" -ContentType "application/json" `
    -Body '{"email":"super@example.com","password":"Super12345!"}'
$token = $login.tokens.access_token
if (-not $token) { throw "Login superadmin fallo" }
Write-Host "[OK] Login superadmin" -ForegroundColor Green

Write-Host "Importando municipios CDMX..." 
$m1 = Invoke-Api POST "/inegi/import/wscatgeo/$CveEnt/municipalities" $token
Write-Host "[OK] Municipios: $($m1.rows_upserted) filas"

Write-Host "Importando AGEB municipio $CveEnt/$CveMun (puede tardar 1-3 min)..." -ForegroundColor Yellow
$m2 = Invoke-Api POST "/inegi/import/wscatgeo/$CveEnt/$CveMun/ageb" $token
Write-Host "[OK] AGEB: $($m2.rows_upserted) filas (scope $($m2.scope))"

Write-Host "Relink territorial..." 
$m3 = Invoke-Api POST "/inegi/relink-territorial" $token
Write-Host "[OK] Relink: $($m3.reports_relinked) reportes, $($m3.incidents_relinked) incidencias"

$census = Invoke-Api GET "/census-areas?cve_ent=$CveEnt&cve_mun=$CveMun&page_size=3" $token
if (-not $census.Count) { throw "No hay AGEB en BD tras import" }
Write-Host "[OK] Muestra AGEB: pob_total=$($census[0].pob_total) cvegeo=$($census[0].cvegeo)" -ForegroundColor Green

$prio = Invoke-Api GET "/incidents/priority?limit=5" $token
$demo = $prio | Where-Object { $_.public_id -match "LANDEM|INC|AA" } | Select-Object -First 1
if (-not $demo) {
    $demo = $prio | Select-Object -First 1
}
if ($demo) {
    Write-Host "[OK] Incidencia $($demo.public_id): urgency=$($demo.urgency_score) band=$($demo.priority_band)" -ForegroundColor Green
    if (-not $demo.municipality_id) {
        Write-Host "[!] municipality_id vacio - revisar geometrias o punto del reporte" -ForegroundColor Yellow
    }
} else {
    Write-Host "[!] Sin incidencias en cola prioridad" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "E2E INEGI completado." -ForegroundColor Green