/* ============================================================================
 * MAIN — screens, camera, HUD, and the game loop.
 * ==========================================================================*/

const VIEW_W = 1600, VIEW_H = 900;

const Game = {
  canvas: null,
  ctx: null,
  renderer: null,
  input: null,
  cam: null,
  match: null,
  demo: null,
  state: 'title',        // title | select | settings | controls | play | results
  paused: false,
  acc: 0,
  last: 0,
  time: 0,
  settings: {
    periodLength: 120,
    periods: 3,
    difficulty: 'pro',
    players: 1,
    volume: 0.75,
    home: 0,
    away: 1,
  },
  sel: { side: 0, home: 0, away: 1 },
  flash: 0,
};

/* ------------------------------------------------------------------ boot  */

function boot() {
  const cv = document.getElementById('game');
  Game.canvas = cv;
  Game.ctx = cv.getContext('2d', { alpha: false });
  Game.input = new Input();
  Game.cam = new Camera();
  Game.renderer = new Renderer(VIEW_W, VIEW_H);

  loadSettings();
  resize();
  addEventListener('resize', resize);

  buildTeamGrid();
  bindUI();
  startDemo();
  showScreen('title');

  Game.last = performance.now();
  requestAnimationFrame(frame);

  const wake = () => { SFX.resume(); SFX.setVolume(Game.settings.volume); };
  addEventListener('pointerdown', wake, { once: true });
  addEventListener('keydown', wake, { once: true });
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('arcadeHockey.settings');
    if (raw) Object.assign(Game.settings, JSON.parse(raw));
  } catch (e) { /* first run */ }
  Game.sel.home = Game.settings.home ?? 0;
  Game.sel.away = Game.settings.away ?? 1;
}
function saveSettings() {
  try {
    localStorage.setItem('arcadeHockey.settings', JSON.stringify(Game.settings));
  } catch (e) { /* private mode */ }
}

function resize() {
  const cv = Game.canvas;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = cv.getBoundingClientRect();
  const w = Math.max(320, rect.width), h = Math.max(180, rect.height);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  Game.scale = Math.min(cv.width / VIEW_W, cv.height / VIEW_H);
  Game.offX = (cv.width - VIEW_W * Game.scale) / 2;
  Game.offY = (cv.height - VIEW_H * Game.scale) / 2;
}

/* --------------------------------------------------------------- screens  */

function showScreen(name) {
  Game.state = name;
  for (const el of document.querySelectorAll('.screen')) {
    el.classList.toggle('active', el.id === 'scr-' + name);
  }
  document.getElementById('overlay').classList.toggle('hidden', name === 'play');
  if (name === 'select') refreshSelect();
}

function startDemo() {
  const a = randInt(0, TEAMS.length - 1);
  let b = randInt(0, TEAMS.length - 1);
  while (b === a) b = randInt(0, TEAMS.length - 1);
  Game.demo = new Match([TEAMS[a], TEAMS[b]], {
    demo: true, humans: [], periodLength: 300, difficulty: 'allstar',
  });
  Game.renderer.bake(Game.demo.teams);
  Game.cam.snapped = false;
}

function startMatch() {
  const home = TEAMS[Game.sel.home], away = TEAMS[Game.sel.away];
  Game.settings.home = Game.sel.home;
  Game.settings.away = Game.sel.away;
  saveSettings();
  Game.match = new Match([home, away], {
    periodLength: Game.settings.periodLength,
    periods: Game.settings.periods,
    difficulty: Game.settings.difficulty,
    humans: Game.settings.players === 2 ? [0, 1] : [0],
  });
  Game.renderer.bake(Game.match.teams);
  Game.cam.snapped = false;
  Game.paused = false;
  Game.match.say(`${home.city.toUpperCase()} vs ${away.city.toUpperCase()}`, 'PERIOD 1 — DROP THE PUCK', '#ffe27a', 3);
  SFX.organ();
  showScreen('play');
}

/* ------------------------------------------------------------------- UI   */

function teamTile(t, i) {
  const el = document.createElement('button');
  el.className = 'tile';
  el.dataset.index = i;
  el.style.setProperty('--c1', t.colors.primary);
  el.style.setProperty('--c2', t.colors.secondary);
  el.style.setProperty('--c3', t.colors.accent);
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 96;
  const g = cv.getContext('2d');
  g.translate(48, 48);
  drawCrest(g, t, 40);
  el.appendChild(cv);
  const lab = document.createElement('div');
  lab.className = 'tile-label';
  lab.innerHTML = `<b>${t.abbr}</b><span>${t.name}</span>`;
  el.appendChild(lab);
  const ovr = document.createElement('div');
  ovr.className = 'tile-ovr';
  ovr.textContent = teamRating(t);
  el.appendChild(ovr);
  return el;
}

function buildTeamGrid() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '';
  TEAMS.forEach((t, i) => {
    const el = teamTile(t, i);
    el.addEventListener('mouseenter', () => { previewTeam(i); SFX.uiMove(); });
    el.addEventListener('focus', () => previewTeam(i));
    el.addEventListener('click', () => chooseTeam(i));
    grid.appendChild(el);
  });
}

function previewTeam(i) {
  const t = TEAMS[i];
  const box = document.getElementById('team-detail');
  const bar = (label, v) => `
    <div class="bar-row"><span>${label}</span>
      <div class="bar"><i style="width:${clamp((v - 55) / 45 * 100, 6, 100)}%"></i></div>
      <b>${v}</b></div>`;
  box.innerHTML = `
    <div class="detail-head" style="--c1:${t.colors.primary};--c2:${t.colors.secondary}">
      <canvas class="detail-crest" width="128" height="128"></canvas>
      <div>
        <h3>${t.city}</h3>
        <h2>${t.name}</h2>
        <div class="ovr-pill">OVR ${teamRating(t)}</div>
      </div>
    </div>
    ${bar('ATTACK', teamAttack(t))}
    ${bar('DEFENCE', teamDefense(t))}
    ${bar('SPEED', teamSpeed(t))}
    <div class="roster">
      ${t.skaters.map((p) => `
        <div class="pl">
          <span class="num">${p.n}</span>
          <span class="nm">${p.name}</span>
          <span class="ps">${p.pos}</span>
          <span class="rt">${Math.round((p.spd + p.sht + p.pss + p.chk + p.hnd) / 5)}</span>
        </div>`).join('')}
      <div class="pl goalie">
        <span class="num">${t.goalie.n}</span>
        <span class="nm">${t.goalie.name}</span>
        <span class="ps">G</span>
        <span class="rt">${Math.round((t.goalie.ref + t.goalie.pos + t.goalie.rec) / 3)}</span>
      </div>
    </div>`;
  const cv = box.querySelector('.detail-crest');
  const g = cv.getContext('2d');
  g.translate(64, 64);
  drawCrest(g, t, 54);
}

function chooseTeam(i) {
  SFX.uiSelect();
  if (Game.sel.side === 0) {
    Game.sel.home = i;
    Game.sel.side = 1;
    if (Game.sel.away === i) Game.sel.away = (i + 1) % TEAMS.length;
  } else {
    if (i === Game.sel.home) { SFX.uiBack(); return; }
    Game.sel.away = i;
    startMatch();
    Game.sel.side = 0;
    return;
  }
  refreshSelect();
}

function refreshSelect() {
  const side = Game.sel.side;
  document.getElementById('select-prompt').innerHTML = side === 0
    ? 'CHOOSE <b>YOUR</b> CLUB'
    : `CHOOSE THE <b>OPPONENT</b> — you are <b style="color:${TEAMS[Game.sel.home].colors.primary}">${TEAMS[Game.sel.home].abbr}</b>`;
  document.querySelectorAll('#team-grid .tile').forEach((el, i) => {
    el.classList.toggle('picked', side === 1 && i === Game.sel.home);
    el.classList.toggle('disabled', side === 1 && i === Game.sel.home);
  });
  previewTeam(side === 0 ? Game.sel.home : Game.sel.away);
}

function bindUI() {
  const on = (id, fn) => { const e = document.getElementById(id); if (e) e.addEventListener('click', fn); };

  on('btn-start', () => { SFX.uiSelect(); Game.sel.side = 0; showScreen('select'); });
  on('btn-controls', () => { SFX.uiSelect(); showScreen('controls'); });
  on('btn-settings', () => { SFX.uiSelect(); showScreen('settings'); });
  on('btn-back-title', () => { SFX.uiBack(); showScreen('title'); });
  on('btn-back-title2', () => { SFX.uiBack(); showScreen('title'); });
  on('btn-back-title3', () => { SFX.uiBack(); Game.sel.side = 0; showScreen('title'); });
  on('btn-rematch', () => { SFX.uiSelect(); startMatch(); });
  on('btn-newteams', () => { SFX.uiSelect(); Game.sel.side = 0; showScreen('select'); });
  on('btn-quit-menu', () => { SFX.uiBack(); Game.match = null; startDemo(); showScreen('title'); });

  on('btn-resume', () => { Game.paused = false; document.getElementById('pause').classList.add('hidden'); });
  on('btn-restart', () => {
    Game.paused = false;
    document.getElementById('pause').classList.add('hidden');
    startMatch();
  });
  on('btn-abandon', () => {
    Game.paused = false;
    document.getElementById('pause').classList.add('hidden');
    Game.match = null;
    startDemo();
    showScreen('title');
  });

  const seg = (id, key, cast = (v) => v) => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      Game.settings[key] = cast(b.dataset.value);
      saveSettings();
      syncSettingsUI();
      SFX.uiMove();
    });
  };
  seg('opt-length', 'periodLength', Number);
  seg('opt-diff', 'difficulty');
  seg('opt-players', 'players', Number);

  const vol = document.getElementById('opt-volume');
  if (vol) {
    vol.addEventListener('input', () => {
      Game.settings.volume = Number(vol.value) / 100;
      SFX.setVolume(Game.settings.volume);
      saveSettings();
    });
  }
  syncSettingsUI();
}

function syncSettingsUI() {
  const mark = (id, key) => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', String(Game.settings[key]) === b.dataset.value);
    });
  };
  mark('opt-length', 'periodLength');
  mark('opt-diff', 'difficulty');
  mark('opt-players', 'players');
  const vol = document.getElementById('opt-volume');
  if (vol) vol.value = Math.round(Game.settings.volume * 100);
}

/* ------------------------------------------------------------------ loop  */

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - Game.last) / 1000;
  Game.last = now;
  if (dt > 0.25) dt = 0.25;
  Game.time += dt;

  const playing = Game.state === 'play' && Game.match;
  const m = playing ? Game.match : Game.demo;

  // Pause toggle.
  if (playing && (Game.input.keyHit('Escape') || Game.input.keyHit('KeyP'))) {
    Game.paused = !Game.paused;
    document.getElementById('pause').classList.toggle('hidden', !Game.paused);
    SFX.uiBack();
  }
  if (playing && Game.match.phase === 'over' && Game.match.phaseT > 3.2) {
    showResults();
  }

  const step = 1 / 60;
  if (m && !(playing && Game.paused)) {
    Game.acc += dt;
    let steps = 0;
    while (Game.acc >= step && steps < 5) {
      const inputs = playing
        ? [Game.input.read(0), Game.settings.players === 2 ? Game.input.read(1) : null].filter(Boolean)
        : null;
      m.update(step, inputs);
      Game.acc -= step;
      steps++;
    }
    if (m.cameraShake) { Game.cam.addShake(m.cameraShake); m.cameraShake = 0; }
    SFX.setCrowd(m.excitement, dt);
  }

  updateCamera(m, dt, playing);
  render(m, dt, playing);
  Game.input.endFrame();
}

/** True while a goal replay is actually rolling on screen. */
function replayLive(m) {
  return !!(m && m.replay && m.replay.started && !m.replay.done);
}

function updateCamera(m, dt, playing) {
  if (!m) return;
  const cam = Game.cam;

  if (replayLive(m)) {
    const f = m.replay.frames[Math.min(m.replay.frames.length - 1, Math.floor(m.replay.t))];
    if (f) cam.follow(f.p.x * 0.86, f.p.y * 0.72, 1.25, dt, 4);
    cam.update(dt);
    return;
  }

  const p = m.puck;
  let fx = p.x, fy = p.y;
  // Bias the camera slightly ahead of the play.
  fx += p.vx * 0.09;
  fy += p.vy * 0.06;
  if (!playing) { fx = p.x; fy = p.y; }

  // Wide enough to see a breakout developing, tight enough to feel the hits.
  let zoom = 0.84;
  const nearNet = 1 - clamp(Math.min(Math.abs(p.x - RINK.goalLine), Math.abs(p.x + RINK.goalLine)) / 620, 0, 1);
  zoom += nearNet * 0.10;
  if (m.phase === 'goal') zoom = 1.18;
  if (m.phase === 'faceoff') zoom = 0.9;
  if (!playing) zoom = 0.8;               // menus: sit back and show the arena

  // Keep the view inside the arena so we never show empty space.
  const halfW = VIEW_W / (2 * zoom), halfH = VIEW_H / (2 * zoom);
  const limX = Math.max(0, RINK.hw + 75 - halfW);
  const limY = Math.max(0, RINK.hh + 55 - halfH);
  fx = clamp(fx * 0.92, -limX, limX);
  fy = clamp(fy * 0.86, -limY, limY);

  cam.follow(fx, fy, zoom, dt, m.phase === 'goal' ? 3 : 6);
  cam.update(dt);
}

/* ---------------------------------------------------------------- render  */

function render(m, dt, playing) {
  const ctx = Game.ctx;
  const cv = Game.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (!m) return;

  ctx.save();
  ctx.translate(Game.offX, Game.offY);
  ctx.scale(Game.scale, Game.scale);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();

  // ---- world
  ctx.save();
  Game.cam.apply(ctx, VIEW_W, VIEW_H);

  if (replayLive(m)) {
    drawReplayFrame(ctx, m, dt);
  } else {
    Game.renderer.drawWorld(ctx, m, Game.cam, dt, Game.time);
  }
  ctx.restore();

  // ---- screen space
  drawVignette(ctx);
  if (playing && replayLive(m)) {
    drawReplayFurniture(ctx, m);
  } else if (playing) {
    drawHUD(ctx, m);
    if (m.phase === 'goal') drawGoalBanner(ctx, m);
    if (m.phase === 'faceoff') drawFaceoffCountdown(ctx, m);
    if (m.phase === 'intermission') drawIntermission(ctx, m);
  } else {
    // Demo behind the menus: push it right back so UI reads cleanly.
    ctx.fillStyle = 'rgba(4,7,14,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const dg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
    dg.addColorStop(0, 'rgba(3,6,12,0.72)');
    dg.addColorStop(1, 'rgba(3,6,12,0.30)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#9fd0ff';
    for (let y = 0; y < VIEW_H; y += 3) ctx.fillRect(0, y, VIEW_W, 1);
    ctx.restore();
  }

  // Global flash (goals, super shots).
  if (m.phase === 'goal' && m.phaseT < 0.35) {
    ctx.fillStyle = `rgba(255,255,255,${(1 - m.phaseT / 0.35) * 0.5})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.92);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/* --------------------------------------------------------------- replay   */

function drawReplayFrame(ctx, m, dt) {
  const r = m.replay;
  const i = Math.min(r.frames.length - 1, Math.floor(r.t));
  const f = r.frames[i];
  if (!f) return;

  // Swap live state for the recorded frame, draw, then restore.
  const save = m.skaters.map((s) => ({ x: s.x, y: s.y, face: s.face, down: s.down, lean: s.lean, ph: s.skatePhase, fire: s.fire }));
  const gsave = m.goalies.map((g) => ({ x: g.x, y: g.y, face: g.face }));
  const psave = { x: m.puck.x, y: m.puck.y, trail: m.puck.trail };

  m.skaters.forEach((s, k) => {
    const d = f.sk[k];
    s.x = d.x; s.y = d.y; s.face = d.f; s.down = d.d ? 1 : 0; s.lean = d.l; s.skatePhase = d.ph; s.fire = d.fire ? 1 : 0;
  });
  m.goalies.forEach((g, k) => { g.x = f.go[k].x; g.y = f.go[k].y; g.face = f.go[k].f; });
  m.puck.x = f.p.x; m.puck.y = f.p.y;
  m.puck.trail = r.frames.slice(Math.max(0, i - 10), i + 1).map((q) => ({ x: q.p.x, y: q.p.y }));

  Game.renderer.drawWorld(ctx, m, Game.cam, dt, Game.time);

  m.skaters.forEach((s, k) => {
    const d = save[k];
    s.x = d.x; s.y = d.y; s.face = d.face; s.down = d.down; s.lean = d.lean; s.skatePhase = d.ph; s.fire = d.fire;
  });
  m.goalies.forEach((g, k) => { g.x = gsave[k].x; g.y = gsave[k].y; g.face = gsave[k].face; });
  m.puck.x = psave.x; m.puck.y = psave.y; m.puck.trail = psave.trail;
}

function drawReplayFurniture(ctx, m) {
  const bar = 74;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, bar);
  ctx.fillRect(0, VIEW_H - bar, VIEW_W, bar);

  // Scanlines for that broadcast-feed look.
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#fff';
  for (let y = bar; y < VIEW_H - bar; y += 4) ctx.fillRect(0, y, VIEW_W, 1);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(Game.time * 8);
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(64, bar + 40, 11, 0, TAU); ctx.fill();
  ctx.font = '900 30px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('REPLAY', 86, bar + 51);
  ctx.restore();

  const gi = m.goalInfo;
  if (gi) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '900 26px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = m.teams[gi.team].colors.primary;
    ctx.fillText(`#${gi.scorer.data.n} ${gi.scorer.data.name.toUpperCase()}`, VIEW_W - 60, bar + 44);
    if (gi.assist) {
      ctx.font = '700 18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillText(`ASSIST: ${gi.assist.data.name.toUpperCase()}`, VIEW_W - 60, bar + 70);
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ HUD   */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function drawHUD(ctx, m) {
  const cx = VIEW_W / 2;

  // ---------------- scoreboard bug
  const w = 520, h = 78, x = cx - w / 2, y = 18;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(8,13,22,0.9)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();

  for (let t = 0; t < 2; t++) {
    const tc = m.teams[t].colors;
    const bx = t === 0 ? x : x + w - 168;
    const grad = ctx.createLinearGradient(bx, 0, bx + 168, 0);
    if (t === 0) { grad.addColorStop(0, tc.primary); grad.addColorStop(1, rgba(tc.primary, 0.15)); }
    else { grad.addColorStop(0, rgba(tc.primary, 0.15)); grad.addColorStop(1, tc.primary); }
    ctx.fillStyle = grad;
    ctx.fillRect(bx, y, 168, h);

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(t === 0 ? x + 34 : x + w - 34, y + h / 2);
    drawCrest(ctx, m.teams[t], 26);
    ctx.restore();

    ctx.font = '900 26px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = t === 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.teams[t].abbr, t === 0 ? x + 64 : x + w - 64, y + 26);

    ctx.font = '900 44px Impact, "Arial Black", sans-serif';
    ctx.fillText(String(m.score[t]), t === 0 ? x + 64 : x + w - 64, y + 56);

    // Super meter
    const mw = 96, mx = t === 0 ? x + 60 : x + w - 60 - mw, my = y + h - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, mx, my, mw, 6, 3); ctx.fill();
    const full = m.meter[t] >= 1;
    ctx.fillStyle = full ? '#ffb400' : tc.accent;
    if (full) { ctx.shadowColor = '#ffb400'; ctx.shadowBlur = 12; }
    roundRect(ctx, mx, my, mw * m.meter[t], 6, 3); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // clock block
  ctx.fillStyle = 'rgba(4,8,14,0.95)';
  ctx.fillRect(x + 168, y, w - 336, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const urgent = m.clock < 15 && m.phase === 'play';
  ctx.font = '900 40px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = urgent ? (Math.floor(Game.time * 4) % 2 ? '#ff4d4d' : '#fff') : '#fff';
  ctx.fillText(m.clockString(), cx, y + 34);
  ctx.font = '900 17px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#8fa4bd';
  ctx.fillText(m.overtime ? 'OVERTIME' : `${m.periodLabel()} PERIOD`, cx, y + 62);
  ctx.restore();

  // Shots line under the bug
  ctx.save();
  ctx.font = '700 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const strip = `SHOTS  ${m.shots[0]} — ${m.shots[1]}       HITS  ${m.hits[0]} — ${m.hits[1]}`;
  const sw = ctx.measureText(strip).width + 34;
  ctx.fillStyle = 'rgba(8,13,22,0.82)';
  roundRect(ctx, cx - sw / 2, y + h - 1, sw, 24, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,214,242,.85)';
  ctx.fillText(strip, cx, y + h + 15);
  ctx.restore();

  // ---------------- per-player panels
  const slots = m.opts.humans;
  slots.forEach((team, i) => {
    const s = m.skaters.find((k) => k.team === team && k.slot === m.control[team]);
    if (!s) return;
    drawPlayerPanel(ctx, m, s, i === 0 ? 'left' : 'right', i);
  });

  // ---------------- announcer messages
  // Callouts live along the bottom so they never cover the play.
  ctx.save();
  ctx.textAlign = 'center';
  let my = VIEW_H - 150;
  for (let i = 0; i < m.messages.length; i++) {
    const msg = m.messages[i];
    const a = clamp(msg.life / 0.4, 0, 1) * clamp((msg.max - msg.life) / 0.15, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = '900 34px Impact, "Arial Black", sans-serif';
    // Dark plate so callouts stay legible over bright ice.
    const tw = ctx.measureText(msg.text).width;
    const pw = Math.max(tw, msg.sub ? ctx.measureText(msg.sub).width * 1.4 : 0) + 56;
    const ph = msg.sub ? 62 : 42;
    ctx.globalAlpha = a * 0.6;
    ctx.fillStyle = 'rgba(4,9,17,0.8)';
    roundRect(ctx, VIEW_W / 2 - pw / 2, my - 30, pw, ph, 8);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.strokeText(msg.text, VIEW_W / 2, my);
    ctx.fillStyle = msg.color;
    ctx.fillText(msg.text, VIEW_W / 2, my);
    if (msg.sub) {
      ctx.font = '700 17px Inter, system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeText(msg.sub, VIEW_W / 2, my + 24);
      ctx.fillStyle = '#dce9ff';
      ctx.fillText(msg.sub, VIEW_W / 2, my + 24);
      my -= 26;
    }
    my -= 50;
  }
  ctx.restore();
}

function drawPlayerPanel(ctx, m, s, side, idx) {
  const team = m.teams[s.team];
  const c = team.colors;
  const w = 268, h = 84;
  const x = side === 'left' ? 26 : VIEW_W - w - 26;
  const y = VIEW_H - h - 26;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(8,13,22,0.86)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();

  // colour flash
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, rgba(c.primary, side === 'left' ? 0.85 : 0.1));
  g.addColorStop(1, rgba(c.primary, side === 'left' ? 0.1 : 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, 4);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.translate(side === 'left' ? x + w - 42 : x + 42, y + h / 2);
  drawCrest(ctx, team, 34);
  ctx.restore();

  // Player identity
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = '900 30px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`#${s.data.n}`, x + 14, y + 34);
  ctx.font = '900 21px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = c.accent === '#FFFFFF' ? '#dfe9f7' : c.accent;
  ctx.fillText(s.data.short, x + 82, y + 33);
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(190,210,235,.65)';
  ctx.fillText(`P${idx + 1}  ·  ${s.data.pos}  ·  SPD ${s.data.spd}  SHT ${s.data.sht}`, x + 14, y + 50);

  // Turbo bar
  const bx = x + 14, by = y + 60, bw = w - 28, bh = 9;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(ctx, bx, by, bw, bh, 4); ctx.fill();
  const onFire = s.fire > 0;
  const tv = onFire ? 1 : s.turbo;
  const tg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  if (onFire) { tg.addColorStop(0, '#ff5e1e'); tg.addColorStop(1, '#ffd76a'); }
  else { tg.addColorStop(0, '#2ec4ff'); tg.addColorStop(1, '#7ff0ff'); }
  ctx.fillStyle = tg;
  if (onFire) { ctx.shadowColor = '#ff8a1e'; ctx.shadowBlur = 12; }
  roundRect(ctx, bx, by, bw * tv, bh, 4); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = '900 10px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillText(onFire ? 'ON FIRE — UNLIMITED TURBO' : 'TURBO', bx + 2, by + 20);

  if (m.meter[s.team] >= 1) {
    ctx.textAlign = 'right';
    ctx.font = '900 12px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = Math.floor(Game.time * 5) % 2 ? '#ffb400' : '#fff';
    ctx.fillText('SUPER SHOT READY', x + w - 14, by + 20);
  }
  ctx.restore();
}

function drawGoalBanner(ctx, m) {
  const gi = m.goalInfo;
  if (!gi) return;
  const t = m.phaseT;
  const c = m.teams[gi.team].colors;
  const inT = clamp(t / 0.25, 0, 1);
  const outT = clamp((5.0 - t) / 0.4, 0, 1);
  const a = Math.min(inT, outT);
  if (a <= 0) return;

  ctx.save();
  ctx.globalAlpha = a;
  const bh = 128;
  const by = 250;
  const slide = (1 - smooth(inT)) * -600;
  ctx.translate(slide, 0);

  const g = ctx.createLinearGradient(0, by, VIEW_W, by + bh);
  g.addColorStop(0, rgba(c.primary, 0.96));
  g.addColorStop(0.55, rgba(c.secondary, 0.94));
  g.addColorStop(1, rgba(c.primary, 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(0, by, VIEW_W, bh);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, by - 5, VIEW_W, 5);
  ctx.fillRect(0, by + bh, VIEW_W, 5);

  // Streaking light sweep.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sweep = ((Game.time * 520) % (VIEW_W + 500)) - 250;
  const sg = ctx.createLinearGradient(sweep - 160, 0, sweep + 160, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, by, VIEW_W, bh);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pop = 1 + Math.sin(clamp(t * 6, 0, Math.PI)) * 0.12;
  ctx.save();
  ctx.translate(VIEW_W / 2, by + 48);
  ctx.scale(pop, pop);
  ctx.font = '900 76px Impact, "Arial Black", sans-serif';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.strokeText('G O A L !', 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillText('G O A L !', 0, 0);
  ctx.restore();

  ctx.font = '900 30px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`#${gi.scorer.data.n}  ${gi.scorer.data.name.toUpperCase()}`, VIEW_W / 2, by + 96);
  if (gi.assist) {
    ctx.font = '700 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(`ASSISTED BY ${gi.assist.data.name.toUpperCase()}   ·   ${gi.period} ${gi.time}`, VIEW_W / 2, by + 118);
  }
  ctx.restore();

  if (gi.fireNow) {
    ctx.save();
    ctx.globalAlpha = a * clamp((t - 0.6) * 2, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = '900 54px Impact, "Arial Black", sans-serif';
    const grd = ctx.createLinearGradient(0, 430, 0, 490);
    grd.addColorStop(0, '#ffe27a');
    grd.addColorStop(1, '#ff4d00');
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.strokeText('HE\'S ON FIRE!', VIEW_W / 2, 470);
    ctx.fillStyle = grd;
    ctx.fillText('HE\'S ON FIRE!', VIEW_W / 2, 470);
    ctx.restore();
  }
}

function drawFaceoffCountdown(ctx, m) {
  const left = 1.35 - m.phaseT;
  if (left <= 0) return;
  const n = Math.ceil(left / 0.45);
  const frac = (left % 0.45) / 0.45;
  ctx.save();
  ctx.globalAlpha = clamp(frac * 1.4, 0, 1) * 0.9;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${120 + (1 - frac) * 40}px Impact, "Arial Black", sans-serif`;
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.strokeText(String(n), VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.fillText(String(n), VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.restore();
}

function drawIntermission(ctx, m) {
  ctx.save();
  ctx.fillStyle = 'rgba(3,7,14,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 64px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(m.overtime ? 'OVERTIME' : `END OF THE ${m.periodLabel()}`, VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.font = '900 40px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText(`${m.teams[0].abbr} ${m.score[0]}   —   ${m.score[1]} ${m.teams[1].abbr}`, VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200,220,245,.7)';
  ctx.fillText(`SHOTS ${m.shots[0]}-${m.shots[1]}    ·    HITS ${m.hits[0]}-${m.hits[1]}`, VIEW_W / 2, VIEW_H / 2 + 62);
  ctx.restore();
}

/* --------------------------------------------------------------- results  */

function showResults() {
  const m = Game.match;
  if (!m || Game.state === 'results') return;
  const win = m.winner;
  const w = m.teams[win], l = m.teams[1 - win];

  // Three stars: goals x3 + assists x2 + hits x0.5 + saves x0.25
  const cands = m.skaters.map((s) => ({
    name: s.data.name, num: s.data.n, team: m.teams[s.team],
    line: `${s.stats.g}G  ${s.stats.a}A  ${s.stats.sog} SOG  ${s.stats.hits} HITS`,
    score: s.stats.g * 3 + s.stats.a * 2 + s.stats.hits * 0.5 + s.stats.sog * 0.2,
  })).concat(m.goalies.map((g, i) => ({
    name: g.data.name, num: g.data.n, team: m.teams[i],
    line: `${g.stats.saves} SAVES  ${g.stats.ga} GA`,
    score: g.stats.saves * 0.35 + (g.stats.ga === 0 ? 4 : 0) - g.stats.ga * 0.4,
  })));
  cands.sort((a, b) => b.score - a.score);

  document.getElementById('result-body').innerHTML = `
    <div class="final-line">
      <div class="fteam ${win === 0 ? 'win' : ''}" style="--c1:${m.teams[0].colors.primary}">
        <span class="fabbr">${m.teams[0].abbr}</span><span class="fscore">${m.score[0]}</span>
      </div>
      <div class="fvs">FINAL${m.overtime ? ' / OT' : ''}</div>
      <div class="fteam ${win === 1 ? 'win' : ''}" style="--c1:${m.teams[1].colors.primary}">
        <span class="fscore">${m.score[1]}</span><span class="fabbr">${m.teams[1].abbr}</span>
      </div>
    </div>
    <p class="winline"><b style="color:${w.colors.primary}">${w.city.toUpperCase()} ${w.name.toUpperCase()}</b> take it${m.overtime ? ' in overtime' : ''}.</p>
    <div class="stars">
      ${cands.slice(0, 3).map((c, i) => `
        <div class="star" style="--c1:${c.team.colors.primary}">
          <span class="sn">${'★'.repeat(3 - i)}</span>
          <span class="snm">#${c.num} ${c.name}</span>
          <span class="sl">${c.line}</span>
          <span class="st">${c.team.abbr}</span>
        </div>`).join('')}
    </div>
    <div class="boxscore">
      <div><b>SHOTS</b> ${m.shots[0]} — ${m.shots[1]}</div>
      <div><b>HITS</b> ${m.hits[0]} — ${m.hits[1]}</div>
      <div><b>SAVES</b> ${m.goalies[0].stats.saves} — ${m.goalies[1].stats.saves}</div>
    </div>`;
  showScreen('results');
}

addEventListener('DOMContentLoaded', boot);
