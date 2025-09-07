<template>
  <div class="circle-progress" :style="{ width: size+'px', height: size+'px' }">
    <svg :width="size" :height="size" :viewBox="viewBox">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :stop-color="startColor" />
          <stop offset="100%" :stop-color="endColor" />
        </linearGradient>
        <filter :id="shadowId" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2" />
        </filter>
      </defs>

      <g :filter="'url(#'+shadowId+')'" :transform="svgTransform">
        <!-- Track -->
        <path
          :d="trackPath"
          :stroke="trackColor"
          :stroke-width="strokeWidth"
          :stroke-linecap="linecap"
          fill="none"
        />

        <!-- Progress -->
        <path
          :d="trackPath"
          :stroke="progressStroke"
          :stroke-width="strokeWidth"
          :stroke-linecap="linecap"
          fill="none"
          :stroke-dasharray="dashArray"
          :stroke-dashoffset="0"
          style="transition: stroke-dasharray 400ms ease, stroke 300ms ease"
        />
      </g>

      <!-- Label / Icons -->
      <g v-if="isInProgress && showLabel">
        <text :x="center" :y="labelY" text-anchor="middle" dominant-baseline="middle" :fill="labelColor" :font-size="size*0.12" :font-weight="600">
          {{ displayLabel }}
        </text>
      </g>
      <g v-else-if="isSuccess" :transform="`translate(${center}, ${labelY})`">
        <circle :r="iconR" :fill="colorSuccess" />
        <path :d="successPath" fill="none" stroke="#fff" :stroke-width="iconStroke" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <g v-else-if="isWarning" :transform="`translate(${center}, ${labelY})`">
        <circle :r="iconR" :fill="colorWarning" />
        <line :x1="0" :y1="-iconR*0.5" :x2="0" :y2="iconR*0.15" stroke="#fff" :stroke-width="iconStroke" stroke-linecap="round" />
        <circle :r="iconStroke*0.7" :cx="0" :cy="iconR*0.55" fill="#fff" />
      </g>
      <g v-else-if="isError" :transform="`translate(${center}, ${labelY})`">
        <circle :r="iconR" :fill="colorError" />
        <line :x1="-iconR*0.5" :y1="-iconR*0.5" :x2="iconR*0.5" :y2="iconR*0.5" stroke="#fff" :stroke-width="iconStroke" stroke-linecap="round" />
        <line :x1="iconR*0.5" :y1="-iconR*0.5" :x2="-iconR*0.5" :y2="iconR*0.5" stroke="#fff" :stroke-width="iconStroke" stroke-linecap="round" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 180 },
  strokeWidth: { type: Number, default: 12 },
  dashboard: { type: Boolean, default: false },
  showLabel: { type: Boolean, default: false },
  status: { type: String, default: 'in-progress' }, // success | warning | error | in-progress
  linecap: { type: String, default: 'round' },
  color: { type: String, default: null },
  calibration: { type: Number, default: 1 },
})
const emit = defineEmits(['update:value'])

const animated = ref(0)

onMounted(() => {
  animated.value = clamp(props.value)
})

watch(() => props.value, (nv, ov) => {
  animateValue(ov ?? 0, nv)
})

function animateValue(from, to) {
  const start = performance.now()
  const dur = 450
  const diff = clamp(to) - clamp(from)
  const base = clamp(from)
  const ease = t => 1 - Math.pow(1 - t, 3)

  function frame(now) {
    const t = Math.min(1, (now - start) / dur)
    animated.value = base + diff * ease(t)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function clamp(v) { return Math.max(0, Math.min(100, v || 0)) }

const center = computed(() => props.size / 2)
const pad = computed(() => Math.max(4, props.strokeWidth * 0.6))
const radius = computed(() => center.value - props.strokeWidth / 2 - pad.value)
const circumference = computed(() => 2 * Math.PI * radius.value)

const viewBox = computed(() => `0 0 ${props.size} ${props.size}`)
const startAngle = computed(() => props.dashboard ? 135 : -90)
const endAngle = computed(() => props.dashboard ? 45 : 270)
const sweepAngle = computed(() => {
  const raw = (endAngle.value - startAngle.value + 360) % 360
  return raw === 0 ? 360 : raw
})

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const trackPath = computed(() => {
  const cx = center.value, cy = center.value, r = radius.value
  const sa = startAngle.value
  const full = sweepAngle.value >= 359.999
  const ea = full ? sa + 359.999 : endAngle.value
  const start = polarToCartesian(cx, cy, r, sa)
  const end = polarToCartesian(cx, cy, r, ea)
  const largeArc = sweepAngle.value <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
})

const svgTransform = computed(() => '')

const progressRatio = computed(() => clamp(animated.value) / 100)
const arcLength = computed(() => circumference.value * (sweepAngle.value / 360))
const dashArray = computed(() => {
  const k = Number.isFinite(props.calibration) ? props.calibration : 1
  const r = Math.min(1, Math.max(0, progressRatio.value * k))
  return `${arcLength.value * r} ${arcLength.value}`
})
const dashOffset = computed(() => arcLength.value * (1 - progressRatio.value))

const gradientId = `grad-${Math.random().toString(36).slice(2)}`
const shadowId = `shadow-${Math.random().toString(36).slice(2)}`

// Цвет трека и подписи
const trackColor = computed(() => ({
  'success': '#ecfdf5',
  'warning': '#fffbeb',
  'error': '#fef2f2',
  'in-progress': '#eff6ff'
}[props.status] || '#f1f5f9'))
const labelColor = computed(() => ({
  'success': '#065f46',
  'warning': '#92400e',
  'error': '#991b1b',
  'in-progress': '#334155'
}[props.status] || '#334155'))

// Плавный переход цвета от красного к зеленому оставлен на будущее — сейчас используем сплошные «матовые» цвета
function lerp(a, b, t) { return a + (b - a) * t }
function hslToHex(h, s, l) {
  // конвертация HSL -> HEX
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const startColor = computed(() => hslToHex(0, 0, 90))
const endColor = computed(() => hslToHex(0, 0, 85))

// Общая пастельная палитра (умеренная насыщенность)
const baseS = 52
const baseL = 62
const colorSuccess = computed(() => hslToHex(120, baseS, baseL))
const colorWarning = computed(() => hslToHex(48, baseS, baseL))
const colorError = computed(() => hslToHex(0, baseS, baseL))

const progressStroke = computed(() => {
  if (props.color) return props.color
  if (props.status === 'in-progress') {
    const hue = lerp(0, 120, progressRatio.value)
    // Плавный переход с более низкой насыщенностью (чуть тусклее)
    return hslToHex(hue, baseS, baseL)
  }
  if (props.status === 'success') return colorSuccess.value
  if (props.status === 'warning') return colorWarning.value
  if (props.status === 'error') return colorError.value
  return hslToHex(210, baseS, baseL)
})
const labelY = computed(() => props.dashboard ? center.value : center.value)
const displayLabel = computed(() => `${Math.round(animated.value)}%`)

// Состояния и иконки
const isInProgress = computed(() => props.status === 'in-progress')
const isSuccess = computed(() => props.status === 'success')
const isWarning = computed(() => props.status === 'warning')
const isError = computed(() => props.status === 'error')

const iconR = computed(() => props.size * (props.dashboard ? 0.09 : 0.11))
const iconStroke = computed(() => Math.max(2, Math.round(props.size * 0.04)))
const successPath = computed(() => {
  const r = iconR.value
  const p1x = -r * 0.45, p1y = -r * 0.05
  const p2x = -r * 0.1, p2y = r * 0.35
  const p3x = r * 0.5, p3y = -r * 0.35
  return `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}`
})
</script>

<style scoped>
.circle-progress { display:inline-block; }
svg { display:block; }
</style>