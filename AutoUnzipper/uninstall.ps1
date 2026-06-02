$ErrorActionPreference = 'Stop'
$runName = 'AutoUnzipper'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

Write-Host ''
Write-Host '=== AutoUnzipper 제거 ===' -ForegroundColor Cyan

# 1) 트레이 프로세스 종료
Get-Process -Name AutoUnzipper -ErrorAction SilentlyContinue |
  ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch {} }
Write-Host '  트레이 종료'

# 2) 부팅 자동실행 해제
$prop = Get-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
if ($prop) {
  Remove-ItemProperty -Path $runKey -Name $runName
  Write-Host '  부팅 자동실행 삭제'
} else {
  Write-Host '  부팅 자동실행 항목 없음 (건너뜀)'
}

Write-Host ''
Write-Host '제거 완료. (config.json·logs는 폴더에 그대로 둡니다)' -ForegroundColor Green
Write-Host 'exe 자체를 지우려면 폴더에서 직접 삭제하세요.'
