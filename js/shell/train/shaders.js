// GLSL for the ひかり線 railcar. Everything is lit in linear space and finished with a filmic
// curve + a per-world colour grade, so the car, the scenery and the sky always agree.

export const COMMON = /* glsl */ `
uniform float uExpo;
uniform vec3 uLift;
uniform vec3 uGam;
uniform vec3 uGain;
uniform float uSat;
uniform float uTime;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 finish(vec3 c) {
  c = aces(max(c, 0.0) * uExpo);
  c = pow(c, vec3(1.0 / 2.2));
  c = c * uGain + uLift * (1.0 - c);
  c = pow(max(c, 0.0), uGam);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c += (hash12(gl_FragCoord.xy + fract(uTime * 13.7) * 91.0) - 0.5) * (2.2 / 255.0);
  return c;
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }
`;

// ── interior ────────────────────────────────────────────────────────────────
export const INT_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aCol;
layout(location=4) in vec4 aMat;
layout(location=5) in vec4 iA;
layout(location=6) in vec4 iB;
uniform mat4 uVP;
uniform mat4 uModel;
uniform int uInst;
out vec3 vPos; out vec3 vNrm; out vec2 vUV; out vec4 vCol; out vec4 vMat;
void main() {
  vec3 p = aPos, n = aNrm;
  if (uInst == 1) {
    float a = iB.x, b = iB.y, c = iB.z;
    mat3 Rz = mat3(cos(a), sin(a), 0.0, -sin(a), cos(a), 0.0, 0.0, 0.0, 1.0);
    mat3 Rx = mat3(1.0, 0.0, 0.0, 0.0, cos(b), sin(b), 0.0, -sin(b), cos(b));
    mat3 Ry = mat3(cos(c), 0.0, -sin(c), 0.0, 1.0, 0.0, sin(c), 0.0, cos(c));
    mat3 R = Rz * Rx * Ry;
    p = R * (p * iB.w) + iA.xyz;
    n = R * n;
  }
  vec4 wp = uModel * vec4(p, 1.0);
  vPos = wp.xyz;
  vNrm = mat3(uModel) * n;
  vUV = aUV; vCol = aCol; vMat = aMat;
  gl_Position = uVP * wp;
}`;

export const INT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat;
uniform sampler2DArray uArr;
uniform sampler2D uTex;
uniform sampler2D uWin;
uniform sampler2D uOcc;
uniform int uMode;          // 0 mesh, 1 decal (lit, alpha-tested), 2 self-lit board, 3 decal blended
uniform float uEmis;        // decal / draw emissive gain
uniform vec4 uTint;         // albedo multiplier, a = extra emissive
uniform vec3 uEmisCol;
uniform vec3 uEye;
uniform vec3 uAmbLo;
uniform vec3 uAmbHi;
uniform vec3 uWinL;
uniform vec3 uFlu;
uniform vec4 uFlick;        // x tube x, y value, z master, w tube count phase
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec4 uOccP;         // D, W, H, offset
uniform float uOccOn;
uniform vec4 uPoleP;        // D, period, offset, top y
uniform vec4 uPL[4];
uniform vec4 uPLc[4];
uniform vec4 uIL[8];
uniform vec4 uILc[8];
uniform vec4 uWinX;         // x0, x1 of the window mask, tube x0, x1
uniform vec3 uEnvWin;
uniform float uMirror;
uniform float uReflA;
uniform float uGroundY;
out vec4 frag;
${COMMON}
const float WZ = 1.38;

vec4 winTex(float x, float side) {
  float u = (x - uWinX.x) / (uWinX.y - uWinX.x);
  return texture(uWin, vec2(u, side * 0.5 + 0.25));
}

// Openness of the side wall at hit point h (on plane |z| = WZ). Returns transmission and tint.
float winOpen(vec3 h, float side, float soft, out vec3 tint) {
  tint = vec3(1.0);
  if (h.x < uWinX.x || h.x > uWinX.y) return 0.0;
  float du = soft;
  vec4 w0 = winTex(h.x, side);
  float open = (winTex(h.x - du, side).r + w0.r * 2.0 + winTex(h.x + du, side).r) * 0.25;
  if (open <= 0.002) return 0.0;
  float sill = w0.g * 2.5, top = w0.b * 2.5, blind = w0.a;
  float vy = smoothstep(sill - soft, sill + soft, h.y) * (1.0 - smoothstep(top - soft, top + soft, h.y));
  float blindY = top - blind * (top - sill);
  float cover = smoothstep(blindY - soft, blindY + soft, h.y) * step(0.02, blind);
  float through = mix(1.0, 0.2, cover);
  tint = mix(vec3(1.0), vec3(1.0, 0.86, 0.62), cover);
  return open * vy * through;
}

float sunVis(vec3 p, vec3 n, out vec3 tint) {
  tint = vec3(1.0);
  vec3 L = uSunDir;
  float ndl = dot(n, L);
  if (ndl <= 0.0 || abs(L.z) < 0.03 || dot(uSunCol, uSunCol) < 1e-5) return 0.0;
  float side = L.z < 0.0 ? 0.0 : 1.0;
  float zw = L.z < 0.0 ? -WZ : WZ;
  float t = (zw - p.z) / L.z;
  if (t <= 0.0) return 0.0;
  vec3 h = p + L * t;
  float soft = 0.006 + t * 0.016;
  float vis = winOpen(h, side, soft, tint);
  if (vis <= 0.0) return 0.0;
  float az = abs(L.z);
  // utility poles (and their shadows sweeping through the car)
  if (uPoleP.x > 0.0) {
    float tp = (uPoleP.x - WZ) / az;
    vec3 hp = h + L * tp;
    float wx = hp.x + uPoleP.z;
    float m = mod(wx, uPoleP.y) - uPoleP.y * 0.5;
    float pole = 1.0 - smoothstep(0.13, 0.2 + tp * 0.012, abs(m));
    pole *= step(hp.y, uPoleP.w);
    vis *= 1.0 - pole * 0.85;
  }
  // trees, houses, ruins: the silhouette strip on the sun side
  if (uOccOn > 0.5) {
    float to = (uOccP.x - WZ) / az;
    vec3 ho = h + L * to;
    float ox = (ho.x + uOccP.w) / uOccP.y * (side > 0.5 ? -1.0 : 1.0);
    float oy = (ho.y - uGroundY) / uOccP.z;
    if (oy > 0.0 && oy < 1.0) {
      float a = texture(uOcc, vec2(ox, 1.0 - oy), 1.5).a;
      vis *= 1.0 - a * 0.94;
    } else if (oy <= 0.0) vis = 0.0;
  }
  return vis * ndl;
}

vec3 winLight(vec3 p, vec3 n) {
  float a = 0.0;
  for (int i = 0; i < 2; i++) {
    float sz = i == 0 ? -WZ : WZ;
    vec3 c = vec3(p.x, 1.32, sz);
    vec3 d = c - p;
    float dist = length(d.yz) + 0.25;
    float ndl = max(dot(n, normalize(d)) * 0.8 + 0.2, 0.0);
    a += ndl / (1.0 + dist * 1.1);
  }
  return uWinL * a;
}

vec3 fluor(vec3 p, vec3 n) {
  float s = 0.0;
  for (int i = 0; i < 2; i++) {
    vec3 tp = vec3(clamp(p.x, uWinX.z, uWinX.w), 2.30, i == 0 ? -0.55 : 0.55);
    vec3 d = tp - p;
    float d2 = dot(d, d);
    float dist = sqrt(d2);
    vec3 L = d / max(dist, 1e-3);
    float ndl = max(dot(n, L) * 0.78 + 0.22, 0.0);
    s += ndl * 0.9 / (0.2 + dist * 0.75 + d2 * 0.3);
  }
  float dx = abs(p.x - uFlick.x);
  float fl = mix(uFlick.y, 1.0, smoothstep(0.5, 1.9, dx));
  return uFlu * s * fl * uFlick.z;
}

float carAO(vec3 p, vec3 n) {
  float a = 1.0;
  float dw = WZ - abs(p.z);
  if (n.y > 0.6) {
    // floor: dark under the seats and along the skirting
    float under = smoothstep(0.80, 0.98, abs(p.z)) * step(p.y, 0.05);
    a *= mix(1.0, 0.42, under);
    a *= mix(0.7, 1.0, smoothstep(0.0, 0.35, dw));
  }
  if (abs(n.y) < 0.5) a *= mix(0.62, 1.0, smoothstep(0.0, 0.5, p.y));
  a *= mix(0.8, 1.0, smoothstep(0.0, 0.18, 2.40 - p.y + dw * 0.3));
  return a;
}

vec3 outsideLights(vec3 p, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 C = uPLc[i];
    if (C.a <= 0.0) continue;
    vec4 L = uPL[i];
    vec3 d = L.xyz - p;
    float dist = length(d);
    vec3 l = d / dist;
    float ndl = max(dot(n, l) * 0.9 + 0.1, 0.0);
    float vis = 1.0;
    if (abs(L.z) > WZ && abs(l.z) > 0.02) {
      float zw = L.z > 0.0 ? WZ : -WZ;
      float t = (zw - p.z) / l.z;
      if (t > 0.0) { vec3 tn; vis = winOpen(p + l * t, L.z > 0.0 ? 1.0 : 0.0, 0.02 + t * 0.05, tn); }
    }
    acc += C.rgb * C.a * ndl * vis / (1.0 + dist * dist / (L.w * L.w));
  }
  for (int i = 0; i < 8; i++) {
    vec4 C = uILc[i];
    if (C.a <= 0.0) continue;
    vec3 d = uIL[i].xyz - p;
    float d2 = dot(d, d);
    float ndl = max(dot(n, normalize(d)) * 0.85 + 0.15, 0.0);
    acc += C.rgb * C.a * ndl / (1.0 + d2 / (uIL[i].w * uIL[i].w));
  }
  return acc;
}

vec3 env(vec3 r) {
  vec3 base = uAmbHi + uFlu * 0.7 + uWinL * 0.5;
  vec3 floorC = vec3(0.07, 0.075, 0.07) * base;
  vec3 wallC = vec3(0.38, 0.35, 0.3) * base;
  vec3 ceilC = vec3(0.62, 0.62, 0.6) * (uAmbHi + uFlu * 1.3 + uWinL * 0.35);
  vec3 c = mix(floorC, wallC, smoothstep(-0.45, -0.05, r.y));
  c = mix(c, ceilC, smoothstep(0.3, 0.65, r.y));
  float side = smoothstep(0.3, 0.8, abs(r.z));
  float band = smoothstep(-0.12, 0.02, r.y) * (1.0 - smoothstep(0.2, 0.34, r.y));
  c = mix(c, uEnvWin, side * band * 0.9);
  float tubes = smoothstep(0.84, 0.97, r.y);
  c += uFlu * uFlick.z * tubes * 2.6;
  return c;
}

void main() {
  int kind = int(vMat.y + 0.5);
  bool two = kind >= 32;
  if (two) kind -= 32;
  vec3 albedo = vCol.rgb;
  float alpha = vCol.a;
  if (vMat.x >= 0.0) {
    vec4 t = texture(uArr, vec3(vUV, vMat.x));
    albedo *= t.rgb * t.rgb;
    alpha *= t.a;
  }
  if (uMode >= 1) {
    vec4 t = texture(uTex, vUV);
    albedo *= pow(t.rgb, vec3(2.2));
    alpha *= t.a;
  }
  if ((kind == 8 || uMode == 1) && alpha < 0.5) discard;
  albedo *= uTint.rgb;
  vec3 n = normalize(vNrm);
  vec3 V = normalize(uEye - vPos);
  if (two && dot(n, V) < 0.0) n = -n;

  if (kind == 3) {
    // fluorescent tube: hot core, cooler edges, the flickering one stutters
    float dx = abs(vPos.x - uFlick.x);
    float fl = mix(uFlick.y, 1.0, smoothstep(0.55, 0.65, dx));
    float core = 0.55 + 0.45 * pow(max(dot(n, V), 0.0), 0.6);
    vec3 c = uEmisCol * (0.15 + 3.4 * core * fl * uFlick.z);
    frag = vec4(finish(c), uMirror > 0.5 ? uReflA : 1.0);
    return;
  }

  float ao = vMat.z * carAO(vPos, n);
  vec3 amb = mix(uAmbLo, uAmbHi, n.y * 0.5 + 0.5) * ao;
  vec3 wl = winLight(vPos, n) * ao;
  vec3 fl = fluor(vPos, n) * mix(1.0, ao, 0.6);
  vec3 sunTint;
  float sv = sunVis(vPos, n, sunTint);
  vec3 sun = uSunCol * sunTint * sv;
  vec3 pl = outsideLights(vPos, n);
  vec3 light = amb + wl + fl + sun + pl;
  vec3 col = albedo * light;

  if (kind == 1) {
    // chrome: mostly reflection of the car itself
    vec3 r = reflect(-V, n);
    float fres = 0.55 + 0.45 * pow(1.0 - max(dot(n, V), 0.0), 3.0);
    col = albedo * light * 0.12 + env(r) * albedo * fres * 1.15;
    vec3 hs = normalize(uSunDir + V);
    col += uSunCol * sv * pow(max(dot(n, hs), 0.0), 60.0) * 2.0;
  } else if (kind == 2) {
    // vinyl floor: soft sheen of the windows and the tubes; the aisle is worn paler
    vec3 r = reflect(-V, n);
    float fres = 0.03 + 0.3 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    float wear = smoothstep(0.75, 0.1, abs(vPos.z));
    col *= mix(1.0, 1.12, wear);
    col += env(r) * fres * mix(0.6, 1.0, wear);
    col += sun * 0.12;
  } else if (kind == 4) {
    // moquette pile: velvety rim
    float rim = pow(1.0 - max(dot(n, V), 0.0), 2.5);
    col += albedo * (fl + wl + sun * 0.8) * rim * 0.55;
  } else if (kind == 5) {
    vec3 r = reflect(-V, n);
    float fres = 0.04 + 0.2 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    col += env(r) * fres;
  } else if (kind == 6) {
    // sun-blind fabric: glows when the day is behind it
    float side = vPos.z > 0.0 ? 1.0 : 0.0;
    float back = (side > 0.5 ? step(0.0, uSunDir.z) : step(uSunDir.z, 0.0));
    vec3 bl = uWinL * 1.5 + uSunCol * back * 0.6 + uEnvWin * 0.25;
    col += albedo * bl * 0.9;
  } else if (kind == 7) {
    col = albedo * light * 0.3;
  } else if (kind == 9) {
    // a person: matte, slightly warm in the tube light
    float rim = pow(1.0 - max(dot(n, V), 0.0), 2.0);
    col += albedo * fl * rim * 0.8;
  }
  col += albedo * vMat.w * uEmisCol;
  col += uTint.a * uEmisCol;
  if (uMode == 2) col = albedo * uEmis + col * 0.25;
  float outA = uMirror > 0.5 ? uReflA : (uMode == 3 ? alpha : 1.0);
  frag = vec4(finish(col), outA);
}`;

// ── LED dot-matrix board (self-lit) ─────────────────────────────────────────
export const LED_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat;
uniform sampler2D uTex;
uniform vec2 uGrid;      // cols, rows
uniform float uScroll;   // in dots
uniform float uTexW;     // text texture width in dots
uniform float uBright;
uniform float uMirror;
uniform float uReflA;
out vec4 frag;
${COMMON}
void main() {
  vec2 g = vUV * uGrid;
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float r = length(f);
  float dotm = smoothstep(0.44, 0.26, r);
  float tx = mod(cell.x + uScroll, uTexW);
  vec4 t = texture(uTex, vec2((tx + 0.5) / uTexW, (cell.y + 0.5) / uGrid.y));
  float on = smoothstep(0.35, 0.6, t.a);
  vec3 lit = pow(t.rgb, vec3(2.2)) * 7.0 * uBright;
  vec3 off = vec3(0.035, 0.02, 0.012);
  vec3 c = mix(off, lit, on) * dotm;
  c += mix(off, lit, on) * smoothstep(0.75, 0.0, r) * 0.25 * on;
  c += vec3(0.008, 0.008, 0.009) * (1.0 - dotm);
  frag = vec4(finish(c), uMirror > 0.5 ? uReflA : 1.0);
}`;

// ── glass: dust, rain, the faint green of old float glass ───────────────────
export const GLASS_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat;
uniform vec3 uEye;
uniform vec3 uWinL;
uniform vec3 uFlu;
uniform vec3 uEnvWin;
uniform float uRain;
uniform float uSpeed;
uniform float uNight;
uniform float uFakeRefl;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
out vec4 frag;
${COMMON}

float drop(vec2 uv, float t, float dens, out float ring) {
  // beads that sit still
  vec2 st = uv * 46.0;
  vec2 id = floor(st);
  vec2 f = fract(st) - 0.5;
  float h = hash12(id);
  ring = 0.0;
  if (h > dens) return 0.0;
  vec2 o = vec2(hash12(id + 4.1), hash12(id + 9.7)) - 0.5;
  float rad = 0.12 + 0.2 * hash12(id + 2.3);
  float d = length(f - o * 0.5);
  ring = smoothstep(rad, rad * 0.6, d) - smoothstep(rad * 0.6, rad * 0.2, d);
  return smoothstep(rad, rad * 0.75, d);
}

float streak(vec2 uv, float t, float dens) {
  vec2 st = uv * vec2(22.0, 5.0);
  float col = floor(st.x);
  float n = hash12(vec2(col, 3.7));
  st.y += t * (0.9 + n * 1.6) + n * 9.0;
  vec2 id = vec2(col, floor(st.y));
  vec2 f = fract(st) - 0.5;
  float h = hash12(id);
  if (h > dens) return 0.0;
  float x = f.x + (h / dens - 0.5) * 0.5;
  float head = smoothstep(0.16, 0.06, length(vec2(x, (f.y + 0.28) * 1.6)));
  float trail = smoothstep(0.05, 0.0, abs(x)) * smoothstep(-0.25, 0.45, f.y) * 0.35;
  float beads = smoothstep(0.07, 0.0, length(vec2(x, fract(f.y * 5.0) - 0.5) * vec2(1.0, 0.6))) * step(-0.2, f.y) * 0.5;
  return max(head, max(trail, beads));
}

void main() {
  vec3 V = normalize(uEye - vPos);
  vec2 uv = vUV;
  float side = sign(vPos.z);
  float paneDirt = vCol.r;
  // grime: dust collects along the bottom rail and the corners; a wiped arc where someone leaned
  float bottom = smoothstep(0.16, 0.0, uv.y - vCol.g);
  float n = fbm(uv * vec2(7.0, 11.0) + vCol.b * 13.0);
  float specks = step(0.985, hash12(floor(uv * 260.0) + vCol.b * 31.0));
  float grime = clamp(bottom * 0.45 + n * 0.12 * paneDirt + specks * 0.4, 0.0, 1.0);
  vec3 lightOnGrime = uFlu * 0.25 + uWinL * 0.7 + uEnvWin * 0.1;
  vec3 c = vec3(0.0);
  float a = 0.02 + grime * 0.12;
  c += vec3(0.55, 0.53, 0.47) * lightOnGrime * grime;

  // rain: the train drags each drop backwards across the pane
  if (uRain > 0.01) {
    float ang = atan(clamp(uSpeed * 0.06, 0.0, 1.4)) * (side > 0.0 ? 1.0 : -1.0);
    mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 ruv = R * uv;
    float ring;
    float b = drop(uv, uTime, uRain * 0.35, ring);
    float s = streak(ruv, uTime * (0.6 + uSpeed * 0.08), uRain * 0.55);
    float m = max(b, s);
    vec3 dc = uEnvWin * 0.18 + uFlu * 0.12 + vec3(0.01);
    c = mix(c, dc, m * 0.6);
    c += (uFlu * 0.35 + uEnvWin * 0.25) * ring * 0.6;
    a = max(a, m * 0.32 + ring * 0.18);
  }
  // fake night reflection for panes we do not mirror properly
  if (uFakeRefl > 0.0 && side < 0.0) {
    float tube = smoothstep(0.3, 0.0, abs(uv.y - vCol.g - 0.62)) * 0.4;
    c += uFlu * (0.08 + tube) * uFakeRefl;
    a = max(a, 0.16 * uFakeRefl);
  }
  // a whisper of sky glare on the glass at grazing angles
  float fres = pow(1.0 - abs(dot(V, vec3(0.0, 0.0, side))), 4.0);
  c += uEnvWin * fres * 0.25;
  a = clamp(a + fres * 0.08, 0.0, 0.92);
  // premultiplied: the pane dims what is behind it by (1 - a) and adds its own light
  frag = vec4(pow(aces(c * uExpo), vec3(1.0 / 2.2)) * uGain, a);
}`;

// ── outside: shared vertex shader ───────────────────────────────────────────
// aPos for strips: x in [-1,1], y in [0,1]. For meshes: world (car-relative) positions.
export const OUT_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aCol;
layout(location=4) in vec4 aMat;
uniform mat4 uVP;
uniform mat4 uWorld;
uniform mat4 uModel;
uniform int uKind;          // 0 mesh, 1 strip, 2 ground
uniform vec4 uStrip;        // z (signed), height, base y, period
uniform vec4 uStripX;       // half length, u offset, side, unused
uniform float uScroll;
uniform float uCurv;
uniform float uRise;        // the rails rising into the sky
out vec3 vPos; out vec3 vNrm; out vec2 vUV; out vec4 vCol; out vec4 vMat; out vec3 vWorld;
float bend(float x) { return uCurv * x * abs(x) * 0.5; }
void main() {
  vec3 p; vec3 n = aNrm;
  vUV = aUV; vCol = aCol; vMat = aMat;
  if (uKind == 1) {
    float x = aPos.x * uStripX.x;
    p = vec3(x, uStrip.z + aPos.y * uStrip.y, uStrip.x);
    float side = uStrip.x > 0.0 ? -1.0 : 1.0;
    vUV = vec2((x + uScroll) / uStrip.w * side + uStripX.y, 1.0 - aPos.y);
    n = vec3(0.0, 0.0, -sign(uStrip.x));
  } else {
    p = (uModel * vec4(aPos, 1.0)).xyz;
    n = mat3(uModel) * aNrm;
  }
  p.z += bend(p.x);
  p.y -= uRise;
  vWorld = vec3(p.x + uScroll, p.y, p.z);
  vec4 wp = uWorld * vec4(p, 1.0);
  vPos = wp.xyz;
  vNrm = mat3(uWorld) * n;
  gl_Position = uVP * wp;
}`;

const OUT_LIGHT = /* glsl */ `
uniform vec3 uEye;
uniform vec3 uOutAmb;
uniform vec3 uOutSun;
uniform vec3 uSunDir;
uniform vec3 uFogCol;
uniform float uFogDen;
uniform float uFogFloor;
vec3 fogit(vec3 c, vec3 p) {
  float d = length(p - uEye);
  float f = 1.0 - exp(-d * uFogDen);
  f = max(f, uFogFloor * smoothstep(0.0, 40.0, d));
  return mix(c, uFogCol, clamp(f, 0.0, 1.0));
}
`;

export const STRIP_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat; in vec3 vWorld;
uniform sampler2D uTex;
uniform sampler2D uEm;
uniform float uEmGain;
uniform float uFade;
uniform float uBlink;
out vec4 frag;
${COMMON}
${OUT_LIGHT}
void main() {
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.004) discard;
  vec3 alb = pow(t.rgb, vec3(2.2));
  vec3 n = normalize(vNrm);
  float facing = max(dot(n, uSunDir), 0.0) * 0.7 + 0.3;
  vec3 c = alb * (uOutAmb + uOutSun * facing);
  vec4 e = texture(uEm, vUV);
  float blink = 1.0;
  if (uBlink > 0.0) {
    float k = floor(vWorld.x / 9.0);
    blink = mix(1.0, step(0.25, fract(uTime * (0.4 + hash12(vec2(k, 2.0)) * 1.3) + hash12(vec2(k, 7.0)))), uBlink * step(0.75, hash12(vec2(k, 5.0))));
  }
  c += pow(e.rgb, vec3(2.2)) * e.a * uEmGain * blink;
  c = fogit(c, vPos);
  frag = vec4(finish(c), t.a * uFade);
}`;

// Generic lit outside mesh: poles, platforms, tunnel lining, crossings, stations.
export const OBJ_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat; in vec3 vWorld;
uniform sampler2D uTex;
uniform int uUseTex;
uniform int uProc;          // 0 plain, 1 tunnel lining, 2 graffiti tunnel
uniform vec4 uLamp;         // tunnel lamp: period, offset, intensity, side
uniform vec3 uLampCol;
uniform sampler2D uGraf;
uniform float uStrobe;
uniform vec3 uStrobeCol;
uniform vec4 uOL[6];
uniform vec4 uOLc[6];
out vec4 frag;
${COMMON}
${OUT_LIGHT}
void main() {
  vec3 alb = vCol.rgb;
  float a = vCol.a;
  if (uUseTex == 1) {
    vec4 t = texture(uTex, vUV);
    alb *= pow(t.rgb, vec3(2.2));
    a *= t.a;
    if (a < 0.35) discard;
  }
  vec3 n = normalize(vNrm);
  vec3 V = normalize(uEye - vPos);
  if (dot(n, V) < 0.0) n = -n;
  vec3 c;
  vec3 emis = alb * vMat.w;
  if (uProc >= 1) {
    // tunnel lining: concrete rings, damp streaks, a cable run, sodium lamps
    float ring = smoothstep(0.03, 0.0, abs(fract(vWorld.x / 1.2) - 0.5) - 0.47);
    float damp = fbm(vec2(vWorld.x * 0.15, vPos.y * 1.3)) * 0.6 + 0.4;
    alb = vec3(0.18, 0.17, 0.155) * damp * (1.0 - ring * 0.5);
    float cable = smoothstep(0.03, 0.0, abs(vPos.y - 0.95)) + smoothstep(0.02, 0.0, abs(vPos.y - 0.85));
    alb = mix(alb, vec3(0.02), clamp(cable, 0.0, 1.0));
    if (uProc == 2) {
      vec4 g = texture(uGraf, vec2(vWorld.x / 60.0 * sign(vPos.z), 1.0 - clamp((vPos.y + 1.6) / 4.2, 0.0, 1.0)));
      alb = mix(alb, pow(g.rgb, vec3(2.2)), g.a);
    }
    // lamps
    float lx = mod(vWorld.x + uLamp.y, uLamp.x) - uLamp.x * 0.5;
    vec3 lp = vec3(lx, 1.05, 0.0);
    float dz = abs(abs(vPos.z) - 2.25);
    float d2 = lx * lx + (vPos.y - 1.05) * (vPos.y - 1.05) + dz * dz;
    vec3 lampLight = uLampCol * uLamp.z * 2.2 / (1.0 + d2 * 0.9);
    float lampCore = smoothstep(0.3, 0.12, abs(lx)) * smoothstep(0.1, 0.03, abs(vPos.y - 1.05)) * step(2.0, abs(vPos.z));
    c = alb * (uOutAmb + lampLight + uStrobeCol * uStrobe * 1.6);
    c += uLampCol * lampCore * 6.0 * uLamp.z;
  } else {
    float ndl = max(dot(n, uSunDir), 0.0);
    c = alb * (uOutAmb * (0.6 + 0.4 * max(n.y, 0.0)) + uOutSun * ndl);
    for (int i = 0; i < 6; i++) {
      if (uOLc[i].a <= 0.0) continue;
      vec3 d = uOL[i].xyz - vPos;
      float d2 = dot(d, d);
      c += alb * uOLc[i].rgb * uOLc[i].a * max(dot(n, normalize(d)) * 0.8 + 0.2, 0.0) / (1.0 + d2 / (uOL[i].w * uOL[i].w));
    }
    c += alb * uStrobeCol * uStrobe;
  }
  c += emis;
  c = fogit(c, vPos);
  frag = vec4(finish(c), a);
}`;

// Ground: rice paddies / street / glossy grass / void / mud / sea, all procedural.
export const GROUND_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat; in vec3 vWorld;
uniform int uGround;
uniform vec3 uG1;
uniform vec3 uG2;
uniform vec3 uG3;
uniform vec3 uSkyRefl;
uniform vec3 uSunCol;
uniform float uFade;
out vec4 frag;
${COMMON}
${OUT_LIGHT}
vec3 paddies(vec2 w, float dist) {
  // plots of rice, each its own green; ridges between them; some still flooded
  vec2 plot = vec2(28.0, 19.0);
  vec2 id = floor(w / plot);
  vec2 f = fract(w / plot);
  float h = hash12(id);
  vec3 c = mix(uG1, uG2, h * 0.7);
  float rows = 0.5 + 0.5 * sin(w.y * 22.0);
  float rowFade = smoothstep(60.0, 8.0, dist);
  c *= 1.0 - rows * 0.18 * rowFade;
  c *= 0.85 + 0.3 * vnoise(w * 0.35);
  float flooded = step(0.82, h);
  vec3 water = uSkyRefl * 0.75 + vec3(0.01);
  float rice = 0.35 + 0.5 * vnoise(w * 0.9 + 3.0);
  c = mix(c, mix(water, c, rice * 0.5), flooded);
  float edge = min(min(f.x, 1.0 - f.x) * plot.x, min(f.y, 1.0 - f.y) * plot.y);
  float ridge = 1.0 - smoothstep(0.25, 0.5 + dist * 0.004, edge);
  c = mix(c, uG3, ridge);
  return c;
}
vec3 street(vec2 w, float dist) {
  vec3 c = vec3(0.012, 0.012, 0.016);
  float lane = smoothstep(0.08, 0.0, abs(fract(w.y / 3.5) - 0.5) - 0.48) * step(0.5, fract(w.x / 6.0));
  c += vec3(0.08) * lane * smoothstep(80.0, 10.0, dist);
  // wet neon smears
  float k = floor(w.x / 7.0);
  float hue = hash12(vec2(k, 1.0));
  vec3 neon = hue < 0.33 ? uG1 : hue < 0.66 ? uG2 : uG3;
  float smear = smoothstep(2.6, 0.0, abs(fract(w.x / 7.0) - 0.5) * 7.0) * (0.4 + 0.6 * vnoise(vec2(w.x * 0.2, w.y * 3.0)));
  c += neon * smear * 0.35;
  // cars: pairs of headlamps, tail lights the other way
  float lane2 = fract(w.y / 7.0);
  float carx = fract((w.x + uTime * (lane2 > 0.5 ? 9.0 : -11.0)) / 37.0);
  float lamp = smoothstep(0.012, 0.0, abs(carx - 0.5)) * smoothstep(0.6, 0.0, abs(fract(w.y / 3.5) - 0.5) * 3.5);
  c += (lane2 > 0.5 ? vec3(2.4, 2.1, 1.6) : vec3(2.2, 0.15, 0.1)) * lamp;
  return c;
}
vec3 aeroGrass(vec2 w, float dist) {
  float roll = vnoise(w * 0.012) * 0.6 + vnoise(w * 0.05) * 0.4;
  vec3 c = mix(uG1, uG2, roll);
  c *= 0.9 + 0.2 * vnoise(w * 1.4);
  float stream = smoothstep(3.0, 1.0, abs(w.y - 60.0 - sin(w.x * 0.013) * 25.0));
  c = mix(c, uSkyRefl * 1.1 + vec3(0.02, 0.05, 0.08), stream);
  return c;
}
vec3 voidFloor(vec2 w, float dist) {
  vec2 g = abs(fract(w / 8.0) - 0.5);
  float line = smoothstep(0.012 + dist * 0.00012, 0.0, min(g.x, g.y) - 0.0);
  vec3 c = vec3(0.002) + uG1 * line * 0.25 * smoothstep(400.0, 20.0, dist);
  float rings = 0.5 + 0.5 * sin(length(w - vec2(0.0, 40.0)) * 0.12 - uTime * 3.0);
  c += uG1 * pow(rings, 30.0) * 0.08 * smoothstep(300.0, 20.0, dist);
  return c;
}
vec3 mud(vec2 w, float dist) {
  float n = fbm(w * 0.06);
  vec3 c = mix(uG1, uG2, smoothstep(0.35, 0.7, n));
  float puddle = smoothstep(0.62, 0.66, fbm(w * 0.03 + 7.0));
  c = mix(c, uSkyRefl * 0.6, puddle);
  c *= 0.85 + 0.25 * vnoise(w * 0.8);
  return c;
}
vec3 sea(vec2 w, float dist, vec3 V) {
  float wv = fbm(vec2(w.x * 0.05 + uTime * 0.05, w.y * 0.09 - uTime * 0.08));
  vec3 c = mix(uG1, uG2, smoothstep(0.2, 0.8, wv));
  // sun glitter on a path toward the eye
  vec3 n = normalize(vec3((vnoise(w * 0.6 + uTime * 0.6) - 0.5) * 0.35, 1.0, (vnoise(w * 0.6 - uTime * 0.5 + 9.0) - 0.5) * 0.35));
  vec3 r = reflect(-V, n);
  float g = pow(max(dot(r, uSunDir), 0.0), 180.0);
  float spark = step(0.7, vnoise(w * 3.0 + uTime * 2.0));
  c += uSunCol * (g * 9.0 * spark + pow(max(dot(r, uSunDir), 0.0), 12.0) * 0.35);
  c = mix(c, uSkyRefl, pow(1.0 - max(V.y, 0.0), 6.0) * 0.6);
  return c;
}
void main() {
  vec2 w = vWorld.xz;
  float dist = length(vPos - uEye);
  vec3 V = normalize(uEye - vPos);
  vec3 c;
  if (uGround == 1) c = paddies(w, dist);
  else if (uGround == 2) c = street(w, dist);
  else if (uGround == 3) c = aeroGrass(w, dist);
  else if (uGround == 4) c = voidFloor(w, dist);
  else if (uGround == 5) c = mud(w, dist);
  else if (uGround == 6) c = sea(w, dist, V);
  else c = uG1;
  vec3 lit;
  if (uGround == 2 || uGround == 4 || uGround == 6) lit = c * (0.4 + uOutAmb * 0.6) + c * uOutSun * 0.2;
  else lit = c * (uOutAmb + uOutSun * max(uSunDir.y, 0.0));
  if (uGround == 6) lit = c;
  lit = fogit(lit, vPos);
  frag = vec4(finish(lit), uFade);
}`;

// The trackbed: ballast, sleepers, the two rails catching the light.
export const TRACK_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat; in vec3 vWorld;
uniform vec3 uRailGlint;
uniform vec3 uBallast;
uniform float uFade;
out vec4 frag;
${COMMON}
${OUT_LIGHT}
void main() {
  float x = vWorld.x, z = vWorld.z;
  float dist = length(vPos - uEye);
  vec3 V = normalize(uEye - vPos);
  float g = vnoise(vec2(x, z) * 9.0) * 0.6 + vnoise(vec2(x, z) * 31.0) * 0.4;
  vec3 c = uBallast * (0.65 + 0.5 * g);
  float sl = fract(x / 0.6);
  float sleeper = step(abs(z), 1.05) * smoothstep(0.03, 0.0, abs(sl - 0.5) - 0.17);
  c = mix(c, uBallast * vec3(0.95, 0.92, 0.88) * 0.85, sleeper * smoothstep(120.0, 20.0, dist));
  float aa = 0.006 + dist * 0.0009;
  float rail = smoothstep(aa + 0.033, 0.033, abs(abs(z) - 0.5335));
  vec3 r = reflect(-V, vec3(0.0, 1.0, 0.0));
  float glint = 0.25 + pow(max(dot(normalize(vec3(r.x, r.y * 0.4, r.z)), uSunDir), 0.0), 6.0) * 2.0;
  c = mix(c, uRailGlint * glint + vec3(0.06), rail);
  float joint = step(abs(fract(x / 25.0) - 0.5), 0.0016);
  c *= 1.0 - joint * rail;
  vec3 lit = c * (uOutAmb + uOutSun * max(uSunDir.y, 0.0)) + uRailGlint * rail * glint * 0.4;
  lit = fogit(lit, vPos);
  frag = vec4(finish(lit), uFade);
}`;

// Sky: gradients, sun, clouds, stars, the galaxy band, neon glow, the void.
export const SKY_VS = /* glsl */ `#version 300 es
precision highp float;
out vec2 vNdc;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  vNdc = p;
  gl_Position = vec4(p, 1.0, 1.0);
}`;

export const SKY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vNdc;
uniform mat4 uInvVP;
uniform vec3 uEyeW;
uniform vec4 uSA[7];
uniform vec4 uSB[7];
uniform float uMix;
uniform float uHeading;
out vec4 frag;
${COMMON}
vec3 stars(vec3 rd, float amt) {
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 160.0 : 420.0;
    vec3 q = rd * sc;
    vec3 id = floor(q);
    vec3 f = fract(q) - 0.5;
    float h = hash13(id + float(k) * 17.0);
    if (h > (k == 0 ? 0.965 : 0.92)) {
      vec3 o = vec3(hash13(id + 3.1), hash13(id + 5.7), hash13(id + 8.3)) - 0.5;
      float d = length(f - o * 0.6);
      float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 4.0) + h * 40.0);
      float b = smoothstep(k == 0 ? 0.11 : 0.07, 0.0, d) * tw;
      vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), hash13(id + 1.7));
      c += tint * b * (k == 0 ? 3.0 : 1.1);
    }
  }
  return c * amt;
}
vec3 sky(vec4 P[7], vec3 rd) {
  float y = rd.y;
  vec3 zen = P[0].rgb, hor = P[1].rgb;
  float h = pow(1.0 - max(y, 0.0), P[1].a);
  vec3 c = mix(zen, hor, h);
  if (y < 0.0) c = mix(hor, hor * 0.55, smoothstep(0.0, -0.35, y));
  vec3 sd = normalize(P[2].xyz);
  float sdot = max(dot(rd, sd), 0.0);
  int mode = int(P[6].x + 0.5);
  // clouds
  if (P[4].a > 0.0 && y > -0.02) {
    vec2 cp = rd.xz / (max(y, 0.0) + 0.08) * P[5].a + vec2(uTime * 0.006, uTime * 0.002);
    float n = fbm(cp * 1.25);
    float cov = smoothstep(1.0 - P[4].a, 1.0 - P[4].a + 0.32, n);
    float shade = fbm(cp * 2.4 + 3.0);
    vec3 cc = mix(P[5].rgb, P[4].rgb, smoothstep(0.25, 0.8, shade));
    cc += P[3].rgb * pow(sdot, 5.0) * 0.5 * P[3].a;
    c = mix(c, cc, cov * smoothstep(-0.02, 0.1, y));
  }
  float glow = P[3].a;
  c += P[3].rgb * (pow(sdot, 2.0) * 0.12 * glow + pow(sdot, 10.0) * 0.4 * glow);
  c += P[3].rgb * smoothstep(1.0 - 0.00012 * P[2].w, 1.0 - 0.00004 * P[2].w, sdot) * 14.0;
  if (P[0].a > 0.0 && y > -0.06) c += stars(rd, P[0].a) * smoothstep(-0.06, 0.12, y);
  if (mode == 1) {
    // city glow under the clouds
    c += P[6].z * vec3(0.9, 0.35, 0.45) * pow(1.0 - max(y, 0.0), 10.0) * 0.6;
  } else if (mode == 2) {
    // the void: faint pink rings breathing on the horizon
    float ang = atan(rd.x, rd.z);
    float ring = smoothstep(0.02, 0.0, abs(fract(length(rd.xz / (abs(y) + 0.2)) * 0.6 - uTime * 0.25) - 0.5) - 0.47);
    c += P[6].w * vec3(1.0, 0.4, 0.67) * ring * 0.05 * smoothstep(0.5, 0.0, abs(y));
  } else if (mode == 3) {
    // the Milky Way: a tilted band of dust and light
    vec3 axis = normalize(vec3(0.35, 0.82, 0.45));
    float b = dot(rd, axis);
    float band = exp(-b * b * 18.0);
    vec2 bp = vec2(atan(rd.z, rd.x) * 3.0, b * 9.0);
    float dust = fbm(bp * 1.6 + 4.0);
    float lanes = smoothstep(0.42, 0.62, fbm(bp * 3.1 + 11.0));
    vec3 neb = mix(vec3(0.35, 0.45, 1.0), vec3(1.0, 0.75, 0.55), dust);
    c += neb * band * (0.6 + 1.6 * dust) * (1.0 - lanes * 0.7) * P[6].y;
    c += stars(rd, P[6].y * (0.6 + band * 2.4));
    c += vec3(0.6, 0.4, 0.9) * pow(fbm(bp * 0.7 + 30.0), 3.0) * 0.4 * P[6].y;
  }
  return c;
}
void main() {
  vec4 a = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 rd = normalize(a.xyz / a.w - uEyeW);
  float ch = cos(uHeading), sh = sin(uHeading);
  rd = vec3(ch * rd.x - sh * rd.z, rd.y, sh * rd.x + ch * rd.z);
  vec3 c = sky(uSA, rd);
  if (uMix > 0.001) c = mix(c, sky(uSB, rd), uMix);
  frag = vec4(finish(c), 1.0);
}`;

// ── sprites: glows (additive billboards) and particles ──────────────────────
export const SPRITE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec4 aP;     // xyz centre, w size (m)
layout(location=1) in vec4 aC;     // rgb colour (linear), a intensity
layout(location=2) in vec4 aX;     // x kind, y stretch along x, z phase, w rotation
uniform mat4 uVP;
uniform mat4 uView;
uniform mat4 uWorldS;   // identity for interior sprites, uWorld for outside
uniform float uScaleY;
out vec2 vQ; out vec4 vC; out vec4 vX;
void main() {
  int corner = gl_VertexID % 6;
  vec2 q = corner == 0 ? vec2(-1, -1) : corner == 1 ? vec2(1, -1) : corner == 2 ? vec2(1, 1) : corner == 3 ? vec2(-1, -1) : corner == 4 ? vec2(1, 1) : vec2(-1, 1);
  vQ = q; vC = aC; vX = aX;
  vec4 c = uWorldS * vec4(aP.xyz, 1.0);
  vec3 right = vec3(uView[0][0], uView[1][0], uView[2][0]);
  vec3 up = vec3(uView[0][1], uView[1][1], uView[2][1]);
  float s = aP.w;
  float cr = cos(aX.w), sr = sin(aX.w);
  vec2 qr = vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr);
  vec3 p = c.xyz + right * qr.x * s * (1.0 + aX.y) + up * qr.y * s * uScaleY;
  gl_Position = uVP * vec4(p, 1.0);
}`;

export const SPRITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vQ; in vec4 vC; in vec4 vX;
uniform float uExpoS;
out vec4 frag;
${COMMON}
void main() {
  float r = length(vQ);
  int kind = int(vX.x + 0.5);
  float a = 0.0;
  vec3 c = vC.rgb;
  if (kind == 0) {          // soft glow
    a = exp(-r * r * 4.5) + exp(-r * 9.0) * 0.4;
  } else if (kind == 1) {   // orb of light: hot core, halo
    a = smoothstep(0.32, 0.0, r) * 2.4 + exp(-r * r * 6.0) * 0.8 + exp(-r * 3.0) * 0.18;
    c = mix(c, vec3(1.0), smoothstep(0.25, 0.0, r));
  } else if (kind == 2) {   // dust mote
    a = smoothstep(1.0, 0.0, r);
    a *= a;
  } else if (kind == 3) {   // bubble: iridescent rim, a window highlight
    float rim = smoothstep(0.78, 0.98, r) * smoothstep(1.0, 0.97, r);
    vec2 hp = vQ - vec2(-0.35, 0.38);
    float hl = smoothstep(0.22, 0.0, length(hp * vec2(1.0, 1.6)));
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (r * 1.6 + vec3(0.0, 0.33, 0.67) + vX.z));
    c = irid * rim * 1.4 + vec3(1.0) * hl * 1.6 + vec3(0.6, 0.85, 1.0) * 0.06;
    a = clamp(rim + hl + 0.05, 0.0, 1.0) * step(r, 1.0);
  } else if (kind == 4) {   // approach circle: a ring shrinking onto its hit circle
    float ap = vX.z;        // 0..1 approach progress; >1 = burst
    float R = mix(1.0, 0.3, clamp(ap, 0.0, 1.0));
    float ring = smoothstep(0.03, 0.0, abs(r - R) - 0.02) * step(ap, 1.0);
    float hit = smoothstep(0.012, 0.0, abs(r - 0.28) - 0.03);
    float fill = smoothstep(0.27, 0.25, r) * 0.25;
    float burst = ap > 1.0 ? smoothstep(0.04, 0.0, abs(r - (0.3 + (ap - 1.0) * 0.9)) - 0.02) * (2.0 - ap) : 0.0;
    float alive = ap > 1.0 ? (2.0 - ap) : smoothstep(0.0, 0.25, ap);
    a = (ring * 0.9 + (hit + fill) * alive + burst) * step(r, 1.0);
    c = mix(vec3(1.0), c, smoothstep(0.2, 0.3, r));
  } else if (kind == 5) {   // star / sparkle cross
    float cross = exp(-abs(vQ.x) * 22.0) * exp(-abs(vQ.y) * 3.0) + exp(-abs(vQ.y) * 22.0) * exp(-abs(vQ.x) * 3.0);
    a = exp(-r * r * 30.0) * 2.0 + cross * 0.6;
  } else if (kind == 6) {   // streak (lamp passing, rain)
    a = exp(-vQ.y * vQ.y * 6.0) * smoothstep(1.0, 0.2, abs(vQ.x));
  } else if (kind == 7) {   // light shaft (sunbeam slab)
    a = smoothstep(1.0, 0.3, abs(vQ.x)) * smoothstep(1.0, 0.0, vQ.y * 0.5 + 0.5) * 0.5;
  }
  vec3 o = c * a * vC.a;
  // additive: no filmic curve, just exposure and the gamma lift
  o = 1.0 - exp(-o * uExpoS);
  frag = vec4(pow(o, vec3(1.0 / 2.2)), 1.0);
}`;
