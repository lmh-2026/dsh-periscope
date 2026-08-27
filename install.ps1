# =============================================================================
# dsh-periscope — 一键安装（bundle 版本正确显示 + 文件附件生效）
#
# 用法（PowerShell，DSH Desktop 桌面端 / Windows）:
#    .\install.ps1                 # 默认安装与 package.json 同版本的 dsh-periscope
#    .\install.ps1 -Version 0.3.3  # 指定精确版本
#    .\install.ps1 -Profile web    # 装到指定 profile（默认 desktop）
#    .\install.ps1 -FromLocal      # 离线：从本仓库/本包本地安装（不走 npm registry）
#
# 做了什么：
#   0) 检查 DSH 已退出
#   1) 备份 app.asar -> app.asar.bak
#   2) 以【精确版本】安装 dsh-periscope bundle（依赖区间从 ^0.2.0 修正为 ^0.3.3，
#      使 DSH 插件列表正确显示版本）
#   3) 用已安装包内 scripts/repack-inplace.mjs 对 app.asar 做原位重打包
#      （注入 6 个补丁核心文件，保留原生模块 -> 文件附件生效）
#   4) 校验 + 提示重启 DSH
# =============================================================================

param(
    [string]$Version = "0.3.3",
    [string]$Profile = "desktop",
    [switch]$FromLocal,
    [switch]$SkipRepack   # 调试用：只装 bundle，不打 asar
)

$ErrorActionPreference = "Stop"
$Self = $PSScriptRoot

# ---- 0) 定位 DSH CLI ----------------------------------------------------------
function Resolve-Dsh {
    $candidate = Get-Command dsh -ErrorAction SilentlyContinue
    if ($candidate) { return $candidate.Source }
    $pipelines = @(
        "$env:APPDATA\DSH Desktop\host-commands\desktop\bin\dsh.cmd",
        "$env:LOCALAPPDATA\DSH Desktop\host-commands\desktop\bin\dsh.cmd"
    )
    foreach ($p in $pipelines) { if (Test-Path $p) { return $p } }
    # 也允许从一个明确的安装路径找
    $disco = Get-ChildItem "$env:APPDATA\DSH Desktop" -Recurse -Depth 4 -Filter dsh.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($disco) { return $disco.FullName }
    throw "未找到 dsh CLI。请确认已安装 DSH Desktop，或把 dsh.cmd 路径填入 Resolve-Dsh。"
}

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

$dsh = Resolve-Dsh
$asar = Resolve-AppAsar
$bak  = "$asar.bak"

Write-Host "── 0) 检查 DSH 是否已退出 ──" -ForegroundColor Cyan
if (Get-Process "DSH Desktop" -ErrorAction SilentlyContinue) {
    Write-Host "⚠ 检测到 DSH 正在运行。请【完全退出】DSH（托盘/任务栏退出）后再运行本脚本。" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host "  dsh    : $dsh" -ForegroundColor DarkGray
Write-Host "  asar   : $asar" -ForegroundColor DarkGray
Write-Host "  profile: $Profile" -ForegroundColor DarkGray
Write-Host "  version: $Version" -ForegroundColor DarkGray

# ---- 2) 备份 app.asar ---------------------------------------------------------
if (-not (Test-Path $bak)) {
    Write-Host "── 1) 备份 app.asar ──" -ForegroundColor Cyan
    Copy-Item $asar $bak -Force
    Write-Host "  已备份: $bak" -ForegroundColor Green
} else {
    Write-Host "── 1) 备份已存在，跳过: $bak ──" -ForegroundColor DarkGray
}

# ---- 3) 以精确版本安装 dsh-periscope bundle -----------------------------------
Write-Host "── 2) 安装/更新 dsh-periscope@$Version（精确版本） ──" -ForegroundColor Cyan
$addArgs = @("plugin", "add", "--profile", "$Profile")
if ($FromLocal) {
    # 从本仓库/本包本地安装（离线）。dsh plugin add 会把它作为 file: 依赖装进 profile。
    $addArgs += "file:$Self"
} else {
    $addArgs += "dsh-periscope@$Version"
}
& $dsh @addArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 插件安装返回非 0，请检查网络/registry。" -ForegroundColor Yellow
    exit 1
}
Write-Host "  OK: dsh-periscope 已安装" -ForegroundColor Green

if ($SkipRepack) { Write-Host "（已跳过 asar 重打包，-SkipRepack）" -ForegroundColor DarkGray; exit 0 }

# ---- 4) 用已安装包内的重打包脚本做 asar 原位重打包 ----------------------------
Write-Host "── 3) 定位已安装的 dsh-periscope 包 ──" -ForegroundColor Cyan
$instPkg = "$env:USERPROFILE\.dsh\profiles\$Profile\node_modules\dsh-periscope"
if (-not (Test-Path "$instPkg\scripts\repack-inplace.mjs")) {
    # 兜底：当前脚本自身所在的包
    $instPkg = $Self
}
Write-Host "  包目录: $instPkg" -ForegroundColor DarkGray

# 选 node（DSH runtime / Codex runtime / 系统 node）
$runtimeNode = "C:\Users\hndsj\Documents\Codex\2026-08-21\wo-x\outputs\dsh-desktop\dist\win-unpacked\resources\runtime\node.exe"
$runtimeNode2 = "C:\Users\hndsj\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = if (Test-Path $runtimeNode) { $runtimeNode }
        elseif (Test-Path $runtimeNode2) { $runtimeNode2 }
        else { (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $node) { Write-Host "⚠ 未找到 node，请修改脚本里的 node 路径。" -ForegroundColor Yellow; exit 1 }
Write-Host "  node: $node" -ForegroundColor DarkGray

Write-Host "── 4) 原位重打包 app.asar（自动备份，保留原生模块） ──" -ForegroundColor Cyan
& $node (Join-Path $instPkg "scripts\repack-inplace.mjs") --asar $asar
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 重打包返回非 0，正在还原备份..." -ForegroundColor Yellow
    if (Test-Path $bak) { Copy-Item $bak $asar -Force }
    Write-Host "  已还原。请排查。" -ForegroundColor Green
    exit 1
}

# ---- 5) 校验 -----------------------------------------------------------------
Write-Host "── 5) 校验 ──" -ForegroundColor Cyan
try {
    $instVer = (Get-Content "$instPkg\package.json" -Raw | ConvertFrom-Json).version
    Write-Host "  已安装 bundle 版本: $instVer" -ForegroundColor Green
} catch { Write-Host "  ⚠ 无法读取已安装版本" -ForegroundColor Yellow }
# 校验 app.asar 已被重打包（体积应比备份更大/相等；打入了 6 个补丁文件）
if (Test-Path $bak) {
    $asz = (Get-Item $asar).Length; $bksz = (Get-Item $bak).Length
    Write-Host "  app.asar: $asz 字节（备份 $bksz 字节）" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "✅ 完成！现在【重新打开 DSH】。" -ForegroundColor Green
Write-Host "   - DSH 插件列表应显示 dsh-periscope v$Version" -ForegroundColor Green
Write-Host "   - 拖入/粘贴任意文件应出现附件卡片，agent 按路径读取" -ForegroundColor Green
Write-Host "如需还原：停止 DSH → Copy-Item '$bak' '$asar' -Force" -ForegroundColor DarkGray
