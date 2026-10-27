// Draws one frame of the ride: the car, what is outside it, the glass between, the light.
import { program, setU, m4, Builder, uploadMesh, addInstances, texFromCanvas, lin, canvas2d, MAT } from './gl.js';
import * as SH from './shaders.js';
import { L, makeTextures, buildStatic, buildStrap, buildFan, buildButton, buildCan, buildUmbrella, buildBook, buildYou, buildDoorLeaves, windowMaskData } from './interior.js';
import { THEMES, TUNNEL } from './themes.js';
import { Outside, PLAT } from './outside.js';

const BEAM_FS = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUV; in vec4 vCol; in vec4 vMat;
uniform float uExpoS;
out vec4 frag;
void main() {
  vec2 q = abs(vUV * 2.0 - 1.0);
  float edge = smoothstep(1.0, 0.55, q.x) * smoothstep(1.0, 0.5, q.y);
  vec3 o = vCol.rgb * vCol.a * edge;
  o = 1.0 - exp(-o * uExpoS);
  frag = vec4(pow(o, vec3(1.0 / 2.2)), 1.0);
}`;

function quadMesh(gl, w, h, { flipU = false } = {}) {
  const b = new Builder();
  const u0 = flipU ? 1 : 0, u1 = flipU ? 0 : 1;
  b.quad([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], [0, 0, 1],
    [[u0, 1], [u1, 1], [u1, 0], [u0, 0]], [1, 1, 1, 1], [-1, MAT.PAINT, 1, 0]);
  return b.upload(gl);
}

const V3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
const mixA = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lerp = (a, b, t) => a + (b - a) * t;

export class Scene {
  constructor(gl, opts) {
    this.gl = gl;
    this.opts = opts;
    const P = (this.P = {
      int: program(gl, SH.INT_VS, SH.INT_FS, 'interior'),
      led: program(gl, SH.INT_VS, SH.LED_FS, 'led'),
      glass: program(gl, SH.INT_VS, SH.GLASS_FS, 'glass'),
      beam: program(gl, SH.INT_VS, BEAM_FS, 'beam'),
      obj: program(gl, SH.OUT_VS, SH.OBJ_FS, 'obj'),
      ground: program(gl, SH.OUT_VS, SH.GROUND_FS, 'ground'),
      track: program(gl, SH.OUT_VS, SH.TRACK_FS, 'track'),
      strip: program(gl, SH.OUT_VS, SH.STRIP_FS, 'strip'),
      sky: program(gl, SH.SKY_VS, SH.SKY_FS, 'sky'),
      sprite: program(gl, SH.SPRITE_VS, SH.SPRITE_FS, 'sprite'),
    });
    this.arr = makeTextures(gl);
    const { b, g } = buildStatic();
    this.mStatic = b.upload(gl);
    {
      const far = [], near = [];
      for (let i = 0; i < g.v.length; i += 48) {
        const z = (g.v[i + 2] + g.v[i + 18] + g.v[i + 34]) / 3;
        const dst = z > 1.3 ? far : near;
        for (let k = 0; k < 48; k++) dst.push(g.v[i + k]);
      }
      this.mGlassFar = uploadMesh(gl, new Float32Array(far));
      this.mGlassNear = uploadMesh(gl, new Float32Array(near));
    }
    // the far centre door leaves move
    this.leaves = buildDoorLeaves(L.doors[1][0], L.doors[1][1], 1).map((lf) => ({ ...lf, mb: lf.b.upload(gl), mg: lf.g.upload(gl) }));
    this.strap = addInstances(gl, buildStrap().upload(gl), 128);
    const fan = buildFan();
    this.mFanGuard = fan.guard.upload(gl);
    this.mFanBlades = fan.blades.upload(gl);
    const btn = buildButton();
    this.mBtn = btn.housing.upload(gl);
    this.mDome = btn.dome.upload(gl);
    this.mCan = buildCan().upload(gl);
    this.mUmb = buildUmbrella().upload(gl);
    this.mBook = buildBook().upload(gl);
    this.mYou = buildYou().upload(gl);
    this.mLedBox = (() => { const bb = new Builder(); const { x, y, w, h } = L.led; bb.box(x - w / 2 - 0.05, y - h / 2 - 0.035, 1.3, x + w / 2 + 0.05, y + h / 2 + 0.035, L.W, lin('#121214'), [-1, MAT.PAINT, 0.9, 0]); return bb.upload(gl); })();
    this.mMapFrame = (() => {
      const bb = new Builder(); const { x, y, w, h } = L.routeMap; const c = lin('#b9bcbd'), m = [-1, MAT.CHROME, 0.9, 0];
      bb.box(x - w / 2 - 0.025, y - h / 2 - 0.025, 1.36, x + w / 2 + 0.025, y - h / 2, L.W, c, m);
      bb.box(x - w / 2 - 0.025, y + h / 2, 1.36, x + w / 2 + 0.025, y + h / 2 + 0.025, L.W, c, m);
      bb.box(x - w / 2 - 0.025, y - h / 2, 1.36, x - w / 2, y + h / 2, L.W, c, m);
      bb.box(x + w / 2, y - h / 2, 1.36, x + w / 2 + 0.025, y + h / 2, L.W, c, m);
      return bb.upload(gl);
    })();
    this.quads = {};
    this.texs = {};
    // window mask (sun & lamp light through the glass)
    this.winTex = gl.createTexture();
    this.setDoorMask(0);
    const white = canvas2d(2, 2); white.g.fillStyle = '#fff'; white.g.fillRect(0, 0, 2, 2);
    this.white = texFromCanvas(gl, white.c, { mips: false });
    this.out = new Outside(gl, P, opts);
    // sprites
    this.spriteMax = 1400;
    this.spriteData = new Float32Array(this.spriteMax * 12);
    this.spriteVAO = gl.createVertexArray();
    gl.bindVertexArray(this.spriteVAO);
    this.spriteBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);
    // beams (dynamic quads)
    this.beamData = new Float32Array(64 * 6 * 16);
    this.beamMesh = uploadMesh(gl, this.beamData, true);
    this.mats = { vp: new Float32Array(16), view: new Float32Array(16), proj: new Float32Array(16), world: m4.ident(), vpw: new Float32Array(16), inv: new Float32Array(16), tmp: new Float32Array(16), mirror: m4.mirrorZ(L.GLZ), vpm: new Float32Array(16) };
    this.ident = m4.ident();
    this.picks = [];
  }

  setDoorMask(open) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.winTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, windowMaskData(open));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // register / refresh a canvas texture
  tex(name, canvas, opts = {}) {
    const gl = this.gl;
    const t = this.texs[name];
    this.texs[name] = texFromCanvas(gl, canvas, { wrap: 'clamp', ...opts, tex: t || null });
    return this.texs[name];
  }
  quad(name, w, h, opts) { if (!this.quads[name]) this.quads[name] = quadMesh(this.gl, w, h, opts); return this.quads[name]; }

  // ── lighting mix ──────────────────────────────────────────────────────────
  lightFor(id) { return id === 'tunnel' ? TUNNEL.light : THEMES[id].light; }

  mixLight(F) {
    const a = this.lightFor(F.lightA), b = this.lightFor(F.lightB);
    const m = F.lightMix;
    const val = (k, def = 0) => lerp(a[k] ?? def, b[k] ?? def, m);
    const col = (k, s = 1) => mixA(lin(a[k], s), lin(b[k], s), m);
    const winCol = col('winCol');
    const flu = val('flu') * F.fluorMaster;
    const sunDirA = (THEMES[F.skyA] || THEMES.station).sky.sun, sunDirB = (THEMES[F.skyB] || THEMES.station).sky.sun;
    let sd = V3.norm(mixA(sunDirA, sunDirB, F.skyMix));
    // the car turns; the sun swings across the windows
    const ch = Math.cos(F.heading), sh = Math.sin(F.heading);
    sd = [ch * sd[0] + sh * sd[2], sd[1], -sh * sd[0] + ch * sd[2]];
    const tun = F.tunnel;
    const T = TUNNEL.light;
    const tl = (v, tv) => lerp(v, tv, tun);
    const tla = (v, tv) => mixA(v, tv, tun);
    const out = {
      ambLo: tla(col('ambLo'), lin(T.ambLo)),
      ambHi: tla(col('ambHi'), lin(T.ambHi)),
      winL: tla(winCol.map((c) => c * val('winL')), [0, 0, 0]),
      flu: [0.92 * flu, 0.97 * flu, 1.0 * flu].map((c) => c * (1 + tun * 0.1)),
      sunCol: tla(col('sunCol').map((c) => c * val('sun')), [0, 0, 0]),
      sunDir: sd,
      expo: tl(val('expo', 1), T.expo),
      lift: tla(mixA(a.lift, b.lift, m), T.lift),
      gam: tla(mixA(a.gam, b.gam, m), T.gam),
      gain: tla(mixA(a.gain, b.gain, m), T.gain),
      sat: tl(val('sat', 1), T.sat),
      outAmb: col('outAmb').map((c) => c * val('outAmbI')),
      outSun: col('outSun').map((c) => c * val('outSunI')),
    };
    out.envWin = out.winL.map((c, i) => c * 1.3 + out.flu[i] * 0.15);
    // the darker it is outside, the more the glass becomes a mirror
    const day = Math.min(1, (out.winL[0] + out.winL[1] + out.winL[2]) / 1.2);
    out.refl = Math.max(0.04, (1 - day) * 0.17);
    return out;
  }

  skyParams(id, F) {
    const s = THEMES[id].sky;
    const k = 0.9;
    return new Float32Array([
      ...lin(s.zen, k), s.stars || 0,
      ...lin(s.hor, k), s.horPow,
      ...s.sun, s.sunSize,
      ...lin(s.sunCol, (s.sunI || 0) * 1.6), s.glow,
      ...lin(s.cloud, k), s.cover,
      ...lin(s.shade, k), s.scale,
      s.mode || 0, (s.galaxy || 0) * (F.galaxy ?? 1), s.cityGlow || 0, s.voidRings || 0,
    ]);
  }

  // ── frame ─────────────────────────────────────────────────────────────────
  render(F) {
    const gl = this.gl, P = this.P, M = this.mats;
    const W = F.w, H = F.h;
    gl.viewport(0, 0, W, H);
    const aspect = W / H;
    m4.persp(F.tanV, aspect, 0.04, 14000, M.proj);
    const B = m4.basis(F.yaw, F.pitch, F.roll);
    this.basis = B;
    m4.view(F.eye, B, M.view);
    m4.mul(M.proj, M.view, M.vp);
    // the world outside rolls and pitches against the car body
    m4.trs(0, 0, 0, F.carRoll, 0, F.carPitch, 1, M.world);
    m4.mul(M.vp, M.world, M.vpw);
    const Lt = (this.lit = this.mixLight(F));
    const tGlobal = F.t;
    gl.clearColor(0, 0, 0, 1); gl.clearDepth(1); gl.clearStencil(0);
    gl.colorMask(true, true, true, true); gl.depthMask(true); gl.stencilMask(0xff);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST);

    // shared grade uniforms
    const grade = (p, expo = Lt.expo) => {
      setU(gl, p, 'uExpo', expo); setU(gl, p, 'uLift', Lt.lift); setU(gl, p, 'uGam', Lt.gam); setU(gl, p, 'uGain', Lt.gain);
      setU(gl, p, 'uSat', Lt.sat); setU(gl, p, 'uTime', tGlobal);
    };

    // ── 1. the car ──
    this.drawInterior(F, M.vp, F.eye, false);

    // ── 2. outside, opaque ──
    this.drawOutside(F, grade);

    // ── 3. interior translucent: umbrella, light shafts, dust, glows ──
    this.drawTranslucent(F, grade);

    // ── 4. glass: mark it, mirror the night car in it, then dust and rain ──
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.colorMask(false, false, false, false);
    gl.depthMask(false);
    const pi = P.int;
    gl.useProgram(pi.p);
    setU(gl, pi, 'uVP', M.vp); setU(gl, pi, 'uModel', this.ident); setU(gl, pi, 'uInst', 0);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    this.drawGlassGeom(F, pi, (side) => side > 0);
    gl.stencilFunc(gl.ALWAYS, 2, 0xff);
    this.drawGlassGeom(F, pi, (side) => side <= 0);
    gl.colorMask(true, true, true, true);
    if (Lt.refl > 0.04 && !F.noMirror) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.depthMask(true);
      gl.stencilFunc(gl.EQUAL, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      m4.mul(M.vp, M.mirror, M.vpm);
      const me = [F.eye[0], F.eye[1], 2 * L.GLZ - F.eye[2]];
      gl.colorMask(false, false, false, false);
      this.drawInterior(F, M.vpm, me, true, true);
      gl.colorMask(true, true, true, true);
      gl.depthFunc(gl.EQUAL);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.drawInterior(F, M.vpm, me, true, false);
      gl.depthFunc(gl.LEQUAL);
    }
    // the panes themselves
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const pg = P.glass;
    gl.useProgram(pg.p);
    grade(pg);
    setU(gl, pg, 'uVP', M.vp); setU(gl, pg, 'uModel', this.ident); setU(gl, pg, 'uInst', 0);
    setU(gl, pg, 'uEye', F.eye); setU(gl, pg, 'uWinL', Lt.winL); setU(gl, pg, 'uFlu', Lt.flu); setU(gl, pg, 'uEnvWin', Lt.envWin);
    setU(gl, pg, 'uRain', F.rain); setU(gl, pg, 'uSpeed', F.v); setU(gl, pg, 'uNight', Lt.refl);
    setU(gl, pg, 'uSunDir', Lt.sunDir); setU(gl, pg, 'uSunCol', Lt.sunCol);
    setU(gl, pg, 'uFakeRefl', Math.max(0, Lt.refl - 0.05) * 1.5);
    this.drawGlassGeom(F, pg, () => true);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }

  drawGlassGeom(F, p, sideFilter) {
    const gl = this.gl;
    if (sideFilter(1)) {
      setU(gl, p, 'uModel', this.ident);
      gl.bindVertexArray(this.mGlassFar.vao); gl.drawArrays(gl.TRIANGLES, 0, this.mGlassFar.count);
      for (const lf of this.leaves) {
        setU(gl, p, 'uModel', m4.trs(lf.dir * F.door * 0.43, 0, 0));
        gl.bindVertexArray(lf.mg.vao); gl.drawArrays(gl.TRIANGLES, 0, lf.mg.count);
      }
    }
    if (sideFilter(-1)) {
      setU(gl, p, 'uModel', this.ident);
      gl.bindVertexArray(this.mGlassNear.vao); gl.drawArrays(gl.TRIANGLES, 0, this.mGlassNear.count);
    }
    setU(gl, p, 'uModel', this.ident);
  }

  setIntUniforms(p, F, vp, eye, mirror) {
    const gl = this.gl, Lt = this.lit;
    setU(gl, p, 'uVP', vp); setU(gl, p, 'uModel', this.ident); setU(gl, p, 'uInst', 0);
    setU(gl, p, 'uExpo', Lt.expo); setU(gl, p, 'uLift', Lt.lift); setU(gl, p, 'uGam', Lt.gam); setU(gl, p, 'uGain', Lt.gain);
    setU(gl, p, 'uSat', Lt.sat); setU(gl, p, 'uTime', F.t);
    setU(gl, p, 'uEye', eye);
    setU(gl, p, 'uAmbLo', Lt.ambLo); setU(gl, p, 'uAmbHi', Lt.ambHi); setU(gl, p, 'uWinL', Lt.winL); setU(gl, p, 'uFlu', Lt.flu);
    setU(gl, p, 'uFlick', [F.flick.x, F.flick.val, 1, 0]);
    setU(gl, p, 'uSunDir', Lt.sunDir); setU(gl, p, 'uSunCol', Lt.sunCol);
    const occ = F.occ;
    setU(gl, p, 'uOccOn', occ ? 1 : 0);
    if (occ) setU(gl, p, 'uOccP', [occ.D, occ.W, occ.H, occ.offset]);
    setU(gl, p, 'uPoleP', F.pole ? [F.pole.D, F.pole.period, F.pole.offset, F.pole.top] : [0, 1, 0, 0]);
    setU(gl, p, 'uPL', F.pl); setU(gl, p, 'uPLc', F.plc);
    setU(gl, p, 'uIL', F.il); setU(gl, p, 'uILc', F.ilc);
    setU(gl, p, 'uWinX', [L.WX0, L.WX1, L.tubes[0], L.tubes[1]]);
    setU(gl, p, 'uEnvWin', Lt.envWin);
    setU(gl, p, 'uMirror', mirror ? 1 : 0);
    setU(gl, p, 'uReflA', Lt.refl);
    setU(gl, p, 'uGroundY', F.groundY);
    setU(gl, p, 'uTint', [1, 1, 1, 0]); setU(gl, p, 'uEmisCol', [1, 1, 1]); setU(gl, p, 'uMode', 0); setU(gl, p, 'uEmis', 1);
    setU(gl, p, 'uArr', 0); setU(gl, p, 'uTex', 1); setU(gl, p, 'uWin', 2); setU(gl, p, 'uOcc', 3);
  }

  bindIntTextures(F) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.arr);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.winTex);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, F.occ ? F.occ.tex : this.white);
  }

  drawInterior(F, vp, eye, mirror, depthOnly = false) {
    const gl = this.gl, P = this.P;
    const p = P.int;
    gl.useProgram(p.p);
    this.setIntUniforms(p, F, vp, eye, mirror);
    this.bindIntTextures(F);
    const draw = (mesh, model = this.ident) => { setU(gl, p, 'uModel', model); gl.bindVertexArray(mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, mesh.count); };
    draw(this.mStatic);
    // fans
    setU(gl, p, 'uEmisCol', [0, 0, 0]);
    for (let i = 0; i < L.fans.length; i++) {
      draw(this.mFanGuard, m4.trs(L.fans[i], L.CEIL, 0));
      draw(this.mFanBlades, m4.trs(L.fans[i], L.CEIL, 0, 0, F.fan + i * 0.7, 0));
    }
    // the far centre door
    for (const lf of this.leaves) draw(lf.mb, m4.trs(lf.dir * F.door * 0.43, 0, 0));
    draw(this.mMapFrame);
    draw(this.mLedBox);
    // straps
    if (F.strapCount) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.strap.ibuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.straps.subarray(0, F.strapCount * 8));
      setU(gl, p, 'uInst', 1); setU(gl, p, 'uModel', this.ident);
      gl.bindVertexArray(this.strap.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, this.strap.count, F.strapCount);
      setU(gl, p, 'uInst', 0);
    }
    // the stop button
    const bm = F.buttonM;
    draw(this.mBtn, bm);
    setU(gl, p, 'uEmisCol', [1.0, 0.25, 0.12]);
    setU(gl, p, 'uTint', [1, 1, 1, F.button.lit * 0.0]);
    draw(this.mDome, m4.mul(bm, m4.trs(0, -0.022, 0.012 - F.button.press * 0.006)));
    setU(gl, p, 'uTint', [1, 1, 1, 0]); setU(gl, p, 'uEmisCol', [1, 1, 1]);
    // the can, the book
    gl.activeTexture(gl.TEXTURE1);
    setU(gl, p, 'uMode', 1);
    gl.bindTexture(gl.TEXTURE_2D, this.texs.can);
    draw(this.mCan, F.canM);
    gl.bindTexture(gl.TEXTURE_2D, this.white);
    setU(gl, p, 'uMode', 0);
    draw(this.mBook, F.bookM);
    // decals
    for (const d of F.decals) {
      const tex = this.texs[d.tex];
      if (!tex) continue;
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex);
      setU(gl, p, 'uMode', d.mode || 1);
      setU(gl, p, 'uEmis', d.emis || 1);
      setU(gl, p, 'uTint', d.tint || [1, 1, 1, 0]);
      setU(gl, p, 'uEmisCol', d.emisCol || [1, 1, 1]);
      draw(this.quad(d.q, d.w, d.h, d.qopts), d.m);
    }
    setU(gl, p, 'uMode', 0); setU(gl, p, 'uTint', [1, 1, 1, 0]); setU(gl, p, 'uEmisCol', [1, 1, 1]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.white);
    if (mirror) draw(this.mYou);
    // the LED board
    const pl = P.led;
    gl.useProgram(pl.p);
    setU(gl, pl, 'uVP', vp); setU(gl, pl, 'uInst', 0);
    setU(gl, pl, 'uExpo', this.lit.expo); setU(gl, pl, 'uLift', this.lit.lift); setU(gl, pl, 'uGam', this.lit.gam); setU(gl, pl, 'uGain', this.lit.gain); setU(gl, pl, 'uSat', this.lit.sat); setU(gl, pl, 'uTime', F.t);
    setU(gl, pl, 'uMirror', mirror ? 1 : 0); setU(gl, pl, 'uReflA', this.lit.refl);
    for (const led of F.leds) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, led.tex);
      setU(gl, pl, 'uTex', 1);
      setU(gl, pl, 'uGrid', led.grid); setU(gl, pl, 'uScroll', led.scroll); setU(gl, pl, 'uTexW', led.texW); setU(gl, pl, 'uBright', led.bright);
      setU(gl, pl, 'uModel', led.m);
      const q = this.quad(led.q, led.w, led.h);
      gl.bindVertexArray(q.vao); gl.drawArrays(gl.TRIANGLES, 0, q.count);
    }
    gl.useProgram(p.p);
  }

  drawOutside(F, grade) {
    const gl = this.gl, P = this.P, M = this.mats, Lt = this.lit;
    const th = THEMES[F.vis] || THEMES.station;
    const fog = th.fog;
    const fogCol = lin(fog.col);
    const fogDen = fog.den * (1 + (F.fogBoost || 0) * 30);
    const fogFinal = F.fogBoost ? mixA(fogCol, lin(F.fogBoostCol || fog.col), Math.min(1, F.fogBoost)) : fogCol;
    const common = (p) => {
      grade(p);
      setU(gl, p, 'uVP', M.vp); setU(gl, p, 'uWorld', M.world); setU(gl, p, 'uModel', this.ident);
      setU(gl, p, 'uScroll', F.s); setU(gl, p, 'uCurv', F.curvBend); setU(gl, p, 'uRise', F.rise);
      setU(gl, p, 'uEye', F.eye); setU(gl, p, 'uOutAmb', Lt.outAmb); setU(gl, p, 'uOutSun', Lt.outSun); setU(gl, p, 'uSunDir', Lt.sunDir);
      setU(gl, p, 'uFogCol', fogFinal); setU(gl, p, 'uFogDen', fogDen); setU(gl, p, 'uFogFloor', F.fogBoost ? Math.min(1, F.fogBoost) * 0.98 : 0);
      setU(gl, p, 'uKind', 0);
    };
    const draw = (mesh) => { gl.bindVertexArray(mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, mesh.count); };
    const groundOn = F.groundFade > 0.01 && th.ground.type !== 0;
    // ground
    if (groundOn) {
      const p = P.ground;
      gl.useProgram(p.p);
      common(p);
      setU(gl, p, 'uKind', 2);
      setU(gl, p, 'uModel', m4.trs(0, F.groundY, 0));
      setU(gl, p, 'uGround', th.ground.type);
      setU(gl, p, 'uG1', lin(th.ground.g1)); setU(gl, p, 'uG2', lin(th.ground.g2)); setU(gl, p, 'uG3', lin(th.ground.g3));
      setU(gl, p, 'uSkyRefl', lin(th.ground.refl, 0.9).map((c, i) => c * (0.3 + Lt.outAmb[i] * 0.9)));
      setU(gl, p, 'uSunCol', Lt.sunCol);
      setU(gl, p, 'uFade', 1);
      draw(this.out.ground);
    }
    // trackbed
    if (F.trackOn) {
      const p = P.track;
      gl.useProgram(p.p);
      common(p);
      setU(gl, p, 'uKind', 2);
      setU(gl, p, 'uRailGlint', lin(th.track.glint).map((c) => c * (0.5 + Lt.outAmb[1] * 0.8 + F.trackGlow)));
      setU(gl, p, 'uBallast', lin(th.track.ballast));
      setU(gl, p, 'uFade', 1);
      draw(this.out.track);
    }
    // meshes: poles, wires, tunnels, platform, crossings
    const po = P.obj;
    gl.useProgram(po.p);
    common(po);
    setU(gl, po, 'uUseTex', 0); setU(gl, po, 'uProc', 0);
    setU(gl, po, 'uStrobe', F.strobe.amt); setU(gl, po, 'uStrobeCol', F.strobe.col);
    setU(gl, po, 'uOL', F.ol); setU(gl, po, 'uOLc', F.olc);
    setU(gl, po, 'uTex', 1); setU(gl, po, 'uGraf', 4);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.out.graffiti);
    const dm = (mesh, model) => { setU(gl, po, 'uModel', model); draw(mesh); };
    if (F.poles) {
      const pm = this.out.poles[F.poles.style];
      const wm = this.out.wires[F.vis];
      for (const ps of F.poles.list) {
        if (pm) dm(pm, m4.trs(ps.x, F.groundY, ps.z, ps.lean || 0, 0, 0));
        if (wm && ps.wire) dm(wm, m4.trs(ps.x, F.groundY, ps.z));
      }
    }
    // tunnels
    for (const tn of F.tunnels) {
      setU(gl, po, 'uProc', tn.kind === 'graffiti' ? 2 : 1);
      setU(gl, po, 'uLamp', [tn.kind === 'graffiti' ? 14 : 22, tn.lampOff || 0, tn.kind === 'graffiti' ? 0.6 : 1.0, 0]);
      setU(gl, po, 'uLampCol', tn.kind === 'graffiti' ? lin('#e8f0ff') : lin(TUNNEL.lamp));
      for (let x = tn.x0; x < tn.x1; x += 50) {
        if (x + 50 < -300 || x > 2500) continue;
        dm(this.out.tube, m4.trs(x, 0, 0));
      }
      setU(gl, po, 'uProc', 0);
      const portal = this.out.portal(tn.hill || '#4d6b43');
      if (tn.x0 > -300 && tn.x0 < 3000 && tn.portalIn !== false) dm(portal, m4.trs(tn.x0, 0, 0));
      if (tn.x1 > -300 && tn.x1 < 3000 && tn.portalOut !== false) dm(portal, m4.trs(tn.x1, 0, 0, 0, Math.PI, 0));
    }
    setU(gl, po, 'uProc', 0);
    // platform
    if (F.station) {
      const st = F.station;
      dm(this.out.platform(st.style, F.groundY - 0.0), m4.trs(st.x, 0, 0));
      const sg = st.sign;
      if (sg) {
        setU(gl, po, 'uUseTex', 1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sg.tex);
        dm(sg.mesh, m4.trs(st.x, 0, 0));
        setU(gl, po, 'uUseTex', 0);
      }
    }
    // crossings
    for (const c of F.crossings) {
      dm(this.out.cross, m4.trs(c.x, 0, 3.4));
      dm(this.out.cross, m4.trs(c.x + 9, 0, -3.4, 0, Math.PI, 0));
    }
    // sky (fills whatever the windows show that nothing else covered)
    const ps = P.sky;
    gl.useProgram(ps.p);
    grade(ps);
    m4.invert(M.vpw, M.inv);
    setU(gl, ps, 'uInvVP', M.inv);
    setU(gl, ps, 'uEyeW', F.eye);
    setU(gl, ps, 'uSA', this.skyParams(F.skyA, F));
    setU(gl, ps, 'uSB', this.skyParams(F.skyB, F));
    setU(gl, ps, 'uMix', F.skyMix);
    setU(gl, ps, 'uHeading', F.heading);
    gl.depthMask(false);
    gl.bindVertexArray(null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // painted strips, far to near
    if (F.stripFade > 0.001) {
      const entry = this.out.themes[F.vis];
      if (entry && entry.strips.length) {
        const pst = P.strip;
        gl.useProgram(pst.p);
        common(pst);
        setU(gl, pst, 'uKind', 1);
        setU(gl, pst, 'uTex', 1); setU(gl, pst, 'uEm', 5);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const list = entry.strips.slice().sort((a, b) => b.spec.D - a.spec.D);
        for (const sp of list) {
          const s = sp.spec;
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sp.tex);
          gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, sp.em || this.out.black);
          setU(gl, pst, 'uEmGain', s.emis ? 1.5 * (F.neonGain ?? 1) : 0);
          setU(gl, pst, 'uBlink', s.kind === 'neon' || s.kind === 'fronts' ? 0.6 : 0);
          setU(gl, pst, 'uFade', F.stripFade);
          const Lh = Math.min(9000, Math.max(320, s.D * 4.5));
          const sink = s.D * 0.03;
          for (const side of [1, -1]) {
            setU(gl, pst, 'uStrip', [side * s.D, s.H + sink, s.base - sink + (F.stripY || 0), s.W]);
            setU(gl, pst, 'uStripX', [Lh, side > 0 ? 0 : 0.37, side, 0]);
            draw(this.out.strip);
          }
        }
        gl.disable(gl.BLEND);
      }
    }
    gl.depthMask(true);
  }

  // sprites: glows, particles; beams; umbrella
  drawTranslucent(F, grade) {
    const gl = this.gl, P = this.P, M = this.mats;
    // umbrella (vinyl, see-through)
    const p = P.int;
    gl.useProgram(p.p);
    this.setIntUniforms(p, F, M.vp, F.eye, false);
    this.bindIntTextures(F);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    setU(gl, p, 'uMode', 3);
    setU(gl, p, 'uModel', F.umbM);
    gl.bindVertexArray(this.mUmb.vao); gl.drawArrays(gl.TRIANGLES, 0, this.mUmb.count);
    setU(gl, p, 'uMode', 0);
    gl.blendFunc(gl.ONE, gl.ONE);
    // light shafts
    if (F.beamCount) {
      const pb = P.beam;
      gl.useProgram(pb.p);
      setU(gl, pb, 'uVP', M.vp); setU(gl, pb, 'uModel', this.ident); setU(gl, pb, 'uInst', 0); setU(gl, pb, 'uExpoS', 1.0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.beamMesh.buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.beams.subarray(0, F.beamCount * 6 * 16));
      gl.bindVertexArray(this.beamMesh.vao);
      gl.drawArrays(gl.TRIANGLES, 0, F.beamCount * 6);
    }
    // sprites (interior + exterior share one buffer; exterior ones are pre-transformed)
    if (F.spriteCount) {
      const ps = P.sprite;
      gl.useProgram(ps.p);
      setU(gl, ps, 'uVP', M.vp); setU(gl, ps, 'uView', M.view); setU(gl, ps, 'uWorldS', this.ident);
      setU(gl, ps, 'uScaleY', 1); setU(gl, ps, 'uExpoS', 1.0); setU(gl, ps, 'uTime', F.t);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.sprites.subarray(0, F.spriteCount * 12));
      gl.bindVertexArray(this.spriteVAO);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, F.spriteCount);
    }
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }

  // ── picking ───────────────────────────────────────────────────────────────
  ray(sx, sy, W, H) {
    const M = this.mats;
    m4.invert(M.vp, M.tmp);
    const nx = (sx / W) * 2 - 1, ny = 1 - (sy / H) * 2;
    const a = m4.xform(M.tmp, [nx, ny, -1]), b = m4.xform(M.tmp, [nx, ny, 1]);
    return { o: a.slice(0, 3), d: V3.norm(V3.sub(b.slice(0, 3), a.slice(0, 3))) };
  }
  // quads: [{id, m (model matrix), w, h}] in quad-local XY plane
  pick(sx, sy, W, H, quads) {
    const { o, d } = this.ray(sx, sy, W, H);
    let best = null;
    for (const q of quads) {
      const m = q.m;
      const c = [m[12], m[13], m[14]];
      const ux = [m[0], m[1], m[2]], uy = [m[4], m[5], m[6]], n = V3.norm([m[8], m[9], m[10]]);
      const den = V3.dot(d, n);
      if (Math.abs(den) < 1e-5) continue;
      const t = V3.dot(V3.sub(c, o), n) / den;
      if (t <= 0.05) continue;
      const hit = V3.add(o, V3.mul(d, t));
      const rel = V3.sub(hit, c);
      const lx = V3.dot(rel, ux) / V3.dot(ux, ux), ly = V3.dot(rel, uy) / V3.dot(uy, uy);
      const hw = (q.w / 2) * (q.pad || 1), hh = (q.h / 2) * (q.pad || 1);
      if (Math.abs(lx) <= hw && Math.abs(ly) <= hh && (!best || t < best.t)) best = { id: q.id, t, u: lx / q.w + 0.5, v: 0.5 - ly / q.h, q };
    }
    return best;
  }
  // world point → screen px
  project(p, W, H) {
    const c = m4.xform(this.mats.vp, p);
    if (c[3] <= 0) return null;
    return [(c[0] * 0.5 + 0.5) * W, (1 - (c[1] * 0.5 + 0.5)) * H, c[2]];
  }

  destroy() { this.out.destroy(); }
}
