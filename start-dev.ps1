# NusaPolicy Copilot — Fast Startup & Memory Guard (1GB)
Write-Host "=== NusaPolicy Copilot — Startup ===" -ForegroundColor Cyan

# 1. Pastikan .wslconfig membatasi VRAM ke 1GB
$wslConfig = "$env:USERPROFILE\.wslconfig"
$desired = "[wsl2]`nmemory=1GB`nswap=4GB`nprocessors=2"
try {
    $desired | Set-Content $wslConfig -Encoding UTF8 -Force
    Write-Host "[OK] .wslconfig disetel ke 1GB." -ForegroundColor Green
} catch {
    Write-Host "[INFO] .wslconfig tidak bisa diedit (mungkin WSL sedang aktif). Edit manual jika perlu." -ForegroundColor Yellow
}

# 2. Cek Docker Desktop
$proc = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Host "Memulai Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    Write-Host "Menunggu Docker daemon siap (maks 50 detik)..." -ForegroundColor Yellow
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 2
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
    }
} else {
    Write-Host "[OK] Docker Desktop sudah menyala." -ForegroundColor Green
}

# 3. Nyalakan database
Set-Location "$PSScriptRoot"
docker compose -f infra/docker-compose.yml up -d db

Write-Host ""
Write-Host "===== DATABASE AKTIF (VMMEM dibatasi 1GB) =====" -ForegroundColor Green
Write-Host ""
Write-Host "Terminal 1 (API):" -ForegroundColor White
Write-Host '  $env:DATABASE_URL = "postgresql+psycopg://nusapolicy:change-me-for-local-development@localhost:5432/nusapolicy"' -ForegroundColor Gray
Write-Host "  .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps/api --port 8000 --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 (Web):" -ForegroundColor White
Write-Host "  cd apps/web; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Browser: http://localhost:3000" -ForegroundColor Cyan
