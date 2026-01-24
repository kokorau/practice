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
      id: 'opacity' as TrackId,
      name: 'Opacity (smoothstep)',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      // smoothstep: smooth ease-in-out from 0 to 1
      expression: '=smoothstep(0, 5000, @t)',
    },
    {
      id: 'scale' as TrackId,
      name: 'Scale (smoothstep)',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      // smoothstep: 0 → 1 (config maps via range to actual scale values)
      expression: '=smoothstep(0, 5000, @t)',
    },

    // ============================================================
    // Loop Phase - Simple Wave Functions
    // ============================================================

    // --- osc: Sine wave (0~1) ---
    {
      id: 'wave_osc' as TrackId,
      name: 'osc (sine)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc(t, period) → 0~1 sine wave
      expression: '=osc(@t, 2000)',
    },

    // --- saw: Sawtooth wave (0~1) ---
    {
      id: 'wave_saw' as TrackId,
      name: 'saw (sawtooth)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // phase gives 0~1 linear ramp, same as saw(phase(...))
      expression: '=phase(@t, 2000)',
    },

    // --- tri: Triangle wave (0~1) ---
    {
      id: 'wave_tri' as TrackId,
      name: 'tri (triangle)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // tri(phase(t, period)) → triangle wave
      expression: '=tri(phase(@t, 2000))',
    },

    // --- oscPulse: Pulse/Square wave (0 or 1) ---
    {
      id: 'wave_pulse' as TrackId,
      name: 'oscPulse (square)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // oscPulse(t, period, duty) → 0 or 1
      expression: '=oscPulse(@t, 2000, 0.5)',
    },

    // --- oscStep: Stepped/Quantized wave ---
    {
      id: 'wave_step' as TrackId,
      name: 'oscStep (4 steps)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // oscStep(t, period, steps) → quantized 0~1
      expression: '=oscStep(@t, 2000, 4)',
    },

    // --- noise: Deterministic noise ---
    {
      id: 'wave_noise' as TrackId,
      name: 'noise',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // noise(t / scale, seed) → pseudo-random 0~1
      expression: '=noise(@t / 100, 42)',
    },

    // ============================================================
    // Loop Phase - Composite Examples
    // ============================================================

    // --- Rotation: Sine oscillation (0-1) ---
    {
      id: 'rotation' as TrackId,
      name: 'Rotation (osc)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc 0~1, config maps via range to -30~30 degrees
      expression: '=osc(@t, 3000)',
    },

    // --- Layered: Two oscillations combined ---
    {
      id: 'layered' as TrackId,
      name: 'Layered (osc + osc)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Combine slow and fast oscillations: 0.7 * slow + 0.3 * fast
      expression: '=osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3',
    },

    // --- Noise modulated: Noise affecting amplitude ---
    {
      id: 'noise_mod' as TrackId,
      name: 'Noise Modulated',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc * (0.5 + 0.5 * noise) → amplitude varies with noise
      expression: '=osc(@t, 1500) * (0.5 + 0.5 * noise(@t / 200))',
    },

    // --- Bounce: Using abs(sin) for bouncing effect ---
    {
      id: 'bounce' as TrackId,
      name: 'Bounce (abs sin)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // abs(sin) creates bounce effect (0-1)
      expression: '=abs(sin(@t / 1000 * PI))',
    },

    // --- Elastic: Damped oscillation simulation ---
    {
      id: 'elastic' as TrackId,
      name: 'Elastic (damped)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Simulates elastic/damped motion using exp decay * sin
      // Repeats every 3000ms, phase gives 0~1, mul by 3 for ~3 oscillations
      expression: '=0.5 + 0.5 * exp(-3 * phase(@t, 3000)) * sin(phase(@t, 3000) * PI * 6)',
    },

    // --- Heartbeat: Two quick pulses then pause ---
    {
      id: 'heartbeat' as TrackId,
      name: 'Heartbeat',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Two pulses in first 40% of period, then rest
      // pulse1 at 0-15%, pulse2 at 20-35%
      expression: '=max(oscPulse(@t, 2000, 0.15), oscPulse(@t, 2000, 200, 0.15))',
    },

    // --- Wobble: Triangle + noise for organic movement ---
    {
      id: 'wobble' as TrackId,
      name: 'Wobble (tri + noise)',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // 80% triangle + 20% noise for organic feel
      expression: '=tri(phase(@t, 2500)) * 0.8 + noise(@t / 80) * 0.2',
    },

    // --- Breathing: Smooth slow oscillation ---
    {
      id: 'breathing' as TrackId,
      name: 'Breathing',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Very slow smoothed oscillation for breathing effect
      // Uses pow to make the curve more organic (steeper at edges)
      expression: '=osc(@t, 4000) ** 1.5',
    },

    // --- Clamped noise: Noise with min/max bounds ---
    {
      id: 'clamped' as TrackId,
      name: 'Clamped Noise',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Noise scaled up then clamped to 0.2~0.8
      expression: '=clamp(noise(@t / 150), 0.2, 0.8)',
    },

    // --- Quantized sine: Sine wave with step quantization ---
    {
      id: 'quantized' as TrackId,
      name: 'Quantized Sine',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // floor(osc * 8) / 8 → 8-level quantization
      expression: '=floor(osc(@t, 2000) * 8) / 8',
    },
  ],
}
