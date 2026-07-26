# SLAPSHOT — Arcade Hockey

A 3-on-3 arcade hockey game in the spirit of *NHL Hitz* and *NHL '94*: no
offsides, no icing, no penalties — just speed, big hits, one-timers and
flaming skaters. 16 clubs, real NHL stars, everything rendered and
synthesised in code.

**Play it:** open `index.html` in any modern browser. No build step, no
install, no network — it runs straight off the filesystem.

```
git clone <this repo> && cd Hockey-Game
open index.html          # macOS   (or: xdg-open index.html / just double-click)
```

If you'd rather serve it: `npx http-server -p 8080` then visit
`http://localhost:8080`.

---

## Controls

You always control the skater with the ring under his feet — it switches
automatically to whoever is closest to the puck.

| Player 1 | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Skate |
| `Shift` | Turbo (hold) |
| `J` / `Space` | Shoot — **hold to load a slapshot** |
| `K` | Pass |
| `L` | Body check / poke check — spin move when you have the puck |
| `Esc` / `P` | Pause |

Player 2 (local versus): arrows to skate, `.` shoot, `,` pass, `/` check,
right `Shift` turbo.

Gamepads work too: left stick to skate, **A** shoot, **X**/**Y** pass,
**B** check, **RB**/**RT** turbo.

## How to win ugly

- **Big hits.** Line a puck carrier up at speed and hit check. He goes down,
  the puck comes loose, and your super meter fills. Checking is always legal.
- **One-timers.** Pass across the slot and tap shoot just as the puck
  arrives. It releases instantly and harder than anything you can wind up.
- **Super shot.** When the meter under your score is full, charge a shot to
  maximum *while holding turbo*, then release. The puck comes off on fire at
  roughly 190 mph and goalies do not enjoy it.
- **On fire.** Score twice in a row with the same skater and he ignites:
  unlimited turbo, more speed, harder shots, flames off the skates. It ends
  when the other team scores.
- **Aim the corners.** Hold up or down as you release to pick a side. The
  goalie has a real reaction time — if you shoot where he already is, he
  saves it.

Difficulty runs Rookie → Pro → All-Star → Legend, which moves AI reaction
time, shooting accuracy, aggression and goaltending together.

## What's in it

- **16 clubs, 3 skaters + a goaltender each**, rated for speed, shot,
  passing, checking and stickhandling. McDavid really is a 99 for speed;
  Hellebuyck really is a wall.
- **Home colours vs away whites**, so two red teams never blur together.
- **A regulation 200′ × 85′ sheet** with correct blue lines, faceoff dots
  and hash marks, creases and trapezoids, drawn to scale.
- **Goal replays.** The last ~2.5 seconds are recorded every frame and
  played back on a broadcast-style letterboxed cut after the goal horn.
- **Three stars of the game** and a box score at the final buzzer.
- **Sudden-death overtime** when regulation ends level.
- Ice that scars up as you skate on it, spray off hard carves, crowd camera
  flashes, goal lights, confetti, hit-stop on big collisions.
- **Every sound is synthesised at runtime** with WebAudio — the goal horn,
  the organ riff, the crowd bed that swells as play gets close to a net, the
  whistle, the post ping. There isn't a single audio file in the repo.

## Layout

```
index.html        shell, menus, styling
src/roster.js     the 16 clubs and their players
src/engine.js     math, camera, particles, input (keyboard + gamepad)
src/audio.js      runtime sound synthesis
src/match.js      simulation: skating, puck, goalies, AI, rules
src/render.js     arena, ice, skaters, nets, effects
src/main.js       screens, camera work, HUD, game loop
```

The simulation runs on a fixed 60 Hz timestep independent of the render
rate, so the physics behave the same on a 60 Hz laptop and a 144 Hz monitor.
The arena — stands, crowd, boards, painted ice — is baked once into an
offscreen canvas at team-select time; only the living parts are redrawn.

`Match` has no dependency on the renderer, which means a whole game can be
stepped headlessly (`new Match([a, b], { demo: true }); m.update(1/60)`) —
which is how the scoring balance in here was tuned.

---

*Unofficial fan project. Not affiliated with, licensed by, or endorsed by
the NHL or the NHLPA. Player names are used descriptively; no real team
logos are reproduced — every crest is an original abstract mark drawn in
code.*
