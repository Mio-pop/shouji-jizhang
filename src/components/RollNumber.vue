<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  decimals?: number
}>()

const text = computed(() => props.value.toFixed(props.decimals ?? 2))
const chars = computed(() => text.value.split(''))
</script>

<template>
  <span class="roll">
    <template v-for="(char, index) in chars" :key="`${index}-${chars.length}`">
      <span v-if="/\d/.test(char)" class="roll__digit">
        <span class="roll__reel" :style="{ transform: `translateY(-${char}em)` }">
          <span v-for="digit in 10" :key="digit" class="roll__cell">{{ digit - 1 }}</span>
        </span>
      </span>
      <span v-else class="roll__static">{{ char }}</span>
    </template>
  </span>
</template>

<style scoped>
.roll {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.roll__digit {
  position: relative;
  display: inline-block;
  width: 1ch;
  height: 1em;
  overflow: hidden;
}

.roll__reel {
  display: block;
  transition: transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.roll__cell {
  display: block;
  height: 1em;
  line-height: 1;
  text-align: center;
}

.roll__static {
  display: inline-block;
  margin: 0 -0.06em;
}
</style>
