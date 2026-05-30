/**
 * md2html 模板系统 — 为 web-tools-hub 的 md-html 导出提供多模板方案
 * 10 套模板：TechDocs / PRD / Blog / APIDocs / Report / KnowledgeBase / 小红书 / 公众号 / 知乎 / 今日头条
 */

const TOC_CSS = `
.md-toc{font-size:0.85em;line-height:2}
.md-toc a{display:block;padding:2px 8px;border-radius:4px;transition:background 0.15s}
.md-toc .toc-h1{font-weight:600;padding-left:8px}
.md-toc .toc-h2{padding-left:20px}
.md-toc .toc-h3{padding-left:32px}
.md-toc .toc-h4{padding-left:44px}
.md-toc a.active{font-weight:600}
`;

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.8;-webkit-font-smoothing:antialiased}
a{text-decoration:none;color:inherit}
a:hover{text-decoration:underline}
img,video{max-width:100%;border-radius:6px}
pre code{background:none!important;padding:0!important;border-radius:0!important}
p{margin:0 0 1em}
ul,ol{margin:0 0 1em;padding-left:1.5em}
li{margin:0.25em 0}
blockquote{margin:1em 0;border-left:4px solid;padding:0.5em 1em;background:rgba(128,128,128,0.06)}
blockquote p:last-child{margin:0}
h1{font-size:2em;font-weight:700;margin:1.5em 0 0.5em;line-height:1.3}
h2{font-size:1.5em;font-weight:600;margin:1.4em 0 0.4em}
h3{font-size:1.2em;font-weight:600;margin:1.3em 0 0.3em}
h4{font-size:1em;font-weight:600;margin:1.2em 0 0.3em}
hr{margin:2em 0;border:none;border-top:1px solid;opacity:0.2}
table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.9em}
th,td{text-align:left;padding:8px 12px;border:1px solid}
th{font-weight:600}
pre{overflow-x:auto;border-radius:8px;margin:1em 0;font-size:0.85em;line-height:1.6;position:relative}
code{padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:'SF Mono','JetBrains Mono','Fira Code',monospace}
pre code{padding:0}
p>code,li>code{font-size:0.85em}
.admonition{margin:1.2em 0;border-radius:8px;overflow:hidden;border-left:4px solid}
.admonition-head{display:flex;align-items:center;gap:6px;padding:8px 14px;font-weight:600;font-size:0.85em;text-transform:uppercase;letter-spacing:0.02em}
.admonition-body{padding:10px 14px}
.admonition-body p:last-child{margin:0}
.admonition.note .admonition-head{color:#0969da}
.admonition.tip .admonition-head{color:#1a7f37}
.admonition.warning .admonition-head{color:#9a6700}
.admonition.danger .admonition-head{color:#cf222e}
.admonition.info .admonition-head{color:#8250df}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:1.2em 0}
.card{border-radius:10px;padding:20px;transition:transform 0.2s,box-shadow 0.2s}
.card:hover{transform:translateY(-2px)}
.card-title{font-weight:600;font-size:1.05em;margin-bottom:8px}
.card-desc{font-size:0.9em;line-height:1.6;opacity:0.85}
.card-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75em;margin-bottom:8px}
.timeline{position:relative;margin:1.5em 0;padding-left:28px}
.timeline::before{content:'';position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:currentColor;opacity:0.2}
.timeline-item{position:relative;margin-bottom:1.2em;padding-left:16px}
.timeline-item::before{content:'';position:absolute;left:-24px;top:6px;width:12px;height:12px;border-radius:50%;border:2px solid;background:#fff}
.timeline-date{font-size:0.82em;opacity:0.7;margin-bottom:2px}
.timeline-title{font-weight:600;font-size:1em;margin-bottom:4px}
.timeline-body{font-size:0.9em;opacity:0.9}
.code-header{display:flex;justify-content:space-between;align-items:center;padding:6px 14px;font-size:0.78em;border-radius:8px 8px 0 0;letter-spacing:0.01em}
.code-header + pre{margin-top:0;border-radius:0 0 8px 8px}
${TOC_CSS}
`;

function renderTOC(html) {
  const headings = [];
  const re = /<h([1-4])\s+id="([^"]+)"[^>]*>(.*?)<\/h[1-4]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, '') });
  }
  if (headings.length < 2) return '';
  let toc = '<nav class="md-toc">';
  for (const h of headings) {
    toc += `<a href="#${h.id}" class="toc-h${h.level}">${h.text}</a>`;
  }
  toc += '</nav>';
  return toc;
}

function groupBlocks(html) {
  return html
    .replace(/((?:<div class="card">[\s\S]*?<\/div>\s*)+)/g, '<div class="card-grid">$1</div>')
    .replace(/((?:<div class="timeline-item">[\s\S]*?<\/div>\s*)+)/g, '<div class="timeline">$1</div>');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'heading';
}

function addIds(html) {
  const counter = {};
  return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
    if (/id="/i.test(attrs)) return match;
    const raw = text.replace(/<[^>]+>/g, '');
    let id = slugify(raw);
    counter[id] = (counter[id] || 0) + 1;
    if (counter[id] > 1) id += '-' + (counter[id] - 1);
    return `<h${level} id="${id}"${attrs}>${text}</h${level}>`;
  });
}

// ─── 6 套模板 ───

const TEMPLATES = [
  {
    id: 'techdocs', name: '① 技术文档 TechDocs', desc: '双栏侧边栏，深色顶栏+靛蓝主题。适合技术手册、架构说明',
    css: `
:root{--bg:#f6f8fa;--bg-card:#fff;--text:#24292f;--text-muted:#57606a;--border:#d0d7de;--accent:#0969da;--accent-light:#ddf4ff;--accent-dark:#0550ae;--bg-code:#1e1e2e;--text-code:#cdd6f4;--bg-sidebar:#f6f8fa;--sidebar-width:280px}
body{background:var(--bg);color:var(--text)}
.page-wrap{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-width);background:var(--bg-sidebar);border-right:1px solid var(--border);overflow-y:auto;z-index:10;padding:0}
.sidebar-header{padding:20px 20px 12px;border-bottom:1px solid var(--border)}
.sidebar-header h2{font-size:1em;font-weight:700;margin:0;color:var(--text)}
.sidebar-header p{font-size:0.78em;color:var(--text-muted);margin:2px 0 0}
.sidebar-toc{padding:12px 16px}
.main-wrap{flex:1;margin-left:var(--sidebar-width);max-width:960px}
.topbar{position:sticky;top:0;z-index:20;background:var(--accent);color:#fff;padding:10px 32px;font-size:0.85em;display:flex;align-items:center;gap:8px;justify-content:space-between}
.content{padding:32px 48px 80px}
.content table{background:var(--bg-card)}
.content th{background:var(--accent-light);color:var(--accent-dark);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:var(--bg-code);color:var(--text-code);padding:16px}
.content code{background:var(--accent-light);color:var(--accent-dark)}
.content pre code{color:var(--text-code)}
.content blockquote{border-left-color:var(--accent)}
.content hr{border-color:var(--border)}
.card{background:var(--bg-card);border:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.card:hover{border-color:var(--accent);box-shadow:0 4px 12px rgba(9,105,218,0.12)}
.md-toc a{color:var(--text-muted)}
.md-toc a:hover,.md-toc a.active{color:var(--accent);background:var(--accent-light);text-decoration:none}
`
  },
  {
    id: 'prd', name: '② 产品需求 PRD', desc: '单栏居中，暖白橙色，浮动 TOC 按钮。适合 PRD、会议纪要',
    css: `
:root{--bg:#faf8f5;--bg-card:#fff;--text:#332e2a;--text-muted:#8b7f75;--border:#e6ddd4;--accent:#e8590c;--accent-light:#fff4e6;--accent-dark:#c74500;--bg-code:#292524;--text-code:#e7e5e4;--max-width:780px}
body{background:var(--bg);color:var(--text)}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:60px 24px 120px;position:relative}
.doc-header{margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid var(--accent)}
.doc-header h1{font-size:2.2em;margin:0 0 8px;color:var(--accent-dark)}
.doc-header .meta{font-size:0.85em;color:var(--text-muted);display:flex;gap:20px;flex-wrap:wrap}
.content table{background:var(--bg-card)}
.content th{background:var(--accent-light);color:var(--accent-dark);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px}
.content code{background:var(--accent-light);color:var(--accent-dark)}
.content pre code{color:var(--text-code)}
.content blockquote{border-left-color:var(--accent);background:var(--accent-light)}
.card{background:var(--bg-card);border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
.card:hover{border-color:var(--accent);box-shadow:0 4px 16px rgba(232,89,12,0.10)}
.floating-toc-btn{position:fixed;right:24px;bottom:24px;width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:1.2em;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:100}
.floating-toc{position:fixed;right:80px;bottom:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;max-width:260px;max-height:60vh;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:100;display:none}
.floating-toc.show{display:block}
`
  },
  {
    id: 'blog', name: '③ 博客文章 Blog', desc: '单栏沉浸式，米白衬线字体+阅读进度条。适合博客、教程',
    css: `
:root{--bg:#fcfbf9;--bg-card:#fff;--text:#1a1a1a;--text-muted:#7a7a7a;--border:#e8e4db;--accent:#b45309;--accent-light:#fff7ed;--accent-dark:#9a3412;--bg-code:#1c1917;--text-code:#e7e5e4;--max-width:720px}
body{background:var(--bg);color:var(--text);font-family:Georgia,'Noto Serif SC','Source Han Serif SC',serif}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:40px 20px 120px}
.progress-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--accent),#d97706);z-index:999;transition:width 0.1s}
.doc-header{text-align:center;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--border)}
.doc-header h1{font-size:2.4em;margin:0 0 12px;color:var(--text)}
.content{font-size:1.05em;line-height:2}
.content a{color:var(--accent)}
.content table{background:var(--bg-card)}
.content th{background:var(--accent-light);color:var(--accent-dark);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px}
.content code{background:var(--accent-light);color:var(--accent-dark)}
.content pre code{color:var(--text-code)}
.content blockquote{border-left-color:var(--accent);color:var(--text-muted);font-style:italic}
`
  },
  {
    id: 'apidocs', name: '④ API 接口文档', desc: '三栏布局，GitHub Dark 风格。适合 API 参考',
    css: `
:root{--bg:#0d1117;--bg-card:#161b22;--text:#e6edf3;--text-muted:#8b949e;--border:#30363d;--accent:#58a6ff;--accent-light:#0c2d6b;--bg-code:#161b22;--text-code:#e6edf3;--sidebar-width:260px}
body{background:var(--bg);color:var(--text)}
.page-wrap{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-width);background:var(--bg-card);border-right:1px solid var(--border);overflow-y:auto;z-index:10}
.sidebar-header{padding:20px 20px 12px;border-bottom:1px solid var(--border)}
.sidebar-header h2{font-size:0.95em;font-weight:700;margin:0;color:var(--accent)}
.sidebar-header p{font-size:0.78em;color:var(--text-muted)}
.sidebar-toc{padding:12px 16px}
.main-wrap{flex:1;margin-left:var(--sidebar-width);max-width:960px}
.topbar{position:sticky;top:0;z-index:20;background:var(--bg-card);border-bottom:1px solid var(--border);padding:10px 32px;font-size:0.85em;display:flex;align-items:center;gap:8px;color:var(--text-muted)}
.topbar a{color:var(--accent)}
.content h1{color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:8px}
.content h2{color:var(--accent)}
.content a{color:var(--accent)}
.content th{background:var(--accent-light);color:var(--accent);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:#1f2937;border:1px solid var(--border);padding:14px 16px}
.content blockquote{border-left-color:var(--accent)}
.card{background:var(--bg-card);border:1px solid var(--border)}
.md-toc a{color:var(--text-muted)}
.md-toc a:hover,.md-toc a.active{color:var(--accent);background:rgba(88,166,255,0.08)}
`
  },
  {
    id: 'report', name: '⑤ 项目报告 Report', desc: 'A4 纸排版，深蓝暗金，适合周报、项目总结',
    css: `
:root{--bg:#f8f7f4;--bg-card:#fff;--text:#1e293b;--text-muted:#64748b;--border:#e2e8f0;--accent:#1e3a5f;--accent-light:#eef2f6;--accent-dark:#0f172a;--gold:#b8860b;--bg-code:#1e293b;--text-code:#e2e8f0;--max-width:860px}
body{background:var(--bg);color:var(--text)}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:40px 40px 80px;background:var(--bg-card);min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,0.04)}
.doc-header{position:relative;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid var(--accent);display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.doc-header:after{content:'';position:absolute;bottom:-2px;left:0;width:80px;height:2px;background:var(--gold)}
.doc-header h1{font-size:1.8em;margin:0;color:var(--accent)}
.doc-header .meta{text-align:right;font-size:0.82em;color:var(--text-muted);line-height:1.6}
.content h1{color:var(--accent);padding-bottom:6px;border-bottom:1px solid var(--border)}
.content h2{color:var(--accent-dark)}
.content th{background:var(--accent-light);color:var(--accent);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px}
.content code{background:var(--accent-light);color:var(--accent)}
.content pre code{color:var(--text-code)}
.content blockquote{border-left-color:var(--gold);background:var(--gold-light)}
.card{background:var(--bg-card);border:1px solid var(--border)}
.card:hover{border-color:var(--gold);box-shadow:0 4px 12px rgba(184,134,11,0.08)}
`
  },
  {
    id: 'knowledgebase', name: '⑥ 知识笔记 KB', desc: '双栏+标签云，紫白配色。适合知识库、个人wiki',
    css: `
:root{--bg:#fafafe;--bg-card:#fff;--text:#1e1b4b;--text-muted:#6b6080;--border:#e4dff0;--accent:#7c3aed;--accent-light:#f5f3ff;--accent-dark:#5b21b6;--pink:#ec4899;--bg-code:#1e1b4b;--text-code:#e9e0f0;--sidebar-width:280px}
body{background:var(--bg);color:var(--text)}
.page-wrap{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-width);background:linear-gradient(180deg,#f5f3ff 0%,#fafafe 100%);border-right:1px solid var(--border);overflow-y:auto;z-index:10}
.sidebar-header{padding:24px 20px 12px;border-bottom:1px solid var(--border)}
.sidebar-header h2{font-size:1em;font-weight:700;margin:0;color:var(--accent)}
.sidebar-header p{font-size:0.78em;color:var(--text-muted)}
.sidebar-toc{padding:8px 16px 16px}
.main-wrap{flex:1;margin-left:var(--sidebar-width);max-width:960px}
.topbar{position:sticky;top:0;z-index:20;background:rgba(250,250,254,0.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);padding:12px 32px;font-size:0.85em}
.topbar span{font-weight:600;color:var(--accent)}
.content h1{color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;border-bottom:1px solid var(--border);padding-bottom:8px}
.content h2{color:var(--accent-dark)}
.content a{color:var(--accent)}
.content th{background:var(--accent-light);color:var(--accent-dark);border-color:var(--border)}
.content td{border-color:var(--border)}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px}
.content code{background:var(--accent-light);color:var(--accent-dark)}
.content pre code{color:var(--text-code);background:none}
.content blockquote{border-left-color:var(--pink);background:var(--accent-light)}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px}
.card:hover{border-color:var(--accent);box-shadow:0 4px 16px rgba(124,58,237,0.08)}
.md-toc a{color:var(--text-muted);padding:3px 8px}
.md-toc a:hover,.md-toc a.active{color:var(--accent);background:var(--accent-light);border-radius:6px}
`
  },
  {
    id: 'xiaohongshu', name: '⑦ 小红书风格 RED', desc: '暖色渐变，圆角卡片，emoji 装饰。适合小红书笔记排版',
    css: `
:root{--bg:#fff5f5;--bg-card:#fff;--text:#333;--text-muted:#999;--border:#ffe0e0;--accent:#ff4757;--accent-light:#fff0f0;--accent-dark:#e8364a;--pink:#ff6b81;--orange:#ff7f50;--bg-code:#2d2d2d;--text-code:#f8f8f2;--max-width:640px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:20px 16px 60px}
.doc-header{text-align:center;margin-bottom:24px;padding:24px 20px;background:linear-gradient(135deg,#ff6b81 0%,#ff4757 50%,#ff7f50 100%);border-radius:16px;color:#fff}
.doc-header h1{font-size:1.5em;margin:0 0 8px;line-height:1.4;font-weight:800}
.doc-header p{font-size:0.82em;opacity:0.9;margin:0}
.content{background:var(--bg-card);border-radius:16px;padding:24px 20px;box-shadow:0 2px 20px rgba(255,71,87,0.08);line-height:1.9;font-size:0.95em}
.content h1{font-size:1.4em;font-weight:800;color:var(--accent);margin:1.2em 0 0.5em;padding-left:12px;border-left:4px solid var(--accent)}
.content h2{font-size:1.2em;font-weight:700;color:var(--accent-dark);margin:1.2em 0 0.4em;padding:4px 12px;background:var(--accent-light);border-radius:8px;display:inline-block}
.content h3{font-size:1.05em;font-weight:700;color:var(--accent);margin:1em 0 0.3em}
.content p{margin:0 0 0.8em}
.content a{color:var(--accent);text-decoration:none;border-bottom:1px dashed var(--accent)}
.content strong{color:var(--accent-dark)}
.content em{color:var(--pink);font-style:normal}
.content code{background:var(--accent-light);color:var(--accent-dark);padding:2px 8px;border-radius:6px;font-size:0.88em}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px;border-radius:12px;overflow-x:auto;margin:0.8em 0;font-size:0.82em;line-height:1.6}
.content pre code{background:none;color:var(--text-code);padding:0}
.content blockquote{margin:0.8em 0;padding:12px 16px;background:var(--accent-light);border-left:4px solid var(--accent);border-radius:0 12px 12px 0;color:var(--accent-dark)}
.content blockquote p:last-child{margin:0}
.content ul,.content ol{margin:0.5em 0;padding-left:1.5em}
.content li{margin:0.3em 0}
.content table{width:100%;border-collapse:collapse;margin:0.8em 0;border-radius:8px;overflow:hidden}
.content th{background:var(--accent);color:#fff;padding:8px 12px;font-size:0.85em;font-weight:600}
.content td{padding:8px 12px;border-bottom:1px solid var(--border);font-size:0.88em}
.content tr:nth-child(even){background:var(--accent-light)}
.content img{border-radius:12px;margin:8px 0;max-width:100%}
.content hr{border:none;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);margin:1.5em 0}
.footer-note{text-align:center;margin-top:20px;font-size:0.75em;color:var(--text-muted)}
`
  },
  {
    id: 'wechat', name: '⑧ 公众号风格 WeChat', desc: '经典公众号排版，居中标题，优雅间距。适合微信公众号文章',
    css: `
:root{--bg:#fff;--bg-card:#fff;--text:#3f3f3f;--text-muted:#888;--border:#e5e5e5;--accent:#07c160;--accent-light:#e8f8ef;--accent-dark:#06ad56;--header-accent:#fa5151;--bg-code:#f6f8fa;--text-code:#24292e;--max-width:578px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f7f7f7;color:var(--text);font-family:-apple-system,'PingFang SC','Helvetica Neue','Microsoft YaHei',sans-serif}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:0;background:var(--bg);min-height:100vh;box-shadow:0 0 30px rgba(0,0,0,0.06)}
.doc-header{text-align:center;padding:32px 24px 24px;border-bottom:1px solid var(--border)}
.doc-header h1{font-size:1.6em;font-weight:700;color:#000;line-height:1.5;margin:0 0 12px;letter-spacing:0.5px}
.doc-header .meta{font-size:0.78em;color:var(--text-muted);display:flex;justify-content:center;gap:16px}
.content{padding:20px 24px 40px;line-height:2;font-size:0.95em;color:var(--text)}
.content h1{font-size:1.3em;font-weight:700;color:#000;text-align:center;margin:2em 0 0.8em;position:relative;padding-bottom:10px}
.content h1:after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:40px;height:3px;background:var(--header-accent);border-radius:2px}
.content h2{font-size:1.15em;font-weight:700;color:#000;margin:1.8em 0 0.6em;padding-left:12px;border-left:4px solid var(--header-accent)}
.content h3{font-size:1.05em;font-weight:700;color:#333;margin:1.4em 0 0.4em}
.content p{margin:0 0 1em;text-align:justify}
.content a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--accent)}
.content strong{color:#000}
.content code{background:var(--bg-code);color:var(--text-code);padding:2px 6px;border-radius:3px;font-size:0.88em}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px;border-radius:6px;overflow-x:auto;margin:1em 0;font-size:0.82em;line-height:1.6;border:1px solid #eaecef}
.content pre code{background:none;color:var(--text-code);padding:0}
.content blockquote{margin:1em 0;padding:12px 16px;background:var(--accent-light);border-left:3px solid var(--accent);color:#333;font-size:0.92em}
.content blockquote p:last-child{margin:0}
.content ul,.content ol{margin:0.5em 0;padding-left:1.8em}
.content li{margin:0.3em 0}
.content table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.88em}
.content th{background:#f2f2f2;color:#333;padding:8px 12px;border:1px solid var(--border);font-weight:600}
.content td{padding:8px 12px;border:1px solid var(--border)}
.content img{max-width:100%;border-radius:4px;margin:8px auto;display:block}
.content hr{border:none;height:1px;background:var(--border);margin:2em 20%}
.footer-note{text-align:center;padding:16px 24px;font-size:0.72em;color:var(--text-muted);border-top:1px solid var(--border)}
`
  },
  {
    id: 'zhihu', name: '⑨ 知乎风格 Zhihu', desc: '简洁学术风，衬线标题，代码高亮。适合知乎回答/专栏文章',
    css: `
:root{--bg:#fff;--bg-card:#fff;--text:#1a1a1a;--text-muted:#999;--border:#ebebeb;--accent:#0066ff;--accent-light:#f0f7ff;--accent-dark:#0052cc;--bg-code:#f6f8fa;--text-code:#24292e;--max-width:700px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f6f6f6;color:var(--text);font-family:-apple-system,'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif}
.page-wrap{max-width:var(--max-width);margin:0 auto;padding:0;background:var(--bg);min-height:100vh;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.doc-header{padding:28px 32px 20px;border-bottom:1px solid var(--border)}
.doc-header h1{font-size:1.7em;font-weight:700;color:#1a1a1a;line-height:1.45;margin:0 0 8px}
.doc-header .meta{font-size:0.82em;color:var(--text-muted);display:flex;gap:12px}
.content{padding:20px 32px 60px;line-height:1.85;font-size:0.95em}
.content h1{font-size:1.35em;font-weight:700;color:#1a1a1a;margin:2em 0 0.6em}
.content h2{font-size:1.18em;font-weight:700;color:#1a1a1a;margin:1.8em 0 0.5em;padding-bottom:8px;border-bottom:1px solid var(--border)}
.content h3{font-size:1.05em;font-weight:700;color:#333;margin:1.4em 0 0.4em}
.content p{margin:0 0 0.9em;text-align:justify}
.content a{color:var(--accent);text-decoration:none}
.content a:hover{text-decoration:underline}
.content strong{color:#1a1a1a;font-weight:700}
.content code{background:var(--bg-code);color:var(--text-code);padding:2px 6px;border-radius:3px;font-size:0.88em;font-family:'SF Mono','Menlo',monospace}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px;border-radius:6px;overflow-x:auto;margin:1em 0;font-size:0.82em;line-height:1.6;border:1px solid #eaecef}
.content pre code{background:none;color:var(--text-code);padding:0}
.content blockquote{margin:1em 0;padding:12px 16px;background:var(--accent-light);border-left:3px solid var(--accent);color:#555}
.content blockquote p:last-child{margin:0}
.content ul,.content ol{margin:0.5em 0;padding-left:1.8em}
.content li{margin:0.3em 0}
.content table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.88em}
.content th{background:#f7f8fa;color:#333;padding:8px 12px;border:1px solid var(--border);font-weight:600;text-align:left}
.content td{padding:8px 12px;border:1px solid var(--border)}
.content img{max-width:100%;border-radius:4px;margin:8px 0}
.content hr{border:none;height:1px;background:var(--border);margin:2em 0}
.footer-note{text-align:center;padding:20px 32px;font-size:0.75em;color:var(--text-muted);border-top:1px solid var(--border)}
`
  },
  {
    id: 'toutiao', name: '⑩ 今日头条 Toutiao', desc: '头条号文章风格，大标题醒目，正文易读。适合今日头条/头条号发布',
    css: `
:root{--bg:#fff;--bg-card:#fff;--text:#222;--text-muted:#999;--border:#e8e8e8;--accent:#ff0000;--accent-light:#fff5f5;--accent-dark:#d40000;--blue:#1e80ff;--bg-code:#f7f8fa;--text-code:#333;--max-width:640px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f4f5f6;color:var(--text);font-family:-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',sans-serif}
.page-wrap{max-width:var(--max-width);margin:0 auto;background:var(--bg);min-height:100vh;box-shadow:0 0 20px rgba(0,0,0,0.05)}
.doc-header{padding:24px 20px 20px;border-bottom:1px solid var(--border)}
.doc-header h1{font-size:1.6em;font-weight:800;color:#1a1a1a;line-height:1.4;margin:0 0 12px;letter-spacing:0.3px}
.doc-header .meta{font-size:0.78em;color:var(--text-muted);display:flex;gap:12px;align-items:center}
.doc-header .meta .tag{display:inline-block;padding:2px 8px;background:var(--accent-light);color:var(--accent);border-radius:4px;font-size:0.85em;font-weight:500}
.content{padding:20px 20px 40px;line-height:1.9;font-size:0.95em;color:#333}
.content h1{font-size:1.4em;font-weight:800;color:#1a1a1a;margin:1.8em 0 0.6em;padding-left:10px;border-left:4px solid var(--accent)}
.content h2{font-size:1.2em;font-weight:700;color:#1a1a1a;margin:1.6em 0 0.5em;position:relative;padding-left:14px}
.content h2:before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:4px;height:18px;background:var(--accent);border-radius:2px}
.content h3{font-size:1.05em;font-weight:700;color:#333;margin:1.2em 0 0.4em}
.content p{margin:0 0 0.9em;text-align:justify}
.content a{color:var(--blue);text-decoration:none}
.content a:hover{text-decoration:underline}
.content strong{color:#1a1a1a;font-weight:700}
.content code{background:var(--bg-code);color:var(--text-code);padding:2px 6px;border-radius:3px;font-size:0.88em;font-family:'Menlo',monospace}
.content pre{background:var(--bg-code);color:var(--text-code);padding:14px 16px;border-radius:6px;overflow-x:auto;margin:1em 0;font-size:0.82em;line-height:1.6;border:1px solid #eee}
.content pre code{background:none;color:var(--text-code);padding:0}
.content blockquote{margin:1em 0;padding:12px 16px;background:var(--accent-light);border-left:3px solid var(--accent);color:#555;border-radius:0 4px 4px 0}
.content blockquote p:last-child{margin:0}
.content ul,.content ol{margin:0.5em 0;padding-left:1.8em}
.content li{margin:0.3em 0}
.content table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.88em}
.content th{background:#f5f6f7;color:#333;padding:10px 12px;border:1px solid var(--border);font-weight:600;text-align:left}
.content td{padding:10px 12px;border:1px solid var(--border)}
.content img{max-width:100%;border-radius:4px;margin:8px 0}
.content hr{border:none;height:1px;background:var(--border);margin:2em 0}
.card{background:#fafafa;border:1px solid var(--border);border-radius:8px;padding:16px;margin:0.8em 0}
.card:hover{border-color:#ddd}
.footer-note{text-align:center;padding:20px;font-size:0.75em;color:var(--text-muted);border-top:1px solid var(--border)}
`
  }
];

function wrapTemplate(body, tmplId, title) {
  const tpl = TEMPLATES.find(t => t.id === tmplId) || TEMPLATES[0];
  const toc = renderTOC(body);
  const safeTitle = title || '文档';

  // 每个模板不同的包裹函数
  const layouts = {
    techdocs: `<div class="page-wrap"><aside class="sidebar"><div class="sidebar-header"><h2>${safeTitle}</h2><p>技术文档</p></div><div class="sidebar-toc">${toc || ''}</div></aside><div class="main-wrap"><div class="topbar"><span>📄 ${safeTitle}</span></div><main class="content md-content">${body}</main></div></div><script>
document.querySelectorAll('.md-toc a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var id=a.getAttribute('href').slice(1),el=document.getElementById(id);if(el){window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'})};document.querySelectorAll('.md-toc a.active').forEach(function(x){x.classList.remove('active')});a.classList.add('active')})});
window.addEventListener('scroll',function(){var c='';document.querySelectorAll('h1[id],h2[id],h3[id],h4[id]').forEach(function(h){if(h.getBoundingClientRect().top<=120)c='#'+h.id});document.querySelectorAll('.md-toc a').forEach(function(a){a.classList.toggle('active',a.getAttribute('href')===c)})});
</script>`,

    prd: `<div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1></header><main class="content md-content">${body}</main></div>${toc ? '<button class="floating-toc-btn" id="tocBtn">☰</button><div class="floating-toc" id="tocPanel">'+toc+'</div><script>var btn=document.getElementById("tocBtn"),panel=document.getElementById("tocPanel");btn.addEventListener("click",function(){panel.classList.toggle("show")});document.addEventListener("click",function(e){if(!btn.contains(e.target)&&!panel.contains(e.target))panel.classList.remove("show")});document.querySelectorAll(".floating-toc a").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();var id=a.getAttribute("href").slice(1),el=document.getElementById(id);if(el){window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-20,behavior:"smooth"})};panel.classList.remove("show")})});window.addEventListener("scroll",function(){var c="";document.querySelectorAll("h1[id],h2[id],h3[id],h4[id]").forEach(function(h){if(h.getBoundingClientRect().top<=140)c="#"+h.id});document.querySelectorAll(".floating-toc a").forEach(function(a){a.classList.toggle("active",a.getAttribute("href")===c)})});</script>' : ''}`,

    blog: `<div class="progress-bar" id="progressBar"></div><div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1></header><main class="content md-content">${body}</main></div><script>window.addEventListener("scroll",function(){var h=document.documentElement.scrollHeight-window.innerHeight;document.getElementById("progressBar").style.width=(window.scrollY/h*100)+"%"})</script>`,

    apidocs: `<div class="page-wrap"><aside class="sidebar"><div class="sidebar-header"><h2>📡 ${safeTitle}</h2><p>API 参考文档</p></div><div class="sidebar-toc">${toc || ''}</div></aside><div class="main-wrap"><div class="topbar"><span>API 文档</span></div><main class="content md-content">${body}</main></div></div><script>
document.querySelectorAll('.md-toc a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var id=a.getAttribute('href').slice(1),el=document.getElementById(id);if(el){window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'})};document.querySelectorAll('.md-toc a.active').forEach(function(x){x.classList.remove('active')});a.classList.add('active')})});
window.addEventListener('scroll',function(){var c='';document.querySelectorAll('h1[id],h2[id],h3[id],h4[id]').forEach(function(h){if(h.getBoundingClientRect().top<=120)c='#'+h.id});document.querySelectorAll('.md-toc a').forEach(function(a){a.classList.toggle('active',a.getAttribute('href')===c)})});
</script>`,

    report: `<div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1><div class="meta"><div>${new Date().toLocaleDateString('zh-CN')}</div></div></header><main class="content md-content">${body}</main><div style="margin-top:60px;padding-top:20px;border-top:1px solid var(--border);font-size:0.78em;color:var(--text-muted);text-align:center">Generated by md2html</div></div>`,

    knowledgebase: `<div class="page-wrap"><aside class="sidebar"><div class="sidebar-header"><h2>📚 ${safeTitle}</h2></div><div class="sidebar-toc">${toc || ''}</div></aside><div class="main-wrap"><div class="topbar"><span>${safeTitle}</span></div><main class="content md-content">${body}</main></div></div><script>
document.querySelectorAll('.md-toc a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var id=a.getAttribute('href').slice(1),el=document.getElementById(id);if(el){window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'})};document.querySelectorAll('.md-toc a.active').forEach(function(x){x.classList.remove('active')});a.classList.add('active')})});
window.addEventListener('scroll',function(){var c='';document.querySelectorAll('h1[id],h2[id],h3[id],h4[id]').forEach(function(h){if(h.getBoundingClientRect().top<=120)c='#'+h.id});document.querySelectorAll('.md-toc a').forEach(function(a){a.classList.toggle('active',a.getAttribute('href')===c)})});
</script>`,

    xiaohongshu: `<div class="page-wrap"><header class="doc-header"><h1>📌 ${safeTitle}</h1><p>✨ 收藏 + 关注，获取更多干货 ✨</p></header><main class="content md-content">${body}</main><div class="footer-note">❤️ 觉得有用就点个赞吧！关注我获取更多内容～</div></div>`,

    wechat: `<div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1><div class="meta"><span>📝 原创</span><span>📅 ${new Date().toLocaleDateString('zh-CN')}</span></div></header><main class="content md-content">${body}</main><div class="footer-note">— END —<br>觉得不错？点个「在看」支持一下 👇</div></div>`,

    zhihu: `<div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1><div class="meta"><span>✍️ 作者</span><span>📅 ${new Date().toLocaleDateString('zh-CN')}</span><span>💬 0 评论</span></div></header><main class="content md-content">${body}</main><div class="footer-note">如果觉得有帮助，欢迎点赞和收藏 ❤️</div></div>`,

    toutiao: `<div class="page-wrap"><header class="doc-header"><h1>${safeTitle}</h1><div class="meta"><span class="tag">原创</span><span>📅 ${new Date().toLocaleDateString('zh-CN')}</span><span>👁️ 0 阅读</span></div></header><main class="content md-content">${body}</main><div class="footer-note">— 全文完 —<br>关注我，获取更多精彩内容 👆</div></div>`
  };

  const layout = layouts[tpl.id] || layouts.techdocs;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>${BASE_CSS}${tpl.css}</style></head><body>${layout}</body></html>`;
}

export { TEMPLATES, wrapTemplate, groupBlocks, addIds };
