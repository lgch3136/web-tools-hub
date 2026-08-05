import { escapeHtml, slugify } from './markdown-studio-core.mjs';

const BASE_EXPORT_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--page-bg)}
body{margin:0;background:var(--page-bg);color:var(--text);font-family:var(--document-font);font-size:var(--document-size);line-height:var(--document-leading);-webkit-font-smoothing:antialiased}
.export-page{width:min(calc(100% - 32px),var(--document-width));min-height:100vh;margin:0 auto;padding:64px 0 96px}
.export-header{margin:0 0 44px;padding:0 0 24px;border-bottom:1px solid var(--border)}
.export-kicker{margin:0 0 8px;color:var(--accent);font:700 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}
.export-header h1{margin:0;color:var(--heading);font-size:clamp(32px,7vw,52px);line-height:1.08;letter-spacing:-.04em;text-wrap:balance}
.export-meta{margin:12px 0 0;color:var(--muted);font-size:.82em}
.md-content{overflow-wrap:anywhere}
.md-content h1,.md-content h2,.md-content h3,.md-content h4,.md-content h5,.md-content h6{color:var(--heading);line-height:1.28;text-wrap:balance;scroll-margin-top:24px}
.md-content h1{margin:2em 0 .65em;font-size:2em;letter-spacing:-.03em}
.md-content h2{margin:1.8em 0 .65em;font-size:1.5em;letter-spacing:-.02em}
.md-content h3{margin:1.6em 0 .55em;font-size:1.2em}
.md-content h4,.md-content h5,.md-content h6{margin:1.45em 0 .5em;font-size:1em}
.md-content p{margin:0 0 1em}
.md-content a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}
.md-content strong{color:var(--heading);font-weight:700}
.md-content ul,.md-content ol{margin:.75em 0 1.15em;padding-left:1.5em}
.md-content li{margin:.35em 0;padding-left:.15em}
.md-content li.task-list-item{list-style:none;margin-left:-1.25em}
.md-content input[type=checkbox]{margin:0 .55em 0 0;accent-color:var(--accent)}
.md-content blockquote{margin:1.4em 0;padding:.9em 1.1em;border-left:4px solid var(--accent);background:var(--quote-bg);color:var(--muted)}
.md-content blockquote p:last-child{margin-bottom:0}
.md-content hr{height:1px;margin:2.25em 0;border:0;background:var(--border)}
.md-content img{display:block;max-width:100%;height:auto;margin:1.4em auto;border-radius:10px}
.md-content table{display:table;width:100%;margin:1.4em 0;border-collapse:collapse;font-size:.9em}
.md-content th,.md-content td{padding:.68em .8em;border:1px solid var(--border);text-align:left;vertical-align:top}
.md-content th{background:var(--table-head);color:var(--heading);font-weight:700}
.md-content code{padding:.15em .38em;border-radius:4px;background:var(--inline-code-bg);color:var(--inline-code);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em}
.md-content pre{position:relative;margin:1.4em 0;padding:18px 20px;overflow:auto;border:1px solid var(--code-border);border-radius:10px;background:var(--code-bg);color:var(--code-text);line-height:1.62;tab-size:2}
.md-content pre code{padding:0;background:transparent;color:inherit;font-size:.82em;white-space:pre}
.md-toc{margin:1.35em 0;padding:18px 20px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.md-toc-title{margin:0 0 8px;color:var(--heading);font-weight:700}
.md-toc a{display:block;padding:3px 0;color:var(--muted);text-decoration:none}
.md-toc a:hover{color:var(--accent)}
.md-toc .toc-level-2{padding-left:1em}.md-toc .toc-level-3{padding-left:2em}.md-toc .toc-level-4{padding-left:3em}
.footnote-ref{margin-left:2px;font-size:.72em;vertical-align:super}.link-footnotes{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--border);font-size:.82em;color:var(--muted)}
.studio-diagram{margin:1.5em 0;padding:14px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.studio-diagram svg{display:block;min-width:520px;max-width:100%;height:auto;margin:auto}.diagram-node{fill:var(--surface);stroke:var(--accent);stroke-width:2}.diagram-edge{stroke:var(--muted);stroke-width:1.5}.diagram-label{fill:var(--heading);font:500 13px var(--document-font)}
.math-expression{font-family:'Times New Roman','Songti SC',serif;letter-spacing:.015em}.math-display{display:block;margin:1.3em 0;padding:.75em 1em;overflow:auto;text-align:center}.math-fraction{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.1}.math-fraction>span:first-child{padding:0 .2em .1em;border-bottom:1px solid currentColor}.math-fraction>span:last-child{padding:.1em .2em 0}
.tok-comment{color:#77818f;font-style:italic}.tok-string{color:#a7d7a2}.tok-number{color:#efb57a}.tok-keyword{color:#89b9f8;font-weight:600}.tok-literal{color:#cf9cf2}.tok-tag{color:#7bdff2}.tok-attr{color:#f3cf7a}
.enhancement-fallback{margin:1.25em 0;border:1px solid var(--border);border-radius:10px;overflow:hidden}.enhancement-fallback strong{display:block;padding:9px 12px;background:var(--table-head);color:var(--heading);font-size:.78em}.enhancement-fallback pre{margin:0;border:0;border-radius:0}
.export-footer{margin-top:64px;padding-top:18px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}
@media(max-width:680px){.export-page{width:min(calc(100% - 28px),var(--document-width));padding:36px 0 64px}.export-header{margin-bottom:32px}.md-content table{display:block;overflow-x:auto}.md-content pre{padding:15px}}
@media print{@page{margin:16mm 15mm}.export-page{width:100%;max-width:none;padding:0}.export-footer{display:none}.md-content a{color:inherit}.md-content pre,.md-content blockquote,.md-content table,.studio-diagram{break-inside:avoid}html,body{background:#fff!important}}
`;

export const TEMPLATES = [
  {
    id: 'clean',
    name: 'Clean',
    desc: '清晰、中性的通用发布版式',
    css: `
:root{--page-bg:#eef2f5;--surface:#fff;--text:#374151;--heading:#101827;--muted:#667085;--border:#dce3e9;--quote-bg:#f2f8fa;--table-head:#f5f7f9;--inline-code-bg:#edf2f5;--inline-code:#155e75;--code-bg:#172033;--code-border:#26334a;--code-text:#e7edf7}
.export-page{max-width:calc(var(--document-width) + 96px);padding:64px 48px 96px;background:#fff;box-shadow:0 22px 70px rgba(30,48,72,.11)}
.export-header{border-bottom-width:2px;border-bottom-color:var(--accent)}
`,
  },
  {
    id: 'wechat',
    name: 'WeChat',
    desc: '适合公众号富文本粘贴的舒展中文排版',
    css: `
:root{--page-bg:#f3f4f5;--surface:#fff;--text:#3f3f3f;--heading:#171717;--muted:#7a7a7a;--border:#e7e7e7;--quote-bg:#f4faf7;--table-head:#f5f5f5;--inline-code-bg:#f3f5f7;--inline-code:#45536a;--code-bg:#f6f8fa;--code-border:#e4e8ec;--code-text:#263243}
.export-page{max-width:640px;padding:46px 32px 80px;background:#fff;box-shadow:0 16px 60px rgba(17,24,39,.07)}
.export-header{text-align:center}.export-kicker{color:var(--muted)}.export-header h1{font-size:36px;letter-spacing:-.025em}
.md-content{line-height:2}.md-content h2{padding-left:12px;border-left:4px solid var(--accent)}.md-content h1{text-align:center}.md-content h1::after{display:block;width:42px;height:3px;margin:12px auto 0;background:var(--accent);content:''}
.md-content p{text-align:justify}.md-content img{border-radius:4px}
`,
  },
  {
    id: 'toutiao',
    name: 'Toutiao',
    desc: '标题醒目、正文紧凑的资讯文章版式',
    css: `
:root{--page-bg:#f4f5f6;--surface:#fff;--text:#333;--heading:#161616;--muted:#777;--border:#e8e8e8;--quote-bg:#fff6f6;--table-head:#f5f6f7;--inline-code-bg:#f5f6f7;--inline-code:#3f4550;--code-bg:#f7f8fa;--code-border:#e8e9eb;--code-text:#2d3748}
.export-page{max-width:700px;padding:42px 34px 78px;background:#fff;box-shadow:0 12px 40px rgba(31,41,55,.06)}
.export-header{border-bottom:0}.export-header h1{font-size:40px;font-weight:800}.export-kicker{color:var(--accent)}
.md-content h1,.md-content h2{position:relative;padding-left:14px}.md-content h1::before,.md-content h2::before{position:absolute;top:.12em;bottom:.12em;left:0;width:4px;border-radius:2px;background:var(--accent);content:''}
.md-content p{text-align:justify}.md-content blockquote{border-radius:0 8px 8px 0}
`,
  },
  {
    id: 'developer',
    name: 'Developer',
    desc: '代码、表格和技术文档优先的开发者主题',
    css: `
:root{--page-bg:#e9eef3;--surface:#fff;--text:#334155;--heading:#0f172a;--muted:#64748b;--border:#cfd9e4;--quote-bg:#edf8fa;--table-head:#eef3f7;--inline-code-bg:#e5edf3;--inline-code:#0e7490;--code-bg:#0b1320;--code-border:#233248;--code-text:#dce7f4}
.export-page{max-width:calc(var(--document-width) + 100px);padding:64px 50px 96px;background:#fff;box-shadow:0 22px 70px rgba(30,48,72,.12)}.export-header{border-bottom-color:var(--accent)}
.export-header h1,.md-content h1,.md-content h2{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.md-content h2::before{color:var(--accent);content:'## ';font-weight:500}.md-content h3::before{color:var(--accent);content:'### ';font-weight:500}
.md-content img{border:1px solid var(--border)}
`,
  },
  {
    id: 'notebook',
    name: 'Notebook',
    desc: '温暖纸张感，适合随笔、读书笔记和长文',
    css: `
:root{--page-bg:#ece8df;--surface:#fffdf7;--text:#443f38;--heading:#25211d;--muted:#746d64;--border:#ddd5c6;--quote-bg:#f5f0e5;--table-head:#f3ede1;--inline-code-bg:#eee7da;--inline-code:#7c4a25;--code-bg:#292722;--code-border:#3b3831;--code-text:#eee8dc}
.export-page{max-width:calc(var(--document-width) + 112px);padding:68px 56px 104px;background:#fffdf7;box-shadow:0 24px 70px rgba(68,54,37,.13)}
.export-header h1,.md-content h1,.md-content h2,.md-content h3{font-family:Georgia,'Songti SC','STSong',serif}.export-kicker{color:var(--accent)}
.md-content{font-family:Georgia,'Songti SC','STSong',serif}.md-content h2{padding-bottom:.35em;border-bottom:1px solid var(--border)}
`,
  },
];

export function getTemplate(templateId = 'clean') {
  return TEMPLATES.find(template => template.id === templateId) || TEMPLATES[0];
}

export function addIds(html = '') {
  const counters = new Map();
  return String(html).replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attributes, innerHtml) => {
    if (/\sid\s*=\s*["']/i.test(attributes)) return match;
    const text = innerHtml.replace(/<[^>]+>/g, '');
    const base = slugify(text);
    const count = (counters.get(base) || 0) + 1;
    counters.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<h${level}${attributes} id="${escapeHtml(id)}">${innerHtml}</h${level}>`;
  });
}

export function groupBlocks(html = '') {
  return String(html);
}

function normalizeOptions(options = {}) {
  const fontMap = {
    system: "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif",
    sans: "'Avenir Next','PingFang SC','Microsoft YaHei',sans-serif",
    serif: "Georgia,'Songti SC','STSong',serif",
    mono: "ui-monospace,SFMono-Regular,Menlo,Consolas,'PingFang SC',monospace",
  };
  const widthMap = { narrow: 620, standard: 760, wide: 980 };
  const fontSize = Math.min(24, Math.max(13, Number(options.fontSize) || 16));
  const lineHeight = Math.min(2.4, Math.max(1.35, Number(options.lineHeight) || 1.8));
  const accent = /^#[0-9a-f]{6}$/i.test(options.accent || '') ? options.accent : '#0f6575';
  const width = widthMap[options.width] || widthMap.standard;
  return { font: fontMap[options.font] || fontMap.system, fontSize, lineHeight, accent, width };
}

export function wrapTemplate(body, templateId = 'clean', title = '未命名文档', options = {}) {
  const template = getTemplate(templateId);
  const settings = normalizeOptions(options);
  const safeTitle = escapeHtml(title || '未命名文档');
  const exportedAt = options.exportedAt || new Date().toLocaleDateString('zh-CN');
  const titleBlock = options.includeTitle === false
    ? ''
    : `<header class="export-header"><p class="export-kicker">Markdown document</p><h1>${safeTitle}</h1><p class="export-meta">导出于 ${escapeHtml(exportedAt)}</p></header>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${safeTitle}</title>
  <style>
    :root{--accent:${settings.accent};--document-font:${settings.font};--document-size:${settings.fontSize}px;--document-leading:${settings.lineHeight};--document-width:${settings.width}px}
    ${BASE_EXPORT_CSS}
    ${template.css}
  </style>
</head>
<body>
  <main class="export-page">
    ${titleBlock}
    <article class="md-content">${body}</article>
    <footer class="export-footer">由 Practical Tools Markdown 发布工作室导出</footer>
  </main>
</body>
</html>`;
}
