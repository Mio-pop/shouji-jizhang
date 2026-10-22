import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import { isFancy } from './motion'
import './style.css'

document.documentElement.dataset.motion = isFancy ? 'fancy' : 'simple'
// 纸账本皮肤只在华丽构建里启用，简约版保持原有浅色界面
if (isFancy) document.documentElement.dataset.theme = 'paper'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')
