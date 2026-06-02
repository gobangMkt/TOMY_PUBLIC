$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot

Write-Host ''
Write-Host '=== Claude Code 알림 제거 ===' -ForegroundColor Cyan

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

# 1) 트레이 종료
$tok = 'notify-' + 'tray.ps1'; $ff = '-' + 'File'
@((Get-CimInstance Win32_Process -Filter "Name='powershell.exe'") | Where-Object { $_.CommandLine -like "*$tok*" -and $_.CommandLine -like "*$ff*" }) |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
Write-Host '  트레이 종료'

# 2) 부팅 자동실행 제거
$startupVbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude알림트레이.vbs'
if (Test-Path $startupVbs) { Remove-Item $startupVbs -Force; Write-Host '  부팅 자동실행 제거' }

# 3) 상태 파일 제거
$flag = Join-Path $here 'notify.flag'
if (Test-Path $flag) { Remove-Item $flag -Force }

# 4) hook 제거 (전역 + 이 repo 로컬 — notify.ps1 명령만 골라 제거, 다른 hook 보존)
$targets = @(
  (Join-Path $env:USERPROFILE '.claude\settings.json'),
  (Join-Path (Split-Path $here -Parent) '.claude\settings.local.json')
)
foreach ($sp in $targets) {
  if (-not (Test-Path $sp)) { continue }
  $raw = Get-Content $sp -Raw
  if (-not $raw.Trim()) { continue }
  $s = ConvertTo-Hashtable ($raw | ConvertFrom-Json)
  if (-not $s.ContainsKey('hooks')) { continue }
  $changed = $false
  foreach ($ev in @('Stop', 'Notification')) {
    if ($s['hooks'].ContainsKey($ev)) {
      $kept = @($s['hooks'][$ev] | Where-Object {
          $cmds = @($_.hooks | ForEach-Object { $_.command }) -join ' '
          $cmds -notlike '*notify.ps1*'
        })
      if ($kept.Count -ne @($s['hooks'][$ev]).Count) {
        $changed = $true
        if ($kept.Count) { $s['hooks'][$ev] = $kept } else { [void]$s['hooks'].Remove($ev) }
      }
    }
  }
  if ($changed) {
    $json = $s | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($sp, $json, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "  hook 제거: $sp"
  }
}

Write-Host ''
Write-Host '제거 완료.' -ForegroundColor Green
