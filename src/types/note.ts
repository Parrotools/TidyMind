/** 地点信息（来自 Vivo POI 搜索 API） */
export type NoteLocation = {
  name: string;
  address: string;
  city: string;
  district: string;
  latlng: string;
};

// ── 结构化笔记 Block ──────────────────────────────────────────────

export type NoteBlock =
  | { id?: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id?: string; type: 'paragraph'; text: string }
  | { id?: string; type: 'quote'; text: string; source?: string }
  | { id?: string; type: 'list'; style: 'bullet' | 'number' | 'check'; items: string[] }
  | { id?: string; type: 'table'; headers: string[]; rows: string[][] }
  | { id?: string; type: 'code'; language?: string; code: string }
  | { id?: string; type: 'section'; heading: string; paragraphs: string[] }
  | { id?: string; type: 'example'; heading: string; content: string }
  | { id?: string; type: 'tip'; text: string }
  | { id?: string; type: 'warning'; text: string }
  | { id?: string; type: 'conclusion'; text: string }
  | { id?: string; type: 'image'; src: string }
  | { id?: string; type: 'divider' };

/** 可编辑的 Block 类型（排除 divider 和 image） */
export type EditableBlockType = 'heading' | 'paragraph' | 'quote' | 'list' | 'code' | 'table';

let _blockIdCounter = 0;
export function createBlockId(): string {
  return `b_${Date.now()}_${++_blockIdCounter}`;
}

export function createEmptyBlock(type: string): NoteBlock {
  const id = createBlockId();
  switch (type) {
    case 'heading': return { id, type: 'heading', level: 1, text: '' };
    case 'paragraph': return { id, type: 'paragraph', text: '' };
    case 'quote': return { id, type: 'quote', text: '' };
    case 'list': return { id, type: 'list', style: 'bullet', items: [''] };
    case 'code': return { id, type: 'code', language: '', code: '' };
    case 'table': return { id, type: 'table', headers: ['列1', '列2'], rows: [['', '']] };
    case 'image': return { id, type: 'image', src: '' };
    case 'divider': return { id, type: 'divider' };
    default: return { id, type: 'paragraph', text: '' };
  }
}

/** 将 AI 生成的富 block 类型映射为可编辑的基础 block 类型 */
export function flattenBlocksForEditing(blocks: NoteBlock[]): NoteBlock[] {
  const result: NoteBlock[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
      case 'list':
      case 'code':
      case 'image':
      case 'divider':
        result.push(b);
        break;
      case 'section':
        result.push({ id: createBlockId(), type: 'heading', level: 2, text: b.heading });
        for (const p of b.paragraphs) {
          result.push({ id: createBlockId(), type: 'paragraph', text: p });
        }
        break;
      case 'tip':
        result.push({ id: createBlockId(), type: 'paragraph', text: `💡 ${b.text}` });
        break;
      case 'warning':
        result.push({ id: createBlockId(), type: 'paragraph', text: `⚠️ ${b.text}` });
        break;
      case 'conclusion':
        result.push({ id: createBlockId(), type: 'heading', level: 2, text: '总结' });
        result.push({ id: createBlockId(), type: 'paragraph', text: b.text });
        break;
      case 'example':
        result.push({ id: createBlockId(), type: 'heading', level: 2, text: `案例：${b.heading}` });
        result.push({ id: createBlockId(), type: 'paragraph', text: b.content });
        break;
      case 'table':
        result.push({ id: createBlockId(), type: 'paragraph', text: `[表格: ${b.headers.join(' | ')}]` });
        for (const row of b.rows) {
          result.push({ id: createBlockId(), type: 'paragraph', text: row.join(' | ') });
        }
        break;
      default:
        break;
    }
  }
  return result.length > 0 ? result : [createEmptyBlock('paragraph')];
}

/** 将纯文本 markdown 内容转换为 blocks（编辑模式初始化用） */
export function contentToBlocks(content: string): NoteBlock[] {
  if (!content.trim()) return [createEmptyBlock('paragraph')];
  const lines = content.split('\n');
  const blocks: NoteBlock[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';

  for (const line of lines) {
    // 代码块
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trimStart().slice(3).trim();
        codeLines = [];
      } else {
        blocks.push({ id: createBlockId(), type: 'code', language: codeLang || undefined, code: codeLines.join('\n') });
        inCodeBlock = false;
        codeLines = [];
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    // 标题
    if (/^#{1,3}\s/.test(line)) {
      const m = line.match(/^(#{1,3})\s+(.+)/);
      if (m) blocks.push({ id: createBlockId(), type: 'heading', level: m[1].length as 1|2|3, text: m[2] });
    }
    // 引用
    else if (line.startsWith('> ')) {
      blocks.push({ id: createBlockId(), type: 'quote', text: line.slice(2) });
    }
    // 列表
    else if (/^[-*]\s/.test(line)) {
      blocks.push({ id: createBlockId(), type: 'list', style: 'bullet', items: [line.replace(/^[-*]\s/, '')] });
    }
    // 有序列表
    else if (/^\d+\.\s/.test(line)) {
      blocks.push({ id: createBlockId(), type: 'list', style: 'number', items: [line.replace(/^\d+\.\s/, '')] });
    }
    // 图片
    else if (/^!\[.*\]\((.+)\)$/.test(line.trim())) {
      const m = line.match(/^!\[.*\]\((.+)\)$/);
      if (m) blocks.push({ id: createBlockId(), type: 'image', src: m[1] });
    }
    // 分隔线
    else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ id: createBlockId(), type: 'divider' });
    }
    // 空行 → 段落分隔
    else if (!line.trim()) {
      // 跳过（不创建空段落）
    }
    // 普通段落
    else {
      blocks.push({ id: createBlockId(), type: 'paragraph', text: line });
    }
  }
  // 未闭合的代码块
  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ id: createBlockId(), type: 'code', language: codeLang || undefined, code: codeLines.join('\n') });
  }
  return blocks.length > 0 ? blocks : [createEmptyBlock('paragraph')];
}

export type Note = {
  id: string;
  title: string;
  /** 纯文本内容（兼容旧数据，blocks 优先级更高） */
  content: string;
  /** 单标签（一个笔记仅一个标签） */
  tag: string;
  /** 关联的学习地点（可选） */
  location?: NoteLocation;
  /** 附件图片（Base64 Data URL 数组） */
  images?: string[];
  /** 结构化笔记块（AI 生成笔记时使用） */
  blocks?: NoteBlock[];
  /** 笔记摘要（AI 生成时填充） */
  summary?: string;
  /** 关键要点（AI 生成时填充） */
  keyPoints?: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
};
