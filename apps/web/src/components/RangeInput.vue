<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { tryParse, type AstNode } from '@practice/dsl'

/** PropertyValue types from section-visual */
interface StaticValue {
  type: 'static'
  value: string | number | boolean
}

/** RangeExpr from section-visual - timeline track intensity mapping */
interface RangeExpr {
  type: 'range'
  trackId: string
  min: number
  max: number
  clamp?: boolean
}

interface DslExpr {
  type: 'dsl'
  expression: string
  ast: AstNode
}

type PropertyValue = StaticValue | RangeExpr | DslExpr

/** Check if value is a DslExpr */
function isDslExpr(value: unknown): value is DslExpr {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'dsl' &&
    'expression' in value
  )
}

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

/** Convert PropertyValue to display string */
function propertyValueToDisplay(value: unknown): string | null {
  if (isDslExpr(value)) {
    return value.expression
  }
  if (isRangeExpr(value)) {
    // Display RangeExpr as DSL-style expression
    return `=range(@${value.trackId}, ${value.min}, ${value.max})`
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

type ParseResult =
  | { type: 'number'; value: number; error: null }
  | { type: 'dsl'; expression: string; ast: AstNode; error: null }
  | { type: 'error'; value: null; error: string }

/** Parse input string */
function parseInput(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { type: 'error', value: null, error: '空の入力' }
  }

  // DSL expression (starts with '=')
  if (trimmed.startsWith('=')) {
    const result = tryParse(trimmed)
    if (result.ok) {
      return { type: 'dsl', expression: trimmed, ast: result.ast, error: null }
    }
    return { type: 'error', value: null, error: result.error }
  }

  // Literal number
  const numValue = Number(trimmed)
  if (!isNaN(numValue)) {
    return { type: 'number', value: numValue, error: null }
  }

  return { type: 'error', value: null, error: '無効な数値' }
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
    const display = propertyValueToDisplay(props.rawValue)
    if (display !== null) return display
  }
  return String(props.modelValue)
}

// Local input text state (DSL expression)
const inputText = ref(getDisplayText())
const hasError = ref(false)
const errorMessage = ref('')
const isFocused = ref(false)

// Check if current value is a DSL expression (DslExpr or RangeExpr)
const isDSLExpression = computed(() => {
  return props.rawValue !== undefined && (isDslExpr(props.rawValue) || isRangeExpr(props.rawValue))
})

// Check if currently in DSL mode (input starts with '=')
const isDSLMode = computed(() => inputText.value.trim().startsWith('='))

// DSL parse status for hint display
const dslStatus = computed(() => {
  if (!isDSLMode.value) return null
  const result = tryParse(inputText.value.trim())
  if (result.ok) {
    return { ok: true as const, message: 'Valid DSL' }
  }
  return { ok: false as const, message: result.error }
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

// Handle input changes - just update local text, no validation
const handleInput = (e: Event) => {
  const text = (e.target as HTMLInputElement).value
  inputText.value = text
  // Clear error state while typing
  hasError.value = false
  errorMessage.value = ''
}

// Handle focus
const handleFocus = () => {
  isFocused.value = true
}

// On blur, validate and commit the value
const handleBlur = () => {
  isFocused.value = false

  const result = parseInput(inputText.value)

  if (result.type === 'error') {
    hasError.value = true
    errorMessage.value = result.error
    // Emit 0 as fallback value for invalid input
    emit('update:modelValue', 0)
    emit('update:rawValue', 0)
    return
  }

  hasError.value = false
  errorMessage.value = ''

  // DSL expression
  if (result.type === 'dsl') {
    const dslValue: DslExpr = {
      type: 'dsl',
      expression: result.expression,
      ast: result.ast,
    }
    emit('update:rawValue', dslValue)
    // Don't emit update:modelValue for DSL - the actual value will be computed at runtime
    // Emitting 0 would cause issues with single-param update flow
    inputText.value = result.expression
    return
  }

  // Numeric value
  const clamped = clampValue(result.value)
  emit('update:modelValue', clamped)
  emit('update:rawValue', clamped)

  // Update display to show actual value (may be clamped)
  inputText.value = String(clamped)
}

// Formatted display value for min/max hint
const rangeHint = computed(() => `${props.min} ~ ${props.max}`)
</script>

<template>
  <div class="range-input" :class="{ 'has-error': hasError, 'is-dsl': isDSLExpression || isDSLMode }">
    <div class="range-header">
      <span class="range-label">{{ label }}</span>
      <!-- DSL mode: show parse status -->
      <span v-if="isDSLMode && dslStatus" class="dsl-hint" :class="{ 'dsl-hint--error': !dslStatus.ok }">
        {{ dslStatus.ok ? 'DSL' : 'Error' }}
      </span>
      <!-- Normal mode: show range -->
      <span v-else class="range-hint">{{ rangeHint }}</span>
    </div>
    <input
      type="text"
      :value="inputText"
      class="number-input"
      :class="{
        'input-error': hasError,
        'input-dsl': isDSLExpression || isDSLMode,
        'input-dsl-valid': isDSLMode && dslStatus?.ok,
        'input-dsl-invalid': isDSLMode && dslStatus && !dslStatus.ok,
      }"
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

.dsl-hint {
  font-size: 0.625rem;
  font-weight: 600;
  color: oklch(0.50 0.15 200);
}

.dsl-hint--error {
  color: oklch(0.55 0.18 25);
}

:global(.dark) .range-label {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .range-hint {
  color: oklch(0.50 0.01 260);
}

:global(.dark) .dsl-hint {
  color: oklch(0.60 0.12 200);
}

:global(.dark) .dsl-hint--error {
  color: oklch(0.65 0.15 25);
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
  border-color: oklch(0.70 0.10 200);
  background: oklch(0.98 0.01 200);
}

.number-input.input-dsl-valid {
  border-color: oklch(0.55 0.15 150);
  background: oklch(0.97 0.02 150);
}

.number-input.input-dsl-invalid {
  border-color: oklch(0.60 0.15 25);
  background: oklch(0.97 0.02 25);
}

:global(.dark) .number-input.input-dsl {
  border-color: oklch(0.45 0.08 200);
  background: oklch(0.18 0.02 200);
}

:global(.dark) .number-input.input-dsl-valid {
  border-color: oklch(0.45 0.12 150);
  background: oklch(0.18 0.02 150);
}

:global(.dark) .number-input.input-dsl-invalid {
  border-color: oklch(0.50 0.12 25);
  background: oklch(0.18 0.02 25);
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
