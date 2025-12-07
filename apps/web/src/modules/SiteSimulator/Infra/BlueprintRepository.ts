import type { SiteBlueprint, BlueprintRepository } from '../Domain'

let current: SiteBlueprint | null = null

export const blueprintRepository: BlueprintRepository = {
  get: () => current,
  save: (blueprint: SiteBlueprint) => {
    current = blueprint
  },
  clear: () => {
    current = null
  },
}
