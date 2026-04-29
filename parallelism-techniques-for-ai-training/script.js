/* ================================================================
   Parallelism Techniques — Interactive Animations
   Pure vanilla JS + Canvas
   ================================================================ */

(function () {
  "use strict";

  /* ---------- palette ---------- */
  const C = {
    bg:      "#0f1117",
    surface: "#1a1d27",
    border:  "#2e3345",
    text:    "#e2e4ed",
    muted:   "#9498ab",
    dp:      "#6c8cff",
    mp:      "#fb923c",
    tp:      "#4ade80",
    pp:      "#facc15",
    fsdp:    "#c084fc",
    ep:      "#f472b6",
    sp:      "#22d3ee",
    red:     "#f87171",
    orange:  "#fb923c",
    yellow:  "#facc15",
    green:   "#4ade80",
    white:   "#ffffff",
    bubble:  "rgba(255,255,255,0.06)",
  };

  const GPU_COLORS = [C.dp, C.tp, C.pp, C.fsdp];

  /* ---------- helpers ---------- */
  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillRoundRect(ctx, x, y, w, h, r, color) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRoundRect(ctx, x, y, w, h, r, color, lw) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
    const headLen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function label(ctx, text, x, y, color, size, align) {
    ctx.fillStyle = color || C.text;
    ctx.font = `${size || 12}px Inter, sans-serif`;
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  /* ---------- animation registry ---------- */
  const animations = {};

  function getCtx(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w === 0 || h === 0) return null;
    /* Only resize the backing store when the display size actually changed */
    const needsResize = canvas.width !== w * dpr || canvas.height !== h * dpr;
    if (needsResize) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx._w = w;
    ctx._h = h;
    return ctx;
  }

  function registerAnim(canvasId, drawFn, durationMs) {
    animations[canvasId] = { draw: drawFn, duration: durationMs || 4000, raf: null, startTime: null, progress: 0 };
    /* draw initial frame */
    const ctx = getCtx(canvasId);
    if (ctx) drawFn(ctx, 0);
  }

  function playAnim(canvasId) {
    const a = animations[canvasId];
    if (!a) return;
    if (a.raf) cancelAnimationFrame(a.raf);
    a.startTime = performance.now();
    function tick(now) {
      const elapsed = now - a.startTime;
      a.progress = clamp01(elapsed / a.duration);
      const ctx = getCtx(canvasId);
      if (ctx) a.draw(ctx, a.progress);
      if (a.progress < 1) a.raf = requestAnimationFrame(tick);
    }
    a.raf = requestAnimationFrame(tick);
  }

  function resetAnim(canvasId) {
    const a = animations[canvasId];
    if (!a) return;
    if (a.raf) cancelAnimationFrame(a.raf);
    a.progress = 0;
    a.startTime = null;
    const ctx = getCtx(canvasId);
    if (ctx) a.draw(ctx, 0);
  }

  /* ---------- wire buttons ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-play")) playAnim(e.target.dataset.target);
    if (e.target.classList.contains("btn-reset")) resetAnim(e.target.dataset.target);
  });


  /* ================================================================
     1. DATA PARALLELISM ANIMATION
     ================================================================ */
  registerAnim("dp-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const numGPU = 4;
    const gpuW = 130, gpuH = 200;
    const gap = (W - numGPU * gpuW) / (numGPU + 1);
    const topY = 50;

    /* title */
    label(ctx, "Global Mini-Batch", W / 2, 20, C.muted, 13);

    /* data chunks at top */
    const chunkW = gpuW - 10;
    const chunkH = 24;
    for (let i = 0; i < numGPU; i++) {
      const x = gap + i * (gpuW + gap);
      const batchAlpha = t < 0.15 ? easeInOut(t / 0.15) : 1;
      fillRoundRect(ctx, x + 5, 32, chunkW, chunkH, 4, hexAlpha(C.dp, 0.3 * batchAlpha));
      strokeRoundRect(ctx, x + 5, 32, chunkW, chunkH, 4, hexAlpha(C.dp, 0.6 * batchAlpha));
      label(ctx, `Micro-batch ${i}`, x + 5 + chunkW / 2, 32 + chunkH / 2, hexAlpha(C.text, batchAlpha), 10);
    }

    /* GPUs */
    for (let i = 0; i < numGPU; i++) {
      const x = gap + i * (gpuW + gap);
      const y = topY + 30;
      fillRoundRect(ctx, x, y, gpuW, gpuH, 8, C.surface);
      strokeRoundRect(ctx, x, y, gpuW, gpuH, 8, GPU_COLORS[i % GPU_COLORS.length], 1.5);
      label(ctx, `GPU ${i}`, x + gpuW / 2, y + 18, C.text, 12, "center");

      /* model replica */
      const mY = y + 36;
      const mH = 50;
      fillRoundRect(ctx, x + 10, mY, gpuW - 20, mH, 5, hexAlpha(C.dp, 0.15));
      label(ctx, "Full Model", x + gpuW / 2, mY + 14, C.dp, 10);
      label(ctx, "(replica)", x + gpuW / 2, mY + 30, hexAlpha(C.dp, 0.5), 9);

      /* forward pass indicator */
      const fwdPhase = clamp01((t - 0.15) / 0.25);
      if (fwdPhase > 0) {
        const barW = (gpuW - 20) * easeInOut(fwdPhase);
        fillRoundRect(ctx, x + 10, mY + mH + 8, barW, 10, 3, hexAlpha(C.tp, 0.6));
        if (fwdPhase > 0.3) label(ctx, "Forward", x + gpuW / 2, mY + mH + 13, C.text, 8);
      }

      /* backward pass indicator */
      const bwdPhase = clamp01((t - 0.42) / 0.25);
      if (bwdPhase > 0) {
        const barW = (gpuW - 20) * easeInOut(bwdPhase);
        fillRoundRect(ctx, x + 10, mY + mH + 24, barW, 10, 3, hexAlpha(C.orange, 0.6));
        if (bwdPhase > 0.3) label(ctx, "Backward", x + gpuW / 2, mY + mH + 29, C.text, 8);
      }

      /* gradient box */
      const gradPhase = clamp01((t - 0.68) / 0.1);
      if (gradPhase > 0) {
        const gY = mY + mH + 42;
        fillRoundRect(ctx, x + 10, gY, gpuW - 20, 22, 4, hexAlpha(C.yellow, 0.2 * gradPhase));
        label(ctx, "Gradients", x + gpuW / 2, gY + 11, hexAlpha(C.yellow, gradPhase), 9);
      }
    }

    /* All-reduce arrows */
    const arPhase = clamp01((t - 0.78) / 0.15);
    if (arPhase > 0) {
      const arrowY = topY + 30 + gpuH + 16;
      const x0 = gap + gpuW / 2;
      const x3 = gap + 3 * (gpuW + gap) + gpuW / 2;
      const midX = (x0 + x3) / 2;

      /* horizontal line */
      ctx.beginPath();
      ctx.moveTo(lerp(midX, x0, easeInOut(arPhase)), arrowY);
      ctx.lineTo(lerp(midX, x3, easeInOut(arPhase)), arrowY);
      ctx.strokeStyle = hexAlpha(C.yellow, arPhase);
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < numGPU; i++) {
        const gx = gap + i * (gpuW + gap) + gpuW / 2;
        ctx.beginPath();
        ctx.moveTo(gx, arrowY - 6);
        ctx.lineTo(gx, arrowY + 6);
        ctx.strokeStyle = hexAlpha(C.yellow, arPhase);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      label(ctx, "All-Reduce (avg gradients)", midX, arrowY + 20, hexAlpha(C.yellow, arPhase), 11);
    }

    /* Sync complete */
    const syncPhase = clamp01((t - 0.93) / 0.07);
    if (syncPhase > 0) {
      label(ctx, "✓ Parameters synchronized", W / 2, topY + 30 + gpuH + 56, hexAlpha(C.green, syncPhase), 12);
    }
  }, 5000);

  /* ================================================================
     2. MODEL PARALLELISM ANIMATION
     ================================================================ */
  registerAnim("mp-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const numGPU = 4;
    const gpuW = 140, gpuH = 60;
    const gap = 20;
    const startX = (W - numGPU * gpuW - (numGPU - 1) * gap) / 2;
    const gpuY = 60;

    label(ctx, "Naïve Model Parallelism — Sequential Layer Execution", W / 2, 22, C.muted, 13);

    /* GPUs with layers */
    for (let i = 0; i < numGPU; i++) {
      const x = startX + i * (gpuW + gap);
      fillRoundRect(ctx, x, gpuY, gpuW, gpuH, 8, C.surface);
      strokeRoundRect(ctx, x, gpuY, gpuW, gpuH, 8, GPU_COLORS[i], 1.5);
      label(ctx, `GPU ${i}`, x + gpuW / 2, gpuY + 16, C.text, 11);
      label(ctx, `Layers ${i * 8}–${i * 8 + 7}`, x + gpuW / 2, gpuY + 38, hexAlpha(GPU_COLORS[i], 0.7), 10);

      /* arrows between GPUs */
      if (i < numGPU - 1) {
        drawArrow(ctx, x + gpuW + 2, gpuY + gpuH / 2, x + gpuW + gap - 2, gpuY + gpuH / 2, C.muted, 1);
      }
    }

    /* Timeline */
    const tlY = 155;
    const tlH = 180;
    const colW = (W - 80) / numGPU;
    const startTlX = 40;

    label(ctx, "Time →", W / 2, tlY - 10, C.muted, 10);

    /* grid */
    for (let i = 0; i <= numGPU; i++) {
      const x = startTlX + i * colW;
      ctx.beginPath();
      ctx.moveTo(x, tlY);
      ctx.lineTo(x, tlY + tlH);
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    for (let i = 0; i < numGPU; i++) {
      label(ctx, `GPU ${i}`, startTlX + i * colW + colW / 2, tlY + 10, GPU_COLORS[i], 10);
    }

    /* Forward pass blocks (sequential) */
    const blockH = 18;
    const phases = 8; /* fwd0 fwd1 fwd2 fwd3 bwd3 bwd2 bwd1 bwd0 */
    const phaseW = colW - 6;

    for (let p = 0; p < phases; p++) {
      const phaseT = p / phases;
      const reveal = clamp01((t - phaseT * 0.9) / (0.9 / phases));
      if (reveal <= 0) continue;

      const isFwd = p < 4;
      const gpuIdx = isFwd ? p : (7 - p);
      const row = p;
      const bx = startTlX + gpuIdx * colW + 3;
      const by = tlY + 24 + row * (blockH + 4);
      const color = isFwd ? GPU_COLORS[gpuIdx] : C.orange;
      const lbl = isFwd ? `Fwd L${gpuIdx * 8}-${gpuIdx * 8 + 7}` : `Bwd L${gpuIdx * 8}-${gpuIdx * 8 + 7}`;

      fillRoundRect(ctx, bx, by, phaseW * easeInOut(reveal), blockH, 3, hexAlpha(color, 0.5));
      if (reveal > 0.5) label(ctx, lbl, bx + phaseW / 2, by + blockH / 2, C.text, 8);

      /* idle blocks for other GPUs */
      for (let g = 0; g < numGPU; g++) {
        if (g === gpuIdx) continue;
        const ix = startTlX + g * colW + 3;
        fillRoundRect(ctx, ix, by, phaseW * easeInOut(reveal), blockH, 3, C.bubble);
        if (reveal > 0.5) label(ctx, "idle", ix + phaseW / 2, by + blockH / 2, hexAlpha(C.muted, 0.5), 8);
      }
    }

    /* Bubble label */
    if (t > 0.5) {
      const bubbleAlpha = clamp01((t - 0.5) / 0.2);
      label(ctx, '← "Bubble" — GPUs sitting idle', W / 2, tlY + tlH + 14, hexAlpha(C.red, bubbleAlpha), 11);
    }
  }, 6000);


  /* ================================================================
     3. TENSOR PARALLELISM ANIMATION
     ================================================================ */
  registerAnim("tp-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    label(ctx, "Tensor Parallelism — Column-wise Split of Linear Layer  Y = X · W", W / 2, 20, C.muted, 13);

    const matW = 100, matH = 100;
    const sliceW = 45;

    /* Input X */
    const xX = 40, xY = 70;
    fillRoundRect(ctx, xX, xY, matW, matH, 6, hexAlpha(C.dp, 0.2));
    strokeRoundRect(ctx, xX, xY, matW, matH, 6, C.dp, 1.5);
    label(ctx, "X", xX + matW / 2, xY + matH / 2, C.dp, 16);
    label(ctx, "Input (all GPUs)", xX + matW / 2, xY + matH + 16, C.muted, 9);

    /* Weight slices */
    const splitPhase = clamp01(t / 0.25);
    const wBaseX = 200;
    const wY = 55;
    const colors = [C.tp, C.pp, C.fsdp, C.ep];
    const numSlices = 4;

    for (let i = 0; i < numSlices; i++) {
      const targetX = wBaseX + i * (sliceW + 12);
      const originX = wBaseX + (matW - sliceW) / 2;
      const sx = lerp(originX, targetX, easeInOut(splitPhase));
      const sy = wY + i * lerp(0, 4, easeInOut(splitPhase));

      fillRoundRect(ctx, sx, sy, sliceW, matH + 20, 5, hexAlpha(colors[i], 0.25));
      strokeRoundRect(ctx, sx, sy, sliceW, matH + 20, 5, colors[i], 1.5);
      label(ctx, `W[:,${i}]`, sx + sliceW / 2, sy + (matH + 20) / 2 - 8, colors[i], 11);
      label(ctx, `GPU ${i}`, sx + sliceW / 2, sy + (matH + 20) / 2 + 10, hexAlpha(colors[i], 0.6), 9);
    }

    /* Compute arrows */
    const compPhase = clamp01((t - 0.28) / 0.2);
    if (compPhase > 0) {
      for (let i = 0; i < numSlices; i++) {
        const sx = wBaseX + i * (sliceW + 12);
        const arrowAlpha = easeInOut(compPhase);
        drawArrow(ctx, xX + matW + 4, xY + matH / 2, sx - 4, wY + (matH + 20) / 2, hexAlpha(C.muted, arrowAlpha), 1);
      }
      label(ctx, "× (matmul)", (xX + matW + wBaseX) / 2, xY - 4, hexAlpha(C.text, compPhase), 10);
    }

    /* Partial results */
    const partPhase = clamp01((t - 0.5) / 0.2);
    const partY = 210;
    if (partPhase > 0) {
      for (let i = 0; i < numSlices; i++) {
        const px = wBaseX + i * (sliceW + 12);
        const alpha = easeInOut(partPhase);
        fillRoundRect(ctx, px, partY, sliceW, 36, 4, hexAlpha(colors[i], 0.2 * alpha));
        strokeRoundRect(ctx, px, partY, sliceW, 36, 4, hexAlpha(colors[i], alpha));
        label(ctx, `Y[:,${i}]`, px + sliceW / 2, partY + 18, hexAlpha(colors[i], alpha), 10);
      }
      label(ctx, "Partial results", wBaseX + (numSlices * (sliceW + 12)) / 2, partY - 10, hexAlpha(C.muted, partPhase), 9);
    }

    /* All-gather */
    const gatherPhase = clamp01((t - 0.72) / 0.2);
    if (gatherPhase > 0) {
      const gY = partY + 56;
      const gW = numSlices * (sliceW + 12) - 12;
      const gX = wBaseX;

      /* merge animation */
      for (let i = 0; i < numSlices; i++) {
        const srcX = wBaseX + i * (sliceW + 12);
        const destX = gX + i * (gW / numSlices);
        const cx = lerp(srcX, destX, easeInOut(gatherPhase));
        fillRoundRect(ctx, cx, gY, gW / numSlices - 2, 36, 4, hexAlpha(colors[i], 0.3));
      }
      strokeRoundRect(ctx, gX, gY, gW, 36, 4, hexAlpha(C.green, gatherPhase), 1.5);
      label(ctx, "Y (full output) — All-Gather", gX + gW / 2, gY + 18, hexAlpha(C.green, gatherPhase), 11);
    }

    /* Final note */
    if (t > 0.92) {
      const a = clamp01((t - 0.92) / 0.08);
      label(ctx, "✓ Each GPU only stores 1/" + numSlices + " of the weight matrix", W / 2, H - 16, hexAlpha(C.green, a), 11);
    }
  }, 5500);

  /* ================================================================
     4. PIPELINE PARALLELISM ANIMATION
     ================================================================ */
  (function () {
    const toggle = document.getElementById("pp-schedule-toggle");
    let use1F1B = false;
    if (toggle) toggle.addEventListener("change", function () {
      use1F1B = toggle.checked;
      resetAnim("pp-canvas");
    });

    registerAnim("pp-canvas", function (ctx, t) {
      const W = ctx._w, H = ctx._h;
      ctx.clearRect(0, 0, W, H);

      const numStages = 4;
      const numMicro = 4;
      const cellW = 60, cellH = 28, pad = 3;
      const gridX = 100;
      const gridY = 60;
      const stageColors = [C.dp, C.tp, C.pp, C.fsdp];

      const schedLabel = use1F1B ? "1F1B Schedule" : "GPipe Schedule";
      label(ctx, `Pipeline Parallelism — ${schedLabel}`, W / 2, 20, C.muted, 13);

      /* Y axis labels */
      for (let s = 0; s < numStages; s++) {
        label(ctx, `Stage ${s}`, gridX - 36, gridY + s * (cellH + pad) + cellH / 2, stageColors[s], 10, "center");
      }

      /* time axis */
      const totalCols = use1F1B ? 10 : 8;
      label(ctx, "Time step →", gridX + totalCols * (cellW + pad) / 2, gridY - 16, C.muted, 10);

      /* Build schedule */
      let schedule; /* [stage][timeStep] = { type: 'fwd'|'bwd'|'idle', micro: n } */
      if (!use1F1B) {
        /* GPipe: all forwards then all backwards */
        schedule = Array.from({ length: numStages }, () => Array(totalCols).fill(null));
        for (let m = 0; m < numMicro; m++) {
          for (let s = 0; s < numStages; s++) {
            schedule[s][m + s] = { type: "fwd", micro: m };
          }
        }
        /* backwards */
        for (let m = 0; m < numMicro; m++) {
          for (let s = numStages - 1; s >= 0; s--) {
            const col = numMicro + (numStages - 1) + m + (numStages - 1 - s);
            if (col < totalCols) schedule[s][col] = { type: "bwd", micro: m };
          }
        }
      } else {
        /* 1F1B */
        schedule = Array.from({ length: numStages }, () => Array(totalCols).fill(null));
        /* Warmup: staggered forwards */
        for (let s = 0; s < numStages; s++) {
          for (let m = 0; m < numStages - s; m++) {
            if (s + m < totalCols) schedule[s][s + m] = { type: "fwd", micro: m };
          }
        }
        /* Steady state: interleaved 1F1B for each stage */
        for (let s = 0; s < numStages; s++) {
          let nextFwd = numStages - s;
          let nextBwd = 0;
          let col = numStages;
          while (col < totalCols) {
            if (schedule[s][col] === null) {
              if (nextBwd < numMicro && col >= numStages) {
                schedule[s][col] = { type: "bwd", micro: nextBwd++ };
                col++;
                if (col < totalCols && nextFwd < numMicro) {
                  schedule[s][col] = { type: "fwd", micro: nextFwd++ };
                }
              } else if (nextFwd < numMicro) {
                schedule[s][col] = { type: "fwd", micro: nextFwd++ };
              }
            }
            col++;
          }
        }
      }

      /* Draw cells */
      const totalSteps = totalCols;
      for (let s = 0; s < numStages; s++) {
        for (let c = 0; c < totalCols; c++) {
          const cx = gridX + c * (cellW + pad);
          const cy = gridY + s * (cellH + pad);
          const reveal = clamp01((t - (c / totalSteps) * 0.85) / (0.85 / totalSteps));
          if (reveal <= 0) continue;

          const cell = schedule[s][c];
          if (cell) {
            const color = cell.type === "fwd" ? stageColors[s] : C.orange;
            fillRoundRect(ctx, cx, cy, cellW * easeInOut(reveal), cellH, 4, hexAlpha(color, 0.5));
            if (reveal > 0.5) {
              const txt = cell.type === "fwd" ? `F${cell.micro}` : `B${cell.micro}`;
              label(ctx, txt, cx + cellW / 2, cy + cellH / 2, C.text, 10);
            }
          } else {
            fillRoundRect(ctx, cx, cy, cellW * easeInOut(reveal), cellH, 4, C.bubble);
            if (reveal > 0.5) label(ctx, "idle", cx + cellW / 2, cy + cellH / 2, hexAlpha(C.muted, 0.4), 8);
          }
        }
      }

      /* Legend */
      const legY = gridY + numStages * (cellH + pad) + 24;
      fillRoundRect(ctx, gridX, legY, 16, 12, 2, hexAlpha(C.dp, 0.5));
      label(ctx, "= Forward", gridX + 50, legY + 6, C.muted, 10, "center");
      fillRoundRect(ctx, gridX + 100, legY, 16, 12, 2, hexAlpha(C.orange, 0.5));
      label(ctx, "= Backward", gridX + 155, legY + 6, C.muted, 10, "center");
      fillRoundRect(ctx, gridX + 220, legY, 16, 12, 2, C.bubble);
      label(ctx, "= Bubble (idle)", gridX + 290, legY + 6, C.muted, 10, "center");

      if (t > 0.9) {
        const a = clamp01((t - 0.9) / 0.1);
        const msg = use1F1B ? "1F1B interleaves F/B to reduce bubble size" : "GPipe has a large bubble — switch to 1F1B ↑";
        label(ctx, msg, W / 2, legY + 32, hexAlpha(use1F1B ? C.green : C.yellow, a), 11);
      }
    }, 6000);
  })();


  /* ================================================================
     5. FSDP / ZeRO ANIMATION
     ================================================================ */
  (function () {
    const slider = document.getElementById("zero-stage-slider");
    const stageLabel = document.getElementById("zero-stage-value");
    let zeroStage = 1;
    if (slider) slider.addEventListener("input", function () {
      zeroStage = parseInt(slider.value);
      if (stageLabel) stageLabel.textContent = zeroStage;
      resetAnim("fsdp-canvas");
    });

    registerAnim("fsdp-canvas", function (ctx, t) {
      const W = ctx._w, H = ctx._h;
      ctx.clearRect(0, 0, W, H);

      label(ctx, `FSDP / ZeRO Stage ${zeroStage} — Memory per GPU`, W / 2, 20, C.muted, 13);

      const numGPU = 4;
      const gpuW = 130, gpuH = 260;
      const gap = (W - numGPU * gpuW) / (numGPU + 1);
      const topY = 45;

      /* Memory components */
      const components = [
        { name: "Parameters",    fullH: 60, color: C.dp,   shardStage: 3 },
        { name: "Gradients",     fullH: 60, color: C.orange, shardStage: 2 },
        { name: "Optimizer St.", fullH: 100, color: C.fsdp,  shardStage: 1 },
      ];

      const reveal = easeInOut(clamp01(t / 0.5));

      for (let g = 0; g < numGPU; g++) {
        const x = gap + g * (gpuW + gap);
        fillRoundRect(ctx, x, topY, gpuW, gpuH, 8, C.surface);
        strokeRoundRect(ctx, x, topY, gpuW, gpuH, 8, hexAlpha(C.fsdp, 0.5), 1.5);
        label(ctx, `GPU ${g}`, x + gpuW / 2, topY + 16, C.text, 11);

        let cy = topY + 34;
        for (let c = 0; c < components.length; c++) {
          const comp = components[c];
          const isSharded = zeroStage >= comp.shardStage;
          const h = isSharded ? (comp.fullH / numGPU) : comp.fullH;
          const drawH = h * reveal;

          fillRoundRect(ctx, x + 8, cy, gpuW - 16, drawH, 4, hexAlpha(comp.color, 0.3));
          strokeRoundRect(ctx, x + 8, cy, gpuW - 16, drawH, 4, hexAlpha(comp.color, 0.6));

          if (drawH > 14) {
            const suffix = isSharded ? ` (1/${numGPU})` : " (full)";
            label(ctx, comp.name + suffix, x + gpuW / 2, cy + drawH / 2, hexAlpha(comp.color, 0.9), 9);
          }

          cy += drawH + 6;
        }

        /* Free memory indicator */
        const usedH = cy - (topY + 34);
        const freeH = gpuH - 40 - usedH;
        if (freeH > 10 && reveal > 0.5) {
          fillRoundRect(ctx, x + 8, cy, gpuW - 16, freeH - 6, 4, hexAlpha(C.green, 0.08));
          if (freeH > 20) label(ctx, "Free", x + gpuW / 2, cy + (freeH - 6) / 2, hexAlpha(C.green, 0.5), 9);
        }
      }

      /* Communication note */
      if (t > 0.6) {
        const a = clamp01((t - 0.6) / 0.2);
        const commY = topY + gpuH + 20;
        const msgs = {
          1: "Stage 1: Optimizer states sharded → all-gather params before step",
          2: "Stage 2: + Gradients sharded → reduce-scatter after backward",
          3: "Stage 3: + Parameters sharded → all-gather before each layer's forward/backward",
        };
        label(ctx, msgs[zeroStage], W / 2, commY, hexAlpha(C.fsdp, a), 11);

        /* Memory savings */
        const savings = { 1: "~4×", 2: "~8×", 3: "~N×" };
        if (t > 0.8) {
          const a2 = clamp01((t - 0.8) / 0.15);
          label(ctx, `Memory savings: ${savings[zeroStage]} reduction per GPU`, W / 2, commY + 22, hexAlpha(C.green, a2), 11);
        }
      }
    }, 4000);
  })();

  /* ================================================================
     6. EXPERT PARALLELISM ANIMATION
     ================================================================ */
  registerAnim("ep-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    label(ctx, "Expert Parallelism — Mixture of Experts Token Routing", W / 2, 20, C.muted, 13);

    const numGPU = 4;
    const numTokens = 8;
    const numExperts = numGPU; /* 1 expert per GPU for simplicity */

    /* Token row */
    const tokY = 55;
    const tokW = 50, tokH = 28;
    const tokGap = 8;
    const tokStartX = (W - numTokens * (tokW + tokGap) + tokGap) / 2;

    /* Expert assignments (deterministic for visualization) */
    const assignments = [0, 2, 1, 3, 1, 0, 3, 2];
    const expertColors = [C.dp, C.tp, C.pp, C.fsdp];

    /* Draw tokens */
    const tokReveal = clamp01(t / 0.15);
    for (let i = 0; i < numTokens; i++) {
      const tx = tokStartX + i * (tokW + tokGap);
      const alpha = easeInOut(clamp01(tokReveal));
      fillRoundRect(ctx, tx, tokY, tokW, tokH, 4, hexAlpha(C.text, 0.1 * alpha));
      strokeRoundRect(ctx, tx, tokY, tokW, tokH, 4, hexAlpha(C.text, 0.3 * alpha));
      label(ctx, `tok${i}`, tx + tokW / 2, tokY + tokH / 2, hexAlpha(C.text, alpha), 9);
    }

    /* Router */
    const routerY = tokY + tokH + 20;
    const routerW = 120, routerH = 30;
    const routerX = (W - routerW) / 2;
    const routerReveal = clamp01((t - 0.12) / 0.12);
    if (routerReveal > 0) {
      fillRoundRect(ctx, routerX, routerY, routerW, routerH, 6, hexAlpha(C.yellow, 0.2 * routerReveal));
      strokeRoundRect(ctx, routerX, routerY, routerW, routerH, 6, hexAlpha(C.yellow, routerReveal));
      label(ctx, "Gating Router", routerX + routerW / 2, routerY + routerH / 2, hexAlpha(C.yellow, routerReveal), 11);
    }

    /* GPU / Expert boxes */
    const gpuY = routerY + routerH + 60;
    const gpuW = 130, gpuH = 100;
    const gpuGap = (W - numGPU * gpuW) / (numGPU + 1);

    for (let g = 0; g < numGPU; g++) {
      const gx = gpuGap + g * (gpuW + gpuGap);
      fillRoundRect(ctx, gx, gpuY, gpuW, gpuH, 8, C.surface);
      strokeRoundRect(ctx, gx, gpuY, gpuW, gpuH, 8, expertColors[g], 1.5);
      label(ctx, `GPU ${g}`, gx + gpuW / 2, gpuY + 16, C.text, 11);
      label(ctx, `Expert ${g}`, gx + gpuW / 2, gpuY + 38, expertColors[g], 11);

      /* Show which tokens arrive */
      const routePhase = clamp01((t - 0.3) / 0.35);
      if (routePhase > 0) {
        const arriving = assignments.map((a, i) => a === g ? i : -1).filter(i => i >= 0);
        const tokStr = arriving.map(i => `tok${i}`).join(", ");
        label(ctx, tokStr, gx + gpuW / 2, gpuY + 62, hexAlpha(C.text, easeInOut(routePhase)), 9);

        /* load bar */
        const load = arriving.length / numTokens;
        const barW = (gpuW - 20) * load;
        fillRoundRect(ctx, gx + 10, gpuY + 76, barW * easeInOut(routePhase), 10, 3, hexAlpha(expertColors[g], 0.5));
        label(ctx, `${arriving.length}/${numTokens}`, gx + gpuW - 16, gpuY + 81, hexAlpha(C.muted, routePhase), 8, "right");
      }
    }

    /* Routing lines */
    const linePhase = clamp01((t - 0.25) / 0.3);
    if (linePhase > 0) {
      for (let i = 0; i < numTokens; i++) {
        const tx = tokStartX + i * (tokW + tokGap) + tokW / 2;
        const g = assignments[i];
        const gx = gpuGap + g * (gpuW + gpuGap) + gpuW / 2;
        const progress = easeInOut(clamp01((linePhase - i * 0.08)));
        if (progress <= 0) continue;

        const midY = (routerY + routerH + gpuY) / 2;
        const curX = lerp(tx, gx, progress);
        const curY = lerp(routerY + routerH + 4, gpuY - 4, progress);

        ctx.beginPath();
        ctx.moveTo(tx, tokY + tokH + 2);
        ctx.quadraticCurveTo(tx, midY, curX, curY);
        ctx.strokeStyle = hexAlpha(expertColors[g], 0.4 * progress);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    /* All-to-all label */
    if (t > 0.55) {
      const a = clamp01((t - 0.55) / 0.15);
      label(ctx, "All-to-All communication", W / 2, routerY + routerH + 34, hexAlpha(C.ep, a), 10);
    }

    /* Output */
    if (t > 0.75) {
      const a = clamp01((t - 0.75) / 0.15);
      const outY = gpuY + gpuH + 20;
      label(ctx, "Expert outputs gathered → continue to next layer", W / 2, outY, hexAlpha(C.green, a), 11);
    }
  }, 5500);


  /* ================================================================
     7. SEQUENCE PARALLELISM ANIMATION
     ================================================================ */
  registerAnim("sp-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    label(ctx, "Sequence Parallelism — Ring Attention", W / 2, 20, C.muted, 13);

    const numGPU = 4;
    const centerX = W / 2;
    const centerY = H / 2 + 10;
    const radius = 130;
    const gpuR = 50;
    const seqColors = [C.dp, C.tp, C.pp, C.fsdp];

    /* Draw ring */
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(C.border, 0.5);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    /* GPU nodes on ring */
    const angles = [];
    for (let i = 0; i < numGPU; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numGPU;
      angles.push(angle);
      const gx = centerX + radius * Math.cos(angle);
      const gy = centerY + radius * Math.sin(angle);

      fillRoundRect(ctx, gx - gpuR, gy - 30, gpuR * 2, 60, 8, C.surface);
      strokeRoundRect(ctx, gx - gpuR, gy - 30, gpuR * 2, 60, 8, seqColors[i], 1.5);
      label(ctx, `GPU ${i}`, gx, gy - 12, C.text, 11);

      /* Sequence chunk */
      const chunkLabel = `Seq[${i * 256}:${(i + 1) * 256}]`;
      label(ctx, chunkLabel, gx, gy + 8, seqColors[i], 9);
    }

    /* KV block passing animation */
    const passPhase = clamp01((t - 0.15) / 0.6);
    if (passPhase > 0) {
      /* Show KV blocks moving around the ring */
      const numRounds = numGPU - 1;
      const currentRound = Math.floor(passPhase * numRounds);
      const roundProgress = (passPhase * numRounds) - currentRound;

      for (let i = 0; i < numGPU; i++) {
        /* Each GPU sends its KV to the next GPU in the ring */
        const fromIdx = i;
        const toIdx = (i + 1) % numGPU;
        const fromAngle = angles[fromIdx];
        const toAngle = angles[toIdx];

        const fromX = centerX + radius * Math.cos(fromAngle);
        const fromY = centerY + radius * Math.sin(fromAngle);
        const toX = centerX + radius * Math.cos(toAngle);
        const toY = centerY + radius * Math.sin(toAngle);

        /* Animate KV block along arc */
        const blockProgress = easeInOut(clamp01(roundProgress));
        const bx = lerp(fromX, toX, blockProgress);
        const by = lerp(fromY, toY, blockProgress);

        /* KV block */
        const blockAlpha = 0.8;
        fillRoundRect(ctx, bx - 18, by - 10, 36, 20, 4, hexAlpha(seqColors[fromIdx], 0.4 * blockAlpha));
        strokeRoundRect(ctx, bx - 18, by - 10, 36, 20, 4, hexAlpha(seqColors[fromIdx], blockAlpha));
        label(ctx, `KV${fromIdx}`, bx, by, hexAlpha(C.text, blockAlpha), 8);

        /* Arrow on ring */
        const midAngle = (fromAngle + toAngle) / 2;
        if (Math.abs(toAngle - fromAngle) > Math.PI) {
          /* handle wrap */
        }
        const arrowX = centerX + (radius + 20) * Math.cos(midAngle);
        const arrowY = centerY + (radius + 20) * Math.sin(midAngle);
      }

      /* Round indicator */
      label(ctx, `Round ${currentRound + 1} of ${numRounds}`, centerX, centerY - 50, hexAlpha(C.sp, 0.8), 11);
      label(ctx, "KV blocks passed →", centerX, centerY + 50, hexAlpha(C.muted, 0.7), 10);
    }

    /* Attention compute indicator */
    const compPhase = clamp01((t - 0.2) / 0.5);
    if (compPhase > 0) {
      label(ctx, "Each GPU computes attention", centerX, centerY - 4, hexAlpha(C.sp, compPhase), 10);
      label(ctx, "with local Q, received KV", centerX, centerY + 12, hexAlpha(C.sp, compPhase * 0.7), 9);
    }

    /* Completion */
    if (t > 0.85) {
      const a = clamp01((t - 0.85) / 0.15);
      label(ctx, "✓ Full attention computed — each GPU only stores 1/N of the sequence", W / 2, H - 16, hexAlpha(C.green, a), 11);
    }
  }, 6000);

  /* ================================================================
     INIT — draw all initial frames
     ================================================================ */
  Object.keys(animations).forEach(function (id) {
    const ctx = getCtx(id);
    if (ctx) animations[id].draw(ctx, 0);
  });

  /* Handle resize */
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      Object.keys(animations).forEach(function (id) {
        const a = animations[id];
        const ctx = getCtx(id);
        if (ctx) a.draw(ctx, a.progress);
      });
    }, 150);
  });

})();
