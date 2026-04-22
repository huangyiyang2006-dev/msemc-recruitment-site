@echo off
setlocal
cd /d "%~dp0"

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo 正在安装 Cloudflare Tunnel 工具 cloudflared...
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo.
    echo cloudflared 安装失败，请先确认 winget 可用，或手动安装后再运行本脚本。
    pause
    exit /b 1
  )
)

echo 正在启动本地报名服务...
start "传媒中心报名服务" cmd /k py -3 server.py

timeout /t 4 >nul

echo 正在创建公网访问地址...
start "传媒中心公网地址" cmd /k cloudflared tunnel --url http://127.0.0.1:8000

echo.
echo 已打开两个窗口：
echo 1. 一个是本地报名服务窗口
echo 2. 一个是公网地址窗口
echo.
echo 等待公网地址窗口出现 https://xxxxx.trycloudflare.com
echo 把那个网址发给别人，他们就可以直接打开报名页。
echo 你的管理页仍然在本机打开：
echo http://127.0.0.1:8000/admin.html
echo.
pause
