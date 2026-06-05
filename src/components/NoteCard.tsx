import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { Note } from '../types/note';

type NoteCardProps = {
  note: Note;
  onPress: (note: Note) => void;
  onToggleFavorite?: (note: Note) => void;
};

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '未知';
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) {
    return '刚刚';
  }
  if (diffMin < 60) {
    return `${diffMin}分钟前更新`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}小时前更新`;
  }
  return date.toLocaleDateString('zh-CN');
}

export default function NoteCard({ note, onPress, onToggleFavorite }: NoteCardProps) {
  const previewLine =
    note.content.split('\n').find(line => line.trim().length > 0) ?? '';

  return (
    <Pressable style={styles.card} onPress={() => onPress(note)}>
      {/* Top row: title + favorite */}
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={event => {
            event.stopPropagation?.();
            onToggleFavorite?.(note);
          }}
          hitSlop={8}
        >
          <Text style={[styles.star, note.isFavorite && styles.starActive]}>
            {note.isFavorite ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>

      {/* Image thumbnail */}
      {note.images && note.images.length > 0 && (
        <Image
          source={{ uri: note.images[0] }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      {/* Description preview */}
      <Text style={styles.preview} numberOfLines={2}>
        {previewLine || '暂无内容'}
      </Text>

      {/* Bottom row: date + tags */}
      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
        {note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.slice(0, 2).map(tag => (
              <View key={`${note.id}-${tag}`} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
  star: {
    fontSize: 18,
    color: Colors.textTertiary,
  },
  starActive: {
    color: '#f59e0b',
  },
  preview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tagPill: {
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});