// Tiny WebGL2 toolkit for the Hikari Line railcar: programs, matrices, mesh building, textures.
// No dependencies. Column-major matrices, right-handed world (x = toward the front of the car,
// y = up, z = across the car toward the right-hand wall).

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: true, alpha: false, depth: true, stencil: true,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  gl._aniso = aniso;
  gl._maxAniso = aniso ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 1;
  return gl;
}

function numbered(src) {
  return src.split('\n').map((l, i) => String(i + 1).padStart(4) + ' ' + l).join('\n');
}

export function program(gl, vs, fs, name = 'prog') {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error(numbered(src));
      throw new Error(`[train] ${name} ${type === gl.VERTEX_SHADER ? 'vs' : 'fs'}: ${log}`);
    }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[train] ${name} link: ${gl.getProgramInfoLog(p)}`);
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const key = info.name.replace(/\[0\]$/, '');
    u[key] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
  }
  return { p, u, name };
}

export function setU(gl, prog, name, v) {
  const e = prog.u[name];
  if (!e) return;
  switch (e.type) {
    case gl.FLOAT: if (e.size > 1 || typeof v !== 'number') gl.uniform1fv(e.loc, v); else gl.uniform1f(e.loc, v); break;
    case gl.FLOAT_VEC2: gl.uniform2fv(e.loc, v); break;
    case gl.FLOAT_VEC3: gl.uniform3fv(e.loc, v); break;
    case gl.FLOAT_VEC4: gl.uniform4fv(e.loc, v); break;
    case gl.FLOAT_MAT4: gl.uniformMatrix4fv(e.loc, false, v); break;
    case gl.FLOAT_MAT3: gl.uniformMatrix3fv(e.loc, false, v); break;
    default:
      if (e.size > 1 || typeof v !== 'number') gl.uniform1iv(e.loc, v); else gl.uniform1i(e.loc, v);
  }
}

// ── matrices ────────────────────────────────────────────────────────────────
export const m4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b, out = new Float32Array(16)) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  },
  persp(tanV, aspect, near, far, out = new Float32Array(16)) {
    const f = 1 / tanV;
    out.fill(0);
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) / (near - far); out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },
  // camera basis from yaw (positive = turn toward -z, i.e. left when facing +x), pitch, roll
  basis(yaw, pitch, roll = 0) {
    const cp = Math.cos(pitch);
    const f = [Math.cos(yaw) * cp, Math.sin(pitch), -Math.sin(yaw) * cp];
    let r = [-f[2], 0, f[0]]; // f × up
    const rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
    let u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    if (roll) {
      const c = Math.cos(roll), s = Math.sin(roll);
      const r2 = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s];
      const u2 = [u[0] * c - r[0] * s, u[1] * c - r[1] * s, u[2] * c - r[2] * s];
      r = r2; u = u2;
    }
    return { f, r, u };
  },
  view(eye, b, out = new Float32Array(16)) {
    const { f, r, u } = b;
    out[0] = r[0]; out[1] = u[0]; out[2] = -f[0]; out[3] = 0;
    out[4] = r[1]; out[5] = u[1]; out[6] = -f[1]; out[7] = 0;
    out[8] = r[2]; out[9] = u[2]; out[10] = -f[2]; out[11] = 0;
    out[12] = -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]);
    out[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
    out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
    out[15] = 1;
    return out;
  },
  invert(m, out = new Float32Array(16)) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out.set(m4.ident()), out;
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  },
  // reflection across the plane z = z0
  mirrorZ(z0) { const m = m4.ident(); m[10] = -1; m[14] = 2 * z0; return m; },
  trs(tx, ty, tz, rx = 0, ry = 0, rz = 0, s = 1, out = new Float32Array(16)) {
    // R = Ry * Rz * Rx, then scale, then translate
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // Rz*Rx
    const m00 = cz, m01 = -sz * cx, m02 = sz * sx;
    const m10 = sz, m11 = cz * cx, m12 = -cz * sx;
    const m20 = 0, m21 = sx, m22 = cx;
    // Ry * (Rz*Rx)
    const r00 = cy * m00 + sy * m20, r01 = cy * m01 + sy * m21, r02 = cy * m02 + sy * m22;
    const r10 = m10, r11 = m11, r12 = m12;
    const r20 = -sy * m00 + cy * m20, r21 = -sy * m01 + cy * m21, r22 = -sy * m02 + cy * m22;
    out[0] = r00 * s; out[1] = r10 * s; out[2] = r20 * s; out[3] = 0;
    out[4] = r01 * s; out[5] = r11 * s; out[6] = r21 * s; out[7] = 0;
    out[8] = r02 * s; out[9] = r12 * s; out[10] = r22 * s; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
    return out;
  },
  xform(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
      w,
    ];
  },
};

// sRGB hex → linear [r,g,b]
export function lin(hex, mul = 1) {
  const h = hex.replace('#', '');
  const v = (i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2) * mul;
  return [v(0), v(2), v(4)];
}
export function srgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

// ── mesh builder ────────────────────────────────────────────────────────────
// Interleaved vertex: pos3 nrm3 uv2 col4 mat4 = 16 floats.
// col: linear albedo rgb + a (alpha). mat: x = texture layer (-1 none), y = material kind,
// z = ambient occlusion, w = emissive strength.
export const STRIDE = 16;
export const MAT = { DIFFUSE: 0, CHROME: 1, GLOSS: 2, TUBE: 3, FABRIC: 4, PAINT: 5, SKIN: 6, LAMP: 7 };

export class Builder {
  constructor() { this.v = []; }
  get count() { return this.v.length / STRIDE; }
  vert(p, n, uv, c, m) {
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], uv[0], uv[1], c[0], c[1], c[2], c[3] ?? 1, m[0], m[1], m[2], m[3]);
  }
  tri(a, b, c, na, nb, nc, ua, ub, uc, col, mat, aoA = 1, aoB = 1, aoC = 1) {
    this.vert(a, na, ua, col, [mat[0], mat[1], mat[2] * aoA, mat[3]]);
    this.vert(b, nb, ub, col, [mat[0], mat[1], mat[2] * aoB, mat[3]]);
    this.vert(c, nc, uc, col, [mat[0], mat[1], mat[2] * aoC, mat[3]]);
  }
  // a b c d counter-clockwise when seen from the front (normal side)
  quad(a, b, c, d, n, uv, col, mat, ao = [1, 1, 1, 1]) {
    const [ua, ub, uc, ud] = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.tri(a, b, c, n, n, n, ua, ub, uc, col, mat, ao[0], ao[1], ao[2]);
    this.tri(a, c, d, n, n, n, ua, uc, ud, col, mat, ao[0], ao[2], ao[3]);
  }
  // Axis-aligned box. faces: string of which faces to emit (x- x+ y- y+ z- z+) as 'XxYyZz'
  // (lowercase = negative side). uvs are world-scaled by `us` metres per texture repeat.
  box(x0, y0, z0, x1, y1, z1, col, mat, { faces = 'xXyYzZ', us = 1, aoBottom = 1, aoTop = 1 } = {}) {
    const P = (x, y, z) => [x, y, z];
    const u = (a, b) => [a / us, b / us];
    const aoY = (y) => (y === y0 ? aoBottom : aoTop);
    if (faces.includes('x')) this.quad(P(x0, y0, z1), P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), [-1, 0, 0],
      [u(-z1, y0), u(-z0, y0), u(-z0, y1), u(-z1, y1)], col, mat, [aoY(y0), aoY(y0), aoY(y1), aoY(y1)]);
    if (faces.includes('X')) this.quad(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), [1, 0, 0],
      [u(z0, y0), u(z1, y0), u(z1, y1), u(z0, y1)], col, mat, [aoY(y0), aoY(y0), aoY(y1), aoY(y1)]);
    if (faces.includes('y')) this.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -1, 0],
      [u(x0, z0), u(x1, z0), u(x1, z1), u(x0, z1)], col, mat, [aoBottom, aoBottom, aoBottom, aoBottom]);
    if (faces.includes('Y')) this.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), [0, 1, 0],
      [u(x0, z1), u(x1, z1), u(x1, z0), u(x0, z0)], col, mat, [aoTop, aoTop, aoTop, aoTop]);
    if (faces.includes('z')) this.quad(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), [0, 0, -1],
      [u(-x1, y0), u(-x0, y0), u(-x0, y1), u(-x1, y1)], col, mat, [aoY(y0), aoY(y0), aoY(y1), aoY(y1)]);
    if (faces.includes('Z')) this.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1],
      [u(x0, y0), u(x1, y0), u(x1, y1), u(x0, y1)], col, mat, [aoY(y0), aoY(y0), aoY(y1), aoY(y1)]);
  }
  // Cylinder along an axis ('x' | 'y' | 'z') from a0 to a1, centred at (c1, c2) in the other two axes.
  cyl(axis, a0, a1, c1, c2, r, col, mat, { seg = 12, caps = false, r1 = null, uvScale = 1 } = {}) {
    const rr1 = r1 == null ? r : r1;
    const map = (a, p, q) => (axis === 'x' ? [a, p, q] : axis === 'y' ? [p, a, q] : [p, q, a]);
    for (let i = 0; i < seg; i++) {
      const t0 = (i / seg) * Math.PI * 2, t1 = ((i + 1) / seg) * Math.PI * 2;
      const n0 = [Math.cos(t0), Math.sin(t0)], n1 = [Math.cos(t1), Math.sin(t1)];
      const A = map(a0, c1 + n0[0] * r, c2 + n0[1] * r), B = map(a0, c1 + n1[0] * r, c2 + n1[1] * r);
      const C = map(a1, c1 + n1[0] * rr1, c2 + n1[1] * rr1), D = map(a1, c1 + n0[0] * rr1, c2 + n0[1] * rr1);
      const N0 = map(0, n0[0], n0[1]), N1 = map(0, n1[0], n1[1]);
      const ua = [i / seg, 0], ub = [(i + 1) / seg, 0], uc = [(i + 1) / seg, (a1 - a0) * uvScale], ud = [i / seg, (a1 - a0) * uvScale];
      // orientation: make sure triangles face outward
      if (axis === 'y') {
        this.tri(A, D, C, N0, N0, N1, ua, ud, uc, col, mat);
        this.tri(A, C, B, N0, N1, N1, ua, uc, ub, col, mat);
      } else {
        this.tri(A, B, C, N0, N1, N1, ua, ub, uc, col, mat);
        this.tri(A, C, D, N0, N1, N0, ua, uc, ud, col, mat);
      }
      if (caps) {
        const c0 = map(a0, c1, c2), c1p = map(a1, c1, c2);
        const na = map(-1, 0, 0), nb = map(1, 0, 0);
        this.tri(c0, B, A, na, na, na, [0.5, 0.5], [0.5, 0.5], [0.5, 0.5], col, mat);
        this.tri(c1p, D, C, nb, nb, nb, [0.5, 0.5], [0.5, 0.5], [0.5, 0.5], col, mat);
      }
    }
  }
  // Torus in the plane spanned by axes u,v (unit arrays) around centre c.
  torus(c, ax, ay, R, r, col, mat, { seg = 18, side = 6 } = {}) {
    const nrm = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]];
    const pt = (i, j) => {
      const a = (i / seg) * Math.PI * 2, b = (j / side) * Math.PI * 2;
      const dir = [ax[0] * Math.cos(a) + ay[0] * Math.sin(a), ax[1] * Math.cos(a) + ay[1] * Math.sin(a), ax[2] * Math.cos(a) + ay[2] * Math.sin(a)];
      const n = [dir[0] * Math.cos(b) + nrm[0] * Math.sin(b), dir[1] * Math.cos(b) + nrm[1] * Math.sin(b), dir[2] * Math.cos(b) + nrm[2] * Math.sin(b)];
      return { p: [c[0] + dir[0] * R + n[0] * r, c[1] + dir[1] * R + n[1] * r, c[2] + dir[2] * R + n[2] * r], n };
    };
    for (let i = 0; i < seg; i++) for (let j = 0; j < side; j++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      this.tri(a.p, b.p, cc.p, a.n, b.n, cc.n, [0, 0], [1, 0], [1, 1], col, mat);
      this.tri(a.p, cc.p, d.p, a.n, cc.n, d.n, [0, 0], [1, 1], [0, 1], col, mat);
    }
  }
  sphere(c, r, col, mat, { seg = 14, ring = 9, sy = 1 } = {}) {
    const pt = (i, j) => {
      const th = (i / seg) * Math.PI * 2, ph = (j / ring) * Math.PI;
      const n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      return { p: [c[0] + n[0] * r, c[1] + n[1] * r * sy, c[2] + n[2] * r], n };
    };
    for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      this.tri(a.p, cc.p, b.p, a.n, cc.n, b.n, [0, 0], [1, 1], [1, 0], col, mat);
      this.tri(a.p, d.p, cc.p, a.n, d.n, cc.n, [0, 0], [0, 1], [1, 1], col, mat);
    }
  }
  upload(gl) { return uploadMesh(gl, new Float32Array(this.v)); }
}

export function uploadMesh(gl, data, dynamic = false) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  const B = STRIDE * 4;
  const attr = (loc, size, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, B, off * 4); };
  attr(0, 3, 0); attr(1, 3, 3); attr(2, 2, 6); attr(3, 4, 8); attr(4, 4, 12);
  gl.bindVertexArray(null);
  return { vao, buf, count: data.length / STRIDE };
}

// Add a per-instance vec4 x2 stream (locations 5 and 6) to an existing mesh VAO.
export function addInstances(gl, mesh, maxCount) {
  gl.bindVertexArray(mesh.vao);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  gl.bufferData(gl.ARRAY_BUFFER, maxCount * 8 * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(5, 1);
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(6, 1);
  gl.bindVertexArray(null);
  mesh.ibuf = ib;
  mesh.idata = new Float32Array(maxCount * 8);
  return mesh;
}

// ── textures ────────────────────────────────────────────────────────────────
export function texFromCanvas(gl, canvas, { wrap = 'repeat', mips = true, nearest = false, tex = null } = {}) {
  const t = tex || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  const W = wrap === 'repeat' ? gl.REPEAT : wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
  const WY = wrap === 'repeatx' ? gl.CLAMP_TO_EDGE : W;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap === 'repeatx' ? gl.REPEAT : W);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, WY);
  if (nearest) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  } else {
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (gl._aniso && mips) gl.texParameterf(gl.TEXTURE_2D, gl._aniso.TEXTURE_MAX_ANISOTROPY_EXT, gl._maxAniso);
  }
  return t;
}

export function texArray(gl, canvases, size) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(size)) + 1, gl.RGBA8, size, size, canvases.length);
  canvases.forEach((c, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, c));
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  if (gl._aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl._aniso.TEXTURE_MAX_ANISOTROPY_EXT, gl._maxAniso);
  return t;
}

export function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  return { c, g };
}

// Deterministic PRNG
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

// 1D value noise helper for painters
export function noise1(seed = 7) {
  const r = rng(seed);
  const tab = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) tab[i] = r();
  const n = (x) => {
    const i = Math.floor(x), f = x - i;
    const a = tab[((i % 1024) + 1024) % 1024], b = tab[(((i + 1) % 1024) + 1024) % 1024];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
  // periodic fbm: period p (in noise units) so strips tile
  n.fbm = (x, oct = 4, p = 0) => {
    let s = 0, a = 0.5, f = 1;
    for (let o = 0; o < oct; o++) {
      let xx = x * f;
      if (p) { const pp = p * f; xx = ((xx % pp) + pp) % pp; }
      // periodic sampling: blend wrap
      s += a * (p ? periodic(n, xx, p * f) : n(xx));
      a *= 0.5; f *= 2;
    }
    return s / (1 - Math.pow(0.5, oct));
  };
  return n;
}
function periodic(n, x, p) {
  const i = Math.floor(x), f = x - i;
  const pi = Math.round(p);
  const a = n(((i % pi) + pi) % pi), b = n((((i + 1) % pi) + pi) % pi);
  // n() on integers returns the table value; reuse smoothstep
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
