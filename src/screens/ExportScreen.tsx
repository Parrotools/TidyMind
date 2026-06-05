import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { exportNoteToPdf } from '../services/exportPdf';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ExportScreen() {
  const nav = useNavigation<Nav>();
  const { notes } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(() => [...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)), [notes]);
  const selected = useMemo(() => sorted.filter(n=>selectedIds.includes(n.id)), [sorted, selectedIds]);
  const toggle = (id:string) => setSelectedIds(p=>p.includes(id)?p.filter(i=>i!==id):[...p,id]);

  const handleExport = async () => {
    if (!selected.length) { Alert.alert('未选择笔记','请至少选择一篇笔记'); return; }
    setExporting(true);
    try {
      for (const note of selected) {
        const url = await exportNoteToPdf(note);
        if (url) await Linking.openURL(url);
      }
      Alert.alert('导出完成', `已导出 ${selected.length} 篇笔记`);
    } catch (err: unknown) {
      Alert.alert('导出失败', (err as Error).message || '请确认后端服务已启动');
    }
    setExporting(false);
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.cont}>
        <View style={S.head}>
          <Pressable style={S.back} onPress={()=>nav.goBack()}><Text style={S.backT}>‹</Text></Pressable>
          <Text style={S.title}>导出 PDF</Text>
          <View style={S.back} />
        </View>
        <Text style={S.sub}>勾选笔记后点击导出，PDF 将在浏览器中打开</Text>

        <ScrollView style={S.list} showsVerticalScrollIndicator={false}>
          {sorted.map(note=>{
            const sel = selectedIds.includes(note.id);
            return (
              <Pressable key={note.id} style={[S.row,sel&&S.rowSel]} onPress={()=>toggle(note.id)}>
                <View style={S.info}>
                  <Text style={S.nTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={S.nMeta}>{note.tag||'无标签'} · {new Date(note.updatedAt).toLocaleDateString('zh-CN')}</Text>
                </View>
                <View style={[S.cb,sel&&S.cbSel]}>{sel&&<Text style={S.cbT}>✓</Text>}</View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={[S.btn,(exporting||!selected.length)&&S.btnOff]} onPress={handleExport} disabled={exporting||!selected.length}>
          {exporting ? <ActivityIndicator size="small" color={Colors.onPrimary} /> :
            <Text style={S.btnT}>导出 PDF ({selected.length})</Text>}
        </Pressable>
        <Text style={S.note}>需要先在电脑上启动后端服务：{'\n'}cd server && pip install -r requirements.txt && python main.py</Text>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex:1, backgroundColor:Colors.background },
  cont: { flex:1, paddingHorizontal:Spacing.lg },
  head: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:Spacing.md,marginBottom:Spacing.sm },
  back: { width:32,height:32,borderRadius:16,backgroundColor:Colors.surfaceContainer,alignItems:'center',justifyContent:'center' },
  backT: { fontSize:22,color:Colors.textPrimary },
  title: { fontSize:20,fontWeight:'500',color:Colors.textPrimary },
  sub: { fontSize:13,color:Colors.textSecondary,marginBottom:Spacing.lg },
  list: { flex:1 },
  row: { flexDirection:'row',alignItems:'center',backgroundColor:Colors.surfaceContainer,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm },
  rowSel: { borderWidth:2,borderColor:Colors.primary },
  info: { flex:1,marginRight:Spacing.md },
  nTitle: { fontSize:15,fontWeight:'500',color:Colors.textPrimary },
  nMeta: { fontSize:12,color:Colors.textSecondary,marginTop:2 },
  cb: { width:24,height:24,borderRadius:8,borderWidth:2,borderColor:Colors.border,alignItems:'center',justifyContent:'center' },
  cbSel: { borderColor:Colors.primary,backgroundColor:Colors.primary },
  cbT: { fontSize:14,color:Colors.onPrimary,fontWeight:'700' },
  btn: { backgroundColor:Colors.primary,borderRadius:BorderRadius.full,paddingVertical:14,alignItems:'center',marginTop:Spacing.md,marginBottom:Spacing.xs },
  btnOff: { opacity:0.5 },
  btnT: { color:Colors.onPrimary,fontWeight:'500',fontSize:16 },
  note: { fontSize:11,color:Colors.textTertiary,textAlign:'center',marginBottom:Spacing.xl,lineHeight:16 },
});
