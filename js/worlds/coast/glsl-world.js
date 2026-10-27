// 黄昏ヶ浜 — shader part 2: the bridge, the coastal road, the drowned town.

export const GLSL_WORLD = /* glsl */ `
// ── the long bridge: approach viaducts, a suspension main span, lights one by one ──
const vec2 BA = vec2(520.0, 2150.0);
const vec2 BB = vec2(-2500.0, 5300.0);
#define T1 0.13
#define T2 0.37

float deckTop(float s) {
  return 50.0 - 24.0 * smoothstep(0.07, 0.0, s) - 22.0 * smoothstep(0.88, 1.0, s);
}
float cableY(float s) {
  if (s >= T1 && s <= T2) { float w = (s - 0.25) / 0.12; return 62.0 + 148.0 * w * w; }
  if (s >= 0.03 && s < T1) { float u = (s - 0.03) / 0.10; return mix(46.0, 210.0, u) - 22.0 * u * (1.0 - u); }
  if (s > T2 && s <= 0.47) { float u = (0.47 - s) / 0.10; return mix(46.0, 210.0, u) - 22.0 * u * (1.0 - u); }
  return -1.0;
}

float lampGlow(vec3 ro, vec3 rd, vec3 Lp, float pixA, float refl, float core) {
  vec3 v = Lp - ro;
  float along = dot(v, rd);
  if (along <= 0.0) return 0.0;
  vec3 pp = v - rd * along;
  vec2 d = vec2(length(pp.xz), pp.y) / (along * pixA);
  if (refl > 0.5) d *= vec2(0.7, 0.09);
  float r2 = dot(d, d);
  return exp(-r2 / (core * core)) + exp(-sqrt(r2) * 0.3) * (refl > 0.5 ? 0.012 : 0.05);
}

void bridge(vec3 ro, vec3 rd, float pixA, float refl, float tMax, inout vec3 c) {
  vec2 D = BB - BA;
  float Lb = length(D);
  vec2 Dn = D / Lb;
  vec2 Nn = vec2(-Dn.y, Dn.x);
  float den = dot(rd.xz, Nn);
  if (abs(den) < 1e-5) return;
  float t = dot(BA - ro.xz, Nn) / den;
  if (t <= 0.0 || t > tMax) return;
  vec3 H = ro + rd * t;
  float u = dot(H.xz - BA, Dn);
  float s = u / Lb;
  if (s < -0.03 || s > 1.03 || H.y > 290.0 || H.y < -40.0) return;
  float y = H.y;
  float fp = t * pixA * (1.0 + 2.0 * refl);
  float sinA = max(abs(den) / max(length(rd.xz), 1e-4), 0.05);
  float fpU = fp / sinA;

  float yt = deckTop(s);
  float cov = band(y, yt - 7.0, yt, fp) * band(u, -70.0, Lb, fpU);
  // parapet + lamp standards as a faint second line
  cov = max(cov, band(y, yt, yt + 1.4, fp) * band(u, -70.0, Lb, fpU) * 0.55);
  // piers
  if ((s < T1 - 0.012 || s > T2 + 0.012) && s < 0.995) {
    float sp = 64.0;
    float lu = mod(u + 32.0, sp) - 32.0;
    float pc = band(lu, -2.8, 2.8, fpU);
    pc = mix(pc, 5.6 / sp, smoothstep(sp * 0.25, sp * 0.8, fpU));
    cov = max(cov, pc * band(y, -2.0, yt - 6.5, fp));
  }
  // portal towers: two legs, three cross beams
  for (int k = 0; k < 2; k++) {
    float uT = (k == 0 ? T1 : T2) * Lb;
    float du = u - uT;
    float hw = mix(5.2, 3.4, clamp(y / 215.0, 0.0, 1.0));
    float legs = band(du, -9.0 - hw, -9.0 + hw, fpU) + band(du, 9.0 - hw, 9.0 + hw, fpU);
    float beams = band(du, -12.0, 12.0, fpU) * (band(y, yt - 7.0, yt - 2.0, fp) + band(y, 118.0, 124.0, fp) + band(y, 200.0, 212.0, fp));
    cov = max(cov, clamp(legs + beams, 0.0, 1.0) * band(y, -2.0, 213.0, fp));
  }
  // main cables and hangers
  float yc = cableY(s);
  if (yc > 0.0) {
    float sl = (cableY(s + 0.001) - cableY(s - 0.001)) / (0.002 * Lb);
    float dist = abs(y - yc) / sqrt(1.0 + sl * sl);
    float cw = 0.9;
    cov = max(cov, min(1.0, 2.0 * cw / fp) * clamp(1.0 - max(dist - cw, 0.0) / fp, 0.0, 1.0));
    if (y < yc && y > yt) {
      float hs = 24.0;
      float lh = mod(u, hs) - hs * 0.5;
      float hc = band(lh, -0.4, 0.4, fpU);
      hc = mix(hc, 0.8 / hs, smoothstep(hs * 0.3, hs, fpU));
      cov = max(cov, hc * 0.8);
    }
  }
  float fog = 1.0 - exp(-t / 5200.0);
  vec3 hz = hazeAt(atan(rd.x, rd.z));
  vec3 sil = mix(lin(vec3(0.17, 0.115, 0.17)), hz, 0.22 + 0.55 * fog);
  // a breath of sun along the deck's upper edge
  sil += gSunC * 0.05 * band(y, yt - 1.0, yt, fp) * gSunVis;
  c = mix(c, sil, cov);

  float atten = (1.0 - fog * 0.45) * (0.35 + 0.65 * clamp(uSet * 0.35 + uDusk * 1.2, 0.0, 1.0));
  // deck lamps
  if (uLights > 0.0) {
    float sp = 38.0;
    float i0 = floor(u / sp + 0.5);
    float g = 0.0;
    for (int k = -1; k <= 1; k++) {
      float i = i0 + float(k);
      float ui = i * sp;
      float si = ui / Lb;
      if (si < -0.012 || si > 1.0) continue;
      float on = smoothstep(0.0, 0.025, uLights * 1.06 - si - hash1(i * 7.13) * 0.03);
      vec3 Lp = vec3(BA.x + Dn.x * ui, deckTop(si) + 7.5, BA.y + Dn.y * ui);
      g += lampGlow(ro, rd, Lp, pixA, refl, 0.95) * on;
    }
    c += g * lin(vec3(1.0, 0.66, 0.36)) * 2.8 * atten;
    // aviation lights on the tower tops
    for (int k = 0; k < 2; k++) {
      float uT = (k == 0 ? T1 : T2) * Lb;
      vec3 Lp = vec3(BA.x + Dn.x * uT, 215.0, BA.y + Dn.y * uT);
      float blink = smoothstep(-0.2, 0.4, sin(uTime * 2.1 + float(k) * 1.3));
      c += lin(vec3(1.0, 0.16, 0.10)) * lampGlow(ro, rd, Lp, pixA, refl, 1.1) * blink * 3.0 * smoothstep(0.0, 0.08, uLights);
    }
  }
  // the pearl line: lights strung along the main cable
  if (uPearl > 0.0 && s > 0.02 && s < 0.48) {
    float sp = 0.0042;
    float j0 = floor(s / sp + 0.5);
    float g = 0.0;
    for (int k = -1; k <= 1; k++) {
      float sj = (j0 + float(k)) * sp;
      float yj = cableY(sj);
      if (yj < 0.0) continue;
      float key = abs(sj - 0.25) / 0.23;
      float on = smoothstep(key, key + 0.05, uPearl * 1.06);
      vec3 Lp = vec3(BA.x + Dn.x * sj * Lb, yj + 1.2, BA.y + Dn.y * sj * Lb);
      g += lampGlow(ro, rd, Lp, pixA, refl, 0.85) * on;
    }
    c += g * lin(vec3(0.88, 0.93, 1.0)) * 2.2 * atten;
  }
}

// ── the coastal road: seawall, guardrail, utility poles, wires, long shadows ──
const vec2 S0 = vec2(7.0, 0.0);
const vec2 DR = vec2(0.21951, 0.97561);
const vec2 NR = vec2(0.97561, -0.21951);
#define POLE_SP 34.0
#define POLE_V 0.3
#define RAIL_V 0.65
#define POLE_H 10.5

float landShadow(vec3 H) {
  float v = dot(H.xz - S0, NR), u = dot(H.xz - S0, DR);
  float dvs = dot(gSd.xz, NR);
  if (dvs >= -1e-4) return 1.0;
  float horiz = length(gSd.xz);
  float sinS = -dvs / horiz;
  float cotS = dot(gSd.xz, DR) / (-dvs);
  float sh = 1.0;
  if (v > POLE_V) {
    float ts = (POLE_V - v) / dvs;
    float ys = H.y + gSd.y * ts;
    float us = u + dot(gSd.xz, DR) * ts;
    float k = floor(us / POLE_SP + 0.5);
    float du = us - k * POLE_SP;
    float pen = 0.08 + ts * 0.012;
    float pole = band(du, -0.16 / sinS, 0.16 / sinS, pen / sinS) * band(ys, -1.0, LAND_H + POLE_H, pen);
    float arm = band(du, -0.9 * abs(cotS) - 0.06, 0.9 * abs(cotS) + 0.06, pen / sinS)
              * band(ys, LAND_H + POLE_H - 1.1, LAND_H + POLE_H - 0.95, pen);
    sh *= 1.0 - 0.85 * max(pole, arm);
  }
  if (v > RAIL_V) {
    float ts = (RAIL_V - v) / dvs;
    float ys = H.y + gSd.y * ts;
    float us = u + dot(gSd.xz, DR) * ts;
    float pen = 0.03 + ts * 0.012;
    float rail = band(ys, LAND_H + 0.5, LAND_H + 0.8, pen);
    float pd = mod(us, 4.0) - 2.0;
    float post = band(pd, -0.06 / sinS, 0.06 / sinS, pen / sinS) * band(ys, -1.0, LAND_H + 0.8, pen);
    sh *= 1.0 - 0.8 * max(rail, post);
  }
  return sh;
}

vec3 shadeLandTop(vec3 H, float t, vec3 rd, float pixA) {
  float u = dot(H.xz - S0, DR), v = dot(H.xz - S0, NR);
  vec2 rdh = normalize(rd.xz);
  float fpg = t * pixA / max(-rd.y, 0.004);
  float fpv = fpg * abs(dot(rdh, NR)) + t * pixA;
  float fpu = fpg * abs(dot(rdh, DR)) + t * pixA;
  float n = vnoise(H.xz * vec2(0.35, 0.12)) * 0.6 + vnoise(H.xz * 1.7) * 0.4;
  vec3 asphalt = lin(vec3(0.30, 0.29, 0.29)) * (0.85 + 0.3 * n);
  vec3 grass = lin(vec3(0.27, 0.27, 0.16)) * (0.6 + 0.6 * n);
  vec3 conc = lin(vec3(0.62, 0.58, 0.54));
  vec3 alb = grass * mix(1.0, 0.55, smoothstep(12.0, 40.0, v));
  alb = mix(alb, lin(vec3(0.34, 0.31, 0.27)) * (0.8 + 0.4 * n), band(v, 8.0, 9.2, fpv));
  alb = mix(alb, asphalt, band(v, 1.05, 8.0, fpv));
  alb = mix(alb, lin(vec3(0.30, 0.29, 0.22)), band(v, 0.35, 1.05, fpv));
  alb = mix(alb, conc, band(v, -0.1, 0.35, fpv));
  vec3 white = lin(vec3(0.86, 0.84, 0.80));
  float lines = band(v, 1.2, 1.35, fpv) + band(v, 7.7, 7.85, fpv);
  float dash = band(mod(u, 10.0), 0.0, 5.0, fpu);
  dash = mix(dash, 0.5, smoothstep(2.0, 6.0, fpu));
  lines += band(v, 4.45, 4.6, fpv) * dash;
  alb = mix(alb, white * (0.8 + 0.2 * n), clamp(lines, 0.0, 1.0) * 0.85);
  float sh = landShadow(H);
  vec3 col = alb * (gSunC * max(gSd.y, 0.0) * 3.2 * sh + gAmb);
  vec3 r = reflect(rd, vec3(0.0, 1.0, 0.0));
  float rs = pow(max(dot(r, gSd), 0.0), 16.0) * (0.25 + 0.4 * clamp(lines, 0.0, 1.0));
  col += gSunC * rs * sh * band(v, 1.05, 8.0, fpv) * 0.5;
  // pools of sodium light under the street lamps
  if (uStreet > 0.0) {
    float k = floor(u / (3.0 * POLE_SP) + 0.5) * 3.0;
    vec2 lp = vec2(k * POLE_SP, 2.6);
    float d2 = dot(vec2(u, v) - lp, vec2(u, v) - lp);
    float on = smoothstep(0.0, 0.2, uStreet * 1.3 - hash1(k) * 0.3);
    col += alb * lin(vec3(1.0, 0.62, 0.3)) * exp(-d2 / 45.0) * 2.2 * on;
  }
  return col;
}

// returns t of an opaque hit (or 1e9); composites the road's furniture into c
float land(vec3 ro, vec3 rd, float pixA, float tMax, float refl, inout vec3 c) {
  float v0 = dot(ro.xz - S0, NR);
  float dv = dot(rd.xz, NR);
  if (dv <= 1e-5 || v0 > 0.0) return 1e9;
  float tOp = 1e9;
  float fpm = 1.0 + 2.5 * refl;
  // seawall face (faces the sea and the low sun)
  float tw = -v0 / dv;
  float ywall = ro.y + rd.y * tw;
  if (tw > 0.0 && tw < tMax) {
    float yw = ywall;
    if (yw <= LAND_H && yw > -0.4) {
      vec3 H = ro + rd * tw;
      float u = dot(H.xz - S0, DR);
      float n = vnoise(vec2(u * 0.8, yw * 3.0));
      vec3 alb = lin(vec3(0.50, 0.46, 0.42)) * (0.8 + 0.35 * n);
      alb *= 1.0 - 0.45 * smoothstep(0.9, 0.0, yw);                 // tide-darkened foot
      alb *= 1.0 - 0.35 * band(mod(u, 10.0), 0.0, 0.12, tw * pixA * 3.0); // panel joints
      float ndl = max(dot(vec3(-NR.x, 0.0, -NR.y), gSd), 0.0);
      vec3 col = alb * (gSunC * ndl * 1.25 + gAmb * 0.8);
      float fog = 1.0 - exp(-tw / 2200.0);
      c = mix(col, hazeAt(atan(rd.x, rd.z)), fog);
      tOp = tw;
    }
  }
  if (tOp > 1e8 && rd.y < 0.0 && ywall > LAND_H) {
    float tt = (LAND_H - ro.y) / rd.y;
    if (tt > 0.0 && tt < tMax) {
      vec3 H = ro + rd * tt;
      vec3 col = refl > 0.5 ? lin(vec3(0.2, 0.18, 0.17)) * (gAmb + gSunC * 0.1) : shadeLandTop(H, tt, rd, pixA);
      float fog = 1.0 - exp(-tt / 2600.0);
      c = mix(col, hazeAt(atan(rd.x, rd.z)), fog);
      tOp = tt;
    }
  }
  float tLim = min(tOp, tMax);
  float sinA = max(dv / max(length(rd.xz), 1e-4), 0.02);
  float cotA = dot(rd.xz, DR) / dv;
  // white guardrail
  float tg = (RAIL_V - v0) / dv;
  if (tg > 0.0 && tg < tLim) {
    vec3 H = ro + rd * tg;
    float u = dot(H.xz - S0, DR);
    float y = H.y - LAND_H;
    float fp = tg * pixA * fpm;
    float rail = band(y, 0.5, 0.8, fp);
    float pd = mod(u, 4.0) - 2.0;
    float post = band(pd * sinA, -0.06, 0.06, fp) * band(y, -0.1, 0.78, fp);
    float cov = max(rail, post) * band(u, -30.0, 6000.0, fp / sinA);
    if (cov > 0.0) {
      float ndl = max(dot(vec3(-NR.x, 0.0, -NR.y), gSd), 0.0);
      float ridges = 0.75 + 0.25 * cos((y - 0.65) * 21.0);
      vec3 col = lin(vec3(0.82, 0.80, 0.76)) * (gSunC * ndl * 1.5 * ridges + gAmb * 0.7);
      col += gSunC * 0.25 * band(y, 0.76, 0.8, fp) * gSunVis;
      float fog = 1.0 - exp(-tg / 2200.0);
      c = mix(c, mix(col, hazeAt(atan(rd.x, rd.z)), fog), cov);
    }
  }
  // utility poles, crossarms, wires, street lamps
  float tp = (POLE_V - v0) / dv;
  if (tp > 0.0 && tp < tLim) {
    vec3 H = ro + rd * tp;
    float u = dot(H.xz - S0, DR);
    float y = H.y - LAND_H;
    float fp = tp * pixA * fpm;
    float k = floor(u / POLE_SP + 0.5);
    float du = u - k * POLE_SP;
    float cov = 0.0;
    if (k >= 0.0) {
      float r = mix(0.17, 0.12, clamp(y / POLE_H, 0.0, 1.0));
      cov = band(du * sinA, -r, r, fp) * band(y, -0.5, POLE_H, fp);
      float armW = 0.9 * abs(cotA) + 0.08 / sinA;
      cov = max(cov, band(du, -armW, armW, fp / sinA) * band(y, POLE_H - 1.1, POLE_H - 0.95, fp));
      if (mod(k, 3.0) < 0.5) {
        float aL = 2.1 * cotA;
        cov = max(cov, band(du, min(-aL, 0.0) - 0.05, max(-aL, 0.0) + 0.05, fp / sinA) * band(y, 8.05, 8.2, fp));
      }
    }
    // wires between poles (they sag)
    float f = fract(u / POLE_SP);
    float sag = 4.0 * f * (1.0 - f);
    float wcov = 0.0;
    float y1 = POLE_H - 1.0 - 0.85 * sag;
    float y2 = POLE_H - 0.15 - 0.7 * sag;
    float y3 = 6.8 - 1.0 * sag;
    wcov = max(wcov, min(1.0, 0.028 / fp) * clamp(1.0 - max(abs(y - y1) - 0.014, 0.0) / fp, 0.0, 1.0));
    wcov = max(wcov, min(1.0, 0.022 / fp) * clamp(1.0 - max(abs(y - y2) - 0.011, 0.0) / fp, 0.0, 1.0));
    wcov = max(wcov, min(1.0, 0.07 / fp) * clamp(1.0 - max(abs(y - y3) - 0.035, 0.0) / fp, 0.0, 1.0));
    if (u < -2.0) wcov = 0.0;
    float fog = 1.0 - exp(-tp / 2400.0);
    vec3 hz = hazeAt(atan(rd.x, rd.z));
    vec3 pc = lin(vec3(0.36, 0.33, 0.32)) * (gAmb * 0.8 + gSunC * 0.25);
    c = mix(c, mix(pc, hz, fog), cov);
    float glint = exp(-acos(clamp(dot(rd, gSd), -1.0, 1.0)) * 18.0) * gSunVis;
    vec3 wc = mix(lin(vec3(0.07, 0.06, 0.07)), gSunC * 1.4, glint);
    c = mix(c, mix(wc, hz, fog * 0.8), wcov);
    if (uStreet > 0.0) {
      float tl = (POLE_V + 2.3 - v0) / dv;
      if (tl > 0.0) {
        vec3 Hl = ro + rd * tl;
        float ul = dot(Hl.xz - S0, DR);
        float kk = floor(ul / (3.0 * POLE_SP) + 0.5) * 3.0;
        if (kk >= 0.0) {
          vec2 xz = S0 + DR * kk * POLE_SP + NR * (POLE_V + 2.3);
          vec3 Lp = vec3(xz.x, LAND_H + 7.95, xz.y);
          float on = smoothstep(0.0, 0.2, uStreet * 1.3 - hash1(kk) * 0.3);
          c += lin(vec3(1.0, 0.62, 0.3)) * lampGlow(ro, rd, Lp, pixA, refl, 1.2) * on * 3.0 * (1.0 - fog * 0.6);
        }
      }
    }
  }
  return tOp;
}

// ── the drowned town: rooftops, a leaning pole, a bus stop ──
void clipP(vec3 n, float d, vec3 o, vec3 dd, inout float tn, inout float tf, inout vec3 nn) {
  float den = dot(n, dd);
  float num = d - dot(n, o);
  if (abs(den) < 1e-7) { if (num < 0.0) tf = -1e9; return; }
  float t = num / den;
  if (den < 0.0) { if (t > tn) { tn = t; nn = n; } }
  else tf = min(tf, t);
}

void roof(vec3 ro, vec3 rd, vec2 c, float yaw, float hl, float hd, float ye, float yr, float id,
          inout float tb, inout vec3 nb, inout float mb) {
  // cheap bounding-sphere reject before the plane clipping
  vec3 oc = ro - vec3(c.x, (yr - 9.0) * 0.5, c.y);
  float R2 = hl * hl + hd * hd + 0.25 * (yr + 9.0) * (yr + 9.0) + 1.0;
  float bq = dot(oc, rd), cq = dot(oc, oc) - R2;
  if ((cq > 0.0 && bq > 0.0) || bq * bq - cq < 0.0) return;
  float cs = cos(yaw), sn = sin(yaw);
  vec2 o2 = ro.xz - c;
  vec3 o = vec3(cs * o2.x + sn * o2.y, ro.y, -sn * o2.x + cs * o2.y);
  vec3 d = vec3(cs * rd.x + sn * rd.z, rd.y, -sn * rd.x + cs * rd.z);
  float s = (yr - ye) / hd;
  float ln = sqrt(1.0 + s * s);
  float tn = -1e9, tf = 1e9;
  vec3 nn = vec3(0.0, 1.0, 0.0);
  clipP(vec3(1.0, 0.0, 0.0), hl, o, d, tn, tf, nn);
  clipP(vec3(-1.0, 0.0, 0.0), hl, o, d, tn, tf, nn);
  clipP(vec3(0.0, 1.0, s) / ln, yr / ln, o, d, tn, tf, nn);
  clipP(vec3(0.0, 1.0, -s) / ln, yr / ln, o, d, tn, tf, nn);
  clipP(vec3(0.0, -1.0, 0.0), -(ye - 0.28), o, d, tn, tf, nn);
  if (tn < tf && tn > 0.0 && tn < tb) {
    vec3 lp = o + d * tn;
    vec3 nl = nn;
    float aux = 1.0;
    if (nn.y > 0.3) {
      float detail = smoothstep(4.0, 9.0, 0.32 / (tn * gPixA));
      float rib = sin(lp.x * 19.6) * detail;
      nl = normalize(nn + vec3(rib * 0.2, 0.0, 0.0));
      aux = mix(0.91, 0.82 + 0.18 * smoothstep(0.0, 0.25, fract(abs(lp.z) * 3.6)), detail);
      if (abs(lp.z) < 0.2) aux *= 0.72;
      aux *= 0.9 + 0.2 * hash1(floor(lp.x * 3.1) + floor(abs(lp.z) * 3.6) * 17.0 + id);
    }
    tb = tn;
    nb = vec3(cs * nl.x - sn * nl.z, nl.y, sn * nl.x + cs * nl.z);
    mb = 1.0 + id * 0.1;
    gAux = aux;
  }
  tn = -1e9; tf = 1e9;
  clipP(vec3(1.0, 0.0, 0.0), hl - 0.45, o, d, tn, tf, nn);
  clipP(vec3(-1.0, 0.0, 0.0), hl - 0.45, o, d, tn, tf, nn);
  clipP(vec3(0.0, 0.0, 1.0), hd - 0.55, o, d, tn, tf, nn);
  clipP(vec3(0.0, 0.0, -1.0), hd - 0.55, o, d, tn, tf, nn);
  clipP(vec3(0.0, 1.0, 0.0), ye - 0.15, o, d, tn, tf, nn);
  clipP(vec3(0.0, -1.0, 0.0), 9.0, o, d, tn, tf, nn);
  if (tn < tf && tn > 0.0 && tn < tb) {
    vec3 lp = o + d * tn;
    float wx = abs(nn.x) > 0.5 ? lp.z : lp.x;
    float win = step(0.3, fract(wx / 2.3)) * step(fract(wx / 2.3), 0.78) * step(ye - 1.7, lp.y) * step(lp.y, ye - 0.55);
    tb = tn;
    nb = vec3(cs * nn.x - sn * nn.z, nn.y, sn * nn.x + cs * nn.z);
    mb = 2.0 + id * 0.1;
    gAux = 1.0 - 0.75 * win;
  }
}

void cyl(vec3 ro, vec3 rd, vec2 c, vec2 lean, float r, float top, float mat,
         inout float tb, inout vec3 nb, inout float mb) {
  vec2 oo = ro.xz - c - lean * ro.y;
  vec2 dd = rd.xz - lean * rd.y;
  float a = max(dot(dd, dd), 1e-8);
  float b = dot(oo, dd);
  float cc = dot(oo, oo) - r * r;
  float h = b * b - a * cc;
  if (h <= 0.0) return;
  float t = (-b - sqrt(h)) / a;
  float y = ro.y + rd.y * t;
  if (t > 0.0 && t < tb && y > -9.0 && y < top) {
    vec2 q = oo + dd * t;
    tb = t;
    nb = normalize(vec3(q.x, -dot(q, lean), q.y));
    mb = mat;
    gAux = y;
  }
}

void box(vec3 ro, vec3 rd, vec3 cen, vec3 hs, float mat, inout float tb, inout vec3 nb, inout float mb) {
  vec3 o = ro - cen;
  vec3 d = vec3(abs(rd.x) < 1e-6 ? 1e-6 : rd.x, abs(rd.y) < 1e-6 ? 1e-6 : rd.y, abs(rd.z) < 1e-6 ? 1e-6 : rd.z);
  vec3 inv = 1.0 / d;
  vec3 t1 = (-hs - o) * inv, t2 = (hs - o) * inv;
  vec3 tmin = min(t1, t2), tmax = max(t1, t2);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tn < tf && tn > 0.0 && tn < tb) {
    tb = tn;
    nb = -sign(d) * step(tmin.yzx, tmin.xyz) * step(tmin.zxy, tmin.xyz);
    mb = mat;
    gAux = 1.0;
  }
}

// a drowned utility pole with its crossarm
void dpole(vec3 ro, vec3 rd, vec2 c, vec2 lean, float top, float arm, inout float tb, inout vec3 nb, inout float mb) {
  cyl(ro, rd, c, lean, 0.16, top, 3.0, tb, nb, mb);
  if (arm > 0.0) {
    float ya = top - 0.75;
    box(ro, rd, vec3(c.x + lean.x * ya, ya, c.y + lean.y * ya), vec3(arm, 0.07, 0.06), 4.0, tb, nb, mb);
  }
}

const vec2 STOP = vec2(9.6, 46.0);
const vec3 STOP_N = vec3(-0.287, 0.038, -0.957);

void busStop(vec3 ro, vec3 rd, inout float tb, inout vec3 nb, inout float mb) {
  cyl(ro, rd, STOP, vec2(0.03, 0.0), 0.035, 1.78, 7.0, tb, nb, mb);
  vec3 N = STOP_N;
  float den = dot(rd, N);
  if (abs(den) < 1e-4) return;
  vec3 ax = normalize(cross(N, vec3(0.0, 1.0, 0.0)));
  vec3 ay = cross(ax, N);
  // the round sign
  vec3 C = vec3(STOP.x + 0.03 * 1.55, 1.55, STOP.y) - N * 0.05;
  float t = dot(C - ro, N) / den;
  if (t > 0.0 && t < tb) {
    vec3 X = ro + rd * t - C;
    vec2 q = vec2(dot(X, ax), dot(X, ay));
    if (length(q) < 0.34) { tb = t; nb = den < 0.0 ? N : -N; mb = 5.0; gUV = q / 0.34; gAux = den < 0.0 ? 1.0 : 0.0; }
  }
  // the timetable, half under the sea
  vec3 C2 = vec3(STOP.x + 0.03 * 0.3, 0.3, STOP.y) - N * 0.05;
  t = dot(C2 - ro, N) / den;
  if (t > 0.0 && t < tb) {
    vec3 X = ro + rd * t - C2;
    vec2 q = vec2(dot(X, ax), dot(X, ay));
    if (abs(q.x) < 0.24 && abs(q.y) < 0.34) { tb = t; nb = den < 0.0 ? N : -N; mb = 6.0; gUV = q; gAux = den < 0.0 ? 1.0 : 0.0; }
  }
}

const vec2 P1 = vec2(-4.5, 72.0);
const vec2 P1L = vec2(0.075, 0.03);
const vec2 P2 = vec2(-24.0, 140.0);
const vec2 P2L = vec2(-0.11, 0.02);
const vec2 P3 = vec2(-46.0, 235.0);
const vec2 P3L = vec2(0.05, -0.08);

float scene(vec3 ro, vec3 rd, float tMax, out vec3 nO, out float mat) {
  float tb = tMax;
  nO = vec3(0.0, 1.0, 0.0);
  mat = 0.0;
  // bounding slab for the whole town
  vec3 bc = vec3(-22.0, 0.0, 140.0), bh = vec3(52.0, 12.5, 106.0);
  vec3 o = ro - bc;
  vec3 d = vec3(abs(rd.x) < 1e-6 ? 1e-6 : rd.x, abs(rd.y) < 1e-6 ? 1e-6 : rd.y, abs(rd.z) < 1e-6 ? 1e-6 : rd.z);
  vec3 t1 = (-bh - o) / d, t2 = (bh - o) / d;
  vec3 mn = min(t1, t2), mx = max(t1, t2);
  float tn = max(max(mn.x, mn.y), mn.z), tf = min(min(mx.x, mx.y), mx.z);
  if (tn > tf || tf < 0.0 || tn > tMax) return tMax;

  roof(ro, rd, vec2(-15.0, 58.0), 1.42, 5.5, 3.6, -0.4, 2.0, 0.0, tb, nO, mat);
  roof(ro, rd, vec2(-31.0, 86.0), 1.05, 4.4, 3.4, -0.7, 1.9, 1.0, tb, nO, mat);
  roof(ro, rd, vec2(5.0, 100.0), 1.62, 4.6, 3.2, -1.2, 1.1, 2.0, tb, nO, mat);
  roof(ro, rd, vec2(2.0, 150.0), 1.3, 6.0, 4.2, 0.6, 3.1, 3.0, tb, nO, mat);
  roof(ro, rd, vec2(-50.0, 150.0), 0.5, 5.0, 3.8, -2.2, -0.5, 4.0, tb, nO, mat);
  roof(ro, rd, vec2(14.0, 66.0), 1.75, 4.0, 3.2, -1.9, -0.25, 5.0, tb, nO, mat);
  roof(ro, rd, vec2(-26.0, 228.0), 1.5, 5.5, 4.0, -0.4, 1.7, 6.0, tb, nO, mat);
  roof(ro, rd, vec2(-48.0, 112.0), 1.35, 6.0, 4.4, -0.5, 2.1, 7.0, tb, nO, mat);
  roof(ro, rd, vec2(-9.0, 192.0), 0.95, 5.0, 3.6, -0.8, 1.6, 1.0, tb, nO, mat);
  roof(ro, rd, vec2(19.0, 128.0), 1.52, 4.4, 3.3, -0.8, 1.1, 4.0, tb, nO, mat);
  roof(ro, rd, vec2(-38.0, 200.0), 1.66, 4.8, 3.5, -1.5, 0.3, 5.0, tb, nO, mat);
  dpole(ro, rd, P1, P1L, 7.2, 0.9, tb, nO, mat);
  dpole(ro, rd, P2, P2L, 4.2, 0.8, tb, nO, mat);
  dpole(ro, rd, P3, P3L, 2.1, 0.0, tb, nO, mat);
  busStop(ro, rd, tb, nO, mat);
  return tb;
}

float wireSeg(vec3 ro, vec3 rd, vec3 A, vec3 B, float sag, float r, float pixA, float tMax) {
  vec3 ab = B - A;
  vec3 w0 = ro - A;
  float b = dot(rd, ab), cc = dot(ab, ab), d = dot(rd, w0), e = dot(ab, w0);
  float den = cc - b * b;
  float sc = clamp((e - b * d) / max(den, 1e-6), 0.0, 1.0);
  vec3 Pq = A + ab * sc - vec3(0.0, sag * 4.0 * sc * (1.0 - sc), 0.0);
  float t = dot(Pq - ro, rd);
  if (t <= 0.0 || t > tMax) return 0.0;
  // distance to the curve's local tangent line, not to one point on it
  vec3 T = ab - vec3(0.0, sag * 4.0 * (1.0 - 2.0 * sc), 0.0);
  vec3 nx = cross(rd, T);
  float nl = length(nx);
  float dist = nl > 1e-5 ? abs(dot(Pq - ro, nx / nl)) : length(Pq - ro - rd * t);
  if (sc <= 0.0 || sc >= 1.0) dist = length(Pq - ro - rd * t);
  float fp = t * pixA;
  return min(1.0, 2.0 * r / fp) * clamp(1.0 - max(dist - r, 0.0) / fp, 0.0, 1.0);
}

vec3 armEnd(vec2 c, vec2 lean, float top, float side) {
  float ya = top - 0.68;
  return vec3(c.x + lean.x * ya + side, ya, c.y + lean.y * ya);
}

// the lines still run from the living shore out to the sunken poles
void wires(vec3 ro, vec3 rd, float pixA, float tMax, float refl, inout vec3 c) {
  float pa = pixA * (1.0 + 2.0 * refl);
  vec2 lp = S0 + DR * (2.0 * POLE_SP) + NR * POLE_V;
  vec3 landTop = vec3(lp.x - 0.8, LAND_H + POLE_H - 1.0, lp.y);
  float cov = 0.0;
  cov = max(cov, wireSeg(ro, rd, landTop, armEnd(P1, P1L, 7.2, 0.85), 1.1, 0.014, pa, tMax));
  cov = max(cov, wireSeg(ro, rd, armEnd(P1, P1L, 7.2, -0.85), armEnd(P2, P2L, 4.2, 0.75), 0.9, 0.014, pa, tMax));
  cov = max(cov, wireSeg(ro, rd, armEnd(P2, P2L, 4.2, -0.75), vec3(P3.x + 0.1, 2.0, P3.y), 0.6, 0.014, pa, tMax));
  cov = max(cov, wireSeg(ro, rd, armEnd(P1, P1L, 7.2, 0.0), vec3(-1.2, -0.3, 63.0), 1.6, 0.012, pa, tMax));
  if (cov <= 0.0) return;
  float glint = exp(-acos(clamp(dot(rd, gSd), -1.0, 1.0)) * 16.0) * gSunVis;
  vec3 wc = mix(lin(vec3(0.07, 0.06, 0.07)), gSunC * 1.5, glint);
  c = mix(c, wc, cov);
}
`;
