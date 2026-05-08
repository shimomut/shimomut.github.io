(() => {
  'use strict';

  // ================================================================
  // Model catalog
  //   P        = total parameters (active for MoE)
  //   L        = number of transformer layers
  //   H        = hidden size
  //   Hkv      = KV head dim × num KV heads (≈ H / GQA ratio)
  //   Ptotal   = total parameters (for MoE; == P for dense)
  // Sources: published model cards / configs.
  // ================================================================
  const MODELS = [
    { id: 'llama-3.1-8b',     name: 'Llama 3.1 8B',           P:   8.0e9, Ptotal:   8.0e9, L: 32, H: 4096,  Hkv: 1024, moe: false },
    { id: 'llama-3.1-70b',    name: 'Llama 3.1 70B',          P:  70.0e9, Ptotal:  70.0e9, L: 80, H: 8192,  Hkv: 1024, moe: false },
    { id: 'llama-3.1-405b',   name: 'Llama 3.1 405B',         P: 405.0e9, Ptotal: 405.0e9, L: 126,H: 16384, Hkv: 1024, moe: false },
    { id: 'qwen-2.5-7b',      name: 'Qwen 2.5 7B',            P:   7.6e9, Ptotal:   7.6e9, L: 28, H: 3584,  Hkv: 512,  moe: false },
    { id: 'qwen-2.5-72b',     name: 'Qwen 2.5 72B',           P:  72.0e9, Ptotal:  72.0e9, L: 80, H: 8192,  Hkv: 1024, moe: false },
    { id: 'mistral-7b',       name: 'Mistral 7B',             P:   7.3e9, Ptotal:   7.3e9, L: 32, H: 4096,  Hkv: 1024, moe: false },
    { id: 'mixtral-8x7b',     name: 'Mixtral 8×7B (MoE, 2/8)',P:  13.0e9, Ptotal:  47.0e9, L: 32, H: 4096,  Hkv: 1024, moe: true  },
    { id: 'mixtral-8x22b',    name: 'Mixtral 8×22B (MoE, 2/8)',P: 39.0e9, Ptotal: 141.0e9, L: 56, H: 6144,  Hkv: 1024, moe: true  },
    { id: 'gpt-oss-20b',      name: 'GPT-OSS 20B',            P:  20.0e9, Ptotal:  20.0e9, L: 48, H: 6144,  Hkv: 1024, moe: false },
    { id: 'deepseek-v3',      name: 'DeepSeek-V3 (MoE, 37B/671B)', P: 37.0e9, Ptotal: 671.0e9, L: 61, H: 7168, Hkv: 1024, moe: true },
    { id: 'gemma-2-9b',       name: 'Gemma 2 9B',             P:   9.2e9, Ptotal:   9.2e9, L: 42, H: 3584,  Hkv: 512,  moe: false },
    { id: 'gemma-2-27b',      name: 'Gemma 2 27B',            P:  27.0e9, Ptotal:  27.0e9, L: 46, H: 4608,  Hkv: 1024, moe: false },
  ];

  // ================================================================
  // GPU catalog
  //   fp16Tflops  = dense BF16/FP16 tensor-core TFLOPS
  //   fp8Tflops   = dense FP8 TFLOPS (NA -> same as fp16 × 2 fallback)
  //   int4Tflops  = dense INT4 TFLOPS (when available; else 2× fp8)
  //   hbmGBs      = HBM bandwidth (GB/s)
  //   hbmGB       = HBM capacity (GB)
  // Sources: NVIDIA datasheets, AMD MI300 docs, AWS Trainium docs.
  // ================================================================
  const GPUS = [
    { id: 'h100-sxm',   name: 'NVIDIA H100 SXM5 (80 GB)',  fp16Tflops: 990,  fp8Tflops: 1979, int4Tflops: 3958, hbmGBs: 3350, hbmGB: 80  },
    { id: 'h100-pcie',  name: 'NVIDIA H100 PCIe (80 GB)',  fp16Tflops: 750,  fp8Tflops: 1500, int4Tflops: 3000, hbmGBs: 2000, hbmGB: 80  },
    { id: 'h200',       name: 'NVIDIA H200 SXM (141 GB)',  fp16Tflops: 990,  fp8Tflops: 1979, int4Tflops: 3958, hbmGBs: 4800, hbmGB: 141 },
    { id: 'b200',       name: 'NVIDIA B200 (192 GB)',      fp16Tflops: 2250, fp8Tflops: 4500, int4Tflops: 9000, hbmGBs: 8000, hbmGB: 192 },
    { id: 'gb200',      name: 'NVIDIA GB200 (192 GB, per-GPU)', fp16Tflops: 2500, fp8Tflops: 5000, int4Tflops: 10000, hbmGBs: 8000, hbmGB: 192 },
    { id: 'a100-80',    name: 'NVIDIA A100 (80 GB)',       fp16Tflops: 312,  fp8Tflops: 624,  int4Tflops: 1248, hbmGBs: 2000, hbmGB: 80  },
    { id: 'a100-40',    name: 'NVIDIA A100 (40 GB)',       fp16Tflops: 312,  fp8Tflops: 624,  int4Tflops: 1248, hbmGBs: 1555, hbmGB: 40  },
    { id: 'l40s',       name: 'NVIDIA L40S (48 GB)',       fp16Tflops: 362,  fp8Tflops: 733,  int4Tflops: 1466, hbmGBs: 864,  hbmGB: 48  },
    { id: 'mi300x',     name: 'AMD Instinct MI300X (192 GB)', fp16Tflops: 1307, fp8Tflops: 2614, int4Tflops: 2614, hbmGBs: 5300, hbmGB: 192 },
    { id: 'trn2',       name: 'AWS Trainium2 (96 GB)',     fp16Tflops: 667,  fp8Tflops: 1300, int4Tflops: 2600, hbmGBs: 2900, hbmGB: 96  },
    { id: 'custom',     name: 'Custom…',                   fp16Tflops: 990,  fp8Tflops: 1979, int4Tflops: 3958, hbmGBs: 3350, hbmGB: 80  },
  ];

  // Live-editable spec used when the "Custom" GPU is selected.
  const CUSTOM_GPU = {
    id: 'custom', name: 'Custom…',
    fp16Tflops: 990, fp8Tflops: 1979, int4Tflops: 3958,
    hbmGBs: 3350, hbmGB: 80,
  };

  // ================================================================
  // State
  // ================================================================
  const state = {
    modelId: 'llama-3.1-70b',
    gpuId:   'h100-sxm',
    bytesPerWeight: 1,    // FP8
    numGpu: 8,
    gpuPerNode: 8,
    nvlinkGBs: 900,
    ibGBs: 50,
    batch: 16,
    promptLen: 2048,
    outputLen: 256,
    mfu: 0.45,
    mbu: 0.80,
  };

  // ================================================================
  // DOM helpers
  // ================================================================
  const $ = (id) => document.getElementById(id);
  const els = {};
  [
    'model','precision','gpu','numGpu','gpuPerNode','nvlink','ib',
    'batch','prompt','output','mfu','mbu',
    'valNumGpu','valGpuPerNode','valNvlink','valIb','valBatch','valPrompt','valOutput','valMfu','valMbu',
    'modelInfo','gpuInfo','numGpuInfo',
    'customGpuPanel','cFp16','cFp8','cInt4','cBw','cCap',
    'valCFp16','valCFp8','valCInt4','valCBw','valCCap',
    'mTTFT','mTPOT','mThroughput','mE2E','mMem','mMemFit','mBottleneck','mBottleneckDetail',
    'decodeBreakdown','prefillBreakdown','roofline',
    'btnPreset1','btnPreset2','btnPreset3',
  ].forEach(k => els[k] = $(k));

  // ================================================================
  // Populate model and GPU dropdowns
  // ================================================================
  function populateDropdowns() {
    for (const m of MODELS) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      els.model.appendChild(opt);
    }
    for (const g of GPUS) {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      els.gpu.appendChild(opt);
    }
    els.model.value = state.modelId;
    els.gpu.value   = state.gpuId;
  }

  function updateCustomPanelVisibility() {
    if (state.gpuId === 'custom') {
      els.customGpuPanel.hidden = false;
    } else {
      els.customGpuPanel.hidden = true;
    }
  }

  function getModel() { return MODELS.find(m => m.id === state.modelId); }
  function getGpu()   {
    if (state.gpuId === 'custom') return CUSTOM_GPU;
    return GPUS.find(g => g.id === state.gpuId);
  }

  // Peak FLOPS for the current GPU at the chosen precision.
  function peakFlops(gpu, b) {
    if (b >= 2)   return gpu.fp16Tflops * 1e12;
    if (b >= 1)   return gpu.fp8Tflops  * 1e12;
    return gpu.int4Tflops * 1e12;
  }

  // ================================================================
  // Core estimator
  // ================================================================
  function estimate() {
    const m = getModel();
    const g = getGpu();

    const N = state.numGpu;                          // TP degree
    const b = state.bytesPerWeight;                  // bytes per weight (post-quant)
    const B = state.batch;
    const S = state.promptLen;
    const O = state.outputLen;
    const H = m.H;
    const Hkv = m.Hkv;
    const L  = m.L;
    const P  = m.P;                                  // active params
    const Ptotal = m.Ptotal;                         // for memory footprint

    // Effective throughput per GPU (accounting for efficiency)
    const effFlops = peakFlops(g, b) * state.mfu;
    const effHbmBs = g.hbmGBs * 1e9 * state.mbu;

    // --- Collective bandwidth (ring all-reduce across N GPUs) ---
    // If N <= gpuPerNode, ring uses the fast intra-node link.
    // Otherwise the slowest hop in the ring is the inter-node link.
    const nodes = Math.ceil(N / state.gpuPerNode);
    const crossesNodes = nodes > 1;
    const ringBW_Bs = (crossesNodes ? state.ibGBs : state.nvlinkGBs) * 1e9;
    const arFactor  = N > 1 ? (2 * (N - 1) / N) : 0;  // ring all-reduce factor

    // --- Weight bytes (active weights, sharded across TP group) ---
    const weightBytesPerGpu = (P * b) / N;
    // Total model footprint per GPU: active sharded weights + inactive experts (MoE)
    // For MoE, all experts must reside in memory even if only some are active per token.
    const fullWeightsPerGpu = (Ptotal * b) / N;

    // --- KV cache bytes (FP16 KV), sharded by TP (K/V head dim sharded) ---
    // Per-token KV: 2 (K,V) × L × Hkv × 2 bytes  ≈ 4 · L · Hkv bytes/token (full replica)
    // Under TP, KV heads are split across N → divide by N.
    function kvBytesPerGpu(seq) {
      return (2 * L * Hkv * 2 * seq * B) / N;
    }

    // ===== PREFILL =====
    // Linear FLOPs: 2 · P · B · S (whole model over all tokens).
    // Attention FLOPs: 4 · L · B · S² · H (quadratic in S, dominates for long prompts).
    // Per GPU: divide by N (TP).
    const prefillLinearFlops = (2 * P * B * S) / N;
    const prefillAttnFlops   = (4 * L * B * S * S * H) / N;
    const prefillFlops       = prefillLinearFlops + prefillAttnFlops;
    const prefillComputeTime = prefillFlops / effFlops;
    // HBM: weights read once (amortized over all B·S tokens).
    const prefillHbmBytes    = weightBytesPerGpu; // read each weight once per prefill
    const prefillHbmTime     = prefillHbmBytes / effHbmBs;
    // All-reduce: 2 per layer (attn out + MLP out), each on [B,S,H] FP16.
    const prefillArBytes     = L * 2 * (B * S * H * 2);
    const prefillArTime      = (arFactor * prefillArBytes) / ringBW_Bs;
    // Roofline-style: per layer time = max(compute, hbm), summed separately.
    // Practically, for long prompts compute dominates heavily.
    const prefillTime        = Math.max(prefillComputeTime, prefillHbmTime) + prefillArTime;

    // ===== DECODE (per generated token) =====
    // Average context length during generation ≈ S + O/2 (simple approximation).
    const avgCtx = S + O / 2;

    // Linear FLOPs: 2 · P · B (only 1 token forward).
    // Attention FLOPs: 4 · L · B · avgCtx · H (attends to full past).
    const decLinearFlops = (2 * P * B) / N;
    const decAttnFlops   = (4 * L * B * avgCtx * H) / N;
    const decFlops       = decLinearFlops + decAttnFlops;
    const decComputeTime = decFlops / effFlops;

    // HBM: weights every token + KV read for attention.
    const decWeightBytes = weightBytesPerGpu;
    const decKvBytes     = kvBytesPerGpu(avgCtx);
    const decHbmBytes    = decWeightBytes + decKvBytes;
    const decHbmTime     = decHbmBytes / effHbmBs;

    // All-reduce per layer on [B, H] FP16. Small — cheap per token.
    const decArBytes     = L * 2 * (B * H * 2);
    const decArTime      = (arFactor * decArBytes) / ringBW_Bs;

    // Per-step time: max(compute, hbm) + collectives.
    const decStepTime    = Math.max(decComputeTime, decHbmTime) + decArTime;

    // ===== Bottleneck classification (decode) =====
    const terms = {
      weights: decWeightBytes / effHbmBs,
      kv:      decKvBytes    / effHbmBs,
      compute: decComputeTime,
      comm:    decArTime,
    };
    let bottleneck = 'weights';
    let bMax = terms.weights;
    for (const k of Object.keys(terms)) {
      if (terms[k] > bMax) { bMax = terms[k]; bottleneck = k; }
    }

    // ===== TTFT / throughput / e2e =====
    const ttft        = prefillTime;
    const tpot        = decStepTime;                       // inter-token latency
    const perReqTPS   = 1 / tpot;
    const aggTPS      = B * perReqTPS;                     // total tokens/sec across batch
    const e2e         = ttft + (O - 1) * tpot;

    // ===== Memory footprint =====
    // Active weights + inactive experts sharded across N + KV cache (for all requests).
    const kvFullCtx   = kvBytesPerGpu(S + O);
    const memUsed     = fullWeightsPerGpu + kvFullCtx;
    const memFit      = memUsed / (g.hbmGB * 1e9);

    return {
      prefill: {
        time: prefillTime,
        compute: prefillComputeTime,
        hbm: prefillHbmTime,
        ar: prefillArTime,
        flops: prefillFlops,
        attnFlops: prefillAttnFlops,
        linearFlops: prefillLinearFlops,
      },
      decode: {
        step: decStepTime,
        compute: decComputeTime,
        hbm: decHbmTime,
        weightHbm: terms.weights,
        kvHbm: terms.kv,
        ar: decArTime,
        flops: decFlops,
        attnFlops: decAttnFlops,
        linearFlops: decLinearFlops,
        bytes: decHbmBytes,
        weightBytes: decWeightBytes,
        kvBytes: decKvBytes,
      },
      ttft, tpot, perReqTPS, aggTPS, e2e,
      memUsed, memFit,
      bottleneck, crossesNodes, nodes, ringBW_Bs,
    };
  }

  // ================================================================
  // Formatters
  // ================================================================
  function fmtTime(s) {
    if (s >= 1)       return s.toFixed(2) + ' s';
    if (s >= 1e-3)    return (s * 1e3).toFixed(1) + ' ms';
    if (s >= 1e-6)    return (s * 1e6).toFixed(0) + ' µs';
    return (s * 1e9).toFixed(0) + ' ns';
  }
  function fmtBytes(b) {
    if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB';
    if (b >= 1e9)  return (b / 1e9).toFixed(2)  + ' GB';
    if (b >= 1e6)  return (b / 1e6).toFixed(1)  + ' MB';
    if (b >= 1e3)  return (b / 1e3).toFixed(1)  + ' KB';
    return b.toFixed(0) + ' B';
  }
  function fmtTps(tps) {
    if (tps >= 1000) return (tps / 1000).toFixed(2) + ' k tok/s';
    return tps.toFixed(1) + ' tok/s';
  }
  function fmtInt(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + ' T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + ' G';
    if (n >= 1e6)  return (n / 1e6).toFixed(1)  + ' M';
    return n.toFixed(0);
  }

  // ================================================================
  // Render breakdown bars
  // ================================================================
  function renderBars(container, rows) {
    const total = rows.reduce((a, r) => a + Math.max(0, r.value), 0);
    container.innerHTML = '';
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const pct = total > 0 ? (r.value / total) * 100 : 0;

      const label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = r.label;

      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill ' + r.cls;
      fill.style.width = pct.toFixed(1) + '%';
      fill.textContent = pct >= 6 ? pct.toFixed(0) + '%' : '';
      track.appendChild(fill);

      const val = document.createElement('div');
      val.className = 'bar-value';
      val.textContent = fmtTime(r.value);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(val);
      container.appendChild(row);
    }
  }

  // ================================================================
  // Render top metrics and sub-info
  // ================================================================
  function renderResults() {
    const r = estimate();
    const g = getGpu();
    const m = getModel();

    // Sub-infos
    els.modelInfo.textContent = `${m.L} layers · H=${m.H} · Hkv=${m.Hkv}` +
      (m.moe ? ` · MoE, ${fmtInt(m.Ptotal)} total / ${fmtInt(m.P)} active` : ` · ${fmtInt(m.P)} params`);
    els.gpuInfo.textContent = `${g.fp16Tflops} TFLOPS FP16 · ${g.hbmGBs} GB/s HBM · ${g.hbmGB} GB`;
    els.numGpuInfo.textContent = r.crossesNodes
      ? `${r.nodes} nodes (collective uses inter-node link)`
      : `1 node (collective uses intra-node link)`;

    // Top metrics
    els.mTTFT.textContent        = fmtTime(r.ttft);
    els.mTPOT.textContent        = fmtTime(r.tpot);
    els.mThroughput.textContent  = fmtTps(r.aggTPS);
    els.mE2E.textContent         = fmtTime(r.e2e);
    els.mMem.textContent         = fmtBytes(r.memUsed);
    els.mMemFit.textContent      = `of ${g.hbmGB} GB per GPU (${(r.memFit * 100).toFixed(0)}%)`;

    const memMetric = els.mMem.closest('.metric');
    memMetric.classList.remove('warn', 'bad', 'good');
    if (r.memFit > 1)         memMetric.classList.add('bad');
    else if (r.memFit > 0.85) memMetric.classList.add('warn');
    else                      memMetric.classList.add('good');

    // Bottleneck labels
    const bnameMap = {
      weights: 'HBM bandwidth (weights)',
      kv:      'HBM bandwidth (KV cache)',
      compute: 'Compute',
      comm:    'Collective (network)',
    };
    els.mBottleneck.textContent = bnameMap[r.bottleneck];
    const bnColor = els.mBottleneck.closest('.metric');
    bnColor.classList.remove('warn', 'bad', 'good');
    if (r.bottleneck === 'comm')      bnColor.classList.add('bad');
    else if (r.bottleneck === 'compute') bnColor.classList.add('good');
    else                              bnColor.classList.add('warn');

    // Bottleneck detail
    let detail = '';
    if (r.bottleneck === 'weights') {
      detail = `Each token re-reads ${fmtBytes(r.decode.weightBytes)} of weights through HBM.`;
    } else if (r.bottleneck === 'kv') {
      detail = `KV cache reads (${fmtBytes(r.decode.kvBytes)}/token) exceed weight reads. Context is too long.`;
    } else if (r.bottleneck === 'compute') {
      detail = `Batch is large enough that arithmetic intensity exceeds the ridge point.`;
    } else {
      detail = `All-reduce across ${state.numGpu} GPUs on ${r.crossesNodes ? 'inter-node' : 'intra-node'} link dominates.`;
    }
    els.mBottleneckDetail.textContent = detail;

    // Decode breakdown — show the max(·) terms side by side, then add comm.
    // We separately visualize the components that would have been the bottleneck.
    renderBars(els.decodeBreakdown, [
      { label: 'Weight HBM read', value: r.decode.weightHbm, cls: 'memory' },
      { label: 'KV HBM read',     value: r.decode.kvHbm,     cls: 'kv' },
      { label: 'Compute (linear+attn)', value: r.decode.compute, cls: 'compute' },
      { label: 'All-reduce',      value: r.decode.ar,        cls: 'comm' },
    ]);

    renderBars(els.prefillBreakdown, [
      { label: 'Compute (linear)', value: r.prefill.linearFlops / (peakFlops(g, state.bytesPerWeight) * state.mfu), cls: 'compute' },
      { label: 'Compute (attn)',   value: r.prefill.attnFlops   / (peakFlops(g, state.bytesPerWeight) * state.mfu), cls: 'attn' },
      { label: 'Weight HBM read',  value: r.prefill.hbm,                                                             cls: 'memory' },
      { label: 'All-reduce',       value: r.prefill.ar,                                                               cls: 'comm' },
    ]);

    renderRoofline(r);
  }

  // ================================================================
  // Roofline chart (Canvas)
  // ================================================================
  function renderRoofline(r) {
    const cv = els.roofline;
    const g = getGpu();
    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth || 820;
    const cssH = 440;
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.height = cssH + 'px';
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cssW, H = cssH;
    ctx.clearRect(0, 0, W, H);

    const ML = 72, MR = 24, MT = 30, MB = 54;
    const plotW = W - ML - MR;
    const plotH = H - MT - MB;

    const xMin = Math.log10(0.2);
    const xMax = Math.log10(5000);
    const yMin = Math.log10(1);
    const yMax = Math.log10(10000);

    const xToPx = (lx) => ML + ((lx - xMin) / (xMax - xMin)) * plotW;
    const yToPx = (ly) => MT + plotH - ((ly - yMin) / (yMax - yMin)) * plotH;

    // Grid
    ctx.strokeStyle = '#222a3a';
    ctx.lineWidth = 1;
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#8b949e';
    const xTicks = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    for (const t of xTicks) {
      const lt = Math.log10(t);
      if (lt < xMin || lt > xMax) continue;
      const x = xToPx(lt);
      ctx.beginPath(); ctx.moveTo(x, MT); ctx.lineTo(x, MT + plotH); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(t.toString(), x, MT + plotH + 14);
    }
    const yTicks = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000];
    for (const t of yTicks) {
      const lt = Math.log10(t);
      if (lt < yMin || lt > yMax) continue;
      const y = yToPx(lt);
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(ML + plotW, y); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(t.toString(), ML - 6, y + 3);
    }

    // Labels
    ctx.fillStyle = '#e6edf3';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arithmetic Intensity (FLOP/Byte)', ML + plotW / 2, H - 16);
    ctx.save();
    ctx.translate(18, MT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Attainable Performance (TFLOPS per GPU)', 0, 0);
    ctx.restore();

    // Roofline
    const peakT = peakFlops(g, state.bytesPerWeight) / 1e12 * state.mfu;   // effective peak TFLOPS
    const BW_TBs = g.hbmGBs / 1000 * state.mbu;
    const ridgeAI = peakT / BW_TBs;
    const logPeak = Math.log10(peakT);
    const logRidge = Math.log10(ridgeAI);

    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const p1x = xToPx(xMin);
    const p1y = yToPx(Math.log10(Math.pow(10, xMin) * BW_TBs));
    const p2x = xToPx(logRidge);
    const p2y = yToPx(logPeak);
    ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
    ctx.fillStyle = '#f85149';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Memory bound: ${(BW_TBs * 1000).toFixed(0)} GB/s × MBU`,
                 xToPx(xMin) + 6, yToPx(xMin + Math.log10(BW_TBs)) - 6);

    ctx.strokeStyle = '#3fb950';
    ctx.beginPath();
    ctx.moveTo(p2x, p2y); ctx.lineTo(xToPx(xMax), p2y); ctx.stroke();
    ctx.fillStyle = '#3fb950';
    ctx.fillText(`Compute bound: ${peakT.toFixed(0)} TFLOPS × MFU`, p2x + 8, p2y - 6);

    ctx.fillStyle = '#d29922';
    ctx.beginPath();
    ctx.arc(p2x, p2y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.fillText(`ridge ≈ ${ridgeAI.toFixed(0)} FLOP/B`, p2x + 8, p2y + 14);

    // Operating points
    // Prefill: AI = prefill FLOPs / prefill bytes
    const prefillBytes = r.prefill.hbm * (g.hbmGBs * 1e9 * state.mbu);
    const prefillAI = r.prefill.flops / Math.max(1, prefillBytes);
    const prefillPerf = Math.min(peakT, prefillAI * BW_TBs);
    drawPoint(ctx, xToPx(Math.log10(clamp(prefillAI, Math.pow(10, xMin), Math.pow(10, xMax)))),
              yToPx(Math.log10(clamp(prefillPerf, Math.pow(10, yMin), Math.pow(10, yMax)))),
              '#3fb950', `Prefill (B=${state.batch}, S=${state.promptLen})`);

    // Decode: AI = decode FLOPs / decode bytes
    const decodeAI = r.decode.flops / Math.max(1, r.decode.bytes);
    const decodePerf = Math.min(peakT, decodeAI * BW_TBs);
    drawPoint(ctx, xToPx(Math.log10(clamp(decodeAI, Math.pow(10, xMin), Math.pow(10, xMax)))),
              yToPx(Math.log10(clamp(decodePerf, Math.pow(10, yMin), Math.pow(10, yMax)))),
              '#f85149', `Decode (B=${state.batch})`);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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
  // Controls wiring
  // ================================================================
  function bindControls() {
    els.model.addEventListener('change', () => { state.modelId = els.model.value; renderResults(); });
    els.gpu.addEventListener('change',   () => {
      state.gpuId = els.gpu.value;
      updateCustomPanelVisibility();
      renderResults();
    });
    els.precision.addEventListener('change', () => {
      state.bytesPerWeight = parseFloat(els.precision.value);
      renderResults();
    });

    const wire = (inp, display, key, parser, suffix = '') => {
      inp.addEventListener('input', () => {
        state[key] = parser(inp.value);
        if (display) display.textContent = state[key] + suffix;
        renderResults();
      });
    };
    wire(els.numGpu,    els.valNumGpu,    'numGpu',    v => parseInt(v, 10));
    wire(els.gpuPerNode,els.valGpuPerNode,'gpuPerNode',v => parseInt(v, 10));
    wire(els.nvlink,    els.valNvlink,    'nvlinkGBs', v => parseInt(v, 10));
    wire(els.ib,        els.valIb,        'ibGBs',     v => parseInt(v, 10));
    wire(els.batch,     els.valBatch,     'batch',     v => parseInt(v, 10));
    wire(els.prompt,    els.valPrompt,    'promptLen', v => parseInt(v, 10));
    wire(els.output,    els.valOutput,    'outputLen', v => parseInt(v, 10));

    els.mfu.addEventListener('input', () => {
      state.mfu = parseInt(els.mfu.value, 10) / 100;
      els.valMfu.textContent = (state.mfu * 100).toFixed(0) + '%';
      renderResults();
    });
    els.mbu.addEventListener('input', () => {
      state.mbu = parseInt(els.mbu.value, 10) / 100;
      els.valMbu.textContent = (state.mbu * 100).toFixed(0) + '%';
      renderResults();
    });

    // Custom GPU inputs
    const wireCustom = (inp, display, key) => {
      inp.addEventListener('input', () => {
        const v = parseFloat(inp.value);
        if (!isNaN(v) && v > 0) {
          CUSTOM_GPU[key] = v;
          if (display) display.textContent = v;
          if (state.gpuId === 'custom') renderResults();
        }
      });
    };
    wireCustom(els.cFp16, els.valCFp16, 'fp16Tflops');
    wireCustom(els.cFp8,  els.valCFp8,  'fp8Tflops');
    wireCustom(els.cInt4, els.valCInt4, 'int4Tflops');
    wireCustom(els.cBw,   els.valCBw,   'hbmGBs');
    wireCustom(els.cCap,  els.valCCap,  'hbmGB');

    els.btnPreset1.addEventListener('click', () => applyPreset({
      modelId: 'llama-3.1-70b', gpuId: 'h100-sxm', bytesPerWeight: 1,
      numGpu: 8, gpuPerNode: 8, batch: 16, promptLen: 2048, outputLen: 256,
    }));
    els.btnPreset2.addEventListener('click', () => applyPreset({
      modelId: 'llama-3.1-405b', gpuId: 'h100-sxm', bytesPerWeight: 1,
      numGpu: 64, gpuPerNode: 8, batch: 32, promptLen: 4096, outputLen: 512,
    }));
    els.btnPreset3.addEventListener('click', () => applyPreset({
      modelId: 'llama-3.1-8b', gpuId: 'a100-80', bytesPerWeight: 2,
      numGpu: 1, gpuPerNode: 1, batch: 8, promptLen: 1024, outputLen: 128,
    }));

    window.addEventListener('resize', renderResults);
  }

  function applyPreset(p) {
    Object.assign(state, p);
    els.model.value      = state.modelId;
    els.gpu.value        = state.gpuId;
    els.precision.value  = state.bytesPerWeight.toString();
    els.numGpu.value     = state.numGpu;
    els.gpuPerNode.value = state.gpuPerNode;
    els.batch.value      = state.batch;
    els.prompt.value     = state.promptLen;
    els.output.value     = state.outputLen;
    els.valNumGpu.textContent     = state.numGpu;
    els.valGpuPerNode.textContent = state.gpuPerNode;
    els.valBatch.textContent      = state.batch;
    els.valPrompt.textContent     = state.promptLen;
    els.valOutput.textContent     = state.outputLen;
    updateCustomPanelVisibility();
    renderResults();
  }

  // ================================================================
  // Init
  // ================================================================
  function init() {
    populateDropdowns();
    // Sync displayed slider values once.
    els.valNumGpu.textContent     = state.numGpu;
    els.valGpuPerNode.textContent = state.gpuPerNode;
    els.valNvlink.textContent     = state.nvlinkGBs;
    els.valIb.textContent         = state.ibGBs;
    els.valBatch.textContent      = state.batch;
    els.valPrompt.textContent     = state.promptLen;
    els.valOutput.textContent     = state.outputLen;
    els.valMfu.textContent        = (state.mfu * 100).toFixed(0) + '%';
    els.valMbu.textContent        = (state.mbu * 100).toFixed(0) + '%';
    updateCustomPanelVisibility();
    bindControls();
    renderResults();
  }

  init();
})();
