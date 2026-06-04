import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { Note, NoteLocation } from '../types/note';
import { searchPOI, POIResult } from '../services/geo';
import { capturePhoto, pickFromGallery } from '../services/camera';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';

type NoteEditorModalProps = {
  visible: boolean;
  initialNote: Note | null;
  onCancel: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    content: string;
    tags: string[];
    location?: NoteLocation;
    images?: string[];
  }) => void;
  onDelete: (id: string) => void;
};

export default function NoteEditorModal({
  visible,
  initialNote,
  onCancel,
  onSave,
  onDelete,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState<POIResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<NoteLocation | undefined>();
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(initialNote?.title ?? '');
    setContent(initialNote?.content ?? '');
    setTagsInput(initialNote?.tags.join(', ') ?? '');
    setSelectedLocation(initialNote?.location);
    setLocQuery(initialNote?.location?.name ?? '');
    setImages(initialNote?.images ?? []);
    setLocResults([]);
  }, [visible, initialNote]);

  const isEditing = Boolean(initialNote?.id);

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const handleLocSearch = async () => {
    if (!locQuery.trim()) return;
    setLocSearching(true);
    try {
      const r = await searchPOI(locQuery.trim(), '深圳', 1, 5);
      setLocResults(r.pois);
    } catch {
      setLocResults([]);
    } finally {
      setLocSearching(false);
    }
  };

  const [tagSuggesting, setTagSuggesting] = useState(false);

  const handleAutoTag = async () => {
    if (!title.trim() && !content.trim()) return;
    setTagSuggesting(true);
    try {
      const response = await callLLM({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: '根据标题和内容推荐3-5个标签。返回JSON: {"tags":["标签1","标签2"]}。标签2-4字，中文。' },
          { role: 'user', content: `标题: ${title}\n内容: ${content.slice(0, 500)}` },
        ],
        stream: false,
        temperature: 0.5,
        maxTokens: 200,
      });
      const parsed = JSON.parse(response);
      const newTags = (parsed.tags ?? []).filter((t: string) => !parsedTags.includes(t));
      if (newTags.length > 0) {
        setTagsInput(prev => (prev.trim() ? `${prev}, ${newTags.join(', ')}` : newTags.join(', ')));
      }
    } catch {}
    setTagSuggesting(false);
  };

  const handleAddImage = () => {
    if (Platform.OS === 'ios') {
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['取消', '拍照', '从相册选择'], cancelButtonIndex: 0 },
        (index: number) => {
          if (index === 1) capturePhoto().then(img => img && setImages(prev => [...prev, img]));
          else if (index === 2) pickFromGallery().then(img => img && setImages(prev => [...prev, img]));
        },
      );
    } else {
      Alert.alert('添加图片', '', [
        { text: '取消', style: 'cancel' },
        { text: '拍照', onPress: () => capturePhoto().then(img => img && setImages(prev => [...prev, img])) },
        { text: '从相册选择', onPress: () => pickFromGallery().then(img => img && setImages(prev => [...prev, img])) },
      ]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectLocation = (poi: POIResult) => {
    const loc: NoteLocation = {
      name: poi.name,
      address: poi.address,
      city: poi.city,
      district: poi.district,
      latlng: poi.location,
    };
    setSelectedLocation(loc);
    setLocQuery(poi.name);
    setLocResults([]);
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Heading */}
          <Text style={styles.heading}>
            {isEditing ? '编辑笔记' : '新建笔记'}
          </Text>

          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>标题</Text>
            <TextInput
              style={styles.input}
              placeholder="输入标题"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>标签</Text>
              <Pressable style={styles.aiTagBtn} onPress={handleAutoTag} disabled={tagSuggesting}>
                <Text style={styles.aiTagBtnText}>
                  {tagSuggesting ? '...' : 'AI 推荐'}
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="以逗号分隔的标签"
              placeholderTextColor={Colors.textTertiary}
              value={tagsInput}
              onChangeText={setTagsInput}
            />

            <Text style={styles.label}>📍 学习地点</Text>
            <View style={styles.locRow}>
              <TextInput
                style={[styles.input, styles.locInput]}
                placeholder="搜索地点（图书馆/自习室...）"
                placeholderTextColor={Colors.textTertiary}
                value={locQuery}
                onChangeText={setLocQuery}
                onSubmitEditing={handleLocSearch}
                returnKeyType="search"
              />
              <Pressable style={styles.locSearchBtn} onPress={handleLocSearch}>
                {locSearching ? (
                  <ActivityIndicator size="small" color={Colors.textOnDark} />
                ) : (
                  <Text style={styles.locSearchText}>搜索</Text>
                )}
              </Pressable>
            </View>
            {selectedLocation && (
              <View style={styles.locSelected}>
                <Text style={styles.locSelIcon}>📍</Text>
                <View style={styles.locSelInfo}>
                  <Text style={styles.locSelName}>{selectedLocation.name}</Text>
                  <Text style={styles.locSelAddr}>{selectedLocation.address}</Text>
                </View>
                <Pressable onPress={() => { setSelectedLocation(undefined); setLocQuery(''); }}>
                  <Text style={styles.locClear}>✕</Text>
                </Pressable>
              </View>
            )}
            {locResults.length > 0 && (
              <View style={styles.locDropdown}>
                {locResults.map((poi, i) => (
                  <Pressable
                    key={i}
                    style={styles.locItem}
                    onPress={() => handleSelectLocation(poi)}
                  >
                    <Text style={styles.locItemName}>{poi.name}</Text>
                    <Text style={styles.locItemAddr} numberOfLines={1}>{poi.address}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Image gallery */}
            <View style={styles.imgSection}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>📸 图片附件 ({images.length})</Text>
                <Pressable style={styles.aiTagBtn} onPress={handleAddImage}>
                  <Text style={styles.aiTagBtnText}>+ 添加</Text>
                </Pressable>
              </View>
              {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                  {images.map((uri, i) => (
                    <View key={i} style={styles.imgWrap}>
                      <Image source={{ uri }} style={styles.imgThumb} resizeMode="cover" />
                      <Pressable style={styles.imgRemove} onPress={() => handleRemoveImage(i)}>
                        <Text style={styles.imgRemoveText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <Text style={[styles.label, { marginTop: Spacing.md }]}>内容</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="记录你的想法..."
              placeholderTextColor={Colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
            />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            {isEditing && (
              <Pressable
                style={styles.deleteButton}
                onPress={() => initialNote?.id && onDelete(initialNote.id)}
              >
                <Text style={styles.deleteText}>删除</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.saveButton}
              onPress={() =>
                onSave({
                  id: initialNote?.id,
                  title: title.trim(),
                  content: content.trim(),
                  tags: parsedTags,
                  location: selectedLocation,
                  images: images.length > 0 ? images : undefined,
                })
              }
            >
              <Text style={styles.saveText}>保存</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  formContent: {
    paddingBottom: Spacing.xl,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.backgroundEnd,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.inactive,
  },
  cancelText: {
    color: Colors.textOnDark,
    fontWeight: '500',
    fontSize: 14,
  },
  deleteButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dangerBg,
  },
  deleteText: {
    color: Colors.danger,
    fontWeight: '500',
    fontSize: 14,
  },
  saveButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.active,
  },
  saveText: {
    color: Colors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  aiTagBtn: {
    backgroundColor: Colors.active, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, marginBottom: Spacing.xs,
  },
  aiTagBtnText: { fontSize: 10, color: Colors.textOnDark, fontWeight: '600' },
  // Image gallery styles
  imgSection: { marginBottom: Spacing.sm },
  imgRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  imgWrap: { position: 'relative' },
  imgThumb: {
    width: 100, height: 75,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  imgRemove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22,
    borderRadius: 11, backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  imgRemoveText: { fontSize: 12, color: Colors.textOnDark, fontWeight: '700' },
  // Location picker styles
  locRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 0,
  },
  locInput: {
    flex: 1,
    marginBottom: 0,
  },
  locSearchBtn: {
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 52,
    height: 42,
  },
  locSearchText: {
    color: Colors.textOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  locSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundEnd,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locSelIcon: { fontSize: 16 },
  locSelInfo: { flex: 1 },
  locSelName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  locSelAddr: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  locClear: { fontSize: 14, color: Colors.textTertiary, padding: 4 },
  locDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  locItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  locItemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  locItemAddr: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});