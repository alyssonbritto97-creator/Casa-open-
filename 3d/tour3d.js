/* VISTA 360 · Tour 3D do apartamento (three.js, sem outras bibliotecas)
   Passeio em primeira pessoa, vista de cima, 3 estilos de decoracao e luz de dia, fim de tarde e noite. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

const TOUCH = matchMedia('(pointer:coarse)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 600;
const EYE = 1.6, H = 2.7, T = 0.12;   // altura do olho, pe-direito, espessura da parede
let R = null;

export function open(u, opts) { if (!R) R = init(); R.show(u, opts || {}); }
export function close() { if (R) R.hide(); }

/* ================================================================ texturas procedurais */
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tex(c, rx, ry, srgb = true) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)`; }
function woodTex(base, seed) {      // tacos de madeira: base = [h,s,l]
  const N = 1024, [c, g] = cnv(N, N), r = rnd(seed); const rows = 8, pw = N / rows;
  for (let i = 0; i < rows; i++) {
    let y = 0; const off = r() * N;
    while (y < N) {
      const len = N * (0.45 + r() * 0.6), l = base[2] + (r() - .5) * 9, s = base[1] + (r() - .5) * 8;
      g.fillStyle = hsl(base[0] + (r() - .5) * 6, s, l); g.fillRect(i * pw, (y + off) % N, pw, len);
      if ((y + off) % N + len > N) g.fillRect(i * pw, 0, pw, (y + off) % N + len - N);
      for (let k = 0; k < 26; k++) {          // veios
        g.strokeStyle = `rgba(${r() < .5 ? '0,0,0' : '255,240,220'},${0.03 + r() * 0.05})`; g.lineWidth = 0.6 + r() * 1.6;
        const x0 = i * pw + r() * pw; g.beginPath(); g.moveTo(x0, (y + off) % N);
        for (let q = 0; q <= 8; q++) g.lineTo(x0 + Math.sin(q * 0.9 + k) * (2 + r() * 3), (y + off) % N + len * q / 8);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(i * pw, (y + off + len) % N - 1, pw, 2);
      y += len;
    }
    g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(i * pw, 0, 1.5, N);
  }
  return c;
}
function tileTex(base, seed, n = 2, grout = 'rgba(0,0,0,.35)') {
  const N = 1024, [c, g] = cnv(N, N), r = rnd(seed), s = N / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = hsl(base[0], base[1], base[2] + (r() - .5) * 3); g.fillRect(i * s, j * s, s, s);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * 0.035})`; const z = 2 + r() * 14; g.fillRect(i * s + r() * s, j * s + r() * s, z, z); }
  }
  g.fillStyle = grout; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1.5, 0, 3, N); g.fillRect(0, i * s - 1.5, N, 3); }
  return c;
}
function marbleTex(bg, vein, seed) {
  const N = 1024, [c, g] = cnv(N, N), r = rnd(seed); g.fillStyle = bg; g.fillRect(0, 0, N, N);
  for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(128,128,128,${r() * 0.03})`; g.fillRect(r() * N, r() * N, 3 + r() * 20, 3 + r() * 20); }
  for (let v = 0; v < 14; v++) {
    let x = r() * N, y = -20, a = 0.4 + r() * 0.8; const w = 0.6 + r() * 2.4;
    g.strokeStyle = vein; g.globalAlpha = 0.12 + r() * 0.3; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    while (y < N + 20) { a += (r() - .5) * 0.5; x += Math.cos(a) * 14; y += 10 + r() * 8; g.lineTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1; return c;
}
function fabricTex(col, seed) {
  const N = 256, [c, g] = cnv(N, N), r = rnd(seed); g.fillStyle = col; g.fillRect(0, 0, N, N);
  for (let y = 0; y < N; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(0, y, N, 1); }
  for (let x = 0; x < N; x += 2) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(x, 0, 1, N); }
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
  return c;
}
function plasterTex(seed) {
  const N = 512, [c, g] = cnv(N, N), r = rnd(seed); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
  for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.02})`; const z = 2 + r() * 10; g.fillRect(r() * N, r() * N, z, z); }
  return c;
}
function rugTex(a, b, seed) {
  const N = 512, [c, g] = cnv(N, N), r = rnd(seed); g.fillStyle = a; g.fillRect(0, 0, N, N);
  g.strokeStyle = b; g.lineWidth = 10; g.strokeRect(26, 26, N - 52, N - 52); g.lineWidth = 3; g.strokeRect(48, 48, N - 96, N - 96);
  for (let k = 0; k < 7000; k++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * N, r() * N, 2, 2); }
  return c;
}
function grassTex() {
  const N = 256, [c, g] = cnv(N, N), r = rnd(9); g.fillStyle = '#5f7a3c'; g.fillRect(0, 0, N, N);
  for (let k = 0; k < 6000; k++) { g.fillStyle = hsl(80 + r() * 30, 30 + r() * 20, 22 + r() * 18); g.fillRect(r() * N, r() * N, 1 + r() * 3, 1 + r() * 3); }
  return c;
}
function shadowTex() {
  const N = 128, [c, g] = cnv(N, N), gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N); const t = new THREE.CanvasTexture(c); return t;
}

/* ================================================================ estilos de decoracao */
const STYLES = {
  claro: {
    nome: 'Moderno claro', floor: () => woodTex([34, 38, 70], 11), floorRep: 0.5, wall: '#efebe4', accent: '#e4dccf',
    cab: '#f1eee8', cabRough: .35, wood: () => woodTex([33, 40, 62], 21), counter: () => marbleTex('#f3f1ed', '#8d8a86', 31),
    sofa: '#cfc8bd', bed: '#e9e4dc', throw: '#9fb3a6', rug: ['#e8e1d4', '#c9bba3'], metal: '#c9c4bb', chair: '#d9cfbf', tile: [30, 8, 84]
  },
  madeira: {
    nome: 'Madeira aconchegante', floor: () => woodTex([24, 45, 38], 12), floorRep: 0.5, wall: '#ebe2d4', accent: null,
    cab: null, cabRough: .5, wood: () => woodTex([22, 46, 34], 22), counter: () => marbleTex('#e7dccb', '#a08766', 32),
    sofa: '#a5683f', bed: '#efe6d6', throw: '#6f7d55', rug: ['#d8c6a6', '#8d6b45'], metal: '#a88a5a', chair: '#7a5233', tile: [32, 22, 70]
  },
  escuro: {
    nome: 'Escuro premium', floor: () => tileTex([30, 4, 24], 13, 2, 'rgba(0,0,0,.45)'), floorRep: 0.42, wall: '#d7d3cc', accent: '#2c2f33',
    cab: '#1e2023', cabRough: .55, wood: () => woodTex([20, 30, 22], 23), counter: () => marbleTex('#1d1e20', '#9a9690', 33),
    sofa: '#45474b', bed: '#d9d5ce', throw: '#b08a4f', rug: ['#5a5753', '#b09468'], metal: '#b8955a', chair: '#2b2c2f', tile: [30, 4, 30]
  }
};

/* ================================================================ plantas (metros) */
/* x: largura (0..W), z: profundidade a partir da fachada (z=0 e o guarda-corpo da varanda) */
const PLANS = {
  front: {
    W: 12, D: 10, fac: 1.6, area: 112, hub: [5.6, 6.2],
    rooms: [
      { id: 'varanda', n: 'Varanda gourmet', r: [0, 0, 12, 1.6], fl: 'deck', view: [9.2, 1.2, 2.5, 0.1], door: [4.7, 1.9] },
      { id: 'living', n: 'Living e jantar', r: [0, 1.6, 6.4, 5.6], fl: 'main', view: [6.0, 5.2, 0.5, 2.1], door: [4.2, 4.6] },
      { id: 'cozinha', n: 'Cozinha', r: [6.4, 1.6, 8.9, 5.6], fl: 'main', view: [5.3, 5.0, 8.6, 2.2], door: [6.2, 4.6] },
      { id: 'master', n: 'Suíte master', r: [8.9, 1.6, 12, 5.6], fl: 'main', view: [11.3, 5.2, 9.3, 1.8], door: [10.65, 5.3], hall: [10.65, 6.2] },
      { id: 'hall', n: 'Circulação', r: [0, 5.6, 12, 6.8], fl: 'main', view: [11.2, 6.2, 0, 6.2], door: [6.0, 6.2], hidden: true },
      { id: 'suite', n: 'Suíte', r: [0, 6.8, 3.8, 10], fl: 'main', view: [3.25, 7.3, 0.4, 9.6], door: [3.05, 7.2], hall: [3.05, 6.2] },
      { id: 'dorm', n: 'Dormitório', r: [3.8, 6.8, 7, 10], fl: 'main', view: [4.4, 7.3, 6.7, 9.7], door: [4.45, 7.2], hall: [4.45, 6.2] },
      { id: 'banho', n: 'Banheiro', r: [7, 6.8, 9, 10], fl: 'tile', view: [7.9, 7.25, 8.3, 9.9], door: [8.0, 7.2], hall: [8.0, 6.2] },
      { id: 'servico', n: 'Área de serviço', r: [9, 6.8, 12, 10], fl: 'tile', view: [9.7, 7.3, 11.8, 9.8], door: [9.8, 7.2], hall: [9.8, 6.2] }
    ],
    walls: [
      // fachada com vidro (abertura de passagem para a varanda em x 4.2..5.2)
      { a: [0, 1.6], b: [12, 1.6], o: [{ s: 0.25, e: 4.2, g: 1, h: 2.45 }, { s: 5.2, e: 8.75, g: 1, h: 2.45 }, { s: 9.15, e: 11.75, g: 1, h: 2.45 }, { s: 4.2, e: 5.2, h: 2.45 }] },
      { a: [0, 0], b: [0, 10] }, { a: [12, 0], b: [12, 10], o: [{ s: 5.85, e: 6.75, h: 2.1, door: 1, entry: 1 }] },
      { a: [0, 10], b: [12, 10], o: [{ s: 0.8, e: 3.0, g: 1, sill: 0.95, h: 2.25 }, { s: 4.6, e: 6.4, g: 1, sill: 0.95, h: 2.25 }, { s: 7.6, e: 8.5, g: 1, sill: 1.7, h: 2.3 }, { s: 10.1, e: 11.4, g: 1, sill: 1.1, h: 2.2 }] },
      { a: [8.9, 1.6], b: [8.9, 5.6] }, { a: [8.9, 5.6], b: [12, 5.6], o: [{ s: 10.2, e: 11.1, h: 2.1, door: 1 }] },
      { a: [0, 6.8], b: [12, 6.8], o: [{ s: 2.6, e: 3.5, h: 2.1, door: 1 }, { s: 4.0, e: 4.9, h: 2.1, door: 1 }, { s: 7.6, e: 8.4, h: 2.1, door: 1 }, { s: 9.35, e: 10.25, h: 2.1, door: 1 }] },
      { a: [3.8, 6.8], b: [3.8, 10] }, { a: [7, 6.8], b: [7, 10] }, { a: [9, 6.8], b: [9, 10] }
    ],
    accent: { a: [0.02, 2.0], b: [0.02, 5.4] },     // parede da TV
    rail: [[0, 0], [12, 0]]
  },
  fundos: {
    W: 12, D: 9.2, fac: 1.0, area: 84, hub: [5.0, 5.5],
    rooms: [
      { id: 'varanda', n: 'Varanda', r: [0, 0, 5.6, 1.0], fl: 'deck', view: [4.8, 0.6, 0.5, -3], door: [2.9, 1.3] },
      { id: 'living', n: 'Living', r: [0, 1.0, 5.6, 5.0], fl: 'main', view: [3.7, 4.75, 0.3, 1.3], door: [3.6, 4.3] },
      { id: 'cozinha', n: 'Cozinha', r: [5.6, 1.0, 8.2, 5.0], fl: 'main', view: [5.0, 4.5, 7.8, 1.2], door: [6.6, 4.4] },
      { id: 'servico', n: 'Área de serviço', r: [8.2, 1.0, 12, 3.2], fl: 'tile', view: [8.7, 2.2, 11.8, 1.3], door: [8.0, 2.2], hall: [7.4, 2.2] },
      { id: 'banho', n: 'Banheiro', r: [8.2, 3.2, 12, 5.0], fl: 'tile', view: [9.4, 4.6, 11.2, 3.5], door: [9.4, 4.75], hall: [9.4, 5.5] },
      { id: 'hall', n: 'Circulação', r: [0, 5.0, 12, 6.0], fl: 'main', view: [11.2, 5.5, 0, 5.5], door: [6.0, 5.5], hidden: true },
      { id: 'suite', n: 'Suíte', r: [0, 6.0, 5.4, 9.2], fl: 'main', view: [4.65, 6.5, 0.4, 8.8], door: [4.65, 6.4], hall: [4.65, 5.5] },
      { id: 'dorm', n: 'Dormitório', r: [5.4, 6.0, 9.6, 9.2], fl: 'main', view: [6.05, 6.5, 9.2, 8.8], door: [6.05, 6.4], hall: [6.05, 5.5] },
      { id: 'banho2', n: 'Banho da suíte', r: [9.6, 6.0, 12, 9.2], fl: 'tile', view: [10.3, 6.5, 11.6, 8.6], door: [10.3, 6.4], hall: [10.3, 5.5] }
    ],
    walls: [
      { a: [0, 1.0], b: [5.6, 1.0], o: [{ s: 0.25, e: 2.4, g: 1, h: 2.45 }, { s: 3.4, e: 5.35, g: 1, h: 2.45 }, { s: 2.4, e: 3.4, h: 2.45 }] },
      { a: [5.6, 1.0], b: [12, 1.0], o: [{ s: 6.0, e: 7.8, g: 1, sill: 1.1, h: 2.25 }, { s: 9.6, e: 11.2, g: 1, sill: 1.1, h: 2.2 }] },
      { a: [5.6, 0], b: [5.6, 1.0] },
      { a: [0, 0], b: [0, 9.2] }, { a: [12, 1.0], b: [12, 9.2], o: [{ s: 5.1, e: 5.95, h: 2.1, door: 1, entry: 1 }] },
      { a: [0, 9.2], b: [12, 9.2], o: [{ s: 1.2, e: 3.6, g: 1, sill: 0.95, h: 2.25 }, { s: 6.6, e: 8.4, g: 1, sill: 0.95, h: 2.25 }, { s: 10.4, e: 11.3, g: 1, sill: 1.7, h: 2.3 }] },
      { a: [8.2, 1.0], b: [8.2, 5.0], o: [{ s: 1.8, e: 2.65, h: 2.1, door: 1 }] },
      { a: [8.2, 3.2], b: [12, 3.2] }, { a: [8.2, 5.0], b: [12, 5.0], o: [{ s: 9.0, e: 9.8, h: 2.1, door: 1 }] },
      { a: [0, 6.0], b: [12, 6.0], o: [{ s: 4.2, e: 5.1, h: 2.1, door: 1 }, { s: 5.6, e: 6.5, h: 2.1, door: 1 }, { s: 9.9, e: 10.7, h: 2.1, door: 1 }] },
      { a: [5.4, 6.0], b: [5.4, 9.2] }, { a: [9.6, 6.0], b: [9.6, 9.2] }
    ],
    accent: { a: [0.02, 1.6], b: [0.02, 4.8] },
    rail: [[0, 0], [5.6, 0]]
  }
};

/* ================================================================ montagem */
function init() {
  injectCSS();
  const root = document.createElement('div'); root.id = 't3'; root.innerHTML = `
    <canvas id="t3c"></canvas>
    <div id="t3labels"></div>
    <div id="t3top" class="t3ui">
      <div class="t3title"><small id="t3k"></small><b id="t3t"></b></div>
      <div class="t3btns"><button id="t3hide" class="t3g" aria-label="Tela limpa">${EYE_OFF}</button><button id="t3close" class="t3g">Fechar ✕</button></div>
    </div>
    <div id="t3bar" class="t3ui">
      <div class="t3row"><div class="t3seg" id="t3mode"><button data-m="top">Vista de cima</button><button data-m="walk">Passear</button></div>
        <div class="t3seg" id="t3light"><button data-l="dia">Dia</button><button data-l="tarde">Fim de tarde</button><button data-l="noite">Noite</button></div></div>
      <div class="t3row"><span class="t3lab">Decoração</span><div class="t3seg" id="t3style"><button data-s="claro">Claro</button><button data-s="madeira">Madeira</button><button data-s="escuro">Escuro</button></div></div>
      <div class="t3rooms" id="t3rooms"></div>
    </div>
    <div id="t3hint"></div>
    <button id="t3show" class="t3g">${EYE_ON}Mostrar</button>
    <div id="t3load"><div><b>Montando o apartamento…</b><span id="t3lp"></span></div></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);

  /* ---------- renderizador ---------- */
  const canvas = $('#t3c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TOUCH ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000);
  scene.environment = makeEnv(renderer);
  scene.environmentIntensity = 0.55;

  /* ---------- luzes ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x8a7a66, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3); sun.castShadow = true;
  const sm = SMALL ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);

  /* ---------- ceu, paisagem e chao ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 hor;varying vec3 p;void main(){float t=pow(clamp(p.y,0.,1.),.55);gl_FragColor=vec4(mix(hor,top,t),1.);\n#include <colorspace_fragment>\n}'
  }));
  scene.add(sky);
  const land = new THREE.Mesh(new THREE.CylinderGeometry(420, 420, 260, 64, 1, true), new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
  land.position.y = 20; scene.add(land);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(430, 48), new THREE.MeshLambertMaterial({ map: tex(grassTex(), 120, 120) }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -34; scene.add(ground);
  const outside = [sky, land, ground];

  /* ---------- estado ---------- */
  const S = {
    on: false, u: null, plan: null, planKey: '', style: 'claro', light: 'dia', mode: 'top', mir: false,
    yaw: 0, pitch: -0.05, pos: new THREE.Vector3(), orbit: { th: -0.5, ph: 0.95, r: 17 }, anim: null, path: null,
    clean: false, opts: {}, landCache: {}, need: true
  };
  const apt = new THREE.Group(); scene.add(apt);
  const M = makeMaterials();
  const floorMeshes = [], labels = [];
  let ceiling = null, lamps = [], lampMeshes = [], screens = [];

  /* ---------- UI ---------- */
  $('#t3close').onclick = () => hide();
  $('#t3hide').onclick = () => setClean(true); $('#t3show').onclick = () => setClean(false);
  root.querySelectorAll('#t3mode button').forEach(b => b.onclick = () => b.dataset.m === 'top' ? toTop() : enterRoom(S.plan.rooms.find(r => r.id === 'living')));
  root.querySelectorAll('#t3light button').forEach(b => b.onclick = () => setLight(b.dataset.l));
  root.querySelectorAll('#t3style button').forEach(b => b.onclick = () => setStyle(b.dataset.s));
  function press(sel, attr, v) { root.querySelectorAll(sel + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === v))); }
  function hint(t, ms = 3200) { const h = $('#t3hint'); h.textContent = t; h.classList.add('on'); clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.remove('on'), ms); }
  function setClean(v) { S.clean = v; root.classList.toggle('clean', v); }

  /* ---------- construcao do apartamento ---------- */
  function build(planKey) {
    S.planKey = planKey; const P = S.plan = PLANS[planKey];
    while (apt.children.length) { const c = apt.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    floorMeshes.length = 0; lamps = []; lampMeshes = []; screens = [];
    labels.forEach(l => l.el.remove()); labels.length = 0;
    const add = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; apt.add(o); return o; };

    // pisos
    for (const rm of P.rooms) {
      const [x0, z0, x1, z1] = rm.r, w = x1 - x0, d = z1 - z0;
      const mat = rm.fl === 'deck' ? M.deck : rm.fl === 'tile' ? M.tile : M.floor;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); f.rotation.x = -Math.PI / 2;
      f.receiveShadow = true; f.userData.room = rm; add(f, x0 + w / 2, 0, z0 + d / 2); floorMeshes.push(f);
      // uv em metros para o piso continuar entre comodos
      const uv = f.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * w), (z0 + (1 - uv.getY(i)) * d));
      if (!rm.hidden) {
        const el = document.createElement('button'); el.className = 't3label'; el.innerHTML = `<b>${rm.n}</b><small>${Math.round(w * d)} m²</small>`;
        el.onclick = () => enterRoom(rm); $('#t3labels').appendChild(el); labels.push({ el, rm, p: new THREE.Vector3(x0 + w / 2, 1.2, z0 + d / 2) });
      }
    }
    // laje / teto
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(P.W, P.D), M.ceil); ceil.rotation.x = Math.PI / 2; add(ceil, P.W / 2, H, P.D / 2); ceiling = ceil;
    // laje inferior (espessura vista de cima/fora)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(P.W + 0.3, 0.3, P.D + 0.15), M.slab); add(slab, P.W / 2, -0.151, P.D / 2 - 0.075); slab.receiveShadow = true;
    // paredes
    for (const w of P.walls) buildWall(w, add);
    // parede de destaque
    if (P.accent) { const a = P.accent; const len = Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]); const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, H - 0.02, len), M.accent); m.receiveShadow = true; add(m, a.a[0] + T / 2 + 0.015, H / 2, (a.a[1] + a.b[1]) / 2); m.userData.accent = true; }
    // guarda-corpo de vidro
    { const [a, b] = P.rail, len = b[0] - a[0]; const g = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.02), M.glass); add(g, a[0] + len / 2, 0.55, 0.02);
      const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.06), M.alu); add(top, a[0] + len / 2, 1.09, 0.02); }
    furnish(planKey, add);
    apt.traverse(o => { if (o.isMesh && !o.userData.noShadow && o.material !== M.glass) { o.castShadow = true; o.receiveShadow = true; } });
    floorMeshes.forEach(f => f.castShadow = false); ceil.castShadow = true;
    buildRoomChips();
  }
  function buildWall(w, add) {
    const [ax, az] = w.a, [bx, bz] = w.b, horiz = Math.abs(bz - az) < 1e-6;
    const L = horiz ? bx - ax : bz - az, base = horiz ? ax : az;
    const ops = (w.o || []).map(o => ({ s: o.s - base, e: o.e - base, h: o.h || 2.1, sill: o.sill || 0, g: o.g, door: o.door, entry: o.entry })).sort((p, q) => p.s - q.s);
    const piece = (s, e, y0, y1, mat = M.wall) => {
      if (e - s < 0.005 || y1 - y0 < 0.005) return;
      const len = e - s, m = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len, y1 - y0, T) : new THREE.BoxGeometry(T, y1 - y0, len), mat);
      const c = base + s + len / 2; add(m, horiz ? c : ax, (y0 + y1) / 2, horiz ? az : c);
      if (y0 === 0 && mat === M.wall) { const bb = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len, 0.08, T + 0.024) : new THREE.BoxGeometry(T + 0.024, 0.08, len), M.base); bb.userData.noShadow = true; add(bb, horiz ? c : ax, 0.04, horiz ? az : c); }
    };
    let cur = -T / 2;
    for (const o of ops) {
      piece(cur, o.s, 0, H);
      piece(o.s, o.e, o.h, H);                 // verga
      if (o.sill) piece(o.s, o.e, 0, o.sill);  // peitoril
      if (o.g) {                               // vidro com caixilho
        const len = o.e - o.s, c = base + o.s + len / 2, hh = o.h - o.sill, yc = o.sill + hh / 2;
        const gl = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len, hh, 0.012) : new THREE.BoxGeometry(0.012, hh, len), M.glass); gl.userData.noShadow = true;
        add(gl, horiz ? c : ax, yc, horiz ? az : c);
        const n = Math.max(1, Math.round(len / 1.3));
        for (let i = 0; i <= n; i++) { const p = base + o.s + len * i / n; const mm = new THREE.Mesh(horiz ? new THREE.BoxGeometry(0.05, hh, 0.07) : new THREE.BoxGeometry(0.07, hh, 0.05), M.alu); add(mm, horiz ? p : ax, yc, horiz ? az : p); }
        for (const y of [o.sill + 0.025, o.h - 0.025]) { const mm = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len, 0.05, 0.07) : new THREE.BoxGeometry(0.07, 0.05, len), M.alu); add(mm, horiz ? c : ax, y, horiz ? az : c); }
      }
      if (o.door) {                            // batente
        const len = o.e - o.s, c = base + o.s + len / 2;
        for (const p of [o.s, o.e]) { const mm = new THREE.Mesh(horiz ? new THREE.BoxGeometry(0.04, o.h, T + 0.03) : new THREE.BoxGeometry(T + 0.03, o.h, 0.04), M.trim); add(mm, horiz ? base + p : ax, o.h / 2, horiz ? az : base + p); }
        const tp = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len, 0.04, T + 0.03) : new THREE.BoxGeometry(T + 0.03, 0.04, len), M.trim); add(tp, horiz ? c : ax, o.h, horiz ? az : c);
        if (o.entry) { const lf = new THREE.Mesh(horiz ? new THREE.BoxGeometry(len - 0.06, o.h - 0.02, 0.05) : new THREE.BoxGeometry(0.05, o.h - 0.02, len - 0.06), M.wood); add(lf, horiz ? c : ax, (o.h - 0.02) / 2, horiz ? az : c);
          const hd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.18), M.metal); add(hd, horiz ? c : ax - 0.05, 1.05, horiz ? az - 0.05 : c - len * 0.35); }
      }
      cur = o.e;
    }
    piece(cur, L + T / 2, 0, H);
  }

  /* ---------- moveis ---------- */
  function rbox(w, h, d, r, mat) {
    r = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
    s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, -y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 3 });
    g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }
  function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function cyl(rt, rb, h, mat, seg = 20) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
  function grp(...items) { const g = new THREE.Group(); items.forEach(([m, x, y, z, ry]) => { m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); }); return g; }
  function blob(w, d, op = 0.55) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: M.shadow, transparent: true, opacity: op, depthWrite: false, color: 0x000000 })); m.rotation.x = -Math.PI / 2; m.userData.noShadow = true; m.renderOrder = 1; return m; }

  const F = {
    sofa(w = 2.4) {
      const g = grp([rbox(w, 0.24, 0.92, 0.04, M.sofa), 0, 0.26, 0], [rbox(w, 0.42, 0.2, 0.06, M.sofa), 0, 0.6, -0.36],
        [rbox(0.18, 0.5, 0.92, 0.06, M.sofa), -w / 2 + 0.09, 0.4, 0], [rbox(0.18, 0.5, 0.92, 0.06, M.sofa), w / 2 - 0.09, 0.4, 0]);
      const n = w > 2 ? 3 : 2, cw = (w - 0.36) / n;
      for (let i = 0; i < n; i++) { const x = -w / 2 + 0.18 + cw * (i + .5); g.add(grp([rbox(cw - 0.02, 0.16, 0.68, 0.06, M.sofa), x, 0.46, 0.08], [rbox(cw - 0.04, 0.4, 0.16, 0.07, M.sofa), x, 0.72, -0.2])); }
      g.add(grp([rbox(0.42, 0.36, 0.12, 0.05, M.throw), -w / 2 + 0.45, 0.72, -0.12, 0.2]));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(grp([cyl(0.02, 0.015, 0.14, M.metal, 8), sx * (w / 2 - 0.1), 0.07, sz * 0.36]));
      g.add(grp([blob(w + 0.5, 1.3), 0, 0.004, 0])); return g;
    },
    armchair() {
      return grp([rbox(0.78, 0.22, 0.8, 0.05, M.sofa), 0, 0.3, 0], [rbox(0.78, 0.45, 0.16, 0.06, M.sofa), 0, 0.6, -0.32],
        [rbox(0.12, 0.38, 0.8, 0.05, M.sofa), -0.33, 0.45, 0], [rbox(0.12, 0.38, 0.8, 0.05, M.sofa), 0.33, 0.45, 0],
        [rbox(0.54, 0.12, 0.6, 0.05, M.sofa), 0, 0.46, 0.06], [cyl(0.02, 0.02, 0.2, M.metal, 8), -0.3, 0.1, 0.3], [cyl(0.02, 0.02, 0.2, M.metal, 8), 0.3, 0.1, 0.3],
        [cyl(0.02, 0.02, 0.2, M.metal, 8), -0.3, 0.1, -0.3], [cyl(0.02, 0.02, 0.2, M.metal, 8), 0.3, 0.1, -0.3], [blob(1.1, 1.1), 0, 0.004, 0]);
    },
    coffee() { return grp([rbox(1.2, 0.05, 0.65, 0.02, M.counter), 0, 0.38, 0], [box(0.9, 0.34, 0.4, M.cab), 0, 0.18, 0], [blob(1.5, 1), 0, 0.004, 0]); },
    rug(w, d) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), M.rug); m.userData.noShadow = true; m.receiveShadow = true; return grp([m, 0, 0.006, 0]); },
    tvwall(w = 2.6) {
      const tv = box(1.5, 0.86, 0.04, M.screen); screens.push(tv);
      return grp([box(w, 2.25, 0.04, M.wood), 0, 1.24, -0.02], [box(w * 0.85, 0.4, 0.42, M.cab), 0, 0.25, 0.21], [box(w * 0.85, 0.03, 0.43, M.wood), 0, 0.465, 0.21],
        [tv, 0, 1.28, 0.03], [box(1.52, 0.88, 0.02, M.black), 0, 1.28, 0.005]);
    },
    dining(n = 6) {
      const g = grp([rbox(1.9, 0.05, 0.95, 0.02, M.wood), 0, 0.75, 0], [box(0.08, 0.72, 0.6, M.metal), -0.7, 0.36, 0], [box(0.08, 0.72, 0.6, M.metal), 0.7, 0.36, 0], [blob(2.6, 1.9), 0, 0.004, 0]);
      const per = n / 2; for (let i = 0; i < per; i++) { const x = -0.6 + 1.2 * i / Math.max(1, per - 1); for (const s of [-1, 1]) { const c = F.chair(); c.position.set(x, 0, s * 0.62); c.rotation.y = s > 0 ? Math.PI : 0; g.add(c); } }
      return g;
    },
    chair() {
      return grp([rbox(0.46, 0.06, 0.44, 0.02, M.chair), 0, 0.46, 0], [rbox(0.44, 0.42, 0.05, 0.02, M.chair), 0, 0.72, -0.2],
        [cyl(0.015, 0.015, 0.46, M.metal, 6), -0.19, 0.23, 0.18], [cyl(0.015, 0.015, 0.46, M.metal, 6), 0.19, 0.23, 0.18],
        [cyl(0.015, 0.015, 0.46, M.metal, 6), -0.19, 0.23, -0.18], [cyl(0.015, 0.015, 0.46, M.metal, 6), 0.19, 0.23, -0.18]);
    },
    pendant(y = 1.85) {
      const shade = cyl(0.12, 0.2, 0.22, M.lampShade, 24), bulb = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), M.bulb); bulb.rotation.x = Math.PI / 2; lampMeshes.push(bulb);
      return grp([cyl(0.004, 0.004, H - y, M.black, 4), 0, (H + y) / 2, 0], [shade, 0, y, 0], [bulb, 0, y - 0.105, 0]);
    },
    counterRun(len, upper = true, d = 0.62) {        // armarios ao longo do eixo x, encosto em -z
      const g = grp([box(len, 0.1, d - 0.06, M.black), 0, 0.05, 0.02], [box(len, 0.78, d, M.cab), 0, 0.49, 0], [box(len + 0.02, 0.04, d + 0.03, M.counter), 0, 0.9, 0.015],
        [box(len, 0.62, 0.015, M.counter), 0, 1.23, -d / 2 + 0.01]);
      const doors = Math.max(1, Math.round(len / 0.6)); for (let i = 1; i < doors; i++) g.add(grp([box(0.006, 0.74, 0.005, M.black), -len / 2 + len * i / doors, 0.5, d / 2 + 0.001]));
      g.add(grp([box(len, 0.005, 0.005, M.black), 0, 0.84, d / 2 + 0.001]));
      if (upper) { g.add(grp([box(len, 0.72, 0.36, M.cab), 0, 1.92, -d / 2 + 0.18])); for (let i = 1; i < doors; i++) g.add(grp([box(0.006, 0.7, 0.005, M.black), -len / 2 + len * i / doors, 1.92, -d / 2 + 0.361])); }
      return g;
    },
    cooktop() { return grp([box(0.6, 0.008, 0.5, M.blackGlass), 0, 0.925, 0], [box(0.6, 0.12, 0.42, M.steel), 0, 1.62, -0.1]); },
    sink() { return grp([box(0.6, 0.012, 0.42, M.steel), 0, 0.921, 0], [box(0.5, 0.01, 0.34, M.black), 0, 0.928, 0], [cyl(0.015, 0.015, 0.3, M.steel, 8), 0, 1.07, -0.18], [box(0.02, 0.02, 0.18, M.steel), 0, 1.22, -0.1]); },
    fridge() { return grp([rbox(0.78, 1.95, 0.7, 0.02, M.steel), 0, 0.975, 0], [box(0.004, 1.85, 0.005, M.black), 0, 0.98, 0.351], [box(0.03, 0.5, 0.03, M.black), -0.06, 1.2, 0.37], [box(0.03, 0.5, 0.03, M.black), 0.06, 1.2, 0.37]); },
    island(len = 2.0) {
      const g = grp([box(len, 0.86, 0.9, M.cab), 0, 0.43, 0], [box(len + 0.3, 0.04, 1.0, M.counter), 0, 0.9, 0], [blob(len + 0.8, 1.8), 0, 0.004, 0]);
      for (let i = 0; i < 3; i++) g.add(grp([F.stool(), -len / 2 + len * (i + .5) / 3, 0, 0.75]));
      return g;
    },
    stool() { return grp([cyl(0.19, 0.19, 0.05, M.chair, 20), 0, 0.68, 0], [cyl(0.02, 0.02, 0.66, M.metal, 8), 0, 0.33, 0], [cyl(0.18, 0.18, 0.015, M.metal, 20), 0, 0.008, 0]); },
    bed(w = 1.93) {
      const g = grp([rbox(w + 0.06, 0.3, 2.06, 0.03, M.bedBase), 0, 0.2, 0], [rbox(w, 0.24, 2.0, 0.06, M.sheet), 0, 0.45, 0.01],
        [rbox(w + 0.04, 0.08, 1.35, 0.04, M.duvet), 0, 0.58, 0.33], [rbox(w + 0.04, 0.07, 0.45, 0.03, M.throw), 0, 0.62, 0.62],
        [rbox(w + 0.5, 1.15, 0.1, 0.04, M.headboard), 0, 0.85, -1.06], [blob(w + 0.9, 2.6), 0, 0.004, 0]);
      const np = w > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) g.add(grp([rbox(0.62, 0.16, 0.42, 0.07, M.sheet), np === 1 ? 0 : (i ? 0.38 : -0.38) * w / 1.6, 0.66, -0.72, 0]));
      return g;
    },
    nightstand() {
      const shade = cyl(0.11, 0.14, 0.2, M.lampShade, 20); const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.bulb); lampMeshes.push(glow);
      return grp([rbox(0.48, 0.42, 0.42, 0.02, M.wood), 0, 0.21, 0], [box(0.4, 0.005, 0.005, M.black), 0, 0.3, 0.211], [cyl(0.05, 0.07, 0.25, M.cab, 14), 0, 0.55, 0], [shade, 0, 0.78, 0], [glow, 0, 0.74, 0]);
    },
    wardrobe(w) {
      const g = grp([box(w, 2.5, 0.6, M.cab), 0, 1.25, 0]); const n = Math.max(2, Math.round(w / 0.55));
      for (let i = 1; i < n; i++) g.add(grp([box(0.006, 2.45, 0.005, M.black), -w / 2 + w * i / n, 1.25, 0.301]));
      for (let i = 0; i < n; i++) g.add(grp([box(0.015, 0.4, 0.02, M.metal), -w / 2 + w * (i + .5) / n + (i % 2 ? -0.22 : 0.22) * w / n, 1.15, 0.31]));
      return g;
    },
    vanity(w = 1.2) {
      const m = box(w * 0.9, 0.85, 0.02, M.mirror); m.userData.noShadow = true;
      return grp([box(w, 0.45, 0.5, M.cab), 0, 0.62, 0], [box(w + 0.02, 0.03, 0.52, M.counter), 0, 0.86, 0], [rbox(0.46, 0.12, 0.34, 0.04, M.porcelain), 0, 0.93, 0.02],
        [cyl(0.012, 0.012, 0.22, M.steel, 8), 0, 1.0, -0.2], [m, 0, 1.5, -0.24]);
    },
    toilet() { return grp([rbox(0.38, 0.4, 0.55, 0.09, M.porcelain), 0, 0.2, 0.05], [rbox(0.38, 0.36, 0.18, 0.04, M.porcelain), 0, 0.58, -0.25], [rbox(0.4, 0.03, 0.46, 0.08, M.porcelain), 0, 0.415, 0.08]); },
    shower(w, d) { const gl = box(0.012, 2.0, d, M.glass); gl.userData.noShadow = true; return grp([box(w, 0.04, d, M.tileDark), 0, 0.02, 0], [gl, w / 2, 1.0, 0], [cyl(0.12, 0.12, 0.01, M.steel, 20), 0, 2.3, 0], [cyl(0.008, 0.008, 0.4, M.steel, 6), 0, 2.5, 0]); },
    washer() { const d = cyl(0.2, 0.2, 0.02, M.blackGlass, 28); d.rotation.x = Math.PI / 2; return grp([rbox(0.6, 0.85, 0.6, 0.03, M.porcelain), 0, 0.425, 0], [d, 0, 0.42, 0.305]); },
    tank() { return grp([box(0.6, 0.85, 0.55, M.cab), 0, 0.425, 0], [box(0.62, 0.04, 0.57, M.counter), 0, 0.87, 0], [box(0.44, 0.01, 0.36, M.steel), 0, 0.893, 0.02], [box(0.6, 0.7, 0.35, M.cab), 0, 1.75, -0.1]); },
    plant(h = 1.3) {
      const g = grp([cyl(0.2, 0.15, 0.4, M.pot, 20), 0, 0.2, 0]); const r = rnd(Math.round(h * 100));
      for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + r() * 0.12, 1), M.leaf); l.scale.set(1, 0.7 + r() * 0.6, 1); l.position.set((r() - .5) * 0.45, 0.55 + r() * (h - 0.6), (r() - .5) * 0.45); g.add(l); }
      g.add(grp([cyl(0.015, 0.02, h - 0.4, M.wood, 6), 0, 0.2 + (h - 0.4) / 2, 0])); return g;
    },
    lounger() { return grp([rbox(0.65, 0.12, 1.7, 0.04, M.outdoor), 0, 0.3, 0], [rbox(0.65, 0.12, 0.65, 0.04, M.outdoor), 0, 0.55, -0.62], [box(0.6, 0.25, 0.06, M.metal), 0, 0.12, 0.7], [box(0.6, 0.25, 0.06, M.metal), 0, 0.12, -0.6]); },
    grill(len = 1.5) { return grp([box(len, 0.88, 0.6, M.cab), 0, 0.44, 0], [box(len + 0.02, 0.04, 0.62, M.counter), 0, 0.9, 0], [box(0.6, 0.06, 0.45, M.steel), -len / 2 + 0.4, 0.95, 0], [box(0.62, 0.9, 0.48, M.steel), -len / 2 + 0.4, 1.6, -0.06]); },
    roundTable() { return grp([cyl(0.45, 0.45, 0.04, M.wood, 28), 0, 0.74, 0], [cyl(0.04, 0.04, 0.72, M.metal, 10), 0, 0.37, 0], [cyl(0.25, 0.25, 0.02, M.metal, 20), 0, 0.01, 0], [blob(1.4, 1.4), 0, 0.004, 0]); },
    art(w, h) { const [c, g] = cnv(256, 256), r = rnd(Math.round(w * 99)); g.fillStyle = '#efe9df'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 6; i++) { g.fillStyle = ['#c28f5f', '#3f4d5a', '#a7b3a0', '#d8b26a', '#7a5233'][i % 5]; g.globalAlpha = .85; g.beginPath(); g.arc(40 + r() * 176, 40 + r() * 176, 20 + r() * 60, 0, 7); g.fill(); } const m = new THREE.MeshStandardMaterial({ map: tex(c), roughness: .8 }); return grp([box(w + 0.04, h + 0.04, 0.03, M.black), 0, 0, 0], [box(w, h, 0.032, m), 0, 0, 0.002]); }
  };
  F.desk = () => grp([box(1.3, 0.04, 0.6, M.wood), 0, 0.75, 0], [box(0.04, 0.73, 0.56, M.cab), -0.6, 0.365, 0], [box(0.42, 0.6, 0.56, M.cab), 0.42, 0.3, 0], [box(0.5, 0.32, 0.02, M.black), -0.1, 0.95, -0.2], [F.chair(), 0, 0, 0.55, Math.PI]);

  function lamp(x, z, inten = 1) {          // luz de teto (noite)
    const l = new THREE.PointLight(0xffd6a0, 0, 7, 2); l.position.set(x, H - 0.25, z); apt.add(l); lamps.push([l, inten]);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), M.bulb); spot.rotation.x = Math.PI / 2; spot.position.set(x, H - 0.003, z); spot.userData.noShadow = true; apt.add(spot); lampMeshes.push(spot);
  }
  function spots(r, n = 2) { const [x0, z0, x1, z1] = r; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), M.bulb); s.rotation.x = Math.PI / 2; s.position.set(x0 + (x1 - x0) * (i + .5) / n, H - 0.003, z0 + (z1 - z0) * (j + .5) / 2); s.userData.noShadow = true; apt.add(s); lampMeshes.push(s); } }

  function furnish(k, add) {
    const P = S.plan;
    if (k === 'front') {
      add(F.tvwall(2.8), 0.08, 0, 3.75, Math.PI / 2);
      add(F.rug(2.3, 3.0), 1.95, 0, 3.75); add(F.sofa(2.5), 3.25, 0, 3.75, -Math.PI / 2); add(F.coffee(), 1.95, 0, 3.75, Math.PI / 2);
      add(F.armchair(), 1.4, 0, 2.15, 0.35); add(F.plant(1.5), 0.45, 0, 2.0); add(F.plant(1.1), 0.45, 0, 5.3);
      add(F.dining(6), 5.0, 0, 2.95, Math.PI / 2); add(F.pendant(1.85), 5.0, 0, 2.6); add(F.pendant(1.85), 5.0, 0, 3.3);
      add(F.counterRun(3.0), 8.53, 0, 3.4, -Math.PI / 2); add(F.cooktop(), 8.53, 0, 2.8, -Math.PI / 2); add(F.sink(), 8.53, 0, 4.0, -Math.PI / 2);
      add(F.fridge(), 8.48, 0, 5.15, -Math.PI / 2); add(F.island(1.9), 7.05, 0, 3.4, -Math.PI / 2); add(F.pendant(1.8), 7.05, 0, 2.9); add(F.pendant(1.8), 7.05, 0, 3.9);
      add(F.bed(1.93), 10.0, 0, 3.55, Math.PI / 2); add(F.nightstand(), 9.2, 0, 2.2, Math.PI / 2); add(F.nightstand(), 9.2, 0, 4.9, Math.PI / 2);
      add(F.wardrobe(2.4), 11.62, 0, 3.4, -Math.PI / 2); add(F.rug(1.6, 2.6), 10.9, 0, 3.55);
      add(F.plant(1.2), 0.5, 0, 6.3);
      add(F.bed(1.6), 1.12, 0, 8.4, Math.PI / 2); add(F.nightstand(), 0.3, 0, 7.25, Math.PI / 2); add(F.nightstand(), 0.3, 0, 9.55, Math.PI / 2); add(F.wardrobe(2.4), 3.42, 0, 8.45, -Math.PI / 2);
      add(F.bed(0.95), 4.35, 0, 8.95, Math.PI); add(F.desk(), 6.62, 0, 8.3, -Math.PI / 2); add(F.wardrobe(1.2), 6.62, 0, 7.4, -Math.PI / 2);
      add(F.vanity(1.1), 8.7, 0, 9.35, -Math.PI / 2); add(F.toilet(), 8.68, 0, 7.75, -Math.PI / 2); add(F.shower(0.95, 1.4), 7.53, 0, 9.24, 0);
      add(F.washer(), 11.62, 0, 9.65, Math.PI); add(F.washer(), 10.98, 0, 9.65, Math.PI); add(F.tank(), 10.2, 0, 9.65, Math.PI);
      add(F.lounger(), 1.3, 0, 0.8, Math.PI); add(F.lounger(), 2.3, 0, 0.8, Math.PI); add(F.roundTable(), 7.3, 0, 0.8);
      { const c1 = F.chair(); add(c1, 6.7, 0, 0.8, Math.PI / 2); const c2 = F.chair(); add(c2, 7.9, 0, 0.8, -Math.PI / 2); }
      add(F.grill(1.6), 11.6, 0, 0.8, -Math.PI / 2); add(F.plant(1.4), 0.35, 0, 1.3); add(F.plant(1.0), 9.6, 0, 1.3);
      lamp(2.6, 3.7, 1); lamp(5.0, 2.95, .8); lamp(7.2, 3.5, 1); lamp(10.4, 3.5, .9); lamp(1.9, 8.4, .8); lamp(5.4, 8.4, .8); lamp(6.0, 6.2, .5); lamp(8.0, 8.4, .6); lamp(10.5, 8.4, .5);
      spots([0, 1.6, 6.4, 5.6], 3); spots([8.9, 1.6, 12, 5.6], 2); spots([0, 0, 12, 1.6], 4);
    } else {
      add(F.tvwall(2.6), 0.08, 0, 3.2, Math.PI / 2);
      add(F.rug(2.2, 2.8), 1.9, 0, 3.2); add(F.sofa(2.3), 3.2, 0, 3.2, -Math.PI / 2); add(F.coffee(), 1.9, 0, 3.2, Math.PI / 2);
      add(F.plant(1.4), 0.45, 0, 1.45); add(F.dining(4), 4.5, 0, 4.2, 0); add(F.pendant(1.85), 4.5, 0, 4.2);
      add(F.counterRun(2.3), 6.95, 0, 1.38, 0); add(F.cooktop(), 6.4, 0, 1.38, 0); add(F.sink(), 7.3, 0, 1.38, 0); add(F.fridge(), 7.8, 0, 4.6, Math.PI);
      add(F.island(1.4), 6.9, 0, 3.0, 0);
      add(F.washer(), 11.6, 0, 1.4, 0); add(F.tank(), 10.9, 0, 1.4, 0);
      add(F.vanity(1.1), 11.67, 0, 4.1, -Math.PI / 2); add(F.toilet(), 10.6, 0, 3.55, 0); add(F.shower(1.0, 1.2), 8.83, 0, 4.1, Math.PI);
      add(F.bed(1.6), 1.12, 0, 7.6, Math.PI / 2); add(F.nightstand(), 0.3, 0, 6.45, Math.PI / 2); add(F.nightstand(), 0.3, 0, 8.75, Math.PI / 2); add(F.wardrobe(2.0), 5.02, 0, 7.8, -Math.PI / 2);
      add(F.bed(0.95), 9.05, 0, 8.15, Math.PI); add(F.desk(), 6.2, 0, 8.82, Math.PI); add(F.wardrobe(1.6), 7.8, 0, 6.42, 0);
      add(F.vanity(1.0), 11.67, 0, 8.2, -Math.PI / 2); add(F.toilet(), 11.6, 0, 7.0, -Math.PI / 2);
      add(F.lounger(), 1.2, 0, 0.5, Math.PI / 2); add(F.plant(1.2), 5.2, 0, 0.5);
      lamp(2.4, 3.2, 1); lamp(4.5, 4.2, .7); lamp(6.9, 2.8, 1); lamp(2.6, 7.6, .8); lamp(7.4, 7.6, .8); lamp(6.0, 5.5, .5); lamp(10.1, 4.1, .5); lamp(10.1, 2.1, .5);
      spots([0, 1, 5.6, 5], 3); spots([0, 0, 5.6, 1], 2);
    }
  }

  /* ---------- materiais ---------- */
  function makeMaterials() {
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0 }, o));
    const plaster = tex(plasterTex(4), 1, 1, false);
    return {
      floor: std({ roughness: 0.42 }), deck: std({ map: tex(woodTex([26, 30, 40], 41), 0.6, 0.6), roughness: 0.7 }),
      tile: std({ roughness: 0.25 }), tileDark: std({ map: tex(tileTex([30, 4, 26], 52, 4), 1, 1), roughness: 0.3 }),
      wall: std({ color: '#efebe4', roughness: 0.9, bumpMap: plaster, bumpScale: 0.4 }), accent: std({ roughness: 0.8 }),
      ceil: std({ color: '#f4f2ee', roughness: 0.95, side: THREE.DoubleSide }), slab: std({ color: '#cfccc6', roughness: 0.9 }),
      trim: std({ color: '#e9e6e0', roughness: 0.5 }), base: std({ color: '#f1efea', roughness: 0.4 }), cab: std({}), wood: std({ roughness: 0.55 }), counter: std({ roughness: 0.18 }),
      sofa: std({ roughness: 0.95 }), throw: std({ roughness: 0.95 }), sheet: std({ color: '#f3f1ec', roughness: 0.95 }), duvet: std({ roughness: 0.95 }),
      bedBase: std({ roughness: 0.9 }), headboard: std({ roughness: 0.9 }), rug: std({ roughness: 1 }), chair: std({ roughness: 0.7 }),
      metal: std({ metalness: 1, roughness: 0.35 }), steel: std({ color: '#c8c9cb', metalness: 1, roughness: 0.28 }), alu: std({ color: '#2a2c2f', metalness: 0.6, roughness: 0.45 }),
      black: std({ color: '#141518', roughness: 0.5 }), blackGlass: std({ color: '#0b0c0e', roughness: 0.08, metalness: 0.2 }),
      screen: std({ color: '#060708', roughness: 0.15, emissive: new THREE.Color('#1b2a3a'), emissiveIntensity: 0 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe3ea', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0, depthWrite: false, envMapIntensity: 1.6 }),
      mirror: std({ color: '#dfe6ea', metalness: 1, roughness: 0.03 }), porcelain: std({ color: '#f6f6f4', roughness: 0.15 }),
      lampShade: std({ color: '#efe6d6', roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0 }),
      bulb: new THREE.MeshBasicMaterial({ color: '#fff4e2' }), pot: std({ color: '#b9ad9c', roughness: 0.85 }), leaf: std({ color: '#3d5a32', roughness: 0.75 }),
      outdoor: std({ color: '#d8d2c6', roughness: 0.9 }), shadow: shadowTex()
    };
  }
  const texCache = {};
  function setStyle(k) {
    const st = STYLES[k]; S.style = k; press('#t3style', 's', k);
    const c = texCache[k] || (texCache[k] = { floor: tex(st.floor(), st.floorRep, st.floorRep), wood: tex(st.wood(), 1, 1), counter: tex(st.counter(), 1, 1),
      sofa: tex(fabricTex(st.sofa, 5), 3, 3), rug: tex(rugTex(st.rug[0], st.rug[1], 6), 1, 1), tile: tex(tileTex(st.tile, 61, 3), 1, 1) });
    M.floor.map = c.floor; M.wood.map = c.wood; M.counter.map = c.counter; M.sofa.map = c.sofa; M.rug.map = c.rug; M.tile.map = c.tile;
    M.wall.color.set(st.wall); M.accent.color.set(st.accent || '#ffffff'); M.accent.map = st.accent ? null : c.wood;
    M.cab.color.set(st.cab || '#ffffff'); M.cab.map = st.cab ? null : c.wood; M.cab.roughness = st.cabRough;
    M.sofa.color.set('#ffffff'); M.throw.color.set(st.throw); M.duvet.color.set(st.bed); M.bedBase.color.set(st.sofa); M.headboard.color.set(st.sofa);
    M.chair.color.set(st.chair); M.metal.color.set(st.metal); M.rug.color.set('#ffffff');
    M.base.color.set(k === 'escuro' ? '#1d1f22' : k === 'madeira' ? '#6b4a30' : '#f1efea'); M.trim.color.set(k === 'escuro' ? '#2a2c30' : k === 'madeira' ? '#8a6444' : '#e9e6e0');
    for (const m of Object.values(M)) if (m && m.isMaterial) m.needsUpdate = true;
    S.need = true; if (S.on) hint('Decoração: ' + st.nome, 1800);
  }
  function setLight(l) {
    S.light = l; press('#t3light', 'l', l);
    const P = S.plan, cx = P.W / 2, cz = P.D / 2, front = S.planKey === 'front';
    const dir = front ? -1 : 1;     // sol entra pela fachada da frente (norte) ou pelos fundos
    const sk = sky.material.uniforms;
    if (l === 'dia') { sun.visible = true; sun.intensity = front ? 4.2 : 3.0; sun.color.set('#fff0d8'); sun.position.set(cx - 5, 9, cz + dir * 10); hemi.intensity = 0.38; hemi.color.set('#dfe8f5'); scene.environmentIntensity = 0.38; renderer.toneMappingExposure = 0.92; sk.top.value.set('#4f86cf'); sk.hor.value.set('#cfe0ee'); }
    if (l === 'tarde') { sun.visible = true; sun.intensity = 2.6; sun.color.set('#ffb070'); sun.position.set(cx - 12, 3.2, cz + dir * 7); hemi.intensity = 0.3; hemi.color.set('#f2c49a'); scene.environmentIntensity = 0.28; renderer.toneMappingExposure = 1.0; sk.top.value.set('#3b4f7a'); sk.hor.value.set('#f0a35c'); }
    if (l === 'noite') { sun.visible = false; hemi.intensity = 0.06; hemi.color.set('#6d7ea8'); scene.environmentIntensity = 0.12; renderer.toneMappingExposure = 1.15; sk.top.value.set('#03050b'); sk.hor.value.set('#141c30'); }
    // posicoes no espaco do mundo (o apartamento pode estar espelhado)
    const tw = apt.localToWorld(new THREE.Vector3(cx, 0, cz)); sun.target.position.copy(tw);
    sun.position.copy(apt.localToWorld(sun.position.clone()));
    const night = l === 'noite';
    lamps.forEach(([lt, k]) => lt.intensity = night ? 9 * k : 0);
    M.bulb.color.set(night ? '#fff0d6' : '#f2efe9'); M.lampShade.emissiveIntensity = night ? 0.9 : 0; M.screen.emissiveIntensity = night ? 0.6 : 0;
    loadLand(l); S.need = true;
  }
  function loadLand(l) {
    if (S.landCache[l]) { land.material.map = S.landCache[l]; land.material.needsUpdate = true; return; }
    const fr = ['00', '12'], ims = fr.map(f => { const im = new Image(); im.src = (S.opts.base || 'renders/') + l + '/' + f + '.jpg'; return im; });
    Promise.all(ims.map(im => im.decode ? im.decode().catch(() => null) : null)).then(() => {
      if (!ims.every(im => im.naturalWidth)) return;
      const sw = Math.round(ims[0].naturalWidth * 0.34), h = ims[0].naturalHeight, [c, g] = cnv(sw * 4, h);
      ims.forEach((im, i) => { g.drawImage(im, 0, 0, sw, h, i * 2 * sw, 0, sw, h); g.drawImage(im, im.naturalWidth - sw, 0, sw, h, (i * 2 + 1) * sw, 0, sw, h); });
      g.globalCompositeOperation = 'destination-out'; const gr = g.createLinearGradient(0, 0, 0, h * 0.45); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, h * 0.45);
      const t = tex(c, 3, 1); t.wrapS = THREE.MirroredRepeatWrapping; S.landCache[l] = t;
      if (S.light === l) { land.material.map = t; land.material.needsUpdate = true; S.need = true; }
    });
  }
  function makeEnv(r) {
    const s = new THREE.Scene(), g = new THREE.BoxGeometry();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.55, 0.57), side: THREE.BackSide })));
    const L = (x, y, z, sx, sy, sz, v) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v * 1.02) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); s.add(m); };
    L(0, 2.9, 0, 7, .1, 4, 5); L(-5.9, 1.2, 0, .1, 2.4, 7, 7); L(5.9, 1.5, 0, .1, 1.4, 5, 2.5); L(0, 1.2, -5.9, 7, 2.2, .1, 3); L(0, -2.9, 0, 12, .1, 12, 0.25);
    const pm = new THREE.PMREMGenerator(r); const t = pm.fromScene(s, 0.04).texture; pm.dispose(); return t;
  }

  /* ---------- camera ---------- */
  const tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function W(x, y, z) { return apt.localToWorld(new THREE.Vector3(x, y, z)); }
  function fitR() {
    const P = S.plan, asp = innerWidth / innerHeight, vf = THREE.MathUtils.degToRad(asp < 1 ? 58 : 45), hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
    return (Math.hypot(P.W, P.D) * 0.5) / Math.tan(Math.min(vf, hf) / 2) * (asp < 1 ? 1.3 : 0.92);
  }
  function viewOffset() {
    if (S.mode === 'top') { const bar = root.querySelector('#t3bar').getBoundingClientRect().height || 0; camera.setViewOffset(innerWidth, innerHeight, 0, Math.round(bar * 0.45), innerWidth, innerHeight); }
    else camera.clearViewOffset();
  }
  function topPose(o = S.orbit) {
    const P = S.plan, c = W(P.W / 2, 0, P.D / 2);
    const p = new THREE.Vector3(c.x + o.r * Math.sin(o.ph) * Math.sin(o.th), o.r * Math.cos(o.ph), c.z + o.r * Math.sin(o.ph) * Math.cos(o.th));
    return { p, t: c.clone().setY(-0.2) };
  }
  function walkDir() { return new THREE.Vector3(Math.sin(S.yaw) * Math.cos(S.pitch), Math.sin(S.pitch), -Math.cos(S.yaw) * Math.cos(S.pitch)); }
  function walkPose() { return { p: S.pos.clone(), t: S.pos.clone().add(walkDir()) }; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function flyTo(from, to, dur, done) { S.anim = { from, to, t0: performance.now(), dur, done }; }
  function setFov() { const asp = innerWidth / innerHeight; camera.fov = S.mode === 'walk' ? (asp < 1 ? 78 : 66) : (asp < 1 ? 58 : 45); camera.updateProjectionMatrix(); }
  function applyMode(m) {
    S.mode = m; press('#t3mode', 'm', m); root.classList.toggle('top', m === 'top');
    ceiling.visible = m !== 'top'; outside.forEach(o => o.visible = m !== 'top');
    scene.background = m === 'top' ? new THREE.Color('#0d1116') : null; setFov(); viewOffset(); S.need = true;
  }
  function toTop() {
    if (S.mode === 'top' && !S.anim) return;
    const from = walkPose(); S.orbit.r = fitR();
    applyMode('top'); const to = topPose(); flyTo(from, to, 1100, () => hint('Toque num cômodo para entrar · arraste para girar'));
  }
  function enterRoom(rm) {
    if (!rm) return;
    const [vx, vz, lx, lz] = rm.view, vy = Math.atan2(lx - vx, -(lz - vz)), target = W(vx, EYE, vz);
    if (S.mode === 'top') {
      const from = topPose(); const yawW = S.mir ? -vy : vy;
      S.pos.copy(target); S.yaw = yawW; S.pitch = -0.08;
      applyMode('walk'); flyTo(from, walkPose(), 1400, () => hint('Arraste para olhar · toque no chão para andar'));
    } else walkToLocal(vx, vz, rm, vy);
  }
  /* rota simples pelas portas */
  function roomAt(x, z) { return S.plan.rooms.find(r => x >= r.r[0] && x <= r.r[2] && z >= r.r[1] && z <= r.r[3]); }
  function walkToLocal(x, z, rmTarget, yawLocal) {
    const lp = apt.worldToLocal(S.pos.clone()); const from = roomAt(lp.x, lp.z) || S.plan.rooms[1], to = rmTarget || roomAt(x, z);
    const pts = [];
    if (from && to && from !== to) {
      const hub = S.plan.hub;
      if (from.hall) pts.push(from.door, from.hall); else { if (from.id === 'varanda') pts.push(from.door); if (to.hall) pts.push(hub); }
      if (to.hall) { if (!from.hall) {} pts.push(to.hall, to.door); } else { if (from.hall) pts.push(hub); if (to.id === 'varanda') pts.push(to.door); }
    }
    pts.push([x, z]);
    S.path = { pts: pts.map(p => W(p[0], EYE, p[1])), i: 0, yawEnd: yawLocal == null ? null : (S.mir ? -yawLocal : yawLocal) };
  }
  function stepPath(dt) {
    const P = S.path; if (!P) return false; const tgt = P.pts[P.i];
    tmpV.subVectors(tgt, S.pos); tmpV.y = 0; const d = tmpV.length(), sp = 3.0 * dt;
    if (d > 0.02) { const wantYaw = Math.atan2(tmpV.x, -tmpV.z); S.yaw += angDiff(wantYaw, S.yaw) * Math.min(1, dt * 5); }
    if (d <= sp) { S.pos.set(tgt.x, EYE, tgt.z); P.i++; if (P.i >= P.pts.length) { const ye = P.yawEnd; S.path = null; if (ye != null) S.yawTo = ye; } }
    else S.pos.addScaledVector(tmpV.normalize(), sp);
    return true;
  }
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

  /* ---------- toque / mouse ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ptr = new Map(); let pd = 0, down = null;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; scene.add(ring);
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; if (ptr.size === 2) { const a = [...ptr.values()]; pd = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); down = null; } });
  canvas.addEventListener('pointermove', e => {
    if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId), dx = e.clientX - o[0], dy = e.clientY - o[1]; ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const a = [...ptr.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); zoom(pd / d); pd = d; return; }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) down.moved = true;
    if (!down || !down.moved || S.anim) return;
    const k = 1 / Math.min(innerWidth, innerHeight);
    if (S.mode === 'walk') { S.yaw -= dx * k * 2.2; S.pitch = Math.max(-1.1, Math.min(0.9, S.pitch + dy * k * 1.8)); S.yawTo = null; }
    else { S.orbit.th -= dx * k * 3; S.orbit.ph = Math.max(0.25, Math.min(1.25, S.orbit.ph - dy * k * 2.4)); }
    S.need = true;
  });
  const upH = e => { ptr.delete(e.pointerId); if (down && !down.moved && performance.now() - down.t < 450) tap(e.clientX, e.clientY); down = null; };
  canvas.addEventListener('pointerup', upH); canvas.addEventListener('pointercancel', e => { ptr.delete(e.pointerId); down = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(1 + e.deltaY * 0.001); }, { passive: false });
  function zoom(f) { if (S.mode === 'top') S.orbit.r = Math.max(7, Math.min(fitR() * 1.8, S.orbit.r * f)); else { camera.fov = Math.max(35, Math.min(90, camera.fov * f)); camera.updateProjectionMatrix(); } S.need = true; }
  function tap(x, y) {
    if (S.anim) return;
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(apt.children, true).find(h => h.object.visible && h.object.material !== M.glass);
    if (!hit) return;
    let p = hit.point.clone(); const lp = apt.worldToLocal(p.clone());
    const rm = roomAt(lp.x, lp.z); if (!rm) return;
    if (S.mode === 'top') { enterRoom(rm.hidden ? S.plan.rooms.find(r => r.id === 'living') : rm); return; }
    const [x0, z0, x1, z1] = rm.r, m = 0.4, tx = Math.max(x0 + m, Math.min(x1 - m, lp.x)), tz = Math.max(z0 + m, Math.min(z1 - m, lp.z));
    ring.position.copy(W(tx, 0.012, tz)); ring.material.opacity = 0.9; ring.userData.t = performance.now();
    walkToLocal(tx, tz, rm, null);
  }
  addEventListener('keydown', e => {
    if (!S.on) return;
    if (e.key === 'Escape') hide();
    if ((e.key === 'h' || e.key === 'H')) setClean(!S.clean);
    if (S.mode === 'walk' && /^(w|s|a|d|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/i.test(e.key)) {
      const f = walkDir().setY(0).normalize(), r = new THREE.Vector3().crossVectors(f, up), st = 0.35;
      if (/w|ArrowUp/i.test(e.key)) S.pos.addScaledVector(f, st); if (/s|ArrowDown/i.test(e.key)) S.pos.addScaledVector(f, -st);
      if (/^a$/i.test(e.key)) S.pos.addScaledVector(r, -st); if (/^d$/i.test(e.key)) S.pos.addScaledVector(r, st);
      if (e.key === 'ArrowLeft') S.yaw -= 0.12; if (e.key === 'ArrowRight') S.yaw += 0.12; S.need = true;
    }
  });

  /* ---------- comodos (chips) ---------- */
  function buildRoomChips() {
    const box_ = $('#t3rooms'); box_.innerHTML = '';
    S.plan.rooms.filter(r => !r.hidden).forEach(rm => { const b = document.createElement('button'); b.textContent = rm.n; b.onclick = () => enterRoom(rm); box_.appendChild(b); });
  }

  /* ---------- laco de desenho ---------- */
  let last = performance.now();
  function loop(t) {
    if (!S.on) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t; let moving = false;
    if (S.anim) {
      const a = S.anim, k = Math.min(1, (t - a.t0) / a.dur), e = ease(k);
      camera.position.lerpVectors(a.from.p, a.to.p, e); tmpV.lerpVectors(a.from.t, a.to.t, e); camera.lookAt(tmpV); moving = true;
      if (k >= 1) { S.anim = null; a.done && a.done(); }
    } else if (S.mode === 'walk') {
      if (stepPath(dt)) moving = true;
      if (S.yawTo != null) { const d = angDiff(S.yawTo, S.yaw); S.yaw += d * Math.min(1, dt * 4); if (Math.abs(d) < 0.01) S.yawTo = null; moving = true; }
      camera.position.copy(S.pos); camera.lookAt(tmpV.copy(S.pos).add(walkDir()));
    } else {
      if (S.intro) { const k = Math.min(1, (t - S.intro) / 2600); S.orbit.th = -1.25 + 0.8 * ease(k); S.orbit.r = fitR() * (1.45 - 0.45 * ease(k)); moving = true; if (k >= 1) { S.intro = 0; hint('Toque num cômodo para entrar · arraste para girar', 4200); } }
      const p = topPose(); camera.position.copy(p.p); camera.lookAt(p.t);
    }
    if (ring.material.opacity > 0) { ring.material.opacity = Math.max(0, 0.9 - (t - ring.userData.t) / 900); moving = true; }
    if (moving || S.need) { renderer.render(scene, camera); S.need = false; }
    // rotulos dos comodos
    if (S.mode === 'top' && !S.anim && !S.clean) {
      for (const l of labels) { tmpV.copy(W(l.p.x, l.p.y, l.p.z)).project(camera); const vis = tmpV.z < 1; l.el.style.display = vis ? '' : 'none'; l.el.style.transform = `translate(-50%,-50%) translate(${(tmpV.x + 1) / 2 * innerWidth}px,${(1 - tmpV.y) / 2 * innerHeight}px)`; }
      $('#t3labels').classList.add('on');
    } else $('#t3labels').classList.remove('on');
    requestAnimationFrame(loop);
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; setFov(); viewOffset(); S.need = true; }
  addEventListener('resize', () => { if (S.on) resize(); });

  /* ---------- abrir / fechar ---------- */
  function show(u, opts) {
    S.opts = opts; S.u = u; S.on = true; root.classList.add('on'); setClean(false);
    $('#t3k').textContent = `${u.floor}º andar · ${u.front ? 'frente' : 'fundos'} · ${u.area} m²`;
    $('#t3t').textContent = 'Apartamento ' + u.id + ' · tour 3D';
    const key = u.front ? 'front' : 'fundos';
    if (S.planKey !== key) build(key);
    S.mir = !u.east; apt.scale.x = S.mir ? -1 : 1; apt.position.x = S.mir ? S.plan.W : 0; apt.updateMatrixWorld(true);
    setStyle(S.style); setLight(opts.light || 'dia');
    resize(); applyMode('top'); S.anim = null; S.path = null; S.intro = performance.now();
    $('#t3load').classList.remove('on');
    last = performance.now(); requestAnimationFrame(loop);
  }
  function hide() { S.on = false; root.classList.remove('on'); S.opts.onClose && S.opts.onClose(); }
  return { show, hide };
}

const EYE_OFF = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8s2.3-4.5 6-4.5S14 8 14 8s-2.3 4.5-6 4.5S2 8 2 8z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M2.5 2.5l11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const EYE_ON = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8s2.3-4.5 6-4.5S14 8 14 8s-2.3 4.5-6 4.5S2 8 2 8z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

function injectCSS() {
  const s = document.createElement('style'); s.textContent = `
  #t3{position:fixed;inset:0;top:0;left:0;right:0;bottom:0;z-index:40;background:#0d1116;display:none;color:#eef1f4;font-family:Manrope,system-ui,-apple-system,sans-serif}
  #t3.on{display:block}
  #t3c{position:absolute;inset:0;top:0;left:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .t3ui{position:absolute;z-index:3;transition:opacity .35s}
  #t3.clean .t3ui,#t3.clean #t3labels,#t3.clean #t3hint{opacity:0;pointer-events:none}
  #t3top{top:max(12px,env(safe-area-inset-top));left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));display:flex;justify-content:space-between;align-items:flex-start;gap:10px;pointer-events:none}
  #t3top>*{pointer-events:auto}
  .t3title small{display:block;font-size:10.5px;letter-spacing:.2em;color:#d8b26a;font-weight:700;text-transform:uppercase}
  .t3title b{display:block;font-family:Fraunces,Georgia,serif;font-weight:400;font-size:24px;margin-top:3px;text-shadow:0 2px 12px rgba(0,0,0,.7)}
  .t3btns{display:flex;gap:8px}
  .t3g{display:flex;align-items:center;gap:7px;padding:10px 14px;border-radius:14px;font:inherit;font-size:13px;font-weight:700;color:#eef1f4;background:rgba(12,16,21,.78);border:1px solid rgba(255,255,255,.14);cursor:pointer}
  #t3bar{left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));width:min(760px,calc(100% - 24px));display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:18px;background:rgba(12,16,21,.82);border:1px solid rgba(255,255,255,.12)}
  .t3row{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .t3lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9aa4af;font-weight:700}
  .t3seg{display:flex;gap:2px;padding:3px;border-radius:12px;background:rgba(255,255,255,.06)}
  .t3seg button,.t3rooms button{font:inherit;font-size:12.5px;font-weight:700;color:#9aa4af;background:none;border:0;padding:8px 12px;border-radius:10px;cursor:pointer;white-space:nowrap}
  .t3seg button[aria-pressed="true"]{background:#d8b26a;color:#1a1408}
  .t3rooms{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .t3rooms::-webkit-scrollbar{display:none}
  .t3rooms button{border:1px solid rgba(255,255,255,.16);color:#eef1f4}
  #t3labels{position:absolute;inset:0;top:0;left:0;pointer-events:none;opacity:0;transition:opacity .4s;z-index:2}
  #t3labels.on{opacity:1}
  .t3label{position:absolute;left:0;top:0;pointer-events:auto;display:flex;flex-direction:column;align-items:center;padding:6px 10px;border-radius:12px;background:rgba(12,16,21,.8);border:1px solid rgba(216,178,106,.5);color:#eef1f4;font:inherit;cursor:pointer;white-space:nowrap}
  .t3label b{font-size:12.5px;font-weight:700}.t3label small{font-size:10.5px;color:#d8b26a}
  #t3hint{position:absolute;left:50%;top:max(84px,calc(env(safe-area-inset-top) + 72px));transform:translateX(-50%);z-index:4;padding:9px 14px;border-radius:999px;background:rgba(12,16,21,.85);border:1px solid rgba(255,255,255,.14);font-size:13px;opacity:0;transition:opacity .4s;pointer-events:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
  #t3hint.on{opacity:1}
  #t3show{position:absolute;z-index:5;right:max(14px,env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));display:none}
  #t3.clean #t3show{display:flex}
  #t3load{position:absolute;inset:0;top:0;left:0;z-index:6;display:none;place-items:center;background:#0d1116}
  #t3load.on{display:grid}
  #t3load div{text-align:center}#t3load b{display:block;font-family:Fraunces,Georgia,serif;font-weight:400;font-size:24px}
  @media (max-width:699px){
    .t3title b{font-size:18px}.t3title small{font-size:9.5px}
    #t3bar{padding:8px;gap:6px;border-radius:16px}
    .t3seg button,.t3rooms button{padding:7px 9px;font-size:12px}
    .t3lab{display:none}
    .t3row{justify-content:center}
  }
  @media (orientation:landscape) and (max-height:500px){
    #t3bar{flex-direction:row;align-items:center;width:calc(100% - 24px);gap:6px;padding:6px;overflow-x:auto;scrollbar-width:none}
    #t3bar::-webkit-scrollbar{display:none}
    .t3row{flex-wrap:nowrap;flex:none}.t3lab{display:none}.t3rooms{overflow:visible;flex:none}
    .t3seg button,.t3rooms button{padding:6px 9px;font-size:11.5px}
    .t3title b{font-size:17px}
  }`;
  document.head.appendChild(s);
}
