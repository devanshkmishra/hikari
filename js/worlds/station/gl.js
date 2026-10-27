// 夏ヶ原 — compositor. One fragment shader: an overcast sky with a slow cloud deck, the painted
// layers moved by depth (parallax), rice bending under the wind, heat shimmer at the horizon,
// and the light: overcast white → dusk amber → early blue, with lamps and windows coming on.

const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene, uFar, uAux, uE1, uE2;
uniform vec2 uScreen;     // CSS px
uniform vec2 uTexSize;    // CSS px incl. margins
uniform float uMargin;
uniform vec2 uPar;        // CSS px of shift per unit of depth channel
uniform vec2 uParFar;
uniform vec2 uVP;
uniform float uF;
uniform float uT;
uniform float uWind;
uniform float uGust;
uniform float uShimmer;
uniform vec3 uSkyTop, uSkyHor, uCloudLit, uCloudDark, uFog, uAmb, uBand;
uniform float uBandAmt, uFarFog, uSceneFog, uSunX, uCover;
uniform vec3 uL0, uL1, uL2, uL3, uL4, uL5;
uniform vec3 uK0, uK1;
uniform float uDim, uWhite;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
vec2 tuv(vec2 px) { return (px + uMargin) / uTexSize; }

void main() {
  vec2 px = vUv * uScreen;
  float h = (uVP.y - px.y) / uF;          // tangent of elevation above the horizon

  // ── sky ──
  vec3 sky = mix(uSkyHor, uSkyTop, smoothstep(-0.02, 0.6, h));
  float dens = 0.0;
  if (h > 0.0) {
    // a low overcast deck seen from below: thicker lumps darker, thinner seams paler
    float hh = max(h, 0.012);
    vec2 cp = vec2((px.x - uVP.x) / uF / hh, 1.0 / hh) * 0.62;
    cp += vec2(uT * 0.0065, uT * 0.0022);
    vec2 w = vec2(vnoise(cp * 0.45 + vec2(3.1, uT * 0.004)), vnoise(cp * 0.45 - vec2(1.7, 4.2))) - 0.5;
    vec2 q = cp + w * 1.6;
    float n = fbm(q);
    float n2 = fbm(q * 2.3 + vec2(5.2, 1.3));
    float thick = smoothstep(0.3, 0.78, n * 0.8 + n2 * 0.28);
    dens = thick * uCover;
    float edge = clamp((n2 - 0.5) * 1.4, -0.5, 0.5);
    vec3 cloud = mix(uCloudLit, uCloudDark, clamp(thick * 0.9 + edge * 0.18, 0.0, 1.0));
    float fadeH = smoothstep(0.0, 0.12, h);
    sky = mix(sky, cloud, fadeH * mix(0.7, 0.95, uCover));
    // thin seams where the light leaks through
    float seam = smoothstep(0.28, 0.0, n) * 0.08;
    sky += seam * uCloudLit * fadeH;
  }
  // the dusk band: the sun under the cloud deck, low, left of the line
  float sx = (px.x - uSunX) / uScreen.x;
  float hb = max(h, -0.01);
  float band = (exp(-hb * 18.0) * 0.8 + exp(-hb * 6.0) * 0.25) * exp(-sx * sx * 2.0);
  sky += uBand * band * uBandAmt * (1.0 - dens * 0.5);
  float under = exp(-max(h, 0.0) * 4.0) * exp(-sx * sx * 1.2) * dens;
  sky += uBand * under * uBandAmt * 0.45;

  // heat shimmer at the horizon
  float shim = uShimmer * exp(-abs(px.y - uVP.y - 4.0) / 16.0);
  vec2 sh = vec2(sin(px.y * 0.85 + uT * 7.3) + 0.6 * sin(px.y * 2.1 - uT * 11.0), 0.0) * shim * 1.3;

  // ── far hills ──
  vec4 far = texture(uFar, tuv(px + uParFar + sh));
  vec3 farLit = far.rgb * mix(vec3(1.0), uAmb, 0.92);
  farLit = mix(farLit, uFog, uFarFog);
  vec3 col = mix(sky, farLit, far.a);

  // ── scene ──
  vec4 aux0 = texture(uAux, tuv(px));
  float d = aux0.r;
  vec2 sp = px + uPar * d;
  if (d < 0.03) sp += sh;
  vec4 aux = texture(uAux, tuv(sp));
  // rice under the wind: a travelling silver wave where leaves flip over
  float field = aux.g;
  float wave = 0.0;
  if (field > 0.01) {
    float zg = uF * 3.3 / max(px.y - uVP.y, 0.6);
    float xg = (px.x - uVP.x) * zg / uF;
    float ph = xg * 0.11 + zg * 0.045 - uGust;
    float nz = vnoise(vec2(xg * 0.05, zg * 0.03) + uT * 0.05);
    wave = smoothstep(0.35, 1.0, sin(ph) * 0.5 + 0.5) * (0.4 + 0.6 * nz) * uWind * field;
    sp.y += wave * 1.4;
    sp.x += sin(uT * 2.3 + xg * 0.7) * 0.5 * uWind * field;
  }
  float sway = aux.b;
  if (sway > 0.01) sp.x += sin(uT * 1.9 + px.y * 0.05 + px.x * 0.013) * sway * uWind * 1.4;
  vec4 sc = texture(uScene, tuv(sp));
  vec3 e1 = texture(uE1, tuv(sp)).rgb;
  vec3 e2 = texture(uE2, tuv(sp)).rgb;
  vec3 L = e1.r * uL0 + e1.g * uL1 + e1.b * uL2 + e2.r * uL3 + e2.g * uL4 + e2.b * uL5;
  vec3 glow = e1.r * uL0 * uK0.x + e1.g * uL1 * uK0.y + e1.b * uL2 * uK0.z + e2.r * uL3 * uK1.x + e2.g * uL4 * uK1.y + e2.b * uL5 * uK1.z;
  vec3 lit = sc.rgb * (uAmb + L);
  lit += vec3(0.08, 0.09, 0.06) * wave * (uAmb + 0.2);
  float fogAmt = uSceneFog * (1.0 - smoothstep(0.0, 0.07, d));
  lit = mix(lit, uFog, fogAmt);
  col = mix(col, lit, sc.a);
  col += glow;

  // grade: soft lifted blacks, gentle shoulder, a little desaturation (old VN backgrounds)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.9);
  col = col / (1.0 + max(col - 0.85, 0.0) * 0.9);
  col = col * 0.95 + vec3(0.022, 0.021, 0.026);
  col = mix(col, vec3(1.0, 0.99, 0.97), uWhite);
  col *= 1.0 - uDim;
  col += (hash(px + fract(uT) * 91.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('station shader: ' + log);
  }
  return s;
}

export function createGL(cv) {
  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('station link: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(prog, i); U[info.name] = gl.getUniformLocation(prog, info.name); }

  const names = ['uScene', 'uFar', 'uAux', 'uE1', 'uE2'];
  const tex = {};
  names.forEach((nm, i) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    if (U[nm]) gl.uniform1i(U[nm], i);
    tex[nm] = [t, i];
  });
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  let lost = false;
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });

  return {
    get lost() { return lost; },
    upload(name, source) {
      const [t, i] = tex[name];
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },
    size(w, h) {
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
    },
    render(u) {
      if (lost) return;
      for (const k in u) {
        const l = U[k];
        if (!l) continue;
        const v = u[k];
        if (typeof v === 'number') gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      try {
        names.forEach((nm) => gl.deleteTexture(tex[nm][0]));
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) {}
    },
  };
}

// ── the light over time ─────────────────────────────────────
// tod: 0 overcast white (≈16:40) · 0.55 amber dusk · 1 early blue (≈19:15)
const KEYS = [
  { t: 0.00, top: [0.80, 0.81, 0.80], hor: [0.93, 0.93, 0.90], cl: [0.95, 0.95, 0.93], cd: [0.70, 0.72, 0.72], fog: [0.86, 0.87, 0.85], amb: [1.0, 1.0, 0.99], band: [1.0, 0.86, 0.62], ba: 0.0, ff: 0.0, sf: 0.0, cover: 1.0 },
  { t: 0.30, top: [0.75, 0.76, 0.77], hor: [0.93, 0.89, 0.81], cl: [0.93, 0.91, 0.88], cd: [0.64, 0.65, 0.67], fog: [0.86, 0.84, 0.79], amb: [0.95, 0.93, 0.89], band: [1.0, 0.78, 0.5], ba: 0.2, ff: 0.05, sf: 0.04, cover: 0.97 },
  { t: 0.55, top: [0.50, 0.51, 0.59], hor: [0.97, 0.73, 0.48], cl: [0.82, 0.71, 0.66], cd: [0.40, 0.38, 0.45], fog: [0.74, 0.62, 0.56], amb: [0.74, 0.65, 0.6], band: [1.0, 0.56, 0.24], ba: 0.85, ff: 0.2, sf: 0.1, cover: 0.9 },
  { t: 0.72, top: [0.30, 0.32, 0.46], hor: [0.88, 0.53, 0.37], cl: [0.6, 0.49, 0.5], cd: [0.26, 0.25, 0.33], fog: [0.5, 0.42, 0.44], amb: [0.47, 0.42, 0.45], band: [0.95, 0.42, 0.2], ba: 0.7, ff: 0.26, sf: 0.13, cover: 0.86 },
  { t: 0.86, top: [0.16, 0.20, 0.34], hor: [0.44, 0.42, 0.55], cl: [0.34, 0.34, 0.46], cd: [0.15, 0.16, 0.25], fog: [0.3, 0.31, 0.43], amb: [0.3, 0.31, 0.42], band: [0.8, 0.38, 0.3], ba: 0.24, ff: 0.3, sf: 0.15, cover: 0.84 },
  { t: 1.00, top: [0.11, 0.15, 0.29], hor: [0.29, 0.34, 0.5], cl: [0.26, 0.29, 0.43], cd: [0.12, 0.14, 0.24], fog: [0.22, 0.26, 0.39], amb: [0.22, 0.26, 0.37], band: [0.6, 0.35, 0.3], ba: 0.06, ff: 0.3, sf: 0.16, cover: 0.84 },
];
const L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function lightAt(tod) {
  let i = 0;
  while (i < KEYS.length - 2 && tod > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  let t = Math.max(0, Math.min(1, (tod - a.t) / (b.t - a.t)));
  t = t * t * (3 - 2 * t);
  return {
    top: L3(a.top, b.top, t), hor: L3(a.hor, b.hor, t), cl: L3(a.cl, b.cl, t), cd: L3(a.cd, b.cd, t),
    fog: L3(a.fog, b.fog, t), amb: L3(a.amb, b.amb, t), band: L3(a.band, b.band, t),
    ba: a.ba + (b.ba - a.ba) * t, ff: a.ff + (b.ff - a.ff) * t, sf: a.sf + (b.sf - a.sf) * t, cover: a.cover + (b.cover - a.cover) * t,
  };
}
