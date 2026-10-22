<script setup lang="ts">
defineProps<{
  title?: string
  desc?: string
}>()
</script>

<template>
  <div class="empty-state">
    <svg class="empty-state__art" viewBox="0 0 160 132" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="120" rx="46" ry="6" fill="#e6dfcd" />
      <rect x="38" y="12" width="84" height="100" fill="#FDFAF1" stroke="#2B2B26" stroke-width="2" />
      <line x1="50" y1="22" x2="50" y2="102" stroke="#A8332A" stroke-width="2" />
      <line x1="58" y1="34" x2="112" y2="34" stroke="#D8D0BE" stroke-width="2" />
      <line x1="58" y1="48" x2="112" y2="48" stroke="#D8D0BE" stroke-width="2" />
      <line x1="58" y1="62" x2="104" y2="62" stroke="#D8D0BE" stroke-width="2" />
      <line x1="58" y1="76" x2="112" y2="76" stroke="#D8D0BE" stroke-width="2" />
      <line x1="58" y1="90" x2="96" y2="90" stroke="#D8D0BE" stroke-width="2" />
      <circle cx="110" cy="94" r="15" stroke="#A8332A" stroke-width="2" opacity="0.85" />
      <text
        x="110"
        y="99"
        text-anchor="middle"
        font-size="11"
        font-family="'Songti SC', 'SimSun', serif"
        fill="#A8332A"
        opacity="0.9"
      >账</text>
    </svg>
    <p v-if="title" class="empty-state__title">{{ title }}</p>
    <p v-if="desc" class="empty-state__desc">{{ desc }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 0 14px;
  text-align: center;
}

.empty-state__art {
  width: 132px;
  height: 110px;
}

.empty-state__title {
  margin: 10px 0 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--paper-ink, #2b2b26);
}

.empty-state__desc {
  margin: 6px 0 0;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: var(--paper-muted, #6b6355);
}
</style>
