/* 方案 B：VCF Automation 9.1.1 升級假失敗後 fleet 帳面手動補完（lab-only，非官方） */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, ImageRun
} = require('docx');

const SHOTS = 'E:\\9.1\\doc-shots\\vrops-upgrade';
const OUT   = 'E:\\9.1\\VCFA-911-Fleet-Record-Manual-Fix-OptionB.docx';
const C = { blue: '1F4E79', gray: '595959', red: 'C00000', green: '2E7D32', amber: '9C6500' };

const H1 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
const P = (t, o) => { o = o || {}; return new Paragraph({
  children: [new TextRun({ text: t, size: o.size || 21, bold: o.bold, color: o.color, italics: o.italics })],
  spacing: { after: 100 }, alignment: o.align }); };
const CODE = t => new Paragraph({
  children: t.split('\n').map((line, i) => new TextRun({ text: line, font: 'Consolas', size: 17, break: i === 0 ? 0 : 1 })),
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' }, spacing: { before: 60, after: 60 }, indent: { left: 200 } });
const BULLET = t => new Paragraph({ children: [new TextRun({ text: t, size: 21 })], bullet: { level: 0 }, spacing: { after: 60 } });
const NOTE = (t, color, fill) => new Paragraph({
  children: [new TextRun({ text: t, size: 20, color: color || C.red, bold: true })],
  shading: { type: ShadingType.CLEAR, fill: fill || 'FFF2CC' }, spacing: { before: 80, after: 80 }, indent: { left: 100 } });

function table(headers, rows, widths) {
  const hdr = new TableRow({ tableHeader: true, children: headers.map((h, i) => new TableCell({
    width: { size: widths[i], type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: C.blue },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 19 })] })] })) });
  const body = rows.map(r => new TableRow({ children: r.map((c, i) => new TableCell({
    width: { size: widths[i], type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: String(c), size: 18 })] })] })) }));
  return new Table({ rows: [hdr].concat(body), width: { size: 100, type: WidthType.PERCENTAGE } });
}
let figNo = 0;
function figure(file, caption, h) {
  const p = path.join(SHOTS, file); const out = []; figNo++;
  if (fs.existsSync(p)) out.push(new Paragraph({
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(p), transformation: { width: 620, height: h || 340 } })],
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 } }));
  else out.push(new Paragraph({ children: [new TextRun({ text: '[ 缺圖:' + file + ' ]', italics: true, color: C.gray, size: 18 })] }));
  out.push(new Paragraph({ children: [new TextRun({ text: '圖 ' + figNo + '　' + caption, size: 18, color: C.gray })],
    alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
  return out;
}

const body = [];
body.push(new Paragraph({ children: [new TextRun({ text: '方案 B：VCF Automation 9.1.1 升級「假失敗」後的 fleet 帳面手動補完', bold: true, size: 36, color: C.blue })], spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER }));
body.push(P('實驗室驗證程序（非官方，僅供技術驗證）', { align: AlignmentType.CENTER, size: 24, color: C.gray }));
body.push(P('環境：home.lab　·　VCF 9.1.1 fleet　·　runtime 叢集 vcf-m02-auto-platform　·　2026-09-10', { align: AlignmentType.CENTER, size: 20, color: C.gray }));
body.push(NOTE('本文件描述的程序未經原廠認可。官方立場（KB 441333）：VCF Automation Upgrade Failure cleanup is not supported → 正式處理方式為開立支援案件（方案 A）。客戶環境請勿直接套用。', C.red, 'FDE9E7'));

/* 1 */
body.push(H1('1. 適用情境與判斷依據'));
body.push(P('vRA 8.18 → VCF Automation 9.1.1 藍綠升級，fleet 任務因部署階段超過 ComponentVersion 定義的 2 小時逾時而被判定失敗（VCFMS-UPGRADE-COMPONENT-031），但底層部署其實已完成並完成切換。方案 B 只在下列四項證據全部成立時才考慮：'));
body.push(table(['證據', '查法', '期望結果'], [
  ['新叢集套件部署完成', 'runtime 節點 kubectl get pd -A', 'vcfa-bundle Successful；prelude 62 個 pod Running'],
  ['已完成切換', '來源 vra9 VM 電源狀態；VIP / FQDN 歸屬', '來源 poweredOff；新閘道接管 10.0.0.168 / vra9.home.lab'],
  ['9.x 端點指紋', 'GET /tm/api-explorer/provider/cloudapi.json', '200（8.x 無此路徑）'],
  ['資料完整', '/blueprint/api/blueprints、/deployment/api/deployments', '藍圖 / 部署 / 機器數量與升級前一致'],
], [22, 38, 40]));
body.push(P(''));
body.push(P('同時內建重試已用盡：列上 UPGRADE 會另建執行並回 404「No matching source version found for source 8.0.0 within catalog 9.1」；Tasks 分頁的 Retry 重跑整段 8.x 初始化，撞上「Exceeded the maximum number of permitted snapshots」後任務標記 retriable=false。'));
body.push(...figure('900-vcfa-upgrade-failed-row.png', 'fleet 將元件記為佔位版本 8.0.0 → 9.1.1.0，並顯示 Upgrade failed'));
body.push(...figure('904-vcfa-k8s-bundle-successful.png', '證據：新叢集 vcfa-bundle 套件部署 Successful，62 個容器 Running'));
body.push(...figure('914-tasks-after-retry-failed.png', '重試失敗後 Retry 連結消失，內建手段用盡'));
body.push(P('失敗任務停在的兩個 Pending 階段正是官方流程的最後兩步：unmount-vmdks-from-target-environment 與 Patch the target Component Version。方案 B 的本質就是手動完成這兩步，再讓 fleet 帳面對齊。', { bold: true }));

/* 2 */
body.push(H1('2. 備份'));
body.push(CODE([
  '# runtime 叢集（10.0.0.242）',
  'export KUBECONFIG=/etc/kubernetes/admin.conf',
  'kubectl get comp vcfa -o yaml > backup-comp-vcfa-runtime.yaml',
  'govc device.ls -vm vcf-m02-auto-platform-ktdgw > runtime-node-disks-before.txt',
  '',
  '# mgmt 叢集（10.0.0.227）',
  'kubectl get comp vcfa -o yaml > backup-comp-vcfa-mgmt.yaml',
  'kubectl -n vcf-fleet-lcm exec vcf-fleet-lcm-db-0 -c postgres -- psql -U postgres -d vcffleetlcmdb -At \\',
  '  -c "select component_type,status,version,deployment_type,size from component order by 1"',
  'kubectl -n vcf-sddc-lcm exec vcf-sddc-lcm-db-0 -c postgres -- psql -U postgres -d vcfsddclcmdb -At \\',
  '  -c "select component_type,version,deployment_type,size from component order by 1"'].join('\n')));
body.push(P('補完前 fleet DB 狀態：VCFA = Unknown / 8.0.0 / VSP / small；其餘 10 個元件全部 Running / 9.1.1.*。8.0.0 是匯入 8.x 時設定的佔位版本，正常情況由最後階段改寫。'));
body.push(...figure('915-optionB-before-components-8.0.0.png', '補完前：Components 分頁的 VCF Automation 仍顯示 8.0.0'));

/* 3 */
body.push(H1('3. 五個步驟'));
body.push(H2('步驟 ① 拆除來源資料碟（對應官方 dag-unmount-disk）'));
body.push(P('盤點：runtime 節點只剩一顆來源碟 disk-1000-14（pvscsi-1000 unit 14）= vra9_1-000002.vmdk（144 GB）；guest 內為 /dev/sdn → LVM data_vg/data 掛在 /vra-db（唯讀），無程序開檔、fstab 無條目，代表資料遷移已完成、純屬殘留。'));
body.push(CODE([
  '# 節點內',
  'sudo umount /vra-db',
  'sudo vgchange -an data_vg            # LV 轉 inactive',
  '',
  '# govc 指向 vcf-m02 vCenter',
  'govc device.remove -vm vcf-m02-auto-platform-ktdgw -keep disk-1000-14',
  '#   -keep：只從 VM 移除、不刪 vmdk；來源 vra9 四顆磁碟完整保留',
  'govc device.ls -vm vcf-m02-auto-platform-ktdgw | grep -c vra9_   # 期望 0'].join('\n')));

body.push(H2('步驟 ② runtime 叢集 comp vcfa 改版（對應官方 Patch the target Component Version）'));
body.push(CODE([
  `kubectl patch comp vcfa --type merge -p '{"spec":{"versionRef":{"name":"vcfa-9.1.1.0.25714559"}}}'`,
  'kubectl label comp vcfa component.vmsp.vmware.com/version=9.1.1.0.25714559 --overwrite',
  `kubectl patch comp vcfa --subresource=status --type merge -p '{"status":{"phase":"Running"}}'`,
  'kubectl get comp vcfa        # 期望 vcfa-9.1.1.0.25714559 / Running'].join('\n')));
body.push(BULLET("第三行必要：vmsp-operator 只在 phase 為空時填 Unknown（log：phase is not set, set to 'Unknown'），不會自行判定 Running；patch 後 operator 亦不覆寫。"));
body.push(BULLET('ComponentVersion vcfa-9.1.1.0.25714559 的 spec 即 timeout: 2h 與 size small = 24 vCPU / 96 GiB 的來源。'));

body.push(H2('步驟 ③ mgmt 叢集殘留的 comp vcfa 同步'));
body.push(P('import_vcfa_on_mgmt_vsp_cluster 階段在 mgmt VSP 叢集也留有一份 comp vcfa（versionRef vcfa-8.0.0、phase Unknown）。同步改成 9.1.1，避免後續 refresh 從 mgmt 側讀回 8.0.0；phase 留 Unknown 即可。'));
body.push(CODE([
  '# 10.0.0.227',
  `kubectl patch comp vcfa --type merge -p '{"spec":{"versionRef":{"name":"vcfa-9.1.1.0.25714559"}}}'`,
  'kubectl label comp vcfa component.vmsp.vmware.com/version=9.1.1.0.25714559 --overwrite'].join('\n')));

body.push(H2('步驟 ④ fleet 觸發 Refresh'));
body.push(CODE([
  'POST /vcf-operations/plug/fleet-lcm/v1/sddc-lcms/ec07a1b0-0468-4cc3-b4e7-6825206918ee/refresh   → 202',
  'task REFRESH_SDDC_LCM_WORKFLOW',
  '  update_fleet_depot_spec_ref → check_if_propagate_fds_data_to_vcfa_task_needed_ref',
  '  → prepare_refresh_input_ref → persist_sddc_lcm_components_ref                     → SUCCEEDED'].join('\n')));
body.push(P('同步鏈（log 實證）：sddc-build-service 的 RefreshComponentAction 直接向 runtime 叢集的 VMSP API（GET https://vcf-m02-auto-platform.home.lab/api/v1/components?type=vcfa）取回元件 → sddc-lcm DB 的 VCFA 列自動變 9.1.1.0.25714559；fleet-build 的 PersistSddcLcmComponentsAction 把 fleet DB 的 status 由 Unknown 改為 Running。'));
body.push(NOTE('但 fleet DB 的 version 不會被 refresh 同步（僅由升級 finalizer 或匯入寫入），UI 仍顯示 8.0.0 → 9.1.1.0.25714559 / Upgrade failed。', C.amber));
body.push(...figure('916-optionB-refresh-triggered.png', 'Refresh 任務已觸發'));
body.push(...figure('918-optionB-upgrade-tab-after-refresh.png', 'Refresh 完成後：status 已同步為 Running，但版本仍為 8.0.0'));

body.push(H2('步驟 ⑤ 直接修正 fleet DB（最後手段）'));
body.push(CODE([
  'kubectl -n vcf-fleet-lcm exec vcf-fleet-lcm-db-0 -c postgres -- psql -U postgres -d vcffleetlcmdb -At -c \\',
  ` "update component set version='9.1.1.0.25714559'`,
  `   where component_id='38eb20b2-85f2-3b51-a6b1-5115cc7f671f' and component_type='VCFA' and version='8.0.0'"`,
  '# UPDATE 1  → VCFA | Running | 9.1.1.0.25714559 | VSP | small'].join('\n')));
body.push(P('upgrade_plan_component 不需修改，由 plan sync 自動重算。'));

/* 4 */
body.push(H1('4. 驗證結果'));
body.push(table(['位置', '結果'], [
  ['fleet API GET /v1/components', 'VCFA = 9.1.1.0.25714559 / Running'],
  ['Ops › Lifecycle › Upgrade 分頁', '0 列，All components are at their target versions'],
  ['Ops › Components 分頁', 'VCF Automation 9.1.1.0.25714559'],
  ['sddc-lcm DB', 'VCFA 9.1.1.0.25714559'],
  ['runtime 叢集', 'comp vcfa 9.1.1.0.25714559 Running；vcfa-bundle Successful；62 pods Running'],
  ['產品服務', '/automation/ 200、/tm/api-explorer 200；藍圖 3 / 部署 1 / 機器 52 完整'],
], [34, 66]));
body.push(...figure('919-optionB-upgrade-tab-after-db-fix.png', '補完後：All components are at their target versions'));
body.push(...figure('920-optionB-components-911.png', 'Components 分頁的 VCF Automation 顯示 9.1.1.0.25714559'));
body.push(...figure('907-vcfa911-automation-console.png', '產品面：登入 9.1.1 主控台，遷移後的資料完整'));

/* 5 */
body.push(H1('5. 已知限制'));
body.push(BULLET("fleet 對 VCFA 沒有 service account／憑證：fleet-build log 出現「Successfully retrieved 0 svc accounts for component type: VCFA」、「VCFA endpoint cannot be constructed: FQDN='vra9.home.lab', credentials available=false」、「CREATE_PERSIST_VCFA_SERVICE_ACCOUNT_TASK: Component ID is null, skipping VCFA credential persistence」。正常升級的 reimport 才會建立；fleet 之後對 VCFA 的整合動作（傳播倉儲設定、後續生命週期）可能受限。"));
body.push(BULLET('fleet 的 VCFA 紀錄把自己的閘道 FQDN 當成 consumption VSP 叢集（vspCluster.id = component id、nodes 為空），與正常匯入的 9.x 元件結構不同。'));
body.push(BULLET('殘留：prelude 內重試失敗的 vcfa-upgrade-80-entrypoint-*-execute-script pod（Error，無害）；來源 vra9 上兩個快照（pre-kb425489、automated_vcf_backup_*）。'));

/* 6 */
body.push(H1('6. 回退'));
body.push(table(['步驟', '回退方式'], [
  ['①', '把 vra9_1-000002.vmdk 掛回 unit 14；節點內 vgchange -ay data_vg 後以唯讀掛回 /vra-db'],
  ['②③', 'kubectl apply -f backup-comp-vcfa-*.yaml；status 以 --subresource=status 還原 Unknown'],
  ['⑤', "update component set version='8.0.0' where component_id='38eb20b2-…'"],
  ['整套', '來源 vra9 VM 與四顆磁碟原封未動；最壞情況可停用新叢集、開回 vra9（8.18）'],
], [14, 86]));

/* 7 */
body.push(H1('7. 對客戶的建議'));
body.push(BULLET('升級本體已完成且已切換：先以第 1 節的四項證據確認，不要因 fleet 顯示 Upgrade failed 就回滾。'));
body.push(BULLET('正式路徑＝方案 A：開立支援案件，附四項證據與任務 ID，由原廠修正 fleet 紀錄。'));
body.push(BULLET('方案 B 僅在實驗室驗證「可行」，未經原廠認可，且會留下 fleet 無 VCFA 憑證的缺口。'));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Microsoft JhengHei', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: C.blue, font: 'Microsoft JhengHei' } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: C.blue, font: 'Microsoft JhengHei' } } ] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children: body }]
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('WROTE', OUT, buf.length, 'bytes, figures:', figNo); });
