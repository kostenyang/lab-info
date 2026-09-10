/* VCF Management 9.1.0 → 9.1.1 升級 + 外部 vRA 8.18 升 VCF Automation 9.1.1 實測報告 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, ImageRun, PageBreak
} = require('docx');

const SHOTS = 'E:\\9.1\\doc-shots\\vrops-upgrade';
const OUT   = 'E:\\9.1\\VCF-Management-911-Upgrade-and-vRA8-Report.docx';

const C = { blue: '1F4E79', gray: '595959', red: 'C00000', green: '2E7D32', amber: '9C6500' };

const H1 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
const H3 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100 } });
const P = (t, o) => {
  o = o || {};
  return new Paragraph({
    children: [new TextRun({ text: t, size: o.size || 21, bold: o.bold, color: o.color, italics: o.italics })],
    spacing: { after: 100 }, alignment: o.align
  });
};
const CODE = t => new Paragraph({
  children: t.split('\n').map((line, i) =>
    new TextRun({ text: line, font: 'Consolas', size: 17, break: i === 0 ? 0 : 1 })),
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
  spacing: { before: 60, after: 60 }, indent: { left: 200 }
});
const BULLET = t => new Paragraph({
  children: [new TextRun({ text: t, size: 21 })], bullet: { level: 0 }, spacing: { after: 60 }
});
const QUOTE = t => new Paragraph({
  children: [new TextRun({ text: t, size: 20, italics: true, color: C.gray })],
  indent: { left: 400 }, spacing: { before: 60, after: 100 },
  border: { left: { style: 'single', size: 12, color: C.blue, space: 8 } }
});
const NOTE = (t, color, fill) => new Paragraph({
  children: [new TextRun({ text: t, size: 20, color: color || C.red, bold: true })],
  shading: { type: ShadingType.CLEAR, fill: fill || 'FFF2CC' },
  spacing: { before: 80, after: 80 }, indent: { left: 100 }
});

function table(headers, rows, widths) {
  const hdr = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: C.blue },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 19 })] })]
    }))
  });
  const body = rows.map(r => new TableRow({
    children: r.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: String(c), size: 18 })] })]
    }))
  }));
  return new Table({ rows: [hdr].concat(body), width: { size: 100, type: WidthType.PERCENTAGE } });
}

let figNo = 0;
function figure(file, caption, h) {
  const p = path.join(SHOTS, file);
  const out = [];
  figNo++;
  if (fs.existsSync(p)) {
    out.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(p), transformation: { width: 620, height: h || 340 } })],
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }
    }));
  } else {
    out.push(new Paragraph({
      children: [new TextRun({ text: '[ 缺圖:' + file + ' ]', italics: true, color: C.gray, size: 18 })],
      shading: { type: ShadingType.CLEAR, fill: 'FFF2CC' }, spacing: { before: 80, after: 40 }
    }));
  }
  out.push(new Paragraph({
    children: [new TextRun({ text: '圖 ' + figNo + '　' + caption, size: 18, color: C.gray })],
    alignment: AlignmentType.CENTER, spacing: { after: 160 }
  }));
  return out;
}

const body = [];

/* ================= 封面 ================= */
body.push(new Paragraph({ text: '', spacing: { after: 1400 } }));
body.push(new Paragraph({
  children: [new TextRun({ text: 'VCF Management 9.1.0 → 9.1.1 升級實測', bold: true, size: 40, color: C.blue })],
  alignment: AlignmentType.CENTER, spacing: { after: 120 }
}));
body.push(new Paragraph({
  children: [new TextRun({ text: '暨外部 vRA 8.18 升級 VCF Automation 9.1.1 之限制驗證', bold: true, size: 30, color: C.blue })],
  alignment: AlignmentType.CENTER, spacing: { after: 400 }
}));
body.push(P('離線倉儲（air-gap offline depot）環境　·　全程 UI 操作實錄', { align: AlignmentType.CENTER, size: 22, color: C.gray }));
body.push(new Paragraph({ text: '', spacing: { after: 800 } }));
body.push(P('文件版本：v1.0', { align: AlignmentType.CENTER }));
body.push(P('測試期間：2026-09-07 ~ 2026-09-10', { align: AlignmentType.CENTER }));
body.push(P('測試環境：home.lab　巢狀 VCF 9.1 管理網域 vcf-m02', { align: AlignmentType.CENTER }));
body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 1 執行摘要 ================= */
body.push(H1('1. 執行摘要'));
body.push(P('本次工作有兩個目標：其一，將 VCF Operations 所管理的 VCF Management 元件（Fleet lifecycle、Software depot、VCF services runtime、Identity broker、Salt、SDDC lifecycle、Telemetry）由 9.1.0.x 升級至 9.1.1；其二，將先前匯入的 VMware Aria Automation 8.18（以下簡稱 vRA 8）升級為 VCF Automation 9.1.1，並確認「來源必須位於管理網域」這條官方前置條件實際上在哪一個環節被強制。'));

body.push(H2('1.1 主要結論'));
body.push(NOTE('結論一：Fleet 的目標版本清單看不到 9.1.1，唯一原因是 Fleet lifecycle 元件本身仍為 9.1.0；它不隸屬一般元件清單，必須先由 Upgrade 分頁上方的獨立區塊自行升級。與離線倉儲的 metadata 無關。', C.green, 'E2EFDA'));
body.push(NOTE('結論二：外部（非管理網域）的 vRA 8 可以匯入並註冊為 VCF Automation 元件，但無法就地升級。升級的 Precheck 會在 import_vcfa 階段失敗，因為工作流需要在該 VCF Instance 的 vCenter 內以 govc 查詢來源虛擬機的網路 MoRef。將來源遷入管理網域後，同一階段即通過，因果已實測閉環。', C.red));
body.push(NOTE('結論三：8.18 → 9.1.1 藍綠升級本體成功並已切換（來源自動關機、新叢集接管 VIP 與 FQDN、資料完整），但 fleet 任務因部署階段 2 小時逾時而誤報失敗，元件紀錄停在佔位版本 8.0.0；內建重試無法修復。官方立場為開立支援案件；實驗室以手動補完驗證可行。', C.amber));
body.push(NOTE('結論四：本環境將來源虛擬機以冷遷移搬入管理網域後，IP 與 FQDN 完全不需變更（目標連接埠群組與原網段同屬一個扁平 /23），符合官方「新節點必須部署於相同網路」的規定。', C.green, 'E2EFDA'));

body.push(H2('1.2 升級結果總表'));
body.push(table(
  ['#', '元件', '起點版本', '結果版本', '耗時', '結果'],
  [
    ['1', 'VCF Operations', '8.18.6', '9.1.1.0.25679751', '23 分', '成功（先前以 PAK 就地升級）'],
    ['2', 'Fleet lifecycle', '9.1.0.0400.25570104', '9.1.1.0.25713934', '102 分', '成功'],
    ['3', 'Software depot', '9.1.0.0400.25570105', '9.1.1.0.25713941', '51 分', '成功'],
    ['4', 'VCF services runtime (VSP)', '9.1.0.0.25370367', '9.1.1.0.25714471', '101 分', '成功（UI 誤報失敗）'],
    ['5', 'Identity broker', '9.1.0.0.25368698', '9.1.1.0.25679886', '約 125 分', '成功（批次）'],
    ['6', 'Salt master / Salt RaaS', '9.1.0.0.25346036', '9.1.1.0.25679895', '約 125 分', '成功（批次）'],
    ['7', 'SDDC lifecycle', '9.1.0.0.25371107', '9.1.1.0.25713940', '約 125 分', '成功（批次）'],
    ['8', 'Telemetry', '9.1.0.0.25181946', '9.1.1.0.25671600', '約 125 分', '成功（批次）'],
    ['9', 'VCF Automation', '8.18.1.36791', '9.1.1.0.25714559', '7 時 55 分', '成功（fleet 任務誤報失敗）'],
  ], [5, 24, 21, 21, 10, 19]));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 2 環境 ================= */
body.push(H1('2. 測試環境'));
body.push(table(
  ['角色', '位址 / 名稱', '說明'],
  [
    ['VCF Operations（Fleet 入口）', 'vcf-m02-ops01.home.lab / 10.0.1.22', 'Build › Lifecycle › VCF Management'],
    ['VCF services runtime（VSP）', 'vcf-m02-vsp01.home.lab / 10.0.0.172', 'K8s 叢集，節點 10.0.0.226-231'],
    ['管理網域 vCenter', 'vcf-m02-vc01.home.lab / 10.0.1.19', 'vCenter 9.1.1，叢集 m01-cl01'],
    ['外層 vCenter', '10.0.0.101', 'vCenter 8.0.3，承載巢狀主機與 vRA 8'],
    ['離線倉儲', 'vcf9depotserver.home.lab / 10.0.0.61', 'nginx + basic auth，全 9.1.1 二進位齊備'],
    ['來源 vRA 8', 'vra9.home.lab / 10.0.0.168', '12 vCPU / 54 GB / 165 GB 實際佔用'],
  ], [26, 34, 40]));
body.push(P('倉儲盤點結果：811 個檔案，每個 fleet 元件皆有 9.1.1 版本（VSP 17.3 GB、Automation 16.8 GB、Operations 10.9 GB、vCenter 35.8 GB 等），僅 NSX ALB 無 9.1.1，該元件本環境未使用。因此後續所有問題均與「倉儲缺料」無關。'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 3 Fleet 看不到 9.1.1 ================= */
body.push(H1('3. 問題一：目標版本清單看不到 9.1.1'));
body.push(P('升級起點時，Build › Lifecycle › VCF Management › Upgrade 的 Change target version 只列出 9.1.0.*，各元件也只能選到 9.1.0.x。'));

body.push(H2('3.1 曾經嘗試但無效的做法'));
body.push(P('以下五項全部做過，結果完全相同，可作為排除清單：'));
body.push(BULLET('補齊倉儲中所有 9.1.1 二進位檔（含先前缺少的 License server、Cloud proxy）。'));
body.push(BULLET('改用 VCF Download Tool 9.1.1 重新下載 metadata 並覆蓋倉儲（catalog 序號由 57 更新為 58）。'));
body.push(BULLET('於 UI 重複點選 Sync，累計 21 次，任務皆為 SUCCEEDED。'));
body.push(BULLET('將 fleet 的 Software depot 元件先升級至 9.1.0.0400。'));
body.push(BULLET('（實驗）修改倉儲 manifest：先調整 9.1.1 release 的 minInstallerVersion，再移除 9.1.1 bom 中五個舊版未知的新元件名稱。兩次實驗皆已還原。'));
body.push(NOTE('倉儲存取紀錄可證明 fleet 每次 Sync 都確實取得了新的 metadata（productVersionCatalog.json 1,524,404 bytes 與 vcfManifest.json 265,178 bytes 皆回應 200），因此問題不在倉儲側，而在 fleet 端的版本判讀。', C.amber));

body.push(H2('3.2 正解：Fleet lifecycle 必須自行先升級'));
body.push(P('VCF 9.1.1 發行說明明確定義了順序：'));
body.push(QUOTE('You begin applying the 9.1.1.0 maintenance release in your 9.1.0.x environment by patching the VCF management services fleet lifecycle component to 9.1.1.0 before any other VCF component.'));
body.push(P('關鍵在於：Fleet lifecycle 並不出現在一般元件清單，也不在升級計畫內，它有自己的升級入口與 API。當它仍為 9.1.0.0400 時，其版本判讀邏輯不認得 9.1.1 這個 release，因此整份清單被過濾掉。'));
body.push(P('操作路徑：Upgrade 分頁最上方的 Fleet Lifecycle 區塊 → UPGRADE 按鈕旁的「⋯（Available actions）」→ Select version → 選擇 9.1.1.0.25713934 → SET TARGET VERSION → UPGRADE。'));
body.push(...figure('99-fleet-lifecycle-section.png', 'Upgrade 分頁上方的獨立 Fleet Lifecycle 區塊'));
body.push(...figure('101-fleet-lifecycle-select-version.png', 'Select version 對話框，僅提供 9.1.1.0.25713934'));
body.push(...figure('103-fleet-lifecycle-binary-check.png', 'CHECK BINARY AVAILABILITY：INSTALL 與 PATCH 皆為 REQUIRED'));
body.push(NOTE('「REQUIRED」代表本次升級需要該套件，並非代表倉儲缺件；目標為 0400 時同樣欄位顯示 NOT_REQUIRED 與 ALREADY_UPGRADED。', C.amber));
body.push(...figure('107-fleet-lcm-911-done.png', '升級完成，Fleet lifecycle 顯示 Current version 9.1.1.0.25713934'));
body.push(P('升級歷時 102 分鐘，七個階段依序為 set_upgrade_context、vmsp_stage_plugin、vmsp_prechecks、vmsp_stage_package、vmsp_prepare、vmsp_upgrade、post_upgrade_inventory_sync。完成後 release 清單立即出現 9.1.1.0，無須再次 Sync。'));
body.push(...figure('108-upgrade-tab-after-flcm911.png', '升級後 UI 改版：CHANGE TARGET VERSION 變為 SELECT VERSION，並新增 VCF Operations 須獨立升級的提示'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 4 升級順序 ================= */
body.push(H1('4. VCF Management 元件升級'));
body.push(H2('4.1 官方順序與相依關係'));
body.push(QUOTE('When you patch a software depot instance, patching other components is blocked because the patch binaries are unavailable until the patch process for the software depot completes. Before you patch an identity broker instance from 9.1.0.0 to 9.1.1.0, you must first patch the respective VCF management services runtime that hosts the identity broker instance. Before you patch Salt RaaS from 9.1.0.0 to 9.1.1.0, you must first patch the respective VCF management services runtime. Before you patch the migration service engine component from 9.1.0.0 to 9.1.1.0, you must first patch VCF Automation.'));
body.push(P('據此本次採用的順序為：Fleet lifecycle → Software depot（單獨）→ VCF services runtime → Identity broker 與 Salt RaaS → Salt master、SDDC lifecycle、Telemetry → VCF Automation → Migration service engine。'));
body.push(...figure('111-upgrade-tab-target-911.png', '將目標版本設為 9.1.1 後，八個元件的升級路徑'));

body.push(H2('4.2 Precheck 的相依驗證'));
body.push(P('第一輪 Precheck 中，Identity broker 與 Salt RaaS 失敗，訊息明確指出相依關係尚未滿足：'));
body.push(CODE('VCF Services Runtime is at version 9.1.0 but this upgrade requires VSP >= 9.1.1\n[VCFMS-PRECHECK-VIDB-VMSP-VERSION-001]\nResolution: Upgrade VSP to the required version before retrying the upgrade'));
body.push(NOTE('每一則真正的錯誤前面都會先出現一句無意義的「Internal error occurred. Please retry the operation…」，判讀時必須往下一則看。', C.amber));
body.push(P('VCF services runtime 升級完成後重跑，五個元件全部通過。'));
body.push(...figure('114-precheck-results-911.png', 'Precheck 結果總表'));

body.push(H2('4.3 VCF services runtime 的「假失敗」'));
body.push(P('VCF services runtime 升級在 vmsp_upgrade 階段被標記為失敗，訊息為：'));
body.push(CODE('Unexpected error occurred while checking task:\n400 Bad Request: "Client sent an HTTP request to an HTTPS server."\nReference Code: 45F3A806'));
body.push(P('實際上升級成功。VCF Operations 9.1.1 發行說明已記載此已知問題：'));
body.push(QUOTE('Fleet lifecycle services run on a single node. During a VCF services runtime platform node rotation operation, an in-progress component installation can fail. … If the component installation task fails, retry the task.'));
body.push(P('原因是 Fleet lifecycle 本身就執行於正在輪替的 VSP 節點上，輪替期間失去自身 API 而誤判。以叢集狀態查證可確認底層滾動升級照常完成：'));
body.push(CODE('kubectl get pd -A        # vmsp-platform = Successful\nkubectl get nodes        # 四節點全部換新，v1.34.2 → v1.35.6'));
body.push(NOTE('判斷 fleet 任務真偽的可靠方法：登入 VSP control-plane 節點，以 kubectl 檢視 PackageDeployment 狀態，不要只看 UI。', C.amber));
body.push(...figure('125-five-components-done.png', '五個元件批次升級完成後，清單僅餘 VCF Automation'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 5 vRA 8 擋點 ================= */
body.push(H1('5. 問題二：外部 vRA 8 無法就地升級'));
body.push(H2('5.1 官方原文'));
body.push(P('這條前置條件出現在「匯入」頁面，而不在「升級」頁面：'));
body.push(QUOTE('Verify that your VMware Aria Automation 8.18.1 and later instance resides in the management domain of the VCF Instance where you want to import it to. To move VMware Aria Automation to a different vCenter, you must reconfigure the network. See Change IP addresses of VMware Aria Automation node or cluster.'));
body.push(P('— Import an Existing VMware Aria Automation Instance in VCF Operations（VCF 9.1，Before starting the import and upgrade 第一條）'));
body.push(P('techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/deployment/upgrading-cloud-foundation/phase-3-import-and-upgrade-aria-automation-8-to-vcf-automation-9/import-an-existing-vmware-aria-automation-instance-in-vcf-operations.html', { size: 17, color: C.gray }));
body.push(NOTE('「Perform the Upgrade to VCF Automation 9.1」的前置清單並未重述此條件（該清單只列 FQDN、IP 位址數量、軟體倉儲、憑證 SAN、FIPS 端點與 truststore 等），這正是本限制容易被忽略、直到升級階段才浮現的原因。', C.amber));

body.push(H2('5.2 知識庫佐證與替代方案'));
body.push(P('Broadcom 知識庫文章 425169 描述的症狀與本次一致（匯入時無法取得網路資料）：'));
body.push(QUOTE('Cause: Deployments for Aria suite is not on primary VCF Management workload domain.'));
body.push(QUOTE('Resolution: The Fleet manager import process … relies directly on the MGMT or WLD DB records of the vcenter housing Aria suite. You will need to relocate to the Management domain already included, or complete the import of the Workload domain vcenter housing The importing Aria product to pull network resources and policies to continue import.'));
body.push(P('該文提供兩條路徑：將來源虛擬機搬入管理網域，或將承載 vRA 的 vCenter 以工作負載網域匯入 VCF。後者對「既有 vRA 分散於多套 vCenter」的客戶情境更為務實。'));

body.push(H2('5.3 實測失敗點'));
body.push(P('本次以外部 vRA 8（位於外層 vCenter）執行升級 Precheck，結果失敗於 import_vcfa 階段。UI 僅顯示一組無資訊量的內部錯誤與參考碼：'));
body.push(CODE('set_upgrade_context                        SUCCEEDED\nset_variables                              SUCCEEDED\nvalidate_vsp_cluster_input                 SUCCEEDED\nvalidate_vcfa_vmsp_version_compatibility   SUCCEEDED\nvmsp_stage_plugin                          SUCCEEDED\nimport_vcfa                                FAILED\n  Internal error occurred. Please retry the operation or contact support.\n  Step import_vcfa failed. Reference Code: 0C53A949.'));
body.push(...figure('131-vcfa-precheck-failed.png', 'VCF Automation Precheck 失敗'));
body.push(P('真正原因必須進入 VSP 叢集查閱工作流容器日誌：'));
body.push(CODE('kubectl -n prelude get pods\n  vcfa-import-80-entrypoint-...-execute-script   Error\n\nkubectl -n prelude logs <pod> --all-containers\n  [DEBUG] Prepared platform configuration from source: {gateway 10.0.0.1, prefix 23, ...}\n  [INFO]  Collecting network MoRef from vCenter using govc...\n  [INFO]  Source system IP: 10.0.0.168\n  ERROR : Script exited unexpectedly at line 1 with exit code 1'));
body.push(P('工作流需要在該 VCF Instance 的 vCenter 內，依來源虛擬機的位址查出其網路物件識別碼，以便將新建的 VCF Automation 執行環境節點放置於相同網路。當來源虛擬機不在該 vCenter 的清單內，此查詢無結果，腳本即以錯誤碼 1 結束。'));
body.push(P('這也對應官方對網路的規定：'));
body.push(QUOTE('You deploy the new VCF Automation 9.1 nodes on the same network as your existing Automation nodes. If you upgrade from Aria Automation 8.18.x, the IP addresses of the existing nodes are automatically assigned as VIPs for the 9.1 instance. The FQDN from the existing Automation instance is automatically transferred as the VCF Automation FQDN of the 9.1 instance.'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 6 遷移 ================= */
body.push(H1('6. 將來源虛擬機遷入管理網域'));
body.push(P('官方僅以一句話帶過遷移（「to move … you must reconfigure the network」），並未提供任何步驟。以下為本環境實作記錄。'));
body.push(H2('6.1 規劃'));
body.push(table(
  ['項目', '來源', '目的'],
  [
    ['vCenter', '10.0.0.101（8.0.3）', '10.0.1.19（9.1.1）'],
    ['主機', '實體主機 10.0.0.98', '巢狀 esx04（記憶體餘裕 198 GB）'],
    ['儲存', '本機 SSD pcssd3', 'm01-cl01-ds-vsan01（餘裕 1,723 GB）'],
    ['連接埠群組', 'VM Network', 'SDDC-DPortGroup-VM-Mgmt'],
    ['IP / FQDN', '10.0.0.168 / vra9.home.lab', '不變'],
  ], [22, 39, 39]));
body.push(NOTE('目標連接埠群組正是 VSP 節點（10.0.0.226-231）與 VCF Operations（10.0.1.22）所在的同一個扁平 /23 網段，因此遷移後 IP 與 FQDN 皆不需變更，符合官方「新節點需在相同網路」的要求。', C.green, 'E2EFDA'));

body.push(H2('6.2 熱遷移不可行'));
body.push(P('以 PowerCLI 對開機中的虛擬機執行跨 vCenter 遷移，來源 vCenter 直接回報：'));
body.push(CODE('The target host does not support the virtual machine\'s current hardware requirements'));
body.push(P('比對雙方能力可知原因：該虛擬機於實體主機開機時登記了 50 項 CPU 需求，而巢狀主機缺少其中 misc.ibrs_all、misc.mds_no、misc.rdcl_no、misc.rsba_no 與 cpuid.xsaves。巢狀 ESXi 不會向上層暴露這些旗標。'));
body.push(CODE('govc object.collect -json <vm>   runtime.featureRequirement\ngovc object.collect -json <host> config.featureCapability'));
body.push(NOTE('PowerCLI 端回報的是「Cannot convert type VirtualMachineFeatureRequirement to Object」，具有高度誤導性；真正的錯誤訊息必須到來源 vCenter 的工作清單查看。', C.amber));

body.push(H2('6.3 冷遷移執行結果'));
body.push(P('改以關機後遷移（不檢查 CPU 旗標，資料經管理網路傳輸）：'));
body.push(table(
  ['步驟', '結果'],
  [
    ['優雅關機（VMware Tools）', '2 分 30 秒'],
    ['跨 vCenter 冷遷移（165 GB）', '96 分 48 秒'],
    ['開機並取得位址', '2 分 20 秒，位址仍為 10.0.0.168'],
  ], [55, 45]));
body.push(NOTE('環境坑：本機同時安裝 PowerCLI 13.3 與 13.5，混用會使遷移指令直接失敗於「Field not found: VIObjectImpl._connectionId」。腳本必須以 RequiredVersion 釘住單一版本。', C.amber));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 7 VCF Automation 升級實錄 ================= */
body.push(H1('7. VCF Automation 8.18 → 9.1.1 升級實錄'));
body.push(P('來源虛擬機遷入管理網域後，重新執行 Precheck；此時 import_vcfa 階段通過，證實前一章的擋點確為「來源不在管理網域」。隨後出現第二個前置條件（端點憑證），依知識庫 425489 修復後 Precheck 全數通過，即執行升級。'));
body.push(H2('7.1 端點憑證前置條件（KB 425489）'));
body.push(CODE('One or more configured endpoints are missing certificate entries.\n[com.broadcom.vcfa.upgrade.80.application.check.test-application-01-8x-endpoint-certificates]\nResolution: Review /var/log/vmware/prelude/endpoint-certificates-checks-failed ... Consult KB 425489\n\n# 來源機上的失敗清單只有一行\nType: vsphere, Host: 10.0.0.101'));
body.push(QUOTE('In Aria Automation 8.18.1, when you register a vSphere or NSX-T endpoint whose certificate is signed by the same CA as the Aria Automation ingress certificate or by a well-known external CA, the vSphere adapter automatically trusts it as the CA is already present in the truststore. The certificate is not persisted into the provisioning-service database. During the upgrade to VCFA 9.1.x, only the Postgres database content migrates.'));
body.push(P('— KB 425489：8.x endpoint certificates upgrade pre-check fails due to missing certificate entries'));
body.push(P('修復方式為在來源 8.18.1 節點執行知識庫提供的腳本：匯出 ingress 憑證鏈、拆成單張 PEM、寫入 provisioning 資料庫的 ssl_trust_certificate_state 表（cert_ext_N）。本次先建立快照，執行後寫入 2 張憑證，記錄檔結尾為 completed successfully。重跑 Precheck 後八個階段全數通過。'));
body.push(...figure('134-vcfa-precheck-passed.png', 'Precheck 全數通過，狀態為 Ready for upgrade'));

body.push(H2('7.2 升級執行與階段'));
body.push(P('於列上按 UPGRADE（無二次確認）後開始藍綠升級。任務共 14 個階段，依序為：'));
body.push(CODE('set_upgrade_context → set_variables → validate_vsp_cluster_input → validate_vcfa_vmsp_version_compatibility\n→ vmsp_stage_plugin_on_mgmt_vsp_cluster → import_vcfa_on_mgmt_vsp_cluster → vmsp_run_vcfa_prechecks_on_mgmt_cluster\n→ deploy_vmsp_cluster（建立新的 VCF services runtime 叢集，本環境約 2 小時）\n→ discover_vsp_cluster → vmsp_stage_plugin → import_vcfa → vmsp_run_vcfa_prechecks → vmsp_stage_package\n→ vmsp_upgrade_vcfa'));
body.push(...figure('136-vcfa-upgrade-in-progress.png', 'Tasks 分頁的升級任務明細與子步驟'));
body.push(P('新叢集的節點規格由目標版本的 ComponentVersion 決定：small 尺寸即為 24 vCPU / 96 GB 記憶體 / 200–400 GB 儲存，遠大於來源 8.18 的 12 vCPU / 54 GB，這是部署階段耗時的主因。同一份定義亦載明 timeout: 2h。'));
body.push(...figure('901-vcfa-k8s-state-during-deploy.png', '登入新叢集以 kubectl 觀察：節點 Ready、套件部署進行中、Automation 服務容器陸續啟動'));

body.push(H2('7.3 任務失敗，但升級其實已完成'));
body.push(P('升級任務執行 7 小時 55 分後，於最後階段 vmsp_upgrade_vcfa 被標記為失敗：'));
body.push(CODE('Component deployment failed for component type vcfa using version vcfa with component ID 9.1.1.0.25714559.\n[VCFMS-UPGRADE-COMPONENT-031]   Reference Code: F449304C'));
body.push(P('進入新叢集查閱 VMSP 工作流容器日誌，真正原因是「等待套件部署完成」逾時（ComponentVersion 定義的 2 小時），而部署本身仍在進行：'));
body.push(CODE('Error: existing package deployment is in progress, waiting for it to complete\nERROR : Script exited unexpectedly at line 53 with exit code 1\n(workflow stage: upgrade-deploy-80-component-services)'));
body.push(P('約 30 分鐘後，新叢集的套件部署轉為 Successful、62 個服務容器 Running；以四項證據確認藍綠切換已完成：'));
body.push(table(
  ['證據', '觀察結果'],
  [
    ['來源 8.18 虛擬機', '已被升級流程自動關機（官方：source Automation nodes are shut down automatically）'],
    ['新叢集閘道', 'LoadBalancer 對外位址即原 VIP 10.0.0.168；HTTPRoute 主機名為 vra9.home.lab'],
    ['端點指紋', '/tm/api-explorer/provider/cloudapi.json 回應 200（僅 9.x 存在）；provider 頁面顯示 9.1.1'],
    ['資料', '舊 API 仍可取回 3 個藍圖、1 個部署；登入新主控台可見 1 個雲端帳戶、52 台虛擬機、1 個部署'],
  ], [24, 76]));
body.push(...figure('904-vcfa-k8s-bundle-successful.png', '新叢集：vcfa-bundle 套件部署 Successful，62 個容器 Running'));
body.push(...figure('907-vcfa911-automation-console.png', '登入升級後的 VCF Automation 9.1.1 主控台（vidm9 租戶），遷移後的資料完整'));
body.push(QUOTE('the service pods and product packages deploy completely and function normally on the new appliance. the automated upgrade workflow fails to automatically reimport the new appliance into the fleet lifecycle management.'));
body.push(P('— KB 441246：VCFA 9.1 upgrade times out on step vmsp_upgrade（該文僅提供診斷方式，未提供補救程序）'));
body.push(NOTE('判讀原則：fleet 任務失敗不等於升級失敗。遇到此情況應先以 kubectl 檢視新叢集的 PackageDeployment 與服務容器，並確認來源虛擬機是否已被關機、VIP 是否已被新閘道接管，再決定是否回滾。誤判而回滾才是真正的風險。', C.amber));

body.push(H2('7.4 重試為何無效'));
body.push(P('失敗後 fleet 對該元件的紀錄變為版本 8.0.0。這並非資料損毀，而是匯入 8.x 來源時給的佔位版本；VMSP 任務的最後一階段「Patch the target Component Version」原本負責改寫為 9.1.1，該階段因前一階段逾時而停在 Pending。'));
body.push(BULLET('列上的 UPGRADE：另建新的執行，升級目錄中找不到 8.0.0 這個來源版本，立即回 404「No matching source version found for source 8.0.0 within catalog 9.1」。'));
body.push(BULLET('Tasks 分頁的任務層 Retry：接續原任務，但其語意是重跑整段 8.x 初始化（對來源再拍快照、停服務、匯出、關機、掛碟），第一步即因來源已有兩個快照而撞到「Exceeded the maximum number of permitted snapshots」。此後任務標記為不可重試。'));
body.push(...figure('900-vcfa-upgrade-failed-row.png', 'fleet 將元件記為 8.0.0 → 9.1.1.0，並顯示 Upgrade failed'));
body.push(...figure('909-tasks-retry-clicked.png', 'Tasks 分頁：按下任務層 Retry 後，原任務回到 In Progress（列上的 VCF LCM Task 即為兩次 404 的新執行）'));
body.push(...figure('914-tasks-after-retry-failed.png', '第二次失敗後：Retry 連結消失，任務標記為不可重試'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 8 兩條處理路徑 ================= */
body.push(H1('8. 帳面不一致的兩條處理路徑'));
body.push(P('此時產品面已是 9.1.1 並正常服務，只有 fleet 的元件紀錄停在 8.0.0，且內建重試手段皆已用盡。'));
body.push(H2('8.1 路徑 A：原廠支援案件（正式建議）'));
body.push(QUOTE('VCF Automation Upgrade Failure cleanup is not supported.'));
body.push(P('— KB 441333：Failed component cleanup during VCF 9.1 installation or upgrade'));
body.push(P('知識庫明確排除 VCF Automation 升級失敗的自助清理，並警告曾移除再加回的 VCF Automation 元件會因基礎架構屬性為 NULL 而無法匯入（KB 441127）。客戶環境應開立支援案件，並附上本報告第 7.3 節的四項證據，說明升級本體已完成、僅需修正 fleet 紀錄。'));
body.push(H2('8.2 路徑 B：實驗室手動補完（非官方，僅供驗證）'));
body.push(NOTE('本節步驟直接修改 VMSP 自訂資源與 fleet 資料庫，屬非官方做法，僅在實驗室驗證可行；客戶環境請採用路徑 A。', C.red));
body.push(P('目標是補做 VMSP 任務未執行的兩個階段：卸載來源資料碟（unmount-vmdks-from-target-environment）與改寫元件版本（upgrade80-target-component-version）。執行前備份元件 CR 與 fleet、sddc-lcm 兩張 component 表。'));
body.push(table(
  ['步驟', '動作', '結果'],
  [
    ['1', '新節點內 umount /vra-db、vgchange -an data_vg；以 govc device.remove -keep 拆除來源資料碟', '來源虛擬機四顆磁碟完整保留，可回掛'],
    ['2', '新叢集 kubectl patch comp vcfa：spec.versionRef 與版本 label 改為 9.1.1；status.phase 設為 Running', 'vmsp-operator 只在 phase 為空時填 Unknown，不會覆寫'],
    ['3', '管理叢集殘留的 comp vcfa 同步改為 9.1.1', '避免同步時讀回 8.0.0'],
    ['4', 'POST /v1/sddc-lcms/{id}/refresh', 'sddc-lcm 庫存自動變 9.1.1、fleet 狀態變 Running，但 fleet 的版本欄不同步'],
    ['5', '更新 fleet 資料庫 component.version', 'UI 與 API 立即對齊，Upgrade 分頁顯示所有元件皆在目標版本'],
  ], [8, 52, 40]));
body.push(...figure('919-optionB-upgrade-tab-after-db-fix.png', '補完後：All components are at their target versions'));
body.push(...figure('920-optionB-components-911.png', 'Components 分頁的 VCF Automation 顯示 9.1.1.0.25714559'));
body.push(P('已知限制：refresh 的記錄顯示 fleet 對此 VCF Automation 沒有 service account（credentials available=false），後續 fleet 對其執行的整合動作可能受限；這是正常升級的 reimport 階段才會建立的信任關係。'));

body.push(new Paragraph({ children: [new PageBreak()] }));
/* ================= 9 建議 ================= */
body.push(H1('9. 對客戶情境的建議'));
body.push(P('針對「既有 vRA 8 部署於 VCF 之外的 vCenter」這一常見情境，本次驗證可歸納為三點：'));
body.push(H2('9.1 可以做到的'));
body.push(BULLET('匯入與納管：外部 vRA 8.18.1 以上可直接匯入 VCF Operations，成為 Fleet 中的 VCF Automation 元件，匯入過程對來源系統無任何影響（不建立快照、不停止服務）。'));
body.push(H2('9.2 做不到的'));
body.push(BULLET('就地升級：升級 Precheck 於 import_vcfa 階段失敗，因為工作流必須在該 VCF Instance 的 vCenter 內查得來源虛擬機的網路物件。'));
body.push(H2('9.3 兩條可行路徑'));
body.push(BULLET('路徑 A：將 vRA 8 虛擬機遷入管理網域。若目標連接埠群組與原網段相同，IP 與 FQDN 皆可保留；若跨網段，則須依官方程序變更節點位址。熱遷移在巢狀或 CPU 世代不同的環境可能不可行，需評估冷遷移的停機時間（本環境 165 GB 約需 100 分鐘）。'));
body.push(BULLET('路徑 B：將承載 vRA 的 vCenter 以工作負載網域（Workload Domain）匯入 VCF，使 Fleet 能讀取該 vCenter 的資料庫記錄。此路徑不需搬移虛擬機，對多套 vCenter 的環境較為實際。'));

body.push(new Paragraph({ children: [new PageBreak()] }));

/* ================= 10 附錄 ================= */
body.push(H1('10. 附錄：實務要點與坑'));
body.push(table(
  ['項目', '說明'],
  [
    ['Fleet lifecycle 升級入口', '不在元件清單，於 Upgrade 分頁上方獨立區塊，經 kebab 選單的 Select version'],
    ['單一元件 UPGRADE', '無二次確認，按下即執行'],
    ['批次 UPGRADE (n)', '有「Upgrade All Components」確認框，且該按鈕僅接受真實滑鼠事件'],
    ['RUN PRECHECKS (ALL)', '未勾選任何列時按下無效果，須先勾選使按鈕顯示數量'],
    ['Deselect All 按鈕', '本版本點擊無作用，需逐列取消勾選'],
    ['殘留對話框', '未關閉的確認框會使工具列按鈕停留在舊的選取數，須關閉並重新載入'],
    ['UI 與 API 落差', '列狀態常落後於 API；判斷以 API 與 kubectl 為準'],
    ['錯誤訊息位置', 'Precheck 與升級的真正原因位於任務 stages[].messages[]，UI 的 full results 讀取同一來源'],
    ['VSP 節點輪替', '升級後 IP 沿用但主機金鑰全數更換，SSH 用戶端的快取需清除'],
    ['倉儲缺料的表現', '目標選 9.1.0.x 時 VSP 與 Identity broker 的 Precheck 會失敗，因倉儲無該修補版本的描述檔'],
    ['VCFA 升級 2 小時逾時', 'ComponentVersion 定義 timeout: 2h；部署超過即誤報失敗，底層仍會繼續完成'],
    ['VCFA 兩種重試', '列上 UPGRADE 另建執行（撞 8.0.0 404）；Tasks 的 Retry 重跑 8.x 初始化（需來源開機且可再拍快照）'],
    ['VCFA 8.0.0 佔位版本', '匯入 8.x 時即設定，正常由最後階段改寫；停在 8.0.0 代表最後階段未執行'],
  ], [26, 74]));

body.push(H2('10.1 常用查證指令'));
body.push(CODE('# fleet 版本與釋出清單（於 fleet iframe 內同源呼叫）\nGET /vcf-operations/plug/fleet-lcm/v1/system\nGET /vcf-operations/plug/fleet-lcm/v1/releases\nGET /vcf-operations/plug/fleet-lcm/v1/release-versions/target-versions\nGET /vcf-operations/plug/fleet-lcm/v1/tasks/<id>\n\n# VSP 叢集（control-plane 節點）\nkubectl --kubeconfig=/etc/kubernetes/admin.conf get pd -A\nkubectl --kubeconfig=/etc/kubernetes/admin.conf get comp -A\nkubectl -n prelude logs <import-pod> --all-containers'));

body.push(H2('10.2 圖片索引'));

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Microsoft JhengHei', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: C.blue, font: 'Microsoft JhengHei' } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: C.blue, font: 'Microsoft JhengHei' } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, color: C.gray, font: 'Microsoft JhengHei' } }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
    children: body
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('WROTE', OUT, buf.length, 'bytes, figures:', figNo);
});
