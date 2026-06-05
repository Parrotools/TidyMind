/**
 * BlockEditor — 块编辑器
 *
 * 每个 Block 独立编辑，支持插入/删除/排序，500ms 防抖自动保存。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NoteBlock, createEmptyBlock, EditableBlockType } from '../types/note';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { capturePhoto, pickFromGallery } from '../services/camera';

// ── 单个可编辑 Block ─────────────────────────────────────────────

function EditableBlock({
  block,
  index,
  onChange,
  onDelete,
  onFocus,
  isFocused,
}: {
  block: NoteBlock;
  index: number;
  onChange: (idx: number, b: NoteBlock) => void;
  onDelete: (idx: number) => void;
  onFocus: (idx: number) => void;
  isFocused: boolean;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <View style={ebStyles.blockWrap}>
          <TextInput
            style={[ebStyles.headingInput, block.level === 2 ? ebStyles.h2 : block.level === 3 ? ebStyles.h3 : ebStyles.h1]}
            value={block.text}
            onChangeText={t => onChange(index, { ...block, text: t })}
            onFocus={() => onFocus(index)}
            placeholder={`${'#'.repeat(block.level)} 标题`}
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    case 'paragraph':
      return (
        <View style={ebStyles.blockWrap}>
          <TextInput
            style={ebStyles.paragraphInput}
            value={block.text}
            onChangeText={t => onChange(index, { ...block, text: t })}
            onFocus={() => onFocus(index)}
            placeholder="输入内容..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    case 'quote':
      return (
        <View style={ebStyles.quoteWrap}>
          <TextInput
            style={ebStyles.quoteInput}
            value={block.text}
            onChangeText={t => onChange(index, { ...block, text: t })}
            onFocus={() => onFocus(index)}
            placeholder="引用内容..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    case 'list':
      return (
        <View style={ebStyles.blockWrap}>
          {block.items.map((item, li) => (
            <View key={li} style={ebStyles.listRow}>
              <Text style={ebStyles.listBullet}>{block.style === 'number' ? `${li + 1}.` : block.style === 'check' ? '☐' : '•'}</Text>
              <TextInput
                style={ebStyles.listInput}
                value={item}
                onChangeText={t => {
                  const items = [...block.items];
                  items[li] = t;
                  // 回车新增一行
                  if (t.endsWith('\n')) {
                    items[li] = t.trimEnd();
                    items.splice(li + 1, 0, '');
                  }
                  onChange(index, { ...block, items: items.filter(x => x !== '' || items.length === 1 || li === items.length - 1) });
                }}
                onFocus={() => onFocus(index)}
                placeholder="列表项..."
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          ))}
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    case 'code':
      return (
        <View style={ebStyles.codeWrap}>
          <TextInput
            style={ebStyles.codeLangInput}
            value={block.language ?? ''}
            onChangeText={t => onChange(index, { ...block, language: t })}
            placeholder="语言（可选）"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            style={ebStyles.codeTextInput}
            value={block.code}
            onChangeText={t => onChange(index, { ...block, code: t })}
            onFocus={() => onFocus(index)}
            placeholder="代码内容..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    case 'image':
      return (
        <View style={ebStyles.blockWrap}>
          {block.src ? (
            <View>
              <Image source={{ uri: block.src }} style={ebStyles.imagePreview} resizeMode="cover" />
              {isFocused && <BlockActions index={index} onDelete={onDelete} />}
            </View>
          ) : (
            <View style={ebStyles.imagePlaceholder}>
              <Pressable
                style={ebStyles.imagePickBtn}
                onPress={() => {
                  const onPick = (img: string | null) => {
                    if (img) onChange(index, { ...block, src: img });
                  };
                  if (Platform.OS === 'ios') {
                    const { ActionSheetIOS } = require('react-native');
                    ActionSheetIOS.showActionSheetWithOptions(
                      { options: ['取消', '拍照', '从相册选择'], cancelButtonIndex: 0 },
                      (i: number) => {
                        if (i === 1) capturePhoto().then(onPick);
                        else if (i === 2) pickFromGallery().then(onPick);
                      },
                    );
                  } else {
                    Alert.alert('插入图片', '', [
                      { text: '取消', style: 'cancel' },
                      { text: '拍照', onPress: () => capturePhoto().then(onPick) },
                      { text: '从相册选择', onPress: () => pickFromGallery().then(onPick) },
                    ]);
                  }
                }}
              >
                <Text style={styles.insertHint}>📷 点击添加图片</Text>
              </Pressable>
              {isFocused && <BlockActions index={index} onDelete={onDelete} />}
            </View>
          )}
        </View>
      );

    case 'divider':
      return (
        <View style={ebStyles.blockWrap}>
          <View style={ebStyles.dividerLine} />
          {isFocused && <BlockActions index={index} onDelete={onDelete} />}
        </View>
      );

    default:
      return null;
  }
}

// ── Block 操作按钮 ──────────────────────────────────────────────

function BlockActions({ index, onDelete }: { index: number; onDelete: (i: number) => void }) {
  return (
    <View style={ebStyles.actions}>
      <Pressable onPress={() => onDelete(index)}>
        <Text style={ebStyles.actionIcon}>🗑</Text>
      </Pressable>
      <Pressable>
        <Text style={ebStyles.dragHandle}>⠿</Text>
      </Pressable>
    </View>
  );
}

// ── 插入菜单 ─────────────────────────────────────────────────────

const INSERT_TYPES: Array<{ type: string; label: string; icon: string }> = [
  { type: 'heading', label: '标题', icon: 'H1' },
  { type: 'paragraph', label: '正文', icon: '¶' },
  { type: 'quote', label: '引用', icon: '❝' },
  { type: 'list', label: '列表', icon: '•' },
  { type: 'code', label: '代码', icon: '<>' },
  { type: 'image', label: '图片', icon: '🖼' },
  { type: 'divider', label: '分隔线', icon: '—' },
];

function InsertMenu({ onInsert }: { onInsert: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Pressable style={ebStyles.insertBtn} onPress={() => setOpen(true)}>
        <Text style={ebStyles.insertBtnText}>+ 插入</Text>
      </Pressable>
    );
  }
  return (
    <View style={ebStyles.insertMenu}>
      {INSERT_TYPES.map(t => (
        <Pressable
          key={t.type}
          style={ebStyles.insertItem}
          onPress={() => { onInsert(t.type); setOpen(false); }}
        >
          <Text style={ebStyles.insertIcon}>{t.icon}</Text>
          <Text style={ebStyles.insertLabel}>{t.label}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setOpen(false)}>
        <Text style={ebStyles.insertCancel}>取消</Text>
      </Pressable>
    </View>
  );
}

// ── 主编辑器 ──────────────────────────────────────────────────────

type Props = {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
  onSupplement?: () => void;
};

export default function BlockEditor({ blocks, onChange, onSupplement }: Props) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  // 移动 blocks 中的某一项
  const moveBlock = useCallback((from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }, [blocks, onChange]);

  const handleBlockChange = (idx: number, updated: NoteBlock) => {
    const next = [...blocks];
    next[idx] = updated;
    onChange(next);
  };

  const handleDelete = (idx: number) => {
    if (blocks.length <= 1) return;
    onChange(blocks.filter((_, i) => i !== idx));
  };

  const handleInsert = (afterIdx: number, type: string) => {
    const newBlock = createEmptyBlock(type);
    const next = [...blocks];
    next.splice(afterIdx + 1, 0, newBlock);
    onChange(next);
    setFocusedIdx(afterIdx + 1);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* 工具栏 */}
      {onSupplement && (
        <View style={styles.toolbar}>
          <Pressable style={styles.supplementBtn} onPress={onSupplement}>
            <Text style={styles.supplementIcon}>📎</Text>
            <Text style={styles.supplementText}>补充资料</Text>
          </Pressable>
        </View>
      )}
      {blocks.map((block, i) => (
        <Pressable
          key={block.id ?? i}
          onLongPress={() => {
            Alert.alert('移动 Block', '', [
              { text: '上移', onPress: () => moveBlock(i, i - 1) },
              { text: '下移', onPress: () => moveBlock(i, i + 1) },
              { text: '取消', style: 'cancel' },
            ]);
          }}
        >
          <EditableBlock
            block={block}
            index={i}
            onChange={handleBlockChange}
            onDelete={handleDelete}
            onFocus={setFocusedIdx}
            isFocused={focusedIdx === i}
          />
          {/* 每个 block 下方插入按钮 */}
          <View style={styles.insertRow}>
            <View style={styles.insertDot} />
            <Pressable onPress={() => handleInsert(i, 'paragraph')}>
              <Text style={styles.insertHint}>+</Text>
            </Pressable>
          </View>
        </Pressable>
      ))}
      {/* 底部插入菜单 */}
      <InsertMenu onInsert={(type) => handleInsert(blocks.length - 1, type)} />
      <View style={{ height: 200 }} />
    </ScrollView>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.md },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  supplementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supplementIcon: { fontSize: 14 },
  supplementText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  insertRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingLeft: 2, marginVertical: 4,
  },
  insertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  insertHint: { fontSize: 16, color: Colors.textTertiary, fontWeight: '700' },
});

const ebStyles = StyleSheet.create({
  blockWrap: { position: 'relative', marginBottom: Spacing.sm },
  // 标题
  headingInput: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, lineHeight: 32, paddingVertical: 4 },
  h2: { fontSize: 20 },
  h3: { fontSize: 18 },
  h1: { fontSize: 24 },
  // 段落
  paragraphInput: { fontSize: 16, lineHeight: 26, color: Colors.textPrimary, paddingVertical: 4 },
  // 引用
  quoteWrap: {
    borderLeftWidth: 3, borderLeftColor: Colors.active,
    paddingLeft: Spacing.md, backgroundColor: '#f9f9f9',
    borderRadius: 4, paddingVertical: Spacing.sm,
  },
  quoteInput: { fontSize: 16, lineHeight: 26, color: Colors.textSecondary, fontStyle: 'italic' },
  // 列表
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  listBullet: { fontSize: 16, lineHeight: 26, color: Colors.textSecondary, width: 22 },
  listInput: { flex: 1, fontSize: 16, lineHeight: 26, color: Colors.textPrimary, paddingVertical: 2 },
  // 代码
  codeWrap: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  codeLangInput: {
    fontSize: 12, fontWeight: '600', color: '#888', marginBottom: Spacing.sm,
  },
  codeTextInput: {
    fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: '#d4d4d4',
    minHeight: 80,
  },
  // 图片
  imagePreview: { width: '100%', height: 220, borderRadius: BorderRadius.md },
  imagePlaceholder: {
    backgroundColor: Colors.surfaceContainer, borderRadius: BorderRadius.md,
    padding: Spacing.xl, alignItems: 'center', justifyContent: 'center',
    minHeight: 120, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  imagePickBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  // 分隔线
  dividerLine: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  // 操作按钮
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md,
    marginTop: Spacing.xs, opacity: 0.5,
  },
  actionIcon: { fontSize: 14 },
  dragHandle: { fontSize: 16, color: Colors.textTertiary },
  // 插入菜单
  insertBtn: {
    alignSelf: 'center', paddingVertical: Spacing.md,
  },
  insertBtnText: { fontSize: 14, color: Colors.textTertiary, fontWeight: '500' },
  insertMenu: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  insertItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  insertIcon: { fontSize: 16, width: 28, color: Colors.textSecondary },
  insertLabel: { fontSize: 15, color: Colors.textPrimary },
  insertCancel: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
});
