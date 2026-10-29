# home lab — vRA 8 (Aria Automation) 除錯 / 狀態修復速查

> 對象：**classic Aria stack** `vra.home.lab` (10.0.0.203, 8.18.1)，由 vRLCM 管理。
> **不是** VCF-integrated 的 VCF Automation（`vcfa.home.lab` .165）。拓樸見
> [`topology/home-lab.md`](../topology/home-lab.md) 的「Classic Aria Suite」節。
>
> 最常見症狀：**appliance ping 得到、SSH(22) 通，但 443 (UI) 連不上 → prelude 服務沒起來**。
> 本案 2026-07-01：prelude namespace 整個空的，用 `deploy.sh` 重新拉起即修復（資料保留）。

## 0. 環境 / 登入

| 項目 | 值 |
|------|----|
| vRA appliance SSH | `root / VMware1!`（單驚嘆號，非 lab 預設雙驚嘆號）|
| vRA UI | configadmin / VMware1! |
| vRLCM | vrlcm.home.lab (10.0.0.201) admin@local / VMware1!（LCM API 曾回 401，未確認）|
| vIDM | vidm.home.lab (10.0.0.202) configadmin / VMware1! |

從 Windows（有 PuTTY）直接下命令 — host key 第一次要先 `echo y` 接受：
```powershell
# 第一次接受 host key
cmd /c 'echo y | plink -ssh -pw "VMware1!" root@10.0.0.203 "hostname"'
# 之後都用 -batch
cmd /c 'plink -ssh -batch -pw "VMware1!" root@10.0.0.203 "<cmd>"'
```

## 1. 快速判斷是不是 prelude 掛了

```bash
# 從任何機器：443 有無回應
curl -sk -m 8 -o /dev/null -w "%{http_code}\n" https://vra.home.lab/   # 000 = 服務沒起來；200 = 正常

# SSH 進 appliance 後：
vracli status deploy                       # "Deployment complete" = 好；"Deployment not complete" = 沒起來
kubectl get nodes                          # node 應為 Ready（control-plane 本身健康）
kubectl -n prelude get pods                # ★關鍵：若 "No resources found" = 服務全沒了 → 根因
kubectl get pods -A | grep -vE "Running|Completed"   # 看整體不健康的 pod
```

判讀：
- `kube-system` 全 Running、`prelude` 空 → 服務被清掉/沒部署 → 見 §3 重新部署。
- `prelude` 有 pod 但卡 `Init` / `CrashLoop` / `ImagePullBackOff` → 見 §4 逐 pod 查。
- node NotReady → 是 k8s/appliance 層問題，先查 §2。

## 2. Appliance 基本健康

```bash
uptime                                     # 剛開機(<10min)服務還在起是正常的，等即可
df -h / /data                              # / 或 /data 滿會讓服務起不來（本案 / 38% /data 21% 正常）
free -m                                    # 記憶體
systemctl status kubelet docker            # 底層 runtime
```

## 3. 修復：重新部署所有 prelude 服務（非破壞性）

**這是 prelude 空 / 服務起不來的標準修法，會保留 Postgres 資料。**

```bash
# ★ 不要加 --deleteDatabases（清 DB）或 --shutdown（只關不開）
nohup /opt/scripts/deploy.sh > /var/log/vra-redeploy.log 2>&1 &

# 監看（全程約 20–25 分鐘）
tail -f /var/log/vra-redeploy.log
watch "kubectl -n prelude get pods | grep -vE '1/1|2/2|3/3|Completed' | wc -l"   # 剩幾個沒好
```

部署階段順序（知道這個就不會誤判「卡住」）：
1. `Tear down existing deployment`（會先 sleep 120s）
2. 基礎：`postgres-0` / `rabbitmq-ha-0` / `redis-node-0` / `contour`+`envoy`(ingress)
3. 核心服務：catalog / provisioning / idem / vco / codestream / abx / approval…
4. **`ccs-k3s`** — 相依鏈最深，init 容器會等其他服務就緒，**卡在 Init 5~10 分鐘是正常的**，不是死。
5. **UI tier**（最後一批）：landing-ui / identity-ui / catalog-ui / cloud-automation-ui / dashboard / `nginx-httpd`…
6. 收尾：把 `prelude-vaconfig` 的 `deploy.ready` 從 `false` 翻成 `true` → **此時 443 才對外開**。

> ⚠️ 在 deploy 收尾前 443 一直回 000 是**正常**的，別以為失敗、也別手動去戳/重開。等 `deploy.sh` 程序自己結束。

## 4. 逐 pod 查為何卡住

```bash
# 某 pod 卡 Init：看它在等哪個相依 / 缺什麼
kubectl -n prelude describe pod <pod> | sed -n '/Events:/,$p' | tail -20
kubectl -n prelude describe pod <pod> | sed -n '/Init Containers:/,/^Conditions:/p'
# init 容器 log（depcheck 會列它在等的服務）
kubectl -n prelude logs <pod> -c <init-container-name>
# 主容器 log
kubectl -n prelude logs <pod> --tail=100
```
- 常見「假卡住」：`describe` 的 pod AGE 顯示 11m，但 Events 最後幾行是 12s 前才 `Started container` → 其實剛通過相依、正在起，等即可。

## 5. 驗證修復完成

```bash
vracli status deploy                                                   # Deployment complete
kubectl -n prelude get vaconfig prelude-vaconfig -o jsonpath='{.spec.deploy.ready}'  # true
kubectl -n prelude get pods | grep -vE "1/1|2/2|3/3|Completed"         # 應為空
curl -sk https://vra.home.lab/ -o /dev/null -w "%{http_code}\n"        # 200（title: VMware Cloud Services）
curl -sk https://vra.home.lab/automation/ -o /dev/null -w "%{http_code}\n"  # 200
```
全綠即代表 vRA UI 恢復，可用 configadmin / VMware1! 登入。

## 6. 其他常用 vracli

```bash
vracli service status                # 各服務狀態
vracli version                       # 版本
/opt/scripts/deploy.sh --help        # 部署選項（--multiDb / --withHttpProxy / --deleteDatabases…）
/opt/scripts/svc-stop.sh --force     # 只停服務（deploy.sh --shutdown 走的就是這支）
```

---
*首次撰寫：2026-07-01，依當次「prelude 空 → deploy.sh 修復成功（55 pod 全 Ready）」的實作歷程整理。*
