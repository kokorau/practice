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

const parseResult = computed(() => {
  const value = inputValue.value.trim()
  if (!value) return { ok: true as const, ast: null, empty: true }

  const result = tryParse(value)
  return { ...result, empty: false }
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
    return { status: 'empty' as const, color: 'gray', label: 'Empty' }
  }
  if (parseResult.value.ok) {
    return { status: 'valid' as const, color: '#4ade80', label: 'Valid' }
  }
  return { status: 'error' as const, color: '#f87171', label: 'Error' }
})

const hintMessage = computed(() => {
  if (parseResult.value.empty) {
    return 'Enter a DSL expression (e.g., =osc(@t, 2000))'
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
  return 'Syntax OK'
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
          v-if="showAnalysis && parseResult.ok && !parseResult.empty"
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
  gap: 4px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsl-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.dsl-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.dsl-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.status-indicator {
  font-size: 10px;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  min-height: 24px;
}

.hint-row.error {
  background: rgba(248, 113, 113, 0.15);
}

.hint-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint-row.error .hint-text {
  color: #f87171;
}

.hint-actions {
  display: flex;
  gap: 4px;
}

.mode-btn,
.ref-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 9px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover,
.ref-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.mode-btn.active,
.ref-btn.active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.syntax-ref-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.ref-section h5 {
  margin: 0 0 6px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ref-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  font-size: 10px;
}

.ref-item code {
  color: #93c5fd;
  background: rgba(147, 197, 253, 0.1);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}

.ref-item span {
  color: rgba(255, 255, 255, 0.5);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
