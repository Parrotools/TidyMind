import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import NoteEditorModal from '../components/NoteEditorModal';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Shadows, Spacing } from '../theme/designTokens';
import { RootStackParamList } from '../navigation/types';
import { Note } from '../types/note';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { notes, isLoading, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const { mode, isSearching, aiResults, aiSummary, error, searchWithAI, searchLocal, clear } = useSemanticSearch();
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const tagCounts = useMemo(() => {
    const m: Record<string,number> = {};
    notes.forEach(n => { if(n.tag) m[n.tag] = (m[n.tag]??0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [notes]);

  const local = useMemo(() => q.trim()?searchLocal(q,notes):[], [q,notes,searchLocal]);
  const list = useMemo(() => {
    let b = [...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    if(mode==='ai') b = aiResults.map(r=>r.note);
    else if(mode==='keyword') b = local;
    if(tag) b = b.filter(n=>n.tag===tag);
    return b.slice(0,20);
  }, [notes,mode,aiResults,local,tag]);

  const hSave = (p:{id?:string;title:string;content:string;tag:string}) => {
    if(!p.title){Alert.alert('缺少标题');return;}
    upsertNote(p); setEditor(false);
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
        {/* ── Header ── */}
        <View style={S.head}>
          <View>
            <Text style={S.greeting}>早上好</Text>
            <Text style={S.date}>知识库 · {notes.length} 篇笔记</Text>
          </View>
          <Pressable style={S.avatar} onPress={()=>nav.navigate('Settings')}>
            <Text style={S.avText}>TM</Text>
          </Pressable>
        </View>

        {/* ── AI Hero ── */}
        <Pressable style={S.hero} onPress={()=>nav.navigate('Assistant')}>
          <View style={S.heroGlow} />
          <Text style={S.heroEmoji}>✨</Text>
          <View style={S.heroContent}>
            <Text style={S.heroTitle}>AI 知识助手</Text>
            <Text style={S.heroDesc}>上传文件或输入主题，自动整理为结构化笔记</Text>
          </View>
          <View style={S.heroArrow}><Text style={S.heroArrowText}>→</Text></View>
        </Pressable>

        {/* ── Search ── */}
        <View style={S.searchRow}>
          <View style={S.searchBar}>
            <Text style={S.searchIcon}>⌕</Text>
            <TextInput style={S.searchInput} placeholder="搜索笔记..." placeholderTextColor={Colors.textTertiary}
              value={q} onChangeText={t=>{setQ(t);if(!t.trim())clear();}} onSubmitEditing={()=>q.trim()&&searchWithAI(q,notes)} returnKeyType="search" />
            {q.length>0&&<Pressable onPress={()=>{setQ('');clear();}} hitSlop={8}><Text style={S.clearIcon}>✕</Text></Pressable>}
          </View>
        </View>

        {/* AI search status */}
        {mode==='ai'&&(
          <View style={S.aiBar}>
            {isSearching?<ActivityIndicator size="small" color={Colors.onPrimaryContainer}/>:null}
            <Text style={S.aiBarText} numberOfLines={2}>{isSearching?'AI 正在分析...':error||aiSummary}</Text>
            <Pressable onPress={()=>{setQ('');clear();}}><Text style={S.aiBarBack}>返回</Text></Pressable>
          </View>
        )}

        {/* ── Tags ── */}
        {mode!=='ai'&&tagCounts.length>0&&(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tagRow}>
            <Pressable style={[S.chip,!tag&&S.chipOn]} onPress={()=>setTag(null)}><Text style={[S.chipT,!tag&&S.chipTOn]}>全部</Text></Pressable>
            {tagCounts.map(([t])=>(
              <Pressable key={t} style={[S.chip,tag===t&&S.chipOn]} onPress={()=>setTag(p=>p===t?null:t)}><Text style={[S.chipT,tag===t&&S.chipTOn]}>{t}</Text></Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── Section ── */}
        <View style={S.secHead}>
          <Text style={S.secTitle}>{tag?`「${tag}」`:mode==='ai'?'搜索结果':'最近笔记'}</Text>
          <Pressable onPress={()=>{setEditing(null);setEditor(true);}}><Text style={S.newBtn}>+ 新建</Text></Pressable>
        </View>

        {/* ── Notes Grid ── */}
        {isLoading?<ActivityIndicator size="small" color={Colors.primary} style={{marginTop:40}}/>:
         list.length===0?(
          <View style={S.empty}>
            <Text style={S.emptyIcon}>{q?'🔍':'📝'}</Text>
            <Text style={S.emptyTitle}>{q?'未找到笔记':'开始记录吧'}</Text>
          </View>
        ):(
          <FlatList data={list} keyExtractor={i=>i.id} numColumns={2} key="grid-2col"
            columnWrapperStyle={{gap:12}} scrollEnabled={false}
            renderItem={({item})=><NoteCard note={item} onPress={n=>nav.navigate('NoteDetail',{noteId:n.id})} onToggleFavorite={n=>toggleFavorite(n.id)}/>} />
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable style={S.fab} onPress={()=>nav.navigate('Assistant')}>
        <Text style={S.fabIcon}>✨</Text>
      </Pressable>

      <NoteEditorModal visible={editor} initialNote={editing} onCancel={()=>setEditor(false)} onSave={hSave} onDelete={id=>{deleteNote(id);setEditor(false);}}/>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex:1, backgroundColor:Colors.background },
  scroll: { paddingHorizontal:20, paddingBottom:100 },
  // Header
  head: { flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingTop:16,paddingBottom:20 },
  greeting: { fontSize:30,fontWeight:'500',color:Colors.textPrimary,letterSpacing:-0.5 },
  date: { fontSize:13,color:Colors.textSecondary,marginTop:4 },
  avatar: { width:44,height:44,borderRadius:22,backgroundColor:Colors.primaryContainer,alignItems:'center',justifyContent:'center' },
  avText: { color:Colors.onPrimaryContainer,fontWeight:'600',fontSize:15 },
  // Hero
  hero: {
    flexDirection:'row',alignItems:'center',
    backgroundColor:Colors.primaryContainer,
    borderRadius:24,padding:20,marginBottom:20,
    overflow:'hidden',position:'relative',
    ...Shadows.md,
  },
  heroGlow: { position:'absolute',top:-30,right:-20,width:120,height:120,borderRadius:60,backgroundColor:'rgba(103,80,164,0.15)' },
  heroEmoji: { fontSize:32,marginRight:14 },
  heroContent: { flex:1 },
  heroTitle: { fontSize:17,fontWeight:'500',color:Colors.onPrimaryContainer },
  heroDesc: { fontSize:13,color:Colors.onPrimaryContainer,opacity:0.7,lineHeight:18,marginTop:4 },
  heroArrow: { width:32,height:32,borderRadius:16,backgroundColor:'rgba(103,80,164,0.15)',alignItems:'center',justifyContent:'center' },
  heroArrowText: { fontSize:18,color:Colors.onPrimaryContainer },
  // Search
  searchRow: { marginBottom:16 },
  searchBar: { flexDirection:'row',alignItems:'center',backgroundColor:Colors.surfaceContainer,borderRadius:16,height:48,paddingHorizontal:16 },
  searchIcon: { fontSize:17,color:Colors.textTertiary,marginRight:10 },
  searchInput: { flex:1,fontSize:15,color:Colors.textPrimary },
  clearIcon: { fontSize:15,color:Colors.textTertiary,padding:4 },
  aiBar: { flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryContainer,borderRadius:14,padding:12,marginBottom:16,gap:8 },
  aiBarText: { flex:1,fontSize:13,color:Colors.onPrimaryContainer,lineHeight:18 },
  aiBarBack: { fontSize:13,fontWeight:'600',color:Colors.onPrimaryContainer },
  // Tags
  tagRow: { marginBottom:20 },
  chip: { paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:Colors.surfaceContainer,marginRight:8 },
  chipOn: { backgroundColor:Colors.primaryContainer },
  chipT: { fontSize:13,color:Colors.textSecondary },
  chipTOn: { color:Colors.onPrimaryContainer,fontWeight:'500' },
  // Section
  secHead: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14 },
  secTitle: { fontSize:15,fontWeight:'500',color:Colors.textSecondary },
  newBtn: { fontSize:15,color:Colors.primary,fontWeight:'500' },
  // Empty
  empty: { alignItems:'center',paddingVertical:60 },
  emptyIcon: { fontSize:40,marginBottom:12 },
  emptyTitle: { fontSize:16,color:Colors.textSecondary },
  // FAB
  fab: {
    position:'absolute',bottom:24,right:20,
    width:56,height:56,borderRadius:28,
    backgroundColor:Colors.primary,
    alignItems:'center',justifyContent:'center',
    ...Platform.select({ios:{shadowColor:'#6750A4',shadowOpacity:0.35,shadowRadius:12,shadowOffset:{width:0,height:4}},android:{elevation:8}}),
  },
  fabIcon: { fontSize:22 },
});
