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
# stdin 은 UTF-8 로 들어온다. 콘솔 코드페이지(한국어=CP949)에 의존하는
# [Console]::In.ReadToEnd() 는 한글을 깨뜨리므로, 원시 바이트를 UTF-8 로 직접 읽는다.
try {
  $reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), [System.Text.Encoding]::UTF8)
  $raw = $reader.ReadToEnd()
  $reader.Dispose()
} catch {}
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

# 2) 이 hook 을 띄운 터미널(WindowsTerminal/conhost/VSCode 등) 창의 HWND 찾기.
#    hook 은 -WindowStyle Hidden 으로 도는 별도 프로세스라 자기 콘솔 제목을
#    바꿔도 사용자가 보는 터미널 창 제목엔 영향이 없다(=마커 추적 실패).
#    대신 부모 프로세스 체인(notify.ps1 → claude → shell → 터미널)을 거슬러
#    올라가, '보이는 메인 창'을 가진 첫 조상의 HWND 를 쓴다.
$hwnd = 0
try {
  Add-Type -Namespace CN -Name Win -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
'@
  $parentOf = @{}
  foreach ($p in (Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId)) {
    $parentOf[[int]$p.ProcessId] = [int]$p.ParentProcessId
  }
  $cur = $PID
  $seen = @{}
  for ($i = 0; $i -lt 14; $i++) {
    if (-not $parentOf.ContainsKey([int]$cur)) { break }
    $ppid = $parentOf[[int]$cur]
    if ($ppid -le 0 -or $seen.ContainsKey($ppid)) { break }
    $seen[$ppid] = $true
    try {
      $h = (Get-Process -Id $ppid -ErrorAction Stop).MainWindowHandle
      if ($h -ne [IntPtr]::Zero -and [CN.Win]::IsWindowVisible($h)) { $hwnd = $h.ToInt64(); break }
    } catch {}
    $cur = $ppid
  }
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
