# =============================================================================
# dsh-periscope — 一键安装（文件附件功能）
#
# 用法（PowerShell，DSH Desktop 桌面端 / Windows）:
#    .\install.ps1                 # 一键：退出检测 → 备份 → 原位重打包 → 校验
#
# 做了什么：
#   0) 检查 DSH 已退出
#   1) 备份 app.asar -> app.asar.bak
#   2) 用本包内 scripts/repack-inplace.mjs 对 app.asar 做原位重打包
#      （注入 6 个补丁核心文件，保留原生模块 -> 文件附件生效）
#   3) 校验 + 提示重启 DSH
# =============================================================================

$ErrorActionPreference = "Stop"
$Self = $PSScriptRoot

# ---- 1) 定位 app.asar ---------------------------------------------------------
function Resolve-AppAsar {
    $candidates = @(
        "D:\DSH\DSH Desktop\resources\app.asar",
        "$env:ProgramFiles\DSH Desktop\resources\app.asar",
        "${env:ProgramFiles(x86)}\DSH Desktop\resources\app.asar"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    $disco = Get-ChildItem "$env:ProgramFiles","$env:LOCALAPPDATA","D:\" -Recurse -Depth 4 -Filter app.asar -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'DSH Desktop' } | Select-Object -First 1
    if ($disco) { return $disco.FullName }
    throw "未找到 app.asar。请在 Resolve-AppAsar 中填入 DSH 实际 resources 路径。"
}

$asar = Resolve-AppAsar
$bak  = "$asar.bak"

Write-Host "── 0) 检查 DSH 是否已退出 ──" -ForegroundColor Cyan
if (Get-Process "DSH Desktop" -ErrorAction SilentlyContinue) {
    Write-Host "⚠ 检测到 DSH 正在运行。请【完全退出】DSH（托盘/任务栏退出）后再运行本脚本。" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host "  asar   : $asar" -ForegroundColor DarkGray

# ---- 2) 备份 app.asar ---------------------------------------------------------
if (-not (Test-Path $bak)) {
    Write-Host "── 1) 备份 app.asar ──" -ForegroundColor Cyan
    Copy-Item $asar $bak -Force
    Write-Host "  已备份: $bak" -ForegroundColor Green
} else {
    Write-Host "── 1) 备份已存在，跳过: $bak ──" -ForegroundColor DarkGray
}

# ---- 3) 选 node（DSH runtime / Codex runtime / 系统 node） ----------------------
$runtimeNode  = "C:\Users\hndsj\Documents\Codex\2026-08-21\wo-x\outputs\dsh-desktop\dist\win-unpacked\resources\runtime\node.exe"
$runtimeNode2 = "C:\Users\hndsj\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = if (Test-Path $runtimeNode) { $runtimeNode }
        elseif (Test-Path $runtimeNode2) { $runtimeNode2 }
        else { (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $node) { Write-Host "⚠ 未找到 node，请修改本脚本里的 node 路径。" -ForegroundColor Yellow; exit 1 }
Write-Host "  node: $node" -ForegroundColor DarkGray

# ---- 4) 原位重打包 app.asar（保留原生模块） -------------------------------------
Write-Host "── 2) 原位重打包 app.asar ──" -ForegroundColor Cyan
$repack = Join-Path $Self "scripts\repack-inplace.mjs"
& $node $repack --asar $asar
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 重打包返回非 0，正在还原备份..." -ForegroundColor Yellow
    if (Test-Path $bak) { Copy-Item $bak $asar -Force }
    Write-Host "  已还原。请排查。" -ForegroundColor Green
    exit 1
}

# ---- 5) 校验 -----------------------------------------------------------------
Write-Host "── 3) 校验 ──" -ForegroundColor Cyan
if (Test-Path $bak) {
    $asz = (Get-Item $asar).Length; $bksz = (Get-Item $bak).Length
    Write-Host "  app.asar: $asz 字节（备份 $bksz 字节）" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "✅ 完成！现在【重新打开 DSH】。" -ForegroundColor Green
Write-Host "   - 拖入/粘贴任意文件应出现附件卡片，agent 按路径读取" -ForegroundColor Green
Write-Host "如需还原：停止 DSH → Copy-Item '$bak' '$asar' -Force" -ForegroundColor DarkGray
