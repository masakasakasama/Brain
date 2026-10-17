# Run this once in PowerShell as your normal Windows account.
# It registers an hourly run, not a 24/7 OpenAI API session.
$ErrorActionPreference = "Stop"
$python = (Get-Command python -ErrorAction Stop).Source
$script = (Resolve-Path (Join-Path $PSScriptRoot "agent.py")).Path
if (-not (Test-Path (Join-Path $PSScriptRoot "config.json"))) {
    throw "Copy config.example.json to config.json and edit it before installing"
}
$taskName = "TatsuDotsLuna"
$command = '"' + $python + '" "' + $script + '"'
schtasks.exe /Create /SC HOURLY /MO 1 /TN $taskName /TR $command /F
if ($LASTEXITCODE -ne 0) { throw "Task registration failed" }
Write-Host "Task created: $taskName. Check Windows Task Scheduler History for executions."
