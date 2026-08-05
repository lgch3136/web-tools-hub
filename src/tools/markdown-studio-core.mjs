export const STORAGE_VERSION = 1;

export const DEFAULT_STUDIO_SETTINGS = Object.freeze({
  theme: 'clean',
  font: 'system',
  fontSize: 16,
  lineHeight: 1.85,
  accent: '#0f6575',
  width: 'standard',
  phonePreview: false,
  externalFootnotes: false,
  scrollSync: true,
  view: 'split',
});

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function slugify(value = '') {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

export function safeDocumentName(value = '未命名文档') {
  const cleaned = String(value)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || '未命名文档';
}

export function isSafeLinkUrl(value = '') {
  const url = String(value).trim();
  if (!url) return false;
  if (url.startsWith('#')) return /^#[\w\p{Letter}\p{Number}_.:-]+$/u.test(url);

  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isSafeImageUrl(value = '') {
  const url = String(value).trim();
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(url)) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeStudioSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const themes = new Set(['clean', 'wechat', 'toutiao', 'developer', 'notebook']);
  const fonts = new Set(['system', 'sans', 'serif', 'mono']);
  const widths = new Set(['narrow', 'standard', 'wide']);
  const views = new Set(['editor', 'split', 'preview']);
  const fontSize = Number(source.fontSize);
  const lineHeight = Number(source.lineHeight);

  return {
    theme: themes.has(source.theme) ? source.theme : DEFAULT_STUDIO_SETTINGS.theme,
    font: fonts.has(source.font) ? source.font : DEFAULT_STUDIO_SETTINGS.font,
    fontSize: Number.isFinite(fontSize) ? Math.min(22, Math.max(14, fontSize)) : DEFAULT_STUDIO_SETTINGS.fontSize,
    lineHeight: Number.isFinite(lineHeight) ? Math.min(2.15, Math.max(1.55, lineHeight)) : DEFAULT_STUDIO_SETTINGS.lineHeight,
    accent: /^#[0-9a-f]{6}$/i.test(source.accent || '') ? source.accent.toLowerCase() : DEFAULT_STUDIO_SETTINGS.accent,
    width: widths.has(source.width) ? source.width : DEFAULT_STUDIO_SETTINGS.width,
    phonePreview: source.phonePreview === true,
    externalFootnotes: source.externalFootnotes === true,
    scrollSync: source.scrollSync !== false,
    view: views.has(source.view) ? source.view : DEFAULT_STUDIO_SETTINGS.view,
  };
}

export function deriveTitle(markdown = '', fallback = '未命名文档') {
  const heading = String(markdown).match(/^\s*#\s+(.+?)\s*#*\s*$/m);
  return safeDocumentName(heading ? heading[1] : fallback);
}

export function computeDocumentStats(markdown = '') {
  const text = String(markdown);
  const characters = Array.from(text).length;
  const cjkCharacters = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || []).length;
  const latinWords = (text
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ')
    .match(/[\p{Letter}\p{Number}]+(?:['’-][\p{Letter}\p{Number}]+)*/gu) || []).length;
  const words = cjkCharacters + latinWords;
  const paragraphs = text.trim()
    ? text.trim().split(/\n\s*\n/).filter(block => block.trim()).length
    : 0;
  const readingMinutes = words ? Math.max(1, Math.ceil((cjkCharacters / 300) + (latinWords / 200))) : 0;

  return { characters, words, paragraphs, readingMinutes };
}

export function getCursorPosition(value = '', selectionStart = 0) {
  const safeOffset = Math.max(0, Math.min(Number(selectionStart) || 0, String(value).length));
  const before = String(value).slice(0, safeOffset);
  const lines = before.split('\n');
  return { line: lines.length, column: (lines.at(-1) || '').length + 1 };
}

function lineRange(value, start, end) {
  const rangeStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf('\n', end);
  const rangeEnd = nextBreak === -1 ? value.length : nextBreak;
  return { rangeStart, rangeEnd, text: value.slice(rangeStart, rangeEnd) };
}

function wrapSelection(source, start, end, before, after, placeholder) {
  const selected = source.slice(start, end);
  const content = selected || placeholder;
  const wrapped = `${before}${content}${after}`;
  const value = source.slice(0, start) + wrapped + source.slice(end);

  if (selected) {
    return { value, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
  }

  return { value, selectionStart: start + before.length, selectionEnd: start + before.length + placeholder.length };
}

function toggleWrap(source, start, end, marker, placeholder) {
  const selected = source.slice(start, end);
  if (selected && source.slice(start - marker.length, start) === marker && source.slice(end, end + marker.length) === marker) {
    return {
      value: source.slice(0, start - marker.length) + selected + source.slice(end + marker.length),
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }
  return wrapSelection(source, start, end, marker, marker, placeholder);
}

function prefixLines(source, start, end, formatter) {
  const { rangeStart, rangeEnd, text } = lineRange(source, start, end);
  const lines = text.split('\n');
  const replacement = lines.map((line, index) => formatter(line, index)).join('\n');
  return {
    value: source.slice(0, rangeStart) + replacement + source.slice(rangeEnd),
    selectionStart: rangeStart,
    selectionEnd: rangeStart + replacement.length,
  };
}

function blockInsertion(source, start, end, content, selectText = '') {
  const leading = start > 0 && source[start - 1] !== '\n' ? '\n\n' : '';
  const trailing = end < source.length && source[end] !== '\n' ? '\n\n' : '';
  const insertion = `${leading}${content}${trailing}`;
  const value = source.slice(0, start) + insertion + source.slice(end);
  const selectionOffset = selectText ? insertion.indexOf(selectText) : insertion.length;
  return {
    value,
    selectionStart: start + selectionOffset,
    selectionEnd: start + selectionOffset + selectText.length,
  };
}

export function applyMarkdownAction(source = '', start = 0, end = start, action, options = {}) {
  const value = String(source);
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const selected = value.slice(safeStart, safeEnd);

  switch (action) {
    case 'bold':
      return toggleWrap(value, safeStart, safeEnd, '**', '重点文字');
    case 'italic':
      return toggleWrap(value, safeStart, safeEnd, '*', '强调文字');
    case 'strike':
      return toggleWrap(value, safeStart, safeEnd, '~~', '删除文字');
    case 'inline-code':
      return toggleWrap(value, safeStart, safeEnd, '`', 'code');
    case 'link': {
      const label = selected || options.label || '链接文字';
      const url = options.url || 'https://example.com';
      return wrapSelection(value, safeStart, safeEnd, '[', `](${url})`, label);
    }
    case 'image': {
      const alt = options.alt || selected || '图片说明';
      const url = options.url || 'https://example.com/image.jpg';
      const markdown = `![${alt}](${url})`;
      return blockInsertion(value, safeStart, safeEnd, markdown, options.url ? '' : url);
    }
    case 'code-block': {
      const language = String(options.language || '').replace(/[^a-z0-9_+#.-]/gi, '').slice(0, 30);
      const code = selected || options.placeholder || '在这里输入代码';
      return blockInsertion(value, safeStart, safeEnd, `\`\`\`${language}\n${code}\n\`\`\``, code);
    }
    case 'heading-1':
    case 'heading-2':
    case 'heading-3': {
      const level = Number(action.at(-1));
      return prefixLines(value, safeStart, safeEnd, line => `${'#'.repeat(level)} ${line.replace(/^#{1,6}\s+/, '') || '标题'}`);
    }
    case 'quote':
      return prefixLines(value, safeStart, safeEnd, line => `> ${line.replace(/^>\s?/, '')}`);
    case 'unordered-list':
      return prefixLines(value, safeStart, safeEnd, line => `- ${line.replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '') || '列表项'}`);
    case 'ordered-list':
      return prefixLines(value, safeStart, safeEnd, (line, index) => `${index + 1}. ${line.replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '') || '列表项'}`);
    case 'task-list':
      return prefixLines(value, safeStart, safeEnd, line => `- [ ] ${line.replace(/^\s*[-+*]\s+(?:\[[ xX]\]\s*)?/, '') || '待办事项'}`);
    case 'table':
      return blockInsertion(
        value,
        safeStart,
        safeEnd,
        '| 项目 | 说明 | 状态 |\n| --- | --- | --- |\n| 示例 | 可直接修改 | 完成 |',
        '示例',
      );
    case 'horizontal-rule':
      return blockInsertion(value, safeStart, safeEnd, '---');
    case 'toc':
      return blockInsertion(value, safeStart, safeEnd, '[TOC]');
    default:
      return { value, selectionStart: safeStart, selectionEnd: safeEnd };
  }
}

export function normalizeStoredState(raw, createFallback) {
  const fallback = typeof createFallback === 'function' ? createFallback : () => ({ id: 'draft', name: '未命名文档', content: '' });
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.documents)) {
    const document = fallback();
    return { version: STORAGE_VERSION, activeId: document.id, documents: [document] };
  }

  const seenIds = new Set();
  const documents = raw.documents
    .filter(item => item && typeof item === 'object' && typeof item.id === 'string')
    .slice(0, 100)
    .filter(item => {
      const id = item.id.slice(0, 100);
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    })
    .map(item => ({
      id: item.id.slice(0, 100),
      name: safeDocumentName(item.name),
      content: typeof item.content === 'string' ? item.content : '',
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
    }));

  if (!documents.length) documents.push(fallback());
  const activeId = documents.some(item => item.id === raw.activeId) ? raw.activeId : documents[0].id;
  return { version: STORAGE_VERSION, activeId, documents };
}
