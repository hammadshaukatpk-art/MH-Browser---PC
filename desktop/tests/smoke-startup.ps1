# Smoke-test the *packaged* Windows executable, not just node --check.
# A successful NSIS build alone does not prove that MH Browser can start.
$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot '..\dist\win-unpacked\MH Browser.exe'
if (-not (Test-Path $exe)) { throw "Packaged browser missing: $exe" }
Write-Host "Launching $exe"
$process = Start-Process -FilePath $exe -PassThru -WorkingDirectory (Split-Path $exe)
try {
  Start-Sleep -Seconds 15
  $process.Refresh()
  if ($process.HasExited) { throw "MH Browser exited during startup (exit code $($process.ExitCode))." }
  $log = Join-Path $env:APPDATA 'mh-browser-windows\startup.log'
  if (Test-Path $log) {
    Write-Host '--- MH Browser startup log ---'
    Get-Content $log -Tail 30
    $contents = Get-Content $log -Raw
    if ($contents -match 'Fatal initialization error|Fallback home tab failed|Uncaught exception') {
      throw 'MH Browser reported a fatal startup error.'
    }
    if ($contents -notmatch 'Browser initialized with') {
      throw 'MH Browser did not complete browser-tab initialization.'
    }
  } else {
    Write-Warning "Expected startup log not found at $log; browser process stayed running."
  }
  Write-Host 'MH Browser passed 15-second packaged-app startup smoke test.'
} finally {
  if (-not $process.HasExited) {
    & taskkill.exe /PID $process.Id /T /F | Out-Null
  }
}
