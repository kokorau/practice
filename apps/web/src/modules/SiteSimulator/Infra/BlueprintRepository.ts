import type { SiteBlueprint, BlueprintRepository, BlueprintListener } from '../Domain'

let current: SiteBlueprint | null = null
const listeners = new Set<BlueprintListener>()

export const blueprintRepository: BlueprintRepository = {
  get: () => current,
  save: (blueprint: SiteBlueprint) => {
    current = blueprint
    listeners.forEach(listener => listener(blueprint))
  },
  clear: () => {
    current = null
  },
  subscribe: (listener: BlueprintListener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
