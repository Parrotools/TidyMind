import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../state/AppState';
import { useChat } from '../hooks/useChat';
import { pickFromGallery, capturePhoto } from '../services/camera';
import { AIMode, AI_MODES, TAG_SUGGESTION_PROMPT, NOTE_GENERATION_PROMPT, FILE_TO_NOTE_PROMPT } from '../services/prompts';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';
import { buildNoteIndex, ragSearch } from '../services/search';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { ChatMessage } from '../types/chat';
import { NoteBlock, contentToBlocks } from '../types/note';
import { RootStackParamList } from '../navigation/types';
import { pickFile, PickedFile } from '../services/filePicker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function extractTitle(content: string): string {
  const firstLine = content.split('\n').find(l => l.trim().length > 0) ?? '';
  return firstLine.replace(/^[#*>\-\s]+/, '').trim().slice(0, 30) || 'AI 笔记';
}

const QUICK_PROMPTS: Record<string, string[]> = {
  chat: ['总结最近的笔记', '创建学习计划', '提取关键行动'],
  rag: ['本周学了什么', '关于Python的笔记有哪些'],
  translate: ['翻译为英文', '翻译为日文', '翻译为韩文'],
  writing: ['润色这段话', '帮我写一篇作文', '修改语法错误'],
  image: ['照片', '相册'],
  generate: ['夕阳下的海滩', '赛博朋克城市', '国风山水画'],
  note: ['Python 入门笔记', '时间管理方法', '健身饮食计划'],
};

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { chatMessages, addChatMessage, updateChatMessage, clearChat, notes, upsertNote } = useAppState();
  const { isStreaming, sendMessage, sendImageMessage, generateImage, cancel } = useChat();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AIMode>('chat');
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [noteData, setNoteData] = useState<{ title: string; summary: string; keyPoints: string[]; tag: string; blocks: NoteBlock[] } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const currentMode = AI_MODES.find(m => m.key === mode) ?? AI_MODES[0];

  useEffect(() => { if (mode === 'rag' && notes.length > 0) { buildNoteIndex(notes).catch(() => {}); } }, [mode, notes.length]);

  // ── 发送 ──────────────────────────────────────────────────────
  const scrollToBottom = () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput('');

    // 文件 + 指令
    if (pendingFiles.length > 0) {
      const files = [...pendingFiles]; setPendingFiles([]);
      const fileNames = files.map(f => f.name).join('、');
      addChatMessage('user', `📎 ${fileNames}\n\n${trimmed}`, files[0].base64);
      const aiMsg = addChatMessage('assistant', `正在分析 ${files.length} 个文件...`);
      setNoteData(null);
      try {
        const userContent: any[] = [{ type: 'text', text: trimmed }];
        for (const f of files) {
          if (f.text) userContent.push({ type: 'text', text: `--- ${f.name} ---\n${f.text.slice(0, 4000)}` });
          else userContent.push({ type: 'image_url', image_url: { url: f.base64 } });
        }
        const response = await callLLM({ model: DEFAULT_MODEL, messages: [{ role: 'system', content: FILE_TO_NOTE_PROMPT }, { role: 'user', content: userContent as any }], stream: false, temperature: 0.5, maxTokens: 8192 });
        let j = response.trim(); j = j.replace(/^```(?:json)?\s*\n?/im, '').replace(/\n?```\s*$/im, '');
        const fb = j.indexOf('{'); if (fb >= 0) { let d = 0, lb = fb; for (let ci = fb; ci < j.length; ci++) { if (j[ci] === '{') d++; if (j[ci] === '}') d--; if (d === 0) { lb = ci; break; } } j = j.slice(fb, lb + 1); }
        j = j.replace(/,(\s*[}\]])/g, '$1');
        const p = JSON.parse(j);
        const s = { title: p.title ?? '知识整理', summary: p.summary ?? '', keyPoints: p.key_points ?? [], tag: p.tag ?? (p.tags?.[0]) ?? '知识整理', blocks: (p.blocks ?? []) as NoteBlock[] };
        setNoteData(s);
        updateChatMessage(aiMsg.id, `📋 **${s.title}**\n\n${s.summary}\n\n🔑 ${s.keyPoints.map((kp: string, i: number) => `${i + 1}. ${kp}`).join(' | ')}\n\n✅ 共 ${s.blocks.length} 个内容块。点击下方保存。`);
      } catch (e: unknown) { updateChatMessage(aiMsg.id, `[错误] ${(e as Error).message}`); }
      scrollToBottom(); return;
    }

    if (mode === 'generate') { const am = addChatMessage('assistant', '正在生成...'); await generateImage(trimmed, (t) => updateChatMessage(am.id, t)); scrollToBottom(); return; }
    if (mode === 'rag' && notes.length > 0) { addChatMessage('user', `📚 ${trimmed}`); const am = addChatMessage('assistant', '正在检索...');
      try { const r = await ragSearch(trimmed, notes); updateChatMessage(am.id, `${r.answer}\n\n---\n📖 ${r.sources.map(s => `《${s.title}》`).join(' | ')}`); } catch (e: unknown) { updateChatMessage(am.id, `[错误] ${(e as Error).message}`); }
      scrollToBottom(); return;
    }
    if (mode === 'note') {
      addChatMessage('user', `📝 ${trimmed}`); const am = addChatMessage('assistant', '正在生成...'); setNoteData(null);
      try {
        const r = await callLLM({ model: DEFAULT_MODEL, messages: [{ role: 'system', content: NOTE_GENERATION_PROMPT }, { role: 'user', content: trimmed }], stream: false, temperature: 0.7, maxTokens: 8192 });
        let j = r.trim(); j = j.replace(/^```(?:json)?\s*\n?/im, '').replace(/\n?```\s*$/im, '');
        const fb = j.indexOf('{'); if (fb >= 0) { let d = 0, lb = fb; for (let ci = fb; ci < j.length; ci++) { if (j[ci] === '{') d++; if (j[ci] === '}') d--; if (d === 0) { lb = ci; break; } } j = j.slice(fb, lb + 1); }
        j = j.replace(/,(\s*[}\]])/g, '$1');
        const p = JSON.parse(j);
        const s = { title: p.title ?? trimmed, summary: p.summary ?? '', keyPoints: p.key_points ?? [], tag: p.tag ?? (p.tags?.[0]) ?? trimmed, blocks: (p.blocks ?? []) as NoteBlock[] };
        setNoteData(s);
        updateChatMessage(am.id, `📋 **${s.title}**\n\n${s.summary}\n\n🔑 ${s.keyPoints.map((kp: string, i: number) => `${i + 1}. ${kp}`).join(' | ')}\n\n✅ 共 ${s.blocks.length} 个内容块。点击下方保存。`);
      } catch (e: unknown) { updateChatMessage(am.id, `[错误] ${(e as Error).message}`); }
      scrollToBottom(); return;
    }

    addChatMessage('user', trimmed);
    const am = addChatMessage('assistant', '思考中...');
    const history: ChatMessage[] = [...chatMessages, { id: 'u', role: 'user' as const, content: trimmed, createdAt: '' }];
    await sendMessage(trimmed, history, (t, done) => updateChatMessage(am.id, t), mode);
    scrollToBottom();
  }, [mode, pendingFiles, isStreaming, chatMessages, notes, addChatMessage, updateChatMessage, sendMessage]);

  // ── 保存 ──────────────────────────────────────────────────────
  const handleSaveAsNote = async (msg: ChatMessage) => {
    if (noteData) {
      const blocks = (noteData.blocks && noteData.blocks.length > 0)
        ? noteData.blocks
        : contentToBlocks(msg.content || '');
      upsertNote({
        title: noteData.title, content: msg.content,
        tag: noteData.tag || '笔记',
        blocks, summary: noteData.summary, keyPoints: noteData.keyPoints,
      });
      Alert.alert('已保存', `笔记「${noteData.title}」已创建`);
      return;
    }
    const title = extractTitle(msg.content); let tag = '笔记';
    try { const r = await callLLM({ model: DEFAULT_MODEL, messages: [{ role: 'system', content: TAG_SUGGESTION_PROMPT }, { role: 'user', content: `标题: ${title}\n内容: ${msg.content.slice(0, 500)}` }], stream: false, temperature: 0.3, maxTokens: 100 }); const p = JSON.parse(r); tag = (p.tags ?? [])[0] ?? p.tag ?? '笔记'; } catch {}
    upsertNote({ title, content: msg.content, tag }); Alert.alert('已保存', `笔记「${title}」已创建`);
  };

  // ── 文件 ──────────────────────────────────────────────────────
  const handleAddFiles = async () => { const f = await pickFile(); if (f) { const all: PickedFile[] = (f as any).__multi ?? [f]; setPendingFiles(p => [...p, ...all]); } };
  const removeFile = (i: number) => setPendingFiles(p => p.filter((_, idx) => idx !== i));
  const handlePickImage = () => {
    const onSel = (i: number) => {
      if (i === 1) capturePhoto().then(b => { if (b) setPendingFiles(p => [...p, { name: 'camera.jpg', mimeType: 'image/jpeg', base64: b, size: 0 }]); });
      else if (i === 2) pickFromGallery().then(b => { if (b) setPendingFiles(p => [...p, { name: 'gallery.jpg', mimeType: 'image/jpeg', base64: b, size: 0 }]); });
    };
    if (Platform.OS === 'ios') { const { ActionSheetIOS } = require('react-native'); ActionSheetIOS.showActionSheetWithOptions({ options: ['取消', '拍照', '从相册选择'], cancelButtonIndex: 0 }, onSel); }
    else Alert.alert('选择图片', '', [{ text: '取消', style: 'cancel' }, { text: '拍照', onPress: () => onSel(1) }, { text: '从相册选择', onPress: () => onSel(2) }]);
  };
  const handleModeSwitch = (m: AIMode) => { setMode(m); setPendingFiles([]); setNoteData(null); if (m === 'image') handlePickImage(); if (m === 'generate') setInput('请帮我生成一张图片：'); };

  // ── 消息渲染 ──────────────────────────────────────────────────
  const renderMsg = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isErr = item.content.startsWith('[错误]');
    return (
      <View style={[msgStyles.bubble, isUser ? msgStyles.user : msgStyles.ai]}>
        {!!item.imageBase64 && <Image source={{ uri: item.imageBase64 }} style={msgStyles.img} resizeMode="cover" />}
        <Text style={msgStyles.text}>{item.content}</Text>
        {!isUser && item.content.trim().length > 0 && !isErr && (
          <Pressable style={msgStyles.saveBtn} onPress={() => handleSaveAsNote(item)}>
            <Text style={msgStyles.saveText}>💾 保存为笔记</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.headerTitle}>AI 助手</Text>
        <Pressable style={styles.clearBtn} onPress={() => { clearChat(); setPendingFiles([]); setNoteData(null); }}><Text style={styles.clearText}>清空</Text></Pressable>
      </View>

      {/* Mode chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeBar} contentContainerStyle={styles.modeInner}>
        {AI_MODES.map(m => (
          <Pressable key={m.key} style={[styles.modeChip, mode === m.key && styles.modeChipOn]} onPress={() => handleModeSwitch(m.key)}>
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.body}>
        {/* Empty state: welcome + prompts */}
        {chatMessages.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeIcon}>{currentMode.icon}</Text>
            <Text style={styles.welcomeTitle}>{currentMode.label}模式</Text>
            <Text style={styles.welcomeDesc}>
              {mode === 'note' ? '输入主题，AI 生成结构化笔记' : mode === 'translate' ? '中英日韩互译' : mode === 'generate' ? '描述画面，AI 生成图片' : '输入问题或上传文件，AI 助你整理知识'}
            </Text>
            <View style={styles.promptRow}>
              {(QUICK_PROMPTS[mode] ?? QUICK_PROMPTS.chat).slice(0, 3).map(p => (
                <Pressable key={p} style={styles.promptChip} onPress={() => handleSend(p)}>
                  <Text style={styles.promptText}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef} data={chatMessages} keyExtractor={i => i.id} renderItem={renderMsg}
          contentContainerStyle={styles.msgList} showsVerticalScrollIndicator={false}
          ListEmptyComponent={chatMessages.length === 0 ? null : <View style={{ height: 20 }} />}
        />
      </View>

      {/* File chips */}
      {pendingFiles.length > 0 && (
        <View style={styles.fileBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pendingFiles.map((f, i) => (
              <View key={i} style={styles.fileChip}>
                <Text style={styles.fileChipIcon}>{f.mimeType.startsWith('image/') ? '🖼' : '📄'}</Text>
                <Text style={styles.fileChipName} numberOfLines={1}>{f.name}</Text>
                <Pressable onPress={() => removeFile(i)} hitSlop={8}><Text style={styles.fileChipRemove}>✕</Text></Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputWrap}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={pendingFiles.length > 0 ? '输入处理要求...' : '输入消息...'}
            placeholderTextColor={Colors.textTertiary}
            value={input} onChangeText={setInput} multiline editable={!isStreaming}
            onSubmitEditing={() => { if (input.trim() || pendingFiles.length > 0) handleSend(input); }}
          />
          <View style={styles.inputActions}>
            <Pressable style={styles.attachBtn} onPress={handleAddFiles}><Text style={styles.attachIcon}>📎</Text></Pressable>
            {isStreaming ? (
              <Pressable style={styles.stopBtn} onPress={cancel}><Text style={styles.stopText}>■</Text></Pressable>
            ) : (
              <Pressable style={[styles.sendBtn, (!input.trim() && pendingFiles.length === 0) && styles.sendBtnOff]} onPress={() => handleSend(input)} disabled={!input.trim() && pendingFiles.length === 0}>
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            )}
          </View>
        </View>
        {isStreaming && (
          <View style={styles.streamBar}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.streamText}>AI 正在处理...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  clearBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainer },
  clearText: { fontSize: 13, color: Colors.textSecondary },
  modeBar: { maxHeight: 44, marginBottom: Spacing.sm },
  modeInner: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainer },
  modeChipOn: { backgroundColor: Colors.primaryContainer },
  modeIcon: { fontSize: 14 },
  modeLabel: { fontSize: 13, color: Colors.textSecondary },
  modeLabelOn: { color: Colors.onPrimaryContainer, fontWeight: '500' },
  body: { flex: 1, paddingHorizontal: Spacing.lg },
  // Welcome
  welcome: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  welcomeIcon: { fontSize: 48, marginBottom: Spacing.lg },
  welcomeTitle: { fontSize: 22, fontWeight: '500', color: Colors.textPrimary, marginBottom: Spacing.sm },
  welcomeDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  promptChip: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainer },
  promptText: { fontSize: 14, color: Colors.textPrimary },
  // Messages
  msgList: { paddingBottom: Spacing.lg, gap: Spacing.sm },
  // Files
  fileBar: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.surfaceContainer, borderRadius: BorderRadius.md, padding: Spacing.sm },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 5, marginRight: Spacing.sm },
  fileChipIcon: { fontSize: 13 }, fileChipName: { fontSize: 12, color: Colors.textPrimary, maxWidth: 100 },
  fileChipRemove: { fontSize: 13, color: Colors.textTertiary, paddingHorizontal: 3, fontWeight: '700' },
  // Input
  inputWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surfaceContainer, borderRadius: BorderRadius.xl, padding: Spacing.md, minHeight: 56 },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary, maxHeight: 120, paddingTop: 0 },
  inputActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.sm },
  attachBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 16 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: Colors.inactive },
  sendText: { color: Colors.onPrimary, fontSize: 18, fontWeight: '600' },
  stopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  stopText: { color: Colors.onPrimary, fontSize: 14 },
  streamBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, paddingLeft: Spacing.sm },
  streamText: { fontSize: 12, color: Colors.textSecondary },
});

const msgStyles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  user: { alignSelf: 'flex-end', backgroundColor: Colors.primaryContainer },
  ai: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceContainer },
  img: { width: '100%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  text: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  saveBtn: { alignSelf: 'flex-end', marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  saveText: { fontSize: 11, fontWeight: '500', color: Colors.onPrimary },
});
