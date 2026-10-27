// A small WebGL CRT: takes a 640×480 source canvas and draws it as a curved,
// scanlined, aperture-grille picture tube. Also does the power-on line, the
// Persona-style ripple when you touch the glass, and the zoom into the phosphors.

const VS = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform sampler2D tex;
uniform vec2 res;
uniform float time;
uniform float power;      // 0 = off, 1 = fully on (turn-on animation drives this)
uniform float bright;     // overall brightness / afterglow
uniform vec3 ripple;      // xy = uv centre, z = age in seconds (<0 none)
uniform float rippleAmp;
uniform float zoom;       // 1 = whole tube, larger = diving into the phosphors
uniform vec2 zoomC;
uniform float curve;
uniform float whiteout;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + curve * r2 + curve * 0.35 * r2 * r2;
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = vUv;
  uv = zoomC + (uv - zoomC) / zoom;

  // the glass is water now
  if (ripple.z >= 0.0) {
    vec2 d = uv - ripple.xy;
    d.x *= res.x / res.y;
    float r = length(d);
    float wave = sin(r * 70.0 - ripple.z * 9.0) * exp(-r * 3.2) * exp(-max(0.0, r - ripple.z * 0.35) * 18.0);
    uv += (d / max(r, 1e-4)) * wave * 0.012 * rippleAmp;
  }

  vec2 b = barrel(uv);
  float inside = step(0.0, b.x) * step(b.x, 1.0) * step(0.0, b.y) * step(b.y, 1.0);

  // power-on: the picture grows from a bright horizontal line
  float pv = clamp(power, 0.0, 1.0);
  float squash = smoothstep(0.0, 0.55, pv);
  float yy = (b.y - 0.5) / max(squash, 0.004) + 0.5;
  float lineOnly = step(abs(b.y - 0.5), 0.004 + 0.5 * squash);
  vec2 s = vec2(b.x, yy);
  float sx = smoothstep(0.0, 0.25, pv);
  s.x = (s.x - 0.5) / max(sx, 0.02) + 0.5;
  float inS = step(0.0, s.x) * step(s.x, 1.0) * step(0.0, s.y) * step(s.y, 1.0);

  vec2 px = vec2(1.0 / 640.0, 0.0);
  vec3 col;
  col.r = texture2D(tex, s + px * 1.2).r;
  col.g = texture2D(tex, s).g;
  col.b = texture2D(tex, s - px * 1.2).b;
  // RF smear: a little horizontal bleed
  vec3 smear = texture2D(tex, s - px * 3.0).rgb * 0.18 + texture2D(tex, s - px * 6.0).rgb * 0.08;
  col = col * 0.82 + smear;
  // cheap glow
  vec3 glow = texture2D(tex, s + vec2(0.0, 2.0 / 480.0)).rgb + texture2D(tex, s - vec2(0.0, 2.0 / 480.0)).rgb
            + texture2D(tex, s + px * 4.0).rgb + texture2D(tex, s - px * 4.0).rgb;
  col += glow * 0.06;

  // scanlines (480 visible lines), they open up as we dive
  float lines = min(480.0, res.y * zoom / 2.6);
  float sl = 0.5 + 0.5 * cos(s.y * lines * 6.28318);
  col *= mix(1.0, 0.62 + 0.38 * sl, 0.85);

  // aperture grille: stripes scale with zoom so the phosphors grow as you fall in
  float ms = max(1.0, zoom * 0.9) * max(1.0, res.x / 1100.0);
  float m = mod(gl_FragCoord.x / ms, 3.0);
  vec3 mask = m < 1.0 ? vec3(1.0, 0.35, 0.3) : (m < 2.0 ? vec3(0.3, 1.0, 0.35) : vec3(0.35, 0.3, 1.0));
  float maskAmt = clamp(0.28 + (zoom - 1.0) * 0.04, 0.28, 0.92);
  col *= mix(vec3(1.0), mask * 1.6, maskAmt);

  // tube vignette and a faint reflection of the room on the glass
  vec2 cc = b * 2.0 - 1.0;
  float vig = 1.0 - dot(cc * vec2(0.55, 0.65), cc * vec2(0.55, 0.65));
  col *= clamp(vig, 0.0, 1.0) * 1.12;
  float refl = smoothstep(0.9, 0.0, length(vUv - vec2(0.28, 0.78))) * 0.06;

  // flicker + grain
  col *= 0.97 + 0.03 * sin(time * 120.0);
  col += (hash(gl_FragCoord.xy + fract(time) * 100.0) - 0.5) * 0.035;

  col *= bright;
  col *= inS;
  // the bright line during power-on
  float lineGlow = (1.0 - smoothstep(0.0, 0.5, pv)) * step(0.001, pv) * lineOnly * (1.0 - smoothstep(0.0, 0.03, abs(b.y - 0.5))) * 2.0;
  col += vec3(0.85, 0.9, 1.0) * lineGlow;
  // a dying dot when switched off (power slightly negative encodes nothing; handled by bright)
  col = col * inside + vec3(refl) * inside;
  col = mix(col, vec3(1.0, 0.98, 0.94), whiteout);
  gl_FragColor = vec4(col, 1.0);
}
`;

export class CRTGL {
  constructor(canvas, source) {
    this.canvas = canvas;
    this.source = source;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    this.gl = gl;
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.u = {};
    ['tex', 'res', 'time', 'power', 'bright', 'ripple', 'rippleAmp', 'zoom', 'zoomC', 'curve', 'whiteout'].forEach((n) => {
      this.u[n] = gl.getUniformLocation(prog, n);
    });
    this.state = { power: 0, bright: 1, ripple: [0.5, 0.5, -1], rippleAmp: 1, zoom: 1, zoomC: [0.5, 0.5], curve: 0.09, whiteout: 0 };
  }

  resize(w, h, dpr) {
    this.canvas.width = Math.max(2, Math.round(w * dpr));
    this.canvas.height = Math.max(2, Math.round(h * dpr));
  }

  render(t) {
    const gl = this.gl;
    if (!gl) return;
    const st = this.state;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.source);
    gl.uniform1i(this.u.tex, 0);
    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.time, t);
    gl.uniform1f(this.u.power, st.power);
    gl.uniform1f(this.u.bright, st.bright);
    gl.uniform3f(this.u.ripple, st.ripple[0], st.ripple[1], st.ripple[2]);
    gl.uniform1f(this.u.rippleAmp, st.rippleAmp);
    gl.uniform1f(this.u.zoom, st.zoom);
    gl.uniform2f(this.u.zoomC, st.zoomC[0], st.zoomC[1]);
    gl.uniform1f(this.u.curve, st.curve);
    gl.uniform1f(this.u.whiteout, st.whiteout);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}
