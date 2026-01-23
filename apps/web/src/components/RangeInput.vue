<script setup lang="ts">
import { ref, watch, computed } from 'vue'

/** PropertyValue types from section-visual */
interface StaticValue {
  type: 'static'
  value: string | number | boolean
}

interface RangeExpr {
  type: 'range'
  trackId: string
  min: number
  max: number
  clamp?: boolean
}

type PropertyValue = StaticValue | RangeExpr

/** Check if value is a RangeExpr */
function isRangeExpr(value: unknown): value is RangeExpr {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'range' &&
    'trackId' in value
  )
}

/** Check if value is a StaticValue */
function isStaticValue(value: unknown): value is StaticValue {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'static' &&
    'value' in value
  )
}

/** Convert PropertyValue to DSL string */
function propertyValueToDSL(value: unknown): string | null {
  if (isRangeExpr(value)) {
    const clampArg = value.clamp !== undefined ? `, ${value.clamp}` : ''
    return `range('${value.trackId}', ${value.min}, ${value.max}${clampArg})`
  }
  if (isStaticValue(value)) {
    return String(value.value)
  }
  // Primitive value
  if (typeof value === 'number') {
    return String(value)
  }
  return null
}

/** Parse DSL string to PropertyValue or number */
function parseDSL(text: string): { value: number | PropertyValue; error: string | null } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { value: NaN, error: '空の入力' }
  }

  // Try to parse as range() function
  const rangeMatch = trimmed.match(/^range\s*\(\s*['"]([^'"]+)['"]\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*(?:,\s*(true|false))?\s*\)$/)
  if (rangeMatch) {
    const [, trackId, minStr, maxStr, clampStr] = rangeMatch
    const min = parseFloat(minStr!)
    const max = parseFloat(maxStr!)
    if (isNaN(min) || isNaN(max)) {
      return { value: NaN, error: '無効な数値' }
    }
    const rangeExpr: RangeExpr = {
      type: 'range',
      trackId: trackId!,
      min,
      max,
    }
    if (clampStr !== undefined) {
      rangeExpr.clamp = clampStr === 'true'
    }
    return { value: rangeExpr, error: null }
  }

  // Try to evaluate as numeric expression
  return evaluateNumericExpression(trimmed)
}

// Allowed Math functions for safe evaluation
const ALLOWED_MATH = [
  'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
  'log', 'log10', 'log2', 'max', 'min', 'pow', 'random', 'round', 'sign',
  'sin', 'sqrt', 'tan', 'trunc', 'PI', 'E'
] as const

// Safe numeric expression evaluator
function evaluateNumericExpression(expr: string): { value: number; error: string | null } {
  // Check for obviously invalid characters (basic security)
  // Allow: digits, operators, parentheses, dots, spaces, and Math function names
  const validPattern = /^[\d\s+\-*/().a-zA-Z]+$/
  if (!validPattern.test(expr)) {
    return { value: NaN, error: '無効な文字' }
  }

  try {
    // Replace Math function calls: sin(x) -> Math.sin(x)
    let processed = expr
    for (const fn of ALLOWED_MATH) {
      // Match function name not preceded by 'Math.'
      const regex = new RegExp(`(?<!Math\\.)\\b${fn}\\b`, 'g')
      processed = processed.replace(regex, `Math.${fn}`)
    }

    // Evaluate using Function constructor (safer than eval)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const result = new Function(`"use strict"; return (${processed})`)()

    if (typeof result !== 'number' || !isFinite(result)) {
      return { value: NaN, error: '数値ではない結果' }
    }

    return { value: result, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : '構文エラー'
    return { value: NaN, error: message }
  }
}

const props = defineProps<{
  label: string
  min: number
  max: number
  step?: number
  modelValue: number
  /** Raw PropertyValue for DSL display (optional) */
  rawValue?: unknown
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  /** Emitted when DSL expression is updated (includes RangeExpr) */
  'update:rawValue': [value: PropertyValue | number]
}>()

// Determine initial display text based on rawValue or modelValue
const getDisplayText = (): string => {
  if (props.rawValue !== undefined) {
    const dsl = propertyValueToDSL(props.rawValue)
    if (dsl !== null) return dsl
  }
  return String(props.modelValue)
}

// Local input text state (DSL expression)
const inputText = ref(getDisplayText())
const hasError = ref(false)
const errorMessage = ref('')
const isFocused = ref(false)

// Check if current value is a DSL expression (not a plain number)
const isDSLExpression = computed(() => {
  return props.rawValue !== undefined && isRangeExpr(props.rawValue)
})

// Sync input text when modelValue or rawValue changes externally
watch([() => props.modelValue, () => props.rawValue], () => {
  // Only update if not currently editing (to preserve user's input)
  // Skip update if focused or in error state
  if (!hasError.value && !isFocused.value) {
    inputText.value = getDisplayText()
  }
})

// Clamp value to min/max range
const clampValue = (value: number): number => {
  return Math.max(props.min, Math.min(props.max, value))
}

// Handle input changes
const handleInput = (e: Event) => {
  const text = (e.target as HTMLInputElement).value
  inputText.value = text

  const { value, error } = parseDSL(text)

  if (error) {
    hasError.value = true
    errorMessage.value = error
    // Don't emit - keep last valid value
    return
  }

  hasError.value = false
  errorMessage.value = ''

  // If parsed as RangeExpr, emit as rawValue
  if (isRangeExpr(value)) {
    emit('update:rawValue', value)
    // Also emit numeric value (min) for backward compatibility
    emit('update:modelValue', value.min)
    return
  }

  // Otherwise it's a number
  const numValue = value as number
  const clamped = clampValue(numValue)
  emit('update:modelValue', clamped)
  emit('update:rawValue', clamped)

  // If clamped, update display to show actual value
  if (clamped !== numValue) {
    inputText.value = String(clamped)
  }
}

// Handle focus
const handleFocus = () => {
  isFocused.value = true
}

// On blur, if valid, normalize the display
const handleBlur = () => {
  isFocused.value = false
  if (!hasError.value) {
    inputText.value = getDisplayText()
  }
}

// Formatted display value for min/max hint
const rangeHint = computed(() => `${props.min} ~ ${props.max}`)
</script>

<template>
  <div class="range-input" :class="{ 'has-error': hasError, 'is-dsl': isDSLExpression }">
    <div class="range-header">
      <span class="range-label">{{ label }}</span>
      <span class="range-hint">{{ rangeHint }}</span>
    </div>
    <input
      type="text"
      :value="inputText"
      class="number-input"
      :class="{ 'input-error': hasError, 'input-dsl': isDSLExpression }"
      @focus="handleFocus"
      @input="handleInput"
      @blur="handleBlur"
    />
    <span v-if="hasError" class="error-message">{{ errorMessage }}</span>
  </div>
</template>

<style scoped>
.range-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.range-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.range-label {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
}

.range-hint {
  font-size: 0.625rem;
  color: oklch(0.60 0.01 260);
}

:global(.dark) .range-label {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .range-hint {
  color: oklch(0.50 0.01 260);
}

.number-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-family: ui-monospace, 'SF Mono', Monaco, 'Andale Mono', monospace;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  color: oklch(0.25 0.02 260);
  box-sizing: border-box;
}

:global(.dark) .number-input {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.number-input:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

/* DSL expression state - cyan accent */
.number-input.input-dsl {
  border-color: oklch(0.60 0.15 200);
  background: oklch(0.97 0.02 200);
}

:global(.dark) .number-input.input-dsl {
  border-color: oklch(0.50 0.12 200);
  background: oklch(0.20 0.03 200);
}

/* Error state */
.number-input.input-error {
  border-color: oklch(0.60 0.20 25);
  background: oklch(0.97 0.02 25);
}

:global(.dark) .number-input.input-error {
  border-color: oklch(0.55 0.18 25);
  background: oklch(0.20 0.03 25);
}

.error-message {
  font-size: 0.625rem;
  color: oklch(0.55 0.18 25);
  margin-top: 0.125rem;
}

:global(.dark) .error-message {
  color: oklch(0.65 0.15 25);
}
</style>
