// Poll all in-flight APPLY tasks until none are running; also mirrors kubectl PackageDeployment state.
import { inFrame, shot } from './fleet.mjs';
import { execFileSync } from 'node:child_process';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);

const pd = () => {
  try {
    return execFileSync('bash', ['/c/Users/ADMINI~1/AppData/Local/Temp/claude/E--9-1/f96e7309-0dce-47fa-bf06-c7a072c0bace/scratchpad/vsp.sh',
      "echo 'VMware1!VMware1!' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf get pd -A --no-headers 2>/dev/null | awk '{print $2\"=\"$4}' | tr '\\n' ' '"],
      { encoding: 'utf8', timeout: 120000 }).split('\n').filter(l => l.includes('=')).join(' ').trim();
  } catch { return 'pd? '; }
};

for (let i = 0; i < 90; i++) {
  let out;
  try {
    out = await inFrame(`
      const t=await (await F('tasks?pageNumber=1&pageSize=10')).json();
      const ap=t.elements.filter(e=>e.type==='APPLY').slice(0,6);
      return JSON.stringify({busy:ap.filter(e=>e.status==='RUNNING'||e.status==='PENDING').length,
        apply:ap.map(e=>e.resourceType+'='+e.status), rowCount:rows().length});
    `);
  } catch (e) { out = 'ERR ' + String(e.message).slice(0, 70); }
  const k = (i % 3 === 0) ? pd() : '';
  console.log(`[${stamp()}] ${out} ${k}`);
  if (typeof out === 'string' && out.includes('"busy":0')) {
    await shot('E:/9.1/doc-shots/vrops-upgrade/125-batch-upgrade-done.png');
    console.log('=== BATCH DONE ===');
    console.log(await inFrame(`return JSON.stringify(rows().map(r=>r.slice(0,120)))`));
    process.exit(0);
  }
  await sleep(120000);
}
console.log('TIMEOUT');
