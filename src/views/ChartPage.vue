<template>
  <section class="page">
    <h2>Круговая диаграмма (Chart.js)</h2>
    <div class="layout">
      <div class="chart">
        <canvas ref="canvas" />
      </div>
      <div class="form">
        <div class="add-panel">
          <div class="picker">
            <Sketch v-model="form.color" />
          </div>
          <div class="fields">
            <label>
              Наименование
              <input v-model.trim="form.name" required placeholder="Название сегмента" />
            </label>
            <button class="add-btn" type="button" @click="submit" :disabled="!form.name">Добавить</button>
          </div>
        </div>

        <div class="sliders" v-if="items.length">
          <div v-for="(item, idx) in items" :key="item.id" class="slider-item">
            <div class="header">
              <div class="title">
                <span class="name">{{ item.name }}</span>
                <span class="percent">{{ Math.round(percentOf(idx)) }}%</span>
              </div>
              <button class="small danger" type="button" @click="remove(idx)">Удалить</button>
            </div>
            <input
              class="range colored"
              type="range"
              min="0"
              max="100"
              :value="Math.round(percentOf(idx))"
               @input="onPercentInput(idx, $event)"
               :style="sliderStyle(idx)"
               :disabled="items.length <= 1"
            />
            <label class="pair" v-if="items.length > 1">
              Вмещает из:
              <select v-model="pairWith[item.id]">
                <option v-for="it in items.filter((_, j) => j !== idx)" :key="it.id" :value="it.id">{{ it.name }}</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, reactive } from 'vue'
import { Chart, registerables } from 'chart.js'
import { Sketch } from '@ckpack/vue-color'

Chart.register(...registerables)

const canvas = ref(null)
let chart

const items = ref([
  { id: crypto.randomUUID(), name: 'A', value: 30, color: '#60a5fa' },
  { id: crypto.randomUUID(), name: 'B', value: 20, color: '#f59e0b' },
])

const form = ref({ name: '', color: '#10b981' })

// Карта пар для смещения: ключ — id сегмента, значение — id сегмента-донора/получателя
const pairWith = reactive({})

const colorHex = computed(() => {
  const c = form.value.color
  if (!c) return '#10b981'
  if (typeof c === 'string') return c
  if (typeof c === 'object') return c.hex || c.hex8 || '#10b981'
  return '#10b981'
})

function submit() {
  const normalized = {
    name: form.value.name,
    value: 10, // начальное значение, регулируется бегунком ниже
    color: colorHex.value,
  }
  items.value.push({ id: crypto.randomUUID(), ...normalized })
  // назначаем дефолтную пару для нового элемента
  const newItem = items.value[items.value.length - 1]
  const other = items.value.find(i => i.id !== newItem.id)
  if (other) pairWith[newItem.id] = other.id

  form.value = { name: '', color: '#10b981' }
}

function remove(i) {
  const removed = items.value[i]
  items.value.splice(i, 1)
  if (removed) {
    delete pairWith[removed.id]
    // переназначаем пары, которые указывали на удалённый элемент
    const ids = new Set(items.value.map(it => it.id))
    for (const key in pairWith) {
      if (!ids.has(pairWith[key]) || key === pairWith[key]) {
        const fallback = items.value.find(it => it.id !== key)
        if (fallback) pairWith[key] = fallback.id
        else delete pairWith[key]
      }
    }
  }
}

const total = computed(() => items.value.reduce((s, i) => s + (Number(i.value) || 0), 0))
function percentOf(i) {
  const t = total.value
  if (!t) return 0
  return (items.value[i].value / t) * 100
}

function sliderStyle(idx) {
  const val = Math.max(0, Math.min(100, Math.round(percentOf(idx)) || 0))
  const color = items.value[idx]?.color || '#3b82f6'
  return {
    '--bar-color': color,
    background: `linear-gradient(90deg, ${color} 0%, ${color} ${val}%, #e5e7eb ${val}%, #e5e7eb 100%)`,
  }
}

function getPairIndex(idx) {
  const list = items.value
  if (list.length < 2) return -1
  const self = list[idx]
  const targetId = pairWith[self.id]
  let j = list.findIndex(it => it.id === targetId && it.id !== self.id)
  if (j === -1) {
    j = (idx + 1) % list.length
    if (j === idx) return -1
    // принудительно исправляем неверную пару (self или отсутствующий сегмент)
    pairWith[self.id] = list[j].id
  }
  return j
}

function onPercentInput(idx, evt) {
  let p = 0
  if (evt && evt.target && typeof evt.target.value !== 'undefined') {
    p = Number(evt.target.value)
  } else {
    p = Number(evt)
  }
  if (Number.isNaN(p)) return
  p = Math.max(0, Math.min(100, p))

  const S = total.value
  if (S <= 0) return

  const j = getPairIndex(idx)
  if (j === -1) return

  const xi = Number(items.value[idx].value) || 0
  const xj = Number(items.value[j].value) || 0

  const rDesired = p / 100
  const rMax = (xi + xj) / S
  const r = Math.min(Math.max(0, rDesired), rMax)

  let xiNew = r * S
  let delta = xiNew - xi
  let xjNew = xj - delta

  // Защита от погрешностей: держим сумму постоянной
  if (xjNew < 0) {
    xjNew = 0
    xiNew = xi + xj - xjNew
  }

  items.value[idx].value = xiNew
  items.value[j].value = xjNew
}

function createChart() {
  const ctx = canvas.value.getContext('2d')
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: items.value.map(i => i.name),
      datasets: [{ data: items.value.map(i => i.value), backgroundColor: items.value.map(i => i.color), borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, animation: { duration: 250 } }
  })
}

function syncChart() {
  if (!chart) return
  const next = items.value
  const ds = chart.data.datasets[0]

  // Приводим длины массивов (минимальные мутации вместо полной замены)
  while (chart.data.labels.length > next.length) { chart.data.labels.pop(); ds.data.pop(); ds.backgroundColor.pop() }
  while (chart.data.labels.length < next.length) { chart.data.labels.push(''); ds.data.push(0); ds.backgroundColor.push('#ffffff') }

  // Обновляем значения по индексам
  for (let i = 0; i < next.length; i++) {
    chart.data.labels[i] = next[i].name
    ds.data[i] = next[i].value
    ds.backgroundColor[i] = next[i].color
  }

  chart.update('none') // без анимации и мерцаний
}

onMounted(() => { createChart(); syncChart() })

onBeforeUnmount(() => { if (chart) { chart.destroy(); chart = null } })

watch(items, () => syncChart(), { deep: true })
</script>

<style scoped>
.page { display:grid; gap:16px; }
.layout { display:grid; gap:24px; grid-template-columns: 1fr; }
.layout > * { min-width: 0; }
.chart { display:flex; align-items:center; justify-content:center; width: min(600px, 100%); aspect-ratio: 1 / 1; box-sizing: border-box; padding-top: 8px; border:1px solid #eee; border-radius:12px; }
.chart canvas { width: min(560px, 100%); aspect-ratio: 1 / 1; height: auto; }
.form { display:grid; gap:16px; align-content:start; }

.add-panel { display:grid; grid-template-columns: auto 1fr; gap:12px; align-items:start; }
.picker { position: relative; z-index: 0; }
.fields { display:grid; gap:8px; align-content:start; }
.add-btn { width: fit-content; }

.sliders { display:grid; gap:12px; }
.slider-item { display:grid; gap:6px; }
.slider-item .header { display:flex; align-items:center; justify-content:space-between; }
.slider-item .title { display:flex; align-items:baseline; gap:8px; }
.slider-item .name { font-weight: 600; }
.slider-item .percent { color:#6b7280; font-size: 0.9em; }

.pair { display:flex; align-items:center; gap:8px; font-size: 0.85em; color:#374151; }
.pair select { padding:4px 6px; border:1px solid #e5e7eb; border-radius:6px; background:white; }

.range.colored { -webkit-appearance: none; appearance: none; height: 10px; border-radius: 999px; background: #e5e7eb; border: none; }
.range.colored:focus { outline: none; }
/* WebKit thumb */
.range.colored::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #111827; border: 2px solid #fff; box-shadow: 0 0 0 1px #d1d5db; cursor: pointer; }
/* Firefox track/progress */
.range.colored::-moz-range-track { height: 10px; border-radius: 999px; background: #e5e7eb; }
.range.colored::-moz-range-progress { height: 10px; border-radius: 999px; background: var(--bar-color, #3b82f6); }
.range.colored::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #111827; border: 2px solid #fff; box-shadow: 0 0 0 1px #d1d5db; cursor: pointer; }

button { padding:8px 12px; border-radius:8px; border:1px solid #e5e7eb; background:white; cursor:pointer; }
button:hover { background:#f9fafb; }
button.danger { color:#b91c1c; border-color:#fecaca; }
button.small { padding:4px 8px; font-size: 12px; }

@media (min-width: 1016px) {
  .layout { grid-template-columns: 1fr minmax(320px, 360px); }
}
</style>