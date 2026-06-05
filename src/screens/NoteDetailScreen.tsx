/**
 * NoteDetailScreen — Apple Notes + Notion 风格笔记详情页
 *
 * 功能：
 * - 毛玻璃头部 + 滚动阴影
 * - WebView Markdown 渲染（代码高亮／表格／LaTeX／Mermaid）
 * - 目录浮窗导航
 * - 沉浸式阅读模式
 * - 图片点击灯箱
 * - 入场动画
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../state/AppState';
import MarkdownView, { MarkdownViewHandle } from '../components/MarkdownView';
import BlockRenderer from '../components/BlockRenderer';
import BlockEditor from '../components/BlockEditor';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { RootStackParamList } from '../navigation/types';
import { NoteBlock, contentToBlocks, createBlockId, flattenBlocksForEditing } from '../types/note';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';
import { CONTEXT_SUPPLEMENT_PROMPT } from '../services/prompts';
import { pickFile } from '../services/filePicker';

const SCREEN_WIDTH = Dimensions.get('window').width;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NoteDetail'>;
type DetailRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

// ── 辅助 ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 60000);
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff} 分钟前`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} 小时前`;
  return d.toLocaleDateString('zh-CN');
}

/** 从 Markdown 中提取 H1/H2/H3 标题用于目录 */
function extractTOC(markdown: string): Array<{ level: number; text: string; id: string }> {
  const re = /^(#{1,3})\s+(.+)$/gm;
  const items: Array<{ level: number; text: string; id: string }> = [];
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    items.push({ level: m[1].length, text: m[2].trim(), id: `heading-${i++}` });
  }
  return items;
}

// ── 组件 ────────────────────────────────────────────────────────────

export default function NoteDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { noteId } = route.params;
  const { notes, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const note = notes.find(n => n.id === noteId);

  // 动画值
  const animProgress = useRef(new Animated.Value(0)).current;
  const headerShadow = useRef(new Animated.Value(0)).current;
  const tocSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // 状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editBlocks, setEditBlocks] = useState<NoteBlock[]>([]);
  const [immersive, setImmersive] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 自动保存（500ms 防抖） ──────────────────────────────────────
  const autoSave = useCallback((title: string, tag: string, blocks: NoteBlock[]) => {
    if (!note) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const safeTitle = title ?? note.title;
    const safeTag = tag ?? note.tag;
    saveTimer.current = setTimeout(() => {
      upsertNote({
        id: note.id,
        title: safeTitle.trim() || note.title,
        content: blocks.map(b => {
          if (b.type === 'heading') return `${'#'.repeat(b.level)} ${b.text}`;
          if (b.type === 'paragraph') return b.text;
          if (b.type === 'quote') return `> ${b.text}`;
          if (b.type === 'code') return '```' + (b.language ?? '') + '\n' + b.code + '\n```';
          if (b.type === 'list') return b.items.map(item => `- ${item}`).join('\n');
          if (b.type === 'image') return `![image](${(b as any).src || ''})`;
          if (b.type === 'divider') return '---';
          return '';
        }).filter(Boolean).join('\n\n'),
        tag: safeTag.trim() || note.tag,
        blocks,
        summary: undefined,
        keyPoints: undefined,
      });
    }, 500);
  }, [note, upsertNote]);
  const [tocVisible, setTocVisible] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  const markdownRef = useRef<MarkdownViewHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const headingPositions = useRef<Map<string, number>>(new Map());
  const tocItems = note ? extractTOC(note.content) : [];
  // TOC 索引计数器（每次渲染时重置）
  const tocIndexRef = useRef(0);

  // ── 入场动画 ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(animProgress, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [animProgress]);

  // 清理定时器
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  // ── TOC 动画 ─────────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(tocSlide, {
      toValue: tocVisible ? 0 : SCREEN_WIDTH,
      tension: 100,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [tocVisible, tocSlide]);

  // ── 沉浸模式切换 ────────────────────────────────────────────────
  const toggleImmersive = useCallback(() => {
    setImmersive(v => {
      const next = !v;
      StatusBar.setHidden(next, 'fade');
      return next;
    });
  }, []);

  // ── 笔记操作 ────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!note) return;
    setEditTitle(note.title);
    setEditTag(note.tag ?? '');
    // AI 生成的 rich blocks 需要展平为基础编辑类型
    const blocks = (note.blocks && note.blocks.length > 0)
      ? flattenBlocksForEditing(note.blocks)
      : contentToBlocks(note.content);
    setEditBlocks(blocks);
    setIsEditing(true);
  };

  const handleSaveInline = () => {
    if (!note) return;
    if (!editTitle.trim()) {
      Alert.alert('缺少标题', '请输入标题');
      return;
    }
    // 清除定时器并立即保存
    if (saveTimer.current) clearTimeout(saveTimer.current);
    upsertNote({
      id: note.id,
      title: editTitle.trim(),
      content: note.content,
      tag: editTag.trim(),
      blocks: editBlocks,
      summary: undefined,
      keyPoints: undefined,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // 退出前清理定时器
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsEditing(false);
  };

  // ── 补充资料 → AI 续写 ────────────────────────────────────────

  const handleSupplement = async () => {
    if (!note) return;

    // 1. 选择操作模式
    const modes = ['自动分析最佳插入位置', '补充整篇笔记', '更新总结', '取消'] as const;
    let selectedMode = '';
    await new Promise<void>(resolve => {
      Alert.alert('补充资料', '请选择操作模式', [
        { text: modes[0], onPress: () => { selectedMode = modes[0]; resolve(); } },
        { text: modes[1], onPress: () => { selectedMode = modes[1]; resolve(); } },
        { text: modes[2], onPress: () => { selectedMode = modes[2]; resolve(); } },
        { text: modes[3], style: 'cancel', onPress: () => resolve() },
      ]);
    });
    if (!selectedMode || selectedMode === '取消') return;

    // 2. 选择文件
    const file = await pickFile();
    if (!file) return;

    // 3. 显示进度
    Alert.alert('正在分析', `正在读取「${file.name}」并结合当前笔记进行智能补充...`);

    try {
      // 4. 构建上下文
      const contextBlocks = editBlocks.map((b, i) =>
        `[${i}] ${b.type}: ${JSON.stringify(b)}`
      ).join('\n');

      // 5. 调用 AI
      const userText = file.text
        ? `--- 新文件: ${file.name} ---\n${file.text.slice(0, 5000)}`
        : '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [{ type: 'text', text: `模式: ${selectedMode}\n当前笔记标题: ${note.title}\n\n当前 Block 列表（每个 block 带索引）:\n${contextBlocks}\n\n${userText}` }];
      if (!file.text) {
        userContent.push({ type: 'image_url', image_url: { url: file.base64 } });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await callLLM({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: CONTEXT_SUPPLEMENT_PROMPT },
          { role: 'user', content: userContent as any },
        ],
        stream: false, temperature: 0.5, maxTokens: 4096,
      });

      // 6. 解析 JSON
      let jsonStr = response.trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/im, '').replace(/\n?```\s*$/im, '');
      const fb = jsonStr.indexOf('{');
      if (fb >= 0) {
        let depth = 0, lb = fb;
        for (let ci = fb; ci < jsonStr.length; ci++) {
          if (jsonStr[ci] === '{') depth++;
          if (jsonStr[ci] === '}') depth--;
          if (depth === 0) { lb = ci; break; }
        }
        jsonStr = jsonStr.slice(fb, lb + 1);
      }
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      const parsed = JSON.parse(jsonStr);
      const newBlocks: NoteBlock[] = (parsed.newBlocks ?? []).map((b: NoteBlock) =>
        ({ ...b, id: createBlockId() })
      );
      const insertAfter: number = parsed.insertAfter ?? -1;

      if (newBlocks.length === 0) {
        Alert.alert('未发现新内容', 'AI 分析后认为当前笔记已覆盖文件中的信息。');
        return;
      }

      // 7. 合并 blocks（插入到指定位置）
      const merged = [...editBlocks];
      const insertIdx = insertAfter >= 0 && insertAfter < merged.length
        ? insertAfter + 1 : merged.length;
      merged.splice(insertIdx, 0, ...newBlocks);
      setEditBlocks(merged);
      autoSave(editTitle, editTag, merged);

      Alert.alert(
        '补充完成',
        `已新增 ${newBlocks.length} 个内容块（插入在第 ${insertIdx} 个 block 之后）。\n\n分析: ${parsed.analysis ?? '自动识别最佳位置'}`,
      );
    } catch (err: unknown) {
      Alert.alert('补充失败', (err as Error).message || '请重试');
    }
  };

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('删除笔记', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => {
        deleteNote(note.id);
        navigation.goBack();
      }},
    ]);
  };

  const handleMore = () => {
    const options = [isEditing ? '退出编辑' : '编辑', '切换收藏', '沉浸阅读', '删除', '取消'];
    const cancelIdx = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx },
        idx => {
          if (idx === 0) isEditing ? handleCancelEdit() : enterEditMode();
          else if (idx === 1) note && toggleFavorite(note.id);
          else if (idx === 2) toggleImmersive();
          else if (idx === 3) handleDelete();
        },
      );
    } else {
      Alert.alert('更多', '', [
        { text: isEditing ? '退出编辑' : '编辑', onPress: () => isEditing ? handleCancelEdit() : enterEditMode() },
        { text: note?.isFavorite ? '取消收藏' : '收藏', onPress: () => note && toggleFavorite(note.id) },
        { text: '沉浸阅读', onPress: toggleImmersive },
        { text: '删除', style: 'destructive', onPress: handleDelete },
        { text: '取消', style: 'cancel' },
      ]);
    }
  };

  // ── 标题变化回调 ────────────────────────────────────────────────
  const handleHeadingChange = useCallback((id: string, _text: string) => {
    setActiveHeadingId(id);
  }, []);

  // ── TOC 跳转 ────────────────────────────────────────────────────
  const handleTOCPress = (id: string) => {
    // 使用测量的精确位置，回退到估算
    const pos = headingPositions.current.get(id);
    const y = pos ?? (parseInt(id.replace('heading-', ''), 10) * 280 + 40);
    scrollViewRef.current?.scrollTo({ y, animated: true });
    setTocVisible(false);
  };

  // ── 笔记不存在 ──────────────────────────────────────────────────
  if (!note) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>笔记详情</Text>
            <View style={styles.headerBtn} />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>笔记不存在或已被删除</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── 动画插值 ────────────────────────────────────────────────────
  const contentAnim = {
    opacity: animProgress,
    transform: [{ scale: animProgress.interpolate({
      inputRange: [0, 1], outputRange: [0.96, 1],
    }) }],
  };
  const headerAnim = {
    opacity: animProgress,
    transform: [{ translateY: animProgress.interpolate({
      inputRange: [0, 1], outputRange: [-50, 0],
    }) }],
  };
  const toolbarAnim = {
    opacity: animProgress,
    transform: [{ translateY: animProgress.interpolate({
      inputRange: [0, 1], outputRange: [50, 0],
    }) }],
  };

  // ── 渲染 ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ═══ 毛玻璃头部 ═══ */}
      {!immersive && (
        <Animated.View style={[styles.header, headerAnim]}>
          <Animated.View
            style={[
              styles.headerShadow,
              { opacity: headerShadow },
            ]}
          />
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => isEditing ? handleCancelEdit() : navigation.goBack()}
            >
              <Text style={styles.backIcon}>{isEditing ? '✕' : '‹'}</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isEditing ? '编辑笔记' : note.title}
            </Text>
            {isEditing ? (
              <Pressable style={[styles.headerBtn, styles.saveBtn]} onPress={handleSaveInline}>
                <Text style={styles.saveBtnText}>保存</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.headerBtn} onPress={handleMore}>
                <Text style={styles.moreIcon}>⋯</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {/* ═══ 正文区域 ═══ */}
      <Animated.View style={[styles.bodyWrap, contentAnim]}>
        {isEditing ? (
          /* ── 编辑模式 ──────────────────────────────────────────── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.editScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.editLabel}>标题</Text>
            <TextInput
              style={styles.editTitleInput}
              value={editTitle}
              onChangeText={t => { setEditTitle(t); autoSave(t, editTag, editBlocks); }}
              placeholder="笔记标题"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.editLabel}>标签</Text>
            <TextInput
              style={styles.editTagInput}
              value={editTag}
              onChangeText={t => { setEditTag(t); autoSave(editTitle, t, editBlocks); }}
              placeholder="输入一个标签"
              placeholderTextColor={Colors.textTertiary}
            />
            <BlockEditor
              blocks={editBlocks}
              onChange={blocks => {
                setEditBlocks(blocks);
                autoSave(editTitle, editTag, blocks);
              }}
              onSupplement={handleSupplement}
            />
          </ScrollView>
        ) : (
          /* ── 阅读模式 ──────────────────────────────────────────── */
          <>
        {/* 标题 + 元信息 */}
        <View style={styles.metaSection}>
          <Text style={styles.noteTitle}>{note.title}</Text>
          <View style={styles.metaRow}>
            {note.tag ? (
              <View style={styles.tagsLine}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{note.tag}</Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.dateText}>
              {formatDate(note.updatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 内容渲染：有 blocks 或 summary/keyPoints 用 BlockRenderer */}
        {(note.blocks && note.blocks.length > 0) || note.summary || (note.keyPoints && note.keyPoints.length > 0) ? (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={styles.blockScroll}
            keyboardShouldPersistTaps="handled"
          >
            <BlockRenderer
              blocks={note.blocks && note.blocks.length > 0 ? note.blocks : contentToBlocks(note.content)}
              summary={note.summary}
              keyPoints={note.keyPoints}
              onHeadingLayout={(id, y) => headingPositions.current.set(id, y)}
              onImagePress={setLightboxSrc}
            />
            {/* 图片附件 */}
            {note.images && note.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imgStrip}
              >
                {note.images.map((uri, i) => (
                  <Pressable key={i} onPress={() => setLightboxSrc(uri)}>
                    <Image source={{ uri }} style={styles.stripImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {/* 底部元信息 */}
            <View style={styles.footerMeta}>
          {note.location && (
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>📍</Text>
              <Text style={styles.footerLabel}>{note.location.name}</Text>
              {note.location.address ? (
                <Text style={styles.footerAddr}>{note.location.address}</Text>
              ) : null}
            </View>
          )}
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>🕐</Text>
            <Text style={styles.footerLabel}>
              创建于 {formatDate(note.createdAt)} · 更新于 {formatDate(note.updatedAt)}
            </Text>
          </View>
        </View>
        </ScrollView>
        ) : (
          <>
            <MarkdownView
              ref={markdownRef}
              markdown={note.content || '暂无内容'}
              onImagePress={setLightboxSrc}
            />
            {note.images && note.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgStrip}>
                {note.images.map((uri, i) => (
                  <Pressable key={i} onPress={() => setLightboxSrc(uri)}>
                    <Image source={{ uri }} style={styles.stripImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.footerMeta}>
              {note.location && (
                <View style={styles.footerItem}>
                  <Text style={styles.footerIcon}>📍</Text>
                  <Text style={styles.footerLabel}>{note.location.name}</Text>
                  {note.location.address ? (
                    <Text style={styles.footerAddr}>{note.location.address}</Text>
                  ) : null}
                </View>
              )}
              <View style={styles.footerItem}>
                <Text style={styles.footerIcon}>🕐</Text>
                <Text style={styles.footerLabel}>
                  创建于 {formatDate(note.createdAt)} · 更新于 {formatDate(note.updatedAt)}
                </Text>
              </View>
            </View>
          </>
        )}
        </>
        )}
      </Animated.View>

      {/* ═══ 底部工具栏 ═══ */}
      {!immersive && !isEditing && (
        <Animated.View style={[styles.toolbar, toolbarAnim]}>
          <Pressable
            style={styles.toolBtn}
            onPress={() => setTocVisible(true)}
          >
            <Text style={styles.toolIcon}>📑</Text>
            <Text style={styles.toolLabel}>目录</Text>
          </Pressable>

          <Pressable
            style={styles.toolBtn}
            onPress={() => isEditing ? handleCancelEdit() : enterEditMode()}
          >
            <Text style={styles.toolIcon}>{isEditing ? '👁' : '✏️'}</Text>
            <Text style={styles.toolLabel}>{isEditing ? '预览' : '编辑'}</Text>
          </Pressable>

          <Pressable
            style={styles.toolBtn}
            onPress={() => note && toggleFavorite(note.id)}
          >
            <Text style={styles.toolIcon}>
              {note.isFavorite ? '★' : '☆'}
            </Text>
            <Text style={styles.toolLabel}>收藏</Text>
          </Pressable>

          <Pressable
            style={styles.toolBtn}
            onPress={toggleImmersive}
          >
            <Text style={styles.toolIcon}>📖</Text>
            <Text style={styles.toolLabel}>沉浸</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ═══ 沉浸模式退出按钮 ═══ */}
      {immersive && (
        <Pressable style={styles.immersiveExit} onPress={toggleImmersive}>
          <Text style={styles.immersiveExitText}>✕</Text>
        </Pressable>
      )}

      {/* ═══ 目录浮窗 ═══ */}
      <Modal
        visible={tocVisible}
        transparent
        animationType="none"
        onRequestClose={() => setTocVisible(false)}
      >
        <Pressable
          style={styles.tocBackdrop}
          onPress={() => setTocVisible(false)}
        >
          <Animated.View
            style={[
              styles.tocPanel,
              { transform: [{ translateX: tocSlide }] },
            ]}
          >
            <Pressable
              onPress={e => e.stopPropagation()}
              style={styles.tocInner}
            >
              <Text style={styles.tocTitle}>目录</Text>
              {tocItems.length === 0 ? (
                <Text style={styles.tocEmpty}>暂无标题</Text>
              ) : (
                tocItems.map((item, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.tocItem,
                      item.level === 2 && styles.tocItemH2,
                      item.level === 3 && styles.tocItemH3,
                      activeHeadingId === item.id && styles.tocItemActive,
                    ]}
                    onPress={() => handleTOCPress(item.id)}
                  >
                    <Text
                      style={[
                        styles.tocItemText,
                        activeHeadingId === item.id && styles.tocItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                ))
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ═══ 图片灯箱 ═══ */}
      <Modal
        visible={!!lightboxSrc}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSrc(null)}
      >
        <Pressable
          style={styles.lightbox}
          onPress={() => setLightboxSrc(null)}
        >
          {lightboxSrc && (
            <Image
              source={{ uri: lightboxSrc }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    zIndex: 10,
  },
  headerShadow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 48,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
    lineHeight: 26,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  moreIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── Body ────────────────────────────────────────────────────
  bodyWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  // ── Image strip ─────────────────────────────────────────────
  imgStrip: {
    maxHeight: 140,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  imgStripInner: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  stripImg: {
    width: 200,
    height: 130,
    borderRadius: BorderRadius.md,
  },

  // ── Meta section ────────────────────────────────────────────
  metaSection: {
    paddingTop: Spacing.lg,
  },
  noteTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  tagsLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  blockScroll: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  // ── Footer meta ─────────────────────────────────────────────
  footerMeta: {
    paddingVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  footerIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  footerLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  footerAddr: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ── Toolbar ─────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: '#ffffff',
  },
  toolBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Immersive exit ──────────────────────────────────────────
  immersiveExit: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  immersiveExitText: {
    fontSize: 18,
    color: '#262626',
  },

  // ── TOC ─────────────────────────────────────────────────────
  tocBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tocPanel: {
    width: 280,
    backgroundColor: '#ffffff',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.border,
  },
  tocInner: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  tocEmpty: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 40,
  },
  tocItem: {
    paddingVertical: 10,
    paddingLeft: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tocItemH2: { paddingLeft: 16 },
  tocItemH3: { paddingLeft: 32 },
  tocItemActive: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  tocItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  tocItemTextActive: {
    fontWeight: '600',
    color: '#2563eb',
  },

  // ── Lightbox ────────────────────────────────────────────────
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: {
    width: '100%',
    height: '80%',
  },

  // ── Edit mode ──────────────────────────────────────────────
  saveBtn: {
    backgroundColor: Colors.active,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  editScroll: {
    flex: 1,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  editTitleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  editTagInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // ── Empty state ─────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
