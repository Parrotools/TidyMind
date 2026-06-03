/**
 * Markdown 导出服务
 *
 * 将笔记转换为标准 Markdown 格式，支持：
 * - YAML front matter（兼容 Obsidian/Notion）
 * - 单篇/多篇导出
 * - 复制到剪贴板
 * - 系统分享
 */

import { Platform, Share } from 'react-native';
import { Note } from '../types/note';

// ── 工具函数 ──────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '未知';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── 单篇转换 ──────────────────────────────────────────────────────────────

/**
 * 将单条笔记转换为 Markdown 字符串
 */
export function noteToMarkdown(note: Note): string {
  const dateStr = formatDate(note.updatedAt);
  const tagLine =
    note.tags.length > 0 ? `标签: ${note.tags.join(', ')} | ` : '';

  const frontMatter = [
    '---',
    `title: "${note.title}"`,
    note.tags.length > 0 ? `tags: [${note.tags.join(', ')}]` : '',
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    note.isFavorite ? 'favorite: true' : '',
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    frontMatter,
    '',
    `# ${note.title}`,
    '',
    `> ${tagLine}更新于 ${dateStr}`,
    '',
    '---',
    '',
    note.content,
    '',
  ].join('\n');
}

// ── 批量转换 ──────────────────────────────────────────────────────────────

/**
 * 将多篇笔记合并为一个 Markdown 文档
 */
export function notesToMarkdown(notes: Note[]): string {
  if (notes.length === 0) return '';

  if (notes.length === 1) {
    return noteToMarkdown(notes[0]);
  }

  const header = [
    '# TidyMind 笔记导出',
    '',
    `> 导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `> 笔记数量: ${notes.length}`,
    '',
    '---',
    '',
    '## 目录',
    '',
    ...notes.map((n, i) => `${i + 1}. [${n.title}](#${slugify(n.title)})`),
    '',
    '---',
    '',
  ].join('\n');

  const body = notes
    .map((note) => {
      const dateStr = formatDate(note.updatedAt);
      const tagLine =
        note.tags.length > 0 ? `标签: ${note.tags.join(', ')} | ` : '';

      return [
        `## ${note.title}`,
        '',
        `> ${tagLine}更新于 ${dateStr}`,
        '',
        note.content,
        '',
      ].join('\n');
    })
    .join('\n---\n\n');

  return header + body;
}

// ── 导出操作 ──────────────────────────────────────────────────────────────

/**
 * 复制 Markdown 文本到系统剪贴板
 */
export function copyToClipboard(markdown: string): void {
  // 使用 React Native Clipboard API
  try {
    const { Clipboard } = require('react-native');
    Clipboard.setString(markdown);
  } catch {
    // Clipboard 不可用时静默失败
  }
}

/**
 * 通过系统分享菜单分享 Markdown 文本
 *
 * iOS: 弹出分享面板（信息/邮件/备忘录等）
 * Android: 弹出分享 Intent
 */
export async function shareMarkdown(markdown: string): Promise<void> {
  try {
    await Share.share({
      title: 'TidyMind 笔记导出',
      message: markdown,
    });
  } catch {
    // 用户取消分享，不做处理
  }
}