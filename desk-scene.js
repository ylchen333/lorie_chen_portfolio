import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

const ASSET_BASE = 'https://portfolioassets.loriechen.com/local/output';
const FIGURINE_STORAGE_KEY = 'lorie-desk-figurine-transform-v2';
const LEGACY_FIGURINE_STORAGE_KEY = 'lorie-desk-figurine-position-v1';
const SPLAT_STORAGE_KEY = 'lorie-desk-splat-transform-v1';
const INTERACTION_STATE = Object.freeze({
  EXPLORE: 'explore',
  FOCUSED: 'focused',
});
const DISCOVERY_PULSE_DURATION = 6;
const DEBUG_RAY_LENGTH = 30;
const DEBUG_RAY_COLOR = 0xffd400;
const DEBUG_CAMERA_COLOR = 0x00e5ff;
const DEBUG_LOCAL_COLOR = 0xff4fd8;
const DEBUG_SPLAT_COLOR = 0x39ff14;
const DEBUG_SPLAT_SIGMA = 2.5;
const DEBUG_CALIBRATION_SAMPLE_COUNT = 7;
const ISOLATED_SPLAT_ALPHA_THRESHOLD = 8;
const RETICLE_PICK_RADIUS_PX = 10;
const RETICLE_MIN_SPLAT_OPACITY = 0.6;
const RETICLE_MIN_SPLAT_SUPPORT = 4;
const INVISIBLE_SELECTION_OFFSET_PX = new THREE.Vector2(-253, 128);
const SELECTION_ANCHOR_NDC = new THREE.Vector2(0, 0);
const DEFAULT_SPLAT_TRANSFORM = {
  position: new THREE.Vector3(-3.6, -1.4, 6.5),
  scale: new THREE.Vector3(1, 1, 1),
  quaternion: new THREE.Quaternion(
    0.8958700500239255,
    -0.06002558886030476,
    -0.25501366796813696,
    0.35886182759042506,
  ),
};
const DEFAULT_FIGURINE_TRANSFORM = {
  position: new THREE.Vector3(-0.55, 1.45, 2.766),
  scale: new THREE.Vector3(1, 1, 1),
  quaternion: new THREE.Quaternion(
    0.9106707133131524,
    0.04884491783373448,
    -0.34066034056363226,
    -0.2285684980101153,
  ),
};
const DESK_DESTINATIONS = [
  {
    id: 'monitor', label: 'selected work', title: 'SELECTED WORK', eyebrow: 'monitor',
    copy: 'A selection of projects across 3D capture, creative tools, graphics, and physical computing.',
    href: 'work.html', linkLabel: 'see all work →',
    projects: [
      { title: 'synth splat', meta: 'audio-reactive Gaussian splatting · 2026', href: 'synth-splat.html' },
      { title: 'catalogue raisonné', meta: 'interactive spatial archive · 2025–2026', href: 'catalogue_raisonne.html' },
      { title: 'The Long Way Home', meta: 'computer vision and plotting · 2026', href: 'the-long-way-home.html' },
    ],
    segmentUrl: `${ASSET_BASE}/regions/region-0/segment-preview.ply`,
    center: [0.829, -1.310, 2.884], size: [4.5, 2.5, 2.6], pickRadius: 105,
  },
  {
    id: 'notebook', label: 'sketches & experiments', title: 'PLAYLAB', eyebrow: 'notebook',
    copy: 'one off experiments in various media',
    href: 'playlab.html', linkLabel: 'open playlab →',
    segmentUrl: `${ASSET_BASE}/regions/region-2/segment-preview.ply`,
    center: [3.334, 1.240, 2.149], size: [2.2, 0.9, 1.9], pickRadius: 110,
  },
  {
    id: 'computer', label: 'most recent work', title: 'RECENT WORK', eyebrow: 'PC',
    copy: 'Synth Splat turns sound into a live, navigable radiance field.',
    href: 'work.html', linkLabel: 'see all work →',
    projects: [
      { title: 'synth splat', meta: 'audio-reactive Gaussian splatting · 2026', href: 'synth-splat.html' },
    ],
    segmentUrl: `${ASSET_BASE}/regions/region-3/segment-preview.ply`,
    center: [-3.900, 0.517, 3.661], size: [2.6, 4.0, 4.0], pickRadius: 120,
  },
  {
    id: 'keyboard', label: 'back home', action: 'home',
    segmentUrl: `${ASSET_BASE}/regions/region-4/segment-preview.ply`,
    center: [0.878, 3.000, 2.399], size: [4.8, 0.8, 2.6],
  },
];

const hero = document.querySelector('.desk-home');
const viewport = document.querySelector('.desk-viewport');
const loadingLabel = document.querySelector('.desk-loading-label');
const loadingProgress = document.querySelector('.desk-loading-progress');
const fallback = document.querySelector('.desk-fallback');
const controlsMode = document.querySelector('.desk-controls-mode');
const objectLabel = document.querySelector('.desk-object-label');
const deskCard = document.querySelector('.desk-card');
const deskCardEyebrow = document.querySelector('.desk-card-eyebrow');
const deskCardTitle = document.querySelector('#desk-card-title');
const deskCardCopy = document.querySelector('.desk-card-copy');
const deskCardProjects = document.querySelector('.desk-card-projects');
const deskCardLink = document.querySelector('.desk-card-link');
const deskCardBack = document.querySelector('.desk-card-back');
const deskReticle = document.querySelector('.desk-reticle');
const deskFakeReticle = document.querySelector('.desk-fake-reticle');
// Isolation test UI hooks are disabled.
// const isolationTestOverlay = document.querySelector('.desk-isolation-test');
// const isolationTestPercent = document.querySelector('.desk-isolation-test-percent');
// const isolationTestBar = document.querySelector('.desk-isolation-test-bar');

if (hero && viewport) {
  initDeskScene().catch((error) => {
    console.error('The interactive desk could not start:', error);
    hero.classList.add('scene-error');
    document.querySelector('.desk-loading')?.setAttribute('hidden', '');
    if (fallback) fallback.hidden = false;
  });
}

async function initDeskScene() {
  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x1B1915, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1B1915);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.04, 120);
  const defaultCamera = new THREE.PerspectiveCamera(52, 16 / 10, 0.04, 120);
  setDefaultCamera(defaultCamera);
  camera.position.copy(defaultCamera.position);
  camera.quaternion.copy(defaultCamera.quaternion);
  camera.layers.enable(1);

  const spark = new SparkRenderer({
    renderer,
    lodSplatScale: 0.9,
    behindFoveate: 0.2,
    sortRadial: true,
  });
  scene.add(spark);

  const deskRoot = new THREE.Group();
  deskRoot.name = 'splat-coordinate-space';
  applyStoredTransform(deskRoot, SPLAT_STORAGE_KEY, DEFAULT_SPLAT_TRANSFORM);
  scene.add(deskRoot);

  const interactionTargets = [];
  const interactionOverlays = [];
  for (const destination of DESK_DESTINATIONS) {
    const proxy = createInteractionProxy(destination);
    deskRoot.add(proxy);
    interactionTargets.push(proxy);
  }

  let lastReportedProgress = 0;
  const desk = new SplatMesh({
    url: `${ASSET_BASE}/desk_portfolio_cropped-lod.rad`,
    paged: true,
    raycastable: false,
    onProgress: (event) => {
      if (!event.lengthComputable || !event.total) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      if (percent === lastReportedProgress) return;
      lastReportedProgress = percent;
      if (loadingProgress) loadingProgress.textContent = `${percent}%`;
    },
  });
  deskRoot.add(desk);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x242424, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff4dc, 3.4);
  keyLight.position.set(-5, 11, -7);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const pointerControls = new PointerLockControls(camera, renderer.domElement);
  pointerControls.pointerSpeed = 0.72;
  pointerControls.minPolarAngle = 0.12;
  pointerControls.maxPolarAngle = Math.PI - 0.12;

  let figurineAnchor = null;
  let figurineTarget = null;
  let hoveredTarget = null;
  let focusedTarget = null;
  let cameraTransition = null;
  let interactionState = INTERACTION_STATE.EXPLORE;
  // let debugMode = false; // Debug mode disabled.
  let discoveryPulseStart = null;
  let heroVisible = true;
  let running = false;
  const pressedKeys = new Set();
  const clock = new THREE.Clock();
  const centerWorldRay = new THREE.Ray();
  const segmentTargets = [];
  let lastReticleScanAt = -Infinity;
  let cachedReticleHit = null;
  const lastSelectionCameraMatrix = new THREE.Matrix4();
  let hasSelectionCameraSnapshot = false;
  let lastSelectionSceneSignature = '';
  /* Debug rendering and HUD initialization disabled.
  const debugRay = createDebugRay(DEBUG_RAY_COLOR, 'world-space-selection-ray');
  const debugCameraRay = createDebugRay(DEBUG_CAMERA_COLOR, 'camera-space-optical-axis');
  const debugLocalRay = createDebugRay(DEBUG_LOCAL_COLOR, 'camera-to-candidate-ray');
  const debugSegmentBounds = new THREE.Box3();
  const debugBoundsHelper = new THREE.Box3Helper(debugSegmentBounds, DEBUG_RAY_COLOR);
  debugBoundsHelper.name = 'center-ray-segment-bounds';
  debugBoundsHelper.visible = false;
  debugBoundsHelper.material.depthTest = false;
  debugBoundsHelper.material.transparent = true;
  debugBoundsHelper.material.opacity = 0.95;
  debugBoundsHelper.renderOrder = 1000;
  const debugSplat = createDebugSplat();
  const debugHud = createDebugHud(hero);
  const renderedSelectionProbe = createRenderedSelectionProbe();
  let renderedSelectionPixel = null;
  let lastRenderedSelectionProbeAt = -Infinity;
  let isolatedSplatTestRunning = false;
  const preRenderProjectionMatrix = new THREE.Matrix4();
  const preRenderViewMatrix = new THREE.Matrix4();
  const preRenderViewport = new THREE.Vector4();
  const postRenderViewport = new THREE.Vector4();
  const renderBoundaryDiagnostics = {
    projectionDelta: 0,
    viewDelta: 0,
    viewportDelta: 0,
  };
  scene.add(
    debugRay,
    debugCameraRay,
    debugLocalRay,
    debugBoundsHelper,
    debugSplat,
  );
  */
  // Kept false so legacy guard clauses remain inert while isolation is disabled.
  const isolatedSplatTestRunning = false;

  pointerControls.addEventListener('lock', () => {
    if (isolatedSplatTestRunning) return;
    if (interactionState !== INTERACTION_STATE.FOCUSED) setInteractionState(INTERACTION_STATE.EXPLORE);
  });
  pointerControls.addEventListener('unlock', () => {
    pressedKeys.clear();
    if (isolatedSplatTestRunning) return;
    if (interactionState !== INTERACTION_STATE.FOCUSED) setInteractionState(INTERACTION_STATE.EXPLORE);
  });

  renderer.domElement.addEventListener('click', () => {
    if (isolatedSplatTestRunning) return;
    if (cameraTransition || interactionState === INTERACTION_STATE.FOCUSED) return;
    if (!pointerControls.isLocked) {
      pointerControls.lock();
      return;
    }
    const targetedSegment = resolveCenterTarget(true);
    if (targetedSegment) selectDestination(targetedSegment);
  });

  deskCardBack?.addEventListener('click', () => {
    if (!isolatedSplatTestRunning) returnToOverview();
  });

  window.addEventListener('keydown', (event) => {
    /* Debug mode and the isolated-splat test are intentionally disabled.
    // D remains strafe-right while pointer lock is active. Release the mouse
    // with Escape, then press D to toggle diagnostics without moving the camera.
    if (
      event.code === 'KeyD'
      && !pointerControls.isLocked
      && !event.repeat
      && !isEditableElement(event.target)
    ) {
      event.preventDefault();
      debugMode = !debugMode;
      hero.classList.toggle('is-debugging', debugMode);
      debugHud.root.hidden = !debugMode;
      if (!debugMode) {
        hideDebugVisuals();
      }
      return;
    }

    if (
      event.code === 'KeyJ'
      && debugMode
      && !event.repeat
      && !isEditableElement(event.target)
    ) {
      event.preventDefault();
      if (!isolatedSplatTestRunning) runIsolatedSplatTest();
      return;
    }
    */

    if (focusedTarget && event.code === 'Escape') {
      event.preventDefault();
      returnToOverview();
      return;
    }

    if (isMovementKey(event.code)) {
      event.preventDefault();
      pressedKeys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => pressedKeys.delete(event.code));
  window.addEventListener('blur', () => pressedKeys.clear());

  function updateHoveredTarget() {
    if (isolatedSplatTestRunning) return;
    if (focusedTarget || cameraTransition || !hero.classList.contains('scene-ready')) {
      setHoveredTarget(null);
      return;
    }

    setHoveredTarget(resolveCenterTarget());
  }

  function resolveCenterTarget(forceScan = false) {
    syncCameraForInteraction();
    // This ray is diagnostic only. It follows the same invisible screen-space
    // aperture as projected-splat selection instead of the optical axis.
    const selectionAnchorNdc = getSelectionAnchorNdc(renderer.domElement);
    centerWorldRay.origin.setFromMatrixPosition(camera.matrixWorld);
    centerWorldRay.direction
      .set(selectionAnchorNdc.x, selectionAnchorNdc.y, 0.5)
      .unproject(camera)
      .sub(centerWorldRay.origin)
      .normalize();
    const now = performance.now();
    if (!forceScan && now - lastReticleScanAt < 80) {
      // updateDebugSelectionRay(cachedReticleHit); // diagnostics disabled
      if (!cachedReticleHit) return null;
      return cachedReticleHit.object.userData.interactionProxy || cachedReticleHit.object;
    }
    lastReticleScanAt = now;

    const selectionSceneSignature = [
      segmentTargets.length,
      figurineTarget ? 1 : 0,
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
    ].join(':');
    if (
      !forceScan
      && hasSelectionCameraSnapshot
      && selectionSceneSignature === lastSelectionSceneSignature
      && lastSelectionCameraMatrix.equals(camera.matrixWorld)
    ) {
      if (!cachedReticleHit) return null;
      return cachedReticleHit.object.userData.interactionProxy || cachedReticleHit.object;
    }
    lastSelectionCameraMatrix.copy(camera.matrixWorld);
    lastSelectionSceneSignature = selectionSceneSignature;
    hasSelectionCameraSnapshot = true;

    if (segmentTargets.length === 0 && !figurineTarget) {
      cachedReticleHit = null;
      // updateDebugSelectionRay(null); // diagnostics disabled
      return null;
    }
    const screenHits = [];
    for (const segment of segmentTargets) {
      const reticleSplat = findReticleSplat(segment, camera, renderer.domElement);
      if (!reticleSplat) continue;
      screenHits.push({
        object: segment,
        point: reticleSplat.worldCenter.clone(),
        reticleSplat,
      });
    }
    if (figurineTarget) {
      const figurineHit = findProjectedProxyHit(
        figurineTarget,
        camera,
        renderer.domElement,
        selectionAnchorNdc,
      );
      if (figurineHit) screenHits.push(figurineHit);
    }
    screenHits.sort((a, b) => a.reticleSplat.depth - b.reticleSplat.depth);
    const hit = screenHits[0] || null;
    cachedReticleHit = hit;
    if (!hit) {
      // updateDebugSelectionRay(null); // diagnostics disabled
      return null;
    }
    // updateDebugSelectionRay(hit); // diagnostics disabled
    const target = hit.object.userData.interactionProxy || hit.object;
    target.userData.lastHitPoint = hit.reticleSplat.worldCenter.clone();
    return target;
  }

  /* Debug HUD, ray helpers, and isolation test implementation disabled.
  function updateDebugSelectionRay(hit) {
    const hitDepth = hit?.point
      ? centerWorldRay.direction.dot(hit.point.clone().sub(centerWorldRay.origin))
      : DEBUG_RAY_LENGTH;
    const length = hitDepth > camera.near ? hitDepth : DEBUG_RAY_LENGTH;
    debugRayEnd.copy(centerWorldRay.direction)
      .multiplyScalar(length)
      .add(centerWorldRay.origin);

    setDebugRay(debugRay, centerWorldRay.origin, centerWorldRay.direction, length);

    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    setDebugRay(debugCameraRay, centerWorldRay.origin, cameraDirection, length);

    let localOrigin = null;
    let localDirection = null;
    let roundTripOrigin = null;
    let roundTripDirection = null;
    let intersectedSplat = hit?.reticleSplat || null;
    if (hit) {
      hit.object.updateWorldMatrix(true, false);
      const inverseSegmentMatrix = hit.object.matrixWorld.clone().invert();
      localOrigin = centerWorldRay.origin.clone().applyMatrix4(inverseSegmentMatrix);
      localDirection = centerWorldRay.direction.clone().transformDirection(inverseSegmentMatrix);
      roundTripOrigin = localOrigin.clone().applyMatrix4(hit.object.matrixWorld);
      roundTripDirection = localDirection.clone().transformDirection(hit.object.matrixWorld);
      // The magenta helper is an explicit world-space arrow from the camera to
      // the accepted Gaussian center. It visualizes the actual candidate path,
      // while local/world round-trip values remain available in the HUD.
      const candidateDirection = hit.point.clone().sub(centerWorldRay.origin);
      const candidateDistance = candidateDirection.length();
      if (candidateDistance > 1e-6) {
        candidateDirection.multiplyScalar(1 / candidateDistance);
        setDebugRay(
          debugLocalRay,
          centerWorldRay.origin,
          candidateDirection,
          candidateDistance,
        );
      }
      if (debugMode) updateDebugSplat(debugSplat, hit.object, intersectedSplat);
    }

    const debugVisible = debugMode && interactionState === INTERACTION_STATE.EXPLORE;
    // Selection feedback comes from the captured segment overlay. Keep all
    // world/camera ray helpers and 3D candidate helpers suppressed.
    debugRay.visible = false;
    debugCameraRay.visible = false;
    debugLocalRay.visible = false;
    debugSplat.visible = false;
    updateDebugHud({
      hit,
      length,
      cameraDirection,
      localOrigin,
      localDirection,
      roundTripOrigin,
      roundTripDirection,
      intersectedSplat,
    });

    debugBoundsHelper.visible = false;
  }

  function updateDebugHud(diagnostics) {
    if (!debugMode) return;
    const worldEndProjection = debugRayEnd.clone().project(camera);
    const hitProjection = diagnostics.hit?.point.clone().project(camera);
    const roundTripEnd = diagnostics.roundTripOrigin?.clone()
      .addScaledVector(diagnostics.roundTripDirection, diagnostics.length);
    const roundTripProjection = roundTripEnd?.clone().project(camera);
    const crossRayError = diagnostics.hit
      ? centerWorldRay.distanceToPoint(diagnostics.hit.point)
      : null;
    const originRoundTripError = diagnostics.roundTripOrigin
      ? diagnostics.roundTripOrigin.distanceTo(centerWorldRay.origin)
      : null;
    const directionRoundTripError = diagnostics.roundTripDirection
      ? diagnostics.roundTripDirection.angleTo(centerWorldRay.direction)
      : null;
    const canvasBounds = renderer.domElement.getBoundingClientRect();
    const canvasViewportCenter = {
      x: canvasBounds.left + canvasBounds.width * 0.5,
      y: canvasBounds.top + canvasBounds.height * 0.5,
    };

    positionDebugMarkerInCanvas(debugHud.worldMarker, worldEndProjection, renderer.domElement, debugHud.root);
    positionDebugMarkerInCanvas(debugHud.hitMarker, hitProjection, renderer.domElement, debugHud.root);
    positionDebugMarkerInCanvas(debugHud.localMarker, hitProjection, renderer.domElement, debugHud.root);
    const selectionAnchorNdc = getSelectionAnchorNdc(renderer.domElement);
    const selectionPredictedCssPixel = {
      x: (selectionAnchorNdc.x * 0.5 + 0.5) * canvasBounds.width,
      y: (-selectionAnchorNdc.y * 0.5 + 0.5) * canvasBounds.height,
    };
    if (deskReticle) {
      const containingBounds = deskReticle.offsetParent?.getBoundingClientRect() || canvasBounds;
      deskReticle.style.left = `${canvasBounds.left - containingBounds.left + selectionPredictedCssPixel.x}px`;
      deskReticle.style.top = `${canvasBounds.top - containingBounds.top + selectionPredictedCssPixel.y}px`;
    }
    const invisibleApertureViewportCenter = {
      x: canvasBounds.left + selectionPredictedCssPixel.x,
      y: canvasBounds.top + selectionPredictedCssPixel.y,
    };
    const apertureToMagentaError = renderedSelectionPixel ? {
      x: renderedSelectionPixel.x - selectionPredictedCssPixel.x,
      y: renderedSelectionPixel.y - selectionPredictedCssPixel.y,
    } : null;
    const selectionOffsetPx = new THREE.Vector2(
      selectionAnchorNdc.x * renderer.domElement.clientWidth * 0.5,
      -selectionAnchorNdc.y * renderer.domElement.clientHeight * 0.5,
    );
    positionDebugMarkerInCanvas(debugHud.selectionMarker, selectionAnchorNdc, renderer.domElement, debugHud.root);
    positionDebugMarkerInCanvas(debugHud.centerMarker, new THREE.Vector2(0, 0), renderer.domElement, debugHud.root);
    debugHud.hitMarker.hidden = !hitProjection;
    debugHud.localMarker.hidden = !roundTripProjection;
    debugHud.readout.textContent = [
      `DEBUG [D]  hit: ${diagnostics.hit?.object.name || 'none'}`,
      `canvas: ${renderer.domElement.clientWidth}×${renderer.domElement.clientHeight}  aspect: ${camera.aspect.toFixed(5)}`,
      `render Δ projection/view/viewport: ${formatNumber(renderBoundaryDiagnostics.projectionDelta)} / ${formatNumber(renderBoundaryDiagnostics.viewDelta)} / ${formatNumber(renderBoundaryDiagnostics.viewportDelta)}`,
      `camera pos: ${formatVector(centerWorldRay.origin)}`,
      `camera dir: ${formatVector(diagnostics.cameraDirection)}`,
      `world dir:  ${formatVector(centerWorldRay.direction)}`,
      `world end NDC: ${formatVector(worldEndProjection, 2)}`,
      `selection NDC: ${formatVector(selectionAnchorNdc, 2)}`,
      `invisible aperture [viewport px]: ${formatPoint(invisibleApertureViewportCenter)}`,
      `canvas CSS center [viewport px]: ${formatPoint(canvasViewportCenter)}`,
      `selection predicted [canvas CSS px]: ${formatPoint(selectionPredictedCssPixel)}`,
      `magenta rendered [canvas CSS px]: ${formatPoint(renderedSelectionPixel)}`,
      `aperture → magenta error [CSS px]: ${formatPoint(apertureToMagentaError)}`,
      `aperture offset from center: ${selectionOffsetPx.x.toFixed(1)}, ${selectionOffsetPx.y.toFixed(1)} px`,
      `hit NDC: ${hitProjection ? formatVector(hitProjection, 2) : '—'}`,
      `hit cross-ray error: ${formatNumber(crossRayError)}`,
      `splat index: ${diagnostics.intersectedSplat?.index ?? '—'}`,
      `splat center: ${diagnostics.intersectedSplat ? formatVector(diagnostics.intersectedSplat.center) : '—'}`,
      `splat scale: ${diagnostics.intersectedSplat ? formatVector(diagnostics.intersectedSplat.scales) : '—'}`,
      `splat opacity: ${formatNumber(diagnostics.intersectedSplat?.opacity)}`,
      `splat selection offset: ${formatNumber(diagnostics.intersectedSplat?.screenDistance)} px`,
      `splat support: ${diagnostics.intersectedSplat?.supportCount ?? '—'}`,
      `local origin: ${diagnostics.localOrigin ? formatVector(diagnostics.localOrigin) : '—'}`,
      `local dir: ${diagnostics.localDirection ? formatVector(diagnostics.localDirection) : '—'}`,
      `round-trip NDC: ${roundTripProjection ? formatVector(roundTripProjection, 2) : '—'}`,
      `round-trip origin error: ${formatNumber(originRoundTripError)}`,
      `round-trip angle error: ${formatNumber(directionRoundTripError)}`,
    ].join('\n');
  }

  function hideDebugVisuals() {
    debugRay.visible = false;
    debugCameraRay.visible = false;
    debugLocalRay.visible = false;
    debugBoundsHelper.visible = false;
    debugSplat.visible = false;
  }

  async function runIsolatedSplatTest() {
    isolatedSplatTestRunning = true;
    pressedKeys.clear();
    hero.classList.add('is-isolation-testing');
    setIsolationTestProgress(0);
    if (isolationTestOverlay) isolationTestOverlay.hidden = false;
    renderer.setAnimationLoop(null);
    if (pointerControls.isLocked) pointerControls.unlock();

    try {
      await nextAnimationFrame();
      let segment = cachedReticleHit?.object;
      if (!segment) {
        debugHud.readout.textContent += '\nISOLATED TEST: locating nearest segment…';
        segment = await findClosestCalibrationSegment(
          segmentTargets,
          camera,
          (progress) => setIsolationTestProgress(progress * 0.15),
        );
      }
      if (!segment) throw new Error('No initialized segment splats are available');

      setIsolationTestProgress(0.15);
      const samples = collectCalibrationSplats(
        segment,
        camera,
        DEBUG_CALIBRATION_SAMPLE_COUNT,
      );
      debugHud.readout.textContent += `\nISOLATED TEST: measuring ${samples.length} splats…`;
      await nextAnimationFrame();
      const result = await measureIsolatedSplats({
        renderer,
        scene,
        camera,
        spark,
        segment,
        samples,
        onProgress: (progress) => setIsolationTestProgress(0.15 + progress * 0.85),
      });
      window.__deskSplatDiagnostic = result;
      downloadJson('desk-splat-isolation-diagnostic.json', result);
      debugHud.readout.textContent += [
        '\nISOLATED TEST COMPLETE [J]',
        `measured: ${result.summary.measured}/${result.rows.length}`,
        `mean error: ${formatNumber(result.summary.meanErrorPx)} px`,
        `RMS error: ${formatNumber(result.summary.rmsErrorPx)} px`,
        `mean dx/dy: ${formatNumber(result.summary.meanDxPx)}, ${formatNumber(result.summary.meanDyPx)} px`,
        `classification: ${result.summary.classification}`,
      ].join('\n');
      console.table(result.rows.map((row) => ({
        splat: row.splatIndex,
        predictedX: row.predictedCssPixel.x,
        predictedY: row.predictedCssPixel.y,
        observedX: row.observedCssCentroid?.x,
        observedY: row.observedCssCentroid?.y,
        dx: row.errorPx?.x,
        dy: row.errorPx?.y,
        distance: row.errorPx?.distance,
      })));
      console.info('Isolated splat diagnostic', result);
    } catch (error) {
      console.error('Isolated splat diagnostic failed:', error);
      debugHud.readout.textContent += `\nISOLATED TEST FAILED: ${error.message}`;
    } finally {
      isolatedSplatTestRunning = false;
      hero.classList.remove('is-isolation-testing');
      if (isolationTestOverlay) isolationTestOverlay.hidden = true;
      running = heroVisible && !document.hidden;
      if (running) {
        clock.start();
        renderer.setAnimationLoop(animate);
      }
    }
  }

  function setIsolationTestProgress(progress) {
    const percent = Math.round(THREE.MathUtils.clamp(progress, 0, 1) * 100);
    if (isolationTestPercent) isolationTestPercent.textContent = `${percent}%`;
    if (isolationTestBar) isolationTestBar.style.width = `${percent}%`;
  }
  */

  function setHoveredTarget(target) {
    if (hoveredTarget === target) {
      if (target) updateObjectLabelPosition(target);
      return;
    }
    hoveredTarget = target;
    renderer.domElement.style.cursor = 'none';
    deskReticle?.classList.toggle('is-targeted', Boolean(target));

    if (!objectLabel) return;
    if (!target) {
      objectLabel.hidden = true;
      return;
    }
    objectLabel.textContent = target.userData.destination.label;
    objectLabel.hidden = false;
    updateObjectLabelPosition(target);
  }

  function updateObjectLabelPosition(target) {
    if (!objectLabel || !target) return;
    syncCameraForInteraction();
    const point = (target.userData.lastHitPoint?.clone() || getTargetWorldCenter(target))
      .project(camera);
    if (point.z < -1 || point.z > 1) {
      objectLabel.hidden = true;
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const containingBounds = objectLabel.offsetParent?.getBoundingClientRect() || bounds;
    // The label follows the same center-screen anchor used by the visible
    // reticle and the projected-splat selection test.
    const screenX = bounds.left + bounds.width * 0.5;
    const screenY = bounds.top + bounds.height * 0.5;
    objectLabel.hidden = false;
    objectLabel.style.left = `${screenX - containingBounds.left}px`;
    objectLabel.style.top = `${screenY - containingBounds.top}px`;
  }

  function selectDestination(target) {
    const destination = target.userData.destination;
    if (destination.action === 'home') {
      returnToOverview();
      return;
    }

    setInteractionState(INTERACTION_STATE.FOCUSED);
    if (pointerControls.isLocked) pointerControls.unlock();
    pressedKeys.clear();
    focusedTarget = target;
    setHoveredTarget(null);
    closeCard();

    const worldBox = new THREE.Box3().setFromObject(target);
    const center = target.userData.lastHitPoint?.clone() || getTargetWorldCenter(target);
    const radius = worldBox.getBoundingSphere(new THREE.Sphere()).radius;
    // Preserve the direction from which the visitor selected the object. Using
    // the default camera here made focus transitions approach from the wrong side
    // after the visitor had rotated or moved through the scene.
    const viewDirection = camera.position.clone().sub(center);
    if (viewDirection.lengthSq() < 1e-6) {
      camera.getWorldDirection(viewDirection).negate();
    }
    viewDirection.normalize();
    const position = center.clone().addScaledVector(viewDirection, Math.max(2.5, radius * 2.35));
    position.y += radius * 0.12;

    const focusCamera = camera.clone();
    focusCamera.position.copy(position);
    focusCamera.lookAt(center);
    startCameraTransition(position, focusCamera.quaternion, () => showCard(destination));
  }

  function returnToOverview() {
    if (pointerControls.isLocked) pointerControls.unlock();
    pressedKeys.clear();
    setHoveredTarget(null);
    closeCard();
    focusedTarget = null;
    startCameraTransition(defaultCamera.position, defaultCamera.quaternion, () => {
      setInteractionState(INTERACTION_STATE.EXPLORE);
    });
  }

  function setInteractionState(nextState) {
    interactionState = nextState;
    hero.classList.toggle('is-exploring', nextState === INTERACTION_STATE.EXPLORE);
    hero.classList.toggle('is-focused', nextState === INTERACTION_STATE.FOCUSED);

    if (controlsMode) {
      controlsMode.textContent = nextState === INTERACTION_STATE.EXPLORE
        ? 'explore · look around to highlight · click to select · Esc releases mouse'
        : 'focused · choose a link or return to the desk';
    }
    if (nextState !== INTERACTION_STATE.EXPLORE) {
      deskReticle?.classList.remove('is-targeted');
      // hideDebugVisuals(); // diagnostics disabled
    }
  }

  function syncCameraForInteraction() {
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  }

  function updateInteractionOverlays(elapsed) {
    const pulseAge = discoveryPulseStart === null ? Infinity : elapsed - discoveryPulseStart;
    const revealActive = pulseAge >= 0 && pulseAge < DISCOVERY_PULSE_DURATION;
    const fade = THREE.MathUtils.clamp(
      (DISCOVERY_PULSE_DURATION - pulseAge) / 1.4,
      0,
      1,
    );
    const pulse = 0.58 + (Math.sin(pulseAge * 4.2) * 0.5 + 0.5) * 0.34;
    for (const overlay of interactionOverlays) {
      const highlighted = overlay.destinationId === hoveredTarget?.userData.destination.id
        && interactionState !== INTERACTION_STATE.FOCUSED;
      const opacity = highlighted ? 1 : revealActive ? pulse * fade : 0;
      setOverlayOpacity(overlay, opacity);
    }
  }

  function startCameraTransition(position, quaternion, onComplete) {
    cameraTransition = {
      position: position.clone(),
      quaternion: quaternion.clone(),
      onComplete,
    };
  }

  function updateCameraTransition(delta) {
    if (!cameraTransition) return;
    const blend = 1 - Math.exp(-6.5 * delta);
    camera.position.lerp(cameraTransition.position, blend);
    camera.quaternion.slerp(cameraTransition.quaternion, blend);

    if (
      camera.position.distanceToSquared(cameraTransition.position) < 0.0004
      && camera.quaternion.angleTo(cameraTransition.quaternion) < 0.002
    ) {
      camera.position.copy(cameraTransition.position);
      camera.quaternion.copy(cameraTransition.quaternion);
      const complete = cameraTransition.onComplete;
      cameraTransition = null;
      complete?.();
    }
  }

  function showCard(destination) {
    if (!deskCard) return;
    deskCardEyebrow.textContent = destination.eyebrow;
    deskCardTitle.textContent = destination.title;
    deskCardCopy.textContent = destination.copy;
    renderCardProjects(destination.projects || []);
    deskCardLink.href = destination.href;
    deskCardLink.textContent = destination.linkLabel;
    deskCard.hidden = false;
    deskCardLink.focus({ preventScroll: true });
  }

  function renderCardProjects(projects) {
    if (!deskCardProjects) return;
    deskCardProjects.replaceChildren();
    deskCardProjects.hidden = projects.length === 0;
    for (const project of projects) {
      const link = document.createElement('a');
      link.className = 'desk-card-project';
      link.href = project.href;

      const title = document.createElement('strong');
      title.textContent = project.title;
      const meta = document.createElement('span');
      meta.textContent = project.meta;
      link.append(title, meta);
      deskCardProjects.appendChild(link);
    }
  }

  function closeCard() {
    if (deskCard) deskCard.hidden = true;
  }

  function resize() {
    if (isolatedSplatTestRunning) return;
    const bounds = viewport.getBoundingClientRect();
    const heroBounds = hero.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    if (deskReticle) {
      deskReticle.style.left = `${bounds.left - heroBounds.left + (SELECTION_ANCHOR_NDC.x * 0.5 + 0.5) * bounds.width}px`;
      deskReticle.style.top = `${bounds.top - heroBounds.top + (-SELECTION_ANCHOR_NDC.y * 0.5 + 0.5) * bounds.height}px`;
    }
    if (deskFakeReticle) {
      deskFakeReticle.style.left = `${bounds.left - heroBounds.left + bounds.width * 0.5}px`;
      deskFakeReticle.style.top = `${bounds.top - heroBounds.top + bounds.height * 0.5}px`;
    }
    const pixelRatioCap = window.innerWidth < 760 ? 1.25 : 1.6;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    const drawingSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, drawingSize.x, drawingSize.y);
    renderer.render(scene, camera);

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, drawingSize.x, drawingSize.y);
  }

  function animate() {
    if (!running) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    if (cameraTransition) updateCameraTransition(delta);
    else updateCameraMovement(pointerControls, camera, pressedKeys, delta);
    updateHoveredTarget();
    updateInteractionOverlays(clock.elapsedTime);
    render();
  }

  function updateLoop() {
    if (isolatedSplatTestRunning) return;
    const shouldRun = heroVisible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    renderer.setAnimationLoop(shouldRun ? animate : null);
    if (shouldRun) clock.start();
  }

  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateLoop();
  }, { threshold: 0.01 }).observe(hero);
  document.addEventListener('visibilitychange', updateLoop);

  resize();
  updateLoop();

  if (loadingLabel) loadingLabel.textContent = 'loading the desk';
  await desk.initialized;
  loadSegmentOverlays(deskRoot, interactionTargets, segmentTargets).then((overlays) => {
    interactionOverlays.push(...overlays);
    discoveryPulseStart = clock.elapsedTime;
  });
  if (loadingLabel) loadingLabel.textContent = 'loading the figurine';

  try {
    figurineAnchor = await loadFigurine(deskRoot);
    interactionOverlays.push(createFigurineOverlay(figurineAnchor, deskRoot));
    const figurineProxy = createInteractionProxy({
      id: 'figurine',
      label: 'meet Lorie',
      title: 'ABOUT',
      eyebrow: 'figurine',
      copy: 'Hi, I’m Lorie—a creative technologist working between algorithms, images, and physical things.',
      href: 'about.html',
      linkLabel: 'meet Lorie →',
      center: [0, 0.82, 0],
      size: [1.35, 2.05, 1.35],
      pickRadius: 105,
    });
    alignFigurineProxy(figurineProxy, figurineAnchor);
    figurineAnchor.add(figurineProxy);
    interactionTargets.push(figurineProxy);
    figurineTarget = figurineProxy;
  } catch (error) {
    console.warn('Figurine could not load; continuing with the desk:', error);
  }

  if (loadingProgress) loadingProgress.textContent = '100%';
  render();
  requestAnimationFrame(() => {
    setInteractionState(INTERACTION_STATE.EXPLORE);
    hero.classList.add('scene-ready');
  });
}

function setDefaultCamera(camera) {
  camera.position.set(0, 5.5, 18);
  camera.lookAt(-0.076, -1.476, 3.929);
}

function updateCameraMovement(controls, camera, keys, delta) {
  if (!controls.isLocked || !keys.size) return;
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 10 : 4;
  const distance = speed * delta;

  if (keys.has('KeyW')) controls.moveForward(distance);
  if (keys.has('KeyS')) controls.moveForward(-distance);
  if (keys.has('KeyD')) controls.moveRight(distance);
  if (keys.has('KeyA')) controls.moveRight(-distance);
  if (keys.has('KeyE')) camera.position.y += distance;
  if (keys.has('KeyQ')) camera.position.y -= distance;

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -18, 18);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, -12, 18);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -12, 32);
}

function isMovementKey(code) {
  return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(code);
}

function createDebugRay(color, name) {
  const group = new THREE.Group();
  group.name = name;
  group.visible = false;

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, -DEBUG_RAY_LENGTH),
  ]);
  const material = new THREE.LineBasicMaterial({
    color,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 1000;

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.42, 10),
    material,
  );
  cone.renderOrder = 1000;
  group.add(line, cone);
  group.userData.positions = geometry.getAttribute('position');
  group.userData.cone = cone;
  return group;
}

function createDebugSplat() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12),
    new THREE.MeshBasicMaterial({
      color: DEBUG_SPLAT_COLOR,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    }),
  );
  mesh.name = 'intersected-splat-debug-ellipsoid';
  mesh.visible = false;
  mesh.renderOrder = 1002;
  return mesh;
}

function createRenderedSelectionProbe() {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]);
  const material = new THREE.PointsMaterial({
    color: 0xff00ff,
    size: 19,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const marker = new THREE.Points(geometry, material);
  marker.frustumCulled = false;
  scene.add(marker);
  return { scene, marker, target: null, pixels: null, width: 0, height: 0 };
}

function measureRenderedSelectionPixel(probe, renderer, camera, worldPoint, drawingSize) {
  if (probe.width !== drawingSize.x || probe.height !== drawingSize.y) {
    probe.target?.dispose();
    probe.width = drawingSize.x;
    probe.height = drawingSize.y;
    probe.target = new THREE.WebGLRenderTarget(probe.width, probe.height, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    probe.pixels = new Uint8Array(probe.width * probe.height * 4);
  }

  probe.marker.position.copy(worldPoint);
  const previousTarget = renderer.getRenderTarget();
  const previousViewport = renderer.getViewport(new THREE.Vector4());
  const previousScissor = renderer.getScissor(new THREE.Vector4());
  const previousScissorTest = renderer.getScissorTest();
  renderer.setRenderTarget(probe.target);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, probe.width, probe.height);
  renderer.clear(true, true, true);
  renderer.render(probe.scene, camera);
  renderer.readRenderTargetPixels(
    probe.target,
    0,
    0,
    probe.width,
    probe.height,
    probe.pixels,
  );
  renderer.setRenderTarget(previousTarget);
  renderer.setViewport(previousViewport);
  renderer.setScissor(previousScissor);
  renderer.setScissorTest(previousScissorTest);

  const centroid = measureColorCentroid(
    probe.pixels,
    probe.width,
    probe.height,
    (red, green, blue) => red > 180 && green < 80 && blue > 180,
  );
  if (!centroid) return null;
  return {
    x: centroid.x * renderer.domElement.clientWidth / probe.width,
    y: centroid.y * renderer.domElement.clientHeight / probe.height,
  };
}

function measureColorCentroid(pixels, width, height, matches) {
  let count = 0;
  let xTotal = 0;
  let yTotal = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (!matches(pixels[offset], pixels[offset + 1], pixels[offset + 2])) continue;
      count += 1;
      xTotal += x;
      yTotal += height - 1 - y;
    }
  }
  return count > 0 ? { x: xTotal / count, y: yTotal / count } : null;
}

function collectCalibrationSplats(mesh, camera, count) {
  const targetNdc = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(-0.55, 0.38),
    new THREE.Vector2(0, 0.48),
    new THREE.Vector2(0.55, 0.38),
    new THREE.Vector2(-0.55, -0.38),
    new THREE.Vector2(0, -0.48),
    new THREE.Vector2(0.55, -0.38),
  ].slice(0, count);
  const choices = targetNdc.map(() => null);
  const worldCenter = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const proxyCenter = new THREE.Vector3();
  const proxy = mesh.userData.interactionProxy;
  const proxySize = proxy?.userData.destination?.size;
  const inverseProxyMatrix = new THREE.Matrix4();
  mesh.updateWorldMatrix(true, false);
  if (proxy && proxySize) {
    proxy.updateWorldMatrix(true, false);
    inverseProxyMatrix.copy(proxy.matrixWorld).invert();
  }

  mesh.forEachSplat((index, center, scales, quaternion, opacity, color) => {
    if (opacity < RETICLE_MIN_SPLAT_OPACITY) return;
    worldCenter.copy(center).applyMatrix4(mesh.matrixWorld);
    if (proxy && proxySize) {
      proxyCenter.copy(worldCenter).applyMatrix4(inverseProxyMatrix);
      if (
        Math.abs(proxyCenter.x) > proxySize[0] * 0.5
        || Math.abs(proxyCenter.y) > proxySize[1] * 0.5
        || Math.abs(proxyCenter.z) > proxySize[2] * 0.5
      ) return;
    }
    projected.copy(worldCenter).project(camera);
    if (projected.z < -1 || projected.z > 1) return;
    for (let slot = 0; slot < targetNdc.length; slot += 1) {
      const offsetX = projected.x - targetNdc[slot].x;
      const offsetY = projected.y - targetNdc[slot].y;
      const distanceSq = offsetX * offsetX + offsetY * offsetY;
      if (distanceSq >= (choices[slot]?.distanceSq ?? Infinity)) continue;
      choices[slot] = {
        index,
        distanceSq,
        center: center.clone(),
        worldCenter: worldCenter.clone(),
        scales: scales.clone(),
        quaternion: quaternion.clone(),
        opacity,
        color: color.clone(),
      };
    }
  });

  const used = new Set();
  return choices.filter((choice) => {
    if (!choice || used.has(choice.index)) return false;
    used.add(choice.index);
    return true;
  });
}

async function findClosestCalibrationSegment(segments, camera, onProgress) {
  let closest = null;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const [sample] = collectCalibrationSplats(segment, camera, 1);
    if (sample && sample.distanceSq < (closest?.sample.distanceSq ?? Infinity)) {
      closest = { segment, sample };
    }
    onProgress?.((index + 1) / Math.max(1, segments.length));
    await nextAnimationFrame();
  }
  return closest?.segment || null;
}

async function measureIsolatedSplats({
  renderer,
  scene,
  camera,
  spark,
  segment,
  samples,
  onProgress,
}) {
  if (samples.length === 0) throw new Error('No visible calibration splats were found');
  segment.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

  const first = samples[0];
  const isolated = new SplatMesh({
    constructSplats: (splats) => {
      splats.pushSplat(
        first.center,
        first.scales,
        first.quaternion,
        1,
        new THREE.Color(1, 1, 1),
      );
    },
    raycastable: false,
  });
  isolated.name = 'single-splat-isolation-probe';
  isolated.matrixAutoUpdate = false;
  isolated.matrix.copy(segment.matrixWorld);
  isolated.matrixWorld.copy(segment.matrixWorld);
  isolated.frustumCulled = false;
  scene.add(isolated);
  await isolated.initialized;

  const drawingSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(drawingSize.x, drawingSize.y, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  const pixels = new Uint8Array(drawingSize.x * drawingSize.y * 4);
  const previousTarget = renderer.getRenderTarget();
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  const previousBackground = scene.background;
  const topLevelVisibility = scene.children.map((child) => [child, child.visible]);

  for (const child of scene.children) {
    child.visible = child === spark || child === isolated;
  }
  scene.background = null;
  renderer.setRenderTarget(target);
  renderer.setClearColor(var(--color-bone), 0);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, drawingSize.x, drawingSize.y);

  const rows = [];
  try {
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex];
      isolated.packedSplats.setSplat(
        0,
        sample.center,
        sample.scales,
        sample.quaternion,
        1,
        new THREE.Color(1, 1, 1),
      );
      isolated.packedSplats.needsUpdate = true;
      renderer.clear(true, true, true);
      // The second render lets Spark consume the updated packed-splat texture
      // before pixels are read synchronously from the diagnostic target.
      renderer.render(scene, camera);
      renderer.render(scene, camera);
      renderer.getContext().finish();
      renderer.readRenderTargetPixels(
        target,
        0,
        0,
        drawingSize.x,
        drawingSize.y,
        pixels,
      );

      const observed = measurePixelCentroid(
        pixels,
        drawingSize.x,
        drawingSize.y,
        ISOLATED_SPLAT_ALPHA_THRESHOLD,
      );
      const ndc = sample.worldCenter.clone().project(camera);
      const viewCenter = sample.worldCenter.clone().applyMatrix4(camera.matrixWorldInverse);
      const predictedDrawingPixel = {
        x: (ndc.x * 0.5 + 0.5) * drawingSize.x,
        y: (-ndc.y * 0.5 + 0.5) * drawingSize.y,
      };
      const predictedCssPixel = {
        x: predictedDrawingPixel.x * renderer.domElement.clientWidth / drawingSize.x,
        y: predictedDrawingPixel.y * renderer.domElement.clientHeight / drawingSize.y,
      };
      const observedCssCentroid = observed ? {
        x: observed.x * renderer.domElement.clientWidth / drawingSize.x,
        y: observed.y * renderer.domElement.clientHeight / drawingSize.y,
      } : null;
      const errorPx = observedCssCentroid ? {
        x: observedCssCentroid.x - predictedCssPixel.x,
        y: observedCssCentroid.y - predictedCssPixel.y,
      } : null;
      if (errorPx) errorPx.distance = Math.hypot(errorPx.x, errorPx.y);

      rows.push({
        splatIndex: sample.index,
        localCenter: sample.center.toArray(),
        worldCenter: sample.worldCenter.toArray(),
        scales: sample.scales.toArray(),
        quaternion: sample.quaternion.toArray(),
        sourceOpacity: sample.opacity,
        sourceColor: sample.color.toArray(),
        ndc: ndc.toArray(),
        cameraDepth: -viewCenter.z,
        predictedDrawingPixel,
        predictedCssPixel,
        observedDrawingCentroid: observed,
        observedCssCentroid,
        errorPx,
      });
      onProgress?.((sampleIndex + 1) / samples.length);
      await nextAnimationFrame();
    }
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    scene.background = previousBackground;
    for (const [child, visible] of topLevelVisibility) child.visible = visible;
    scene.remove(isolated);
    isolated.dispose();
    target.dispose();
  }

  return {
    capturedAt: new Date().toISOString(),
    segment: segment.name,
    segmentMatrixWorld: segment.matrixWorld.toArray(),
    camera: {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      matrixWorld: camera.matrixWorld.toArray(),
      matrixWorldInverse: camera.matrixWorldInverse.toArray(),
      projectionMatrix: camera.projectionMatrix.toArray(),
      fov: camera.fov,
      aspect: camera.aspect,
      near: camera.near,
      far: camera.far,
    },
    canvas: {
      clientWidth: renderer.domElement.clientWidth,
      clientHeight: renderer.domElement.clientHeight,
      drawingBufferWidth: drawingSize.x,
      drawingBufferHeight: drawingSize.y,
      pixelRatio: renderer.getPixelRatio(),
    },
    rows,
    summary: analyzeIsolationRows(rows),
  };
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function measurePixelCentroid(pixels, width, height, alphaThreshold) {
  let weight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let pixelCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      const topOriginY = height - 1 - y;
      weight += alpha;
      weightedX += x * alpha;
      weightedY += topOriginY * alpha;
      minX = Math.min(minX, x);
      minY = Math.min(minY, topOriginY);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, topOriginY);
      pixelCount += 1;
    }
  }
  if (weight === 0) return null;
  return {
    x: weightedX / weight,
    y: weightedY / weight,
    pixelCount,
    bounds: { minX, minY, maxX, maxY },
  };
}

function analyzeIsolationRows(rows) {
  const measured = rows.filter((row) => row.errorPx);
  if (measured.length === 0) {
    return {
      measured: 0,
      meanErrorPx: null,
      rmsErrorPx: null,
      meanDxPx: null,
      meanDyPx: null,
      classification: 'no-rendered-pixels',
    };
  }
  const totals = measured.reduce((sum, row) => ({
    dx: sum.dx + row.errorPx.x,
    dy: sum.dy + row.errorPx.y,
    distance: sum.distance + row.errorPx.distance,
    squared: sum.squared + row.errorPx.distance ** 2,
  }), { dx: 0, dy: 0, distance: 0, squared: 0 });
  const meanDxPx = totals.dx / measured.length;
  const meanDyPx = totals.dy / measured.length;
  const dxStdDevPx = Math.sqrt(measured.reduce(
    (sum, row) => sum + (row.errorPx.x - meanDxPx) ** 2,
    0,
  ) / measured.length);
  const dyStdDevPx = Math.sqrt(measured.reduce(
    (sum, row) => sum + (row.errorPx.y - meanDyPx) ** 2,
    0,
  ) / measured.length);
  const fitX = fitLinearAxis(measured, 'x');
  const fitY = fitLinearAxis(measured, 'y');
  const rmsErrorPx = Math.sqrt(totals.squared / measured.length);
  const affineResidualRmsPx = Math.sqrt(measured.reduce((sum, row) => {
    const residualX = row.observedCssCentroid.x
      - (fitX.scale * row.predictedCssPixel.x + fitX.offset);
    const residualY = row.observedCssCentroid.y
      - (fitY.scale * row.predictedCssPixel.y + fitY.offset);
    return sum + residualX ** 2 + residualY ** 2;
  }, 0) / measured.length);
  let classification = 'nonlinear-or-depth-dependent';
  if (rmsErrorPx < 2) classification = 'aligned';
  else if (dxStdDevPx < 3 && dyStdDevPx < 3) classification = 'constant-translation';
  else if (affineResidualRmsPx < Math.max(3, rmsErrorPx * 0.15)) classification = 'axis-aligned-affine';
  return {
    measured: measured.length,
    meanErrorPx: totals.distance / measured.length,
    rmsErrorPx,
    meanDxPx,
    meanDyPx,
    dxStdDevPx,
    dyStdDevPx,
    affineFit: { x: fitX, y: fitY, residualRmsPx: affineResidualRmsPx },
    classification,
  };
}

function fitLinearAxis(rows, axis) {
  const predictedKey = axis;
  const meanPredicted = rows.reduce(
    (sum, row) => sum + row.predictedCssPixel[predictedKey],
    0,
  ) / rows.length;
  const meanObserved = rows.reduce(
    (sum, row) => sum + row.observedCssCentroid[predictedKey],
    0,
  ) / rows.length;
  let covariance = 0;
  let variance = 0;
  for (const row of rows) {
    const predictedDelta = row.predictedCssPixel[predictedKey] - meanPredicted;
    covariance += predictedDelta
      * (row.observedCssCentroid[predictedKey] - meanObserved);
    variance += predictedDelta ** 2;
  }
  const scale = variance > 1e-9 ? covariance / variance : 1;
  return { scale, offset: meanObserved - scale * meanPredicted };
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function findReticleSplat(mesh, camera, canvas) {
  let closest = null;
  let supportCount = 0;
  const worldCenter = new THREE.Vector3();
  const projectedCenter = new THREE.Vector3();
  const proxyCenter = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const cameraDepthOffset = cameraDirection.dot(cameraPosition);
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const selectionAnchorNdc = getSelectionAnchorNdc(canvas);
  mesh.updateWorldMatrix(true, false);
  const proxy = mesh.userData.interactionProxy;
  const proxySize = proxy?.userData.destination?.size;
  const inverseProxyMatrix = new THREE.Matrix4();
  if (proxy && proxySize) {
    proxy.updateWorldMatrix(true, false);
    inverseProxyMatrix.copy(proxy.matrixWorld).invert();
  }

  mesh.forEachSplat((index, center, scales, quaternion, opacity) => {
    if (opacity < RETICLE_MIN_SPLAT_OPACITY) return;
    worldCenter.copy(center).applyMatrix4(mesh.matrixWorld);

    // Segmented PLYs can contain stray/background Gaussians. A selectable
    // Gaussian must remain inside its destination's transformed object bounds
    // before its projected center is considered against the reticle.
    if (proxy && proxySize) {
      proxyCenter.copy(worldCenter).applyMatrix4(inverseProxyMatrix);
      if (
        Math.abs(proxyCenter.x) > proxySize[0] * 0.5
        || Math.abs(proxyCenter.y) > proxySize[1] * 0.5
        || Math.abs(proxyCenter.z) > proxySize[2] * 0.5
      ) return;
    }

    projectedCenter.copy(worldCenter).project(camera);
    if (projectedCenter.z < -1 || projectedCenter.z > 1) return;

    const screenX = (projectedCenter.x - selectionAnchorNdc.x) * width * 0.5;
    const screenY = (projectedCenter.y - selectionAnchorNdc.y) * height * 0.5;
    const screenDistance = Math.hypot(screenX, screenY);
    if (screenDistance > RETICLE_PICK_RADIUS_PX) return;
    supportCount += 1;

    const depth = cameraDirection.dot(worldCenter) - cameraDepthOffset;
    if (depth <= camera.near || depth >= (closest?.depth ?? Infinity)) return;

    closest = {
      index,
      depth,
      screenDistance,
      center: center.clone(),
      worldCenter: worldCenter.clone(),
      scales: scales.clone(),
      quaternion: quaternion.clone(),
      opacity,
    };
  });
  if (!closest || supportCount < RETICLE_MIN_SPLAT_SUPPORT) return null;
  closest.supportCount = supportCount;
  return closest;
}

function findProjectedProxyHit(proxy, camera, canvas, selectionNdc) {
  proxy.updateWorldMatrix(true, false);
  const worldBounds = new THREE.Box3().setFromObject(proxy);
  if (worldBounds.isEmpty()) return null;

  const min = worldBounds.min;
  const max = worldBounds.max;
  const corner = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let visibleCorners = 0;
  for (let index = 0; index < 8; index += 1) {
    corner.set(
      index & 1 ? max.x : min.x,
      index & 2 ? max.y : min.y,
      index & 4 ? max.z : min.z,
    );
    projected.copy(corner).project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    minX = Math.min(minX, projected.x);
    minY = Math.min(minY, projected.y);
    maxX = Math.max(maxX, projected.x);
    maxY = Math.max(maxY, projected.y);
    visibleCorners += 1;
  }
  if (visibleCorners === 0) return null;

  const paddingX = 18 * 2 / Math.max(1, canvas.clientWidth);
  const paddingY = 18 * 2 / Math.max(1, canvas.clientHeight);
  if (
    selectionNdc.x < minX - paddingX
    || selectionNdc.x > maxX + paddingX
    || selectionNdc.y < minY - paddingY
    || selectionNdc.y > maxY + paddingY
  ) return null;

  const worldCenter = worldBounds.getCenter(new THREE.Vector3());
  const cameraPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const depth = cameraDirection.dot(worldCenter.clone().sub(cameraPosition));
  if (depth <= camera.near) return null;

  return {
    object: proxy,
    point: worldCenter.clone(),
    reticleSplat: {
      depth,
      worldCenter,
      screenDistance: 0,
      supportCount: 1,
    },
  };
}

function getSelectionAnchorNdc(canvas) {
  SELECTION_ANCHOR_NDC.set(
    INVISIBLE_SELECTION_OFFSET_PX.x * 2 / Math.max(1, canvas.clientWidth),
    -INVISIBLE_SELECTION_OFFSET_PX.y * 2 / Math.max(1, canvas.clientHeight),
  );
  return SELECTION_ANCHOR_NDC;
}

function updateDebugSplat(helper, segment, splat) {
  if (!splat) {
    helper.visible = false;
    return;
  }
  segment.updateWorldMatrix(true, false);
  const segmentPosition = new THREE.Vector3();
  const segmentQuaternion = new THREE.Quaternion();
  const segmentScale = new THREE.Vector3();
  segment.matrixWorld.decompose(segmentPosition, segmentQuaternion, segmentScale);
  helper.position.copy(splat.center).applyMatrix4(segment.matrixWorld);
  helper.quaternion.copy(segmentQuaternion).multiply(splat.quaternion);
  helper.scale.copy(splat.scales)
    .multiply(segmentScale)
    .multiplyScalar(DEBUG_SPLAT_SIGMA);
  helper.visible = true;
}

function setDebugRay(group, origin, direction, length) {
  const end = direction.clone().multiplyScalar(length).add(origin);
  const positions = group.userData.positions;
  positions.setXYZ(0, origin.x, origin.y, origin.z);
  positions.setXYZ(1, end.x, end.y, end.z);
  positions.needsUpdate = true;
  group.userData.cone.position.copy(end);
  group.userData.cone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );
}

function createDebugHud(container) {
  const root = document.createElement('div');
  root.className = 'desk-debug';
  root.hidden = true;
  const readout = document.createElement('pre');
  readout.className = 'desk-debug-readout';
  const centerMarker = createDebugMarker('center', 'CSS center');
  const selectionMarker = createDebugMarker('selection', 'selection NDC');
  const worldMarker = createDebugMarker('world', 'world ray');
  const hitMarker = createDebugMarker('hit', 'splat hit');
  const localMarker = createDebugMarker('local', 'candidate ray');
  root.append(readout, centerMarker, selectionMarker, worldMarker, hitMarker, localMarker);
  container.appendChild(root);
  return {
    root,
    readout,
    centerMarker,
    selectionMarker,
    worldMarker,
    hitMarker,
    localMarker,
  };
}

function createDebugMarker(type, label) {
  const marker = document.createElement('span');
  marker.className = `desk-debug-marker is-${type}`;
  marker.dataset.label = label;
  return marker;
}

function positionDebugMarkerInCanvas(marker, ndc, canvas, container) {
  if (!ndc) return;
  const canvasBounds = canvas.getBoundingClientRect();
  const containerBounds = container.getBoundingClientRect();
  marker.style.left = `${canvasBounds.left - containerBounds.left + (ndc.x * 0.5 + 0.5) * canvasBounds.width}px`;
  marker.style.top = `${canvasBounds.top - containerBounds.top + (-ndc.y * 0.5 + 0.5) * canvasBounds.height}px`;
}

function formatVector(vector, dimensions = 3) {
  const values = [vector.x, vector.y, vector.z].slice(0, dimensions);
  return values.map((value) => value.toFixed(5)).join(', ');
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toExponential(3) : '—';
}

function formatPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y)
    ? `${point.x.toFixed(2)}, ${point.y.toFixed(2)}`
    : '—';
}

function matrixMaxElementDelta(a, b) {
  let delta = 0;
  for (let index = 0; index < 16; index += 1) {
    delta = Math.max(delta, Math.abs(a.elements[index] - b.elements[index]));
  }
  return delta;
}

function vectorMaxElementDelta(a, b) {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.z - b.z),
    Math.abs(a.w - b.w),
  );
}

function isEditableElement(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

async function loadFigurine(deskRoot) {
  const gltf = await new GLTFLoader().loadAsync(`${ASSET_BASE}/lorie_figurine.glb`);
  const figurine = gltf.scene;

  const sourceBounds = new THREE.Box3().setFromObject(figurine);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (sourceSize.y > 0) figurine.scale.multiplyScalar(1.55 / sourceSize.y);

  const normalizedBounds = new THREE.Box3().setFromObject(figurine);
  const normalizedCenter = normalizedBounds.getCenter(new THREE.Vector3());
  figurine.position.set(-normalizedCenter.x, -normalizedBounds.min.y, -normalizedCenter.z);
  figurine.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  const anchor = new THREE.Group();
  anchor.name = 'figurine-splat-anchor';
  const figurineFallback = {
    position: readLegacyFigurinePosition(),
    quaternion: DEFAULT_FIGURINE_TRANSFORM.quaternion,
  };
  applyStoredTransform(anchor, FIGURINE_STORAGE_KEY, figurineFallback);
  anchor.add(figurine);
  deskRoot.add(anchor);
  return anchor;
}

function readLegacyFigurinePosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_FIGURINE_STORAGE_KEY));
    if (saved && [saved.x, saved.y, saved.z].every(Number.isFinite)) {
      return new THREE.Vector3(saved.x, saved.y, saved.z);
    }
  } catch (error) {
    console.warn('Ignoring an invalid legacy figurine position:', error);
  }
  return DEFAULT_FIGURINE_TRANSFORM.position.clone();
}

function applyStoredTransform(object, key, fallbackTransform) {
  object.position.copy(fallbackTransform.position);
  object.quaternion.copy(fallbackTransform.quaternion);
  object.scale.copy(fallbackTransform.scale || new THREE.Vector3(1, 1, 1));
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.position?.length === 3 && saved?.quaternion?.length === 4) {
      object.position.fromArray(saved.position);
      object.quaternion.fromArray(saved.quaternion).normalize();
      if (saved.scale?.length === 3 && saved.scale.every(Number.isFinite)) {
        object.scale.fromArray(saved.scale);
      }
    }
  } catch (error) {
    console.warn(`Ignoring invalid transform ${key}:`, error);
  }
}

function createInteractionProxy(destination) {
  const geometry = new THREE.BoxGeometry(...destination.size);
  const material = new THREE.MeshBasicMaterial({
    color: 0x287cff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const proxy = new THREE.Mesh(geometry, material);
  proxy.name = `${destination.id}-interaction-proxy`;
  proxy.position.fromArray(destination.center);
  proxy.layers.set(2);
  proxy.userData.destination = destination;
  return proxy;
}

function alignFigurineProxy(proxy, figurineAnchor) {
  figurineAnchor.updateWorldMatrix(true, true);
  const worldBounds = new THREE.Box3().setFromObject(figurineAnchor);
  const worldCenter = worldBounds.getCenter(new THREE.Vector3());
  proxy.userData.visualWorldCenter = worldCenter.clone();
  proxy.position.copy(figurineAnchor.worldToLocal(worldCenter));
}

function getTargetWorldCenter(target) {
  if (target.userData.visualSource && target.userData.visualCenter) {
    target.userData.visualSource.updateWorldMatrix(true, false);
    return target.userData.visualCenter.clone().applyMatrix4(
      target.userData.visualSource.matrixWorld,
    );
  }
  if (target.userData.visualWorldCenter) {
    return target.userData.visualWorldCenter.clone();
  }
  return target.getWorldPosition(new THREE.Vector3());
}

function createFigurineOverlay(figurineAnchor, deskRoot) {
  const overlay = figurineAnchor.clone(true);
  const materials = [];
  overlay.name = 'figurine-discovery-overlay';
  overlay.visible = false;
  overlay.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.material = new THREE.MeshBasicMaterial({
      color: 0xff78b7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(object.material);
  });
  deskRoot.add(overlay);
  return { mesh: overlay, materials, destinationId: 'figurine' };
}

function setOverlayOpacity(overlay, opacity) {
  // Do not submit transparent preview splats to Spark. They remain available
  // to the CPU-side selection scan even while hidden.
  overlay.mesh.visible = opacity > 0.002;
  if (overlay.materials) {
    for (const material of overlay.materials) material.opacity = opacity * 0.72;
  } else {
    overlay.mesh.opacity = opacity;
  }
}

async function loadSegmentOverlays(deskRoot, interactionTargets, segmentTargets) {
  const results = await Promise.allSettled(
    DESK_DESTINATIONS
      .filter((destination) => destination.segmentUrl)
      .map(async (destination) => {
        const mesh = new SplatMesh({
          url: destination.segmentUrl,
          // Interaction is based on projected splat centers, not 3D ray hits.
          raycastable: false,
        });
        mesh.name = `${destination.id}-discovery-overlay`;
        mesh.visible = false;
        mesh.opacity = 0;
        deskRoot.add(mesh);
        await mesh.initialized;
        alignProxyToSplatCentroid(destination, mesh, interactionTargets);
        const proxy = interactionTargets.find(
          (target) => target.userData.destination.id === destination.id,
        );
        mesh.userData.destination = destination;
        mesh.userData.interactionProxy = proxy;
        mesh.userData.isSegmentSurface = true;
        mesh.layers.enable(2);
        mesh.visible = true;
        interactionTargets.push(mesh);
        segmentTargets.push(mesh);
        // Spark's recolor is multiplicative, so a bright pink remains visible
        // over both the darkest and lightest source Gaussians.
        mesh.recolor?.set(0xff78b7);
        return { mesh, destinationId: destination.id };
      }),
  );

  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return [result.value];
    console.warn('A segmented object overlay could not load:', result.reason);
    return [];
  });
}

function alignProxyToSplatCentroid(destination, mesh, interactionTargets) {
  const proxy = interactionTargets.find(
    (target) => target.userData.destination.id === destination.id,
  );
  if (!proxy) return;

  // Bounding-box centers are highly sensitive to stray/background Gaussians,
  // especially along depth. A sampled arithmetic centroid tracks the visible
  // mass of the segmented object much more closely without blocking startup.
  const center = new THREE.Vector3();
  let sampleCount = 0;
  mesh.forEachSplat((index, splatCenter) => {
    if (index % 16 !== 0) return;
    center.add(splatCenter);
    sampleCount += 1;
  });
  if (sampleCount === 0) return;
  center.multiplyScalar(1 / sampleCount);

  proxy.userData.visualSource = mesh;
  proxy.userData.visualCenter = center.clone();
  proxy.position.copy(center);
  proxy.scale.set(1, 1, 1);
  proxy.userData.renderedCentroid = center.toArray();
  proxy.updateMatrixWorld(true);
}
