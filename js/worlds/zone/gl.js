// Tiny WebGL2 toolkit for the Zone. No dependencies.

export function compile(gl, vsSrc, fsSrc, label = 'prog') {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, vsSrc);
  const fs = sh(gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  return { p, vs, fs, label, ready: false, ok: false, uni: {} };
}

// Finish a (possibly parallel-compiled) program. Returns true when usable.
export function finish(gl, prog, ext) {
  if (prog.ready) return prog.ok;
  if (ext && !gl.getProgramParameter(prog.p, ext.COMPLETION_STATUS_KHR)) return false;
  prog.ready = true;
  if (!gl.getProgramParameter(prog.p, gl.LINK_STATUS)) {
    const log = (s) => gl.getShaderInfoLog(s) || '';
    console.warn(`[zone] ${prog.label} failed`, log(prog.vs), log(prog.fs), gl.getProgramInfoLog(prog.p));
    prog.ok = false;
    return false;
  }
  prog.ok = true;
  const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog.p, i);
    const name = info.name.replace(/\[0\]$/, '');
    prog.uni[name] = gl.getUniformLocation(prog.p, info.name);
  }
  gl.deleteShader(prog.vs);
  gl.deleteShader(prog.fs);
  return true;
}

export function uniforms(gl, prog, map) {
  const u = prog.uni;
  for (const k in map) {
    const loc = u[k];
    if (loc == null) continue;
    const v = map[k];
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2fv(loc, v);
    else if (v.length === 3) gl.uniform3fv(loc, v);
    else if (v.length === 4) gl.uniform4fv(loc, v);
    else gl.uniform4fv(loc, v); // arrays of vec4
  }
}

// A render target: optional MSAA renderbuffers resolved into a sampled texture.
export function makeTarget(gl, w, h, samples) {
  const t = { w, h, samples };
  t.tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  t.resolve = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.resolve);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
  t.color = gl.createRenderbuffer();
  t.depth = gl.createRenderbuffer();
  t.fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.bindRenderbuffer(gl.RENDERBUFFER, t.color);
  if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
  else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, t.color);
  gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth);
  if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
  else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, t.depth);
  t.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return t;
}

export function freeTarget(gl, t) {
  if (!t) return;
  gl.deleteTexture(t.tex);
  gl.deleteFramebuffer(t.fb);
  gl.deleteFramebuffer(t.resolve);
  gl.deleteRenderbuffer(t.color);
  gl.deleteRenderbuffer(t.depth);
}

export function resolveTarget(gl, t) {
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.fb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.resolve);
  gl.blitFramebuffer(0, 0, t.w, t.h, 0, 0, t.w, t.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
}

export function canvasTexture(gl, canvas, { repeat = false, mips = true } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mips) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  return tex;
}

// Dynamic vertex buffer with interleaved float attributes.
export class DynBuf {
  constructor(gl, layout, maxVerts) {
    // layout: [[location, size], ...]
    this.gl = gl;
    this.stride = layout.reduce((s, l) => s + l[1], 0);
    this.data = new Float32Array(maxVerts * this.stride);
    this.max = maxVerts;
    this.n = 0;
    this.vao = gl.createVertexArray();
    this.buf = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    let off = 0;
    for (const [loc, size] of layout) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, this.stride * 4, off * 4);
      off += size;
    }
    gl.bindVertexArray(null);
  }
  reset() { this.n = 0; }
  push(...v) {
    if (this.n >= this.max) return;
    this.data.set(v, this.n * this.stride);
    this.n++;
  }
  upload() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.n * this.stride);
  }
  free() { this.gl.deleteBuffer(this.buf); this.gl.deleteVertexArray(this.vao); }
}
