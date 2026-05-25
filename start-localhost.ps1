$ErrorActionPreference = "Stop"

$root = "G:\FINPROSE"
$backend = Join-Path $root "backend"
$backendExe = Join-Path $backend "finprose-backend.exe"
$vite = Join-Path $root "node_modules\vite\bin\vite.js"

function Test-Port {
  param([int] $Port)
  $connection = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
  return $connection.TcpTestSucceeded
}

function Start-IfPortClosed {
  param(
    [int] $Port,
    [scriptblock] $StartCommand,
    [string] $Name
  )

  if (Test-Port $Port) {
    Write-Host "$Name sudah jalan di port $Port"
    return
  }

  Write-Host "Menjalankan $Name..."
  & $StartCommand
}

if (!(Test-Path $backendExe)) {
  Write-Host "Build backend..."
  Push-Location $backend
  $env:GOCACHE = Join-Path $root ".gocache"
  New-Item -ItemType Directory -Force -Path $env:GOCACHE | Out-Null
  go build -o finprose-backend.exe .
  Pop-Location
}

Start-IfPortClosed -Port 5000 -Name "FINPROSE Backend" -StartCommand {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d G:\FINPROSE\backend && finprose-backend.exe" -WindowStyle Minimized
}

Start-IfPortClosed -Port 3000 -Name "FINPROSE Frontend" -StartCommand {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d G:\FINPROSE && node node_modules\vite\bin\vite.js --port=3000 --host=0.0.0.0" -WindowStyle Minimized
}

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "FINPROSE siap dibuka:"
Write-Host "Frontend : http://localhost:3000"
Write-Host "Backend  : http://localhost:5000/api/health"
Write-Host ""
Write-Host "Catatan: database dan authentication berjalan lewat Supabase."
