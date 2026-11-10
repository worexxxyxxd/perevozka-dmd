/* Первый экран: Газель PEREVOZKA_DMD едет по ночной дороге.
   Камера неподвижна, машина видна боком (реклама к зрителю). Вращать нельзя. */
(function () {
  const wrap = document.getElementById('heroScene');
  const canvas = document.getElementById('heroCanvas');
  if (!wrap || !canvas) return;

  const fallback = () => {
    canvas.hidden = true;
    wrap.querySelector('.hero__fallback').hidden = false;
  };
  if (!window.THREE) { fallback(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { fallback(); return; }

  // машина «едет» всегда — это главный элемент экрана; при «уменьшить анимацию» убираем только покачивание
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceMotion = false;
  const isSmall = window.innerWidth < 700;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1322, 18, 46);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 120);

  // ---------- окружение для отражений ----------
  (function env() {
    const e = new THREE.Scene();
    e.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x0c1322, side: THREE.BackSide })));
    const soft = (w, h, c, x, y, z, rx, ry) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      p.position.set(x, y, z); p.rotation.set(rx || 0, ry || 0, 0); e.add(p);
    };
    soft(26, 10, new THREE.Color(1.4, 1.5, 1.8), 0, 19, 0, Math.PI / 2);
    soft(14, 7, new THREE.Color(1.2, 1.2, 1.3), 0, 5, 19, 0, Math.PI);
    soft(10, 6, new THREE.Color(1.8, 0.9, 0.35), -19, 4, 0, 0, Math.PI / 2);
    soft(10, 6, new THREE.Color(0.5, 0.7, 1.3), 19, 4, 0, 0, -Math.PI / 2);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(e, 0.04).texture;
    pm.dispose();
  })();

  // ---------- свет: ночь, но борт с рекламой хорошо освещён ----------
  scene.add(new THREE.HemisphereLight(0x9fb6ff, 0x0b1020, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(3, 9, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const warm = new THREE.DirectionalLight(0xff9a3d, 0.8);
  warm.position.set(-10, 4, 2);
  scene.add(warm);

  // ---------- материалы ----------
  const S = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.1 }, o));
  const P = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.3, metalness: 0.2 }, o));
  const mat = {
    paint: P(0x1a47bd, { metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }),
    fairing: P(0xf5f7fa, { metalness: 0.05, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    panel: S(0xdfe4ea, { metalness: 0.35, roughness: 0.42 }),
    alu: S(0xc3cad3, { metalness: 0.85, roughness: 0.28 }),
    plastic: S(0x1c2129, { roughness: 0.7 }),
    chrome: S(0xe6e9ee, { metalness: 1, roughness: 0.12 }),
    tire: S(0x15181d, { roughness: 0.92 }),
    rim: S(0xbfc5cd, { metalness: 0.9, roughness: 0.25 }),
    glass: P(0x0b1526, { metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.6, side: THREE.DoubleSide }),
    lamp: S(0xffffff, { emissive: 0xfff3d6, emissiveIntensity: 2.2, roughness: 0.2 }),
    turn: S(0xff9a2e, { emissive: 0xff7a1a, emissiveIntensity: 1.2 }),
    tail: S(0xff3b2f, { emissive: 0xff2a1a, emissiveIntensity: 1.6 }),
    plate: S(0xf4f4f4, { roughness: 0.5 }),
    ground: S(0x070b12, { roughness: 1 }),
    asphalt: S(0x0d1119, { roughness: 0.8, metalness: 0.1 }),
    line: S(0xe9edf2, { roughness: 0.6, emissive: 0x30343a }),
    pole: S(0x2a3140, { metalness: 0.6, roughness: 0.4 }),
    lampHead: S(0xffe2b0, { emissive: 0xffc777, emissiveIntensity: 2.5 }),
  };

  const mesh = (geo, material, x = 0, y = 0, z = 0, cast = true) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
    return m;
  };
  const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (rt, rb, h, m, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  function roundBox(w, h, d, r, material) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -(d - 0.04) / 2);
    return mesh(g, material);
  }

  // ---------- реклама на борту ----------
  function brandMaterial() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#f6f8fb'); grad.addColorStop(1, '#dce1e8');
    g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(14,23,38,.05)';
    for (let x = 128; x < c.width; x += 128) g.fillRect(x, 0, 3, c.height);
    g.fillStyle = '#ff7a1a';
    g.beginPath(); g.moveTo(0, 392); g.lineTo(1024, 330); g.lineTo(1024, 410); g.lineTo(0, 472); g.closePath(); g.fill();
    g.fillStyle = '#0e1726';
    g.beginPath(); g.moveTo(0, 472); g.lineTo(1024, 410); g.lineTo(1024, 430); g.lineTo(0, 492); g.closePath(); g.fill();
    const head = '"Unbounded", "Arial Black", sans-serif';
    let size = 104, w1, w2;
    do {
      g.font = `800 ${size}px ${head}`;
      w1 = g.measureText('PEREVOZKA').width; w2 = g.measureText('_DMD').width; size -= 4;
    } while (w1 + w2 > 860 && size > 40);
    const x0 = (c.width - (w1 + w2)) / 2;
    g.fillStyle = '#0e1726'; g.fillText('PEREVOZKA', x0, 180);
    g.fillStyle = '#ff7a1a'; g.fillText('_DMD', x0 + w1, 180);
    g.textAlign = 'center';
    g.fillStyle = '#4a5466';
    g.font = '700 40px "Manrope", Arial, sans-serif';
    g.fillText('ГРУЗОПЕРЕВОЗКИ · ПЕРЕЕЗДЫ · 24/7', c.width / 2, 245, 860);
    g.fillStyle = '#0e1726';
    g.font = `800 60px ${head}`;
    g.fillText('+7 926 282-34-57', c.width / 2, 322, 860);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.15 });
  }

  // ===================== ГАЗЕЛЬ =====================
  const truck = new THREE.Group();
  scene.add(truck);
  const body = new THREE.Group();   // всё, что «покачивается» на подвеске
  truck.add(body);

  const WR = 0.43, FRONT_X = 2.55, REAR_X = -1.45;
  const wheels = [];
  function tireRim(z) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(0.315, 0.115, 16, 40), mat.tire));
    const dish = cyl(0.25, 0.25, 0.2, mat.rim, 28); dish.rotation.x = Math.PI / 2; g.add(dish);
    const hub = cyl(0.085, 0.1, 0.24, mat.chrome, 16); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const n = cyl(0.022, 0.022, 0.23, mat.chrome, 8); n.rotation.x = Math.PI / 2;
      n.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0); g.add(n);
    }
    // спица-ориентир, чтобы было видно вращение
    g.add(box(0.05, 0.36, 0.205, mat.plastic, 0, 0, 0));
    g.position.z = z;
    return g;
  }
  function wheel(x, z, dual) {
    const g = new THREE.Group();
    const side = Math.sign(z);
    if (dual) { g.add(tireRim(-0.125 * side)); g.add(tireRim(0.125 * side)); } else g.add(tireRim(0));
    g.position.set(x, WR, z);
    wheels.push(g);
    return g;
  }
  [[FRONT_X, 0.87, false], [FRONT_X, -0.87, false], [REAR_X, 0.82, true], [REAR_X, -0.82, true]]
    .forEach(([x, z, d]) => truck.add(wheel(x, z, d)));

  // рама и низ
  body.add(box(5.95, 0.16, 0.86, mat.plastic, -0.1, 0.74, 0));
  [0.72, 0.56].forEach((y) => [-1, 1].forEach((s) => body.add(box(2.15, 0.045, 0.04, mat.alu, 0.15, y, s * 1.02))));
  const tank = cyl(0.19, 0.19, 0.75, mat.alu, 20); tank.rotation.z = Math.PI / 2; tank.position.set(0.55, 0.6, -0.62); body.add(tank);
  [-1, 1].forEach((s) => {
    body.add(mesh(new THREE.TorusGeometry(0.52, 0.045, 8, 24, Math.PI), mat.plastic, REAR_X, WR, s * 0.85));
    body.add(box(0.02, 0.36, 0.42, mat.plastic, REAR_X - 0.62, 0.42, s * 0.85));
  });
  body.add(roundBox(0.14, 0.14, 1.95, 0.04, mat.alu).translateX(-3.12).translateY(0.66));
  [-1, 1].forEach((s) => body.add(box(0.07, 0.13, 0.28, mat.tail, -3.17, 0.66, s * 0.78)));

  // кабина по силуэту
  const cab = new THREE.Shape();
  cab.moveTo(1.32, 0.55); cab.lineTo(2.03, 0.55);
  cab.absarc(FRONT_X, WR, 0.54, Math.PI - 0.22, 0.22, true);
  cab.lineTo(3.3, 0.55); cab.lineTo(3.36, 0.66); cab.lineTo(3.37, 1.05);
  cab.quadraticCurveTo(3.37, 1.43, 3.04, 1.55);
  cab.lineTo(2.92, 1.62); cab.lineTo(2.32, 2.38);
  cab.quadraticCurveTo(2.2, 2.49, 1.98, 2.49); cab.lineTo(1.32, 2.46); cab.closePath();
  const CAB_D = 1.84, CAB_B = 0.07, CAB_SIDE = CAB_D / 2 + CAB_B;
  const cabGeo = new THREE.ExtrudeGeometry(cab, { depth: CAB_D, bevelEnabled: true, bevelThickness: CAB_B, bevelSize: CAB_B, bevelSegments: 5, curveSegments: 24 });
  cabGeo.translate(0, 0, -CAB_D / 2);
  body.add(mesh(cabGeo, mat.paint));

  const wDir = new THREE.Vector2(-0.6, 0.76).normalize();
  const wNorm = new THREE.Vector2(wDir.y, -wDir.x);
  const wind = box(0.02, 0.9, 1.78, mat.glass, 2.62 + wNorm.x * 0.085, 2.0 + wNorm.y * 0.085, 0);
  wind.rotation.z = Math.asin(-wDir.x);
  body.add(wind);

  const win = new THREE.Shape();
  win.moveTo(1.52, 1.72); win.lineTo(2.79, 1.72); win.lineTo(2.36, 2.27);
  win.quadraticCurveTo(2.3, 2.31, 2.2, 2.31); win.lineTo(1.52, 2.31); win.closePath();
  [-1, 1].forEach((s) => {
    body.add(mesh(new THREE.ShapeGeometry(win), mat.glass, 0, 0, s * (CAB_SIDE + 0.004), false));
    body.add(box(0.012, 1.6, 0.012, mat.plastic, 1.45, 1.42, s * (CAB_SIDE + 0.004)));
    body.add(box(0.16, 0.035, 0.03, mat.plastic, 1.66, 1.55, s * (CAB_SIDE + 0.012)));
    body.add(box(0.09, 0.04, 0.02, mat.turn, 3.12, 1.12, s * (CAB_SIDE + 0.006)));
    const arch = mesh(new THREE.TorusGeometry(0.545, 0.035, 8, 28, Math.PI - 0.44), mat.plastic, FRONT_X, WR, s * (CAB_SIDE - 0.02));
    arch.rotation.z = 0.22; body.add(arch);
    body.add(box(0.42, 0.05, 0.22, mat.plastic, 1.72, 0.5, s * 0.9));
    body.add(box(0.05, 0.05, 0.2, mat.plastic, 2.86, 1.82, s * (CAB_SIDE + 0.08)));
    body.add(roundBox(0.08, 0.34, 0.16, 0.03, mat.plastic).translateX(2.84).translateY(1.95).translateZ(s * (CAB_SIDE + 0.2)));
  });

  body.add(roundBox(0.06, 0.32, 1.0, 0.04, mat.plastic).translateX(3.42).translateY(0.98));
  [1.11, 0.98, 0.85].forEach((y) => body.add(box(0.03, 0.025, 0.96, mat.chrome, 3.455, y, 0)));
  [-1, 1].forEach((s) => {
    const hl = roundBox(0.08, 0.17, 0.42, 0.05, mat.lamp);
    hl.position.set(3.38, 1.27, s * 0.66); hl.rotation.y = s * 0.12; body.add(hl);
    const fog = cyl(0.055, 0.055, 0.04, mat.lamp, 16); fog.rotation.z = Math.PI / 2; fog.position.set(3.57, 0.66, s * 0.74); body.add(fog);
  });
  body.add(roundBox(0.2, 0.28, 2.04, 0.06, mat.plastic).translateX(3.46).translateY(0.67));
  body.add(box(0.02, 0.11, 0.5, mat.plate, 3.565, 0.7, 0));

  // белый обтекатель
  const fair = new THREE.Shape();
  fair.moveTo(2.3, 2.44); fair.quadraticCurveTo(1.9, 3.13, 1.27, 3.13); fair.lineTo(1.27, 2.44); fair.closePath();
  const fairGeo = new THREE.ExtrudeGeometry(fair, { depth: 1.84, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 5, curveSegments: 20 });
  fairGeo.translate(0, 0, -0.92);
  body.add(mesh(fairGeo, mat.fairing));

  // фургон
  const BX0 = -3.06, BX1 = 1.25, BY0 = 0.95, BY1 = 3.12, BW = 2.12;
  const L = BX1 - BX0, H = BY1 - BY0, CX = (BX0 + BX1) / 2, CY = (BY0 + BY1) / 2;
  const brand = brandMaterial();
  const vanMats = [mat.panel, mat.panel, mat.panel, mat.panel, brand, brand]; // реклама на обоих бортах
  body.add(mesh(new THREE.BoxGeometry(L, H, BW), vanMats, CX, CY, 0));
  body.add(box(L, 0.12, BW + 0.02, mat.plastic, CX, BY0 - 0.08, 0));
  const vEdge = (x, z) => { const c = cyl(0.045, 0.045, H + 0.06, mat.alu, 12); c.position.set(x, CY, z); body.add(c); };
  const hEdge = (y, z) => { const c = cyl(0.045, 0.045, L + 0.06, mat.alu, 12); c.rotation.z = Math.PI / 2; c.position.set(CX, y, z); body.add(c); };
  [-1, 1].forEach((s) => { vEdge(BX1, s * BW / 2); vEdge(BX0, s * BW / 2); hEdge(BY0 + 0.02, s * BW / 2); hEdge(BY1, s * BW / 2); });

  // свет фар: конус и прожектор
  const head = new THREE.SpotLight(0xfff1d0, 2.2, 22, 0.45, 0.6, 1.2);
  head.position.set(3.5, 1.2, 0);
  head.target.position.set(14, 0, 0);
  truck.add(head, head.target);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe6b8, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  [-1, 1].forEach((s) => {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6, 24, 1, true), beamMat);
    beam.rotation.z = Math.PI / 2; beam.position.set(3.5 + 3, 1.0, s * 0.66);
    truck.add(beam);
  });

  truck.position.x = -0.35;

  // ===================== ДОРОГА И ОКРУЖЕНИЕ =====================
  scene.add(mesh(new THREE.PlaneGeometry(140, 60).rotateX(-Math.PI / 2), mat.ground, 0, -0.01, -10, false));
  scene.add(mesh(new THREE.PlaneGeometry(140, 7).rotateX(-Math.PI / 2), mat.asphalt, 0, 0, -1.2, false));
  [2.2, -4.6].forEach((z) => scene.add(mesh(new THREE.PlaneGeometry(140, 0.1).rotateX(-Math.PI / 2), mat.line, 0, 0.004, z, false)));

  const ROAD_SPAN = 60;
  const dashes = [];
  for (let i = 0; i < 24; i++) {
    const d = mesh(new THREE.PlaneGeometry(1.4, 0.12).rotateX(-Math.PI / 2), mat.line, -ROAD_SPAN / 2 + i * (ROAD_SPAN / 24), 0.005, -1.25, false);
    scene.add(d); dashes.push(d);
  }
  // бордюр на ближней стороне
  const curb = mesh(new THREE.BoxGeometry(140, 0.14, 0.3), S(0x3a4352, { roughness: 0.8 }), 0, 0.07, 2.5, false);
  scene.add(curb);

  // фонари вдоль дальней стороны
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(0.25, 'rgba(255,170,90,.45)'); r.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const LAMP_SPAN = 64;
  const lamps = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const pole = cyl(0.06, 0.08, 4.6, mat.pole, 10); pole.position.y = 2.3; g.add(pole);
    const arm = box(1.2, 0.06, 0.06, mat.pole, 0, 0, 0); arm.position.set(0, 4.55, 0.5); arm.rotation.y = Math.PI / 2; g.add(arm);
    const headL = box(0.4, 0.1, 0.22, mat.lampHead, 0, 4.48, 1.05); g.add(headL);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(2.6, 2.6, 1); sp.position.set(0, 4.4, 1.05); g.add(sp);
    // световое пятно на асфальте
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.position.set(0, 0.006, 1.3); g.add(pool);
    g.position.set(-LAMP_SPAN / 2 + i * (LAMP_SPAN / 8), 0, -5.4);
    scene.add(g); lamps.push(g);
  }

  // город на горизонте (окна светятся)
  function windowsTexture(seed) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, 64, 128);
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let y = 6; y < 124; y += 9) for (let x = 5; x < 60; x += 9) {
      const v = rnd();
      if (v > 0.62) { g.fillStyle = v > 0.9 ? '#9cc2ff' : '#ffcf8a'; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(x, y, 5, 5); g.globalAlpha = 1; }
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const CITY_SPAN = 90;
  const city = [];
  for (let i = 0; i < 26; i++) {
    const w = 2 + (i * 37 % 5) * 0.8, h = 3 + (i * 53 % 9) * 1.1, d = 2 + (i % 3);
    const tex = windowsTexture(i * 97 + 13);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, w / 2), Math.max(1, h / 4));
    const m = new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 });
    const b = mesh(new THREE.BoxGeometry(w, h, d), m, -CITY_SPAN / 2 + i * (CITY_SPAN / 26), h / 2, -24 - (i % 4) * 3, false);
    scene.add(b); city.push(b);
  }

  // ===================== КАМЕРА И РЕНДЕР =====================
  const look = new THREE.Vector3(0.2, 1.45, 0);
  function placeCamera() {
    const aspect = camera.aspect;
    const wide = wrap.clientWidth >= 700;           // на компьютере машина правее, рядом с текстом
    look.x = wide ? -2.2 : 0.1;
    const base = wide ? 17 : 13.5;
    const dist = base * Math.max(1, 1.55 / aspect);
    camera.position.set(look.x + 1.7, 2.3 + (dist - 13) * 0.1, dist);
    camera.lookAt(look);
  }

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    placeCamera();
    renderer.render(scene, camera); // сразу рисуем кадр, не дожидаясь анимации
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap);
  window.addEventListener('resize', resize);
  resize();

  const SPEED = 7; // м/с — скорость «движения»
  const wrapX = (o, span) => { if (o.position.x < -span / 2) o.position.x += span; };

  let visible = true, running = false, last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;

    wheels.forEach((w) => { w.rotation.z -= (SPEED / WR) * dt; });
    dashes.forEach((d) => { d.position.x -= SPEED * dt; wrapX(d, ROAD_SPAN); });
    lamps.forEach((l) => { l.position.x -= SPEED * dt; wrapX(l, LAMP_SPAN); });
    city.forEach((b) => { b.position.x -= SPEED * 0.12 * dt; wrapX(b, CITY_SPAN); });
    if (!calm) {
      body.position.y = Math.sin(t * 7.3) * 0.008 + Math.sin(t * 2.1) * 0.006;
      body.rotation.z = Math.sin(t * 1.7) * 0.003;
    }

    renderer.render(scene, camera);
    if (visible && !document.hidden) requestAnimationFrame(frame);
    else running = false;
  }
  function start() {
    if (reduceMotion) { renderer.render(scene, camera); return; }
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(wrap);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      const fresh = brandMaterial();
      brand.map.dispose(); brand.map = fresh.map; brand.needsUpdate = true;
      if (reduceMotion) renderer.render(scene, camera);
    });
  }

  start();
  wrap.classList.add('is-ready');
})();
