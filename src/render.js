/* ============================================================================
 * RENDER — arena, ice, skaters, puck, effects, HUD.
 *
 * The static arena (stands, crowd, boards, painted ice) is baked once into an
 * offscreen canvas; only the living stuff is redrawn each frame.
 * ==========================================================================*/

const ARENA_PAD = 340;

/* ------------------------------------------------------------------ crests */
/* Abstract, original marks — evocative of each club's identity without
 * reproducing any real logo. */
function drawCrest(ctx, team, r) {
  const c = team.colors;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const P = (pts, fill, stroke, lw = 0) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw * r; ctx.stroke(); }
  };
  const circle = (x, y, rr, fill, stroke, lw = 0) => {
    ctx.beginPath(); ctx.arc(x * r, y * r, rr * r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw * r; ctx.stroke(); }
  };

  switch (team.crest) {
    case 'drop':
      P([[0, -0.9], [0.62, 0.2], [0.36, 0.78], [-0.36, 0.78], [-0.62, 0.2]], c.primary, c.accent, 0.1);
      P([[0, -0.42], [0.3, 0.16], [0, 0.42], [-0.3, 0.16]], c.secondary);
      break;
    case 'peak':
      P([[-0.92, 0.62], [-0.3, -0.5], [0.02, -0.05], [0.36, -0.72], [0.92, 0.62]], c.primary, c.accent, 0.09);
      P([[-0.3, -0.5], [-0.06, -0.06], [-0.54, -0.06]], '#ffffff');
      P([[0.36, -0.72], [0.62, -0.18], [0.1, -0.18]], '#ffffff');
      break;
    case 'leaf':
      P([[0, -0.95], [0.22, -0.4], [0.6, -0.55], [0.42, -0.05], [0.9, 0.1],
        [0.4, 0.34], [0.5, 0.85], [0, 0.55], [-0.5, 0.85], [-0.4, 0.34],
        [-0.9, 0.1], [-0.42, -0.05], [-0.6, -0.55], [-0.22, -0.4]], c.primary, c.accent, 0.07);
      break;
    case 'bolt':
      P([[0.16, -0.95], [-0.62, 0.12], [-0.1, 0.12], [-0.3, 0.95], [0.62, -0.16], [0.06, -0.16]], c.accent, c.secondary, 0.09);
      break;
    case 'claw':
      for (let i = -1; i <= 1; i++) {
        P([[i * 0.42 - 0.13, -0.85], [i * 0.42 + 0.13, -0.85], [i * 0.42 + 0.2, 0.7], [i * 0.42, 0.92], [i * 0.42 - 0.2, 0.7]], c.primary, c.accent, 0.06);
      }
      break;
    case 'shield':
      P([[0, -0.92], [0.78, -0.55], [0.6, 0.5], [0, 0.95], [-0.6, 0.5], [-0.78, -0.55]], c.primary, c.secondary, 0.11);
      P([[0, -0.5], [0.4, -0.28], [0.32, 0.26], [0, 0.55], [-0.32, 0.26], [-0.4, -0.28]], c.secondary);
      break;
    case 'liberty':
      circle(0, 0.05, 0.55, c.primary, c.accent, 0.08);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.36;
        P([[Math.cos(a) * 0.55, Math.sin(a) * 0.55 + 0.05],
        [Math.cos(a) * 0.98, Math.sin(a) * 0.98 + 0.05],
        [Math.cos(a + 0.1) * 0.55, Math.sin(a + 0.1) * 0.55 + 0.05]], c.accent);
      }
      break;
    case 'star':
      P(Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 ? 0.4 : 0.95;
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      }), c.primary, c.accent, 0.07);
      break;
    case 'spoke':
      circle(0, 0, 0.9, c.secondary);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = c.primary;
        ctx.fillRect(-0.07 * r, -0.9 * r, 0.14 * r, 0.55 * r);
        ctx.restore();
      }
      circle(0, 0, 0.34, c.primary);
      break;
    case 'storm':
      ctx.save();
      ctx.strokeStyle = c.primary; ctx.lineWidth = 0.2 * r;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, a = t * TAU * 1.6, rr = 0.95 * (1 - t * 0.75);
        const x = Math.cos(a) * rr * r, y = Math.sin(a) * rr * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      circle(0, 0, 0.16, c.accent);
      break;
    case 'jet':
      P([[0, -0.95], [0.2, -0.3], [0.85, 0.35], [0.85, 0.55], [0.16, 0.3],
      [0.16, 0.7], [0.4, 0.9], [0.4, 0.98], [0, 0.86], [-0.4, 0.98],
      [-0.4, 0.9], [-0.16, 0.7], [-0.16, 0.3], [-0.85, 0.55], [-0.85, 0.35], [-0.2, -0.3]],
        c.accent, c.secondary, 0.06);
      break;
    case 'devil':
      P([[-0.7, 0.8], [-0.5, -0.35], [-0.85, -0.9], [-0.2, -0.55], [0, -0.9],
      [0.2, -0.55], [0.85, -0.9], [0.5, -0.35], [0.7, 0.8], [0, 0.5]], c.primary, c.accent, 0.07);
      break;
    case 'orca':
      P([[-0.9, 0.2], [-0.3, -0.5], [0.5, -0.45], [0.9, 0.1], [0.4, 0.6], [-0.4, 0.6]], c.primary, c.accent, 0.08);
      P([[-0.1, -0.5], [0.1, -0.95], [0.3, -0.48]], c.primary);
      circle(0.45, -0.1, 0.1, '#ffffff');
      break;
    case 'penguin':
      P([[0, -0.9], [0.5, -0.4], [0.55, 0.6], [0, 0.95], [-0.55, 0.6], [-0.5, -0.4]], c.secondary);
      P([[0, -0.5], [0.28, 0.0], [0.26, 0.6], [0, 0.78], [-0.26, 0.6], [-0.28, 0.0]], '#ffffff');
      P([[0, -0.15], [0.16, 0.06], [0, 0.2], [-0.16, 0.06]], c.primary);
      break;
    case 'capitol':
      P([[-0.85, 0.75], [0.85, 0.75], [0.85, 0.45], [-0.85, 0.45]], c.accent);
      P([[-0.6, 0.45], [-0.6, -0.1], [0.6, -0.1], [0.6, 0.45]], c.accent);
      P([[0, -0.95], [0.42, -0.35], [-0.42, -0.35]], c.primary);
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = c.secondary;
        ctx.fillRect((i * 0.24 - 0.05) * r, -0.08 * r, 0.1 * r, 0.5 * r);
      }
      break;
    case 'ch':
      ctx.save();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 0.22 * r; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(0, 0, 0.62 * r, 0.5, TAU - 0.5); ctx.stroke();
      ctx.lineWidth = 0.2 * r; ctx.strokeStyle = c.secondary;
      ctx.beginPath();
      ctx.moveTo(-0.22 * r, -0.42 * r); ctx.lineTo(-0.22 * r, 0.42 * r);
      ctx.moveTo(0.22 * r, -0.42 * r); ctx.lineTo(0.22 * r, 0.42 * r);
      ctx.moveTo(-0.22 * r, 0); ctx.lineTo(0.22 * r, 0);
      ctx.stroke();
      ctx.restore();
      break;
    case 'duck': {                       // stylised mask/bill
      P([[0, -0.9], [0.62, -0.45], [0.72, 0.35], [0, 0.72], [-0.72, 0.35], [-0.62, -0.45]],
        c.primary, c.accent, 0.09);
      P([[-0.34, 0.1], [0.34, 0.1], [0.5, 0.5], [0, 0.72], [-0.5, 0.5]], c.accent);
      circle(-0.26, -0.3, 0.11, c.accent);
      circle(0.26, -0.3, 0.11, c.accent);
      break;
    }
    case 'note': {                       // blue note
      ctx.save();
      ctx.rotate(-0.22);
      ctx.fillStyle = c.primary;
      ctx.beginPath();
      ctx.ellipse(-0.24 * r, 0.5 * r, 0.42 * r, 0.3 * r, -0.3, 0, TAU);
      ctx.fill();
      ctx.fillRect(0.1 * r, -0.9 * r, 0.16 * r, 1.4 * r);
      ctx.beginPath();
      ctx.moveTo(0.26 * r, -0.9 * r);
      ctx.quadraticCurveTo(0.9 * r, -0.72 * r, 0.66 * r, -0.2 * r);
      ctx.quadraticCurveTo(0.78 * r, -0.62 * r, 0.26 * r, -0.66 * r);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'wing': {                       // winged wheel
      circle(0, 0.05, 0.42, 'transparent', c.primary, 0.12);
      circle(0, 0.05, 0.1, c.primary);
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6;
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = c.primary;
        ctx.fillRect(-0.035 * r, -0.42 * r, 0.07 * r, 0.34 * r);
        ctx.restore();
      }
      for (const s of [-1, 1]) {
        for (let f = 0; f < 3; f++) {
          P([[s * 0.4, -0.34 + f * 0.2], [s * (0.95 + f * 0.02), -0.5 + f * 0.24],
          [s * 0.95, -0.34 + f * 0.24], [s * 0.4, -0.16 + f * 0.2]], c.primary);
        }
      }
      break;
    }
    case 'feather': {
      ctx.save();
      ctx.rotate(0.35);
      ctx.fillStyle = c.primary;
      ctx.beginPath();
      ctx.moveTo(0, -0.95 * r);
      ctx.quadraticCurveTo(0.42 * r, -0.1 * r, 0.1 * r, 0.9 * r);
      ctx.quadraticCurveTo(-0.34 * r, -0.05 * r, 0, -0.95 * r);
      ctx.fill();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 0.07 * r;
      ctx.beginPath();
      ctx.moveTo(0, -0.86 * r); ctx.lineTo(0.08 * r, 0.8 * r);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'bison': {
      P([[-0.8, -0.1], [-0.5, -0.62], [0.5, -0.62], [0.8, -0.1],
      [0.55, 0.5], [0.2, 0.9], [-0.2, 0.9], [-0.55, 0.5]], c.primary, c.accent, 0.08);
      P([[-0.8, -0.16], [-0.98, -0.62], [-0.6, -0.86], [-0.52, -0.5]], c.accent);
      P([[0.8, -0.16], [0.98, -0.62], [0.6, -0.86], [0.52, -0.5]], c.accent);
      circle(-0.26, -0.1, 0.09, c.accent);
      circle(0.26, -0.1, 0.09, c.accent);
      break;
    }
    case 'wingp': {                      // winged keystone
      for (const s of [-1, 1]) {
        for (let f = 0; f < 3; f++) {
          P([[s * 0.26, -0.42 + f * 0.22], [s * (0.98 - f * 0.06), -0.56 + f * 0.28],
          [s * (0.98 - f * 0.06), -0.4 + f * 0.28], [s * 0.26, -0.22 + f * 0.22]], c.primary);
        }
      }
      P([[0, -0.82], [0.34, -0.4], [0.24, 0.72], [-0.24, 0.72], [-0.34, -0.4]], c.primary, c.accent, 0.09);
      break;
    }
    case 'skate': {                      // flying skate
      P([[-0.9, 0.14], [-0.34, -0.5], [0.5, -0.5], [0.92, -0.05], [0.62, 0.42], [-0.6, 0.42]],
        c.secondary, c.accent, 0.08);
      ctx.save();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 0.13 * r; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.78 * r, 0.66 * r); ctx.lineTo(0.72 * r, 0.66 * r);
      ctx.stroke();
      ctx.lineWidth = 0.07 * r;
      ctx.beginPath();
      ctx.moveTo(-0.6 * r, 0.42 * r); ctx.lineTo(-0.6 * r, 0.66 * r);
      ctx.moveTo(0.55 * r, 0.42 * r); ctx.lineTo(0.55 * r, 0.66 * r);
      ctx.stroke();
      ctx.restore();
      break;
    }
    default:
      circle(0, 0, 0.85, c.primary, c.accent, 0.1);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ layer */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return c;
}

function rinkPath(ctx, inset = 0) {
  const hw = RINK.hw - inset, hh = RINK.hh - inset, r = RINK.corner - inset;
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh);
  ctx.lineTo(hw - r, -hh);
  ctx.arcTo(hw, -hh, hw, -hh + r, r);
  ctx.lineTo(hw, hh - r);
  ctx.arcTo(hw, hh, hw - r, hh, r);
  ctx.lineTo(-hw + r, hh);
  ctx.arcTo(-hw, hh, -hw, hh - r, r);
  ctx.lineTo(-hw, -hh + r);
  ctx.arcTo(-hw, -hh, -hw + r, -hh, r);
  ctx.closePath();
}

class Renderer {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.static = null;
    this.scratch = null;
    this.scratchCtx = null;
    this.scratchScale = 0.55;
    this.goalLight = [0, 0];
    this.softShadow = Renderer.makeShadowSprite();
  }

  /** Radial-gradient blob used for every contact shadow. */
  static makeShadowSprite() {
    const size = 128;
    const cv = makeCanvas(size, size);
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    rg.addColorStop(0, 'rgba(10,23,38,0.62)');
    rg.addColorStop(0.55, 'rgba(10,23,38,0.34)');
    rg.addColorStop(1, 'rgba(10,23,38,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
    return cv;
  }

  /** Blit the shadow blob at a world position, sized rx/ry. */
  blob(g, x, y, rx, ry, alpha) {
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(this.softShadow, x - rx, y - ry, rx * 2, ry * 2);
    g.restore();
  }

  /** Bake stands + boards + painted ice for the chosen matchup. */
  bake(teams) {
    const w = (RINK.hw + ARENA_PAD) * 2, h = (RINK.hh + ARENA_PAD) * 2;
    const cv = makeCanvas(w, h);
    const g = cv.getContext('2d');
    g.translate(w / 2, h / 2);

    this.drawStands(g, teams);
    this.drawIceBase(g, teams);
    this.drawBoards(g, teams);

    this.static = cv;
    this.staticOrigin = { x: -w / 2, y: -h / 2 };

    // Fresh ice-mark layer.
    const sw = RINK.hw * 2 * this.scratchScale, sh = RINK.hh * 2 * this.scratchScale;
    this.scratch = makeCanvas(sw, sh);
    this.scratchCtx = this.scratch.getContext('2d');
    this.scratchFade = 0;
  }

  /* ------------------------------------------------------------- stands   */

  drawStands(g, teams) {
    const w = (RINK.hw + ARENA_PAD), h = (RINK.hh + ARENA_PAD);
    // Concrete bowl
    const bowl = g.createRadialGradient(0, 0, RINK.hw * 0.5, 0, 0, RINK.hw * 1.5);
    bowl.addColorStop(0, '#1b2430');
    bowl.addColorStop(0.55, '#131a24');
    bowl.addColorStop(1, '#080b11');
    g.fillStyle = bowl;
    g.fillRect(-w, -h, w * 2, h * 2);

    // Crowd: dense speckle in the ring outside the boards, in club colours.
    const palette = [
      '#e8e8ef', '#c9ccd6', '#9aa1ad', '#6f7686', '#2b3040',
      teams[0].colors.primary, teams[1].colors.primary,
      teams[0].colors.secondary, teams[1].colors.secondary, '#f2c14e',
    ];
    const inRink = (x, y) => {
      const ix = RINK.hw - RINK.corner + 40, iy = RINK.hh - RINK.corner + 40;
      const cx = clamp(x, -ix, ix), cy = clamp(y, -iy, iy);
      return Math.hypot(x - cx, y - cy) < RINK.corner + 46;
    };
    for (let i = 0; i < 26000; i++) {
      const x = rand(-w, w), y = rand(-h, h);
      if (inRink(x, y)) continue;
      // Tiered brightness: closer to the ice = brighter (lit by the rink).
      const edge = Math.max(Math.abs(x) / RINK.hw, Math.abs(y) / RINK.hh);
      const bright = clamp(1.35 - (edge - 1) * 0.9, 0.25, 1);
      g.globalAlpha = 0.16 + Math.random() * 0.5 * bright;
      g.fillStyle = pick(palette);
      const s = 3 + Math.random() * 3.4;
      g.fillRect(x, y, s, s * 0.8);
    }
    g.globalAlpha = 1;

    // Rows of seating shadow arcs for structure.
    g.save();
    g.globalAlpha = 0.16;
    g.strokeStyle = '#000';
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 5;
      rinkPath(g, -(70 + i * 34));
      g.stroke();
    }
    g.restore();

    // Rink-side ambient glow.
    g.save();
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(0, 0, RINK.hw * 0.2, 0, 0, RINK.hw * 1.25);
    glow.addColorStop(0, 'rgba(150,200,255,0.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(-w, -h, w * 2, h * 2);
    g.restore();
  }

  /* ---------------------------------------------------------------- ice   */

  drawIceBase(g, teams) {
    g.save();
    rinkPath(g);
    g.clip();

    // Base ice: cool blue-white, brighter down the middle where the lights are.
    const grad = g.createLinearGradient(0, -RINK.hh, 0, RINK.hh);
    grad.addColorStop(0, '#b9cee6');
    grad.addColorStop(0.14, '#dceaf8');
    grad.addColorStop(0.45, '#eef6fe');
    grad.addColorStop(0.72, '#e2eefb');
    grad.addColorStop(1, '#b3c8e2');
    g.fillStyle = grad;
    g.fillRect(-RINK.hw, -RINK.hh, RINK.hw * 2, RINK.hh * 2);

    // Overhead light pools.
    g.globalCompositeOperation = 'lighter';
    for (const lx of [-660, -220, 220, 660]) {
      for (const ly of [-165, 165]) {
        const rg = g.createRadialGradient(lx, ly, 0, lx, ly, 400);
        rg.addColorStop(0, 'rgba(255,255,255,0.30)');
        rg.addColorStop(0.5, 'rgba(226,242,255,0.14)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(lx, ly, 400, 0, TAU); g.fill();
      }
    }
    // Long specular streaks — the glassy sheen of a fresh flood.
    for (let i = 0; i < 5; i++) {
      const y = -RINK.hh + 90 + i * (RINK.hh * 2 - 180) / 4;
      const sg = g.createLinearGradient(0, y - 40, 0, y + 40);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.07)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(-RINK.hw, y - 40, RINK.hw * 2, 80);
    }
    g.globalCompositeOperation = 'source-over';

    // ---- centre-ice club mark
    g.save();
    g.globalAlpha = 0.22;
    drawCrest(g, teams[0], 175);
    g.restore();
    g.save();
    g.globalAlpha = 0.13;
    g.font = '900 66px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#12305a';
    g.fillText(teams[0].city.toUpperCase(), 0, -215);
    g.fillText(teams[1].city.toUpperCase(), 0, 258);
    g.restore();

    // Faded club marks in the end zones.
    for (let i = 0; i < 2; i++) {
      g.save();
      g.globalAlpha = 0.06;
      g.translate((i === 0 ? -1 : 1) * (RINK.dotX - 30), 0);
      drawCrest(g, teams[i], 96);
      g.restore();
    }

    // ---- painted lines
    const paint = (x, w, color, alpha = 1) => {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.fillRect(x - w / 2, -RINK.hh, w, RINK.hh * 2);
      g.globalAlpha = 1;
    };
    paint(0, 12, '#d8232f');                       // centre red
    paint(-RINK.blue, 22, '#1f4fb5');              // blue lines
    paint(RINK.blue, 22, '#1f4fb5');

    // Goal lines follow the board curve, so clip them to the rink.
    for (const s of [-1, 1]) {
      g.fillStyle = '#d8232f';
      g.fillRect(s * RINK.goalLine - 3, -RINK.hh, 6, RINK.hh * 2);
    }

    // Faceoff circles + dots.
    const circle = (x, y, r, color, lw, fill) => {
      g.beginPath(); g.arc(x, y, r, 0, TAU);
      if (fill) { g.fillStyle = fill; g.fill(); }
      g.strokeStyle = color; g.lineWidth = lw; g.stroke();
    };
    circle(0, 0, RINK.circleR, '#1f4fb5', 6);
    circle(0, 0, 12, '#1f4fb5', 0, '#1f4fb5');
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = sx * RINK.dotX, y = sy * RINK.dotY;
        circle(x, y, RINK.circleR, '#d8232f', 6);
        circle(x, y, 14, '#d8232f', 0, '#d8232f');
        // Hash marks
        g.strokeStyle = '#d8232f'; g.lineWidth = 5;
        for (const hx of [-1, 1]) {
          for (const hy of [-1, 1]) {
            g.beginPath();
            g.moveTo(x + hx * 60, y + hy * 90);
            g.lineTo(x + hx * 60, y + hy * 145);
            g.stroke();
          }
        }
        // Alignment L's
        g.lineWidth = 5;
        for (const lx of [-1, 1]) {
          for (const ly of [-1, 1]) {
            g.beginPath();
            g.moveTo(x + lx * 30, y + ly * 45);
            g.lineTo(x + lx * 30, y + ly * 12);
            g.lineTo(x + lx * 68, y + ly * 12);
            g.stroke();
          }
        }
        // Neutral-zone dots
        if (sx > 0) {
          circle(sy * RINK.nzDotX, sy * 0 + (sx * RINK.dotY), 0, '#d8232f', 0);
        }
      }
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      circle(sx * RINK.nzDotX, sy * RINK.dotY, 14, '#d8232f', 0, '#d8232f');
    }

    // Creases: straight sides off the goal line, then the 6ft radius arc.
    for (const s of [-1, 1]) {
      const gl = s * RINK.goalLine;
      const cw = 62;                       // half width of the blue paint
      const straight = 34;                 // straight run before the arc
      const depth = RINK.creaseR;
      const dir = -s;                      // out onto the ice, away from the boards

      const creasePath = () => {
        g.beginPath();
        g.moveTo(gl, -cw);
        g.lineTo(gl + dir * straight, -cw);
        g.bezierCurveTo(gl + dir * (depth - 4), -cw, gl + dir * depth, -cw * 0.55, gl + dir * depth, 0);
        g.bezierCurveTo(gl + dir * depth, cw * 0.55, gl + dir * (depth - 4), cw, gl + dir * straight, cw);
        g.lineTo(gl, cw);
        g.closePath();
      };

      g.save();
      creasePath();
      // Paint is deeper right at the goal mouth and fades outward.
      const cg = g.createLinearGradient(gl, 0, gl + dir * depth, 0);
      cg.addColorStop(0, 'rgba(70,146,232,0.72)');
      cg.addColorStop(1, 'rgba(126,186,246,0.42)');
      g.fillStyle = cg;
      g.fill();
      // Inner sheen so the paint reads as ice, not a flat sticker.
      g.save();
      creasePath(); g.clip();
      const sh = g.createLinearGradient(0, -cw, 0, cw);
      sh.addColorStop(0, 'rgba(255,255,255,0.28)');
      sh.addColorStop(0.45, 'rgba(255,255,255,0.04)');
      sh.addColorStop(1, 'rgba(10,50,110,0.14)');
      g.fillStyle = sh;
      g.fillRect(gl - depth, -cw, depth * 2, cw * 2);
      g.restore();
      creasePath();
      g.strokeStyle = '#d8232f'; g.lineWidth = 5; g.stroke();
      // The two white hash marks on the crease lines.
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4;
      for (const sy of [-1, 1]) {
        g.beginPath();
        g.moveTo(gl + dir * straight, sy * cw);
        g.lineTo(gl + dir * straight, sy * (cw - 16));
        g.stroke();
      }
      g.restore();

      // Restricted-area trapezoid
      g.save();
      g.strokeStyle = '#d8232f'; g.lineWidth = 4; g.globalAlpha = 0.85;
      g.beginPath();
      g.moveTo(gl, -110); g.lineTo(s * (RINK.hw - 6), -180);
      g.moveTo(gl, 110); g.lineTo(s * (RINK.hw - 6), 180);
      g.stroke();
      g.restore();
    }

    // Dasher-board sponsor ribbon reflected on the ice near the boards.
    g.save();
    g.globalCompositeOperation = 'multiply';
    const vg = g.createLinearGradient(0, -RINK.hh, 0, -RINK.hh + 130);
    vg.addColorStop(0, 'rgba(150,170,200,0.55)');
    vg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = vg;
    g.fillRect(-RINK.hw, -RINK.hh, RINK.hw * 2, 130);
    const vg2 = g.createLinearGradient(0, RINK.hh, 0, RINK.hh - 130);
    vg2.addColorStop(0, 'rgba(150,170,200,0.5)');
    vg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = vg2;
    g.fillRect(-RINK.hw, RINK.hh - 130, RINK.hw * 2, 130);
    g.restore();

    g.restore();
  }

  drawBoards(g, teams) {
    // White dasher boards.
    g.save();
    g.lineJoin = 'round';
    g.strokeStyle = '#f4f7fb';
    g.lineWidth = 26;
    rinkPath(g, -13);
    g.stroke();

    // Coloured ad ribbon on the dasher.
    g.save();
    rinkPath(g, -26);
    g.clip();
    rinkPath(g, -2);
    g.strokeStyle = teams[0].colors.primary;
    g.lineWidth = 26;
    g.setLineDash([260, 260]);
    g.lineDashOffset = 0;
    g.globalAlpha = 0.9;
    g.stroke();
    g.strokeStyle = teams[1].colors.primary;
    g.lineDashOffset = 260;
    g.stroke();
    g.restore();

    // Kick plate (yellow strip at ice level).
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 5;
    rinkPath(g, 1);
    g.stroke();

    // Glass: a soft rim highlight above the boards.
    g.strokeStyle = 'rgba(200,235,255,0.30)';
    g.lineWidth = 40;
    rinkPath(g, -46);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 4;
    rinkPath(g, -66);
    g.stroke();
    g.restore();
  }

  /* ---------------------------------------------------------- ice marks   */

  updateScratches(match, dt) {
    if (!this.scratchCtx) return;
    const g = this.scratchCtx;
    const k = this.scratchScale;
    g.save();
    g.translate(this.scratch.width / 2, this.scratch.height / 2);
    g.scale(k, k);
    g.globalCompositeOperation = 'source-over';
    for (const s of match.scratches) {
      if (s.drawn) continue;
      s.drawn = true;
      g.fillStyle = 'rgba(186,209,236,0.34)';
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, TAU);
      g.fill();
    }
    g.restore();

    // Slow fade so the sheet gradually recovers.
    this.scratchFade += dt;
    if (this.scratchFade > 0.35) {
      this.scratchFade = 0;
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect(0, 0, this.scratch.width, this.scratch.height);
      g.restore();
    }
  }

  /* ------------------------------------------------------------- entities */

  drawNet(g, side, team, lightT) {
    const gl = side * RINK.goalLine;
    const back = side * (RINK.goalLine + RINK.netDepth);
    const gh = RINK.goalHalf;

    // Goal light behind the net.
    if (lightT > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const lx = side * (RINK.hw - 40);
      const pulse = 0.5 + 0.5 * Math.sin(lightT * 22);
      const rg = g.createRadialGradient(lx, 0, 0, lx, 0, 460);
      rg.addColorStop(0, `rgba(255,40,30,${0.55 * pulse})`);
      rg.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(lx, 0, 460, 0, TAU); g.fill();
      g.restore();
    }

    // Cage outline: straight sides from the posts, rounded back corners.
    const bw = gh * 0.82;                 // half width at the back of the cage
    const rr = 14;                        // rounded back corners
    const cagePath = () => {
      g.beginPath();
      g.moveTo(gl, -gh);
      g.lineTo(back - side * rr, -bw);
      g.quadraticCurveTo(back, -bw, back, -bw + rr);
      g.lineTo(back, bw - rr);
      g.quadraticCurveTo(back, bw, back - side * rr, bw);
      g.lineTo(gl, gh);
      g.closePath();
    };

    g.save();

    // Soft shadow the cage casts on the ice.
    g.save();
    g.translate(side * 5, 7);
    cagePath();
    g.fillStyle = 'rgba(12,28,50,0.18)';
    g.fill();
    g.restore();

    // Netting: white twine, denser toward the back, with a diamond weave.
    cagePath();
    g.fillStyle = 'rgba(236,243,252,0.62)';
    g.fill();

    g.save();
    cagePath();
    g.clip();
    g.lineWidth = 1.3;
    g.strokeStyle = 'rgba(96,116,146,0.62)';
    const span = Math.abs(back - gl);
    const diag = 13;
    // Two crossing families of lines make the mesh read as woven twine
    // rather than a grid of squares.
    for (let d = -gh * 2; d < span + gh * 2; d += diag) {
      g.beginPath();
      g.moveTo(gl + side * d, -gh - 20);
      g.lineTo(gl + side * (d + gh * 2 + 20), gh + 20);
      g.stroke();
      g.beginPath();
      g.moveTo(gl + side * d, gh + 20);
      g.lineTo(gl + side * (d + gh * 2 + 20), -gh - 20);
      g.stroke();
    }
    // Depth: the back of the cage sits in shade.
    const dg = g.createLinearGradient(gl, 0, back, 0);
    dg.addColorStop(0, 'rgba(20,40,70,0)');
    dg.addColorStop(1, 'rgba(20,40,70,0.30)');
    g.fillStyle = dg;
    g.fill();
    g.restore();

    // White base skirt around the foot of the cage.
    g.save();
    cagePath();
    g.strokeStyle = 'rgba(250,252,255,0.85)';
    g.lineWidth = 13;
    g.stroke();
    g.restore();

    // Frame pipe: dark base, red body, bright top highlight.
    cagePath();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#7d0d0d'; g.lineWidth = 12; g.stroke();
    g.strokeStyle = '#d81f1f'; g.lineWidth = 8.5; g.stroke();
    g.strokeStyle = '#ff6b6b'; g.lineWidth = 3; g.stroke();

    // Crossbar directly overhead — suggested, so the mouth stays open.
    g.save();
    g.globalAlpha = 0.4;
    g.strokeStyle = '#ff5252';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(gl, -gh); g.lineTo(gl, gh);
    g.stroke();
    g.restore();

    // Posts, with a specular dot so they look like round steel.
    for (const sy of [-1, 1]) {
      g.beginPath(); g.arc(gl, sy * gh, 7, 0, TAU);
      g.fillStyle = '#c81b1b'; g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(gl - 2, sy * gh - 2.4, 2.4, 0, TAU);
      g.fillStyle = 'rgba(255,220,220,0.9)'; g.fill();
    }
    g.restore();
  }

  /** Home wears colour, away wears white — the classic way to keep two
   *  similarly-coloured clubs apart at a glance. */
  static kit(team, isAway) {
    const c = team.colors;
    // Pants and helmet are chosen to sit clearly apart in value from the
    // sweater, so a navy club doesn't render as one undifferentiated blob.
    if (!isAway) {
      const yoke = contrastPick(c.primary, [c.secondary, c.accent], 0.18);
      return {
        jersey: c.primary,
        yoke,
        stripe: contrastPick(c.primary, [c.accent, c.secondary], 0.25),
        glove: yoke,
        helmet: contrastPick(c.primary, ['#1c2230', '#e8eef8'], 0.3),
        pants: lum(c.primary) > 0.42 ? '#191f2b' : shade(c.secondary, -0.35),
        edge: 'rgba(6,12,22,0.75)',
        ink: contrastInk(c.primary),
      };
    }
    return {
      jersey: '#f1f5fb',
      yoke: c.primary,
      stripe: contrastPick('#f1f5fb', [c.secondary, c.primary], 0.25),
      glove: c.primary,
      helmet: contrastPick('#f1f5fb', [c.primary, c.secondary], 0.3),
      pants: '#191f2b',
      edge: 'rgba(6,12,22,0.7)',
      ink: lum(c.primary) > 0.62 ? shade(c.primary, -0.45) : c.primary,
    };
  }

  drawSkater(g, s, team, opts = {}) {
    const c = team.colors;
    const kit = Renderer.kit(team, s.team === 1);
    const down = s.down > 0;
    const t = opts.time || 0;

    g.save();
    g.translate(s.x, s.y);
    // Body art is authored at r=21; scale to whatever SKATER_R is.
    g.scale(SKATER_R / 21, SKATER_R / 21);

    // Contact shadow, offset with the arena lighting.
    this.blob(g, 3, 7, SKATER_R * (down ? 1.5 : 1.15), SKATER_R * (down ? 1.0 : 0.78),
      down ? 0.5 : 0.72);

    // Fire aura.
    if (s.fire > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const pulse = 0.65 + 0.35 * Math.sin(t * 9 + s.slot);
      const rg = g.createRadialGradient(0, 0, 4, 0, 0, 58 * pulse);
      rg.addColorStop(0, 'rgba(255,240,180,0.85)');
      rg.addColorStop(0.35, 'rgba(255,150,30,0.62)');
      rg.addColorStop(0.7, 'rgba(255,80,10,0.3)');
      rg.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(0, 0, 58 * pulse, 0, TAU); g.fill();
      g.restore();
    }

    // Control marker.
    if (opts.marker) {
      g.save();
      const pulse = 0.75 + 0.25 * Math.sin(t * 7);
      g.strokeStyle = opts.markerColor || '#fff';
      g.lineWidth = 3;
      g.globalAlpha = 0.9;
      g.beginPath();
      g.ellipse(0, 6, 27 * pulse, 17 * pulse, 0, 0, TAU);
      g.stroke();
      g.globalAlpha = 0.35;
      g.lineWidth = 8;
      g.stroke();
      g.restore();
    }

    const elevate = down ? 2 : -8;             // fake a little height off the ice
    g.save();                                  // ---- body space
    g.translate(0, elevate);
    g.rotate(s.face + (down ? 0.5 : 0));
    if (down) g.scale(1.2, 0.62);

    const lean = clamp(s.lean, -0.5, 0.5);
    const stride = Math.sin(s.skatePhase * 2) * (down ? 0 : 1);
    const pants = kit.pants;
    const bladeAhead = 30;
    const bladeY = (s.pokeAnim > 0 ? 1 : 8) + Math.sin(s.skatePhase * 2) * 2;

    // ---- skates: boot, steel holder, blade. The push leg splays out.
    for (const side of [-1, 1]) {
      const push = stride * side;
      const splay = side * (0.14 + Math.max(0, push) * 0.3);
      g.save();
      g.translate(-7 + push * 6, side * 8 + push);
      g.rotate(splay);

      g.beginPath();                                   // pant leg / shin
      g.ellipse(-1.5, 0, 6.5, 3.9, 0, 0, TAU);
      g.fillStyle = pants; g.fill();
      g.strokeStyle = 'rgba(8,14,24,0.4)'; g.lineWidth = 0.8; g.stroke();

      g.beginPath();                                   // boot
      g.moveTo(1.5, -2.7);
      g.lineTo(8, -2);
      g.quadraticCurveTo(10.5, 0, 8, 2);
      g.lineTo(1.5, 2.7);
      g.closePath();
      g.fillStyle = '#181c24'; g.fill();

      g.fillStyle = '#59616e';                         // holder
      g.fillRect(1.5, -0.8, 8, 1.6);
      g.strokeStyle = '#e2ecf8'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.5, 0); g.lineTo(11, 0); g.stroke();
      g.restore();
    }

    // ---- stick, two hands on it, blade flat on the ice out front
    const topHand = { x: 0, y: 13.5 + (s.checkAnim > 0 ? -7 : 0) };
    const botHand = { x: 14, y: lerp(topHand.y, bladeY, 0.5) };
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(8,14,24,0.28)';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(topHand.x, topHand.y + 1.5); g.lineTo(bladeAhead - 5, bladeY + 1.5); g.stroke();
    g.strokeStyle = '#23282f';
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(topHand.x, topHand.y); g.lineTo(bladeAhead - 5, bladeY); g.stroke();
    g.strokeStyle = kit.stripe;                        // tape at the knob
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(topHand.x, topHand.y); g.lineTo(topHand.x + 3, topHand.y - 1); g.stroke();
    g.strokeStyle = '#15181e';                         // blade
    g.lineWidth = 3.8;
    g.beginPath();
    g.moveTo(bladeAhead - 5, bladeY);
    g.quadraticCurveTo(bladeAhead + 1, bladeY - 1.6, bladeAhead + 6, bladeY - 3.4);
    g.stroke();
    g.restore();

    // ---- body. Torso dominates; shoulders are bumps, not lobes.
    g.save();
    g.rotate(lean * 0.2);

    const bodyPath = () => {
      g.beginPath();
      g.ellipse(0, 0, 15.5, 12.8, 0, 0, TAU);
    };

    g.save();                                          // separation halo
    g.translate(1.5, 2.5);
    bodyPath();
    g.fillStyle = 'rgba(8,18,32,0.24)';
    g.fill();
    g.restore();

    for (const sy of [-1, 1]) {                        // shoulder bumps
      g.save();
      g.translate(4, sy * 9.8);
      g.rotate(sy * 0.3);
      g.beginPath();
      g.ellipse(0, 0, 6, 4.2, 0, 0, TAU);
      g.fillStyle = kit.jersey; g.fill();
      g.strokeStyle = kit.edge; g.lineWidth = 1.2; g.stroke();
      g.restore();
    }

    bodyPath();
    g.fillStyle = kit.jersey;
    g.fill();

    g.save();
    bodyPath();
    g.clip();
    g.beginPath();                                     // chest yoke
    g.moveTo(9, -14);
    g.quadraticCurveTo(17, -6, 17, 0);
    g.quadraticCurveTo(17, 6, 9, 14);
    g.quadraticCurveTo(13.5, 0, 9, -14);
    g.fillStyle = kit.yoke;
    g.fill();
    g.strokeStyle = kit.stripe;                        // sleeve cuffs
    g.lineWidth = 2;
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.moveTo(2, sy * 13); g.quadraticCurveTo(8, sy * 10, 11, sy * 6);
      g.stroke();
    }
    g.lineWidth = 1.8;                                 // hem stripe
    g.beginPath();
    g.moveTo(-11.5, -8); g.quadraticCurveTo(-15, 0, -11.5, 8);
    g.stroke();
    g.restore();

    bodyPath();
    g.strokeStyle = kit.edge;
    g.lineWidth = 1.8;
    g.stroke();
    g.restore();

    // ---- gloves
    for (const h of [topHand, botHand]) {
      g.save();
      g.translate(h.x, h.y);
      g.fillStyle = kit.glove;
      g.beginPath();
      g.ellipse(0, 0, 5, 4.1, 0, 0, TAU);
      g.fill();
      g.strokeStyle = kit.edge; g.lineWidth = 1; g.stroke();
      g.restore();
    }

    // ---- helmet: shell, ear cups, cage
    g.save();
    g.translate(10.5, 0);
    g.beginPath(); g.arc(0, 0, 7.8, 0, TAU);
    g.fillStyle = kit.helmet; g.fill();
    g.strokeStyle = kit.edge; g.lineWidth = 1.3; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(-1, 0, 5, -1.5, 1.5); g.stroke();
    for (const sy of [-1, 1]) {
      g.beginPath(); g.ellipse(-1.5, sy * 6.2, 2.8, 2, 0, 0, TAU);
      g.fillStyle = shade(kit.helmet, -0.28); g.fill();
    }
    g.strokeStyle = 'rgba(24,32,48,0.8)';
    g.lineWidth = 2.1;
    g.beginPath(); g.arc(1.2, 0, 7, -1.25, 1.25); g.stroke();
    g.restore();

    g.restore(); // ---- end body space

    // ---- volume lighting, fixed in world space so it does not spin with him
    if (!down) {
      g.save();
      g.translate(0, elevate);
      g.beginPath();
      g.ellipse(0, 0, 18, 16, 0, 0, TAU);
      g.clip();
      const hi = g.createLinearGradient(0, -16, 0, -1);
      hi.addColorStop(0, 'rgba(255,255,255,0.22)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hi;
      g.fillRect(-20, -20, 40, 40);
      const lo = g.createLinearGradient(0, 3, 0, 16);
      lo.addColorStop(0, 'rgba(6,16,32,0)');
      lo.addColorStop(1, 'rgba(6,16,32,0.22)');
      g.fillStyle = lo;
      g.fillRect(-20, -20, 40, 40);
      g.restore();
    }

    // ---- number, always upright
    if (!down) {
      g.save();
      g.translate(0, elevate + 1);
      g.font = '900 11px Impact, "Arial Black", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const nx = -Math.cos(s.face) * 3.5, ny = -Math.sin(s.face) * 3.5;
      g.lineWidth = 2.4;
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.strokeText(String(s.data.n), nx, ny);
      g.fillStyle = kit.ink;
      g.fillText(String(s.data.n), nx, ny);
      g.restore();
    } else {
      // Stars when knocked down.
      g.save();
      g.translate(0, -22);
      g.globalAlpha = clamp(s.down, 0, 1);
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * TAU / 3;
        g.fillStyle = '#ffe27a';
        g.beginPath();
        g.arc(Math.cos(a) * 15, Math.sin(a) * 6, 3, 0, TAU);
        g.fill();
      }
      g.restore();
    }

    // ---- charge indicator
    if (s.charging && s.charge > 0.05) {
      g.save();
      g.translate(0, elevate);
      const a = -Math.PI / 2;
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.arc(0, 0, 30, a, a + TAU * 0.999); g.stroke();
      const full = s.charge > 0.92;
      g.strokeStyle = full ? '#ff8a1e' : '#ffe27a';
      if (full) { g.shadowColor = '#ff8a1e'; g.shadowBlur = 14; }
      g.beginPath(); g.arc(0, 0, 30, a, a + TAU * s.charge); g.stroke();
      g.restore();
    }

    g.restore();
  }

  drawGoalie(g, gk, team, t) {
    const c = team.colors;
    const kit = Renderer.kit(team, gk.team === 1);
    g.save();
    g.translate(gk.x, gk.y);
    g.scale(1.1, 1.1);

    this.blob(g, 4, 10, 38, 26, 0.8);

    g.translate(0, -7);
    g.rotate(gk.face);

    const flash = gk.saveAnim > 0 ? gk.saveAnim / 0.45 : 0;

    // Leg pads — the big rectangles that cover the bottom of the net.
    for (const side of [-1, 1]) {
      g.save();
      g.translate(3, side * (14 + flash * 7));
      g.rotate(side * flash * 0.45);
      const w = 30, h = 17;
      g.beginPath();
      if (g.roundRect) g.roundRect(-w / 2, -h / 2, w, h, 5); else g.rect(-w / 2, -h / 2, w, h);
      g.fillStyle = '#f4f7fb'; g.fill();
      g.strokeStyle = c.primary; g.lineWidth = 3; g.stroke();
      // roll bars across the pad face
      g.strokeStyle = 'rgba(30,50,80,0.28)'; g.lineWidth = 1.2;
      for (const bx of [-8, 0, 8]) {
        g.beginPath(); g.moveTo(bx, -h / 2 + 2); g.lineTo(bx, h / 2 - 2); g.stroke();
      }
      // skate poking out the back of the pad
      g.strokeStyle = '#cdd8e6'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-w / 2 - 4, 0); g.lineTo(-w / 2 + 1, 0); g.stroke();
      g.restore();
    }

    // Chest and arm protector
    g.beginPath();
    g.moveTo(-11, -14); g.quadraticCurveTo(6, -19, 15, -12);
    g.quadraticCurveTo(20, 0, 15, 12);
    g.quadraticCurveTo(6, 19, -11, 14);
    g.quadraticCurveTo(-15, 0, -11, -14);
    g.closePath();
    g.fillStyle = c.primary; g.fill();
    g.strokeStyle = shade(c.primary, -0.45); g.lineWidth = 2.2; g.stroke();
    // chest crest
    g.save();
    g.globalAlpha = 0.5;
    g.translate(3, 0); g.rotate(-gk.face);
    drawCrest(g, team, 8);
    g.restore();

    // Blocker — rectangular slab on the stick side
    g.save();
    g.translate(9, -20 - flash * 10);
    g.rotate(-flash * 0.5);
    g.beginPath();
    if (g.roundRect) g.roundRect(-8, -10, 17, 20, 4); else g.rect(-8, -10, 17, 20);
    g.fillStyle = '#eef3fa'; g.fill();
    g.strokeStyle = kit.yoke; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(30,50,80,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-4, -9); g.lineTo(-4, 9); g.stroke();
    g.restore();

    // Trapper — round catching glove
    g.save();
    g.translate(9, 20 + flash * 10);
    g.beginPath(); g.arc(0, 0, 10 + flash * 2, 0, TAU);
    g.fillStyle = kit.glove; g.fill();
    g.strokeStyle = kit.edge; g.lineWidth = 1.8; g.stroke();
    g.beginPath(); g.arc(2, 0, 6, -1.9, 1.1);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.6; g.stroke();
    g.restore();

    // Paddle-down stick
    g.strokeStyle = '#1d2229';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(5, -14); g.lineTo(26, 6); g.stroke();
    g.strokeStyle = '#e8eef6';
    g.lineWidth = 9;
    g.beginPath(); g.moveTo(21, 1); g.lineTo(33, 13); g.stroke();
    g.strokeStyle = kit.yoke;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(21, 1); g.lineTo(33, 13); g.stroke();

    // Mask
    g.save();
    g.translate(10, 0);
    g.beginPath(); g.arc(0, 0, 10, 0, TAU);
    g.fillStyle = '#f7f9fc'; g.fill();
    g.strokeStyle = c.primary; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = 'rgba(24,32,48,0.85)'; g.lineWidth = 2.6;
    g.beginPath(); g.arc(1.5, 0, 8.8, -1.3, 1.3); g.stroke();
    g.strokeStyle = 'rgba(24,32,48,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(2, -7); g.lineTo(10, -3); g.stroke();
    g.beginPath(); g.moveTo(2, 7); g.lineTo(10, 3); g.stroke();
    g.restore();

    g.restore();

    // Number
    g.save();
    g.translate(gk.x, gk.y - 6);
    g.font = '900 12px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const gnx = -Math.cos(gk.face) * 4, gny = -Math.sin(gk.face) * 4;
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.strokeText(String(gk.data.n), gnx, gny);
    g.fillStyle = contrastInk(team.colors.primary);
    g.fillText(String(gk.data.n), gnx, gny);
    g.restore();
  }

  drawPuck(g, p) {
    // Motion trail.
    const sp = p.speed;
    if (p.trail.length > 2 && sp > 200) {
      g.save();
      g.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
        // Skip teleports (faceoff resets, whistles) so the trail never
        // smears a band across the whole sheet.
        if (dist(p.trail[i - 1].x, p.trail[i - 1].y, p.trail[i].x, p.trail[i].y) > 90) continue;
        const a = (i / p.trail.length) * clamp(sp / 1400, 0.15, 0.6);
        g.strokeStyle = p.hot > 0 ? `rgba(255,150,40,${a})` : `rgba(30,40,55,${a})`;
        g.lineWidth = PUCK_R * 2 * (i / p.trail.length);
        g.beginPath();
        g.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        g.lineTo(p.trail[i].x, p.trail[i].y);
        g.stroke();
      }
      g.restore();
    }

    g.save();
    g.translate(p.x, p.y);
    g.globalAlpha = 0.35;
    g.fillStyle = '#0b1a2b';
    g.beginPath(); g.ellipse(2, 4, PUCK_R * 1.1, PUCK_R * 0.8, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;

    if (p.hot > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(0, 0, 1, 0, 0, 30);
      rg.addColorStop(0, 'rgba(255,230,150,0.9)');
      rg.addColorStop(0.4, 'rgba(255,120,20,0.6)');
      rg.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
      g.restore();
    }

    g.rotate(p.spin);
    g.beginPath();
    g.arc(0, -1.5, PUCK_R, 0, TAU);
    g.fillStyle = '#14171d';
    g.fill();
    g.strokeStyle = '#3a4150';
    g.lineWidth = 1.4;
    g.stroke();
    g.beginPath();
    g.arc(-2, -3.5, PUCK_R * 0.45, -2.6, -0.4);
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
  }

  /* ------------------------------------------------------------- compose  */

  drawWorld(ctx, match, cam, dt, t) {
    const teams = match.teams;

    ctx.drawImage(this.static, this.staticOrigin.x, this.staticOrigin.y);

    // Ice marks.
    this.updateScratches(match, dt);
    ctx.save();
    rinkPath(ctx);
    ctx.clip();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(this.scratch, -RINK.hw, -RINK.hh, RINK.hw * 2, RINK.hh * 2);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Crowd camera flashes.
    ctx.save();
    const flashes = match.excitement > 0.5 ? 5 : 1;
    for (let i = 0; i < flashes; i++) {
      if (Math.random() > 0.35) continue;
      const edge = Math.random() < 0.5;
      const x = edge ? rand(-RINK.hw - 260, RINK.hw + 260) : (Math.random() < 0.5 ? -1 : 1) * rand(RINK.hw + 30, RINK.hw + 300);
      const y = edge ? (Math.random() < 0.5 ? -1 : 1) * rand(RINK.hh + 30, RINK.hh + 300) : rand(-RINK.hh - 260, RINK.hh + 260);
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 26);
      rg.addColorStop(0, 'rgba(255,255,255,0.85)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // Goal lights.
    for (let i = 0; i < 2; i++) this.goalLight[i] = Math.max(0, this.goalLight[i] - dt);
    if (match.phase === 'goal' && match.goalInfo) {
      this.goalLight[match.goalInfo.team] = 1;
    }

    // Nets (team 0 attacks +x, so the right net lights for team 0).
    this.drawNet(ctx, 1, teams[1], match.phase === 'goal' && match.goalInfo && match.goalInfo.team === 0 ? t : 0);
    this.drawNet(ctx, -1, teams[0], match.phase === 'goal' && match.goalInfo && match.goalInfo.team === 1 ? t : 0);

    // Under-skater particles (spray, marks).
    match.particles.draw(ctx);

    // Goalies then skaters, sorted so lower players overlap higher ones.
    for (let i = 0; i < 2; i++) this.drawGoalie(ctx, match.goalies[i], teams[i], t);

    const order = match.skaters.slice().sort((a, b) => a.y - b.y);
    for (const s of order) {
      const isControlled = !match.opts.demo &&
        match.opts.humans.includes(s.team) && match.control[s.team] === s.slot;
      this.drawSkater(ctx, s, teams[s.team], {
        time: t,
        marker: isControlled,
        markerColor: teams[s.team].colors.accent,
      });
    }

    this.drawPuck(ctx, match.puck);

    // Name flag over the controlled skater.
    for (const s of match.skaters) {
      if (match.opts.demo) break;
      if (!match.opts.humans.includes(s.team) || match.control[s.team] !== s.slot) continue;
      this.drawNameFlag(ctx, s, teams[s.team]);
    }
  }

  drawNameFlag(g, s, team) {
    const c = team.colors;
    g.save();
    g.translate(s.x, s.y - 40);
    const label = s.data.short;
    g.font = '900 13px Impact, "Arial Black", sans-serif';
    const w = g.measureText(label).width + 18;
    g.fillStyle = 'rgba(6,12,20,0.72)';
    g.beginPath();
    g.roundRect ? g.roundRect(-w / 2, -12, w, 18, 4) : g.rect(-w / 2, -12, w, 18);
    g.fill();
    g.fillStyle = c.primary;
    g.fillRect(-w / 2, 4, w, 2.5);
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 0, -3);
    // little pointer
    g.beginPath();
    g.moveTo(-5, 6.5); g.lineTo(5, 6.5); g.lineTo(0, 12);
    g.fillStyle = 'rgba(6,12,20,0.72)';
    g.fill();
    g.restore();
  }
}
