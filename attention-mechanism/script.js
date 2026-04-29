/* ================================================================
   Attention Mechanism — Interactive Animations
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
    blue:    "#6c8cff",
    green:   "#4ade80",
    yellow:  "#facc15",
    orange:  "#fb923c",
    red:     "#f87171",
    purple:  "#c084fc",
    cyan:    "#22d3ee",
    pink:    "#f472b6",
    white:   "#ffffff",
    bubble:  "rgba(255,255,255,0.06)",
  };

  const HEAD_COLORS = [C.blue, C.green, C.orange, C.purple, C.cyan, C.pink, C.yellow, C.red];

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

  function fillRR(ctx, x, y, w, h, r, color) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRR(ctx, x, y, w, h, r, color, lw) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }

  function label(ctx, text, x, y, color, size, align) {
    ctx.fillStyle = color || C.text;
    ctx.font = `${size || 12}px Inter, system-ui, sans-serif`;
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

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-play")) playAnim(e.target.dataset.target);
    if (e.target.classList.contains("btn-reset")) resetAnim(e.target.dataset.target);
  });


  /* ================================================================
     1. SELF-ATTENTION ANIMATION
     Shows tokens attending to each other with weighted connections
     ================================================================ */
  registerAnim("sa-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const tokens = ["The", "cat", "sat", "on", "the", "mat", "because", "it", "was", "tired"];
    const n = tokens.length;

    /* Attention weights for "it" (index 7) — emphasizing "cat" */
    const attWeights = [0.04, 0.35, 0.08, 0.02, 0.03, 0.06, 0.05, 0.12, 0.10, 0.15];

    /* Layout: tokens in a row at top, Q/K/V projections, then attention lines */
    const tokY = 50;
    const tokW = 58;
    const tokH = 28;
    const totalTokW = n * tokW + (n - 1) * 6;
    const tokStartX = (W - totalTokW) / 2;

    label(ctx, "Self-Attention: How \"it\" attends to all tokens", W / 2, 20, C.muted, 13);

    /* Phase 1: Show tokens */
    const tokReveal = easeInOut(clamp01(t / 0.12));
    for (let i = 0; i < n; i++) {
      const tx = tokStartX + i * (tokW + 6);
      const alpha = tokReveal;
      fillRR(ctx, tx, tokY, tokW, tokH, 5, hexAlpha(C.surface, alpha));
      strokeRR(ctx, tx, tokY, tokW, tokH, 5, hexAlpha(i === 7 ? C.cyan : C.border, alpha), i === 7 ? 2 : 1);
      label(ctx, tokens[i], tx + tokW / 2, tokY + tokH / 2, hexAlpha(i === 7 ? C.cyan : C.text, alpha), 11);
    }

    /* Phase 2: Show Q, K, V projection */
    const projPhase = clamp01((t - 0.12) / 0.15);
    if (projPhase > 0) {
      const projY = tokY + tokH + 30;
      const projLabels = ["Q (Query)", "K (Key)", "V (Value)"];
      const projColors = [C.blue, C.orange, C.green];
      const projW = 90;
      const projGap = 30;
      const projStartX = (W - 3 * projW - 2 * projGap) / 2;

      for (let p = 0; p < 3; p++) {
        const px = projStartX + p * (projW + projGap);
        const a = easeInOut(clamp01(projPhase * 3 - p * 0.5));
        if (a <= 0) continue;
        fillRR(ctx, px, projY, projW, 26, 5, hexAlpha(projColors[p], 0.2 * a));
        strokeRR(ctx, px, projY, projW, 26, 5, hexAlpha(projColors[p], a));
        label(ctx, projLabels[p], px + projW / 2, projY + 13, hexAlpha(projColors[p], a), 10);
      }

      /* Arrows from highlighted token to projections */
      const itX = tokStartX + 7 * (tokW + 6) + tokW / 2;
      const arrowA = easeInOut(clamp01((projPhase - 0.3) / 0.4));
      if (arrowA > 0) {
        for (let p = 0; p < 3; p++) {
          const px = projStartX + p * (projW + projGap) + projW / 2;
          ctx.beginPath();
          ctx.moveTo(itX, tokY + tokH + 2);
          ctx.lineTo(px, projY - 2);
          ctx.strokeStyle = hexAlpha(C.muted, 0.4 * arrowA);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        label(ctx, "Each token → projected to Q, K, V vectors", W / 2, projY + 40, hexAlpha(C.muted, arrowA), 10);
      }
    }

    /* Phase 3: Attention score computation */
    const scorePhase = clamp01((t - 0.32) / 0.2);
    const scoreY = 185;
    if (scorePhase > 0) {
      label(ctx, "Attention scores: Q(\"it\") · K(each token)ᵀ / √d", W / 2, scoreY, hexAlpha(C.yellow, easeInOut(scorePhase)), 11);

      /* Score boxes */
      const sBoxW = 50;
      const sBoxH = 22;
      const sTotalW = n * sBoxW + (n - 1) * 4;
      const sStartX = (W - sTotalW) / 2;
      const sY = scoreY + 16;

      for (let i = 0; i < n; i++) {
        const sx = sStartX + i * (sBoxW + 4);
        const reveal = easeInOut(clamp01(scorePhase * 2 - i * 0.08));
        if (reveal <= 0) continue;
        const score = attWeights[i];
        const intensity = score / 0.35;
        fillRR(ctx, sx, sY, sBoxW, sBoxH, 3, hexAlpha(C.yellow, 0.15 * reveal * intensity));
        strokeRR(ctx, sx, sY, sBoxW, sBoxH, 3, hexAlpha(C.yellow, 0.5 * reveal));
        label(ctx, score.toFixed(2), sx + sBoxW / 2, sY + sBoxH / 2, hexAlpha(C.yellow, reveal), 9);
      }
    }

    /* Phase 4: Softmax + attention lines */
    const attnPhase = clamp01((t - 0.55) / 0.3);
    if (attnPhase > 0) {
      const lineTopY = tokY + tokH + 2;
      const lineBottomY = 260;

      label(ctx, "After softmax → attention weights (thicker = stronger attention)", W / 2, lineBottomY - 16, hexAlpha(C.muted, easeInOut(attnPhase)), 10);

      /* Draw bottom row of tokens */
      for (let i = 0; i < n; i++) {
        const tx = tokStartX + i * (tokW + 6);
        const a = easeInOut(attnPhase);
        fillRR(ctx, tx, lineBottomY, tokW, tokH, 5, hexAlpha(C.surface, a));
        strokeRR(ctx, tx, lineBottomY, tokW, tokH, 5, hexAlpha(C.border, a));
        label(ctx, tokens[i], tx + tokW / 2, lineBottomY + tokH / 2, hexAlpha(C.text, a), 11);
      }

      /* Attention lines from "it" to all tokens */
      const itX = tokStartX + 7 * (tokW + 6) + tokW / 2;
      for (let i = 0; i < n; i++) {
        const targetX = tokStartX + i * (tokW + 6) + tokW / 2;
        const w = attWeights[i];
        const lineProgress = easeInOut(clamp01(attnPhase * 1.5 - i * 0.05));
        if (lineProgress <= 0) continue;

        const lineWidth = 1 + w * 8;
        const alpha = 0.2 + w * 0.8;

        ctx.beginPath();
        const midY = (lineTopY + lineBottomY) / 2;
        ctx.moveTo(itX, lineTopY);
        ctx.quadraticCurveTo(
          (itX + targetX) / 2,
          midY - 10 + Math.abs(itX - targetX) * 0.08,
          targetX,
          lineBottomY
        );
        ctx.strokeStyle = hexAlpha(i === 1 ? C.cyan : C.blue, alpha * lineProgress);
        ctx.lineWidth = lineWidth * lineProgress;
        ctx.stroke();
      }

      /* Highlight strongest connection */
      if (attnPhase > 0.6) {
        const hlA = clamp01((attnPhase - 0.6) / 0.3);
        label(ctx, "\"it\" attends most strongly to \"cat\" (0.35)", W / 2, lineBottomY + tokH + 18, hexAlpha(C.cyan, hlA), 11);
      }
    }

    /* Phase 5: Output */
    if (t > 0.88) {
      const outA = clamp01((t - 0.88) / 0.12);
      const outY = 320;
      label(ctx, "Output = weighted sum of Value vectors → context-aware representation of \"it\"", W / 2, outY, hexAlpha(C.green, outA), 11);
      label(ctx, "✓ \"it\" now carries information about \"cat\" through the attention weights", W / 2, outY + 20, hexAlpha(C.green, outA * 0.7), 10);
    }
  }, 7000);


  /* ================================================================
     2. KV CACHE ANIMATION
     Shows cache growing during autoregressive generation
     ================================================================ */
  registerAnim("kv-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const genTokens = ["The", "cat", "sat", "on", "the", "mat"];
    const totalSteps = genTokens.length;

    label(ctx, "KV Cache — Autoregressive Generation", W / 2, 20, C.muted, 13);

    /* Current generation step */
    const step = Math.min(Math.floor(t * (totalSteps + 0.5)), totalSteps - 1);
    const stepProgress = clamp01((t * (totalSteps + 0.5)) - step);

    /* Layout */
    const cacheX = 60;
    const cacheY = 70;
    const cellW = 80;
    const cellH = 28;
    const rowGap = 6;
    const colGap = 6;

    /* Labels */
    label(ctx, "Step " + (step + 1) + ": generating \"" + genTokens[step] + "\"", W / 2, 45, C.cyan, 12);

    /* Draw K cache and V cache side by side */
    const kCacheX = cacheX;
    const vCacheX = cacheX + (cellW + colGap) * totalSteps + 60;

    label(ctx, "Key Cache", kCacheX + ((cellW + colGap) * Math.min(step + 1, totalSteps)) / 2, cacheY - 12, C.orange, 11);
    label(ctx, "Value Cache", vCacheX + ((cellW + colGap) * Math.min(step + 1, totalSteps)) / 2, cacheY - 12, C.green, 11);

    /* Draw cached entries */
    for (let i = 0; i <= step; i++) {
      const isNew = (i === step);
      const reveal = isNew ? easeInOut(clamp01(stepProgress / 0.5)) : 1;

      /* K cache cell */
      const kx = kCacheX + i * (cellW + colGap);
      fillRR(ctx, kx, cacheY, cellW * reveal, cellH, 4, hexAlpha(C.orange, isNew ? 0.4 : 0.2));
      strokeRR(ctx, kx, cacheY, cellW * reveal, cellH, 4, hexAlpha(C.orange, isNew ? 1 : 0.5), isNew ? 2 : 1);
      if (reveal > 0.5) label(ctx, "K(\"" + genTokens[i] + "\")", kx + cellW / 2, cacheY + cellH / 2, hexAlpha(C.orange, reveal), 9);

      /* V cache cell */
      const vx = vCacheX + i * (cellW + colGap);
      fillRR(ctx, vx, cacheY, cellW * reveal, cellH, 4, hexAlpha(C.green, isNew ? 0.4 : 0.2));
      strokeRR(ctx, vx, cacheY, cellW * reveal, cellH, 4, hexAlpha(C.green, isNew ? 1 : 0.5), isNew ? 2 : 1);
      if (reveal > 0.5) label(ctx, "V(\"" + genTokens[i] + "\")", vx + cellW / 2, cacheY + cellH / 2, hexAlpha(C.green, reveal), 9);
    }

    /* New token's Query */
    const qY = cacheY + cellH + 40;
    const qX = W / 2 - 60;
    const qReveal = easeInOut(clamp01((stepProgress - 0.2) / 0.3));
    if (qReveal > 0) {
      fillRR(ctx, qX, qY, 120, cellH, 4, hexAlpha(C.blue, 0.3 * qReveal));
      strokeRR(ctx, qX, qY, 120, cellH, 4, hexAlpha(C.blue, qReveal), 2);
      label(ctx, "Q(\"" + genTokens[step] + "\")", qX + 60, qY + cellH / 2, hexAlpha(C.blue, qReveal), 10);
      label(ctx, "New token's Query", qX + 60, qY + cellH + 14, hexAlpha(C.muted, qReveal), 9);
    }

    /* Attention arrows from Q to all cached K */
    const arrowPhase = clamp01((stepProgress - 0.5) / 0.4);
    if (arrowPhase > 0) {
      for (let i = 0; i <= step; i++) {
        const kx = kCacheX + i * (cellW + colGap) + cellW / 2;
        const a = easeInOut(clamp01(arrowPhase * 2 - i * 0.15));
        if (a <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(qX + 60, qY);
        ctx.quadraticCurveTo(qX + 60, (qY + cacheY + cellH) / 2, kx, cacheY + cellH + 2);
        ctx.strokeStyle = hexAlpha(C.blue, 0.4 * a);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      label(ctx, "Q attends to all cached K vectors", W / 2, qY + cellH + 34, hexAlpha(C.blue, arrowPhase), 10);
    }

    /* Memory indicator */
    const memY = H - 70;
    const memBarW = W - 120;
    const memBarH = 20;
    const memX = 60;
    const memFill = (step + 1) / totalSteps;

    label(ctx, "KV Cache Memory Usage", W / 2, memY - 14, C.muted, 10);
    fillRR(ctx, memX, memY, memBarW, memBarH, 4, C.surface);
    strokeRR(ctx, memX, memY, memBarW, memBarH, 4, C.border);
    fillRR(ctx, memX, memY, memBarW * memFill, memBarH, 4, hexAlpha(C.purple, 0.5));
    label(ctx, Math.round(memFill * 100) + "% — " + (step + 1) + "/" + totalSteps + " tokens cached", W / 2, memY + memBarH / 2, C.text, 9);

    /* Bottom note */
    label(ctx, "Cache grows linearly with sequence length — the dominant memory cost in LLM inference", W / 2, H - 20, hexAlpha(C.muted, 0.7), 10);
  }, 8000);


  /* ================================================================
     3. MULTI-HEAD ATTENTION ANIMATION
     Shows multiple heads with different attention patterns
     ================================================================ */
  registerAnim("mha-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const tokens = ["The", "cat", "sat", "on", "the", "mat"];
    const n = tokens.length;
    const numHeads = 4;

    label(ctx, "Multi-Head Attention — 4 heads, each learning different patterns", W / 2, 20, C.muted, 13);

    /* Token row */
    const tokW = 60;
    const tokH = 26;
    const tokGap = 8;
    const totalTokW = n * (tokW + tokGap) - tokGap;
    const tokStartX = (W - totalTokW) / 2;
    const tokY = 48;

    const tokReveal = easeInOut(clamp01(t / 0.1));
    for (let i = 0; i < n; i++) {
      const tx = tokStartX + i * (tokW + tokGap);
      fillRR(ctx, tx, tokY, tokW, tokH, 4, hexAlpha(C.surface, tokReveal));
      strokeRR(ctx, tx, tokY, tokW, tokH, 4, hexAlpha(C.border, tokReveal));
      label(ctx, tokens[i], tx + tokW / 2, tokY + tokH / 2, hexAlpha(C.text, tokReveal), 10);
    }

    /* Head attention patterns (different for each head) */
    /* Each head: array of [source, target, weight] — showing what "sat" (idx 2) attends to */
    const headPatterns = [
      /* Head 0 (blue): syntactic — subject-verb */
      { label: "Head 1: Syntactic", focus: "subject-verb",
        weights: [[2,1,0.45],[2,0,0.15],[2,2,0.15],[2,3,0.10],[2,4,0.08],[2,5,0.07]] },
      /* Head 1 (green): positional — nearby tokens */
      { label: "Head 2: Positional", focus: "local context",
        weights: [[2,1,0.30],[2,3,0.30],[2,2,0.20],[2,0,0.08],[2,4,0.07],[2,5,0.05]] },
      /* Head 2 (orange): semantic — related nouns */
      { label: "Head 3: Semantic", focus: "noun relations",
        weights: [[2,5,0.30],[2,1,0.25],[2,4,0.15],[2,2,0.15],[2,0,0.10],[2,3,0.05]] },
      /* Head 3 (purple): broad — uniform-ish */
      { label: "Head 4: Global", focus: "broad context",
        weights: [[2,0,0.18],[2,1,0.18],[2,2,0.16],[2,3,0.16],[2,4,0.16],[2,5,0.16]] },
    ];

    /* Draw each head in its own row */
    const headStartY = tokY + tokH + 20;
    const headRowH = 75;

    for (let h = 0; h < numHeads; h++) {
      const headPhase = clamp01((t - 0.1 - h * 0.12) / 0.25);
      if (headPhase <= 0) continue;

      const hy = headStartY + h * headRowH;
      const color = HEAD_COLORS[h];
      const pattern = headPatterns[h];

      /* Head label */
      const labelA = easeInOut(clamp01(headPhase * 2));
      label(ctx, pattern.label, 70, hy + 20, hexAlpha(color, labelA), 10, "center");
      label(ctx, "(" + pattern.focus + ")", 70, hy + 34, hexAlpha(color, labelA * 0.6), 8, "center");

      /* Attention lines */
      const srcIdx = 2; /* "sat" */
      const srcX = tokStartX + srcIdx * (tokW + tokGap) + tokW / 2;

      for (let w = 0; w < pattern.weights.length; w++) {
        const [, tgtIdx, weight] = pattern.weights[w];
        const tgtX = tokStartX + tgtIdx * (tokW + tokGap) + tokW / 2;
        const lineA = easeInOut(clamp01(headPhase * 1.5 - w * 0.05));
        if (lineA <= 0) continue;

        const lineWidth = 1 + weight * 6;
        ctx.beginPath();
        ctx.moveTo(srcX, tokY + tokH + 2);
        ctx.quadraticCurveTo(
          (srcX + tgtX) / 2,
          hy + 10,
          tgtX, hy + 45
        );
        ctx.strokeStyle = hexAlpha(color, (0.2 + weight * 0.8) * lineA);
        ctx.lineWidth = lineWidth * lineA;
        ctx.stroke();

        /* Weight label at target */
        if (lineA > 0.5) {
          label(ctx, weight.toFixed(2), tgtX, hy + 55, hexAlpha(color, lineA * 0.7), 8);
        }
      }
    }

    /* Concatenation phase */
    const concatPhase = clamp01((t - 0.75) / 0.15);
    if (concatPhase > 0) {
      const concatY = headStartY + numHeads * headRowH + 5;
      const a = easeInOut(concatPhase);

      /* Concat box */
      const concatW = 300;
      const concatX = (W - concatW) / 2;
      fillRR(ctx, concatX, concatY, concatW, 28, 5, hexAlpha(C.cyan, 0.15 * a));
      strokeRR(ctx, concatX, concatY, concatW, 28, 5, hexAlpha(C.cyan, a));

      /* Color segments inside */
      const segW = concatW / numHeads;
      for (let h = 0; h < numHeads; h++) {
        fillRR(ctx, concatX + h * segW + 2, concatY + 3, segW - 4, 22, 3, hexAlpha(HEAD_COLORS[h], 0.3 * a));
      }
      label(ctx, "Concat(head₁, head₂, head₃, head₄) · Wᴼ", concatX + concatW / 2, concatY + 14, hexAlpha(C.cyan, a), 10);
    }

    /* Final output */
    if (t > 0.92) {
      const outA = clamp01((t - 0.92) / 0.08);
      label(ctx, "✓ Each head captures a different linguistic relationship", W / 2, H - 20, hexAlpha(C.green, outA), 11);
    }
  }, 7000);


  /* ================================================================
     4. MULTI-QUERY ATTENTION ANIMATION
     Compares MHA vs MQA — shows KV head sharing
     ================================================================ */
  registerAnim("mqa-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const numHeads = 4;
    const headW = 60;
    const headH = 36;
    const headGap = 16;

    /* Two panels: MHA on left, MQA on right */
    const panelW = (W - 40) / 2;
    const leftX = 10;
    const rightX = W / 2 + 10;

    /* Phase 1: MHA side */
    const mhaPhase = clamp01(t / 0.4);

    label(ctx, "Multi-Head Attention (MHA)", leftX + panelW / 2, 20, C.muted, 12);
    label(ctx, "Multi-Query Attention (MQA)", rightX + panelW / 2, 20, C.muted, 12);

    /* Divider */
    ctx.beginPath();
    ctx.moveTo(W / 2, 35);
    ctx.lineTo(W / 2, H - 10);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    /* --- MHA Side --- */
    const qRowY = 50;
    const kRowY = 130;
    const vRowY = 210;

    /* Q heads */
    label(ctx, "Query Heads", leftX + panelW / 2, qRowY - 10, C.blue, 10);
    const qStartX = leftX + (panelW - numHeads * (headW + headGap) + headGap) / 2;
    for (let i = 0; i < numHeads; i++) {
      const hx = qStartX + i * (headW + headGap);
      const a = easeInOut(clamp01(mhaPhase * 2 - i * 0.1));
      fillRR(ctx, hx, qRowY, headW, headH, 5, hexAlpha(C.blue, 0.25 * a));
      strokeRR(ctx, hx, qRowY, headW, headH, 5, hexAlpha(C.blue, a));
      label(ctx, "Q" + i, hx + headW / 2, qRowY + headH / 2, hexAlpha(C.blue, a), 10);
    }

    /* K heads (MHA: one per Q head) */
    label(ctx, "Key Heads", leftX + panelW / 2, kRowY - 10, C.orange, 10);
    for (let i = 0; i < numHeads; i++) {
      const hx = qStartX + i * (headW + headGap);
      const a = easeInOut(clamp01(mhaPhase * 2 - 0.3 - i * 0.1));
      if (a <= 0) continue;
      fillRR(ctx, hx, kRowY, headW, headH, 5, hexAlpha(C.orange, 0.25 * a));
      strokeRR(ctx, hx, kRowY, headW, headH, 5, hexAlpha(C.orange, a));
      label(ctx, "K" + i, hx + headW / 2, kRowY + headH / 2, hexAlpha(C.orange, a), 10);

      /* Connection line Q->K */
      ctx.beginPath();
      ctx.moveTo(hx + headW / 2, qRowY + headH + 2);
      ctx.lineTo(hx + headW / 2, kRowY - 2);
      ctx.strokeStyle = hexAlpha(C.muted, 0.3 * a);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* V heads (MHA: one per Q head) */
    label(ctx, "Value Heads", leftX + panelW / 2, vRowY - 10, C.green, 10);
    for (let i = 0; i < numHeads; i++) {
      const hx = qStartX + i * (headW + headGap);
      const a = easeInOut(clamp01(mhaPhase * 2 - 0.5 - i * 0.1));
      if (a <= 0) continue;
      fillRR(ctx, hx, vRowY, headW, headH, 5, hexAlpha(C.green, 0.25 * a));
      strokeRR(ctx, hx, vRowY, headW, headH, 5, hexAlpha(C.green, a));
      label(ctx, "V" + i, hx + headW / 2, vRowY + headH / 2, hexAlpha(C.green, a), 10);

      ctx.beginPath();
      ctx.moveTo(hx + headW / 2, kRowY + headH + 2);
      ctx.lineTo(hx + headW / 2, vRowY - 2);
      ctx.strokeStyle = hexAlpha(C.muted, 0.3 * a);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* --- MQA Side --- */
    const mqaPhase = clamp01((t - 0.35) / 0.4);

    /* Q heads (same count) */
    label(ctx, "Query Heads", rightX + panelW / 2, qRowY - 10, hexAlpha(C.blue, mqaPhase > 0 ? 1 : 0.3), 10);
    const mqaQStartX = rightX + (panelW - numHeads * (headW + headGap) + headGap) / 2;
    for (let i = 0; i < numHeads; i++) {
      const hx = mqaQStartX + i * (headW + headGap);
      const a = easeInOut(clamp01(mqaPhase * 2 - i * 0.1));
      fillRR(ctx, hx, qRowY, headW, headH, 5, hexAlpha(C.blue, 0.25 * a));
      strokeRR(ctx, hx, qRowY, headW, headH, 5, hexAlpha(C.blue, a));
      label(ctx, "Q" + i, hx + headW / 2, qRowY + headH / 2, hexAlpha(C.blue, a), 10);
    }

    /* K head (MQA: just ONE) */
    if (mqaPhase > 0.2) {
      const singleKX = rightX + panelW / 2 - headW / 2;
      const a = easeInOut(clamp01((mqaPhase - 0.2) / 0.3));
      label(ctx, "1 Shared Key Head", rightX + panelW / 2, kRowY - 10, hexAlpha(C.orange, a), 10);
      fillRR(ctx, singleKX, kRowY, headW, headH, 5, hexAlpha(C.orange, 0.4 * a));
      strokeRR(ctx, singleKX, kRowY, headW, headH, 5, hexAlpha(C.orange, a), 2);
      label(ctx, "K₀", singleKX + headW / 2, kRowY + headH / 2, hexAlpha(C.orange, a), 11);

      /* Fan-in lines from all Q heads to single K */
      for (let i = 0; i < numHeads; i++) {
        const qx = mqaQStartX + i * (headW + headGap) + headW / 2;
        ctx.beginPath();
        ctx.moveTo(qx, qRowY + headH + 2);
        ctx.lineTo(singleKX + headW / 2, kRowY - 2);
        ctx.strokeStyle = hexAlpha(C.muted, 0.3 * a);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* V head (MQA: just ONE) */
      const singleVX = rightX + panelW / 2 - headW / 2;
      label(ctx, "1 Shared Value Head", rightX + panelW / 2, vRowY - 10, hexAlpha(C.green, a), 10);
      fillRR(ctx, singleVX, vRowY, headW, headH, 5, hexAlpha(C.green, 0.4 * a));
      strokeRR(ctx, singleVX, vRowY, headW, headH, 5, hexAlpha(C.green, a), 2);
      label(ctx, "V₀", singleVX + headW / 2, vRowY + headH / 2, hexAlpha(C.green, a), 11);

      ctx.beginPath();
      ctx.moveTo(singleKX + headW / 2, kRowY + headH + 2);
      ctx.lineTo(singleVX + headW / 2, vRowY - 2);
      ctx.strokeStyle = hexAlpha(C.muted, 0.3 * a);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* KV Cache comparison */
    const cachePhase = clamp01((t - 0.7) / 0.2);
    if (cachePhase > 0) {
      const cacheY = vRowY + headH + 25;
      const a = easeInOut(cachePhase);

      /* MHA cache */
      const mhaCacheW = panelW - 20;
      fillRR(ctx, leftX + 10, cacheY, mhaCacheW, 30, 5, hexAlpha(C.red, 0.15 * a));
      strokeRR(ctx, leftX + 10, cacheY, mhaCacheW, 30, 5, hexAlpha(C.red, a));
      label(ctx, "KV Cache: " + numHeads + " × K + " + numHeads + " × V", leftX + 10 + mhaCacheW / 2, cacheY + 15, hexAlpha(C.red, a), 9);

      /* MQA cache */
      const mqaCacheW = mhaCacheW / numHeads + 20;
      const mqaCacheX = rightX + (panelW - mqaCacheW) / 2;
      fillRR(ctx, mqaCacheX, cacheY, mqaCacheW, 30, 5, hexAlpha(C.green, 0.15 * a));
      strokeRR(ctx, mqaCacheX, cacheY, mqaCacheW, 30, 5, hexAlpha(C.green, a));
      label(ctx, "KV Cache: 1×K + 1×V", mqaCacheX + mqaCacheW / 2, cacheY + 15, hexAlpha(C.green, a), 9);

      /* Savings label */
      label(ctx, numHeads + "× KV cache", leftX + panelW / 2, cacheY + 42, hexAlpha(C.red, a), 10);
      label(ctx, "1× KV cache (" + numHeads + "× smaller!)", rightX + panelW / 2, cacheY + 42, hexAlpha(C.green, a), 10);
    }

    /* Summary */
    if (t > 0.92) {
      const a = clamp01((t - 0.92) / 0.08);
      label(ctx, "MQA: All query heads share one K,V → " + numHeads + "× less memory, faster decode", W / 2, H - 16, hexAlpha(C.cyan, a), 11);
    }
  }, 6500);


  /* ================================================================
     5. GROUPED-QUERY ATTENTION ANIMATION
     Shows the spectrum: MHA → GQA → MQA
     ================================================================ */
  registerAnim("gqa-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    const numQ = 8;
    const numKVGroups = 4; /* GQA config */
    const qPerGroup = numQ / numKVGroups;

    label(ctx, "Grouped-Query Attention — 8 Q heads, 4 KV groups (2 Q heads per group)", W / 2, 20, C.muted, 12);

    /* Three rows: MHA, GQA, MQA for comparison */
    const configs = [
      { name: "MHA", kvHeads: 8, y: 55, desc: "8 KV heads (1:1)" },
      { name: "GQA", kvHeads: 4, y: 175, desc: "4 KV heads (2:1)" },
      { name: "MQA", kvHeads: 1, y: 295, desc: "1 KV head (8:1)" },
    ];

    const headW = 40;
    const headH = 28;
    const headGap = 8;
    const qTotalW = numQ * (headW + headGap) - headGap;
    const qStartX = 160;

    for (let c = 0; c < configs.length; c++) {
      const cfg = configs[c];
      const rowPhase = clamp01((t - c * 0.2) / 0.35);
      if (rowPhase <= 0) continue;

      const a = easeInOut(rowPhase);
      const isGQA = c === 1;

      /* Config label */
      label(ctx, cfg.name, 40, cfg.y + 20, hexAlpha(isGQA ? C.cyan : C.muted, a), 14, "center");
      label(ctx, cfg.desc, 40, cfg.y + 38, hexAlpha(C.muted, a * 0.6), 9, "center");

      /* Q heads row */
      const qY = cfg.y;
      for (let i = 0; i < numQ; i++) {
        const hx = qStartX + i * (headW + headGap);
        const groupIdx = Math.floor(i / (numQ / cfg.kvHeads));
        const color = HEAD_COLORS[groupIdx % HEAD_COLORS.length];
        fillRR(ctx, hx, qY, headW, headH, 4, hexAlpha(color, 0.2 * a));
        strokeRR(ctx, hx, qY, headW, headH, 4, hexAlpha(color, 0.7 * a));
        label(ctx, "Q" + i, hx + headW / 2, qY + headH / 2, hexAlpha(color, a), 8);
      }

      /* KV heads row */
      const kvY = qY + headH + 20;
      const kvHeadW = cfg.kvHeads === 1 ? headW * 2 : headW;
      const kvTotalW = cfg.kvHeads * (kvHeadW + headGap) - headGap;

      for (let k = 0; k < cfg.kvHeads; k++) {
        /* Center KV heads under their Q group */
        let kvX;
        if (cfg.kvHeads === numQ) {
          kvX = qStartX + k * (headW + headGap);
        } else if (cfg.kvHeads === 1) {
          kvX = qStartX + (qTotalW - kvHeadW) / 2;
        } else {
          const groupStart = k * qPerGroup;
          const groupEnd = (k + 1) * qPerGroup - 1;
          const startX = qStartX + groupStart * (headW + headGap);
          const endX = qStartX + groupEnd * (headW + headGap) + headW;
          kvX = (startX + endX) / 2 - kvHeadW / 2;
        }

        const color = HEAD_COLORS[k % HEAD_COLORS.length];

        /* K head */
        fillRR(ctx, kvX, kvY, kvHeadW / 2 - 2, headH, 4, hexAlpha(C.orange, 0.3 * a));
        strokeRR(ctx, kvX, kvY, kvHeadW / 2 - 2, headH, 4, hexAlpha(C.orange, a));
        label(ctx, "K" + k, kvX + kvHeadW / 4 - 1, kvY + headH / 2, hexAlpha(C.orange, a), 8);

        /* V head */
        fillRR(ctx, kvX + kvHeadW / 2 + 2, kvY, kvHeadW / 2 - 2, headH, 4, hexAlpha(C.green, 0.3 * a));
        strokeRR(ctx, kvX + kvHeadW / 2 + 2, kvY, kvHeadW / 2 - 2, headH, 4, hexAlpha(C.green, a));
        label(ctx, "V" + k, kvX + 3 * kvHeadW / 4 + 1, kvY + headH / 2, hexAlpha(C.green, a), 8);

        /* Connection lines from Q heads to this KV group */
        const qsPerKV = numQ / cfg.kvHeads;
        for (let qi = 0; qi < qsPerKV; qi++) {
          const qIdx = k * qsPerKV + qi;
          const qx = qStartX + qIdx * (headW + headGap) + headW / 2;
          ctx.beginPath();
          ctx.moveTo(qx, qY + headH + 2);
          ctx.lineTo(kvX + kvHeadW / 2, kvY - 2);
          ctx.strokeStyle = hexAlpha(HEAD_COLORS[k % HEAD_COLORS.length], 0.25 * a);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      /* KV cache size indicator */
      const cacheBarX = qStartX + qTotalW + 30;
      const cacheBarMaxW = 100;
      const cacheFraction = cfg.kvHeads / numQ;
      const cacheBarW = cacheBarMaxW * cacheFraction;

      fillRR(ctx, cacheBarX, qY + 10, cacheBarW * a, headH, 4, hexAlpha(isGQA ? C.cyan : C.purple, 0.3));
      strokeRR(ctx, cacheBarX, qY + 10, cacheBarW * a, headH, 4, hexAlpha(isGQA ? C.cyan : C.purple, a * 0.7));
      if (a > 0.5) {
        label(ctx, cfg.kvHeads + " KV", cacheBarX + cacheBarW / 2, qY + 10 + headH / 2, hexAlpha(C.text, a), 9);
      }
    }

    /* Highlight GQA */
    if (t > 0.75) {
      const hlA = clamp01((t - 0.75) / 0.15);
      const gqaY = configs[1].y;
      strokeRR(ctx, qStartX - 10, gqaY - 8, qTotalW + 20, 90, 8, hexAlpha(C.cyan, hlA * 0.5), 2);
    }

    /* Summary */
    if (t > 0.9) {
      const a = clamp01((t - 0.9) / 0.1);
      label(ctx, "GQA: the sweet spot — near-MHA quality with significant KV cache savings", W / 2, H - 16, hexAlpha(C.cyan, a), 11);
    }
  }, 7000);


  /* ================================================================
     6. FLASH ATTENTION ANIMATION
     Compares standard attention (full N×N in HBM) vs Flash (tiled in SRAM)
     ================================================================ */
  registerAnim("fa-canvas", function (ctx, t) {
    const W = ctx._w, H = ctx._h;
    ctx.clearRect(0, 0, W, H);

    /* Two panels */
    const panelW = (W - 40) / 2;
    const leftX = 10;
    const rightX = W / 2 + 10;

    label(ctx, "Standard Attention", leftX + panelW / 2, 20, C.muted, 12);
    label(ctx, "Flash Attention", rightX + panelW / 2, 20, C.muted, 12);

    /* Divider */
    ctx.beginPath();
    ctx.moveTo(W / 2, 35);
    ctx.lineTo(W / 2, H - 10);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const N = 6; /* sequence length for visualization */
    const cellSize = 32;
    const matrixSize = N * cellSize;

    /* === LEFT: Standard Attention === */
    const stdPhase = clamp01(t / 0.5);

    /* HBM box */
    const hbmX = leftX + 15;
    const hbmY = 45;
    const hbmW = panelW - 30;
    const hbmH = H - 80;
    fillRR(ctx, hbmX, hbmY, hbmW, hbmH, 8, hexAlpha(C.red, 0.05));
    strokeRR(ctx, hbmX, hbmY, hbmW, hbmH, 8, hexAlpha(C.red, 0.3));
    label(ctx, "HBM (GPU Main Memory)", hbmX + hbmW / 2, hbmY + 14, hexAlpha(C.red, 0.7), 9);

    /* Q, K matrices */
    const qMatX = hbmX + 15;
    const qMatY = hbmY + 30;
    const matW = 60;
    const matH = 40;

    const stdReveal = easeInOut(clamp01(stdPhase * 2));
    fillRR(ctx, qMatX, qMatY, matW, matH, 4, hexAlpha(C.blue, 0.2 * stdReveal));
    strokeRR(ctx, qMatX, qMatY, matW, matH, 4, hexAlpha(C.blue, stdReveal));
    label(ctx, "Q", qMatX + matW / 2, qMatY + matH / 2, hexAlpha(C.blue, stdReveal), 10);

    fillRR(ctx, qMatX + matW + 10, qMatY, matW, matH, 4, hexAlpha(C.orange, 0.2 * stdReveal));
    strokeRR(ctx, qMatX + matW + 10, qMatY, matW, matH, 4, hexAlpha(C.orange, stdReveal));
    label(ctx, "K", qMatX + matW + 10 + matW / 2, qMatY + matH / 2, hexAlpha(C.orange, stdReveal), 10);

    fillRR(ctx, qMatX + 2 * (matW + 10), qMatY, matW, matH, 4, hexAlpha(C.green, 0.2 * stdReveal));
    strokeRR(ctx, qMatX + 2 * (matW + 10), qMatY, matW, matH, 4, hexAlpha(C.green, stdReveal));
    label(ctx, "V", qMatX + 2 * (matW + 10) + matW / 2, qMatY + matH / 2, hexAlpha(C.green, stdReveal), 10);

    /* Full N×N attention matrix */
    const attnMatX = hbmX + (hbmW - matrixSize) / 2;
    const attnMatY = qMatY + matH + 20;

    const matReveal = easeInOut(clamp01((stdPhase - 0.3) / 0.5));
    if (matReveal > 0) {
      label(ctx, "Full N×N Attention Matrix", hbmX + hbmW / 2, attnMatY - 8, hexAlpha(C.yellow, matReveal), 9);

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cx = attnMatX + c * cellSize;
          const cy = attnMatY + r * cellSize;
          const cellReveal = easeInOut(clamp01(matReveal * 2 - (r + c) * 0.05));
          if (cellReveal <= 0) continue;

          /* Random-ish attention value for visual effect */
          const val = (Math.sin(r * 3.7 + c * 2.3) * 0.5 + 0.5);
          fillRR(ctx, cx + 1, cy + 1, cellSize - 2, cellSize - 2, 2, hexAlpha(C.yellow, val * 0.4 * cellReveal));
          strokeRR(ctx, cx + 1, cy + 1, cellSize - 2, cellSize - 2, 2, hexAlpha(C.yellow, 0.3 * cellReveal));
        }
      }

      /* Size label */
      label(ctx, "O(N²) memory", hbmX + hbmW / 2, attnMatY + matrixSize + 14, hexAlpha(C.red, matReveal), 10);
    }

    /* HBM read/write arrows */
    if (stdPhase > 0.6) {
      const arrowA = easeInOut(clamp01((stdPhase - 0.6) / 0.3));
      const arrowY = attnMatY + matrixSize + 30;
      label(ctx, "↕ Many HBM reads/writes", hbmX + hbmW / 2, arrowY + 10, hexAlpha(C.red, arrowA), 9);
      label(ctx, "Bandwidth bottleneck!", hbmX + hbmW / 2, arrowY + 24, hexAlpha(C.red, arrowA * 0.7), 9);
    }

    /* === RIGHT: Flash Attention === */
    const flashPhase = clamp01((t - 0.3) / 0.6);

    /* HBM box */
    const fhbmX = rightX + 15;
    fillRR(ctx, fhbmX, hbmY, hbmW, hbmH * 0.45, 8, hexAlpha(C.purple, 0.05));
    strokeRR(ctx, fhbmX, hbmY, hbmW, hbmH * 0.45, 8, hexAlpha(C.purple, 0.3));
    label(ctx, "HBM (GPU Main Memory)", fhbmX + hbmW / 2, hbmY + 14, hexAlpha(C.purple, 0.7), 9);

    /* Q, K, V in HBM */
    const fReveal = easeInOut(clamp01(flashPhase * 2));
    fillRR(ctx, fhbmX + 15, qMatY, matW, matH, 4, hexAlpha(C.blue, 0.2 * fReveal));
    strokeRR(ctx, fhbmX + 15, qMatY, matW, matH, 4, hexAlpha(C.blue, fReveal));
    label(ctx, "Q", fhbmX + 15 + matW / 2, qMatY + matH / 2, hexAlpha(C.blue, fReveal), 10);

    fillRR(ctx, fhbmX + 15 + matW + 10, qMatY, matW, matH, 4, hexAlpha(C.orange, 0.2 * fReveal));
    strokeRR(ctx, fhbmX + 15 + matW + 10, qMatY, matW, matH, 4, hexAlpha(C.orange, fReveal));
    label(ctx, "K", fhbmX + 15 + matW + 10 + matW / 2, qMatY + matH / 2, hexAlpha(C.orange, fReveal), 10);

    fillRR(ctx, fhbmX + 15 + 2 * (matW + 10), qMatY, matW, matH, 4, hexAlpha(C.green, 0.2 * fReveal));
    strokeRR(ctx, fhbmX + 15 + 2 * (matW + 10), qMatY, matW, matH, 4, hexAlpha(C.green, fReveal));
    label(ctx, "V", fhbmX + 15 + 2 * (matW + 10) + matW / 2, qMatY + matH / 2, hexAlpha(C.green, fReveal), 10);

    /* SRAM box */
    const sramY = hbmY + hbmH * 0.45 + 20;
    const sramH = hbmH * 0.45;
    fillRR(ctx, fhbmX, sramY, hbmW, sramH, 8, hexAlpha(C.cyan, 0.08));
    strokeRR(ctx, fhbmX, sramY, hbmW, sramH, 8, hexAlpha(C.cyan, 0.5));
    label(ctx, "SRAM (On-chip, Fast!)", fhbmX + hbmW / 2, sramY + 14, hexAlpha(C.cyan, 0.8), 9);

    /* Tiled computation in SRAM */
    const tilePhase = clamp01((flashPhase - 0.3) / 0.5);
    if (tilePhase > 0) {
      const tileSize = 2; /* 2×2 tiles of the N×N matrix */
      const numTiles = Math.ceil(N / tileSize);
      const tilePx = 40;
      const tileGap = 8;
      const tilesW = numTiles * (tilePx + tileGap) - tileGap;
      const tileStartX = fhbmX + (hbmW - tilesW) / 2;
      const tileY = sramY + 30;

      /* Current tile being processed */
      const totalTileCount = numTiles * numTiles;
      const currentTile = Math.floor(tilePhase * totalTileCount);

      for (let tr = 0; tr < numTiles; tr++) {
        for (let tc = 0; tc < numTiles; tc++) {
          const tileIdx = tr * numTiles + tc;
          const tx = tileStartX + tc * (tilePx + tileGap);
          const ty = tileY + tr * (tilePx + tileGap);

          if (tileIdx < currentTile) {
            /* Completed tile */
            fillRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.green, 0.3));
            strokeRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.green, 0.6));
            label(ctx, "✓", tx + tilePx / 2, ty + tilePx / 2, hexAlpha(C.green, 0.8), 12);
          } else if (tileIdx === currentTile) {
            /* Active tile */
            const pulse = 0.5 + 0.5 * Math.sin(tilePhase * 20);
            fillRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.cyan, 0.3 + pulse * 0.2));
            strokeRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.cyan, 1), 2);
            label(ctx, "⚡", tx + tilePx / 2, ty + tilePx / 2, C.cyan, 14);
          } else {
            /* Pending tile */
            fillRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.surface, 0.5));
            strokeRR(ctx, tx, ty, tilePx, tilePx, 4, hexAlpha(C.border, 0.5));
          }
        }
      }

      label(ctx, "Tiles processed in SRAM", fhbmX + hbmW / 2, tileY + numTiles * (tilePx + tileGap) + 8, hexAlpha(C.cyan, tilePhase), 9);
      label(ctx, "O(N) memory — no full matrix!", fhbmX + hbmW / 2, tileY + numTiles * (tilePx + tileGap) + 22, hexAlpha(C.green, tilePhase), 9);
    }

    /* Transfer arrow between HBM and SRAM */
    if (flashPhase > 0.2) {
      const arrA = easeInOut(clamp01((flashPhase - 0.2) / 0.2));
      const arrX = fhbmX + hbmW / 2;
      ctx.beginPath();
      ctx.moveTo(arrX, hbmY + hbmH * 0.45);
      ctx.lineTo(arrX, sramY);
      ctx.strokeStyle = hexAlpha(C.cyan, 0.5 * arrA);
      ctx.lineWidth = 2;
      ctx.stroke();
      /* Arrowhead */
      ctx.beginPath();
      ctx.moveTo(arrX - 5, sramY - 6);
      ctx.lineTo(arrX, sramY);
      ctx.lineTo(arrX + 5, sramY - 6);
      ctx.strokeStyle = hexAlpha(C.cyan, 0.5 * arrA);
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, "Load tiles", arrX + 30, (hbmY + hbmH * 0.45 + sramY) / 2, hexAlpha(C.cyan, arrA * 0.7), 8);
    }

    /* Summary */
    if (t > 0.92) {
      const a = clamp01((t - 0.92) / 0.08);
      label(ctx, "Flash Attention: exact same result, 2-4× faster, O(N) memory — by respecting the memory hierarchy", W / 2, H - 12, hexAlpha(C.green, a), 10);
    }
  }, 8000);


})();
