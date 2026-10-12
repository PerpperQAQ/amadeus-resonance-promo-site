/**
 * 第十轮 · 05 表演章的“字 / 声 / 形”演出台。
 *  字：只在人物身边打出一句字幕（页面原创台词，不配音）。
 *  声：播放一段红莉栖原声（游戏语音，见 ASSETS.md），口型随音量开合；不出字幕。
 *  形：表情 + 动作按时间点切换，同时出日中字幕、播原声、口型同步。
 * 约束：重复点击会取消上一次（含音频、计时器、字幕）；离开本章 / 页面隐藏 / 世界线变动时 stop()；
 *      音频缺失或无法播放时不伪造声音，按钮显示“语音素材待补 / 无法播放”，“形”仍完成表情与字幕。
 */
const BASE = import.meta.env.BASE_URL;

// 原声听写（faster-whisper medium 词级时间戳 + 人工按剧情校正），中文为本页翻译。
export const ACTS = {
  text: {
    label: '字', voice: null,
    cues: [{ t: 0, jp: '先に言っておくけど、私はあなたの助手じゃないから。', zh: '先说清楚：我可不是你的助手。' }],
    hold: 3800,
  },
  voice: {
    label: '声', voice: 'audio/kurisu-crs_2148.m4a', dur: 7.76, subtitles: false,
    cues: [{ t: 0, jp: '漆原さんの性別を男に戻すことで、本当にIBN5100は戻ってくるのか、っていうこと。', zh: '把漆原同学的性别变回男生，IBN5100 就真的会回来吗——我想问的是这个。' }],
  },
  form: {
    label: '形', voice: 'audio/kurisu-crs_1897.m4a', dur: 16.13,
    cues: [
      { t: 0.0, ex: 'glare', mo: 'cross', jp: '極端な管理社会。全体主義。', zh: '极端的管理社会，极权主义。' },
      { t: 3.9, ex: 'worry', mo: 'tilt', jp: 'まゆりがバナナを食べたいと思っても、', zh: '就算真由理想吃香蕉，' },
      { t: 6.7, ex: 'pout', jp: '今日がバナナを食べていい日でなければ、食べることは許されない。', zh: '只要今天不是“可以吃香蕉的日子”，就不准吃。' },
      { t: 11.35, ex: 'glareHard', mo: 'lean', jp: 'もし食べたら裁判なしで実刑。', zh: '要是吃了，不经审判，直接判刑。' },
      { t: 14.7, ex: 'smug', mo: 'nod', jp: 'そんな社会ってところ？', zh: '差不多就是那样的社会吧？' },
    ],
  },
};

export function createPerformer({ emote, EX, halo, stageEl, buttons }) {
  const subt = document.getElementById('subt');
  const jpEl = subt.querySelector('.subt-jp'), zhEl = subt.querySelector('.subt-zh');
  const audio = new Audio(); audio.preload = 'none';
  let ctx = null, analyser = null, data = null, srcNode = null;
  let token = 0, timers = [], raf = 0, typeIv = 0, current = null;
  const status = new Map(buttons.map((b) => [b.dataset.act, b.querySelector('.tri-st')]));
  const audioState = { text: 'none' };   // 每段音频的已知状态：ok / missing / blocked
  const log = { runs: 0, last: null, cancels: 0 };

  const setStatus = (act, s) => { const el = status.get(act); if (el) el.textContent = s; };
  const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  function ensureAudioGraph() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC(); srcNode = ctx.createMediaElementSource(audio); analyser = ctx.createAnalyser(); analyser.fftSize = 512;
      data = new Uint8Array(analyser.fftSize); srcNode.connect(analyser); analyser.connect(ctx.destination);
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function mouthLoop() {
    raf = 0;
    if (!analyser || audio.paused) { emote.talk(0); subt.classList.remove('is-speaking'); return; }
    analyser.getByteTimeDomainData(data);
    let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / data.length), open = Math.max(0, Math.min(5, (rms - 0.015) * 55));
    emote.talk(open);
    subt.style.setProperty('--lvl', Math.min(1, rms * 6).toFixed(3));
    subt.classList.toggle('is-speaking', open > 0.6);
    raf = requestAnimationFrame(mouthLoop);
  }
  function typeLine(cue, { instant = false } = {}) {
    clearInterval(typeIv);
    jpEl.textContent = cue.jp || ''; jpEl.hidden = !cue.jp;
    const full = cue.zh || '';
    if (instant) { zhEl.textContent = full; return; }
    let n = 0; zhEl.textContent = '';
    typeIv = setInterval(() => { n++; zhEl.textContent = full.slice(0, n); if (n >= full.length) clearInterval(typeIv); }, 42);
  }
  function showSubt(mode) { subt.hidden = false; subt.dataset.mode = mode; requestAnimationFrame(() => subt.classList.add('on')); }
  function hideSubt() { subt.classList.remove('on', 'is-speaking'); later(380, () => { if (!current) subt.hidden = true; }); }

  /** 取消正在进行的演出（不触发收尾表情）。 */
  function stop(reason = 'stop') {
    if (current) log.cancels++;
    token++; timers.forEach(clearTimeout); timers = []; clearInterval(typeIv); cancelAnimationFrame(raf); raf = 0;
    if (!audio.paused) audio.pause();
    try { audio.currentTime = 0; } catch (e) { /* 未加载 */ }
    emote.talk(0);
    buttons.forEach((b) => { b.classList.remove('is-live'); b.setAttribute('aria-pressed', 'false'); });
    if (current) setStatus(current, audioState[current] === 'missing' ? '语音素材待补' : audioState[current] === 'blocked' ? '无法播放' : '待命');
    current = null;
    subt.classList.remove('on', 'is-speaking');
    if (reason !== 'restart') later(380, () => { if (!current) subt.hidden = true; });
    stageEl.classList.remove('is-performing');
  }

  async function play(act) {
    const A = ACTS[act]; if (!A) return false;
    stop('restart');
    const my = ++token; current = act; log.runs++; log.last = { act, t: Math.round(performance.now()) };
    const btn = buttons.find((b) => b.dataset.act === act);
    btn?.classList.add('is-live'); btn?.setAttribute('aria-pressed', 'true');
    stageEl.classList.add('is-performing');
    halo?.pulse(0.8);
    const done = (holdMs = 900) => later(holdMs, () => { if (my !== token) return; hideSubt(); btn?.classList.remove('is-live'); btn?.setAttribute('aria-pressed', 'false'); setStatus(act, audioState[act] === 'missing' ? '语音素材待补' : audioState[act] === 'blocked' ? '无法播放' : '再来一次'); current = null; stageEl.classList.remove('is-performing'); if (act === 'form' && emote.state === 'ready') emote.setExpression(EX.calm); });

    if (act === 'text') {
      setStatus(act, '字幕输出中');
      showSubt('text'); typeLine(A.cues[0]);
      done(A.cues[0].zh.length * 42 + A.hold);
      return true;
    }

    // 声 / 形：先尝试播放原声
    let voiceOk = false;
    if (A.voice) {
      ensureAudioGraph();
      audio.src = BASE + A.voice;
      try {
        if (ctx && ctx.state === 'suspended') await ctx.resume();
        await audio.play();
        if (my !== token) { audio.pause(); return false; }
        voiceOk = true; audioState[act] = 'ok';
        if (!raf) raf = requestAnimationFrame(mouthLoop);
      } catch (e) {
        if (my !== token) return false;
        audioState[act] = audio.error && audio.error.code === 4 ? 'missing' : (e?.name === 'NotAllowedError' ? 'blocked' : 'missing');
        console.info('[perform] 语音未播放：', act, e?.name || e);
      }
    }
    setStatus(act, voiceOk ? (act === 'voice' ? '原声播放中' : '演出中') : (audioState[act] === 'blocked' ? '无法播放' : '语音素材待补'));

    if (act === 'voice') {
      showSubt('voice');
      if (!voiceOk) { typeLine({ jp: '', zh: '（语音素材待补）' }, { instant: true }); done(1800); return false; }
      typeLine({ jp: '', zh: '' }, { instant: true });
      audio.onended = () => { if (my === token) done(500); };
      later((A.dur + 1.5) * 1000, () => { if (my === token && current) done(0); });   // 兜底
      return true;
    }

    // 形：表情 / 动作 / 字幕按时间点
    showSubt('form');
    const t0 = performance.now();
    A.cues.forEach((c, i) => {
      const at = voiceOk ? c.t * 1000 : i * 2200;   // 无语音时用固定节奏演完表情与字幕
      later(Math.max(0, at - (performance.now() - t0)), () => {
        if (my !== token) return;
        if (c.ex && emote.state === 'ready') emote.setExpression(EX[c.ex] || EX.calm);
        if (c.mo && emote.state === 'ready') emote.motion(c.mo);
        halo?.pulse(0.5);
        typeLine(c);
      });
    });
    const total = voiceOk ? A.dur * 1000 : A.cues.length * 2200;
    if (voiceOk) audio.onended = () => { if (my === token) done(1200); };
    later(total + (voiceOk ? 2500 : 1600), () => { if (my === token && current) done(0); });
    return true;
  }

  buttons.forEach((b) => b.addEventListener('click', () => {
    if (emote.state !== 'ready' && b.dataset.act !== 'text') { /* 模型未就绪也允许字幕与语音 */ }
    play(b.dataset.act);
  }));
  // 预先探测音频是否存在（HEAD），用于提前显示“语音素材待补”
  for (const act of ['voice', 'form']) {
    fetch(BASE + ACTS[act].voice, { method: 'HEAD' }).then((r) => { if (!r.ok) { audioState[act] = 'missing'; setStatus(act, '语音素材待补'); } }).catch(() => {});
  }
  return { play, stop, get current() { return current; }, log, audio, audioState };
}
