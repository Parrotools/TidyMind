/**
 * ReviewScreen — 知识回顾中心
 *
 * 周统计 + AI 总结 + 主题色封面 + 沉浸式卡片浏览
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Shadows, Spacing } from '../theme/designTokens';
import { RootStackParamList } from '../navigation/types';
import { Note } from '../types/note';
import NoteEditorModal from '../components/NoteEditorModal';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';

const { width: W } = Dimensions.get('window');
const CARD_W = W * 0.88;
const CARD_PAD = (W - CARD_W) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Period = 'day' | 'week' | 'month';

// ── 工具 ─────────────────────────────────────────────────────────

const fmtD = (d: Date) => d.toISOString().slice(0, 10);
const fmtDisplay = (d: Date) => {
  const today = fmtD(new Date()); const t = fmtD(d);
  if (t === today) return '今天';
  const y = new Date(); y.setDate(y.getDate()-1);
  if (t === fmtD(y)) return '昨天';
  return `${d.getMonth()+1}月${d.getDate()}日`;
};
const weekRange = (d: Date) => {
  const c = new Date(d); const day = c.getDay();
  const diff = c.getDate()-day+(day===0?-6:1);
  const mon = new Date(c); mon.setDate(diff);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  return { start: fmtD(mon), end: fmtD(sun) };
};

const TAG_COLORS = ['#6750A4','#7D5260','#386A20','#006874','#BA1A1A','#4A4458','#6E5677','#984061'];

function tagColor(tag: string): string {
  let hash = 0; for (let i=0;i<tag.length;i++) hash = ((hash<<5)-hash)+tag.charCodeAt(i);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function wordCount(text: string): number { return text.replace(/\s/g,'').length; }
function readingTime(chars: number): string { const m = Math.ceil(chars/400); return m < 1 ? '<1分钟' : `${m}分钟`; }

// ── 组件 ─────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const nav = useNavigation<NavigationProp>();
  const { notes, upsertNote } = useAppState();
  const [period, setPeriod] = useState<Period>('week');
  const [selDate, setSelDate] = useState(new Date());
  const [calVis, setCalVis] = useState(false);
  const [activeI, setActiveI] = useState(0);
  const [editVis, setEditVis] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // ── 筛选 ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let start: string, end: string; const d = selDate;
    if (period==='day'){ start=fmtD(d); end=start; }
    else if(period==='week'){ const r=weekRange(d); start=r.start; end=r.end; }
    else { start=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; const last=new Date(d.getFullYear(),d.getMonth()+1,0); end=fmtD(last); }
    return [...notes].filter(n=>{ const c=n.createdAt.slice(0,10); return c>=start&&c<=end; }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }, [notes, period, selDate]);

  // ── 统计 ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length;
    const tags = new Set(filtered.map(n=>n.tag).filter(Boolean));
    const chars = filtered.reduce((s,n)=>s+wordCount(n.content),0);
    const streak = (() => { let s=0; const now=new Date(); for(let i=0;i<365;i++){ const d=new Date(now); d.setDate(d.getDate()-i); const day=fmtD(d); if(notes.some(n=>n.createdAt.slice(0,10)===day)) s++; else break; } return s; })();
    return { total, tags: tags.size, chars, streak };
  }, [filtered]);

  const pLabel = useMemo(() => {
    if(period==='day') return fmtDisplay(selDate);
    if(period==='week'){ const r=weekRange(selDate); return `${r.start.slice(5)} ~ ${r.end.slice(5)}`; }
    return `${selDate.getFullYear()}年${selDate.getMonth()+1}月`;
  }, [period, selDate]);

  // ── AI 周总结 ─────────────────────────────────────────────────
  useEffect(() => {
    if (period !== 'week' || filtered.length === 0) { setAiSummary(''); return; }
    setAiLoading(true);
    const timer = setTimeout(async () => {
      try {
        const titles = filtered.slice(0,10).map(n=>`- ${n.title} [${n.tag||'无标签'}]`).join('\n');
        const resp = await callLLM({
          model: DEFAULT_MODEL,
          messages: [
            { role: 'system', content: '你是知识回顾助手。用户本周创建了以下笔记，请用150字以内总结本周的学习主题、知识覆盖面和成长方向。用中文，温暖鼓励的语气。' },
            { role: 'user', content: `本周笔记（${filtered.length}篇）：\n${titles}` },
          ],
          stream: false, temperature: 0.7, maxTokens: 300,
        });
        setAiSummary(resp);
      } catch { setAiSummary(''); }
      setAiLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [filtered, period]);

  // ── 卡片渲染 ──────────────────────────────────────────────────
  const renderCard = ({ item, index }: { item: Note; index: number }) => {
    const color = tagColor(item.tag || 'default');
    const chars = wordCount(item.content);
    const inputRange = [(index-1)*CARD_W, index*CARD_W, (index+1)*CARD_W];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
    const translateY = scrollX.interpolate({ inputRange, outputRange: [16, 0, 16], extrapolate: 'clamp' });

    return (
      <Pressable key={item.id} onPress={() => nav.navigate('NoteDetail', { noteId: item.id })}>
        <Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
          {/* 主题色封面 */}
          <View style={[styles.cover, { backgroundColor: color }]}>
            <Text style={styles.coverTitle} numberOfLines={2}>{item.title}</Text>
            {item.tag ? <View style={styles.coverTag}><Text style={styles.coverTagText}>{item.tag}</Text></View> : null}
          </View>
          {/* 内容 */}
          <View style={styles.body}>
            <Text style={styles.preview} numberOfLines={3}>
              {item.content.replace(/[#*>`\-\[\]!()|]/g,' ').replace(/\s+/g,' ').trim().slice(0,150)||'暂无内容'}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}><Text style={styles.metaIcon}>📄</Text><Text style={styles.metaText}>{chars}字</Text></View>
              <View style={styles.metaItem}><Text style={styles.metaIcon}>⏱</Text><Text style={styles.metaText}>{readingTime(chars)}</Text></View>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false });
  const onMomentum = (e: any) => setActiveI(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
  const changeDate = (days: number) => { const d = new Date(selDate); d.setDate(d.getDate()+days); setSelDate(d); setActiveI(0); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hTitle}>知识回顾</Text>
            <Text style={styles.hSub}>{pLabel}</Text>
          </View>
          <Pressable style={styles.calBtn} onPress={()=>setCalVis(true)}><Text style={styles.calIcon}>📅</Text></Pressable>
        </View>

        {/* Period + Arrows */}
        <View style={styles.pBar}>
          {(['day','week','month'] as Period[]).map(p=>(
            <Pressable key={p} style={[styles.pChip,period===p&&styles.pChipOn]} onPress={()=>{setPeriod(p);setActiveI(0);}}>
              <Text style={[styles.pText,period===p&&styles.pTextOn]}>{p==='day'?'日':p==='week'?'周':'月'}</Text>
            </Pressable>
          ))}
          <View style={{flex:1}}/>
          <Pressable style={styles.arrBtn} onPress={()=>changeDate(period==='day'?-1:period==='week'?-7:-30)}><Text style={styles.arrText}>‹</Text></Pressable>
          <Pressable style={styles.arrBtn} onPress={()=>changeDate(period==='day'?1:period==='week'?7:30)}><Text style={styles.arrText}>›</Text></Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLbl}>笔记</Text></View>
          <View style={styles.statSep} />
          <View style={styles.stat}><Text style={styles.statVal}>{stats.tags}</Text><Text style={styles.statLbl}>主题</Text></View>
          <View style={styles.statSep} />
          <View style={styles.stat}><Text style={styles.statVal}>{stats.streak}天</Text><Text style={styles.statLbl}>连续</Text></View>
          <View style={styles.statSep} />
          <View style={styles.stat}><Text style={styles.statVal}>{(stats.chars/1000).toFixed(1)}k</Text><Text style={styles.statLbl}>字数</Text></View>
        </View>

        {/* Carousel */}
        {filtered.length > 0 ? (
          <View style={styles.carousel}>
            <FlatList
              ref={flatRef} data={filtered} keyExtractor={i=>i.id}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_W} decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: CARD_PAD }}
              onScroll={onScroll} onMomentumScrollEnd={onMomentum} scrollEventThrottle={16}
              renderItem={renderCard}
            />
            <View style={styles.dots}>{filtered.map((_,i)=><View key={i} style={[styles.dot,i===activeI&&styles.dotOn]}/>)}</View>
            <Text style={styles.count}>{activeI+1} / {filtered.length}</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>这一天还没有留下记录</Text>
            <Pressable style={styles.createBtn} onPress={()=>setEditVis(true)}><Text style={styles.createText}>+ 创建笔记</Text></Pressable>
          </View>
        )}

        {/* AI 本周总结 */}
        {period === 'week' && filtered.length > 0 && (
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>🤖 AI 本周总结</Text>
            {aiLoading ? (
              <View style={styles.aiLoading}><ActivityIndicator size="small" color={Colors.primary}/><Text style={styles.aiLoadingText}>正在分析本周学习轨迹...</Text></View>
            ) : aiSummary ? (
              <Text style={styles.aiText}>{aiSummary}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* 日历弹窗 */}
      <Modal visible={calVis} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={()=>setCalVis(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>快速跳转</Text>
            <View style={styles.quickRow}>
              {[0,-1,-2,-3,-7,-30].map(days=>{const d=new Date();d.setDate(d.getDate()+days);return(
                <Pressable key={days} style={styles.qDate} onPress={()=>{setSelDate(d);setCalVis(false);setActiveI(0);}}>
                  <Text style={styles.qDateText}>{days===0?'今天':days===-1?'昨天':days===-2?'前天':`${Math.abs(days)}天前`}</Text>
                </Pressable>
              )})}
            </View>
            <Pressable style={styles.modalClose} onPress={()=>setCalVis(false)}><Text style={styles.modalCloseText}>关闭</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <NoteEditorModal visible={editVis} initialNote={null} onCancel={()=>setEditVis(false)}
        onSave={p=>{upsertNote(p);setEditVis(false);}} onDelete={()=>{}} />
    </SafeAreaView>
  );
}

// ── 样式 ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },
  // Header
  header: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:Spacing.lg,paddingTop:Spacing.md,paddingBottom:Spacing.sm },
  hTitle: { fontSize:26,fontWeight:'500',color:Colors.textPrimary,letterSpacing:-0.5 },
  hSub: { fontSize:14,color:Colors.textSecondary,marginTop:2 },
  calBtn: { width:40,height:40,borderRadius:20,backgroundColor:Colors.surfaceContainer,alignItems:'center',justifyContent:'center' },
  calIcon: { fontSize:18 },
  // Period
  pBar: { flexDirection:'row',alignItems:'center',paddingHorizontal:Spacing.lg,marginBottom:Spacing.md,gap:Spacing.sm },
  pChip: { paddingHorizontal:16,paddingVertical:8,borderRadius:BorderRadius.full,backgroundColor:Colors.surfaceContainer },
  pChipOn: { backgroundColor:Colors.primaryContainer },
  pText: { fontSize:14,color:Colors.textSecondary },
  pTextOn: { color:Colors.onPrimaryContainer,fontWeight:'500' },
  arrBtn: { width:32,height:32,borderRadius:16,backgroundColor:Colors.surfaceContainer,alignItems:'center',justifyContent:'center' },
  arrText: { fontSize:18,color:Colors.textPrimary },
  // Stats
  statRow: { flexDirection:'row',justifyContent:'space-around',alignItems:'center',marginHorizontal:Spacing.lg,backgroundColor:Colors.surfaceContainer,borderRadius:BorderRadius.lg,padding:Spacing.lg,marginBottom:Spacing.lg },
  stat: { alignItems:'center',flex:1 },
  statVal: { fontSize:20,fontWeight:'500',color:Colors.textPrimary },
  statLbl: { fontSize:12,color:Colors.textSecondary,marginTop:2 },
  statSep: { width:1,height:28,backgroundColor:Colors.border },
  // Carousel
  carousel: { marginBottom:Spacing.lg },
  card: { width:CARD_W,backgroundColor:Colors.surface,borderRadius:24,overflow:'hidden',...Shadows.lg },
  cover: { padding:24,paddingBottom:20,minHeight:140,justifyContent:'flex-end',gap:8 },
  coverTitle: { fontSize:22,fontWeight:'500',color:'#FFFFFF',lineHeight:28 },
  coverTag: { alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.25)',borderRadius:BorderRadius.xs,paddingHorizontal:10,paddingVertical:3 },
  coverTagText: { fontSize:12,color:'#FFFFFF',fontWeight:'500' },
  body: { padding:20,gap:10 },
  preview: { fontSize:15,lineHeight:23,color:Colors.textSecondary },
  metaRow: { flexDirection:'row',alignItems:'center',gap:16,marginTop:4 },
  metaItem: { flexDirection:'row',alignItems:'center',gap:4 },
  metaIcon: { fontSize:13 },
  metaText: { fontSize:12,color:Colors.textTertiary },
  date: { fontSize:12,color:Colors.textTertiary,marginLeft:'auto' },
  dots: { flexDirection:'row',justifyContent:'center',gap:6,paddingTop:Spacing.md },
  dot: { width:6,height:6,borderRadius:3,backgroundColor:Colors.border },
  dotOn: { backgroundColor:Colors.primary,width:16 },
  count: { textAlign:'center',fontSize:13,color:Colors.textTertiary,marginTop:Spacing.sm },
  // AI card
  aiCard: { marginHorizontal:Spacing.lg,backgroundColor:Colors.primaryContainer,borderRadius:BorderRadius.lg,padding:Spacing.lg,marginBottom:Spacing.xl },
  aiLabel: { fontSize:14,fontWeight:'600',color:Colors.onPrimaryContainer,marginBottom:Spacing.sm },
  aiText: { fontSize:15,lineHeight:24,color:Colors.onPrimaryContainer },
  aiLoading: { flexDirection:'row',alignItems:'center',gap:Spacing.sm },
  aiLoadingText: { fontSize:14,color:Colors.onPrimaryContainer,opacity:0.7 },
  // Empty
  empty: { alignItems:'center',paddingVertical:60 },
  emptyEmoji: { fontSize:48,marginBottom:Spacing.md },
  emptyTitle: { fontSize:16,color:Colors.textSecondary,marginBottom:Spacing.lg },
  createBtn: { backgroundColor:Colors.primary,borderRadius:BorderRadius.full,paddingHorizontal:24,paddingVertical:12 },
  createText: { color:Colors.onPrimary,fontWeight:'500',fontSize:15 },
  // Modal
  modalBg: { flex:1,backgroundColor:'rgba(0,0,0,0.3)',justifyContent:'flex-end' },
  modalSheet: { backgroundColor:Colors.surfaceContainer,borderTopLeftRadius:32,borderTopRightRadius:32,padding:Spacing.xl,paddingBottom:40 },
  modalTitle: { fontSize:18,fontWeight:'500',color:Colors.textPrimary,marginBottom:Spacing.lg },
  quickRow: { flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm },
  qDate: { backgroundColor:Colors.background,borderRadius:BorderRadius.full,paddingHorizontal:16,paddingVertical:10 },
  qDateText: { fontSize:14,color:Colors.textPrimary },
  modalClose: { alignSelf:'center',marginTop:Spacing.xl },
  modalCloseText: { fontSize:15,color:Colors.primary,fontWeight:'500' },
});
