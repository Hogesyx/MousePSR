import {
  calculateCssPixelsPerCm,
  calculateDifferencePercent,
  calculateScreenTravelCm,
  calculateSensitivityRatio,
  calculateStatistics,
  verticalQuality,
} from './calc.js';

const STORAGE_KEY = 'mousepsr-state-v1';
const state = loadState();
let measuring = false;
let totalX = 0;
let totalAbsY = 0;

const app = document.querySelector('#app');

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      cssPixelsPerCm: null,
      referenceCm: 10,
      referencePx: 378,
      mouseTravelCm: 10,
      targetPsr: 2.74,
      runs: [],
    };
  } catch {
    return { cssPixelsPerCm: null, referenceCm: 10, referencePx: 378, mouseTravelCm: 10, targetPsr: 2.74, runs: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const included = state.runs.filter((run) => run.included !== false).map((run) => run.ratio);
  const stats = calculateStatistics(included);
  const current = stats.mean || 0;
  const diff = current && state.targetPsr ? calculateDifferencePercent(current, state.targetPsr) : 0;

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
      <p>Place a ruler against the screen and adjust the bar until it is exactly <strong>${state.referenceCm.toFixed(2)} cm</strong> wide.</p>
      <div class="calibration-stage">
        <div id="referenceBar" class="reference-bar" style="width:${state.referencePx}px"></div>
      </div>
      <div class="controls compact">
        <button id="minus" type="button">−</button>
        <input id="referencePx" type="number" min="50" max="4000" step="1" value="${state.referencePx}" aria-label="Reference width in CSS pixels" />
        <span>CSS px</span>
        <button id="plus" type="button">+</button>
        <label>Physical length <input id="referenceCm" type="number" min="1" max="100" step="0.01" value="${state.referenceCm}" /> cm</label>
        <button id="confirmDisplay" class="primary" type="button">Confirm display calibration</button>
      </div>
      <p class="hint">Arrow keys fine-adjust by 1 px; Shift + Arrow adjusts by 10 px while the pixel input is focused.</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <div><span class="step">2</span><h2>Measure sensitivity</h2></div>
        <span class="status ${state.cssPixelsPerCm ? 'ok' : ''}">${state.cssPixelsPerCm ? 'Ready' : 'Calibrate display first'}</span>
      </div>
      <div class="controls">
        <label>Physical mouse travel <input id="mouseTravel" type="number" min="1" max="100" step="0.01" value="${state.mouseTravelCm}" /> cm</label>
        <button id="startMeasurement" class="primary" type="button" ${state.cssPixelsPerCm ? '' : 'disabled'}>${measuring ? 'Measuring…' : 'Start measurement'}</button>
      </div>
      <p>Place the mouse at your start mark, click Start, then move it exactly the selected distance horizontally. Press <kbd>Space</kbd> to finish. Press <kbd>Esc</kbd> to cancel.</p>
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
          <thead><tr><th>Use</th><th>Run</th><th>Screen travel</th><th>Mouse PSR</th><th>Vertical quality</th></tr></thead>
          <tbody>${state.runs.map((run, i) => `<tr>
            <td><input class="runToggle" data-id="${run.id}" type="checkbox" ${run.included !== false ? 'checked' : ''}></td>
            <td>${i + 1}</td>
            <td>${run.screenTravelCm.toFixed(2)} cm</td>
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
      <p>For repeatability, disable mouse acceleration, keep browser zoom/display settings unchanged, use an accurately measured physical mouse travel distance, and average several smooth horizontal sweeps.</p>
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  const referencePx = document.querySelector('#referencePx');
  const referenceCm = document.querySelector('#referenceCm');
  const setReferencePx = (value) => {
    state.referencePx = Math.max(50, Math.min(4000, Number(value) || 50));
    saveState(); render();
  };

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
  referenceCm.addEventListener('change', (e) => {
    state.referenceCm = Math.max(1, Number(e.target.value) || 10);
    saveState(); render();
  });
  document.querySelector('#confirmDisplay').addEventListener('click', () => {
    state.cssPixelsPerCm = calculateCssPixelsPerCm(state.referencePx, state.referenceCm);
    state.environment = captureEnvironment();
    saveState(); render();
  });
  document.querySelector('#mouseTravel').addEventListener('change', (e) => {
    state.mouseTravelCm = Math.max(1, Number(e.target.value) || 10);
    saveState();
  });
  document.querySelector('#targetPsr').addEventListener('change', (e) => {
    state.targetPsr = Math.max(0.001, Number(e.target.value) || 2.74);
    saveState(); render();
  });
  document.querySelector('#startMeasurement')?.addEventListener('click', startMeasurement);
  document.querySelector('#clearRuns')?.addEventListener('click', () => {
    state.runs = []; saveState(); render();
  });
  document.querySelectorAll('.runToggle').forEach((input) => input.addEventListener('change', (e) => {
    const run = state.runs.find((item) => item.id === e.target.dataset.id);
    if (run) run.included = e.target.checked;
    saveState(); render();
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
  if (measuring && document.pointerLockElement !== document.body) {
    finishMeasurement(true);
  }
});

render();
