/**
 * PDF 导出 — react-native-html-to-pdf
 *
 * 本地离线生成 .pdf 文件，保存到设备存储。
 * iOS: UIPrintPageRenderer 渲染 → Documents 目录
 * Android: PrintDocumentAdapter 渲染 → app files 目录
 */

import { Alert } from 'react-native';
import { Note, NoteBlock } from '../types/note';

const RNHTMLtoPDF = require('react-native-html-to-pdf').default;

// ── HTML 模板 ──────────────────────────────────────────────────

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;font-size:15px;line-height:1.8;color:#1C1B1F;padding:48px 40px;background:#FFFBFE}
h1{font-size:28px;font-weight:700;color:#1C1B1F;border-bottom:2px solid #CAC4D0;padding-bottom:12px;margin-bottom:12px}
h2{font-size:22px;font-weight:600;color:#1C1B1F;margin-top:40px;margin-bottom:12px}
h3{font-size:18px;font-weight:600;color:#1C1B1F;margin-top:30px;margin-bottom:8px}
p{margin-bottom:14px}
.meta{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.tag{font-size:12px;color:#1D192B;background:#E8DEF8;padding:3px 14px;border-radius:20px;font-weight:500;display:inline-block}
.date{font-size:13px;color:#938F99}
.section-heading{font-size:20px;font-weight:700;color:#1C1B1F;margin-top:36px;margin-bottom:14px}
.divider{border-top:1.5px solid #CAC4D0;margin:24px 0}
.summary-card{background:#f0f4ff;border-left:4px solid #2563eb;padding:16px 18px;margin-bottom:24px;border-radius:8px}
.summary-label{font-size:13px;font-weight:700;color:#2563eb;margin-bottom:8px}
.kp-card{background:#FFFBFE;border:1px solid #CAC4D0;padding:16px 18px;margin-bottom:24px;border-radius:12px}
.kp-label{font-size:13px;font-weight:700;color:#1C1B1F;margin-bottom:12px}
.kp-row{margin-bottom:8px}
.kp-badge{display:inline-block;width:24px;height:24px;border-radius:12px;background:#6750A4;color:#fff;text-align:center;font-size:12px;font-weight:700;line-height:24px;margin-right:10px}
.quote-card{background:#f9f9f9;border-left:3px solid #6750A4;padding:12px 16px;margin-bottom:18px;border-radius:4px;font-style:italic;color:#49454F}
.quote-source{font-size:13px;color:#938F99;margin-top:8px;font-style:normal}
.tip-card{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin-bottom:18px;border-radius:8px;color:#166534}
.warning-card{background:#fff7ed;border-left:4px solid #f97316;padding:12px 16px;margin-bottom:18px;border-radius:8px;color:#9a3412}
.example-card{background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;margin-bottom:18px;border-radius:8px}
.example-label{font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:8px}
.conclusion-card{background:#fefce8;border-left:4px solid #eab308;padding:14px 16px;margin-bottom:18px;border-radius:8px}
.conclusion-label{font-size:13px;font-weight:700;color:#a16207;margin-bottom:8px}
ul,ol{margin-bottom:16px;padding-left:24px}
li{margin-bottom:6px}
pre{background:#f7f7f7;border:1px solid #CAC4D0;border-radius:8px;padding:14px 16px;overflow-x:auto;margin-bottom:18px;font-size:13px;white-space:pre-wrap;word-break:break-all}
.code-lang{font-size:11px;color:#938F99;text-transform:uppercase;margin-bottom:8px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #CAC4D0;border-radius:8px;overflow:hidden}
th{background:#f7f7f7;font-weight:700;padding:10px 14px;text-align:left;font-size:13px;border-bottom:1px solid #CAC4D0}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f0f0}
tr:nth-child(even) td{background:#fafafa}
img{max-width:100%;border-radius:8px;margin:14px 0}
hr{border:none;border-top:.5px solid #CAC4D0;margin:28px 0}
.footer{text-align:center;color:#938F99;font-size:12px;margin-top:56px;padding-top:20px;border-top:1px solid #CAC4D0}
@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function blockToHtml(b: NoteBlock): string {
  switch (b.type) {
    case 'heading': return `<h${Math.min(b.level||1,3)}>${esc(b.text||'')}</h${Math.min(b.level||1,3)}>`;
    case 'paragraph': return `<p>${esc(b.text||'')}</p>`;
    case 'section': return `<div class="section-heading">${esc(b.heading||'')}</div>${(b.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}`;
    case 'quote': return `<div class="quote-card">「${esc(b.text||'')}」${b.source?`<div class="quote-source">— ${esc(b.source)}</div>`:''}</div>`;
    case 'tip': return `<div class="tip-card">💡 ${esc(b.text||'')}</div>`;
    case 'warning': return `<div class="warning-card">⚠️ ${esc(b.text||'')}</div>`;
    case 'example': return `<div class="example-card"><div class="example-label">📝 ${esc(b.heading||'案例')}</div><p>${esc(b.content||'')}</p></div>`;
    case 'conclusion': return `<div class="conclusion-card"><div class="conclusion-label">📌 总结</div><p>${esc(b.text||'')}</p></div>`;
    case 'list': return (b.style==='number'?'<ol>':'<ul>') + (b.items||[]).map(i=>`<li>${esc(i)}</li>`).join('') + (b.style==='number'?'</ol>':'</ul>');
    case 'table': return `<table><thead><tr>${(b.headers||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(b.rows||[]).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'code': return `<pre>${b.language?`<div class="code-lang">${esc(b.language)}</div>`:''}<code>${esc(b.code||'')}</code></pre>`;
    case 'image': return (b.src&&(b.src.startsWith('http')||b.src.startsWith('data:')))?`<img src="${b.src}"/>`:'';
    case 'divider': return '<hr/>';
    default: return '';
  }
}

function notesToHtml(notes: Note[]): string {
  if (notes.length===0) return '';
  if (notes.length===1){const n=notes[0];const d=n.updatedAt?new Date(n.updatedAt).toLocaleDateString('zh-CN'):'';const b=(n.blocks&&n.blocks.length>0)?n.blocks.map(blockToHtml).join('\n'):(n.content||'').split('\n\n').map(p=>`<p>${esc(p.trim())}</p>`).join('\n');const s=n.summary?`<div class="summary-card"><div class="summary-label">📋 核心摘要</div><p>${esc(n.summary)}</p></div>`:'';const k=n.keyPoints&&n.keyPoints.length>0?`<div class="kp-card"><div class="kp-label">🔑 关键要点</div>${n.keyPoints.map((kp,i)=>`<div class="kp-row"><span class="kp-badge">${i+1}</span>${esc(kp)}</div>`).join('')}</div>`:'';const l=n.location?`<p style="font-size:13px;color:#938F99;margin-bottom:8px">📍 ${esc(n.location.name)}${n.location.address?' · '+esc(n.location.address):''}</p>`:'';return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(n.title)}</title><style>${CSS}</style></head><body><h1>${esc(n.title)}</h1><div class="meta">${n.tag?`<span class="tag">${esc(n.tag)}</span>`:''}${d?`<span class="date">${d}</span>`:''}</div>${l}<div class="divider"></div>${s}${k}${b}<div class="footer">Generated by TidyMind</div></body></html>`;}
  const body=notes.map((n,i)=>{const d=n.updatedAt?new Date(n.updatedAt).toLocaleDateString('zh-CN'):'';const b=(n.blocks&&n.blocks.length>0)?n.blocks.map(blockToHtml).join('\n'):(n.content||'').split('\n\n').map(p=>`<p>${esc(p.trim())}</p>`).join('\n');return `<div style="page-break-before:${i>0?'always':'auto'}"><h2>${esc(n.title)}</h2><div class="meta">${n.tag?`<span class="tag">${esc(n.tag)}</span>`:''}${d?`<span class="date">${d}</span>`:''}</div>${b}</div>`;}).join('\n');
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>TidyMind</title><style>${CSS}</style></head><body><h1>📚 TidyMind ${notes.length} 篇笔记</h1><p style="color:#938F99;font-size:14px;margin-bottom:20px">${new Date().toLocaleString('zh-CN')}</p><div class="divider"></div>${body}<div class="footer">Generated by TidyMind</div></body></html>`;
}

// ── 导出 ─────────────────────────────────────────────────────

export async function exportNotesAsPdf(notes: Note[]): Promise<string> {
  if (!notes.length) throw new Error('没有可导出的笔记');

  // 检查原生模块
  if (!RNHTMLtoPDF) {
    throw new Error(
      'PDF 模块未加载。\n\n' +
      'react-native-html-to-pdf 需要原生编译。\n' +
      '请运行以下命令重新 build：\n' +
      '  cd android\n' +
      '  .\\gradlew.bat clean\n' +
      '  .\\gradlew.bat assembleRelease'
    );
  }

  const safeName = notes.length === 1
    ? (notes[0].title || '笔记').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
    : `TidyMind_${notes.length}篇笔记`;

  // 生成 PDF 到设备本地存储
  const result = await RNHTMLtoPDF.convert({
    html: notesToHtml(notes),
    fileName: safeName,
    directory: 'Documents',
    height: 842,
    width: 595,
    padding: 0,
    bgColor: '#FFFBFE',
  });

  if (!result?.filePath) {
    throw new Error('PDF 生成失败');
  }

  // 返回文件路径，不分享
  return result.filePath;
}
