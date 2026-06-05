/**
 * MarkdownView — 零依赖 Markdown 渲染器
 *
 * 使用 marked lexer 直接输出 React Native 原生组件。
 * 支持：H1-H6、加粗、斜体、删除线、行内代码、代码块、表格、
 *       任务列表、有序/无序列表、引用、图片、链接、分隔线。
 */

import React, { useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { marked } from 'marked';
import { Colors, BorderRadius, Spacing } from '../theme/designTokens';
import MathRenderer from './MathRenderer';

// ── marked 数学公式扩展 ────────────────────────────────────────────

marked.use({
  extensions: [{
    name: 'math',
    level: 'inline',
    start(src: string) { return src.indexOf('$'); },
    tokenizer(src: string) {
      // 块级公式 $$...$$
      const block = src.match(/^\$\$([\s\S]+?)\$\$/);
      if (block) {
        return {
          type: 'math', raw: block[0],
          text: block[1].trim(), display: true,
        };
      }
      // 内联公式 $...$（不能紧跟数字）
      const inline = src.match(/^\$(?!\d)([^$\n]+)\$/);
      if (inline) {
        return {
          type: 'math', raw: inline[0],
          text: inline[1].trim(), display: false,
        };
      }
    },
    renderer(token: AnyToken) { return token.raw; },
  } as any],
});

// ── 类型别名 ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToken = any;

type Props = {
  markdown: string;
  onImagePress?: (src: string) => void;
};

export type MarkdownViewHandle = {
  scrollToHeading: (headingId: string) => void;
};

// ── 内联渲染 ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InlineText({ tokens }: { tokens: any[] }) {
  if (!tokens?.length) return null;

  return (
    <Text>
      {tokens.map((t: AnyToken, i: number) => {
        switch (t.type) {
          case 'strong':
            return (
              <Text key={i} style={inline.strong}>
                <InlineText tokens={t.tokens ?? []} />
              </Text>
            );
          case 'em':
            return (
              <Text key={i} style={inline.em}>
                <InlineText tokens={t.tokens ?? []} />
              </Text>
            );
          case 'del':
            return (
              <Text key={i} style={inline.del}>
                <InlineText tokens={t.tokens ?? []} />
              </Text>
            );
          case 'codespan':
            return (
              <Text key={i} style={inline.code}>
                {t.text ?? ''}
              </Text>
            );
          case 'link':
            return (
              <Text key={i} style={inline.link}>
                <InlineText tokens={t.tokens ?? []} />
              </Text>
            );
          case 'image':
            return null;
          case 'math':
            return (
              <MathRenderer
                key={i}
                latex={t.text ?? ''}
                displayMode={false}
              />
            );
          case 'text':
          default:
            return <Text key={i}>{t.text ?? t.raw ?? ''}</Text>;
        }
      })}
    </Text>
  );
}

// ── 块级渲染 ────────────────────────────────────────────────────────

function BlockRenderer({
  token,
  onImagePress,
  headingIds,
  headingIndex,
}: {
  token: AnyToken;
  onImagePress?: (src: string) => void;
  headingIds: string[];
  headingIndex: { current: number };
}) {
  switch (token.type) {
    // ── 标题 ──────────────────────────────────────────────────────
    case 'heading': {
      const depth = token.depth ?? 1;
      const id = headingIds[headingIndex.current] ?? '';
      headingIndex.current += 1;
      const style =
        depth === 1 ? block.h1
        : depth === 2 ? block.h2
        : depth === 3 ? block.h3
        : depth === 4 ? block.h4
        : depth === 5 ? block.h5
        : block.h6;
      return (
        <View key={id} nativeID={id}>
          <Text style={style}>
            <InlineText tokens={token.tokens ?? []} />
          </Text>
        </View>
      );
    }

    // ── 段落 ──────────────────────────────────────────────────────
    case 'paragraph':
      return (
        <Text key={Math.random()} style={block.paragraph}>
          <InlineText tokens={token.tokens ?? []} />
        </Text>
      );

    // ── 代码块 ────────────────────────────────────────────────────
    case 'code': {
      const lang = token.lang ? ` ${token.lang}` : '';
      return (
        <View key={Math.random()} style={block.codeWrap}>
          {token.lang ? (
            <Text style={block.codeLang}>{token.lang}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={block.codeText}>{token.text ?? ''}</Text>
          </ScrollView>
        </View>
      );
    }

    // ── 引用 ──────────────────────────────────────────────────────
    case 'blockquote':
      return (
        <View key={Math.random()} style={block.quote}>
          <Text style={block.quoteText}>
            <InlineText tokens={token.tokens ?? []} />
          </Text>
        </View>
      );

    // ── 分割线 ────────────────────────────────────────────────────
    case 'hr':
      return <View key={Math.random()} style={block.hr} />;

    // ── 数学公式（块级） ──────────────────────────────────────────
    case 'math':
      if (token.display) {
        return (
          <MathRenderer
            key={Math.random()}
            latex={token.text ?? ''}
            displayMode
          />
        );
      }
      // 内联 math 已在 InlineText 中处理，这里不回退
      return null;

    // ── 列表 ──────────────────────────────────────────────────────
    case 'list': {
      const items = token.items ?? [];
      const ordered = token.ordered ?? false;
      const start = token.start ?? 1;
      return (
        <View key={Math.random()} style={block.listWrap}>
          {items.map((item: AnyToken, i: number) => {
            const isTask = item.task ?? false;
            const checked = item.checked ?? false;
            const marker = ordered
              ? `${start + i}.`
              : isTask
                ? ''
                : '•';

            return (
              <View key={i} style={block.listItem}>
                {isTask ? (
                  <Text style={block.taskCheckbox}>
                    {checked ? '☑' : '☐'}
                  </Text>
                ) : (
                  <Text style={block.listMarker}>{marker}</Text>
                )}
                <Text style={block.listText}>
                  <InlineText tokens={item.tokens ?? []} />
                </Text>
              </View>
            );
          })}
        </View>
      );
    }

    // ── 表格 ──────────────────────────────────────────────────────
    case 'table': {
      const header = token.header ?? [];
      const rows = token.rows ?? [];
      return (
        <View key={Math.random()} style={block.tableWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* 表头 */}
              <View style={block.tableRow}>
                {header.map((cell: AnyToken, ci: number) => (
                  <View key={ci} style={block.tableHeaderCell}>
                    <Text style={block.tableHeaderText}>
                      <InlineText tokens={cell.tokens ?? []} />
                    </Text>
                  </View>
                ))}
              </View>
              {/* 数据行 */}
              {rows.map((row: AnyToken[], ri: number) => (
                <View
                  key={ri}
                  style={[
                    block.tableRow,
                    ri % 2 === 0 ? block.tableRowEven : null,
                  ]}
                >
                  {row.map((cell: AnyToken, ci: number) => (
                    <View key={ci} style={block.tableCell}>
                      <Text style={block.tableCellText}>
                        <InlineText tokens={cell.tokens ?? []} />
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── 图片（块级独立图） ──────────────────────────────────────────
    case 'image':
      return null; // 图片在段落内联中处理

    // ── 空行/其他 ──────────────────────────────────────────────────
    case 'space':
      return <View key={Math.random()} style={block.spacer} />;

    default:
      if (token.tokens?.length) {
        return (
          <Text key={Math.random()} style={block.paragraph}>
            <InlineText tokens={token.tokens} />
          </Text>
        );
      }
      return null;
  }
}

// ── 主组件 ──────────────────────────────────────────────────────────

const MarkdownView = React.forwardRef<MarkdownViewHandle, Props>(
  function MarkdownView({ markdown, onImagePress }, ref) {
    const scrollRef = useRef<ScrollView>(null);

    // 预计算所有 heading 的 ID
    const headingIds = React.useMemo(() => {
      const tokens = marked.lexer(markdown);
      const ids: string[] = [];
      tokens.forEach((t: AnyToken) => {
        if (t.type === 'heading') ids.push(`h-${ids.length}`);
      });
      return ids;
    }, [markdown]);

    // 解析 tokens
    const tokens = React.useMemo(() => {
      return marked.lexer(markdown);
    }, [markdown]);

    const headingIndex = useRef(0);

    // 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      scrollToHeading(headingId: string) {
        // 使用 setTimeout 确保布局完成
        setTimeout(() => {
          // ScrollView 没有 scrollTo(node) 方法，使用估算偏移
          // headingId 格式为 "h-0", "h-1" ...
          const idx = parseInt(headingId.replace('h-', ''), 10);
          const estY = 40 + idx * 200; // 估算每个 heading 间距 ~200px
          scrollRef.current?.scrollTo({ y: estY, animated: true });
        }, 100);
      },
    }));

    // 提取内联图片的 src
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractImageSrc = (inlineTokens?: any[]): string | null => {
      if (!inlineTokens) return null;
      for (const t of inlineTokens) {
        if (t.type === 'image' && t.href) return t.href;
        if (t.tokens) {
          const found = extractImageSrc(t.tokens);
          if (found) return found;
        }
      }
      return null;
    };

    return (
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.container}
      >
        {tokens.map((token, i) => {
          // 段落中的图片：提取 src 并单独渲染
          if (token.type === 'paragraph') {
            const imgSrc = extractImageSrc(token.tokens);
            if (imgSrc) {
              return (
                <Pressable
                  key={i}
                  onPress={() => onImagePress?.(imgSrc)}
                >
                  <Image
                    source={{ uri: imgSrc }}
                    style={block.image}
                    resizeMode="cover"
                  />
                </Pressable>
              );
            }
          }

          return (
            <BlockRenderer
              key={i}
              token={token}
              onImagePress={onImagePress}
              headingIds={headingIds}
              headingIndex={headingIndex}
            />
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    );
  },
);

export default MarkdownView;

// ── 样式 ──────────────────────────────────────────────────────────

const inline = StyleSheet.create({
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const, color: Colors.textSecondary },
  del: { textDecorationLine: 'line-through' as const, color: Colors.textTertiary },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#f0f0f0',
    color: '#e03131',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  link: { color: '#2563eb' },
});

const block = StyleSheet.create({
  // 标题
  h1: { fontSize: 30, fontWeight: '700', lineHeight: 38, color: Colors.textPrimary, marginTop: 40, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: Colors.border },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: Colors.textPrimary, marginTop: 32, marginBottom: 8 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28, color: Colors.textPrimary, marginTop: 24, marginBottom: 6 },
  h4: { fontSize: 18, fontWeight: '600', lineHeight: 26, color: Colors.textPrimary, marginTop: 20, marginBottom: 4 },
  h5: { fontSize: 16, fontWeight: '600', lineHeight: 24, color: Colors.textPrimary, marginTop: 16, marginBottom: 4 },
  h6: { fontSize: 15, fontWeight: '600', lineHeight: 22, color: Colors.textSecondary, marginTop: 12, marginBottom: 4 },
  // 段落
  paragraph: { fontSize: 17, lineHeight: 28, color: Colors.textPrimary, marginBottom: 8 },
  // 代码块
  codeWrap: {
    backgroundColor: '#f7f7f7',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 12,
    overflow: 'hidden',
  },
  codeLang: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '500',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    padding: 14,
    paddingTop: 8,
  },
  // 引用
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.active,
    paddingLeft: 14,
    paddingVertical: 10,
    marginVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  quoteText: { fontSize: 16, lineHeight: 26, color: Colors.textSecondary, fontStyle: 'italic' },
  // 分割线
  hr: { height: 1, backgroundColor: Colors.border, marginVertical: 24 },
  // 列表
  listWrap: { marginVertical: 8, paddingLeft: 4 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingRight: Spacing.md },
  listMarker: { fontSize: 17, lineHeight: 28, color: Colors.textSecondary, width: 20, textAlign: 'center', marginRight: 4 },
  taskCheckbox: { fontSize: 17, lineHeight: 28, width: 22, textAlign: 'center', marginRight: 2 },
  listText: { fontSize: 17, lineHeight: 28, color: Colors.textPrimary, flex: 1 },
  // 表格
  tableWrap: { marginVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tableRowEven: { backgroundColor: '#fafafa' },
  tableHeaderCell: { padding: 10, backgroundColor: '#f7f7f7', minWidth: 80 },
  tableHeaderText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  tableCell: { padding: 10, minWidth: 80 },
  tableCellText: { fontSize: 14, lineHeight: 22, color: Colors.textPrimary },
  // 图片
  image: { width: '100%', height: 220, borderRadius: BorderRadius.md, marginVertical: 8 },
  // 间距
  spacer: { height: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
});
