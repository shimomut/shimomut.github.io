(() => {
  'use strict';

  // ================================================================
  // Hardware reference values (H100 SXM5 BF16)
  // ================================================================
  const PEAK_TFLOPS = 1979;           // BF16 Tensor Core peak
  const HBM_BW_GBS  = 3350;           // GB/s
  const H_DIM       = 8192;           // hidden size (LLaMA 70B)

  // ================================================================
  // Simulation state
  // ================================================================
  const MAX_WARPS = 48;      // max resident warps per SM (simplified)
  const TIMELINE_CELLS = 160; // # of cells rendered horizontally

  const state = {
    batch: 1,
    hbmLatency: 500,
    computeCycles: 2,
    speed: 4,
    cycle: 0,
    running: true,
    numWarps: 1,
    warps: [],
    // ring buffers: for each warp lane, an array of cell states
    laneHistory: [],       // [warpIdx] -> array of state chars
    tcHistory: [],         // global Tensor Core row
    totalCycles: 0,
    busyCycles: 0,
  };

  // DOM
  const $ = (id) => document.getElementById(id);
  const els = {
    batch: $('batch'),
    hbm: $('hbm'),
    compute: $('compute'),
    speed: $('speed'),
    valBatch: $('valBatch'),
    valHBM: $('valHBM'),
    valCompute: $('valCompute'),
    valSpeed: $('valSpeed'),
    btnPlay: $('btnPlay'),
    btnReset: $('btnReset'),
    laneLabels: $('laneLabels'),
    lanes: $('lanes'),
    tcRow: $('tcRow'),
    mUtil: $('mUtil'),
    mWarps: $('mWarps'),
    mCycles: $('mCycles'),
    mCompute: $('mCompute'),
    utilFill: $('utilFill'),
    cmpBatch: $('cmpBatch'),
    cmpShape: $('cmpShape'),
    cmpFlop: $('cmpFlop'),
    cmpAI: $('cmpAI'),
    cmpUtil: $('cmpUtil'),
    cmpBottleneck: $('cmpBottleneck'),
    roofline: $('roofline'),
  };

  // ================================================================
  // Warp management
  // ================================================================
  function computeNumWarps(batch) {
    // Simplified mapping: more batch -> more warps, capped at MAX_WARPS.
    // Reasoning: batch rows get split into tiles; each tile ~1 warp.
    if (batch <= 1)  return 1;
    if (batch <= 2)  return 2;
    if (batch <= 4)  return 4;
    if (batch <= 8)  return 6;
    if (batch <= 16) return 8;
    if (batch <= 32) return 12;
    if (batch <= 64) return 18;
    if (batch <= 128) return 24;
    if (batch <= 256) return 32;
    if (batch <= 512) return 40;
    return MAX_WARPS;
  }

  function newWarp(id) {
    // Start each warp at a slightly staggered point so they don't all
    // stall simultaneously.
    return {
      id,
      state: 'loading',   // 'loading' | 'computing' | 'ready'
      cyclesRemaining: Math.floor(Math.random() * state.hbmLatency),
    };
  }

  function rebuildWarps() {
    state.numWarps = computeNumWarps(state.batch);
    state.warps = [];
    for (let i = 0; i < state.numWarps; i++) state.warps.push(newWarp(i));
    state.laneHistory = [];
    for (let i = 0; i < MAX_WARPS; i++) state.laneHistory.push(new Array(TIMELINE_CELLS).fill('idle'));
    state.tcHistory = new Array(TIMELINE_CELLS).fill('idle');
    state.totalCycles = 0;
    state.busyCycles = 0;
    renderLaneLabels();
  }

  // ================================================================
  // Per-cycle simulation step
  // ================================================================
  function stepOneCycle() {
    // Advance each warp's internal state.
    // Warps in 'loading' decrement cyclesRemaining; when it reaches 0 they
    // become 'ready'. Warps in 'computing' decrement their compute timer.
    const readyWarps = [];
    for (const w of state.warps) {
      if (w.state === 'loading') {
        w.cyclesRemaining--;
        if (w.cyclesRemaining <= 0) {
          w.state = 'ready';
        }
      } else if (w.state === 'computing') {
        // handled after scheduling; still computing this cycle
      }
      if (w.state === 'ready') readyWarps.push(w);
    }

    // Is any warp currently computing? (carries over from prior cycle)
    let computingWarp = state.warps.find(w => w.state === 'computing');

    if (!computingWarp && readyWarps.length > 0) {
      // Warp Scheduler: pick the first ready warp to issue MMA
      computingWarp = readyWarps[0];
      computingWarp.state = 'computing';
      computingWarp.cyclesRemaining = state.computeCycles;
    }

    // Record lane state for this cycle BEFORE consuming the cycle.
    const frameStates = new Array(MAX_WARPS).fill('idle');
    for (const w of state.warps) {
      if (w.state === 'computing' && w === computingWarp) {
        frameStates[w.id] = 'compute';
      } else if (w.state === 'computing') {
        // A warp flagged computing but not the one issuing this cycle
        // should never happen with single TC, but be safe:
        frameStates[w.id] = 'compute';
      } else if (w.state === 'loading') {
        frameStates[w.id] = 'stall';
      } else if (w.state === 'ready') {
        // Ready but waiting for scheduler (TC busy) — treat as stall
        frameStates[w.id] = 'stall';
      }
    }

    // Push into ring buffers
    for (let i = 0; i < MAX_WARPS; i++) {
      state.laneHistory[i].push(frameStates[i]);
      if (state.laneHistory[i].length > TIMELINE_CELLS) state.laneHistory[i].shift();
    }
    state.tcHistory.push(computingWarp ? 'compute' : 'idle');
    if (state.tcHistory.length > TIMELINE_CELLS) state.tcHistory.shift();

    // Advance the computing warp: consume one compute cycle
    if (computingWarp) {
      computingWarp.cyclesRemaining--;
      state.busyCycles++;
      if (computingWarp.cyclesRemaining <= 0) {
        // Finished: go back to loading
        computingWarp.state = 'loading';
        computingWarp.cyclesRemaining = state.hbmLatency;
      }
    }

    state.cycle++;
    state.totalCycles++;
  }

  // ================================================================
  // Rendering
  // ================================================================
  function renderLaneLabels() {
    // Build lane labels for the actual number of warps
    const frag = document.createDocumentFragment();
    for (let i = 0; i < state.numWarps; i++) {
      const d = document.createElement('div');
      d.className = 'lane-label';
      d.textContent = 'Warp ' + i;
      frag.appendChild(d);
    }
    els.laneLabels.innerHTML = '';
    els.laneLabels.appendChild(frag);

    // Build lanes
    const lanesFrag = document.createDocumentFragment();
    for (let i = 0; i < state.numWarps; i++) {
      const lane = document.createElement('div');
      lane.className = 'lane';
      lane.dataset.warp = i;
      for (let j = 0; j < TIMELINE_CELLS; j++) {
        const c = document.createElement('div');
        c.className = 'cell cell-idle';
        lane.appendChild(c);
      }
      lanesFrag.appendChild(lane);
    }
    els.lanes.innerHTML = '';
    els.lanes.appendChild(lanesFrag);

    // Build tensor core row
    els.tcRow.innerHTML = '';
    for (let j = 0; j < TIMELINE_CELLS; j++) {
      const c = document.createElement('div');
      c.className = 'cell cell-idle';
      els.tcRow.appendChild(c);
    }
  }

  function stateToClass(s) {
    switch (s) {
      case 'compute': return 'cell cell-compute';
      case 'stall':   return 'cell cell-stall';
      case 'l1':      return 'cell cell-l1';
      default:        return 'cell cell-idle';
    }
  }

  function renderTimeline() {
    // Update lane cells
    const laneDivs = els.lanes.children;
    for (let i = 0; i < laneDivs.length; i++) {
      const lane = laneDivs[i];
      const cells = lane.children;
      const hist = state.laneHistory[i];
      const offset = hist.length - cells.length;
      for (let j = 0; j < cells.length; j++) {
        const s = hist[offset + j];
        const cls = stateToClass(s);
        if (cells[j].className !== cls) cells[j].className = cls;
      }
    }
    // Update tensor core row
    const tcCells = els.tcRow.children;
    const off = state.tcHistory.length - tcCells.length;
    for (let j = 0; j < tcCells.length; j++) {
      const s = state.tcHistory[off + j];
      const cls = stateToClass(s);
      if (tcCells[j].className !== cls) tcCells[j].className = cls;
    }
  }

  function renderMetrics() {
    const util = state.totalCycles > 0 ? (state.busyCycles / state.totalCycles) * 100 : 0;
    els.mUtil.textContent = util.toFixed(1) + '%';
    els.utilFill.style.width = Math.min(100, util) + '%';
    els.mWarps.textContent = state.numWarps;
    els.mCycles.textContent = state.cycle.toLocaleString();
    els.mCompute.textContent = state.busyCycles.toLocaleString();
  }

  // ================================================================
  // Comparison table
  // ================================================================
  function renderComparison() {
    const B = state.batch;
    const H = H_DIM;

    // FLOP for a [B x H] x [H x H] GEMM = 2 * B * H * H
    const flop = 2 * B * H * H;

    // Arithmetic intensity = FLOP / bytes (treating weights as the dominant cost)
    // For batch B with shared weights: AI = (2*B*H*H)/(2*H*H) = B
    const ai = B;

    // Estimated utilization: min(1, AI / ridge_AI)
    const ridgeAI = (PEAK_TFLOPS * 1e12) / (HBM_BW_GBS * 1e9); // ~591 FLOP/Byte
    const util = Math.min(1, ai / ridgeAI) * 100;

    // Format FLOP
    const flopStr = flop >= 1e12 ? (flop / 1e12).toFixed(1) + ' TFLOP'
                 : flop >= 1e9  ? (flop / 1e9).toFixed(1)  + ' GFLOP'
                 : flop >= 1e6  ? (flop / 1e6).toFixed(0)  + ' MFLOP'
                 : flop.toLocaleString() + ' FLOP';

    els.cmpBatch.textContent = B;
    els.cmpShape.textContent = B;
    els.cmpFlop.textContent = flopStr;
    els.cmpAI.textContent = ai < 10 ? ai.toFixed(1) : ai.toFixed(0);
    els.cmpUtil.textContent = util < 1 ? util.toFixed(2) + '%' : util.toFixed(1) + '%';
    els.cmpBottleneck.textContent = ai < ridgeAI ? 'Memory bandwidth' : 'Compute';
  }

  // ================================================================
  // Roofline chart (Canvas 2D, log-log)
  // ================================================================
  function renderRoofline() {
    const cv = els.roofline;
    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth || 720;
    const cssH = 420;
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.height = cssH + 'px';
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cssW, H = cssH;
    ctx.clearRect(0, 0, W, H);

    // Margins
    const ML = 64, MR = 20, MT = 30, MB = 54;
    const plotW = W - ML - MR;
    const plotH = H - MT - MB;

    // Axis ranges (log10)
    const xMin = Math.log10(0.5);    // 0.5 FLOP/Byte
    const xMax = Math.log10(5000);   // 5000 FLOP/Byte
    const yMin = Math.log10(1);      // 1 TFLOPS
    const yMax = Math.log10(3000);   // 3000 TFLOPS

    const xToPx = (lx) => ML + ((lx - xMin) / (xMax - xMin)) * plotW;
    const yToPx = (ly) => MT + plotH - ((ly - yMin) / (yMax - yMin)) * plotH;

    // Grid
    ctx.strokeStyle = '#222a3a';
    ctx.lineWidth = 1;
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#8b949e';

    // X grid (log ticks)
    const xTicks = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    for (const t of xTicks) {
      const lt = Math.log10(t);
      if (lt < xMin || lt > xMax) continue;
      const x = xToPx(lt);
      ctx.beginPath();
      ctx.moveTo(x, MT);
      ctx.lineTo(x, MT + plotH);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(t.toString(), x, MT + plotH + 14);
    }
    // Y grid
    const yTicks = [1, 3, 10, 30, 100, 300, 1000, 3000];
    for (const t of yTicks) {
      const lt = Math.log10(t);
      if (lt < yMin || lt > yMax) continue;
      const y = yToPx(lt);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(ML + plotW, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(t.toString(), ML - 6, y + 3);
    }

    // Axis labels
    ctx.fillStyle = '#e6edf3';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arithmetic Intensity (FLOP/Byte)', ML + plotW / 2, H - 16);
    ctx.save();
    ctx.translate(16, MT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Attainable Performance (TFLOPS)', 0, 0);
    ctx.restore();

    // Memory ceiling: perf = AI * BW  (TFLOPS = AI * HBM_BW_GB/s / 1000)
    // In log space: log10(perf) = log10(AI) + log10(BW_TB/s)
    // BW in TB/s = 3.35; so at AI=1 -> 3.35 TFLOPS
    const BW_TBs = HBM_BW_GBS / 1000;
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Line from xMin to intersection with compute ceiling
    const logPeak = Math.log10(PEAK_TFLOPS);
    const ridgeAI = PEAK_TFLOPS / BW_TBs; // TFLOPS / (TB/s) -> FLOP/Byte
    const logRidge = Math.log10(ridgeAI);
    // Start point
    let p1x = xToPx(xMin);
    let p1y = yToPx(Math.log10(Math.max(1e-9, Math.pow(10, xMin) * BW_TBs)));
    let p2x = xToPx(logRidge);
    let p2y = yToPx(logPeak);
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
    ctx.fillStyle = '#f85149';
    ctx.textAlign = 'left';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('Memory bound: ' + HBM_BW_GBS + ' GB/s HBM', xToPx(xMin) + 6, yToPx(xMin + Math.log10(BW_TBs)) - 6);

    // Compute ceiling: horizontal at peak TFLOPS
    ctx.strokeStyle = '#3fb950';
    ctx.beginPath();
    ctx.moveTo(p2x, p2y);
    ctx.lineTo(xToPx(xMax), p2y);
    ctx.stroke();
    ctx.fillStyle = '#3fb950';
    ctx.fillText('Compute bound: ' + PEAK_TFLOPS + ' TFLOPS BF16', p2x + 8, p2y - 6);

    // Ridge point
    ctx.fillStyle = '#d29922';
    ctx.beginPath();
    ctx.arc(p2x, p2y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d29922';
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ridge ≈ ' + ridgeAI.toFixed(0) + ' FLOP/B', p2x + 8, p2y + 14);

    // Training point (batch=2048)
    const trainAI = 2048;
    const trainPerf = Math.min(PEAK_TFLOPS, trainAI * BW_TBs);
    drawPoint(ctx, xToPx(Math.log10(trainAI)), yToPx(Math.log10(trainPerf)),
              '#3fb950', 'Training (B=2048)');

    // Decode point (batch = state.batch)
    const decAI = Math.max(0.5, state.batch);
    const decPerf = Math.min(PEAK_TFLOPS, decAI * BW_TBs);
    drawPoint(ctx, xToPx(Math.log10(decAI)), yToPx(Math.log10(decPerf)),
              '#f85149', 'Decode (B=' + state.batch + ')');
  }

  function drawPoint(ctx, x, y, color, label) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d1117';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 10, y - 8);
  }

  // ================================================================
  // Main loop
  // ================================================================
  function frame(ts) {
    if (state.running) {
      // Run `state.speed` cycles per animation frame
      const N = state.speed;
      for (let i = 0; i < N; i++) stepOneCycle();
      renderTimeline();
      renderMetrics();
    }
    requestAnimationFrame(frame);
  }

  // ================================================================
  // Event wiring
  // ================================================================
  function bindControls() {
    els.batch.addEventListener('input', () => {
      state.batch = parseInt(els.batch.value, 10);
      els.valBatch.textContent = state.batch;
      rebuildWarps();
      renderComparison();
      renderRoofline();
    });
    els.hbm.addEventListener('input', () => {
      state.hbmLatency = parseInt(els.hbm.value, 10);
      els.valHBM.textContent = state.hbmLatency;
    });
    els.compute.addEventListener('input', () => {
      state.computeCycles = parseInt(els.compute.value, 10);
      els.valCompute.textContent = state.computeCycles;
    });
    els.speed.addEventListener('input', () => {
      state.speed = parseInt(els.speed.value, 10);
      els.valSpeed.textContent = state.speed + '×';
    });
    els.btnPlay.addEventListener('click', () => {
      state.running = !state.running;
      els.btnPlay.textContent = state.running ? 'Pause' : 'Play';
    });
    els.btnReset.addEventListener('click', () => {
      rebuildWarps();
      renderTimeline();
      renderMetrics();
    });

    window.addEventListener('resize', () => {
      renderRoofline();
    });
  }

  // ================================================================
  // Init
  // ================================================================
  function init() {
    state.batch = parseInt(els.batch.value, 10);
    state.hbmLatency = parseInt(els.hbm.value, 10);
    state.computeCycles = parseInt(els.compute.value, 10);
    state.speed = parseInt(els.speed.value, 10);
    rebuildWarps();
    renderComparison();
    renderTimeline();
    renderMetrics();
    renderRoofline();
    bindControls();
    requestAnimationFrame(frame);
  }

  init();
})();
