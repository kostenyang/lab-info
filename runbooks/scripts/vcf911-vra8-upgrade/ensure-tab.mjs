// Make sure some tab is on the fleet Lifecycle page, without disturbing tabs the user is using.
// Prefers an existing lifecycle tab, else an about:blank tab; logs in (Local Account) when redirected.
const PORT = 9222;
const URL = 'https://vcf-m02-ops01.home.lab/vcf-operations/ui/build/lifecycle?resourceId=management-lifecycle';
const USER = 'admin';
const PASS = 'VMware1!VMware1!';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function conn(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 15000); });
  let id = 0;
  const send = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    const h = (ev) => { const m = JSON.parse(ev.data); if (m.id === myId) { ws.removeEventListener('message', h); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: myId, method, params }));
    setTimeout(() => { ws.removeEventListener('message', h); reject(new Error('timeout ' + method)); }, 60000);
  });
  const ev = async (e, aw = false) => (await send('Runtime.evaluate', { expression: e, awaitPromise: aw, returnByValue: true })).result?.value;
  const mouse = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 }); };
  return { ws, send, ev, mouse };
}

const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const pages = tabs.filter((t) => t.type === 'page');
let target = pages.find((t) => t.url.includes('/vcf-operations/ui/build/lifecycle'))
  || pages.find((t) => t.url.includes('ops01.home.lab'))
  || pages.find((t) => t.url === 'about:blank');
if (!target) { console.log('NO_FREE_TAB'); process.exit(2); }
console.log('using tab: ' + target.url.slice(0, 70));

let c = await conn(target);
let href = await c.ev('location.href');
if (!href.includes('/vcf-operations/ui/build/lifecycle')) {
  await c.ev(`location.href=${JSON.stringify(URL)}`);
  await sleep(14000);
  href = await c.ev('location.href');
}
console.log('after nav: ' + href.slice(0, 80));

if (href.includes('login.action')) {
  // The Login Method combo only opens when the click lands just inside the field's right edge.
  const box = await c.ev(`(()=>{const t=document.querySelector('#authSelector-trigger-picker')||document.querySelector('#authSelector-inputEl');if(!t)return null;const r=t.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`);
  if (box) {
    const p = JSON.parse(box);
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = await c.ev(`document.querySelector('#authSelector-inputEl').value`);
      if (cur === 'Local Account') break;
      await c.mouse(p.x, p.y);
      await sleep(2000);
      const it = await c.ev(`(()=>{const i=[...document.querySelectorAll('.x-boundlist-item')].find(e=>e.innerText.trim()==='Local Account');if(!i)return null;const r=i.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`);
      if (it) { const q = JSON.parse(it); await c.mouse(q.x, q.y); await sleep(2000); }
      else console.log('  attempt ' + (attempt + 1) + ': dropdown did not open');
    }
    const auth = await c.ev(`document.querySelector('#authSelector-inputEl').value`);
    console.log('auth = ' + auth);
    if (auth !== 'Local Account') { console.log('ABORT: could not select Local Account'); c.ws.close(); process.exit(3); }
    await c.ev(`(()=>{const set=(s,v)=>{const el=document.querySelector(s);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};set('#userName-inputEl',${JSON.stringify(USER)});set('#password-inputEl',${JSON.stringify(PASS)});return 1})()`);
    const lb = await c.ev(`(()=>{const b=[...document.querySelectorAll('a,button')].find(e=>e.innerText.trim()==='LOG IN');const r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`);
    const l = JSON.parse(lb);
    await c.mouse(l.x, l.y);
    await sleep(55000);
    href = await c.ev('location.href');
    console.log('after login: ' + href.slice(0, 80));
  }
}

// make sure the Upgrade tab is open
const st = await c.ev(`(()=>{let fd=null;const w=(r)=>{r.querySelectorAll('*').forEach(e=>{if(fd)return;if(e.shadowRoot)w(e.shadowRoot);if(e.tagName==='IFRAME'&&(e.src||'').indexOf('fleet-lcm')>=0)fd=e.contentDocument;});};w(document);
  if(!fd)return 'NO_FRAME';
  const sq=(s)=>String(s).split('\\n').join(' ').split(' ').filter(Boolean).join(' ');
  const b=[...fd.querySelectorAll('button')].find(x=>sq(x.innerText)==='Upgrade');if(b)b.click();
  return 'frame ok';})()`);
console.log('frame: ' + st);
c.ws.close();
