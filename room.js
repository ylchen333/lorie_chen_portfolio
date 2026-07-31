import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';

const mount = document.getElementById('room-scene');

if (mount) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9f9e98);
  scene.fog = new THREE.Fog(0x9f9e98, 7, 19);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 60);
  camera.position.set(0, 1.55, 5.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const room = new THREE.Group();
  scene.add(room);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8f8e89, roughness: 0.65, metalness: 0.03 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x20201e, roughness: 0.45 });

  function box(size, position, material, castShadow = false, receiveShadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    room.add(mesh);
    return mesh;
  }

  box([10, 0.12, 15], [0, -0.06, 0], floorMat);
  box([0.16, 14, 15], [-5.08, 7, 0], wallMat);
  box([0.16, 14, 15], [5.08, 7, 0], wallMat);
  box([10, 14, 0.16], [0, 7, -7.48], wallMat);

  box([0.08, 2.1, 1.15], [5.01, 1.05, 2.15], wallMat);
  box([0.12, 2.35, 1.35], [5.13, 1.18, 2.15], frameMat);
  box([0.13, 1.95, 1.02], [5.2, 0.98, 2.15], new THREE.MeshStandardMaterial({ color: 0x777671, roughness: 0.9 }));

  // Canvas storage wall — built-in cubbies of edge-on stored panels, left wall near the entrance
  {
    const shelfMat     = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.7 });
    const canvasColors = [0xf6f3ec, 0xe8dcc4, 0xcbb08a, 0x9c7a52, 0x5a4530, 0x2a2016];

    const shelfX      = -5.0;
    const shelfDepth  = 0.55;
    const shelfZStart = 1.7;
    const shelfZEnd   = 7.2;
    const shelfYStart = 0.85;
    const shelfYEnd   = 3.45;
    const cols        = 14;
    const rows        = 2;
    const cellW        = (shelfZEnd - shelfZStart) / cols;
    const cellH        = (shelfYEnd - shelfYStart) / rows;
    const divThickness = 0.03;

    const shelfGroup = new THREE.Group();
    room.add(shelfGroup);

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, shelfYEnd - shelfYStart, shelfZEnd - shelfZStart),
      shelfMat
    );
    backing.position.set(shelfX + 0.02, (shelfYStart + shelfYEnd) / 2, (shelfZStart + shelfZEnd) / 2);
    backing.receiveShadow = true;
    shelfGroup.add(backing);

    for (let r = 0; r <= rows; r++) {
      const y = shelfYStart + r * cellH;
      const div = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, divThickness, shelfZEnd - shelfZStart), shelfMat);
      div.position.set(shelfX + shelfDepth / 2, y, (shelfZStart + shelfZEnd) / 2);
      div.castShadow = true;
      div.receiveShadow = true;
      shelfGroup.add(div);
    }

    for (let c = 0; c <= cols; c++) {
      const z = shelfZStart + c * cellW;
      const div = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, shelfYEnd - shelfYStart, divThickness), shelfMat);
      div.position.set(shelfX + shelfDepth / 2, (shelfYStart + shelfYEnd) / 2, z);
      div.castShadow = true;
      div.receiveShadow = true;
      shelfGroup.add(div);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellZStart = shelfZStart + c * cellW;
        const cellYBase  = shelfYStart + r * cellH;
        const count       = 4 + Math.floor(Math.random() * 4);
        const usableWidth = cellW - divThickness * 2;
        const slatWidth   = usableWidth / count;
        let zCursor       = cellZStart + divThickness;

        for (let i = 0; i < count; i++) {
          const color    = canvasColors[Math.floor(Math.random() * canvasColors.length)];
          const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
          const h         = cellH * (0.8 + Math.random() * 0.55);
          const thickness = Math.max(0.012, slatWidth * (0.5 + Math.random() * 0.3));
          const depth     = shelfDepth * (0.7 + Math.random() * 0.25);

          const slat = new THREE.Mesh(new THREE.BoxGeometry(depth, h, thickness), material);
          slat.position.set(shelfX + depth / 2 + 0.02, cellYBase + h / 2 - 0.02, zCursor + slatWidth / 2);
          slat.rotation.z = (Math.random() - 0.5) * 0.1;
          slat.rotation.x = (Math.random() - 0.5) * 0.05;
          slat.castShadow = true;
          slat.receiveShadow = true;
          shelfGroup.add(slat);

          zCursor += slatWidth;
        }
      }
    }
  }

  const sunLight = new THREE.DirectionalLight(0xfff3d9, 4.2);
  sunLight.position.set(0, 20, -0.9);
  sunLight.target.position.set(0, 0, -0.9);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -8;
  sunLight.shadow.camera.right = 8;
  sunLight.shadow.camera.top = 8;
  sunLight.shadow.camera.bottom = -8;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 40;
  scene.add(sunLight, sunLight.target);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x696761, 2.15);
  scene.add(ambient);

  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(-3, 4, 5);
  fill.castShadow = true;
  fill.shadow.mapSize.set(1024, 1024);
  scene.add(fill);

  const wallTexts = [
    {
      title: "lorie's corner",
      body: "artist and coder of silly things\n\nHi, I'm Lorie Chen - freshly graduated from Carnegie Mellon University with a Bachelor's in Computer Science and Fine Art. Interested in shiny things, radiance fields, and making plotters do embarrassing amounts of work for small aesthetic payoffs.",
      position: [-4.93, 1.7, -3.4],
      rotation: [0, Math.PI / 2, 0],
      size: [2.1, 1.72]
    },
    {
      title: "experience",
      body: "Research Assistant\nStudio for Creative Inquiry, The School of Art at CMU - Nov 2024-Present\nBuilding interactive agentic interfaces in JavaScript/p5.js for real-time interaction with Gemini and ComfyUI-based generative AI models.\nExtending ComfyUI pipelines for new research and creative workflows.\nDeveloping real-time robot arm control workflows and 3D Gaussian Splatting guidelines.\n\ngithub: ComfyCV ->",
      position: [-4.93, 1.75, 0.35],
      rotation: [0, Math.PI / 2, 0],
      size: [2.0, 2.0]
    },
    {
      title: "experience",
      body: "Teaching Assistant\nThe School of Art at CMU - Aug-Dec 2025\nDesigned and built 5+ interactive web interfaces for real-time user interaction with AI models including Gemini, ComfyUI pipelines, and vocal ML systems.\nExtended open-source p5.js ComfyUI libraries to support cloud-based RunComfy instances.\n\nResearch Engineer Intern\nAdobe Research - May-Aug 2025\nDeveloped novel AI video and 3D processing workflows for After Effects in C++.",
      position: [4.93, 1.75, -3.1],
      rotation: [0, -Math.PI / 2, 0],
      size: [2.0, 2.0]
    },
    {
      title: "experience",
      body: "Research Assistant\nThe Robotics Institute at CMU - Feb-Dec 2024\nEnhanced user experience and robot perception for the CoFRIDA robotic painting system using OnShape and 3D printing.\nDemonstrated new capabilities at IEEE RO-MAN 2024 to an audience of 50+ and presented to a panel of expert judges.\n\nUser Experience Designer\nHuman-Computer Interaction Institute at CMU - Jan-May 2023",
      position: [4.93, 1.72, 0.5],
      rotation: [0, -Math.PI / 2, 0],
      size: [2.0, 1.9]
    },
    {
      title: "work / about / playlab",
      body: "Use the sticky navigation above to leave the room. Project pages remain normal scroll pages on the same grey background.",
      position: [0, 1.78, -7.36],
      rotation: [0, 0, 0],
      size: [2.3, 1.25]
    }
  ];

  function makeTextTexture(title, body) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#c8c7c1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 22;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    ctx.strokeStyle = '#5f5e59';
    ctx.lineWidth = 4;
    ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

    ctx.fillStyle = '#111';
    ctx.textBaseline = 'top';
    ctx.font = '58px Georgia, serif';
    wrapText(ctx, title, 96, 96, 830, 66);

    ctx.font = '31px Georgia, serif';
    ctx.fillStyle = '#242421';
    wrapText(ctx, body, 96, 205, 830, 42);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let cursorY = y;
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        cursorY += lineHeight * 0.72;
        continue;
      }
      const words = paragraph.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, cursorY);
          line = word;
          cursorY += lineHeight;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight * 1.12;
    }
  }

  function addWallText({ title, body, position, rotation, size }) {
    const backing = box([size[0] + 0.18, size[1] + 0.18, 0.08], position, frameMat, true);
    backing.rotation.set(...rotation);

    const texture = makeTextTexture(title, body);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
    panel.position.set(...position);
    panel.rotation.set(...rotation);

    const normal = new THREE.Vector3(0, 0, 1).applyEuler(panel.rotation);
    panel.position.addScaledVector(normal, 0.055);
    panel.castShadow = true;
    panel.receiveShadow = true;
    room.add(panel);
  }

  wallTexts.forEach(addWallText);

  const keys = new Set();
  let yaw = 0;
  let pitch = -0.04;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const clock = new THREE.Clock();

  window.addEventListener('keydown', event => keys.add(event.key.toLowerCase()));
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));

  renderer.domElement.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    yaw -= dx * 0.0032;
    pitch -= dy * 0.0024;
    pitch = THREE.MathUtils.clamp(pitch, -1.1, 1.05);
  });

  renderer.domElement.addEventListener('pointerup', event => {
    dragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
  });

  function updateCamera(delta) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    const movement = new THREE.Vector3();

    if (keys.has('w')) movement.add(forward);
    if (keys.has('s')) movement.sub(forward);
    if (keys.has('d')) movement.add(right);
    if (keys.has('a')) movement.sub(right);

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(delta * 3.1);
      camera.position.add(movement);
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.35, 4.35);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -6.55, 6.35);
    camera.position.y = 1.55;
  }

  function resize() {
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    updateCamera(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
