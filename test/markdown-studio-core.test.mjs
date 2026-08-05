import test from 'node:test';
import assert from 'node:assert/strict';

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
  slugify,
} from '../src/tools/markdown-studio-core.mjs';

test('escapeHtml escapes executable markup and quotes', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), '&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;');
});

test('slugify keeps Unicode letters and produces a stable fallback', () => {
  assert.equal(slugify('  发布 工作流 2026 '), '发布-工作流-2026');
  assert.equal(slugify('***'), 'section');
});

test('safeDocumentName removes path separators, controls, and excessive length', () => {
  assert.equal(safeDocumentName('  draft/one:\nfinal  '), 'draft one final');
  assert.equal(safeDocumentName(''), '未命名文档');
  assert.equal(safeDocumentName('x'.repeat(100)).length, 80);
});

test('safe URL helpers reject executable protocols', () => {
  for (const url of ['https://example.com/a', 'http://example.com', 'mailto:test@example.com', 'tel:+123', '#章节-1']) {
    assert.equal(isSafeLinkUrl(url), true, url);
  }
  for (const url of ['javascript:alert(1)', 'data:text/html;base64,WA==', '//example.com', 'not a url']) {
    assert.equal(isSafeLinkUrl(url), false, url);
  }

  assert.equal(isSafeImageUrl('https://example.com/a.png'), true);
  assert.equal(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg onload=alert(1)>'), false);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
});

test('normalizeStudioSettings validates enums, colors, and numeric bounds', () => {
  assert.deepEqual(normalizeStudioSettings(null), DEFAULT_STUDIO_SETTINGS);
  assert.deepEqual(normalizeStudioSettings({
    theme: 'developer',
    font: 'mono',
    fontSize: 99,
    lineHeight: 1,
    accent: '#AABBCC',
    width: 'wide',
    phonePreview: true,
    externalFootnotes: true,
    scrollSync: false,
    view: 'preview',
  }), {
    theme: 'developer',
    font: 'mono',
    fontSize: 22,
    lineHeight: 1.55,
    accent: '#aabbcc',
    width: 'wide',
    phonePreview: true,
    externalFootnotes: true,
    scrollSync: false,
    view: 'preview',
  });
});

test('deriveTitle uses the first level-one heading and sanitizes its filename', () => {
  assert.equal(deriveTitle('intro\n# Product / Update\ntext'), 'Product Update');
  assert.equal(deriveTitle('## no h1', 'Fallback: draft'), 'Fallback draft');
});

test('document statistics count mixed CJK/Latin text and paragraphs', () => {
  assert.deepEqual(computeDocumentStats('中文 test words\n\n第二段'), {
    characters: 18,
    words: 7,
    paragraphs: 2,
    readingMinutes: 1,
  });
  assert.deepEqual(computeDocumentStats(''), { characters: 0, words: 0, paragraphs: 0, readingMinutes: 0 });
});

test('cursor position clamps offsets and reports one-based line and column', () => {
  assert.deepEqual(getCursorPosition('abc\ndef', 5), { line: 2, column: 2 });
  assert.deepEqual(getCursorPosition('abc', 999), { line: 1, column: 4 });
  assert.deepEqual(getCursorPosition('abc', -2), { line: 1, column: 1 });
});

test('inline Markdown actions wrap and unwrap the selected text', () => {
  const wrapped = applyMarkdownAction('hello world', 6, 11, 'bold');
  assert.equal(wrapped.value, 'hello **world**');
  assert.deepEqual([wrapped.selectionStart, wrapped.selectionEnd], [8, 13]);

  const unwrapped = applyMarkdownAction(wrapped.value, 8, 13, 'bold');
  assert.equal(unwrapped.value, 'hello world');
  assert.deepEqual([unwrapped.selectionStart, unwrapped.selectionEnd], [6, 11]);
});

test('block Markdown actions transform full selected lines', () => {
  assert.equal(applyMarkdownAction('one\ntwo', 0, 7, 'ordered-list').value, '1. one\n2. two');
  assert.equal(applyMarkdownAction('old title', 0, 9, 'heading-2').value, '## old title');
  assert.match(applyMarkdownAction('', 0, 0, 'table').value, /^\| 项目 \| 说明 \| 状态 \|/);
  assert.equal(applyMarkdownAction('before', 6, 6, 'toc').value, 'before\n\n[TOC]');
});

test('normalizeStoredState repairs malformed documents, deduplicates IDs, and selects a valid active document', () => {
  const fallback = () => ({ id: 'fallback', name: 'Fallback', content: '', createdAt: 1, updatedAt: 1 });
  const repaired = normalizeStoredState({
    activeId: 'missing',
    documents: [
      { id: 'one', name: 'A/B', content: '# A', createdAt: 10, updatedAt: 20 },
      { id: 'one', name: 'duplicate', content: 'ignored' },
      { id: '', name: 'empty id', content: 'ignored' },
      null,
    ],
  }, fallback);

  assert.equal(repaired.documents.length, 1);
  assert.equal(repaired.documents[0].id, 'one');
  assert.equal(repaired.documents[0].name, 'A B');
  assert.equal(repaired.activeId, 'one');
  assert.equal(normalizeStoredState(null, fallback).activeId, 'fallback');
});
