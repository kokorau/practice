import type {
  PreviewArtifact,
  OutputArtifactRepository,
  OutputArtifactListener,
} from '../Domain/OutputArtifactRepository'
import { $PreviewArtifact } from '../Domain/OutputArtifactRepository'

let current: PreviewArtifact | null = null
const listeners = new Set<OutputArtifactListener>()

export const outputArtifactRepository: OutputArtifactRepository = {
  get: () => current,

  save: (artifact: PreviewArtifact) => {
    const changeType = $PreviewArtifact.detectChangeType(current, artifact)
    const prev = current
    current = artifact

    // 実際に変更があった場合のみ通知
    if (!prev || prev.html !== artifact.html || prev.css !== artifact.css || prev.fonts !== artifact.fonts) {
      listeners.forEach(listener => listener(artifact, changeType))
    }
  },

  clear: () => {
    current = null
  },

  subscribe: (listener: OutputArtifactListener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
