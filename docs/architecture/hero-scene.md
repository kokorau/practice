# HeroScene Architecture

This document describes the architecture of the HeroScene module, which handles the visual canvas rendering for hero sections.

## Overview

HeroScene uses a tree-based layer structure (SceneNode) as the single source of truth, with conversion functions to derive render specifications on demand.

## Type Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        SceneNode (Runtime)                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer              │  Group           │  Processor             │
│  - variant          │  - children[]    │  - modifiers[]         │
│  - sources[]        │  - modifiers[]   │    (MaskModifier)      │
│  - modifiers[]      │                  │                        │
│  - filters?         │                  │                        │
│  - textConfig?      │                  │                        │
│  - model3dConfig?   │                  │                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ toRenderSpecs()
┌─────────────────────────────────────────────────────────────────┐
│                        RenderSpec (Derived)                      │
├─────────────────────────────────────────────────────────────────┤
│  TextureRenderSpec  │  ImageRenderSpec  │  SolidRenderSpec     │
│  TextRenderSpec     │  Object3DRenderSpec │ ClipGroupRenderSpec │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ Renderer
┌─────────────────────────────────────────────────────────────────┐
│                        Canvas Output                             │
└─────────────────────────────────────────────────────────────────┘
```

## Key Types

### SceneNode (LayerNode.ts)

The runtime representation of a layer tree node.

```typescript
type SceneNode = Layer | Group | Processor

interface Layer {
  type: 'layer'
  variant: 'base' | 'surface' | 'text' | 'model3d' | 'image'
  sources: Surface[]       // What to render
  modifiers: Modifier[]    // Effects/masks
  filters?: LayerEffectConfig
}

interface Group {
  type: 'group'
  children: SceneNode[]
  modifiers: Modifier[]
}

interface Processor {
  type: 'processor'
  modifiers: Modifier[]    // Usually MaskModifier
}
```

### Surface (LayerNode.ts)

Defines what to render on a layer.

```typescript
type Surface = PatternSurface | ImageSurface | SolidSurface

interface PatternSurface {
  type: 'pattern'
  spec: TexturePatternSpec  // Shader + params
}
```

### HeroViewConfig (HeroViewConfig.ts)

JSON-serializable configuration for persistence.

```typescript
interface HeroViewConfig {
  viewport: ViewportConfig
  colors: HeroColorsConfig
  layers: LayerNodeConfig[]
  foreground: ForegroundLayerConfig
}
```

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Preset JSON   │────▶│ HeroViewConfig  │────▶│   SceneNode[]   │
│  (stored data)  │     │ (serialization) │     │   (runtime)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                       │
                                │                       ▼
                                │               toRenderSpecs()
                                │                       │
                                ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  HeroViewConfig │     │  RenderSpec[]   │
                        │   (save back)   │     │  (for renderer) │
                        └─────────────────┘     └─────────────────┘
```

## Conversion Functions

### toRenderSpecs (RenderSpec.ts)

Converts SceneNode tree to flat RenderSpec array for rendering.

```typescript
function toRenderSpecs(
  nodes: SceneNode[],
  context: RenderContext,
  isRoot?: boolean
): RenderSpec[]
```

**Key behaviors:**
- Skips invisible layers
- Recursively processes Group children
- Processor nodes wrap their targets in ClipGroupRenderSpec with mask

### fromHeroViewConfig (useHeroScene.ts)

Converts HeroViewConfig to SceneNode tree (hydration).

### toHeroViewConfig (useHeroScene.ts)

Converts SceneNode tree to HeroViewConfig (serialization).

## Processor Target Rules

Processor nodes apply modifiers to sibling nodes above them in the tree:

```
Root level:  Processor applies to ONLY the immediately preceding node
Group level: Processor applies to ALL preceding siblings until another Processor
```

Example:
```
[Layer1, Layer2, Processor]
   │        │        │
   │        └────────┴──▶ Processor targets Layer2 (root: 1 node only)

Group:
  [Layer1, Layer2, Layer3, Processor]
     │        │        │        │
     └────────┴────────┴────────┘
     All three layers are targets (group: all preceding)
```

## Migration Notes

The architecture is being migrated from dual state (canvasLayers + nodes) to single source (nodes only):

- **Phase 1** (current): Both `nodes` and `canvasLayers` supported
- **Phase 2** (future): `canvasLayers` derived from `nodes` only
- **Phase 3** (future): `canvasLayers` removed

## File Organization

```
modules/HeroScene/
├── Domain/
│   ├── index.ts           # Main exports, HeroScene type
│   ├── LayerNode.ts       # SceneNode, Layer, Group, Processor
│   ├── Modifier.ts        # EffectModifier, MaskModifier
│   ├── EffectSchema.ts    # LayerEffectConfig schema
│   └── HeroViewConfig.ts  # Serialization types
├── Application/
│   ├── index.ts           # Application layer exports
│   ├── RenderSpec.ts      # toRenderSpecs conversion
│   └── CompileHeroScene.ts # EditorState compilation
└── Infra/
    ├── HeroSceneRenderer.ts # WebGPU renderer
    └── renderHeroConfig.ts  # Config-based rendering
```

## Testing

Key test areas:

1. **RenderSpec.test.ts** - toRenderSpecs conversion
   - Layer variants (base, surface, text, model3d, image)
   - Group nesting
   - Processor target resolution
   - Edge cases (empty arrays, invisible nodes)

2. **LayerNode.test.ts** - SceneNode operations
   - Tree manipulation (find, update, remove)
   - DnD move operations
   - Processor target calculation

3. **HeroViewConfig.test.ts** - Serialization
   - Round-trip conversion (config → nodes → config)
   - Migration from legacy formats
