const C = 299_792_458;

const modes = [...document.querySelectorAll('.mode-button')];
const panels = [...document.querySelectorAll('.mode-panel')];
const presets = [...document.querySelectorAll('[data-time]')];
const hardware = document.querySelector('#hardware');
const customValue = document.querySelector('#custom-value');
const customUnit = document.querySelector('#custom-unit');
const medium = document.querySelector('#medium');
const objectLayer = document.querySelector('#object-layer');
const scene = document.querySelector('#scene');

let mode = 'units';
let seconds = 1e-9;

const landmarks = [
  { distance: .001, label: '1 mm', short: 'millimetre' },
  { distance: .3, label: '30 cm', short: 'ruler' },
  { distance: 1.7, label: '1.7 m', short: 'person' },
  { distance: 100, label: '100 m', short: 'city block' },
  { distance: 300, label: '300 m', short: 'Eiffel Tower' },
  { distance: 1000, label: '1 km', short: 'kilometre' },
  { distance: 300_000, label: '300 km', short: 'city to city' },
  { distance: 12_742_000, label: '12,742 km', short: 'Earth' },
  { distance: 384_400_000, label: '384,400 km', short: 'Moon' },
  { distance: 299_792_458, label: '1 light-second', short: 'light-second' },
];

function formatTime(value) {
  if (value < 1e-9) return `${formatNumber(value * 1e12)} picoseconds`;
  if (value < 1e-6) return `${formatNumber(value * 1e9)} nanoseconds`;
  if (value < 1e-3) return `${formatNumber(value * 1e6)} microseconds`;
  if (value < 1) return `${formatNumber(value * 1e3)} milliseconds`;
  return `${formatNumber(value)} seconds`;
}

function formatNumber(value, digits = 3) {
  if (Math.abs(value) >= 1000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  return Number(value.toPrecision(digits)).toString();
}

function formatDistance(metres) {
  if (metres < .01) return `${formatNumber(metres * 1000)} mm`;
  if (metres < 1) return `${formatNumber(metres * 100)} cm`;
  if (metres < 1000) return `${formatNumber(metres)} m`;
  if (metres < 1e6) return `${formatNumber(metres / 1000)} km`;
  return `${formatNumber(metres / 1e6)} million km`;
}

function comparisonFor(distance) {
  if (distance < .01) return { title: 'Smaller than a grain of rice.', copy: 'At picosecond scales, even light moves only fractions of a millimetre.', object: 'none', objectLabel: '' };
  if (distance < .75) return { title: 'About the length of a school ruler.', copy: 'Hopper’s famous nanosecond wire was 11.8 inches long—the maximum distance light can travel in this time.', object: 'none', objectLabel: '' };
  if (distance < 3) return { title: 'About one person tall.', copy: 'The signal could cross a room-scale object, but not yet a building.', object: 'person', objectLabel: '1.7 m person' };
  if (distance < 250) return { title: 'Now the wire crosses a city block.', copy: 'At this scale, drawing the wire full-size stops being useful. The scene switches to a spatial reference.', object: 'city', objectLabel: '≈ 100 m city block' };
  if (distance < 1500) return { title: 'Roughly the height of a skyscraper.', copy: 'A microsecond in vacuum is nearly 300 metres of possible signal travel.', object: 'building', objectLabel: '≈ 300 m tower' };
  if (distance < 1e6) return { title: 'The wire now connects cities.', copy: 'A millisecond is almost 300 kilometres in vacuum. Real links cover less because signals travel more slowly in cable.', object: 'earth', objectLabel: 'city-to-city scale' };
  if (distance < 20e6) return { title: 'The signal can cross a country.', copy: 'At this point, geography is the better measuring tool. Distance is becoming visible as network latency.', object: 'earth', objectLabel: 'continental scale' };
  if (distance < 500e6) return { title: 'The signal can circle Earth—and keep going.', copy: 'Even enormous distances fit inside this delay at light speed, but a round trip consumes twice the one-way time.', object: 'earth', objectLabel: 'Earth diameter · 12,742 km' };
  return { title: 'This is an astronomical wire.', copy: 'One second is one light-second: almost 300,000 kilometres, roughly three quarters of the way to the Moon.', object: 'earth', objectLabel: 'Earth to Moon · 384,400 km' };
}

function drawLandmarkScale(distance) {
  const minLog = -3;
  const maxLog = Math.log10(299_792_458);
  const progress = Math.max(0, Math.min(100, ((Math.log10(Math.max(distance, .001)) - minLog) / (maxLog - minLog)) * 100));
  document.querySelector('#scale-progress').style.width = `${progress}%`;
  const marks = landmarks.filter((_, index) => [0, 1, 2, 4, 6, 7, 9].includes(index));
  document.querySelector('#scale-marks').innerHTML = marks.map((mark) => {
    const x = ((Math.log10(mark.distance) - minLog) / (maxLog - minLog)) * 100;
    const active = distance >= mark.distance ? ' active' : '';
    return `<div class="scale-mark${active}" style="left:${x}%"><span>${mark.short}</span></div>`;
  }).join('');
}

function updateScene(distance, comparison) {
  objectLayer.innerHTML = '';
  const wireWrap = document.querySelector('#wire-wrap');
  const wire = document.querySelector('#wire');
  const spatial = distance >= 3;
  wireWrap.style.inset = spatial ? '18% 5% auto' : '55% 5% auto';
  wire.style.animation = 'none';
  requestAnimationFrame(() => { wire.style.animation = ''; });

  if (comparison.object !== 'none') {
    const object = document.createElement('div');
    object.className = `object object-${comparison.object}`;
    objectLayer.appendChild(object);
    const label = document.createElement('span');
    label.className = 'object-label';
    label.textContent = comparison.objectLabel;
    objectLayer.appendChild(label);
  }

  document.querySelector('#scale-label').textContent = spatial ? 'SPATIAL REFERENCE · NOT TO SCALE' : 'FULL-SCALE WIRE';
  document.querySelector('#ruler-end').textContent = formatDistance(distance);
  scene.setAttribute('aria-label', `${formatTime(seconds)} permits at most ${formatDistance(distance)} of one-way signal travel in the selected medium.`);
}

function update() {
  const factor = Number(medium.value);
  const distance = C * seconds * factor;
  const comparison = comparisonFor(distance);

  document.querySelector('#time-label').textContent = formatTime(seconds);
  document.querySelector('#distance-value').textContent = formatDistance(distance);
  document.querySelector('#speed-output').textContent = factor === 1 ? '100% of c' : `${Math.round(factor * 100)}% of c`;
  document.querySelector('#equation').textContent = `distance = ${factor === 1 ? '299,792,458' : formatNumber(C * factor)} m/s × ${formatTime(seconds)}`;
  document.querySelector('#distance-heading').textContent = comparison.title;
  document.querySelector('#comparison-copy').textContent = comparison.copy;
  updateScene(distance, comparison);
  drawLandmarkScale(distance);
}

function setMode(nextMode) {
  mode = nextMode;
  modes.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  panels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== mode));
  if (mode === 'hardware') seconds = Number(hardware.value);
  if (mode === 'custom') readCustom();
  update();
}

function readCustom() {
  const value = Number(customValue.value);
  const error = document.querySelector('#input-error');
  if (!Number.isFinite(value) || value <= 0) {
    error.textContent = 'Enter a duration greater than zero.';
    return;
  }
  error.textContent = '';
  seconds = value * Number(customUnit.value);
}

modes.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
presets.forEach((button) => button.addEventListener('click', () => {
  presets.forEach((item) => item.classList.toggle('selected', item === button));
  seconds = Number(button.dataset.time);
  update();
}));
hardware.addEventListener('change', () => { seconds = Number(hardware.value); update(); });
[customValue, customUnit].forEach((control) => control.addEventListener('input', () => { readCustom(); update(); }));
medium.addEventListener('change', update);

update();
