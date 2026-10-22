<script setup lang="ts">
import { computed } from 'vue'
import { useRecordsStore } from '../stores/records'

const store = useRecordsStore()

const counts = computed(() => ({
  total: store.records.length,
  manual: store.records.filter((item) => item.source === 'manual').length,
  parsed: store.records.filter((item) => item.source === 'parsed').length,
}))

const appVersion = '1.1'
</script>

<template>
  <div class="profile">
    <van-nav-bar title="我的" />

    <div class="profile__card m-rise" style="--i: 0">
      <div class="profile__avatar">账</div>
      <div>
        <p class="profile__name">随手记账</p>
        <p class="profile__desc">本地存储 · 数据不上云</p>
      </div>
    </div>

    <van-cell-group inset class="m-rise" style="--i: 1">
      <van-cell title="记录总数" :value="`${counts.total} 条`" />
      <van-cell title="手动记账" :value="`${counts.manual} 条`" />
      <van-cell title="智能解析" :value="`${counts.parsed} 条`" />
      <van-cell title="版本" :value="appVersion" />
    </van-cell-group>
  </div>
</template>

<style scoped>
.profile {
  min-height: 100vh;
  background: #f7f8fa;
}

.profile__card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px;
  padding: 20px 16px;
  border-radius: 12px;
  background: #fff;
}

.profile__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4a7cf6, #2f5bd8);
}

.profile__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.profile__desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8a8f99;
}
</style>
