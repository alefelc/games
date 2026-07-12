$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path ".env.production")) {
  Copy-Item ".env.example" ".env.production"
}
npm install
npm run test
npm run build
Write-Host "Build listo en: $PWD\dist" -ForegroundColor Green
Write-Host "Subí el CONTENIDO de dist a la raíz pública de census.ar." -ForegroundColor Yellow
