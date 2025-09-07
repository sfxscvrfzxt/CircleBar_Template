<template>
  <div class="app">
    <header class="app__header">
      <h1>Тестовое задание</h1>
      <nav>
        <router-link to="/progress">Прогресс-бар</router-link>
        <router-link to="/chart">Круговая диаграмма</router-link>
      </nav>
    </header>
    <main class="app__main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  gap: 12px;
  border-bottom: 1px solid #eee;
}
nav {
  display: flex;
  gap: 12px;
}
nav a {
  padding: 8px 12px;
  border-radius: 8px;
  color: #1f2937;
}
nav a.router-link-active {
  background: #eef2ff;
  color: #4338ca;
}
.app__main {
  padding: 16px;
  flex: 1;
}
</style>
