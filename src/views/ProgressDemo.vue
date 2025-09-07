<template>
  <section class="page">
    <h2>Круговой прогресс-бар (SVG)</h2>
    <div class="grid">
      <div class="preview">
        <CircleProgress
          v-model:value="value"
          :status="status"
          :size="220"
          :stroke-width="12"
          :dashboard="dashboard"
          :show-label="true"
        />
      </div>
      <div class="controls">
        <label>
          Значение: {{ Math.round(value) }}%
          <input type="range" min="0" max="100" step="1" v-model.number="value" :disabled="status === 'error'" />
        </label>
        <label>
          Статус:
          <select v-model="status">
            <option value="in-progress">in-progress</option>
            <option value="success">success</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </select>
        </label>
        <label class="row">
          <input type="checkbox" v-model="dashboard" /> Режим dashboard
        </label>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import CircleProgress from '../components/CircleProgress.vue'

const value = ref(45)
const status = ref('in-progress')
const dashboard = ref(false)

// Автологика статусов
watch(value, (nv, ov) => {
  // Автопереключение в success при достижении 100 в режиме in-progress
  if (status.value === 'in-progress' && nv >= 100) {
    value.value = 100
    status.value = 'success'
    return
  }
  // Возврат в in-progress, если из success начали уменьшать
  if (status.value === 'success' && nv < 100) {
    status.value = 'in-progress'
  }
  // В error значение не должно меняться с бегунка — он задизейблен; на всякий случай фиксируем
  if (status.value === 'error' && nv !== ov) {
    value.value = ov
  }
})

watch(status, (nv) => {
  if (nv === 'success') {
    value.value = 100
  }
  // В остальных режимах значение не трогаем
})
</script>

<style scoped>
.page { display: grid; gap: 16px; }
.grid { display: grid; gap: 24px; grid-template-columns: 1fr; }
.preview { display:flex; align-items:center; justify-content:center; padding: 24px; border:1px solid #eee; border-radius:12px; }
.controls { display:grid; gap: 12px; align-content:start; }
label { display:grid; gap: 8px; }
.row { display:flex; align-items:center; gap:8px; }

@media (min-width: 900px) {
  .grid { grid-template-columns: 1fr 320px; }
}
</style>