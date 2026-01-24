<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  tryParse,
  analyzeAmplitude,
  extractAllPeriods,
  type AmplitudeInfo,
} from '@practice/dsl'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    showAnalysis?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '=osc(@t, 2000) * 0.5 + 0.25',
    showAnalysis: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = ref(props.modelValue)
const showSyntaxRef = ref(false)
const displayMode = ref<'default' | 'period' | 'amplitude'>('default')

watch(
  () => props.modelValue,
  (newValue) => {
    inputValue.value = newValue
  }
)

/**
 * Parse the input value
 * - If starts with '=': parse as DSL expression
 * - Otherwise: treat as literal value (number or string)
 */
const parseResult = computed(() => {
  const value = inputValue.value.trim()
  if (!value) return { ok: true as const, ast: null, empty: true, literal: true }

  // DSL expression (starts with '=')
  if (value.startsWith('=')) {
    const result = tryParse(value)
    return { ...result, empty: false, literal: false }
  }

  // Literal value (number or string)
  return { ok: true as const, ast: null, empty: false, literal: true }
})

const analysisResult = computed((): AmplitudeInfo | null => {
  if (!parseResult.value.ok || parseResult.value.empty || !parseResult.value.ast) {
    return null
  }
  try {
    return analyzeAmplitude(parseResult.value.ast)
  } catch {
    return null
  }
})

const periods = computed((): number[] => {
  if (!parseResult.value.ok || parseResult.value.empty || !parseResult.value.ast) {
    return []
  }
  try {
    return extractAllPeriods(parseResult.value.ast)
  } catch {
    return []
  }
})

const statusInfo = computed(() => {
  if (parseResult.value.empty) {
    return { status: 'empty' as const, color: 'oklch(0.55 0.02 260)', label: 'Empty' }
  }
  if (parseResult.value.literal) {
    // Check if it's a valid number
    const value = inputValue.value.trim()
    const isNumber = !isNaN(Number(value)) && value !== ''
    return {
      status: 'literal' as const,
      color: 'oklch(0.55 0.15 200)',
      label: isNumber ? 'Number' : 'String',
    }
  }
  if (parseResult.value.ok) {
    return { status: 'valid' as const, color: 'oklch(0.55 0.15 150)', label: 'DSL' }
  }
  return { status: 'error' as const, color: 'oklch(0.55 0.20 25)', label: 'Error' }
})

const hintMessage = computed(() => {
  if (parseResult.value.empty) {
    return 'Enter a value or DSL expression (prefix with = for DSL)'
  }
  if (parseResult.value.literal) {
    const value = inputValue.value.trim()
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      return `Literal number: ${numValue}`
    }
    return `Literal string: "${value}"`
  }
  if (!parseResult.value.ok) {
    return parseResult.value.error
  }
  if (displayMode.value === 'period' && periods.value.length > 0) {
    return `Periods: ${periods.value.map((p) => `${p}ms`).join(', ')}`
  }
  if (displayMode.value === 'amplitude' && analysisResult.value) {
    const { min, max, amplitude, center } = analysisResult.value
    return `Range: [${min.toFixed(2)}, ${max.toFixed(2)}] | Amp: ${amplitude.toFixed(2)} | Center: ${center.toFixed(2)}`
  }
  return 'DSL syntax OK'
})

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  inputValue.value = target.value
  emit('update:modelValue', target.value)
}

function toggleDisplayMode() {
  const modes: Array<'default' | 'period' | 'amplitude'> = ['default', 'period', 'amplitude']
  const currentIndex = modes.indexOf(displayMode.value)
  displayMode.value = modes[(currentIndex + 1) % modes.length]!
}

// Syntax reference data
const syntaxReference = {
  operators: [
    { syntax: '+, -, *, /', desc: 'Arithmetic operators' },
    { syntax: '%', desc: 'Modulo' },
    { syntax: '**', desc: 'Power (right-associative)' },
    { syntax: '-x', desc: 'Unary minus' },
    { syntax: '()', desc: 'Grouping / Function call' },
  ],
  references: [
    { syntax: '@t', desc: 'Short reference' },
    { syntax: '@ns:path', desc: 'Namespaced reference' },
  ],
  constants: [
    { syntax: 'PI', desc: 'Math.PI' },
    { syntax: 'E', desc: 'Math.E' },
  ],
  functions: {
    wave: [
      { syntax: 'osc(t, period, [offset])', desc: 'Sine wave [0,1]' },
      { syntax: 'phase(t, period, [offset])', desc: 'Phase [0,1]' },
      { syntax: 'oscPulse(t, period, duty)', desc: 'Pulse wave' },
      { syntax: 'oscStep(t, period, steps)', desc: 'Step wave' },
      { syntax: 'saw(t)', desc: 'Sawtooth [0,1]' },
      { syntax: 'tri(t)', desc: 'Triangle [0,1]' },
      { syntax: 'pulse(t, duty)', desc: 'Pulse [0,1]' },
    ],
    math: [
      { syntax: 'sin, cos, tan', desc: 'Trigonometric' },
      { syntax: 'asin, acos, atan', desc: 'Inverse trig' },
      { syntax: 'sqrt, pow, exp', desc: 'Power functions' },
      { syntax: 'log, log10, log2', desc: 'Logarithms' },
      { syntax: 'abs, sign', desc: 'Absolute / Sign' },
      { syntax: 'floor, ceil, round', desc: 'Rounding' },
      { syntax: 'min, max', desc: 'Min / Max' },
    ],
    utility: [
      { syntax: 'range(t, min, max)', desc: 'Map [0,1] to range' },
      { syntax: 'clamp(v, min, max)', desc: 'Clamp value' },
      { syntax: 'lerp(a, b, t)', desc: 'Linear interpolation' },
      { syntax: 'smoothstep(e0, e1, x)', desc: 'Hermite interp' },
      { syntax: 'fract(x)', desc: 'Fractional part' },
      { syntax: 'step(edge, x)', desc: 'Step function' },
      { syntax: 'noise(x, [seed])', desc: 'Noise [0,1]' },
    ],
  },
}
</script>

<template>
  <div class="dsl-input-container">
    <!-- Input Row -->
    <div class="input-row">
      <input
        type="text"
        class="dsl-input"
        :value="inputValue"
        :placeholder="placeholder"
        @input="onInput"
      />
      <span class="status-indicator" :style="{ color: statusInfo.color }">
        {{ statusInfo.label }}
      </span>
    </div>

    <!-- Hint Row -->
    <div class="hint-row" :class="{ error: statusInfo.status === 'error' }">
      <span class="hint-text">{{ hintMessage }}</span>
      <div class="hint-actions">
        <button
          v-if="showAnalysis && parseResult.ok && !parseResult.empty && !parseResult.literal"
          class="mode-btn"
          :class="{ active: displayMode !== 'default' }"
          @click="toggleDisplayMode"
        >
          {{ displayMode === 'default' ? 'Info' : displayMode === 'period' ? 'Period' : 'Amp' }}
        </button>
        <button class="ref-btn" :class="{ active: showSyntaxRef }" @click="showSyntaxRef = !showSyntaxRef">
          ?
        </button>
      </div>
    </div>

    <!-- Syntax Reference Panel -->
    <div v-if="showSyntaxRef" class="syntax-ref-panel">
      <div class="ref-section">
        <h5>Operators</h5>
        <div v-for="item in syntaxReference.operators" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>

      <div class="ref-section">
        <h5>References</h5>
        <div v-for="item in syntaxReference.references" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>

      <div class="ref-section">
        <h5>Constants</h5>
        <div v-for="item in syntaxReference.constants" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>

      <div class="ref-section">
        <h5>Wave Functions</h5>
        <div v-for="item in syntaxReference.functions.wave" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>

      <div class="ref-section">
        <h5>Math Functions</h5>
        <div v-for="item in syntaxReference.functions.math" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>

      <div class="ref-section">
        <h5>Utility Functions</h5>
        <div v-for="item in syntaxReference.functions.utility" :key="item.syntax" class="ref-item">
          <code>{{ item.syntax }}</code>
          <span>{{ item.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dsl-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dsl-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.375rem;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.dsl-input:focus {
  border-color: oklch(0.50 0.20 250);
}

.dsl-input::placeholder {
  color: oklch(0.60 0.02 260);
}

.status-indicator {
  font-size: 0.625rem;
  font-weight: 600;
  min-width: 2.5rem;
  text-align: right;
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.25rem;
  min-height: 1.5rem;
}

.hint-row.error {
  background: oklch(0.95 0.05 25);
}

.hint-text {
  color: oklch(0.55 0.02 260);
  font-size: 0.625rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint-row.error .hint-text {
  color: oklch(0.50 0.20 25);
}

.hint-actions {
  display: flex;
  gap: 0.25rem;
}

.mode-btn,
.ref-btn {
  padding: 0.125rem 0.375rem;
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.1875rem;
  background: transparent;
  color: oklch(0.55 0.02 260);
  font-size: 0.5625rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover,
.ref-btn:hover {
  background: oklch(0.90 0.01 260);
  color: oklch(0.35 0.02 260);
}

.mode-btn.active,
.ref-btn.active {
  background: oklch(0.50 0.20 250);
  border-color: oklch(0.50 0.20 250);
  color: white;
}

.syntax-ref-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.375rem;
  max-height: 18.75rem;
  overflow-y: auto;
}

.ref-section h5 {
  margin: 0 0 0.375rem 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
  color: oklch(0.35 0.02 260);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ref-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.125rem 0;
  font-size: 0.625rem;
}

.ref-item code {
  color: oklch(0.45 0.15 250);
  background: oklch(0.92 0.02 250);
  padding: 0.0625rem 0.25rem;
  border-radius: 0.125rem;
  white-space: nowrap;
}

.ref-item span {
  color: oklch(0.55 0.02 260);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
