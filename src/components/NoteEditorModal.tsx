import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { Note } from '../types/note';

type NoteEditorModalProps = {
  visible: boolean;
  initialNote: Note | null;
  onCancel: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    content: string;
    tags: string[];
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

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(initialNote?.title ?? '');
    setContent(initialNote?.content ?? '');
    setTagsInput(initialNote?.tags.join(', ') ?? '');
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

            <Text style={styles.label}>标签</Text>
            <TextInput
              style={styles.input}
              placeholder="以逗号分隔的标签"
              placeholderTextColor={Colors.textTertiary}
              value={tagsInput}
              onChangeText={setTagsInput}
            />

            <Text style={styles.label}>内容</Text>
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
});