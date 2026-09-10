# Cross-vCenter migration of vra9 from the outer vCenter into the VCF management domain.
param([switch]$PreflightOnly)

$ErrorActionPreference = 'Stop'
# Pin one PowerCLI version: mixing 13.3 and 13.5 breaks Move-VM with
# "Field not found: 'VMware.VimAutomation.Sdk.Util10.VIObjectImpl._connectionId'".
$PCLI = '13.5.0.25380678'
Import-Module VMware.VimAutomation.Sdk    -RequiredVersion $PCLI -ErrorAction Stop | Out-Null
Import-Module VMware.VimAutomation.Common -RequiredVersion $PCLI -ErrorAction Stop | Out-Null
Import-Module VMware.Vim                  -RequiredVersion '9.1.0.25380678' -ErrorAction Stop | Out-Null
Import-Module VMware.VimAutomation.Core   -RequiredVersion $PCLI -ErrorAction Stop | Out-Null
Import-Module VMware.VimAutomation.Vds    -RequiredVersion $PCLI -ErrorAction Stop | Out-Null
Get-Module VMware.* | ForEach-Object { Write-Output ("module {0} {1}" -f $_.Name, $_.Version) }
Set-PowerCLIConfiguration -InvalidCertificateAction Ignore -Scope Session -Confirm:$false | Out-Null
Set-PowerCLIConfiguration -DefaultVIServerMode Multiple -Scope Session -Confirm:$false | Out-Null

$srcVc = '10.0.0.101'; $srcUser = 'administrator@vsphere.local'; $srcPass = 'VMware1!'
$dstVc = '10.0.1.19';  $dstUser = 'administrator@vsphere.local'; $dstPass = 'VMware1!VMware1!'
$vmName = 'vra9'
$dstClusterName = 'm01-cl01'
$dstDsName = 'm01-cl01-ds-vsan01'
$dstPgName = 'SDDC-DPortGroup-VM-Mgmt'

Write-Output "connecting..."
$src = Connect-VIServer -Server $srcVc -User $srcUser -Password $srcPass
$dst = Connect-VIServer -Server $dstVc -User $dstUser -Password $dstPass
Write-Output "src=$($src.Name) $($src.Version)  dst=$($dst.Name) $($dst.Version)"

$vm = Get-VM -Name $vmName -Server $src
Write-Output ("VM {0}: power={1} cpu={2} memGB={3} hw={4} host={5}" -f $vm.Name, $vm.PowerState, $vm.NumCpu, ($vm.MemoryGB), $vm.HardwareVersion, $vm.VMHost.Name)

$cluster = Get-Cluster -Name $dstClusterName -Server $dst
$dstHost = Get-VMHost -Location $cluster -Server $dst | Sort-Object MemoryUsageGB | Select-Object -First 1
$dstDs = Get-Datastore -Name $dstDsName -Server $dst
$dstPg = Get-VDPortgroup -Name $dstPgName -Server $dst
$na = Get-NetworkAdapter -VM $vm

Write-Output ("dest host={0} freeMemGB={1}" -f $dstHost.Name, [math]::Round($dstHost.MemoryTotalGB - $dstHost.MemoryUsageGB,1))
Write-Output ("dest ds={0} freeGB={1}" -f $dstDs.Name, [math]::Round($dstDs.FreeSpaceGB,1))
Write-Output ("dest pg={0}  vm nic={1} (currently {2})" -f $dstPg.Name, $na.Name, $na.NetworkName)
Write-Output ("vm provisionedGB={0} usedGB={1}" -f [math]::Round($vm.ProvisionedSpaceGB,1), [math]::Round($vm.UsedSpaceGB,1))

if ($PreflightOnly) { Write-Output 'PREFLIGHT ONLY - not migrating'; Disconnect-VIServer -Server * -Confirm:$false; exit 0 }

Write-Output "starting Move-VM (this transfers the whole VM across vCenters)..."
$t0 = Get-Date
try {
  Move-VM -VM $vm -Destination $dstHost -Datastore $dstDs -NetworkAdapter $na -PortGroup $dstPg -Confirm:$false -ErrorAction Stop | Out-Null
  Write-Output ("MOVE OK in {0} min" -f [math]::Round(((Get-Date)-$t0).TotalMinutes,1))
} catch {
  Write-Output ("MOVE FAILED: {0}" -f $_.Exception.Message)
  Disconnect-VIServer -Server * -Confirm:$false
  exit 1
}

$moved = Get-VM -Name $vmName -Server $dst
Write-Output ("now on: vCenter={0} host={1} ds={2} power={3}" -f $dst.Name, $moved.VMHost.Name, ((Get-Datastore -VM $moved).Name -join ','), $moved.PowerState)
Disconnect-VIServer -Server * -Confirm:$false
