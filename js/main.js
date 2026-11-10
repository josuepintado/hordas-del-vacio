// Arranque y bucle principal
window.addEventListener('load', () => {
  Settings.load(); Profile.load();
  const cv = document.getElementById('c');
  Game.init(cv); Input.init(cv); UI.init(); UI.main();

  const unlockAudio = () => { AudioSys.init(); AudioSys.resume(); };
  addEventListener('pointerdown', unlockAudio); addEventListener('keydown', unlockAudio); addEventListener('touchstart', unlockAudio);

  const lostFocus = () => { if (Game.state === 'play' && Settings.data.gameplay.autoPause) UI.pause(); AudioSys.focus(false); };
  addEventListener('blur', lostFocus);
  addEventListener('focus', () => AudioSys.focus(true));
  document.addEventListener('visibilitychange', () => document.hidden ? lostFocus() : AudioSys.focus(true));

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const cap = Settings.data.video.fpsCap;
    if (cap && now - last < 1000 / cap - 1) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    Game.frame(dt);
    Input.endFrame();
  }
  requestAnimationFrame(frame);
});
