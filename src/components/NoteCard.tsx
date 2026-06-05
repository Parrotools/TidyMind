import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows } from '../theme/designTokens';
import { Note } from '../types/note';

type Props = {
  note: Note;
  onPress: (note: Note) => void;
  onToggleFavorite?: (note: Note) => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

/** 提取纯文本摘要（去 markdown 标记） */
function contentPreview(content: string): string {
  const clean = content
    .replace(/[#*>`\-\[\]!()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, 80) || '暂无内容';
}

export default function NoteCard({ note, onPress, onToggleFavorite }: Props) {
  const hasImage = note.images && note.images.length > 0;

  return (
    <Pressable style={styles.card} onPress={() => onPress(note)}>
      {/* Image (only if present) */}
      {hasImage && (
        <Image source={{ uri: note.images![0] }} style={styles.image} resizeMode="cover" />
      )}

      {/* Body */}
      <View style={[styles.body, !hasImage && styles.bodyFull]}>
        {!hasImage && (
          <Text style={styles.preview} numberOfLines={3}>{contentPreview(note.content)}</Text>
        )}
        <Text style={styles.title} numberOfLines={2}>{note.title}</Text>

        <View style={styles.footer}>
          {note.tag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>{note.tag}</Text>
            </View>
          ) : <View />}
          <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.xl,
    marginBottom: 12,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 1.2,
  },
  body: {
    padding: 14,
    gap: 8,
    minHeight: 100,
  },
  bodyFull: {
    minHeight: 140,
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: '55%',
  },
  tagText: {
    fontSize: 11,
    color: Colors.onPrimaryContainer,
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
