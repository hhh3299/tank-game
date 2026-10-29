/* =========================================================
   坦克大战 · Tank Battle
   纯原生 Canvas 实现，无第三方依赖
   ========================================================= */
(() => {
  'use strict';

  /* =========================================================
     一、常量
     ========================================================= */
  const TILE = 32;
  const COLS = 15;
  const ROWS = 15;
  const W = TILE * COLS;
  const H = TILE * ROWS;
  const TANK = 26;
  const HALF = TANK / 2;
  const BULLET = 6;
  const TAU = Math.PI * 2;

  const UP = 0;
  const RIGHT = 1;
  const DOWN = 2;
  const LEFT = 3;
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  const EMPTY = 0;
  const BRICK = 1;
  const BRICK2 = 2; // 打裂的砖墙
  const STEEL = 3;
  const WATER = 4;
  const GRASS = 5;
  const BASE = 6;

  const PLAYER_SPAWN = { c: 4, r: 14 };
  const SPAWN_COLS = [0, 7, 14];

  /* =========================================================
     二、关卡地图
     . 空地   B 砖墙   S 钢墙   W 河流   G 草丛   E 基地
     ========================================================= */
  const MAPS = [
    [
      '...............',
      '..BB.BBBBB.BB..',
      '..BB.B...B.BB..',
      '.....B...B.....',
      '.SS..B...B..SS.',
      '.....BBBBB.....',
      '.B...........B.',
      '.B..WW...WW..B.',
      '.B...........B.',
      '.....BBBBB.....',
      '.SS..B...B..SS.',
      '.....B...B.....',
      '..BB.BBBBB.BB..',
      '..BB..BEB..BB..',
      '......BBB......',
    ],
    [
      '...............',
      '.SS..BBBBB..SS.',
      '.S...B...B...S.',
      '.....B...B.....',
      'BBBB.B...B.BBBB',
      '.....BBBBB.....',
      '...WW.....WW...',
      '...WW.....WW...',
      '.....BBBBB.....',
      'BBBB.B...B.BBBB',
      '.....B...B.....',
      '.S...B...B...S.',
      '.SS..BBBBB..SS.',
      '...B..BEB..B...',
      '...B..BBB..B...',
    ],
    [
      '...............',
      '..BBBB...BBBB..',
      '..B..B...B..B..',
      '..B..BBBBB..B..',
      '.....B...B.....',
      'GGGG.B.W.B.GGGG',
      'G....B.W.B....G',
      'G.WW...W...WW.G',
      'G....B.W.B....G',
      'GGGG.B.W.B.GGGG',
      '.....B...B.....',
      '..B..BBBBB..B..',
      '..B..BBBBB..B..',
      '..BB..BEB..BB..',
      '......BBB......',
    ],
    [
      '...............',
      '.S..BBBBB.....S',
      '.S..B...B.....S',
      '....B...B......',
      '.BBBB...BBBB...',
      '....B...B......',
      '.WW.B...B.WW...',
      '.WW.B...B.WW...',
      '....B...B......',
      '.BBBB...BBBB...',
      '....B...B......',
      '.S..B...B.....S',
      '.S..BBBBB.....S',
      '......BEB......',
      '......BBB......',
    ],
    [
      '...............',
      '..BB.......BB..',
      '.BBBB.....BBBB.',
      '.B..B.....B..B.',
      '.B..BBBBBBB..B.',
      '.B.....W.....B.',
      '..WW..WWW..WW..',
      '..WW..WWW..WW..',
      '.B.....W.....B.',
      '.B..BBBBBBB..B.',
      '.B..B.....B..B.',
      '.BBBB.....BBBB.',
      '..BBBBBBBBBBB..',
      '..B...BEB...B..',
      '......BBB......',
    ],
  ];

  /* =========================================================
     三、单位配置
     ========================================================= */
  const ENEMY_TYPES = [
    { color: '#f87171', dark: '#3f1212', light: '#fecaca', speed: 1.35, hp: 1, score: 100, fireRate: 95 },
    { color: '#fbbf24', dark: '#3f2a06', light: '#fde68a', speed: 1.55, hp: 1, score: 200, fireRate: 85 },
    { color: '#c084fc', dark: '#2e1065', light: '#e9d5ff', speed: 1.75, hp: 1, score: 300, fireRate: 75 },
    { color: '#60a5fa', dark: '#172554', light: '#bfdbfe', speed: 1.5, hp: 2, score: 400, fireRate: 90 },
  ];

  const PLAYER_STYLE = { color: '#34d399', dark: '#052e1f', light: '#a7f3d0' };

  const POWERUP_STYLE = {
    shield: { color: '#67e8f9' },
    life: { color: '#f9a8d4' },
    freeze: { color: '#a5f3fc' },
    bomb: { color: '#fde68a' },
  };

  const SPARK_COLORS = ['#fff7ed', '#fde68a', '#fbbf24', '#f97316', '#ef4444'];

  /* =========================================================
     四、工具函数
     ========================================================= */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // 稳定伪随机（用于草丛纹理）
  function hashRand(c, r, i) {
    let n = (c * 374761393 + r * 668265263 + i * 2246822519) >>> 0;
    n = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  /* =========================================================
     五、DOM 与画布
     ========================================================= */
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const overlay = $('overlay');
  const scoreEl = $('score');
  const levelEl = $('level');
  const livesEl = $('lives');
  const enemiesEl = $('enemies');
  const muteBtn = $('muteBtn');
  const pauseBtn = $('pauseBtn');
  const fireBtn = $('fireBtn');

  const terrainLayer = document.createElement('canvas');
  terrainLayer.width = W;
  terrainLayer.height = H;
  const tctx = terrainLayer.getContext('2d');

  const grassLayer = document.createElement('canvas');
  grassLayer.width = W;
  grassLayer.height = H;
  const gctx = grassLayer.getContext('2d');

  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, 40, W * 0.5, H * 0.5, W * 0.78);
  bgGrad.addColorStop(0, '#0d1c22');
  bgGrad.addColorStop(0.55, '#070d13');
  bgGrad.addColorStop(1, '#04070b');

  /* =========================================================
     六、音效（WebAudio 合成）
     ========================================================= */
  const Sound = {
    ctx: null,
    muted: false,
    _noise: null,

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
          this.ctx = new AC();
        } catch (e) {
          return null;
        }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    toggle() {
      this.muted = !this.muted;
      try {
        localStorage.setItem('tank.muted', this.muted ? '1' : '0');
      } catch (e) { /* ignore */ }
      muteBtn.textContent = this.muted ? '🔇' : '🔊';
      muteBtn.classList.toggle('off', this.muted);
    },

    tone(freq, dur, type, vol, slideTo) {
      if (this.muted) return;
      const c = this.ensure();
      if (!c) return;
      const t0 = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    },

    noiseBuffer() {
      const c = this.ensure();
      if (!c) return null;
      if (this._noise) return this._noise;
      const len = Math.floor(c.sampleRate * 0.5);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noise = buf;
      return buf;
    },

    boom(power = 1) {
      if (this.muted) return;
      const c = this.ensure();
      const buf = this.noiseBuffer();
      if (!c || !buf) return;
      const t0 = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, t0);
      filter.frequency.exponentialRampToValueAtTime(90, t0 + 0.4);
      const g = c.createGain();
      g.gain.setValueAtTime(0.15 * Math.min(2, power), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      src.connect(filter);
      filter.connect(g);
      g.connect(c.destination);
      src.start(t0);
      src.stop(t0 + 0.5);
    },

    shoot(isPlayer) {
      this.tone(isPlayer ? 760 : 320, 0.09, 'square', isPlayer ? 0.035 : 0.02, isPlayer ? 240 : 150);
    },
    tink() { this.tone(1800, 0.05, 'triangle', 0.028, 900); },
    brick() { this.tone(210, 0.06, 'sawtooth', 0.03, 110); },
    freeze() { this.tone(1200, 0.35, 'sine', 0.04, 300); },
    pickup() {
      this.tone(660, 0.08, 'sine', 0.05, 880);
      setTimeout(() => this.tone(990, 0.1, 'sine', 0.05, 1320), 70);
    },
    gameOver() { this.tone(240, 1.1, 'sawtooth', 0.05, 55); },
    clear() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => this.tone(f, 0.18, 'triangle', 0.05), i * 120);
      });
    },
  };

  /* =========================================================
     七、游戏状态
     ========================================================= */
  const G = {
    state: 'menu', // menu | playing | paused | levelclear | gameover
    stage: 1,
    score: 0,
    high: 0,
    lives: 3,
    grid: Array.from({ length: ROWS }, () => new Array(COLS).fill(EMPTY)),
    base: { c: 7, r: 13 },
    baseAlive: true,
    tanks: [],
    bullets: [],
    particles: [],
    texts: [],
    powerups: [],
    player: null,
    toSpawn: 0,
    spawned: 0,
    spawnIndex: 0,
    spawnTimer: 0,
    respawnTimer: 0,
    freeze: 0,
    maxOnField: 4,
    overT: 0,
    overReason: '',
    shake: 0,
    flash: 0,
    frame: 0,
    banner: null,
  };

  /* =========================================================
     八、输入
     ========================================================= */
  const KEY_DIR = {
    ArrowUp: UP,
    KeyW: UP,
    ArrowRight: RIGHT,
    KeyD: RIGHT,
    ArrowDown: DOWN,
    KeyS: DOWN,
    ArrowLeft: LEFT,
    KeyA: LEFT,
  };

  const heldKeys = new Set();
  const touchDirs = new Set();
  const dirOrder = [];
  let touchFire = false;

  function pressDir(d) {
    if (!dirOrder.includes(d)) dirOrder.push(d);
  }

  function releaseDir(d) {
    let stillHeld = touchDirs.has(d);
    if (!stillHeld) {
      for (const code of heldKeys) {
        if (KEY_DIR[code] === d) {
          stillHeld = true;
          break;
        }
      }
    }
    if (!stillHeld) {
      const i = dirOrder.indexOf(d);
      if (i >= 0) dirOrder.splice(i, 1);
    }
  }

  function currentDir() {
    return dirOrder.length ? dirOrder[dirOrder.length - 1] : null;
  }

  function firing() {
    return touchFire || heldKeys.has('Space') || heldKeys.has('KeyJ');
  }

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'Space' || code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;

    heldKeys.add(code);
    const d = KEY_DIR[code];
    if (d !== undefined) pressDir(d);

    if (code === 'KeyP' || code === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (code === 'KeyM') {
      Sound.toggle();
      return;
    }
    if (code === 'Enter' || code === 'Space') {
      if (G.state === 'menu' || G.state === 'gameover') {
        startGame();
        return;
      }
      if (G.state === 'levelclear') {
        nextStage();
        return;
      }
    }
    if (code === 'Space' || code === 'KeyJ') Sound.ensure();
  });

  window.addEventListener('keyup', (e) => {
    heldKeys.delete(e.code);
    const d = KEY_DIR[e.code];
    if (d !== undefined) releaseDir(d);
  });

  window.addEventListener('blur', () => {
    heldKeys.clear();
    touchDirs.clear();
    dirOrder.length = 0;
    touchFire = false;
  });

  // 触屏方向键
  document.querySelectorAll('.dbtn').forEach((btn) => {
    const d = Number(btn.dataset.dir);
    const onDown = (e) => {
      e.preventDefault();
      Sound.ensure();
      btn.classList.add('active');
      touchDirs.add(d);
      pressDir(d);
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    const onUp = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      touchDirs.delete(d);
      releaseDir(d);
    };
    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
    btn.addEventListener('lostpointercapture', onUp);
  });

  // 触屏开火
  {
    const onDown = (e) => {
      e.preventDefault();
      Sound.ensure();
      touchFire = true;
      fireBtn.classList.add('active');
      try { fireBtn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    const onUp = (e) => {
      e.preventDefault();
      touchFire = false;
      fireBtn.classList.remove('active');
    };
    fireBtn.addEventListener('pointerdown', onDown);
    fireBtn.addEventListener('pointerup', onUp);
    fireBtn.addEventListener('pointercancel', onUp);
    fireBtn.addEventListener('lostpointercapture', onUp);
  }

  muteBtn.addEventListener('click', () => Sound.toggle());
  pauseBtn.addEventListener('click', () => togglePause());

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    Sound.ensure();
    const action = btn.dataset.action;
    if (action === 'start' || action === 'restart') startGame();
    else if (action === 'next') nextStage();
    else if (action === 'resume') togglePause();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') togglePause();
  });

  /* =========================================================
     九、地图与地形
     ========================================================= */
  function parseMap(rows) {
    const grid = [];
    let base = { c: 7, r: 13 };
    for (let r = 0; r < ROWS; r++) {
      grid[r] = new Array(COLS).fill(EMPTY);
      const line = rows[r] || '';
      for (let c = 0; c < COLS; c++) {
        const ch = line[c];
        if (ch === 'B') grid[r][c] = BRICK;
        else if (ch === 'S') grid[r][c] = STEEL;
        else if (ch === 'W') grid[r][c] = WATER;
        else if (ch === 'G') grid[r][c] = GRASS;
        else if (ch === 'E') {
          grid[r][c] = BASE;
          base = { c, r };
        }
      }
    }
    return { grid, base };
  }

  function buildTerrain() {
    tctx.clearRect(0, 0, W, H);
    gctx.clearRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) {
      const row = G.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        const v = row[c];
        if (!v) continue;
        const x = c * TILE;
        const y = r * TILE;
        if (v === BRICK) drawBrickTile(tctx, x, y, false);
        else if (v === BRICK2) drawBrickTile(tctx, x, y, true);
        else if (v === STEEL) drawSteelTile(tctx, x, y);
        else if (v === BASE) drawBaseTile(tctx, x, y);
        else if (v === GRASS) drawGrassTile(gctx, x, y);
      }
    }
    if (!G.baseAlive) drawBaseRubble(tctx, G.base.c * TILE, G.base.r * TILE);
  }

  function drawBrickTile(g, x, y, cracked) {
    g.save();
    g.beginPath();
    g.rect(x, y, TILE, TILE);
    g.clip();

    g.fillStyle = cracked ? '#241009' : '#2b140b';
    g.fillRect(x, y, TILE, TILE);

    for (let ry = 0; ry < 4; ry++) {
      const yy = y + ry * 8;
      const off = (ry % 2) * 8;
      for (let bx = -16 + off; bx < TILE; bx += 16) {
        const xx = x + bx + 1;
        g.fillStyle = cracked
          ? (ry % 2 ? '#5d2410' : '#6b2c13')
          : (ry % 2 ? '#9c4218' : '#b44b1b');
        g.fillRect(xx, yy + 1, 14, 6);
        g.fillStyle = cracked ? 'rgba(0,0,0,0.38)' : 'rgba(255,214,170,0.16)';
        g.fillRect(xx, yy + 1, 14, 1.5);
      }
    }

    if (cracked) {
      g.strokeStyle = 'rgba(8,4,2,0.85)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x + 8, y + 3);
      g.lineTo(x + 13, y + 13);
      g.lineTo(x + 9, y + 21);
      g.lineTo(x + 16, y + 30);
      g.moveTo(x + 13, y + 13);
      g.lineTo(x + 22, y + 16);
      g.moveTo(x + 21, y + 5);
      g.lineTo(x + 17, y + 12);
      g.moveTo(x + 25, y + 20);
      g.lineTo(x + 18, y + 24);
      g.stroke();
    }

    g.restore();
  }

  function drawSteelTile(g, x, y) {
    g.fillStyle = '#1b2534';
    g.fillRect(x, y, TILE, TILE);
    g.strokeStyle = '#334155';
    g.lineWidth = 1;
    g.strokeRect(x + 1.5, y + 1.5, 29, 29);

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const px = x + 3 + i * 14;
        const py = y + 3 + j * 14;
        g.fillStyle = '#3d4c63';
        g.fillRect(px, py, 12, 12);
        g.fillStyle = 'rgba(226,232,240,0.28)';
        g.fillRect(px, py, 12, 2);
        g.fillStyle = 'rgba(2,6,12,0.5)';
        g.fillRect(px, py + 10, 12, 2);
      }
    }

    g.fillStyle = 'rgba(203,213,225,0.45)';
    g.fillRect(x + 6, y + 6, 2, 2);
    g.fillRect(x + 24, y + 6, 2, 2);
    g.fillRect(x + 6, y + 24, 2, 2);
    g.fillRect(x + 24, y + 24, 2, 2);
  }

  function drawGrassTile(g, x, y) {
    const c = x / TILE;
    const r = y / TILE;
    g.fillStyle = '#0f3522';
    g.fillRect(x, y, TILE, TILE);

    g.save();
    g.beginPath();
    g.rect(x, y, TILE, TILE);
    g.clip();

    for (let i = 0; i < 18; i++) {
      const rx = x + hashRand(c, r, i * 3) * 30;
      const ry = y + hashRand(c, r, i * 3 + 1) * 30;
      const len = 3 + hashRand(c, r, i * 3 + 2) * 7;
      g.strokeStyle = i % 3 === 0 ? 'rgba(74,222,128,0.42)' : 'rgba(22,101,52,0.95)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(rx, ry);
      g.lineTo(rx + (hashRand(c, r, i + 50) - 0.5) * 5, ry - len);
      g.stroke();
    }

    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    g.restore();
  }

  function drawBaseTile(g, x, y) {
    g.fillStyle = '#161f2c';
    g.fillRect(x, y, TILE, TILE);
    g.strokeStyle = 'rgba(148,163,184,0.4)';
    g.strokeRect(x + 1.5, y + 1.5, 29, 29);

    g.save();
    g.translate(x, y);

    g.fillStyle = '#f6c453';
    const pts = [
      [16, 4], [19, 9], [26, 7], [23, 13], [28, 17], [21, 17],
      [18, 21], [16, 27], [14, 21], [11, 17], [4, 17], [9, 13], [6, 7], [13, 9],
    ];
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.fill();

    g.fillStyle = '#8a4b12';
    g.beginPath();
    g.arc(16, 10, 2.2, 0, TAU);
    g.fill();

    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(15, 15, 2, 6);

    g.restore();
  }

  function drawBaseRubble(g, x, y) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath();
    g.ellipse(x + 16, y + 20, 15, 10, 0, 0, TAU);
    g.fill();

    g.fillStyle = '#374151';
    const rocks = [
      [8, 22, 7], [15, 18, 6], [22, 24, 8], [12, 26, 4], [24, 17, 4], [6, 27, 3],
    ];
    for (const [rx, ry, rs] of rocks) {
      g.beginPath();
      g.moveTo(x + rx, y + ry - rs);
      g.lineTo(x + rx + rs, y + ry);
      g.lineTo(x + rx + rs * 0.5, y + ry + rs);
      g.lineTo(x + rx - rs * 0.6, y + ry + rs * 0.5);
      g.closePath();
      g.fill();
    }

    g.fillStyle = 'rgba(249,115,22,0.5)';
    g.fillRect(x + 10, y + 20, 2, 2);
    g.fillRect(x + 21, y + 19, 2, 2);
    g.fillRect(x + 16, y + 25, 2, 2);
    g.restore();
  }

  /* =========================================================
     十、流程控制
     ========================================================= */
  function startGame() {
    Sound.ensure();
    G.score = 0;
    G.lives = 3;
    G.stage = 1;
    startStage(1);
  }

  function startStage(n) {
    const parsed = parseMap(MAPS[(n - 1) % MAPS.length]);

    G.grid = parsed.grid;
    G.base = parsed.base;
    G.baseAlive = true;
    G.stage = n;
    G.state = 'playing';
    G.tanks = [];
    G.bullets = [];
    G.particles = [];
    G.texts = [];
    G.powerups = [];
    G.player = null;
    G.toSpawn = 8 + Math.min(12, (n - 1) * 2);
    G.spawned = 0;
    G.spawnIndex = 0;
    G.spawnTimer = 70;
    G.respawnTimer = 0;
    G.freeze = 0;
    G.maxOnField = Math.min(6, 3 + Math.ceil(n / 2));
    G.overT = 0;
    G.overReason = '';
    G.shake = 0;
    G.flash = 0;
    G.frame = 0;
    G.banner = { text: `第 ${n} 关`, sub: '守住基地 · 消灭所有敌军', t: 0, dur: 130 };

    buildTerrain();
    createPlayer();
    updateHud();

    overlay.classList.remove('show');
    overlay.innerHTML = '';
  }

  function nextStage() {
    overlay.classList.remove('show');
    overlay.innerHTML = '';
    startStage(G.stage + 1);
  }

  function togglePause() {
    if (G.state === 'playing') {
      G.state = 'paused';
      overlay.innerHTML = `
        <div class="panel">
          <div class="eyebrow">PAUSED</div>
          <h1 class="mid">暂停</h1>
          <div class="stats-line">关卡 <b>${G.stage}</b></div>
          <div class="stats-line">得分 <b>${G.score}</b></div>
          <button class="btn" data-action="resume" type="button">继续游戏</button>
          <button class="btn ghost" data-action="restart" type="button">重新开始</button>
        </div>`;
      overlay.classList.add('show');
    } else if (G.state === 'paused') {
      G.state = 'playing';
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    }
  }

  function showMenu() {
    G.state = 'menu';
    overlay.innerHTML = `
      <div class="panel">
        <div class="eyebrow">ARCADE · CLASSIC</div>
        <h1>坦克大战</h1>
        <div class="subtitle">TANK BATTLE</div>
        <div class="keys">
          <div><span>移动</span><b>WASD / 方向键</b></div>
          <div><span>开火</span><b>空格 / J</b></div>
          <div><span>暂停</span><b>P / Esc</b></div>
        </div>
        <button class="btn" data-action="start" type="button">开始游戏</button>
        <div class="high">最高分 <b>${G.high}</b></div>
      </div>`;
    overlay.classList.add('show');
    updateHud();
  }

  function levelClear() {
    if (G.state !== 'playing') return;
    G.state = 'levelclear';
    commitHigh();
    Sound.clear();

    const bonus = Math.max(0, G.lives) * 200;
    G.score += bonus;
    updateHud();

    overlay.innerHTML = `
      <div class="panel">
        <div class="eyebrow">STAGE ${G.stage} CLEAR</div>
        <h1 class="mid">关卡完成</h1>
        <div class="stats-line">存活奖励 <b>+${bonus}</b></div>
        <div class="stats-line">当前得分 <b>${G.score}</b></div>
        <button class="btn" data-action="next" type="button">进入第 ${G.stage + 1} 关</button>
      </div>`;
    overlay.classList.add('show');
  }

  function showGameOver(reason) {
    G.state = 'gameover';
    commitHigh();
    Sound.gameOver();

    overlay.innerHTML = `
      <div class="panel">
        <div class="eyebrow">GAME OVER</div>
        <h1 class="mid">战斗结束</h1>
        <div class="reason">${reason}</div>
        <div class="stats-line">本局得分 <b>${G.score}</b></div>
        <div class="stats-line">最高纪录 <b>${G.high}</b></div>
        <button class="btn" data-action="start" type="button">再来一局</button>
      </div>`;
    overlay.classList.add('show');
  }

  function beginEnd(reason, ticks) {
    if (G.overT > 0 || G.state !== 'playing') return;
    G.overT = ticks;
    G.overReason = reason;
  }

  function commitHigh() {
    if (G.score > G.high) {
      G.high = G.score;
      try {
        localStorage.setItem('tank.high', String(G.high));
      } catch (e) { /* ignore */ }
    }
  }

  function updateHud() {
    scoreEl.textContent = G.score;
    levelEl.textContent = G.stage;
    livesEl.textContent = Math.max(0, G.lives);
    let alive = 0;
    for (const t of G.tanks) if (!t.isPlayer && t.alive) alive++;
    enemiesEl.textContent = G.toSpawn + alive;
  }

  /* =========================================================
     十一、单位生成
     ========================================================= */
  function createPlayer() {
    const x = PLAYER_SPAWN.c * TILE + (TILE - TANK) / 2;
    const y = PLAYER_SPAWN.r * TILE + (TILE - TANK) / 2;
    const t = {
      isPlayer: true,
      type: -1,
      x,
      y,
      dir: UP,
      speed: 2.35,
      alive: true,
      hp: 1,
      maxHp: 1,
      color: PLAYER_STYLE.color,
      dark: PLAYER_STYLE.dark,
      light: PLAYER_STYLE.light,
      fireT: 0,
      aiT: 0,
      spawnT: 0,
      spawnMax: 0,
      shield: 150,
      dist: 0,
      flash: 0,
      bonus: false,
      stuck: 0,
    };
    G.tanks.push(t);
    G.player = t;
    return t;
  }

  function tryRespawn() {
    const x = PLAYER_SPAWN.c * TILE + (TILE - TANK) / 2;
    const y = PLAYER_SPAWN.r * TILE + (TILE - TANK) / 2;
    if (tankBlockedAt(x, y, null)) {
      G.respawnTimer = 25;
      return;
    }
    createPlayer();
    updateHud();
  }

  function isSpawnFree(c, r) {
    const x = c * TILE + (TILE - TANK) / 2;
    const y = r * TILE + (TILE - TANK) / 2;
    if (rectHitsMap(x, y, TANK, TANK)) return false;
    for (const t of G.tanks) {
      if (!t.alive) continue;
      if (x < t.x + TANK && x + TANK > t.x && y < t.y + TANK && y + TANK > t.y) return false;
    }
    return true;
  }

  function createEnemy(c, r) {
    const x = c * TILE + (TILE - TANK) / 2;
    const y = r * TILE + (TILE - TANK) / 2;

    const pool = [0];
    if (G.stage >= 2) pool.push(1, 1);
    if (G.stage >= 3) pool.push(2);
    if (G.stage >= 4) pool.push(3);
    if (G.stage >= 6) pool.push(3);

    const type = pick(pool);
    const cfg = ENEMY_TYPES[type];
    const bonus = G.spawned % 4 === 2;
    G.spawned++;

    G.tanks.push({
      isPlayer: false,
      type,
      x,
      y,
      dir: DOWN,
      speed: cfg.speed + Math.min(0.45, (G.stage - 1) * 0.035),
      alive: true,
      hp: cfg.hp,
      maxHp: cfg.hp,
      color: cfg.color,
      dark: cfg.dark,
      light: cfg.light,
      fireT: 40 + Math.random() * 60,
      aiT: 20 + Math.random() * 50,
      spawnT: 70,
      spawnMax: 70,
      shield: 0,
      dist: 0,
      flash: 0,
      bonus,
      stuck: 0,
      score: cfg.score,
    });
  }

  function updateSpawns() {
    if (G.overT > 0 || G.toSpawn <= 0) return;

    let aliveEnemies = 0;
    for (const t of G.tanks) if (!t.isPlayer && t.alive) aliveEnemies++;
    if (aliveEnemies >= G.maxOnField) return;

    if (G.spawnTimer > 0) {
      G.spawnTimer--;
      return;
    }

    let col = null;
    for (let k = 0; k < SPAWN_COLS.length; k++) {
      const c = SPAWN_COLS[(G.spawnIndex + k) % SPAWN_COLS.length];
      if (isSpawnFree(c, 0)) {
        col = c;
        G.spawnIndex = (G.spawnIndex + k + 1) % SPAWN_COLS.length;
        break;
      }
    }
    if (col === null) {
      G.spawnTimer = 25;
      return;
    }

    createEnemy(col, 0);
    G.toSpawn--;
    G.spawnTimer = Math.max(35, 90 - G.stage * 5);
    updateHud();
  }

  /* =========================================================
     十二、移动与碰撞
     ========================================================= */
  function rectHitsMap(x, y, w, h) {
    if (x < 0 || y < 0 || x + w > W || y + h > H) return true;
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) {
      const row = G.grid[r];
      if (!row) continue;
      for (let c = c0; c <= c1; c++) {
        const v = row[c];
        if (v === BRICK || v === BRICK2 || v === STEEL || v === WATER || v === BASE) return true;
      }
    }
    return false;
  }

  function tankBlockedAt(x, y, self) {
    if (rectHitsMap(x, y, TANK, TANK)) return true;
    for (const o of G.tanks) {
      if (o === self || !o.alive) continue;
      if (x < o.x + TANK && x + TANK > o.x && y < o.y + TANK && y + TANK > o.y) return true;
    }
    return false;
  }

  function snapPos(v) {
    return TILE / 2 + Math.round((v + HALF - TILE / 2) / TILE) * TILE - HALF;
  }

  function turn(t, d) {
    if (t.dir === d) return;
    if (d === UP || d === DOWN) {
      const nx = snapPos(t.x);
      if (nx !== t.x && !rectHitsMap(nx, t.y, TANK, TANK)) t.x = nx;
    } else {
      const ny = snapPos(t.y);
      if (ny !== t.y && !rectHitsMap(t.x, ny, TANK, TANK)) t.y = ny;
    }
    t.dir = d;
  }

  function step(t) {
    const nx = t.x + DX[t.dir] * t.speed;
    const ny = t.y + DY[t.dir] * t.speed;
    if (!tankBlockedAt(nx, ny, t)) {
      t.x = nx;
      t.y = ny;
      t.dist += t.speed;
      return true;
    }
    return false;
  }

  function canGo(t, d) {
    let x = t.x;
    let y = t.y;
    if (d === UP || d === DOWN) x = snapPos(t.x);
    else y = snapPos(t.y);
    return !tankBlockedAt(x + DX[d] * 4, y + DY[d] * 4, t);
  }

  function pickEnemyDir(t) {
    const p = G.player;
    const aimPlayer = p && p.alive && Math.random() < 0.6;
    const target = aimPlayer
      ? { x: p.x + HALF, y: p.y + HALF }
      : { x: G.base.c * TILE + TILE / 2, y: G.base.r * TILE + TILE / 2 };

    const opts = [];
    for (let d = 0; d < 4; d++) {
      if (d === (t.dir + 2) % 4) continue;
      if (canGo(t, d)) opts.push(d);
    }

    if (opts.length === 0) {
      turn(t, (t.dir + 2) % 4);
      return;
    }

    let chosen;
    if (Math.random() < 0.55) {
      const dx = target.x - (t.x + HALF);
      const dy = target.y - (t.y + HALF);
      const pref = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : (dy > 0 ? DOWN : UP);
      chosen = opts.includes(pref) ? pref : pick(opts);
    } else {
      chosen = pick(opts);
    }
    turn(t, chosen);
  }

  /* =========================================================
     十三、子弹与攻击
     ========================================================= */
  function fire(t) {
    const mine = G.bullets.filter((b) => b.alive && b.owner === t).length;
    if (mine >= (t.isPlayer ? 2 : 1)) return false;

    const cx = t.x + HALF;
    const cy = t.y + HALF;
    const bx = cx + DX[t.dir] * (HALF + 5) - BULLET / 2;
    const by = cy + DY[t.dir] * (HALF + 5) - BULLET / 2;
    const speed = t.isPlayer ? 7.4 : 4.9 + Math.min(1.5, G.stage * 0.12);

    G.bullets.push({
      x: bx,
      y: by,
      dir: t.dir,
      owner: t,
      player: !!t.isPlayer,
      speed,
      alive: true,
    });

    for (let i = 0; i < 4; i++) {
      const l = 8 + Math.random() * 6;
      G.particles.push({
        x: cx + DX[t.dir] * 16,
        y: cy + DY[t.dir] * 16,
        vx: (Math.random() - 0.5) * 2 + DX[t.dir] * 0.6,
        vy: (Math.random() - 0.5) * 2 + DY[t.dir] * 0.6,
        life: l,
        maxLife: l,
        size: 1.6 + Math.random(),
        color: t.isPlayer ? '#a7f3d0' : '#fecaca',
        add: true,
      });
    }

    Sound.shoot(t.isPlayer);
    return true;
  }

  function updateBullets() {
    for (const b of G.bullets) {
      if (!b.alive) continue;
      const steps = Math.max(1, Math.ceil(b.speed / 2.5));
      for (let i = 0; i < steps && b.alive; i++) {
        b.x += (DX[b.dir] * b.speed) / steps;
        b.y += (DY[b.dir] * b.speed) / steps;
        bulletHitTest(b);
      }
    }

    // 玩家子弹与敌方子弹相撞
    for (const a of G.bullets) {
      if (!a.alive || !a.player) continue;
      for (const c of G.bullets) {
        if (!c.alive || c.player) continue;
        if (Math.abs(a.x - c.x) < 9 && Math.abs(a.y - c.y) < 9) {
          a.alive = false;
          c.alive = false;
          spark((a.x + c.x) / 2 + 3, (a.y + c.y) / 2 + 3, '#fde68a', 5);
          break;
        }
      }
    }

    G.bullets = G.bullets.filter((b) => b.alive);
  }

  function bulletHitTest(b) {
    if (b.x < 0 || b.y < 0 || b.x + BULLET > W || b.y + BULLET > H) {
      b.alive = false;
      spark(clamp(b.x + 3, 2, W - 2), clamp(b.y + 3, 2, H - 2), b.player ? '#a5f3fc' : '#fecaca', 3);
      return;
    }

    const c0 = Math.floor(b.x / TILE);
    const c1 = Math.floor((b.x + BULLET - 0.001) / TILE);
    const r0 = Math.floor(b.y / TILE);
    const r1 = Math.floor((b.y + BULLET - 0.001) / TILE);

    for (let r = r0; r <= r1; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || c >= COLS) continue;
        const v = G.grid[r][c];
        if (v === BRICK || v === BRICK2) {
          b.alive = false;
          damageBrick(c, r);
          spark(b.x + 3, b.y + 3, '#fdba74', 5);
          return;
        }
        if (v === STEEL) {
          b.alive = false;
          spark(b.x + 3, b.y + 3, '#e2e8f0', 4);
          Sound.tink();
          return;
        }
        if (v === BASE) {
          b.alive = false;
          if (!b.player) destroyBase();
          else spark(b.x + 3, b.y + 3, '#fde68a', 4);
          return;
        }
      }
    }

    for (const t of G.tanks) {
      if (!t.alive || t.isPlayer === b.player) continue;
      if (t.spawnT > 0) continue;
      if (b.x < t.x + TANK && b.x + BULLET > t.x && b.y < t.y + TANK && b.y + BULLET > t.y) {
        b.alive = false;
        if (t.isPlayer && t.shield > 0) {
          spark(b.x + 3, b.y + 3, '#67e8f9', 4);
          Sound.tink();
          return;
        }
        hitTank(t);
        return;
      }
    }
  }

  function damageBrick(c, r) {
    const v = G.grid[r][c];
    if (v === BRICK) G.grid[r][c] = BRICK2;
    else if (v === BRICK2) G.grid[r][c] = EMPTY;
    buildTerrain();
    Sound.brick();
  }

  function hitTank(t) {
    if (t.isPlayer) {
      killPlayer();
      return;
    }
    t.hp--;
    if (t.hp > 0) {
      t.flash = 10;
      spark(t.x + HALF, t.y + HALF, '#fca5a5', 5);
      Sound.tink();
    } else {
      killEnemy(t);
    }
  }

  function killEnemy(t) {
    if (!t.alive) return;
    t.alive = false;
    explode(t.x + HALF, t.y + HALF, 1.4);
    Sound.boom(1.2);

    const pts = t.score * (t.bonus ? 2 : 1);
    G.score += pts;
    addText(t.x + HALF, t.y + HALF - 6, `+${pts}`, t.bonus ? '#fde68a' : '#a7f3d0');

    if (t.bonus && G.baseAlive) dropPowerup(t.x + HALF, t.y + HALF);
    updateHud();
  }

  function killPlayer() {
    const p = G.player;
    if (!p || !p.alive || p.shield > 0 || G.overT > 0) return;

    p.alive = false;
    G.player = null;
    explode(p.x + HALF, p.y + HALF, 2.2);
    Sound.boom(2);

    G.lives--;
    updateHud();

    if (G.lives <= 0) {
      beginEnd('全部坦克已被摧毁', 90);
    } else {
      G.respawnTimer = 80;
    }
  }

  function destroyBase() {
    if (!G.baseAlive) return;
    G.baseAlive = false;
    G.grid[G.base.r][G.base.c] = EMPTY;
    buildTerrain();

    const bx = G.base.c * TILE + TILE / 2;
    const by = G.base.r * TILE + TILE / 2;
    explode(bx, by, 3);
    G.flash = 10;
    G.shake = 16;

    beginEnd('基地被摧毁', 100);
  }

  /* =========================================================
     十四、道具
     ========================================================= */
  function dropPowerup(cx, cy) {
    const roll = Math.random();
    let type = 'shield';
    if (roll < 0.28) type = 'shield';
    else if (roll < 0.52) type = 'freeze';
    else if (roll < 0.76) type = 'bomb';
    else type = 'life';

    const size = 24;
    G.powerups.push({
      x: clamp(cx - size / 2, 10, W - size - 10),
      y: clamp(cy - size / 2, 10, H - size - 10),
      size,
      type,
      life: 720,
      t: 0,
      dead: false,
    });
  }

  function updatePowerups() {
    const p = G.player;
    for (const pu of G.powerups) {
      pu.t++;
      pu.life--;
      if (pu.life <= 0) {
        pu.dead = true;
        continue;
      }
      if (
        p && p.alive && G.overT <= 0 &&
        p.x < pu.x + pu.size && p.x + TANK > pu.x &&
        p.y < pu.y + pu.size && p.y + TANK > pu.y
      ) {
        pu.dead = true;
        applyPowerup(pu.type);
      }
    }
    G.powerups = G.powerups.filter((x) => !x.dead);
  }

  function applyPowerup(type) {
    const p = G.player;
    const cx = p ? p.x + HALF : W / 2;
    const cy = p ? p.y + HALF : H / 2;

    if (type === 'shield') {
      if (p) p.shield = Math.max(p.shield, 600);
      addText(cx, cy - 18, '护盾启动', '#67e8f9');
    } else if (type === 'life') {
      G.lives = Math.min(9, G.lives + 1);
      addText(cx, cy - 18, '生命 +1', '#f9a8d4');
    } else if (type === 'freeze') {
      G.freeze = 360;
      addText(cx, cy - 18, '敌军冻结', '#a5f3fc');
      Sound.freeze();
    } else if (type === 'bomb') {
      addText(cx, cy - 18, '全屏轰炸', '#fde68a');
      const targets = G.tanks.filter((t) => !t.isPlayer && t.alive);
      for (const t of targets) killEnemy(t);
    }

    Sound.pickup();
    G.shake = Math.min(16, G.shake + 3);
    updateHud();
  }

  /* =========================================================
     十五、粒子与飘字
     ========================================================= */
  function addParticle(p) {
    if (G.particles.length < 600) G.particles.push(p);
  }

  function explode(x, y, power = 1) {
    const n = Math.floor(14 * power) + 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = (0.6 + Math.random() * 3.4) * Math.min(1.6, power);
      const life = 14 + Math.random() * 26;
      addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 3,
        color: pick(SPARK_COLORS),
        add: true,
      });
    }

    for (let i = 0; i < Math.floor(5 * power); i++) {
      const a = Math.random() * TAU;
      const s = (0.2 + Math.random() * 1.2) * power;
      const life = 30 + Math.random() * 30;
      addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.3,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        color: 'rgba(30,41,59,0.9)',
        add: false,
      });
    }

    addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      ring: true,
      maxR: 26 * power,
      color: '#fde68a',
      add: true,
    });

    G.shake = Math.min(16, G.shake + 4 * power);
  }

  function spark(x, y, color, count = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = 0.4 + Math.random() * 2;
      const life = 8 + Math.random() * 12;
      addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        size: 1.2 + Math.random() * 1.8,
        color,
        add: true,
      });
    }
  }

  function updateParticles() {
    const arr = G.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life--;
      if (p.life <= 0) {
        arr.splice(i, 1);
        continue;
      }
      if (p.ring) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (!p.add) p.vy -= 0.02;
    }
  }

  function addText(x, y, text, color) {
    G.texts.push({ x, y, text, color, life: 55, maxLife: 55 });
  }

  function updateTexts() {
    for (let i = G.texts.length - 1; i >= 0; i--) {
      const t = G.texts[i];
      t.life--;
      t.y -= 0.55;
      if (t.life <= 0) G.texts.splice(i, 1);
    }
  }

  /* =========================================================
     十六、主更新
     ========================================================= */
  function updatePlayer() {
    if (G.respawnTimer > 0) {
      G.respawnTimer--;
      if (G.respawnTimer === 0) tryRespawn();
      return;
    }

    const p = G.player;
    if (!p || !p.alive) return;

    if (p.fireT > 0) p.fireT--;
    if (p.shield > 0) p.shield--;
    if (p.flash > 0) p.flash--;
    if (G.overT > 0) return;

    const d = currentDir();
    if (d !== null) {
      turn(p, d);
      step(p);
    }
    if (firing() && p.fireT <= 0) {
      if (fire(p)) p.fireT = 15;
    }
  }

  function shouldEnemyFire(t) {
    const p = G.player;
    const targets = [];
    if (p && p.alive) targets.push({ x: p.x + HALF, y: p.y + HALF });
    targets.push({ x: G.base.c * TILE + TILE / 2, y: G.base.r * TILE + TILE / 2 });

    for (const tg of targets) {
      const dx = tg.x - (t.x + HALF);
      const dy = tg.y - (t.y + HALF);
      if (Math.abs(dx) < 14 && ((dy > 0 && t.dir === DOWN) || (dy < 0 && t.dir === UP))) return true;
      if (Math.abs(dy) < 14 && ((dx > 0 && t.dir === RIGHT) || (dx < 0 && t.dir === LEFT))) return true;
    }
    return Math.random() < 0.12;
  }

  function updateEnemies() {
    for (const t of G.tanks) {
      if (t.isPlayer || !t.alive) continue;

      if (t.spawnT > 0) {
        t.spawnT--;
        continue;
      }
      if (t.flash > 0) t.flash--;
      if (G.freeze > 0) continue;

      t.aiT--;
      t.fireT--;

      const moved = step(t);
      if (moved) t.stuck = 0;
      else t.stuck++;

      if (t.aiT <= 0 || t.stuck > 10) {
        pickEnemyDir(t);
        t.aiT = 50 + Math.random() * 80;
        t.stuck = 0;
      }

      if (t.fireT <= 0) {
        if (shouldEnemyFire(t) && fire(t)) {
          t.fireT = Math.max(18, ENEMY_TYPES[t.type].fireRate - Math.min(35, G.stage * 4)) + Math.random() * 30;
        } else {
          t.fireT = 12 + Math.random() * 18;
        }
      }
    }
  }

  function checkLevelClear() {
    if (G.state !== 'playing' || G.overT > 0) return;
    if (G.toSpawn > 0) return;
    for (const t of G.tanks) {
      if (!t.isPlayer && t.alive) return;
    }
    levelClear();
  }

  function update() {
    G.frame++;
    updateParticles();
    updateTexts();
    if (G.banner) {
      G.banner.t++;
      if (G.banner.t > G.banner.dur) G.banner = null;
    }
    if (G.shake > 0.3) G.shake *= 0.9;
    else G.shake = 0;
    if (G.flash > 0) G.flash--;

    if (G.state !== 'playing') return;

    if (G.overT > 0) {
      G.overT--;
      if (G.overT === 0) {
        showGameOver(G.overReason);
        return;
      }
    }

    if (G.freeze > 0) G.freeze--;
    updatePlayer();
    updateEnemies();
    updateSpawns();
    updatePowerups();
    updateBullets();
    G.tanks = G.tanks.filter((t) => t.alive);

    if (G.overT === 0) checkLevelClear();
    if (G.frame % 12 === 0) updateHud();
  }

  /* =========================================================
     十七、渲染
     ========================================================= */
  function drawBackground() {
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(45,212,191,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      const x = i * TILE + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let j = 1; j < ROWS; j++) {
      const y = j * TILE + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  function drawWater() {
    const f = G.frame;
    for (let r = 0; r < ROWS; r++) {
      const row = G.grid[r];
      if (!row) continue;
      for (let c = 0; c < COLS; c++) {
        if (row[c] !== WATER) continue;
        const x = c * TILE;
        const y = r * TILE;

        ctx.fillStyle = '#082a47';
        ctx.fillRect(x, y, TILE, TILE);

        ctx.strokeStyle = 'rgba(56,189,248,0.3)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const yy0 = y + 8 + i * 8;
          for (let xx = 0; xx <= TILE; xx += 4) {
            const yy = yy0 + Math.sin((xx + f * 1.5 + i * 12) * 0.18) * 1.8;
            if (xx === 0) ctx.moveTo(x + xx, yy);
            else ctx.lineTo(x + xx, yy);
          }
          ctx.stroke();
        }

        if ((c + r + Math.floor(f / 30)) % 5 === 0) {
          const sx = x + 6 + (Math.sin(f * 0.05 + c) * 0.5 + 0.5) * 20;
          const sy = y + 10 + (Math.cos(f * 0.04 + r) * 0.5 + 0.5) * 14;
          ctx.fillStyle = 'rgba(186,230,253,0.55)';
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }
  }

  function drawTank(t) {
    const cx = t.x + HALF;
    const cy = t.y + HALF;

    if (t.spawnT > 0) {
      drawSpawnStar(t, cx, cy);
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t.dir * Math.PI / 2);
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 8;

    // 履带
    ctx.fillStyle = t.dark;
    rr(ctx, -13, -13, 7, 26, 2.5);
    ctx.fill();
    rr(ctx, 6, -13, 7, 26, 2.5);
    ctx.fill();

    // 履带纹路（随移动滚动）
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    const off = ((t.dist % 6) + 6) % 6;
    for (let ty = -11 + off; ty < 12; ty += 6) {
      ctx.fillRect(-12.5, ty, 6, 2);
      ctx.fillRect(6.5, ty, 6, 2);
    }

    // 车体
    ctx.shadowBlur = 10;
    ctx.fillStyle = t.color;
    rr(ctx, -8.5, -11, 17, 22, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 车体高光
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, -6.5, -9, 13, 6, 2);
    ctx.fill();

    if (t.isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(-7, 5, 14, 2);
    }

    // 炮管
    ctx.fillStyle = t.light;
    ctx.fillRect(-2.5, -19, 5, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-2.5, -19, 1.5, 12);

    // 炮塔
    ctx.fillStyle = t.light;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(0, 0, 4.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, 1.4, 0, TAU);
    ctx.fill();

    ctx.restore();

    // 奖励坦克的闪烁光环
    if (t.bonus) {
      const pulse = 0.35 + 0.35 * Math.sin(G.frame * 0.18);
      ctx.strokeStyle = `rgba(255,255,255,${pulse.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, HALF + 4, 0, TAU);
      ctx.stroke();
    }

    // 受击闪白
    if (t.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${(t.flash / 12).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, HALF, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 护盾
    if (t.shield > 0) {
      const a = 0.35 + 0.3 * Math.sin(G.frame * 0.2);
      ctx.save();
      ctx.strokeStyle = `rgba(103,232,249,${a.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, HALF + 5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(103,232,249,${(a * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, HALF + 8, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSpawnStar(t, cx, cy) {
    const k = t.spawnT / (t.spawnMax || 70);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((1 - k) * Math.PI * 4);
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(254,240,138,${(0.45 + 0.5 * k).toFixed(3)})`;
    ctx.lineWidth = 2;

    const r = 7 + 15 * (1 - k) * (0.7 + 0.3 * Math.sin(G.frame * 0.3));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawBullets() {
    for (const b of G.bullets) {
      if (!b.alive) continue;
      const cx = b.x + BULLET / 2;
      const cy = b.y + BULLET / 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = b.player ? '#67e8f9' : '#fca5a5';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = b.player ? 'rgba(103,232,249,0.45)' : 'rgba(252,165,165,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - DX[b.dir] * 9, cy - DY[b.dir] * 9);
      ctx.stroke();
      ctx.fillStyle = b.player ? '#ecfeff' : '#fee2e2';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of G.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.add ? a : a * 0.7;

      if (p.ring) {
        const k = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = (1 - k) * 0.75;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.maxR * k + 2, 0, TAU);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }

      if (p.add) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  function drawPowerups() {
    for (const pu of G.powerups) {
      const cfg = POWERUP_STYLE[pu.type];
      const bob = Math.sin(pu.t * 0.12) * 2;
      const x = pu.x;
      const y = pu.y + bob;
      const blink = pu.life < 150 && Math.floor(pu.life / 6) % 2 === 0;

      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 1;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(6,14,20,0.9)';
      rr(ctx, x, y, pu.size, pu.size, 5);
      ctx.fill();
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      rr(ctx, x, y, pu.size, pu.size, 5);
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawPowerupIcon(ctx, pu.type, x + pu.size / 2, y + pu.size / 2);
      ctx.restore();
    }
  }

  function drawPowerupIcon(g, type, cx, cy) {
    const color = POWERUP_STYLE[type].color;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 2;
    g.lineCap = 'round';

    if (type === 'shield') {
      g.beginPath();
      g.moveTo(cx, cy - 8);
      g.lineTo(cx + 7, cy - 4.5);
      g.lineTo(cx + 6, cy + 2);
      g.quadraticCurveTo(cx, cy + 9, cx - 6, cy + 2);
      g.lineTo(cx - 7, cy - 4.5);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(cx, cy - 4);
      g.lineTo(cx, cy + 4);
      g.stroke();
    } else if (type === 'life') {
      g.beginPath();
      g.moveTo(cx, cy + 7);
      g.bezierCurveTo(cx - 11, cy - 1, cx - 6, cy - 10, cx, cy - 3.5);
      g.bezierCurveTo(cx + 6, cy - 10, cx + 11, cy - 1, cx, cy + 7);
      g.closePath();
      g.fill();
    } else if (type === 'freeze') {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        g.beginPath();
        g.moveTo(cx - Math.cos(a) * 8, cy - Math.sin(a) * 8);
        g.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
        g.stroke();
      }
    } else {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? 8 : 3;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    }
  }

  function drawTexts() {
    if (!G.texts.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
    for (const t of G.texts) {
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.6);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function drawBanner() {
    const b = G.banner;
    if (!b) return;

    const k = b.t / b.dur;
    let alpha = 1;
    if (k < 0.14) alpha = k / 0.14;
    else if (k > 0.8) alpha = (1 - k) / 0.2;
    alpha = clamp(alpha, 0, 1);

    const y = H * 0.38;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(4,10,14,0.74)';
    ctx.fillRect(0, y - 34, W, 78);
    ctx.strokeStyle = 'rgba(45,212,191,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y - 34.5);
    ctx.lineTo(W, y - 34.5);
    ctx.moveTo(0, y + 43.5);
    ctx.lineTo(W, y + 43.5);
    ctx.stroke();

    ctx.fillStyle = '#eafff8';
    ctx.font = 'bold 30px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.shadowColor = '#2dd4bf';
    ctx.shadowBlur = 16;
    ctx.fillText(b.text, W / 2, y + 4);
    ctx.shadowBlur = 0;

    if (b.sub) {
      ctx.fillStyle = 'rgba(207,230,224,0.72)';
      ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText(b.sub, W / 2, y + 28);
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (G.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }

    drawBackground();
    drawWater();
    ctx.drawImage(terrainLayer, 0, 0);

    for (const t of G.tanks) drawTank(t);

    drawBullets();
    ctx.drawImage(grassLayer, 0, 0);
    drawPowerups();
    drawParticles();
    drawTexts();
    drawBanner();

    ctx.restore();

    if (G.flash > 0) {
      ctx.fillStyle = `rgba(255,240,210,${(G.flash / 40).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* =========================================================
     十八、主循环与启动
     ========================================================= */
  let last = performance.now();
  let acc = 0;
  const STEP = 1000 / 60;

  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    acc += dt;

    let guard = 0;
    while (acc >= STEP && guard < 5) {
      update();
      acc -= STEP;
      guard++;
    }
    if (guard >= 5) acc = 0;

    render();
    requestAnimationFrame(frame);
  }

  function boot() {
    try {
      G.high = Number(localStorage.getItem('tank.high')) || 0;
    } catch (e) {
      G.high = 0;
    }
    try {
      Sound.muted = localStorage.getItem('tank.muted') === '1';
    } catch (e) {
      Sound.muted = false;
    }
    muteBtn.textContent = Sound.muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('off', Sound.muted);

    updateHud();
    showMenu();

    // 调试句柄（便于自动化测试查看状态）
    window.__TANK__ = G;

    // 方便调试/演示：?autostart 直接开局，?stage=N 指定关卡
    try {
      const params = new URLSearchParams(location.search);
      if (params.has('autostart')) {
        const n = Math.max(1, Number(params.get('stage')) || 1);
        startGame();
        if (n > 1) startStage(n);
      }
    } catch (e) { /* ignore */ }

    requestAnimationFrame(frame);
  }

  boot();
})();
