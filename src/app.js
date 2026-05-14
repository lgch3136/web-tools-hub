// === 在线工具集 - 路由器 ===

const pageHome     = document.getElementById('pageHome');
const toolContainer = document.getElementById('toolContainer');
const topbarTitle  = document.getElementById('topbarTitle');
const topbarBack   = document.getElementById('topbarBack');
const topbarHome   = document.getElementById('topbarHome');

// 工具注册表
const tools = {
  'md-html': { title: '📄 MD ↔ HTML 转换器', module: () => import('./tools/md-html.js') },
  'exchange-rate': { title: '💱 实时汇率换算', module: () => import('./tools/exchange-rate.js') },
};

// 当前加载的工具名（避免重复加载）
let currentTool = null;

// ===== 路由 =====
function route() {
  const hash = window.location.hash.replace('#', '') || 'home';

  if (hash === 'home') {
    showHome();
    return;
  }

  const tool = tools[hash];
  if (tool) {
    showTool(hash, tool);
  } else {
    // 未知路由 → 回首页
    window.location.hash = 'home';
  }
}

function showHome() {
  pageHome.classList.remove('hidden');
  toolContainer.classList.add('hidden');
  toolContainer.innerHTML = '';
  topbarTitle.textContent = '';
  topbarBack.classList.add('hidden');
  topbarHome.classList.remove('hidden');
  currentTool = null;
  document.title = '在线工具集 - Markdown转换 | 汇率换算';
}

async function showTool(name, tool) {
  if (currentTool === name) return; // 已加载
  currentTool = name;

  pageHome.classList.add('hidden');
  toolContainer.classList.remove('hidden');
  topbarTitle.textContent = tool.title;
  topbarBack.classList.remove('hidden');
  topbarHome.classList.add('hidden');
  document.title = tool.title + ' - 在线工具集';

  // 显示加载状态
  toolContainer.innerHTML = '<div style="text-align:center;padding:60px;color:#484f58;font-size:.9rem;">加载中...</div>';

  try {
    const mod = await tool.module();
    // 工具模块导出 render(container) 函数
    toolContainer.innerHTML = '';
    if (mod.render) {
      mod.render(toolContainer);
    }
  } catch (err) {
    console.error('加载工具失败:', err);
    toolContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#f85149;">加载失败: ${err.message}</div>`;
  }
}

// 监听 hash 变化
window.addEventListener('hashchange', route);

// 初始路由
route();

// ===== 首页广告刷新 =====
// 路由切换后重新初始化 AdSense
window.addEventListener('hashchange', () => {
  setTimeout(() => {
    if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
      window.adsbygoogle.push({});
    }
  }, 100);
});

// Toast
function toast(msg, dur = 2000) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), dur);
}
