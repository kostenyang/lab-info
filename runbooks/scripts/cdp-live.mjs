/**
 * cdp-live.mjs — 像 cdp-flow.mjs,但「附著在既有分頁」且結束時不關分頁。
 * 用於多回合的精靈(wizard)操作:每次呼叫接續上一次的畫面狀態。
 *
 *   node cdp-live.mjs --steps '[{"clickText":"NEXT"},{"wait":3000},{"shot":"E:/x.png"}]'
 *   node cdp-live.mjs --url https://host/page --steps '[...]'      # 先導航再做
 *   node cdp-live.mjs --match ops01 --steps '[...]'                # 指定要附著的分頁(URL 子字串)
 *
 * 步驟型別:
 *   url / navigate  導航              waitFor  等 selector 出現
 *   fill  [[sel,val]]  (setter 事件)  type   [[sel,val]] (真滑鼠點+插字)
 *   click sel (el.click())            realClick sel (真滑鼠事件)
 *   clickText txt (button)            realClickText txt
 *   clickAny txt (任意元素文字完全符合)
 *   eval  js                          wait  ms
 *   scroll px | "bottom" | "top"      shot  檔名
 */
import { writeFileSync } from 'node:fs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const PORT = args.port || 9222;
const MATCH = args.match || null;
const STEPS = JSON.parse(args.steps || '[]');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const send = (ws, id, method, params = {}) => new Promise((resolve, reject) => {
  const onMsg = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.id === id) { ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result); }
  };
  ws.addEventListener('message', onMsg);
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error(method + ' timeout')); }, 120000);
});

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let pages = list.filter((t) => t.type === 'page' && /^https?:/.test(t.url));
if (MATCH) pages = pages.filter((t) => t.url.includes(MATCH));
let target = pages[0];
if (!target) {
  const r0 = await fetch(`http://127.0.0.1:${PORT}/json/new?${args.url || 'about:blank'}`, { method: 'PUT' });
  target = await r0.json();
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws fail')); });
let id = 0;
await send(ws, ++id, 'Page.enable');
await send(ws, ++id, 'Runtime.enable');
try { await send(ws, ++id, 'Security.enable');
      await send(ws, ++id, 'Security.setIgnoreCertificateErrors', { ignore: true }); } catch {}
console.error(`attached: ${target.url}`);

const ev = async (expr) => (await send(ws, ++id, 'Runtime.evaluate',
  { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const J = (v) => JSON.stringify(v);

async function navigate(url) {
  const loaded = new Promise((res) => {
    const h = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } };
    ws.addEventListener('message', h); setTimeout(res, 60000); });
  await send(ws, ++id, 'Page.navigate', { url });
  await loaded;
}
async function waitFor(sel, secs = 60) {
  for (let i = 0; i < secs; i++) { if (await ev(`!!document.querySelector(${J(sel)})`)) return true; await sleep(1000); }
  return false;
}
async function mouseAt(x, y) {
  await send(ws, ++id, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send(ws, ++id, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send(ws, ++id, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function boxOf(expr) {
  const b = await ev(`(()=>{const e=${expr}; if(!e) return null; e.scrollIntoView({block:'center'});
    const r=e.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});})()`);
  return b ? JSON.parse(b) : null;
}

for (const st of STEPS) {
  if (st.url || st.navigate) { await navigate(st.url || st.navigate); console.error(`  nav -> ${st.url || st.navigate}`); }
  if (st.waitFor) console.error(`  waitFor ${st.waitFor} -> ${await waitFor(st.waitFor, st.secs || 60)}`);
  if (st.fill) for (const [sel, val] of st.fill) {
    await waitFor(sel, 20);
    const r = await ev(`(() => { const el=document.querySelector(${J(sel)}); if(!el) return 'NOTFOUND';
      const p = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(p.prototype,'value').set.call(el, ${J(val)});
      el.focus(); el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); return 'OK'; })()`);
    console.error(`  fill ${sel} -> ${r}`); }
  if (st.type) for (const [sel, val] of st.type) {
    await waitFor(sel, 20);
    const box = await boxOf(`document.querySelector(${J(sel)})`);
    if (!box) { console.error(`  type ${sel} -> NOTFOUND`); continue; }
    await mouseAt(box.x, box.y); await sleep(150);
    await send(ws, ++id, 'Input.insertText', { text: val }); await sleep(150);
    await ev(`(()=>{const e=document.querySelector(${J(sel)});
      e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));
      e.blur(); return 1;})()`);
    console.error(`  type ${sel} -> OK`); }
  if (st.click) console.error(`  click ${st.click} -> ${await ev(
    `(()=>{const e=document.querySelector(${J(st.click)}); if(!e) return 'NOTFOUND'; e.click(); return 'CLICKED';})()`)}`);
  if (st.realClick) { const b = await boxOf(`document.querySelector(${J(st.realClick)})`);
    if (!b) console.error(`  realClick ${st.realClick} -> NOTFOUND`);
    else { await mouseAt(b.x, b.y); console.error(`  realClick ${st.realClick} -> @${b.x},${b.y}`); } }
  if (st.clickText) console.error(`  clickText ${st.clickText} -> ${await ev(
    `(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim().toUpperCase().includes(${J(String(st.clickText).toUpperCase())})&&!x.disabled).pop();
      if(!b) return 'NOTFOUND/DISABLED'; b.click(); return 'CLICKED';})()`)}`);
  if (st.realClickText) { const b = await boxOf(
    `[...document.querySelectorAll('button')].filter(x=>x.innerText.trim().toUpperCase().includes(${J(String(st.realClickText).toUpperCase())})&&!x.disabled).pop()`);
    if (!b) console.error(`  realClickText ${st.realClickText} -> NOTFOUND/DISABLED`);
    else { await mouseAt(b.x, b.y); console.error(`  realClickText ${st.realClickText} -> @${b.x},${b.y}`); } }
  if (st.clickAny) { const b = await boxOf(
    `[...document.querySelectorAll('a,span,label,div,li,button')].filter(x=>x.children.length===0&&x.innerText&&x.innerText.trim()===${J(st.clickAny)}).pop()`);
    if (!b) console.error(`  clickAny ${st.clickAny} -> NOTFOUND`);
    else { await mouseAt(b.x, b.y); console.error(`  clickAny ${st.clickAny} -> @${b.x},${b.y}`); } }
  if (st.key) { // 例: {"key":"ArrowDown"} / {"key":"Enter"}
    const map = { Enter: [13, 'Enter'], ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'],
                  Tab: [9, 'Tab'], Escape: [27, 'Escape'] };
    const [code, k] = map[st.key] || [0, st.key];
    for (const type of ['keyDown', 'keyUp']) {
      await send(ws, ++id, 'Input.dispatchKeyEvent',
        { type, key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
          text: st.key === 'Enter' ? '\r' : undefined });
    }
    console.error(`  key ${st.key}`);
  }
  if (st.cdp) { // 直接下任意 CDP 指令,例: {"cdp":{"method":"Network.clearBrowserCookies"}}
    console.error(`  cdp ${st.cdp.method} -> ${JSON.stringify(await send(ws, ++id, st.cdp.method, st.cdp.params || {}))}`);
  }
  if (st.eval) console.log(await ev(st.eval));
  if (st.scroll !== undefined) {
    const amt = st.scroll === 'bottom' ? 999999 : st.scroll === 'top' ? -999999 : st.scroll;
    console.error(`  scroll -> ${await ev(`(()=>{const c=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50&&e.clientHeight>300).pop();
      const t=${amt}; if(c){ c.scrollTop = t>900000? c.scrollHeight : t<-900000? 0 : c.scrollTop+t; return 'el:'+c.className.slice(0,30);}
      window.scrollBy(0, t); return 'win';})()`)}`); }
  if (st.wait) await sleep(st.wait);
  if (st.shot) { const s = await send(ws, ++id, 'Page.captureScreenshot', { format: 'png' });
    writeFileSync(st.shot, Buffer.from(s.data, 'base64'));
    console.log(`SHOT ${st.shot}  url=${await ev('location.href')}`); }
}
ws.close();

process.exit(0);
