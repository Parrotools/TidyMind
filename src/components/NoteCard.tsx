import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../theme/designTokens';
import { Note } from '../types/note';

type Props = { note: Note; onPress: (note: Note) => void; onToggleFavorite?: (note: Note) => void; };

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${m}/${day}`;
}

export default function NoteCard({ note, onPress }: Props) {
  const hasImage = note.images && note.images.length > 0;
  const preview = note.content.replace(/[#*>`\-\[\]!()|]/g,' ').replace(/\s+/g,' ').trim();

  return (
    <Pressable style={S.card} onPress={() => onPress(note)}>
      {hasImage && <Image source={{ uri: note.images![0] }} style={S.img} resizeMode="cover" />}
      <View style={S.body}>
        <Text style={S.title} numberOfLines={3}>{note.title}</Text>
        {!hasImage && preview ? (
          <Text style={S.preview} numberOfLines={2}>{preview}</Text>
        ) : null}
        <View style={S.foot}>
          {note.tag ? <View style={S.tag}><Text style={S.tagT} numberOfLines={1}>{note.tag}</Text></View> : <View />}
          <Text style={S.time}>{fmtTime(note.updatedAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const CARD_GAP = 12;
const S = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    marginBottom: CARD_GAP,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  img: { width: '100%', aspectRatio: 1.2 },
  body: { padding: 14 },
  title: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary, lineHeight: 22, marginBottom: 8 },
  preview: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, marginBottom: 10 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { backgroundColor: Colors.primaryContainer, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagT: { fontSize: 11, color: Colors.onPrimaryContainer, fontWeight: '500' },
  time: { fontSize: 11, color: Colors.textTertiary },
});
