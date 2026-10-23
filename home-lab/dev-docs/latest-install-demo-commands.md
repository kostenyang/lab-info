# VCF 9.1 只載最新 install + installer 驗證 — 實跑指令

## ① depot 機 (ubuntu-dltest 10.0.0.48): 只下每元件最新一版 INSTALL
TOOL=/depot/tools0400/bin/vcf-download-tool ; TOK=/depot/token.txt
IDS="66f04518-81ff-51e8-a3d7-ca2ecc26b551,14d332b9-f0b4-5108-8b2f-420bbc096457,d562377e-7bec-5038-ac46-5a725e064212,cfdc3829-f065-50ec-8c4e-2c2fc85ccc56,ab083645-176d-5188-9c67-3b4d541b55b3,95acbc11-298a-51c2-9b0e-e0668b8ef5e8,5ec20707-1fe6-5153-b82f-42c0b2ff7a93,44df4ed7-02cd-5fa5-ae7f-f22d3bed2676,7898fdb2-eda2-57c1-8d92-4bcf738ef1a8,2df5c4ae-525f-5434-b04f-0be3386e9018,d0d5bea0-c8a5-5a11-a398-19f23eb30291,2c8b793b-4118-5a7d-b491-8abcba93bc93,dd4035ec-0e66-5120-97a6-25522734,1bdd5fa9-479e-5643-9931-47be8861d315,a9c4f223-bfe9-5070-ac77-6f93a7eea2b3,595a7224-19bd-5df8-af17-bfcf14c6f180"
$TOOL binaries download -d=/depot --depot-download-token-file=$TOK --id=$IDS --ceip=DISABLE
cd /depot && nohup python3 -m http.server 8888 --bind 0.0.0.0 &

## 挑「每元件最新版」id 的方法: 先列 install 集, 每元件取最高版
$TOOL binaries list --vcf-version=9.1.0.0 --sku=VCF --automated-install --type=INSTALL --depot-download-token-file=$TOK --ceip=DISABLE

## ② installer (10.0.0.71): 設 depot + 觸發 + 驗證
INST=10.0.0.71
TOK=$(curl -sk -X POST https://$INST/v1/tokens -H 'Content-Type: application/json' -d '{"username":"admin@local","password":"VMware1!VMware1!"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
curl -sk -X PUT https://$INST/v1/system/settings/depot -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"depotConfiguration":{"isOfflineDepot":true,"url":"http://10.0.0.48:8888"}}'
for id in ${IDS//,/ }; do curl -sk -X PATCH https://$INST/v1/bundles/$id -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"bundleDownloadSpec":{"downloadNow":true}}'; done
for id in ${IDS//,/ }; do curl -sk https://$INST/v1/bundles/$id -H "Authorization: Bearer $TOK" | grep -o '"downloadStatus":"[^"]*"'; done
# 磁碟實體檔: ls /nfs/vmware/vcf/nfs-mount/bundle/<id>/
