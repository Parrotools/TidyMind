import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { Note } from '../types/note';

export default function FavoritesScreen() {
  const { notes, toggleFavorite } = useAppState();
  const favorites = notes.filter(note => note.isFavorite);

  const handleOpen = (_note: Note) => {
    // Favorites is read-only preview; editing happens in Files tab.
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>收藏</Text>

        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={handleOpen}
              onToggleFavorite={note => toggleFavorite(note.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>暂无收藏</Text>
              <Text style={styles.emptySubtitle}>
                点击笔记上的星标将其收藏到此
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});