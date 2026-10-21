param([switch]$Source)
# Smoke-test the *packaged* Windows executable, not just node --check.
# A successful NSIS build alone does not prove that MH Browser can start.
$ErrorActionPreference = 'Stop'
$exe = if ($Source) { Join-Path $PSScriptRoot '..\node_modules\electron\dist\electron.exe' } else { Join-Path $PSScriptRoot '..\dist\win-unpacked\MH Browser.exe' }
$launchArgs = if ($Source) { @('.') } else { @() }
if (-not (Test-Path $exe)) { throw "Packaged browser missing: $exe" }
Write-Host "Launching $exe"
$stdout = Join-Path $env:RUNNER_TEMP 'mh-browser-stdout.txt'
$stderr = Join-Path $env:RUNNER_TEMP 'mh-browser-stderr.txt'
$env:ELECTRON_ENABLE_LOGGING = '1'
$workDir = if ($Source) { Join-Path $PSScriptRoot '..' } else { Split-Path $exe }
$params = @{FilePath=$exe;PassThru=$true;WorkingDirectory=$workDir;RedirectStandardOutput=$stdout;RedirectStandardError=$stderr}
if ($Source) { $params.ArgumentList = '.' }
$process = Start-Process @params
try {
  Start-Sleep -Seconds 15
  $process.Refresh()
  if ($process.HasExited) {
    Write-Host '--- Browser stdout ---'
    if (Test-Path $stdout) { Get-Content $stdout -Tail 70 }
    Write-Host '--- Browser stderr ---'
    if (Test-Path $stderr) { Get-Content $stderr -Tail 100 }
    Write-Host '--- Browser profile diagnostics ---'
    Get-ChildItem (Join-Path $env:APPDATA 'mh-browser-windows') -ErrorAction SilentlyContinue | Select-Object Name,Length | Format-Table
    $log = Join-Path $env:APPDATA 'mh-browser-windows\startup.log'
    if (Test-Path $log) { Get-Content $log -Tail 70 }
    Write-Host '--- Recent Windows application errors ---'
    Get-WinEvent -FilterHashtable @{LogName='Application';Level=2;StartTime=(Get-Date).AddMinutes(-3)} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.Message }
    throw "MH Browser exited during startup (exit code $($process.ExitCode))."
  }
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
  Write-Host ('MH Browser passed 15-second '+$(if($Source){'source Electron'}else{'packaged-app'})+' startup smoke test.')
} finally {
  if (-not $process.HasExited) {
    & taskkill.exe /PID $process.Id /T /F | Out-Null
  }
}
