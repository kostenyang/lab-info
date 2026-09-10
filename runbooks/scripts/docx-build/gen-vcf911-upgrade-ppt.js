/* 簡報：VCF Management 9.1.0 → 9.1.1 升級 + 外部 vRA 8 升級限制驗證 */
const fs = require('fs');
const path = require('path');
const Pptx = require('pptxgenjs');

const SHOTS = 'E:\\9.1\\doc-shots\\vrops-upgrade';
const OUT = 'E:\\9.1\\VCF-Management-911-Upgrade-and-vRA8-Deck.pptx';

const BLUE = '1F4E79', GRAY = '595959', RED = 'C00000', GREEN = '2E7D32', AMBER = '9C6500';
const FONT = 'Microsoft JhengHei';

const p = new Pptx();
p.layout = 'LAYOUT_16x9';           // 10 x 5.625 in
p.author = 'VCF Lab';
p.title = 'VCF Management 9.1.1 Upgrade';

const W = 10, H = 5.625;

function slide(title, sub) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  if (title) {
    s.addText(title, { x: 0.45, y: 0.28, w: W - 0.9, h: 0.55, fontSize: 26, bold: true, color: BLUE, fontFace: FONT });
    s.addShape(p.ShapeType.line, { x: 0.45, y: 0.86, w: W - 0.9, h: 0, line: { color: BLUE, width: 1.5 } });
  }
  if (sub) s.addText(sub, { x: 0.45, y: 0.88, w: W - 0.9, h: 0.32, fontSize: 12, color: GRAY, fontFace: FONT });
  return s;
}

function bullets(s, items, opt) {
  opt = opt || {};
  s.addText(items.map(t => (typeof t === 'string'
      ? { text: t, options: { bullet: true, color: '333333' } }
      : { text: t.t, options: { bullet: t.bullet !== false, color: t.color || '333333', bold: t.bold, indentLevel: t.lvl || 0 } })),
    Object.assign({ x: 0.6, y: 1.25, w: W - 1.2, h: 3.9, fontSize: opt.fontSize || 15, fontFace: FONT, lineSpacingMultiple: 1.25 }, opt));
}

function pic(s, file, o) {
  o = o || {};
  const f = path.join(SHOTS, file);
  if (!fs.existsSync(f)) {
    s.addText('[缺圖 ' + file + ']', { x: o.x || 5.15, y: o.y || 1.3, w: o.w || 4.3, h: 0.4, fontSize: 11, color: AMBER, fontFace: FONT });
    return;
  }
  s.addImage(Object.assign({ path: f, x: 5.15, y: 1.3, w: 4.35, h: 2.39 }, o));
}

function kpi(s, cells) {
  const n = cells.length;
  const gw = (W - 1.2) / n;
  cells.forEach((c, i) => {
    const x = 0.6 + i * gw;
    s.addShape(p.ShapeType.roundRect, { x: x + 0.05, y: 3.95, w: gw - 0.1, h: 1.05, fill: { color: 'F2F6FA' }, line: { color: 'D6E2EE', width: 1 }, rectRadius: 0.06 });
    s.addText(c.v, { x: x + 0.05, y: 4.05, w: gw - 0.1, h: 0.45, fontSize: 20, bold: true, color: c.color || BLUE, align: 'center', fontFace: FONT });
    s.addText(c.k, { x: x + 0.05, y: 4.5, w: gw - 0.1, h: 0.4, fontSize: 11, color: GRAY, align: 'center', fontFace: FONT });
  });
}

function tableSimple(s, head, rows, opt) {
  opt = opt || {};
  const body = [head.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: BLUE } } }))]
    .concat(rows.map(r => r.map(c => ({ text: String(c) }))));
  s.addTable(body, Object.assign({
    x: 0.6, y: 1.3, w: W - 1.2, fontSize: 11, fontFace: FONT, color: '333333',
    border: { type: 'solid', color: 'D9D9D9', pt: 0.5 }, valign: 'middle', autoPage: false
  }, opt));
}

/* ---------- 1 封面 ---------- */
{
  const s = p.addSlide();
  s.background = { color: BLUE };
  s.addText('VCF Management 9.1.0 → 9.1.1 升級實測', { x: 0.7, y: 1.7, w: 8.6, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF', fontFace: FONT });
  s.addText('暨外部 vRA 8.18 升級 VCF Automation 9.1.1 之限制驗證', { x: 0.7, y: 2.5, w: 8.6, h: 0.5, fontSize: 18, color: 'CFE0F0', fontFace: FONT });
  s.addShape(p.ShapeType.line, { x: 0.7, y: 3.1, w: 3, h: 0, line: { color: 'FFFFFF', width: 2 } });
  s.addText('離線倉儲環境　·　2026-09-07 ~ 09-10　·　home.lab / vcf-m02', { x: 0.7, y: 3.3, w: 8.6, h: 0.4, fontSize: 13, color: 'CFE0F0', fontFace: FONT });
}

/* ---------- 2 三個結論 ---------- */
{
  const s = slide('三個結論', '先講結果，後面是佐證');
  const boxes = [
    { c: GREEN, t: '① 看不到 9.1.1 的原因', d: 'Fleet lifecycle 元件本身仍是 9.1.0。它不在一般元件清單裡，必須先由 Upgrade 分頁上方的獨立區塊自升。與倉儲 metadata 無關。' },
    { c: RED, t: '② 外部 vRA 8 不能就地升級', d: '可以匯入納管，但升級 Precheck 於 import_vcfa 失敗：工作流需在該 VCF 的 vCenter 內查來源 VM 的網路 MoRef。' },
    { c: AMBER, t: '③ 8.18→9.1.1 升級成功，但 fleet 誤報失敗', d: '部署階段 2 小時逾時讓任務被判失敗；實際上來源已自動關機、新叢集接管 VIP/FQDN、資料完整。帳面停在佔位版本 8.0.0，內建重試無法修復：客戶走 support case，lab 以手動補完驗證。' },
  ];
  boxes.forEach((b, i) => {
    const y = 1.25 + i * 1.32;
    s.addShape(p.ShapeType.roundRect, { x: 0.6, y, w: W - 1.2, h: 1.15, fill: { color: 'F7F9FC' }, line: { color: b.c, width: 1.5 }, rectRadius: 0.06 });
    s.addText(b.t, { x: 0.8, y: y + 0.1, w: 8.6, h: 0.35, fontSize: 15, bold: true, color: b.c, fontFace: FONT });
    s.addText(b.d, { x: 0.8, y: y + 0.46, w: 8.6, h: 0.6, fontSize: 12, color: '333333', fontFace: FONT });
  });
}

/* ---------- 3 升級成果 ---------- */
{
  const s = slide('升級成果', 'VCF Management 八個元件全部到 9.1.1');
  tableSimple(s, ['元件', '起點', '結果', '耗時'], [
    ['VCF Operations', '8.18.6', '9.1.1.0.25679751', '23 分'],
    ['Fleet lifecycle', '9.1.0.0400', '9.1.1.0.25713934', '102 分'],
    ['Software depot', '9.1.0.0400', '9.1.1.0.25713941', '51 分'],
    ['VCF services runtime', '9.1.0.0', '9.1.1.0.25714471', '101 分'],
    ['Identity broker / Salt ×2 / SDDC lifecycle / Telemetry', '9.1.0.0', '9.1.1.0', '批次 125 分'],
    ['VCF Automation', '8.18.1', '9.1.1.0.25714559', '7 時 55 分'],
  ], { colW: [3.6, 1.8, 2.4, 1.0], rowH: 0.32 });
  kpi(s, [
    { v: '9 / 9', k: '元件完成' },
    { v: '約 16 小時', k: '總耗時' },
    { v: '0', k: '資料遺失' },
    { v: '1', k: 'fleet 誤報失敗（Automation）', color: AMBER },
  ]);
}

/* ---------- 4 問題一 ---------- */
{
  const s = slide('問題一：目標版本看不到 9.1.1', 'Change target version 只列 9.1.0.*');
  bullets(s, [
    { t: '做過但無效（排除清單）', bold: true, color: BLUE },
    { t: '補齊倉儲全部 9.1.1 二進位檔', lvl: 1 },
    { t: '用 VCF Download Tool 9.1.1 重下 metadata', lvl: 1 },
    { t: 'UI Sync 共 21 次，全部 SUCCEEDED', lvl: 1 },
    { t: '先把 Software depot 升到 9.1.0.0400', lvl: 1 },
    { t: '（實驗）改 manifest 的 minInstallerVersion 與 bom，兩次皆已還原', lvl: 1 },
    { t: '倉儲存取紀錄證明 fleet 每次都拿到新 metadata → 問題在 fleet 端判讀', color: AMBER },
  ], { y: 1.25, w: 4.4, fontSize: 13 });
  pic(s, '99-fleet-lifecycle-section.png', { x: 5.15, y: 1.35, w: 4.35, h: 2.39 });
  s.addText('圖：Upgrade 分頁上方的獨立 Fleet Lifecycle 區塊', { x: 5.15, y: 3.78, w: 4.35, h: 0.3, fontSize: 10, color: GRAY, align: 'center', fontFace: FONT });
}

/* ---------- 5 正解 ---------- */
{
  const s = slide('正解：Fleet lifecycle 必須自己先升', 'VCF 9.1.1 Release Notes 的第一步');
  s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.25, w: W - 1.2, h: 0.95, fill: { color: 'F2F6FA' }, line: { color: BLUE, width: 1 }, rectRadius: 0.05 });
  s.addText('“You begin applying the 9.1.1.0 maintenance release in your 9.1.0.x environment by patching the VCF management services fleet lifecycle component to 9.1.1.0 before any other VCF component.”',
    { x: 0.8, y: 1.35, w: 8.6, h: 0.75, fontSize: 12, italic: true, color: '333333', fontFace: FONT });
  bullets(s, [
    'Fleet lifecycle 不在元件清單，也不在升級計畫內，走自己的 API',
    '路徑：Upgrade 分頁 › Fleet Lifecycle 區塊 › ⋯ Available actions › Select version',
    '升級歷時 102 分鐘，七個階段；完成後 release 清單立即出現 9.1.1，無須再 Sync',
    { t: '「REQUIRED」只代表本次需要該套件，不是倉儲缺件', color: AMBER },
  ], { y: 2.35, w: 4.4, fontSize: 13 });
  pic(s, '101-fleet-lifecycle-select-version.png', { x: 5.15, y: 2.3, w: 4.35, h: 2.39 });
}

/* ---------- 6 升級順序 ---------- */
{
  const s = slide('升級順序與相依關係', '依 9.1.1 Release Notes');
  const steps = [
    ['1', 'Fleet lifecycle', '必須最先'],
    ['2', 'Software depot', '升級期間會擋住其他元件'],
    ['3', 'VCF services runtime', 'Identity broker / Salt RaaS 的前置'],
    ['4', 'Identity broker · Salt RaaS', '需 VSP ≥ 9.1.1'],
    ['5', 'Salt master · SDDC lifecycle · Telemetry', '無相依'],
    ['6', 'VCF Automation', 'Migration service engine 的前置'],
  ];
  steps.forEach((st, i) => {
    const y = 1.3 + i * 0.62;
    s.addShape(p.ShapeType.roundRect, { x: 0.6, y, w: 0.5, h: 0.5, fill: { color: BLUE }, rectRadius: 0.08 });
    s.addText(st[0], { x: 0.6, y, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: FONT });
    s.addText(st[1], { x: 1.25, y: y + 0.02, w: 4.2, h: 0.28, fontSize: 14, bold: true, color: '333333', fontFace: FONT });
    s.addText(st[2], { x: 1.25, y: y + 0.27, w: 7.9, h: 0.26, fontSize: 11, color: GRAY, fontFace: FONT });
  });
}

/* ---------- 7 假失敗 ---------- */
{
  const s = slide('陷阱：VCF services runtime 的「假失敗」', 'UI 報錯，但底層其實成功');
  s.addText('Unexpected error occurred while checking task:\n400 Bad Request: "Client sent an HTTP request to an HTTPS server."',
    { x: 0.6, y: 1.3, w: 4.4, h: 0.8, fontSize: 11, fontFace: 'Consolas', color: RED, fill: { color: 'FDF2F2' } });
  bullets(s, [
    '官方已知問題：fleet lifecycle 就跑在被輪替的 VSP 節點上',
    '節點輪替期間失去自身 API → 任務誤判 FAILED',
    { t: '查證方式：kubectl get pd -A → vmsp-platform = Successful', color: GREEN },
    'kubectl get nodes → 四節點全換新，K8s 1.34.2 → 1.35.6',
    'fleet UI 重整後該列直接消失 = 已達目標版本',
  ], { y: 2.25, w: 4.4, fontSize: 13 });
  pic(s, '114-precheck-results-911.png', { x: 5.15, y: 1.35, w: 4.35, h: 2.39 });
  s.addText('判斷 fleet 任務真偽，一律以 kubectl 的 PackageDeployment 為準', { x: 5.15, y: 3.85, w: 4.35, h: 0.5, fontSize: 12, bold: true, color: AMBER, align: 'center', fontFace: FONT });
}

/* ---------- 8 問題二：官方原文 ---------- */
{
  const s = slide('問題二：外部 vRA 8 的限制', '官方原文，出現在「匯入」頁面而非「升級」頁面');
  s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.25, w: W - 1.2, h: 1.05, fill: { color: 'F2F6FA' }, line: { color: BLUE, width: 1 }, rectRadius: 0.05 });
  s.addText('“Verify that your VMware Aria Automation 8.18.1 and later instance resides in the management domain of the VCF Instance where you want to import it to. To move VMware Aria Automation to a different vCenter, you must reconfigure the network.”',
    { x: 0.8, y: 1.33, w: 8.6, h: 0.9, fontSize: 12, italic: true, color: '333333', fontFace: FONT });
  s.addText('— Import an Existing VMware Aria Automation Instance in VCF Operations（VCF 9.1）', { x: 0.8, y: 2.32, w: 8.6, h: 0.25, fontSize: 10, color: GRAY, fontFace: FONT });
  bullets(s, [
    { t: '「Perform the Upgrade to VCF Automation 9.1」的前置清單並未重述這一條', color: AMBER },
    '因此這個限制容易被忽略，直到升級階段才浮現',
    'KB 425169 給出兩條解法：把 VM 搬進管理網域，或把承載它的 vCenter 以工作負載網域匯入',
  ], { y: 2.7, w: W - 1.2, fontSize: 13 });
}

/* ---------- 9 實測失敗點 ---------- */
{
  const s = slide('實測：Precheck 卡在 import_vcfa', 'UI 只給參考碼，真因要進叢集看');
  const stages = ['set_upgrade_context', 'set_variables', 'validate_vsp_cluster_input', 'validate_vcfa_vmsp_version_compatibility', 'vmsp_stage_plugin', 'import_vcfa'];
  stages.forEach((st, i) => {
    const ok = i < 5;
    const y = 1.3 + i * 0.42;
    s.addShape(p.ShapeType.roundRect, { x: 0.6, y, w: 4.3, h: 0.34, fill: { color: ok ? 'EAF4EA' : 'FDF2F2' }, line: { color: ok ? GREEN : RED, width: 1 }, rectRadius: 0.04 });
    s.addText((ok ? '✓  ' : '✕  ') + st, { x: 0.75, y, w: 4.1, h: 0.34, fontSize: 11, color: ok ? GREEN : RED, valign: 'middle', fontFace: FONT });
  });
  s.addText('kubectl -n prelude logs <import-pod>\n\n[INFO] Collecting network MoRef from vCenter using govc...\n[INFO] Source system IP: 10.0.0.168\nERROR : Script exited unexpectedly at line 1 with exit code 1',
    { x: 5.15, y: 1.3, w: 4.35, h: 1.5, fontSize: 10, fontFace: 'Consolas', color: '333333', fill: { color: 'F2F2F2' } });
  s.addText('工作流要在該 VCF 的 vCenter 內，用來源 IP 查出網路物件，才能把新節點放到同一個網路。來源不在該 vCenter 的清單裡 → 查無結果 → 退出。',
    { x: 5.15, y: 2.95, w: 4.35, h: 1.0, fontSize: 12, color: '333333', fontFace: FONT });
  s.addText('這是「不在管理網域」的實際強制點', { x: 0.6, y: 4.0, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: RED, align: 'center', fontFace: FONT });
}

/* ---------- 10 遷移 ---------- */
{
  const s = slide('把來源 VM 搬進管理網域', '官方只寫「要重新設定網路」，沒有步驟');
  tableSimple(s, ['項目', '來源', '目的'], [
    ['vCenter', '外層 8.0.3', '管理網域 9.1.1'],
    ['主機 / 儲存', '實體主機 / 本機 SSD', '巢狀 esx04 / vSAN'],
    ['連接埠群組', 'VM Network', 'SDDC-DPortGroup-VM-Mgmt'],
    ['IP / FQDN', '10.0.0.168 / vra9.home.lab', '不變'],
  ], { colW: [1.9, 3.3, 3.6], rowH: 0.34, y: 1.3 });
  bullets(s, [
    { t: '熱遷移不可行：巢狀主機缺 misc.ibrs_all / mds_no / rdcl_no / rsba_no / cpuid.xsaves', color: RED },
    { t: 'PowerCLI 的錯誤訊息具誤導性，真因要看來源 vCenter 的工作清單', color: AMBER },
    '改用冷遷移：關機 2.5 分 → 搬遷 96.8 分（165 GB）→ 開機 2.3 分',
  ], { y: 2.95, h: 1.0, w: W - 1.2, fontSize: 13 });
  kpi(s, [
    { v: '165 GB', k: '傳輸量' },
    { v: '約 100 分', k: '停機時間' },
    { v: '不變', k: 'IP / FQDN', color: GREEN },
  ]);
}

/* ---------- 11 給客戶的建議 ---------- */
{
  const s = slide('對客戶情境的建議', '既有 vRA 8 部署在 VCF 之外的 vCenter');
  const cards = [
    { c: GREEN, t: '可以做到', d: '匯入並納管：外部 vRA 8.18.1 以上可直接匯入 VCF Operations 成為 VCF Automation 元件，對來源系統無影響（不建快照、不停服務）。' },
    { c: RED, t: '做不到', d: '就地升級：Precheck 於 import_vcfa 失敗，工作流必須在該 VCF 的 vCenter 內查得來源 VM 的網路物件。' },
    { c: BLUE, t: '兩條路徑', d: 'A：把 VM 遷入管理網域（同網段可保留 IP；需評估冷遷移停機）。　B：把承載 vRA 的 vCenter 以工作負載網域匯入 VCF，不必搬機器，對多套 vCenter 更務實。' },
  ];
  cards.forEach((b, i) => {
    const y = 1.25 + i * 1.32;
    s.addShape(p.ShapeType.roundRect, { x: 0.6, y, w: W - 1.2, h: 1.15, fill: { color: 'F7F9FC' }, line: { color: b.c, width: 1.5 }, rectRadius: 0.06 });
    s.addText(b.t, { x: 0.8, y: y + 0.1, w: 8.6, h: 0.32, fontSize: 15, bold: true, color: b.c, fontFace: FONT });
    s.addText(b.d, { x: 0.8, y: y + 0.44, w: 8.6, h: 0.62, fontSize: 12, color: '333333', fontFace: FONT });
  });
}

/* ---------- 12 實務要點 ---------- */
{
  const s = slide('實務要點與坑', '操作與判讀');
  tableSimple(s, ['項目', '說明'], [
    ['Fleet lifecycle 升級入口', '不在元件清單，於 Upgrade 分頁上方獨立區塊的 kebab 選單'],
    ['單一元件 UPGRADE', '無二次確認，按下即執行'],
    ['批次 UPGRADE (n)', '有確認框，且該按鈕只吃真實滑鼠事件'],
    ['RUN PRECHECKS (ALL)', '未勾選任何列時按下無效，要先勾選'],
    ['UI 與 API 落差', '列狀態常落後，判斷以 API 與 kubectl 為準'],
    ['錯誤訊息位置', '真因在任務 stages[].messages[]，前面常有一句無意義的 Internal error'],
    ['VSP 節點輪替', 'IP 沿用但主機金鑰全換，SSH 快取需清除'],
  ], { colW: [2.9, 6.1], rowH: 0.34, fontSize: 11 });
}


/* ---------- 11 VCFA 升級：假失敗 ---------- */
{
  const s = slide('VCF Automation 升級：任務失敗，升級其實完成', '8.18 → 9.1.1 藍綠升級，7 小時 55 分');
  s.addText('Component deployment failed for component type vcfa ... [VCFMS-UPGRADE-COMPONENT-031]\n真因（新叢集 workflow log）: existing package deployment is in progress, waiting for it to complete → 2h timeout',
    { x: 0.6, y: 1.25, w: 4.4, h: 0.95, fontSize: 10, fontFace: 'Consolas', color: RED, fill: { color: 'FDF2F2' } });
  tableSimple(s, ['證據', '結果'], [
    ['來源 8.18 VM', '已被流程自動關機'],
    ['新叢集閘道', 'VIP 10.0.0.168 / vra9.home.lab 已接管'],
    ['端點指紋', '/tm/api-explorer 回 200（9.x 才有）'],
    ['資料', '3 藍圖 / 1 部署 / 52 VM 完整'],
  ], { x: 0.6, y: 2.35, w: 4.4, colW: [1.5, 2.9], rowH: 0.3, fontSize: 10 });
  pic(s, '907-vcfa911-automation-console.png', { x: 5.15, y: 1.3, w: 4.35, h: 2.39 });
  s.addText('登入 9.1.1 主控台：資料完整（KB 441246 描述的正是此情況）', { x: 5.15, y: 3.75, w: 4.35, h: 0.4, fontSize: 10, color: GRAY, align: 'center', fontFace: FONT });
  s.addText('誤判而回滾才是真正的風險——先用 kubectl 看 PackageDeployment，再決定', { x: 0.6, y: 4.35, w: W - 1.2, h: 0.4, fontSize: 13, bold: true, color: AMBER, align: 'center', fontFace: FONT });
}

/* ---------- 12 重試為何無效 ---------- */
{
  const s = slide('重試為何無效', 'fleet 把元件記成佔位版本 8.0.0');
  bullets(s, [
    { t: '8.0.0 是匯入 8.x 時的佔位版本，正常由最後階段「Patch the target Component Version」改成 9.1.1；該階段停在 Pending', bold: true },
    '列上 UPGRADE：另建執行 → 404「No matching source version found for source 8.0.0 within catalog 9.1」',
    'Tasks 的 Retry：重跑整段 8.x 初始化（再拍快照、停服務、匯出、關機、掛碟）→ 撞快照上限「Exceeded the maximum number of permitted snapshots」',
    { t: '之後任務 retriable=false，內建手段用盡', color: RED },
  ], { y: 1.25, w: 4.4, fontSize: 12 });
  pic(s, '909-tasks-retry-clicked.png', { x: 5.15, y: 1.3, w: 4.35, h: 2.39 });
  s.addText('圖：Tasks 分頁按下 Retry 後，原任務回到 In Progress', { x: 5.15, y: 3.75, w: 4.35, h: 0.3, fontSize: 10, color: GRAY, align: 'center', fontFace: FONT });
}

/* ---------- 13 兩條路徑 ---------- */
{
  const s = slide('帳面不一致的兩條路徑', 'A 為正式建議；B 僅供實驗室驗證');
  const cards = [
    { c: BLUE, t: 'A　原廠支援案件（正式建議）', d: 'KB 441333：「VCF Automation Upgrade Failure cleanup is not supported」。附上四項證據說明升級本體已完成、僅需修正 fleet 紀錄。' },
    { c: RED, t: 'B　實驗室手動補完（非官方）', d: '① 卸載來源資料碟 ② 改新叢集 comp vcfa 的 versionRef / label / phase ③ 管理叢集殘留 CR 同步 ④ sddc-lcms refresh（sddc-lcm 自動變 9.1.1、fleet 版本不同步） ⑤ 改 fleet DB version → UI 顯示 All components are at their target versions。限制：fleet 對 VCFA 沒有 service account。' },
  ];
  cards.forEach((b, i) => {
    const y = 1.25 + i * 1.55;
    s.addShape(p.ShapeType.roundRect, { x: 0.6, y, w: W - 1.2, h: 1.4, fill: { color: 'F7F9FC' }, line: { color: b.c, width: 1.5 }, rectRadius: 0.06 });
    s.addText(b.t, { x: 0.8, y: y + 0.1, w: 8.6, h: 0.32, fontSize: 15, bold: true, color: b.c, fontFace: FONT });
    s.addText(b.d, { x: 0.8, y: y + 0.44, w: 8.6, h: 0.9, fontSize: 11.5, color: '333333', fontFace: FONT });
  });
  pic(s, '919-optionB-upgrade-tab-after-db-fix.png', { x: 3.0, y: 4.35, w: 4.0, h: 1.15 });
}

p.writeFile({ fileName: OUT }).then(f => console.log('WROTE', f));
