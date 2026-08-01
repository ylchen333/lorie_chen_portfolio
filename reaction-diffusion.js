(() => {
  const canvas = document.getElementById('reaction-diffusion');
  const hero = document.querySelector('.home-rd-header');
  if (!canvas || !hero) return;

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
  });

  if (!gl) {
    hero.classList.add('rd-unavailable');
    return;
  }

  const seedText = "Hey there! I'm Lorie Chen — freshly graduated from Carnegie Mellon University with a Bachelor's in Computer Science and Fine Art. I make things that live in the gap between algorithm and material: 3D captures, plotter drawings, and command-line interfaces for spaces that don't usually get one.";
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vertexSource = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const simulationSource = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D uState;
    uniform vec2 uPixel;
    uniform vec2 uPointer;
    uniform float uPointerDown;
    uniform float uTime;

    vec2 stateAt(vec2 offset) {
      return texture(uState, vUv + offset * uPixel).rg;
    }

    float hash21(vec2 point) {
      point = fract(point * vec2(123.34, 456.21));
      point += dot(point, point + 45.32);
      return fract(point.x * point.y);
    }

    float valueNoise(vec2 point) {
      vec2 cell = floor(point);
      vec2 local = fract(point);
      local = local * local * (3.0 - 2.0 * local);
      float a = hash21(cell);
      float b = hash21(cell + vec2(1.0, 0.0));
      float c = hash21(cell + vec2(0.0, 1.0));
      float d = hash21(cell + vec2(1.0, 1.0));
      return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
    }

    float fbm(vec2 point) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
      for (int octave = 0; octave < 4; octave++) {
        value += amplitude * valueNoise(point);
        point = rotation * point * 2.03 + vec2(11.7, 4.3);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 state = stateAt(vec2(0.0));
      vec2 lap = -state;
      lap += 0.20 * (stateAt(vec2(1.0, 0.0)) + stateAt(vec2(-1.0, 0.0)) + stateAt(vec2(0.0, 1.0)) + stateAt(vec2(0.0, -1.0)));
      lap += 0.05 * (stateAt(vec2(1.0, 1.0)) + stateAt(vec2(-1.0, 1.0)) + stateAt(vec2(1.0, -1.0)) + stateAt(vec2(-1.0, -1.0)));

      float a = state.r;
      float b = state.g;
      float reaction = a * b * b;

      // Spatially varying Gray-Scott "style map". These ranges stay close
      // to Karl Sims' mitosis values while allowing neighboring regions to
      // grow into subtly different spots, stripes, and coral-like edges.
      // Move the parameter map very slowly. This gives the large structures
      // the calm, rolling motion of a multi-scale Turing pattern while the
      // Gray-Scott chemistry continues to grow the fine detail.
      vec2 largeDrift = vec2(cos(uTime * 0.071), sin(uTime * 0.053)) * 0.19;
      vec2 smallDrift = vec2(sin(uTime * 0.097), cos(uTime * 0.083)) * 0.13;
      float feedField = fbm(vUv * 3.15 + vec2(2.4, 8.1) + largeDrift);
      float killField = 0.65 * fbm(vUv * 3.75 + vec2(17.2, 3.6) - largeDrift)
                      + 0.35 * valueNoise(vUv * 7.0 + vec2(5.3, 12.8) + smallDrift);
      float parameterField = 0.72 * feedField + 0.28 * killField;
      float feed = mix(0.0310, 0.0336, smoothstep(0.18, 0.82, parameterField));
      float kill = feed * 2.0;
      a += 1.0 * lap.r - reaction + feed * (1.0 - a);
      b += 0.5 * lap.g + reaction - (kill + feed) * b;

      float brush = 1.0 - smoothstep(0.0, 0.027, distance(vUv, uPointer));
      b = mix(b, 0.92, brush * uPointerDown);
      a = mix(a, 0.08, brush * uPointerDown);
      outColor = vec4(clamp(a, 0.0, 1.0), clamp(b, 0.0, 1.0), 0.0, 1.0);
    }
  `;

  const renderSource = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D uState;

    void main() {
      vec2 state = texture(uState, vUv).rg;
      float b = state.g;
      float body = smoothstep(0.08, 0.48, b);
      float line = smoothstep(0.10, 0.28, b) * (1.0 - smoothstep(0.42, 0.68, b));
      vec3 bone = vec3(0.953, 0.945, 0.918);
      vec3 verdigris = vec3(0.306, 0.431, 0.365);
      vec3 ink = vec3(0.106, 0.098, 0.082);
      vec3 color = mix(bone, verdigris, body * 0.55);
      color = mix(color, ink, line * 0.48);
      outColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function program(fragmentSource) {
    const result = gl.createProgram();
    gl.attachShader(result, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(result, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(result, 0, 'aPosition');
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
    return result;
  }

  let simulationProgram;
  let renderProgram;
  try {
    simulationProgram = program(simulationSource);
    renderProgram = program(renderSource);
  } catch (error) {
    console.warn('Reaction diffusion could not start:', error);
    hero.classList.add('rd-unavailable');
    return;
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let width = 0;
  let height = 0;
  let textures = [];
  let framebuffers = [];
  let current = 0;
  let visible = true;
  let frame = 0;
  let raf = 0;
  let drawing = false;
  let simulationTime = 0;
  let lastTimestamp = 0;
  let stepCarry = 0;
  const pointer = { x: -1, y: -1, down: 0 };

  function makeSeedData(w, h) {
    const seedCanvas = document.createElement('canvas');
    seedCanvas.width = w;
    seedCanvas.height = h;
    const context = seedCanvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#000';
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#fff';
    context.font = `600 ${Math.max(10, Math.round(w / 62))}px Inter, sans-serif`;
    context.textBaseline = 'top';

    const maxWidth = w * 0.72;
    const words = seedText.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    const lineHeight = Math.max(13, Math.round(w / 47));
    const startY = Math.max(18, Math.round((h - lines.length * lineHeight) / 2));
    lines.forEach((text, index) => context.fillText(text, w * 0.08, startY + index * lineHeight));

    let random = 173;
    const nextRandom = () => {
      random = (random * 9301 + 49297) % 233280;
      return random / 233280;
    };
    for (let i = 0; i < 22; i += 1) {
      const radius = 2 + nextRandom() * 4;
      context.beginPath();
      context.arc(nextRandom() * w, nextRandom() * h, radius, 0, Math.PI * 2);
      context.fill();
    }

    const pixels = context.getImageData(0, 0, w, h).data;
    const data = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i += 1) {
      const seeded = pixels[i * 4] > 80;
      data[i * 4] = seeded ? 24 : 255;
      data[i * 4 + 1] = seeded ? 235 : 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  function createTexture(data) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return texture;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(280, Math.min(760, Math.round(bounds.width * 0.58)));
    const nextHeight = Math.max(220, Math.round(nextWidth * bounds.height / bounds.width));
    if (nextWidth === width && nextHeight === height) return;

    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    textures.forEach(texture => gl.deleteTexture(texture));
    framebuffers.forEach(buffer => gl.deleteFramebuffer(buffer));
    const seedData = makeSeedData(width, height);
    textures = [createTexture(seedData), createTexture(seedData)];
    framebuffers = textures.map(texture => {
      const buffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return buffer;
    });
    current = 0;
    frame = 0;
    simulationTime = 0;
    lastTimestamp = 0;
    stepCarry = 0;
  }

  function simulate() {
    const next = 1 - current;
    gl.useProgram(simulationProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[next]);
    gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[current]);
    gl.uniform1i(gl.getUniformLocation(simulationProgram, 'uState'), 0);
    gl.uniform2f(gl.getUniformLocation(simulationProgram, 'uPixel'), 1 / width, 1 / height);
    gl.uniform2f(gl.getUniformLocation(simulationProgram, 'uPointer'), pointer.x, pointer.y);
    gl.uniform1f(gl.getUniformLocation(simulationProgram, 'uPointerDown'), pointer.down);
    gl.uniform1f(gl.getUniformLocation(simulationProgram, 'uTime'), simulationTime);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    current = next;
  }

  function render() {
    gl.useProgram(renderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[current]);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'uState'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function tick(timestamp) {
    if (!visible || document.hidden) {
      raf = 0;
      return;
    }
    // Tie chemistry speed to elapsed time so 60 Hz and 120 Hz displays evolve
    // at the same pace. A handful of small steps per frame also keeps the
    // simulation stable and makes its motion visible instead of glacial.
    const elapsed = lastTimestamp ? Math.min(50, timestamp - lastTimestamp) : 16.67;
    lastTimestamp = timestamp;
    simulationTime += elapsed * 0.001;
    stepCarry += elapsed * (reducedMotion ? 0.12 : 0.30);
    const steps = Math.min(reducedMotion ? 4 : 8, Math.max(1, Math.floor(stepCarry)));
    stepCarry -= steps;
    for (let i = 0; i < steps; i += 1) simulate();
    render();
    frame += 1;
    if (!reducedMotion || frame < 45) raf = requestAnimationFrame(tick);
    else raf = 0;
  }

  function start() {
    if (!raf && (!reducedMotion || frame < 45)) {
      lastTimestamp = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = 1 - (event.clientY - bounds.top) / bounds.height;
    pointer.down = drawing ? 1 : 0;
    start();
  }

  if (!reducedMotion) {
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      drawing = true;
      canvas.setPointerCapture?.(event.pointerId);
      updatePointer(event);
    });
    canvas.addEventListener('pointermove', event => {
      if (!drawing) return;
      updatePointer(event);
    });
    const stopDrawing = event => {
      drawing = false;
      pointer.down = 0;
      if (event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
    canvas.addEventListener('lostpointercapture', stopDrawing);
  }

  new ResizeObserver(() => {
    resize();
    start();
  }).observe(hero);

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }, { threshold: 0.01 }).observe(hero);

  document.addEventListener('visibilitychange', start);
  resize();
  start();
})();
