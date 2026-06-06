/**
 * ExportScreen — 统一导出界面
 *
 * 支持两种导出格式：
 *   Markdown — 预览 → 复制到剪贴板 / 系统分享
 *   PDF       — 选择笔记 → 客户端生成 PDF（react-native-html-to-pdf）→ 分享
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { notesToMarkdown, copyToClipboard, shareMarkdown } from '../services/exportMarkdown';
import { exportNotesAsPdf } from '../services/exportPdf';
import { BorderRadius, Colors, Shadows, Spacing } from '../theme/designTokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ExportFormat = 'markdown' | 'pdf';

const FORMATS: { key: ExportFormat; icon: string; label: string; desc: string }[] = [
  { key: 'markdown', icon: '📝', label: 'Markdown', desc: '纯文本，兼容 Obsidian/Notion' },
  { key: 'pdf', icon: '📄', label: 'PDF 文档', desc: '生成 .pdf 文件，可保存或发送' },
];

export default function ExportScreen() {
  const nav = useNavigation<Nav>();
  const { notes } = useAppState();

  // ── 动画 ──────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── 状态 ──────────────────────────────────────────────────────
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // ── 数据 ──────────────────────────────────────────────────────
  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );
  const selected = useMemo(
    () => sorted.filter(n => selectedIds.includes(n.id)),
    [sorted, selectedIds],
  );
  const preview = useMemo(
    () => (format === 'markdown' && selected.length > 0 ? notesToMarkdown(selected) : ''),
    [format, selected],
  );

  const currentFormat = FORMATS.find(f => f.key === format) ?? FORMATS[0];
  const allSelected = selectedIds.length === sorted.length && sorted.length > 0;

  // ── 操作 ──────────────────────────────────────────────────────

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds(p =>
      p.includes(id) ? p.filter(i => i !== id) : [...p, id],
    );
  };

  const selectAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds(allSelected ? [] : sorted.map(n => n.id));
  };

  const switchFormat = (f: ExportFormat) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormat(f);
    setShowPreview(f === 'markdown');
  };

  // ── Markdown 导出 ────────────────────────────────────────────
  const handleMarkdownCopy = () => {
    if (!selected.length) { Alert.alert('未选择笔记', '请至少选择一篇笔记'); return; }
    copyToClipboard(preview);
    Alert.alert('✅ 已复制', `已将 ${selected.length} 篇笔记的 Markdown 复制到剪贴板`);
  };

  const handleMarkdownShare = async () => {
    if (!selected.length) { Alert.alert('未选择笔记', '请至少选择一篇笔记'); return; }
    try { await shareMarkdown(preview); } catch { Alert.alert('分享失败', '请重试'); }
  };

  // ── PDF 本地导出 ───────────────────────────────────────────
  const handlePdfExport = async () => {
    if (!selected.length) { Alert.alert('未选择笔记', '请至少选择一篇笔记'); return; }
    setExporting(true);
    try {
      const filePath = await exportNotesAsPdf(selected);
      Alert.alert(
        '✅ PDF 已生成',
        `文件已保存到：\n${filePath}\n\n可在文件管理器中找到。`,
      );
    } catch (err: unknown) {
      const msg = (err as Error).message || '请重试';
      Alert.alert('导出失败', msg);
    } finally {
      setExporting(false);
    }
  };

  // ── 辅助渲染 ──────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff} 天前`;
    return d.toLocaleDateString('zh-CN');
  };

  // ── 渲染 ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.cont}>
        {/* ── Header ── */}
        <View style={S.head}>
          <Pressable style={S.headBtn} onPress={() => nav.goBack()}>
            <Text style={S.backIcon}>‹</Text>
          </Pressable>
          <View style={S.headCenter}>
            <Text style={S.title}>导出笔记</Text>
            <Text style={S.headSub}>{currentFormat.desc}</Text>
          </View>
          <View style={S.headBtn} />
        </View>

        {/* ── 格式切换 ── */}
        <View style={S.formatRow}>
          {FORMATS.map(f => {
            const active = format === f.key;
            return (
              <Pressable
                key={f.key}
                style={[S.fmtChip, active && S.fmtChipOn]}
                onPress={() => switchFormat(f.key)}
              >
                <Text style={S.fmtIcon}>{f.icon}</Text>
                <Text style={[S.fmtLabel, active && S.fmtLabelOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── 选择工具栏 ── */}
        <View style={S.toolbar}>
          <Pressable style={S.selectAllBtn} onPress={selectAll}>
            <Text style={S.selectAllIcon}>{allSelected ? '◉' : '○'}</Text>
            <Text style={S.selectAllText}>
              {allSelected ? '取消全选' : '全选'}
            </Text>
          </Pressable>
          <View style={S.countBadge}>
            <Text style={S.countText}>
              {selected.length > 0
                ? `${selected.length} / ${notes.length}`
                : `${notes.length} 篇笔记`}
            </Text>
          </View>
          {format === 'markdown' && selected.length > 0 && (
            <Pressable
              style={S.previewToggle}
              onPress={() => setShowPreview(p => !p)}
            >
              <Text style={S.previewToggleText}>
                {showPreview ? '隐藏预览' : '显示预览'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── 笔记列表 ── */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            style={S.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sorted.length === 0 && S.listEmpty}
          >
            {sorted.map((note, idx) => {
              const sel = selectedIds.includes(note.id);
              return (
                <Pressable
                  key={note.id}
                  style={[S.card, sel && S.cardSel]}
                  onPress={() => toggle(note.id)}
                >
                  {/* 左侧序号 */}
                  <View style={[S.cardIdx, sel && S.cardIdxSel]}>
                    <Text style={[S.cardIdxText, sel && S.cardIdxTextSel]}>
                      {sel ? '✓' : idx + 1}
                    </Text>
                  </View>

                  {/* 内容 */}
                  <View style={S.cardBody}>
                    <View style={S.cardHeader}>
                      <Text style={S.cardTitle} numberOfLines={1}>
                        {note.title}
                      </Text>
                      {note.isFavorite && <Text style={S.favStar}>★</Text>}
                    </View>
                    <View style={S.cardMeta}>
                      {note.tag ? (
                        <View style={S.tagBadge}>
                          <Text style={S.tagText} numberOfLines={1}>{note.tag}</Text>
                        </View>
                      ) : null}
                      <Text style={S.dateText}>{formatDate(note.updatedAt)}</Text>
                      {note.blocks && note.blocks.length > 0 && (
                        <Text style={S.blockHint}>富文本</Text>
                      )}
                      {note.summary && (
                        <Text style={S.summaryHint}>AI 摘要</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {/* 空状态 */}
            {notes.length === 0 && (
              <View style={S.emptyWrap}>
                <Text style={S.emptyIcon}>📭</Text>
                <Text style={S.emptyTitle}>暂无笔记</Text>
                <Text style={S.emptyDesc}>创建笔记后再来导出吧</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* ── Markdown 预览 ── */}
        {format === 'markdown' && showPreview && preview.length > 0 && (
          <View style={S.previewWrap}>
            <View style={S.previewHeader}>
              <Text style={S.previewLabel}>预览</Text>
              <Text style={S.previewMeta}>
                {preview.length.toLocaleString()} 字符 ·{' '}
                {preview.split('\n').length} 行
              </Text>
            </View>
            <ScrollView
              style={S.previewScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={S.previewText} selectable>
                {preview}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* ── PDF 生成中提示 ── */}
        {format === 'pdf' && exporting && (
          <View style={S.exportingBar}>
            <ActivityIndicator size="small" color={Colors.onPrimaryContainer} />
            <Text style={S.exportingText}>正在生成 PDF...</Text>
          </View>
        )}

        {/* ── 操作按钮 ── */}
        <View style={S.btnArea}>
          {format === 'markdown' ? (
            <View style={S.btnRow}>
              <Pressable
                style={[S.btn, S.btnSecondary, !selected.length && S.btnOff]}
                onPress={handleMarkdownCopy}
                disabled={!selected.length}
              >
                <Text style={S.btnIcon}>📋</Text>
                <Text style={S.btnSecondaryText}>复制</Text>
              </Pressable>
              <Pressable
                style={[S.btn, S.btnPrimary, !selected.length && S.btnOff]}
                onPress={handleMarkdownShare}
                disabled={!selected.length}
              >
                <Text style={S.btnIcon}>📤</Text>
                <Text style={S.btnPrimaryText}>分享</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[S.btn, S.btnPrimary, S.btnFull, (exporting || !selected.length) && S.btnOff]}
              onPress={handlePdfExport}
              disabled={exporting || !selected.length}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Text style={S.btnIcon}>📄</Text>
                  <Text style={S.btnPrimaryText}>
                    导出 PDF{selected.length > 0 ? `（${selected.length} 篇）` : ''}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          {/* 提示文字 */}
          <Text style={S.hint}>
            {format === 'markdown'
              ? 'Markdown 可导入 Obsidian、Notion、Typora 等工具'
              : 'PDF 将保存到设备本地存储'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  cont: { flex: 1, paddingHorizontal: Spacing.lg },

  // ── Header ──────────────────────────────────────────────────
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: Colors.textPrimary, lineHeight: 26, fontWeight: '300' },
  headCenter: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  headSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    maxWidth: 200,
    textAlign: 'center',
  },

  // ── Format chips ────────────────────────────────────────────
  formatRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  fmtChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainer,
  },
  fmtChipOn: {
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  fmtIcon: { fontSize: 18 },
  fmtLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  fmtLabelOn: {
    color: Colors.onPrimary,
  },

  // ── Toolbar ─────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  selectAllIcon: { fontSize: 14, color: Colors.textSecondary },
  selectAllText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  countBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.onPrimaryContainer,
  },
  previewToggle: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  previewToggleText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  // ── Note cards ──────────────────────────────────────────────
  list: { flex: 1 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  cardSel: {
    borderColor: Colors.primary,
    backgroundColor: '#F8F5FC',
  },
  cardIdx: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardIdxSel: {
    backgroundColor: Colors.primary,
  },
  cardIdxText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cardIdxTextSel: {
    color: Colors.onPrimary,
    fontSize: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  favStar: {
    fontSize: 14,
    color: '#E6B422',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onPrimaryContainer,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  blockHint: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  summaryHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#f0f4ff',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  // ── Empty state ─────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary },

  // ── Preview ─────────────────────────────────────────────────
  previewWrap: {
    maxHeight: 200,
    backgroundColor: '#1E1E1E',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCC',
    letterSpacing: 0.5,
  },
  previewMeta: {
    fontSize: 11,
    color: '#888',
  },
  previewScroll: { flex: 1 },
  previewText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 19,
    color: '#D4D4D4',
    padding: Spacing.md,
  },

  // ── Exporting indicator ─────────────────────────────────────
  exportingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    marginBottom: Spacing.sm,
  },
  exportingText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onPrimaryContainer,
  },

  // ── Button area ─────────────────────────────────────────────
  btnArea: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    minHeight: 52,
  },
  btnFull: {
    flex: 1,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnOff: {
    opacity: 0.4,
  },
  btnIcon: { fontSize: 18 },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
});
