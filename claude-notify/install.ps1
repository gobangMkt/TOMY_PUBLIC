[CmdletBinding()]
param([ValidateSet('global', 'project', '')] [string]$Scope = '')

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$notify = Join-Path $here 'notify.ps1'
$tray = Join-Path $here 'notify-tray.ps1'

Write-Host ''
Write-Host '=== Claude Code 알림 설치 ===' -ForegroundColor Cyan

# 재귀 JSON 병합 헬퍼 (PS5.1엔 ConvertFrom-Json -AsHashtable 없음)
function ConvertTo-Hashtable {
  param($obj)
  if ($null -eq $obj) { return $null }
  if ($obj -is [System.Collections.IDictionary]) {
    $h = @{}; foreach ($k in $obj.Keys) { $h[$k] = ConvertTo-Hashtable $obj[$k] }; return $h
  }
  if ($obj -is [System.Collections.IEnumerable] -and $obj -isnot [string]) {
    return @($obj | ForEach-Object { ConvertTo-Hashtable $_ })
  }
  if ($obj -is [psobject] -and $obj.PSObject.Properties.Name.Count) {
    $h = @{}; foreach ($p in $obj.PSObject.Properties) { $h[$p.Name] = ConvertTo-Hashtable $p.Value }; return $h
  }
  return $obj
}

# 1) BOM 방어 적용 (PS5.1은 BOM 없는 .ps1을 CP949로 읽어 한글 깨짐)
$utf8bom = New-Object System.Text.UTF8Encoding $true
foreach ($f in @($notify, $tray)) {
  if (-not (Test-Path $f)) { throw "필수 파일 없음: $f — repo를 다시 클론하세요." }
  $b = [System.IO.File]::ReadAllBytes($f)
  $hasBom = $b.Length -ge 3 -and $b[0] -eq 239 -and $b[1] -eq 187 -and $b[2] -eq 191
  if (-not $hasBom) {
    $c = Get-Content $f -Raw -Encoding UTF8
    [System.IO.File]::WriteAllText($f, $c, $utf8bom)
    Write-Host "  BOM 적용: $([System.IO.Path]::GetFileName($f))"
  }
}

# 2) 범위 선택
if (-not $Scope) {
  Write-Host ''
  Write-Host '알림 적용 범위를 선택하세요:'
  Write-Host '  1) 전역    — 어느 폴더에서 Claude Code를 돌려도 알림'
  Write-Host '  2) 이 repo — 이 프로젝트에서 실행할 때만 알림'
  $sel = Read-Host '번호 입력 (1/2, 기본 1)'
  $Scope = if ($sel -eq '2') { 'project' } else { 'global' }
}

if ($Scope -eq 'global') {
  $settingsPath = Join-Path $env:USERPROFILE '.claude\settings.json'
} else {
  $projectDir = Split-Path $here -Parent
  $claudeDir = Join-Path $projectDir '.claude'
  if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Path $claudeDir | Out-Null }
  $settingsPath = Join-Path $claudeDir 'settings.local.json'
}
Write-Host "  범위: $Scope"
Write-Host "  설정 파일: $settingsPath"

# 3) hook 병합 등록 (기존 설정 보존)
$settings = @{}
if (Test-Path $settingsPath) {
  $raw = Get-Content $settingsPath -Raw
  if ($raw.Trim()) { $settings = ConvertTo-Hashtable ($raw | ConvertFrom-Json) }
}
if (-not $settings.ContainsKey('hooks')) { $settings['hooks'] = @{} }

$cmdStop = "powershell -WindowStyle Hidden -File `"$notify`" stop"
$settings['hooks']['Stop'] = @(@{ hooks = @(@{ type = 'command'; command = $cmdStop; async = $true }) })
# 입력 대기(Notification) 알림은 쓰지 않음 — 기존에 등록돼 있으면 제거
if ($settings['hooks'].ContainsKey('Notification')) { [void]$settings['hooks'].Remove('Notification') }

$json = $settings | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($settingsPath, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host '  hook 등록 완료 (Stop)'

# 4) 부팅 자동실행 등록 (Startup 폴더, UTF-16 + VBScript 따옴표 이스케이프)
$startupVbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude알림트레이.vbs'
$dq = '"' + '"'
$runArg = 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File ' + $dq + $tray + $dq
$vbs = 'Set sh = CreateObject("WScript.Shell")' + "`r`n" + 'sh.Run "' + $runArg + '", 0, False' + "`r`n"
[System.IO.File]::WriteAllText($startupVbs, $vbs, [System.Text.Encoding]::Unicode)
Write-Host '  부팅 자동실행 등록 완료'

# 5) 트레이 즉시 실행 (기존 것 종료 후 1개만)
$tok = 'notify-' + 'tray.ps1'; $ff = '-' + 'File'
@((Get-CimInstance Win32_Process -Filter "Name='powershell.exe'") | Where-Object { $_.CommandLine -like "*$tok*" -and $_.CommandLine -like "*$ff*" }) |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
Start-Sleep -Milliseconds 500
Start-Process powershell -ArgumentList '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $tray -WindowStyle Hidden

# 6) 완료 안내
$flag = Join-Path $here 'notify.flag'
$state = if (Test-Path $flag) { 'ON' } else { 'OFF' }
Write-Host ''
Write-Host "설치 완료! 현재 알림 상태: $state" -ForegroundColor Green
Write-Host '작업표시줄 우측 ^ 영역의 트레이 아이콘을 클릭해 ON/OFF 전환하세요. (초록=ON, 회색=OFF)'
Write-Host '알림이 안 뜨면 Claude Code에서 /hooks 를 한 번 열거나 재시작하세요.'
