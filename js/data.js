// Contenido del juego: armas, mejoras, personajes, mapas, enemigos, jefes y logros
const WAVE_LEN = 30, MAX_WAVE = 30, WORLD = 1400;

const WEAPONS = {
  blaster:   { name: 'Bláster', icon: '➤', col: '#4fc3f7', desc: ['Dispara al enemigo más cercano.', '+1 proyectil.', 'Más cadencia y daño.', '+1 proyectil. Atraviesa 1 enemigo.', 'Atraviesa 2 enemigos.'] },
  orbes:     { name: 'Orbes guardianes', icon: '◎', col: '#b388ff', desc: ['2 orbes giran a tu alrededor.', '+1 orbe.', '+1 orbe y más daño.', '+1 orbe y mayor radio.', '+1 orbe. Giran más rápido.'] },
  rayo:      { name: 'Rayo en cadena', icon: 'ϟ', col: '#fff176', desc: ['Un rayo salta entre 3 enemigos.', '+1 salto.', 'Más frecuente.', '+1 salto y +20% daño.', '+2 saltos.'] },
  nova:      { name: 'Nova', icon: '✺', col: '#ff8a65', desc: ['Pulso que daña y empuja a tu alrededor.', 'Mayor radio y daño.', 'Más frecuente.', 'Más daño.', 'Radio enorme.'] },
  misiles:   { name: 'Misiles buscadores', icon: '➶', col: '#ef5350', desc: ['Un misil persigue enemigos y explota.', 'Más daño.', '+1 misil.', 'Explosión más grande.', '+1 misil.'] },
  cuchillas: { name: 'Cuchillas bumerán', icon: '✦', col: '#80cbc4', desc: ['Lanza una cuchilla que va y vuelve.', 'Más daño.', '+1 cuchilla.', 'Más frecuentes.', '+1 cuchilla.'] }
};

const PASSIVES = {
  poder:    { name: 'Núcleo de poder', icon: '⚔', desc: '+10% de daño' },
  cadencia: { name: 'Acelerador', icon: '⏩', desc: '+8% de cadencia' },
  botas:    { name: 'Propulsores', icon: '»', desc: '+8% de velocidad' },
  coraza:   { name: 'Coraza', icon: '♥', desc: '+20 de vida máxima' },
  blindaje: { name: 'Blindaje', icon: '⛨', desc: '-1 de daño recibido' },
  iman:     { name: 'Imán', icon: '∪', desc: '+30% de radio de recogida' },
  regen:    { name: 'Nanobots', icon: '✚', desc: '+0.4 de vida por segundo' },
  area:     { name: 'Amplificador', icon: '◉', desc: '+12% de área' },
  critico:  { name: 'Mira láser', icon: '⌖', desc: '+6% de golpe crítico' }
};

// Mejoras permanentes (Laboratorio). Coste = base * 1.45^nivel
const UPGRADES = [
  { id: 'poder', name: 'Potencia', desc: '+4% de daño', max: 10, base: 40 },
  { id: 'vida', name: 'Vitalidad', desc: '+8 de vida máxima', max: 10, base: 30 },
  { id: 'velocidad', name: 'Motores', desc: '+3% de velocidad', max: 10, base: 35 },
  { id: 'cadencia', name: 'Gatillo rápido', desc: '+3% de cadencia', max: 10, base: 50 },
  { id: 'area', name: 'Expansión', desc: '+3% de área', max: 10, base: 45 },
  { id: 'critico', name: 'Precisión', desc: '+1% de crítico', max: 10, base: 45 },
  { id: 'iman', name: 'Magnetismo', desc: '+10% de radio de recogida', max: 10, base: 25 },
  { id: 'armadura', name: 'Placas', desc: '-0.5 de daño recibido', max: 5, base: 80 },
  { id: 'regen', name: 'Reparación', desc: '+0.15 de vida por segundo', max: 5, base: 70 },
  { id: 'experiencia', name: 'Sabiduría', desc: '+5% de experiencia', max: 10, base: 60 },
  { id: 'codicia', name: 'Codicia', desc: '+6% de fragmentos', max: 10, base: 80 },
  { id: 'dash', name: 'Impulso', desc: '-8% de recarga del impulso', max: 5, base: 70 },
  { id: 'relanzar', name: 'Relanzar', desc: '+1 relanzamiento de mejoras por partida', max: 5, base: 120 },
  { id: 'revivir', name: 'Segunda vida', desc: '+1 resurrección por partida', max: 2, base: 600 }
];
const upgCost = (u, l) => Math.round(u.base * Math.pow(1.45, l));

const CHARS = [
  { id: 'piloto', name: 'Piloto', weapon: 'blaster', desc: 'Equilibrado.', mods: {} },
  { id: 'bastion', name: 'Bastión', weapon: 'nova', desc: '+40 vida, +1 blindaje, -10% velocidad.', mods: { hp: 40, armor: 1, speed: -0.1 }, unlock: { cost: 600 } },
  { id: 'chispa', name: 'Chispa', weapon: 'rayo', desc: '+15% velocidad, -20 vida.', mods: { speed: 0.15, hp: -20 }, unlock: { req: 'Llega a la oleada 10', check: p => p.bestWave >= 10 } },
  { id: 'ingeniera', name: 'Ingeniera', weapon: 'orbes', desc: '+15% área, +10% cadencia.', mods: { area: 0.15, rate: 0.1 }, unlock: { req: 'Derrota 3 jefes', check: p => p.bossKills >= 3 } },
  { id: 'cazadora', name: 'Cazadora', weapon: 'misiles', desc: '+10% crítico, +10% daño.', mods: { crit: 0.1, dmg: 0.1 }, unlock: { cost: 2000 } },
  { id: 'errante', name: 'Errante', weapon: 'cuchillas', desc: '+10% daño y velocidad, +2 relanzar.', mods: { dmg: 0.1, speed: 0.1, reroll: 2 }, unlock: { req: 'Gana una partida', check: p => p.wins >= 1 } }
];
const charUnlocked = (c, P) => P.chars.includes(c.id) || !!(c.unlock && c.unlock.check && c.unlock.check(P));

const MAPS = [
  { id: 'vacio', name: 'El Vacío', desc: 'Donde todo empieza.', bonus: 0, bg: '#07070f', grid: '#13132a', deco: 'star', track: 0 },
  { id: 'cristal', name: 'Bosque de Cristal', desc: '+15% fragmentos.', bonus: 0.15, bg: '#05161b', grid: '#0e2c31', deco: 'crystal', track: 1, req: 'Llega a la oleada 15', check: p => p.bestWave >= 15 },
  { id: 'fundicion', name: 'La Fundición', desc: '+30% fragmentos.', bonus: 0.3, bg: '#150906', grid: '#2c1209', deco: 'ember', track: 2, req: 'Gana en Peligro 1', check: p => p.wonDanger >= 1 }
];
const mapUnlocked = (m, P) => !m.check || m.check(P);

const ENEMIES = {
  rastrero: { r: 12, hp: 14, spd: 75, dmg: 8, xp: 1, col: '#ef5350', shape: 'circle', from: 1, w: 10 },
  veloz:    { r: 9, hp: 8, spd: 140, dmg: 6, xp: 1, col: '#ffca28', shape: 'tri', from: 3, w: 6 },
  bruto:    { r: 22, hp: 70, spd: 48, dmg: 16, xp: 5, col: '#ab47bc', shape: 'square', from: 6, w: 3 },
  tirador:  { r: 13, hp: 20, spd: 60, dmg: 8, xp: 2, col: '#26c6da', shape: 'diamond', from: 8, w: 3 },
  divisor:  { r: 17, hp: 34, spd: 62, dmg: 10, xp: 2, col: '#66bb6a', shape: 'hex', from: 11, w: 3 },
  kamikaze: { r: 11, hp: 12, spd: 95, dmg: 22, xp: 2, col: '#ff7043', shape: 'star', from: 14, w: 3 },
  mini:     { r: 8, hp: 6, spd: 100, dmg: 5, xp: 1, col: '#a5d6a7', shape: 'circle', from: 99, w: 0 }
};
const CB_COLORS = { rastrero: '#e69f00', veloz: '#f0e442', bruto: '#cc79a7', tirador: '#56b4e9', divisor: '#009e73', kamikaze: '#d55e00', mini: '#bbbbbb' };

const BOSSES = {
  coloso:   { name: 'El Coloso', hp: 1400, r: 52, col: '#d32f2f', spd: 58, shape: 'oct' },
  tejedora: { name: 'La Tejedora', hp: 1700, r: 46, col: '#8e24aa', spd: 85, shape: 'star' },
  ojo:      { name: 'El Ojo del Vacío', hp: 2300, r: 50, col: '#00897b', spd: 45, shape: 'eye' }
};
const BOSS_ORDER = { 5: 'coloso', 10: 'tejedora', 15: 'ojo', 20: 'coloso', 25: 'tejedora', 30: 'ojo' };

const sumUpg = p => Object.values(p.upgrades).reduce((a, b) => a + b, 0);
const ACHIEVEMENTS = [
  { id: 'w5', name: 'Primeros pasos', desc: 'Llega a la oleada 5.', reward: 30, check: p => p.bestWave >= 5 },
  { id: 'w10', name: 'Superviviente', desc: 'Llega a la oleada 10.', reward: 80, check: p => p.bestWave >= 10 },
  { id: 'w20', name: 'Veterano', desc: 'Llega a la oleada 20.', reward: 200, check: p => p.bestWave >= 20 },
  { id: 'win', name: 'Conquistador', desc: 'Gana una partida (oleada 30).', reward: 500, check: p => p.wins >= 1 },
  { id: 'b1', name: 'Cazajefes', desc: 'Derrota a tu primer jefe.', reward: 60, check: p => p.bossKills >= 1 },
  { id: 'bcol', name: 'Derribar al gigante', desc: 'Derrota a El Coloso.', reward: 100, check: p => p.bossTypes.includes('coloso') },
  { id: 'btej', name: 'Hilos cortados', desc: 'Derrota a La Tejedora.', reward: 150, check: p => p.bossTypes.includes('tejedora') },
  { id: 'bojo', name: 'Ciego al abismo', desc: 'Derrota a El Ojo del Vacío.', reward: 250, check: p => p.bossTypes.includes('ojo') },
  { id: 'b25', name: 'Matajefes', desc: 'Derrota 25 jefes en total.', reward: 600, check: p => p.bossKills >= 25 },
  { id: 'k1', name: 'Limpieza', desc: 'Elimina 1.000 enemigos en total.', reward: 80, check: p => p.kills >= 1000 },
  { id: 'k10', name: 'Plaga', desc: 'Elimina 10.000 enemigos en total.', reward: 300, check: p => p.kills >= 10000 },
  { id: 'k50', name: 'Aniquilador', desc: 'Elimina 50.000 enemigos en total.', reward: 800, check: p => p.kills >= 50000 },
  { id: 'k200', name: 'Fin de las hordas', desc: 'Elimina 200.000 enemigos en total.', reward: 2500, check: p => p.kills >= 200000 },
  { id: 'd1', name: 'Sin miedo', desc: 'Gana en Peligro 1.', reward: 400, check: p => p.wonDanger >= 1 },
  { id: 'd3', name: 'Temerario', desc: 'Gana en Peligro 3.', reward: 800, check: p => p.wonDanger >= 3 },
  { id: 'd5', name: 'Imparable', desc: 'Gana en Peligro 5.', reward: 1500, check: p => p.wonDanger >= 5 },
  { id: 'd10', name: 'Señor del Vacío', desc: 'Gana en Peligro 10.', reward: 5000, check: p => p.wonDanger >= 10 },
  { id: 'l20', name: 'Experto', desc: 'Llega al nivel 20 en una partida.', reward: 100, check: p => p.bestLevel >= 20 },
  { id: 'l40', name: 'Maestro', desc: 'Llega al nivel 40 en una partida.', reward: 300, check: p => p.bestLevel >= 40 },
  { id: 'max', name: 'Arma definitiva', desc: 'Sube un arma a nivel 5.', reward: 120, check: p => !!p.flags.maxed },
  { id: 'ars', name: 'Arsenal', desc: 'Ten 4 armas a la vez.', reward: 100, check: p => !!p.flags.arsenal },
  { id: 'intoc', name: 'Intocable', desc: 'Supera 5 oleadas sin recibir daño.', reward: 200, check: p => !!p.flags.intocable },
  { id: 'r10', name: 'Constante', desc: 'Juega 10 partidas.', reward: 100, check: p => p.runs >= 10 },
  { id: 'r50', name: 'Dedicado', desc: 'Juega 50 partidas.', reward: 400, check: p => p.runs >= 50 },
  { id: 'f10', name: 'Rico', desc: 'Consigue 10.000 fragmentos en total.', reward: 300, check: p => p.totalFrags >= 10000 },
  { id: 'u30', name: 'Científico', desc: 'Compra 30 niveles en el Laboratorio.', reward: 300, check: p => sumUpg(p) >= 30 },
  { id: 'u100', name: 'Laboratorio completo', desc: 'Compra 100 niveles en el Laboratorio.', reward: 1500, check: p => sumUpg(p) >= 100 },
  { id: 'chars', name: 'Coleccionista', desc: 'Desbloquea todos los personajes.', reward: 1000, check: p => CHARS.every(c => charUnlocked(c, p)) },
  { id: 'dash', name: 'Bailarín', desc: 'Usa el impulso 500 veces.', reward: 100, check: p => p.dashes >= 500 }
];
