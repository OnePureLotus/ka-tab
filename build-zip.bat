@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"

echo ========================================
echo   KaTab 打包脚本
echo ========================================
echo.

echo [1/3] 清除原有编译产物...
if exist ".output" (
  rmdir /s /q ".output"
  echo   已删除 .output
) else (
  echo   .output 不存在，跳过
)

if exist "ka-tab.zip" (
  del /f /q "ka-tab.zip"
  echo   已删除旧版 ka-tab.zip
)

echo.
echo [2/3] 重新编译扩展...
call pnpm build
if errorlevel 1 (
  echo.
  echo [错误] 编译失败，已终止。
  exit /b 1
)

if not exist ".output\chrome-mv3\manifest.json" (
  echo.
  echo [错误] 未找到编译产物 .output\chrome-mv3\manifest.json
  exit /b 1
)

echo.
echo [3/3] 压缩为 ka-tab.zip...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -Path '.output\chrome-mv3\*' -DestinationPath 'ka-tab.zip' -Force"
if errorlevel 1 (
  echo.
  echo [错误] 打包失败。
  exit /b 1
)

echo.
echo ========================================
echo   打包完成: %CD%\ka-tab.zip
echo ========================================
exit /b 0
