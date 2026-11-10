// Menús en HTML sobre el canvas
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const isElectron = /Electron/i.test(navigator.userAgent);
const pct = v => Math.round(v * 100) + '%';
const COLORS = ['#4fc3f7', '#69f0ae', '#ffd54f', '#ff8a65', '#ff4081', '#b388ff', '#ffffff', '#ff1744', '#00e5ff', '#c6ff00'];
const KEY_LABELS = { up: 'Mover arriba', down: 'Mover abajo', left: 'Mover izquierda', right: 'Mover derecha', dash: 'Impulso', pause: 'Pausa / volver', music: 'Cambiar música', reroll: 'Relanzar mejoras' };

const UI = {
  cur: '', from: 'main', tab: 'video', sel: null, opts: [],
  init() { this.root = document.getElementById('ui'); },
  screen(name, cls, ...kids) {
    this.cur = name; this.root.innerHTML = '';
    const s = el('div', { class: 'screen ' + (cls || '') }, ...kids); this.root.append(s);
    const f = s.querySelector('.btn'); if (f && !Input.sawTouch) f.focus({ preventScroll: true });
    return s;
  },
  btn(txt, fn, cls, dis) { return el('button', { class: 'btn ' + (cls || ''), disabled: !!dis, onclick: () => { AudioSys.sfx('click'); fn(); } }, txt); },
  toast(msg) { const t = el('div', { class: 'toast' }, msg); document.getElementById('toasts').append(t); setTimeout(() => t.remove(), 4600); },
  back() {
    switch (this.cur) {
      case 'pause': this.resume(); break;
      case 'options': Settings.save(); this.from === 'pause' ? this.pause() : this.main(); break;
      case 'setup': case 'shop': case 'ach': case 'howto': this.main(); break;
    }
  },

  main() {
    Game.state = 'menu'; Game.run = null; const P = Profile.data;
    this.screen('main', '',
      el('h1', { class: 'title' }, 'HORDAS DEL VACÍO'),
      el('p', { class: 'sub' }, 'Sobrevive 30 oleadas. Derrota a los jefes. Vuelve más fuerte.'),
      el('div', { class: 'menu' },
        this.btn('Jugar', () => this.setup(), 'big'),
        this.btn('Laboratorio (mejoras)', () => this.shop()),
        this.btn('Logros  ' + P.ach.length + '/' + ACHIEVEMENTS.length, () => this.ach()),
        this.btn('Opciones', () => { this.from = 'main'; this.options(); }),
        this.btn('Cómo jugar', () => this.howto()),
        isElectron && this.btn('Salir', () => window.close())),
      el('div', { class: 'stats' }, '◆ ' + P.frags + ' fragmentos   ·   Mejor oleada: ' + P.bestWave + '   ·   Jefes: ' + P.bossKills + '   ·   Partidas: ' + P.runs),
      el('div', { class: 'ver' }, 'v' + VERSION));
  },

  setup() {
    const P = Profile.data, s = this.sel || (this.sel = { char: 'piloto', map: 'vacio', danger: 0 });
    if (!charUnlocked(CHARS.find(c => c.id === s.char), P)) s.char = 'piloto';
    const maxD = Math.min(10, P.wonDanger + 1); if (s.danger > maxD) s.danger = maxD;
    const chars = CHARS.map(c => {
      const ok = charUnlocked(c, P), W = WEAPONS[c.weapon];
      return el('div', { class: 'card' + (s.char === c.id ? ' sel' : '') + (ok ? '' : ' locked'), onclick: () => { if (ok) { s.char = c.id; AudioSys.sfx('click'); this.setup(); } } },
        el('div', { class: 'ico', style: 'color:' + W.col }, W.icon), el('h3', {}, c.name), el('small', {}, 'Arma: ' + W.name), el('small', {}, c.desc),
        ok ? null : c.unlock.cost ? this.btn('Comprar ◆ ' + c.unlock.cost, () => { if (P.frags >= c.unlock.cost) { P.frags -= c.unlock.cost; P.chars.push(c.id); s.char = c.id; AudioSys.sfx('buy'); Game.checkAch(); Profile.save(); this.setup(); } }, 'small', P.frags < c.unlock.cost) : el('span', { class: 'tag' }, '🔒 ' + c.unlock.req));
    });
    const maps = MAPS.map(m => {
      const ok = mapUnlocked(m, P);
      return el('div', { class: 'card' + (s.map === m.id ? ' sel' : '') + (ok ? '' : ' locked'), style: 'background:' + m.bg, onclick: () => { if (ok) { s.map = m.id; AudioSys.sfx('click'); this.setup(); } } },
        el('h3', {}, m.name), el('small', {}, m.desc), ok ? null : el('span', { class: 'tag' }, '🔒 ' + m.req));
    });
    const dangers = [];
    for (let d = 0; d <= 10; d++) dangers.push(this.btn(d === 0 ? 'Normal' : String(d), () => { s.danger = d; this.setup(); }, 'small' + (s.danger === d ? ' on' : ''), d > maxD));
    const dm = s.danger;
    this.screen('setup', '',
      el('h2', {}, 'Elige tu piloto'), el('div', { class: 'cards' }, chars),
      el('h2', {}, 'Mapa'), el('div', { class: 'cards' }, maps),
      el('h2', {}, 'Peligro'), el('div', { class: 'bar' }, dangers),
      el('p', { class: 'sub' }, dm ? 'Enemigos +' + (25 * dm) + '% vida, +' + (15 * dm) + '% daño, +' + (8 * dm) + '% cantidad · Fragmentos +' + (20 * dm) + '%' : 'Gana una partida para desbloquear el siguiente nivel de peligro.'),
      el('div', { class: 'bar' }, this.btn('← Volver', () => this.main()), this.btn('¡Comenzar!', () => { Game.start(s.char, s.map, s.danger); this.hud(); }, 'big')));
  },

  shop() {
    const P = Profile.data, top = this.root.querySelector('.screen') && this.cur === 'shop' ? this.root.querySelector('.screen').scrollTop : 0;
    const rows = UPGRADES.map(u => {
      const l = P.upgrades[u.id] || 0, cost = upgCost(u, l), max = l >= u.max;
      return el('div', { class: 'upg' },
        el('div', { class: 'info' }, el('b', {}, u.name), ' ', el('small', {}, u.desc + ' (total: nivel ' + l + '/' + u.max + ')'),
          el('div', { class: 'pips' }, Array.from({ length: u.max }, (_, i) => el('div', { class: 'pip' + (i < l ? ' on' : '') })))),
        this.btn(max ? 'MÁX' : '◆ ' + cost, () => { if (P.frags >= cost && !max) { P.frags -= cost; P.upgrades[u.id] = l + 1; AudioSys.sfx('buy'); Game.checkAch(); Profile.save(); this.shop(); } }, 'small', max || P.frags < cost));
    });
    const s = this.screen('shop', '', el('h2', {}, 'Laboratorio'), el('p', { class: 'sub' }, 'Mejoras permanentes para todas tus partidas.  ◆ ' + P.frags + ' fragmentos'),
      el('div', { class: 'panel' }, rows), this.btn('← Volver', () => this.main()));
    s.scrollTop = top;
  },

  ach() {
    const P = Profile.data;
    this.screen('ach', '', el('h2', {}, 'Logros  ' + P.ach.length + '/' + ACHIEVEMENTS.length),
      el('div', { class: 'ach' }, ACHIEVEMENTS.map(a => el('div', { class: P.ach.includes(a.id) ? 'ok' : '' }, el('b', {}, (P.ach.includes(a.id) ? '✔ ' : '🔒 ') + a.name), el('br'), el('small', {}, a.desc + '  ·  +' + a.reward + ' ◆')))),
      this.btn('← Volver', () => this.main()));
  },

  howto() {
    this.screen('howto', '', el('h2', {}, 'Cómo jugar'),
      el('div', { class: 'help panel' },
        el('p', {}, el('b', {}, 'Objetivo: '), 'sobrevive 30 oleadas de 30 segundos. Cada 5 oleadas aparece un ', el('b', {}, 'jefe'), '; la oleada no avanza hasta derrotarlo. Al vencer al jefe de la oleada 30, ganas.'),
        el('p', {}, el('b', {}, 'Tus armas disparan solas. '), 'Tú te mueves (WASD, flechas, mando o joystick táctil) y esquivas. Con ', el('b', {}, 'Espacio/Shift'), ' haces un impulso que te vuelve invulnerable un instante.'),
        el('p', {}, 'Los enemigos sueltan ', el('b', {}, 'cristales de experiencia'), '. Al subir de nivel eliges 1 de 3 mejoras: armas nuevas (máx. 4), subir armas (máx. nivel 5) o mejoras pasivas (máx. 4). Con ', el('b', {}, 'R'), ' relanzas las opciones si tienes relanzamientos.'),
        el('p', {}, 'Objetos: ', el('b', {}, '+'), ' cura, ', el('b', {}, 'U'), ' atrae toda la experiencia, ', el('b', {}, '!'), ' bomba, ', el('b', {}, '★'), ' cofre de jefe (3 mejoras gratis).'),
        el('p', {}, 'Al terminar ganas ', el('b', {}, '◆ fragmentos'), ' para el Laboratorio (mejoras permanentes) y para desbloquear pilotos. Gana partidas para subir el nivel de ', el('b', {}, 'Peligro'), ' (hasta 10), que da más recompensa.'),
        el('p', {}, 'Teclas útiles: ', el('b', {}, 'Esc/P'), ' pausa, ', el('b', {}, 'M'), ' cambia la música, ', el('b', {}, '1/2/3'), ' eligen mejora. Todo se puede cambiar en Opciones.')),
      this.btn('← Volver', () => this.main()));
  },

  hud() { this.screen('hud', ''); this.root.firstChild.style.pointerEvents = 'none'; this.root.firstChild.append(el('button', { class: 'btn hudbtn', style: 'pointer-events:auto', onclick: () => this.pause() }, '❚❚')); this.root.firstChild.querySelector('.btn').blur(); },
  pause() {
    if (Game.state !== 'play' && Game.state !== 'pause') return;
    Game.state = 'pause';
    this.screen('pause', 'dim', el('h2', { style: 'margin-top:12vh' }, 'PAUSA'),
      el('p', { class: 'sub' }, 'Oleada ' + Game.run.wave + '  ·  Nivel ' + Game.run.p.level + '  ·  ' + Game.run.kills + ' enemigos'),
      el('div', { class: 'menu' }, this.btn('Continuar', () => this.resume(), 'big'), this.btn('Opciones', () => { this.from = 'pause'; this.options(); }),
        this.btn('Abandonar partida', () => { if (confirm('¿Abandonar? Conservas los fragmentos ganados hasta ahora.')) Game.end(false); }, 'red')));
  },
  resume() { Game.state = 'play'; this.hud(); },

  levelUp(opts) {
    this.opts = opts; const r = Game.run;
    const cards = opts.map((o, i) => {
      let icon, col, title, desc, tag;
      if (o.k === 'w') { const W = WEAPONS[o.id]; icon = W.icon; col = W.col; title = W.name; desc = W.desc[o.lvl - 1]; tag = o.lvl === 1 ? '¡NUEVA ARMA!' : 'Nivel ' + o.lvl; }
      else if (o.k === 'p') { const P = PASSIVES[o.id]; icon = P.icon; col = '#ffd54f'; title = P.name; desc = P.desc; tag = o.lvl === 1 ? 'NUEVA MEJORA' : 'Nivel ' + o.lvl; }
      else { icon = o.k === 'heal' ? '✚' : '◆'; col = '#69f0ae'; title = Game.optName(o); desc = 'Ya tienes todo al máximo.'; tag = ''; }
      return el('button', { class: 'card', onclick: () => this.pickLevel(i) }, el('div', { class: 'ico', style: 'color:' + col }, icon), el('span', { class: 'tag' }, (i + 1) + ' · ' + tag), el('h3', {}, title), el('small', {}, desc));
    });
    this.screen('levelup', 'dim', el('h2', { style: 'margin-top:8vh' }, '¡Nivel ' + (r.p.level - r.pendingLv + 1) + '!'), el('p', { class: 'sub' }, 'Elige una mejora (teclas 1, 2, 3)'),
      el('div', { class: 'cards lv' }, cards),
      r.rerolls > 0 ? this.btn('↻ Relanzar (' + r.rerolls + ')  [R]', () => this.reroll()) : null);
  },
  pickLevel(i) { if (Game.state !== 'levelup' || !this.opts[i]) return; AudioSys.sfx('click'); Game.choose(this.opts[i]); },
  reroll() { const r = Game.run; if (Game.state !== 'levelup' || r.rerolls <= 0) return; r.rerolls--; this.levelUp(Game.rollOptions()); },

  end(s) {
    const st = this.sel;
    this.screen('end', 'dim', el('h2', { style: 'margin-top:8vh;color:' + (s.win ? '#69f0ae' : '#ff5252') }, s.win ? '¡VICTORIA!' : 'HAS CAÍDO'),
      el('div', { class: 'panel res' },
        el('span', {}, 'Oleada alcanzada'), el('span', {}, s.wave + ' / ' + MAX_WAVE),
        el('span', {}, 'Nivel'), el('span', {}, s.level),
        el('span', {}, 'Enemigos eliminados'), el('span', {}, s.kills),
        el('span', {}, 'Jefes derrotados'), el('span', {}, s.bosses),
        el('span', {}, 'Tiempo'), el('span', {}, fmtTime(s.time)),
        el('span', {}, 'Peligro'), el('span', {}, s.danger || 'Normal'),
        el('span', {}, 'Fragmentos ganados'), el('span', {}, '+' + s.total + ' ◆')),
      s.win && s.danger < 10 ? el('p', { class: 'sub' }, '¡Desbloqueaste Peligro ' + (s.danger + 1) + '!') : null,
      el('div', { class: 'bar' }, this.btn('Jugar otra vez', () => { Game.start(st.char, st.map, st.danger); this.hud(); }, 'big'), this.btn('Laboratorio', () => this.shop()), this.btn('Menú principal', () => this.main())));
  },

  // ---------------- opciones ----------------
  options(tab) {
    if (tab) this.tab = tab;
    const S = Settings.data, save = () => Settings.save();
    const row = (label, ctrl) => el('div', { class: 'row' }, el('label', {}, label), ctrl);
    const toggle = (label, get, set) => row(label, el('input', { type: 'checkbox', checked: get(), onchange: e => { set(e.target.checked); save(); } }));
    const range = (label, min, max, step, get, set, fmt) => {
      const v = el('span', { class: 'val' }, fmt(get()));
      return row(label, el('span', {}, el('input', { type: 'range', min, max, step, value: get(), oninput: e => { set(+e.target.value); v.textContent = fmt(+e.target.value); save(); } }), v));
    };
    const select = (label, opts, get, set) => row(label, el('select', { onchange: e => { set(e.target.value); save(); } },
      opts.map(([v, t]) => el('option', { value: String(v), selected: String(get()) === String(v) }, t))));
    let rows = [];
    switch (this.tab) {
      case 'video': rows = [
        toggle('Pantalla completa', () => !!document.fullscreenElement, v => { if (v) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); else if (document.fullscreenElement) document.exitFullscreen(); }),
        select('Escala de resolución', [[0.5, '50% (máximo rendimiento)'], [0.75, '75%'], [1, '100%'], [1.5, '150% (más nitidez)']], () => S.video.renderScale, v => { S.video.renderScale = +v; Game.resize(); }),
        select('Límite de FPS', [[0, 'Sin límite (V-Sync)'], [30, '30'], [60, '60'], [120, '120'], [144, '144']], () => S.video.fpsCap, v => S.video.fpsCap = +v),
        toggle('Mostrar FPS', () => S.video.showFps, v => S.video.showFps = v),
        select('Calidad de partículas', [[0, 'Apagadas'], [1, 'Bajas'], [2, 'Altas']], () => S.video.particles, v => S.video.particles = +v),
        range('Temblor de pantalla', 0, 1.5, 0.1, () => S.video.shake, v => S.video.shake = v, pct),
        range('Zoom de cámara', 0.7, 1.3, 0.05, () => S.video.zoom, v => { S.video.zoom = v; Game.resize(); }, pct),
        toggle('Destello rojo al recibir daño', () => S.video.flashes, v => S.video.flashes = v),
        toggle('Números de daño', () => S.video.damageNumbers, v => S.video.damageNumbers = v),
        toggle('Barras de vida de enemigos', () => S.video.enemyBars, v => S.video.enemyBars = v)]; break;
      case 'audio': rows = [
        range('Volumen general', 0, 1, 0.05, () => S.audio.master, v => { S.audio.master = v; AudioSys.applyVolumes(); }, pct),
        range('Volumen de música', 0, 1, 0.05, () => S.audio.music, v => { S.audio.music = v; AudioSys.applyVolumes(); }, pct),
        range('Volumen de efectos', 0, 1, 0.05, () => S.audio.sfx, v => { S.audio.sfx = v; AudioSys.applyVolumes(); AudioSys.sfx('xp'); }, pct),
        select('Música', TRACK_OPTS.map(v => [v, v === 'auto' ? 'Automática (según el mapa)' : AudioSys.trackLabel(v)]), () => S.audio.track, v => S.audio.track = (v === 'auto' || v === 'off') ? v : +v),
        toggle('Música especial en jefes', () => S.audio.bossMusic, v => S.audio.bossMusic = v),
        toggle('Silenciar cuando la ventana no está activa', () => S.audio.muteUnfocused, v => { S.audio.muteUnfocused = v; AudioSys.applyVolumes(); })]; break;
      case 'controles': rows = [
        select('Apuntado', [['auto', 'Automático (enemigo más cercano)'], ['mouse', 'Con el ratón']], () => S.controls.aimMode, v => S.controls.aimMode = v),
        toggle('Mando (gamepad)', () => S.controls.gamepad, v => S.controls.gamepad = v),
        select('Joystick táctil', [['auto', 'Automático'], ['on', 'Siempre'], ['off', 'Nunca']], () => S.controls.touch, v => S.controls.touch = v),
        ...Object.keys(KEY_LABELS).map(a => row(KEY_LABELS[a], el('span', { class: 'bar' }, [0, 1].map(i => el('button', {
          class: 'btn small key', onclick: e => {
            const b = e.currentTarget; b.textContent = 'Pulsa una tecla…';
            Input.rebind = code => { S.controls.keys[a][i] = code === 'Backspace' ? '' : code; save(); this.options(); };
          }
        }, keyName(S.controls.keys[a][i])))))),
        el('p', { class: 'sub' }, 'Pulsa un botón y luego la tecla nueva. Retroceso borra la tecla. Mando: stick o cruceta para moverte, A/RB impulso, Start pausa.')]; break;
      case 'juego': rows = [
        toggle('Pausar al cambiar de ventana', () => S.gameplay.autoPause, v => S.gameplay.autoPause = v),
        toggle('Mostrar temporizador', () => S.gameplay.showTimer, v => S.gameplay.showTimer = v),
        toggle('Flecha hacia el jefe', () => S.gameplay.bossArrow, v => S.gameplay.bossArrow = v),
        toggle('Modo daltónico (colores de alto contraste)', () => S.gameplay.colorblind, v => S.gameplay.colorblind = v),
        range('Tamaño de la interfaz', 0.7, 1.5, 0.05, () => S.gameplay.uiScale, v => S.gameplay.uiScale = v, pct),
        row('Progreso guardado', this.btn('Borrar todo el progreso', () => { if (confirm('¿Seguro? Se borrarán fragmentos, mejoras, logros y desbloqueos. No se puede deshacer.')) { Profile.reset(); this.toast('Progreso borrado'); } }, 'small red'))]; break;
      case 'apariencia': rows = [
        row('Color de la nave', el('div', { class: 'sws' }, COLORS.map(c => el('button', { class: 'sw' + (S.look.color === c ? ' on' : ''), style: 'background:' + c, onclick: () => { S.look.color = c; save(); this.options(); } })))),
        select('Forma de la nave', [['tri', 'Triángulo'], ['circle', 'Círculo'], ['diamond', 'Diamante'], ['star', 'Estrella'], ['hex', 'Hexágono']], () => S.look.shape, v => S.look.shape = v),
        toggle('Estela', () => S.look.trail, v => S.look.trail = v)]; break;
    }
    const tabs = [['video', 'Video'], ['audio', 'Audio'], ['controles', 'Controles'], ['juego', 'Juego'], ['apariencia', 'Apariencia']];
    this.screen('options', this.from === 'pause' ? 'dim' : '', el('h2', {}, 'Opciones'),
      el('div', { class: 'bar' }, tabs.map(([k, t]) => this.btn(t, () => this.options(k), 'small' + (this.tab === k ? ' on' : '')))),
      el('div', { class: 'panel' }, rows),
      el('div', { class: 'bar' }, this.btn('Restablecer esta pestaña', () => { const m = { video: 'video', audio: 'audio', controles: 'controls', juego: 'gameplay', apariencia: 'look' }; Settings.reset(m[this.tab]); Game.resize(); AudioSys.applyVolumes(); this.options(); }, 'small'),
        this.btn('← Volver', () => this.back())));
  }
};
