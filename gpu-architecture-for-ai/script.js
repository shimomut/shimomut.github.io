(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ==================================================================
  // 1. HIERARCHY EXPLORER
  // ==================================================================
  (function initHierarchy() {
    const cv = $('hierarchyCanvas');
    if (!cv) return;
    const info = $('hierarchyInfo');
    const buttons = document.querySelectorAll('.hierarchy-controls button');

    const LEVELS = {
      grid:   { title: 'Grid — 4096 blocks',
                desc: 'A grid is the top-level launch. Here: 64×64 blocks (one square per block). The hardware schedules these blocks across all 132 SMs in any order — blocks are independent.' },
      block:  { title: 'Block — 256 threads (8 warps)',
                desc: 'One block runs entirely on a single SM. It can have up to 1024 threads, grouped into warps of 32. Threads inside a block share memory and can synchronize.' },
      warp:   { title: 'Warp — 32 threads in lockstep',
                desc: 'The hardware scheduling unit. All 32 threads share one program counter and execute the same instruction each cycle, on different data.' },
      thread: { title: 'Thread — one execution lane',
                desc: 'The smallest unit. Has its own registers and its own thread index. All threads run the same kernel function but operate on different elements.' },
    };

    let level = 'grid';
    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = cv.clientWidth;
      const cssH = 360;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.height = cssH + 'px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillStyle = '#e6edf3';
      ctx.textAlign = 'left';
      ctx.fillText(LEVELS[level].title, 12, 22);

      const pad = 40;
      const W = cssW - pad * 2;
      const H = cssH - pad - 30;

      if (level === 'grid') {
        // 16x16 sample of blocks (of a 64x64 grid)
        const N = 16;
        const s = Math.min(W / N, H / N);
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#1d2a3a' : '#223144';
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 0.5;
            ctx.fillRect(pad + i * s, 32 + j * s, s - 1, s - 1);
            ctx.strokeRect(pad + i * s, 32 + j * s, s - 1, s - 1);
          }
        }
        ctx.fillStyle = '#8b949e';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText('(showing 16×16 of 64×64 blocks)', pad, 32 + N * s + 16);
      } else if (level === 'block') {
        // 8 warps x 32 threads = 256 threads
        const warpsPerBlock = 8;
        const threadsPerWarp = 32;
        const cellW = W / threadsPerWarp;
        const cellH = Math.min(H / warpsPerBlock, 30);
        for (let w = 0; w < warpsPerBlock; w++) {
          for (let t = 0; t < threadsPerWarp; t++) {
            ctx.fillStyle = '#1d4a6a';
            ctx.fillRect(pad + t * cellW + 1, 40 + w * (cellH + 4), cellW - 2, cellH);
          }
          ctx.fillStyle = '#8b949e';
          ctx.font = '11px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'right';
          ctx.fillText('warp ' + w, pad - 4, 40 + w * (cellH + 4) + cellH * 0.7);
          ctx.textAlign = 'left';
        }
      } else if (level === 'warp') {
        // 32 threads, all lockstep
        const N = 32;
        const cellW = W / N;
        const cellH = Math.min(80, H * 0.4);
        for (let t = 0; t < N; t++) {
          ctx.fillStyle = '#3fb950';
          ctx.fillRect(pad + t * cellW + 2, 60, cellW - 4, cellH);
          ctx.fillStyle = '#0d1117';
          ctx.font = '10px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('T' + t, pad + t * cellW + cellW / 2, 60 + cellH / 2 + 4);
        }
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↓ all 32 lanes execute the same instruction per cycle ↓', cssW / 2, 60 + cellH + 24);
      } else if (level === 'thread') {
        // one big thread box with its registers
        const boxW = 260, boxH = 180;
        const x = (cssW - boxW) / 2, y = 60;
        ctx.fillStyle = '#1d4a2b';
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.strokeRect(x, y, boxW, boxH);
        ctx.fillStyle = '#e6edf3';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Thread', x + boxW / 2, y + 24);
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#bc8cff';
        ctx.fillText('threadIdx.x = 7', x + boxW / 2, y + 52);
        ctx.fillText('blockIdx.x  = 42', x + boxW / 2, y + 72);
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.fillText('Private registers:', x + boxW / 2, y + 100);
        ctx.fillStyle = '#d29922';
        ctx.font = '11px ui-monospace, Menlo, monospace';
        ctx.fillText('R0  = 3.14', x + boxW / 2, y + 120);
        ctx.fillText('R1  = 0.577', x + boxW / 2, y + 136);
        ctx.fillText('R2  = ...', x + boxW / 2, y + 152);
      }

      info.textContent = LEVELS[level].desc;
    }

    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        level = b.dataset.level;
        buttons.forEach((x) => x.classList.remove('primary'));
        b.classList.add('primary');
        draw();
      });
    });
    window.addEventListener('resize', draw);
    draw();
  })();

  // ==================================================================
  // 2. OCCUPANCY CALCULATOR
  // ==================================================================
  (function initOccupancy() {
    // H100 SM limits
    const MAX_WARPS_PER_SM = 64;
    const MAX_BLOCKS_PER_SM = 32;
    const MAX_REG_PER_SM = 65536;
    const MAX_SMEM_PER_SM_KB = 228;
    const MAX_THREADS_PER_BLOCK = 1024;

    const tpb = $('tpb'), rpt = $('rpt'), smem = $('smem');
    const valTpb = $('valTpb'), valRpt = $('valRpt'), valSmem = $('valSmem');
    const mBlocks = $('mBlocks'), mResWarps = $('mResWarps'),
          mOcc = $('mOcc'), occFill = $('occFill'), mLimit = $('mLimit');

    function compute() {
      const T = parseInt(tpb.value, 10);
      const R = parseInt(rpt.value, 10);
      const S = parseInt(smem.value, 10);
      valTpb.textContent = T;
      valRpt.textContent = R;
      valSmem.textContent = S;

      const warpsPerBlock = Math.ceil(T / 32);

      // Block count limits
      const limByBlockCount = MAX_BLOCKS_PER_SM;
      const limByThreadCount = Math.floor(MAX_WARPS_PER_SM / warpsPerBlock);
      const limByRegs = Math.floor(MAX_REG_PER_SM / (T * R));
      const limBySmem = S > 0 ? Math.floor(MAX_SMEM_PER_SM_KB / S) : 999;

      const lims = [
        { name: 'Max blocks per SM',   val: limByBlockCount },
        { name: 'Max warps per SM',    val: limByThreadCount },
        { name: 'Register file',       val: limByRegs },
        { name: 'Shared memory',       val: limBySmem },
      ];

      let best = Infinity, limiter = '';
      for (const l of lims) {
        if (l.val < best) { best = l.val; limiter = l.name; }
      }
      best = Math.max(0, best);

      const residentWarps = Math.min(MAX_WARPS_PER_SM, best * warpsPerBlock);
      const occPct = (residentWarps / MAX_WARPS_PER_SM) * 100;

      mBlocks.textContent = best;
      mResWarps.textContent = residentWarps;
      mOcc.textContent = occPct.toFixed(0) + '%';
      occFill.style.width = Math.min(100, occPct) + '%';
      mLimit.textContent = limiter;
    }

    [tpb, rpt, smem].forEach(el => el.addEventListener('input', compute));
    compute();
  })();

  // ==================================================================
  // 3. SIMT LOCKSTEP SIMULATOR
  // ==================================================================
  (function initSimt() {
    const lanesEl = $('simtLanes');
    if (!lanesEl) return;
    const codeEl = $('simtCode');
    const branchBox = $('branchOn');
    const playBtn = $('simtPlay');
    const resetBtn = $('simtReset');
    const mIssued = $('simtIssued');
    const mUsed = $('simtUsed');
    const mWasted = $('simtWasted');
    const mEff = $('simtEff');

    // Build 32 lane cells
    for (let i = 0; i < 32; i++) {
      const d = document.createElement('div');
      d.className = 'lane-cell';
      lanesEl.appendChild(d);
    }
    const laneCells = lanesEl.children;

    const programNoBranch = [
      'float x = a[tid];',
      'float y = b[tid];',
      'float z = x * y;',
      'c[tid] = z;',
    ];

    // Program with divergent branch
    const programBranch = [
      'float x = a[tid];',
      'if (tid < 16) {',
      '    x = sqrt(x);       // path A',
      '    x = log(x);',
      '} else {',
      '    x = x * x;         // path B',
      '    x = exp(x);',
      '}',
      'c[tid] = x;',
    ];

    // Each step: which line is active, and which lanes are masked in
    // (true = active, false = masked off)
    function buildSteps(branch) {
      const steps = [];
      if (!branch) {
        programNoBranch.forEach((_, i) => {
          const mask = new Array(32).fill(true);
          steps.push({ line: i, mask });
        });
      } else {
        const fullActive = () => new Array(32).fill(true);
        const pathA = () => Array.from({length:32},(_,i)=>i<16);
        const pathB = () => Array.from({length:32},(_,i)=>i>=16);
        // 0: load x (all active)
        steps.push({ line: 0, mask: fullActive() });
        // 1: if  (branch instruction — predicate evaluated, all active)
        steps.push({ line: 1, mask: fullActive() });
        // 2: path A first instr
        steps.push({ line: 2, mask: pathA() });
        // 3: path A second
        steps.push({ line: 3, mask: pathA() });
        // 4: else (no-op marker — we skip executing this line, just show cursor)
        steps.push({ line: 4, mask: fullActive() });
        // 5: path B first
        steps.push({ line: 5, mask: pathB() });
        // 6: path B second
        steps.push({ line: 6, mask: pathB() });
        // 7: } (reconverge marker)
        steps.push({ line: 7, mask: fullActive() });
        // 8: store (all active)
        steps.push({ line: 8, mask: fullActive() });
      }
      return steps;
    }

    let steps = buildSteps(false);
    let stepIdx = 0;
    let running = true;
    let lastTick = 0;
    const STEP_MS = 600;
    let used = 0, wasted = 0, issued = 0;

    function renderCode(branch, activeLine) {
      const prog = branch ? programBranch : programNoBranch;
      codeEl.innerHTML = '';
      prog.forEach((txt, i) => {
        const span = document.createElement('span');
        span.className = 'line' + (i === activeLine ? ' active' : '');
        span.textContent = txt;
        codeEl.appendChild(span);
      });
    }

    function reset() {
      stepIdx = 0;
      used = 0; wasted = 0; issued = 0;
      for (let i = 0; i < 32; i++) laneCells[i].className = 'lane-cell';
      updateMetrics();
      renderCode(branchBox.checked, -1);
    }

    function updateMetrics() {
      mIssued.textContent = issued;
      mUsed.textContent = used;
      mWasted.textContent = wasted;
      const total = used + wasted;
      const eff = total > 0 ? (used / total) * 100 : 100;
      mEff.textContent = eff.toFixed(0) + '%';
    }

    function tick(ts) {
      if (running && ts - lastTick > STEP_MS) {
        lastTick = ts;
        const step = steps[stepIdx];
        // Render lanes
        for (let i = 0; i < 32; i++) {
          if (step.mask[i]) {
            laneCells[i].className = 'lane-cell active';
            used++;
          } else {
            laneCells[i].className = 'lane-cell masked';
            wasted++;
          }
        }
        issued++;
        renderCode(branchBox.checked, step.line);
        updateMetrics();
        stepIdx = (stepIdx + 1) % steps.length;
        // After full pass, fade lanes back to idle on next tick
        if (stepIdx === 0) {
          setTimeout(() => {
            for (let i = 0; i < 32; i++) laneCells[i].className = 'lane-cell';
          }, STEP_MS * 0.7);
        }
      }
      requestAnimationFrame(tick);
    }

    branchBox.addEventListener('change', () => {
      steps = buildSteps(branchBox.checked);
      reset();
    });
    playBtn.addEventListener('click', () => {
      running = !running;
      playBtn.textContent = running ? 'Pause' : 'Play';
    });
    resetBtn.addEventListener('click', reset);

    reset();
    requestAnimationFrame(tick);
  })();

  // ==================================================================
  // 4. TENSOR CORE MMA ANIMATION
  // ==================================================================
  (function initTC() {
    const cv = $('tcCanvas');
    if (!cv) return;
    const play = $('tcPlay');
    const reset = $('tcReset');
    let t = 0;
    let running = false;

    const TILE = 16;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = cv.clientWidth;
      const cssH = 280;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.height = cssH + 'px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cell = 11;
      const tileSize = TILE * cell;
      const gap = 40;
      const totalW = tileSize * 3 + gap * 2 + 60;
      const x0 = Math.max(10, (cssW - totalW) / 2);
      const y0 = 50;

      // Phase: t in [0, TILE*TILE) = per-cell progress
      const total = TILE * TILE;
      const progress = Math.min(total, Math.floor(t));

      function drawTile(x, y, label, color, filledTo = -1, highlightIdx = -1) {
        // label
        ctx.fillStyle = color;
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + tileSize / 2, y - 10);
        // cells
        for (let i = 0; i < TILE; i++) {
          for (let j = 0; j < TILE; j++) {
            const idx = i * TILE + j;
            ctx.fillStyle = '#1a2233';
            if (filledTo >= 0 && idx <= filledTo) ctx.fillStyle = color;
            if (idx === highlightIdx) ctx.fillStyle = '#d29922';
            ctx.fillRect(x + j * cell, y + i * cell, cell - 1, cell - 1);
          }
        }
        // border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 0.5, y - 0.5, tileSize, tileSize);
      }

      const aX = x0, bX = x0 + tileSize + gap, cX = x0 + (tileSize + gap) * 2 + 60;

      // Highlight current row of A and current col of B based on progress
      const curRow = progress < total ? Math.floor(progress / TILE) : -1;
      const curCol = progress < total ? progress % TILE : -1;

      // Draw A (left) — highlight row curRow
      drawTile(aX, y0, 'A (16×16)', '#58a6ff', -1, -1);
      if (curRow >= 0) {
        ctx.fillStyle = 'rgba(88,166,255,0.35)';
        ctx.fillRect(aX, y0 + curRow * cell, tileSize, cell - 1);
      }
      // Draw B (middle) — highlight col curCol
      drawTile(bX, y0, 'B (16×16)', '#bc8cff', -1, -1);
      if (curCol >= 0) {
        ctx.fillStyle = 'rgba(188,140,255,0.35)';
        ctx.fillRect(bX + curCol * cell, y0, cell - 1, tileSize);
      }

      // Mult sign
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('×', aX + tileSize + gap / 2, y0 + tileSize / 2 + 8);
      ctx.fillText('=', bX + tileSize + (gap + 60) / 2, y0 + tileSize / 2 + 8);

      // D output — filled up to progress
      drawTile(cX, y0, 'D = A·B + C', '#3fb950', progress - 1, progress < total ? progress : -1);

      // Status
      ctx.fillStyle = '#8b949e';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      if (progress >= total) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('Done — 16×16 MMA tile complete (4096 FMAs total)', cssW / 2, y0 + tileSize + 32);
      } else {
        ctx.fillText('Computing D[' + curRow + ',' + curCol + '] = Σ A[' + curRow + ',k] · B[k,' + curCol + ']  + C[' + curRow + ',' + curCol + ']',
                     cssW / 2, y0 + tileSize + 32);
      }
    }

    function frame() {
      if (running && t < TILE * TILE) {
        t += 2.5;
      }
      draw();
      requestAnimationFrame(frame);
    }

    play.addEventListener('click', () => {
      if (t >= TILE * TILE) t = 0;
      running = !running;
      play.textContent = running ? 'Pause' : 'Play';
    });
    reset.addEventListener('click', () => {
      t = 0; running = false; play.textContent = 'Play'; draw();
    });
    window.addEventListener('resize', draw);
    draw();
    requestAnimationFrame(frame);
  })();

  // ==================================================================
  // 5. KERNEL DISPATCH VISUALIZER
  // ==================================================================
  (function initDispatch() {
    const cv = $('dispatchCanvas');
    if (!cv) return;
    const NUM_SMS = 44; // reduced from 132 for visibility
    const gridEl = $('gridSize');
    const workEl = $('workPerBlock');
    const bpsEl  = $('bps');
    const valGrid = $('valGrid');
    const valWork = $('valWork');
    const valBps = $('valBps');
    const dQueued = $('dQueued'), dRunning = $('dRunning'),
          dDone = $('dDone'), dTime = $('dTime');
    const playBtn = $('dispatchPlay');
    const resetBtn = $('dispatchReset');

    let gridSize = 256, workPerBlock = 20, bps = 4;
    let queued = [];     // array of block ids waiting
    let done = 0;
    let time = 0;
    let running = true;
    // sms[i] = array of active blocks, each {id, remaining, color}
    let sms = [];

    function reset() {
      gridSize = parseInt(gridEl.value, 10);
      workPerBlock = parseInt(workEl.value, 10);
      bps = parseInt(bpsEl.value, 10);
      valGrid.textContent = gridSize;
      valWork.textContent = workPerBlock;
      valBps.textContent = bps;
      queued = Array.from({length: gridSize}, (_, i) => i);
      done = 0;
      time = 0;
      sms = Array.from({length: NUM_SMS}, () => []);
    }

    function colorFor(id) {
      const hue = (id * 47) % 360;
      return 'hsl(' + hue + ', 60%, 55%)';
    }

    function step() {
      // Progress active blocks
      for (const sm of sms) {
        for (const b of sm) { b.remaining -= 1; }
        // Remove finished
        for (let i = sm.length - 1; i >= 0; i--) {
          if (sm[i].remaining <= 0) {
            sm.splice(i, 1);
            done++;
          }
        }
      }
      // Fill empty slots from queue (Gigathread Engine)
      for (const sm of sms) {
        while (sm.length < bps && queued.length > 0) {
          const id = queued.shift();
          sm.push({ id, remaining: workPerBlock, color: colorFor(id) });
        }
      }
      time++;
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = cv.clientWidth;
      const cssH = 320;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.height = cssH + 'px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Header: queue preview
      ctx.fillStyle = '#8b949e';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Gigathread Engine queue: ' + queued.length + ' blocks waiting', 10, 16);

      // Draw queue bar
      const qX = 10, qY = 24, qW = cssW - 20, qH = 14;
      ctx.fillStyle = '#1a2233';
      ctx.fillRect(qX, qY, qW, qH);
      const visibleQ = Math.min(queued.length, 120);
      const cellW = qW / 120;
      for (let i = 0; i < visibleQ; i++) {
        ctx.fillStyle = colorFor(queued[i]);
        ctx.fillRect(qX + i * cellW, qY, cellW - 1, qH);
      }
      ctx.strokeStyle = '#30363d';
      ctx.strokeRect(qX, qY, qW, qH);

      // Draw SM grid
      const cols = 11;
      const rows = Math.ceil(NUM_SMS / cols);
      const topY = 56;
      const gx = 10, gw = cssW - 20, gh = cssH - topY - 10;
      const cw = gw / cols, ch = gh / rows;

      for (let i = 0; i < NUM_SMS; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = gx + col * cw;
        const y = topY + row * ch;
        // SM box
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);

        // Blocks residing on this SM
        const sm = sms[i];
        if (sm.length > 0) {
          // stack small rects for each resident block
          const slotH = (ch - 20) / bps;
          for (let j = 0; j < sm.length; j++) {
            const b = sm[j];
            const pct = 1 - (b.remaining / workPerBlock);
            const by = y + 14 + j * slotH;
            ctx.fillStyle = '#1a2233';
            ctx.fillRect(x + 6, by, cw - 12, slotH - 3);
            ctx.fillStyle = b.color;
            ctx.fillRect(x + 6, by, (cw - 12) * pct, slotH - 3);
          }
        }

        ctx.fillStyle = '#8b949e';
        ctx.font = '9px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SM' + i, x + 4, y + 12);
      }
    }

    let accum = 0;
    function frame(ts) {
      if (running) {
        accum++;
        if (accum >= 6) { // slow down
          accum = 0;
          if (queued.length + sms.reduce((s, sm) => s + sm.length, 0) > 0) {
            step();
          }
        }
      }
      const curRunning = sms.reduce((s, sm) => s + sm.length, 0);
      dQueued.textContent = queued.length;
      dRunning.textContent = curRunning;
      dDone.textContent = done;
      dTime.textContent = time;
      draw();
      requestAnimationFrame(frame);
    }

    [gridEl, workEl, bpsEl].forEach(el => el.addEventListener('input', reset));
    playBtn.addEventListener('click', () => {
      running = !running;
      playBtn.textContent = running ? 'Pause' : 'Play';
    });
    resetBtn.addEventListener('click', reset);
    window.addEventListener('resize', draw);

    running = true;
    reset();
    requestAnimationFrame(frame);
  })();

})();
