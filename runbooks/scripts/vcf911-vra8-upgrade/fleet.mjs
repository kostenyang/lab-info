// fleet.mjs — helper: run arbitrary JS inside the fleet-lcm iframe of the Ops Lifecycle tab.
// usage: node fleet.mjs "<expression returning string/JSON>"   (expression may use `fd`, `F` (fd fetch), `sq`)
const PORT = 9222;
const MATCH = 'ops01.home.lab/vcf-operations/ui/build/lifecycle';

export async function attach() {
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const t = tabs.find((x) => x.type === 'page' && x.url.includes(MATCH));
  if (!t) throw new Error('no lifecycle tab (url now: ' + tabs.filter(x => x.type === 'page').map(x => x.url).join(' | ') + ')');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 15000); });
  let id = 0;
  const send = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    const h = (ev) => { const m = JSON.parse(ev.data); if (m.id === myId) { ws.removeEventListener('message', h); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: myId, method, params }));
    setTimeout(() => { ws.removeEventListener('message', h); reject(new Error('timeout ' + method)); }, 90000);
  });
  return { ws, send };
}

export async function inFrame(body) {
  const { ws, send } = await attach();
  const expr = `(async()=>{
    let fd=null;const w=(r)=>{r.querySelectorAll('*').forEach(e=>{if(fd)return;if(e.shadowRoot)w(e.shadowRoot);
      if(e.tagName==='IFRAME'&&(e.src||'').indexOf('fleet-lcm')>=0)fd=e.contentDocument;});};w(document);
    if(!fd)return 'NO_FRAME';
    const F=(p,o)=>fd.defaultView.fetch(p.startsWith('/')?p:'/vcf-operations/plug/fleet-lcm/v1/'+p,Object.assign({credentials:'include'},o||{}));
    const sq=(s)=>String(s).split('\\n').join(' ').split(' ').filter(Boolean).join(' ');
    const rows=()=>[...fd.querySelectorAll('clr-dg-row')].map(r=>sq(r.innerText));
    const btn=(txt)=>[...fd.querySelectorAll('button')].find(b=>sq(b.innerText)===txt);
    try{ return await (async()=>{ ${body} })(); }catch(e){ return 'ERR: '+String(e && e.message || e); }
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  ws.close();
  return r.result && r.result.value;
}

export async function shot(path) {
  const { ws, send } = await attach();
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path, Buffer.from(s.data, 'base64'));
  ws.close();
  return path;
}

if (process.argv[2]) {
  const out = await inFrame(process.argv[2]);
  console.log(typeof out === 'string' ? out : JSON.stringify(out));
  if (process.argv[3]) console.log('SHOT ' + await shot(process.argv[3]));
}
