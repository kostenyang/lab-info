<#
.SYNOPSIS
    以 remote debugging 模式啟動一個「獨立的」Chrome,給 cdp-shot.mjs 用。

.DESCRIPTION
    用獨立的 --user-data-dir,所以:
      - 不會干擾使用者正在用的 Chrome(不同 profile,兩者可並存)
      - 登入 VCF UI 的 session 會保存在這個 profile,之後截圖不用重登
    --ignore-certificate-errors 是必要的:lab 的 VCF 元件全是自簽憑證。
#>
[CmdletBinding()]
param(
    [int]    $Port        = 9222,
    [string] $UserDataDir = 'E:\9.1\tools\cdp-profile',
    [string] $WindowSize  = '1600,1000',
    [switch] $Headless,
    [switch] $Restart
)
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { throw "找不到 Chrome: $chrome" }

$alive = $false
try { $alive = (Invoke-WebRequest "http://127.0.0.1:$Port/json/version" -TimeoutSec 3 -UseBasicParsing).StatusCode -eq 200 } catch {}

if ($alive -and $Restart) {
    Get-Process chrome -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -eq $chrome -and (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -like "*--remote-debugging-port=$Port*" } |
      Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2; $alive = $false
}
if ($alive) { Write-Output "CDP 已在跑 (port $Port)"; return }

New-Item -ItemType Directory -Force $UserDataDir | Out-Null
$a = @(
  "--remote-debugging-port=$Port"
  "--user-data-dir=$UserDataDir"
  '--remote-allow-origins=*'
  '--ignore-certificate-errors'
  '--no-first-run','--no-default-browser-check'
  '--disable-features=Translate,OptimizationGuideModelDownloading'
  "--window-size=$WindowSize"
)
if ($Headless) { $a += '--headless=new' }
$a += 'about:blank'
Start-Process -FilePath $chrome -ArgumentList $a | Out-Null

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 700
    try {
        $v = Invoke-WebRequest "http://127.0.0.1:$Port/json/version" -TimeoutSec 3 -UseBasicParsing
        if ($v.StatusCode -eq 200) { Write-Output "CDP 就緒 port $Port — $(($v.Content | ConvertFrom-Json).Browser)"; return }
    } catch {}
}
throw "Chrome 起來了但 CDP port $Port 沒回應"
