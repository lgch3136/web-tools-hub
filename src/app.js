// === Practical Tools - 路由器（多语言支持）===
// 当前架构：独立 HTML 页面（非 SPA）
// 每个工具页是独立的 .html 文件，各自内嵌工具逻辑
// 本模块提供 i18n 工具函数，供工具页面按需导入

import { t, getLang, setLang, onLangChange, translateDOM } from './i18n.js';

// 暴露到全局，方便工具页面 inline script 中使用
window.__i18n = { t, getLang, setLang, onLangChange, translateDOM };

// ===== 语言切换（通用）=====
document.addEventListener('DOMContentLoaded', () => {
  const langSwitch = document.getElementById('langSwitch');
  if (langSwitch) {
    langSwitch.textContent = t('lang.switch');
    langSwitch.addEventListener('click', () => {
      const newLang = getLang() === 'zh' ? 'en' : 'zh';
      setLang(newLang);
      langSwitch.textContent = t('lang.switch');
      translateDOM();

    });
  }
});

// 语言变化监听
onLangChange((lang) => {
  document.title = t('site.title');
  translateDOM();
});
