// Teclado (teclas reasignables), ratón, mando y joystick táctil
const KEY_NAMES = { Space: 'Espacio', ShiftLeft: 'Shift izq.', ShiftRight: 'Shift der.', ControlLeft: 'Ctrl izq.', ControlRight: 'Ctrl der.', Escape: 'Esc', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', AltLeft: 'Alt', Backspace: 'Retroceso' };
const keyName = c => !c ? '—' : KEY_NAMES[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');

const Input = {
  down: new Set(), pressed: new Set(), mouse: { x: 0, y: 0 }, rebind: null,
  touch: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 }, tapDash: false, sawTouch: false,
  padPrev: [], padNow: [],
  init(cv) {
    addEventListener('keydown', e => {
      if (this.rebind) { e.preventDefault(); const cb = this.rebind; this.rebind = null; cb(e.code); return; }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && Game.state === 'play') e.preventDefault();
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    const T = this.touch;
    cv.addEventListener('touchstart', e => {
      this.sawTouch = true; e.preventDefault();
      for (const t of e.changedTouches) {
        if (!T.active && t.clientX < innerWidth * 0.6) { T.active = true; T.id = t.identifier; T.ox = T.x = t.clientX; T.oy = T.y = t.clientY; }
        else this.tapDash = true;
      }
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === T.id) { T.x = t.clientX; T.y = t.clientY; }
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === T.id) { T.active = false; T.id = null; } };
    cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
  },
  touchEnabled() { const m = Settings.data.controls.touch; return m === 'on' || (m === 'auto' && this.sawTouch); },
  action(a) { return Settings.data.controls.keys[a].some(c => c && this.down.has(c)); },
  hit(a) { return Settings.data.controls.keys[a].some(c => c && this.pressed.has(c)); },
  pad() { if (!Settings.data.controls.gamepad || !navigator.getGamepads) return null; const g = navigator.getGamepads(); for (const p of g) if (p) return p; return null; },
  pollPad() { const p = this.pad(); this.padPrev = this.padNow; this.padNow = p ? p.buttons.map(b => b.pressed) : []; },
  padHit(i) { return !!this.padNow[i] && !this.padPrev[i]; },
  touchDash() { const d = this.tapDash; this.tapDash = false; return d && this.touchEnabled(); },
  move() {
    let x = 0, y = 0;
    if (this.action('left')) x -= 1; if (this.action('right')) x += 1;
    if (this.action('up')) y -= 1; if (this.action('down')) y += 1;
    const T = this.touch;
    if (T.active && this.touchEnabled()) { x += (T.x - T.ox) / 50; y += (T.y - T.oy) / 50; }
    const p = this.pad();
    if (p) {
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { x += ax; y += ay; }
      if (p.buttons[14] && p.buttons[14].pressed) x -= 1; if (p.buttons[15] && p.buttons[15].pressed) x += 1;
      if (p.buttons[12] && p.buttons[12].pressed) y -= 1; if (p.buttons[13] && p.buttons[13].pressed) y += 1;
    }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  endFrame() { this.pressed.clear(); }
};
