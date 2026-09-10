// Log into VCF Operations with plain HTTP (reliable), then inject the resulting cookies into the
// automation browser with CDP. Avoids the ExtJS login page, which repeatedly wedges the renderer.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = 9222;
const HOST = 'vcf-m02-ops01.home.lab';
const JAR = 'C:/Users/ADMINI~1/AppData/Local/Temp/claude/E--9-1/f96e7309-0dce-47fa-bf06-c7a072c0bace/scratchpad/ops-inject-jar.txt';
const URI = 'dmNmLW9wZXJhdGlvbnMvdWkvYnVpbGQvbGlmZWN5Y2xlP3Jlc291cmNlSWQ9bWFuYWdlbWVudC1saWZlY3ljbGU=';
const TARGET = `https://${HOST}/vcf-operations/ui/build/lifecycle?resourceId=management-lifecycle`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (args) => execFileSync('curl', args, { encoding: 'utf8', timeout: 60000 });

try { execFileSync('cmd', ['/c', 'del', '/q', JAR.replace(/\//g, '\\')], { stdio: 'ignore' }); } catch {}

sh(['-sk', '-c', JAR, '-o', 'NUL', `https://${HOST}/ui/login.action?vcf=1&uri=${URI}`]);
const resp = sh(['-sk', '-b', JAR, '-c', JAR, '-X', 'POST', `https://${HOST}/ui/login.action`,
  '-H', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
  '-H', 'X-Requested-With: XMLHttpRequest',
  '--data-urlencode', 'mainAction=login',
  '--data-urlencode', 'userName=admin',
  '--data-urlencode', 'password=VMware1!VMware1!',
  '--data-urlencode', 'authSourceId=localItem',
  '--data-urlencode', 'authSourceName=Local Account',
  '--data-urlencode', 'authSourceType=',
  '--data-urlencode', `uri=${URI}`,
  '--data-urlencode', 'forceLogin=true',
  '--data-urlencode', 'timezone=480']);
console.log('login resp:', resp.trim().slice(0, 60));
// follow the deep link so the server also mints the /vcf-operations session
for (const u of [`https://${HOST}/ui/index.action`, TARGET, `https://${HOST}/vcf-operations/plug/fleet-lcm/ui/index.html`]) {
  const code = sh(['-sk', '-L', '-b', JAR, '-c', JAR, '-o', 'NUL', '-w', '%{http_code}', u]);
  console.log('  bootstrap', u.replace(`https://${HOST}`, ''), '->', code);
}

const jar = readFileSync(JAR, 'utf8').split('\n')
  .filter(l => l && !l.startsWith('#') || l.startsWith('#HttpOnly_'))
  .map(l => l.replace(/^#HttpOnly_/, '').split('\t'))
  .filter(f => f.length >= 7)
  .map(f => ({ domain: f[0], path: f[2], secure: f[3] === 'TRUE', name: f[5], value: f[6].trim() }));
console.log('cookies:', jar.map(c => `${c.name}@${c.path}`).join(', '));
if (!jar.some(c => c.path === '/vcf-operations')) { console.log('NO /vcf-operations SESSION - abort'); process.exit(1); }

const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const pages = tabs.filter(t => t.type === 'page');
const t = pages.find(x => x.url === 'about:blank') || pages[0];
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('ws')), 10000); });
let id = 0;
const send = (method, params, ms = 30000) => new Promise((resolve, reject) => {
  const myId = ++id;
  const h = (ev) => { const m = JSON.parse(ev.data); if (m.id === myId) { ws.removeEventListener('message', h); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
  ws.addEventListener('message', h);
  ws.send(JSON.stringify({ id: myId, method, params }));
  setTimeout(() => { ws.removeEventListener('message', h); reject(new Error('timeout ' + method)); }, ms);
});

await send('Network.enable', {});
await send('Network.clearBrowserCookies', {});
for (const c of jar) {
  await send('Network.setCookie', { name: c.name, value: c.value, domain: c.domain, path: c.path, secure: true, httpOnly: true });
}
console.log('injected', jar.length, 'cookies');

await send('Page.enable', {});
await send('Page.navigate', { url: TARGET });
await sleep(20000);
const out = await send('Runtime.evaluate', {
  expression: `(()=>{let f=false;const w=(r)=>{r.querySelectorAll('*').forEach(e=>{if(f)return;if(e.shadowRoot)w(e.shadowRoot);if(e.tagName==='IFRAME'&&(e.src||'').indexOf('fleet-lcm')>=0)f=true;});};w(document);
    return JSON.stringify({url:location.href.slice(0,70),frame:f})})()`, returnByValue: true
}, 25000).then(r => r.result?.value).catch(e => 'ERR ' + e.message);
console.log('result:', out);
ws.close();
