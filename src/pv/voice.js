/** 原声播放 + 口型：Audio → AnalyserNode 取 RMS，驱动 emote.talk()。素材缺失或被拦截时静默失败，不伪造声音。 */
export function createVoice(emote) {
  const audio = new Audio(); audio.preload = 'auto';
  let ctx = null, an = null, buf = null, raf = 0, token = 0;
  function graph() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC(); const src = ctx.createMediaElementSource(audio);
      an = ctx.createAnalyser(); an.fftSize = 512; buf = new Uint8Array(an.fftSize);
      src.connect(an); an.connect(ctx.destination);
    } catch { ctx = null; }
  }
  function mouth() {
    raf = 0;
    if (audio.paused || !an) { emote.talk(0); return; }
    an.getByteTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
    emote.talk(Math.min(5, Math.sqrt(s / buf.length) * 26));
    raf = requestAnimationFrame(mouth);
  }
  return {
    /** 播放 src 前 maxSec 秒；onEnd(ok) */
    play(src, { maxSec = Infinity, onEnd } = {}) {
      const my = ++token;
      graph(); ctx?.resume?.();
      audio.src = src; audio.currentTime = 0;
      const stopAt = () => { if (my === token && audio.currentTime >= maxSec) { this.stop(); onEnd?.(true); } };
      audio.ontimeupdate = stopAt;
      audio.onended = () => { if (my === token) { emote.talk(0); onEnd?.(true); } };
      audio.onerror = () => { if (my === token) onEnd?.(false); };
      return audio.play().then(() => { if (!raf) raf = requestAnimationFrame(mouth); return true; }).catch(() => false);
    },
    stop() { token++; audio.ontimeupdate = audio.onended = audio.onerror = null; try { audio.pause(); } catch {} cancelAnimationFrame(raf); raf = 0; emote.talk(0); },
    get playing() { return !audio.paused; },
  };
}
