// 黄昏ヶ浜 — shader part 3: materials, the sea, the frame, the grade.

export const GLSL_MAIN = /* glsl */ `
vec3 roofAlb(float id) {
  if (id < 0.5) return lin(vec3(0.27, 0.31, 0.38));
  if (id < 1.5) return lin(vec3(0.42, 0.26, 0.19));
  if (id < 2.5) return lin(vec3(0.34, 0.34, 0.36));
  if (id < 3.5) return lin(vec3(0.31, 0.32, 0.36));
  if (id < 4.5) return lin(vec3(0.38, 0.25, 0.19));
  if (id < 5.5) return lin(vec3(0.26, 0.30, 0.36));
  if (id < 6.5) return lin(vec3(0.31, 0.29, 0.31));
  return lin(vec3(0.40, 0.28, 0.21));
}

vec3 objAlbedo(float mat, vec3 P, out float wet) {
  wet = 0.0;
  if (mat < 2.0) { wet = 0.42; return roofAlb(floor((mat - 1.0) * 10.0 + 0.5)) * gAux * 0.8; }
  if (mat < 3.0) { wet = 0.15 + 0.5 * (1.0 - gAux); return lin(vec3(0.58, 0.53, 0.46)) * gAux * (0.8 + 0.3 * vnoise(P.xz * 2.0 + P.y)); }
  if (mat < 4.0) { wet = 0.1; return lin(vec3(0.52, 0.50, 0.47)) * (0.75 + 0.35 * vnoise(vec2(P.y * 5.0, P.x))); }
  if (mat < 5.0) { wet = 0.25; return lin(vec3(0.32, 0.21, 0.15)); }
  if (mat < 6.0) {
    if (gAux < 0.5) return lin(vec3(0.42, 0.42, 0.44));
    vec2 q = gUV;
    float r = length(q);
    vec3 c = lin(vec3(0.86, 0.83, 0.74));
    c = mix(c, lin(vec3(0.64, 0.27, 0.23)), step(0.79, r));
    // a little bus, worn
    float bus = step(abs(q.x), 0.44) * step(-0.04, q.y) * step(q.y, 0.30);
    float win = step(abs(q.x), 0.36) * step(0.13, q.y) * step(q.y, 0.24) * step(0.3, fract(q.x * 4.0 + 0.1));
    float wh = step(length(q - vec2(-0.24, -0.06)), 0.08) + step(length(q - vec2(0.24, -0.06)), 0.08);
    vec3 ink = lin(vec3(0.22, 0.27, 0.36));
    c = mix(c, ink, clamp(bus + wh, 0.0, 1.0) * (1.0 - win * 0.75));
    c = mix(c, ink, step(abs(q.x), 0.46) * step(-0.42, q.y) * step(q.y, -0.30) * 0.85);
    c *= 0.82 + 0.25 * vnoise(q * 9.0);
    wet = 0.1;
    return c;
  }
  if (mat < 7.0) {
    if (gAux < 0.5) return lin(vec3(0.42, 0.42, 0.44));
    vec2 q = gUV;
    vec3 c = lin(vec3(0.84, 0.82, 0.75));
    c = mix(c, lin(vec3(0.30, 0.42, 0.56)), step(0.22, q.y));
    float grid = max(step(0.82, fract(q.y * 22.0)), step(0.9, fract(q.x * 6.0 + 0.5))) * step(q.y, 0.2);
    c = mix(c, lin(vec3(0.35, 0.35, 0.38)), grid * 0.6);
    c *= 0.8 + 0.25 * vnoise(q * 12.0);
    wet = 0.15;
    return c;
  }
  wet = 0.3;
  return lin(vec3(0.62, 0.62, 0.64));
}

vec3 shadeObj(float mat, vec3 P, vec3 n, vec3 rd, float t, float cheap) {
  float wet;
  vec3 alb = objAlbedo(mat, P, wet);
  float wl = 1.0 - smoothstep(0.0, 0.35, P.y);
  alb *= mix(vec3(1.0), vec3(0.5, 0.56, 0.47), wl);
  wet = max(wet, wl * 0.8);
  float ndl = max(dot(n, gSd), 0.0);
  vec3 amb = gAmb * (0.55 + 0.45 * n.y) + gHaze * 0.12 * (1.0 - abs(n.y));
  float bounce = max(dot(n, normalize(vec3(gSd.x, 0.0, gSd.z))), 0.0) * 0.25;
  vec3 col = alb * (gSunC * (ndl + bounce * 0.2) + amb);
  // the edge of everything that faces the sun burns a little
  float rim = pow(1.0 - abs(dot(n, -rd)), 3.0) * max(dot(normalize(n.xz + 1e-5), normalize(gSd.xz)), 0.0);
  col += gSunC * rim * 0.5;
  if (cheap < 0.5) {
    vec3 r = reflect(rd, n);
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    float rel = asin(clamp(r.y, -1.0, 1.0));
    vec3 env = r.y > 0.0 ? skyGrad(rel) + sunGlow(atan(r.x, r.z), rel) : gHaze * 0.35;
    float sp = pow(max(dot(r, gSd), 0.0), 90.0) * 6.0;
    col += wet * (F * env + gSunC * sp);
  }
  float fog = 1.0 - exp(-t / 1800.0);
  return mix(col, hazeAt(atan(rd.x, rd.z)), fog);
}

vec3 underObj(float mat, vec3 Q, vec3 n) {
  float wet;
  vec3 alb = objAlbedo(mat, Q, wet) * vec3(0.62, 0.74, 0.62);
  float caus = pow(texture2D(uRipple, Q.xz * 0.11 + vec2(uTime * 0.013, -uTime * 0.02)).x, 3.0) * 2.2;
  vec3 light = gAmb * 0.6 * (0.6 + 0.4 * n.y) + gSunC * 0.3 * caus * max(n.y, 0.0) * exp(Q.y * 0.3);
  return alb * light;
}

vec3 seaFloor(vec3 Q) {
  float n = fbm(Q.xz * 0.25, 3);
  vec3 alb = lin(vec3(0.42, 0.38, 0.30)) * (0.6 + 0.6 * n);
  // the old road still runs out under the water, toward the houses
  vec2 a = vec2(4.0, 10.0), b = vec2(-6.0, 210.0);
  vec2 ab = b - a;
  float h = clamp(dot(Q.xz - a, ab) / dot(ab, ab), 0.0, 1.0);
  float d = length(Q.xz - a - ab * h);
  float road = 1.0 - smoothstep(3.0, 3.4, d);
  alb = mix(alb, lin(vec3(0.24, 0.24, 0.25)) * (0.8 + 0.4 * n), road);
  float cl = (1.0 - smoothstep(0.07, 0.15, d)) * step(0.5, fract(h * length(ab) / 10.0));
  alb = mix(alb, lin(vec3(0.72, 0.72, 0.66)), cl * 0.7);
  float caus = pow(texture2D(uRipple, Q.xz * 0.11 + vec2(uTime * 0.013, -uTime * 0.02)).x, 3.0) * 2.2;
  return alb * (gAmb * 0.55 + gSunC * 0.22 * caus);
}

void wave(vec2 xz, vec2 dir, float lam, float amp, float T, float fpz, inout vec2 g, inout float var) {
  float k = 6.2832 / lam;
  float w = sqrt(9.81 * k);
  float a = amp * k;
  float fd = smoothstep(1.5 * fpz, 5.0 * fpz, lam);
  if (fd > 0.0) g += fd * a * dir * cos(k * dot(dir, xz) - w * T);
  var += (1.0 - fd * fd) * 0.5 * a * a;
}

void ring(vec2 xz, vec2 c, float amp, inout vec2 g) {
  vec2 d = xz - c;
  float r = length(d);
  if (r < 16.0 && r > 0.05) g += d / r * amp * cos(r * 4.2 - uTime * 1.9) * exp(-r * 0.28);
}

vec3 orbPos() {
  float rise = clamp(uOrb - 1.0, 0.0, 1.0);
  rise = rise * rise * (3.0 - 2.0 * rise);
  return vec3(sin(uSunAz) * 380.0, mix(0.6, 46.0, rise), cos(uSunAz) * 380.0);
}
float orbGlow(vec3 ro, vec3 rd, float pixA, float refl) {
  vec3 v = orbPos() - ro;
  float along = dot(v, rd);
  if (along <= 0.0) return 0.0;
  vec3 pp = v - rd * along;
  vec2 d = vec2(length(pp.xz), pp.y) / (along * pixA * uRes.y / 900.0);
  if (refl > 0.5) d *= vec2(0.6, 0.12);
  float r = length(d);
  float R = mix(2.0, 5.5, clamp(uOrb, 0.0, 1.0));
  float pulse = 1.0 + 0.12 * sin(uTime * 2.6);
  return (exp(-r * r / (R * R)) * 1.6 + exp(-r / (R * 3.5)) * 0.35 + exp(-r / (R * 14.0)) * 0.06) * pulse;
}
float orbAmt() { return clamp(uOrb, 0.0, 1.0) * (1.0 - clamp(uOrb - 2.0, 0.0, 1.0)); }

vec3 water(vec3 ro, vec3 rd, float tW, float pixA) {
  vec3 P = ro + rd * tW;
  float fpz = tW * pixA / max(-rd.y, 0.002);
  float T = uTime * 0.55;
  vec2 g = vec2(0.0);
  float var = 0.0;
  wave(P.xz, vec2(0.10, -0.995), 41.0, 0.17, T, fpz, g, var);
  wave(P.xz, vec2(-0.29, -0.957), 23.0, 0.095, T, fpz, g, var);
  wave(P.xz, vec2(0.47, -0.883), 12.5, 0.045, T, fpz, g, var);
  wave(P.xz, vec2(-0.66, -0.75), 7.1, 0.022, T, fpz, g, var);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float S = 22.0 * pow(0.42, fi);
    float sl = 0.034 - fi * 0.003;
    float fd = smoothstep(1.5 * fpz, 4.0 * fpz, S / 14.0);
    if (fd > 0.0) {
      float ang = fi * 1.7 + 0.4;
      float ca = cos(ang), sa = sin(ang);
      vec2 rp = vec2(ca * P.x + sa * P.z, -sa * P.x + ca * P.z);
      vec2 uv = rp / S + vec2(0.13 * fi, -1.0) * T * 0.11 / sqrt(S);
      vec2 gg = (texture2D(uRipple, uv).yz * 2.0 - 1.0) * uRipK * sl;
      g += fd * vec2(ca * gg.x - sa * gg.y, sa * gg.x + ca * gg.y);
    }
    var += (1.0 - fd * fd) * 2.0 * sl * sl;
  }
  if (tW < 260.0) {
    ring(P.xz, P1, 0.05, g);
    ring(P.xz, P2, 0.04, g);
    ring(P.xz, STOP, 0.035, g);
  }
  var += 0.0006 + SUN_R * SUN_R * 0.3;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = -rd;
  float cosi = max(dot(n, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosi, 5.0);

  // what the sea reflects
  vec3 r = reflect(rd, n);
  if (r.y < 0.002) r = normalize(vec3(r.x, 0.002, r.z));
  float raz = atan(r.x, r.z), rel = asin(r.y);
  float rpix = pixA * (1.0 + 30.0 * sqrt(var));
  vec3 refl = sky(r, raz, rel, rpix, 2, 0.0);
  hills(raz, rel, rpix, refl);
  ferry(P, r, rpix, 1.0, 1e9, refl);
  bridge(P, r, pixA, 1.0, 1e9, refl);
  float tLr = land(P, r, pixA, 1e9, 1.0, refl);
  if (P.z < 250.0) {
    vec3 nO; float mO;
    float tO = scene(P + vec3(0.0, 0.02, 0.0), r, min(tLr, 400.0), nO, mO);
    if (tO < min(tLr, 400.0)) refl = shadeObj(mO, P + r * tO, nO, r, tO, 1.0);
    wires(P, r, pixA, 400.0, 1.0, refl);
  }
  float oa = orbAmt();
  if (oa > 0.0) refl += lin(vec3(1.0, 0.86, 0.62)) * orbGlow(P, r, pixA, 1.0) * oa * 3.0;

  // the road of light: the sun's glitter
  vec3 h = normalize(gSd + V);
  float ndh = max(dot(n, h), 1e-3);
  float c2 = ndh * ndh;
  float D = exp(-((1.0 - c2) / c2) / var) / (PI * var * c2 * c2);
  float vh = max(dot(V, h), 0.0);
  float Fh = 0.02 + 0.98 * pow(1.0 - vh, 5.0);
  float spec = Fh * D / (4.0 * max(cosi, 0.06));
  float hy = max(h.y, 1e-3);
  float hy2 = hy * hy;
  float vb = var * 5.0 + 0.004;
  float Db = exp(-((1.0 - hy2) / hy2) / vb) / (PI * vb * hy2 * hy2);
  float bloom = Fh * Db / (4.0 * max(-rd.y, 0.06)) * 0.1;
  float sh = 1.0;
  if (spec > 0.05 && P.z < 300.0 && gSunVis > 0.0) {
    vec3 nS; float mS;
    float ts = scene(P + vec3(0.0, 0.05, 0.0), gSd, 600.0, nS, mS);
    if (ts < 600.0) sh = 0.0;
  }
  vec3 sunRad = lin(mix(vec3(1.0, 0.92, 0.75), vec3(1.0, 0.62, 0.30), uSet)) * mix(26.0, 11.0, uSet) * PI * SUN_R * SUN_R;
  vec3 glit = sunRad * (spec * sh + bloom) * gSunVis * (1.0 + oa * 0.9);

  // what lies under it
  vec3 scat = lin(vec3(0.10, 0.16, 0.19)) * (gAmb * 1.1 + gSunC * 0.05);
  vec3 under = scat;
  if (tW < 420.0) {
    vec3 rr = refract(rd, n, 0.752);
    float floorY = -4.6 - max(0.0, P.z - 150.0) * 0.06 - max(0.0, -P.x - 55.0) * 0.06;
    float tf = (P.y - floorY) / max(-rr.y, 0.03);
    float tU = tf;
    vec3 nU; float mU;
    if (P.z < 270.0 && P.x > -80.0 && P.x < 32.0) tU = scene(P - vec3(0.0, 0.02, 0.0), rr, tf, nU, mU);
    vec3 surf = tU < tf ? underObj(mU, P + rr * tU, nU) : seaFloor(P + rr * tf);
    vec3 tr = exp(-vec3(0.42, 0.13, 0.085) * min(tU, tf));
    under = mix(surf * tr + scat * (1.0 - tr), scat, smoothstep(250.0, 420.0, tW));
  }
  vec3 col = mix(under, refl, F) + glit;
  float fog = (1.0 - exp(-tW / 16000.0)) * 0.5;
  return mix(col, hazeAt(atan(rd.x, rd.z)), fog);
}

// the seawall parapet you are leaning on
vec3 ledge(vec2 p, vec3 c) {
  float px = 1.0 / uRes.y;
  float yTop = -0.5 + 0.055 + 0.012 * p.x;
  if (p.y > yTop + 3.0 * px) return c;
  float a = band(p.y, -1.0, yTop, px * 1.5);
  vec2 tc = vec2(p.x + uCam.x * 0.004, p.y) * 160.0;
  float n = fbm(tc * 0.35, 4) * 0.65 + vnoise(tc * 2.3) * 0.35;
  vec3 conc = lin(vec3(0.46, 0.41, 0.38)) * (0.7 + 0.55 * n);
  float topF = smoothstep(yTop - 0.016, yTop - 0.012, p.y);
  vec3 lt = conc * (gAmb * 1.25 + gSunC * 0.22 + gHaze * 0.1);
  vec3 fr = conc * (gAmb * 0.32 + gHaze * 0.04);
  fr *= 0.85 + 0.3 * smoothstep(0.55, 0.8, vnoise(vec2(tc.x * 0.08, tc.y * 0.6)));
  vec3 lc = mix(fr, lt, topF);
  float rim = exp(-max(yTop - p.y, 0.0) / 0.0022);
  lc += (gSunC * 0.4 * gSunVis + gHaze * 0.12) * rim;
  return mix(c, lc, a * uLedge);
}

vec3 tonemap(vec3 x) {
  vec3 k = vec3(0.62);
  return mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(k, x));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(vec3(p.x + uShift, p.y + uHz, uFocal));
  float cy = cos(uYaw), sy = sin(uYaw);
  rd = vec3(cy * rd.x + sy * rd.z, rd.y, -sy * rd.x + cy * rd.z);
  vec3 ro = vec3(uCam.x, 6.0 + uCam.y, uCam.z);
  float pixA = 1.0 / (uFocal * uRes.y);
  gPixA = pixA;

  gSd = vec3(sin(uSunAz) * cos(uSunEl), sin(uSunEl), cos(uSunAz) * cos(uSunEl));
  gSunVis = smoothstep(-SUN_R, SUN_R, uSunEl);
  gSunC = lin(mix(vec3(1.0, 0.80, 0.56), vec3(1.0, 0.52, 0.24), uSet)) * mix(3.0, 1.7, uSet) * gSunVis;
  gAmb = lin(mix(mix(vec3(0.56, 0.50, 0.66), vec3(0.40, 0.33, 0.50), uSet), vec3(0.22, 0.19, 0.33), uDusk)) * 0.55;
  gHaze = lin(mix(mix(vec3(1.0, 0.77, 0.55), vec3(1.0, 0.62, 0.38), uSet), vec3(0.80, 0.44, 0.33), uDusk)) * mix(0.95, 0.85, uSet);
  gGlowC = lin(mix(mix(vec3(1.0, 0.80, 0.55), vec3(1.0, 0.56, 0.26), uSet), vec3(0.95, 0.42, 0.25), uDusk));
  gAux = 1.0;
  gUV = vec2(0.0);

  float az = atan(rd.x, rd.z);
  float el = asin(clamp(rd.y, -1.0, 1.0));
  float tW = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  vec3 col;
  if (rd.y >= 0.0) {
    col = sky(rd, az, el, pixA, 5, 1.0);
    hills(az, el, pixA, col);
  } else {
    col = water(ro, rd, tW, pixA);
    if (tW > 9000.0) hills(az, el, pixA, col);
  }
  ferry(ro, rd, pixA, 0.0, tW, col);
  bridge(ro, rd, pixA, 0.0, tW, col);
  vec3 nO; float mO;
  float tO = scene(ro, rd, tW, nO, mO);
  if (tO < tW) col = shadeObj(mO, ro + rd * tO, nO, rd, tO, 0.0);
  float tS = min(tW, tO);
  float tL = land(ro, rd, pixA, tS, 0.0, col);
  tS = min(tS, tL);
  wires(ro, rd, pixA, tS, 0.0, col);

  float oa = orbAmt();
  if (oa > 0.0) {
    col += lin(vec3(1.0, 0.88, 0.66)) * orbGlow(ro, rd, pixA, 0.0) * oa * 4.0;
  }
  col = ledge(p, col);

  col *= uExpo;
  col = tonemap(col);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, col * vec3(0.90, 0.87, 1.08), (1.0 - smoothstep(0.0, 0.35, lum)) * 0.5);
  col = mix(col, col * vec3(1.05, 1.0, 0.92), smoothstep(0.45, 1.0, lum) * 0.3);
  col = mix(vec3(lum), col, 1.06);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  vec2 uv = gl_FragCoord.xy / uRes;
  col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 0.85)) * 1.25, 2.4);
  float gr = hash2(gl_FragCoord.xy + uSeed * vec2(37.0, 17.0)) + hash2(gl_FragCoord.xy * 1.37 + uSeed * vec2(11.0, 53.0)) - 1.0;
  col += gr * 0.032 * (1.0 - 0.6 * lum);
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;
