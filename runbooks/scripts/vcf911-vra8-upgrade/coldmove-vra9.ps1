# Cold cross-vCenter migration of vra9 into the VCF management domain.
# Hot vMotion is impossible: the nested hosts lack CPU features the running VM requires
# (misc.ibrs_all / misc.mds_no / misc.rdcl_no / misc.rsba_no / cpuid.xsaves).
$ErrorActionPreference = 'Stop'
$PCLI = '13.5.0.25380678'
Import-Module VMware.VimAutomation.Sdk    -RequiredVersion $PCLI | Out-Null
Import-Module VMware.VimAutomation.Common -RequiredVersion $PCLI | Out-Null
Import-Module VMware.Vim                  -RequiredVersion '9.1.0.25380678' | Out-Null
Import-Module VMware.VimAutomation.Core   -RequiredVersion $PCLI | Out-Null
Import-Module VMware.VimAutomation.Vds    -RequiredVersion $PCLI | Out-Null
Set-PowerCLIConfiguration -InvalidCertificateAction Ignore -Scope Session -Confirm:$false | Out-Null
Set-PowerCLIConfiguration -DefaultVIServerMode Multiple -Scope Session -Confirm:$false | Out-Null

$src = Connect-VIServer -Server '10.0.0.101' -User 'administrator@vsphere.local' -Password 'VMware1!'
$dst = Connect-VIServer -Server '10.0.1.19'  -User 'administrator@vsphere.local' -Password 'VMware1!VMware1!'
$stamp = { (Get-Date).ToString('HH:mm:ss') }

$vm = Get-VM -Name 'vra9' -Server $src
Write-Output "$(&$stamp) start: power=$($vm.PowerState) host=$($vm.VMHost.Name)"

# 1. graceful guest shutdown
if ($vm.PowerState -eq 'PoweredOn') {
  Write-Output "$(&$stamp) shutting down guest..."
  try { Stop-VMGuest -VM $vm -Confirm:$false -ErrorAction Stop | Out-Null }
  catch { Write-Output "$(&$stamp) Stop-VMGuest failed ($($_.Exception.Message)); will wait anyway" }
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 10
    $vm = Get-VM -Name 'vra9' -Server $src
    if ($vm.PowerState -eq 'PoweredOff') { break }
  }
  if ($vm.PowerState -ne 'PoweredOff') {
    Write-Output "$(&$stamp) guest still on after 10 min - forcing power off"
    Stop-VM -VM $vm -Confirm:$false | Out-Null
    Start-Sleep -Seconds 15
    $vm = Get-VM -Name 'vra9' -Server $src
  }
}
Write-Output "$(&$stamp) power state now: $($vm.PowerState)"

# 2. cold cross-vCenter relocate
$cluster = Get-Cluster -Name 'm01-cl01' -Server $dst
$dstHost = Get-VMHost -Location $cluster -Server $dst | Sort-Object MemoryUsageGB | Select-Object -First 1
$dstDs   = Get-Datastore -Name 'm01-cl01-ds-vsan01' -Server $dst
$dstPg   = Get-VDPortgroup -Name 'SDDC-DPortGroup-VM-Mgmt' -Server $dst
$na      = Get-NetworkAdapter -VM $vm

Write-Output "$(&$stamp) relocating to $($dstHost.Name) / $($dstDs.Name) / $($dstPg.Name) ..."
$t0 = Get-Date
try {
  Move-VM -VM $vm -Destination $dstHost -Datastore $dstDs -NetworkAdapter $na -PortGroup $dstPg -Confirm:$false -ErrorAction Stop | Out-Null
  Write-Output ("$(&$stamp) RELOCATE OK in {0} min" -f [math]::Round(((Get-Date)-$t0).TotalMinutes,1))
} catch {
  Write-Output "$(&$stamp) RELOCATE FAILED: $($_.Exception.Message)"
  Disconnect-VIServer -Server * -Confirm:$false
  exit 1
}

# 3. power on at the destination
$moved = Get-VM -Name 'vra9' -Server $dst
Write-Output "$(&$stamp) now on host $($moved.VMHost.Name), datastore $((Get-Datastore -VM $moved).Name -join ',')"
try {
  Start-VM -VM $moved -Confirm:$false | Out-Null
  Write-Output "$(&$stamp) powered on"
} catch {
  Write-Output "$(&$stamp) POWER ON FAILED: $($_.Exception.Message)"
  Disconnect-VIServer -Server * -Confirm:$false
  exit 2
}

for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 20
  $moved = Get-VM -Name 'vra9' -Server $dst
  $ip = $moved.Guest.IPAddress -join ','
  Write-Output "$(&$stamp) power=$($moved.PowerState) ip=$ip"
  if ($ip -match '10\.0\.0\.168') { Write-Output 'GUEST IP OK'; break }
}
Disconnect-VIServer -Server * -Confirm:$false
