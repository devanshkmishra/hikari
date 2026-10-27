// 地下 — the camera. Two WebGL passes over the painted scene:
//   A: feedback (ghosting, light trails, datamosh blocks that keep yesterday's pixels)
//   B: the cheap-sensor look (barrel, tearing, chromatic aberration, 8×8 JPEG blocks with
//      subsampled chroma, bloom, on-axis flash blowout, crushed blacks, grain, shake)

const VS = `
attribute vec2 p;
varying vec2 v;
void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

const FS_A = HEAD + `
uniform sampler2D uS, uP;
uniform vec2 uR;
uniform float uSmear, uMosh, uSeed, uZoom;
uniform vec2 uShift;
void main(){
  vec3 cur = texture2D(uS, v).rgb;
  vec2 pv = (v - 0.5) / uZoom + 0.5 - uShift;
  vec2 blk = floor(v * uR / 16.0);
  float m = step(1.0 - uMosh, h(blk + uSeed));
  vec2 mv = (vec2(h(blk + 3.1 + uSeed), h(blk + 7.7 + uSeed)) - 0.5) * vec2(0.045, 0.028);
  vec3 prevM = texture2D(uP, pv - mv * m).rgb;
  vec3 prev = texture2D(uP, pv).rgb;
  vec3 trail = max(cur, prev * uSmear);
  vec3 ghost = mix(cur, prev, uSmear * 0.5);
  vec3 col = mix(ghost, trail, 0.5);
  vec3 moshed = prevM + (cur - prev) * 0.1;
  col = mix(col, moshed, m);
  gl_FragColor = vec4(col, 1.0);
}`;

const FS_B = HEAD + `
uniform sampler2D uT;
uniform vec2 uR, uO, uFP, uShk;
uniform float uTime, uFlash, uExp, uAb, uJpeg, uGrain, uVig, uSat, uWhite, uCrush, uTear, uSeed, uRot, uZm;
vec3 tap(vec2 uv){ return texture2D(uT, uv).rgb; }
void main(){
  vec2 d = v - 0.5;
  // shake: rotate/zoom/translate around centre (aspect-corrected)
  float asp = uO.x / uO.y;
  vec2 q = vec2(d.x * asp, d.y);
  float cs = cos(uRot), sn = sin(uRot);
  q = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs) / uZm;
  vec2 dd = vec2(q.x / asp, q.y) + uShk;
  float r2 = dot(d, d);
  vec2 uv = 0.5 + dd * (1.0 - 0.07 * r2);
  float band = floor(uv.y * 40.0);
  float tb = h(vec2(band, uSeed));
  uv.x += tb > 1.0 - uTear * 0.4 ? (h(vec2(band, uSeed + 1.7)) - 0.5) * 0.09 * uTear : 0.0;
  vec2 off = d * uAb * (0.35 + r2 * 3.0);
  vec3 c = vec3(tap(uv + off).r, tap(uv).g, tap(uv - off).b);
  vec2 px = uv * uR;
  vec2 bc = (floor(px / 8.0) + 0.5) * 8.0 / uR;
  vec2 o = 2.5 / uR;
  vec3 dc = (tap(bc - o) + tap(bc + vec2(o.x, -o.y)) + tap(bc + vec2(-o.x, o.y)) + tap(bc + o)) * 0.25;
  vec3 W = vec3(0.299, 0.587, 0.114);
  float Y = dot(c, W), Yd = dot(dc, W);
  vec2 C = vec2(dot(c, vec3(-0.1687, -0.3313, 0.5)), dot(c, vec3(0.5, -0.4187, -0.0813)));
  vec2 Cd = vec2(dot(dc, vec3(-0.1687, -0.3313, 0.5)), dot(dc, vec3(0.5, -0.4187, -0.0813)));
  float qn = mix(40.0, 4.0, uJpeg);
  float Yq = Yd + floor((Y - Yd) * qn + 0.5) / qn;
  float jk = clamp(uJpeg * 1.6, 0.0, 1.0);
  Y = mix(Y, Yq, jk);
  C = mix(C, Cd, clamp(uJpeg * 1.4, 0.0, 1.0));
  Y += (Y - Yd) * sin(px.x * 2.4) * sin(px.y * 2.4) * 0.14 * uJpeg;
  c = vec3(Y + 1.402 * C.y, Y - 0.344136 * C.x - 0.714136 * C.y, Y + 1.772 * C.x);
  vec2 bo = 7.0 / uR;
  vec3 b = max(tap(uv + vec2(bo.x, 0.0)) - 0.55, 0.0) + max(tap(uv - vec2(bo.x, 0.0)) - 0.55, 0.0)
         + max(tap(uv + vec2(0.0, bo.y)) - 0.55, 0.0) + max(tap(uv - vec2(0.0, bo.y)) - 0.55, 0.0);
  c += b * 0.4;
  float fd = length((v - uFP) * vec2(1.0, 1.25));
  c *= uExp + uFlash * max(0.0, 2.8 - fd * 2.6);
  c = max(c - uCrush, 0.0) / (1.0 - uCrush);
  float L = dot(c, W);
  c = mix(vec3(L), c, uSat);
  c = mix(c, vec3(1.0), uWhite);
  float g = h(v * uO + fract(uTime * 7.13) * 91.0) - 0.5;
  float gc = h(v * uO * 0.5 + fract(uTime * 3.7) * 37.0) - 0.5;
  c += vec3(g + gc * 0.5, g, g - gc * 0.5) * uGrain * (1.25 - L);
  c *= 1.0 - uVig * r2 * 1.7;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class Post {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) return;
    this.gl = gl;
    try {
      this.pA = this.prog(VS, FS_A);
      this.pB = this.prog(VS, FS_B);
    } catch (e) { console.warn('[rage] post fx unavailable', e); return; }
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.sceneTex = this.tex();
    this.fb = [null, null];
    this.ping = 0;
    this.sw = 0; this.sh = 0;
    this.ok = true;
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
  }

  prog(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }

  tex(w = 1, h = 1) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }

  resize(sw, sh, ow, oh) {
    if (!this.ok) return;
    const gl = this.gl;
    this.canvas.width = ow; this.canvas.height = oh;
    if (sw !== this.sw || sh !== this.sh) {
      for (const f of this.fb) if (f) { gl.deleteTexture(f.t); gl.deleteFramebuffer(f.f); }
      this.fb = [0, 1].map(() => {
        const t = this.tex(sw, sh);
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        return { t, f };
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.sw = sw; this.sh = sh;
    }
  }

  render(scene, P, keep = false) {
    if (!this.ok || this.lost) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const src = this.fb[this.ping], dst = this.fb[1 - this.ping];
    // pass A → dst
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f);
    gl.viewport(0, 0, this.sw, this.sh);
    const A = this.pA; gl.useProgram(A.p);
    gl.uniform1i(A.u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform1i(A.u.uP, 1);
    gl.uniform2f(A.u.uR, this.sw, this.sh);
    gl.uniform1f(A.u.uSmear, P.smear); gl.uniform1f(A.u.uMosh, P.mosh); gl.uniform1f(A.u.uSeed, P.moshSeed);
    gl.uniform1f(A.u.uZoom, P.zoom || 1); gl.uniform2f(A.u.uShift, P.shiftX || 0, P.shiftY || 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // pass B → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const B = this.pB; gl.useProgram(B.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dst.t); gl.uniform1i(B.u.uT, 0);
    gl.uniform2f(B.u.uR, this.sw, this.sh);
    gl.uniform2f(B.u.uO, this.canvas.width, this.canvas.height);
    gl.uniform2f(B.u.uFP, P.fx ?? 0.5, P.fy ?? 0.5);
    gl.uniform2f(B.u.uShk, P.shx || 0, P.shy || 0);
    gl.uniform1f(B.u.uTime, P.time); gl.uniform1f(B.u.uFlash, P.flash); gl.uniform1f(B.u.uExp, P.exp);
    gl.uniform1f(B.u.uAb, P.aberr); gl.uniform1f(B.u.uJpeg, P.jpeg); gl.uniform1f(B.u.uGrain, P.grain);
    gl.uniform1f(B.u.uVig, P.vig); gl.uniform1f(B.u.uSat, P.sat); gl.uniform1f(B.u.uWhite, P.white);
    gl.uniform1f(B.u.uCrush, P.crush); gl.uniform1f(B.u.uTear, P.tear); gl.uniform1f(B.u.uSeed, P.seed);
    gl.uniform1f(B.u.uRot, P.rot || 0); gl.uniform1f(B.u.uZm, P.zm || 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!keep) this.ping = 1 - this.ping;
  }

  destroy() {
    if (!this.gl) return;
    const ext = this.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}
