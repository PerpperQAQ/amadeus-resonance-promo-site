/**
 * E-mote 驱动每帧会向 WebGL 查询约 60 次状态（getParameter）和 20 次 checkFramebufferStatus。
 * 在 Chrome 里这些调用都要同步等 GPU 进程往返，实测占渲染时间的约 80%（卡顿的主因）。
 * 这里在 SDK 的渲染上下文实例上做“状态影子”：第一次查询走真实 GL 并缓存，之后所有改变该状态的调用同步更新缓存，
 * 查询直接返回缓存。只缓存下面明确跟踪的状态；其余 pname 照常透传。不修改 SDK 文件本身。
 */
export function installGlStateCache(gl) {
  if (!gl || gl.__stateCache) return;
  const C = new Map(), FB = new Map();
  const g = gl.getParameter.bind(gl), chk = gl.checkFramebufferStatus.bind(gl);
  const has = (k) => C.has(k), set = (k, v) => { if (has(k)) C.set(k, v); };
  const wrap = (name, after) => { const f = gl[name]; if (typeof f !== 'function') return; const o = f.bind(gl); gl[name] = (...a) => { const r = o(...a); after(...a); return r; }; };
  const unitKey = () => 'tex2d:' + (C.has(gl.ACTIVE_TEXTURE) ? C.get(gl.ACTIVE_TEXTURE) : g(gl.ACTIVE_TEXTURE));
  const CAPS = new Set([gl.CULL_FACE, gl.DEPTH_TEST, gl.STENCIL_TEST, gl.DITHER, gl.BLEND, gl.SCISSOR_TEST]);
  wrap('viewport', (x, y, w, h) => set(gl.VIEWPORT, new Int32Array([x, y, w, h])));
  wrap('scissor', (x, y, w, h) => set(gl.SCISSOR_BOX, new Int32Array([x, y, w, h])));
  wrap('bindBuffer', (t, b) => set(t === gl.ARRAY_BUFFER ? gl.ARRAY_BUFFER_BINDING : t === gl.ELEMENT_ARRAY_BUFFER ? gl.ELEMENT_ARRAY_BUFFER_BINDING : -1, b));
  wrap('enable', (c) => CAPS.has(c) && set(c, true));
  wrap('disable', (c) => CAPS.has(c) && set(c, false));
  wrap('depthMask', (m) => set(gl.DEPTH_WRITEMASK, !!m));
  wrap('depthFunc', (f) => set(gl.DEPTH_FUNC, f));
  wrap('colorMask', (r, gg, b, a) => set(gl.COLOR_WRITEMASK, [!!r, !!gg, !!b, !!a]));
  wrap('blendEquation', (m) => { set(gl.BLEND_EQUATION_RGB, m); set(gl.BLEND_EQUATION_ALPHA, m); });
  wrap('blendEquationSeparate', (m, ma) => { set(gl.BLEND_EQUATION_RGB, m); set(gl.BLEND_EQUATION_ALPHA, ma); });
  wrap('blendFunc', (s, d) => { set(gl.BLEND_SRC_RGB, s); set(gl.BLEND_SRC_ALPHA, s); set(gl.BLEND_DST_RGB, d); set(gl.BLEND_DST_ALPHA, d); });
  wrap('blendFuncSeparate', (s, d, sa, da) => { set(gl.BLEND_SRC_RGB, s); set(gl.BLEND_DST_RGB, d); set(gl.BLEND_SRC_ALPHA, sa); set(gl.BLEND_DST_ALPHA, da); });
  wrap('activeTexture', (u) => set(gl.ACTIVE_TEXTURE, u));
  wrap('bindTexture', (t, tex) => { if (t === gl.TEXTURE_2D) { const k = unitKey(); if (C.has(k)) C.set(k, tex); } });
  wrap('useProgram', (p) => set(gl.CURRENT_PROGRAM, p));
  wrap('bindFramebuffer', (t, fb) => { if (t === gl.FRAMEBUFFER || t === gl.DRAW_FRAMEBUFFER) set(gl.FRAMEBUFFER_BINDING, fb); });
  // 绑定关系可能被隐式改变的调用：直接丢弃相关缓存
  wrap('bindVertexArray', () => C.delete(gl.ELEMENT_ARRAY_BUFFER_BINDING));
  const vao = gl.getExtension?.('OES_vertex_array_object');
  if (vao?.bindVertexArrayOES) { const o = vao.bindVertexArrayOES.bind(vao); vao.bindVertexArrayOES = (v) => { C.delete(gl.ELEMENT_ARRAY_BUFFER_BINDING); return o(v); }; }
  for (const n of ['deleteBuffer', 'deleteTexture', 'deleteProgram', 'deleteFramebuffer']) wrap(n, () => { for (const k of [...C.keys()]) if (typeof k === 'string' || [gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING, gl.CURRENT_PROGRAM, gl.FRAMEBUFFER_BINDING].includes(k)) C.delete(k); FB.clear(); });
  // 帧缓冲完整性按“帧缓冲 + 当前附件”组合缓存：驱动每帧都会重新挂附件，但组合是有限的几种
  const ids = new WeakMap(); let nid = 0; const id = (o) => (o ? (ids.get(o) || (ids.set(o, ++nid), nid)) : 0);
  const ATT = new WeakMap(); let defAtt = {};
  const att = () => { const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING); if (!fb) return defAtt; let m = ATT.get(fb); if (!m) ATT.set(fb, (m = {})); return m; };
  wrap('framebufferTexture2D', (t, a, tt, tex) => { att()[a] = 't' + id(tex); });
  wrap('framebufferRenderbuffer', (t, a, rt, rb) => { att()[a] = 'r' + id(rb); });
  for (const n of ['renderbufferStorage', 'deleteRenderbuffer', 'texImage2D', 'texStorage2D']) wrap(n, () => FB.clear());
  const TRACK = new Set([gl.VIEWPORT, gl.SCISSOR_BOX, gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING, ...CAPS, gl.DEPTH_WRITEMASK, gl.DEPTH_FUNC, gl.COLOR_WRITEMASK,
    gl.BLEND_EQUATION_RGB, gl.BLEND_EQUATION_ALPHA, gl.BLEND_SRC_RGB, gl.BLEND_SRC_ALPHA, gl.BLEND_DST_RGB, gl.BLEND_DST_ALPHA, gl.ACTIVE_TEXTURE, gl.CURRENT_PROGRAM, gl.FRAMEBUFFER_BINDING]);
  const copy = (v) => (v instanceof Int32Array ? new Int32Array(v) : Array.isArray(v) ? v.slice() : v);
  gl.getParameter = (p) => {
    const k = p === gl.TEXTURE_BINDING_2D ? unitKey() : TRACK.has(p) ? p : null;
    if (k === null) return g(p);
    if (!C.has(k)) C.set(k, copy(g(p)));
    return copy(C.get(k));
  };
  gl.checkFramebufferStatus = (t) => {
    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING); const key = id(fb) + '|' + JSON.stringify(att());
    if (FB.has(key)) return FB.get(key);
    const s = chk(t); if (s === gl.FRAMEBUFFER_COMPLETE) FB.set(key, s); return s;
  };
  gl.__stateCache = { C, FB };
}

/**
 * 大贴图 mipmap：模型 4096 贴图在 720×960 画布上被缩小到约 1/3 绘制，没有 mipmap 时每个像素都在大图里跳着采样
 * （GPU 带宽浪费，缩小时还会闪烁）。WebGL2 允许非 2 次幂贴图生成 mipmap。仅对 ≥1024 的贴图启用。
 */
export function installMipmaps(gl) {
  if (!(typeof WebGL2RenderingContext === 'function' && gl instanceof WebGL2RenderingContext) || gl.__mip) return;
  gl.__mip = new WeakSet();
  const big = gl.__mip, cur = () => gl.getParameter(gl.TEXTURE_BINDING_2D);
  const ti = gl.texImage2D.bind(gl), tp = gl.texParameteri.bind(gl);
  gl.texImage2D = (...a) => {
    const r = ti(...a);
    if (a[0] === gl.TEXTURE_2D && a[1] === 0 && a.length >= 9 && Math.max(a[3], a[4]) >= 1024) {
      const t = cur(); if (t) { big.add(t); gl.generateMipmap(gl.TEXTURE_2D); tp(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    }
    return r;
  };
  gl.texParameteri = (t, p, v) => {
    if (t === gl.TEXTURE_2D && p === gl.TEXTURE_MIN_FILTER && v === gl.LINEAR && big.has(cur())) v = gl.LINEAR_MIPMAP_LINEAR;
    return tp(t, p, v);
  };
}
