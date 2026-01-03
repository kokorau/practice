import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { vClickOutside } from './directives'

const app = createApp(App)
app.directive('click-outside', vClickOutside)
app.use(router)
app.mount('#app')
