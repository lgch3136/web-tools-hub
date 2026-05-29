// === MD ↔ HTML 转换器工具模块 ===
import { t } from '../i18n.js';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink } from 'docx';
import mammoth from 'mammoth';
import { TEMPLATES, wrapTemplate, groupBlocks, addIds } from './mdhtml-templates.js';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', hr: '---', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**' });
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

export function render(container) {
  // 用 wrapper 包裹所有 HTML，避免 firstChild 丢失元素
  container.innerHTML = '';

  const html = `
    <div class="mdhtml-toolbar">
      <div class="mdhtml-dropdown">
        <button class="btn" id="btnImport">${t('mdhtml.import')}</button>
        <div class="mdhtml-dropdown-menu hidden" id="importMenu">
          <button class="menu-item" data-fmt="md">${t('mdhtml.import.fmt_md')}</button>
          <button class="menu-item" data-fmt="html">${t('mdhtml.import.fmt_html')}</button>
          <button class="menu-item" data-fmt="txt">${t('mdhtml.import.fmt_txt')}</button>
          <button class="menu-item" data-fmt="word">${t('mdhtml.import.fmt_word')}</button>
        </div>
      </div>
      <input type="file" id="importInput" hidden />
      <div class="mdhtml-dropdown">
        <button class="btn btn-success" id="btnExport">${t('mdhtml.export')}</button>
        <div class="mdhtml-dropdown-menu hidden" id="exportMenu">
          <button class="menu-item" data-fmt="pdf">${t('mdhtml.export.fmt_pdf')}</button>
          <button class="menu-item" data-fmt="word">${t('mdhtml.export.fmt_word')}</button>
          <button class="menu-item" data-fmt="html">${t('mdhtml.export.fmt_html')}</button>
          <button class="menu-item" data-fmt="md">${t('mdhtml.export.fmt_md')}</button>
          <button class="menu-item" data-fmt="txt">${t('mdhtml.export.fmt_txt')}</button>
        </div>
      </div>
      <span class="sep"></span>
      <button class="btn btn-danger" id="btnClear">${t('mdhtml.clear')}</button>
    </div>
    <div class="mdhtml-editor">
      <!-- MD Pane -->
      <div class="mdhtml-pane">
        <div class="mdhtml-pane-header">
          <span>${t('mdhtml.md_label')}</span>
          <div class="mdhtml-mode-btns">
            <button class="mdhtml-mode-btn active" data-pane="md" data-mode="render">${t('mdhtml.view')}</button>
            <button class="mdhtml-mode-btn" data-pane="md" data-mode="source">${t('mdhtml.source')}</button>
          </div>
        </div>
        <div class="mdhtml-fmt-bar" id="mdFmtBar">
          <button class="mdhtml-fmt-btn" data-fmt="bold" title="加粗"><b>B</b></button>
          <button class="mdhtml-fmt-btn" data-fmt="italic" title="斜体"><i>I</i></button>
          <button class="mdhtml-fmt-btn" data-fmt="h1">H1</button>
          <button class="mdhtml-fmt-btn" data-fmt="h2">H2</button>
          <span class="mdhtml-fmt-sep"></span>
          <button class="mdhtml-fmt-btn" data-fmt="ul">•</button>
          <button class="mdhtml-fmt-btn" data-fmt="ol">1.</button>
          <button class="mdhtml-fmt-btn" data-fmt="blockquote">❝</button>
          <button class="mdhtml-fmt-btn" data-fmt="link">🔗</button>
          <button class="mdhtml-fmt-btn" data-fmt="code">💻</button>
          <button class="mdhtml-fmt-btn" data-fmt="image">🖼️</button>
          <button class="mdhtml-fmt-btn" data-fmt="table">📊</button>
        </div>
        <div id="mdRender" class="mdhtml-render" contenteditable spellcheck="false" data-placeholder="${t('mdhtml.md_render_ph')}"></div>
        <textarea id="mdSource" class="mdhtml-source hidden" spellcheck="false" placeholder="${t('mdhtml.md_placeholder')}"></textarea>
      </div>
      <!-- Center -->
      <div class="mdhtml-center">
        <button id="btnMdToHtml" class="mdhtml-sync-btn"><span class="mdhtml-sync-arrow">→</span>${t('mdhtml.to_html')}</button>
        <div class="mdhtml-sync-divider"></div>
        <button id="btnHtmlToMd" class="mdhtml-sync-btn"><span class="mdhtml-sync-arrow">←</span>${t('mdhtml.to_md')}</button>
      </div>
      <!-- HTML Pane -->
      <div class="mdhtml-pane">
        <div class="mdhtml-pane-header">
          <span>${t('mdhtml.html_label')}</span>
          <div class="mdhtml-mode-btns">
            <button class="mdhtml-mode-btn active" data-pane="html" data-mode="render">${t('mdhtml.view')}</button>
            <button class="mdhtml-mode-btn" data-pane="html" data-mode="source">${t('mdhtml.source')}</button>
            <button class="mdhtml-mode-btn" data-pane="html" data-mode="preview">📱 模板预览</button>
          </div>
        </div>
        <!-- 模板选择栏 -->
        <div class="mdhtml-tmpl-bar hidden" id="tmplBar">
          <select id="tmplSelect" class="mdhtml-tmpl-select">
            <option value="">选择排版模板...</option>
            <optgroup label="📄 开发文档">
              <option value="techdocs">① 技术文档 TechDocs</option>
              <option value="prd">② 产品需求 PRD</option>
              <option value="apidocs">④ API 接口文档</option>
            </optgroup>
            <optgroup label="📝 内容创作">
              <option value="blog">③ 博客文章 Blog</option>
              <option value="report">⑤ 项目报告 Report</option>
              <option value="knowledgebase">⑥ 知识笔记 KB</option>
            </optgroup>
            <optgroup label="📱 社交平台">
              <option value="xiaohongshu">⑦ 小红书风格 RED</option>
              <option value="wechat">⑧ 公众号风格 WeChat</option>
              <option value="zhihu">⑨ 知乎风格 Zhihu</option>
              <option value="toutiao">⑩ 今日头条 Toutiao</option>
            </optgroup>
          </select>
          <button class="btn btn-sm" id="btnPreviewTmpl">👁️ 预览</button>
        </div>
        <div class="mdhtml-fmt-bar hidden" id="htmlFmtBar">
          <button class="mdhtml-fmt-btn" data-fmt="bold"><b>B</b></button>
          <button class="mdhtml-fmt-btn" data-fmt="italic"><i>I</i></button>
          <button class="mdhtml-fmt-btn" data-fmt="h1">H1</button>
          <button class="mdhtml-fmt-btn" data-fmt="h2">H2</button>
          <span class="mdhtml-fmt-sep"></span>
          <button class="mdhtml-fmt-btn" data-fmt="ul">•</button>
          <button class="mdhtml-fmt-btn" data-fmt="ol">1.</button>
          <button class="mdhtml-fmt-btn" data-fmt="blockquote">❝</button>
          <button class="mdhtml-fmt-btn" data-fmt="link">🔗</button>
          <button class="mdhtml-fmt-btn" data-fmt="image">🖼️</button>
        </div>
        <div id="htmlRender" class="mdhtml-render" contenteditable spellcheck="false" data-placeholder="${t('mdhtml.html_render_ph')}"></div>
        <textarea id="htmlSource" class="mdhtml-source hidden" spellcheck="false" placeholder="${t('mdhtml.html_placeholder')}"></textarea>
        <!-- 模板预览 iframe -->
        <iframe id="tmplPreview" class="mdhtml-tmpl-preview hidden" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
    </div>
    <!-- Modals -->
    <div class="mdhtml-modal-overlay hidden" id="mdhtmlModal">
      <div class="mdhtml-modal">
        <h3 id="mdhtmlModalTitle">${t('mdhtml.modal.title')}</h3>
        <div id="mdhtmlModalBody"></div>
        <div class="mdhtml-modal-btns">
          <button class="btn btn-primary" id="mdhtmlModalOk">${t('mdhtml.modal.ok')}</button>
          <button class="btn" id="mdhtmlModalCancel">${t('mdhtml.modal.cancel')}</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // ---- DOM refs (带空值保护) ----
  const $ = (id) => document.getElementById(id);
  const mdRender = $('mdRender'), mdSource = $('mdSource'), htmlRender = $('htmlRender'), htmlSource = $('htmlSource');
  const mdFmtBar = $('mdFmtBar'), htmlFmtBar = $('htmlFmtBar');
  const btnImport = $('btnImport'), importMenu = $('importMenu'), importInput = $('importInput');
  const btnExport = $('btnExport'), exportMenu = $('exportMenu');

  // 快速失败检查：如果核心元素缺失，直接显示错误
  if (!mdRender || !htmlRender) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#f85149;">⚠️ 编辑器加载失败，请刷新页面</div>';
    return;
  }

  const paneModes = { md: 'render', html: 'render' };
  let pendingTarget = null;

  // ---- Helper ----
  function parseMd(md) { return md.trim() ? marked.parse(md) : ''; }
  function renderToMd(el) { return turndown.turndown(el.innerHTML || ''); }
  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function toast(msg) { const e = document.createElement('div'); e.className='toast'; e.textContent=msg; document.body.appendChild(e); setTimeout(()=>e.remove(),2000); }

  function downloadBlob(content, filename, mime='text/html;charset=utf-8') {
    const b = new Blob([content],{type:mime}), a = document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
  }

  // ---- Pane mode ----
  function setPaneMode(pane, mode, skipSync=false) {
    const tmplBar = $('tmplBar');
    const tmplSelect = $('tmplSelect');
    const tmplPreview = $('tmplPreview');
    const prev = paneModes[pane]; paneModes[pane] = mode;
    document.querySelectorAll(`.mdhtml-mode-btn[data-pane="${pane}"]`).forEach(b => b.classList.toggle('active', b.dataset.mode===mode));
    if (pane==='md') {
      if (mode==='render') {
        if (!skipSync && prev==='source') mdRender.innerHTML = parseMd(mdSource.value);
        mdSource.classList.add('hidden'); mdFmtBar.classList.remove('hidden'); mdRender.classList.remove('hidden');
      } else {
        if (!skipSync && prev==='render') mdSource.value = renderToMd(mdRender);
        mdRender.classList.add('hidden'); mdFmtBar.classList.add('hidden'); mdSource.classList.remove('hidden'); mdSource.focus();
      }
    } else {
      // HTML pane
      if (mode==='render') {
        if (!skipSync && prev==='source') htmlRender.innerHTML = htmlSource.value;
        htmlSource.classList.add('hidden'); htmlFmtBar.classList.remove('hidden'); htmlRender.classList.remove('hidden');
        tmplBar.classList.add('hidden'); tmplPreview.classList.add('hidden');
      } else if (mode==='source') {
        if (!skipSync && prev==='render') htmlSource.value = htmlRender.innerHTML;
        htmlRender.classList.add('hidden'); htmlFmtBar.classList.add('hidden'); htmlSource.classList.remove('hidden'); htmlSource.focus();
        tmplBar.classList.add('hidden'); tmplPreview.classList.add('hidden');
      } else if (mode==='preview') {
        // 预览模式
        htmlRender.classList.add('hidden'); htmlFmtBar.classList.add('hidden'); htmlSource.classList.add('hidden');
        tmplBar.classList.remove('hidden'); tmplPreview.classList.remove('hidden');
        updateTmplPreview();
      }
    }
  }

  // ---- Convert ----
  $('btnMdToHtml').addEventListener('click', () => {
    let md = paneModes.md==='render' ? renderToMd(mdRender) : mdSource.value;
    if (!md.trim()) { toast(t('mdhtml.toast.no_md')); return; }
    mdSource.value = md;
    const html = marked.parse(md);
    htmlSource.value = html;
    setPaneMode('md','render',true); mdRender.innerHTML = html;
    setPaneMode('html','render',true); htmlRender.innerHTML = html;
    toast(t('mdhtml.toast.md2html'));
  });

  $('btnHtmlToMd').addEventListener('click', () => {
    let html = paneModes.html==='render' ? htmlRender.innerHTML : htmlSource.value;
    if (!html.trim()) { toast(t('mdhtml.toast.no_html')); return; }
    htmlSource.value = html;
    const md = turndown.turndown(html);
    mdSource.value = md;
    setPaneMode('md','render',true); mdRender.innerHTML = html;
    setPaneMode('html','render',true); htmlRender.innerHTML = html;
    toast(t('mdhtml.toast.html2md'));
  });

  // ---- Format ----
  function setupFmtBar(bar, renderEl) {
    bar.querySelectorAll('.mdhtml-fmt-btn').forEach(b => {
      b.addEventListener('click', () => handleFmt(b.dataset.fmt, renderEl));
    });
  }
  setupFmtBar(mdFmtBar, mdRender);
  setupFmtBar(htmlFmtBar, htmlRender);

  function handleFmt(fmt, el) {
    el.focus();
    switch(fmt) {
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'h1': wrapBlock(el, '<h1>','</h1>'); break;
      case 'h2': wrapBlock(el, '<h2>','</h2>'); break;
      case 'ul': wrapBlock(el, '<ul>\n  <li>','</li>\n</ul>'); break;
      case 'ol': wrapBlock(el, '<ol>\n  <li>','</li>\n</ol>'); break;
      case 'blockquote': wrapBlock(el, '<blockquote>','</blockquote>'); break;
      case 'link': promptLink(el); break;
      case 'code': promptCode(el); break;
      case 'image': promptImage(el); break;
      case 'table': promptTable(el); break;
    }
  }

  function wrapBlock(el, before, after) {
    const sel = window.getSelection(); if (!sel||sel.rangeCount===0) return;
    const r = sel.getRangeAt(0), t = r.toString()||'内容';
    const w = document.createElement('div'); w.innerHTML = before+t+after;
    r.deleteContents();
    const f = document.createDocumentFragment(); while(w.firstChild) f.appendChild(w.firstChild);
    r.insertNode(f);
  }

  // ---- Modal (unified) ----
  const modal = $('mdhtmlModal'), modalTitle = $('mdhtmlModalTitle'), modalBody = $('mdhtmlModalBody');
  let modalCallback = null;

  function openModal(title, bodyHtml, cb) {
    modalTitle.textContent = title; modalBody.innerHTML = bodyHtml; modalCallback = cb;
    modal.classList.remove('hidden');
  }
  function closeModal() { modal.classList.add('hidden'); modalCallback = null; }
  $('mdhtmlModalOk').addEventListener('click', () => { if (modalCallback) modalCallback(); closeModal(); });
  $('mdhtmlModalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target===modal) closeModal(); });

  function promptLink(el) {
    openModal(t('mdhtml.modal.link'), `<input id="linkText" class="mdhtml-modal-input" placeholder="${t('mdhtml.modal.link_text')}" /><input id="linkUrl" class="mdhtml-modal-input" placeholder="${t('mdhtml.modal.link_url')}" />`, () => {
      const text = $('linkText').value.trim() || t('mdhtml.modal.link_text'); const url = $('linkUrl').value.trim();
      if (!url) return;
      el.focus(); document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener" style="color:#79c0ff;">${text}</a>`);
    });
  }

  function promptCode(el) {
    openModal(t('mdhtml.modal.code'), `<input id="codeLang" class="mdhtml-modal-input" placeholder="${t('mdhtml.modal.code_lang')}" /><textarea id="codeCode" class="mdhtml-modal-textarea" placeholder="${t('mdhtml.modal.code_ph')}"></textarea>`, () => {
      const lang = $('codeLang').value.trim(), code = $('codeCode').value;
      el.focus();
      if (el===mdRender) { const f = lang?`\`\`\`${lang}\n${code}\n\`\`\``:`\`\`\`\n${code}\n\`\`\``; document.execCommand('insertHTML',false,marked.parse(f)); }
      else document.execCommand('insertHTML',false,`<pre style="background:#161b22;border:1px solid #21262d;border-radius:6px;padding:12px;overflow-x:auto;"><code>${escapeHtml(code)}</code></pre>`);
    });
  }

  function promptImage(el) {
    openModal(t('mdhtml.modal.image'), '<input type="file" id="imgFile" accept="image/*" style="padding:4px;" />', async () => {
      const f = $('imgFile').files[0]; if (!f) return;
      const dataUrl = await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f);});
      const alt = f.name.replace(/\.[^.]+$/,'');
      el.focus();
      if (el===mdRender) document.execCommand('insertHTML',false,marked.parse(`![${alt}](data:image;base64,${dataUrl.split(',')[1]})`));
      else document.execCommand('insertHTML',false,`<img src="${dataUrl}" alt="${alt}" style="max-width:100%;border-radius:6px;margin:6px 0;" />`);
    });
  }

  function promptTable(el) {
    openModal(t('mdhtml.modal.table'), `<div style="display:flex;gap:10px;margin-bottom:10px;"><label style="font-size:.8rem;color:#8b949e;">${t('mdhtml.modal.rows')}</label><input type="number" id="tRows" value="3" min="2" max="20" style="width:60px;" /></div><div style="display:flex;gap:10px;"><label style="font-size:.8rem;color:#8b949e;">${t('mdhtml.modal.cols')}</label><input type="number" id="tCols" value="3" min="1" max="10" style="width:60px;" /></div>`, () => {
      const rows=parseInt($('tRows').value)||3, cols=parseInt($('tCols').value)||3;
      el.focus();
      if (el===mdRender) { let md='\n|'; for(let c=0;c<cols;c++) md+=` ${t('mdhtml.modal.col_label')}${c+1} |`; md+='\n|'; for(let c=0;c<cols;c++) md+=' --- |'; md+='\n'; for(let r=0;r<rows-1;r++){md+='|';for(let c=0;c<cols;c++)md+=` ${t('mdhtml.modal.cell')} |`;md+='\n';} document.execCommand('insertHTML',false,marked.parse(md)); }
      else { let t='<table style="width:100%;border-collapse:collapse;margin:8px 0;">'; t+='<thead><tr>'; for(let c=0;c<cols;c++) t+=`<th style="border:1px solid #21262d;padding:6px 10px;">${t('mdhtml.modal.col_label')}${c+1}</th>`; t+='</tr></thead><tbody>'; for(let r=0;r<rows-1;r++){t+='<tr>';for(let c=0;c<cols;c++)t+=`<td style="border:1px solid #21262d;padding:6px 10px;">${t('mdhtml.modal.cell')}</td>`;t+='</tr>';} document.execCommand('insertHTML',false,t+'</tbody></table>'); }
    });
  }

  // ---- Import ----
  btnImport.addEventListener('click', e => { e.stopPropagation(); importMenu.classList.toggle('hidden'); exportMenu.classList.add('hidden'); });
  importMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      importMenu.classList.add('hidden');
      const fmt = item.dataset.fmt;
      importInput.accept = fmt==='word'?'.docx,.doc':'.'+fmt+',.'+fmt.toUpperCase();
      importInput.dataset.importFmt = fmt;
      importInput.click();
    });
  });

  importInput.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const fmt = importInput.dataset.importFmt;
    toast(t('mdhtml.toast.importing'));
    try {
      if (fmt==='word'||file.name.match(/\.docx?$/i)) {
        const buf = await file.arrayBuffer(), result = await mammoth.convertToHtml({arrayBuffer:buf});
        const h = result.value, m = turndown.turndown(h);
        mdSource.value=m; htmlSource.value=h; setPaneMode('md','render',true); setPaneMode('html','render',true);
        mdRender.innerHTML=h; htmlRender.innerHTML=h;
      } else {
        const text = await file.text();
        if (fmt==='html'||file.name.match(/\.html?$/i)) {
          const m = turndown.turndown(text);
          mdSource.value=m; htmlSource.value=text; setPaneMode('md','render',true); setPaneMode('html','render',true);
          mdRender.innerHTML=text; htmlRender.innerHTML=text;
        } else {
          const h = (fmt==='txt') ? '<p>'+escapeHtml(text).replace(/\n/g,'<br>')+'</p>' : marked.parse(text);
          mdSource.value=text; htmlSource.value=h; setPaneMode('md','render',true); setPaneMode('html','render',true);
          mdRender.innerHTML=h; htmlRender.innerHTML=h;
        }
      }
      toast(t('mdhtml.toast.imported') + file.name);
    } catch(err) { console.error(err); toast(t('mdhtml.toast.import_err')); }
    importInput.value='';
  });

  // ---- Export ----
  btnExport.addEventListener('click', e => { e.stopPropagation(); exportMenu.classList.toggle('hidden'); importMenu.classList.add('hidden'); });
  exportMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async e => {
      e.stopPropagation(); exportMenu.classList.add('hidden');
      const md = mdSource.value.trim(); if (!md) { toast(t('mdhtml.toast.no_export')); return; }
      const htmlBody = marked.parse(md);
      const fmt = item.dataset.fmt;
      try {
        if (fmt==='pdf') { await exportPdf(htmlBody); }
        else if (fmt==='word') { await exportWord(htmlBody); }
        else if (fmt==='html') { exportHtml(htmlBody); }
        else if (fmt==='md') { downloadBlob(md,'document.md','text/markdown;charset=utf-8'); toast(t('mdhtml.toast.md')); }
        else if (fmt==='txt') { const d=document.createElement('div');d.innerHTML=htmlBody;downloadBlob(d.textContent||'','document.txt','text/plain;charset=utf-8');toast(t('mdhtml.toast.txt')); }
      } catch(err) { console.error(err); toast(t('mdhtml.toast.export_err') + fmt.toUpperCase() + t('mdhtml.toast.export_err2')); }
    });
  });

  async function exportPdf(body) {
    toast(t('mdhtml.toast.pdf_gen'));
    await loadHtml2Pdf();
    const full = buildFullHtml(body);
    const iframe = document.createElement('iframe');
    iframe.style.cssText='position:fixed;left:-9999px;width:800px;height:600px;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open(); iframe.contentDocument.write(full); iframe.contentDocument.close();
    await new Promise(r=>setTimeout(r,600));
    await window.html2pdf().set({margin:[8,8,8,8],filename:'document.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(iframe.contentDocument.body).save();
    document.body.removeChild(iframe);
    toast(t('mdhtml.toast.pdf'));
  }

  function loadHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.3/html2pdf.bundle.min.js';
      s.onload=()=>resolve(); s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  async function exportWord(body) {
    toast(t('mdhtml.toast.word_gen'));
    const doc = new Document({sections:[{properties:{},children:htmlToDocx(body)}]});
    downloadBlob(await Packer.toBlob(doc),'document.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    toast(t('mdhtml.toast.word'));
  }

  // ---- Template Preview ----
  // 绑定事件（包括 preview 模式）
  document.querySelectorAll('.mdhtml-mode-btn').forEach(b => {
    b.addEventListener('click', () => setPaneMode(b.dataset.pane, b.dataset.mode));
  });

  // 更新模板预览
  function updateTmplPreview() {
    const tmplSelect = $('tmplSelect');
    const tmplPreview = $('tmplPreview');
    if (!tmplSelect || !tmplPreview) return;
    const tmplId = tmplSelect.value;
    if (!tmplId) {
      tmplPreview.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">请选择一个排版模板</div>';
      return;
    }

    // 获取 HTML 内容（优先从 source 获取最新内容）
    let htmlBody = '';
    if (htmlSource.value && htmlSource.value.trim()) {
      htmlBody = htmlSource.value;
    } else if (htmlRender.innerHTML && htmlRender.innerHTML.trim()) {
      htmlBody = htmlRender.innerHTML;
    }

    if (!htmlBody.trim()) {
      tmplPreview.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">请先转换或输入 HTML 内容</div>';
      return;
    }

    // 获取标题
    const md = mdSource.value.trim();
    const title = (md.match(/^#\s+(.+)/m) || [,'文档'])[1];

    // 生成完整 HTML
    let processedHtml = addIds(htmlBody);
    processedHtml = groupBlocks(processedHtml);
    const fullHtml = wrapTemplate(processedHtml, tmplId, title);

    // 在 iframe 中预览
    tmplPreview.srcdoc = fullHtml;
  }

  // 模板选择变化时更新预览
  const tmplSelectEl = $('tmplSelect');
  const btnPreviewTmplEl = $('btnPreviewTmpl');
  if (tmplSelectEl) tmplSelectEl.addEventListener('change', updateTmplPreview);
  if (btnPreviewTmplEl) btnPreviewTmplEl.addEventListener('click', updateTmplPreview);

  function exportHtml(body) {
    // 显示模板选择弹窗
    const opts = TEMPLATES.map((t, i) =>
      `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;border-bottom:1px solid #eee">
        <input type="radio" name="tmpl" value="${t.id}" ${i===0?'checked':''} style="accent-color:#7aa2f7">
        <span><strong>${t.name}</strong><br><span style="font-size:11px;color:#888">${t.desc}</span></span>
       </label>`
    ).join('');
    openModal('选择导出模板', `<div style="max-height:320px;overflow-y:auto">${opts}</div>`, () => {
      const sel = document.querySelector('input[name="tmpl"]:checked');
      const tmplId = sel ? sel.value : TEMPLATES[0].id;
      // 解析 MD
      const md = mdSource.value.trim();
      let html = marked.parse(md);
      html = addIds(html);
      html = groupBlocks(html);
      const title = (md.match(/^#\s+(.+)/m) || [,'文档'])[1];
      const fullHtml = wrapTemplate(html, tmplId, title);
      downloadBlob(fullHtml, `${title.replace(/[\\/:"*?<>|]/g,'_')}.html`);
      toast('✅ ' + t('mdhtml.toast.html') + ' (' + TEMPLATES.find(t=>t.id===tmplId).name + ')');
    });
  }

  function buildFullHtml(body) {
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>导出文档</title><style>body{font-family:-apple-system,sans-serif;max-width:860px;margin:2rem auto;padding:0 1.5rem;line-height:1.8;color:#1a1b26;background:#fff}pre{background:#1b1d29;color:#c0caf5;padding:16px;border-radius:8px;overflow-x:auto}code{background:#eee;padding:2px 6px;border-radius:4px}pre code{background:none;color:#c0caf5}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px 12px}th{background:#f5f5f5}blockquote{border-left:4px solid #7aa2f7;padding-left:16px;color:#555}img,video{max-width:100%;border-radius:8px}a{color:#7aa2f7}@media(prefers-color-scheme:dark){body{background:#1a1b26;color:#c0caf5}}</style></head><body>${body}</body></html>`;
  }

  // ---- Docx helpers ----
  function htmlToDocx(html) {
    const p = new DOMParser().parseFromString(html,'text/html');
    const ps = []; for (const el of p.body.children) { const r = nodeToPara(el); if (r) Array.isArray(r)?ps.push(...r):ps.push(r); }
    return ps;
  }
  function nodeToPara(n) {
    if (!n) return null;
    switch(n.nodeName.toLowerCase()) {
      case 'h1':case 'h2':case 'h3':case 'h4': return new Paragraph({text:(n.textContent||'').trim(),heading:{1:HeadingLevel.HEADING_1,2:HeadingLevel.HEADING_2,3:HeadingLevel.HEADING_3,4:HeadingLevel.HEADING_4}[n.nodeName[1]]||HeadingLevel.HEADING_4,spacing:{before:200,after:100}});
      case 'p':return para(n);
      case 'blockquote':return para(n,true);
      case 'pre':return new Paragraph({children:[new TextRun({text:n.textContent||'',font:'Courier New',size:18})],spacing:{before:100,after:100}});
      case 'ul':case 'ol': return Array.from(n.children).map(li=>new Paragraph({children:inlineRuns(li),bullet:{level:0},spacing:{before:40,after:40}}));
      default:return para(n);
    }
  }
  function para(n,isBq) {
    const children=inlineRuns(n);
    return new Paragraph({children:children.length?children:[new TextRun({text:''})],spacing:{before:60,after:60},...(isBq?{border:{left:{color:'7aa2f7',space:4,style:'single',size:12}},indent:{left:360}}:{})});
  }
  function inlineRuns(n) {
    const runs=[]; const w=(c)=>{for(const ch of c.childNodes){if(ch.nodeType===3){const t=ch.textContent;if(t)runs.push(new TextRun({text:t}));}else if(ch.nodeType===1){const tag=ch.nodeName.toLowerCase(),inner=ch.textContent||'';switch(tag){case'strong':case'b':runs.push(new TextRun({text:inner,bold:true}));break;case'em':case'i':runs.push(new TextRun({text:inner,italics:true}));break;case'code':runs.push(new TextRun({text:inner,font:'Courier New',size:18}));break;case'a':runs.push(new ExternalHyperlink({children:[new TextRun({text:inner,color:'7dcfff',underline:{}})],link:ch.getAttribute('href')||''}));break;case'br':runs.push(new TextRun({text:'\n'}));break;default:w(ch);}}}};w(n);return runs;
  }

  // ---- Clear ----
  $('btnClear').addEventListener('click', () => {
    if (!confirm(t('mdhtml.confirm_clear'))) return;
    mdSource.value='';htmlSource.value='';mdRender.innerHTML='';htmlRender.innerHTML='';
  });

  // ---- Dropdown close ----
  document.addEventListener('click', () => { importMenu.classList.add('hidden'); exportMenu.classList.add('hidden'); });

  // ---- Paste image ----
  [mdRender, htmlRender].forEach(el => {
    el.addEventListener('paste', async e => {
      const items = (e.clipboardData||{}).items; if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile(); if (!file) continue;
          const dataUrl = await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file);});
          el.focus();
          if (el===mdRender) document.execCommand('insertHTML',false,marked.parse(`![image](data:image;base64,${dataUrl.split(',')[1]})`));
          else document.execCommand('insertHTML',false,`<img src="${dataUrl}" alt="image" style="max-width:100%;border-radius:6px;" />`);
        }
      }
    });
  });

  // ---- Init ----
  const defaultMd = t('mdhtml.intro');
  mdSource.value = defaultMd;
  const defaultHtml = marked.parse(defaultMd);
  htmlSource.value = defaultHtml;
  mdRender.innerHTML = defaultHtml;
  htmlRender.innerHTML = defaultHtml;

  // ---- Keyboard shortcut ----
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='s') {
      const active = document.activeElement;
      if ([mdRender,mdSource,htmlRender,htmlSource].includes(active)) { e.preventDefault(); $('btnMdToHtml').click(); }
    }
  });
}

// 自动初始化：如果页面有 #app 容器则自动渲染
const appEl = document.getElementById('app');
if (appEl) {
  render(appEl);
  // 广告初始化
  setTimeout(() => {
    if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
      window.adsbygoogle.push({});
    }
  }, 200);
}
