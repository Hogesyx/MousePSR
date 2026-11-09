import { calculateWristSweepPercent, calculateDifferencePercent, calculateStatistics } from './calc.js';

const WRIST_STORAGE_KEY = 'mousepsr-wrist-mode-v1';
const WRIST_STYLES = "\n#wristModeMount { margin-bottom: 18px; }\n.mode-selector { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 22px; }\n.mode-selector button { flex: 1 1 240px; text-align: center; }\n.mode-selector button.active { border: 2px solid #4f46e5; box-shadow: 0 0 0 1px #4f46e5 inset; }\n#app > section.panel[hidden] { display: none !important; }\n.wrist-mode-panel .metrics { margin-top: 12px; }\n.wrist-fullscreen {\n  position: fixed; inset: 0; z-index: 2147483647;\n  width: 100vw; height: 100vh; overflow: hidden;\n  display: flex; flex-direction: column; justify-content: space-between; gap: 24px;\n  background: #f5f7fb; color: #111827;\n  padding: clamp(16px, 2.5vw, 36px);\n  user-select: none; -webkit-user-select: none; touch-action: none; cursor: default;\n}\n.wrist-fullscreen::backdrop { background: #f5f7fb; }\n.wrist-fullscreen-header, .wrist-fullscreen-footer {\n  display: flex; align-items: center; justify-content: space-between; gap: 20px;\n  position: relative; z-index: 2;\n}\n.wrist-fullscreen-header strong { font-size: clamp(1rem, 2vw, 1.4rem); }\n.wrist-fullscreen-header p { margin: 6px 0 0; max-width: 650px; }\n.wrist-fullscreen-header button { white-space: nowrap; }\n.wrist-fullscreen-center { position: relative; z-index: 2; text-align: center; width: min(740px, 80vw); margin: auto; pointer-events: none; }\n.wrist-fullscreen-center h2 { font-size: clamp(1.5rem, 4vw, 2.4rem); }\n.wrist-fullscreen-center p { margin: 12px auto; max-width: 600px; color: #64748b; line-height: 1.6; }\n.wrist-gauge { height: 28px; margin: 38px 0 20px; background: #dce3ef; border-radius: 999px; overflow: hidden; }\n.wrist-gauge-fill { height: 100%; width: 0%; background: #4f46e5; border-radius: inherit; transition: width .05s linear; }\n.wrist-coverage { display: block; font-size: clamp(2.6rem, 7vw, 5rem); font-variant-numeric: tabular-nums; }\n.wrist-start-strip { position: absolute; top: 0; bottom: 0; left: 0; width: clamp(24px, 4vw, 64px); background: rgba(79,70,229,.10); border-right: 2px dashed #818cf8; pointer-events: none; }\n.wrist-start-strip span { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-90deg); font-size: .7rem; letter-spacing: .16em; font-weight: bold; color: #4f46e5; }\n.wrist-fullscreen-footer { padding: 18px 22px; border: 1px solid #cbd5e1; border-radius: 14px; background: #fff; font-size: .92rem; }\n#wristLiveStatus.warning { color: #b45309; }\n#wristSessionCount { white-space: nowrap; color: #64748b; }\nhtml[data-theme=\"dark\"] .wrist-fullscreen { background: #0b0f16; color: #f3f4f6; }\nhtml[data-theme=\"dark\"] .wrist-fullscreen::backdrop { background: #0b0f16; }\nhtml[data-theme=\"dark\"] .wrist-fullscreen-center p, html[data-theme=\"dark\"] #wristSessionCount { color: #9ca3af; }\nhtml[data-theme=\"dark\"] .wrist-fullscreen-footer { background: #111827; border-color: #334155; }\nhtml[data-theme=\"dark\"] .wrist-gauge { background: #334155; }\n@media (prefers-color-scheme: dark) {\n  html:not([data-theme]) .wrist-fullscreen { background: #0b0f16; color: #f3f4f6; }\n  html:not([data-theme]) .wrist-fullscreen-center p, html:not([data-theme]) #wristSessionCount { color: #9ca3af; }\n  html:not([data-theme]) .wrist-fullscreen-footer { background: #111827; border-color: #334155; }\n  html:not([data-theme]) .wrist-gauge { background: #334155; }\n}\n@media (max-width: 650px) {\n  .wrist-fullscreen-header, .wrist-fullscreen-footer { flex-direction: column; align-items: flex-start; }\n  .wrist-fullscreen-center { width: 80vw; }\n  #wristSessionCount { white-space: normal; }\n}\n";
let wristOverlay = null;
let wristDrag = null;
let wristSessionCount = 0;
const wristState = loadWristState();

function loadWristState() {
  const defaults = { mode: 'measured', runs: [], target: null };
  try {
    const saved = JSON.parse(localStorage.getItem(WRIST_STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      mode: saved.mode === 'wrist' ? 'wrist' : 'measured',
      runs: Array.isArray(saved.runs) ? saved.runs : [],
      target: Number.isFinite(saved.target) && saved.target > 0 && saved.target <= 100 ? saved.target : null,
    };
  } catch {
    return defaults;
  }
}

function saveWristState() {
  localStorage.setItem(WRIST_STORAGE_KEY, JSON.stringify(wristState));
}

function wristStats() {
  const included = wristState.runs.filter((run) => run.included !== false);
  return { count: included.length, ...calculateStatistics(included.map((run) => run.coveragePercent)) };
}

function wristPanelHtml() {
  const stats = wristStats();
  const target = wristState.target;
  const diff = stats.count && target !== null ? calculateDifferencePercent(stats.mean, target) : null;
  return `
    <section class="panel wrist-mode-panel">
      <div class="section-head">
        <div><span class="step">1</span><h2>Fullscreen wrist sweep</h2></div>
        <span class="status">No ruler needed</span>
      </div>
      <p>Measure how much of the <strong>fullscreen width</strong> your cursor covers with a natural left-to-right wrist gesture. No display bar, ruler, or known physical mouse distance is required.</p>
      <p><strong>Instructions:</strong> enter fullscreen, rest your wrist at its comfortable leftmost position, and position the cursor against the extreme left screen edge. Press and hold the primary mouse button, sweep right using your normal wrist range, then release. Repeat 3–5 times.</p>
      <p class="hint">Use the same wrist pivot, grip, posture, starting position, and rightward gesture on both computers. Disable mouse acceleration where possible. A run touching the right screen edge is discarded because the actual pointer travel may have been clipped.</p>
      <div class="controls">
        <button id="startWristFullscreen" type="button" class="primary">Enter fullscreen wrist sweep</button>
      </div>
      <p class="hint"><strong>Measurement:</strong> horizontal cursor displacement ÷ fullscreen width × 100. This is a <strong>wrist-sweep coverage percentage</strong>, not Mouse PSR (physical ratio) or Mouse MSC (% width per measured inch).</p>
      <div class="section-head" style="margin-top:24px"><div><h2>Wrist-sweep results</h2></div></div>
      ${wristState.runs.length ? `
        <div class="metrics">
          <div><span>Average screen coverage</span><strong>${stats.count ? stats.mean.toFixed(2) + '%' : '—'}</strong></div>
          <div><span>Median coverage</span><strong>${stats.count ? stats.median.toFixed(2) + '%' : '—'}</strong></div>
          <div><span>Standard deviation</span><strong>${stats.count ? stats.sd.toFixed(2) + '%' : '—'}</strong></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Use</th><th>Run</th><th>Screen coverage</th><th>Fullscreen width</th></tr></thead>
            <tbody>${wristState.runs.map((run, i) => `<tr>
              <td><input type="checkbox" class="wristRunToggle" data-id="${run.id}" ${run.included !== false ? 'checked' : ''} aria-label="Include wrist run ${i + 1}" /></td>
              <td>${i + 1}</td><td>${run.coveragePercent.toFixed(2)}%</td><td>${Math.round(run.widthPx)} CSS px</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <button type="button" id="clearWristRuns">Clear wrist-sweep runs</button>
      ` : '<p>No wrist sweeps recorded yet. Aim for 3–5 consistent runs.</p>'}
      <div class="section-head" style="margin-top:24px"><div><h2>Match another machine</h2></div></div>
      <p>Record the average on your preferred machine. Enter that number on another computer, repeat the same wrist gesture, and adjust the OS mouse pointer speed until the averages match. These measurements are stored only in this browser.</p>
      <div class="controls">
        <label>Target coverage (%)
          <input id="wristTarget" type="number" min="0.01" max="100" step="0.01" placeholder="e.g. 42.50" value="${target ?? ''}" />
        </label>
        <button type="button" id="wristSetTarget" ${stats.count ? '' : 'disabled'}>Use average as target</button>
      </div>
      ${diff === null
        ? '<p class="hint">Enter a target and record sweeps to see the difference.</p>'
        : `<div class="match-result">
            <strong>${Math.abs(diff) <= 1 ? 'Matched within 1%' : diff < 0 ? 'Increase OS pointer sensitivity' : 'Decrease OS pointer sensitivity'}</strong>
            <span>Current ${stats.mean.toFixed(2)}% · Target ${target.toFixed(2)}% · Difference ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%</span>
          </div>`}
      <p class="hint">This mode depends on you repeating the same natural gesture. It does not know the actual physical mouse travel, and matching percentages does not guarantee identical physical pointer sensitivity.</p>
    </section>
  `;
}

function mountWristMode() {
  const app = document.querySelector('#app');
  const hero = app?.querySelector('.hero');
  if (!hero) return;
  if (!document.querySelector('#wristModeStyles')) {
    const el = document.createElement('style');
    el.id = 'wristModeStyles';
    el.textContent = WRIST_STYLES;
    document.head.appendChild(el);
  }
  let mount = app.querySelector('#wristModeMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'wristModeMount';
    hero.after(mount);
  }
  mount.innerHTML = `
    <div class="mode-selector" role="group" aria-label="Measurement mode">
      <button type="button" id="modeMeasured" class="${wristState.mode === 'measured' ? 'active' : ''}" aria-pressed="${wristState.mode === 'measured'}">Measured distance · PSR / MSC</button>
      <button type="button" id="modeWrist" class="${wristState.mode === 'wrist' ? 'active' : ''}" aria-pressed="${wristState.mode === 'wrist'}">Fullscreen wrist sweep · no ruler</button>
    </div>
    ${wristState.mode === 'wrist' ? wristPanelHtml() : ''}
  `;
  for (const panel of app.querySelectorAll(':scope > section.panel')) {
    panel.hidden = wristState.mode === 'wrist';
  }
  mount.querySelector('#modeMeasured').addEventListener('click', () => {
    wristState.mode = 'measured';
    saveWristState();
    mountWristMode();
  });
  mount.querySelector('#modeWrist').addEventListener('click', () => {
    wristState.mode = 'wrist';
    saveWristState();
    mountWristMode();
  });
  mount.querySelector('#startWristFullscreen')?.addEventListener('click', enterWristFullscreen);
  mount.querySelector('#wristSetTarget')?.addEventListener('click', () => {
    const stats = wristStats();
    if (!stats.count) return;
    wristState.target = stats.mean;
    saveWristState();
    mountWristMode();
  });
  mount.querySelector('#wristTarget')?.addEventListener('change', (event) => {
    const parsed = Number(event.target.value);
    wristState.target = event.target.value.trim() && Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
    saveWristState();
    mountWristMode();
  });
  mount.querySelector('#clearWristRuns')?.addEventListener('click', () => {
    wristState.runs = [];
    saveWristState();
    mountWristMode();
  });
  for (const checkbox of mount.querySelectorAll('.wristRunToggle')) {
    checkbox.addEventListener('change', (event) => {
      const run = wristState.runs.find((r) => r.id === event.target.dataset.id);
      if (run) run.included = event.target.checked;
      saveWristState();
      mountWristMode();
    });
  }
}

function setWristOverlayStatus(message, warning = false) {
  const el = wristOverlay?.querySelector('#wristLiveStatus');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('warning', warning);
}

function setWristOverlayGauge(percent) {
  const fill = wristOverlay?.querySelector('#wristGaugeFill');
  const label = wristOverlay?.querySelector('#wristLiveCoverage');
  if (fill) fill.style.width = `${percent}%`;
  if (label) label.textContent = `${percent.toFixed(2)}%`;
}

function onWristPointerDown(event) {
  if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary || wristDrag) return;
  if (event.target instanceof Element && event.target.closest('button')) return;
  if (document.fullscreenElement !== wristOverlay) return;
  const rect = wristOverlay.getBoundingClientRect();
  const startX = event.clientX - rect.left;
  const startZone = Math.max(24, Math.min(64, rect.width * 0.04));
  if (startX > startZone) {
    setWristOverlayStatus('Position your cursor at the far-left screen edge before clicking.', true);
    return;
  }
  event.preventDefault();
  wristDrag = { pointerId: event.pointerId, startX, width: rect.width };
  wristOverlay.setPointerCapture(event.pointerId);
  setWristOverlayGauge(0);
  setWristOverlayStatus('Recording: sweep right with your normal wrist movement, then release the button.');
}

function onWristPointerMove(event) {
  if (!wristDrag || event.pointerId !== wristDrag.pointerId) return;
  const rect = wristOverlay.getBoundingClientRect();
  setWristOverlayGauge(calculateWristSweepPercent(wristDrag.startX, event.clientX - rect.left, wristDrag.width));
}

function onWristPointerUp(event) {
  if (!wristDrag || event.pointerId !== wristDrag.pointerId) return;
  event.preventDefault();
  const drag = wristDrag;
  wristDrag = null;
  if (wristOverlay?.hasPointerCapture(event.pointerId)) wristOverlay.releasePointerCapture(event.pointerId);
  const rect = wristOverlay.getBoundingClientRect();
  const endX = event.clientX - rect.left;
  const distance = endX - drag.startX;
  if (endX >= drag.width - 3) {
    setWristOverlayStatus('Not saved: cursor reached the right edge, so movement may be clipped. Reduce pointer speed or shorten your sweep.', true);
    return;
  }
  if (distance < Math.max(12, drag.width * 0.02)) {
    setWristOverlayGauge(0);
    setWristOverlayStatus('Not saved: move at least 2% of the screen width from left to right.', true);
    return;
  }
  const coveragePercent = calculateWristSweepPercent(drag.startX, endX, drag.width);
  wristState.runs.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    coveragePercent, widthPx: drag.width, included: true,
    createdAt: new Date().toISOString(),
  });
  wristSessionCount++;
  saveWristState();
  setWristOverlayGauge(coveragePercent);
  const count = wristOverlay?.querySelector('#wristSessionCount');
  if (count) count.textContent = `${wristSessionCount} run${wristSessionCount === 1 ? '' : 's'} recorded`;
  setWristOverlayStatus(`Saved ${coveragePercent.toFixed(2)}%. Move back to the far-left edge to record another sweep.`);
}

function onWristPointerCancel(event) {
  if (!wristDrag || event.pointerId !== wristDrag.pointerId) return;
  wristDrag = null;
  setWristOverlayGauge(0);
  setWristOverlayStatus('Gesture cancelled. Return to the left edge and try again.', true);
}

async function enterWristFullscreen() {
  if (wristOverlay || document.fullscreenElement) return;
  if (!document.fullscreenEnabled) {
    alert('Fullscreen mode is unavailable in this browser. Use a desktop browser that supports the Fullscreen API.');
    return;
  }
  const el = document.createElement('section');
  el.className = 'wrist-fullscreen';
  el.id = 'wristFullscreen';
  el.setAttribute('aria-label', 'Fullscreen wrist sweep');
  el.innerHTML = `
    <div class="wrist-fullscreen-header">
      <div><strong>MousePSR · Fullscreen wrist sweep</strong><p>Position the cursor at the far-left edge, hold the primary mouse button, and sweep right.</p></div>
      <button type="button" id="exitWristFullscreen">Finish · Exit fullscreen</button>
    </div>
    <div class="wrist-start-strip" aria-hidden="true"><span>START</span></div>
    <div class="wrist-fullscreen-center">
      <h2>Use your natural wrist range</h2>
      <p>Keep your wrist at its comfortable leftmost position when starting. Repeat the same movement on other computers.</p>
      <div class="wrist-gauge" aria-hidden="true"><div id="wristGaugeFill" class="wrist-gauge-fill"></div></div>
      <strong id="wristLiveCoverage" class="wrist-coverage">0.00%</strong>
      <p>of fullscreen width covered</p>
    </div>
    <div class="wrist-fullscreen-footer">
      <span id="wristLiveStatus" role="status" aria-live="polite">Start at the far-left screen edge. Hold, swipe right, and release.</span>
      <span id="wristSessionCount">0 runs recorded</span>
    </div>
  `;
  document.body.appendChild(el);
  wristOverlay = el;
  wristDrag = null;
  wristSessionCount = 0;
  el.addEventListener('pointerdown', onWristPointerDown);
  el.addEventListener('pointermove', onWristPointerMove);
  el.addEventListener('pointerup', onWristPointerUp);
  el.addEventListener('pointercancel', onWristPointerCancel);
  el.querySelector('#exitWristFullscreen').addEventListener('click', () => {
    if (document.fullscreenElement === el) document.exitFullscreen();
  });
  try {
    await el.requestFullscreen();
  } catch {
    el.remove();
    if (wristOverlay === el) wristOverlay = null;
    wristDrag = null;
    alert('Fullscreen was blocked or denied. Allow fullscreen and try again.');
  }
}

function onWristFullscreenChange() {
  if (!wristOverlay || document.fullscreenElement === wristOverlay) return;
  wristOverlay.remove();
  wristOverlay = null;
  wristDrag = null;
  wristSessionCount = 0;
  mountWristMode();
}

document.addEventListener('fullscreenchange', onWristFullscreenChange);
export { mountWristMode };
