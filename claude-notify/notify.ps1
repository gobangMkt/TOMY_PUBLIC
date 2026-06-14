param([string]$Kind = 'stop')

# [디버그] 훅 발화/경로 확인용 로그 — 진단 후 제거 예정
try {
  $dbg = Join-Path $PSScriptRoot 'notify.log'
  $ts = (Get-Date).ToString('HH:mm:ss')
  Add-Content -Path $dbg -Value "$ts ENTER kind=$Kind pwd=$((Get-Location).Path)" -Encoding UTF8
} catch {}

# 토글 게이트: 같은 폴더의 notify.flag 가 있을 때만 알림 발송
$flag = Join-Path $PSScriptRoot 'notify.flag'
if (-not (Test-Path $flag)) {
  try { Add-Content -Path (Join-Path $PSScriptRoot 'notify.log') -Value "$ts GATE-OFF (flag 없음)" -Encoding UTF8 } catch {}
  return
}

# 1) 작업 폴더(cwd) 추출 — stdin payload 우선, 없으면 실행 디렉토리/환경변수로 폴백
$folder = $null
$raw = ''
try { $raw = [Console]::In.ReadToEnd() } catch {}
try {
  if ($raw -and $raw.Trim()) {
    $data = $raw | ConvertFrom-Json
    if ($data.cwd) { $folder = Split-Path $data.cwd -Leaf }
  }
} catch {}
if (-not $folder -and $env:CLAUDE_PROJECT_DIR) { $folder = Split-Path $env:CLAUDE_PROJECT_DIR -Leaf }
if (-not $folder) { try { $folder = Split-Path (Get-Location).Path -Leaf } catch {} }
if (-not $folder) { $folder = 'Claude Code' }

# 한글 메시지는 스크립트 안에서 매핑 (명령줄 인코딩 깨짐 방지)
$Message = switch ($Kind) {
  'input' { '입력을 기다리고 있습니다.' }
  default { '작업이 완료되었습니다.' }
}
# 매번 같은 텍스트면 Windows 가 중복 알림으로 보고 배너를 억제(센터에만 추가)한다.
# 메시지에 시각을 붙여 내용을 매번 다르게 만들어 배너가 항상 뜨도록 한다.
$Message = "$Message  ($((Get-Date).ToString('HH:mm:ss')))"

# 2) 이 hook 이 붙어 있는 Windows Terminal 창의 HWND 찾기
#    GetConsoleWindow 는 화면에 안 보이는 pseudo-console 핸들을 주므로,
#    콘솔 제목에 잠깐 고유 마커를 심고 EnumWindows 로 진짜 WT 창을 역추적한다.
$hwnd = 0
try {
  Add-Type -Namespace CN -Name Win -MemberDefinition @'
[DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern bool SetConsoleTitle(string t);
[DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern uint GetConsoleTitle(System.Text.StringBuilder s, uint n);
public delegate bool EnumProc(System.IntPtr h, System.IntPtr p);
[DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, System.IntPtr p);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(System.IntPtr h, System.Text.StringBuilder s, int n);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
'@
  $oldTitle = New-Object System.Text.StringBuilder 1024
  [CN.Win]::GetConsoleTitle($oldTitle, 1024) | Out-Null

  $marker = '§CN:' + ([Guid]::NewGuid().ToString('N').Substring(0, 12))
  [CN.Win]::SetConsoleTitle($marker) | Out-Null
  Start-Sleep -Milliseconds 180

  $found = [ref]([IntPtr]::Zero)
  $cb = [CN.Win+EnumProc] {
    param($h, $p)
    if (-not [CN.Win]::IsWindowVisible($h)) { return $true }
    $sb = New-Object System.Text.StringBuilder 1024
    [CN.Win]::GetWindowText($h, $sb, 1024) | Out-Null
    if ($sb.ToString() -eq $marker) { $found.Value = $h; return $false }
    return $true
  }
  [CN.Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
  $hwnd = $found.Value.ToInt64()

  # 콘솔 제목 원복 (마커 흔적 제거)
  [CN.Win]::SetConsoleTitle($oldTitle.ToString()) | Out-Null
} catch {}

# 3) 토스트 발송. 클릭 시 protocol(claude-notify://) 로 focus.ps1 가 해당 창을 전면화.
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$safeFolder = [Security.SecurityElement]::Escape($folder)
$safeMsg = [Security.SecurityElement]::Escape($Message)
$launch = ''
if ($hwnd -ne 0) { $launch = " launch=`"claude-notify://focus?hwnd=$hwnd`" activationType=`"protocol`"" }

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast$launch><visual><binding template=`"ToastGeneric`"><text>$safeFolder</text><text>$safeMsg</text></binding></visual></toast>")

$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
# 매번 동일한 텍스트("작업이 완료되었습니다")라 Windows 가 중복으로 보고
# 배너를 억제(알림 센터에만 추가)한다. 고유 Tag 를 부여해 매번 새 알림으로
# 인식시켜 배너가 뜨도록 강제한다.
try { $toast.Tag = [Guid]::NewGuid().ToString('N').Substring(0, 16) } catch {}
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
try { Add-Content -Path (Join-Path $PSScriptRoot 'notify.log') -Value "$ts SHOW setting=$($notifier.Setting) hwnd=$hwnd folder=$folder" -Encoding UTF8 } catch {}
$notifier.Show($toast)

# 자동 닫기 안 함: 배너를 놓쳐도 알림 센터(Win+N)에 남도록 둔다.
# (클릭 처리는 focus.ps1 가 protocol 로 독립 처리)
