/* ============================================================================
 * AUDIO — every sound is synthesised at runtime with WebAudio.
 * No samples, no downloads: goal horn, crowd bed, organ charge, hits, whistle.
 * ==========================================================================*/

class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVol = 0.75;
    this.ready = false;
    this.crowdLevel = 0.12;
    this.crowdTarget = 0.12;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    const c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = this.masterVol;

    // A gentle limiter so the goal horn + crowd never clip.
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 9;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    this.master.connect(this.comp).connect(c.destination);

    // Shared noise buffer (2s of white noise) reused by most effects.
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._buildCrowd();
    this.ready = true;
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.masterVol = v;
    if (this.master) this.master.gain.value = v;
  }

  get t() { return this.ctx.currentTime; }

  _noise(dur, { gain = 0.4, type = 'bandpass', freq = 900, q = 1, sweep = null, dest = null } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) {
      f.frequency.setValueAtTime(freq, this.t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), this.t + dur);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(gain, this.t);
    g.gain.exponentialRampToValueAtTime(0.0008, this.t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start();
    src.stop(this.t + dur + 0.05);
    return { src, f, g };
  }

  _tone(freq, dur, { type = 'sine', gain = 0.3, to = null, delay = 0, dest = null, attack = 0.004 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    const t0 = this.t + delay;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return { o, g };
  }

  /* ------------------------------------------------------------- crowd bed */

  _buildCrowd() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 760; lp.Q.value = 0.6;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 160;

    this.crowdGain = c.createGain();
    this.crowdGain.gain.value = 0.0;
    this.crowdFilter = lp;

    src.connect(hp).connect(lp).connect(this.crowdGain).connect(this.master);
    src.start();
    this.crowdSrc = src;
  }

  /** 0..1 excitement. Called every frame from the game loop. */
  setCrowd(level, dt = 0.016) {
    if (!this.ready || !this.enabled) return;
    this.crowdTarget = level;
    this.crowdLevel += (this.crowdTarget - this.crowdLevel) * Math.min(1, dt * 2.2);
    const l = this.crowdLevel;
    this.crowdGain.gain.value = 0.03 + l * 0.36;
    this.crowdFilter.frequency.value = 620 + l * 2100;
  }

  /* ------------------------------------------------------------------ sfx  */

  skate(power = 1) {
    if (!this._ok()) return;
    this._noise(0.16, { gain: 0.05 * power, type: 'bandpass', freq: 2600 + Math.random() * 1800, q: 0.7, sweep: 900 });
  }

  stickPuck(power = 1) {
    if (!this._ok()) return;
    this._tone(320 + Math.random() * 90, 0.05, { type: 'square', gain: 0.06 * power, to: 120 });
    this._noise(0.05, { gain: 0.07 * power, type: 'highpass', freq: 2400 });
  }

  pass() {
    if (!this._ok()) return;
    this._noise(0.1, { gain: 0.09, type: 'bandpass', freq: 1500, q: 1.4, sweep: 3200 });
    this._tone(520, 0.07, { type: 'triangle', gain: 0.05, to: 900 });
  }

  shot(power = 1) {
    if (!this._ok()) return;
    this._tone(180, 0.09, { type: 'square', gain: 0.12 * power, to: 60 });
    this._noise(0.13, { gain: 0.2 * power, type: 'bandpass', freq: 1800, q: 0.8, sweep: 300 });
  }

  slapshot() {
    if (!this._ok()) return;
    this._tone(140, 0.16, { type: 'sawtooth', gain: 0.2, to: 44 });
    this._noise(0.22, { gain: 0.3, type: 'bandpass', freq: 2600, q: 0.5, sweep: 200 });
  }

  superShot() {
    if (!this._ok()) return;
    this._tone(90, 0.5, { type: 'sawtooth', gain: 0.24, to: 38 });
    this._noise(0.5, { gain: 0.26, type: 'lowpass', freq: 3200, sweep: 160 });
    [523, 659, 784, 1046].forEach((f, i) =>
      this._tone(f, 0.35, { type: 'triangle', gain: 0.08, delay: i * 0.04 }));
  }

  boards() {
    if (!this._ok()) return;
    this._tone(110, 0.13, { type: 'sine', gain: 0.16, to: 42 });
    this._noise(0.1, { gain: 0.12, type: 'lowpass', freq: 1200, sweep: 260 });
  }

  post() {
    if (!this._ok()) return;
    this._tone(1180, 0.55, { type: 'sine', gain: 0.22, to: 1050 });
    this._tone(2360, 0.4, { type: 'sine', gain: 0.08, to: 2200 });
  }

  bigHit(power = 1) {
    if (!this._ok()) return;
    this._tone(74, 0.34, { type: 'sine', gain: 0.32 * power, to: 30 });
    this._noise(0.3, { gain: 0.28 * power, type: 'lowpass', freq: 1800, sweep: 120 });
    this._tone(190, 0.12, { type: 'square', gain: 0.09 * power, to: 70 });
  }

  save() {
    if (!this._ok()) return;
    this._noise(0.14, { gain: 0.16, type: 'bandpass', freq: 700, q: 0.9, sweep: 220 });
    this._tone(230, 0.1, { type: 'triangle', gain: 0.08, to: 110 });
  }

  whistle() {
    if (!this._ok()) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    const mod = c.createOscillator(); mod.type = 'sine'; mod.frequency.value = 28;
    const modG = c.createGain(); modG.gain.value = 130;
    mod.connect(modG).connect(o.frequency);
    o.frequency.value = 2350;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(0.16, this.t + 0.03);
    g.gain.setValueAtTime(0.16, this.t + 0.34);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + 0.5);
    o.connect(g).connect(this.master);
    o.start(); mod.start();
    o.stop(this.t + 0.55); mod.stop(this.t + 0.55);
  }

  /** Big arena goal horn: stacked detuned saws + a swelling crowd roar. */
  goalHorn() {
    if (!this._ok()) return;
    const c = this.ctx;
    const base = 116.5;
    const partials = [1, 1.5, 2, 2.51, 3, 4.02];
    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, this.t);
    bus.gain.exponentialRampToValueAtTime(0.5, this.t + 0.08);
    bus.gain.setValueAtTime(0.5, this.t + 1.6);
    bus.gain.exponentialRampToValueAtTime(0.0001, this.t + 2.4);
    const sat = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    sat.curve = curve;
    bus.connect(sat).connect(this.master);

    partials.forEach((p, i) => {
      [-4, 4].forEach((det) => {
        const o = c.createOscillator();
        o.type = i < 2 ? 'sawtooth' : 'square';
        o.frequency.value = base * p;
        o.detune.value = det * (i + 1);
        const g = c.createGain();
        g.gain.value = 0.34 / (i + 1.5);
        o.connect(g).connect(bus);
        o.start();
        o.stop(this.t + 2.5);
      });
    });
    this._noise(2.2, { gain: 0.16, type: 'bandpass', freq: 500, q: 0.4 });
  }

  /** Short 5-note organ "charge!" riff. */
  organ() {
    if (!this._ok()) return;
    const notes = [392, 392, 523.25, 659.25, 587.33, 659.25];
    const times = [0, 0.16, 0.32, 0.48, 0.66, 0.8];
    notes.forEach((f, i) => {
      [1, 2, 3].forEach((h, hi) => {
        this._tone(f * h, 0.24, {
          type: 'square', gain: 0.055 / (hi + 1), delay: times[i],
        });
      });
    });
  }

  uiMove() { if (this._ok()) this._tone(660, 0.06, { type: 'square', gain: 0.05, to: 880 }); }
  uiSelect() {
    if (!this._ok()) return;
    this._tone(523, 0.09, { type: 'square', gain: 0.07 });
    this._tone(1046, 0.14, { type: 'square', gain: 0.06, delay: 0.07 });
  }
  uiBack() { if (this._ok()) this._tone(400, 0.1, { type: 'square', gain: 0.06, to: 220 }); }

  countBeep(last = false) {
    if (!this._ok()) return;
    this._tone(last ? 1046 : 660, last ? 0.4 : 0.14, { type: 'triangle', gain: 0.14 });
  }

  fire() {
    if (!this._ok()) return;
    this._noise(0.9, { gain: 0.16, type: 'bandpass', freq: 400, q: 0.5, sweep: 2200 });
    [261, 329, 392, 523, 659].forEach((f, i) =>
      this._tone(f, 0.5, { type: 'sawtooth', gain: 0.07, delay: i * 0.06 }));
  }

  buzzer() {
    if (!this._ok()) return;
    const c = this.ctx;
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 165 + i * 3;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, this.t);
      g.gain.exponentialRampToValueAtTime(0.14, this.t + 0.02);
      g.gain.setValueAtTime(0.14, this.t + 1.3);
      g.gain.exponentialRampToValueAtTime(0.0001, this.t + 1.7);
      o.connect(g).connect(this.master);
      o.start(); o.stop(this.t + 1.8);
    }
  }

  _ok() {
    if (!this.enabled) return false;
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') return false;
    return true;
  }
}

const SFX = new Sfx();
