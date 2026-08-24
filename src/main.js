import {
  calculateCssPixelsPerCm,
  calculateDifferencePercent,
  calculateScreenTravelCm,
  calculateSensitivityRatio,
  calculateStatistics,
  verticalQuality,
  cmToInches,
  inchesToCm,
} from './calc.js';

const STORAGE_KEY = 'mousepsr-state-v1';
const state = loadState();
let measuring = false;
let totalX = 0;
let totalAbsY = 0;

const app = document.querySelector('#app');

function defaultState() {
  return {
    cssPixelsPerCm: null,
    referenceCm: 10,
    referencePx: 378,
    mouseTravelCm: 10,
    targetPsr: 2.74,
    unit: 'cm',
    runs: [],
  };
}

function loadState() {
  try {
    return { ...defaultState(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toDisplayUnit(cm) {
  return state.unit === 'in' ? cmToInches(cm) : cm;
}

function fromDisplayUnit(value) {
  return state.unit === 'in' ? inchesToCm(value) : value;
}

function unitLabel() {
  return state.unit === 'in' ? 'in' : 'cm';
}

function formatDistance(cm, digits = 2) {
  return `${toDisplayUnit(cm).toFixed(digits)} ${unitLabel()}`;
}

function render() {
  const included = state.runs.filter((run) => run.included !== false).map((run) => run.ratio);
  const stats = calculateStatistics(included);
  const current = stats.mean || 0;
  const diff = current && state.targetPsr ? calculateDifferencePercent(current, state.targetPsr) : 0;
  const referenceDisplay = toDisplayUnit(state.referenceCm);
  const mouseTravelDisplay = toDisplayUnit(state.mouseTravelCm);

  app.innerHTML = `
    <header class="hero">
      <p class="eyebrow">Physical cursor calibration</p>
      <h1>MousePSR</h1>
      <p class="lede">Measure and match physical mouse sensitivity across operating systems and displays.</p>
      <div class="formula">Mouse PSR = physical horizontal screen travel ÷ physical horizontal mouse travel</div>
    </header>

    <section class="panel">
      <div class="section-head">
        <div><span class="step">1</span><h2>Calibrate display</h2></div>
        <span class="status ${state.cssPixelsPerCm ? 'ok' : ''}">${state.cssPixelsPerCm ? `${state.cssPixelsPerCm.toFixed(2)} px/cm` : 'Required'}</span>
      </div>

      <div class="controls compact">
        <label>Units
          <select id="unitSelect">
            <option value="cm" ${state.unit === 'cm' ? 'selected' : ''}>Centimeters (cm)</option>
            <option value="in" ${state.unit === 'in' ? 'selected' : ''}>Inches (in)</option>
          </select>
        </label>
      </div>

      <p>Place a physical ruler against the screen and adjust the reference until the distance is exactly <strong>${referenceDisplay.toFixed(2)} ${unitLabel()}</strong>.</p>
      <p class="hint"><strong>Measure from the outside edge of the left border to the outside edge of the right border.</strong> Always use the same outside-edge convention. Do not measure between the inner edges of the thick border.</p>

      <div class="calibration-stage">
        <div id="referenceBar" class="reference-bar" style="width:${state.referencePx}px"></div>
      </div>

      <div class="controls compact">
        <button id="minus" type="button">−</button>
        <input id="referencePx" type="number" min="50" max="4000" step="1" value="${state.referencePx}" aria-label="Reference width in CSS pixels" />
        <span>CSS px</span>
        <button id="plus" type="button">+</button>
        <label>Physical length
          <input id="referenceLength" type="number" min="0.1" max="100" step="0.01" value="${referenceDisplay.toFixed(2)}" /> ${unitLabel()}
        </label>
        <button id="confirmDisplay" class="primary" type="button">Confirm display calibration</button>
      </div>
      <p class="hint">Arrow keys fine-adjust by 1 px; Shift + Arrow adjusts by 10 px while the pixel input is focused. The bar's declared width includes its border, so outside-edge to outside-edge is the calibration reference.</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <div><span class="step">2</span><h2>Measure sensitivity</h2></div>
        <span class="status ${state.cssPixelsPerCm ? 'ok' : ''}">${state.cssPixelsPerCm ? 'Ready' : 'Calibrate display first'}</span>
      </div>
      <div class="controls">
        <label>Physical mouse travel
          <input id="mouseTravel" type="number" min="0.1" max="100" step="0.01" value="${mouseTravelDisplay.toFixed(2)}" /> ${unitLabel()}
        </label>
        <button id="startMeasurement" class="primary" type="button" ${state.cssPixelsPerCm ? '' : 'disabled'}>${measuring ? 'Measuring…' : 'Start measurement'}</button>
      </div>
      <p>Place the mouse at your start mark, click Start, then move it exactly <strong>${mouseTravelDisplay.toFixed(2)} ${unitLabel()}</strong> horizontally. Press <kbd>Space</kbd> to finish. Press <kbd>Esc</kbd> to cancel.</p>
      <div class="measurement ${measuring ? 'active' : ''}">
        <div class="start-line"></div>
        <div class="motion-line"></div>
        <div class="end-line" style="left:${Math.min(96, 4 + Math.abs(totalX) / 20)}%"></div>
        <span>${measuring ? `${Math.round(Math.abs(totalX))} px accumulated` : 'Horizontal movement only'}</span>
      </div>
      <p class="hint">Vertical movement is not used in Mouse PSR. It is tracked only as a sweep-quality indicator.</p>
    </section>

    <section class="panel">
      <div class="section-head"><div><span class="step">3</span><h2>Results</h2></div></div>
      ${state.runs.length ? `
        <div class="metrics">
          <div><span>Average Mouse PSR</span><strong>${stats.mean.toFixed(3)}</strong></div>
          <div><span>Median</span><strong>${stats.median.toFixed(3)}</strong></div>
          <div><span>Std. deviation</span><strong>${stats.sd.toFixed(3)}</strong></div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Use</th><th>Run</th><th>Mouse travel</th><th>Screen travel</th><th>Mouse PSR</th><th>Vertical quality</th></tr></thead>
          <tbody>${state.runs.map((run, i) => `<tr>
            <td><input class="runToggle" data-id="${run.id}" type="checkbox" ${run.included !== false ? 'checked' : ''}></td>
            <td>${i + 1}</td>
            <td>${formatDistance(run.mouseTravelCm)}</td>
            <td>${formatDistance(run.screenTravelCm)}</td>
            <td>${run.ratio.toFixed(3)}</td>
            <td>${(run.verticalQuality * 100).toFixed(1)}%</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <button id="clearRuns" type="button">Clear runs</button>
      ` : '<p>No measurements yet. Aim for 3–5 consistent runs.</p>'}
    </section>

    <section class="panel">
      <div class="section-head"><div><span class="step">4</span><h2>Match a target</h2></div></div>
      <div class="controls">
        <label>Target Mouse PSR <input id="targetPsr" type="number" min="0.001" max="100" step="0.001" value="${state.targetPsr}" /></label>
      </div>
      ${current ? `<div class="match-result">
        <strong>${Math.abs(diff) <= 1 ? 'Matched within 1%' : diff < 0 ? 'Increase OS pointer sensitivity' : 'Decrease OS pointer sensitivity'}</strong>
        <span>Current ${current.toFixed(3)} · Target ${state.targetPsr.toFixed(3)} · Difference ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%</span>
      </div>` : '<p>Complete measurements to compare against a target.</p>'}
    </section>

    <section class="panel methodology">
      <h2>Methodology</h2>
      <p>Browsers cannot reliably know a monitor's true physical PPI. MousePSR therefore calibrates the effective display scale using a known physical length, then measures Pointer Lock relative movement on the horizontal axis.</p>
      <p>Mouse PSR is dimensionless: using centimeters or inches produces the same ratio. Internally, MousePSR normalizes distances to centimeters and converts only for display.</p>
      <p>For repeatability, measure the calibration bar from <strong>outside border edge to outside border edge</strong>, disable mouse acceleration, keep browser zoom/display settings unchanged, use an accurately measured physical mouse travel distance, and average several smooth horizontal sweeps.</p>
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  const referencePx = document.querySelector('#referencePx');
  const referenceLength = document.querySelector('#referenceLength');

  const setReferencePx = (value) => {
    state.referencePx = Math.max(50, Math.min(4000, Number(value) || 50));
    saveState();
    render();
  };

  document.querySelector('#unitSelect').addEventListener('change', (e) => {
    state.unit = e.target.value === 'in' ? 'in' : 'cm';
    saveState();
    render();
  });

  document.querySelector('#minus').addEventListener('click', () => setReferencePx(state.referencePx - 1));
  document.querySelector('#plus').addEventListener('click', () => setReferencePx(state.referencePx + 1));
  referencePx.addEventListener('change', (e) => setReferencePx(e.target.value));
  referencePx.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      setReferencePx(state.referencePx + direction * (e.shiftKey ? 10 : 1));
    }
  });

  referenceLength.addEventListener('change', (e) => {
    const value = Math.max(0.1, Number(e.target.value) || toDisplayUnit(10));
    state.referenceCm = fromDisplayUnit(value);
    saveState();
    render();
  });

  document.querySelector('#confirmDisplay').addEventListener('click', () => {
    state.cssPixelsPerCm = calculateCssPixelsPerCm(state.referencePx, state.referenceCm);
    state.environment = captureEnvironment();
    saveState();
    render();
  });

  document.querySelector('#mouseTravel').addEventListener('change', (e) => {
    const value = Math.max(0.1, Number(e.target.value) || toDisplayUnit(10));
    state.mouseTravelCm = fromDisplayUnit(value);
    saveState();
    render();
  });

  document.querySelector('#targetPsr').addEventListener('change', (e) => {
    state.targetPsr = Math.max(0.001, Number(e.target.value) || 2.74);
    saveState();
    render();
  });

  document.querySelector('#startMeasurement')?.addEventListener('click', startMeasurement);
  document.querySelector('#clearRuns')?.addEventListener('click', () => {
    state.runs = [];
    saveState();
    render();
  });

  document.querySelectorAll('.runToggle').forEach((input) => input.addEventListener('change', (e) => {
    const run = state.runs.find((item) => item.id === e.target.dataset.id);
    if (run) run.included = e.target.checked;
    saveState();
    render();
  }));
}

function captureEnvironment() {
  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    devicePixelRatio,
  };
}

async function startMeasurement() {
  if (!state.cssPixelsPerCm || measuring) return;
  if (!document.body.requestPointerLock) {
    alert('Pointer Lock is not supported by this browser.');
    return;
  }

  totalX = 0;
  totalAbsY = 0;
  measuring = true;
  render();

  try {
    await document.body.requestPointerLock();
  } catch {
    measuring = false;
    render();
    alert('Pointer Lock was denied or unavailable.');
  }
}

function finishMeasurement(cancelled = false) {
  if (!measuring) return;
  measuring = false;
  if (document.pointerLockElement) document.exitPointerLock();

  if (!cancelled && Math.abs(totalX) > 0) {
    const screenTravelCm = calculateScreenTravelCm(totalX, state.cssPixelsPerCm);
    const ratio = calculateSensitivityRatio(screenTravelCm, state.mouseTravelCm);
    state.runs.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      movementCssPx: Math.abs(totalX),
      mouseTravelCm: state.mouseTravelCm,
      screenTravelCm,
      ratio,
      verticalQuality: verticalQuality(totalAbsY, Math.abs(totalX)),
      included: true,
      createdAt: new Date().toISOString(),
    });
    saveState();
  }

  totalX = 0;
  totalAbsY = 0;
  render();
}

document.addEventListener('mousemove', (event) => {
  if (!measuring || document.pointerLockElement !== document.body) return;
  totalX += event.movementX;
  totalAbsY += Math.abs(event.movementY);
  const label = document.querySelector('.measurement span');
  if (label) label.textContent = `${Math.round(Math.abs(totalX))} px accumulated`;
});

document.addEventListener('keydown', (event) => {
  const tag = event.target?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (event.code === 'Space' && measuring) {
    event.preventDefault();
    finishMeasurement(false);
  }
  if (event.key === 'Escape' && measuring) finishMeasurement(true);
});

document.addEventListener('pointerlockchange', () => {
  if (measuring && document.pointerLockElement !== document.body) finishMeasurement(true);
});

render();
