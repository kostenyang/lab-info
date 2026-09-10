// poll-task.mjs <taskId> <firstShotNo>  — poll one fleet task by id every 3 min, screenshot every other poll.
import { inFrame, shot } from './fleet.mjs';
const ID = process.argv[2]; let n = Number(process.argv[3] || 910);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);
const DIR = 'E:/9.1/doc-shots/vrops-upgrade/';
for (let i = 0; i < 200; i++) {
  let out;
  try {
    out = await inFrame(`
      const d=await (await F('tasks/${ID}')).json();
      const st=d.stages||[];
      return JSON.stringify({status:d.status,done:st.filter(s=>s.status==='SUCCEEDED').length,total:st.length,
        current:st.filter(s=>s.status==='RUNNING').map(s=>s.name).join(','),
        failed:st.filter(s=>s.status==='FAILED').map(s=>s.name).join(',')});
    `);
  } catch (e) { out = 'ERR ' + String(e.message).slice(0, 70); }
  let file = '';
  if (i % 2 === 0) {
    try {
      const tag = (typeof out === 'string' && out.startsWith('{')) ? (JSON.parse(out).current || 'stage') : 'stage';
      file = `${DIR}${n++}-vcfa-retry-${String(tag).split(',')[0].slice(0, 34) || 'stage'}.png`;
      await shot(file);
    } catch (e) { file = 'shot failed'; }
  }
  console.log(`[${stamp()}] ${out} ${file.replace(DIR, '')}`);
  if (typeof out === 'string' && (out.includes('"status":"SUCCEEDED"') || out.includes('"status":"FAILED"'))) {
    try { await shot(`${DIR}${n++}-vcfa-retry-final.png`); } catch {}
    console.log('=== TASK FINISHED ==='); process.exit(out.includes('SUCCEEDED') ? 0 : 1);
  }
  await sleep(180000);
}
console.log('TIMEOUT');
