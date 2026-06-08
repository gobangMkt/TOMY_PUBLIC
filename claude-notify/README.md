# Claude Code 작업 완료 알림

Claude Code(CLI)가 **작업을 끝냈을 때** Windows 토스트 알림을 띄워줍니다.
다른 창을 보고 있어도 작업이 끝난 걸 바로 알 수 있습니다.

- 알림에 **어느 클로드 창(작업 폴더명)** 의 알림인지 표시
- 알림을 **클릭하면 그 창으로 바로 이동** (최소화돼 있어도 복원 + 전면화)
- 토스트는 **3초 뒤 자동으로 닫힘**
- 작업표시줄 **트레이 아이콘**으로 ON/OFF (🟢 초록=ON, ⚪ 회색=OFF)
- 윈도우 시작 시 **자동 실행**

> 여러 클로드 창(Windows Terminal 별도 창)을 동시에 띄워놓고 써도, 각 알림이 자기 창을 정확히 찾아 띄웁니다.

> 환경: **Windows + PowerShell 5.1** 전제입니다.

---

## 🚀 설치 (3단계)

1. repo를 받습니다.
   ```
   git clone https://github.com/gobangMkt/TOMY_PUBLIC
   ```
   (이미 있으면 `git pull`)
2. `claude-notify\` 폴더의 **`설치.bat`** 더블클릭
3. 범위 선택
   - `1` 전역 — 어느 폴더에서 Claude Code를 돌려도 알림
   - `2` 이 repo — 이 프로젝트에서 실행할 때만 알림

끝입니다. 트레이 아이콘이 바로 뜨고, 다음 부팅부터 자동 실행됩니다.

> 처음 실행할 때 알림이 안 뜨면, Claude Code에서 `/hooks` 를 한 번 열거나 재시작하세요. (설정 반영)

---

## 🎛 사용법

작업표시줄 우측 **`^`(숨겨진 아이콘)** 영역에 점 아이콘이 생깁니다.

| 동작 | 결과 |
|---|---|
| 아이콘 색 | 🟢 초록 = 알림 ON / ⚪ 회색 = OFF |
| **좌클릭** | ON ↔ OFF 전환 (풍선으로 확인) |
| **우클릭** | `ON/OFF 전환`, `종료` 메뉴 |

ON/OFF 상태는 저장되어 **재부팅해도 유지**됩니다. 항상 켜두고 싶으면 한 번 ON 해두세요.

---

## ⚙️ 작동 원리

```
Claude Code 작업 끝남
        │  (Stop 이벤트 + stdin 으로 cwd 등 payload 전달)
        ▼
   settings.json 의 hook
   "powershell -Hidden notify.ps1 stop"   ← 창 없이 백그라운드
        │
        ▼
   notify.ps1
        ├─ notify.flag 있나? ──아니오──▶ 조용히 종료 (알림 없음)
        │
        예
        ├─ stdin 의 cwd → 작업 폴더명 추출 (알림 제목)
        ├─ 콘솔 제목에 잠깐 마커 심어 → 내 Windows Terminal 창 HWND 역추적
        ▼
   Windows 토스트 🔔  [폴더명]  →  3초 뒤 자동 닫힘
        │  (클릭하면)
        ▼
   claude-notify://focus?hwnd=NNN  ← protocol 활성화
        ▼
   focus.ps1  →  그 창 복원 + 전면화 (SetForegroundWindow)

[트레이 아이콘]  좌클릭 → notify.flag 생성/삭제 → 아이콘 색 변경
```

- hook은 **항상 실행**되지만, 실제 알림은 `notify.flag`가 **있을 때만** 뜸
- 트레이 아이콘은 그 flag를 켜고 끄는 **스위치**
- 알림 **클릭 처리는 `focus.ps1`이 독립적으로** 담당 — 토스트가 3초 뒤 닫혀도, hook 프로세스가 끝나도 클릭이 동작함

### 파일 구성 (이 폴더)
| 파일 | 역할 |
|---|---|
| `notify.ps1` | 토스트 발송 (폴더명 표시, HWND 캡처, 3초 자동 닫힘) |
| `focus.ps1` | 알림 클릭 시 해당 창 복원+전면화 (`claude-notify://` protocol 핸들러) |
| `notify-tray.ps1` | 트레이 아이콘 앱 (단일 인스턴스) |
| `알림트레이.vbs` | 창 없이 트레이 실행하는 런처 |
| `notify.flag` | ON/OFF 상태 (있으면 ON, 개인용·커밋 안 됨) |
| `설치.bat` / `install.ps1` | 설치 |
| `제거.bat` / `uninstall.ps1` | 제거 |

설치 시 자동 생성(각 PC):
- hook → 전역 `~/.claude/settings.json` 또는 이 repo `.claude/settings.local.json`
- 부팅 자동실행 → `시작프로그램\Claude알림트레이.vbs`
- 알림 클릭 핸들러 → `HKCU\Software\Classes\claude-notify` (protocol 등록, 관리자 권한 불필요)

---

## 🗑 제거

`제거.bat` 더블클릭 → 트레이 종료 + 부팅 자동실행 삭제 + hook 제거 + 클릭 핸들러(protocol) 제거.

---

## 🛠 문제 해결

| 증상 | 해결 |
|---|---|
| 알림이 안 뜬다 | ① 트레이 아이콘이 🟢 ON인지 확인 ② Claude Code에서 `/hooks` 열기 또는 재시작 |
| 글자가 깨진다 (���) | `설치.bat` 다시 실행 (스크립트에 BOM 재적용) |
| 토스트 자체가 안 보인다 | Windows `설정 > 시스템 > 알림` 에서 알림이 켜져 있는지 확인 |
| 알림 제목이 폴더명이 아닌 'Claude Code' | hook payload(stdin)를 못 받은 경우의 폴백. 동작엔 지장 없음 |
| 알림 클릭해도 창이 안 뜬다 | 그 창을 이미 닫았을 수 있음. 또는 `설치.bat` 재실행으로 클릭 핸들러 재등록 |
| 트레이 아이콘이 여러 개 | 정상 동작상 1개만 유지됨. 그래도 중복이면 모두 `종료` 후 `알림트레이.vbs` 한 번 실행 |

> ⚠️ `.ps1` 파일을 메모장 등으로 열어 **저장하면 BOM이 사라져 한글이 깨질 수 있습니다.** 그럴 땐 `설치.bat`을 다시 실행하면 복구됩니다.
