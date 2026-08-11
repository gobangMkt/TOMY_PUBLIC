@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
set DEST=%USERPROFILE%\.claude\skills\service-master
echo.
echo  service-master (디자인팀장·개발팀장) 설치
echo  설치 위치: %DEST%
echo.
if not exist "%~dp0service-master\SKILL.md" (
  echo  [실패] 이 파일과 같은 폴더에 service-master 폴더가 있어야 합니다.
  echo         압축을 풀고 나온 폴더 안에서 실행하세요.
  pause
  exit /b 1
)
if exist "%DEST%" (
  for /f %%i in ('powershell -NoProfile -Command "if((Get-Item '%DEST%' -Force -EA 0).LinkType){'LINK'}else{'DIR'}"') do set LT=%%i
  if "!LT!"=="LINK" (
    echo  [중단] 설치 위치가 심볼릭 링크/junction 입니다.
    echo         원본 관리자 PC로 보입니다. 지우면 원본이 손상되므로 중단합니다.
    pause
    exit /b 1
  )
  rmdir /s /q "%DEST%"
)
xcopy "%~dp0service-master" "%DEST%" /E /I /Q /Y >nul
if errorlevel 1 (
  echo  [실패] 복사 중 오류. Claude Code를 끄고 다시 실행해 보세요.
  pause
  exit /b 1
)
echo  [완료] Claude Code를 재시작하고 /skills 에서 service-master 를 확인하세요.
echo.
echo  쓰는 법: 이 화면 디자인팀장 호출해서 평가해줘
echo           개발팀장 관점에서 이 코드 봐줘
echo.
pause
