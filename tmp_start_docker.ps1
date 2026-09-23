$ErrorActionPreference = 'Continue'
$log = 'C:\FLOWSCHED\docker-start.txt'
if (Test-Path $log) { Remove-Item $log -Force }
function W($m) { $m | Out-File -Append -Encoding ascii $log }

# Guarded so a half-up engine can never hang this script.
function DockerInfo([int]$capSec) {
  $j = Start-Job { (docker info --format '{{.ServerVersion}}' 2>&1 | Out-String) }
  if (Wait-Job $j -Timeout $capSec) {
    $r = ((Receive-Job $j) -join '').Trim()
  } else {
    $r = 'TIMEOUT'
    Stop-Job $j -ErrorAction SilentlyContinue
  }
  Remove-Job $j -Force -ErrorAction SilentlyContinue
  return $r
}

$exe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
W "Docker Desktop.exe present: $(Test-Path $exe)"

$running = @(Get-Process -Name 'com.docker.backend', 'Docker Desktop' -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  W "already running: $(($running | ForEach-Object { $_.ProcessName + '(' + $_.Id + ')' }) -join ', ')"
} elseif (Test-Path $exe) {
  Start-Process -FilePath $exe
  W 'launched Docker Desktop'
} else {
  W 'ERROR: Docker Desktop.exe not found - cannot relaunch'
}

W ''
W '=== waiting for the engine (docker info ServerVersion) ==='
$t0 = Get-Date
$ready = $false
while ((Get-Date) -lt $t0.AddSeconds(150)) {
  Start-Sleep -Seconds 5
  $v = DockerInfo 15
  W ("t+{0,3}s : {1}" -f [int]((Get-Date) - $t0).TotalSeconds, $v)
  if ($v -match '^\d+\.\d+') { $ready = $true; break }
}

W ''
W "ENGINE_READY=$ready"
$be = @(Get-Process -Name 'com.docker.backend', 'wslrelay' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime)
if ($be) { W (($be | Format-Table -AutoSize | Out-String).Trim()) } else { W 'backend processes: none' }

'COMPLETE_MARKER_DOCKERSTART' | Out-File -Append -Encoding ascii $log
