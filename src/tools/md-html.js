// === MD ↔ HTML 转换器工具模块 ===
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink } from 'docx';
import mammoth from 'mammoth';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', hr: '---', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**' });
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

export function render(container) {
  // 用 wrapper 包裹所有 HTML，避免 firstChild 丢失元素
  container.innerHTML = '';

  const html = `
    <div class="mdhtml-toolbar">
      <div class="mdhtml-dropdown">
        <button class="btn" id="btnImport">📥 导入</button>
        <div class="mdhtml-dropdown-menu hidden" id="importMenu">
          <button class="menu-item" data-fmt="md">📝 Markdown</button>
          <button class="menu-item" data-fmt="html">🌐 HTML</button>
          <button class="menu-item" data-fmt="txt">📃 纯文本</button>
          <button class="menu-item" data-fmt="word">📘 Word</button>
        </div>
      </div>
      <input type="file" id="importInput" hidden />
      <div class="mdhtml-dropdown">
        <button class="btn btn-success" id="btnExport">📤 导出</button>
        <div class="mdhtml-dropdown-menu hidden" id="exportMenu">
          <button class="menu-item" data-fmt="pdf">📄 PDF</button>
          <button class="menu-item" data-fmt="word">📘 Word</button>
          <button class="menu-item" data-fmt="html">🌐 HTML</button>
          <button class="menu-item" data-fmt="md">📝 Markdown</button>
          <button class="menu-item" data-fmt="txt">📃 纯文本</button>
        </div>
      </div>
      <span class="sep"></span>
      <button class="btn btn-danger" id="btnClear">🗑️ 清空</button>
    </div>
    <div class="mdhtml-editor">
      <!-- MD Pane -->
      <div class="mdhtml-pane">
        <div class="mdhtml-pane-header">
          <span>📝 Markdown</span>
          <div class="mdhtml-mode-btns">
            <button class="mdhtml-mode-btn active" data-pane="md" data-mode="render">阅读</button>
            <button class="mdhtml-mode-btn" data-pane="md" data-mode="source">源码</button>
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
        <div id="mdRender" class="mdhtml-render" contenteditable spellcheck="false" data-placeholder="输入 Markdown，或粘贴图片…"></div>
        <textarea id="mdSource" class="mdhtml-source hidden" spellcheck="false" placeholder="# 输入 Markdown 源码…"></textarea>
      </div>
      <!-- Center -->
      <div class="mdhtml-center">
        <button id="btnMdToHtml" class="mdhtml-sync-btn"><span class="mdhtml-sync-arrow">→</span>转HTML</button>
        <div class="mdhtml-sync-divider"></div>
        <button id="btnHtmlToMd" class="mdhtml-sync-btn"><span class="mdhtml-sync-arrow">←</span>转MD</button>
      </div>
      <!-- HTML Pane -->
      <div class="mdhtml-pane">
        <div class="mdhtml-pane-header">
          <span>🌐 HTML</span>
          <div class="mdhtml-mode-btns">
            <button class="mdhtml-mode-btn active" data-pane="html" data-mode="render">阅读</button>
            <button class="mdhtml-mode-btn" data-pane="html" data-mode="source">源码</button>
          </div>
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
        <div id="htmlRender" class="mdhtml-render" contenteditable spellcheck="false" data-placeholder="右侧显示 HTML 渲染结果…"></div>
        <textarea id="htmlSource" class="mdhtml-source hidden" spellcheck="false" placeholder="<h1>输入 HTML 源码…</h1>"></textarea>
      </div>
    </div>
    <div class="ad-container ad-tool-bottom"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="2222222222" data-ad-format="auto" data-full-width-responsive="true"></ins></div>
    <!-- Modals -->
    <div class="mdhtml-modal-overlay hidden" id="mdhtmlModal">
      <div class="mdhtml-modal">
        <h3 id="mdhtmlModalTitle">弹窗</h3>
        <div id="mdhtmlModalBody"></div>
        <div class="mdhtml-modal-btns">
          <button class="btn btn-primary" id="mdhtmlModalOk">确定</button>
          <button class="btn" id="mdhtmlModalCancel">取消</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // ---- DOM refs ----
  const $ = (id) => document.getElementById(id);
  const mdRender = $('mdRender'), mdSource = $('mdSource'), htmlRender = $('htmlRender'), htmlSource = $('htmlSource');
  const mdFmtBar = $('mdFmtBar'), htmlFmtBar = $('htmlFmtBar');
  const btnImport = $('btnImport'), importMenu = $('importMenu'), importInput = $('importInput');
  const btnExport = $('btnExport'), exportMenu = $('exportMenu');

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
  document.querySelectorAll('.mdhtml-mode-btn').forEach(b => {
    b.addEventListener('click', () => setPaneMode(b.dataset.pane, b.dataset.mode));
  });

  function setPaneMode(pane, mode, skipSync=false) {
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
      if (mode==='render') {
        if (!skipSync && prev==='source') htmlRender.innerHTML = htmlSource.value;
        htmlSource.classList.add('hidden'); htmlFmtBar.classList.remove('hidden'); htmlRender.classList.remove('hidden');
      } else {
        if (!skipSync && prev==='render') htmlSource.value = htmlRender.innerHTML;
        htmlRender.classList.add('hidden'); htmlFmtBar.classList.add('hidden'); htmlSource.classList.remove('hidden'); htmlSource.focus();
      }
    }
  }

  // ---- Convert ----
  $('btnMdToHtml').addEventListener('click', () => {
    let md = paneModes.md==='render' ? renderToMd(mdRender) : mdSource.value;
    if (!md.trim()) { toast('⚠️ 请先输入 Markdown'); return; }
    mdSource.value = md;
    const html = marked.parse(md);
    htmlSource.value = html;
    setPaneMode('md','render',true); mdRender.innerHTML = html;
    setPaneMode('html','render',true); htmlRender.innerHTML = html;
    toast('MD → HTML ✅');
  });

  $('btnHtmlToMd').addEventListener('click', () => {
    let html = paneModes.html==='render' ? htmlRender.innerHTML : htmlSource.value;
    if (!html.trim()) { toast('⚠️ 请先输入 HTML'); return; }
    htmlSource.value = html;
    const md = turndown.turndown(html);
    mdSource.value = md;
    setPaneMode('md','render',true); mdRender.innerHTML = html;
    setPaneMode('html','render',true); htmlRender.innerHTML = html;
    toast('HTML → MD ✅');
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
    openModal('🔗 插入链接', '<input id="linkText" class="mdhtml-modal-input" placeholder="链接文字" /><input id="linkUrl" class="mdhtml-modal-input" placeholder="https://…" />', () => {
      const text = $('linkText').value.trim()||'链接', url = $('linkUrl').value.trim();
      if (!url) return;
      el.focus(); document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener" style="color:#79c0ff;">${text}</a>`);
    });
  }

  function promptCode(el) {
    openModal('💻 插入代码块', '<input id="codeLang" class="mdhtml-modal-input" placeholder="语言 (js/python/…)" /><textarea id="codeCode" class="mdhtml-modal-textarea" placeholder="输入代码…"></textarea>', () => {
      const lang = $('codeLang').value.trim(), code = $('codeCode').value;
      el.focus();
      if (el===mdRender) { const f = lang?`\`\`\`${lang}\n${code}\n\`\`\``:`\`\`\`\n${code}\n\`\`\``; document.execCommand('insertHTML',false,marked.parse(f)); }
      else document.execCommand('insertHTML',false,`<pre style="background:#161b22;border:1px solid #21262d;border-radius:6px;padding:12px;overflow-x:auto;"><code>${escapeHtml(code)}</code></pre>`);
    });
  }

  function promptImage(el) {
    openModal('🖼️ 插入图片', '<input type="file" id="imgFile" accept="image/*" style="padding:4px;" />', async () => {
      const f = $('imgFile').files[0]; if (!f) return;
      const dataUrl = await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f);});
      const alt = f.name.replace(/\.[^.]+$/,'');
      el.focus();
      if (el===mdRender) document.execCommand('insertHTML',false,marked.parse(`![${alt}](data:image;base64,${dataUrl.split(',')[1]})`));
      else document.execCommand('insertHTML',false,`<img src="${dataUrl}" alt="${alt}" style="max-width:100%;border-radius:6px;margin:6px 0;" />`);
    });
  }

  function promptTable(el) {
    openModal('📊 插入表格', '<div style="display:flex;gap:10px;margin-bottom:10px;"><label style="font-size:.8rem;color:#8b949e;">行数</label><input type="number" id="tRows" value="3" min="2" max="20" style="width:60px;" /></div><div style="display:flex;gap:10px;"><label style="font-size:.8rem;color:#8b949e;">列数</label><input type="number" id="tCols" value="3" min="1" max="10" style="width:60px;" /></div>', () => {
      const rows=parseInt($('tRows').value)||3, cols=parseInt($('tCols').value)||3;
      el.focus();
      if (el===mdRender) { let md='\n|'; for(let c=0;c<cols;c++) md+=` 列${c+1} |`; md+='\n|'; for(let c=0;c<cols;c++) md+=' --- |'; md+='\n'; for(let r=0;r<rows-1;r++){md+='|';for(let c=0;c<cols;c++)md+=' 内容 |';md+='\n';} document.execCommand('insertHTML',false,marked.parse(md)); }
      else { let t='<table style="width:100%;border-collapse:collapse;margin:8px 0;">'; t+='<thead><tr>'; for(let c=0;c<cols;c++) t+=`<th style="border:1px solid #21262d;padding:6px 10px;">列${c+1}</th>`; t+='</tr></thead><tbody>'; for(let r=0;r<rows-1;r++){t+='<tr>';for(let c=0;c<cols;c++)t+='<td style="border:1px solid #21262d;padding:6px 10px;">内容</td>';t+='</tr>';} document.execCommand('insertHTML',false,t+'</tbody></table>'); }
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
    toast('正在导入…');
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
      toast(`📥 已导入: ${file.name}`);
    } catch(err) { console.error(err); toast('导入失败 ❌'); }
    importInput.value='';
  });

  // ---- Export ----
  btnExport.addEventListener('click', e => { e.stopPropagation(); exportMenu.classList.toggle('hidden'); importMenu.classList.add('hidden'); });
  exportMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async e => {
      e.stopPropagation(); exportMenu.classList.add('hidden');
      const md = mdSource.value.trim(); if (!md) { toast('⚠️ 没有内容'); return; }
      const htmlBody = marked.parse(md);
      const fmt = item.dataset.fmt;
      try {
        if (fmt==='pdf') { await exportPdf(htmlBody); }
        else if (fmt==='word') { await exportWord(htmlBody); }
        else if (fmt==='html') { exportHtml(htmlBody); }
        else if (fmt==='md') { downloadBlob(md,'document.md','text/markdown;charset=utf-8'); toast('MD 已导出 📝'); }
        else if (fmt==='txt') { const d=document.createElement('div');d.innerHTML=htmlBody;downloadBlob(d.textContent||'','document.txt','text/plain;charset=utf-8');toast('TXT 已导出 📃'); }
      } catch(err) { console.error(err); toast(`导出 ${fmt.toUpperCase()} 失败 ❌`); }
    });
  });

  async function exportPdf(body) {
    toast('正在生成 PDF…');
    await loadHtml2Pdf();
    const full = buildFullHtml(body);
    const iframe = document.createElement('iframe');
    iframe.style.cssText='position:fixed;left:-9999px;width:800px;height:600px;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open(); iframe.contentDocument.write(full); iframe.contentDocument.close();
    await new Promise(r=>setTimeout(r,600));
    await window.html2pdf().set({margin:[8,8,8,8],filename:'document.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(iframe.contentDocument.body).save();
    document.body.removeChild(iframe);
    toast('PDF 已导出 📄');
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
    toast('正在生成 Word…');
    const doc = new Document({sections:[{properties:{},children:htmlToDocx(body)}]});
    downloadBlob(await Packer.toBlob(doc),'document.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    toast('Word 已导出 📤');
  }

  function exportHtml(body) { downloadBlob(buildFullHtml(body),'document.html'); toast('HTML 已导出 🌐'); }

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
    if (!confirm('确定清空？')) return;
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
  const defaultMd = '# 欢迎使用 MD ↔ HTML 转换器\n\n输入 Markdown 后点击 **→转HTML** 即可在右侧看到预览效果！\n\n> 支持富媒体编辑 · 粘贴图片 · 导入导出多种格式';
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
