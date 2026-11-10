// Lógica de la partida y dibujo en el canvas
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const xpFor = l => Math.floor(5 + l * 4 + Math.pow(l, 1.7) * 0.6);
const UPG = id => Profile.data.upgrades[id] || 0;
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function shapePath(c, sh, x, y, r, a) {
  c.beginPath();
  const poly = (n, rot) => { for (let i = 0; i < n; i++) { const t = rot + i * TAU / n; i ? c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r) : c.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.closePath(); };
  const star = (n, rot) => { for (let i = 0; i < n * 2; i++) { const t = rot + i * Math.PI / n, rr = i % 2 ? r * 0.5 : r; i ? c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr) : c.moveTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } c.closePath(); };
  switch (sh) {
    case 'tri': poly(3, a); break;
    case 'square': poly(4, a + Math.PI / 4); break;
    case 'diamond': poly(4, a); break;
    case 'hex': poly(6, a); break;
    case 'oct': poly(8, a); break;
    case 'star': star(sh === 'star' && r > 30 ? 8 : 5, a); break;
    default: c.arc(x, y, r, 0, TAU);
  }
}

const Game = {
  state: 'menu', run: null, shake: 0, fps: 0, fc: 0, ft: 0, stars: [],
  init(cv) {
    this.cv = cv; this.cx = cv.getContext('2d');
    for (let i = 0; i < 140; i++) this.stars.push([Math.random(), Math.random(), rand(0.2, 1.5)]);
    this.resize(); addEventListener('resize', () => this.resize());
  },
  resize() {
    const dpr = (window.devicePixelRatio || 1) * Settings.data.video.renderScale;
    this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
    this.W = this.cv.width; this.H = this.cv.height; this.dpr = dpr;
    this.scale = Math.sqrt(this.W * this.H / (1280 * 720)) * Settings.data.video.zoom;
  },
  viewR() { return Math.hypot(this.W, this.H) / 2 / this.scale + 40; },

  frame(dt) {
    this.fc++; this.ft += dt; if (this.ft >= 0.5) { this.fps = Math.round(this.fc / this.ft); this.fc = 0; this.ft = 0; }
    Input.pollPad();
    if (Input.hit('music')) AudioSys.cycle();
    if (Input.hit('pause') || Input.padHit(9)) { if (this.state === 'play') UI.pause(); else UI.back(); }
    if (this.state === 'levelup') {
      for (let i = 0; i < 3; i++) if (Input.pressed.has('Digit' + (i + 1)) || Input.pressed.has('Numpad' + (i + 1))) UI.pickLevel(i);
      if (Input.hit('reroll')) UI.reroll();
    }
    if (this.state === 'play') this.update(dt);
    this.shake = Math.max(0, this.shake - dt * 40);
    AudioSys.tick(this);
    this.render(dt);
  },

  // ---------------- partida ----------------
  start(charId, mapId, danger) {
    const ch = CHARS.find(c => c.id === charId), map = MAPS.find(m => m.id === mapId);
    this.run = {
      char: ch, map, danger, dm: { hp: 1 + 0.25 * danger, dmg: 1 + 0.15 * danger, spawn: 1 + 0.08 * danger, frag: 1 + 0.2 * danger },
      p: { x: 0, y: 0, r: 13, hp: 1, weapons: [], passives: {}, xp: 0, level: 1, xpNext: xpFor(1), iframes: 0, dashT: 0, dashCd: 0, dir: { x: 1, y: 0 }, trail: [], stats: null },
      enemies: [], pb: [], eb: [], gems: [], picks: [], parts: [], texts: [], fx: [],
      wave: 1, waveT: WAVE_LEN, time: 0, kills: 0, frags: 0, boss: null, spawnAcc: 0, hordeT: 20, winT: 0, hurtFlash: 0,
      rerolls: (ch.mods.reroll || 0) + UPG('relanzar'), revives: UPG('revivir'), tookDmg: false, bossesKilled: 0, pendingLv: 0,
      banner: { t: 'Oleada 1', time: 2.5, col: '#fff' }
    };
    this.addWeapon(ch.weapon); this.calcStats(); this.run.p.hp = this.run.p.stats.maxHp;
    Profile.data.runs++; Profile.save();
    this.state = 'play'; this.shake = 0;
  },
  addWeapon(id) { this.run.p.weapons.push({ id, lvl: 1, cd: 0.4 }); },
  calcStats() {
    const r = this.run, p = r.p, c = r.char.mods, P = id => p.passives[id] || 0;
    const s = {
      dmg: 1 + (c.dmg || 0) + UPG('poder') * 0.04 + P('poder') * 0.10,
      rate: 1 + (c.rate || 0) + UPG('cadencia') * 0.03 + P('cadencia') * 0.08,
      speed: 1 + (c.speed || 0) + UPG('velocidad') * 0.03 + P('botas') * 0.08,
      maxHp: 100 + (c.hp || 0) + UPG('vida') * 8 + P('coraza') * 20,
      armor: (c.armor || 0) + UPG('armadura') * 0.5 + P('blindaje'),
      regen: UPG('regen') * 0.15 + P('regen') * 0.4,
      magnet: 90 * (1 + UPG('iman') * 0.1 + P('iman') * 0.3),
      area: 1 + (c.area || 0) + UPG('area') * 0.03 + P('area') * 0.12,
      crit: 0.05 + (c.crit || 0) + UPG('critico') * 0.01 + P('critico') * 0.06,
      xp: 1 + UPG('experiencia') * 0.05
    };
    const old = p.stats; p.stats = s;
    if (old) p.hp += Math.max(0, s.maxHp - old.maxHp);
    p.hp = Math.min(p.hp, s.maxHp);
  },
  banner(t, time, col) { this.run.banner = { t, time: time || 2, col: col || '#fff' }; },

  startWave() {
    const r = this.run, P = Profile.data;
    this.banner('Oleada ' + r.wave, 2);
    if (r.wave > P.bestWave) P.bestWave = r.wave;
    if (r.wave === 6 && !r.tookDmg) P.flags.intocable = true;
    const b = BOSS_ORDER[r.wave]; if (b) this.spawnBoss(b);
    this.checkAch(); Profile.save();
  },
  pickType() {
    const w = this.run.wave, pool = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= w);
    let tot = 0; pool.forEach(k => tot += ENEMIES[k].w); let x = Math.random() * tot;
    for (const k of pool) { x -= ENEMIES[k].w; if (x <= 0) return k; }
    return 'rastrero';
  },
  spawnPos() {
    const p = this.run.p, R = this.viewR();
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, x = clamp(p.x + Math.cos(a) * R, -WORLD, WORLD), y = clamp(p.y + Math.sin(a) * R, -WORLD, WORLD);
      if (Math.hypot(x - p.x, y - p.y) > R * 0.75) return [x, y];
    }
    const a = Math.random() * TAU; return [clamp(p.x + Math.cos(a) * R, -WORLD, WORLD), clamp(p.y + Math.sin(a) * R, -WORLD, WORLD)];
  },
  spawnEnemy(type, x, y) {
    const d = ENEMIES[type], r = this.run, w = r.wave, hp = d.hp * (1 + (w - 1) * 0.22) * r.dm.hp;
    const e = { type, x, y, r: d.r, hp, maxHp: hp, spd: d.spd * (1 + Math.min(w, 30) * 0.012), dmg: d.dmg * r.dm.dmg, xp: d.xp, col: d.col, shape: d.shape, t: Math.random() * 3, kx: 0, ky: 0, flash: 0, hitcd: {} };
    r.enemies.push(e); return e;
  },
  spawnBoss(id) {
    const B = BOSSES[id], r = this.run, [x, y] = this.spawnPos(), hp = B.hp * (1 + r.wave * 0.3) * r.dm.hp;
    const e = { boss: true, id, name: B.name, x, y, r: B.r, hp, maxHp: hp, spd: B.spd, dmg: 25 * r.dm.dmg, xp: 30, col: B.col, shape: B.shape, t: 0, kx: 0, ky: 0, flash: 0, hitcd: {}, a: 0, b: 0 };
    r.enemies.push(e); r.boss = e;
    this.banner('¡JEFE: ' + B.name + '!', 3, '#ff5252'); AudioSys.sfx('boss'); this.shake = 12;
  },

  update(dt) {
    const r = this.run, p = r.p, s = p.stats;
    r.time += dt;
    if (r.banner) { r.banner.time -= dt; if (r.banner.time <= 0) r.banner = null; }
    if (r.hurtFlash > 0) r.hurtFlash -= dt;

    // jugador
    const m = Input.move(), ml = Math.hypot(m.x, m.y);
    if (ml > 0.1) p.dir = { x: m.x / ml, y: m.y / ml };
    p.dashCd -= dt; p.iframes -= dt;
    if ((Input.hit('dash') || Input.padHit(0) || Input.padHit(5) || Input.touchDash()) && p.dashCd <= 0) {
      p.dashT = 0.18; p.dashCd = 1.6 * (1 - UPG('dash') * 0.08); p.iframes = Math.max(p.iframes, 0.3);
      Profile.data.dashes++; AudioSys.sfx('dash'); this.burst(p.x, p.y, '#ffffff', 8);
    }
    const sp = 210 * s.speed;
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.dir.x * sp * 3.4 * dt; p.y += p.dir.y * sp * 3.4 * dt; }
    else { p.x += m.x * sp * dt; p.y += m.y * sp * dt; }
    p.x = clamp(p.x, -WORLD + p.r, WORLD - p.r); p.y = clamp(p.y, -WORLD + p.r, WORLD - p.r);
    p.trail.push([p.x, p.y]); if (p.trail.length > 10) p.trail.shift();
    if (s.regen > 0) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);

    this.updWeapons(dt);

    // oleadas
    if (!r.boss) r.waveT -= dt;
    if (r.waveT <= 0 && r.wave < MAX_WAVE) { r.wave++; r.waveT = WAVE_LEN; this.startWave(); }
    if (r.winT > 0) { r.winT -= dt; if (r.winT <= 0) { this.end(true); return; } }

    // aparición de enemigos
    const rate = (1 + r.wave * 0.5) * r.dm.spawn * (r.boss ? 0.45 : 1);
    r.spawnAcc += rate * dt;
    while (r.spawnAcc >= 1) { r.spawnAcc--; if (r.enemies.length < 320) { const [x, y] = this.spawnPos(); this.spawnEnemy(this.pickType(), x, y); } }
    r.hordeT -= dt;
    if (r.wave >= 4 && r.hordeT <= 0 && !r.boss) {
      r.hordeT = 22; const n = 10 + r.wave, R = this.viewR();
      for (let i = 0; i < n; i++) { const a = i / n * TAU; this.spawnEnemy(r.wave >= 12 && i % 3 === 0 ? 'veloz' : 'rastrero', clamp(p.x + Math.cos(a) * R, -WORLD, WORLD), clamp(p.y + Math.sin(a) * R, -WORLD, WORLD)); }
      this.banner('¡Horda!', 1.5, '#ef5350');
    }

    this.updEnemies(dt); if (this.state !== 'play') return;
    this.updBullets(dt); if (this.state !== 'play') return;
    this.updPickups(dt);
    this.updFx(dt);
    r.enemies = r.enemies.filter(e => !e.dead);

    if (r.pendingLv > 0 && this.state === 'play') { this.state = 'levelup'; AudioSys.sfx('level'); UI.levelUp(this.rollOptions()); }
  },

  nearest(range) {
    const p = this.run.p; let best = null, bd = range * range;
    for (const e of this.run.enemies) { if (e.dead) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  },
  aim(range) {
    const p = this.run.p;
    if (Settings.data.controls.aimMode === 'mouse' && !Input.touchEnabled()) {
      const wx = p.x + (Input.mouse.x * this.dpr - this.W / 2) / this.scale, wy = p.y + (Input.mouse.y * this.dpr - this.H / 2) / this.scale;
      return Math.atan2(wy - p.y, wx - p.x);
    }
    const e = this.nearest(range); return e ? Math.atan2(e.y - p.y, e.x - p.x) : null;
  },
  pShoot(o) {
    const p = this.run.p;
    const b = Object.assign({ x: p.x, y: p.y, vx: Math.cos(o.a) * o.spd, vy: Math.sin(o.a) * o.spd, hits: new Set(), rot: 0 }, o);
    if (o.kind === 'blade') { b.ax = Math.cos(o.a) * o.acc; b.ay = Math.sin(o.a) * o.acc; }
    this.run.pb.push(b);
  },

  updWeapons(dt) {
    const r = this.run, p = r.p, s = p.stats;
    for (const w of p.weapons) {
      w.cd -= dt; const L = w.lvl;
      switch (w.id) {
        case 'blaster': if (w.cd <= 0) {
          const dir = this.aim(650); if (dir === null) { w.cd = 0.1; break; }
          w.cd = 0.6 * Math.pow(0.88, L - 1) / s.rate; const n = [1, 2, 2, 3, 3][L - 1];
          for (let i = 0; i < n; i++) this.pShoot({ kind: 'bolt', a: dir + (i - (n - 1) / 2) * 0.12, spd: 650, r: 5, dmg: (10 + L * 4) * s.dmg, pierce: [0, 0, 0, 1, 2][L - 1], life: 1.2, col: '#4fc3f7' });
          AudioSys.sfx('shoot');
        } break;
        case 'orbes': {
          const n = L + 1, R = (70 + (L >= 4 ? 22 : 0)) * s.area, spd = L >= 5 ? 4.2 : 3, dmg = (8 + L * 3) * s.dmg * (L >= 3 ? 1.15 : 1), orr = 10 * s.area;
          w.orbs = [];
          for (let i = 0; i < n; i++) {
            const a = r.time * spd + i * TAU / n, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R; w.orbs.push([ox, oy]);
            for (const e of r.enemies) {
              if (e.dead || Math.abs(e.x - ox) > e.r + orr || Math.abs(e.y - oy) > e.r + orr) continue;
              const k = 'o' + i;
              if (Math.hypot(e.x - ox, e.y - oy) < e.r + orr && !(e.hitcd[k] > 0)) { e.hitcd[k] = 0.35; this.dmgEnemy(e, dmg, Math.cos(a) * 160, Math.sin(a) * 160); }
            }
          }
        } break;
        case 'rayo': if (w.cd <= 0) {
          const cands = r.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 450);
          if (!cands.length) { w.cd = 0.2; break; }
          w.cd = 1.5 * (L >= 3 ? 0.78 : 1) / s.rate;
          const jumps = [3, 4, 4, 5, 7][L - 1], dmg = (14 + L * 5) * s.dmg * (L >= 4 ? 1.2 : 1);
          let cur = cands[Math.floor(Math.random() * cands.length)]; const pts = [[p.x, p.y]], hit = new Set();
          for (let j = 0; j < jumps && cur; j++) {
            hit.add(cur); pts.push([cur.x, cur.y]); this.dmgEnemy(cur, dmg, 0, 0);
            let best = null, bd = 170 * s.area;
            for (const e of r.enemies) if (!e.dead && !hit.has(e)) { const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < bd) { bd = d; best = e; } }
            cur = best;
          }
          r.fx.push({ k: 'bolt', pts, t: 0.18, T: 0.18 }); AudioSys.sfx('zap');
        } break;
        case 'nova': if (w.cd <= 0) {
          w.cd = (3.2 - 0.3 * L) / s.rate;
          const R = (90 + L * 22) * s.area * (L >= 5 ? 1.3 : 1), dmg = (18 + L * 9) * s.dmg;
          for (const e of r.enemies) { if (e.dead) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < R + e.r) this.dmgEnemy(e, dmg, dx / d * 280, dy / d * 280); }
          r.fx.push({ k: 'ring', x: p.x, y: p.y, R, t: 0.35, T: 0.35, col: '#ff8a65' }); AudioSys.sfx('nova');
        } break;
        case 'misiles': if (w.cd <= 0) {
          if (!r.enemies.length) { w.cd = 0.2; break; }
          w.cd = (1.9 - 0.15 * L) / s.rate; const n = [1, 1, 2, 2, 3][L - 1];
          for (let i = 0; i < n; i++) this.pShoot({ kind: 'missile', a: Math.random() * TAU, spd: 330, r: 6, dmg: (24 + L * 9) * s.dmg * (L >= 2 ? 1.15 : 1), area: (55 + (L >= 4 ? 25 : 0)) * s.area, life: 3, col: '#ef5350' });
          AudioSys.sfx('missile');
        } break;
        case 'cuchillas': if (w.cd <= 0) {
          let dir = this.aim(500); if (dir === null) dir = Math.atan2(p.dir.y, p.dir.x);
          w.cd = 1.4 * (L >= 4 ? 0.75 : 1) / s.rate; const n = [1, 1, 2, 2, 3][L - 1];
          for (let i = 0; i < n; i++) this.pShoot({ kind: 'blade', a: dir + (i - (n - 1) / 2) * 0.5, spd: 560, acc: -560 / 0.75, r: 11 * s.area, dmg: (12 + L * 6) * s.dmg * (L >= 2 ? 1.15 : 1), life: 1.5, col: '#80cbc4' });
        } break;
      }
    }
  },

  dmgEnemy(e, d, kx, ky) {
    if (e.dead) return;
    const r = this.run, crit = Math.random() < r.p.stats.crit; if (crit) d *= 2;
    e.hp -= d; e.flash = 0.08;
    if (!e.boss) { e.kx += kx; e.ky += ky; }
    if (Settings.data.video.damageNumbers) { r.texts.push({ x: e.x + rand(-6, 6), y: e.y - e.r, txt: Math.round(d), t: 0.6, col: crit ? '#ffeb3b' : '#ffffff', big: crit }); if (r.texts.length > 80) r.texts.shift(); }
    AudioSys.sfx('hit');
    if (e.hp <= 0) this.kill(e);
  },
  kill(e) {
    const r = this.run; e.dead = true; r.kills++; Profile.data.kills++; r.frags += 0.12;
    if (r.gems.length > 450) r.gems[Math.floor(Math.random() * r.gems.length)].v += e.xp;
    else r.gems.push({ x: e.x, y: e.y, v: e.xp });
    const q = Math.random();
    if (!e.boss) {
      if (q < 0.012) r.picks.push({ x: e.x, y: e.y, type: 'heal', t: 0 });
      else if (q < 0.016) r.picks.push({ x: e.x, y: e.y, type: 'magnet', t: 0 });
      else if (q < 0.019) r.picks.push({ x: e.x, y: e.y, type: 'bomb', t: 0 });
    }
    this.burst(e.x, e.y, e.col, e.boss ? 60 : 6);
    AudioSys.sfx('kill');
    if (e.type === 'divisor') for (let i = 0; i < 2; i++) this.spawnEnemy('mini', e.x + rand(-10, 10), e.y + rand(-10, 10));
    if (e.boss) this.bossDown(e);
  },
  bossDown(e) {
    const r = this.run, P = Profile.data;
    r.boss = null; r.bossesKilled++; P.bossKills++; if (!P.bossTypes.includes(e.id)) P.bossTypes.push(e.id);
    r.frags += 40; r.picks.push({ x: e.x, y: e.y, type: 'chest', t: 0 });
    this.shake = 20; AudioSys.sfx('boom'); this.banner('¡' + e.name + ' derrotado!', 2.5, '#ffd54f');
    r.waveT = Math.min(r.waveT, 8);
    if (r.wave >= MAX_WAVE) r.winT = 2.5;
    this.checkAch(); Profile.save();
  },
  explode(x, y, R, dmg) {
    const r = this.run;
    for (const e of r.enemies) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1; if (d < R + e.r) this.dmgEnemy(e, dmg, dx / d * 200, dy / d * 200); }
    r.fx.push({ k: 'ring', x, y, R, t: 0.25, T: 0.25, col: '#ffab40' }); this.burst(x, y, '#ffab40', 10); AudioSys.sfx('boom');
  },
  hurt(d) {
    const r = this.run, p = r.p;
    if (this.state !== 'play' || p.iframes > 0 || p.dashT > 0) return;
    d = Math.max(1, d - p.stats.armor); p.hp -= d; p.iframes = 0.5; r.tookDmg = true; r.hurtFlash = 0.3;
    this.shake = Math.max(this.shake, 9); AudioSys.sfx('hurt');
    if (p.hp <= 0) {
      if (r.revives > 0) {
        r.revives--; p.hp = p.stats.maxHp * 0.5; p.iframes = 2.5;
        for (const e of r.enemies) if (!e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 350) this.kill(e);
        this.banner('¡Segunda vida!', 2, '#69f0ae'); this.shake = 15;
      } else this.end(false);
    }
  },
  eShoot(x, y, a, spd, dmg) { this.run.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 6, dmg, life: 5 }); },

  bossAI(e, dt, ux, uy, d) {
    const r = this.run, p = r.p; e.a += dt; e.b += dt;
    switch (e.id) {
      case 'coloso':
        if (e.charge > 0) { e.charge -= dt; return [e.cx, e.cy, 440]; }
        if (e.a > 4) { e.a = 0; e.charge = 0.8; e.cx = ux; e.cy = uy; AudioSys.sfx('dash'); }
        if (e.b > 7) { e.b = 0; for (let i = 0; i < 6; i++) this.spawnEnemy('rastrero', e.x + Math.cos(i) * 70, e.y + Math.sin(i) * 70); }
        return [ux, uy, e.spd];
      case 'tejedora': {
        e.c = (e.c || 0) + dt;
        if (e.a > 0.11) { e.a = 0; const base = e.t * 2.2; this.eShoot(e.x, e.y, base, 170, 10 * r.dm.dmg); this.eShoot(e.x, e.y, base + Math.PI, 170, 10 * r.dm.dmg); }
        if (e.b > 5) { e.b = 0; for (let i = 0; i < 22; i++) this.eShoot(e.x, e.y, i / 22 * TAU, 200, 10 * r.dm.dmg); }
        if (d < 260) return [-ux, -uy, e.spd]; if (d < 330) return [-uy, ux, e.spd]; return [ux, uy, e.spd];
      }
      case 'ojo':
        if (e.a > 3.5) {
          e.a = 0; this.burst(e.x, e.y, e.col, 20); const an = Math.random() * TAU;
          e.x = clamp(p.x + Math.cos(an) * 270, -WORLD, WORLD); e.y = clamp(p.y + Math.sin(an) * 270, -WORLD, WORLD); e.rings = 3; e.rt = 0.45;
        }
        if (e.rings > 0) { e.rt -= dt; if (e.rt <= 0) { e.rt = 0.35; e.rings--; for (let i = 0; i < 16; i++) this.eShoot(e.x, e.y, i / 16 * TAU + e.rings * 0.2, 190, 11 * r.dm.dmg); } }
        if (e.b > 8) { e.b = 0; for (let i = 0; i < 5; i++) this.spawnEnemy('veloz', e.x + rand(-60, 60), e.y + rand(-60, 60)); }
        return [ux, uy, e.rings > 0 ? 0 : e.spd];
    }
    return [ux, uy, e.spd];
  },

  updEnemies(dt) {
    const r = this.run, p = r.p;
    for (let i = 0; i < r.enemies.length; i++) {
      const e = r.enemies[i]; if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      for (const k in e.hitcd) e.hitcd[k] -= dt;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      let mx = ux, my = uy, sp = e.spd;
      if (e.boss) { const o = this.bossAI(e, dt, ux, uy, d); mx = o[0]; my = o[1]; sp = o[2]; }
      else if (e.type === 'tirador') {
        if (d < 220) { mx = -ux; my = -uy; } else if (d < 300) { mx = -uy * 0.6; my = ux * 0.6; }
        e.sh = (e.sh === undefined ? 1.5 : e.sh) - dt;
        if (e.sh <= 0 && d < 520) { e.sh = 2.2; this.eShoot(e.x, e.y, Math.atan2(dy, dx), 220, e.dmg); }
      } else if (e.type === 'kamikaze') {
        if (e.dash > 0) { e.dash -= dt; mx = e.dx; my = e.dy; sp = 380; }
        else if (d < 170) { e.dash = 0.6; e.dx = ux; e.dy = uy; }
      }
      e.x += (mx * sp + e.kx) * dt; e.y += (my * sp + e.ky) * dt;
      const f = Math.max(0, 1 - 8 * dt); e.kx *= f; e.ky *= f;
      e.x = clamp(e.x, -WORLD, WORLD); e.y = clamp(e.y, -WORLD, WORLD);
      if (d < e.r + p.r) {
        if (e.type === 'kamikaze') { this.kill(e); r.fx.push({ k: 'ring', x: e.x, y: e.y, R: 70, t: 0.25, T: 0.25, col: '#ff7043' }); this.hurt(e.dmg); AudioSys.sfx('boom'); }
        else this.hurt(e.dmg);
        if (this.state !== 'play') return;
      }
    }
  },

  updBullets(dt) {
    const r = this.run, p = r.p;
    for (const b of r.pb) {
      b.life -= dt;
      if (b.kind === 'missile') {
        if (!b.tgt || b.tgt.dead) b.tgt = this.nearestTo(b.x, b.y, 600);
        if (b.tgt) {
          const want = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x), cur = Math.atan2(b.vy, b.vx);
          let df = want - cur; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
          const na = cur + clamp(df, -6 * dt, 6 * dt), sp = Math.min(560, Math.hypot(b.vx, b.vy) + 400 * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
        if (Math.random() < 0.5) this.part(b.x, b.y, '#ffab40', 0, 0, 0.3, 3);
      }
      if (b.kind === 'blade') { b.vx += b.ax * dt; b.vy += b.ay * dt; b.rot += dt * 16; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const e of r.enemies) {
        if (e.dead) continue;
        const rr = e.r + b.r; if (Math.abs(e.x - b.x) > rr || Math.abs(e.y - b.y) > rr) continue;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > rr * rr) continue;
        if (b.kind === 'missile') { this.explode(b.x, b.y, b.area, b.dmg); b.life = 0; break; }
        if (b.kind === 'blade') { if (e.hitcd.bl > 0) continue; e.hitcd.bl = 0.3; this.dmgEnemy(e, b.dmg, b.vx * 0.3, b.vy * 0.3); continue; }
        if (b.hits.has(e)) continue;
        b.hits.add(e); this.dmgEnemy(e, b.dmg, b.vx * 0.25, b.vy * 0.25);
        if (b.pierce-- <= 0) { b.life = 0; break; }
      }
    }
    r.pb = r.pb.filter(b => b.life > 0);
    for (const b of r.eb) {
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + p.r - 3) ** 2) { b.life = 0; this.hurt(b.dmg); if (this.state !== 'play') return; }
    }
    r.eb = r.eb.filter(b => b.life > 0 && Math.abs(b.x) < WORLD + 100 && Math.abs(b.y) < WORLD + 100);
  },
  nearestTo(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.run.enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  },

  updPickups(dt) {
    const r = this.run, p = r.p, s = p.stats;
    for (const g of r.gems) {
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (d < s.magnet) g.mag = true;
      if (g.mag) { g.sp = (g.sp || 250) + 1200 * dt; g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt; }
      if (d < p.r + 8) { g.dead = true; p.xp += g.v * s.xp; AudioSys.sfx('xp'); }
    }
    r.gems = r.gems.filter(g => !g.dead);
    while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = xpFor(p.level); r.pendingLv++; }
    for (const k of r.picks) {
      k.t += dt;
      if (Math.hypot(p.x - k.x, p.y - k.y) < p.r + 16) { k.dead = true; this.collect(k); }
      else if (k.type !== 'chest' && k.t > 30) k.dead = true;
    }
    r.picks = r.picks.filter(k => !k.dead);
  },
  collect(k) {
    const r = this.run, p = r.p;
    if (k.type === 'heal') { p.hp = Math.min(p.stats.maxHp, p.hp + 30); r.texts.push({ x: p.x, y: p.y - 20, txt: '+30', t: 0.8, col: '#69f0ae', big: true }); }
    if (k.type === 'magnet') r.gems.forEach(g => g.mag = true);
    if (k.type === 'bomb') {
      for (const e of r.enemies) { if (e.dead) continue; if (e.boss) this.dmgEnemy(e, e.maxHp * 0.05, 0, 0); else if (Math.hypot(e.x - p.x, e.y - p.y) < this.viewR()) this.kill(e); }
      this.shake = 18; AudioSys.sfx('boom'); r.fx.push({ k: 'ring', x: p.x, y: p.y, R: 600, t: 0.5, T: 0.5, col: '#ffffff' });
    }
    if (k.type === 'chest') {
      const got = [];
      for (let i = 0; i < 3; i++) { const o = this.rollOptions().filter(o => o.k === 'w' || o.k === 'p'); if (!o.length) break; this.applyOption(o[0]); got.push(this.optName(o[0])); }
      r.frags += 30; p.hp = p.stats.maxHp; AudioSys.sfx('chest');
      UI.toast('Cofre: ' + (got.length ? got.join(', ') : 'fragmentos') + ' · vida completa');
    }
    AudioSys.sfx('xp');
  },

  rollOptions() {
    const p = this.run.p, opts = [];
    for (const w of p.weapons) if (w.lvl < 5) opts.push({ k: 'w', id: w.id, lvl: w.lvl + 1 });
    if (p.weapons.length < 4) for (const id in WEAPONS) if (!p.weapons.find(w => w.id === id)) opts.push({ k: 'w', id, lvl: 1 });
    const pk = Object.keys(p.passives);
    for (const id of pk) if (p.passives[id] < 5) opts.push({ k: 'p', id, lvl: p.passives[id] + 1 });
    if (pk.length < 4) for (const id in PASSIVES) if (!(id in p.passives)) opts.push({ k: 'p', id, lvl: 1 });
    const out = shuffle(opts).slice(0, 3);
    if (!out.length) out.push({ k: 'heal' }, { k: 'frag' });
    return out;
  },
  optName(o) { return o.k === 'w' ? WEAPONS[o.id].name : o.k === 'p' ? PASSIVES[o.id].name : o.k === 'heal' ? 'Reparación total' : '+25 fragmentos'; },
  applyOption(o) {
    const r = this.run, p = r.p, P = Profile.data;
    if (o.k === 'w') {
      const w = p.weapons.find(w => w.id === o.id); if (w) w.lvl = o.lvl; else this.addWeapon(o.id);
      if (o.lvl >= 5) P.flags.maxed = true; if (p.weapons.length >= 4) P.flags.arsenal = true;
    } else if (o.k === 'p') { p.passives[o.id] = o.lvl; this.calcStats(); }
    else if (o.k === 'heal') p.hp = p.stats.maxHp;
    else r.frags += 25;
  },
  choose(o) {
    const r = this.run; this.applyOption(o); r.pendingLv--;
    if (r.pendingLv > 0) UI.levelUp(this.rollOptions()); else { this.state = 'play'; UI.hud(); }
    this.checkAch();
  },

  end(win) {
    const r = this.run, P = Profile.data;
    const total = Math.round((r.frags + r.wave * 3) * r.dm.frag * (1 + r.map.bonus) * (1 + UPG('codicia') * 0.06));
    P.frags += total; P.totalFrags += total;
    const newBest = r.wave > P.bestWave; if (newBest) P.bestWave = r.wave;
    if (r.p.level > P.bestLevel) P.bestLevel = r.p.level;
    if (win) { P.wins++; P.wonDanger = Math.max(P.wonDanger, r.danger); }
    this.checkAch(); Profile.save();
    this.state = 'end'; this.shake = 0;
    UI.end({ win, total, wave: r.wave, level: r.p.level, kills: r.kills, bosses: r.bossesKilled, time: r.time, danger: r.danger });
  },
  checkAch() {
    const P = Profile.data;
    for (const a of ACHIEVEMENTS) if (!P.ach.includes(a.id) && a.check(P)) {
      P.ach.push(a.id); P.frags += a.reward; P.totalFrags += a.reward;
      UI.toast('🏆 Logro: ' + a.name + '  (+' + a.reward + ' ◆)'); AudioSys.sfx('ach');
    }
  },

  // ---------------- efectos ----------------
  part(x, y, col, vx, vy, T, sz) { const r = this.run; if (r.parts.length < 700) r.parts.push({ x, y, vx, vy, t: T, T, col, sz }); },
  burst(x, y, col, n) {
    const q = Settings.data.video.particles; if (!q || !this.run) return;
    n = Math.ceil(n * (q === 1 ? 0.4 : 1));
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rand(40, 220); this.part(x, y, col, Math.cos(a) * v, Math.sin(a) * v, rand(0.25, 0.6), rand(2, 4)); }
  },
  updFx(dt) {
    const r = this.run;
    for (const q of r.parts) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; }
    r.parts = r.parts.filter(q => q.t > 0);
    for (const t of r.texts) { t.t -= dt; t.y -= 40 * dt; }
    r.texts = r.texts.filter(t => t.t > 0);
    for (const f of r.fx) f.t -= dt;
    r.fx = r.fx.filter(f => f.t > 0);
  },

  // ---------------- dibujo ----------------
  render(dt) {
    const c = this.cx, W = this.W, H = this.H, r = this.run;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!r || this.state === 'menu') { this.drawMenuBg(c, dt); return; }
    const s = this.scale, V = Settings.data.video, G = Settings.data.gameplay, p = r.p;
    let sx = 0, sy = 0;
    if (this.state === 'play' && this.shake > 0 && V.shake > 0) { const m = this.shake * V.shake * this.dpr; sx = rand(-m, m); sy = rand(-m, m); }
    const ox = W / 2 - p.x * s + sx, oy = H / 2 - p.y * s + sy;
    this.drawBg(c, r.map, ox, oy, s);
    c.setTransform(s, 0, 0, s, ox, oy);
    c.strokeStyle = 'rgba(255,60,90,.6)'; c.lineWidth = 4; c.strokeRect(-WORLD, -WORLD, WORLD * 2, WORLD * 2);
    const x0 = -ox / s - 80, y0 = -oy / s - 80, x1 = (W - ox) / s + 80, y1 = (H - oy) / s + 80;
    const vis = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;

    for (const g of r.gems) if (vis(g.x, g.y)) { c.fillStyle = g.v >= 5 ? '#ff5252' : g.v >= 2 ? '#69f0ae' : '#40c4ff'; shapePath(c, 'diamond', g.x, g.y, g.v >= 5 ? 7 : 5, Math.PI / 2); c.fill(); }
    const pc = { heal: '#69f0ae', magnet: '#40c4ff', bomb: '#ff5252', chest: '#ffd54f' }, pt = { heal: '+', magnet: 'U', bomb: '!', chest: '★' };
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const k of r.picks) {
      if (!vis(k.x, k.y)) continue; const bob = Math.sin(r.time * 4 + k.x) * 3, R = k.type === 'chest' ? 18 : 12;
      c.fillStyle = pc[k.type]; c.globalAlpha = 0.3; shapePath(c, 'circle', k.x, k.y + bob, R + 6, 0); c.fill(); c.globalAlpha = 1;
      shapePath(c, k.type === 'chest' ? 'square' : 'circle', k.x, k.y + bob, R, 0); c.fill();
      c.fillStyle = '#111'; c.font = 'bold ' + (R + 2) + 'px sans-serif'; c.fillText(pt[k.type], k.x, k.y + bob + 1);
    }

    const cb = G.colorblind;
    for (const e of r.enemies) {
      if (e.dead || !vis(e.x, e.y)) continue;
      const col = e.flash > 0 ? '#ffffff' : (cb && !e.boss ? CB_COLORS[e.type] : e.col), a = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.boss) { c.fillStyle = col; c.globalAlpha = 0.22 + Math.sin(r.time * 5) * 0.08; shapePath(c, 'circle', e.x, e.y, e.r * 1.45, 0); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = col; shapePath(c, e.shape, e.x, e.y, e.r, e.shape === 'circle' || e.shape === 'eye' ? 0 : e.boss ? e.t * 0.6 : a); c.fill();
      if (e.shape === 'eye') { c.fillStyle = '#e0f2f1'; shapePath(c, 'circle', e.x, e.y, e.r * 0.6, 0); c.fill(); c.fillStyle = '#000'; shapePath(c, 'circle', e.x + Math.cos(a) * e.r * 0.25, e.y + Math.sin(a) * e.r * 0.25, e.r * 0.28, 0); c.fill(); }
      else { c.fillStyle = 'rgba(0,0,0,.45)'; shapePath(c, 'circle', e.x + Math.cos(a) * e.r * 0.4, e.y + Math.sin(a) * e.r * 0.4, e.r * 0.28, 0); c.fill(); }
      if (V.enemyBars && !e.boss && e.hp < e.maxHp) { c.fillStyle = '#300'; c.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 3); c.fillStyle = '#ff5252'; c.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3); }
    }

    for (const b of r.pb) {
      if (!vis(b.x, b.y)) continue; c.fillStyle = b.col;
      if (b.kind === 'blade') { shapePath(c, 'star', b.x, b.y, b.r, b.rot); c.fill(); }
      else if (b.kind === 'missile') { shapePath(c, 'tri', b.x, b.y, 8, Math.atan2(b.vy, b.vx)); c.fill(); }
      else { shapePath(c, 'circle', b.x, b.y, b.r, 0); c.fill(); }
    }
    for (const w of p.weapons) if (w.id === 'orbes' && w.orbs) for (const o of w.orbs) {
      c.fillStyle = '#b388ff'; c.globalAlpha = 0.35; shapePath(c, 'circle', o[0], o[1], 16 * p.stats.area, 0); c.fill(); c.globalAlpha = 1;
      shapePath(c, 'circle', o[0], o[1], 10 * p.stats.area, 0); c.fill();
    }
    for (const b of r.eb) {
      if (!vis(b.x, b.y)) continue;
      c.fillStyle = cb ? '#ffffff' : '#ff4081'; shapePath(c, 'circle', b.x, b.y, b.r + 2, 0); c.fill();
      c.fillStyle = cb ? '#000' : '#ffe0f0'; shapePath(c, 'circle', b.x, b.y, b.r - 2, 0); c.fill();
    }
    for (const f of r.fx) {
      const k = f.t / f.T; c.globalAlpha = k;
      if (f.k === 'bolt') {
        c.strokeStyle = '#fff59d'; c.lineWidth = 3; c.beginPath();
        f.pts.forEach((q, i) => { if (!i) c.moveTo(q[0], q[1]); else { const pr = f.pts[i - 1]; c.lineTo((pr[0] + q[0]) / 2 + rand(-12, 12), (pr[1] + q[1]) / 2 + rand(-12, 12)); c.lineTo(q[0], q[1]); } });
        c.stroke();
      } else { c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, f.R * (1 - k * 0.4), 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }

    // jugador
    const L = Settings.data.look, pa = Math.atan2(p.dir.y, p.dir.x);
    if (L.trail) p.trail.forEach((q, i) => { c.globalAlpha = i / p.trail.length * 0.3; c.fillStyle = L.color; shapePath(c, 'circle', q[0], q[1], p.r * i / p.trail.length, 0); c.fill(); });
    c.globalAlpha = p.iframes > 0 && p.dashT <= 0 && Math.floor(r.time * 20) % 2 ? 0.35 : 1;
    c.fillStyle = L.color; shapePath(c, L.shape, p.x, p.y, L.shape === 'tri' ? p.r * 1.25 : p.r, pa); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
    if (p.dashCd > 0) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, p.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.dashCd / (1.6 * (1 - UPG('dash') * 0.08)))); c.stroke(); }

    for (const q of r.parts) { c.globalAlpha = q.t / q.T; c.fillStyle = q.col; c.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz); }
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const t of r.texts) { c.globalAlpha = Math.min(1, t.t * 3); c.fillStyle = t.col; c.font = 'bold ' + (t.big ? 18 : 13) + 'px Segoe UI,sans-serif'; c.fillText(t.txt, t.x, t.y); }
    c.globalAlpha = 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.drawHud(c, ox, oy, s);
  },

  drawBg(c, map, ox, oy, s) {
    const W = this.W, H = this.H, t = this.run ? this.run.time : 0;
    c.fillStyle = map.bg; c.fillRect(0, 0, W, H);
    c.save(); c.setTransform(s, 0, 0, s, ox, oy);
    const x0 = -ox / s, y0 = -oy / s, x1 = (W - ox) / s, y1 = (H - oy) / s, G = 80;
    c.strokeStyle = map.grid; c.lineWidth = 1.5; c.beginPath();
    for (let x = Math.floor(x0 / G) * G; x < x1; x += G) { c.moveTo(x, y0); c.lineTo(x, y1); }
    for (let y = Math.floor(y0 / G) * G; y < y1; y += G) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
    const C = 160;
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) {
      const h = (((i * 73856093) ^ (j * 19349663)) >>> 0) % 1000; if (h % 3) continue;
      const x = i * C + (h % 137), y = j * C + ((h * 7) % 151);
      if (map.deco === 'star') { c.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.25 * Math.sin(t * 2 + h)) + ')'; c.fillRect(x, y, 2.5, 2.5); }
      else if (map.deco === 'crystal') { c.fillStyle = 'rgba(77,208,225,.25)'; shapePath(c, 'tri', x, y, 10 + h % 12, -Math.PI / 2); c.fill(); }
      else { c.fillStyle = 'rgba(255,112,67,' + (0.12 + 0.1 * Math.sin(t * 3 + h)) + ')'; shapePath(c, 'circle', x, y, 6 + h % 14, 0); c.fill(); }
    }
    c.restore();
  },

  drawMenuBg(c, dt) {
    const W = this.W, H = this.H; c.fillStyle = '#05050c'; c.fillRect(0, 0, W, H);
    for (const st of this.stars) {
      st[1] += dt * st[2] * 0.02; if (st[1] > 1) st[1] -= 1;
      c.fillStyle = 'rgba(180,170,255,' + (st[2] / 2) + ')'; c.fillRect(st[0] * W, st[1] * H, st[2] * 2 * this.dpr, st[2] * 2 * this.dpr);
    }
  },

  drawHud(c, ox, oy, s) {
    const r = this.run, p = r.p, W = this.W, H = this.H, G = Settings.data.gameplay, u = this.dpr * G.uiScale;
    const font = (sz, b) => c.font = (b ? 'bold ' : '') + Math.round(sz * u) + 'px Segoe UI,system-ui,sans-serif';
    c.textBaseline = 'top';
    c.fillStyle = '#14142a'; c.fillRect(0, 0, W, 8 * u); c.fillStyle = '#40c4ff'; c.fillRect(0, 0, W * Math.min(1, p.xp / p.xpNext), 8 * u);
    font(16, 1); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('Nivel ' + p.level, 12 * u, 14 * u);
    if (Settings.data.video.showFps) { font(12); c.fillStyle = '#8f8'; c.fillText(this.fps + ' FPS', 12 * u, 36 * u); }
    c.textAlign = 'center'; font(20, 1); c.fillStyle = '#fff'; c.fillText('Oleada ' + r.wave + '/' + MAX_WAVE, W / 2, 14 * u);
    if (G.showTimer) { font(13); c.fillStyle = '#aab'; c.fillText((r.boss ? '¡Derrota al jefe!' : r.wave < MAX_WAVE ? 'Siguiente oleada en ' + Math.ceil(r.waveT) + 's' : 'Oleada final') + '   ·   ' + fmtTime(r.time), W / 2, 40 * u); }
    if (r.boss) {
      const bw = Math.min(W * 0.6, 620 * u), bx = (W - bw) / 2, by = 62 * u, e = r.boss;
      c.fillStyle = '#2a0a0a'; c.fillRect(bx, by, bw, 14 * u); c.fillStyle = '#ff1744'; c.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 14 * u);
      c.strokeStyle = '#ff8a80'; c.lineWidth = u; c.strokeRect(bx, by, bw, 14 * u);
      font(13, 1); c.fillStyle = '#fff'; c.fillText(e.name, W / 2, by + 18 * u);
      if (G.bossArrow) {
        const bx2 = e.x * s + ox, by2 = e.y * s + oy;
        if (bx2 < 0 || bx2 > W || by2 < 0 || by2 > H) {
          const a = Math.atan2(by2 - H / 2, bx2 - W / 2), m = 40 * u, ax = clamp(W / 2 + Math.cos(a) * W, m, W - m), ay = clamp(H / 2 + Math.sin(a) * H, m, H - m);
          c.fillStyle = '#ff1744'; shapePath(c, 'tri', ax, ay, 14 * u, a); c.fill();
        }
      }
    }
    c.textAlign = 'right'; font(15, 1); c.fillStyle = '#fff'; c.fillText('☠ ' + r.kills, W - 62 * u, 14 * u);
    c.fillStyle = '#b388ff'; c.fillText('◆ ' + Math.floor(r.frags), W - 62 * u, 36 * u);
    if (r.danger) { c.fillStyle = '#ff5252'; c.fillText('Peligro ' + r.danger, W - 62 * u, 58 * u); }

    const hw = 240 * u, hx = 14 * u, hy = H - 30 * u;
    c.fillStyle = '#2a0d14'; c.fillRect(hx, hy, hw, 16 * u);
    c.fillStyle = p.hp / p.stats.maxHp < 0.3 ? '#ff1744' : '#e53935'; c.fillRect(hx, hy, hw * Math.max(0, p.hp / p.stats.maxHp), 16 * u);
    font(12, 1); c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(Math.ceil(p.hp) + ' / ' + Math.round(p.stats.maxHp), hx + hw / 2, hy + 1 * u);
    let x = hx; const bs = 34 * u, y = hy - bs - 10 * u;
    const box = (icon, lvl, col) => {
      c.fillStyle = '#12122a'; c.fillRect(x, y, bs, bs); c.strokeStyle = col; c.lineWidth = u; c.strokeRect(x, y, bs, bs);
      font(17, 1); c.fillStyle = col; c.textBaseline = 'middle'; c.fillText(icon, x + bs / 2, y + bs / 2 - 2 * u); c.textBaseline = 'top';
      for (let i = 0; i < 5; i++) { c.fillStyle = i < lvl ? col : '#333'; c.fillRect(x + 3 * u + i * 6 * u, y + bs - 5 * u, 5 * u, 3 * u); }
      x += bs + 5 * u;
    };
    for (const w of p.weapons) box(WEAPONS[w.id].icon, w.lvl, WEAPONS[w.id].col);
    x += 8 * u;
    for (const id in p.passives) box(PASSIVES[id].icon, p.passives[id], '#ffd54f');
    if (r.revives > 0) { font(12, 1); c.textAlign = 'left'; c.fillStyle = '#69f0ae'; c.fillText('♥ x' + r.revives, hx + hw + 10 * u, hy + 1 * u); }

    if (r.banner) { c.globalAlpha = Math.min(1, r.banner.time * 2); font(40, 1); c.textAlign = 'center'; c.fillStyle = r.banner.col; c.fillText(r.banner.t, W / 2, H * 0.24); c.globalAlpha = 1; }
    if (r.hurtFlash > 0 && Settings.data.video.flashes) {
      const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, 'rgba(255,0,40,' + r.hurtFlash * 1.5 + ')'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    const T = Input.touch;
    if (T.active && Input.touchEnabled()) {
      const d = this.dpr; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3 * d; c.beginPath(); c.arc(T.ox * d, T.oy * d, 50 * d, 0, TAU); c.stroke();
      let kx = T.x - T.ox, ky = T.y - T.oy; const l = Math.hypot(kx, ky); if (l > 50) { kx *= 50 / l; ky *= 50 / l; }
      c.fillStyle = 'rgba(255,255,255,.4)'; shapePath(c, 'circle', (T.ox + kx) * d, (T.oy + ky) * d, 22 * d, 0); c.fill();
    }
  }
};
