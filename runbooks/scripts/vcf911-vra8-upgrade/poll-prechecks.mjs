import { inFrame } from './fleet.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);
for (let i = 0; i < 60; i++) {
  let out;
  try {
    out = await inFrame(`
      const t=await (await F('tasks?pageNumber=1&pageSize=10')).json();
      const pre=t.elements.filter(e=>e.type==='PRECHECK').slice(0,8);
      const busy=pre.filter(e=>e.status==='RUNNING'||e.status==='PENDING').length;
      return JSON.stringify({busy,pre:pre.map(e=>e.resourceType+'='+e.status)});
    `);
  } catch (e) { out = 'ERR ' + e.message; }
  console.log(`[${stamp()}] ${out}`);
  if (typeof out === 'string' && out.includes('"busy":0')) { console.log('=== PRECHECKS DONE ==='); process.exit(0); }
  await sleep(60000);
}
console.log('TIMEOUT');
