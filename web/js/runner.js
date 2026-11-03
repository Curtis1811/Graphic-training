// Runs lesson code against a fresh WebGL2 context and reports errors back to the UI.
import { makeHelpers, ShaderError } from './helpers.js';

const GL_ERRORS = {
  0x0500: 'INVALID_ENUM',
  0x0501: 'INVALID_VALUE',
  0x0502: 'INVALID_OPERATION',
  0x0505: 'OUT_OF_MEMORY',
  0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
  0x9242: 'CONTEXT_LOST_WEBGL',
};

// The Function constructor adds two header lines before the body.
const FN_HEADER_LINES = 2;

export class Runner {
  constructor(stage, { onLog, onError, onFps }) {
    this.stage = stage;
    this.onLog = onLog;
    this.onError = onError;
    this.onFps = onFps;
    this.canvas = null;
    this.gl = null;
    this.raf = 0;
    this.paused = false;
    this.mouse = { x: 0, y: 0, down: false };
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.gl) {
      // Free the GPU context right away: browsers only allow a handful at once.
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.canvas?.remove();
    this.canvas = null;
    this.gl = null;
  }

  setPaused(p) {
    this.paused = p;
  }

  run({ js, shaders = {} }) {
    this.stop();
    const canvas = document.createElement('canvas');
    canvas.className = 'gl-canvas';
    this.stage.prepend(canvas);
    this.canvas = canvas;
    this.resize();
    this.bindMouse(canvas);

    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) {
      this.onError({ stage: 'js', line: 0, message: 'WebGL2 is not available in this browser.' });
      return;
    }
    this.gl = gl;

    const log = (...args) => this.onLog(args.map(fmt).join(' '));
    const H = makeHelpers({ log, mouse: this.mouse });

    let frame;
    try {
      const fn = new Function('gl', 'canvas', 'shaders', 'H', `${js}\n//# sourceURL=lesson.js`);
      frame = fn(gl, canvas, shaders, H);
    } catch (err) {
      this.report(err);
      return;
    }
    this.reportGlErrors();
    if (typeof frame !== 'function') return; // a one-shot drawing, nothing to animate

    const start = performance.now();
    let last = start, frames = 0, fpsTime = start;
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      if (this.paused) { last = now; return; }
      this.resize();
      const t = (now - start) / 1000;
      const dt = (now - last) / 1000;
      last = now;
      try {
        frame(t, dt);
      } catch (err) {
        cancelAnimationFrame(this.raf);
        this.report(err);
        return;
      }
      this.reportGlErrors();
      frames++;
      if (now - fpsTime > 500) {
        this.onFps?.(Math.round((frames * 1000) / (now - fpsTime)));
        frames = 0;
        fpsTime = now;
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  // Match the drawing buffer to the canvas' on-screen size (capped at 2x DPR).
  resize() {
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  bindMouse(canvas) {
    const update = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      if (!p) return;
      const sx = canvas.width / r.width, sy = canvas.height / r.height;
      // Same convention as gl_FragCoord: origin at the bottom-left, in pixels.
      this.mouse.x = (p.clientX - r.left) * sx;
      this.mouse.y = (r.bottom - p.clientY) * sy;
    };
    canvas.addEventListener('pointermove', update);
    canvas.addEventListener('pointerdown', (e) => { this.mouse.down = true; update(e); });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
  }

  reportGlErrors() {
    const gl = this.gl;
    if (!gl) return;
    let e, seen = 0;
    while ((e = gl.getError()) !== gl.NO_ERROR && seen++ < 5) {
      if (e === 0x9242) return; // context lost on purpose by stop()
      const key = `gl-${e}`;
      if (this.lastGlError !== key) {
        this.lastGlError = key;
        this.onLog(`⚠ gl.getError() = ${GL_ERRORS[e] || e} — check the last gl.* calls`, 'warn');
      }
    }
  }

  report(err) {
    if (err instanceof ShaderError) {
      const m = /ERROR:\s*\d+:(\d+):/.exec(err.log);
      this.onError({ stage: err.stage, source: err.source, line: m ? Number(m[1]) : 0, message: err.log.trim() });
      return;
    }
    const m = /lesson\.js:(\d+):(\d+)/.exec(err?.stack || '');
    const line = m ? Math.max(1, Number(m[1]) - FN_HEADER_LINES) : 0;
    this.onError({ stage: 'js', line, message: `${err?.name || 'Error'}: ${err?.message || err}` });
  }
}

function fmt(v) {
  if (typeof v === 'string') return v;
  if (ArrayBuffer.isView(v)) return `[${Array.from(v, (n) => +n.toFixed(3)).join(', ')}]`;
  try { return JSON.stringify(v); } catch { return String(v); }
}
