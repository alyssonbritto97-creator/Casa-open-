// Casa em 3D: você entra, anda por dentro e vê cada parte, sem depender de internet.
// Lê os dados de cada parte pela função window.__h3dData() (definida pelo app) e nunca
// decide sozinho o estado das partes: só desenha o que o app manda.
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';

const COLOR_FALLBACK = 0x9aa7b5;
const WALL_H = 2.7, GROUND_Y = 0;

function makeLabel(text, bg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = bg || 'rgba(11,29,77,.92)'; roundRect(x, 4, 4, 248, 56, 16); x.fill();
  x.fillStyle = '#fff'; x.font = '700 30px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 32, 240);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sp = new THREE.Sprite(mat); sp.scale.set(1.6, 0.6, 1); sp.renderOrder = 10;
  return sp;
}
function roundRect(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }

export function createHouse3D() {
  let renderer, scene, camera, controls, root;
  let meshes = {}, sprites = {}, mounted = false, mode = 'out', raf = 0;
  const look = { yaw: Math.PI, pitch: 0 }, walkAt = new THREE.Vector3();
  let dragging = false, lastX = 0, lastY = 0;
  let w = 1, h = 1, root2Light = null;
  const raycaster = new THREE.Raycaster();
  const outCenter = new THREE.Vector3(0, 1.4, 0.3), outPos = new THREE.Vector3(9, 6.5, 10);
  const walkPos = new THREE.Vector3(0, 1.55, 1.3), walkYaw = { a: 0 };

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(58, 1, 0.08, 120);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    buildScene();
    setMode('out', true);
    renderer.domElement.addEventListener('pointerdown', ev => { dragging = true; lastX = ev.clientX; lastY = ev.clientY; });
    window.addEventListener('pointerup', () => { dragging = false; });
    renderer.domElement.addEventListener('pointermove', ev => {
      if (!dragging) return;
      const dx = ev.clientX - lastX, dy = ev.clientY - lastY; lastX = ev.clientX; lastY = ev.clientY;
      if (mode === 'in') { look.yaw -= dx * 0.006; look.pitch = Math.max(-1.1, Math.min(1.1, look.pitch - dy * 0.006)); }
    });
    renderer.domElement.addEventListener('click', onPick);
    window.addEventListener('keydown', onKey);
    loop();
  }

  function sky(night) { scene.background = new THREE.Color(night ? 0x0f1c3d : 0xaee3f7); scene.fog = new THREE.Fog(scene.background.getHex(), 16, 46); }

  function buildScene() {
    const H = new Date().getHours(), night = H < 6 || H >= 18;
    sky(night);
    scene.add(new THREE.HemisphereLight(night ? 0x24355c : 0xcfe9ff, 0x3a2f22, night ? 0.55 : 0.95));
    scene.add(new THREE.AmbientLight(0xffffff, night ? 0.55 : 0.85));
    const roomLight = new THREE.PointLight(0xfff4e0, 1.2, 9, 1.6); roomLight.position.set(0, 2.3, 0); root2Light = roomLight;
    const sun = new THREE.DirectionalLight(night ? 0x5f7bd9 : 0xfff4d6, night ? 0.35 : 1.05);
    sun.position.set(8, 14, 6); scene.add(sun);
    if (!night) { const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd45c })); sunMesh.position.set(9, 9, -8); scene.add(sunMesh); }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: night ? 0x234a3c : 0x7ec463, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    root = new THREE.Group(); scene.add(root);

    // ---- cômodos (plantas reais: quarto1, quarto2, sala, cozinha, banheiro) ----
    const rooms = [
      { k: 'quarto1', x: -2.5, z: -2.0, w: 4.9, d: 2.5 },
      { k: 'quarto2', x: 2.5, z: -2.0, w: 4.9, d: 2.5 },
      { k: 'sala', x: -3.3, z: 1.25, w: 3.2, d: 3.9 },
      { k: 'cozinha', x: 0, z: 1.25, w: 3.2, d: 3.9 },
      { k: 'banheiro', x: 3.3, z: 1.25, w: 3.2, d: 3.9 }
    ];
    const FOOT = { x0: -5, x1: 5, z0: -3.25, z1: 3.25 };
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xeadfc3, roughness: 0.9, side: THREE.DoubleSide });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.2, 6.7), floorMat);
    slab.position.set(0, -0.1, 0); slab.receiveShadow = true; root.add(slab);
    rooms.forEach(r => {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(r.w - 0.14, 0.05, r.d - 0.14), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      floor.position.set(r.x, 0.03, r.z); floor.userData.key = r.k; floor.userData.pick = true;
      root.add(floor); meshes[r.k] = floor;
      const lab = makeLabel(r.k); lab.position.set(r.x, 2.55, r.z); root.add(lab); sprites[r.k] = lab;
    });
    // paredes internas e externas (caixa oca)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfbf3e3, roughness: 0.95, side: THREE.DoubleSide });
    const addWall = (x, z, w2, d2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, WALL_H, d2), wallMat); m.position.set(x, WALL_H / 2, z); m.castShadow = true; root.add(m); return m; };
    const t = 0.12;
    addWall(0, FOOT.z0, 10 + t, t); // norte
    addWall(0, FOOT.z1, 10 + t, t); // sul
    addWall(FOOT.x0, 0, t, 6.5 + t); // oeste
    addWall(FOOT.x1, 0, t, 6.5 + t); // leste
    addWall(0, -0.75, 10, t); // divisória norte/sul
    addWall(-5 + (10 / 2), -2, t, 2.5); // quarto1|quarto2
    addWall(-1.6, 1.25, t, 3.9); // sala|cozinha
    addWall(1.6, 1.25, t, 3.9); // cozinha|banheiro
    meshes.walls_ext = addWall(-5 + 10 / 2, -0.75, 0.001, 0.001); meshes.walls_ext.visible = false;
    // porta (vão na parede sul, lado da sala) — fica sempre aberta visualmente
    const doorHole = new THREE.Mesh(new THREE.BoxGeometry(1.0, WALL_H - 0.1, t + 0.02), new THREE.MeshBasicMaterial({ visible: false }));
    doorHole.position.set(-3.3, (WALL_H - 0.1) / 2, FOOT.z1);
    // telhado
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xa6523a, roughness: 0.85, side: THREE.DoubleSide });
    const roofGeo = new THREE.ConeGeometry(7.6, 2.0, 4, 1); roofGeo.rotateY(Math.PI / 4);
    scene.add(root2Light);
    const roof = new THREE.Mesh(roofGeo, roofMat); roof.position.set(0, WALL_H + 1.0, 0); roof.scale.set(1, 1, 0.86);
    roof.userData.key = 'roof'; roof.userData.pick = true; roof.castShadow = true; root.add(roof); meshes.roof = roof;
    sprites.roof = makeLabel('roof'); sprites.roof.position.set(0, WALL_H + 2.3, 0); root.add(sprites.roof);
    // caixa d'água
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0xdfe7ee }));
    tank.position.set(2.2, WALL_H + 1.9, -1.2); tank.userData.key = 'tank'; tank.userData.pick = true; root.add(tank); meshes.tank = tank;
    sprites.tank = makeLabel('tank'); sprites.tank.position.copy(tank.position).add(new THREE.Vector3(0, 0.7, 0)); root.add(sprites.tank);
    // calha
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: 0x8fa6e0 }));
    gutter.position.set(0, WALL_H + 0.02, -3.3); gutter.userData.key = 'gutter'; gutter.userData.pick = true; root.add(gutter); meshes.gutter = gutter;
    // janelas (decorativas, nas 4 fachadas)
    const winMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.2, metalness: 0.1 });
    const winGeo = new THREE.BoxGeometry(0.9, 1.1, 0.06);
    const winPos = [[-3.3, 1.35, FOOT.z0 + 0.06], [3.3, 1.35, FOOT.z0 + 0.06], [FOOT.x0 + 0.06, 1.35, -2], [FOOT.x1 - 0.06, 1.35, -2], [FOOT.x0 + 0.06, 1.35, 1.25], [FOOT.x1 - 0.06, 1.35, 1.25]];
    const winGroup = new THREE.Group();
    winPos.forEach(p => { const m = new THREE.Mesh(winGeo, winMat); m.position.set(p[0], p[1], p[2]); winGroup.add(m); });
    winGroup.userData.key = 'windows'; winGroup.userData.pick = true; winGroup.children.forEach(c => { c.userData.key = 'windows'; c.userData.pick = true; });
    root.add(winGroup); meshes.windows = winGroup;
    sprites.windows = makeLabel('windows'); sprites.windows.position.set(FOOT.x1 + 0.4, 1.8, 1.25); root.add(sprites.windows);
    // elétrica (quadro externo)
    const elec = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.12), new THREE.MeshStandardMaterial({ color: 0x37474f }));
    elec.position.set(FOOT.x0 - 0.12, 1.3, -2.8); elec.userData.key = 'electric'; elec.userData.pick = true; root.add(elec); meshes.electric = elec;
    sprites.electric = makeLabel('electric'); sprites.electric.position.copy(elec.position).add(new THREE.Vector3(0, 0.6, 0)); root.add(sprites.electric);
    // encanamento / gás / esgoto / painel solar — marcadores próximos ao local real
    const marker = (key, x, y, z, color) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), new THREE.MeshStandardMaterial({ color: color || 0x8899aa })); m.position.set(x, y, z); m.userData.key = key; m.userData.pick = true; root.add(m); meshes[key] = m; sprites[key] = makeLabel(key); sprites[key].position.set(x, y + 0.5, z); root.add(sprites[key]); };
    marker('plumbing', FOOT.x1 + 0.3, 0.25, 1.4);
    marker('gas', 0.6, 0.25, 3.0);
    marker('sewer', FOOT.x1 + 1.6, 0.05, 2.4, 0x6d5c47);
    marker('solar', 1.8, WALL_H + 1.35, -1.6, 0x1e3a78);
    // jardim e muro e portão
    const garden = new THREE.Mesh(new THREE.RingGeometry(7.8, 16, 48), new THREE.MeshStandardMaterial({ color: night ? 0x234a3c : 0x7ec463 }));
    garden.rotation.x = -Math.PI / 2; garden.userData.key = 'garden'; garden.userData.pick = true; root.add(garden); meshes.garden = garden;
    const wallFence = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 0.25), new THREE.MeshStandardMaterial({ color: 0xdcc6a8 }));
    wallFence.position.set(-8.4, 0.55, -2.6); wallFence.userData.key = 'wall'; wallFence.userData.pick = true; root.add(wallFence); meshes.wall = wallFence;
    sprites.wall = makeLabel('wall'); sprites.wall.position.copy(wallFence.position).add(new THREE.Vector3(0, 0.9, 0)); root.add(sprites.wall);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 0.1), new THREE.MeshStandardMaterial({ color: 0xb0bec5 }));
    gate.position.set(8.3, 0.7, 3.4); gate.userData.key = 'gate'; gate.userData.pick = true; root.add(gate); meshes.gate = gate;
    sprites.gate = makeLabel('gate'); sprites.gate.position.copy(gate.position).add(new THREE.Vector3(0, 1.0, 0)); root.add(sprites.gate);
    // extras opcionais (só aparecem se a casa tem / fantasma se é plano futuro)
    const EXTRA = { pool: [-6.6, 0.02, 3.6, 2.6, 1.4], garage: [6.6, 0.9, -2.6, 2.6, 1.8], bbq: [-6.8, 0.5, -3.1, 1.0, 1.0], security: [5.2, 2.9, -3.1, 0.3, 0.2] };
    Object.keys(EXTRA).forEach(k => {
      const [x, y, z, sx, sy] = EXTRA[k];
      const geo = k === 'pool' ? new THREE.BoxGeometry(sx, 0.3, 1.8) : new THREE.BoxGeometry(sx, sy, sx * 0.8);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: k === 'pool' ? 0x2b9ccf : 0xb0bec5, transparent: true }));
      m.position.set(x, y, z); m.userData.key = k; m.userData.pick = true; root.add(m); meshes[k] = m;
      sprites[k] = makeLabel(k); sprites[k].position.set(x, y + sy / 2 + 0.5, z); root.add(sprites[k]);
    });
  }

  function statusColor(st) { return { ok: 0x2fb88a, watch: 0xe4a43d, broken: 0xe0455f, fixing: 0x4a8fe0, unk: COLOR_FALLBACK, future: 0x8fa6e0 }[st] || COLOR_FALLBACK; }

  function refresh() {
    const data = (window.__h3dData && window.__h3dData()) || {};
    Object.keys(meshes).forEach(k => {
      const mesh = meshes[k], info = data[k];
      if (!info) { if (sprites[k]) sprites[k].visible = false; return; }
      const optional = info.has !== undefined;
      const show = !optional || info.has === 'yes' || info.has === 'future';
      mesh.visible = show; if (sprites[k]) sprites[k].visible = show;
      const ghost = optional && info.has === 'future';
      const color = statusColor(ghost ? 'future' : info.status);
      (mesh.isGroup ? mesh.children : [mesh]).forEach(mm => { if (mm.material) { mm.material.color && mm.material.color.setHex(color); mm.material.transparent = ghost || mm.material.transparent; mm.material.opacity = ghost ? 0.45 : 1; mm.material.wireframe = !!ghost; } });
    });
  }

  function onKey(e) {
    if (mode !== 'in') return;
    const step = 0.35;
    if (e.key === 'ArrowUp' || e.key === 'w') moveWalk(0, -step);
    if (e.key === 'ArrowDown' || e.key === 's') moveWalk(0, step);
    if (e.key === 'ArrowLeft' || e.key === 'a') moveWalk(-step, 0);
    if (e.key === 'ArrowRight' || e.key === 'd') moveWalk(step, 0);
  }
  function moveWalk(dx, dz) {
    if (mode !== 'in') return;
    const dir = new THREE.Vector3(Math.sin(look.yaw), 0, Math.cos(look.yaw));
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    walkAt.addScaledVector(dir, -dz).addScaledVector(side, dx);
    walkAt.x = Math.max(-4.6, Math.min(4.6, walkAt.x)); walkAt.z = Math.max(-3.0, Math.min(3.15, walkAt.z)); walkAt.y = 1.55;
  }
  function onPick(ev) {
    if (ev.moved) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1, my = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: mx, y: my }, camera);
    const hits = raycaster.intersectObjects(root.children, true).filter(h => h.object.visible);
    for (const hdata of hits) { let o = hdata.object; while (o && !o.userData.pick) o = o.parent; if (o && o.userData.pick) { window.__h3dPick && window.__h3dPick(o.userData.key); return; } }
  }
  function setMode(m) {
    mode = m;
    controls.enabled = (m === 'out');
    if (m === 'out') {
      camera.position.copy(outPos); controls.target.copy(outCenter);
      controls.minDistance = 4; controls.maxDistance = 22; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.45; controls.enablePan = false;
      controls.update(); meshes.roof.visible = true; sprites.roof.visible = true;
    } else {
      walkAt.copy(walkPos); look.yaw = Math.PI; look.pitch = 0;
      meshes.roof.visible = false; sprites.roof.visible = false; if (root2Light) root2Light.intensity = 1.6;
    }
    refresh();
  }
  function applyLook() {
    if (root2Light) root2Light.position.set(walkAt.x, 2.3, walkAt.z);
    camera.position.copy(walkAt);
    const dir = new THREE.Vector3(Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), Math.cos(look.yaw) * Math.cos(look.pitch));
    camera.lookAt(walkAt.clone().add(dir));
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    refresh();
    if (mode === 'in') applyLook(); else controls.update();
    renderer.render(scene, camera);
  }
  function resize(ww, hh) { if (!renderer) return; w = Math.max(1, ww); h = Math.max(1, hh); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function destroy() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); }

  return {
    mount(canvas) { if (mounted) return; mounted = true; init(canvas); },
    isMounted: () => mounted,
    resize, setMode, moveWalk,
    getMode: () => mode,
    debug: () => ({cam: camera.position.toArray(), tgt: controls.target.toArray(), near: camera.near})
  };
}
