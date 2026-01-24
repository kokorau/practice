<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GPUResourceTracker, type GPUResourceStats } from '../../services/GPUResourceTracker'

const stats = ref<GPUResourceStats | null>(null)
const isExpanded = ref(false)

let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = GPUResourceTracker.subscribe((newStats) => {
    stats.value = newStats
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

const formattedVRAM = computed(() => {
  if (!stats.value) return '0 B'
  const bytes = stats.value.estimatedVRAM
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const statusColor = computed(() => {
  if (!stats.value) return 'gray'
  if (stats.value.lostDeviceCount > 0) return 'red'
  if (stats.value.activeDeviceCount > 3) return 'orange'
  return 'green'
})

const statusLabel = computed(() => {
  if (!stats.value) return 'Unknown'
  if (stats.value.lostDeviceCount > 0) return 'Device Lost!'
  if (stats.value.activeDeviceCount > 3) return 'High Load'
  return 'OK'
})
</script>

<template>
  <div
    class="gpu-resource-panel"
    :class="{ expanded: isExpanded }"
    @click="isExpanded = !isExpanded"
  >
    <!-- Collapsed: Simple indicator -->
    <div v-if="!isExpanded" class="collapsed-view">
      <span class="status-dot" :style="{ background: statusColor }" />
      <span class="status-text">GPU: {{ statusLabel }}</span>
      <span class="device-count">{{ stats?.activeDeviceCount ?? 0 }}</span>
    </div>

    <!-- Expanded: Full details -->
    <div v-else class="expanded-view" @click.stop>
      <div class="panel-header">
        <h4>GPU Resource Monitor</h4>
        <button class="close-btn" @click.stop="isExpanded = false">x</button>
      </div>

      <div v-if="stats" class="stats-grid">
        <!-- Status -->
        <div class="stat-row">
          <span class="stat-label">Status</span>
          <span class="stat-value" :style="{ color: statusColor }">
            {{ statusLabel }}
          </span>
        </div>

        <!-- Active Devices -->
        <div class="stat-row">
          <span class="stat-label">Active Devices</span>
          <span class="stat-value">{{ stats.activeDeviceCount }}</span>
        </div>

        <!-- Total Created -->
        <div class="stat-row">
          <span class="stat-label">Total Created</span>
          <span class="stat-value">{{ stats.totalDevicesCreated }}</span>
        </div>

        <!-- Lost Devices -->
        <div class="stat-row" :class="{ warning: stats.lostDeviceCount > 0 }">
          <span class="stat-label">Lost Devices</span>
          <span class="stat-value">{{ stats.lostDeviceCount }}</span>
        </div>

        <!-- Estimated VRAM -->
        <div class="stat-row">
          <span class="stat-label">Est. VRAM</span>
          <span class="stat-value">{{ formattedVRAM }}</span>
        </div>

        <!-- Textures -->
        <div class="stat-row">
          <span class="stat-label">Textures</span>
          <span class="stat-value">{{ stats.textureCount }}</span>
        </div>

        <!-- Buffers -->
        <div class="stat-row">
          <span class="stat-label">Buffers</span>
          <span class="stat-value">{{ stats.bufferCount }}</span>
        </div>

        <!-- Adapter Info -->
        <div v-if="stats.adapterInfo" class="adapter-info">
          <div class="stat-row">
            <span class="stat-label">GPU</span>
            <span class="stat-value">{{ stats.adapterInfo.description || 'Unknown' }}</span>
          </div>
          <div v-if="stats.adapterInfo.vendor" class="stat-row">
            <span class="stat-label">Vendor</span>
            <span class="stat-value">{{ stats.adapterInfo.vendor }}</span>
          </div>
          <div v-if="stats.adapterInfo.isFallbackAdapter" class="stat-row warning">
            <span class="stat-label">Fallback</span>
            <span class="stat-value">Yes (Software)</span>
          </div>
        </div>

        <!-- Device List -->
        <div v-if="stats.devices.length > 0" class="device-list">
          <div class="list-header">Devices:</div>
          <div
            v-for="device in stats.devices"
            :key="device.id"
            class="device-item"
            :class="{ lost: device.isLost }"
          >
            <span class="device-id">{{ device.label || device.id }}</span>
            <span v-if="device.isLost" class="lost-reason">
              Lost: {{ device.lostReason || 'Unknown' }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="no-data">
        No GPU data available
      </div>
    </div>
  </div>
</template>

<style scoped>
.gpu-resource-panel {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  user-select: none;
}

.collapsed-view {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s;
}

.collapsed-view:hover {
  transform: scale(1.02);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-text {
  font-weight: 500;
}

.device-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.expanded-view {
  width: 280px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.close-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.stats-grid {
  padding: 8px 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-row.warning {
  background: rgba(255, 100, 100, 0.1);
  margin: 0 -12px;
  padding: 4px 12px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-weight: 500;
}

.adapter-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.device-list {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.list-header {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  margin-bottom: 4px;
}

.device-item {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  font-size: 10px;
}

.device-item.lost {
  color: #ff6b6b;
}

.device-id {
  font-weight: 500;
}

.lost-reason {
  color: #ff9999;
  font-size: 9px;
  margin-top: 2px;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}
</style>
