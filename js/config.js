// Configuración del jugador y progreso guardado (localStorage)
const VERSION = '0.1.0';
const SET_KEY = 'hdv_settings_v1', SAVE_KEY = 'hdv_save_v1';

const DEFAULT_SETTINGS = {
  video: { renderScale: 1, fpsCap: 0, showFps: false, particles: 2, shake: 1, flashes: true, damageNumbers: true, enemyBars: true, zoom: 1 },
  audio: { master: 0.8, music: 0.6, sfx: 0.8, track: 'auto', bossMusic: true, muteUnfocused: true },
  controls: {
    aimMode: 'auto', gamepad: true, touch: 'auto',
    keys: {
      up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
      dash: ['Space', 'ShiftLeft'], pause: ['Escape', 'KeyP'], music: ['KeyM', ''], reroll: ['KeyR', '']
    }
  },
  gameplay: { autoPause: true, showTimer: true, colorblind: false, uiScale: 1, bossArrow: true },
  look: { color: '#4fc3f7', shape: 'tri', trail: true }
};

const DEFAULT_PROFILE = {
  frags: 0, totalFrags: 0, kills: 0, runs: 0, bestWave: 0, bestLevel: 0, bossKills: 0, bossTypes: [],
  wins: 0, wonDanger: -1, dashes: 0, upgrades: {}, chars: ['piloto'], ach: [], flags: {}
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function deepMerge(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  if (!b || typeof b !== 'object') return o;
  for (const k in b) {
    if (a && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = deepMerge(a[k], b[k]);
    else if (b[k] !== undefined) o[k] = b[k];
  }
  return o;
}
function readLS(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }

const Settings = {
  data: null,
  load() { this.data = deepMerge(clone(DEFAULT_SETTINGS), readLS(SET_KEY)); },
  save() { try { localStorage.setItem(SET_KEY, JSON.stringify(this.data)); } catch (e) { } },
  reset(sec) { this.data[sec] = clone(DEFAULT_SETTINGS[sec]); this.save(); }
};

const Profile = {
  data: null,
  load() { this.data = deepMerge(clone(DEFAULT_PROFILE), readLS(SAVE_KEY)); },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { } },
  reset() { this.data = clone(DEFAULT_PROFILE); this.save(); }
};
