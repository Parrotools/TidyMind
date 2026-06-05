/**
 * PDF 导出服务
 * 调用后端 FastAPI 生成 PDF，返回下载链接
 */

import { Note } from '../types/note';

// 后端地址（开发时用本机 IP，生产环境替换为服务器地址）
const API_BASE = 'http://10.0.2.2:8123'; // Android 模拟器 → 宿主机 localhost

export async function exportNoteToPdf(note: Note): Promise<string | null> {
  const body = {
    title: note.title,
    tag: note.tag || undefined,
    summary: note.summary || undefined,
    keyPoints: note.keyPoints || undefined,
    blocks: note.blocks || undefined,
    content: note.content || undefined,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };

  const response = await fetch(`${API_BASE}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PDF 生成失败: ${err}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.message || '未知错误');

  // 返回完整下载 URL
  return `${API_BASE}${data.download_url}`;
}
