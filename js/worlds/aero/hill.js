// The hill. An impossibly green rise under a deep blue sky, rendered in one fragment shader:
// cumulus that drift, wind moving through the grass as travelling sheen, Aero light ribbons,
// a soft lens flare. uDusk turns the whole thing to evening.
import { clamp, lerp } from './util.js';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform float uDusk;
uniform vec2 uPar;
uniform float uLift;

float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
const mat2 RM = mat2(1.6, 1.2, -1.2, 1.6);
float fbm5(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=RM*p; a*=0.5; } return v; }
float fbm3(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=RM*p; a*=0.5; } return v; }

float hillA(float x){ return 0.300 + 0.115*exp(-pow((x+0.20)/0.62, 2.0)) + 0.020*sin(x*2.3+0.9) + 0.007*sin(x*6.3+2.0); }
float hillB(float x){ return 0.302 + 0.078*exp(-pow((x-0.72)/0.55, 2.0)) + 0.016*sin(x*3.1+0.4); }
float hillC(float x){ return 0.320 + 0.016*sin(x*4.7+1.3) + 0.010*sin(x*9.1+0.2); }

vec3 skyCol(float y, float dusk){
  float sy = clamp((y-0.28)/0.72, 0.0, 1.0);
  vec3 hD = vec3(0.72,0.89,1.00), mD = vec3(0.25,0.59,0.96), tD = vec3(0.03,0.25,0.74);
  vec3 hE = vec3(1.00,0.70,0.44), mE = vec3(0.80,0.46,0.56), tE = vec3(0.12,0.12,0.36);
  vec3 d = mix(hD, mD, smoothstep(0.0, 0.5, sy)); d = mix(d, tD, smoothstep(0.4, 1.0, sy));
  vec3 e = mix(hE, mE, smoothstep(0.0, 0.42, sy)); e = mix(e, tE, smoothstep(0.35, 1.0, sy));
  return mix(d, e, dusk);
}

void main(){
  float asp = uRes.x/uRes.y;
  vec2 q = gl_FragCoord.xy / uRes.y;
  float x = q.x - asp*0.5;
  float y = q.y - uLift;
  float dusk = uDusk;

  vec2 sun = mix(vec2(asp*0.30 + 0.06, 0.86), vec2(asp*0.16 + 0.04, 0.44), dusk);
  sun.x = min(sun.x, asp*0.5 - 0.08);
  vec3 sunC = mix(vec3(1.0,0.97,0.88), vec3(1.0,0.62,0.30), dusk);

  vec3 col = skyCol(y, dusk);
  float sd = length(vec2(x, y) - sun);
  col += sunC * (exp(-sd*5.0)*0.26 + exp(-sd*18.0)*0.42 + smoothstep(0.03, 0.022, sd)*0.6);

  if (dusk > 0.01) {
    float st = hash(floor(gl_FragCoord.xy / 2.0));
    float tw = 0.6 + 0.4*sin(uT*1.7 + st*90.0);
    col += vec3(1.0,0.95,0.86) * smoothstep(0.9978, 1.0, st) * tw * smoothstep(0.6, 0.95, y) * smoothstep(0.45, 1.0, dusk) * 1.3;
  }

  float rib = 0.0;
  for (int i=0;i<3;i++){
    float fi = float(i);
    float yc = 0.66 + fi*0.07 + 0.06*sin(x*(1.2+fi*0.35) + uT*(0.05+fi*0.013) + fi*2.1);
    float dd = y - yc;
    float w = 0.0035 + 0.010*(0.5+0.5*sin(x*1.9 + fi*1.7 + uT*0.04));
    rib += exp(-dd*dd/(w*w))*(0.085 - fi*0.02) + exp(-dd*dd/(w*w*40.0))*0.022;
  }
  rib *= smoothstep(0.42, 0.6, y);
  col += rib * mix(vec3(0.82,0.96,1.0), vec3(1.0,0.84,0.7), dusk);

  if (y > 0.34) {
    vec2 cp = vec2(x*0.85 + uT*0.0045 + uPar.x*0.006, y*1.75);
    float warp = fbm3(cp*1.9 + vec2(uT*0.008, 3.0));
    vec2 wp = cp*2.3 + vec2(warp*0.9, warp*0.5);
    float dn = fbm5(wp);
    float band = smoothstep(0.48, 0.66, y) * (1.0 - smoothstep(0.92, 1.08, y));
    float heap = fbm3(vec2(x*0.75 + uT*0.0045 + 7.0, y*1.1));
    float dens = dn + band*0.16 - 0.17 + (heap - 0.5)*0.34;
    float c = smoothstep(0.43, 0.58, dens) * band;
    if (c > 0.002) {
      vec2 ld = normalize(sun - vec2(x, y) + vec2(0.0001));
      float dn2 = fbm3(wp + ld*vec2(0.23, 0.42));
      float lit = clamp(0.6 + (dn - dn2)*3.4, 0.0, 1.0);
      vec3 cLit = mix(vec3(1.0,1.0,1.0), vec3(1.0,0.80,0.62), dusk);
      vec3 cSh  = mix(vec3(0.64,0.75,0.90), vec3(0.48,0.34,0.55), dusk);
      vec3 cc = mix(cSh, cLit, lit);
      float edge = smoothstep(0.58, 0.43, dens);
      cc += sunC * edge * exp(-sd*2.6) * 0.7;
      col = mix(col, cc, c*0.96);
    }
    float hc = fbm3(vec2(x*2.6 + uT*0.006, y*13.0));
    float hb = smoothstep(0.39, 0.45, y) * (1.0 - smoothstep(0.47, 0.57, y));
    float c2 = smoothstep(0.52, 0.72, hc) * hb * 0.7;
    col = mix(col, mix(vec3(0.93,0.96,1.0), vec3(1.0,0.78,0.66), dusk), c2);
  }

  float aa = 1.8 / uRes.y;
  float xC = x + uPar.x*0.006;
  float hC = hillC(xC);
  float mC = smoothstep(hC + aa, hC - aa, y);
  vec3 cCol = mix(mix(vec3(0.40,0.64,0.62), skyCol(0.3, 0.0), 0.5), vec3(0.46,0.34,0.48), dusk);
  col = mix(col, cCol, mC);

  float xB = x + uPar.x*0.012;
  float hB = hillB(xB);
  float mB = smoothstep(hB + aa, hB - aa, y);
  if (mB > 0.0) {
    float dB = clamp((hB - y)/0.12, 0.0, 1.0);
    float nB = fbm3(vec2(xB*9.0, y*30.0));
    vec3 gB = mix(vec3(0.48,0.80,0.27), vec3(0.20,0.52,0.14), dB);
    gB *= 0.9 + nB*0.2;
    gB = mix(gB, skyCol(0.3, dusk), 0.24);
    gB = mix(gB, gB*vec3(0.60,0.46,0.52) + vec3(0.10,0.04,0.02), dusk);
    gB += exp(-(hB-y)*90.0) * mix(vec3(0.20,0.25,0.10), vec3(0.50,0.26,0.08), dusk);
    col = mix(col, gB, mB);
  }

  float xA = x + uPar.x*0.022;
  float hA = hillA(xA);
  float mA = smoothstep(hA + aa, hA - aa, y);
  if (mA > 0.0) {
    float depth = clamp((hA - y)/(hA + 0.04), 0.0, 1.0);
    float f = mix(640.0, 120.0, depth);
    float bl = noise(vec2(xA*f, y*f*mix(0.16, 0.34, depth)))*0.6 + noise(vec2(xA*f*2.3+7.0, y*f*mix(0.32, 0.6, depth)))*0.4;
    float patches = fbm3(vec2(xA*3.2, y*7.5) + 11.0);
    float gust = fbm3(vec2(xA*1.3 - uT*0.10, y*2.6 + uT*0.02));
    float wave = sin(xA*8.0 + y*3.5 - uT*1.5 + gust*5.0);
    float sheen = smoothstep(0.35, 1.0, wave) * smoothstep(0.42, 0.68, gust);
    float dh = (hillA(xA+0.01) - hillA(xA-0.01))/0.02;
    float sunFace = clamp(0.55 - dh*1.4, 0.0, 1.0);
    vec3 gDark = vec3(0.07,0.36,0.06), gMid = vec3(0.22,0.62,0.10), gLight = vec3(0.60,0.87,0.20), gSheen = vec3(0.88,0.98,0.54);
    vec3 g = mix(gDark, gMid, smoothstep(0.0, 0.6, 1.0 - depth*0.85 + patches*0.25));
    g = mix(g, gLight, clamp((1.0-depth)*0.62*sunFace + (patches-0.5)*0.3, 0.0, 1.0));
    g *= 0.80 + bl*0.36;
    g = mix(g, gSheen, sheen*0.30*(1.0 - depth*0.4));
    float rim = exp(-(hA - y)*70.0);
    g += vec3(0.32,0.36,0.12)*rim*0.55;
    g *= mix(1.0, 0.70, smoothstep(0.45, 1.0, depth));
    vec3 gE = g*vec3(0.52,0.44,0.42) + vec3(0.05,0.03,0.05);
    gE += vec3(1.0,0.55,0.22)*rim*0.65*sunFace;
    gE = mix(gE, gE + vec3(0.30,0.20,0.10)*sheen, 0.25);
    g = mix(g, gE, dusk);
    col = mix(col, g, mA);
  }

  vec2 C = vec2(0.0, 0.5);
  vec2 dir = C - sun;
  vec3 fl = vec3(0.0);
  for (int k=0;k<5;k++){
    float fk = float(k);
    vec2 P = sun + dir*(0.42 + fk*0.38);
    float r = 0.018 + mod(fk*0.037, 0.07);
    float d = length(vec2(x,y) - P);
    float disc = smoothstep(r, r*0.7, d) * 0.045;
    float ring = exp(-pow((d - r)/(r*0.12), 2.0)) * 0.055;
    vec3 tint = 0.5 + 0.5*cos(6.2831*(fk*0.17 + vec3(0.0, 0.33, 0.67)));
    fl += tint*(disc + ring);
  }
  col += fl * (1.0 - dusk*0.45);

  vec2 uv = gl_FragCoord.xy / uRes;
  float v = length((uv - 0.5)*vec2(1.0, 0.85));
  col *= 1.0 - 0.22*v*v;
  col += (hash(gl_FragCoord.xy + fract(uT*7.0)) - 0.5)/255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export function createHill(A, canvas) {
  const { ctx } = A;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  let dusk = 0, duskFrom = 0, duskTo = 0, duskT0 = 0, duskDur = 0;
  let par = [0, 0], parT = [0, 0];
  let quality = 1, slow = 0, paused = false, dirty = true;
  let W = 1, H = 1;
  const api = {
    get dusk() { return dusk; },
    setDusk(v, sec = 0) {
      if (!sec) { dusk = duskFrom = duskTo = v; duskDur = 0; dirty = true; return; }
      duskFrom = dusk; duskTo = v; duskT0 = performance.now() / 1000; duskDur = sec;
    },
    pointer(nx, ny) { parT = [clamp(nx, -1, 1), clamp(ny, -1, 1)]; },
    pause(p) { paused = !!p; if (!p) dirty = true; },
    resize,
    frame,
    destroy,
  };

  if (!gl) return fallback();

  const prog = (() => {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  })();
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uT', 'uDusk', 'uPar', 'uLift'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; canvas.style.background = 'linear-gradient(#0d4fc2, #8fd0ff 58%, #4cb52a 60%, #1f6a14)'; }, { signal: ctx.signal });

  function resize(w, hh) {
    W = Math.max(1, w); H = Math.max(1, hh);
    const base = Math.min(ctx.dpr, 1.5);
    const cap = Math.sqrt(2.4e6 / (W * H));
    const s = Math.min(base, cap) * quality;
    canvas.width = Math.max(2, Math.round(W * s));
    canvas.height = Math.max(2, Math.round(H * s));
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  }

  function frame(t, dt) {
    if (lost) return;
    if (duskDur) {
      const k = clamp((performance.now() / 1000 - duskT0) / duskDur, 0, 1);
      dusk = lerp(duskFrom, duskTo, k * k * (3 - 2 * k));
      if (k >= 1) duskDur = 0;
    }
    par[0] += (parT[0] - par[0]) * Math.min(1, dt * 2);
    par[1] += (parT[1] - par[1]) * Math.min(1, dt * 2);
    if (paused && !dirty) return;
    dirty = false;
    // gently adapt resolution if the frame budget is being blown
    if (dt > 0.024) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && quality > 0.55) { quality *= 0.85; slow = 0; resize(W, H); }
    const asp = W / H;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uT, t % 10000);
    gl.uniform1f(U.uDusk, dusk);
    gl.uniform2f(U.uPar, par[0], par[1]);
    gl.uniform1f(U.uLift, asp < 1 ? (1 - asp) * 0.1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function destroy() {
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) {}
  }

  return api;

  // No WebGL: a painted, still version of the same hill.
  function fallback() {
    const g2 = canvas.getContext('2d');
    function paint() {
      const w = canvas.width = Math.round(W * Math.min(ctx.dpr, 1.5));
      const hh = canvas.height = Math.round(H * Math.min(ctx.dpr, 1.5));
      const sky = g2.createLinearGradient(0, 0, 0, hh);
      sky.addColorStop(0, dusk > 0.5 ? '#20204e' : '#0b45b8');
      sky.addColorStop(0.6, dusk > 0.5 ? '#d4787e' : '#5aa8f2');
      sky.addColorStop(1, dusk > 0.5 ? '#ffb070' : '#bfe6ff');
      g2.fillStyle = sky; g2.fillRect(0, 0, w, hh);
      g2.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 9; i++) { g2.beginPath(); g2.ellipse(w * (0.1 + i * 0.11), hh * (0.22 + (i % 3) * 0.06), w * 0.06, hh * 0.04, 0, 0, 7); g2.fill(); }
      g2.beginPath(); g2.moveTo(0, hh * 0.62); g2.quadraticCurveTo(w * 0.4, hh * 0.45, w, hh * 0.68); g2.lineTo(w, hh); g2.lineTo(0, hh); g2.closePath();
      const gr = g2.createLinearGradient(0, hh * 0.5, 0, hh);
      gr.addColorStop(0, dusk > 0.5 ? '#6a6a2a' : '#8be04a'); gr.addColorStop(1, dusk > 0.5 ? '#203010' : '#1f7a14');
      g2.fillStyle = gr; g2.fill();
    }
    Object.assign(api, {
      resize(w, hh) { W = w; H = hh; paint(); },
      frame(t, dt) {
        if (duskDur) {
          const k = clamp((performance.now() / 1000 - duskT0) / duskDur, 0, 1);
          const before = dusk > 0.5;
          dusk = lerp(duskFrom, duskTo, k);
          if (k >= 1) duskDur = 0;
          if (before !== dusk > 0.5) paint();
        }
      },
      destroy() {},
    });
    return api;
  }
}
