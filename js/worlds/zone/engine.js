// Renderer: raymarched place (writes depth) → raster layer (grass, gauze, decals, fire,
// particles, rain) into a small MSAA target → film post to the full-resolution canvas.

import { compile, finish, uniforms, makeTarget, freeTarget, resolveTarget, canvasTexture, DynBuf } from './gl.js';
import {
  sceneFS, FULL_VS, GRASS_VS, GRASS_FS, TRI_VS, TRI_FS, PT_VS, PT_FS, DEC_VS, DEC_FS,
  FIRE_VS, FIRE_FS, RAIN_VS, RAIN_FS, POST_FS,
} from './shaders.js';

const NEAR = 0.04, FAR = 450;

export function basis(yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return {
    f: [sy * cp, sp, cy * cp],
    r: [cy, 0, -sy],
    u: [-sy * sp, cp, -cy * sp],
  };
}

export class Engine {
  constructor(root, ctx) {
    this.ctx = ctx;
    const cv = (this.canvas = document.createElement('canvas'));
    cv.className = 'zn-gl';
    root.appendChild(cv);
    const gl = (this.gl = cv.getContext('webgl2', {
      antialias: false, alpha: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance',
    }));
    if (!gl) { this.ok = false; return; }
    this.ok = true;
    this.par = gl.getExtension('KHR_parallel_shader_compile');
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 1);
    this.scenes = {};
    this.tex = {};
    this.grass = {};
    this.scale = 0.62;
    this.maxPx = 1.05e6;
    this.minPx = 0.22e6;
    this._dtAcc = 0; this._dtN = 0; this._good = 0;

    this.post = compile(gl, FULL_VS, POST_FS, 'post');
    this.pGrass = compile(gl, GRASS_VS, GRASS_FS, 'grass');
    this.pTri = compile(gl, TRI_VS, TRI_FS, 'tri');
    this.pPt = compile(gl, PT_VS, PT_FS, 'points');
    this.pDec = compile(gl, DEC_VS, DEC_FS, 'decal');
    this.pFire = compile(gl, FIRE_VS, FIRE_FS, 'fire');
    this.pRain = compile(gl, RAIN_VS, RAIN_FS, 'rain');
    this.emptyVao = gl.createVertexArray();

    this.tris = new DynBuf(gl, [[0, 3], [1, 4]], 9000);
    this.ptsAdd = new DynBuf(gl, [[0, 3], [1, 1], [2, 4], [3, 1]], 5000);
    this.ptsAlpha = new DynBuf(gl, [[0, 3], [1, 1], [2, 4], [3, 1]], 3000);
    this.decals = new DynBuf(gl, [[0, 3], [1, 2], [2, 3]], 900);
    this.fires = new DynBuf(gl, [[0, 3], [1, 2], [2, 1]], 120);

    // grass blade geometry (triangle strip)
    this.bladeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bladeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, -1, 0.34, 1, 0.34, -1, 0.68, 1, 0.68, 0, 1]), gl.STATIC_DRAW);

    // rain instances
    this.rainN = 2600;
    this.rainVao = gl.createVertexArray();
    gl.bindVertexArray(this.rainVao);
    const eb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, eb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 4, 0);
    const sd = new Float32Array(this.rainN * 3);
    for (let i = 0; i < sd.length; i++) sd[i] = Math.random();
    const sb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, sd, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    this._bufs = [eb, sb];

    this.resize(ctx.w, ctx.h);

    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; }, { signal: ctx.signal });
  }

  ready(p) { return finish(this.gl, p, this.par); }
  rasterReady() {
    return [this.post, this.pGrass, this.pTri, this.pPt, this.pDec, this.pFire, this.pRain].every((p) => this.ready(p));
  }

  prepare(id) {
    if (!this.ok) return;
    if (!this.scenes[id]) this.scenes[id] = compile(this.gl, FULL_VS, sceneFS(id), 'scene:' + id);
  }
  isReady(id) {
    if (!this.ok) return false;
    this.prepare(id);
    return this.ready(this.scenes[id]);
  }
  allReady(id) { return this.isReady(id) && this.rasterReady(); }
  sceneFailed(id) { const p = this.scenes[id]; return p && p.ready && !p.ok; }

  setTex(key, canvas) {
    if (!this.ok) return;
    if (this.tex[key]) this.gl.deleteTexture(this.tex[key]);
    this.tex[key] = canvasTexture(this.gl, canvas);
  }

  setGrass(id, data) {
    const gl = this.gl;
    if (!this.ok || this.grass[id]) return;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bladeBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    this.grass[id] = { vao, buf: ib, n: data.length / 5 };
  }

  resize(w, h) {
    if (!this.ok) return;
    this.w = w; this.h = h;
    const dpr = Math.min(2, this.ctx.dpr || 1);
    this.canvas.width = Math.max(2, Math.round(w * dpr));
    this.canvas.height = Math.max(2, Math.round(h * dpr));
    this._target();
  }

  _target() {
    const gl = this.gl;
    let sw = Math.round(this.w * this.scale), sh = Math.round(this.h * this.scale);
    const px = sw * sh;
    if (px > this.maxPx) { const k = Math.sqrt(this.maxPx / px); sw = Math.round(sw * k); sh = Math.round(sh * k); }
    if (px < this.minPx) { const k = Math.sqrt(this.minPx / px); sw = Math.round(sw * k); sh = Math.round(sh * k); }
    sw = Math.max(64, Math.min(sw, this.canvas.width));
    sh = Math.max(64, Math.min(sh, this.canvas.height));
    if (this.tgt && this.tgt.w === sw && this.tgt.h === sh) return;
    freeTarget(gl, this.tgt);
    this.tgt = makeTarget(gl, sw, sh, this.samples);
    if (!this.tgt.ok && this.samples > 1) {
      freeTarget(gl, this.tgt);
      this.samples = 1;
      this.tgt = makeTarget(gl, sw, sh, 1);
    }
  }

  // keep 60 fps: watch frame times and nudge the internal resolution
  adapt(dt) {
    if (dt > 0.25) return;
    this._dtAcc += dt; this._dtN++;
    if (this._dtN < 45) return;
    const avg = this._dtAcc / this._dtN;
    this._dtAcc = 0; this._dtN = 0;
    if (avg > 0.0205 && this.scale > 0.3) { this.scale *= 0.86; this._good = 0; this._target(); }
    else if (avg < 0.0175) {
      if (++this._good > 4 && this.scale < 0.8) { this.scale *= 1.07; this._good = 0; this._target(); }
    } else this._good = 0;
  }

  camUniforms(cam) {
    const b = basis(cam.yaw, cam.pitch);
    // optional roll
    if (cam.roll) {
      const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
      const r = b.r, u = b.u;
      b.r = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s];
      b.u = [u[0] * c - r[0] * s, u[1] * c - r[1] * s, u[2] * c - r[2] * s];
    }
    this.cam = { pos: cam.pos, ...b, focal: 1 / Math.tan((cam.vfov * Math.PI) / 360), aspect: this.w / this.h };
    return {
      uCam: cam.pos, uF: b.f, uR: b.r, uU: b.u,
      uFocal: this.cam.focal, uAspect: this.cam.aspect, uNear: NEAR, uFar: FAR,
    };
  }

  // world → CSS pixel (or null when behind the camera)
  project(p) {
    const c = this.cam;
    if (!c) return null;
    const v = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
    const z = v[0] * c.f[0] + v[1] * c.f[1] + v[2] * c.f[2];
    if (z < 0.05) return null;
    const x = (v[0] * c.r[0] + v[1] * c.r[1] + v[2] * c.r[2]) * c.focal / (c.aspect * z);
    const y = (v[0] * c.u[0] + v[1] * c.u[1] + v[2] * c.u[2]) * c.focal / z;
    return { x: (x * 0.5 + 0.5) * this.w, y: (0.5 - y * 0.5) * this.h, z };
  }
  // CSS pixel → world ray
  ray(px, py) {
    const c = this.cam;
    const nx = (px / this.w) * 2 - 1, ny = 1 - (py / this.h) * 2;
    const d = [0, 1, 2].map((i) => c.f[i] * c.focal + c.r[i] * nx * c.aspect + c.u[i] * ny);
    const l = Math.hypot(d[0], d[1], d[2]);
    return { o: c.pos, d: d.map((x) => x / l) };
  }

  render(F) {
    const gl = this.gl;
    if (!this.ok || this.lost) return;
    this.prepare(F.scene);
    const prog = this.scenes[F.scene];
    if (!prog || !this.ready(prog) || !prog.ok || !this.rasterReady()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    const T = this.tgt;
    const cam = this.camUniforms(F.cam);
    const fogU = { uFogCol: F.fog, uFogDen: F.fogDen, uFogK: F.fogK };

    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
    gl.viewport(0, 0, T.w, T.h);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    // 1. the place
    gl.useProgram(prog.p);
    uniforms(gl, prog, {
      uRes: [T.w, T.h], uTime: F.time, ...cam, ...fogU,
      uAnom: F.anom, uFire: F.fire, uP0: F.p0, uP1: F.p1, uRip: F.rip, uRain: F.rainRings,
    });
    if (prog.uni.uTex0 != null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[F.tex] || null);
      gl.uniform1i(prog.uni.uTex0, 0);
    }
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.depthFunc(gl.LEQUAL);

    // 2. grass
    const gr = this.grass[F.scene];
    if (gr && F.grass) {
      const p = this.pGrass;
      gl.useProgram(p.p);
      uniforms(gl, p, { ...cam, ...fogU, uTime: F.time, uWind: F.grass.wind, uAnom: F.anom, uPush: F.grass.push, uGrassA: F.grass.A, uGrassB: F.grass.B, uLight: F.grass.light });
      gl.bindVertexArray(gr.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 7, gr.n);
    }

    // 3. gauze, nuts, birds
    if (this.tris.n) {
      const p = this.pTri;
      gl.useProgram(p.p);
      uniforms(gl, p, { ...cam, ...fogU });
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.tris.upload();
      gl.bindVertexArray(this.tris.vao);
      gl.drawArrays(gl.TRIANGLES, 0, this.tris.n);
    }

    // additive layers below don't write depth
    gl.depthMask(false);
    gl.enable(gl.BLEND);

    if (this.decals.n) {
      const p = this.pDec;
      gl.useProgram(p.p);
      uniforms(gl, p, { ...cam, ...fogU, uTime: F.time });
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.scrib || null);
      gl.uniform1i(p.uni.uScrib, 1);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.decals.upload();
      gl.bindVertexArray(this.decals.vao);
      gl.drawArrays(gl.TRIANGLES, 0, this.decals.n);
    }

    if (this.fires.n) {
      const p = this.pFire;
      gl.useProgram(p.p);
      uniforms(gl, p, { ...cam, ...fogU, uTime: F.time, uFireA: F.fireA });
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.fires.upload();
      gl.bindVertexArray(this.fires.vao);
      gl.drawArrays(gl.TRIANGLES, 0, this.fires.n);
    }

    const pts = (buf, add) => {
      if (!buf.n) return;
      const p = this.pPt;
      gl.useProgram(p.p);
      uniforms(gl, p, { ...cam, ...fogU, uViewH: T.h });
      if (add) gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      buf.upload();
      gl.bindVertexArray(buf.vao);
      gl.drawArrays(gl.POINTS, 0, buf.n);
    };
    pts(this.ptsAlpha, false);
    pts(this.ptsAdd, true);

    if (F.rain) {
      const p = this.pRain;
      gl.useProgram(p.p);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.rainVao);
      for (const R of F.rain) {
        if (!(R.amt > 0)) continue;
        uniforms(gl, p, { ...cam, ...fogU, uTime: F.time, uBoxC: R.c, uBoxS: R.s, uVel: R.vel, uFollow: R.follow, uRainA: R.amt, uRainC: R.col });
        gl.drawArraysInstanced(gl.LINES, 0, 2, Math.min(this.rainN, R.n || this.rainN));
      }
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(null);

    resolveTarget(gl, T);

    // 4. film
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const P = F.post;
    gl.useProgram(this.post.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, T.tex);
    gl.uniform1i(this.post.uni.uScene, 0);
    uniforms(gl, this.post, {
      uRes: [this.canvas.width, this.canvas.height], uSRes: [T.w, T.h], uTime: F.time,
      uSepia: P.sepia, uFade: P.fade, uWhite: P.white, uPull: P.pull, uPullC: P.pullC,
      uGrain: P.grain, uExpo: P.expo, uVig: P.vig, uBloom: P.bloom, uSat: P.sat, uTint: P.tint, uDist: P.dist,
    });
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    try {
      for (const k in this.scenes) gl.deleteProgram(this.scenes[k].p);
      for (const p of [this.post, this.pGrass, this.pTri, this.pPt, this.pDec, this.pFire, this.pRain]) gl.deleteProgram(p.p);
      for (const k in this.tex) gl.deleteTexture(this.tex[k]);
      for (const k in this.grass) { gl.deleteBuffer(this.grass[k].buf); gl.deleteVertexArray(this.grass[k].vao); }
      for (const b of [this.tris, this.ptsAdd, this.ptsAlpha, this.decals, this.fires]) b.free();
      for (const b of this._bufs) gl.deleteBuffer(b);
      gl.deleteBuffer(this.bladeBuf);
      freeTarget(gl, this.tgt);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) {}
    this.canvas.remove();
  }
}
