/* ============================================================================
 * MATCH — the whole 3-on-3 simulation: skating physics, puck, goalies,
 * AI, checking, and the rulebook (such as it is — this is arcade hockey).
 *
 * World units: 10 units = 1 foot. Rink is a regulation 200' x 85' sheet.
 * Team 0 defends the LEFT net (x = -GOAL_LINE) and attacks right.
 * Team 1 defends the RIGHT net and attacks left.
 * ==========================================================================*/

const RINK = {
  hw: 1000,          // half length (200ft)
  hh: 425,           // half width (85ft)
  corner: 280,       // corner radius (28ft)
  goalLine: 890,     // 11ft from the end boards
  blue: 250,         // blue lines
  goalHalf: 44,      // half the goal mouth (oversized — arcade puck is oversized too)
  netDepth: 48,
  creaseR: 78,
  dotX: 690,         // end-zone faceoff dots
  dotY: 220,
  nzDotX: 200,
  circleR: 150,
};

const PUCK_R = 10;
const SKATER_R = 27;

const DIFFICULTY = {
  rookie:   { react: 0.24, aim: 0.34, aggro: 0.55, goalie: 0.80, speed: 0.93, label: 'ROOKIE' },
  pro:      { react: 0.15, aim: 0.20, aggro: 0.78, goalie: 0.94, speed: 0.98, label: 'PRO' },
  allstar:  { react: 0.09, aim: 0.11, aggro: 0.95, goalie: 1.03, speed: 1.02, label: 'ALL-STAR' },
  legend:   { react: 0.05, aim: 0.05, aggro: 1.12, goalie: 1.12, speed: 1.06, label: 'LEGEND' },
};

/* --------------------------------------------------------------- entities */

class Skater {
  constructor(team, slot, data) {
    this.team = team;
    this.slot = slot;
    this.data = data;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.face = team === 0 ? 0 : Math.PI;
    this.lean = 0;
    this.skatePhase = Math.random() * TAU;
    this.turbo = 1;
    this.charge = 0;
    this.charging = false;
    this.stun = 0;
    this.down = 0;
    this.checkAnim = 0;
    this.pokeAnim = 0;
    this.puckCooldown = 0;
    this.fire = 0;
    this.receiveWindow = 0;
    this.oneTimerArmed = 0;
    this.celebrate = 0;
    this.think = 0;
    this.aiState = 'chase';
    this.aiTarget = { x: 0, y: 0 };
    this.aiJuke = 0;
    this.stats = { g: 0, a: 0, sog: 0, hits: 0 };
    this.lastPassFrom = -1;
    this.input = { x: 0, y: 0, mag: 0, shoot: false, shootHit: false, pass: false, check: false, turbo: false };
    this.human = false;
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get maxSpeed() {
    let s = 372 + this.data.spd * 1.86;
    if (this.fire > 0) s *= 1.13;
    return s;
  }
}

class Goalie {
  constructor(team, data) {
    this.team = team;
    this.data = data;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.face = team === 0 ? 0 : Math.PI;
    this.lagY = 0;
    this.lagX = 0;
    this.saveAnim = 0;
    this.lunge = 0;
    this.poseT = 0;
    this.stats = { saves: 0, ga: 0 };
  }
}

class Puck {
  constructor() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.spin = 0;
    this.carrier = null;
    this.lastTouch = null;
    this.lastPasser = null;
    this.passAssistTimer = 0;
    this.trail = [];
    this.hot = 0;      // super-shot puck
    this.shotBy = null;
    this.shotPower = 0;
    this.airtime = 0;
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
}

/* ------------------------------------------------------------------ match */

class Match {
  constructor(teams, opts = {}) {
    this.teams = teams;                       // [teamDataA, teamDataB]
    this.opts = Object.assign({
      periodLength: 120,
      periods: 3,
      difficulty: 'pro',
      humans: [0],                            // which teams a person controls
      demo: false,
    }, opts);
    this.diff = DIFFICULTY[this.opts.difficulty] || DIFFICULTY.pro;

    this.skaters = [];
    this.goalies = [];
    for (let t = 0; t < 2; t++) {
      for (let s = 0; s < 3; s++) this.skaters.push(new Skater(t, s, teams[t].skaters[s]));
      this.goalies.push(new Goalie(t, teams[t].goalie));
    }
    this.puck = new Puck();
    this.particles = new Particles();

    this.score = [0, 0];
    this.shots = [0, 0];
    this.hits = [0, 0];
    this.meter = [0, 0];
    this.period = 1;
    this.clock = this.opts.periodLength;
    this.phase = 'faceoff';
    this.phaseT = 0;
    this.overtime = false;
    this.winner = -1;

    this.control = [0, 0];       // which slot each side's human/camera owns
    this.lastScorer = [null, null];
    this.streak = [0, 0];

    this.hitStop = 0;
    this.slowmo = 1;
    this.excitement = 0.15;
    this.messages = [];
    this.tickerText = '';
    this.goalInfo = null;
    this.faceoffAt = { x: 0, y: 0 };
    this.scratches = [];         // ice marks: {x,y,px,py,a}
    this.replayBuf = [];
    this.replayMax = 260;
    this.replay = null;
    this.time = 0;
    this.lastGoalTime = -99;
    this.puckHistory = [];

    this.setFaceoff(0, 0);
  }

  /* ------------------------------------------------------------- utilities */

  teamSkaters(t) { return this.skaters.filter((s) => s.team === t); }
  /** x of the net this team attacks. */
  attackX(t) { return t === 0 ? RINK.goalLine : -RINK.goalLine; }
  defendX(t) { return t === 0 ? -RINK.goalLine : RINK.goalLine; }
  attackDir(t) { return t === 0 ? 1 : -1; }

  say(text, sub = '', color = '#fff', life = 2.2) {
    this.messages.push({ text, sub, color, life, max: life });
    if (this.messages.length > 3) this.messages.shift();
  }

  addMeter(t, amt) {
    this.meter[t] = clamp(this.meter[t] + amt, 0, 1);
  }

  /* -------------------------------------------------------------- faceoff */

  setFaceoff(x, y) {
    this.faceoffAt = { x, y };
    this.phase = 'faceoff';
    this.phaseT = 0;
    const p = this.puck;
    p.carrier = null; p.vx = 0; p.vy = 0; p.x = x; p.y = y;
    p.trail.length = 0; p.hot = 0; p.shotBy = null; p.lastPasser = null;

    for (const s of this.skaters) {
      const dir = this.attackDir(s.team);
      let px, py;
      if (s.slot === 0) {                 // centre takes the draw
        px = x - dir * 34; py = y;
      } else if (s.slot === 1) {          // winger
        px = x - dir * 118; py = y + (y >= 0 ? -160 : 160);
      } else {                            // defender
        px = x - dir * 230; py = y * 0.35 + (s.team === 0 ? -70 : 70);
      }
      s.x = clamp(px, -RINK.hw + 60, RINK.hw - 60);
      s.y = clamp(py, -RINK.hh + 60, RINK.hh - 60);
      s.vx = 0; s.vy = 0;
      s.face = dir > 0 ? 0 : Math.PI;
      s.stun = 0; s.down = 0; s.charge = 0; s.charging = false;
      s.puckCooldown = 0; s.celebrate = 0;
      s.turbo = Math.max(s.turbo, 0.55);
    }
    for (let t = 0; t < 2; t++) {
      const g = this.goalies[t];
      g.x = this.defendX(t) + this.attackDir(t) * 26;
      g.y = 0; g.vx = 0; g.vy = 0; g.lagY = 0; g.saveAnim = 0;
      this.control[t] = 0;
    }
  }

  /* ---------------------------------------------------------------- update */

  update(dt, inputs) {
    this.time += dt;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.particles.update(dt * 0.25);
      return;
    }

    // Decay HUD messages.
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].life -= dt;
      if (this.messages[i].life <= 0) this.messages.splice(i, 1);
    }

    this.phaseT += dt;

    switch (this.phase) {
      case 'faceoff': this.updateFaceoff(dt, inputs); break;
      case 'play': this.updatePlay(dt, inputs); break;
      case 'goal': this.updateGoal(dt); break;
      case 'intermission': this.updateIntermission(dt); break;
      case 'over': this.updateOver(dt); break;
    }

    this.particles.update(dt);
    this.updateScratches(dt);
    this.updateExcitement(dt);
  }

  updateFaceoff(dt, inputs) {
    // Skaters can shuffle a little but the puck is held until the drop.
    this.simulateBodies(dt, inputs, true);
    if (this.phaseT > 1.35) {
      this.phase = 'play';
      this.phaseT = 0;
      const p = this.puck;
      p.vx = rand(-40, 40);
      p.vy = rand(-40, 40);
      SFX.stickPuck(0.6);
      this.say('DROP THE PUCK', '', '#bfe9ff', 1.0);
    }
  }

  updatePlay(dt, inputs) {
    this.clock -= dt;
    this.simulateBodies(dt, inputs, false);
    this.updatePuck(dt);
    this.updateGoalies(dt);
    this.recordReplay();

    if (this.clock <= 0) {
      this.clock = 0;
      this.endPeriod();
    }
  }

  updateGoal(dt) {
    // Celebration: players keep skating, replay plays over the top.
    this.simulateBodies(dt, null, true);
    for (const s of this.skaters) s.celebrate = Math.max(0, s.celebrate - dt * 0);
    // Celebrate live first, then roll the replay.
    if (this.replay && this.phaseT > 1.7) {
      this.replay.started = true;
      this.replay.t += dt * this.replay.rate;
      if (this.replay.t >= this.replay.frames.length - 1) this.replay.done = true;
    }
    if (this.phaseT > 5.0) {
      this.replay = null;
      if (this.checkGameEnd()) return;
      this.setFaceoff(0, 0);
    }
  }

  updateIntermission(dt) {
    if (this.phaseT > 2.6) {
      if (this.checkGameEnd()) return;
      this.period++;
      this.clock = this.opts.periodLength;
      this.setFaceoff(0, 0);
      this.say(this.overtime ? 'OVERTIME' : `PERIOD ${this.period}`, 'FACE-OFF AT CENTRE ICE', '#ffe27a', 2.4);
      SFX.organ();
    }
  }

  updateOver(dt) {
    this.simulateBodies(dt, null, true);
  }

  endPeriod() {
    SFX.buzzer();
    this.phase = 'intermission';
    this.phaseT = 0;
    this.puck.carrier = null;
    this.say(this.overtime ? 'OVERTIME OVER' : `END OF PERIOD ${this.period}`,
      `${this.teams[0].abbr} ${this.score[0]} — ${this.score[1]} ${this.teams[1].abbr}`, '#ffffff', 2.6);
  }

  checkGameEnd() {
    const regEnd = this.period >= this.opts.periods && this.clock <= 0;
    if (this.overtime && this.score[0] !== this.score[1]) { this.finish(); return true; }
    if (regEnd) {
      if (this.score[0] === this.score[1]) {
        if (!this.overtime) {
          this.overtime = true;
          this.clock = 90;
          this.period = this.opts.periods;         // stays, label switches to OT
          this.setFaceoff(0, 0);
          this.say('OVERTIME', 'SUDDEN DEATH — NEXT GOAL WINS', '#ff5f4d', 3.0);
          SFX.organ();
          return true;
        }
        this.clock = 90;                            // keep playing OT
        this.setFaceoff(0, 0);
        return true;
      }
      this.finish();
      return true;
    }
    return false;
  }

  finish() {
    this.phase = 'over';
    this.phaseT = 0;
    this.winner = this.score[0] > this.score[1] ? 0 : 1;
    SFX.buzzer();
    const w = this.teams[this.winner];
    this.say('FINAL', `${w.city.toUpperCase()} WINS`, w.colors.primary, 5);
    for (let i = 0; i < 60; i++) {
      this.particles.confetti(rand(-RINK.hw, RINK.hw), rand(-RINK.hh, RINK.hh),
        [w.colors.primary, w.colors.secondary, w.colors.accent, '#ffffff']);
    }
  }

  /* --------------------------------------------------------------- bodies */

  simulateBodies(dt, inputs, restrained) {
    // Decide who each side controls.
    for (let t = 0; t < 2; t++) this.resolveControl(t);

    for (const s of this.skaters) {
      const humanSlot = this.opts.humans.indexOf(s.team);
      const isHuman = !this.opts.demo && humanSlot >= 0 && this.control[s.team] === s.slot;
      s.human = isHuman;
      if (isHuman && inputs) {
        s.input = inputs[humanSlot] || s.input;
      } else {
        this.aiThink(s, dt, restrained);
      }
      this.updateSkater(s, dt, restrained);
    }
    this.resolveSkaterCollisions(dt);
  }

  resolveControl(t) {
    const mates = this.teamSkaters(t);
    const carrier = this.puck.carrier;
    if (carrier && carrier.team === t) {
      this.control[t] = carrier.slot;
      return;
    }
    // Nearest upright skater to the puck (with a bias toward keeping the
    // current one so control doesn't strobe between two equidistant guys).
    let best = this.control[t], bestD = Infinity;
    for (const m of mates) {
      if (m.down > 0) continue;
      let d = dist(m.x, m.y, this.puck.x, this.puck.y);
      if (m.slot === this.control[t]) d *= 0.72;
      if (d < bestD) { bestD = d; best = m.slot; }
    }
    this.control[t] = best;
  }

  updateSkater(s, dt, restrained) {
    const inp = s.input;
    const carrying = this.puck.carrier === s;

    s.puckCooldown = Math.max(0, s.puckCooldown - dt);
    s.checkAnim = Math.max(0, s.checkAnim - dt);
    s.pokeAnim = Math.max(0, s.pokeAnim - dt);
    s.receiveWindow = Math.max(0, s.receiveWindow - dt);
    if (s.fire > 0) {
      s.fire -= dt;
      if (s.fire <= 0) { s.fire = 0; if (!this.opts.demo) this.say('COOLED OFF', `${s.data.short} IS NO LONGER ON FIRE`, '#8ecbff', 1.6); }
    }

    if (s.down > 0) {
      s.down -= dt;
      s.vx *= Math.exp(-3.2 * dt);
      s.vy *= Math.exp(-3.2 * dt);
      s.x += s.vx * dt; s.y += s.vy * dt;
      this.confine(s, SKATER_R, 0.4);
      this.netCollide(s, SKATER_R + 2);
      if (s.down <= 0) s.stun = 0.18;
      return;
    }
    if (s.stun > 0) s.stun -= dt;

    // ---- movement -------------------------------------------------------
    const wantTurbo = inp.turbo && (s.turbo > 0.02 || s.fire > 0);
    if (wantTurbo && inp.mag > 0.1) {
      if (s.fire <= 0) s.turbo = Math.max(0, s.turbo - dt * 0.44);
    } else {
      s.turbo = Math.min(1, s.turbo + dt * (inp.mag > 0.1 ? 0.16 : 0.34));
    }
    const turboMul = wantTurbo && inp.mag > 0.1 ? 1.42 : 1;

    let maxS = s.maxSpeed * turboMul * (carrying ? 0.955 : 1) * (s.human ? 1 : this.diff.speed);
    if (restrained) maxS *= 0.55;
    if (s.charging) maxS *= 0.72;
    if (s.stun > 0) maxS *= 0.4;

    const accel = (1500 + s.data.spd * 11) * (turboMul > 1 ? 1.35 : 1) * (s.stun > 0 ? 0.4 : 1);

    if (inp.mag > 0.08) {
      s.vx += inp.x * accel * dt;
      s.vy += inp.y * accel * dt;
      const desired = Math.atan2(inp.y, inp.x);
      s.face = angApproach(s.face, desired, dt * (7 + s.data.spd * 0.06));
    } else {
      s.vx *= Math.exp(-2.6 * dt);
      s.vy *= Math.exp(-2.6 * dt);
    }

    // Carve: bleed sideways velocity so skating feels like edges, not a hovercraft.
    const fx = Math.cos(s.face), fy = Math.sin(s.face);
    const along = s.vx * fx + s.vy * fy;
    let perpX = s.vx - along * fx, perpY = s.vy - along * fy;
    const carve = Math.exp(-6.5 * dt);
    perpX *= carve; perpY *= carve;
    s.vx = along * fx + perpX;
    s.vy = along * fy + perpY;

    const sp = Math.hypot(s.vx, s.vy);
    if (sp > maxS) { s.vx = s.vx / sp * maxS; s.vy = s.vy / sp * maxS; }

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    const bounce = this.confine(s, SKATER_R, 0.25);
    if (bounce && bounce.speed > 400) {
      SFX.boards();
      this.particles.snow(s.x, s.y, -bounce.nx, -bounce.ny, 1.2);
    }
    this.netCollide(s, SKATER_R + 2);

    // ---- animation & ice marks -----------------------------------------
    const spd = Math.hypot(s.vx, s.vy);
    s.skatePhase += dt * (2 + spd * 0.022);
    const turnRate = angDiff(Math.atan2(s.vy, s.vx) || 0, s.face);
    s.lean = damp(s.lean, clamp(-turnRate * 1.6, -0.55, 0.55), 8, dt);

    if (spd > 90) {
      this.scratches.push({ x: s.x, y: s.y, a: 0.5, r: 3 + spd * 0.004 });
      if (this.scratches.length > 900) this.scratches.shift();
    }
    // Spray when carving hard or braking.
    const slip = Math.hypot(perpX, perpY);
    if (slip > 120 && Math.random() < dt * 30) {
      this.particles.snow(s.x - fx * 12, s.y - fy * 12, -s.vx * 0.01, -s.vy * 0.01, clamp(slip / 260, 0.3, 1.6));
      if (Math.random() < 0.25) SFX.skate(clamp(slip / 400, 0.2, 1));
    }
    if (turboMul > 1 && Math.random() < dt * 26) {
      this.particles.snow(s.x - fx * 16, s.y - fy * 16, -fx, -fy, 0.8);
    }
    if (s.fire > 0 && Math.random() < dt * 45) {
      this.particles.flame(s.x - fx * 12 + rand(-8, 8), s.y - fy * 12 + rand(-8, 8), -s.vx * 0.12, -s.vy * 0.12);
    }

    // ---- actions --------------------------------------------------------
    if (restrained) { s.charging = false; s.charge = 0; return; }

    if (carrying) {
      // Shooting: hold to load up.
      if (inp.shoot) {
        s.charging = true;
        s.charge = Math.min(1, s.charge + dt / 0.62);
      } else if (s.charging) {
        this.shoot(s, s.charge, inp);
        s.charging = false;
        s.charge = 0;
      }
      if (inp.pass) this.pass(s, inp);
      if (inp.check) this.spinMove(s);
    } else {
      s.charging = false; s.charge = 0;
      if (inp.check) this.checkAttempt(s);
      // One-timer / catch-and-shoot.
      if (inp.shootHit) this.tryOneTimer(s, inp);
    }
  }

  resolveSkaterCollisions(dt) {
    for (let i = 0; i < this.skaters.length; i++) {
      for (let j = i + 1; j < this.skaters.length; j++) {
        const a = this.skaters[i], b = this.skaters[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = SKATER_R * 2;
        if (d >= min) continue;
        const nx = dx / d, ny = dy / d;
        const overlap = min - d;
        const aDown = a.down > 0, bDown = b.down > 0;
        const wa = aDown ? 0.15 : 1, wb = bDown ? 0.15 : 1;
        const tot = wa + wb;
        a.x -= nx * overlap * (wb / tot); a.y -= ny * overlap * (wb / tot);
        b.x += nx * overlap * (wa / tot); b.y += ny * overlap * (wa / tot);

        // Relative closing speed along the normal.
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const closing = -(rvx * nx + rvy * ny);
        if (closing > 0) {
          const imp = closing * 0.55;
          a.vx -= nx * imp * (wb / tot); a.vy -= ny * imp * (wb / tot);
          b.vx += nx * imp * (wa / tot); b.vy += ny * imp * (wa / tot);
        }
        const wantsContact = a.checkAnim > 0 || b.checkAnim > 0;
        if (a.team !== b.team && !aDown && !bDown &&
          (wantsContact ? closing > 150 : closing > 430)) {
          // Whoever is driving through the contact (and is checking) lays the hit.
          const aDrive = (a.vx * nx + a.vy * ny) + (a.checkAnim > 0 ? 260 : 0) + a.data.chk * 1.2;
          const bDrive = (-b.vx * nx - b.vy * ny) + (b.checkAnim > 0 ? 260 : 0) + b.data.chk * 1.2;
          const hitter = aDrive > bDrive ? a : b;
          const victim = hitter === a ? b : a;
          const power = clamp((closing + Math.max(aDrive, bDrive) * 0.35) / 620, 0, 1.6);
          if (power > 0.55 || hitter.checkAnim > 0) this.landHit(hitter, victim, power, nx, ny);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- hits  */

  landHit(hitter, victim, power, nx, ny) {
    if (victim.down > 0 || victim.stun > 0.2) return;
    const s = hitter.data.chk / Math.max(50, victim.data.chk);
    const strength = clamp(power * s, 0.35, 2.1);
    const away = Math.atan2(victim.y - hitter.y, victim.x - hitter.x);
    const push = 260 + strength * 340;
    victim.vx += Math.cos(away) * push;
    victim.vy += Math.sin(away) * push;
    victim.down = clamp(0.55 + strength * 0.55, 0.5, 1.5);
    victim.charging = false; victim.charge = 0;
    hitter.vx *= 0.55; hitter.vy *= 0.55;
    hitter.stats.hits++;
    this.hits[hitter.team]++;

    if (this.puck.carrier === victim) {
      this.releasePuck(victim, Math.cos(away) * 250 + victim.vx * 0.4, Math.sin(away) * 250 + victim.vy * 0.4);
      victim.puckCooldown = 0.55;
    }

    const big = strength > 0.9;
    this.addMeter(hitter.team, big ? 0.2 : 0.11);
    this.addMeter(victim.team, 0.06);
    SFX.bigHit(clamp(strength, 0.5, 1.4));
    this.particles.shock(victim.x, victim.y, 34 + strength * 46, '#ffffff', 6, 0.4);
    this.particles.snow(victim.x, victim.y, Math.cos(away), Math.sin(away), 1.8);
    this.particles.spark(victim.x, victim.y, big ? 16 : 8, '#fff2b0', 300);
    this.cameraShake = (this.cameraShake || 0) + strength * 16;
    this.hitStop = big ? 0.085 : 0.04;
    this.excitement = Math.min(1, this.excitement + strength * 0.32);

    if (big) {
      const words = ['BIG HIT!', 'CRUNCH!', 'DEMOLISHED!', 'BOOM!', 'RUN OVER!', 'FLATTENED!'];
      this.particles.floatText(victim.x, victim.y - 40, pick(words), '#ffd44f', 34);
      if (strength > 1.15 && this.time - (this._lastHitCall || -9) > 3.5) {
        this._lastHitCall = this.time;
        this.say(`${hitter.data.short} LEVELS ${victim.data.short}`, 'BODY CHECK',
          this.teams[hitter.team].colors.primary, 1.8);
      }
    }
  }

  checkAttempt(s) {
    if (s.stun > 0 || s.down > 0) return;
    s.checkAnim = 0.32;
    const fx = Math.cos(s.face), fy = Math.sin(s.face);
    // Poke check at the puck itself (in front of the stick).
    const px = s.x + fx * 40, py = s.y + fy * 40;
    const carrier = this.puck.carrier;
    if (carrier && carrier.team !== s.team) {
      const d = dist(px, py, carrier.x, carrier.y);
      if (d < 52) {
        const odds = 0.35 + (s.data.chk - carrier.data.hnd) / 220 + (s.human ? 0.12 : 0);
        s.pokeAnim = 0.25;
        if (Math.random() < clamp(odds, 0.12, 0.8)) {
          const a = Math.atan2(this.puck.y - s.y, this.puck.x - s.x) + rand(-0.6, 0.6);
          this.releasePuck(carrier, Math.cos(a) * 320, Math.sin(a) * 320);
          carrier.puckCooldown = 0.32;
          s.puckCooldown = 0.06;
          SFX.stickPuck(1);
          this.particles.spark(px, py, 7, '#cfeaff', 240);
          this.particles.floatText(s.x, s.y - 36, 'POKE CHECK', '#bfe9ff', 22);
          this.addMeter(s.team, 0.08);
        }
        return;
      }
    }
    // Otherwise it's a hustle/shoulder-lead: small burst of speed into contact.
    s.vx += fx * 190; s.vy += fy * 190;
    // Free puck within reach? Sweep it.
    if (!this.puck.carrier && dist(px, py, this.puck.x, this.puck.y) < 48 && s.puckCooldown <= 0) {
      this.puck.vx += fx * 260; this.puck.vy += fy * 260;
      SFX.stickPuck(0.7);
    }
  }

  spinMove(s) {
    if (s.stun > 0 || s.aiJuke > 0) return;
    s.aiJuke = 0.5;
    s.face += (Math.random() < 0.5 ? 1 : -1) * 0.9;
    const fx = Math.cos(s.face), fy = Math.sin(s.face);
    s.vx += fx * 220; s.vy += fy * 220;
    s.puckCooldown = 0;
    this.particles.snow(s.x, s.y, -fx, -fy, 1.4);
    SFX.skate(0.9);
  }

  /* --------------------------------------------------------------- puck   */

  releasePuck(from, vx, vy) {
    const p = this.puck;
    if (p.carrier === from) p.carrier = null;
    p.x = from.x + Math.cos(from.face) * 26;
    p.y = from.y + Math.sin(from.face) * 26;
    p.vx = vx; p.vy = vy;
    p.airtime = 0;
  }

  shoot(s, charge, inp) {
    const p = this.puck;
    if (p.carrier !== s) return;
    const net = { x: this.attackX(s.team), y: 0 };
    const dNet = dist(s.x, s.y, net.x, net.y);

    // Aim at a corner. Hold up/down to pick one; otherwise go to the side
    // the goalie isn't on.
    const gk = this.goalies[1 - s.team];
    const corner = RINK.goalHalf - 11;
    let aimY;
    if (inp && Math.abs(inp.y) > 0.3) {
      aimY = clamp(inp.y, -1, 1) * corner;
    } else if (s.human) {
      aimY = -Math.sign(gk.y || (Math.random() < 0.5 ? 1 : -1)) * corner * 0.55;
    } else {
      aimY = -Math.sign(gk.y || (Math.random() < 0.5 ? 1 : -1)) * corner * rand(1, 0.5);
    }
    let ang = Math.atan2(net.y + aimY - s.y, net.x - s.x);

    // Facing away from the net? Then it's a shot the way you're pointed.
    const facingOff = Math.abs(angDiff(s.face, ang));
    if (facingOff > 2.0) ang = s.face;
    else ang = angApproach(ang, s.face, 0.12);

    if (!s.human) ang += rand(-1, 1) * this.diff.aim * (dNet / 900) * 0.25;
    else ang += rand(-1, 1) * 0.02 * (1 - s.data.sht / 130);

    const superShot = charge > 0.92 && this.meter[s.team] >= 1 && (inp && inp.turbo);
    let power = 820 + charge * 880 + s.data.sht * 4.6;
    if (s.fire > 0) power *= 1.18;
    if (superShot) power *= 1.35;

    p.carrier = null;
    p.x = s.x + Math.cos(s.face) * 28;
    p.y = s.y + Math.sin(s.face) * 28;
    p.vx = Math.cos(ang) * power + s.vx * 0.25;
    p.vy = Math.sin(ang) * power + s.vy * 0.25;
    p.shotBy = s;
    p.shotPower = charge;
    p.lastTouch = s;
    p.airtime = 0;
    p.hot = superShot ? 1 : 0;
    s.puckCooldown = 0.28;
    s.stats.sog++;
    this.shots[s.team]++;

    if (superShot) {
      this.meter[s.team] = 0;
      SFX.superShot();
      this.hitStop = 0.1;
      this.cameraShake = (this.cameraShake || 0) + 16;
      this.particles.shock(p.x, p.y, 90, '#ff8a1e', 9, 0.5);
      this.particles.spark(p.x, p.y, 26, '#ffd76a', 480);
      this.particles.floatText(s.x, s.y - 48, 'SUPER SHOT!', '#ff8a1e', 40);
      this.say(`${s.data.short} UNLOADS`, 'SUPER SHOT', '#ff8a1e', 1.8);
    } else if (charge > 0.72) {
      SFX.slapshot();
      this.particles.snow(p.x, p.y, -Math.cos(ang), -Math.sin(ang), 1.2);
      this.particles.spark(p.x, p.y, 8, '#ffffff', 220);
      this.cameraShake = (this.cameraShake || 0) + 5;
    } else {
      SFX.shot(0.6 + charge * 0.5);
    }
    this.excitement = Math.min(1, this.excitement + 0.25 + charge * 0.2);
  }

  pass(s, inp) {
    const p = this.puck;
    if (p.carrier !== s) return;
    const mates = this.teamSkaters(s.team).filter((m) => m !== s && m.down <= 0);
    if (!mates.length) return;

    // Prefer the mate the stick is pointing at, then the most advanced one.
    let best = null, bestScore = -Infinity;
    const dirX = inp && inp.mag > 0.3 ? inp.x : Math.cos(s.face);
    const dirY = inp && inp.mag > 0.3 ? inp.y : Math.sin(s.face);
    for (const m of mates) {
      const dx = m.x - s.x, dy = m.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const dot = (dx / d) * dirX + (dy / d) * dirY;
      const advance = (m.x - s.x) * this.attackDir(s.team) / 800;
      let score = dot * 2.2 + advance - d / 1400;
      // Penalise passes through an opponent.
      for (const o of this.teamSkaters(1 - s.team)) {
        const t = clamp(((o.x - s.x) * dx + (o.y - s.y) * dy) / (d * d), 0, 1);
        const cx = s.x + dx * t, cy = s.y + dy * t;
        if (dist(cx, cy, o.x, o.y) < 42) score -= 1.4;
      }
      if (score > bestScore) { bestScore = score; best = m; }
    }
    if (!best) return;

    const lead = clamp(dist(s.x, s.y, best.x, best.y) / 900, 0, 0.35);
    const tx = best.x + best.vx * lead, ty = best.y + best.vy * lead;
    const ang = Math.atan2(ty - s.y, tx - s.x) + rand(-1, 1) * (1 - s.data.pss / 110) * 0.06;
    const speed = 900 + s.data.pss * 4.6;

    p.carrier = null;
    p.x = s.x + Math.cos(s.face) * 26;
    p.y = s.y + Math.sin(s.face) * 26;
    p.vx = Math.cos(ang) * speed;
    p.vy = Math.sin(ang) * speed;
    p.lastPasser = s;
    p.passAssistTimer = 2.4;
    p.lastTouch = s;
    p.shotBy = null;
    p.hot = 0;
    s.puckCooldown = 0.22;
    best.receiveWindow = 0.9;
    SFX.pass();
    this.particles.spark(p.x, p.y, 4, '#dff3ff', 160);
  }

  tryOneTimer(s, inp) {
    const p = this.puck;
    if (p.carrier || s.puckCooldown > 0 || s.down > 0) return;
    const d = dist(s.x, s.y, p.x, p.y);
    if (d > 150) return;
    // Puck must be travelling roughly toward this skater.
    const toX = (s.x - p.x) / (d || 1), toY = (s.y - p.y) / (d || 1);
    const closing = p.vx * toX + p.vy * toY;
    if (closing < 250) return;
    s.receiveWindow = Math.max(s.receiveWindow, 0.35);
    s.oneTimerArmed = 0.35;
  }

  /** Called when the puck reaches a skater who has a one-timer armed. */
  fireOneTimer(s) {
    const p = this.puck;
    const net = { x: this.attackX(s.team), y: 0 };
    let ang = Math.atan2(net.y - s.y, net.x - s.x);
    if (!s.human) ang += rand(-1, 1) * this.diff.aim * 0.5;
    const power = (1180 + s.data.sht * 5.2) * (s.fire > 0 ? 1.16 : 1);
    p.carrier = null;
    p.x = s.x + Math.cos(ang) * 26;
    p.y = s.y + Math.sin(ang) * 26;
    p.vx = Math.cos(ang) * power;
    p.vy = Math.sin(ang) * power;
    p.shotBy = s;
    p.shotPower = 1;
    p.lastTouch = s;
    s.puckCooldown = 0.3;
    s.oneTimerArmed = 0;
    s.stats.sog++;
    this.shots[s.team]++;
    SFX.slapshot();
    this.particles.shock(p.x, p.y, 54, '#ffffff', 6, 0.35);
    this.particles.floatText(s.x, s.y - 44, 'ONE-TIMER!', '#ffe27a', 30);
    this.addMeter(s.team, 0.12);
    this.cameraShake = (this.cameraShake || 0) + 8;
    this.excitement = Math.min(1, this.excitement + 0.35);
  }

  updatePuck(dt) {
    const p = this.puck;
    p.passAssistTimer = Math.max(0, p.passAssistTimer - dt);

    if (p.carrier) {
      const c = p.carrier;
      // Puck rides just off the stick blade, weaving with the skating cycle.
      const weave = Math.sin(c.skatePhase * 1.6) * (c.charging ? 2 : 9) * (1 - c.data.hnd / 200);
      const reach = c.charging ? 34 : 30;
      const ang = c.face + weave * 0.02;
      const tx = c.x + Math.cos(ang) * reach + Math.cos(ang + Math.PI / 2) * weave;
      const ty = c.y + Math.sin(ang) * reach + Math.sin(ang + Math.PI / 2) * weave;
      p.x = damp(p.x, tx, 26, dt);
      p.y = damp(p.y, ty, 26, dt);
      p.vx = c.vx; p.vy = c.vy;
      p.spin += dt * 6;
      this.pushTrail(p);
      if (c.fire > 0 && Math.random() < dt * 40) this.particles.flame(p.x, p.y, -c.vx * 0.1, -c.vy * 0.1, '#ff5e1e');
      if (p.hot > 0 && Math.random() < dt * 30) this.particles.flame(p.x, p.y, 0, 0, '#ffb400');
      return;
    }

    p.airtime += dt;
    const sp0 = p.speed;
    // Ice friction — very low, plus a touch more at crawl speeds.
    const fr = Math.exp(-(0.42 + (sp0 < 140 ? 1.4 : 0)) * dt);
    p.vx *= fr; p.vy *= fr;
    p.spin += sp0 * dt * 0.02;

    // Substep so a 2000 u/s slapshot can't tunnel through a goalie or a post.
    const steps = clamp(Math.ceil(sp0 * dt / 9), 1, 12);
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const prevX = p.x, prevY = p.y;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      if (this.puckGoalCheck(prevX, prevY)) return;
      this.puckPostCheck();
      this.netCollidePuck(prevX, prevY);
      const b = this.confine(p, PUCK_R, 0.72);
      if (b && b.speed > 260) {
        SFX.boards();
        this.particles.spark(p.x, p.y, 5, '#dfefff', 150);
        this.particles.snow(p.x, p.y, b.nx, b.ny, 0.6);
      }
      if (this.puckGoalieCheck(sdt)) break;
      if (this.puckSkaterCheck(sdt)) break;
    }
    this.pushTrail(p);
    if (p.hot > 0) {
      p.hot = Math.max(0, p.hot - dt * 0.5);
      if (Math.random() < dt * 60) this.particles.flame(p.x, p.y, -p.vx * 0.05, -p.vy * 0.05, '#ffae00');
    }
  }

  pushTrail(p) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 16) p.trail.shift();
  }

  puckSkaterCheck() {
    const p = this.puck;
    let taken = false;
    for (const s of this.skaters) {
      if (s.down > 0 || s.puckCooldown > 0) continue;
      const fx = Math.cos(s.face), fy = Math.sin(s.face);
      const bodyD = dist(s.x, s.y, p.x, p.y);
      const rel = Math.hypot(p.vx - s.vx, p.vy - s.vy);

      // A rocket only gets stopped by a body in the way — a shot block.
      if (rel > 850) {
        if (bodyD > SKATER_R + PUCK_R + 4) continue;
        const a = Math.atan2(p.y - s.y, p.x - s.x) + rand(-0.5, 0.5);
        const m = Math.max(240, rel * 0.4);
        p.vx = Math.cos(a) * m; p.vy = Math.sin(a) * m;
        p.shotBy = null;
        p.hot = 0;
        s.puckCooldown = 0.18;
        SFX.stickPuck(0.8);
        this.particles.spark(p.x, p.y, 6, '#dfefff', 200);
        if (s.team !== (p.lastTouch ? p.lastTouch.team : s.team)) {
          this.particles.floatText(s.x, s.y - 40, 'BLOCKED!', '#bfe9ff', 22);
        }
        continue;
      }

      // Otherwise: stick reach — a disc around the body plus the blade in front.
      const bladeD = dist(s.x + fx * 32, s.y + fy * 32, p.x, p.y);
      const reach = 28 + s.data.hnd * 0.09 + (s.receiveWindow > 0 ? 14 : 0);
      if (bodyD > reach + 16 && bladeD > reach) continue;

      const controlOdds = clamp(1.15 - rel / 900 + s.data.hnd / 450 + (s.receiveWindow > 0 ? 0.45 : 0), 0.1, 1);
      if (Math.random() > controlOdds) {
        // Bobbled — the puck squirts away.
        const a = Math.atan2(p.y - s.y, p.x - s.x) + rand(-0.8, 0.8);
        const m = Math.max(200, rel * 0.5);
        p.vx = Math.cos(a) * m; p.vy = Math.sin(a) * m;
        p.shotBy = p.shotBy && p.shotBy.team === s.team ? p.shotBy : null;
        SFX.stickPuck(0.5);
        s.puckCooldown = 0.14;
        continue;
      }

      if (s.oneTimerArmed > 0 && s.receiveWindow > 0) { this.fireOneTimer(s); return true; }

      // Assist bookkeeping.
      const tapeToTape = p.lastPasser && p.lastPasser.team === s.team &&
        p.passAssistTimer > 0 && p.lastPasser !== s;
      s.lastPassFrom = tapeToTape ? p.lastPasser.slot : -1;
      if (tapeToTape) this.addMeter(s.team, 0.06);
      const stolen = p.lastTouch && p.lastTouch.team !== s.team;
      p.carrier = s;
      p.lastTouch = s;
      p.shotBy = null;
      p.hot = 0;
      s.receiveWindow = 0;
      s.oneTimerArmed = 0;
      SFX.stickPuck(0.5);
      if (stolen) this.addMeter(s.team, 0.05);
      taken = true;
      break;
    }
    return taken;
  }

  puckGoalieCheck(dt) {
    const p = this.puck;
    for (let t = 0; t < 2; t++) {
      const g = this.goalies[t];
      // Goalie hitbox: an ellipse wider across the goal mouth than deep.
      // He covers roughly half the mouth — the rest you have to hit.
      const dx = (p.x - g.x) / (21 + (p.hot > 0 ? -6 : 0));
      const dy = (p.y - g.y) / (16.5 * (0.9 + g.data.pos / 500) + (g.lunge > 0 ? 7 : 0));
      if (dx * dx + dy * dy > 1) continue;
      // Puck heading away? Ignore (already past him).
      const away = (p.x - g.x) * this.attackDir(1 - t);
      const speed = p.speed;

      const rebound = clamp(1 - g.data.rec / 180, 0.18, 0.6);
      const outDir = this.attackDir(1 - t);
      let a = Math.atan2(p.y - g.y, p.x - g.x);
      if (Math.cos(a) * outDir < 0) a = Math.atan2(p.y - g.y, outDir);
      const m = clamp(speed * rebound, 150, 620);
      p.x = g.x + Math.cos(a) * 34;
      p.y = g.y + Math.sin(a) * 40;
      p.vx = Math.cos(a) * m + rand(-60, 60);
      p.vy = Math.sin(a) * m + rand(-60, 60);
      p.shotBy = null;
      p.hot = 0;
      g.saveAnim = 0.45;
      g.stats.saves++;
      SFX.save();
      this.particles.snow(p.x, p.y, Math.cos(a), Math.sin(a), 1.2);
      if (speed > 1100) {
        this.particles.floatText(g.x, g.y - 50, 'BIG SAVE!', '#bfe9ff', 28);
        this.addMeter(t, 0.14);
        this.excitement = Math.min(1, this.excitement + 0.3);
        this.cameraShake = (this.cameraShake || 0) + 6;
        this.say(`${g.data.short} ROBS THEM`, 'WHAT A SAVE', '#bfe9ff', 1.6);
      } else {
        this.addMeter(t, 0.05);
      }
      // Cover the puck if it's dead in the crease.
      if (m < 200 && Math.random() < 0.35) this.freezePuck(t);
      return true;
    }
    return false;
  }

  freezePuck(t) {
    SFX.whistle();
    this.say('WHISTLE', 'GOALIE COVERS IT UP', '#ffffff', 1.5);
    const side = this.defendX(t);
    const dot = { x: side + this.attackDir(t) * (RINK.goalLine - RINK.dotX), y: this.puck.y > 0 ? RINK.dotY : -RINK.dotY };
    this.setFaceoff(clamp(dot.x, -RINK.dotX, RINK.dotX), dot.y);
  }

  puckPostCheck() {
    const p = this.puck;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const px = sx * RINK.goalLine, py = sy * RINK.goalHalf;
        const d = dist(p.x, p.y, px, py);
        if (d < PUCK_R + 5) {
          const nx = (p.x - px) / (d || 1), ny = (p.y - py) / (d || 1);
          p.x = px + nx * (PUCK_R + 5);
          p.y = py + ny * (PUCK_R + 5);
          const dot = p.vx * nx + p.vy * ny;
          p.vx = (p.vx - 2 * dot * nx) * 0.82;
          p.vy = (p.vy - 2 * dot * ny) * 0.82;
          SFX.post();
          this.particles.spark(px, py, 12, '#ffe9a8', 300);
          this.particles.floatText(px, py - 40, 'POST!', '#ffe27a', 26);
          this.cameraShake = (this.cameraShake || 0) + 7;
          this.excitement = Math.min(1, this.excitement + 0.35);
        }
      }
    }
  }

  /** The cage is solid everywhere except straight through the mouth. */
  netCollidePuck() {
    const p = this.puck;
    if (Math.abs(p.y) < RINK.goalHalf - 4) return;      // lined up with the open mouth
    for (const s of [-1, 1]) {
      const loX = Math.min(s * RINK.goalLine, s * (RINK.goalLine + RINK.netDepth)) - PUCK_R;
      const hiX = Math.max(s * RINK.goalLine, s * (RINK.goalLine + RINK.netDepth)) + PUCK_R;
      const hiY = RINK.goalHalf + 5 + PUCK_R, loY = -hiY;
      if (p.x < loX || p.x > hiX || p.y < loY || p.y > hiY) continue;
      const dLo = p.x - loX, dHi = hiX - p.x, dT = p.y - loY, dB = hiY - p.y;
      const m = Math.min(dLo, dHi, dT, dB);
      if (m === dT) { p.y = loY; p.vy = -Math.abs(p.vy) * 0.5; }
      else if (m === dB) { p.y = hiY; p.vy = Math.abs(p.vy) * 0.5; }
      else if (m === dLo) { p.x = loX; p.vx = -Math.abs(p.vx) * 0.45; }
      else { p.x = hiX; p.vx = Math.abs(p.vx) * 0.45; }
    }
  }

  puckGoalCheck(prevX) {
    const p = this.puck;
    for (const s of [-1, 1]) {
      const line = s * RINK.goalLine;
      const crossed = s > 0 ? (prevX <= line && p.x > line) : (prevX >= line && p.x < line);
      if (!crossed) continue;
      if (Math.abs(p.y) > RINK.goalHalf - 6) continue;
      const scoringTeam = s > 0 ? 0 : 1;   // team 0 attacks +x
      this.scoreGoal(scoringTeam);
      return true;
    }
    return false;
  }

  /* --------------------------------------------------------------- goals  */

  scoreGoal(team) {
    const p = this.puck;
    const scorer = (p.shotBy && p.shotBy.team === team) ? p.shotBy
      : (p.lastTouch && p.lastTouch.team === team ? p.lastTouch : this.teamSkaters(team)[0]);
    const assist = (p.lastPasser && p.lastPasser.team === team && p.lastPasser !== scorer && p.passAssistTimer > 0)
      ? p.lastPasser : null;

    this.score[team]++;
    scorer.stats.g++;
    if (assist) assist.stats.a++;
    this.goalies[1 - team].stats.ga++;

    // Scoring streak → ON FIRE.
    if (this.lastScorer[team] === scorer) this.streak[team]++;
    else { this.streak[team] = 1; this.lastScorer[team] = scorer; }
    this.lastScorer[1 - team] = null;
    this.streak[1 - team] = 0;
    for (const s of this.teamSkaters(1 - team)) s.fire = 0;

    let fireNow = false;
    if (this.streak[team] >= 2 && scorer.fire <= 0) {
      scorer.fire = 40;
      fireNow = true;
      SFX.fire();
    } else if (scorer.fire > 0) {
      scorer.fire = Math.min(60, scorer.fire + 18);
    }

    this.phase = 'goal';
    this.phaseT = 0;
    this.lastGoalTime = this.time;
    p.carrier = null;
    p.vx *= 0.2; p.vy *= 0.2;
    this.excitement = 1;
    this.cameraShake = (this.cameraShake || 0) + 26;
    this.hitStop = 0.14;
    this.meter[team] = clamp(this.meter[team] + 0.25, 0, 1);

    SFX.goalHorn();
    setTimeout(() => SFX.organ(), 900);

    const tc = this.teams[team].colors;
    for (let i = 0; i < 22; i++) {
      this.particles.confetti(this.attackX(team) + rand(-70, 70), rand(-140, 140),
        [tc.primary, tc.secondary, tc.accent, '#ffffff']);
    }
    this.particles.shock(this.attackX(team), 0, 200, tc.primary, 12, 0.7);
    this.particles.spark(this.attackX(team), p.y, 34, '#ffffff', 520);

    this.goalInfo = {
      team, scorer, assist, fireNow,
      time: this.clockString(),
      period: this.periodLabel(),
    };
    this.say('GOAL!', `${scorer.data.name.toUpperCase()}${assist ? '  (' + assist.data.short + ')' : ''}`, tc.primary, 4.2);

    for (const s of this.teamSkaters(team)) s.celebrate = 4;

    // Start the replay from the recorded buffer.
    if (this.replayBuf.length > 40) {
      this.replay = {
        frames: this.replayBuf.slice(Math.max(0, this.replayBuf.length - 150)),
        t: 0, rate: 34, done: false,
      };
    }
    this.replayBuf = [];
  }

  /* ------------------------------------------------------------- goalies  */

  updateGoalies(dt) {
    const p = this.puck;
    for (let t = 0; t < 2; t++) {
      const g = this.goalies[t];
      const gl = this.defendX(t);
      const outDir = this.attackDir(t);       // toward centre ice
      g.saveAnim = Math.max(0, g.saveAnim - dt);
      g.lunge = Math.max(0, g.lunge - dt);
      g.poseT += dt;

      const skill = (g.data.ref / 100) * this.diff.goalie;

      // A live shot is in flight. Until his reaction time is up he is frozen
      // on the read he had at release — this is what makes corners scoreable.
      const shotLive = !p.carrier && p.shotBy && p.shotBy.team !== t && p.speed > 620 &&
        Math.sign(p.x - gl) === Math.sign(outDir);
      const reactionTime = clamp(0.30 - skill * 0.13, 0.10, 0.34);
      const reacted = !shotLive || p.airtime > reactionTime;

      // Lagged tracking — better goalies read the play sooner.
      if (reacted) {
        const lag = clamp(9 + skill * 13, 6, 24);
        g.lagX = damp(g.lagX, p.x, lag, dt);
        g.lagY = damp(g.lagY, p.y, lag, dt);
      }

      const dToNet = Math.abs(p.x - gl);
      // Challenge the shooter: come out for distant plays, hug the line up close.
      let depth = clamp(16 + dToNet * 0.055, 14, 62);
      if (dToNet > 700) depth = 20;
      const behindNet = Math.abs(p.x) > RINK.goalLine && Math.sign(p.x) === Math.sign(gl);
      if (behindNet) depth = 8;

      const ang = Math.atan2(g.lagY, g.lagX - gl);
      let tx = gl + Math.cos(ang) * depth * (Math.abs(Math.cos(ang)) > 0.2 ? 1 : 1);
      let ty = Math.sin(ang) * depth;
      // Keep him inside the mouth, and biased to the puck's side.
      ty = clamp(ty + g.lagY * 0.16, -42, 42);
      tx = gl + outDir * clamp(Math.abs(tx - gl), 8, 66);

      // Desperation: once he's reacted, drive at the intercept point.
      const inbound = reacted && !p.carrier && p.speed > 620 && (p.vx * outDir < 0) &&
        Math.sign(p.x - gl) === Math.sign(outDir) && dToNet < 900;
      if (inbound) {
        const tTo = Math.abs((gl - p.x) / (p.vx || 1));
        const iy = p.y + p.vy * tTo + rand(-1, 1) * (1 - skill) * 34;
        if (Math.abs(iy) < 90) {
          ty = clamp(lerp(ty, iy, clamp(skill, 0.5, 1)), -46, 46);
          tx = gl + outDir * 16;
          if (Math.abs(iy - g.y) > 22) g.lunge = 0.22;
        }
      } else if (!reacted) {
        // Frozen mid-read: hold the stance, no cheating toward the corner.
        ty = g.y; tx = g.x;
      }

      // Deliberately slow: a goalie cannot slide the width of the crease in
      // the time a slapshot takes to arrive.
      const gspeed = (140 + g.data.ref * 2.4) * this.diff.goalie * (g.lunge > 0 ? 1.7 : 1);
      const dx = tx - g.x, dy = ty - g.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = Math.min(d, gspeed * dt);
      g.vx = (dx / d) * step / dt;
      g.vy = (dy / d) * step / dt;
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
      g.face = Math.atan2(p.y - g.y, p.x - g.x);

      if (Math.abs(g.vy) > 200 && Math.random() < dt * 22) {
        this.particles.snow(g.x, g.y + 16, 0, Math.sign(g.vy), 0.5);
      }

      // Poke check anything loose in the blue paint.
      if (!p.carrier && dist(p.x, p.y, g.x, g.y) < 52 && p.speed < 260) {
        const a = Math.atan2(p.y - g.y, p.x - g.x + outDir * 20);
        p.vx = Math.cos(a) * 420; p.vy = Math.sin(a) * 420;
        SFX.stickPuck(0.6);
      }
      // Shove skaters out of the crease.
      for (const s of this.skaters) {
        const dd = dist(s.x, s.y, g.x, g.y);
        if (dd < SKATER_R + 22) {
          const nx = (s.x - g.x) / (dd || 1), ny = (s.y - g.y) / (dd || 1);
          s.x = g.x + nx * (SKATER_R + 22);
          s.y = g.y + ny * (SKATER_R + 22);
          s.vx += nx * 40; s.vy += ny * 40;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ AI  */

  aiThink(s, dt, restrained) {
    const inp = s.input;
    s.think -= dt;
    s.aiJuke = Math.max(0, s.aiJuke - dt);

    if (s.down > 0) { inp.x = 0; inp.y = 0; inp.mag = 0; inp.shoot = false; inp.pass = false; inp.check = false; inp.turbo = false; return; }

    const p = this.puck;
    const mates = this.teamSkaters(s.team).filter((m) => m !== s);
    const foes = this.teamSkaters(1 - s.team);
    const netX = this.attackX(s.team);
    const dir = this.attackDir(s.team);
    const carrier = p.carrier;
    const iHave = carrier === s;
    const weHave = carrier && carrier.team === s.team;

    if (restrained) {
      // Line up for the draw.
      const target = this.faceoffLineup(s);
      this.steerTo(s, target.x, target.y, 0.55);
      inp.shoot = false; inp.pass = false; inp.check = false; inp.turbo = false;
      return;
    }

    if (s.think <= 0) {
      s.think = this.diff.react * rand(1.3, 0.7);
      this.aiDecide(s, { p, mates, foes, netX, dir, iHave, weHave, carrier });
    }

    // Continuous steering toward the current plan.
    const t = s.aiTarget;
    let urgency = s.aiUrgency || 1;
    this.steerTo(s, t.x, t.y, urgency);

    // Turbo when it matters and the tank allows.
    const far = dist(s.x, s.y, t.x, t.y);
    inp.turbo = (s.fire > 0 || s.turbo > 0.3) && (far > 150) &&
      (s.aiState === 'chase' || s.aiState === 'rush' || s.aiState === 'pressure' || s.aiState === 'backcheck');

    // Shooting is handled as a charge-and-release.
    if (iHave) {
      const dNet = dist(s.x, s.y, netX, 0);
      const pressure = Math.min(...foes.map((f) => dist(f.x, f.y, s.x, s.y)));
      const lane = this.laneClear(s, netX, 0);
      const wantShot = (dNet < 460 && lane > 0.5 || dNet < 270) && Math.abs(s.y) < 320;
      if (wantShot) {
        s.chargeGoal = s.chargeGoal || (dNet > 330 ? rand(0.95, 0.55) : rand(0.5, 0.15));
        inp.shoot = true;
        // Square up to the net while loading — otherwise the shot sails wide.
        s.aiTarget.x = netX; s.aiTarget.y = clamp(s.y * 0.4, -60, 60);
        if (s.charge >= s.chargeGoal || pressure < 46) { inp.shoot = false; s.chargeGoal = 0; }
      } else {
        inp.shoot = false; s.chargeGoal = 0;
      }
      // Pass out of trouble or to a better look.
      inp.pass = false;
      if (!wantShot && pressure < 120 && Math.random() < dt * 4.2 * this.diff.aggro) {
        const open = mates.find((m) => {
          if (m.down > 0) return false;
          const better = (m.x - s.x) * dir > -40;
          return better && this.laneClear(s, m.x, m.y) > 0.55;
        });
        if (open) inp.pass = true;
      }
      inp.check = pressure < 40 && Math.random() < dt * 1.6 ? true : false;  // spin move
    } else {
      inp.shoot = false; inp.pass = false;
      // Check / poke when close to the puck carrier.
      const target = carrier && carrier.team !== s.team ? carrier : null;
      if (target) {
        const d = dist(s.x, s.y, target.x, target.y);
        if (d < 70 && Math.random() < dt * 1.6 * this.diff.aggro) inp.check = true;
        else inp.check = false;
      } else if (!carrier && dist(s.x, s.y, p.x, p.y) < 60 && Math.random() < dt * 2) {
        inp.check = false;
      } else inp.check = false;

      // Set up for a one-timer if the puck is on its way.
      if (!carrier && p.speed > 350) {
        const d = dist(s.x, s.y, p.x, p.y);
        const toX = (s.x - p.x) / (d || 1), toY = (s.y - p.y) / (d || 1);
        if (d < 220 && (p.vx * toX + p.vy * toY) > 300 && p.lastTouch && p.lastTouch.team === s.team) {
          if (dist(s.x, s.y, netX, 0) < 620 && Math.random() < 0.5) {
            s.receiveWindow = 0.4; s.oneTimerArmed = 0.4;
          }
        }
      }
    }
  }

  aiDecide(s, ctx) {
    const { p, mates, foes, netX, dir, iHave, weHave, carrier } = ctx;
    const defX = this.defendX(s.team);
    const t = s.aiTarget;
    s.aiUrgency = 1;

    if (iHave) {
      s.aiState = 'rush';
      // Drive to a shooting lane, favouring the side with more room.
      const foeNear = foes.slice().sort((a, b) => dist(a.x, a.y, s.x, s.y) - dist(b.x, b.y, s.x, s.y))[0];
      let ty = 0;
      if (foeNear) ty = Math.abs(s.y) > 120 ? Math.sign(s.y) * 90 : -Math.sign(foeNear.y - s.y) * 130;
      const dNet = Math.abs(s.x - netX);
      if (dNet > 620) { t.x = netX - dir * 480; t.y = clamp(s.y + ty * 0.4, -300, 300); }
      else { t.x = netX - dir * 210; t.y = clamp(ty, -240, 240); }
      // Swerve around the nearest defender.
      if (foeNear && dist(foeNear.x, foeNear.y, s.x, s.y) < 150) {
        const side = Math.sign(s.y - foeNear.y) || (Math.random() < 0.5 ? 1 : -1);
        t.y = clamp(s.y + side * 190, -350, 350);
      }
      return;
    }

    if (weHave) {
      // Support: get open ahead of the puck, spread out from the carrier.
      s.aiState = 'support';
      const c = carrier;
      const lead = s.slot === 2 ? -230 : 190;
      t.x = clamp(c.x + dir * lead, -RINK.hw + 120, RINK.hw - 120);
      const side = s.slot === 1 ? 1 : -1;
      t.y = clamp(c.y + side * 210 + Math.sin(this.time * 0.7 + s.slot) * 60, -RINK.hh + 90, RINK.hh - 90);
      if (s.slot === 2) t.y = clamp(c.y * 0.3, -180, 180);
      s.aiUrgency = 0.85;
      return;
    }

    // No possession: nearest goes for the puck, others defend.
    const mine = this.teamSkaters(s.team);
    const order = mine.slice().sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y));
    const rank = order.indexOf(s);

    if (!carrier) {
      if (rank === 0) {
        s.aiState = 'chase';
        // Intercept where the puck will be, not where it is.
        const lead = clamp(dist(s.x, s.y, p.x, p.y) / Math.max(300, s.maxSpeed), 0, 0.5);
        t.x = p.x + p.vx * lead; t.y = p.y + p.vy * lead;
      } else if (rank === 1) {
        s.aiState = 'support';
        t.x = p.x - dir * 200; t.y = clamp(p.y + (s.slot === 1 ? 200 : -200), -350, 350);
      } else {
        s.aiState = 'cover';
        t.x = defX + dir * 320; t.y = clamp(p.y * 0.5, -200, 200);
      }
      return;
    }

    // Opponent has it.
    if (rank === 0) {
      s.aiState = 'pressure';
      // Angle them off toward the boards rather than chasing from behind.
      const ahead = carrier.x + carrier.vx * 0.22;
      const aheadY = carrier.y + carrier.vy * 0.22;
      t.x = ahead + dir * 26; t.y = aheadY;
      s.aiUrgency = 1.15;
    } else if (rank === 1) {
      s.aiState = 'backcheck';
      // Take away the pass to the most dangerous support man.
      const threat = this.teamSkaters(1 - s.team)
        .filter((m) => m !== carrier)
        .sort((a, b) => dist(a.x, a.y, defX, 0) - dist(b.x, b.y, defX, 0))[0];
      if (threat) { t.x = (threat.x + defX) / 2 + dir * 60; t.y = threat.y * 0.85; }
      else { t.x = defX + dir * 260; t.y = 0; }
    } else {
      s.aiState = 'cover';
      t.x = defX + dir * 190;
      t.y = clamp(carrier.y * 0.6, -150, 150);
    }
  }

  faceoffLineup(s) {
    const { x, y } = this.faceoffAt;
    const dir = this.attackDir(s.team);
    if (s.slot === 0) return { x: x - dir * 34, y };
    if (s.slot === 1) return { x: x - dir * 118, y: y + (y >= 0 ? -160 : 160) };
    return { x: x - dir * 230, y: y * 0.35 + (s.team === 0 ? -70 : 70) };
  }

  steerTo(s, tx, ty, urgency = 1) {
    const inp = s.input;
    let dx = tx - s.x, dy = ty - s.y;
    const d = Math.hypot(dx, dy) || 1;

    // Cheap avoidance: push away from very close bodies.
    for (const o of this.skaters) {
      if (o === s) continue;
      const od = dist(o.x, o.y, s.x, s.y);
      if (od < 60) {
        dx += (s.x - o.x) / (od || 1) * 70;
        dy += (s.y - o.y) / (od || 1) * 70;
      }
    }
    // Don't hug the boards.
    const bx = Math.abs(s.x) - (RINK.hw - 90);
    if (bx > 0) dx -= Math.sign(s.x) * bx * 1.6;
    const by = Math.abs(s.y) - (RINK.hh - 70);
    if (by > 0) dy -= Math.sign(s.y) * by * 1.6;

    const m = Math.hypot(dx, dy) || 1;
    const slow = d < 60 ? d / 60 : 1;
    inp.x = (dx / m) * slow;
    inp.y = (dy / m) * slow;
    inp.mag = clamp(slow * urgency, 0, 1);
  }

  /** 0..1 — how open the path from s to (tx,ty) is. */
  laneClear(s, tx, ty) {
    const dx = tx - s.x, dy = ty - s.y;
    const len = Math.hypot(dx, dy) || 1;
    let worst = 1;
    const foes = this.teamSkaters(1 - s.team);
    const bodies = foes.concat([this.goalies[1 - s.team]]);
    for (const o of bodies) {
      const t = clamp(((o.x - s.x) * dx + (o.y - s.y) * dy) / (len * len), 0, 1);
      const cx = s.x + dx * t, cy = s.y + dy * t;
      const d = dist(cx, cy, o.x, o.y);
      const block = clamp(d / 70, 0, 1);
      worst = Math.min(worst, block);
    }
    return worst;
  }

  /* ---------------------------------------------------------- collisions  */

  /** Keep a circular body inside the rounded-rectangle boards. */
  confine(o, r, restitution) {
    const ix = RINK.hw - RINK.corner, iy = RINK.hh - RINK.corner;
    const cx = clamp(o.x, -ix, ix), cy = clamp(o.y, -iy, iy);
    const dx = o.x - cx, dy = o.y - cy;
    const d = Math.hypot(dx, dy);
    const maxD = RINK.corner - r;
    if (d <= maxD) return null;
    const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
    o.x = cx + nx * maxD;
    o.y = cy + ny * maxD;
    const dot = o.vx * nx + o.vy * ny;
    const speed = Math.abs(dot);
    if (dot > 0) {
      o.vx -= (1 + restitution) * dot * nx;
      o.vy -= (1 + restitution) * dot * ny;
    }
    return { nx, ny, speed };
  }

  /** Keep skaters from skating through the cage. */
  netCollide(o, r) {
    for (const s of [-1, 1]) {
      const minX = Math.min(s * RINK.goalLine, s * (RINK.goalLine + RINK.netDepth)) - r;
      const maxX = Math.max(s * RINK.goalLine, s * (RINK.goalLine + RINK.netDepth)) + r;
      const minY = -RINK.goalHalf - 4 - r, maxY = RINK.goalHalf + 4 + r;
      if (o.x < minX || o.x > maxX || o.y < minY || o.y > maxY) continue;
      // Push out along the shallowest axis.
      const dl = o.x - minX, dr = maxX - o.x, dt = o.y - minY, db = maxY - o.y;
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) { o.x = minX; o.vx = Math.min(o.vx, 0) * 0.4; }
      else if (m === dr) { o.x = maxX; o.vx = Math.max(o.vx, 0) * 0.4; }
      else if (m === dt) { o.y = minY; o.vy = Math.min(o.vy, 0) * 0.4; }
      else { o.y = maxY; o.vy = Math.max(o.vy, 0) * 0.4; }
    }
  }

  /* ------------------------------------------------------------- ambience */

  updateScratches(dt) {
    for (let i = this.scratches.length - 1; i >= 0; i--) {
      const s = this.scratches[i];
      s.a -= dt * 0.055;
      if (s.a <= 0) this.scratches.splice(i, 1);
    }
  }

  updateExcitement(dt) {
    let base = 0.14;
    const p = this.puck;
    // Crowd rises as play gets close to either net.
    const nearNet = 1 - clamp(Math.min(Math.abs(p.x - RINK.goalLine), Math.abs(p.x + RINK.goalLine)) / 700, 0, 1);
    base += nearNet * 0.35;
    if (this.phase === 'goal') base = 1;
    if (this.phase === 'faceoff') base = 0.2;
    if (this.clock < 20 && this.phase === 'play') base += 0.25;
    this.excitement = damp(this.excitement, clamp(base, 0, 1), 1.4, dt);
  }

  recordReplay() {
    const f = {
      sk: this.skaters.map((s) => ({ x: s.x, y: s.y, f: s.face, d: s.down > 0 ? 1 : 0, l: s.lean, ph: s.skatePhase, fire: s.fire > 0 ? 1 : 0 })),
      go: this.goalies.map((g) => ({ x: g.x, y: g.y, f: g.face })),
      p: { x: this.puck.x, y: this.puck.y },
    };
    this.replayBuf.push(f);
    if (this.replayBuf.length > this.replayMax) this.replayBuf.shift();
  }

  /* --------------------------------------------------------------- labels */

  clockString() {
    const c = Math.max(0, this.clock);
    const m = Math.floor(c / 60);
    const s = Math.floor(c % 60);
    const d = Math.floor((c % 1) * 10);
    return c < 60 ? `${s}.${d}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  periodLabel() {
    if (this.overtime) return 'OT';
    return ['1ST', '2ND', '3RD', '4TH', '5TH'][Math.min(this.period - 1, 4)];
  }
}
