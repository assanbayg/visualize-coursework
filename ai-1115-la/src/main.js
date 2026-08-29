import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const colors = {
  background: 0x0b1d21,
  u: 0xff7043,
  v: 0x47c9ae,
  result: 0xf1c75b,
  grid: 0x315057,
};

const state = {
  mode: 'vector',
  vectorOperation: 'add',
  fieldOperation: 'field-add',
  grid: true,
  labels: true,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const value = (id) => Number($(`#${id}`).value);
const fmt = (number) => `${Math.abs(number) < 0.05 ? 0 : number.toFixed(1)}`;
const tuple = (values) => `(${values.map(fmt).join(', ')})`;
const complex = ([real, imag]) => `${fmt(real)} ${imag < 0 ? '−' : '+'} ${fmt(Math.abs(imag))}i`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(colors.background);
scene.fog = new THREE.FogExp2(colors.background, 0.035);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const defaultCamera = new THREE.Vector3(7.6, 6.2, 8.4);
camera.position.copy(defaultCamera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#scene').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 18;
controls.target.set(0, 0.6, 0);

scene.add(new THREE.HemisphereLight(0xdffaf3, 0x082127, 2.2));
const keyLight = new THREE.DirectionalLight(0xffe9d8, 2.8);
keyLight.position.set(4, 8, 5);
scene.add(keyLight);

const world = new THREE.Group();
scene.add(world);

const grid = new THREE.GridHelper(10, 20, colors.grid, 0x17353b);
grid.material.transparent = true;
grid.material.opacity = 0.72;
world.add(grid);

const axes = new THREE.Group();
const axisMaterial = new THREE.LineBasicMaterial({ color: 0x709092, transparent: true, opacity: 0.55 });
[
  [new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)],
  [new THREE.Vector3(0, -0.02, -5), new THREE.Vector3(0, -0.02, 5)],
  [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0)],
].forEach((points) => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  axes.add(new THREE.Line(geometry, axisMaterial));
});
world.add(axes);

const vectorLayer = new THREE.Group();
world.add(vectorLayer);
let spanPlane;

function clearVectors() {
  while (vectorLayer.children.length) {
    const child = vectorLayer.children.pop();
    child.traverse((object) => {
      object.geometry?.dispose();
      if (object.material && !Array.isArray(object.material)) object.material.dispose();
    });
  }
  if (spanPlane) {
    world.remove(spanPlane);
    spanPlane.geometry.dispose();
    spanPlane.material.dispose();
    spanPlane = null;
  }
}

function arrow(vector, color, origin = new THREE.Vector3(), opacity = 1) {
  const length = vector.length();
  if (length < 0.001) return;
  const helper = new THREE.ArrowHelper(
    vector.clone().normalize(),
    origin,
    length,
    color,
    Math.min(0.34, length * 0.2),
    Math.min(0.18, length * 0.12),
  );
  helper.line.material.transparent = true;
  helper.line.material.opacity = opacity;
  helper.cone.material.transparent = true;
  helper.cone.material.opacity = opacity;
  vectorLayer.add(helper);

  const endpoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 18, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
  );
  endpoint.position.copy(origin).add(vector);
  vectorLayer.add(endpoint);
}

function dashedLine(start, end, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.65 });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  vectorLayer.add(line);
}

function addSpanPlane(u, v) {
  const normal = new THREE.Vector3().crossVectors(u, v);
  if (normal.length() < 0.05) return;
  const geometry = new THREE.PlaneGeometry(9, 9);
  const material = new THREE.MeshBasicMaterial({ color: colors.result, side: THREE.DoubleSide, transparent: true, opacity: 0.075, depthWrite: false });
  spanPlane = new THREE.Mesh(geometry, material);
  spanPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.normalize());
  world.add(spanPlane);

  const outlineMaterial = new THREE.LineBasicMaterial({ color: colors.result, transparent: true, opacity: 0.18 });
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outlineMaterial);
  spanPlane.add(border);
}

function vectorValues() {
  return {
    u: new THREE.Vector3(value('ux'), value('uz'), value('uy')),
    v: new THREE.Vector3(value('vx'), value('vz'), value('vy')),
    scalar: value('scalar'),
  };
}

function renderVectorMode() {
  clearVectors();
  const { u, v, scalar } = vectorValues();
  const sum = u.clone().add(v);
  arrow(u, colors.u);
  arrow(v, colors.v);
  addSpanPlane(u, v);

  $('#u-output').value = tuple([u.x, u.z, u.y]);
  $('#v-output').value = tuple([v.x, v.z, v.y]);
  $('#scalar-output').value = fmt(scalar);

  if (state.vectorOperation === 'add') {
    arrow(v, colors.v, u, 0.5);
    dashedLine(v, sum, colors.u);
    arrow(sum, colors.result);
    $('#equation-label').textContent = 'CLOSURE UNDER ADDITION';
    $('#equation').textContent = `u + v = ${tuple([sum.x, sum.z, sum.y])}`;
    $('#legend-result').textContent = 'u + v';
  } else if (state.vectorOperation === 'scale') {
    const scaled = u.clone().multiplyScalar(scalar);
    arrow(scaled, colors.result);
    dashedLine(u, scaled, colors.result);
    $('#equation-label').textContent = 'CLOSURE UNDER SCALAR MULTIPLICATION';
    $('#equation').textContent = `${fmt(scalar)}u = ${tuple([scaled.x, scaled.z, scaled.y])}`;
    $('#legend-result').textContent = 'λu';
  } else {
    for (let a = -1.5; a <= 1.5; a += 0.5) {
      const sample = u.clone().multiplyScalar(a).add(v.clone().multiplyScalar(1 - Math.abs(a) / 2));
      arrow(sample, colors.result, new THREE.Vector3(), 0.28);
    }
    $('#equation-label').textContent = 'ALL LINEAR COMBINATIONS';
    $('#equation').textContent = 'span(u, v) = { au + bv | a, b ∈ ℝ }';
    $('#legend-result').textContent = 'span';
  }
}

function fieldValues() {
  return {
    z: [value('zr'), value('zi')],
    w: [value('wr'), value('wi')],
  };
}

function toVector([real, imag]) {
  return new THREE.Vector3(real, 0.03, imag);
}

function renderFieldMode() {
  clearVectors();
  const { z, w } = fieldValues();
  let result;
  arrow(toVector(z), colors.u);
  arrow(toVector(w), colors.v);
  $('#z-output').value = complex(z);
  $('#w-output').value = complex(w);

  if (state.fieldOperation === 'field-add') {
    result = [z[0] + w[0], z[1] + w[1]];
    arrow(toVector(w), colors.v, toVector(z), 0.5);
    arrow(toVector(result), colors.result);
    dashedLine(toVector(w), toVector(result), colors.u);
    $('#equation-label').textContent = 'CLOSURE UNDER ADDITION';
    $('#equation').textContent = `z + w = ${complex(result)}`;
    $('#legend-result').textContent = 'z + w';
    $('#valid-badge').textContent = 'STILL IN ℂ ✓';
  } else if (state.fieldOperation === 'multiply') {
    result = [z[0] * w[0] - z[1] * w[1], z[0] * w[1] + z[1] * w[0]];
    arrow(toVector(result), colors.result);
    $('#equation-label').textContent = 'CLOSURE UNDER MULTIPLICATION';
    $('#equation').textContent = `zw = ${complex(result)}`;
    $('#legend-result').textContent = 'z × w';
    $('#valid-badge').textContent = 'STILL IN ℂ ✓';
  } else {
    const denominator = z[0] ** 2 + z[1] ** 2;
    if (denominator < 0.001) {
      $('#equation-label').textContent = 'MULTIPLICATIVE INVERSE';
      $('#equation').textContent = '0 has no multiplicative inverse';
      $('#valid-badge').textContent = 'z ≠ 0 REQUIRED';
      $('#legend-result').textContent = 'z⁻¹';
      return;
    }
    result = [z[0] / denominator, -z[1] / denominator];
    arrow(toVector(result), colors.result);
    $('#equation-label').textContent = 'MULTIPLICATIVE INVERSE';
    $('#equation').textContent = `z⁻¹ = ${complex(result)}  ·  zz⁻¹ = 1`;
    $('#legend-result').textContent = 'z⁻¹';
    $('#valid-badge').textContent = 'INVERSE EXISTS ✓';
  }
}

const vectorAxioms = [
  ['01', 'u + v ∈ V', 'Closure', 'Adding members of V produces another member of V.'],
  ['02', 'u + v = v + u', 'Commutativity', 'The order of vector addition does not matter.'],
  ['03', '(u + v) + w', 'Associativity', 'Grouping does not change an addition result.'],
  ['04', 'u + 0 = u', 'Zero vector', 'One vector leaves every other vector unchanged.'],
  ['05', 'u + (−u) = 0', 'Additive inverse', 'Every vector has an opposite in the space.'],
  ['06', '1u = u', 'Scalar identity', 'Multiplication by one keeps the same vector.'],
  ['07', 'a(u + v)', 'Distributivity', 'Scaling distributes across vector addition.'],
  ['08', '(ab)u = a(bu)', 'Compatibility', 'Scalar multiplication composes consistently.'],
];

const fieldAxioms = [
  ['01', 'a + b ∈ F', 'Additive closure', 'The sum of two field elements stays in the field.'],
  ['02', 'ab ∈ F', 'Multiplicative closure', 'The product of two field elements stays in the field.'],
  ['03', 'a + 0 = a', 'Additive identity', 'Zero leaves every field element unchanged.'],
  ['04', 'a · 1 = a', 'Multiplicative identity', 'One leaves every field element unchanged.'],
  ['05', 'a + (−a) = 0', 'Additive inverse', 'Every element has an additive opposite.'],
  ['06', 'aa⁻¹ = 1', 'Multiplicative inverse', 'Every nonzero element has a reciprocal.'],
  ['07', 'a(b + c)', 'Distributivity', 'Multiplication distributes over addition.'],
  ['08', 'ab = ba', 'Commutativity', 'Addition and multiplication ignore order.'],
];

function renderAxioms() {
  const axioms = state.mode === 'vector' ? vectorAxioms : fieldAxioms;
  $('#axiom-grid').innerHTML = axioms.map(([number, formula, title, description]) => `
    <article class="axiom-card">
      <span class="axiom-number">${number}</span>
      <code>${formula}</code>
      <h3>${title}</h3>
      <p>${description}</p>
    </article>
  `).join('');
}

function setMode(mode) {
  state.mode = mode;
  $$('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });

  const vectorMode = mode === 'vector';
  $('#vector-controls').hidden = !vectorMode;
  $('#field-controls').hidden = vectorMode;
  $('#vector-operations').hidden = !vectorMode;
  $('#field-operations').hidden = vectorMode;
  $('.axis-y').textContent = vectorMode ? 'y' : 'Im';
  $('.axis-z').textContent = vectorMode ? 'z' : '';
  $('.axis-x').textContent = vectorMode ? 'x' : 'Re';
  axes.children[2].visible = vectorMode;
  $('#legend-first').textContent = vectorMode ? 'u' : 'z';
  $('#legend-second').textContent = vectorMode ? 'v' : 'w';
  $('#dimension-tag').textContent = vectorMode ? 'ℝ³' : 'ℂ';
  $('#control-title').textContent = vectorMode ? 'Choose two vectors' : 'Choose two elements';

  if (vectorMode) {
    $('#eyebrow').textContent = 'VECTOR SPACE · ℝ³';
    $('#page-title').textContent = 'Build with vectors.';
    $('#page-description').textContent = 'Add and scale vectors, then watch every result stay inside their span. That closure is what makes a vector space hold together.';
    $('#axioms-title').textContent = 'A vector space stays consistent';
    $('#axioms-description').textContent = 'These rules guarantee that combining vectors never breaks the system.';
    $('#valid-badge').textContent = 'IN THE SPACE ✓';
    camera.position.copy(defaultCamera);
    controls.target.set(0, 0.6, 0);
  } else {
    $('#eyebrow').textContent = 'FIELD · COMPLEX NUMBERS ℂ';
    $('#page-title').textContent = 'Operate without leaving.';
    $('#page-description').textContent = 'Treat complex numbers as points on a plane. Addition, multiplication, and inverses remain inside the same field.';
    $('#axioms-title').textContent = 'A field supports two operations';
    $('#axioms-description').textContent = 'Addition and multiplication follow rules that make algebra predictable and reversible.';
    camera.position.set(0.2, 8.5, 0.4);
    controls.target.set(0, 0, 0);
  }
  controls.update();
  renderAxioms();
  renderScene();
}

function renderScene() {
  if (state.mode === 'vector') renderVectorMode();
  else renderFieldMode();
}

$$('input[type="range"]').forEach((input) => input.addEventListener('input', renderScene));
$$('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
$$('.operation').forEach((button) => button.addEventListener('click', () => {
  const parent = button.parentElement;
  parent.querySelectorAll('.operation').forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', active);
  });
  if (button.dataset.operation.startsWith('field') || ['multiply', 'inverse'].includes(button.dataset.operation)) {
    state.fieldOperation = button.dataset.operation;
  } else {
    state.vectorOperation = button.dataset.operation;
  }
  renderScene();
}));

$('#toggle-grid').addEventListener('click', () => {
  state.grid = !state.grid;
  grid.visible = state.grid;
  $('#toggle-grid').classList.toggle('active', state.grid);
  $('#toggle-grid').setAttribute('aria-pressed', state.grid);
});

$('#toggle-labels').addEventListener('click', () => {
  state.labels = !state.labels;
  $$('.axis-label, .scene-legend').forEach((element) => { element.hidden = !state.labels; });
  $('#toggle-labels').classList.toggle('active', state.labels);
  $('#toggle-labels').setAttribute('aria-pressed', state.labels);
});

$('#reset-view').addEventListener('click', () => setMode(state.mode));

function resize() {
  const container = $('#scene');
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe($('#scene'));
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

setMode('vector');
resize();
animate();
