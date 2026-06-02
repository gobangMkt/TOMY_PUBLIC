' 창 없이 알림 트레이 앱 실행 (더블클릭 또는 시작 시 자동실행)
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\notify-tray.ps1""", 0, False
