/**
 * BlockRenderer — 结构化笔记块渲染器
 *
 * 根据 NoteBlock 类型渲染对应的 Notion 风格卡片/区块。
 */

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NoteBlock } from '../types/note';
import { Colors, BorderRadius, Spacing } from '../theme/designTokens';

type Props = {
  blocks: NoteBlock[];
  summary?: string;
  keyPoints?: string[];
  onHeadingLayout?: (id: string, y: number) => void;
  onImagePress?: (src: string) => void;
};

/** 规范化 block 数据（AI 可能返回字符串而非数组） */
function normalizeBlock(b: NoteBlock): NoteBlock {
  if (b.type === 'section') {
    const p = (b as any).paragraphs;
    return { ...b, paragraphs: Array.isArray(p) ? p : typeof p === 'string' ? [p] : [] };
  }
  if (b.type === 'list') {
    const items = (b as any).items;
    return { ...b, items: Array.isArray(items) ? items : typeof items === 'string' ? [items] : [] };
  }
  if (b.type === 'table') {
    return {
      ...b,
      headers: Array.isArray((b as any).headers) ? (b as any).headers : [],
      rows: Array.isArray((b as any).rows) ? (b as any).rows : [],
    };
  }
  return b;
}

export default function BlockRenderer({ blocks, summary, keyPoints, onHeadingLayout, onImagePress }: Props) {
  const normalizedBlocks = blocks.map(normalizeBlock);

  return (
    <View style={styles.container}>
      {/* 摘要卡片 */}
      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>📋 核心摘要</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      ) : null}

      {/* 关键要点 */}
      {keyPoints && keyPoints.length > 0 ? (
        <View style={styles.keyPointsCard}>
          <Text style={styles.kpLabel}>🔑 关键要点</Text>
          {keyPoints.map((kp, i) => (
            <View key={i} style={styles.kpRow}>
              <View style={styles.kpBadge}>
                <Text style={styles.kpBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.kpText}>{kp}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 主体 Blocks */}
      {normalizedBlocks.map((block, i) => {
        switch (block.type) {
          // ── 标题 ──────────────────────────────────────────────
          case 'heading': {
            const isH1 = block.level === 1;
            const hId = `h-${i}`;
            return (
              <View key={i} onLayout={e => onHeadingLayout?.(hId, e.nativeEvent.layout.y)}>
                <Text style={
                  isH1 ? { fontSize: 28, fontWeight: '700', lineHeight: 36, color: Colors.textPrimary, marginTop: 36, marginBottom: 10, letterSpacing: -0.3 } :
                  block.level === 2 ? { fontSize: 22, fontWeight: '600', lineHeight: 30, color: Colors.textPrimary, marginTop: 28, marginBottom: 8 } :
                  { fontSize: 19, fontWeight: '600', lineHeight: 27, color: Colors.textPrimary, marginTop: 22, marginBottom: 6 }
                }>{block.text}</Text>
                {isH1 && <View style={{ height: 2, backgroundColor: Colors.border, marginBottom: 8 }} />}
              </View>
            );
          }
          // ── 段落 ──────────────────────────────────────────────
          case 'paragraph':
            return (
              <Text key={i} style={{
                fontSize: 17, lineHeight: 28, color: Colors.textPrimary,
                marginBottom: 10, paddingHorizontal: 0,
              }}>{block.text}</Text>
            );
          // ── 章节 ──────────────────────────────────────────────
          case 'section':
            return (
              <View key={i} style={styles.section} onLayout={e => onHeadingLayout?.(`heading-${i}`, e.nativeEvent.layout.y)}>
                <Text style={styles.sectionHeading}>{block.heading}</Text>
                {block.paragraphs.map((p, pi) => (
                  <Text key={pi} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            );

          // ── 引用 ──────────────────────────────────────────────
          case 'quote':
            return (
              <View key={i} style={styles.quoteCard}>
                <Text style={styles.quoteText}>{block.text}</Text>
                {block.source ? (
                  <Text style={styles.quoteSource}>— {block.source}</Text>
                ) : null}
              </View>
            );

          // ── 提示 ──────────────────────────────────────────────
          case 'tip':
            return (
              <View key={i} style={styles.tipCard}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>{block.text}</Text>
              </View>
            );

          // ── 警告 ──────────────────────────────────────────────
          case 'warning':
            return (
              <View key={i} style={styles.warningCard}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningText}>{block.text}</Text>
              </View>
            );

          // ── 案例 ──────────────────────────────────────────────
          case 'example':
            return (
              <View key={i} style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>📝 {block.heading}</Text>
                <Text style={styles.exampleText}>{block.content}</Text>
              </View>
            );

          // ── 列表 ──────────────────────────────────────────────
          case 'list':
            return (
              <View key={i} style={styles.listCard}>
                {block.items.map((item, li) => (
                  <View key={li} style={styles.listRow}>
                    <Text style={styles.listMarker}>
                      {block.style === 'number'
                        ? `${li + 1}.`
                        : block.style === 'check'
                          ? '☐'
                          : '•'}
                    </Text>
                    <Text style={styles.listItem}>{item}</Text>
                  </View>
                ))}
              </View>
            );

          // ── 表格 ──────────────────────────────────────────────
          case 'table':
            return (
              <View key={i} style={styles.tableCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.tableRow}>
                      {block.headers.map((h, hi) => (
                        <View key={hi} style={styles.tableHeaderCell}>
                          <Text style={styles.tableHeaderText}>{h}</Text>
                        </View>
                      ))}
                    </View>
                    {block.rows.map((row, ri) => (
                      <View
                        key={ri}
                        style={[
                          styles.tableRow,
                          ri % 2 === 0 ? styles.tableRowEven : null,
                        ]}
                      >
                        {row.map((cell, ci) => (
                          <View key={ci} style={styles.tableCell}>
                            <Text style={styles.tableCellText}>{cell}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );

          // ── 代码 ──────────────────────────────────────────────
          case 'code':
            return (
              <View key={i} style={styles.codeCard}>
                {block.language ? (
                  <Text style={styles.codeLang}>{block.language}</Text>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.codeText}>{block.code}</Text>
                </ScrollView>
              </View>
            );

          // ── 结论 ──────────────────────────────────────────────
          case 'conclusion':
            return (
              <View key={i} style={styles.conclusionCard}>
                <Text style={styles.conclusionLabel}>📌 总结</Text>
                <Text style={styles.conclusionText}>{block.text}</Text>
              </View>
            );

          // ── 图片 ──────────────────────────────────────────────
          case 'image':
            return (
              <Pressable key={i} onPress={() => onImagePress?.((block as any).src || '')}>
                <Image source={{ uri: (block as any).src || '' }} style={{ width: '100%', height: 240, borderRadius: BorderRadius.md, marginVertical: 8 }} resizeMode="cover" />
              </Pressable>
            );

          // ── 分隔线 ────────────────────────────────────────────
          case 'divider':
            return <View key={i} style={styles.divider} />;

          default:
            return null;
        }
      })}
    </View>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
  },

  // ── 摘要卡片 ────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textPrimary,
  },

  // ── 关键要点 ────────────────────────────────────────────────
  keyPointsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  kpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  kpBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  kpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  kpText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },

  // ── 章节 ────────────────────────────────────────────────────
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 27,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // ── 引用 ────────────────────────────────────────────────────
  quoteCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.active,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    color: Colors.textSecondary,
  },
  quoteSource: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },

  // ── 提示卡片（绿色系） ──────────────────────────────────────
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  tipIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#166534',
  },

  // ── 警告卡片（橙色系） ──────────────────────────────────────
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  warningIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#9a3412',
  },

  // ── 案例卡片（蓝色系） ──────────────────────────────────────
  exampleCard: {
    backgroundColor: '#eff6ff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: Spacing.sm,
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 25,
    color: Colors.textPrimary,
  },

  // ── 列表 ────────────────────────────────────────────────────
  listCard: {
    marginBottom: Spacing.lg,
    paddingLeft: 4,
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  listMarker: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textSecondary,
    width: 22,
  },
  listItem: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textPrimary,
  },

  // ── 表格 ────────────────────────────────────────────────────
  tableCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
  },
  tableHeaderCell: {
    padding: 10,
    backgroundColor: '#f7f7f7',
    minWidth: 90,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tableCell: {
    padding: 10,
    minWidth: 90,
  },
  tableCellText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
  },

  // ── 代码 ────────────────────────────────────────────────────
  codeCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  codeLang: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: '#d4d4d4',
  },

  // ── 结论 ──────────────────────────────────────────────────
  conclusionCard: {
    backgroundColor: '#fefce8',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
  },
  conclusionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a16207',
    marginBottom: Spacing.sm,
  },
  conclusionText: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textPrimary,
  },

  // ── 图片 ──────────────────────────────────────────────────
  imageBlock: { width: '100%', height: 240, borderRadius: BorderRadius.md, marginVertical: 8 },

  // ── 分隔线 ──────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
});
