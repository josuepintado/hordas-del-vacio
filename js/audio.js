// Música y efectos sintetizados en tiempo real con Web Audio (sin archivos de audio)
const TRACKS = [
  { name: 'Órbita', bpm: 118, root: 45, scale: [0, 3, 5, 7, 10], prog: [0, -4, -7, -2], lead: 'square', seed: 11, drums: 1 },
  { name: 'Cristal', bpm: 92, root: 50, scale: [0, 2, 4, 7, 9], prog: [0, -3, -5, -7], lead: 'triangle', seed: 22, drums: 0 },
  { name: 'Fundición', bpm: 140, root: 40, scale: [0, 1, 5, 7, 8], prog: [0, 0, 1, -2], lead: 'sawtooth', seed: 33, drums: 2 },
  { name: 'Abismo', bpm: 150, root: 38, scale: [0, 3, 6, 7, 10], prog: [0, 1, 0, -1], lead: 'square', seed: 44, drums: 2 }
];
const TRACK_OPTS = ['auto', 0, 1, 2, 3, 'off'];
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const AudioSys = {
  ctx: null, cur: -1, step: 0, nextT: 0, last: {}, focused: true,
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.musicBus = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.musicBus.connect(lp); lp.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    const len = c.sampleRate; this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    TRACKS.forEach(t => this.build(t));
    this.applyVolumes();
    setInterval(() => this.schedule(), 25);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applyVolumes() {
    if (!this.ctx) return; const a = Settings.data.audio;
    const mute = !this.focused && a.muteUnfocused;
    this.master.gain.value = mute ? 0 : a.master;
    this.musicBus.gain.value = a.music * 0.55;
    this.sfxBus.gain.value = a.sfx;
  },
  focus(on) { this.focused = on; this.applyVolumes(); },
  build(t) {
    const r = seeded(t.seed), motifs = [];
    for (let m = 0; m < 4; m++) {
      const st = [];
      for (let i = 0; i < 16; i++) st.push(r() < (i % 2 ? 0.25 : 0.6) ? t.scale[Math.floor(r() * t.scale.length)] + (r() < 0.2 ? 12 : 0) : null);
      motifs.push(st);
    }
    t.motifs = motifs; t.seq = [0, 0, 1, 0, 2, 2, 3, 1];
  },
  cycle() {
    const a = Settings.data.audio; const i = TRACK_OPTS.findIndex(v => String(v) === String(a.track));
    a.track = TRACK_OPTS[(i + 1) % TRACK_OPTS.length]; Settings.save();
    UI.toast('Música: ' + this.trackLabel(a.track));
  },
  trackLabel(v) { return v === 'auto' ? 'Automática' : v === 'off' ? 'Apagada' : TRACKS[v].name; },
  tick(game) {
    if (!this.ctx) return;
    const a = Settings.data.audio, r = game.run; let want;
    if (a.track === 'off') want = -1;
    else if (r && r.boss && a.bossMusic) want = 3;
    else if (a.track === 'auto') want = r ? r.map.track : 0;
    else want = +a.track;
    if (want !== this.cur) { this.cur = want; this.step = 0; this.nextT = this.ctx.currentTime + 0.08; }
  },
  schedule() {
    if (!this.ctx || this.cur < 0 || this.ctx.state !== 'running') return;
    const t = TRACKS[this.cur], sd = 60 / t.bpm / 4;
    if (this.nextT < this.ctx.currentTime) this.nextT = this.ctx.currentTime + 0.02;
    while (this.nextT < this.ctx.currentTime + 0.12) { this.playStep(t, this.step, this.nextT, sd); this.nextT += sd; this.step = (this.step + 1) % 128; }
  },
  playStep(t, i, time, sd) {
    const bar = Math.floor(i / 16), st = i % 16, ch = t.prog[bar % 4], bus = this.musicBus;
    const n = t.motifs[t.seq[bar]][st];
    if (n !== null) this.tone(midi(t.root + 12 + ch + n), time, sd * 1.8, t.lead, t.lead === 'triangle' ? 0.12 : 0.05, bus);
    if (t.drums === 0) {
      if (st === 0) { this.tone(midi(t.root - 12 + ch), time, sd * 14, 'triangle', 0.16, bus); [0, 4, 7].forEach(k => this.tone(midi(t.root + ch + k), time, sd * 15, 'sine', 0.04, bus)); }
      if (st % 4 === 2) this.hit(time, 0.03, 8000, 0.03, bus);
    } else {
      if (st % 2 === 0) this.tone(midi(t.root - 12 + ch + (t.drums === 2 && st % 4 === 2 ? 12 : 0)), time, sd * 1.6, 'triangle', 0.17, bus);
      if (st % 4 === 0 || (t.drums === 2 && st === 14)) this.kick(time, bus);
      if (st === 4 || st === 12) this.hit(time, 0.12, 1800, 0.18, bus);
      if (t.drums === 2 || st % 2 === 1) this.hit(time, 0.03, 8000, 0.04, bus);
    }
  },
  tone(f, t, dur, type, vol, dest, f2) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  },
  kick(t, dest) { this.tone(140, t, 0.2, 'sine', 0.55, dest, 40); },
  hit(t, dur, freq, vol, dest, type) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type || (freq > 4000 ? 'highpass' : 'bandpass'); f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const gap = { shoot: 0.06, hit: 0.04, xp: 0.03, kill: 0.05, zap: 0.08, boom: 0.08, missile: 0.1 }[name] || 0;
    const now = this.ctx.currentTime;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const b = this.sfxBus, t = now + 0.005;
    switch (name) {
      case 'shoot': this.tone(900, t, 0.07, 'square', 0.05, b, 420); break;
      case 'hit': this.hit(t, 0.04, 3000, 0.08, b); break;
      case 'kill': this.tone(320, t, 0.12, 'triangle', 0.12, b, 70); break;
      case 'xp': this.tone(1200 + Math.random() * 300, t, 0.06, 'sine', 0.06, b, 1800); break;
      case 'level': [0, 4, 7, 12].forEach((k, i) => this.tone(midi(72 + k), t + i * 0.07, 0.25, 'square', 0.07, b)); break;
      case 'hurt': this.tone(220, t, 0.25, 'sawtooth', 0.18, b, 50); break;
      case 'dash': this.hit(t, 0.15, 1200, 0.15, b, 'bandpass'); break;
      case 'boom': this.hit(t, 0.4, 400, 0.35, b, 'lowpass'); this.tone(90, t, 0.3, 'sine', 0.3, b, 35); break;
      case 'zap': this.tone(1600, t, 0.09, 'sawtooth', 0.05, b, 300); break;
      case 'nova': this.tone(200, t, 0.3, 'sine', 0.2, b, 600); break;
      case 'missile': this.hit(t, 0.12, 900, 0.08, b, 'bandpass'); break;
      case 'boss': this.tone(55, t, 1.4, 'sawtooth', 0.25, b, 40); this.tone(58, t, 1.4, 'sawtooth', 0.2, b, 42); break;
      case 'chest': [0, 4, 7, 11, 14, 19].forEach((k, i) => this.tone(midi(67 + k), t + i * 0.06, 0.3, 'triangle', 0.12, b)); break;
      case 'click': this.tone(700, t, 0.04, 'sine', 0.1, b); break;
      case 'buy': this.tone(880, t, 0.08, 'square', 0.06, b); this.tone(1320, t + 0.08, 0.12, 'square', 0.06, b); break;
      case 'ach': [0, 7, 12, 16].forEach((k, i) => this.tone(midi(76 + k), t + i * 0.09, 0.35, 'sine', 0.14, b)); break;
    }
  }
};
