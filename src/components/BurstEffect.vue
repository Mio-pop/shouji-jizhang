<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const active = ref(false)
let timer: number | undefined

/** 保存成功时的轻量庆祝效果：朱红「已记」印章 */
function burst(): void {
  active.value = false
  requestAnimationFrame(() => {
    active.value = true
  })
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    active.value = false
  }, 900)
}

onBeforeUnmount(() => window.clearTimeout(timer))
defineExpose({ burst })
</script>

<template>
  <div v-if="active" class="burst" aria-hidden="true">
    <span class="burst__ring" />
    <span class="burst__label">已记</span>
    <span v-for="index in 12" :key="index" class="burst__dot" :style="{ '--i': index }" />
  </div>
</template>

<style scoped>
.burst {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 3000;
  pointer-events: none;
}

.burst__ring {
  position: absolute;
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  border-radius: 50%;
  border: 2px solid rgba(74, 124, 246, 0.55);
  animation: burst-ring 620ms ease-out forwards;
}

.burst__dot {
  position: absolute;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #4a7cf6;
  box-shadow: 0 0 10px rgba(74, 124, 246, 0.55);
  animation: burst-dot 780ms cubic-bezier(0.16, 0.84, 0.44, 1) forwards;
  --angle: calc(var(--i) * 30deg);
  transform: rotate(var(--angle)) translateY(0);
}

.burst__dot:nth-child(3n) {
  background: #07c160;
  box-shadow: 0 0 10px rgba(7, 193, 96, 0.5);
}

.burst__dot:nth-child(3n + 1) {
  background: #ffb020;
  box-shadow: 0 0 10px rgba(255, 176, 32, 0.5);
}

@keyframes burst-ring {
  from {
    opacity: 0.9;
    transform: scale(0.4);
  }
  to {
    opacity: 0;
    transform: scale(1.6);
  }
}

@keyframes burst-dot {
  0% {
    opacity: 1;
    transform: rotate(var(--angle)) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(-92px) scale(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .burst {
    display: none;
  }
}
</style>
