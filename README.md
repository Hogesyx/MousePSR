# MousePSR

**Measure and match physical mouse sensitivity across operating systems and displays.**

MousePSR defines **Mouse Physical Sensitivity Ratio (Mouse PSR)** as:

> physical horizontal cursor travel on the display ÷ physical horizontal mouse travel on the desk

For example, if moving a mouse 10 cm causes 27.4 cm of physical cursor travel on screen, the Mouse PSR is **2.740**.

## Why

Operating systems expose pointer sensitivity using different scales, and monitor size/scaling changes the physical distance represented by the same number of screen pixels. MousePSR measures the resulting physical experience instead of relying on OS sensitivity numbers.

## How it works

1. Calibrate the display using a known physical length.
2. Choose a physical mouse travel distance (10 cm by default).
3. Start a measurement and move the mouse horizontally by that exact distance.
4. MousePSR uses Pointer Lock relative movement to measure horizontal cursor travel.
5. Repeat several runs and use the averaged Mouse PSR.
6. On another OS/display, adjust pointer sensitivity until its Mouse PSR matches the target.

Mouse movement is intentionally measured on the **horizontal axis only**. Vertical movement is ignored for sensitivity calculation and tracked only as a quality indicator for how straight the sweep was.

## Local development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

## GitHub Pages

A GitHub Actions workflow deploys the Vite build to GitHub Pages. In repository settings, set **Pages → Source → GitHub Actions** if it is not already selected.

## Accuracy notes

- Browser APIs cannot reliably determine a monitor's true physical PPI, so physical display calibration is required.
- Keep browser zoom and display configuration unchanged after calibration.
- Mouse acceleration should be disabled when matching a linear desktop sensitivity.
- Repeat measurements and average multiple consistent runs.
- Pointer Lock and raw/unadjusted input behavior varies by browser and operating system.

## License

GPL-3.0 (see `LICENSE`).
