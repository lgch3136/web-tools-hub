import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { Marked } from 'marked';
import TurndownService from 'turndown';

import {
  applyMarkdownAction,
  computeDocumentStats,
  DEFAULT_STUDIO_SETTINGS,
  deriveTitle,
  escapeHtml,
  getCursorPosition,
  isSafeImageUrl,
  isSafeLinkUrl,
  normalizeStoredState,
  normalizeStudioSettings,
  safeDocumentName,
} from './markdown-studio-core.mjs';
import { addIds, TEMPLATES, wrapTemplate } from './mdhtml-templates.js';

const MERMAID_RUNTIME_URL = '/vendor/mermaid.min.js';

const DOCUMENT_STORAGE_KEY = 'practicaltools.markdown-studio.documents.v1';
const SETTINGS_STORAGE_KEY = 'practicaltools.markdown-studio.settings.v1';
const CORRUPT_BACKUP_KEY = 'practicaltools.markdown-studio.corrupt-backup.v1';
const AUTOSAVE_DELAY = 550;
const PREVIEW_DELAY = 90;
const LARGE_IMAGE_DATA_LENGTH = 900_000;
const MAX_IMAGE_EDGE = 1800;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const DEFAULT_MARKDOWN = `# 一篇可发布的 Markdown 草稿

在左侧写作，右侧会显示经过安全处理的实时预览。草稿只保存在当前浏览器，请为重要内容定期导出 Markdown。

[TOC]

## 从结构开始

使用 **粗体**、*斜体*、~~删除线~~、[安全链接](https://practicaltools.xyz/) 和 \`inline code\`。

- [x] 写下核心观点
- [ ] 检查移动端预览
- [ ] 粘贴到目标发布平台复查

## 发布检查表

| 检查项 | 建议 |
| --- | --- |
| 标题层级 | 从 H1 到 H3 依次使用 |
| 图片 | 大图会在本地压缩并内嵌 |
| 备份 | 下载一份 .md 源稿 |

> 富文本复制会内联当前预览的关键样式，但公众号、头条等平台仍可能二次过滤排版。

\`\`\`javascript
const sourceOfTruth = 'Markdown';
console.log(sourceOfTruth);
\`\`\`
`;

const FONT_STACKS = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
  sans: "'Avenir Next', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  serif: "Georgia, 'Songti SC', 'STSong', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'PingFang SC', monospace",
};

const WIDTHS = { narrow: '620px', standard: '760px', wide: '980px' };

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
  ADD_ATTR: ['target', 'rel', 'loading', 'decoding', 'referrerpolicy', 'aria-label', 'aria-hidden', 'role'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'textarea', 'select', 'option', 'meta', 'link', 'base'],
  FORBID_ATTR: ['srcdoc'],
  ALLOW_DATA_ATTR: true,
};

const INLINE_STYLE_PROPERTIES = [
  'background-color',
  'border-bottom-color',
  'border-bottom-style',
  'border-bottom-width',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-radius',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-top-color',
  'border-top-style',
  'border-top-width',
  'box-sizing',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'list-style-position',
  'list-style-type',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'min-width',
  'overflow-wrap',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration-color',
  'text-decoration-line',
  'text-decoration-style',
  'text-indent',
  'vertical-align',
  'white-space',
  'width',
  'word-break',
];

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['py'], { languageName: 'python' });

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

turndown.remove(['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript']);
turndown.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement(content) {
    return content.trim() ? `~~${content}~~` : '';
  },
});
turndown.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement(content) {
    return ` ${content.trim().replace(/\|/g, '\\|')} |`;
  },
});
turndown.addRule('tableRow', {
  filter: 'tr',
  replacement(content, node) {
    const row = `|${content}\n`;
    if (!node.parentElement || node.parentElement.querySelector('tr') !== node) return row;
    const columns = Math.max(1, node.querySelectorAll('th,td').length);
    return `${row}|${' --- |'.repeat(columns)}\n`;
  },
});
turndown.addRule('table', {
  filter: 'table',
  replacement(content) {
    return `\n\n${content.trim()}\n\n`;
  },
});

function renderCode({ text, lang = '' }) {
  const language = String(lang || '').trim().split(/\s+/)[0].toLowerCase();
  if (language === 'mermaid') {
    return `<div class="enhancement-fallback mermaid-fallback"><strong>Mermaid 图表 · 正在安全渲染</strong><pre><code class="language-mermaid">${escapeHtml(text)}</code></pre></div>`;
  }

  let highlighted = escapeHtml(text);
  let languageClass = '';
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
    languageClass = ` language-${escapeHtml(language)}`;
  }
  return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>`;
}

const markdownParser = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html(token) {
      const source = escapeHtml(token.text || '');
      return token.block
        ? `<pre class="studio-raw-html"><code>${source}</code></pre>`
        : `<code class="studio-raw-html">${source}</code>`;
    },
    code(token) {
      return renderCode(token);
    },
  },
  extensions: [
    {
      name: 'mathBlock',
      level: 'block',
      start(source) {
        return source.indexOf('$$');
      },
      tokenizer(source) {
        const match = /^\$\$[ \t]*\n?([\s\S]+?)\n?\$\$(?:\n|$)/.exec(source);
        if (!match) return undefined;
        return { type: 'mathBlock', raw: match[0], text: match[1].trim() };
      },
      renderer(token) {
        return `<div class="math-placeholder math-display" data-display-mode="true">${escapeHtml(token.text)}</div>`;
      },
    },
    {
      name: 'mathInline',
      level: 'inline',
      start(source) {
        return source.indexOf('$');
      },
      tokenizer(source) {
        const match = /^\$([^$\n]+?)\$/.exec(source);
        if (!match) return undefined;
        return { type: 'mathInline', raw: match[0], text: match[1].trim() };
      },
      renderer(token) {
        return `<span class="math-placeholder" data-display-mode="false">${escapeHtml(token.text)}</span>`;
      },
    },
  ],
});

const $ = id => document.getElementById(id);
const app = $('app');

if (app) initializeStudio();

function initializeStudio() {
  const elements = {
    accentInput: $('accentInput'),
    accentOutput: $('accentOutput'),
    characterStat: $('characterStat'),
    confirmDialog: $('confirmDialog'),
    confirmDialogForm: $('confirmDialogForm'),
    confirmDialogMessage: $('confirmDialogMessage'),
    cursorStat: $('cursorStat'),
    deleteDocumentButton: $('deleteDocumentButton'),
    documentDialog: $('documentDialog'),
    documentDialogDescription: $('documentDialogDescription'),
    documentDialogForm: $('documentDialogForm'),
    documentDialogTitle: $('documentDialogTitle'),
    documentImportInput: $('documentImportInput'),
    documentList: $('documentList'),
    documentNameInput: $('documentNameInput'),
    documentTitle: $('documentTitle'),
    documentsPanel: $('documentsPanel'),
    drawerScrim: $('drawerScrim'),
    duplicateDocumentButton: $('duplicateDocumentButton'),
    editorDropZone: $('editorDropZone'),
    enhancementStatus: $('enhancementStatus'),
    exportMenu: $('exportMenu'),
    fontSelect: $('fontSelect'),
    fontSizeSelect: $('fontSizeSelect'),
    footnoteToggle: $('footnoteToggle'),
    formatToolbar: $('formatToolbar'),
    imageAltInput: $('imageAltInput'),
    imageDialog: $('imageDialog'),
    imageDialogForm: $('imageDialogForm'),
    imageInput: $('imageInput'),
    imageUrlInput: $('imageUrlInput'),
    importButton: $('importButton'),
    lineHeightSelect: $('lineHeightSelect'),
    linkDialog: $('linkDialog'),
    linkDialogForm: $('linkDialogForm'),
    linkTextInput: $('linkTextInput'),
    linkUrlInput: $('linkUrlInput'),
    markdownSource: $('markdownSource'),
    mobilePreviewToggle: $('mobilePreviewToggle'),
    newDocumentButton: $('newDocumentButton'),
    outlineCount: $('outlineCount'),
    outlineList: $('outlineList'),
    paragraphStat: $('paragraphStat'),
    previewDocument: $('previewDocument'),
    previewScroller: $('previewScroller'),
    readingStat: $('readingStat'),
    renameDocumentButton: $('renameDocumentButton'),
    richCopyButton: $('richCopyButton'),
    saveStatus: $('saveStatus'),
    scrollSyncToggle: $('scrollSyncToggle'),
    settingsPanel: $('settingsPanel'),
    sidebarToggle: $('sidebarToggle'),
    storageWarning: $('storageWarning'),
    themeSelect: $('themeSelect'),
    toastRegion: $('toastRegion'),
    widthSelect: $('widthSelect'),
    wordStat: $('wordStat'),
  };

  let storageIssue = '';
  let imageSizeWarning = false;
  let documentsState = loadDocuments();
  let settings = loadSettings();
  let previewTimer = 0;
  let saveTimer = 0;
  let toastTimer = 0;
  let renderGeneration = 0;
  let dragDepth = 0;
  let scrollLock = false;
  let mermaidInstance = null;
  let enhancementPromise = Promise.resolve();
  let mermaidLoadPromise = null;

  populateThemeOptions();
  applySettingsToControls();
  renderDocumentList();
  loadActiveDocument();
  bindEvents();
  applySettings();
  renderPreview();
  updateStats();
  updateCursor();
  persistDocuments();

  function makeDocument(name = '未命名文档', content = '') {
    const timestamp = Date.now();
    return {
      id: globalThis.crypto?.randomUUID?.() || `draft-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
      name: safeDocumentName(name),
      content: String(content),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  function fallbackDocument() {
    return makeDocument('入门示例', DEFAULT_MARKDOWN);
  }

  function activeDocument() {
    return documentsState.documents.find(document => document.id === documentsState.activeId) || documentsState.documents[0];
  }

  function loadDocuments() {
    try {
      const serialized = localStorage.getItem(DOCUMENT_STORAGE_KEY);
      if (!serialized) return normalizeStoredState(null, fallbackDocument);

      try {
        return normalizeStoredState(JSON.parse(serialized), fallbackDocument);
      } catch (error) {
        try {
          localStorage.setItem(CORRUPT_BACKUP_KEY, serialized.slice(0, 2_000_000));
        } catch {
          // The primary recovery path below still works if the backup also exceeds quota.
        }
        storageIssue = '检测到损坏的本地草稿数据。已打开恢复文档；请先导出 Markdown 再继续。';
        console.warn('Markdown Studio could not parse stored drafts.', error);
        return normalizeStoredState(null, () => makeDocument('恢复文档', DEFAULT_MARKDOWN));
      }
    } catch (error) {
      storageIssue = '浏览器阻止了本地存储。当前内容只在本页打开期间保留，请及时导出 Markdown。';
      console.warn('Markdown Studio local storage is unavailable.', error);
      return normalizeStoredState(null, fallbackDocument);
    }
  }

  function loadSettings() {
    try {
      const value = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return normalizeStudioSettings(value ? JSON.parse(value) : DEFAULT_STUDIO_SETTINGS);
    } catch (error) {
      console.warn('Markdown Studio settings could not be restored.', error);
      return normalizeStudioSettings(DEFAULT_STUDIO_SETTINGS);
    }
  }

  function persistDocuments({ announce = false } = {}) {
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    elements.saveStatus.textContent = '正在保存…';

    try {
      localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(documentsState));
      if (!storageIssue || storageIssue.startsWith('检测到损坏')) storageIssue = '';
      updateStorageWarning();
      elements.saveStatus.textContent = `已保存于 ${formatTime(Date.now())}`;
      if (announce) showToast('草稿已保存在当前浏览器');
      return true;
    } catch (error) {
      const quota = error?.name === 'QuotaExceededError' || error?.code === 22;
      storageIssue = quota
        ? '本地存储空间不足，最新修改尚未保存。请立即导出 Markdown；内嵌图片通常占用最多空间。'
        : '浏览器未能保存最新修改。当前内容仍在本页中，请先导出 Markdown。';
      elements.saveStatus.textContent = quota ? '未保存 · 空间不足' : '未保存 · 存储不可用';
      updateStorageWarning();
      console.warn('Markdown Studio could not save drafts.', error);
      return false;
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Markdown Studio could not save settings.', error);
      showToast('排版设置未能保存，但本次预览仍可使用', 'warning');
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    elements.saveStatus.textContent = '有未保存的修改';
    saveTimer = window.setTimeout(() => persistDocuments(), AUTOSAVE_DELAY);
  }

  function updateStorageWarning() {
    if (storageIssue) {
      elements.storageWarning.textContent = storageIssue;
      elements.storageWarning.hidden = false;
      return;
    }
    if (imageSizeWarning) {
      elements.storageWarning.textContent = '这篇草稿包含较大的内嵌图片。浏览器存储容量有限，请下载 Markdown 作为备份。';
      elements.storageWarning.hidden = false;
      return;
    }
    elements.storageWarning.hidden = true;
  }

  function markDocumentChanged() {
    const current = activeDocument();
    current.content = elements.markdownSource.value;
    current.updatedAt = Date.now();
    scheduleSave();
    schedulePreview();
    updateStats();
    updateCursor();
  }

  function loadActiveDocument() {
    const current = activeDocument();
    documentsState.activeId = current.id;
    elements.markdownSource.value = current.content;
    elements.documentTitle.value = current.name;
    elements.saveStatus.textContent = '已载入本地草稿';
    imageSizeWarning = current.content.length > 3_500_000;
    updateStorageWarning();
    renderDocumentList();
    updateStats();
    updateCursor();
    renderPreview();
  }

  function renderDocumentList() {
    const fragment = document.createDocumentFragment();
    documentsState.documents
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach(documentItem => {
        const selected = documentItem.id === documentsState.activeId;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'studio-document-item';
        button.dataset.documentId = documentItem.id;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;

        const name = document.createElement('strong');
        name.textContent = documentItem.name;
        const meta = document.createElement('span');
        const stats = computeDocumentStats(documentItem.content);
        meta.textContent = `${stats.words} 字词 · ${formatRelativeDate(documentItem.updatedAt)}`;
        button.append(name, meta);
        fragment.append(button);
      });
    elements.documentList.replaceChildren(fragment);
  }

  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(renderPreview, PREVIEW_DELAY);
  }

  async function ensurePreviewReady() {
    if (previewTimer) renderPreview();
    await enhancementPromise;
  }

  function renderPreview() {
    window.clearTimeout(previewTimer);
    previewTimer = 0;
    const generation = ++renderGeneration;
    const markdownSource = elements.markdownSource.value;

    if (!markdownSource.trim()) {
      elements.previewDocument.innerHTML = '<div class="studio-preview-empty"><strong>预览会显示在这里</strong><p>开始输入 Markdown，或导入一个文档。</p></div>';
      elements.outlineCount.textContent = '0 项';
      elements.outlineList.innerHTML = '<p class="studio-empty-state">添加标题后会在这里生成大纲。</p>';
      elements.enhancementStatus.textContent = '安全渲染';
      enhancementPromise = Promise.resolve();
      return;
    }

    let rendered = '';
    try {
      rendered = markdownParser.parse(markdownSource);
    } catch (error) {
      console.error('Markdown render failed.', error);
      rendered = `<div class="enhancement-fallback"><strong>Markdown 渲染失败</strong><pre><code>${escapeHtml(markdownSource)}</code></pre></div>`;
    }

    const safeHtml = DOMPurify.sanitize(addIds(rendered), SANITIZE_CONFIG);
    elements.previewDocument.innerHTML = safeHtml;
    hardenPreviewContent();
    const headings = collectPreviewHeadings();
    replaceTocMarkers(headings);
    if (settings.externalFootnotes) addExternalLinkFootnotes();
    updateOutline(headings);

    const needsEnhancement = elements.previewDocument.querySelector('.math-placeholder, .language-mermaid');
    elements.enhancementStatus.textContent = needsEnhancement ? '正在增强公式与图表…' : '安全渲染';
    enhancementPromise = needsEnhancement ? enhancePreview(generation) : Promise.resolve();
  }

  function hardenPreviewContent() {
    elements.previewDocument.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!isSafeLinkUrl(href)) {
        link.replaceWith(document.createTextNode(link.textContent || href));
        return;
      }
      if (/^https?:/i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer nofollow';
      }
    });

    elements.previewDocument.querySelectorAll('img').forEach(image => {
      const src = image.getAttribute('src') || '';
      if (!isSafeImageUrl(src)) {
        const fallback = document.createElement('span');
        fallback.className = 'studio-removed-resource';
        fallback.textContent = `图片地址已移除${image.alt ? `：${image.alt}` : ''}`;
        image.replaceWith(fallback);
        return;
      }
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      if (!image.alt) image.alt = '文章图片';
    });

    elements.previewDocument.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.disabled = true;
      checkbox.setAttribute('aria-label', checkbox.checked ? '已完成任务' : '未完成任务');
    });
  }

  function collectPreviewHeadings() {
    return Array.from(elements.previewDocument.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')).map(heading => ({
      id: heading.id,
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent.trim() || '未命名标题',
      element: heading,
    }));
  }

  function findPreviewTarget(id) {
    return Array.from(elements.previewDocument.querySelectorAll('[id]')).find(node => node.id === id) || null;
  }

  function replaceTocMarkers(headings) {
    elements.previewDocument.querySelectorAll('p').forEach(paragraph => {
      if (paragraph.textContent.trim().toUpperCase() !== '[TOC]') return;
      const nav = document.createElement('nav');
      nav.className = 'md-toc';
      nav.setAttribute('aria-label', '文内目录');
      const title = document.createElement('p');
      title.className = 'md-toc-title';
      title.textContent = '目录';
      nav.append(title);

      if (!headings.length) {
        const empty = document.createElement('span');
        empty.textContent = '添加标题后会生成目录。';
        nav.append(empty);
      } else {
        headings.forEach(item => {
          const link = document.createElement('a');
          link.href = `#${item.id}`;
          link.className = `toc-level-${Math.min(item.level, 4)}`;
          link.textContent = item.text;
          nav.append(link);
        });
      }
      paragraph.replaceWith(nav);
    });
  }

  function addExternalLinkFootnotes() {
    const links = Array.from(elements.previewDocument.querySelectorAll('a[href^="http://"],a[href^="https://"]'))
      .filter(link => !link.closest('.md-toc, .link-footnotes'));
    if (!links.length) return;

    const urls = new Map();
    links.forEach(link => {
      const href = link.href;
      if (!urls.has(href)) urls.set(href, urls.size + 1);
      const index = urls.get(href);
      const reference = document.createElement('sup');
      reference.className = 'footnote-ref';
      const referenceLink = document.createElement('a');
      referenceLink.href = `#external-link-${index}`;
      referenceLink.textContent = `[${index}]`;
      reference.append(referenceLink);
      link.after(reference);
    });

    const section = document.createElement('section');
    section.className = 'link-footnotes';
    section.setAttribute('aria-label', '外部链接脚注');
    const title = document.createElement('h2');
    title.textContent = '外部链接';
    const list = document.createElement('ol');
    urls.forEach((index, href) => {
      const item = document.createElement('li');
      item.id = `external-link-${index}`;
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer nofollow';
      link.textContent = href;
      item.append(link);
      list.append(item);
    });
    section.append(title, list);
    elements.previewDocument.append(section);
  }

  function updateOutline(headings) {
    elements.outlineCount.textContent = `${headings.length} 项`;
    if (!headings.length) {
      elements.outlineList.innerHTML = '<p class="studio-empty-state">添加标题后会在这里生成大纲。</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    headings.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.headingId = item.id;
      button.dataset.level = String(item.level);
      button.textContent = item.text;
      button.title = `跳到“${item.text}”`;
      fragment.append(button);
    });
    elements.outlineList.replaceChildren(fragment);
  }

  async function enhancePreview(generation) {
    const mathNodes = Array.from(elements.previewDocument.querySelectorAll('.math-placeholder'));
    const mermaidNodes = Array.from(elements.previewDocument.querySelectorAll('.mermaid-fallback'));
    const results = await Promise.allSettled([
      mathNodes.length ? enhanceMath(mathNodes, generation) : Promise.resolve({ failures: 0 }),
      mermaidNodes.length ? enhanceMermaid(mermaidNodes, generation) : Promise.resolve({ failures: 0 }),
    ]);
    if (generation !== renderGeneration) return;

    const failures = results.reduce((total, result) => {
      if (result.status === 'rejected') return total + 1;
      return total + (result.value?.failures || 0);
    }, 0);
    elements.enhancementStatus.textContent = failures
      ? `安全渲染 · ${failures} 项使用源码回退`
      : '安全渲染 · 增强完成';
  }

  let katexStylesPromise = null;

  function ensureKatexStyles() {
    if (katexStylesPromise) return katexStylesPromise;
    katexStylesPromise = new Promise((resolve, reject) => {
      var existing = document.querySelector('link[data-katex-styles]');
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/vendor/katex/katex.min.css';
      link.setAttribute('data-katex-styles', 'true');
      link.addEventListener('load', () => {
        link.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      link.addEventListener('error', reject, { once: true });
      document.head.appendChild(link);
    });
    return katexStylesPromise;
  }

  async function enhanceMath(nodes, generation) {
    let katex;
    try {
      const [module] = await Promise.all([
        import('katex'),
        ensureKatexStyles(),
      ]);
      katex = module.default || module;
    } catch (error) {
      nodes.forEach(node => markEnhancementFallback(node, 'KaTeX 未能载入，已保留公式源码'));
      console.warn('KaTeX enhancement could not load.', error);
      return { failures: nodes.length };
    }
    if (generation !== renderGeneration) return { failures: 0 };

    let failures = 0;
    nodes.forEach(node => {
      const expression = node.textContent;
      try {
        katex.render(expression, node, {
          displayMode: node.dataset.displayMode === 'true',
          throwOnError: true,
          strict: 'warn',
          trust: false,
          output: 'htmlAndMathml',
        });
        node.classList.add('math-rendered');
      } catch (error) {
        failures += 1;
        markEnhancementFallback(node, '公式无法解析，已保留源码');
        console.warn('KaTeX expression could not render.', error);
      }
    });
    return { failures };
  }

  async function enhanceMermaid(nodes, generation) {
    try {
      if (!mermaidInstance) {
        mermaidInstance = await loadMermaidRuntime();
        mermaidInstance.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          suppressErrorRendering: true,
          fontFamily: FONT_STACKS.system,
        });
      }
    } catch (error) {
      nodes.forEach(node => markEnhancementFallback(node, 'Mermaid 未能载入，已保留图表源码'));
      console.warn('Mermaid enhancement could not load.', error);
      return { failures: nodes.length };
    }
    if (generation !== renderGeneration) return { failures: 0 };

    let failures = 0;
    for (const [index, node] of nodes.entries()) {
      const source = node.querySelector('code')?.textContent || '';
      try {
        const renderId = `studio-mermaid-${generation}-${index}`;
        const result = await mermaidInstance.render(renderId, source);
        if (generation !== renderGeneration) return { failures };
        const wrapper = document.createElement('div');
        wrapper.className = 'studio-diagram';
        wrapper.setAttribute('role', 'img');
        wrapper.setAttribute('aria-label', 'Mermaid 图表');
        wrapper.innerHTML = DOMPurify.sanitize(result.svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['script', 'foreignObject'],
          FORBID_ATTR: ['onload', 'onclick', 'onerror'],
        });
        node.replaceWith(wrapper);
      } catch (error) {
        failures += 1;
        markEnhancementFallback(node, 'Mermaid 图表无法解析，已保留源码');
        console.warn('Mermaid diagram could not render.', error);
      }
    }
    return { failures };
  }

  async function loadMermaidRuntime() {
    const readRuntime = () => {
      const runtime = globalThis.mermaid || globalThis.__esbuild_esm_mermaid_nm?.mermaid;
      return runtime ? (runtime.default || runtime) : null;
    };
    const availableRuntime = readRuntime();
    if (availableRuntime) return availableRuntime;
    if (!mermaidLoadPromise) {
      mermaidLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-mermaid-runtime]');
        const script = existing || document.createElement('script');
        let timeout = 0;
        const cleanup = () => {
          window.clearTimeout(timeout);
          script.removeEventListener('load', onLoad);
          script.removeEventListener('error', onError);
        };
        const fail = message => {
          cleanup();
          script.remove();
          reject(new Error(message));
        };
        const onLoad = () => {
          script.dataset.mermaidLoaded = 'true';
          const runtime = readRuntime();
          if (!runtime) {
            fail('Mermaid runtime did not expose its browser API.');
            return;
          }
          cleanup();
          resolve(runtime);
        };
        const onError = () => fail('Mermaid runtime failed to load.');

        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });
        timeout = window.setTimeout(() => fail('Mermaid runtime loading timed out.'), 8000);

        if (existing?.dataset.mermaidLoaded === 'true') {
          onLoad();
        } else if (!existing) {
          script.src = MERMAID_RUNTIME_URL;
          script.async = true;
          script.dataset.mermaidRuntime = 'true';
          document.head.append(script);
        }
      }).catch(error => {
        mermaidLoadPromise = null;
        throw error;
      });
    }
    return mermaidLoadPromise;
  }

  function markEnhancementFallback(node, message) {
    node.classList.add('enhancement-fallback');
    node.setAttribute('aria-label', message);
    if (node.matches('.math-placeholder')) {
      const source = node.textContent;
      node.replaceChildren();
      const label = document.createElement('strong');
      label.textContent = message;
      const code = document.createElement('code');
      code.textContent = source;
      node.append(label, code);
    } else {
      const label = node.querySelector('strong');
      if (label) label.textContent = message;
    }
  }

  function updateStats() {
    const stats = computeDocumentStats(elements.markdownSource.value);
    elements.characterStat.textContent = `${stats.characters} 字符`;
    elements.wordStat.textContent = `${stats.words} 字词`;
    elements.paragraphStat.textContent = `${stats.paragraphs} 段`;
    elements.readingStat.textContent = `${stats.readingMinutes} 分钟阅读`;
  }

  function updateCursor() {
    const cursor = getCursorPosition(elements.markdownSource.value, elements.markdownSource.selectionStart);
    elements.cursorStat.textContent = `行 ${cursor.line}，列 ${cursor.column}`;
  }

  function populateThemeOptions() {
    elements.themeSelect.replaceChildren(...TEMPLATES.map(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      option.title = template.desc;
      return option;
    }));
  }

  function applySettingsToControls() {
    elements.themeSelect.value = settings.theme;
    elements.fontSelect.value = settings.font;
    elements.fontSizeSelect.value = String(settings.fontSize);
    elements.lineHeightSelect.value = String(settings.lineHeight);
    elements.accentInput.value = settings.accent;
    elements.accentOutput.textContent = settings.accent;
    elements.widthSelect.value = settings.width;
    elements.mobilePreviewToggle.checked = settings.phonePreview;
    elements.footnoteToggle.checked = settings.externalFootnotes;
    elements.scrollSyncToggle.checked = settings.scrollSync;
    setView(settings.view, { persist: false });
  }

  function applySettings({ rerender = false } = {}) {
    elements.previewDocument.dataset.theme = settings.theme;
    elements.previewDocument.style.setProperty('--article-font', FONT_STACKS[settings.font]);
    elements.previewDocument.style.setProperty('--article-size', `${settings.fontSize}px`);
    elements.previewDocument.style.setProperty('--article-leading', String(settings.lineHeight));
    elements.previewDocument.style.setProperty('--article-accent', settings.accent);
    elements.previewDocument.style.setProperty('--article-width', WIDTHS[settings.width]);
    elements.previewScroller.classList.toggle('is-phone-preview', settings.phonePreview);
    elements.accentOutput.textContent = settings.accent;
    if (rerender) renderPreview();
  }

  function updateSetting(name, value, { rerender = false } = {}) {
    settings = normalizeStudioSettings({ ...settings, [name]: value });
    applySettings({ rerender });
    persistSettings();
  }

  function setView(mode, { persist = true } = {}) {
    const safeMode = ['editor', 'split', 'preview'].includes(mode) ? mode : 'split';
    app.dataset.view = safeMode;
    document.querySelectorAll('[data-view-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.viewMode === safeMode));
    });
    if (persist) {
      settings = normalizeStudioSettings({ ...settings, view: safeMode });
      persistSettings();
    }
  }

  function setMobileView(mode) {
    const safeMode = mode === 'preview' ? 'preview' : 'editor';
    app.dataset.mobileView = safeMode;
    document.querySelectorAll('[data-mobile-tab]').forEach(button => {
      const selected = button.dataset.mobileTab === safeMode;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (safeMode === 'preview') renderPreview();
  }

  function toggleSidebar(force) {
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    if (mobile) {
      const open = typeof force === 'boolean' ? force : !app.classList.contains('sidebar-open');
      app.classList.toggle('sidebar-open', open);
      elements.sidebarToggle.setAttribute('aria-expanded', String(open));
    } else {
      const collapsed = typeof force === 'boolean' ? !force : !app.classList.contains('sidebar-collapsed');
      app.classList.toggle('sidebar-collapsed', collapsed);
      elements.sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    }
  }

  function applyAction(action, options = {}) {
    const result = applyMarkdownAction(
      elements.markdownSource.value,
      elements.markdownSource.selectionStart,
      elements.markdownSource.selectionEnd,
      action,
      options,
    );
    elements.markdownSource.value = result.value;
    elements.markdownSource.focus();
    elements.markdownSource.setSelectionRange(result.selectionStart, result.selectionEnd);
    markDocumentChanged();
  }

  function bindEvents() {
    elements.markdownSource.addEventListener('input', markDocumentChanged);
    ['click', 'keyup', 'select'].forEach(eventName => elements.markdownSource.addEventListener(eventName, updateCursor));
    elements.markdownSource.addEventListener('keydown', handleEditorKeydown);
    elements.markdownSource.addEventListener('paste', handleImagePaste);

    elements.documentTitle.addEventListener('input', () => {
      const current = activeDocument();
      current.name = elements.documentTitle.value.slice(0, 80) || '未命名文档';
      current.updatedAt = Date.now();
      renderDocumentList();
      scheduleSave();
    });
    elements.documentTitle.addEventListener('blur', () => {
      const current = activeDocument();
      current.name = safeDocumentName(elements.documentTitle.value);
      elements.documentTitle.value = current.name;
      renderDocumentList();
      scheduleSave();
    });

    elements.documentList.addEventListener('click', event => {
      const button = event.target.closest('[data-document-id]');
      if (!button || button.dataset.documentId === documentsState.activeId) return;
      persistDocuments();
      documentsState.activeId = button.dataset.documentId;
      loadActiveDocument();
      persistDocuments();
      if (window.matchMedia('(max-width: 860px)').matches) toggleSidebar(false);
    });
    elements.documentList.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const items = Array.from(elements.documentList.querySelectorAll('[data-document-id]'));
      if (!items.length) return;
      const currentIndex = Math.max(0, items.indexOf(document.activeElement));
      let nextIndex = currentIndex;
      if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
      if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = items.length - 1;
      event.preventDefault();
      items[nextIndex].focus();
    });

    elements.newDocumentButton.addEventListener('click', async () => {
      const name = await requestDocumentName({ title: '新建本地文档', description: '文档只保存在当前浏览器。', initialValue: '未命名文档' });
      if (!name) return;
      const documentItem = makeDocument(name, `# ${name}\n\n`);
      documentsState.documents.push(documentItem);
      documentsState.activeId = documentItem.id;
      loadActiveDocument();
      persistDocuments();
      elements.markdownSource.focus();
      elements.markdownSource.setSelectionRange(elements.markdownSource.value.length, elements.markdownSource.value.length);
      showToast('已新建本地文档');
    });

    elements.renameDocumentButton.addEventListener('click', async () => {
      const current = activeDocument();
      const name = await requestDocumentName({ title: '重命名文档', description: '只修改本地文档名称，不改动正文标题。', initialValue: current.name });
      if (!name) return;
      current.name = name;
      current.updatedAt = Date.now();
      elements.documentTitle.value = name;
      renderDocumentList();
      persistDocuments();
      showToast('文档已重命名');
    });

    elements.duplicateDocumentButton.addEventListener('click', () => {
      const current = activeDocument();
      const duplicate = makeDocument(`${current.name} 副本`, current.content);
      documentsState.documents.push(duplicate);
      documentsState.activeId = duplicate.id;
      loadActiveDocument();
      persistDocuments();
      showToast('已创建文档副本');
    });

    elements.deleteDocumentButton.addEventListener('click', async () => {
      const current = activeDocument();
      const confirmed = await requestConfirmation(`“${current.name}”将从这个浏览器中删除，且无法在本工具内恢复。`);
      if (!confirmed) return;
      documentsState.documents = documentsState.documents.filter(document => document.id !== current.id);
      if (!documentsState.documents.length) documentsState.documents.push(makeDocument());
      documentsState.activeId = documentsState.documents[0].id;
      loadActiveDocument();
      persistDocuments();
      showToast('本地文档已删除');
    });

    elements.formatToolbar.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'local-image') {
        elements.imageInput.click();
        return;
      }
      if (action === 'link') {
        await insertLinkFromDialog();
        return;
      }
      if (action === 'image') {
        await insertImageUrlFromDialog();
        return;
      }
      applyAction(action);
    });

    elements.imageInput.addEventListener('change', async () => {
      const files = Array.from(elements.imageInput.files || []);
      for (const file of files) await insertLocalImage(file);
      elements.imageInput.value = '';
    });

    elements.importButton.addEventListener('click', () => elements.documentImportInput.click());
    elements.documentImportInput.addEventListener('change', async () => {
      const [file] = elements.documentImportInput.files || [];
      if (file) await importDocument(file);
      elements.documentImportInput.value = '';
    });

    elements.editorDropZone.addEventListener('dragenter', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      elements.editorDropZone.classList.add('is-dragging');
    });
    elements.editorDropZone.addEventListener('dragover', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    elements.editorDropZone.addEventListener('dragleave', event => {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) elements.editorDropZone.classList.remove('is-dragging');
    });
    elements.editorDropZone.addEventListener('drop', handleDrop);

    document.querySelectorAll('[data-view-mode]').forEach(button => button.addEventListener('click', () => setView(button.dataset.viewMode)));
    const mobileTabs = Array.from(document.querySelectorAll('[data-mobile-tab]'));
    mobileTabs.forEach(button => button.addEventListener('click', () => setMobileView(button.dataset.mobileTab)));
    document.querySelector('.studio-mobile-tabs')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const currentIndex = Math.max(0, mobileTabs.indexOf(document.activeElement));
      let nextIndex = currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + mobileTabs.length) % mobileTabs.length;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % mobileTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = mobileTabs.length - 1;
      event.preventDefault();
      setMobileView(mobileTabs[nextIndex].dataset.mobileTab);
      mobileTabs[nextIndex].focus();
    });
    elements.sidebarToggle.addEventListener('click', () => toggleSidebar());
    elements.drawerScrim.addEventListener('click', () => toggleSidebar(false));

    elements.outlineList.addEventListener('click', event => {
      const button = event.target.closest('[data-heading-id]');
      if (!button) return;
      if (window.matchMedia('(max-width: 860px)').matches) {
        setMobileView('preview');
        toggleSidebar(false);
      }
      const target = findPreviewTarget(button.dataset.headingId);
      target?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    });

    elements.previewDocument.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;
      const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
      const target = findPreviewTarget(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });

    elements.themeSelect.addEventListener('change', () => updateSetting('theme', elements.themeSelect.value, { rerender: true }));
    elements.fontSelect.addEventListener('change', () => updateSetting('font', elements.fontSelect.value));
    elements.fontSizeSelect.addEventListener('change', () => updateSetting('fontSize', Number(elements.fontSizeSelect.value)));
    elements.lineHeightSelect.addEventListener('change', () => updateSetting('lineHeight', Number(elements.lineHeightSelect.value)));
    elements.accentInput.addEventListener('input', () => updateSetting('accent', elements.accentInput.value));
    elements.widthSelect.addEventListener('change', () => updateSetting('width', elements.widthSelect.value));
    elements.mobilePreviewToggle.addEventListener('change', () => updateSetting('phonePreview', elements.mobilePreviewToggle.checked));
    elements.footnoteToggle.addEventListener('change', () => updateSetting('externalFootnotes', elements.footnoteToggle.checked, { rerender: true }));
    elements.scrollSyncToggle.addEventListener('change', () => updateSetting('scrollSync', elements.scrollSyncToggle.checked));

    elements.markdownSource.addEventListener('scroll', () => synchronizeScroll(elements.markdownSource, elements.previewScroller));
    elements.previewScroller.addEventListener('scroll', () => synchronizeScroll(elements.previewScroller, elements.markdownSource));

    elements.richCopyButton.addEventListener('click', copyRichText);
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      const kind = button.dataset.copy;
      if (kind === 'markdown') {
        await copyPlainText(elements.markdownSource.value);
        showToast('Markdown 已复制');
      } else {
        await ensurePreviewReady();
        const html = getSanitizedPreviewHtml();
        await copyPlainText(html);
        showToast('安全 HTML 已复制');
      }
      button.closest('details').open = false;
    }));

    document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', async () => {
      const format = button.dataset.export;
      button.closest('details').open = false;
      await exportDocument(format);
    }));

    document.querySelectorAll('[data-dialog-cancel]').forEach(button => button.addEventListener('click', () => {
      button.closest('dialog')?.close('cancel');
    }));

    document.querySelectorAll('.studio-menu').forEach(details => {
      const summary = details.querySelector('summary');
      const panel = details.querySelector('.studio-menu-panel');
      const menuItems = () => Array.from(panel?.querySelectorAll('button:not([disabled])') || []);
      summary?.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown') return;
        event.preventDefault();
        details.open = true;
        menuItems()[0]?.focus();
      });
      panel?.addEventListener('keydown', event => {
        const items = menuItems();
        if (!items.length) return;
        const currentIndex = Math.max(0, items.indexOf(document.activeElement));
        let nextIndex = currentIndex;
        if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
        else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = items.length - 1;
        else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          details.open = false;
          summary?.focus();
          return;
        } else {
          return;
        }
        event.preventDefault();
        items[nextIndex].focus();
      });
    });

    window.addEventListener('beforeunload', () => {
      if (saveTimer) persistDocuments();
    });
    document.addEventListener('pointerdown', event => {
      document.querySelectorAll('.studio-menu[open], .studio-settings[open]').forEach(details => {
        if (!details.contains(event.target)) details.removeAttribute('open');
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.studio-menu[open], .studio-settings[open]').forEach(details => details.removeAttribute('open'));
      if (app.classList.contains('sidebar-open')) toggleSidebar(false);
    });
  }

  function handleEditorKeydown(event) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (!['b', 'i', 'k', 's'].includes(key)) return;
    event.preventDefault();

    if (key === 'b') applyAction('bold');
    if (key === 'i') applyAction('italic');
    if (key === 'k') insertLinkFromDialog();
    if (key === 's' && event.shiftKey) applyAction('strike');
    if (key === 's' && !event.shiftKey) persistDocuments({ announce: true });
  }

  async function insertLinkFromDialog() {
    const start = elements.markdownSource.selectionStart;
    const end = elements.markdownSource.selectionEnd;
    const selected = elements.markdownSource.value.slice(start, end);
    const result = await requestLink(selected || '链接文字');
    if (!result) return;
    elements.markdownSource.setSelectionRange(start, end);
    applyAction('link', result);
  }

  async function insertImageUrlFromDialog() {
    const start = elements.markdownSource.selectionStart;
    const end = elements.markdownSource.selectionEnd;
    const selected = elements.markdownSource.value.slice(start, end);
    const result = await requestImageUrl(selected || '图片说明');
    if (!result) return;
    elements.markdownSource.setSelectionRange(start, end);
    applyAction('image', result);
  }

  function requestDocumentName({ title, description, initialValue }) {
    elements.documentDialogTitle.textContent = title;
    elements.documentDialogDescription.textContent = description;
    elements.documentNameInput.value = initialValue;
    elements.documentDialog.returnValue = '';
    elements.documentDialog.showModal();
    requestAnimationFrame(() => elements.documentNameInput.select());

    return new Promise(resolve => {
      const onSubmit = event => {
        event.preventDefault();
        const name = safeDocumentName(elements.documentNameInput.value);
        cleanup();
        elements.documentDialog.close('confirm');
        resolve(name);
      };
      const onClose = () => {
        cleanup();
        resolve(null);
      };
      const cleanup = () => {
        elements.documentDialogForm.removeEventListener('submit', onSubmit);
        elements.documentDialog.removeEventListener('close', onClose);
      };
      elements.documentDialogForm.addEventListener('submit', onSubmit);
      elements.documentDialog.addEventListener('close', onClose, { once: true });
    });
  }

  function requestConfirmation(message) {
    elements.confirmDialogMessage.textContent = message;
    elements.confirmDialog.returnValue = '';
    elements.confirmDialog.showModal();

    return new Promise(resolve => {
      const onSubmit = event => {
        event.preventDefault();
        cleanup();
        elements.confirmDialog.close('confirm');
        resolve(true);
      };
      const onClose = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        elements.confirmDialogForm.removeEventListener('submit', onSubmit);
        elements.confirmDialog.removeEventListener('close', onClose);
      };
      elements.confirmDialogForm.addEventListener('submit', onSubmit);
      elements.confirmDialog.addEventListener('close', onClose, { once: true });
    });
  }

  function requestLink(label) {
    elements.linkTextInput.value = label;
    elements.linkUrlInput.value = 'https://';
    elements.linkUrlInput.setCustomValidity('');
    elements.linkDialog.showModal();
    requestAnimationFrame(() => elements.linkUrlInput.select());

    return new Promise(resolve => {
      const onSubmit = event => {
        event.preventDefault();
        const url = elements.linkUrlInput.value.trim();
        if (!isSafeLinkUrl(url)) {
          elements.linkUrlInput.setCustomValidity('请输入 http、https、mailto、tel 或页面内锚点地址。');
          elements.linkUrlInput.reportValidity();
          return;
        }
        const value = { label: elements.linkTextInput.value.trim() || '链接文字', url };
        cleanup();
        elements.linkDialog.close('confirm');
        resolve(value);
      };
      const onClose = () => {
        cleanup();
        resolve(null);
      };
      const cleanup = () => {
        elements.linkDialogForm.removeEventListener('submit', onSubmit);
        elements.linkDialog.removeEventListener('close', onClose);
      };
      elements.linkDialogForm.addEventListener('submit', onSubmit);
      elements.linkDialog.addEventListener('close', onClose, { once: true });
    });
  }

  function requestImageUrl(alt) {
    elements.imageAltInput.value = alt;
    elements.imageUrlInput.value = 'https://';
    elements.imageUrlInput.setCustomValidity('');
    elements.imageDialog.showModal();
    requestAnimationFrame(() => elements.imageUrlInput.select());

    return new Promise(resolve => {
      const onSubmit = event => {
        event.preventDefault();
        const url = elements.imageUrlInput.value.trim();
        if (!isSafeImageUrl(url) || !/^https?:/i.test(url)) {
          elements.imageUrlInput.setCustomValidity('请输入以 http:// 或 https:// 开头的图片地址。');
          elements.imageUrlInput.reportValidity();
          return;
        }
        const value = { alt: cleanImageAlt(elements.imageAltInput.value), url };
        cleanup();
        elements.imageDialog.close('confirm');
        resolve(value);
      };
      const onClose = () => {
        cleanup();
        resolve(null);
      };
      const cleanup = () => {
        elements.imageDialogForm.removeEventListener('submit', onSubmit);
        elements.imageDialog.removeEventListener('close', onClose);
      };
      elements.imageDialogForm.addEventListener('submit', onSubmit);
      elements.imageDialog.addEventListener('close', onClose, { once: true });
    });
  }

  async function importDocument(file) {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['md', 'markdown', 'txt', 'html', 'htm', 'docx'].includes(extension)) {
      showToast('不支持这个文件类型，请选择 Markdown、TXT、HTML 或 DOCX', 'warning');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      showToast('文档超过 20 MB。请先精简图片或拆分文件后再导入。', 'warning');
      return;
    }

    showToast(`正在导入 ${file.name}`);
    try {
      let content = '';
      let importWarnings = 0;
      if (extension === 'docx') {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        const cleanHtml = sanitizeImportedHtml(result.value);
        content = turndown.turndown(cleanHtml);
        importWarnings = result.messages?.length || 0;
      } else {
        const text = await file.text();
        content = ['html', 'htm'].includes(extension)
          ? turndown.turndown(sanitizeImportedHtml(text))
          : text;
      }

      const fileName = safeDocumentName(file.name.replace(/\.(?:md|markdown|txt|html?|docx)$/i, ''));
      const title = deriveTitle(content, fileName);
      const imported = makeDocument(title, content);
      documentsState.documents.push(imported);
      documentsState.activeId = imported.id;
      loadActiveDocument();
      persistDocuments();
      showToast(importWarnings ? `导入完成，DOCX 有 ${importWarnings} 项版式提示` : `已导入 ${file.name}`);
    } catch (error) {
      console.error('Document import failed.', error);
      showToast('文件导入失败，原草稿没有被覆盖', 'error');
    }
  }

  function sanitizeImportedHtml(html) {
    return DOMPurify.sanitize(String(html), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'input', 'textarea', 'select', 'meta', 'link', 'base'],
      FORBID_ATTR: ['srcdoc'],
    });
  }

  async function handleImagePaste(event) {
    const imageItems = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith('image/'));
    if (!imageItems.length) return;
    event.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) await insertLocalImage(file);
    }
  }

  async function handleDrop(event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    elements.editorDropZone.classList.remove('is-dragging');
    const files = Array.from(event.dataTransfer.files || []);
    const images = files.filter(file => file.type.startsWith('image/'));
    const documents = files.filter(file => !file.type.startsWith('image/'));
    for (const image of images) await insertLocalImage(image);
    if (documents[0]) await importDocument(documents[0]);
    if (documents.length > 1) showToast('一次只导入一个文档，其余文件未处理', 'warning');
  }

  function hasFiles(event) {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
  }

  async function insertLocalImage(file) {
    if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type)) {
      showToast('图片仅支持 PNG、JPEG、WebP 或 GIF', 'warning');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast('图片超过 12 MB。请先压缩图片后再插入。', 'warning');
      return;
    }

    const selectionStart = elements.markdownSource.selectionStart;
    const selectionEnd = elements.markdownSource.selectionEnd;
    showToast('正在本地处理图片');
    try {
      const result = await compressImage(file);
      elements.markdownSource.setSelectionRange(selectionStart, selectionEnd);
      applyAction('image', { alt: cleanImageAlt(file.name.replace(/\.[^.]+$/, '')), url: result.dataUrl });

      if (result.dataUrl.length > LARGE_IMAGE_DATA_LENGTH || elements.markdownSource.value.length > 3_500_000) {
        imageSizeWarning = true;
        updateStorageWarning();
        showToast(`图片内嵌后约 ${formatBytes(result.dataUrl.length)}，请导出 Markdown 备份`, 'warning');
      } else {
        const change = result.originalSize ? Math.round((1 - result.size / result.originalSize) * 100) : 0;
        showToast(change > 0 ? `图片已在本地压缩 ${change}% 并插入` : '图片已在本地处理并插入');
      }
    } catch (error) {
      console.error('Image processing failed.', error);
      showToast('图片处理失败，正文没有被改动', 'error');
    }
  }

  async function compressImage(file) {
    if (file.type === 'image/gif') {
      return { dataUrl: await readAsDataUrl(file), size: file.size, originalSize: file.size };
    }

    const drawable = await loadDrawable(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(drawable.width, drawable.height));
    const width = Math.max(1, Math.round(drawable.width * scale));
    const height = Math.max(1, Math.round(drawable.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: file.type !== 'image/jpeg' });
    if (!context) throw new Error('Canvas is not available.');
    if (file.type === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(drawable.source, 0, 0, width, height);
    drawable.close?.();

    const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const compressed = await canvasToBlob(canvas, outputType, 0.82);
    if (!compressed || (compressed.size >= file.size && scale === 1)) {
      return { dataUrl: await readAsDataUrl(file), size: file.size, originalSize: file.size };
    }
    return { dataUrl: await readAsDataUrl(compressed), size: compressed.size, originalSize: file.size };
  }

  async function loadDrawable(file) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });
      return { source: image, width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('File read failed.'));
      reader.readAsDataURL(blob);
    });
  }

  function cleanImageAlt(value) {
    return String(value || '图片说明').replace(/[\[\]\\\n\r]/g, ' ').replace(/\s+/g, ' ').trim() || '图片说明';
  }

  function synchronizeScroll(source, target) {
    if (!settings.scrollSync || scrollLock) return;
    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    if (sourceRange <= 0 || targetRange <= 0) return;
    scrollLock = true;
    const ratio = source.scrollTop / sourceRange;
    target.scrollTop = ratio * targetRange;
    requestAnimationFrame(() => { scrollLock = false; });
  }

  async function copyRichText() {
    if (!elements.markdownSource.value.trim()) {
      showToast('先写入或导入内容再复制', 'warning');
      return;
    }

    try {
      await ensurePreviewReady();
      const clone = createInlinedPreviewClone();
      const html = DOMPurify.sanitize(clone.outerHTML, SANITIZE_CONFIG);
      const plain = elements.previewDocument.innerText;
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        })]);
      } else {
        copyRichTextFallback(html);
      }
      showToast('富文本已复制，可粘贴到发布编辑器');
    } catch (error) {
      console.warn('Rich clipboard copy failed; trying fallback.', error);
      try {
        const clone = createInlinedPreviewClone();
        copyRichTextFallback(DOMPurify.sanitize(clone.outerHTML, SANITIZE_CONFIG));
        showToast('富文本已通过兼容模式复制');
      } catch (fallbackError) {
        console.error('Rich clipboard fallback failed.', fallbackError);
        showToast('浏览器阻止了富文本复制，请改用复制 HTML', 'error');
      }
    }
  }

  function createInlinedPreviewClone() {
    const staging = elements.previewDocument.cloneNode(true);
    staging.removeAttribute('id');
    staging.setAttribute('aria-hidden', 'true');
    Object.assign(staging.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: WIDTHS[settings.width],
      maxWidth: WIDTHS[settings.width],
      opacity: '0',
      pointerEvents: 'none',
      display: 'block',
    });
    document.body.append(staging);

    const clone = staging.cloneNode(true);
    const sourceElements = [staging, ...staging.querySelectorAll('*')];
    const cloneElements = [clone, ...clone.querySelectorAll('*')];
    sourceElements.forEach((source, index) => {
      const target = cloneElements[index];
      const computed = getComputedStyle(source);
      INLINE_STYLE_PROPERTIES.forEach(property => target.style.setProperty(property, computed.getPropertyValue(property)));
      target.removeAttribute('class');
      target.removeAttribute('data-theme');
      target.removeAttribute('data-display-mode');
      target.removeAttribute('tabindex');
      target.removeAttribute('aria-hidden');
    });

    clone.style.removeProperty('position');
    clone.style.removeProperty('left');
    clone.style.removeProperty('top');
    clone.style.removeProperty('opacity');
    clone.style.removeProperty('pointer-events');
    clone.removeAttribute('aria-hidden');
    clone.querySelectorAll('input[type="checkbox"]').forEach(input => {
      const marker = document.createElement('span');
      marker.textContent = input.checked ? '☑' : '☐';
      marker.style.marginRight = '0.45em';
      input.replaceWith(marker);
    });
    staging.remove();
    return clone;
  }

  function copyRichTextFallback(html) {
    const holder = document.createElement('div');
    holder.contentEditable = 'true';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:fixed;left:-100000px;top:0;opacity:0;';
    holder.innerHTML = html;
    document.body.append(holder);
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const copied = document.execCommand('copy');
    selection.removeAllRanges();
    holder.remove();
    if (!copied) throw new Error('Legacy clipboard copy was rejected.');
  }

  async function copyPlainText(value) {
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = String(value);
      textarea.setAttribute('readonly', '');
      textarea.style.cssText = 'position:fixed;left:-100000px;top:0;';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Clipboard write was rejected.');
    }
  }

  function getSanitizedPreviewHtml() {
    return DOMPurify.sanitize(elements.previewDocument.innerHTML, SANITIZE_CONFIG);
  }

  async function exportDocument(format) {
    const content = elements.markdownSource.value;
    if (!content.trim()) {
      showToast('先写入或导入内容再导出', 'warning');
      return;
    }

    persistDocuments();
    const title = safeDocumentName(elements.documentTitle.value || deriveTitle(content));
    let printWindow = null;
    if (format === 'print') {
      printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('浏览器拦截了打印窗口，请允许此页打开新窗口', 'warning');
        return;
      }
      printWindow.opener = null;
    }
    try {
      if (format !== 'markdown') await ensurePreviewReady();
      if (format === 'markdown') {
        downloadBlob(content, `${title}.md`, 'text/markdown;charset=utf-8');
      } else if (format === 'text') {
        downloadBlob(elements.previewDocument.innerText, `${title}.txt`, 'text/plain;charset=utf-8');
      } else if (format === 'html') {
        const inlined = createInlinedPreviewClone();
        const fullHtml = buildStandaloneHtml(inlined.innerHTML, title, content);
        downloadBlob(fullHtml, `${title}.html`, 'text/html;charset=utf-8');
      } else if (format === 'docx') {
        showToast('正在生成 DOCX');
        const docx = await import('docx');
        const documentFile = buildDocx(title, docx);
        downloadBlob(await docx.Packer.toBlob(documentFile), `${title}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else if (format === 'print') {
        printPreview(title, content, printWindow);
        return;
      }
      showToast(`${formatLabel(format)} 已导出`);
    } catch (error) {
      if (printWindow && !printWindow.closed) printWindow.close();
      console.error(`${format} export failed.`, error);
      showToast(`${formatLabel(format)} 导出失败，原稿仍已保留`, 'error');
    }
  }

  function buildStandaloneHtml(body, title, markdownSource) {
    const includeTitle = !/^\s*#\s+/m.test(markdownSource);
    return wrapTemplate(
      DOMPurify.sanitize(body, SANITIZE_CONFIG),
      settings.theme,
      title,
      {
        ...settings,
        includeTitle,
        exportedAt: new Date().toLocaleDateString('zh-CN'),
      },
    );
  }

  function printPreview(title, markdownSource, printWindow) {
    if (!printWindow || printWindow.closed) {
      showToast('打印窗口已关闭，请重新选择打印 / 保存 PDF', 'warning');
      return;
    }
    const inlined = createInlinedPreviewClone();
    const fullHtml = buildStandaloneHtml(inlined.innerHTML, title, markdownSource);
    let printStarted = false;
    const startPrint = async () => {
      if (printStarted || printWindow.closed) return;
      printStarted = true;
      try {
        await printWindow.document.fonts?.ready;
        await Promise.all(Array.from(printWindow.document.images).map(image => {
          if (image.complete) return Promise.resolve();
          return new Promise(resolve => {
            const timeout = window.setTimeout(resolve, 1800);
            image.addEventListener('load', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
            image.addEventListener('error', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          });
        }));
      } catch {
        // Printing remains available even when a browser cannot report font or image readiness.
      }
      printWindow.focus();
      printWindow.print();
    };
    printWindow.addEventListener('load', startPrint, { once: true });
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    window.setTimeout(startPrint, 900);
    showToast('已打开打印面板，可选择保存为 PDF');
  }

  function buildDocx(title, docx) {
    const { Document, HeadingLevel, Paragraph } = docx;
    const parsed = new DOMParser().parseFromString(getSanitizedPreviewHtml(), 'text/html');
    const children = [new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 320 },
    })];
    parsed.body.childNodes.forEach(node => children.push(...blockNodeToDocx(node, docx)));
    return new Document({
      creator: 'Practical Tools Markdown 发布工作室',
      title,
      description: '从 Markdown 导出的文档',
      sections: [{ properties: {}, children }],
    });
  }

  function blockNodeToDocx(node, docx, context = {}) {
    const { BorderStyle, HeadingLevel, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = docx;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? [new Paragraph({ children: [new TextRun(text)] })] : [];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const tag = node.tagName.toLowerCase();
    const headingMap = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_5,
      h6: HeadingLevel.HEADING_6,
    };
    if (headingMap[tag]) {
      return [new Paragraph({ children: inlineNodesToDocx(node, docx), heading: headingMap[tag], spacing: { before: 240, after: 120 } })];
    }
    if (tag === 'p') return [paragraphFromNode(node, docx, context)];
    if (tag === 'blockquote') return [paragraphFromNode(node, docx, { quote: true })];
    if (tag === 'pre') {
      return [new Paragraph({
        children: [new TextRun({ text: node.textContent || '', font: 'Courier New', size: 18 })],
        spacing: { before: 120, after: 160 },
        shading: { fill: 'EEF2F5' },
      })];
    }
    if (tag === 'ul' || tag === 'ol') {
      const blocks = [];
      Array.from(node.children).forEach((item, index) => {
        if (item.tagName.toLowerCase() !== 'li') return;
        const nestedLists = Array.from(item.children).filter(child => ['UL', 'OL'].includes(child.tagName));
        const shallow = item.cloneNode(true);
        shallow.querySelectorAll(':scope > ul, :scope > ol').forEach(list => list.remove());
        const prefix = tag === 'ol' ? `${index + 1}. ` : '';
        blocks.push(new Paragraph({
          children: [new TextRun(prefix), ...inlineNodesToDocx(shallow, docx)],
          ...(tag === 'ul' ? { bullet: { level: Math.min(context.listLevel || 0, 8) } } : {}),
          indent: tag === 'ol' ? { left: 360 * ((context.listLevel || 0) + 1) } : undefined,
          spacing: { before: 40, after: 40 },
        }));
        nestedLists.forEach(list => blocks.push(...blockNodeToDocx(list, docx, { listLevel: (context.listLevel || 0) + 1 })));
      });
      return blocks;
    }
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr'));
      if (!rows.length) return [];
      return [new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(row => new TableRow({
          children: Array.from(row.children).map(cell => new TableCell({
            children: [new Paragraph({
              children: inlineNodesToDocx(cell, docx, { bold: cell.tagName.toLowerCase() === 'th' }),
              spacing: { before: 60, after: 60 },
            })],
          })),
        })),
      })];
    }
    if (tag === 'hr') {
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' } }, spacing: { before: 180, after: 180 } })];
    }
    if (tag === 'img') {
      return [new Paragraph({ children: [new TextRun({ text: `[图片：${node.getAttribute('alt') || '未命名图片'}]`, italics: true, color: '64748B' })] })];
    }
    if (tag === 'div' && node.classList.contains('studio-diagram')) {
      return [new Paragraph({ children: [new TextRun({ text: '[Mermaid 图表，请在 HTML 或 PDF 导出中查看]', italics: true, color: '64748B' })] })];
    }
    return Array.from(node.childNodes).flatMap(child => blockNodeToDocx(child, docx, context));
  }

  function paragraphFromNode(node, docx, context = {}) {
    const { BorderStyle, Paragraph } = docx;
    const options = {
      children: inlineNodesToDocx(node, docx),
      spacing: { before: 80, after: 100, line: 360 },
    };
    if (context.quote) {
      options.border = { left: { style: BorderStyle.SINGLE, size: 16, color: settings.accent.replace('#', '').toUpperCase() } };
      options.indent = { left: 360 };
    }
    return new Paragraph(options);
  }

  function inlineNodesToDocx(root, docx, inherited = {}) {
    const { ExternalHyperlink, TextRun } = docx;
    const runs = [];
    root.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) runs.push(new TextRun({ text: node.textContent, ...inherited }));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (tag === 'br') {
        runs.push(new TextRun({ break: 1 }));
        return;
      }
      if (tag === 'a' && isSafeLinkUrl(node.getAttribute('href') || '') && /^https?:/i.test(node.getAttribute('href'))) {
        runs.push(new ExternalHyperlink({
          link: node.getAttribute('href'),
          children: [new TextRun({ text: node.textContent || node.getAttribute('href'), color: '0E7490', underline: {} })],
        }));
        return;
      }
      if (tag === 'img') {
        runs.push(new TextRun({ text: `[图片：${node.getAttribute('alt') || '未命名图片'}]`, italics: true }));
        return;
      }
      const next = {
        ...inherited,
        ...(tag === 'strong' || tag === 'b' ? { bold: true } : {}),
        ...(tag === 'em' || tag === 'i' ? { italics: true } : {}),
        ...(tag === 'del' || tag === 's' ? { strike: true } : {}),
        ...(tag === 'code' ? { font: 'Courier New', size: 18, color: '0E7490' } : {}),
      };
      runs.push(...inlineNodesToDocx(node, docx, next));
    });
    return runs.length ? runs : [new TextRun('')];
  }

  function downloadBlob(content, filename, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showToast(message, tone = 'info') {
    window.clearTimeout(toastTimer);
    const toast = document.createElement('div');
    toast.className = 'studio-toast';
    toast.dataset.tone = tone;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    elements.toastRegion.replaceChildren(toast);
    toastTimer = window.setTimeout(() => toast.remove(), 3600);
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
  }

  function formatRelativeDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return formatTime(timestamp);
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatLabel(format) {
    return ({ markdown: 'Markdown', html: 'HTML', text: 'TXT', docx: 'DOCX' })[format] || format.toUpperCase();
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
