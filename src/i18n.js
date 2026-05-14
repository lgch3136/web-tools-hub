// === i18n 国际化模块 ===
// 支持中文(zh) / English(en) 切换

const translations = {

  // ===== 通用 =====
  'site.title':            { zh: '在线工具集 - Markdown转换 | 汇率换算', en: 'Web Tools - Markdown Converter | Exchange Rate' },
  'site.name':             { zh: '🔧 在线工具集', en: '🔧 Web Tools' },
  'back.home':             { zh: '← 返回首页', en: '← Back Home' },
  'loading':               { zh: '加载中...', en: 'Loading...' },
  'load.error':            { zh: '加载失败: ', en: 'Load failed: ' },

  // ===== 首页 Hero =====
  'hero.title':            { zh: '🛠️ 在线工具集', en: '🛠️ Web Tools' },
  'hero.desc':             { zh: '实用开发与办公工具 · 免费 · 无需安装 · 即开即用', en: 'Practical dev & office tools · Free · No install · Ready to use' },
  'hero.stat1':            { zh: '🔒 数据本地处理', en: '🔒 Local processing' },
  'hero.stat2':            { zh: '⚡ 实时响应', en: '⚡ Real-time' },
  'hero.stat3':            { zh: '📱 移动端适配', en: '📱 Mobile friendly' },

  // ===== 首页工具卡片 =====
  'tool.mdhtml.title':     { zh: 'MD ↔ HTML 转换器', en: 'MD ↔ HTML Converter' },
  'tool.mdhtml.desc':      { zh: 'Markdown 与 HTML 双向转换，支持富媒体编辑、图片粘贴、表格插入。导出 PDF / Word / HTML / MD / TXT。', en: 'Bidirectional Markdown ↔ HTML converter with rich media editing, image paste, tables. Export to PDF / Word / HTML / MD / TXT.' },
  'tool.mdhtml.tag1':      { zh: '编辑器', en: 'Editor' },
  'tool.mdhtml.tag2':      { zh: '格式转换', en: 'Converter' },

  'tool.exchange.title':   { zh: '实时汇率换算', en: 'Exchange Rate' },
  'tool.exchange.desc':    { zh: '全球 30+ 主流货币实时汇率转换，数据来源欧洲央行，支持快捷金额计算。', en: 'Real-time exchange rates for 30+ currencies, powered by ECB data. Quick amount presets.' },
  'tool.exchange.tag1':    { zh: '金融', en: 'Finance' },
  'tool.exchange.tag2':    { zh: '实时数据', en: 'Live Data' },

  'tool.coming.title':     { zh: '更多工具即将上线', en: 'More Tools Coming' },
  'tool.coming.desc':      { zh: '时间戳转换、JSON 格式化、Base64 编解码、颜色转换、二维码生成…', en: 'Timestamp converter, JSON formatter, Base64, color converter, QR code…' },
  'tool.coming.tag':       { zh: '敬请期待', en: 'Coming soon' },

  'footer.text':           { zh: '© 2026 在线工具集 · 数据仅本地处理，不上传服务器', en: '© 2026 Web Tools · All data processed locally, never uploaded' },

  // ===== MD-HTML 工具 =====
  'mdhtml.import':         { zh: '📥 导入', en: '📥 Import' },
  'mdhtml.export':         { zh: '📤 导出', en: '📤 Export' },
  'mdhtml.clear':          { zh: '🗑️ 清空', en: '🗑️ Clear' },
  'mdhtml.intro':          { zh: '# 欢迎使用 MD ↔ HTML 转换器\n\n输入 Markdown 后点击 **→转HTML** 即可在右侧看到预览效果！\n\n> 支持富媒体编辑 · 粘贴图片 · 导入导出多种格式', en: '# Welcome to MD ↔ HTML Converter\n\nType Markdown and click **→HTML** to see the preview on the right!\n\n> Rich media editing · Paste images · Import/Export multiple formats' },
  'mdhtml.md_label':       { zh: '📝 Markdown', en: '📝 Markdown' },
  'mdhtml.html_label':     { zh: '🌐 HTML', en: '🌐 HTML' },
  'mdhtml.view':           { zh: '阅读', en: 'View' },
  'mdhtml.source':         { zh: '源码', en: 'Source' },
  'mdhtml.to_html':        { zh: '转HTML', en: '→HTML' },
  'mdhtml.to_md':          { zh: '转MD', en: '←MD' },
  'mdhtml.md_placeholder': { zh: '输入 Markdown 源码…', en: 'Type Markdown source…' },
  'mdhtml.html_placeholder': { zh: '<h1>输入 HTML 源码…</h1>', en: '<h1>Type HTML source…</h1>' },
  'mdhtml.md_render_ph':   { zh: '输入 Markdown，或粘贴图片…', en: 'Type Markdown, or paste images…' },
  'mdhtml.html_render_ph': { zh: '右侧显示 HTML 渲染结果…', en: 'HTML preview shows here…' },
  'mdhtml.import.fmt_md':  { zh: '📝 Markdown', en: '📝 Markdown' },
  'mdhtml.import.fmt_html':{ zh: '🌐 HTML', en: '🌐 HTML' },
  'mdhtml.import.fmt_txt': { zh: '📃 纯文本', en: '📃 Plain Text' },
  'mdhtml.import.fmt_word':{ zh: '📘 Word', en: '📘 Word' },
  'mdhtml.export.fmt_pdf': { zh: '📄 PDF', en: '📄 PDF' },
  'mdhtml.export.fmt_word':{ zh: '📘 Word', en: '📘 Word' },
  'mdhtml.export.fmt_html':{ zh: '🌐 HTML', en: '🌐 HTML' },
  'mdhtml.export.fmt_md':  { zh: '📝 Markdown', en: '📝 Markdown' },
  'mdhtml.export.fmt_txt': { zh: '📃 纯文本', en: '📃 Plain Text' },
  'mdhtml.modal.ok':       { zh: '确定', en: 'OK' },
  'mdhtml.modal.cancel':   { zh: '取消', en: 'Cancel' },
  'mdhtml.modal.title':    { zh: '弹窗', en: 'Dialog' },
  'mdhtml.modal.link':     { zh: '🔗 插入链接', en: '🔗 Insert Link' },
  'mdhtml.modal.link_text':{ zh: '链接文字', en: 'Link text' },
  'mdhtml.modal.link_url': { zh: 'https://…', en: 'https://…' },
  'mdhtml.modal.code':     { zh: '💻 插入代码块', en: '💻 Insert Code' },
  'mdhtml.modal.code_lang':{ zh: '语言 (js/python/…)', en: 'Language (js/python/…)' },
  'mdhtml.modal.code_ph':  { zh: '输入代码…', en: 'Type code…' },
  'mdhtml.modal.image':    { zh: '🖼️ 插入图片', en: '🖼️ Insert Image' },
  'mdhtml.modal.table':    { zh: '📊 插入表格', en: '📊 Insert Table' },
  'mdhtml.modal.rows':     { zh: '行数', en: 'Rows' },
  'mdhtml.modal.cols':     { zh: '列数', en: 'Cols' },
  'mdhtml.modal.col_label':{ zh: '列', en: 'Col' },
  'mdhtml.modal.cell':     { zh: '内容', en: 'Content' },
  'mdhtml.toast.no_md':    { zh: '⚠️ 请先输入 Markdown', en: '⚠️ Please enter Markdown first' },
  'mdhtml.toast.no_html':  { zh: '⚠️ 请先输入 HTML', en: '⚠️ Please enter HTML first' },
  'mdhtml.toast.no_export':{ zh: '⚠️ 没有内容', en: '⚠️ No content' },
  'mdhtml.toast.md2html':  { zh: 'MD → HTML ✅', en: 'MD → HTML ✅' },
  'mdhtml.toast.html2md':  { zh: 'HTML → MD ✅', en: 'HTML → MD ✅' },
  'mdhtml.toast.importing':{ zh: '正在导入…', en: 'Importing…' },
  'mdhtml.toast.imported': { zh: '📥 已导入: ', en: '📥 Imported: ' },
  'mdhtml.toast.import_err':{ zh: '导入失败 ❌', en: 'Import failed ❌' },
  'mdhtml.toast.pdf':      { zh: 'PDF 已导出 📄', en: 'PDF exported 📄' },
  'mdhtml.toast.word':     { zh: 'Word 已导出 📤', en: 'Word exported 📤' },
  'mdhtml.toast.html':     { zh: 'HTML 已导出 🌐', en: 'HTML exported 🌐' },
  'mdhtml.toast.md':       { zh: 'MD 已导出 📝', en: 'MD exported 📝' },
  'mdhtml.toast.txt':      { zh: 'TXT 已导出 📃', en: 'TXT exported 📃' },
  'mdhtml.toast.pdf_gen':  { zh: '正在生成 PDF…', en: 'Generating PDF…' },
  'mdhtml.toast.word_gen': { zh: '正在生成 Word…', en: 'Generating Word…' },
  'mdhtml.toast.export_err':{ zh: '导出 ', en: 'Export ' },
  'mdhtml.toast.export_err2':{ zh: ' 失败 ❌', en: ' failed ❌' },
  'mdhtml.confirm_clear':  { zh: '确定清空？', en: 'Clear all content?' },

  // ===== 汇率工具 =====
  'rate.title':            { zh: '💱 实时汇率换算', en: '💱 Exchange Rate' },
  'rate.source':           { zh: '数据来源: 欧洲央行', en: 'Source: ECB' },
  'rate.amount_ph':        { zh: '输入金额', en: 'Amount' },
  'rate.swap':             { zh: '⇅ 交换货币', en: '⇅ Swap' },
  'rate.result_label':     { zh: '转换结果', en: 'Result' },
  'rate.calculating':      { zh: '计算中…', en: 'Calculating…' },
  'rate.error':            { zh: '获取失败', en: 'Failed' },
  'rate.network_err':      { zh: '网络异常，请稍后重试', en: 'Network error, try again later' },
  'rate.disclaimer':       { zh: '汇率数据每日更新，仅供参考，实际交易以银行柜台为准', en: 'Exchange rates updated daily, for reference only.' },
  'rate.credit':           { zh: '数据由 frankfurter.app 提供 (欧洲央行)', en: 'Data by frankfurter.app (ECB)' },
  'rate.updated':          { zh: '数据更新: ', en: 'Updated: ' },
  'rate.updated_src':      { zh: ' · 来源: 欧洲央行', en: ' · Source: ECB' },
  'rate.cached':           { zh: '⚠️ 使用缓存数据 (网络异常)', en: '⚠️ Using cached data (offline)' },

  // ===== 语言切换 =====
  'lang.switch':           { zh: 'EN', en: '中文' },
  'lang.label':            { zh: '语言', en: 'Language' },
};

// 通过 localStorage 获取/设置语言
const LANG_KEY = 'web-tools-lang';

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  // 默认跟随浏览器语言
  const nav = navigator.language || '';
  return nav.startsWith('zh') ? 'zh' : 'en';
}

let currentLang = detectLang();

export function t(key) {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry['en'] || key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  // 通知订阅者
  listeners.forEach(fn => fn(lang));
}

const listeners = [];
export function onLangChange(fn) {
  listeners.push(fn);
}

// 扫描 DOM 中所有 [data-i18n] 元素并更新文本
export function translateDOM(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    el.title = t(key);
  });

  // 更新 title
  const titleEl = root.querySelector('title');
  if (titleEl && titleEl.dataset.i18n) {
    document.title = t(titleEl.dataset.i18n);
  } else if (titleEl) {
    document.title = t('site.title');
  }
}
