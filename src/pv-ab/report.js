// 05 REPORT：阶段路线图 × 道具拼贴（Reverse:1999 媒体页式拼贴；只写做到的事，进行中 / 下一步分开标）
import './report.css';

export const STAGES = [
  { s: 'done', zh: '日常对话', en: 'DAILY TALK', d: '人格设定可编辑，大模型由你选；一致性测试 K-01–K-10 复测通过', img: 'dr_pepper', f: 'cut', r: -4 },
  { s: 'done', zh: '声音', en: 'VOICE', d: '日语语音 × 中文字幕；语音识别、合成都接你自己的服务', img: 'phone_microwave', f: 'cut', r: 3 },
  { s: 'done', zh: '记忆', en: 'MEMORY', d: 'Mem0 / 本地 / 关闭三种可选；服务出错，聊天照常继续', img: 'upa_green', f: 'sticker', r: -6 },
  { s: 'done', zh: '表情', en: 'E-MOTE', d: '39 个原作表情控制项驱动她的神情与动作', img: 'future_gadget_12', f: 'cut', r: 5 },
  { s: 'done', zh: '观测', en: 'OBSERVE', d: '已在真实 VN 窗口里持续观察，到选项时说一句短评', img: 'divergence_meter', f: 'cut', r: -2 },
  { s: 'doing', zh: '新一代观测', en: 'NEXT OBSERVE', d: '让她更准确地读懂正在发生的剧情', img: 'time_leap_machine', f: 'cut', r: 4 },
  { s: 'doing', zh: '桌面应用', en: 'DESKTOP APP', d: '把各项服务收进一个桌面程序里', img: 'ibn5100', f: 'cut', r: -3 },
  { s: 'next', zh: '校准与发布', en: 'RE:BOOT · RELEASE', d: 'RE:BOOT 发售后对照原作再校准一遍，然后正式发布', img: 'radio_kaikan', f: 'photo', r: 3 },
];
const ST = { done: ['已完成', 'DONE'], doing: ['进行中', 'IN PROGRESS'], next: ['下一步', 'NEXT'] };

export function initReport(BASE = '/') {
  const sec = document.querySelector('.s4'); if (!sec) return;
  const tl = sec.querySelector('#rp-tl'), cards = sec.querySelector('#rp-cards'), spk = sec.querySelector('#rp-spk');
  const n = STAGES.length, x0 = 7, x1 = 82, X = (i) => x0 + (x1 - x0) * i / (n - 1);
  // 时间线：三段（实线 / 流动虚线 / 点线）+ 节点
  const seg = (a, b, k) => `<i class="rp-seg ${k}" style="left:${X(a)}vw;width:${X(b) - X(a)}vw"></i>`;
  const firstDoing = STAGES.findIndex((t) => t.s === 'doing'), firstNext = STAGES.findIndex((t) => t.s === 'next');
  tl.innerHTML = seg(0, firstDoing - 1, 'done') + seg(firstDoing - 1, firstNext, 'doing') + seg(firstNext - 1, n - 1, 'next')
    + STAGES.map((t, i) => `<b class="rp-nd ${t.s}" style="left:${X(i)}vw;--i:${i}">${String(i + 1).padStart(2, '0')}${i === firstDoing ? '<em>NOW</em>' : ''}</b>`).join('');
  cards.innerHTML = STAGES.map((t, i) => `<figure class="rp-st ${t.s} ${i % 2 ? 'dn' : 'up'} f-${t.f}" style="--x:${X(i)}vw;--r:${t.r}deg;--i:${i};--z:${(i % 3) * .5 + .6}" tabindex="0">
    <div class="rp-ph"><img src="${BASE}img/pv-ab/report/${t.img}.webp" alt="" loading="lazy" draggable="false">${t.f === 'photo' ? '<i class="tape"></i>' : ''}</div>
    <figcaption><em>${String(i + 1).padStart(2, '0')}</em><b>${t.zh}</b><small>${t.en} · ${ST[t.s][0]}</small><p>${t.d}</p></figcaption></figure>`).join('');
  // 细闪光
  let h = ''; for (let i = 0; i < 16; i++) { const r = (k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; h += `<i style="left:${(4 + r(1) * 84).toFixed(1)}vw;top:${(14 + r(2) * 68).toFixed(1)}vh;--s:${(.5 + r(3)).toFixed(2)};--d:${(r(4) * 4).toFixed(2)}s"></i>`; }
  spk.innerHTML = h;
  // 视差：鼠标位置 → --mx/--my（各卡片按 --z 深度位移）
  let raf = 0, mx = 0, my = 0;
  sec.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; if (!raf) raf = requestAnimationFrame(() => { raf = 0; sec.style.setProperty('--mx', mx.toFixed(3)); sec.style.setProperty('--my', my.toFixed(3)); }); });
  sec.addEventListener('pointerleave', () => { sec.style.setProperty('--mx', 0); sec.style.setProperty('--my', 0); });
}
