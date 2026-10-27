// 黄昏ヶ浜 — shader part 1: header, noise, sky, sun, clouds, far hills, the ferry.
// Units are metres and radians. Camera looks +z (west, into the sunset), y is up.

export const GLSL_SKY = /* glsl */ `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uSunEl;
uniform float uSunAz;
uniform float uSet;
uniform float uDusk;
uniform float uLights;
uniform float uPearl;
uniform float uStreet;
uniform float uStar;
uniform float uOrb;
uniform float uFade;
uniform float uExpo;
uniform vec3  uCam;
uniform float uYaw;
uniform float uFocal;
uniform float uHz;
uniform float uShift;
uniform float uSeed;
uniform float uRipK;
uniform float uFerry;
uniform float uLedge;
uniform sampler2D uNoise;
uniform sampler2D uRipple;

#define PI 3.14159265
#define SUN_R 0.0175
#define LAND_H 2.5

vec3 gSd;      // sun direction
vec3 gSunC;    // direct sunlight (colour * intensity), already scaled by visibility
float gSunVis; // fraction of the disc above the sea
vec3 gAmb;     // sky ambient
vec3 gHaze;    // horizon haze
vec3 gGlowC;   // mie glow colour
float gPixA;   // radians per pixel
float gAux;    // material detail written by intersectors
vec2 gUV;      // sign-face coordinates

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

float hash1(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }
float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// box-filtered coverage of [a,b] for a sample of width fp centred at x
float band(float x, float a, float b, float fp) {
  fp = max(fp, 1e-4);
  return clamp((min(x + 0.5 * fp, b) - max(x - 0.5 * fp, a)) / fp, 0.0, 1.0);
}

float vnoise(vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(uNoise, (p + f + 0.5) / 256.0).x;
}
float vnoiseB(vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(uNoise, (p + f + 0.5) / 256.0).y;
}

float fbm(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * vnoise(p);
    n += a;
    p = mat2(1.62, 1.18, -1.18, 1.62) * p + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return s / n;
}

// ── the sky: amber at the sea, rose, then violet, deepening as the sun goes ──
vec3 skyGrad(float el) {
  float u = sqrt(clamp(el, 0.0, 0.7) / 0.7);
  float k = uSet, d = uDusk;
  vec3 c0 = mix(mix(vec3(1.0, 0.71, 0.42), vec3(1.0, 0.56, 0.25), k), vec3(0.88, 0.42, 0.24), d);
  vec3 c1 = mix(mix(vec3(1.0, 0.63, 0.40), vec3(0.97, 0.45, 0.27), k), vec3(0.70, 0.32, 0.32), d);
  vec3 c2 = mix(mix(vec3(0.96, 0.56, 0.47), vec3(0.87, 0.37, 0.40), k), vec3(0.50, 0.27, 0.40), d);
  vec3 c3 = mix(mix(vec3(0.80, 0.49, 0.58), vec3(0.62, 0.33, 0.50), k), vec3(0.32, 0.23, 0.41), d);
  vec3 c4 = mix(mix(vec3(0.56, 0.43, 0.64), vec3(0.35, 0.27, 0.49), k), vec3(0.17, 0.16, 0.33), d);
  vec3 c5 = mix(mix(vec3(0.31, 0.32, 0.54), vec3(0.16, 0.16, 0.35), k), vec3(0.075, 0.085, 0.22), d);
  float w0 = exp(-pow((u - 0.00) / 0.13, 2.0));
  float w1 = exp(-pow((u - 0.22) / 0.13, 2.0));
  float w2 = exp(-pow((u - 0.36) / 0.13, 2.0));
  float w3 = exp(-pow((u - 0.51) / 0.13, 2.0));
  float w4 = exp(-pow((u - 0.70) / 0.15, 2.0));
  float w5 = exp(-pow((u - 1.00) / 0.17, 2.0));
  return lin((c0 * w0 + c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4 + c5 * w5) / (w0 + w1 + w2 + w3 + w4 + w5));
}

vec3 sunGlow(float az, float el) {
  float dx = az - uSunAz, dy = el - uSunEl;
  float dA = length(vec2(dx * 0.55, dy * 1.3));
  float dB = length(vec2(dx, dy * 1.1));
  float ext = mix(1.0, 0.4, smoothstep(0.1, 1.0, uSet));   // the air near the sea swallows the aureole
  float g = exp(-dA * 5.0) * 0.6 + (exp(-dB * 19.0) * 0.8 + exp(-dB * 70.0) * 2.4) * ext;
  float hb = exp(-max(el, 0.0) * 24.0) * exp(-abs(dx) * 2.0) * 0.5;
  return gGlowC * (g + hb) * mix(1.0, 0.32, uDusk);
}

vec3 hazeAt(float az) {
  return gHaze + gGlowC * exp(-abs(az - uSunAz) * 3.2) * 0.55 * mix(1.0, 0.35, uDusk);
}

vec3 sunDisc(float az, float el, float pixA) {
  float sq = mix(1.0, 1.24, smoothstep(0.06, 0.0, uSunEl)); // refraction flattens it near the sea
  vec2 dd = vec2(az - uSunAz, (el - uSunEl) * sq);
  float r = length(dd) / SUN_R;
  float aa = pixA / SUN_R * 1.2;
  float m = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
  if (m <= 0.0) return vec3(0.0);
  float limb = 1.0 - 0.42 * r * r;
  vec3 c = lin(mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.50, 0.20), smoothstep(0.0, 1.0, uSet)));
  float I = mix(26.0, 2.4, pow(uSet, 0.8));
  // thin strata lying on the horizon cut across the low sun
  float st = smoothstep(0.42, 0.85, vnoise(vec2(az * 5.0 + uTime * 0.004, el * 640.0)))
           * (1.0 - smoothstep(0.004, 0.04, el));
  return c * I * m * limb * (1.0 - 0.55 * st);
}

float star(float az, float el, float pixA) {
  if (uStar <= 0.0) return 0.0;
  vec2 d = vec2(az - (uSunAz + 0.09), el - 0.17) / pixA;
  float r2 = dot(d, d);
  float tw = 0.9 + 0.1 * sin(uTime * 5.3 + sin(uTime * 1.7) * 2.0);
  return uStar * (exp(-r2 * 0.45) * 2.6 + exp(-sqrt(r2) * 0.45) * 0.07) * tw;
}

// stratus streaks lit from below + high cirrus that stays pink after the sun is gone
vec3 clouds(vec3 rd, float az, float el, int oct, vec3 c) {
  if (rd.y <= 0.0) return c;
  float dx = az - uSunAz, dy = el - uSunEl;
  float dS = length(vec2(dx * 0.7, dy));

  vec3 shC = lin(mix(mix(vec3(0.62, 0.45, 0.54), vec3(0.42, 0.29, 0.44), uSet), vec3(0.20, 0.15, 0.28), uDusk));
  // cirrus (high) — too faint to matter in reflections
  if (oct > 2) {
  float t2 = 7000.0 / (rd.y + 0.03);
  vec2 uv2 = rd.xz * t2 * vec2(0.000032, 0.00011) + vec2(uTime * 0.0011, 0.0);
  float w = vnoise(uv2 * 0.5 + 11.0);
  uv2 += vec2(w * 1.3, w * 0.35);
  float cn = fbm(uv2 * 1.7, oct > 3 ? 4 : 3);
  float fil = pow(1.0 - abs(2.0 * cn - 1.0), 5.0);
  float d2 = smoothstep(0.35, 0.85, fil) * smoothstep(0.42, 0.7, vnoise(uv2 * 0.3 + 5.0)) * 0.42;
  d2 *= smoothstep(0.035, 0.14, el);
  float lit2 = smoothstep(-0.09, 0.0, uSunEl + 0.03);
  vec3 cir = mix(shC * 1.05, lin(vec3(1.0, 0.66, 0.62)) * mix(1.05, 0.8, uSet) * (0.75 + exp(-dS * 3.0) * 1.2), lit2);
  c = mix(c, cir, d2);
  }

  // stratus (low, long, horizontal)
  float t = 1600.0 / (rd.y + 0.015);
  vec2 uv = rd.xz * t * vec2(0.00011, 0.00042);
  uv.x += uTime * 0.0032;
  uv += 0.38 * vec2(vnoise(uv * 0.7 + 3.1), vnoiseB(uv * 0.7 + 7.7));
  float n = fbm(uv, oct);
  float cover = 0.56 + 0.05 * smoothstep(0.02, 0.15, el);
  float dens = smoothstep(cover, cover + 0.2, n);
  dens *= smoothstep(0.0, 0.01, el) * (1.0 - smoothstep(0.16, 0.3, el) * 0.6);
  float lit = smoothstep(-0.035, 0.015, uSunEl + el * 0.35);
  vec3 litC = lin(mix(mix(vec3(1.0, 0.72, 0.46), vec3(1.0, 0.50, 0.36), uSet), vec3(0.92, 0.38, 0.42), uDusk));
  float fwd = exp(-dS * 5.0) * 1.7 + 0.5;
  float thin = 1.0 - dens;
  vec3 cc = mix(shC * 0.9, litC * fwd, lit * (0.3 + 0.7 * thin));
  cc += litC * exp(-dS * 13.0) * thin * dens * 4.0 * lit * gSunVis;
  c = mix(c, cc, dens * 0.92);
  return c;
}

vec3 sky(vec3 rd, float az, float el, float pixA, int oct, float withSun) {
  vec3 c = skyGrad(el) * mix(0.94, 0.86, uSet);
  float hz = exp(-max(el, 0.0) * 42.0);
  c = mix(c, gHaze, hz * 0.35);
  // slow banks of haze drifting on the horizon
  float hv = vnoise(vec2(az * 9.0 + uTime * 0.01, el * 140.0)) - 0.5;
  c *= 1.0 + hv * 0.12 * exp(-max(el, 0.0) * 60.0);
  c += sunGlow(az, el);
  if (withSun > 0.5) {
    c += vec3(1.0, 0.95, 0.86) * star(az, el, pixA);
    c += sunDisc(az, el, pixA);
  }
  c = clouds(rd, az, el, oct, c);
  c = mix(c, hazeAt(az), hz * 0.22);
  return c;
}

// ── far land: an island where the bridge ends, a headland where it lands, hills ──
float ridge(float x, float s) {
  return vnoise(vec2(x, s)) * 0.55 + vnoise(vec2(x * 2.7, s + 5.3)) * 0.3 + vnoise(vec2(x * 7.1, s + 9.7)) * 0.15;
}
float h1At(float az) { return 0.017 * smoothstep(0.17, 0.32, az) * (0.45 + 0.75 * ridge(az * 13.0, 11.0)); }
float h2At(float az) { return 0.036 * smoothstep(0.27, 0.52, az) * (0.5 + 0.7 * ridge(az * 8.0, 23.0)); }
float h3At(float az) { return 0.07 * smoothstep(0.40, 0.80, az) * (0.55 + 0.6 * ridge(az * 5.0, 37.0)); }

float houseLights(float az, float el, float pixA, float hgt, float seed, float dens) {
  float cell = floor(az * 260.0);
  float r = hash1(cell * 1.7 + seed);
  if (r < dens) return 0.0;
  float lx = (cell + 0.2 + 0.6 * hash1(cell * 3.1 + seed)) / 260.0;
  float ly = hgt * (0.12 + 0.5 * hash1(cell * 5.3 + seed));
  vec2 d = vec2(az - lx, el - ly) / pixA;
  float on = smoothstep(r * 0.9 - 0.75, r * 0.9 - 0.65, uStreet);
  return on * (exp(-dot(d, d) * 0.7) * 1.4 + exp(-length(d) * 0.55) * 0.03);
}

void hills(float az, float el, float pixA, inout vec3 c) {
  if (el > 0.13 || el < -0.006 || (az > -0.39 && az < 0.165)) return;
  vec3 hz = hazeAt(az);
  float aa = pixA * 1.2;
  float baseMist = exp(-max(el, 0.0) / 0.004);

  float hI = 0.0078 * smoothstep(-0.40, -0.50, az) * (0.6 + 0.6 * ridge(az * 25.0, 2.0));
  vec3 cI = mix(hz, lin(vec3(0.42, 0.33, 0.46)), 0.26);
  c = mix(c, mix(cI, hz, baseMist * 0.4), band(el, -0.02, hI, aa));

  float h1 = h1At(az);
  vec3 c1 = mix(hz, lin(vec3(0.40, 0.30, 0.42)), 0.36);
  c1 = mix(c1, hz, baseMist * 0.45);
  c = mix(c, c1, band(el, -0.02, h1, aa));

  float h2 = h2At(az);
  vec3 c2 = mix(hz, lin(vec3(0.25, 0.18, 0.27)), 0.56);
  c2 = mix(c2, hz, baseMist * 0.35);
  c2 += hz * 0.12 * exp(-max(h2 - el, 0.0) / (pixA * 2.5));
  float m2 = band(el, -0.02, h2, aa);
  c = mix(c, c2, m2);

  float h3 = h3At(az);
  vec3 c3 = mix(hz, lin(vec3(0.11, 0.08, 0.11)), 0.74);
  c3 = mix(c3, hz, baseMist * 0.25);
  c3 += hz * 0.1 * exp(-max(h3 - el, 0.0) / (pixA * 2.0));
  float m3 = band(el, -0.02, h3, aa);
  c = mix(c, c3, m3);

  if (uStreet > 0.0) {
    vec3 warm = lin(vec3(1.0, 0.74, 0.44));
    c += warm * houseLights(az, el, pixA, h2, 3.0, 0.9) * m2 * (1.0 - m3) * 0.8;
    c += warm * houseLights(az, el, pixA, h3, 9.0, 0.82) * m3 * 1.1;
  }
}

// a ferry crossing far out, under the bridge, lights coming on at dusk
void ferry(vec3 ro, vec3 rd, float pixA, float refl, float tMax, inout vec3 c) {
  if (rd.z <= 0.0) return;
  float t = (6800.0 - ro.z) / rd.z;
  if (t > tMax) return;
  vec3 H = ro + rd * t;
  float x = H.x - mix(-3300.0, 2700.0, uFerry);
  float y = H.y;
  if (abs(x) > 140.0 || y > 60.0 || y < -4.0) return;
  float fp = t * pixA * (1.0 + 2.0 * refl);
  float hull = band(x, -62.0, 60.0 - max(0.0, y - 1.0) * 1.6, fp) * band(y, -1.0, 9.0, fp);
  float sup = band(x, -42.0, 24.0, fp) * band(y, 9.0, 17.0, fp) + band(x, -34.0, 10.0, fp) * band(y, 17.0, 22.0, fp);
  float fun = band(x, -30.0, -23.0, fp) * band(y, 22.0, 28.0, fp);
  float cov = clamp(hull + sup + fun, 0.0, 1.0);
  vec3 hz = hazeAt(atan(rd.x, rd.z));
  c = mix(c, mix(hz, lin(vec3(0.30, 0.23, 0.32)), 0.42), cov);
  if (uStreet > 0.0) {
    float win = band(y, 12.0, 13.8, fp) * band(x, -40.0, 22.0, fp) * (0.55 + 0.45 * sin(x * 1.3));
    float mast = exp(-pow(length(vec2(x + 5.0, (y - 30.0) * (1.0 - refl * 0.85))) / max(fp, 1.0), 2.0));
    c += lin(vec3(1.0, 0.8, 0.52)) * win * uStreet * 1.6 + vec3(1.0) * mast * uStreet * 1.2;
  }
}
`;
