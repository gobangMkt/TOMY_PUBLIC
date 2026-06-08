param([string]$Uri)

# 토스트 클릭 시 protocol(claude-notify://focus?hwnd=NNN) 으로 호출된다.
# URI 에서 HWND 를 꺼내 해당 Windows Terminal 창을 복원 + 전면화한다.
$hwnd = 0
if ($Uri -and $Uri -match 'hwnd=(\d+)') { $hwnd = [int64]$Matches[1] }
if ($hwnd -eq 0) { return }

Add-Type -Namespace CNF -Name Win -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(System.IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int n);
[DllImport("user32.dll")] public static extern bool IsIconic(System.IntPtr h);
[DllImport("user32.dll")] public static extern bool IsWindow(System.IntPtr h);
[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte sc, uint f, System.UIntPtr e);
'@

$h = [IntPtr]$hwnd
if (-not [CNF.Win]::IsWindow($h)) { return }   # 창이 이미 닫혔으면 무시

# 최소화돼 있으면 복원 (SW_RESTORE = 9)
if ([CNF.Win]::IsIconic($h)) { [CNF.Win]::ShowWindow($h, 9) | Out-Null }

# 포그라운드 강제: ALT 키를 한 번 두드려 OS 의 foreground lock 을 풀고 올린다
[CNF.Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)        # ALT down
[CNF.Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)        # ALT up
[CNF.Win]::SetForegroundWindow($h) | Out-Null
[CNF.Win]::BringWindowToTop($h) | Out-Null
