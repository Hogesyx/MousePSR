import {
  calculateCssPixelsPerMm,
  calculateDifferencePercent,
  calculateScreenTravelMm,
  calculateSensitivityRatio,
  calculateStatistics,
  verticalQuality,
  cmToMm,
  inchesToMm,
  mmToCm,
  mmToInches,
} from './calc.js';

const STORAGE_KEY = 'mousepsr-state-v2';
const LEGACY_STORAGE_KEY = 'mousepsr-state-v1';
const state = loadState();
let measuring = false;
let runActive = false;
let runX = 0;
let runAbsY = 0;
let sessionRunCount = 0;

const app = document.querySelector('#app');

function defaultState() {
  return {
    cssPixelsPerMm: null,
    referenceMm: 100,
    referencePx: 378,
    mouseTravelMm: 100,
    targetPsr: 2.74,
    unit: 'mm',
    runs: [],
  };
}

function migrateLegacyState(legacy) {
  if (!legacy || typeof legacy !== 'object') return null;

  return {
    ...defaultState(),
    cssPixelsPerMm: legacy.cssPixelsPerCm ? legacy.cssPixelsPerCm / 10 : null,
    referenceMm: legacy.referenceCm ? cmToMm(legacy.referenceCm) : 100,
    referencePx: legacy.referencePx || 378,
    mouseTravelMm: legacy.mouseTravelCm ? cmToMm(legacy.mouseTravelCm) : 100,
    targetPsr: legacy.targetPsr || 2.74,
    unit: ['mm', 'cm', 'in'].includes(legacy.unit) ? legacy.unit : 'mm',
    environment: legacy.environment,
    runs: Array.isArray(legacy.runs)
      ? legacy.runs.map((run) => ({
          ...run,
          mouseTravelMm: run.mouseTravelMm ?? (run.mouseTravelCm ? cmToMm(run.mouseTravelCm) : 0),
          screenTravelMm: run.screenTravelMm ?? (run.screenTravelCm ? cmToMm(run.screenTravelCm) : 0),
        }))
      : [],
  };
}

function loadState() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (current) return { ...defaultState(), ...current };

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    const migrated = migrateLegacyState(legacy);
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toDisplayUnit(mm) {
  if (state.unit === 'cm') return mmToCm(mm);
  if (state.unit === 'in') return mmToInches(mm);
  return mm;
}

function fromDisplayUnit(value) {
  if (state.unit === 'cm') return cmToMm(value);
  if (state.unit === 'in') return inchesToMm(value);
  return value;
}

function unitLabel() {
  if (state.unit === 'cm') return 'cm';
  if (state.unit === 'in') return 'in';
  return 'mm';
}

function displayDigits() {
  return state.unit === 'mm' ? 1 : 2;
}

function formatDistance(mm, digits = displayDigits()) {
  return `${toDisplayUnit(mm).toFixed(digits)} ${unitLabel()}`;
}

function measurementStatusText() {
  if (!measuring) return 'Ready to start a measurement session';
  if (runActive) return `Run ${sessionRunCount + 1} recording · ${Math.round(Math.abs(runX))} px · release at the second mark`;
  return `Ready for run ${sessionRunCount + 1} · hold the primary mouse button at either mark`;
}

function render() {
  const included = state.runs.filter((run) => run.included !== false).map((run) => run.ratio);
  const stats = calculateStatistics(included);
  const current = stats.mean || 0;
  const diff = current && state.targetPsr ? calculateDifferencePercent(current, state.targetPsr) : 0;
  const referenceDisplay = toDisplayUnit(state.referenceMm);
  const mouseTravelDisplay = toDisplayUnit(state.mouseTravelMm);
  const digits = displayDigits();

  app.innerHTML = `
    <header class="hero">
      <p class="eyebrow">Physical cursor calibration</p>
      <h1>MousePSR</h1>
      <p class="lede">Measure and match consistent physical mouse sensitivity across operating systems and displays.</p>
      <p class="hint"><strong>Designed for linear mouse behavior:</strong> disable mouse acceleration before measuring or matching. On Windows, turn off <strong>Enhance pointer precision</strong>.</p>
      <div class="formula">Mouse PSR = physical horizontal screen travel ÷ physical horizontal mouse travel</div>
    </header>

    <section class="panel">
      <div class="section-head">
        <div><span class="step">1</span><h2>Calibrate display</h2></div>
        <span class="status ${state.cssPixelsPerMm ? 'ok' : ''}">${state.cssPixelsPerMm ? `${state.cssPixelsPerMm.toFixed(3)} px/mm` : 'Required'}</span>
      </div>

      <div class="controls compact">
        <label>Units
          <select id="unitSelect">
            <option value="mm" ${state.unit === 'mm' ? 'selected' : ''}>Millimeters (mm)</option>
            <option value="cm" ${state.unit === 'cm' ? 'selected' : ''}>Centimeters (cm)</option>
            <option value="in" ${state.unit === 'in' ? 'selected' : ''}>Inches (in)</option>
          </select>
        </label>
      </div>

      <p>Place a physical ruler against the screen and adjust the reference until the distance is exactly <strong>${referenceDisplay.toFixed(digits)} ${unitLabel()}</strong>.</p>
      <p class="hint"><strong>Measure from the outside edge of the left border to the outside edge of the right border.</strong> Always use the same outside-edge convention.</p>

      <div class="calibration-stage">
        <div id="referenceBar" class="reference-bar" style="width:${state.referencePx}px"></div>
      </div>

      <div class="controls compact">
        <button id="minus" type="button">−</button>
        <div class="input-with-unit">
          <input id="referencePx" type="number" min="50" max="4000" step="1" value="${state.referencePx}" aria-label="Reference width in CSS pixels" />
          <span>CSS px</span>
        </div>
        <button id="plus" type="button">+</button>
        <label>Physical length
          <div class="input-with-unit">
            <input id="referenceLength" type="number" min="0.01" max="2500" step="${state.unit === 'mm' ? '0.1' : '0.01'}" value="${referenceDisplay.toFixed(digits)}" />
            <span>${unitLabel()}</span>
          </div>
        </label>
        <button id="confirmDisplay" class="primary" type="button">Confirm display calibration</button>
      </div>
      <p class="hint">Arrow keys fine-adjust by 1 px; Shift + Arrow adjusts by 10 px while the pixel input is focused.</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <div><span class="step">2</span><h2>Measure sensitivity</h2></div>
        <span class="status ${state.cssPixelsPerMm ? 'ok' : ''}">${measuring ? 'Session active' : state.cssPixelsPerMm ? 'Ready' : 'Calibrate display first'}</span>
      </div>
      <div class="controls">
        <label>Physical mouse travel
          <div class="input-with-unit">
            <input id="mouseTravel" type="number" min="0.01" max="2500" step="${state.unit === 'mm' ? '0.1' : '0.01'}" value="${mouseTravelDisplay.toFixed(digits)}" ${measuring ? 'disabled' : ''} />
            <span>${unitLabel()}</span>
          </div>
        </label>
        <button id="startMeasurement" class="primary" type="button" ${state.cssPixelsPerMm && !measuring ? '' : 'disabled'}>${measuring ? 'Session active' : 'Start measurement'}</button>
      </div>

      <p>Draw or mark two horizontal reference positions on your desk or mousepad exactly <strong>${mouseTravelDisplay.toFixed(digits)} ${unitLabel()}</strong> apart.</p>
      ${measuring ? `
        <div class="session-instructions">
          <strong>Measurement session active</strong>
          <ol>
            <li>Move the mouse to either marked position.</li>
            <li>Press and hold the primary mouse button to begin a run.</li>
            <li>Move left or right to the other mark and release the button.</li>
            <li>Repeat 2–3 times or more for a better reading.</li>
          </ol>
          <p>Movement while the button is released is ignored, so you can reposition freely.</p>
          <p>Press <kbd>Space</kbd> or <kbd>Esc</kbd> when finished. Exiting Pointer Lock with <kbd>Esc</kbd> also ends the session normally and keeps completed runs.</p>
        </div>
      ` : `<p>After pressing Start, move to either mark, hold the primary mouse button, move horizontally to the other mark, and release. Repeat 2–3 times or more. Press <kbd>Space</kbd> or <kbd>Esc</kbd> to finish the session.</p>`}

      <div class="measurement-status ${measuring ? 'active' : ''} ${runActive ? 'recording' : ''}" aria-live="polite">
        <span class="measurement-state">${measurementStatusText()}</span>
        ${measuring ? `<span class="measurement-count">Completed this session: ${sessionRunCount}</span>` : ''}
      </div>

      <p class="hint">Only horizontal movement while the primary button is held is used for Mouse PSR. Left-to-right and right-to-left runs are both valid. Vertical movement is tracked only as a sweep-quality indicator.</p>
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
            <td>${formatDistance(run.mouseTravelMm ?? cmToMm(run.mouseTravelCm || 0))}</td>
            <td>${formatDistance(run.screenTravelMm ?? cmToMm(run.screenTravelCm || 0))}</td>
            <td>${run.ratio.toFixed(3)}</td>
            <td>${(run.verticalQuality * 100).toFixed(1)}%</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <button id="clearRuns" type="button">Clear runs</button>
      ` : '<p>No measurements yet. Aim for at least 2–3 consistent runs.</p>'}
    </section>

    <section class="panel">
      <div class="section-head"><div><span class="step">4</span><h2>Match a target</h2></div></div>
      <div class="controls">
        <label>Target Mouse PSR
          <input id="targetPsr" type="number" min="0.001" max="100" step="0.001" value="${state.targetPsr}" />
        </label>
      </div>
      <p class="hint"><strong>Illustrative starting points, not standards:</strong> a lower Mouse PSR means slower cursor travel and finer control. Around <strong>3–5</strong> can be explored for precision-focused work, while around <strong>10–12</strong> can be explored for faster general/office navigation. Your preferred value depends on display size, workspace, mouse grip, and personal preference. The best target is usually a Mouse PSR you already find comfortable on one system.</p>
      ${current ? `<div class="match-result">
        <strong>${Math.abs(diff) <= 1 ? 'Matched within 1%' : diff < 0 ? 'Increase OS pointer sensitivity' : 'Decrease OS pointer sensitivity'}</strong>
        <span>Current ${current.toFixed(3)} · Target ${state.targetPsr.toFixed(3)} · Difference ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%</span>
      </div>` : '<p>Complete measurements to compare against a target.</p>'}
    </section>

    <section class="panel methodology">
      <h2>Methodology</h2>
      <p><strong>What MousePSR matches:</strong> MousePSR measures the physical desktop result — how far the cursor travels across the physical display for a given physical mouse movement. If two systems measure the same Mouse PSR, then the same physical mouse travel should produce approximately the same physical horizontal cursor travel on both systems.</p>
      <p><strong>What it does not guarantee:</strong> matching Mouse PSR does not make every part of the input pipeline identical. Operating systems, browsers, mouse polling, filtering, pointer-speed step sizes, display scaling, and hardware can still introduce subtle differences. MousePSR should therefore be treated as a practical way to normalize <em>physical cursor sensitivity</em>, not a guarantee of mathematically identical input behavior.</p>
      <p>Browsers cannot reliably know a monitor's true physical PPI. MousePSR therefore calibrates the effective display scale using a known physical length, then measures Pointer Lock relative movement on the horizontal axis.</p>
      <p>Mouse PSR is dimensionless: millimeters, centimeters, and inches all produce the same ratio. A Mouse PSR of 5 means that 1 cm of physical mouse travel produces approximately 5 cm of physical horizontal cursor travel on the calibrated display.</p>
      <p><strong>For reliable matching:</strong> disable mouse acceleration (including Windows <strong>Enhance pointer precision</strong>), keep browser zoom and display scaling unchanged after calibration, recalibrate when moving to another monitor, mark the mouse travel distance accurately, use smooth horizontal sweeps, and average several consistent runs.</p>
      <p>The most reliable cross-system workflow is to measure a comfortable Mouse PSR on your reference computer, save that value, then adjust pointer speed on each other computer until its measured Mouse PSR is as close as practical to the same target.</p>
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
    state.unit = ['mm', 'cm', 'in'].includes(e.target.value) ? e.target.value : 'mm';
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
    const fallback = toDisplayUnit(100);
    const value = Math.max(0.01, Number(e.target.value) || fallback);
    state.referenceMm = fromDisplayUnit(value);
    saveState();
    render();
  });

  document.querySelector('#confirmDisplay').addEventListener('click', () => {
    state.cssPixelsPerMm = calculateCssPixelsPerMm(state.referencePx, state.referenceMm);
    state.environment = captureEnvironment();
    saveState();
    render();
  });

  document.querySelector('#mouseTravel').addEventListener('change', (e) => {
    const fallback = toDisplayUnit(100);
    const value = Math.max(0.01, Number(e.target.value) || fallback);
    state.mouseTravelMm = fromDisplayUnit(value);
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
  if (!state.cssPixelsPerMm || measuring) return;
  if (!document.body.requestPointerLock) {
    alert('Pointer Lock is not supported by this browser.');
    return;
  }

  runActive = false;
  runX = 0;
  runAbsY = 0;
  sessionRunCount = 0;
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

function beginRun() {
  if (!measuring || runActive || document.pointerLockElement !== document.body) return;
  runActive = true;
  runX = 0;
  runAbsY = 0;
  updateMeasurementStatus();
}

function completeRun() {
  if (!measuring || !runActive) return;
  runActive = false;

  if (Math.abs(runX) > 0) {
    const screenTravelMm = calculateScreenTravelMm(runX, state.cssPixelsPerMm);
    const ratio = calculateSensitivityRatio(screenTravelMm, state.mouseTravelMm);
    state.runs.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      movementCssPx: Math.abs(runX),
      mouseTravelMm: state.mouseTravelMm,
      screenTravelMm,
      ratio,
      verticalQuality: verticalQuality(runAbsY, Math.abs(runX)),
      included: true,
      createdAt: new Date().toISOString(),
    });
    sessionRunCount += 1;
    saveState();
  }

  runX = 0;
  runAbsY = 0;
  render();
}

function finishMeasurement() {
  if (!measuring) return;
  measuring = false;
  runActive = false;
  runX = 0;
  runAbsY = 0;
  const completedRuns = sessionRunCount;
  sessionRunCount = 0;
  if (document.pointerLockElement) document.exitPointerLock();
  render();

  if (completedRuns === 0) {
    alert('No runs were recorded. Start another session and hold the primary mouse button while moving between your marks.');
  }
}

function updateMeasurementStatus() {
  const label = document.querySelector('.measurement-state');
  if (label) label.textContent = measurementStatusText();
}

document.addEventListener('mousemove', (event) => {
  if (!measuring || !runActive || document.pointerLockElement !== document.body) return;
  runX += event.movementX;
  runAbsY += Math.abs(event.movementY);
  updateMeasurementStatus();
});

document.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  beginRun();
});

document.addEventListener('mouseup', (event) => {
  if (event.button !== 0) return;
  completeRun();
});

document.addEventListener('keydown', (event) => {
  const tag = event.target?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (event.code === 'Space' && measuring) {
    event.preventDefault();
    finishMeasurement();
  }

  if (event.key === 'Escape' && measuring) {
    finishMeasurement();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (measuring && document.pointerLockElement !== document.body) finishMeasurement();
});

render();