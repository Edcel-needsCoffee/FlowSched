$ErrorActionPreference = 'Continue'
$log = 'C:\FLOWSCHED\docker-kill.txt'
if (Test-Path $log) { Remove-Item $log -Force }
function W($m) { $m | Out-File -Append -Encoding ascii $log }

# Docker Desktop's engine (com.docker.backend) is wedged: every lifecycle verb
# hangs and the tray Quit/Restart never respawns it. Force-kill the engine so a
# fresh one can come up. NOTE: this only terminates Docker processes — it does
# NOT remove any container, image or volume.
$names = @(
  'com.docker.backend', 'com.docker.build', 'com.docker.proxy', 'com.docker.dev-envs',
  'Docker Desktop', 'wslrelay', 'vpnkit', 'docker', 'docker-compose', 'com.docker.service'
)

W '=== BEFORE: Docker / WSL processes ==='
$before = Get-Process -Name $names -ErrorAction SilentlyContinue | Sort-Object ProcessName, Id
if ($before) { W (($before | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize | Out-String).Trim()) } else { W 'none found' }

W ''
W '=== KILLING ==='
foreach ($p in $before) {
  try {
    Stop-Process -Id $p.Id -Force -ErrorAction Stop
    W ("killed  {0} (pid {1})" -f $p.ProcessName, $p.Id)
  } catch {
    W ("FAILED  {0} (pid {1}): {2}" -f $p.ProcessName, $p.Id, $_.Exception.Message)
  }
}

Start-Sleep -Seconds 6

W ''
W '=== AFTER ==='
$after = Get-Process -Name $names -ErrorAction SilentlyContinue | Sort-Object ProcessName, Id
if ($after) { W (($after | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize | Out-String).Trim()) } else { W 'none remaining - engine is down' }

'COMPLETE_MARKER_DOCKERKILL' | Out-File -Append -Encoding ascii $log
