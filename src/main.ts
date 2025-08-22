import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './examples/App.vue'
import YlySearchViewer from './index'
import './styles/index.css'

const app = createApp(App)

app.use(ElementPlus)
app.use(YlySearchViewer)

app.mount('#app')