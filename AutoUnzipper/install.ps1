[CmdletBinding()]
param([string]$WatchDir = '')

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$exe = Join-Path $here 'AutoUnzipper.exe'
$configPath = Join-Path $here 'config.json'
$runName = 'AutoUnzipper'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

Write-Host ''
Write-Host '=== AutoUnzipper 설치 ===' -ForegroundColor Cyan

if (-not (Test-Path $exe)) {
  throw "AutoUnzipper.exe 없음: $exe — repo를 다시 받으세요 (git pull)."
}

# 1) 감시 폴더 선택
if (-not $WatchDir) {
  $default = Join-Path $env:USERPROFILE 'Downloads'
  Write-Host ''
  Write-Host '감시할 폴더를 지정하세요. (이 폴더에 zip을 넣으면 자동 해제됩니다)'
  Write-Host "  그냥 Enter = 기본값: $default"
  $userInput = Read-Host '감시 폴더 경로'
  $WatchDir = if ($userInput.Trim()) { $userInput.Trim() } else { $default }
}
if (-not (Test-Path $WatchDir)) {
  New-Item -ItemType Directory -Path $WatchDir -Force | Out-Null
}
Write-Host "  감시 폴더: $WatchDir"

# 2) config.json 작성 (exe 옆, 개인 설정 — 커밋 안 됨)
$config = @{ watch_dir = $WatchDir } | ConvertTo-Json
[System.IO.File]::WriteAllText($configPath, $config, (New-Object System.Text.UTF8Encoding $false))
Write-Host '  config.json 작성 완료'

# 3) 부팅 자동실행 등록 (레지스트리 Run — exe는 창 없이 트레이로 뜸)
New-ItemProperty -Path $runKey -Name $runName -Value ('"' + $exe + '"') -PropertyType String -Force | Out-Null
Write-Host '  부팅 자동실행 등록 완료'

# 4) 기존 인스턴스 종료 후 1개만 실행
Get-Process -Name AutoUnzipper -ErrorAction SilentlyContinue |
  ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch {} }
Start-Sleep -Milliseconds 500
Start-Process -FilePath $exe -WorkingDirectory $here

Write-Host ''
Write-Host '설치 완료!' -ForegroundColor Green
Write-Host '작업표시줄 우측 ^ 영역에 트레이 아이콘이 떴습니다. 우클릭으로 제어하세요.'
Write-Host "감시 폴더($WatchDir)에 zip을 넣으면 자동으로 풀립니다."
