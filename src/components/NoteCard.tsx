import React, { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows } from '../theme/designTokens';
import { Note } from '../types/note';

type Props = { note: Note; onPress: (note: Note) => void; onLongPress?: (note: Note) => void; onToggleFavorite?: (note: Note) => void; };

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

export default function NoteCard({ note, onPress, onLongPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const hasImage = note.images && note.images.length > 0;
  const preview = note.content.replace(/[#*>`\-\[\]!()|]/g,' ').replace(/\s+/g,' ').trim();

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  return (
    <Pressable
      style={S.wrap}
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress?.(note)}
      delayLongPress={500}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[S.card, { transform: [{ scale }] }]}>
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
      </Animated.View>
    </Pressable>
  );
}

const S = StyleSheet.create({
  wrap: { width: '48%', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  img: { width: '100%', aspectRatio: 1.2 },
  body: { padding: 14, minHeight: 130, justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary, lineHeight: 22, marginBottom: 6 },
  preview: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, marginBottom: 6 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { backgroundColor: Colors.primaryContainer, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagT: { fontSize: 11, color: Colors.onPrimaryContainer, fontWeight: '500' },
  time: { fontSize: 11, color: Colors.textTertiary },
});
