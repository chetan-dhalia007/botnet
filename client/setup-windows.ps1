# Install bot as a background process on Windows (Simple version)
$exePath = Join-Path (Get-Location) "bot-windows.exe"
$taskName = "BotDaemon"

# Create a scheduled task to run at startup and in background
$action = New-ScheduledTaskAction -Execute $exePath
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force

Start-ScheduledTask -TaskName $taskName
Write-Host "Bot scheduled to run in background."
