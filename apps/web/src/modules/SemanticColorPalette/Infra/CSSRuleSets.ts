import {
  CONTEXT_NAMES,
  STATELESS_COMPONENT_NAMES,
  STATEFUL_COMPONENT_NAMES,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  TOKEN_CSS_PROPERTY_MAP,
  type ActionState,
} from '../Domain'

/** Convert camelCase to kebab-case */
const toKebab = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

/** CSS variable name for role suffix */
const ROLE_CSS_NAMES: Record<keyof typeof TOKEN_CSS_PROPERTY_MAP, string> = {
  surface: 'surface',
  title: 'title',
  body: 'body',
  meta: 'meta',
  linkText: 'link-text',
  highlight: 'highlight',
  border: 'border',
  divider: 'divider',
}

/** All roles for alias generation */
const ALL_ROLES: (keyof typeof TOKEN_CSS_PROPERTY_MAP)[] = [
  'surface',
  'title',
  'body',
  'meta',
  'linkText',
  'highlight',
  'border',
  'divider',
]

/** Roles to include in stateless rule sets (CSS properties) */
const STATELESS_PROPERTY_ROLES: (keyof typeof TOKEN_CSS_PROPERTY_MAP)[] = [
  'surface',
  'body',
  'border',
]

/** Roles to include in stateful rule sets */
const STATEFUL_ROLES: (keyof typeof TOKEN_CSS_PROPERTY_MAP)[] = [
  'surface',
  'title',
  'border',
]

const ACTION_STATES: ActionState[] = ['default', 'hover', 'active', 'disabled']

type CSSDeclaration = { property: string; value: string }
type CSSRuleSet = { selector: string; declarations: CSSDeclaration[] }

/**
 * Generate CSS rule set for a context (CSS properties + all role aliases)
 */
const generateContextRuleSet = (contextKey: string): CSSRuleSet => {
  const className = CONTEXT_CLASS_NAMES[contextKey as keyof typeof CONTEXT_CLASS_NAMES]
  const varPrefix = `--context-${toKebab(contextKey)}`

  // CSS property declarations (surface, body, border)
  const propertyDeclarations = STATELESS_PROPERTY_ROLES.map((role) => ({
    property: TOKEN_CSS_PROPERTY_MAP[role],
    value: `var(${varPrefix}-${ROLE_CSS_NAMES[role]})`,
  }))

  // Alias declarations (all roles: --title, --body, etc.)
  const aliasDeclarations = ALL_ROLES.map((role) => ({
    property: `--${ROLE_CSS_NAMES[role]}`,
    value: `var(${varPrefix}-${ROLE_CSS_NAMES[role]})`,
  }))

  return { selector: `.${className}`, declarations: [...propertyDeclarations, ...aliasDeclarations] }
}

/**
 * Generate CSS rule set for a stateless component (CSS properties + role aliases for overrides)
 */
const generateStatelessComponentRuleSet = (componentKey: string): CSSRuleSet => {
  const className = COMPONENT_CLASS_NAMES[componentKey as keyof typeof COMPONENT_CLASS_NAMES]
  const varPrefix = `--component-${toKebab(componentKey)}`

  // CSS property declarations (surface, body, border)
  const propertyDeclarations = STATELESS_PROPERTY_ROLES.map((role) => ({
    property: TOKEN_CSS_PROPERTY_MAP[role],
    value: `var(${varPrefix}-${ROLE_CSS_NAMES[role]})`,
  }))

  // Alias declarations (override parent context's aliases with all roles)
  const aliasDeclarations = ALL_ROLES.map((role) => ({
    property: `--${ROLE_CSS_NAMES[role]}`,
    value: `var(${varPrefix}-${ROLE_CSS_NAMES[role]})`,
  }))

  return { selector: `.${className}`, declarations: [...propertyDeclarations, ...aliasDeclarations] }
}

/**
 * Generate CSS rule sets for a stateful component (default + pseudo-classes)
 */
const generateStatefulComponentRuleSets = (componentKey: string): CSSRuleSet[] => {
  const className = COMPONENT_CLASS_NAMES[componentKey as keyof typeof COMPONENT_CLASS_NAMES]
  const varPrefix = `--component-${toKebab(componentKey)}`

  return ACTION_STATES.map((state) => {
    const selector =
      state === 'default'
        ? `.${className}`
        : state === 'disabled'
          ? `.${className}:disabled, .${className}[disabled], .${className}.is-disabled`
          : `.${className}:${state}`

    const declarations = STATEFUL_ROLES.map((role) => ({
      property: TOKEN_CSS_PROPERTY_MAP[role],
      value: `var(${varPrefix}-${ROLE_CSS_NAMES[role]}-${state})`,
    }))

    return { selector, declarations }
  })
}

/**
 * Generate CSS rule sets for generic child element classes
 * These classes can be used inside any context/component to apply role-based styling
 */
const generateChildElementRuleSets = (): CSSRuleSet[] => [
  // Text colors (ink)
  { selector: '.scp-title', declarations: [{ property: 'color', value: 'var(--title)' }] },
  { selector: '.scp-body', declarations: [{ property: 'color', value: 'var(--body)' }] },
  { selector: '.scp-meta', declarations: [{ property: 'color', value: 'var(--meta)' }] },
  { selector: '.scp-link', declarations: [{ property: 'color', value: 'var(--link-text)' }] },
  { selector: '.scp-highlight', declarations: [{ property: 'color', value: 'var(--highlight)' }] },
  // Line colors (ink)
  { selector: '.scp-border', declarations: [{ property: 'border-color', value: 'var(--border)' }] },
  { selector: '.scp-divider', declarations: [{ property: 'border-color', value: 'var(--divider)' }] },
]

/**
 * Format a single rule set to CSS text
 */
const formatRuleSet = (ruleSet: CSSRuleSet): string => {
  const declarations = ruleSet.declarations
    .map(({ property, value }) => `  ${property}: ${value};`)
    .join('\n')
  return `${ruleSet.selector} {\n${declarations}\n}`
}

/**
 * Generate all CSS rule sets from semantic names
 * @returns Array of CSSRuleSet objects
 */
export const collectCSSRuleSets = (): CSSRuleSet[] => {
  const ruleSets: CSSRuleSet[] = []

  // Context rule sets
  for (const key of Object.keys(CONTEXT_NAMES)) {
    ruleSets.push(generateContextRuleSet(key))
  }

  // Stateless component rule sets
  for (const key of Object.keys(STATELESS_COMPONENT_NAMES)) {
    ruleSets.push(generateStatelessComponentRuleSet(key))
  }

  // Stateful component rule sets
  for (const key of Object.keys(STATEFUL_COMPONENT_NAMES)) {
    ruleSets.push(...generateStatefulComponentRuleSets(key))
  }

  // Generic child element classes
  ruleSets.push(...generateChildElementRuleSets())

  return ruleSets
}

/**
 * Generate CSS text for all rule sets
 * @returns Complete CSS text block
 */
export const toCSSRuleSetsText = (): string => {
  const ruleSets = collectCSSRuleSets()
  return ruleSets.map(formatRuleSet).join('\n\n')
}
