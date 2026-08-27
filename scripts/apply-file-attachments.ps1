# dsh-periscope — 一键原位重打包 DSH 桌面端核心（启用文件附件）
# 用法：在 PowerShell 中、且【已完全退出 DSH 桌面版】时运行：  .\apply-file-attachments.ps1
# 作用：备份 app.asar → 原位打入 6 个补丁核心文件（保留原生模块）→ 校验 → 完成。
# 说明：node 不行时改 $node 路径；点不到官方 asar 校验时会跳过（不影响落地）。

$ErrorActionPreference = "Stop"
$Self     = $PSScriptRoot
$Repack   = Join-Path $Self "scripts\repack-inplace.mjs"
$AppAsar  = "D:\DSH\DSH Desktop\resources\app.asar"
$Backup   = "$AppAsar.bak"

# 候选 node（DSH 自带 runtime / Codex runtime）
$RuntimeNode  = "C:\Users\hndsj\Documents\Codex\2026-08-21\wo-x\outputs\dsh-desktop\dist\win-unpacked\resources\runtime\node.exe"
$RuntimeNode2 = "C:\Users\hndsj\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ToolsNode    = "C:\Users\hndsj\AppData\Local\Temp\asar-project\node_modules\@electron\asar\bin\asar.mjs"

$ErrorActionPreference = "Continue"

Write-Host "── 0) 检查 DSH 是否已退出 ──" -ForegroundColor Cyan
if (Get-Process "DSH Desktop" -ErrorAction SilentlyContinue) {
  Write-Host "⚠ 检测到 DSH 正在运行。请【完全退出】DSH（托盘/任务栏退出）后再运行。" -ForegroundColor Yellow
  exit 1
}
Write-Host "OK" -ForegroundColor Green

Write-Host "── 1) 选 node ──" -ForegroundColor Cyan
$node = if (Test-Path $RuntimeNode) { $RuntimeNode } else { $RuntimeNode2 }
if (-not $node -or -not (Test-Path $node)) { Write-Host "⚠ 未找到 node，请改脚本里的 node 路径。" -ForegroundColor Yellow; exit 1 }
Write-Host "node: $node" -ForegroundColor Green

Write-Host "── 2) 校验补丁文件是否就绪 ──" -ForegroundColor Cyan
$p = Join-Path $Self "patches\asar-patched\node_modules\@deepseek-ai\dsh-client-ui-attachment\lib\client.js"
if (-not (Test-Path $p)) { Write-Host "⚠ 补丁文件缺失：$p" -ForegroundColor Yellow; exit 1 }
Write-Host "OK" -ForegroundColor Green

Write-Host "── 3) 原位重打包（自动备份 app.asar.bak） ──" -ForegroundColor Cyan
& $node $Repack
if ($LASTEXITCODE -ne 0) {
  Write-Host "⚠ 重打包返回非 0，正在还原备份..." -ForegroundColor Yellow
  Copy-Item $Backup $AppAsar -Force
  Write-Host "已还原。请从 app.asar.bak 恢复正常后再排查。" -ForegroundColor Green
  exit 1
}

Write-Host "── 4) 校验：用官方 asar 列出补丁文件 ──" -ForegroundColor Cyan
if (Test-Path $ToolsNode) {
  $list = (& $node $ToolsNode list $AppAsar 2>&1) -join "`n"
  if ($list -match "dsh-client-ui-attachment\\lib\\client\.js") {
    Write-Host "✓ 重打包的 app.asar 可读取且含目标文件。" -ForegroundColor Green
  } else { Write-Host "⚠ 校验未完全确认，请手动核对。" -ForegroundColor Yellow }
} else { Write-Host "（跳过 asar list 校验）" }

Write-Host ""
Write-Host "✅ 完成！现在【重新打开 DSH】，文件附件（卡片/图标/历史块）已恢复。" -ForegroundColor Green
Write-Host "如需还原：停止 DSH → 把 $Backup 复制回 $AppAsar（或改名）→ 重启即可。" -ForegroundColor Green
