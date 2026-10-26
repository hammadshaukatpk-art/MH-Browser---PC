$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot '..\dist\win-unpacked\MH Browser.exe'
if (-not (Test-Path $exe)) { throw "Missing packaged browser: $exe" }
$log = Join-Path $env:APPDATA 'mh-browser-windows\startup.log'
if (Test-Path $log) { Remove-Item $log -Force }
$process = Start-Process -FilePath $exe -ArgumentList '--mh-smoke-navigation' -WorkingDirectory (Split-Path $exe) -PassThru
try {
  if (-not $process.WaitForExit(45000)) { throw 'Navigation smoke test timed out after 45 seconds' }
  $process.Refresh()
  if (Test-Path $log) { Get-Content $log -Tail 50 }
  if ($process.ExitCode -ne 0) { throw "Navigation smoke test failed (exit $($process.ExitCode))" }
  if (-not (Test-Path $log) -or (Get-Content $log -Raw) -notmatch 'Navigation smoke passed') {
    throw 'Browser did not confirm navigation smoke test success'
  }
  Write-Host 'Cross-site hyperlink, same-tab navigation and Back test passed.'
} finally {
  if (-not $process.HasExited) { & taskkill.exe /PID $process.Id /T /F | Out-Null }
}
