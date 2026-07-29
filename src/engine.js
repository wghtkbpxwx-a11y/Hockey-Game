/* ============================================================================
 * ENGINE — math helpers, camera, particle system, input (keyboard + gamepad).
 * ==========================================================================*/

const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Frame-rate independent exponential approach. */
function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function angApproach(a, b, maxStep) {
  const d = angDiff(a, b);
  return a + clamp(d, -maxStep, maxStep);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => clamp(Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
/** Perceived brightness, 0..1. */
function lum(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** First candidate that is far enough in value from `base`, else a
 *  value-shifted version of base. Keeps every club's kit self-legible. */
function contrastPick(base, candidates, minDelta = 0.2) {
  const lb = lum(base);
  for (const c of candidates) {
    if (c && Math.abs(lum(c) - lb) >= minDelta) return c;
  }
  return lb > 0.5 ? shade(base, -0.55) : shade(base, 0.45);
}

/** Pick black or white text for legibility on a colour. */
function contrastInk(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145 ? '#101010' : '#ffffff';
}

/* ------------------------------------------------------------------ camera */

class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.zoom = 1;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.roll = 0;
    this.snapped = false;
  }
  follow(x, y, zoom, dt, lambda = 5) {
    if (!this.snapped) { this.x = x; this.y = y; this.zoom = zoom; this.snapped = true; return; }
    this.x = damp(this.x, x, lambda, dt);
    this.y = damp(this.y, y, lambda, dt);
    this.zoom = damp(this.zoom, zoom, lambda * 0.6, dt);
  }
  addShake(v) { this.shake = Math.min(this.shake + v, 46); }
  update(dt) {
    this.shake = damp(this.shake, 0, 6, dt);
    const s = this.shake;
    this.shakeX = (Math.random() * 2 - 1) * s;
    this.shakeY = (Math.random() * 2 - 1) * s;
    this.roll = damp(this.roll, 0, 5, dt) + (Math.random() * 2 - 1) * s * 0.0004;
  }
  apply(ctx, w, h) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.roll);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.shakeX / this.zoom, -this.y + this.shakeY / this.zoom);
  }
}

/* --------------------------------------------------------------- particles */

class Particles {
  constructor(max = 1400) { this.list = []; this.max = max; }
  clear() { this.list.length = 0; }
  spawn(o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, size: 4, color: '#fff', type: 'dot',
      drag: 2, grav: 0, rot: 0, vrot: 0, alpha: 1, glow: false, text: '', ...o,
    });
  }

  /** Ice spray from a skate cutting hard. */
  snow(x, y, dirX, dirY, power = 1) {
    const n = 2 + (power * 3) | 0;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dirY, dirX) + rand(0.9, -0.9);
      const s = rand(90, 240) * power;
      this.spawn({
        x: x + rand(-6, 6), y: y + rand(-6, 6),
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.28, 0.55), max: 0.55, size: rand(2, 6.5), drag: 3.4,
        color: 'rgba(255,255,255,0.95)', type: 'snow',
      });
    }
  }
  shock(x, y, r, color = '#fff', width = 5, life = 0.35) {
    this.spawn({ x, y, life, max: life, size: r, color, type: 'ring', width });
  }
  spark(x, y, n = 10, color = '#ffd76a', speed = 340) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(speed, speed * 0.25);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.22, 0.5), max: 0.5, size: rand(1.5, 3.6), drag: 2.6,
        color, type: 'spark', glow: true,
      });
    }
  }
  flame(x, y, vx, vy, color = '#ff8a1e') {
    this.spawn({
      x, y, vx: vx + rand(-30, 30), vy: vy + rand(-30, 30),
      life: rand(0.25, 0.55), max: 0.55, size: rand(6, 15), drag: 1.6,
      color, type: 'flame', glow: true,
    });
  }
  confetti(x, y, colors) {
    for (let i = 0; i < 26; i++) {
      const a = rand(TAU);
      const s = rand(120, 480);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(1.0, 2.2), max: 2.2, size: rand(4, 9), drag: 1.1,
        rot: rand(TAU), vrot: rand(-9, 9),
        color: pick(colors), type: 'confetti',
      });
    }
  }
  floatText(x, y, text, color = '#fff', size = 28) {
    this.spawn({ x, y, vy: -70, life: 1.0, max: 1.0, text, color, size, type: 'text', drag: 1.6 });
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  draw(ctx) {
    const l = this.list;
    ctx.save();
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      const t = p.life / p.max;
      const a = clamp(t, 0, 1) * p.alpha;
      switch (p.type) {
        case 'snow': {
          ctx.globalAlpha = a * 0.85;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.8), 0, TAU);
          ctx.fill();
          break;
        }
        case 'spark': {
          ctx.globalAlpha = a;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'flame': {
          ctx.globalAlpha = a * 0.7;
          ctx.globalCompositeOperation = 'lighter';
          const r = p.size * (0.35 + (1 - t) * 1.1);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, '#fff6c9');
          g.addColorStop(0.35, p.color);
          g.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'ring': {
          const r = p.size * (1 - t * t);
          ctx.globalAlpha = a * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = (p.width || 5) * t;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
          break;
        }
        case 'confetti': {
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        }
        case 'text': {
          ctx.globalAlpha = a;
          ctx.font = `900 ${p.size}px Impact, "Arial Black", sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          break;
        }
        default: {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------- input */

const KEYMAPS = [
  { // player 1
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    shoot: ['KeyJ', 'Space'], pass: ['KeyK'], check: ['KeyL'],
    turbo: ['ShiftLeft'], swap: ['KeyK'],
  },
  { // player 2
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    shoot: ['Numpad0', 'Period'], pass: ['Numpad1', 'Comma'], check: ['Numpad2', 'Slash'],
    turbo: ['ShiftRight', 'Numpad3'], swap: ['Numpad1', 'Comma'],
  },
];

/** Single-player also accepts the arrow keys for movement. */
const P1_ALT_MOVE = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/* ------------------------------------------------------- touch controls */

/** Coarse pointer + no hover => phone/tablet. Drives the on-screen pad. */
const IS_TOUCH = typeof matchMedia === 'function' &&
  matchMedia('(hover: none) and (pointer: coarse)').matches;

/**
 * On-screen pad: a floating thumbstick on the left, action buttons on the
 * right. Uses Pointer Events so multi-touch (steer + shoot + turbo at the
 * same time) behaves the way a controller would.
 */
class TouchControls {
  constructor() {
    this.active = false;
    this.x = 0; this.y = 0; this.mag = 0;
    this.held = new Set();
    this.hits = new Set();
    this.stickId = null;
    this.buttonIds = new Map();      // pointerId -> action
    this.radius = 58;
  }

  mount() {
    this.root = document.getElementById('touch');
    this.zone = document.getElementById('tc-stick');
    this.base = document.getElementById('tc-base');
    this.knob = document.getElementById('tc-knob');
    if (!this.root) return;

    // Pointer capture is best-effort: if it throws we still want the input.
    const capture = (el, id) => { try { el.setPointerCapture(id); } catch (err) { /* ignore */ } };

    this.zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      capture(this.zone, e.pointerId);
      this.origin = { x: e.clientX, y: e.clientY };
      this.radius = Math.max(44, Math.min(74, window.innerHeight * 0.13));
      this.base.style.width = this.base.style.height = `${this.radius * 2}px`;
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.add('on');
      this._move(e);
      e.preventDefault();
    });

    const move = (e) => {
      if (e.pointerId !== this.stickId) return;
      this._move(e);
      e.preventDefault();
    };
    this.zone.addEventListener('pointermove', move);

    const end = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.x = this.y = this.mag = 0;
      this.base.classList.remove('on');
      this.knob.style.transform = 'translate(-50%,-50%)';
    };
    this.zone.addEventListener('pointerup', end);
    this.zone.addEventListener('pointercancel', end);

    for (const btn of this.root.querySelectorAll('[data-act]')) {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', (e) => {
        capture(btn, e.pointerId);
        this.buttonIds.set(e.pointerId, act);
        this.held.add(act);
        this.hits.add(act);
        btn.classList.add('pressed');
        e.preventDefault();
      });
      const release = (e) => {
        if (this.buttonIds.get(e.pointerId) !== act) return;
        this.buttonIds.delete(e.pointerId);
        this.held.delete(act);
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
    }
  }

  _move(e) {
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const d = Math.hypot(dx, dy);
    const r = this.radius;
    if (d > r) { dx = dx / d * r; dy = dy / d * r; }
    // Small dead zone so resting a thumb doesn't drift the skater.
    const mag = Math.min(1, d / (r * 0.82));
    if (mag < 0.16) { this.x = this.y = this.mag = 0; }
    else {
      const n = Math.hypot(dx, dy) || 1;
      this.x = dx / n; this.y = dy / n; this.mag = mag;
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  /** Show/hide the pad. */
  setVisible(v) {
    this.active = v;
    if (this.root) this.root.classList.toggle('hidden', !v);
    if (!v) {
      this.held.clear(); this.hits.clear();
      this.stickId = null; this.x = this.y = this.mag = 0;
      if (this.base) this.base.classList.remove('on');
      for (const b of this.root ? this.root.querySelectorAll('[data-act]') : []) b.classList.remove('pressed');
    }
  }

  endFrame() { this.hits.clear(); }
}

const TOUCH = new TouchControls();

class Input {
  constructor() {
    this.keys = new Set();     // currently held
    // Keys that went down since the last frame. Latched rather than derived
    // from a previous-state diff, so a tap that starts *and* ends between two
    // frames is still seen — at 40fps that is a very easy tap to lose.
    this.hits = new Set();
    this.anyPressed = false;
    this.padPrev = [{}, {}];
    this.allowArrowsForP1 = true;
    this._blocked = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

    addEventListener('keydown', (e) => {
      if (this._blocked.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.hits.add(e.code);
      this.anyPressed = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.hits.clear(); });
  }

  endFrame() {
    this.hits.clear();
    TOUCH.endFrame();
    this.anyPressed = false;
    const pads = this.pads();
    for (let i = 0; i < 2; i++) {
      const p = pads[i];
      if (!p) continue;
      this.padPrev[i] = { b: p.buttons.map((b) => b.pressed) };
    }
  }

  pads() {
    return navigator.getGamepads ? navigator.getGamepads() : [];
  }

  keyDown(code) { return this.keys.has(code); }
  keyHit(code) { return this.hits.has(code); }
  anyHit(codes) { return codes.some((c) => this.hits.has(c)); }
  anyDown(codes) { return codes.some((c) => this.keys.has(c)); }

  /** Aggregated control state for a local player slot. */
  read(slot) {
    const m = KEYMAPS[slot];
    let x = 0, y = 0;
    const alt = slot === 0 && this.allowArrowsForP1;
    if (this.anyDown(m.left) || (alt && this.keyDown(P1_ALT_MOVE.left))) x -= 1;
    if (this.anyDown(m.right) || (alt && this.keyDown(P1_ALT_MOVE.right))) x += 1;
    if (this.anyDown(m.up) || (alt && this.keyDown(P1_ALT_MOVE.up))) y -= 1;
    if (this.anyDown(m.down) || (alt && this.keyDown(P1_ALT_MOVE.down))) y += 1;

    let shoot = this.anyDown(m.shoot);
    let shootHit = this.anyHit(m.shoot);
    let pass = this.anyHit(m.pass);
    let check = this.anyHit(m.check);
    let turbo = this.anyDown(m.turbo);

    const pad = this.pads()[slot];
    if (pad) {
      const dz = (v) => (Math.abs(v) < 0.24 ? 0 : v);
      const ax = dz(pad.axes[0] || 0), ay = dz(pad.axes[1] || 0);
      if (Math.hypot(ax, ay) > 0.24) { x = ax; y = ay; }
      const bs = pad.buttons;
      const hit = (i) => bs[i] && bs[i].pressed && !(this.padPrev[slot].b && this.padPrev[slot].b[i]);
      const dn = (i) => bs[i] && bs[i].pressed;
      if (bs[12] && bs[12].pressed) y = -1;
      if (bs[13] && bs[13].pressed) y = 1;
      if (bs[14] && bs[14].pressed) x = -1;
      if (bs[15] && bs[15].pressed) x = 1;
      shoot = shoot || dn(0);
      shootHit = shootHit || hit(0);
      pass = pass || hit(2) || hit(3);
      check = check || hit(1);
      turbo = turbo || dn(5) || dn(7) || (pad.buttons[7] && pad.buttons[7].value > 0.35);
    }

    if (slot === 0 && TOUCH.active) {
      if (TOUCH.mag > 0) { x = TOUCH.x * TOUCH.mag; y = TOUCH.y * TOUCH.mag; }
      shoot = shoot || TOUCH.held.has('shoot');
      shootHit = shootHit || TOUCH.hits.has('shoot');
      pass = pass || TOUCH.hits.has('pass');
      check = check || TOUCH.hits.has('check');
      turbo = turbo || TOUCH.held.has('turbo');
    }

    const mag = Math.hypot(x, y);
    if (mag > 1) { x /= mag; y /= mag; }
    return { x, y, mag: Math.min(mag, 1), shoot, shootHit, pass, check, turbo };
  }

  /** "Press any button" for menus. */
  anyStart() {
    if (this.anyPressed) return true;
    const pads = this.pads();
    for (let i = 0; i < 2; i++) {
      const p = pads[i];
      if (!p) continue;
      for (let b = 0; b < p.buttons.length; b++) {
        if (p.buttons[b].pressed && !(this.padPrev[i].b && this.padPrev[i].b[b])) return true;
      }
    }
    return false;
  }
}
