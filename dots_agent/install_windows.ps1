# Register hourly local worldwide news monitoring (Luna -> Sol).
$ErrorActionPreference = "Stop"
$python = (Get-Command python -ErrorAction Stop).Source
$script = (Resolve-Path (Join-Path $PSScriptRoot "news_watch.py")).Path
if (-not (Test-Path (Join-Path $PSScriptRoot "config.json"))) {
    throw "Copy config.example.json to config.json first"
}
$taskName = "TatsuDotsLuna"
$command = '"' + $python + '" "' + $script + '"'
schtasks.exe /Create /SC HOURLY /MO 1 /TN $taskName /TR $command /F
if ($LASTEXITCODE -ne 0) { throw "Task registration failed" }
Write-Host "Registered hourly news watcher. Open Task Scheduler to verify the trigger."
