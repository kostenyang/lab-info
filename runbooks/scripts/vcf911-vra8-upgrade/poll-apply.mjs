// poll-apply.mjs <RESOURCE_TYPE> <expectedVersionPrefix>
// Watches the newest APPLY task for a component type until it leaves RUNNING.
import { inFrame } from './fleet.mjs';
const RES = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);

for (let i = 0; i < 120; i++) {
  let out;
  try {
    out = await inFrame(`
      const t=await (await F('tasks?pageNumber=1&pageSize=8')).json();
      const a=t.elements.find(e=>e.type==='APPLY'&&e.resourceType===${JSON.stringify(RES)});
      if(!a)return JSON.stringify({none:true});
      const d=await (await F('tasks/'+a.id)).json();
      const row=[...fd.querySelectorAll('clr-dg-row')].map(r=>sq(r.innerText)).find(r=>r.indexOf(${JSON.stringify(RES)})===0)||'';
      return JSON.stringify({status:d.status,stages:(d.stages||[]).map(s=>s.name+':'+s.status).join(','),row:row.slice(0,95)});
    `);
  } catch (e) { out = 'ERR ' + String(e.message).slice(0, 90); }
  console.log(`[${stamp()}] ${out}`);
  if (typeof out === 'string') {
    if (out.includes('"status":"SUCCEEDED"')) { console.log('=== APPLY SUCCEEDED ==='); process.exit(0); }
    if (out.includes('"status":"FAILED"')) { console.log('=== APPLY FAILED ==='); process.exit(1); }
  }
  await sleep(120000);
}
console.log('TIMEOUT');
