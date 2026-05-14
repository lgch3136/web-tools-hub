// === 在线工具集 - 路由器（多语言支持）===
import { t, getLang, setLang, onLangChange, translateDOM } from './i18n.js';
import { render as renderMdHtml } from './tools/md-html.js';
import { render as renderExchangeRate } from './tools/exchange-rate.js';

const pageHome      = document.getElementById('pageHome');
const toolContainer = document.getElementById('toolContainer');
const topbarTitle   = document.getElementById('topbarTitle');
const topbarBack    = document.getElementById('topbarBack');
const topbarHome    = document.getElementById('topbarHome');
const langSwitch    = document.getElementById('langSwitch');

// 工具注册表（静态导入，无动态import问题）
const tools = {
  'md-html':        { titleKey: 'tool.mdhtml.title',    render: renderMdHtml },
  'exchange-rate':  { titleKey: 'tool.exchange.title',  render: renderExchangeRate },
};

let currentTool = null;

// ===== 路由 =====
function route() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (hash === 'home') { showHome(); return; }

  const tool = tools[hash];
  if (tool) { showTool(hash, tool); }
  else { window.location.hash = 'home'; }
}

function showHome() {
  pageHome.classList.remove('hidden');
  toolContainer.classList.add('hidden');
  toolContainer.innerHTML = '';
  topbarTitle.textContent = '';
  topbarBack.classList.add('hidden');
  topbarHome.classList.remove('hidden');
  langSwitch.classList.remove('hidden');
  currentTool = null;
  translateDOM(); // 翻译首页静态文本
}

async function showTool(name, tool) {
  if (currentTool === name) return;
  currentTool = name;

  pageHome.classList.add('hidden');
  toolContainer.classList.remove('hidden');
  topbarTitle.textContent = t(tool.titleKey);
  topbarBack.classList.remove('hidden');
  topbarHome.classList.add('hidden');
  document.title = t(tool.titleKey) + ' - ' + t('site.name').replace('🔧 ', '');

  toolContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#484f58;font-size:.9rem;">${t('loading')}</div>`;

  try {
    toolContainer.innerHTML = '';
    if (tool.render) {
      tool.render(toolContainer);
    }
  } catch (err) {
    console.error(err);
    toolContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#f85149;">${t('load.error')}${err.message}</div>`;
  }
}

// 监听 hash 变化
window.addEventListener('hashchange', route);

// ===== 语言切换 =====
langSwitch.addEventListener('click', () => {
  const newLang = getLang() === 'zh' ? 'en' : 'zh';
  setLang(newLang);
});

// 语言变化时重新渲染当前页面
onLangChange((lang) => {
  // 更新语言按钮文字
  langSwitch.textContent = t('lang.switch');

  if (currentTool) {
    // 重新渲染当前工具（先重置 currentTool 以绕过 showTool 的去重检查）
    const name = currentTool;
    currentTool = null;
    const tool = tools[name];
    if (tool) showTool(name, tool);
  } else {
    // 首页 - 翻译静态文本
    translateDOM();
    document.title = t('site.title');
  }

  // 刷新 AdSense
  setTimeout(() => {
    if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
      window.adsbygoogle.push({});
    }
  }, 200);
});

// ===== 初始加载 =====
// 同步语言按钮
langSwitch.textContent = t('lang.switch');
translateDOM();
route();

// ===== AdSense 路由切换时刷新 =====
window.addEventListener('hashchange', () => {
  setTimeout(() => {
    if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
      window.adsbygoogle.push({});
    }
  }, 200);
});
