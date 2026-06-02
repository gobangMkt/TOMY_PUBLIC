# Claude Code 알림 ON/OFF 트레이 앱
# 초록 = ON, 회색 = OFF. 좌클릭 토글, 우클릭 메뉴.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 단일 인스턴스 가드: 이미 떠 있으면 종료 (중복 아이콘 방지)
$mutex = New-Object System.Threading.Mutex($false, 'Global\ClaudeNotifyTray')
if (-not $mutex.WaitOne(0)) { exit }

$flag = Join-Path $PSScriptRoot 'notify.flag'

function New-DotIcon([System.Drawing.Color]$color) {
  $bmp = New-Object System.Drawing.Bitmap 16, 16
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.FillEllipse($brush, 2, 2, 12, 12)
  $g.Dispose()
  [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}

$iconOn = New-DotIcon ([System.Drawing.Color]::LimeGreen)
$iconOff = New-DotIcon ([System.Drawing.Color]::Gray)

$ni = New-Object System.Windows.Forms.NotifyIcon

function Update-State {
  if (Test-Path $flag) {
    $ni.Icon = $iconOn
    $ni.Text = 'Claude 알림: ON'
  } else {
    $ni.Icon = $iconOff
    $ni.Text = 'Claude 알림: OFF'
  }
}

function Toggle-Flag {
  if (Test-Path $flag) {
    Remove-Item $flag -Force
    $ni.ShowBalloonTip(1500, 'Claude 알림', 'OFF — 작업 완료 알림 꺼짐', 'Info')
  } else {
    New-Item -ItemType File -Path $flag | Out-Null
    $ni.ShowBalloonTip(1500, 'Claude 알림', 'ON — 작업 완료 시 알림', 'Info')
  }
  Update-State
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.Items.Add('ON/OFF 전환').add_Click({ Toggle-Flag }) | Out-Null
$menu.Items.Add('종료').add_Click({ $ni.Visible = $false; [System.Windows.Forms.Application]::Exit() }) | Out-Null
$ni.ContextMenuStrip = $menu

$ni.add_MouseClick({
    param($s, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Toggle-Flag }
  })

Update-State
$ni.Visible = $true
[System.Windows.Forms.Application]::Run()
