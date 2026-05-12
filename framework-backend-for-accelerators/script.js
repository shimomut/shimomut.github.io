const accelerators = ['NVIDIA GPU', 'Google TPU', 'AWS Trainium', 'Intel Gaudi', 'AMD MI300'];

const stackLayers = {
  inference: [
    {
      layer: 'User API',
      cells: [
        { accel: 'NVIDIA GPU', label: 'PyTorch / HF Transformers', detail: 'model.generate(), pipeline()', badge: 'shared' },
        { accel: 'Google TPU', label: 'PyTorch / JAX', detail: 'Same API surface', badge: 'shared' },
        { accel: 'AWS Trainium', label: 'PyTorch / HF Transformers', detail: 'transformers-neuronx', badge: 'shared' },
        { accel: 'Intel Gaudi', label: 'PyTorch / HF Optimum', detail: 'optimum-habana', badge: 'shared' },
        { accel: 'AMD MI300', label: 'PyTorch / HF Transformers', detail: 'Same as GPU (ROCm)', badge: 'shared' },
      ]
    },
    {
      layer: 'Serving Framework',
      cells: [
        { accel: 'NVIDIA GPU', label: 'vLLM / TRT-LLM / SGLang', detail: 'PagedAttention, continuous batching', badge: 'custom' },
        { accel: 'Google TPU', label: 'JetStream / vLLM (TPU)', detail: 'TPU-optimized serving', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'vLLM (Neuron) / NxD Inference', detail: 'Neuron-adapted serving', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'vLLM (Gaudi)', detail: 'Gaudi-adapted vLLM fork', badge: 'custom' },
        { accel: 'AMD MI300', label: 'vLLM (ROCm)', detail: 'ROCm backend for vLLM', badge: 'partial' },
      ]
    },
    {
      layer: 'Graph Capture',
      cells: [
        { accel: 'NVIDIA GPU', label: 'TorchDynamo / torch.fx', detail: 'Python bytecode → FX Graph', badge: 'shared' },
        { accel: 'Google TPU', label: 'TorchDynamo / JAX tracing', detail: 'jit.trace or jax.jit', badge: 'shared' },
        { accel: 'AWS Trainium', label: 'TorchDynamo / torch.fx', detail: 'Same graph capture', badge: 'shared' },
        { accel: 'Intel Gaudi', label: 'TorchDynamo / torch.fx', detail: 'Lazy mode or torch.compile', badge: 'shared' },
        { accel: 'AMD MI300', label: 'TorchDynamo / torch.fx', detail: 'Same as CUDA path', badge: 'shared' },
      ]
    },
    {
      layer: 'Compiler Backend',
      cells: [
        { accel: 'NVIDIA GPU', label: 'TorchInductor → Triton', detail: 'Generates Triton GPU kernels', badge: 'custom' },
        { accel: 'Google TPU', label: 'XLA (torch_xla)', detail: 'HLO → TPU instructions', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Neuron Compiler (torch_neuronx)', detail: 'NEFF binary generation', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Gaudi Graph Compiler', detail: 'TPC kernel generation', badge: 'custom' },
        { accel: 'AMD MI300', label: 'TorchInductor → Triton (ROCm)', detail: 'Triton with HIP backend', badge: 'partial' },
      ]
    },
    {
      layer: 'Kernel Libraries',
      cells: [
        { accel: 'NVIDIA GPU', label: 'cuDNN / cuBLAS / CUTLASS', detail: 'Flash Attention, fused ops', badge: 'custom' },
        { accel: 'Google TPU', label: 'XLA Ops / Pallas', detail: 'MXU-optimized primitives', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'NKI (Neuron Kernel Interface)', detail: 'Custom NeuronCore kernels', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'TPC Kernels / Synapse AI', detail: 'Gaudi-optimized ops', badge: 'custom' },
        { accel: 'AMD MI300', label: 'rocBLAS / MIOpen / hipBLASLt', detail: 'Flash Attention (CK)', badge: 'custom' },
      ]
    },
    {
      layer: 'Runtime',
      cells: [
        { accel: 'NVIDIA GPU', label: 'CUDA Runtime', detail: 'CUDA Graphs, streams, memory', badge: 'custom' },
        { accel: 'Google TPU', label: 'XRT / PJRT', detail: 'TPU runtime + buffer mgmt', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Neuron Runtime', detail: 'NeuronCore scheduling, DMA', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Synapse Runtime', detail: 'Gaudi memory, execution', badge: 'custom' },
        { accel: 'AMD MI300', label: 'ROCm / HIP Runtime', detail: 'HIP streams, memory mgmt', badge: 'custom' },
      ]
    },
    {
      layer: 'Hardware',
      cells: [
        { accel: 'NVIDIA GPU', label: 'H100 / B200 Tensor Cores', detail: 'SM, HBM3, NVLink', badge: 'custom' },
        { accel: 'Google TPU', label: 'TPU v5e / v6e MXU', detail: 'Systolic array, HBM, ICI', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Trainium2 NeuronCores', detail: 'NeuronCore-v3, HBM, NeuronLink', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Gaudi 3 TPC + MME', detail: 'Matrix engine, HBM, RoCE', badge: 'custom' },
        { accel: 'AMD MI300', label: 'MI300X CDNA 3', detail: 'CUs, HBM3, IF links', badge: 'custom' },
      ]
    },
  ],
  training: [
    {
      layer: 'User API',
      cells: [
        { accel: 'NVIDIA GPU', label: 'PyTorch / HF Trainer', detail: 'model.train(), loss.backward()', badge: 'shared' },
        { accel: 'Google TPU', label: 'JAX / PyTorch (XLA)', detail: 'jax.grad, pmap/pjit', badge: 'shared' },
        { accel: 'AWS Trainium', label: 'PyTorch / NxD Training', detail: 'Neuron Distributed Training', badge: 'shared' },
        { accel: 'Intel Gaudi', label: 'PyTorch / HF Trainer', detail: 'optimum-habana Trainer', badge: 'shared' },
        { accel: 'AMD MI300', label: 'PyTorch / HF Trainer', detail: 'Same as GPU (ROCm)', badge: 'shared' },
      ]
    },
    {
      layer: 'Distributed Strategy',
      cells: [
        { accel: 'NVIDIA GPU', label: 'FSDP / Megatron / DeepSpeed', detail: 'TP + PP + DP, ZeRO', badge: 'partial' },
        { accel: 'Google TPU', label: 'XLA SPMD / GSPMD', detail: 'Automatic sharding over ICI', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'NxD (Neuron Distributed)', detail: 'TP + PP + DP over NeuronLink', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'FSDP / DeepSpeed (Gaudi)', detail: 'Adapted for Gaudi comms', badge: 'partial' },
        { accel: 'AMD MI300', label: 'FSDP / DeepSpeed (ROCm)', detail: 'Same as GPU path', badge: 'partial' },
      ]
    },
    {
      layer: 'Graph Capture',
      cells: [
        { accel: 'NVIDIA GPU', label: 'TorchDynamo / torch.fx', detail: 'torch.compile traces fwd + bwd', badge: 'shared' },
        { accel: 'Google TPU', label: 'XLA Lazy Tensors / JAX jit', detail: 'Ops accumulated lazily, not TorchDynamo', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'XLA Lazy Tensors', detail: 'Eager ops → XLA graph at sync points', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Synapse Lazy Mode', detail: 'Habana lazy tensor accumulation', badge: 'custom' },
        { accel: 'AMD MI300', label: 'TorchDynamo / torch.fx', detail: 'Same as CUDA path', badge: 'shared' },
      ]
    },
    {
      layer: 'Compiler Backend',
      cells: [
        { accel: 'NVIDIA GPU', label: 'TorchInductor → Triton', detail: 'Fused fwd + bwd kernels', badge: 'custom' },
        { accel: 'Google TPU', label: 'XLA Compiler', detail: 'HLO optimization passes', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Neuron Compiler', detail: 'NEFF with gradient support', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Gaudi Graph Compiler', detail: 'Synapse graph + autograd', badge: 'custom' },
        { accel: 'AMD MI300', label: 'TorchInductor → Triton (ROCm)', detail: 'HIP-targeted code gen', badge: 'partial' },
      ]
    },
    {
      layer: 'Autograd & Mixed Precision',
      cells: [
        { accel: 'NVIDIA GPU', label: 'PyTorch Autograd + AMP', detail: 'BF16/FP8, Transformer Engine', badge: 'partial' },
        { accel: 'Google TPU', label: 'JAX grad + jmp', detail: 'Native BF16, FP8 (v6e)', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Autograd + Neuron AMP', detail: 'BF16, FP8 (Trn2), stochastic rounding', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Autograd + Habana MP', detail: 'BF16, FP8 (Gaudi 3)', badge: 'custom' },
        { accel: 'AMD MI300', label: 'PyTorch Autograd + AMP', detail: 'BF16, FP8 (CDNA 3)', badge: 'partial' },
      ]
    },
    {
      layer: 'Collective Communication',
      cells: [
        { accel: 'NVIDIA GPU', label: 'NCCL', detail: 'AllReduce over NVLink/IB', badge: 'custom' },
        { accel: 'Google TPU', label: 'XLA Collectives (ICI)', detail: 'TPU mesh all-reduce', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Neuron CCL', detail: 'Over NeuronLink + EFA', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'HCCL', detail: 'Over Gaudi NIC (RoCE)', badge: 'custom' },
        { accel: 'AMD MI300', label: 'RCCL', detail: 'AllReduce over IF/RoCE', badge: 'custom' },
      ]
    },
    {
      layer: 'Runtime',
      cells: [
        { accel: 'NVIDIA GPU', label: 'CUDA Runtime', detail: 'Streams, memory pools', badge: 'custom' },
        { accel: 'Google TPU', label: 'XRT / PJRT', detail: 'TPU buffer management', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Neuron Runtime', detail: 'NeuronCore exec engine', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Synapse Runtime', detail: 'Gaudi device management', badge: 'custom' },
        { accel: 'AMD MI300', label: 'ROCm / HIP Runtime', detail: 'HIP API + rocm-smi', badge: 'custom' },
      ]
    },
    {
      layer: 'Hardware',
      cells: [
        { accel: 'NVIDIA GPU', label: 'H100 / B200 Tensor Cores', detail: 'SM, HBM3, NVLink', badge: 'custom' },
        { accel: 'Google TPU', label: 'TPU v5p / v6e MXU', detail: 'Systolic array, HBM, ICI', badge: 'custom' },
        { accel: 'AWS Trainium', label: 'Trainium2 NeuronCores', detail: 'NeuronCore-v3, HBM, NeuronLink', badge: 'custom' },
        { accel: 'Intel Gaudi', label: 'Gaudi 3 TPC + MME', detail: 'Matrix engine, HBM', badge: 'custom' },
        { accel: 'AMD MI300', label: 'MI300X CDNA 3', detail: 'CUs, HBM3, IF links', badge: 'custom' },
      ]
    },
  ]
};

const cellExplanations = {
  'TorchInductor → Triton': {
    title: 'TorchInductor (NVIDIA GPU Backend)',
    desc: 'TorchInductor is the default torch.compile backend for NVIDIA GPUs. It takes an FX Graph from TorchDynamo, performs operator fusion and memory planning, then generates Triton kernel code. Triton compiles this Python-like code into optimized PTX/SASS for the specific GPU architecture. This path delivers 20-50% speedup over eager PyTorch execution.',
    url: 'https://pytorch.org/docs/stable/torch.compiler.html'
  },
  'XLA (torch_xla)': {
    title: 'XLA Backend for TPU via torch_xla',
    desc: 'torch_xla intercepts PyTorch operations and lowers them to XLA HLO (High-Level Optimizer) intermediate representation. XLA then applies hardware-specific optimizations — operator fusion, layout assignment for the TPU\'s systolic array (MXU), and memory scheduling for HBM. The same XLA infrastructure that compiles JAX programs also compiles PyTorch models for TPU.',
    url: 'https://github.com/pytorch/xla'
  },
  'Neuron Compiler (torch_neuronx)': {
    title: 'Neuron Compiler for AWS Trainium',
    desc: 'The torch_neuronx package registers a custom backend with torch.compile. When invoked, it traces the FX Graph and passes it to the Neuron Compiler, which performs NeuronCore-specific optimizations: operator fusion for the tensor/vector/scalar engines, scheduling across NeuronCores, DMA planning for HBM access, and NeuronLink communication scheduling. Outputs a NEFF (Neuron Executable File Format) binary.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'Gaudi Graph Compiler': {
    title: 'Synapse AI Graph Compiler for Intel Gaudi',
    desc: 'Intel\'s Synapse AI translates the computation graph into optimized execution plans for Gaudi\'s dual-engine architecture: the Matrix Multiplication Engine (MME) handles GEMMs while the Tensor Processing Cores (TPC) handle element-wise and reduction operations. The compiler manages data movement between the two engines and across HBM banks.',
    url: 'https://docs.habana.ai/'
  },
  'TorchInductor → Triton (ROCm)': {
    title: 'TorchInductor with ROCm/HIP Backend',
    desc: 'AMD leverages the same TorchInductor pipeline as NVIDIA, but Triton targets HIP (AMD\'s CUDA-compatible API) instead of PTX. The Triton compiler generates HIP kernels optimized for CDNA 3 architecture. Most of the TorchInductor optimization passes are shared — only the final code generation differs. This is why AMD MI300 achieves high compatibility with the CUDA software ecosystem.',
    url: 'https://rocm.docs.amd.com/'
  },
  'NCCL': {
    title: 'NVIDIA Collective Communications Library',
    desc: 'NCCL implements multi-GPU collective operations (AllReduce, AllGather, ReduceScatter) optimized for NVIDIA\'s interconnect topology. It auto-detects NVLink/NVSwitch within a node and InfiniBand/EFA across nodes, selecting ring, tree, or hierarchical algorithms accordingly. Critical for gradient synchronization in data parallelism and activation exchange in tensor parallelism.',
    url: 'https://github.com/NVIDIA/nccl'
  },
  'XLA Collectives (ICI)': {
    title: 'XLA SPMD Collectives over TPU ICI',
    desc: 'TPU pods use a dedicated Inter-Chip Interconnect (ICI) with 2D/3D torus topology. XLA\'s SPMD partitioner automatically inserts collective operations based on sharding annotations, and the TPU runtime executes them directly over ICI without software overhead. The tight hardware-software co-design allows near-linear scaling to thousands of chips.',
    url: 'https://cloud.google.com/tpu'
  },
  'Neuron CCL': {
    title: 'Neuron Collective Communication Library',
    desc: 'Neuron CCL provides AllReduce, AllGather, and ReduceScatter operations optimized for Trainium\'s NeuronLink (intra-node, 768 GB/s bidirectional on Trn2) and EFA (inter-node). The Neuron Distributed library uses these primitives to implement tensor parallelism and data parallelism patterns transparently.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'HCCL': {
    title: 'Habana Collective Communications Library',
    desc: 'HCCL is Intel Gaudi\'s equivalent of NCCL. It implements collective operations over Gaudi\'s dedicated RoCE v2 network interfaces (24x 100GbE ports per Gaudi 3). The all-to-all network topology avoids the congestion issues of switched fabrics for common collective patterns.',
    url: 'https://docs.habana.ai/'
  },
  'RCCL': {
    title: 'ROCm Communication Collectives Library',
    desc: 'RCCL is AMD\'s fork/reimplementation of NCCL for ROCm. It provides the same API as NCCL, making it a drop-in replacement for distributed PyTorch code. Optimized for AMD Infinity Fabric links (intra-node) and RoCE networking (inter-node).',
    url: 'https://github.com/ROCm/rccl'
  },
  'vLLM / TRT-LLM / SGLang': {
    title: 'GPU Inference Serving Engines',
    desc: 'vLLM (PagedAttention + continuous batching), TensorRT-LLM (compiled optimized engines), and SGLang (RadixAttention for prefix sharing) are the leading NVIDIA GPU inference engines. They implement LLM-specific optimizations: KV cache management, speculative decoding, and quantized execution that maximize GPU utilization during autoregressive generation.',
    url: 'https://github.com/vllm-project/vllm'
  },
  'JetStream / vLLM (TPU)': {
    title: 'TPU Inference Serving',
    desc: 'JetStream is Google\'s TPU-native inference engine providing continuous batching and optimized attention for TPU MXU. vLLM also has experimental TPU support via torch_xla. Both must handle TPU-specific constraints: static shapes for XLA compilation, TPU memory management, and ICI-based tensor parallelism.',
    url: 'https://github.com/google/JetStream'
  },
  'vLLM (Neuron) / NxD Inference': {
    title: 'Neuron Inference Serving',
    desc: 'NxD Inference (Neuron Distributed Inference) is AWS\'s library for serving LLMs on Trainium/Inferentia. It handles model parallelism across NeuronCores, KV cache management in device HBM, and continuous batching. vLLM has a Neuron backend that delegates compilation and execution to the Neuron SDK while providing the familiar vLLM API.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'vLLM (Gaudi)': {
    title: 'vLLM for Intel Gaudi',
    desc: 'Intel maintains a Gaudi-adapted fork of vLLM that replaces CUDA-specific paths (Flash Attention, CUDA Graphs) with Gaudi equivalents (HPU Graphs, Synapse-optimized attention). The fork aims to stay close to upstream vLLM while leveraging Gaudi\'s architecture.',
    url: 'https://docs.habana.ai/'
  },
  'vLLM (ROCm)': {
    title: 'vLLM for AMD ROCm',
    desc: 'vLLM supports AMD GPUs via ROCm with Triton-based kernels and Composable Kernel (CK) for Flash Attention. Most of vLLM\'s Python logic is shared; the hardware-specific layer is thin thanks to HIP\'s CUDA API compatibility.',
    url: 'https://docs.vllm.ai/'
  },
  'FSDP / Megatron / DeepSpeed': {
    title: 'GPU Distributed Training Frameworks',
    desc: 'NVIDIA GPUs use FSDP (native PyTorch), Megatron-LM (NVIDIA\'s 3D parallelism), or DeepSpeed (Microsoft\'s ZeRO optimizer) for distributed training. These are the most mature distributed training solutions, supporting TP+PP+DP combinations, mixed precision, and gradient checkpointing.',
    url: 'https://pytorch.org/docs/stable/fsdp.html'
  },
  'XLA SPMD / GSPMD': {
    title: 'XLA Automatic Parallelism for TPU',
    desc: 'GSPMD (Generalized SPMD) automatically partitions a computation graph across a TPU pod based on user-provided sharding annotations. Unlike manual TP/PP/DP, GSPMD handles the communication insertion and optimization automatically, making it straightforward to scale to thousands of TPU chips.',
    url: 'https://arxiv.org/abs/2105.04663'
  },
  'NxD (Neuron Distributed)': {
    title: 'Neuron Distributed Training Library',
    desc: 'NxD provides tensor parallelism, pipeline parallelism, and data parallelism implementations optimized for Trainium\'s NeuronLink topology. It wraps PyTorch\'s distributed APIs and handles the Neuron-specific constraints: static compilation graphs, NeuronCore placement, and communication scheduling over the dedicated interconnect.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'NKI (Neuron Kernel Interface)': {
    title: 'Neuron Kernel Interface',
    desc: 'NKI allows writing custom kernels for NeuronCores in a NumPy-like Python DSL. It exposes the NeuronCore\'s tensor/vector/scalar engines and SBUF (on-chip SRAM) directly, enabling hardware-aware optimizations like custom attention patterns, activation functions, or quantized operations that the Neuron Compiler doesn\'t automatically generate.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'XLA Ops / Pallas': {
    title: 'TPU Kernel Libraries',
    desc: 'XLA provides a library of MXU-optimized primitives (matmul, convolution, attention). Pallas is a newer extension that allows writing custom TPU kernels in a JAX-like syntax, giving direct control over the systolic array (MXU) and vector unit — similar to how Triton gives control over GPU SMs.',
    url: 'https://jax.readthedocs.io/en/latest/pallas/'
  },
  'cuDNN / cuBLAS / CUTLASS': {
    title: 'NVIDIA Kernel Libraries',
    desc: 'The foundational compute libraries for NVIDIA GPUs. cuBLAS for matrix multiplication (GEMM), cuDNN for DNN primitives (attention, normalization), and CUTLASS for custom fused kernels. Flash Attention implementations build on CUTLASS templates. These libraries extract maximum performance from Tensor Cores across all NVIDIA architectures.',
    url: 'https://developer.nvidia.com/cudnn'
  },
  'TPC Kernels / Synapse AI': {
    title: 'Gaudi Kernel Libraries',
    desc: 'Intel Gaudi uses Tensor Processing Cores (TPC) for programmable operations and a dedicated Matrix Multiplication Engine (MME) for GEMMs. The Synapse AI SDK includes pre-built optimized kernels and a TPC kernel development kit for custom operations.',
    url: 'https://docs.habana.ai/'
  },
  'rocBLAS / MIOpen / hipBLASLt': {
    title: 'AMD ROCm Kernel Libraries',
    desc: 'rocBLAS provides GEMM operations, MIOpen handles DNN primitives (similar to cuDNN), and hipBLASLt adds lightweight GEMM APIs. AMD\'s Composable Kernel (CK) library enables writing fused kernels, including their Flash Attention implementation for MI300X.',
    url: 'https://rocm.docs.amd.com/'
  },
  'Neuron Runtime': {
    title: 'AWS Neuron Runtime',
    desc: 'Manages execution of compiled NEFF binaries on NeuronCores. Handles device memory allocation, DMA transfers between HBM and SBUF, NeuronCore scheduling, and multi-model multiplexing. Provides profiling hooks for the Neuron Profiler tool.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'CUDA Runtime': {
    title: 'NVIDIA CUDA Runtime',
    desc: 'The foundational execution environment for GPU computing. Manages GPU memory allocation, kernel launch, stream-based concurrency, and device synchronization. CUDA Graphs capture and replay kernel sequences to minimize CPU launch overhead during inference.',
    url: 'https://developer.nvidia.com/cuda-toolkit'
  },
  'XRT / PJRT': {
    title: 'TPU Runtime (XRT/PJRT)',
    desc: 'XRT (XLA Runtime) manages TPU device buffers, compiled HLO execution, and host-device communication. PJRT (Pretty Just-in-time Runtime) is the newer abstraction layer that provides a uniform interface for XLA across TPU, GPU, and CPU backends.',
    url: 'https://github.com/openxla/xla'
  },
  'Synapse Runtime': {
    title: 'Intel Gaudi Synapse Runtime',
    desc: 'Manages execution on Gaudi accelerators including memory allocation on HBM, graph execution scheduling, and device-to-device communication over the integrated NICs.',
    url: 'https://docs.habana.ai/'
  },
  'ROCm / HIP Runtime': {
    title: 'AMD ROCm/HIP Runtime',
    desc: 'HIP (Heterogeneous-Compute Interface for Portability) provides a CUDA-like API for AMD GPUs. Most CUDA code can be automatically translated to HIP using hipify tools. The ROCm stack includes the HIP runtime, compiler (LLVM-based), and device management.',
    url: 'https://rocm.docs.amd.com/'
  },
  'XLA Lazy Tensors / JAX jit': {
    title: 'XLA Lazy Tensor Tracing for Training',
    desc: 'Unlike torch.compile (which uses TorchDynamo to trace ahead-of-time), XLA lazy tensors record operations as they execute eagerly in Python. The accumulated operation graph is compiled and executed when a synchronization point is reached (e.g., .item(), print, optimizer.step). This "trace-by-running" approach handles training dynamics (conditionals on loss values, gradient clipping, LR schedules) more naturally than static tracing. JAX\'s jit provides a similar but more explicit mechanism via function transformation.',
    url: 'https://github.com/pytorch/xla'
  },
  'XLA Lazy Tensors': {
    title: 'XLA Lazy Tensors for Trainium Training',
    desc: 'AWS Neuron SDK uses the same XLA lazy tensor infrastructure as torch_xla for TPU. PyTorch operations are recorded into an XLA HLO graph which is then compiled by the Neuron Compiler into a NEFF binary. The key difference from inference (where torch.compile captures the full graph upfront) is that training requires dynamic graph building around gradient computation and optimizer steps. The xm.mark_step() call triggers compilation and execution of the accumulated graph.',
    url: 'https://awsdocs-neuron.readthedocs-hosted.com/'
  },
  'Synapse Lazy Mode': {
    title: 'Habana Synapse Lazy Mode for Training',
    desc: 'Intel Gaudi\'s lazy mode operates similarly to XLA lazy tensors — operations are accumulated into a Synapse graph rather than executed immediately. The graph is compiled and executed at explicit synchronization points (htcore.mark_step()). This allows the Synapse Graph Compiler to perform whole-graph optimizations (fusion, memory planning, scheduling across MME and TPC engines) that aren\'t possible in eager mode.',
    url: 'https://docs.habana.ai/'
  },
};

let currentMode = 'inference';
let selectedCell = null;

function renderLegend() {
  const container = document.getElementById('stackComparison');
  const legendHtml = `<div class="stack-legend">
    <div class="legend-item"><div class="legend-dot" style="background: var(--color-shared)"></div>Shared across accelerators</div>
    <div class="legend-item"><div class="legend-dot" style="background: var(--color-custom)"></div>Hardware-specific (custom)</div>
    <div class="legend-item"><div class="legend-dot" style="background: var(--color-partial)"></div>Partially shared / adapted</div>
  </div>`;
  container.insertAdjacentHTML('beforebegin', legendHtml);
}

function renderStack() {
  const container = document.getElementById('stackComparison');
  const data = stackLayers[currentMode];
  const colCount = accelerators.length;
  container.style.setProperty('--col-count', colCount);

  let html = '';

  html += `<div class="stack-header layer-header">Layer</div>`;
  accelerators.forEach(a => {
    html += `<div class="stack-header">${a}</div>`;
  });

  data.forEach(row => {
    html += `<div class="layer-row-label">${row.layer}</div>`;
    row.cells.forEach(cell => {
      const badgeClass = `badge-${cell.badge}`;
      const badgeText = cell.badge === 'shared' ? 'Shared' : cell.badge === 'custom' ? 'Custom' : 'Adapted';
      html += `<div class="stack-cell" data-label="${cell.label}" data-accel="${cell.accel}">
        <span class="badge ${badgeClass}">${badgeText}</span>
        <span class="cell-label">${cell.label}</span>
        <span class="cell-detail">${cell.detail}</span>
      </div>`;
    });
  });

  container.innerHTML = html;

  container.querySelectorAll('.stack-cell').forEach(el => {
    el.addEventListener('click', () => {
      const label = el.dataset.label;
      selectCell(label, el);
    });
  });
}

function selectCell(label, el) {
  const panel = document.getElementById('detailsPanel');
  const content = document.getElementById('detailsContent');

  document.querySelectorAll('.stack-cell.selected').forEach(c => c.classList.remove('selected'));

  if (selectedCell === label) {
    selectedCell = null;
    panel.classList.remove('visible');
    return;
  }

  selectedCell = label;
  el.classList.add('selected');

  const info = cellExplanations[label];
  if (info) {
    let html = `<h3>${info.title}</h3><p>${info.desc}</p>`;
    if (info.url) {
      html += `<div class="detail-meta"><div class="detail-meta-item"><strong>Reference:</strong> <a href="${info.url}" target="_blank" rel="noopener">${info.url}</a></div></div>`;
    }
    content.innerHTML = html;
    panel.classList.add('visible');
  } else {
    panel.classList.remove('visible');
    selectedCell = null;
  }
}

function renderCompileFlow() {
  const container = document.getElementById('compileFlow');
  const nodes = [
    { label: 'Python Model', sub: 'torch.nn.Module', cls: 'shared' },
    { label: 'TorchDynamo', sub: 'Graph Capture', cls: 'shared' },
    { label: 'FX Graph', sub: 'IR', cls: 'shared' },
    { label: 'Backend', sub: 'TorchInductor / XLA / Neuron', cls: 'custom' },
    { label: 'Device Code', sub: 'PTX / HLO / NEFF', cls: 'custom' },
    { label: 'Hardware', sub: 'GPU / TPU / Trainium', cls: 'custom' },
  ];

  let html = '';
  nodes.forEach((node, i) => {
    html += `<div class="flow-node ${node.cls}">
      ${node.label}
      <div class="flow-sub">${node.sub}</div>
    </div>`;
    if (i < nodes.length - 1) {
      html += `<div class="flow-arrow">→</div>`;
    }
  });
  container.innerHTML = html;
}

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    selectedCell = null;
    document.getElementById('detailsPanel').classList.remove('visible');
    renderStack();
  });
});

renderLegend();
renderStack();
renderCompileFlow();
