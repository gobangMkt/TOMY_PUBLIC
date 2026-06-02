param([string]$Kind = 'stop')

# 토글 게이트: 같은 폴더의 notify.flag 가 있을 때만 알림 발송
$flag = Join-Path $PSScriptRoot 'notify.flag'
if (-not (Test-Path $flag)) { return }

# 한글 메시지는 스크립트 안에서 매핑 (명령줄 인코딩 깨짐 방지)
$Message = switch ($Kind) {
  'input' { '입력을 기다리고 있습니다.' }
  default { '작업이 완료되었습니다.' }
}

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$safe = [Security.SecurityElement]::Escape($Message)
$xml.LoadXml("<toast><visual><binding template=`"ToastGeneric`"><text>Claude Code</text><text>$safe</text></binding></visual></toast>")

$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
$notifier.Show($toast)

# 3초 뒤 자동 닫힘
Start-Sleep -Seconds 3
$notifier.Hide($toast)
