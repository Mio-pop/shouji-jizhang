<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

/** Tab 顺序决定转场方向：向右切换是推入，向左切换是拉回 */
const ORDER = ['/', '/parse', '/record', '/stats', '/profile']
const transitionName = ref('m-push')
const router = useRouter()

router.beforeEach((to, from) => {
  const fromIndex = ORDER.indexOf(from.path)
  const toIndex = ORDER.indexOf(to.path)
  if (fromIndex === -1 || toIndex === -1) return
  transitionName.value = toIndex > fromIndex ? 'm-push' : 'm-pull'
})
</script>

<template>
  <div class="app">
    <main class="app__main">
      <RouterView v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>

    <van-tabbar route fixed placeholder safe-area-inset-bottom active-color="#4a7cf6">
      <van-tabbar-item replace to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item replace to="/parse" icon="search">解析</van-tabbar-item>
      <van-tabbar-item replace to="/record" icon="plus">记账</van-tabbar-item>
      <van-tabbar-item replace to="/stats" icon="bar-chart-o">统计</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f7f8fa;
}

.app__main {
  padding-bottom: 8px;
}
</style>
