# Processor適用対象の仕様

## 概要

Processor（Effect/Mask）の適用対象をFigmaマスク方式で決定する。
Processorは独立したSceneNodeとして存在し、位置関係によって適用対象が決まる。

## 用語定義

| 用語 | 説明 |
|------|------|
| Processor | Effect/Maskを含むノード。適用対象に視覚効果を与える |
| Object | Surface, Text, Model3D, Image, Groupなどの描画対象ノード |
| 適用対象 | Processorの効果が適用されるノード群 |

## ドメインモデル

### 現在の構造

```typescript
type SceneNode = Layer | Group

interface Layer {
  type: 'layer'
  modifiers: Modifier[]  // ProcessorはLayerの属性
}

interface Group {
  type: 'group'
  children: SceneNode[]
  modifiers: Modifier[]
}
```

### 新しい構造

```typescript
type SceneNode = Layer | Group | Processor

interface Processor {
  type: 'processor'
  id: string
  name: string
  visible: boolean
  expanded: boolean
  modifiers: Modifier[]  // Effect, Mask
}
```

## 適用対象決定ルール

### 基本ルール

**Processorより前にある兄弟要素が適用対象となる。**

### ルール1: Group内のProcessor

Group内では、Processorより前にある**全ての兄弟**が適用対象。

```
<group>
  <surface />        // 適用対象 ✓
  <text />           // 適用対象 ✓
  <group>...</group> // 適用対象 ✓
  <processor>
    <effect />
    <mask />
  </processor>
  <surface />        // 対象外 ✗
</group>
```

### ルール2: Root（1階層目）のProcessor

Root直下では、**直上の1要素のみ**が適用対象。

```
// Root level
<surface />          // 対象外 ✗
<surface />          // 適用対象 ✓ (直上の1要素のみ)
<processor>
  <effect />
  <mask />
</processor>
```

### ルール3: 連続するProcessor

Processorが連続する場合、2つ目以降のProcessorは適用対象なし（無効）。

```
// Root level
<surface />
<processor />        // 直上のsurfaceに適用 ✓
<processor />        // 適用対象なし（無効）✗
```

### ルール4: Processorが先頭にある場合

Processorの前に要素がない場合、適用対象なし（無効）。

```
<group>
  <processor />      // 適用対象なし（無効）✗
  <surface />
</group>
```

## 視覚的表現

### レイヤーパネルでの表示

```
┌─ Group ─────────────────────┐
│  ├─ Surface A     [適用対象]│
│  ├─ Text B        [適用対象]│
│  ├─ Processor ◄────────────┤  // 矢印で適用範囲を示す
│  │   ├─ Effect              │
│  │   └─ Mask                │
│  └─ Surface C     [対象外]  │
└─────────────────────────────┘
```

### ドロップインジケーター

ObjectをProcessorの前にドロップする際：
- Processorの直前に「適用対象ゾーン」を示すインジケーターを表示
- ドロップすると適用対象に追加される

## エッジケース

### ネストしたGroup

```
<group>                      // Group A
  <surface />                // Group AのProcessor対象
  <group>                    // Group B - Group AのProcessor対象
    <text />                 // Group BのProcessor対象
    <processor />            // Group B内のProcessor
  </group>
  <processor />              // Group A内のProcessor
</group>
```

- Group A内のProcessorは、Surface と Group B 全体に適用
- Group B内のProcessorは、Text のみに適用
- ProcessorはGroup境界を越えない

### 複数Processor（Group内）

Group内では複数のProcessorが独立して機能可能。

```
<group>
  <surface A />      // Processor 1の対象
  <processor 1 />
  <surface B />      // Processor 2の対象
  <processor 2 />
  <surface C />      // 対象外
</group>
```

### Visibility

- Processor.visible = false の場合、効果は適用されない
- 適用対象の判定ロジックには影響しない（位置関係は維持）

## 関連ドメイン関数

### getProcessorTargets

```typescript
/**
 * Processorの適用対象を取得する
 *
 * @param siblings - 兄弟ノード配列（同じ親の子ノード群）
 * @param processorIndex - Processorのインデックス
 * @param isRoot - ルートレベルかどうか
 * @returns 適用対象のSceneNode配列
 */
export const getProcessorTargets = (
  siblings: SceneNode[],
  processorIndex: number,
  isRoot: boolean
): SceneNode[] => {
  if (processorIndex <= 0) return []  // 前に要素がない

  if (isRoot) {
    // ルート: 直上の1要素のみ
    const prevNode = siblings[processorIndex - 1]
    return isProcessor(prevNode) ? [] : [prevNode]
  }

  // Group内: 前にある全ての非Processorノード
  const targets: SceneNode[] = []
  for (let i = processorIndex - 1; i >= 0; i--) {
    const node = siblings[i]
    if (isProcessor(node)) break  // 前のProcessorで区切る
    targets.unshift(node)
  }
  return targets
}
```

### findProcessorForNode

```typescript
/**
 * 指定ノードに適用されるProcessorを検索
 *
 * @param siblings - 兄弟ノード配列
 * @param nodeIndex - 対象ノードのインデックス
 * @param isRoot - ルートレベルかどうか
 * @returns 適用されるProcessor、またはundefined
 */
export const findProcessorForNode = (
  siblings: SceneNode[],
  nodeIndex: number,
  isRoot: boolean
): Processor | undefined => {
  // nodeIndexより後ろにあるProcessorを検索
  for (let i = nodeIndex + 1; i < siblings.length; i++) {
    const node = siblings[i]
    if (isProcessor(node)) {
      const targets = getProcessorTargets(siblings, i, isRoot)
      if (targets.some(t => t === siblings[nodeIndex])) {
        return node
      }
      return undefined  // このProcessorの対象外
    }
  }
  return undefined
}
```

## 関連Issue

- #267 ProcessorノードへのObject追加DnD機能
- #271 ドメインモデル拡張 - Processorノード型追加
- #272 レンダリング対応 - 位置関係ベースのProcessor適用
- #273 Processor Usecase層の更新
- #274 UI/DnD対応 - ProcessorへのObject DnD
