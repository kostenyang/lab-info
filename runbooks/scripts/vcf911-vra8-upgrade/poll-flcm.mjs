// Poll the fleet-lcm self-upgrade via CDP, printing currentVersion + stage names.
const PORT = 9222;
const MATCH = 'ops01.home.lab/vcf-operations/ui/build/lifecycle';
const TASK = '01a07c45-5cf4-7d1b-87e1-45477c399024';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once() {
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const t = tabs.find((x) => x.type === 'page' && x.url.includes(MATCH));
  if (!t) return { err: 'no tab' };
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 15000); });
  let id = 0;
  const send = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    const h = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === myId) { ws.removeEventListener('message', h); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: myId, method, params }));
    setTimeout(() => { ws.removeEventListener('message', h); reject(new Error('timeout')); }, 60000);
  });

  const expr = `(async()=>{
    let fd=null;const w=(r)=>{r.querySelectorAll('*').forEach(e=>{if(fd)return;if(e.shadowRoot)w(e.shadowRoot);
      if(e.tagName==='IFRAME'&&(e.src||'').indexOf('fleet-lcm')>=0)fd=e.contentDocument;});};w(document);
    if(!fd)return JSON.stringify({err:'no frame'});
    const F=fd.defaultView.fetch;const base='/vcf-operations/plug/fleet-lcm/v1/';
    const out={};
    try{const s=await (await F(base+'system',{credentials:'include'})).json();
      out.cur=s.currentVersion;out.tgt=s.targetVersion;out.up=s.upgrade&&s.upgrade.status;}catch(e){out.sysErr=String(e).slice(0,80)}
    try{const d=await (await F(base+'tasks/${TASK}',{credentials:'include'})).json();
      out.task=d.status;out.stages=(d.stages||[]).map(x=>x.name+':'+x.status).join(',');}catch(e){out.taskErr=String(e).slice(0,80)}
    try{const r=await (await F(base+'releases?pageNumber=1&pageSize=100',{credentials:'include'})).text();
      out.has911=r.indexOf('9.1.1')>=0;}catch(e){}
    return JSON.stringify(out);
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  ws.close();
  try { return JSON.parse(r.result.value); } catch { return { raw: String(r.result && r.result.value).slice(0, 200) }; }
}

const stamp = () => new Date().toTimeString().slice(0, 8);
for (let i = 0; i < 90; i++) {
  let o;
  try { o = await once(); } catch (e) { o = { err: String(e.message).slice(0, 80) }; }
  console.log(`[${stamp()}] ${JSON.stringify(o)}`);
  if (o.cur && o.cur.startsWith('9.1.1.0')) { console.log('=== FLEET LCM NOW 9.1.1.0 ==='); process.exit(0); }
  if (o.task === 'FAILED') { console.log('=== UPGRADE FAILED ==='); process.exit(1); }
  await sleep(120000);
}
console.log('TIMEOUT');
