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

    // Creases + trapezoids.
    for (const s of [-1, 1]) {
      const gl = s * RINK.goalLine;
      g.save();
      g.beginPath();
      g.moveTo(gl, -RINK.creaseR * 0.62);
      g.arc(gl, 0, RINK.creaseR, s > 0 ? Math.PI * 0.72 : -Math.PI * 0.28,
        s > 0 ? Math.PI * 1.28 : Math.PI * 0.28, false);
      g.closePath();
      g.fillStyle = 'rgba(96,166,240,0.55)';
      g.fill();
      g.strokeStyle = '#d8232f'; g.lineWidth = 5; g.stroke();
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

    g.save();
    // Mesh
    g.beginPath();
    g.moveTo(gl, -gh); g.lineTo(back, -gh * 0.85);
    g.lineTo(back, gh * 0.85); g.lineTo(gl, gh);
    g.closePath();
    g.fillStyle = 'rgba(228,238,250,0.55)';
    g.fill();
    g.strokeStyle = 'rgba(74,96,124,0.75)';
    g.lineWidth = 1.6;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      g.beginPath();
      g.moveTo(lerp(gl, back, t), lerp(-gh, -gh * 0.85, t));
      g.lineTo(lerp(gl, back, t), lerp(gh, gh * 0.85, t));
      g.stroke();
    }
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      g.beginPath();
      g.moveTo(gl, lerp(-gh, gh, t));
      g.lineTo(back, lerp(-gh * 0.85, gh * 0.85, t));
      g.stroke();
    }
    // Frame
    g.strokeStyle = '#b81515';
    g.lineWidth = 11;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(gl, -gh); g.lineTo(back, -gh * 0.85);
    g.lineTo(back, gh * 0.85); g.lineTo(gl, gh);
    g.stroke();
    g.strokeStyle = '#f03030';
    g.lineWidth = 7;
    g.stroke();
    // Crossbar, seen from directly above — hint it, don't wall off the mouth.
    g.save();
    g.globalAlpha = 0.45;
    g.strokeStyle = '#ff3b3b';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(gl, -gh); g.lineTo(gl, gh);
    g.stroke();
    g.restore();
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.arc(gl, sy * gh, 6.5, 0, TAU);
      g.fillStyle = '#ff5252'; g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }

  /** Home wears colour, away wears white — the classic way to keep two
   *  similarly-coloured clubs apart at a glance. */
  static kit(team, isAway) {
    const c = team.colors;
    if (!isAway) {
      return {
        jersey: c.primary, yoke: shade(c.secondary, 0.05), stripe: c.accent,
        glove: shade(c.secondary, -0.2), helmet: shade(c.secondary, 0.02),
        pants: shade(c.secondary, -0.15), edge: shade(c.primary, -0.55),
        ink: contrastInk(c.primary),
      };
    }
    return {
      jersey: '#f4f7fc', yoke: c.primary, stripe: c.secondary,
      glove: c.primary, helmet: '#eef3fa',
      pants: shade(c.secondary, -0.25), edge: shade(c.primary, -0.3),
      ink: c.primary === '#FFFFFF' ? '#16233a' : shade(c.primary, -0.15),
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

    // Contact shadow.
    g.save();
    g.globalAlpha = down ? 0.16 : 0.3;
    g.fillStyle = '#0b1a2b';
    g.beginPath();
    g.ellipse(3, 7, SKATER_R * (down ? 1.25 : 0.92), SKATER_R * (down ? 0.8 : 0.6), 0, 0, TAU);
    g.fill();
    g.restore();

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

    const elevate = down ? 2 : -7;             // fake a little height off the ice
    g.save();                                  // ---- body space
    g.translate(0, elevate);
    g.rotate(s.face + (down ? s.skatePhase * 0.6 : 0));
    if (down) g.scale(1.15, 0.72);

    const lean = clamp(s.lean, -0.5, 0.5);
    const stride = Math.sin(s.skatePhase * 2) * (down ? 0 : 1);
    const pants = kit.pants;

    // ---- skates + legs
    for (const side of [-1, 1]) {
      const off = side * 9;
      const push = stride * side * 7;
      g.save();
      g.translate(-4 + push, off);
      g.fillStyle = pants;
      g.beginPath();
      g.ellipse(0, 0, 11, 6.5, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#1a1d24';
      g.fillRect(-2, -2.6, 13, 5.2);
      g.fillStyle = '#c9d4e2';
      g.fillRect(2, -1, 10, 1.6);
      g.restore();
    }

    // ---- stick
    const bladeAhead = 34;
    g.save();
    g.strokeStyle = '#c89a52';
    g.lineWidth = 3.8;
    g.lineCap = 'round';
    const gripY = 9 + (s.checkAnim > 0 ? -6 : 0);
    const bladeY = (s.pokeAnim > 0 ? 0 : 8) + Math.sin(s.skatePhase * 2) * 2;
    g.beginPath();
    g.moveTo(4, gripY);
    g.lineTo(bladeAhead - 6, bladeY);
    g.stroke();
    g.strokeStyle = '#20242c';
    g.lineWidth = 5.2;
    g.beginPath();
    g.moveTo(bladeAhead - 7, bladeY);
    g.lineTo(bladeAhead + 8, bladeY - 3);
    g.stroke();
    g.restore();

    // ---- torso
    g.save();
    g.rotate(lean * 0.25);
    // Dark halo so a light jersey still separates from the ice.
    g.beginPath();
    g.ellipse(0, 0, 19.5, 17, 0, 0, TAU);
    g.fillStyle = 'rgba(10,20,34,0.30)';
    g.fill();
    // jersey
    g.beginPath();
    g.ellipse(0, 0, 17, 14.5, 0, 0, TAU);
    g.fillStyle = kit.jersey;
    g.fill();
    // shoulder yokes
    g.beginPath();
    g.ellipse(-3, 0, 15, 15.5, 0, -0.9, 0.9);
    g.fillStyle = kit.yoke;
    g.globalAlpha = 0.9;
    g.fill();
    g.globalAlpha = 1;
    // arm stripe
    g.strokeStyle = kit.stripe;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, 0, 13.5, 11, 0, -1.1, 1.1);
    g.stroke();
    // outline
    g.beginPath();
    g.ellipse(0, 0, 17, 14.5, 0, 0, TAU);
    g.strokeStyle = kit.edge;
    g.lineWidth = 2.2;
    g.stroke();
    g.restore();

    // ---- gloves
    for (const side of [-1, 1]) {
      g.save();
      const gx = side < 0 ? 9 : 13;
      const gy = side * 11 + (side > 0 ? -2 : 0);
      g.translate(gx, gy);
      g.fillStyle = kit.glove;
      g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.fill();
      g.strokeStyle = kit.stripe; g.lineWidth = 1.3; g.stroke();
      g.restore();
    }

    // ---- helmet
    g.save();
    g.translate(9, 0);
    g.fillStyle = kit.helmet;
    g.beginPath(); g.arc(0, 0, 9.2, 0, TAU); g.fill();
    g.strokeStyle = kit.edge; g.lineWidth = 1.6; g.stroke();
    // visor / cage
    g.beginPath();
    g.arc(1, 0, 8.6, -1.15, 1.15);
    g.strokeStyle = 'rgba(30,40,60,0.75)';
    g.lineWidth = 3.4;
    g.stroke();
    g.restore();

    g.restore(); // ---- end body space

    // ---- number, always upright
    if (!down) {
      g.save();
      g.translate(0, elevate + 1);
      g.font = '900 13px Impact, "Arial Black", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.strokeText(String(s.data.n), 0, 0);
      g.fillStyle = kit.ink;
      g.fillText(String(s.data.n), 0, 0);
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
    g.scale(1.2, 1.2);

    g.globalAlpha = 0.3;
    g.fillStyle = '#0b1a2b';
    g.beginPath(); g.ellipse(3, 8, 26, 17, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;

    g.translate(0, -6);
    const face = gk.face;
    g.rotate(face);

    const flash = gk.saveAnim > 0 ? gk.saveAnim / 0.45 : 0;

    // Leg pads — big rectangles across the mouth.
    for (const side of [-1, 1]) {
      g.save();
      g.translate(2, side * (13 + flash * 6));
      g.rotate(side * flash * 0.4);
      g.fillStyle = '#f2f4f8';
      g.strokeStyle = kit.yoke;
      g.lineWidth = 3;
      const w = 26, h = 15;
      g.beginPath();
      g.roundRect ? g.roundRect(-w / 2, -h / 2, w, h, 5) : g.rect(-w / 2, -h / 2, w, h);
      g.fill(); g.stroke();
      g.restore();
    }

    // Body
    g.beginPath();
    g.ellipse(0, 0, 16, 15, 0, 0, TAU);
    g.fillStyle = kit.jersey; g.fill();
    g.strokeStyle = kit.edge; g.lineWidth = 2.2; g.stroke();

    // Blocker + glove
    g.save();
    g.translate(8, -18 - flash * 9);
    g.rotate(-flash * 0.5);
    g.fillStyle = shade(c.secondary, 0.05);
    g.beginPath();
    g.roundRect ? g.roundRect(-7, -9, 15, 18, 4) : g.rect(-7, -9, 15, 18);
    g.fill();
    g.strokeStyle = c.accent; g.lineWidth = 1.5; g.stroke();
    g.restore();

    g.save();
    g.translate(8, 18 + flash * 9);
    g.fillStyle = shade(c.secondary, -0.1);
    g.beginPath(); g.arc(0, 0, 9 + flash * 2, 0, TAU); g.fill();
    g.strokeStyle = c.accent; g.lineWidth = 1.6; g.stroke();
    g.restore();

    // Stick (paddle down)
    g.strokeStyle = '#2a2118';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(4, -12); g.lineTo(24, 6);
    g.stroke();
    g.strokeStyle = '#e8e8e8';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(20, 2); g.lineTo(30, 12);
    g.stroke();

    // Mask
    g.save();
    g.translate(9, 0);
    g.fillStyle = '#f6f8fb';
    g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.fill();
    g.strokeStyle = c.primary; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(30,40,60,0.8)';
    g.lineWidth = 2.4;
    g.beginPath(); g.arc(1, 0, 8.4, -1.2, 1.2); g.stroke();
    g.restore();

    g.restore();

    // Number
    g.save();
    g.translate(gk.x, gk.y - 6);
    g.font = '900 12px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.strokeText(String(gk.data.n), 0, 0);
    g.fillStyle = kit.ink;
    g.fillText(String(gk.data.n), 0, 0);
    g.restore();
  }

  drawPuck(g, p) {
    // Motion trail.
    const sp = p.speed;
    if (p.trail.length > 2 && sp > 200) {
      g.save();
      g.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
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
