import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '护眼助手',
    description: '色温滤镜、暗色模式、休息提醒，全方位保护你的眼睛',
    permissions: ['storage', 'alarms', 'activeTab'],
  },
});
