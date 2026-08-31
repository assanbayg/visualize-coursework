import * as THREE from 'https://esm.sh/three@0.179.1';
import { OrbitControls } from 'https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js';

const COLORS = {
  background: 0x0a1e23,
  blue: 0x6aa8ff,
  orange: 0xff7a4d,
  green: 0x54d6a2,
  yellow: 0xf2cc67,
  red: 0xff6b6b,
  grid: 0x315057,
  dim: 0x718d91,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const format = (number) => {
  const clean = Math.abs(number) < 0.0001 ? 0 : number;
  return Number.isInteger(clean) ? String(clean) : clean.toFixed(1);
};
const tuple = (values) => `(${values.map(format).join(', ')})`;

function createScene(container, cameraPosition, target) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.FogExp2(COLORS.background, 0.032);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.copy(cameraPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.target.copy(target);

  scene.add(new THREE.HemisphereLight(0xdffaf3, 0x07171b, 2.1));
  const key = new THREE.DirectionalLight(0xffeadb, 2.7);
  key.position.set(5, 7, 6);
  scene.add(key);

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  return { scene, camera, renderer, controls };
}

function setGroupOpacity(group, opacity) {
  group.visible = opacity > 0.01;
  group.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = opacity * (material.userData.baseOpacity ?? 1);
    });
  });
}

function lineBetween(start, end, color, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  material.userData.baseOpacity = opacity;
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

function makeArrow(color) {
  const helper = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.001, color, 0.3, 0.16);
  helper.line.material.userData.baseOpacity = 1;
  helper.cone.material.userData.baseOpacity = 1;
  helper.userData.vector = new THREE.Vector3(0.001, 0, 0);
  helper.userData.target = new THREE.Vector3(0.001, 0, 0);
  helper.userData.origin = new THREE.Vector3();
  return helper;
}

function setArrowTarget(helper, vector, origin = new THREE.Vector3(), immediate = false) {
  helper.userData.target.copy(vector);
  helper.userData.origin.copy(origin);
  if (immediate || prefersReducedMotion) helper.userData.vector.copy(vector);
}

function updateArrow(helper, delta) {
  const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-delta * 7);
  helper.userData.vector.lerp(helper.userData.target, alpha);
  const vector = helper.userData.vector;
  const length = Math.max(0.001, vector.length());
  helper.position.copy(helper.userData.origin);
  helper.setDirection(vector.clone().normalize());
  helper.setLength(length, Math.min(0.34, length * 0.2), Math.min(0.18, length * 0.12));
}

function addSphere(group, position, color, radius = 0.1) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.05 });
  material.userData.baseOpacity = 1;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), material);
  mesh.position.copy(position);
  group.add(mesh);
  return mesh;
}

function createLabel(layer, text, position, className, owner) {
  const element = document.createElement('div');
  element.className = `scene-label ${className || ''}`;
  element.textContent = text;
  element.style.position = 'absolute';
  layer.appendChild(element);
  return { element, position: position.clone(), owner };
}

function updateLabels(labels, camera, renderer) {
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  labels.forEach((label) => {
    const projected = label.position.clone().project(camera);
    const inFront = projected.z < 1;
    label.element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
    label.element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    const ownerVisible = !label.owner || label.owner.visible;
    label.element.style.opacity = inFront && ownerVisible ? String(label.owner?.userData.opacity ?? 1) : '0';
  });
}

// ---------------------------------------------------------------------------
// Function space scene
// ---------------------------------------------------------------------------

const functionStage = createScene(
  $('#function-scene'),
  new THREE.Vector3(0, 0.2, 10),
  new THREE.Vector3(0, 0, 0),
);
const mappingGroup = new THREE.Group();
const vectorGroup = new THREE.Group();
const additionGroup = new THREE.Group();
const identityGroup = new THREE.Group();
functionStage.scene.add(mappingGroup, vectorGroup, additionGroup, identityGroup);

const functionLabels = [];
const labelLayer = $('#function-labels');
const rowY = [2.15, 0, -2.15];
const fValues = [2, 1, -1];
const gValues = [-1, 2, 2];

rowY.forEach((y, index) => {
  const input = new THREE.Vector3(-3.5, y, 0);
  const fOutput = new THREE.Vector3(-0.8, y + 0.35, 0);
  const gOutput = new THREE.Vector3(1.75, y - 0.35, 0);
  addSphere(mappingGroup, input, COLORS.dim, 0.15);
  addSphere(mappingGroup, fOutput, COLORS.blue, 0.13);
  addSphere(mappingGroup, gOutput, COLORS.orange, 0.13);

  const fDirection = fOutput.clone().sub(input);
  const gDirection = gOutput.clone().sub(input);
  const fArrow = new THREE.ArrowHelper(fDirection.clone().normalize(), input, fDirection.length() - 0.17, COLORS.blue, 0.22, 0.12);
  const gArrow = new THREE.ArrowHelper(gDirection.clone().normalize(), input, gDirection.length() - 0.17, COLORS.orange, 0.22, 0.12);
  [fArrow, gArrow].forEach((arrow) => {
    arrow.line.material.userData.baseOpacity = 0.75;
    arrow.cone.material.userData.baseOpacity = 0.9;
    mappingGroup.add(arrow);
  });

  functionLabels.push(createLabel(labelLayer, `s${index + 1}`, input.clone().add(new THREE.Vector3(-0.42, 0, 0)), 'input-label', mappingGroup));
  functionLabels.push(createLabel(labelLayer, `f(s${index + 1}) = ${fValues[index]}`, fOutput.clone().add(new THREE.Vector3(0, 0.35, 0)), 'blue-label', mappingGroup));
  functionLabels.push(createLabel(labelLayer, `g(s${index + 1}) = ${gValues[index]}`, gOutput.clone().add(new THREE.Vector3(0, -0.35, 0)), 'orange-label', mappingGroup));
});

const mappingTitleF = createLabel(labelLayer, 'f', new THREE.Vector3(-0.8, 3.05, 0), 'blue-label', mappingGroup);
const mappingTitleG = createLabel(labelLayer, 'g', new THREE.Vector3(1.75, 3.05, 0), 'orange-label', mappingGroup);
functionLabels.push(mappingTitleF, mappingTitleG);

const axes = new THREE.Group();
[
  [new THREE.Vector3(-4.3, 0, 0), new THREE.Vector3(4.3, 0, 0)],
  [new THREE.Vector3(0, -4.3, 0), new THREE.Vector3(0, 4.3, 0)],
  [new THREE.Vector3(0, 0, -4.3), new THREE.Vector3(0, 0, 4.3)],
].forEach(([start, end]) => axes.add(lineBetween(start, end, COLORS.dim, 0.55)));
vectorGroup.add(axes);

const vectorGrid = new THREE.GridHelper(8, 16, COLORS.grid, 0x17353b);
vectorGrid.material.transparent = true;
vectorGrid.material.opacity = 0.65;
vectorGrid.material.userData.baseOpacity = 0.65;
vectorGroup.add(vectorGrid);

const fArrow3d = makeArrow(COLORS.blue);
const gArrow3d = makeArrow(COLORS.orange);
const sumArrow3d = makeArrow(COLORS.green);
const scalarArrow3d = makeArrow(COLORS.yellow);
const inverseArrow3d = makeArrow(COLORS.red);
vectorGroup.add(fArrow3d, gArrow3d, sumArrow3d, scalarArrow3d, inverseArrow3d);

const fVector = new THREE.Vector3(2, 1, -1);
const gVector = new THREE.Vector3(-1, 2, 2);
const sumVector = fVector.clone().add(gVector);
setArrowTarget(fArrow3d, fVector, undefined, true);
setArrowTarget(gArrow3d, gVector, undefined, true);
setArrowTarget(sumArrow3d, new THREE.Vector3(0.001, 0, 0), undefined, true);
setArrowTarget(scalarArrow3d, new THREE.Vector3(0.001, 0, 0), undefined, true);
setArrowTarget(inverseArrow3d, new THREE.Vector3(0.001, 0, 0), undefined, true);

additionGroup.add(
  lineBetween(fVector, sumVector, COLORS.orange, 0.72, true),
  lineBetween(gVector, sumVector, COLORS.blue, 0.72, true),
);
addSphere(identityGroup, new THREE.Vector3(), COLORS.green, 0.13);

functionLabels.push(
  createLabel(labelLayer, 'f(s₁)', new THREE.Vector3(4.45, 0, 0), '', vectorGroup),
  createLabel(labelLayer, 'f(s₂)', new THREE.Vector3(0, 4.45, 0), '', vectorGroup),
  createLabel(labelLayer, 'f(s₃)', new THREE.Vector3(0, 0, 4.45), '', vectorGroup),
  createLabel(labelLayer, '0 function', new THREE.Vector3(0, 0.35, 0), 'green-label', identityGroup),
);

const steps = [
  {
    title: 'A function is its outputs',
    copy: 'Each arrow records one assignment. Once the three outputs are known, the function is completely determined.',
    kicker: 'FUNCTION VIEW',
    equation: 'f ↦ (f(s₁), f(s₂), f(s₃))',
    view: 'function',
  },
  {
    title: 'The outputs become coordinates',
    copy: 'Read the outputs in input order. The same function f is now the coordinate arrow (2, 1, −1).',
    kicker: 'SAME OBJECT · NEW REPRESENTATION',
    equation: 'f ↔ f⃗ = (2, 1, −1)',
    view: 'vector',
  },
  {
    title: 'A second function is another vector',
    copy: 'The values of g supply its three coordinates in exactly the same way.',
    kicker: 'FUNCTION TO VECTOR',
    equation: 'g ↔ g⃗ = (−1, 2, 2)',
    view: 'vector',
  },
  {
    title: 'Add corresponding outputs',
    copy: 'At each input sᵢ, add only the two values assigned at that input. The highlighted table performs all three calculations.',
    kicker: 'POINTWISE ADDITION',
    equation: '(f + g)(sᵢ) = f(sᵢ) + g(sᵢ)',
    view: 'vector',
  },
  {
    title: 'Pointwise addition is vector addition',
    copy: 'The green diagonal closes the parallelogram: (2,1,−1) + (−1,2,2) = (1,3,1).',
    kicker: 'PARALLELOGRAM RULE',
    equation: 'f + g ↔ f⃗ + g⃗ = (1, 3, 1)',
    view: 'vector',
  },
  {
    title: 'Scale every output',
    copy: 'Move c. Pointwise scalar multiplication changes each output and stretches, shrinks, or reverses the corresponding arrow.',
    kicker: 'SCALAR MULTIPLICATION',
    equation: '(cf)(sᵢ) = c f(sᵢ)',
    view: 'vector',
  },
  {
    title: 'Zero and inverses behave normally',
    copy: 'The zero function is the origin. The additive inverse −f points in the opposite direction, so f + (−f) = 0.',
    kicker: 'IDENTITIES',
    equation: '0 ↔ (0,0,0) · −f ↔ (−2,−1,1)',
    view: 'vector',
  },
];

const functionState = {
  step: 0,
  playing: false,
  lastStepAt: 0,
  view: 'function',
  mappingOpacity: 1,
  vectorOpacity: 0,
};

function setView(view, manual = false) {
  functionState.view = view;
  $$('.view-button').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (manual) {
    functionState.playing = false;
    functionState.step = view === 'function' ? 0 : Math.max(1, functionState.step);
  }
}

function updateStep(step) {
  functionState.step = (step + steps.length) % steps.length;
  const data = steps[functionState.step];
  setView(data.view);
  $('#step-number').textContent = `${String(functionState.step + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
  $('#step-title').textContent = data.title;
  $('#step-copy').textContent = data.copy;
  $('#equation-kicker').textContent = data.kicker;
  $('#main-equation').textContent = data.equation;
  $('#progress').style.width = `${((functionState.step + 1) / steps.length) * 100}%`;
  $('.calculation').classList.toggle('is-active', functionState.step === 3 || functionState.step === 4);

  // Each step introduces only the geometry needed for that mathematical idea.
  fArrow3d.visible = functionState.step >= 1;
  gArrow3d.visible = functionState.step >= 2;
  sumArrow3d.visible = functionState.step >= 4;
  additionGroup.visible = functionState.step === 4;
  scalarArrow3d.visible = functionState.step === 5;
  inverseArrow3d.visible = functionState.step === 6;
  identityGroup.visible = functionState.step === 6;

  setArrowTarget(fArrow3d, functionState.step >= 1 ? fVector : new THREE.Vector3(0.001, 0, 0));
  setArrowTarget(gArrow3d, functionState.step >= 2 ? gVector : new THREE.Vector3(0.001, 0, 0));
  setArrowTarget(sumArrow3d, functionState.step >= 4 ? sumVector : new THREE.Vector3(0.001, 0, 0));
  setArrowTarget(inverseArrow3d, functionState.step === 6 ? fVector.clone().multiplyScalar(-1) : new THREE.Vector3(0.001, 0, 0));

  if (functionState.step === 5) updateScalar();
  functionState.lastStepAt = performance.now();
}

function updateScalar() {
  const scalar = Number($('#scalar').value);
  $('#scalar-output').value = format(scalar);
  const scaled = fValues.map((value) => value * scalar);
  $('#scalar-equation').textContent = `${format(scalar)}f = ${tuple(scaled)}`;
  setArrowTarget(scalarArrow3d, fVector.clone().multiplyScalar(scalar));
  if (functionState.step === 5) $('#main-equation').textContent = `${format(scalar)}f ↔ ${tuple(scaled)}`;
}

$$('.view-button').forEach((button) => button.addEventListener('click', () => {
  setView(button.dataset.view, true);
  updateStep(functionState.step);
}));
$('#scalar').addEventListener('input', () => {
  updateScalar();
  if (functionState.step !== 5) updateStep(5);
});
$('#play').addEventListener('click', () => {
  functionState.playing = true;
  functionState.lastStepAt = performance.now();
});
$('#pause').addEventListener('click', () => { functionState.playing = false; });
$('#step').addEventListener('click', () => {
  functionState.playing = false;
  updateStep(functionState.step + 1);
});
$('#reset').addEventListener('click', () => {
  functionState.playing = false;
  $('#scalar').value = '1';
  updateScalar();
  updateStep(0);
  functionStage.camera.position.set(0, 0.2, 10);
  functionStage.controls.target.set(0, 0, 0);
  functionStage.controls.update();
});
updateScalar();
updateStep(0);

// ---------------------------------------------------------------------------
// Subspace scene
// ---------------------------------------------------------------------------

const subspaceStage = createScene(
  $('#subspace-scene'),
  new THREE.Vector3(0, 0, 9.5),
  new THREE.Vector3(0, 0, 0),
);
subspaceStage.controls.enableRotate = false;
const planeGroup = new THREE.Group();
subspaceStage.scene.add(planeGroup);

for (let i = -4; i <= 4; i += 0.5) {
  const major = Number.isInteger(i);
  planeGroup.add(lineBetween(new THREE.Vector3(-4.5, i, 0), new THREE.Vector3(4.5, i, 0), COLORS.grid, major ? 0.28 : 0.11));
  planeGroup.add(lineBetween(new THREE.Vector3(i, -4.5, 0), new THREE.Vector3(i, 4.5, 0), COLORS.grid, major ? 0.28 : 0.11));
}
planeGroup.add(lineBetween(new THREE.Vector3(-4.6, 0, 0.01), new THREE.Vector3(4.6, 0, 0.01), COLORS.blue, 0.95));
planeGroup.add(lineBetween(new THREE.Vector3(0, -4.6, 0.01), new THREE.Vector3(0, 4.6, 0.01), COLORS.dim, 0.7));

const realAxisGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(9.2, 0.32),
  new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0.08, depthWrite: false }),
);
realAxisGlow.material.userData.baseOpacity = 0.08;
realAxisGlow.position.z = -0.02;
planeGroup.add(realAxisGlow);

const baseArrow = makeArrow(COLORS.blue);
const productArrow = makeArrow(COLORS.green);
planeGroup.add(baseArrow, productArrow);
setArrowTarget(baseArrow, new THREE.Vector3(1, 0, 0), undefined, true);
setArrowTarget(productArrow, new THREE.Vector3(1.5, 0, 0), undefined, true);

const subspaceLabels = [];
const subspaceLabelLayer = $('#subspace-labels');
subspaceLabels.push(
  createLabel(subspaceLabelLayer, 'Re', new THREE.Vector3(4.65, -0.3, 0), '', planeGroup),
  createLabel(subspaceLabelLayer, 'Im', new THREE.Vector3(0.3, 4.4, 0), '', planeGroup),
  createLabel(subspaceLabelLayer, '1', new THREE.Vector3(1, -0.28, 0), 'blue-label', planeGroup),
);
const productLabel = createLabel(subspaceLabelLayer, '1.5', new THREE.Vector3(1.5, 0.35, 0), 'green-label', planeGroup);
subspaceLabels.push(productLabel);

const subspaceState = { field: 'real', complex: new THREE.Vector2(0, 1) };

function updateSubspace() {
  const real = subspaceState.field === 'real';
  let target;
  let productText;
  let equation;
  if (real) {
    const scalar = Number($('#real-scalar').value);
    target = new THREE.Vector3(scalar, 0, 0);
    productText = format(scalar);
    equation = `${format(scalar)} · 1 = ${format(scalar)} ∈ ℝ`;
    $('#real-output').value = format(scalar);
  } else {
    target = new THREE.Vector3(subspaceState.complex.x, subspaceState.complex.y, 0);
    const [realPart, imaginaryPart] = [subspaceState.complex.x, subspaceState.complex.y];
    productText = realPart === 0 ? (imaginaryPart === 1 ? 'i' : '−i') : `${realPart} + ${imaginaryPart}i`;
    equation = `${productText} · 1 = ${productText}${imaginaryPart === 0 ? ' ∈ ℝ' : ' ∉ ℝ'}`;
  }
  setArrowTarget(productArrow, target);
  productArrow.setColor(real || target.y === 0 ? new THREE.Color(COLORS.green) : new THREE.Color(COLORS.red));
  productLabel.position.copy(target).add(new THREE.Vector3(target.y === 0 ? 0 : 0.3, target.y === 0 ? 0.35 : 0.18, 0));
  productLabel.element.textContent = productText;
  productLabel.element.className = `scene-label ${real || target.y === 0 ? 'green-label' : ''}`;

  const closed = real || target.y === 0;
  $('#closure-equation').textContent = equation;
  $('#closure-copy').textContent = real
    ? 'Every real scalar keeps every real vector on the real axis.'
    : closed
      ? 'This scalar happens to stay real, but closure must hold for every complex scalar.'
      : 'The multiplication is defined, but its result does not stay in ℝ.';
  $('#closure-icon').textContent = real ? '✓' : '✕';
  $('.closure-test').classList.toggle('fail', !real);
  $('#subspace-result').classList.toggle('fail', !real);
  $('#subspace-result').textContent = real
    ? 'ℝ is a subspace of ℂ when the scalar field is ℝ'
    : 'ℝ is not a subspace of ℂ when the scalar field is ℂ';
}

$$('.field-button').forEach((button) => button.addEventListener('click', () => {
  subspaceState.field = button.dataset.field;
  $$('.field-button').forEach((candidate) => {
    const active = candidate === button;
    candidate.classList.toggle('active', active);
    candidate.setAttribute('aria-pressed', String(active));
  });
  $('#real-controls').hidden = subspaceState.field !== 'real';
  $('#complex-controls').hidden = subspaceState.field !== 'complex';
  updateSubspace();
}));
$('#real-scalar').addEventListener('input', updateSubspace);
$$('[data-complex]').forEach((button) => button.addEventListener('click', () => {
  const [real, imaginary] = button.dataset.complex.split(',').map(Number);
  subspaceState.complex.set(real, imaginary);
  $$('[data-complex]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
  updateSubspace();
}));
updateSubspace();

// ---------------------------------------------------------------------------
// Lesson navigation and render loop
// ---------------------------------------------------------------------------

function selectLesson(lesson) {
  const functions = lesson === 'functions';
  $('#function-lesson').hidden = !functions;
  $('#subspace-lesson').hidden = functions;
  $$('.lesson-button').forEach((button) => {
    const active = button.dataset.lesson === lesson;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#hero-eyebrow').textContent = functions ? 'FUNCTION SPACE · ℝ³' : 'SUBSPACES · ℂ OVER DIFFERENT FIELDS';
  $('#hero-title').textContent = functions ? 'A function can be a vector.' : 'A subspace depends on its scalars.';
  $('#hero-copy').textContent = functions
    ? 'Three inputs give three coordinates. Pointwise operations become the familiar vector operations of ℝ³.'
    : 'The same subset may pass or fail the subspace test when the underlying field changes.';
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

$$('.lesson-button').forEach((button) => button.addEventListener('click', () => selectLesson(button.dataset.lesson)));

const clock = new THREE.Clock();
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (functionState.playing && now - functionState.lastStepAt > 3200) {
    if (functionState.step === steps.length - 1) functionState.playing = false;
    else updateStep(functionState.step + 1);
  }

  const targetMappingOpacity = functionState.view === 'function' ? 1 : 0;
  const targetVectorOpacity = functionState.view === 'vector' ? 1 : 0;
  const fadeAlpha = prefersReducedMotion ? 1 : 1 - Math.exp(-delta * 5.5);
  functionState.mappingOpacity += (targetMappingOpacity - functionState.mappingOpacity) * fadeAlpha;
  functionState.vectorOpacity += (targetVectorOpacity - functionState.vectorOpacity) * fadeAlpha;
  mappingGroup.userData.opacity = functionState.mappingOpacity;
  vectorGroup.userData.opacity = functionState.vectorOpacity;
  additionGroup.userData.opacity = functionState.vectorOpacity;
  identityGroup.userData.opacity = functionState.vectorOpacity;
  setGroupOpacity(mappingGroup, functionState.mappingOpacity);
  setGroupOpacity(vectorGroup, functionState.vectorOpacity);
  setGroupOpacity(additionGroup, functionState.vectorOpacity);
  setGroupOpacity(identityGroup, functionState.vectorOpacity);

  [fArrow3d, gArrow3d, sumArrow3d, scalarArrow3d, inverseArrow3d].forEach((arrow) => updateArrow(arrow, delta));
  [baseArrow, productArrow].forEach((arrow) => updateArrow(arrow, delta));

  functionStage.controls.update();
  subspaceStage.controls.update();
  functionStage.renderer.render(functionStage.scene, functionStage.camera);
  subspaceStage.renderer.render(subspaceStage.scene, subspaceStage.camera);
  updateLabels(functionLabels, functionStage.camera, functionStage.renderer);
  updateLabels(subspaceLabels, subspaceStage.camera, subspaceStage.renderer);
}
requestAnimationFrame(animate);

// KaTeX is used for the two central statements; all live values remain plain text
// so slider interaction stays instant and accessible.
function renderMath() {
  if (!window.katex) {
    setTimeout(renderMath, 80);
    return;
  }
  window.katex.render('(f+g)(s_i)=f(s_i)+g(s_i)', $('#addition-rule'), { throwOnError: false });
  window.katex.render('\\mathcal{F}(S,F)=F^S', $('#general-formula'), { throwOnError: false });
}
renderMath();
