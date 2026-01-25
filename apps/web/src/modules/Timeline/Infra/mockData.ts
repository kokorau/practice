import type { Timeline, PhaseId, TrackId } from '@practice/timeline'

// ============================================================
// UUID Constants for Mock Track IDs
// ============================================================
export const MOCK_TRACK_IDS = {
  // Opening Phase
  OPACITY: '550e8400-e29b-41d4-a716-446655440001' as TrackId,
  SCALE: '550e8400-e29b-41d4-a716-446655440002' as TrackId,
  // Simple Waves
  WAVE_OSC: '550e8400-e29b-41d4-a716-446655440003' as TrackId,
  WAVE_SAW: '550e8400-e29b-41d4-a716-446655440004' as TrackId,
  WAVE_TRI: '550e8400-e29b-41d4-a716-446655440005' as TrackId,
  WAVE_PULSE: '550e8400-e29b-41d4-a716-446655440006' as TrackId,
  WAVE_STEP: '550e8400-e29b-41d4-a716-446655440007' as TrackId,
  WAVE_NOISE: '550e8400-e29b-41d4-a716-446655440008' as TrackId,
  // Composite
  ROTATION: '550e8400-e29b-41d4-a716-446655440009' as TrackId,
  LAYERED: '550e8400-e29b-41d4-a716-44665544000a' as TrackId,
  NOISE_MOD: '550e8400-e29b-41d4-a716-44665544000b' as TrackId,
  BOUNCE: '550e8400-e29b-41d4-a716-44665544000c' as TrackId,
  ELASTIC: '550e8400-e29b-41d4-a716-44665544000d' as TrackId,
  HEARTBEAT: '550e8400-e29b-41d4-a716-44665544000e' as TrackId,
  WOBBLE: '550e8400-e29b-41d4-a716-44665544000f' as TrackId,
  BREATHING: '550e8400-e29b-41d4-a716-446655440010' as TrackId,
  CLAMPED: '550e8400-e29b-41d4-a716-446655440011' as TrackId,
  QUANTIZED: '550e8400-e29b-41d4-a716-446655440012' as TrackId,
} as const

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
      id: MOCK_TRACK_IDS.OPACITY,
      name: 'opacity',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      // smoothstep: smooth ease-in-out from 0 to 1
      expression: '=smoothstep(0, 5000, @t)',
    },
    {
      id: MOCK_TRACK_IDS.SCALE,
      name: 'scale',
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
      id: MOCK_TRACK_IDS.WAVE_OSC,
      name: 'wave_osc',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc(t, period) → 0~1 sine wave
      expression: '=osc(@t, 2000)',
    },

    // --- saw: Sawtooth wave (0~1) ---
    {
      id: MOCK_TRACK_IDS.WAVE_SAW,
      name: 'wave_saw',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // phase gives 0~1 linear ramp, same as saw(phase(...))
      expression: '=phase(@t, 2000)',
    },

    // --- tri: Triangle wave (0~1) ---
    {
      id: MOCK_TRACK_IDS.WAVE_TRI,
      name: 'wave_tri',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // tri(phase(t, period)) → triangle wave
      expression: '=tri(phase(@t, 2000))',
    },

    // --- oscPulse: Pulse/Square wave (0 or 1) ---
    {
      id: MOCK_TRACK_IDS.WAVE_PULSE,
      name: 'wave_pulse',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // oscPulse(t, period, duty) → 0 or 1
      expression: '=oscPulse(@t, 2000, 0.5)',
    },

    // --- oscStep: Stepped/Quantized wave ---
    {
      id: MOCK_TRACK_IDS.WAVE_STEP,
      name: 'wave_step',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // oscStep(t, period, steps) → quantized 0~1
      expression: '=oscStep(@t, 2000, 4)',
    },

    // --- noise: Deterministic noise ---
    {
      id: MOCK_TRACK_IDS.WAVE_NOISE,
      name: 'wave_noise',
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
      id: MOCK_TRACK_IDS.ROTATION,
      name: 'rotation',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc 0~1, config maps via range to -30~30 degrees
      expression: '=osc(@t, 3000)',
    },

    // --- Layered: Two oscillations combined ---
    {
      id: MOCK_TRACK_IDS.LAYERED,
      name: 'layered',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Combine slow and fast oscillations: 0.7 * slow + 0.3 * fast
      expression: '=osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3',
    },

    // --- Noise modulated: Noise affecting amplitude ---
    {
      id: MOCK_TRACK_IDS.NOISE_MOD,
      name: 'noise_mod',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // osc * (0.5 + 0.5 * noise) → amplitude varies with noise
      expression: '=osc(@t, 1500) * (0.5 + 0.5 * noise(@t / 200))',
    },

    // --- Bounce: Using abs(sin) for bouncing effect ---
    {
      id: MOCK_TRACK_IDS.BOUNCE,
      name: 'bounce',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // abs(sin) creates bounce effect (0-1)
      expression: '=abs(sin(@t / 1000 * PI))',
    },

    // --- Elastic: Damped oscillation simulation ---
    {
      id: MOCK_TRACK_IDS.ELASTIC,
      name: 'elastic',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Simulates elastic/damped motion using exp decay * sin
      // Repeats every 3000ms, phase gives 0~1, mul by 3 for ~3 oscillations
      expression: '=0.5 + 0.5 * exp(-3 * phase(@t, 3000)) * sin(phase(@t, 3000) * PI * 6)',
    },

    // --- Heartbeat: Two quick pulses then pause ---
    {
      id: MOCK_TRACK_IDS.HEARTBEAT,
      name: 'heartbeat',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Two pulses in first 40% of period, then rest
      // pulse1 at 0-15%, pulse2 at 20-35%
      expression: '=max(oscPulse(@t, 2000, 0.15), oscPulse(@t, 2000, 200, 0.15))',
    },

    // --- Wobble: Triangle + noise for organic movement ---
    {
      id: MOCK_TRACK_IDS.WOBBLE,
      name: 'wobble',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // 80% triangle + 20% noise for organic feel
      expression: '=tri(phase(@t, 2500)) * 0.8 + noise(@t / 80) * 0.2',
    },

    // --- Breathing: Smooth slow oscillation ---
    {
      id: MOCK_TRACK_IDS.BREATHING,
      name: 'breathing',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Very slow smoothed oscillation for breathing effect
      // Uses pow to make the curve more organic (steeper at edges)
      expression: '=osc(@t, 4000) ** 1.5',
    },

    // --- Clamped noise: Noise with min/max bounds ---
    {
      id: MOCK_TRACK_IDS.CLAMPED,
      name: 'clamped',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // Noise scaled up then clamped to 0.2~0.8
      expression: '=clamp(noise(@t / 150), 0.2, 0.8)',
    },

    // --- Quantized sine: Sine wave with step quantization ---
    {
      id: MOCK_TRACK_IDS.QUANTIZED,
      name: 'quantized',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      // floor(osc * 8) / 8 → 8-level quantization
      expression: '=floor(osc(@t, 2000) * 8) / 8',
    },
  ],
}
