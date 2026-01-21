import type { Timeline, PhaseId, TrackId } from '@practice/timeline'

export const mockTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 5000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop' }, // No duration = infinite
  ],
  tracks: [
    // ============================================================
    // Opening Phase - Fade-in Effects
    // ============================================================
    {
      id: 'track-opacity-opening' as TrackId,
      name: 'Opacity (smoothstep)',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      targetParam: 'opacity',
      // smoothstep: smooth ease-in-out from 0 to 1
      expression: 'smoothstep(0, 5000, t)',
    },
    {
      id: 'track-scale-opening' as TrackId,
      name: 'Scale (smoothstep)',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      targetParam: 'scale',
      // range + smoothstep: 0.5 → 1.0
      expression: 'range(smoothstep(0, 5000, t), 0.5, 1.0)',
    },

    // ============================================================
    // Loop Phase - Simple Wave Functions
    // ============================================================

    // --- osc: Sine wave (0~1) ---
    {
      id: 'track-osc' as TrackId,
      name: 'osc (sine)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_osc',
      // osc(t, period) → 0~1 sine wave
      expression: 'osc(t, 2000)',
    },

    // --- saw: Sawtooth wave (0~1) ---
    {
      id: 'track-saw' as TrackId,
      name: 'saw (sawtooth)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_saw',
      // phase gives 0~1 linear ramp, same as saw(phase(...))
      expression: 'phase(t, 2000)',
    },

    // --- tri: Triangle wave (0~1) ---
    {
      id: 'track-tri' as TrackId,
      name: 'tri (triangle)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_tri',
      // tri(phase(t, period)) → triangle wave
      expression: 'tri(phase(t, 2000))',
    },

    // --- oscPulse: Pulse/Square wave (0 or 1) ---
    {
      id: 'track-pulse' as TrackId,
      name: 'oscPulse (square)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_pulse',
      // oscPulse(t, period, duty) → 0 or 1
      expression: 'oscPulse(t, 2000, 0.5)',
    },

    // --- oscStep: Stepped/Quantized wave ---
    {
      id: 'track-step' as TrackId,
      name: 'oscStep (4 steps)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_step',
      // oscStep(t, period, steps) → quantized 0~1
      expression: 'oscStep(t, 2000, 4)',
    },

    // --- noise: Deterministic noise ---
    {
      id: 'track-noise' as TrackId,
      name: 'noise',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave_noise',
      // noise(t / scale, seed) → pseudo-random 0~1
      expression: 'noise(div(t, 100), 42)',
    },

    // ============================================================
    // Loop Phase - Composite Examples
    // ============================================================

    // --- Rotation: Sine oscillation with range mapping ---
    {
      id: 'track-rotation' as TrackId,
      name: 'Rotation (osc → range)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'rotation',
      // Maps osc 0~1 to -30~30 degrees
      expression: 'range(osc(t, 3000), -30, 30)',
    },

    // --- Layered: Two oscillations combined ---
    {
      id: 'track-layered' as TrackId,
      name: 'Layered (osc + osc)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'layered',
      // Combine slow and fast oscillations: 0.7 * slow + 0.3 * fast
      expression: 'add(mul(osc(t, 4000), 0.7), mul(osc(t, 500), 0.3))',
    },

    // --- Noise modulated: Noise affecting amplitude ---
    {
      id: 'track-noise-mod' as TrackId,
      name: 'Noise Modulated',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'noise_mod',
      // osc * (0.5 + 0.5 * noise) → amplitude varies with noise
      expression: 'mul(osc(t, 1500), add(0.5, mul(0.5, noise(div(t, 200)))))',
    },

    // --- Bounce: Using abs(sin) for bouncing effect ---
    {
      id: 'track-bounce' as TrackId,
      name: 'Bounce (abs sin)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'bounce',
      // abs(sin) creates bounce effect, then range to 0.3~1.0
      expression: 'range(abs(sin(mul(div(t, 1000), PI))), 0.3, 1.0)',
    },

    // --- Elastic: Damped oscillation simulation ---
    {
      id: 'track-elastic' as TrackId,
      name: 'Elastic (damped)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'elastic',
      // Simulates elastic/damped motion using exp decay * sin
      // Repeats every 3000ms, phase gives 0~1, mul by 3 for ~3 oscillations
      expression: 'add(0.5, mul(0.5, mul(exp(mul(-3, phase(t, 3000))), sin(mul(phase(t, 3000), mul(PI, 6))))))',
    },

    // --- Heartbeat: Two quick pulses then pause ---
    {
      id: 'track-heartbeat' as TrackId,
      name: 'Heartbeat',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'heartbeat',
      // Two pulses in first 40% of period, then rest
      // pulse1 at 0-15%, pulse2 at 20-35%
      expression: 'max(oscPulse(t, 2000, 0.15), oscPulse(t, 2000, 200, 0.15))',
    },

    // --- Wobble: Triangle + noise for organic movement ---
    {
      id: 'track-wobble' as TrackId,
      name: 'Wobble (tri + noise)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wobble',
      // 80% triangle + 20% noise for organic feel
      expression: 'add(mul(tri(phase(t, 2500)), 0.8), mul(noise(div(t, 80)), 0.2))',
    },

    // --- Breathing: Smooth slow oscillation ---
    {
      id: 'track-breathing' as TrackId,
      name: 'Breathing',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'breathing',
      // Very slow smoothed oscillation for breathing effect
      // Uses pow to make the curve more organic (steeper at edges)
      expression: 'pow(osc(t, 4000), 1.5)',
    },

    // --- Clamped noise: Noise with min/max bounds ---
    {
      id: 'track-clamped' as TrackId,
      name: 'Clamped Noise',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'clamped',
      // Noise scaled up then clamped to 0.2~0.8
      expression: 'clamp(noise(div(t, 150)), 0.2, 0.8)',
    },

    // --- Quantized sine: Sine wave with step quantization ---
    {
      id: 'track-quantized' as TrackId,
      name: 'Quantized Sine',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'quantized',
      // floor(osc * 8) / 8 → 8-level quantization
      expression: 'div(floor(mul(osc(t, 2000), 8)), 8)',
    },
  ],
}
