# TidyMind 大模型接入指南

> 版本 2.0 | 2026-06-02 | 基于 Vivo AIGC 竞赛平台 API

---

## 目录

1. [架构概览](#1-架构概览)
2. [接入准备 — Vivo AIGC 平台](#2-接入准备--vivo-aigc-平台)
3. [服务层设计](#3-服务层设计)
4. [分场景接入方案](#4-分场景接入方案)
5. [流式响应与用户体验](#5-流式响应与用户体验)
6. [Prompt 工程](#6-prompt-工程)
7. [Function Calling 进阶](#7-function-calling-进阶)
8. [可利用的全量 AI 能力](#8-可利用的全量-ai-能力)
9. [安全与错误处理](#9-安全与错误处理)
10. [测试与评估](#10-测试与评估)
11. [部署清单](#11-部署清单)

---

## 1. 架构概览

### 1.1 当前架构

```
┌─────────────────────────────────────────────┐
│  React Native App (TidyMind)                │
│                                              │
│  App.tsx ── Navigation                      │
│    ├── HomeScreen      (首页)               │
│    ├── FilesScreen     (文件)               │
│    ├── AssistantScreen (AI助手) ◄── 接入点  │
│    ├── FavoritesScreen (收藏)               │
│    └── ProfileScreen   (我的)               │
│         ├── ImportScreen  ◄── 接入点        │
│         ├── ExportScreen                     │
│         └── SettingsScreen                   │
│                                              │
│  src/state/AppState.tsx    (全局状态)       │
│  src/storage/*             (本地持久化)      │
│  src/types/chat.ts         (消息类型)       │
└─────────────────────────────────────────────┘
```

### 1.2 目标架构

```
┌──────────────┐     HTTPS/SSE      ┌──────────────────────────┐
│  TidyMind    │ ◄───────────────► │  Vivo AIGC Platform       │
│  (React      │                    │  api-ai.vivo.com.cn       │
│   Native)    │                    │  /v1/chat/completions     │
└──────────────┘                    └──────────────────────────┘
       │                                        │
       │  AsyncStorage               OpenAI 兼容协议
       ▼                              Bearer AppKey 鉴权
┌──────────────┐
│  本地缓存     │
│  笔记+对话    │
└──────────────┘
```

### 1.3 新增文件

| 文件 | 职责 |
|------|------|
| `src/services/llm.ts` | LLM API 调用封装（OpenAI 兼容协议） |
| `src/services/llm.config.ts` | AppKey、模型选择、参数配置 |
| `src/services/prompts.ts` | 各场景的 System Prompt 模板 |
| `src/hooks/useChat.ts` | 聊天状态管理 Hook（支持流式） |

---

## 2. 接入准备 — Vivo AIGC 平台

### 2.1 平台信息

本次竞赛使用 **Vivo AIGC 平台** 提供的大模型能力。

| 项目 | 值 |
|------|-----|
| 官网 | https://aigc.vivo.com.cn/#/platform |
| API 地址 | `https://api-ai.vivo.com.cn/v1/chat/completions` |
| 协议格式 | **OpenAI 兼容**（可直接使用 OpenAI SDK） |
| 鉴权方式 | `Authorization: Bearer {AppKey}` |

### 2.2 可用模型

| 模型 | 特点 | 适用场景 |
|------|------|---------|
| **Volc-DeepSeek-V3.2** | 深度思考、代码生成、逻辑推理 | 复杂分析、笔记结构化 |
| **Doubao-Seed-2.0-pro** | 旗舰模型，综合能力强 | 需要最高质量的对话 |
| **Doubao-Seed-2.0-lite** | 轻量快速 | 标签推荐、快速分类 |
| **Doubao-Seed-2.0-mini** | 最快响应 | 简单问答、流式对话 |
| **qwen3.5-plus** | 通义千问，中文优秀 | 中文内容创作 |

**推荐方案**：
- AI 助手对话使用 `Doubao-Seed-2.0-mini`（响应快，适合流式聊天）
- 笔记导入解析使用 `Volc-DeepSeek-V3.2`（推理能力强，适合结构化提取）

### 2.3 获取 AppKey

1. 打开 https://aigc.vivo.com.cn/#/platform
2. 创建应用 → 获取 AppKey
3. 将 AppKey 填入配置文件

### 2.4 安装依赖

**所有依赖已写入 `package.json`，只需一条命令：**

```bash
cd TidyMind
npm install
```

这会自动安装所有运行时依赖，包括：

| 依赖 | 用途 |
|------|------|
| `openai` | OpenAI SDK，与 Vivo AIGC API 完全兼容 |
| `@react-navigation/*` | 页面导航（底部 Tab + Stack） |
| `react-native-safe-area-context` | 安全区域适配（刘海屏、底部导航栏） |
| `react-native-gesture-handler` | 手势支持 |
| `react-native-screens` | 原生屏幕优化 |
| `@react-native-async-storage/async-storage` | 本地数据持久化 |

> **不需要手动安装任何额外依赖。** `package.json` 已包含全部所需包。

### 2.5 配置 AppKey

创建 `.env` 文件（**不提交到 Git**）：

```env
# .env
VIVO_APP_KEY=your_app_key_here
VIVO_BASE_URL=https://api-ai.vivo.com.cn/v1
VIVO_MODEL=Doubao-Seed-2.0-mini
VIVO_MODEL_PREMIUM=Volc-DeepSeek-V3.2
```

已在 `.gitignore` 中加入 `.env`。

---

## 3. 服务层设计

### 3.1 核心：OpenAI 兼容协议

Vivo AIGC 平台完全兼容 OpenAI 的 API 协议，可直接使用 `openai` npm 包：

```typescript
// src/services/llm.config.ts

import OpenAI from 'openai';

/** 从环境变量读取配置 */
export function getLLMClient(model?: string): OpenAI {
  return new OpenAI({
    apiKey: process.env.VIVO_APP_KEY ?? '',
    baseURL: process.env.VIVO_BASE_URL ?? 'https://api-ai.vivo.com.cn/v1',
    defaultHeaders: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    // ⚠️ Vivo 要求每个请求携带唯一的 requestId
    defaultQuery: {
      request_id: generateUUID(),
    },
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 默认模型 */
export const DEFAULT_MODEL = process.env.VIVO_MODEL ?? 'Doubao-Seed-2.0-mini';

/** 高级模型（用于复杂任务） */
export const PREMIUM_MODEL = process.env.VIVO_MODEL_PREMIUM ?? 'Volc-DeepSeek-V3.2';
```

### 3.2 统一调用封装

```typescript
// src/services/llm.ts

import OpenAI from 'openai';
import { getLLMClient, DEFAULT_MODEL } from './llm.config';

export type LLMCallOptions = {
  model?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  stream?: boolean;
  onToken?: (token: string, reasoning?: string) => void;
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  /** 开启深度思考模式（仅 Volc-DeepSeek-V3.2 等支持） */
  enableThinking?: boolean;
};

/**
 * 统一 LLM 调用入口
 *
 * 基于 Vivo AIGC 平台的 OpenAI 兼容协议。
 * 支持流式（SSE）和非流式两种模式。
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const client = getLLMClient();
  const model = options.model ?? DEFAULT_MODEL;
  const stream = options.stream ?? false;

  // 深度思考配置（模型特定）
  const extraParams: Record<string, unknown> = {};
  if (options.enableThinking !== undefined) {
    if (model.startsWith('Volc-DeepSeek')) {
      extraParams.thinking = { type: options.enableThinking ? 'enabled' : 'disabled' };
    } else if (model.startsWith('qwen')) {
      extraParams.enable_thinking = options.enableThinking;
    }
  }

  const completion = await client.chat.completions.create(
    {
      model,
      messages: options.messages,
      stream,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      ...extraParams,
    },
    {
      signal: options.signal,
    },
  );

  // 非流式：直接返回
  if (!stream) {
    const choice = (completion as OpenAI.Chat.Completions.ChatCompletion).choices[0];
    return choice.message?.content ?? '';
  }

  // 流式：逐 token 回调
  const streamIter = completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  let fullText = '';

  for await (const chunk of streamIter) {
    // 检查 usage（部分模型在最后 chunk 返回 token 统计）
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    const content = delta.content ?? '';
    const reasoning = (delta as Record<string, unknown>).reasoning_content as string | undefined;

    if (content) {
      fullText += content;
      options.onToken?.(content, reasoning);
    }
  }

  return fullText;
}
```

### 3.3 同步请求示例（Python 参考 → TS 实现）

Vivo 官方 Python 示例（来自 api.md）：

```python
# 使用 openai 库调用 Vivo API
import uuid
from openai import OpenAI

client = OpenAI(
    api_key=AppKey,
    base_url="https://api-ai.vivo.com.cn/v1",
)

response = client.chat.completions.create(
    model="Doubao-Seed-2.0-mini",
    messages=[{"role": "user", "content": "你好"}],
    temperature=0.7,
    max_tokens=1024,
    stream=False,
)
print(response.choices[0].message.content)
```

对应的 React Native TypeScript 实现见 3.2 节 `callLLM()`。

### 3.4 流式请求处理

Vivo 流式 SSE 格式（OpenAI 兼容）：

```
data: {"choices":[{"delta":{"content":"Hello"},"index":0}],...}
data: {"choices":[{"delta":{"content":"!"},"index":0}],...}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],...}
data: [DONE]
```

```typescript
// src/services/llm.stream.ts

/**
 * 手动解析 SSE 流（如果不使用 OpenAI SDK 的 stream 迭代器）
 *
 * 适用于需要更精细控制流式处理的场景。
 */
export async function* streamChatCompletions(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  signal?: AbortSignal,
): AsyncGenerator<{ text: string; reasoning?: string }> {
  const response = await fetch(
    `https://api-ai.vivo.com.cn/v1/chat/completions?request_id=${generateUUID()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${process.env.VIVO_APP_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal,
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API Error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') return;

      try {
        const chunk = JSON.parse(dataStr);
        const delta = chunk.choices?.[0]?.delta;
        if (delta) {
          yield {
            text: delta.content ?? '',
            reasoning: delta.reasoning_content,
          };
        }
      } catch {
        // 跳过无法解析的行
      }
    }
  }
}
```

---

## 4. 分场景接入方案

### 4.1 场景一：AI 助手对话（核心场景）

**涉及文件**：`src/screens/AssistantScreen.tsx`（需改造）

**当前状态**：模拟回复 `buildAssistantReply()`。

**改造步骤**：

```typescript
// 1. 创建 useChat Hook —— src/hooks/useChat.ts

import { useCallback, useRef, useState } from 'react';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';
import { ChatMessage } from '../types/chat';

export function useChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    userMessage: string,
    history: ChatMessage[],
    systemPrompt: string,
    onUpdate: (fullText: string, isDone: boolean) => void,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 构建消息列表：system + 历史对话（user/assistant 成对）+ 最新 user 消息
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    setIsStreaming(true);
    let fullText = '';

    try {
      await callLLM({
        model: DEFAULT_MODEL,
        messages,
        stream: true,
        onToken: (token) => {
          fullText += token;
          onUpdate(fullText, false);
        },
        signal: controller.signal,
      });

      onUpdate(fullText, true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      onUpdate(`[错误] ${err.message}`, true);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, isStreaming, cancel };
}
```

**改造 AssistantScreen**：

```typescript
// AssistantScreen.tsx 关键改动

import { useChat } from '../hooks/useChat';
import { ASSISTANT_SYSTEM_PROMPT } from '../services/prompts';

export default function AssistantScreen() {
  const { sendMessage, isStreaming, cancel } = useChat();
  const { chatMessages, addChatMessage } = useAppState();

  // 替换原来的 handleSend
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. 立即显示用户消息
    addChatMessage('user', trimmed);
    setInput('');

    // 2. 创建占位 AI 消息
    const aiMsgId = Date.now().toString();
    addChatMessage('assistant', '思考中...');

    // 3. 调用 Vivo LLM（流式）
    await sendMessage(
      trimmed,
      chatMessages,
      ASSISTANT_SYSTEM_PROMPT,
      (fullText, isDone) => {
        updateChatMessage(aiMsgId, fullText);
      },
    );
  };

  // ... JSX 中：
  // {isStreaming && <ActivityIndicator />}
  // <Pressable onPress={cancel}>停止</Pressable>
}
```

### 4.2 场景二：AI 导入解析

**涉及文件**：`src/screens/ImportScreen.tsx`

**功能**：用户粘贴链接或长文本 → AI 自动提取标题、标签、摘要。

```typescript
// src/services/prompts.ts

export const IMPORT_PARSE_PROMPT = `你是一个知识管理助手。用户会粘贴一段内容（文章链接、文本等）。

请返回 JSON 格式（不要包含其他文字）：
{
  "title": "简洁标题（≤20字）",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "100字以内的摘要"
}`;
```

**ImportScreen 改造要点**：

```typescript
import { callLLM } from '../services/llm';
import { PREMIUM_MODEL } from '../services/llm.config';
import { IMPORT_PARSE_PROMPT } from '../services/prompts';

const handleAIParse = async () => {
  if (!content.trim()) return;

  setIsParsing(true);
  try {
    const response = await callLLM({
      model: PREMIUM_MODEL,  // 使用高级模型处理结构化提取
      messages: [
        { role: 'system', content: IMPORT_PARSE_PROMPT },
        { role: 'user', content },
      ],
      stream: false,
      temperature: 0.3,  // 低温度，确保稳定输出
    });

    const parsed = JSON.parse(response);
    setTitle(parsed.title ?? title);
    setTags(parsed.tags?.join(', ') ?? tags);
    setContent(parsed.summary ?? content);
  } catch {
    // JSON 解析失败，保留原始内容
  } finally {
    setIsParsing(false);
  }
};
```

**UI 新增**：在 ImportScreen 的输入区域下方添加"AI 解析"按钮。

### 4.3 场景三：智能搜索

**涉及文件**：`src/screens/HomeScreen.tsx` / `src/screens/FilesScreen.tsx`

**功能**：用户输入自然语言查询 → AI 语义匹配笔记。

```typescript
const semanticSearch = async (query: string, notes: Note[]) => {
  const notesText = notes.map(n =>
    `[${n.id}] 标题:${n.title} 标签:${n.tags.join(',')} 内容:${n.content.slice(0, 200)}`
  ).join('\n---\n');

  const response = await callLLM({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: `根据用户的查询，从笔记列表中找出最相关的笔记。返回 JSON: { "ids": ["id1", "id2"], "reasoning": "匹配理由" }`,
      },
      { role: 'user', content: `查询: ${query}\n\n笔记列表:\n${notesText}` },
    ],
    stream: false,
    temperature: 0.2,
  });

  const { ids } = JSON.parse(response);
  return notes.filter(n => ids.includes(n.id));
};
```

### 4.4 场景四：笔记智能标签推荐

**触发时机**：用户在 NoteEditorModal 中输入标题/内容后。

```typescript
const suggestTags = async (title: string, snippet: string) => {
  const response = await callLLM({
    model: 'Doubao-Seed-2.0-lite',  // 轻量模型，快速响应
    messages: [
      {
        role: 'system',
        content: `根据笔记的标题和内容，推荐 3-5 个标签。返回 JSON: { "tags": ["标签1", ...] }。标签要求：简短（2-4字）、中文、具有分类价值。`,
      },
      { role: 'user', content: `标题: ${title}\n内容: ${snippet}` },
    ],
    stream: false,
    maxTokens: 100,
    temperature: 0.5,
  });

  const { tags } = JSON.parse(response);
  return tags as string[];
};
```

### 4.5 场景五：图片理解（多模态）

Vivo API 支持图片理解，可用于笔记中的图片内容识别。

```typescript
/**
 * 识别图片内容并生成笔记
 *
 * 支持两种图片传递方式：
 * 1. 在线 URL
 * 2. 本地图片 Base64 编码（格式：data:image/jpeg;base64,{base64_str}）
 */
async function analyzeImage(imageUrl: string, prompt: string): Promise<string> {
  return callLLM({
    model: 'Volc-DeepSeek-V3.2',  // 支持多模态的模型
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      } as any,  // OpenAI SDK 类型兼容
    ],
    stream: false,
    maxTokens: 2048,
    temperature: 0.3,
  });
}
```

### 4.6 场景六：拍照 OCR → 结构化笔记（端到端）

**涉及文件**：新增 `src/screens/CameraScreen.tsx`，改造 `src/services/ocr.ts`

**功能**：用户拍摄一张照片 → OCR 识别文字 → 大模型结构化提取 → 自动创建笔记。

#### 4.6.1 整体流程

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ 用户拍照  │ →  │ OCR 文字识别  │ →  │ LLM 结构化    │ →  │ 创建笔记  │
│ (Camera) │    │ (Vivo OCR /  │    │ 提取为 Note   │    │ 保存本地  │
│          │    │  LLM 多模态) │    │ 格式          │    │          │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

#### 4.6.2 方案选型

Vivo AIGC 平台提供两种识别路径，推荐组合使用：

| 方案 | API | 优势 | 劣势 |
|------|-----|------|------|
| **A: 通用 OCR** | `/ocr/general_recognition` | 识别精度高、速度快、结构化输出（含坐标） | 仅返回原始文字，不包含语义理解 |
| **B: LLM 多模态** | `/v1/chat/completions` + 图片 | 可直接理解内容并一步转为笔记格式 | 耗时较长，对纯文字 OCR 不如专用 OCR 精准 |

**推荐组合**：方案 A（OCR 提取原始文字）→ 方案 B（LLM 将原始文字结构化为笔记）。

#### 4.6.3 React Native 拍照集成

```bash
# 安装相机和图库选择依赖
npm install react-native-image-picker
# iOS 额外配置
cd ios && pod install && cd ..
```

```typescript
// src/services/camera.ts

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * 请求相机权限并拍照，返回 Base64 编码的图片
 */
export async function capturePhoto(): Promise<string | null> {
  // Android 权限请求
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: '相机权限',
        message: 'TidyMind 需要使用相机拍摄照片以识别文字',
        buttonPositive: '允许',
        buttonNegative: '拒绝',
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('需要相机权限', '请在设置中开启相机权限后重试。');
      return null;
    }
  }

  const result = await launchCamera({
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    saveToPhotos: false,
  });

  if (result.didCancel) return null;
  if (result.errorCode) {
    Alert.alert('拍照失败', result.errorMessage ?? '未知错误');
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset?.base64) {
    Alert.alert('图片数据为空', '请重试');
    return null;
  }

  return `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`;
}

/**
 * 从相册选择图片
 */
export async function pickFromGallery(): Promise<string | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
  });

  if (result.didCancel) return null;
  const asset = result.assets?.[0];
  if (!asset?.base64) return null;

  return `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`;
}
```

#### 4.6.4 Vivo 通用 OCR API 调用

```typescript
// src/services/ocr.ts

import { generateUUID } from './llm.config';

/**
 * 调用 Vivo 通用 OCR API 识别图片中的文字
 *
 * API: POST /ocr/general_recognition
 * 文档: api.md → 文档中心/接口文档/通用OCR
 */
export type OCRResult = {
  /** 完整识别文本 */
  fullText: string;
  /** 逐行识别结果 */
  lines: Array<{
    text: string;
    /** 置信度 0~1 */
    confidence: number;
  }>;
};

export async function recognizeText(base64Image: string): Promise<OCRResult> {
  const AppKey = process.env.VIVO_APP_KEY ?? '';
  const requestId = generateUUID();
  const DOMAIN = 'api-ai.vivo.com.cn';
  const URI = '/ocr/general_recognition';

  // 去掉 data:image/...;base64, 前缀，提取纯 Base64
  const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const formData = new URLSearchParams();
  formData.append('image', pureBase64);
  formData.append('pos', '2');
  formData.append('businessid', `aigc_${requestId}`);

  const response = await fetch(`https://${DOMAIN}${URI}?requestId=${requestId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AppKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OCR API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  // Vivo OCR 返回格式（示例）：
  // { code: 0, data: { text: "识别结果全文", items: [{ text: "行1", confidence: 0.98 }, ...] } }
  const items = data?.data?.items ?? [];
  const fullText = data?.data?.text ?? items.map((it: any) => it.text).join('\n');

  return {
    fullText,
    lines: items.map((it: any) => ({
      text: it.text ?? '',
      confidence: it.confidence ?? 0,
    })),
  };
}
```

#### 4.6.5 结构化提取为笔记格式

OCR 返回原始文字后，调用大模型将其转化为 TidyMind 笔记结构：

```typescript
// src/services/ocr.ts（续）

import { callLLM } from './llm';
import { DEFAULT_MODEL } from './llm.config';
import { Note } from '../types/note';

/** 将 OCR 原始文本结构化为笔记 */
export const OCR_TO_NOTE_PROMPT = `你是一个知识管理助手。用户提供了一段从图片中 OCR 识别出的文本。

请将其整理为结构化的笔记。返回 JSON（不要包含其他文字）：
{
  "title": "笔记标题（≤20字，从内容中提炼）",
  "content": "整理后的笔记正文（保留关键信息，去除 OCR 噪音，合理分段）",
  "tags": ["标签1", "标签2", "标签3"]
}

## 整理规则
- 标题要能概括图片内容的核心主题
- 去除无意义的 OCR 噪音（如页码、水印、杂乱字符）
- 保留原文中的数字、日期、人名、术语等关键信息
- 用 Markdown 格式组织内容（标题、列表、加粗等）
- 标签简短（2-4字），体现内容分类`;

export async function structureOCRToNote(ocrText: string): Promise<{
  title: string;
  content: string;
  tags: string[];
}> {
  const response = await callLLM({
    model: DEFAULT_MODEL,  // Doubao-Seed-2.0-mini，快速响应
    messages: [
      { role: 'system', content: OCR_TO_NOTE_PROMPT },
      { role: 'user', content: ocrText },
    ],
    stream: false,
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    const parsed = JSON.parse(response);
    return {
      title: parsed.title ?? '未命名笔记',
      content: parsed.content ?? ocrText,
      tags: parsed.tags ?? [],
    };
  } catch {
    // JSON 解析失败 → 降级：将原始 OCR 文本作为正文
    return {
      title: 'OCR 识别笔记',
      content: ocrText,
      tags: ['OCR'],
    };
  }
}
```

#### 4.6.6 完整拍照 → 创建笔记流程

```typescript
// src/hooks/usePhotoToNote.ts

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { capturePhoto, pickFromGallery } from '../services/camera';
import { recognizeText, structureOCRToNote } from '../services/ocr';
import { useAppState } from '../state/AppState';

export function usePhotoToNote(onSuccess?: () => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const { upsertNote } = useAppState();

  /**
   * 拍照 → OCR → 结构化 → 创建笔记
   *
   * @returns 创建的笔记 ID，失败则返回 null
   */
  const processPhoto = useCallback(async (): Promise<string | null> => {
    try {
      // 步骤 1：拍照
      setStatusText('正在启动相机...');
      setIsProcessing(true);

      const imageBase64 = await capturePhoto();
      if (!imageBase64) {
        setIsProcessing(false);
        return null; // 用户取消
      }

      // 步骤 2：OCR 识别
      setStatusText('正在识别文字...');
      const ocrResult = await recognizeText(imageBase64);

      if (!ocrResult.fullText.trim()) {
        Alert.alert('未识别到文字', '图片中未检测到可识别的文字内容，请重试。');
        setIsProcessing(false);
        return null;
      }

      // 步骤 3：LLM 结构化
      setStatusText('正在整理笔记格式...');
      const structured = await structureOCRToNote(ocrResult.fullText);

      // 步骤 4：创建笔记
      setStatusText('正在保存笔记...');
      const noteId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      upsertNote({
        id: noteId,
        title: structured.title,
        content: structured.content,
        tags: structured.tags,
      });

      setIsProcessing(false);
      setStatusText('');
      onSuccess?.();
      return noteId;
    } catch (err: any) {
      setIsProcessing(false);
      setStatusText('');
      Alert.alert('处理失败', err.message ?? '拍照识别过程中出现错误，请重试。');
      return null;
    }
  }, [upsertNote, onSuccess]);

  /**
   * 从相册选择 → OCR → 结构化 → 创建笔记
   */
  const processGallery = useCallback(async (): Promise<string | null> => {
    try {
      setStatusText('正在打开相册...');
      setIsProcessing(true);

      const imageBase64 = await pickFromGallery();
      if (!imageBase64) {
        setIsProcessing(false);
        return null;
      }

      setStatusText('正在识别文字...');
      const ocrResult = await recognizeText(imageBase64);

      if (!ocrResult.fullText.trim()) {
        Alert.alert('未识别到文字', '图片中未检测到可识别的文字内容。');
        setIsProcessing(false);
        return null;
      }

      setStatusText('正在整理笔记格式...');
      const structured = await structureOCRToNote(ocrResult.fullText);

      setStatusText('正在保存笔记...');
      upsertNote({
        title: structured.title,
        content: structured.content,
        tags: structured.tags,
      });

      setIsProcessing(false);
      setStatusText('');
      onSuccess?.();
      return null;
    } catch (err: any) {
      setIsProcessing(false);
      setStatusText('');
      Alert.alert('处理失败', err.message ?? '图片识别过程中出现错误，请重试。');
      return null;
    }
  }, [upsertNote, onSuccess]);

  return { processPhoto, processGallery, isProcessing, statusText };
}
```

#### 4.6.7 UI 集成 — 拍照按钮与进度指示

在 **FilesScreen** 或 **HomeScreen** 中添加快捷拍照入口：

```typescript
// FilesScreen.tsx 或 HomeScreen.tsx 新增

import { usePhotoToNote } from '../hooks/usePhotoToNote';
import { useRef } from 'react';
import { ActionSheetIOS, Platform, View, Text, ActivityIndicator } from 'react-native';

function PhotoNoteButton() {
  const { processPhoto, processGallery, isProcessing, statusText } =
    usePhotoToNote(() => {
      Alert.alert('笔记已创建', '拍照识别的内容已保存为笔记。');
    });

  // 弹出选择：拍照 / 相册
  const handlePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '拍照', '从相册选择'],
          cancelButtonIndex: 0,
        },
        index => {
          if (index === 1) processPhoto();
          else if (index === 2) processGallery();
        },
      );
    } else {
      Alert.alert('添加笔记', '', [
        { text: '取消', style: 'cancel' },
        { text: '拍照', onPress: processPhoto },
        { text: '从相册选择', onPress: processGallery },
      ]);
    }
  };

  return (
    <View>
      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : (
        <Pressable style={styles.cameraButton} onPress={handlePress}>
          <Text style={styles.cameraIcon}>📷</Text>
        </Pressable>
      )}
    </View>
  );
}
```

#### 4.6.8 流程状态机

```
初始状态 (📷 图标)
    │
    ▼ 用户点击
┌─────────────┐
│ 选择来源      │  ← ActionSheet: 拍照 / 相册 / 取消
└──────┬──────┘
       │
       ▼
┌─────────────┐   statusText: "正在启动相机..."
│ 拍摄/选择     │   或 "正在打开相册..."
└──────┬──────┘
       │ 成功获取 Base64
       ▼
┌─────────────┐   statusText: "正在识别文字..."
│ OCR 识别     │   Spinner 动画
└──────┬──────┘
       │ 提取到文字
       ▼
┌─────────────┐   statusText: "正在整理笔记格式..."
│ LLM 结构化   │   Spinner 动画
└──────┬──────┘
       │ 返回 title + content + tags
       ▼
┌─────────────┐   statusText: "正在保存笔记..."
│ 创建笔记     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 跳转笔记列表  │   Alert: "笔记已创建"
└─────────────┘
```

#### 4.6.9 新增文件清单

| 文件 | 职责 |
|------|------|
| `src/services/camera.ts` | 相机权限、拍照、相册选择封装 |
| `src/services/ocr.ts` | Vivo OCR API 调用 + LLM 结构化 |
| `src/hooks/usePhotoToNote.ts` | 完整拍照→笔记流程 Hook |
| `src/screens/CameraScreen.tsx` | (可选) 拍照预览界面 |

#### 4.6.10 安装新依赖

```bash
npm install react-native-image-picker
# iOS
cd ios && pod install && cd ..
```

> **注意**：`react-native-image-picker` 已加入 `package.json`，clone 后 `npm install` 自动安装。

---

### 4.7 场景七：笔记导出为 Markdown

**涉及文件**：`src/screens/ExportScreen.tsx`（改造）、新增 `src/services/exportMarkdown.ts`

**功能**：将选中的笔记导出为标准 Markdown 格式，支持预览、复制到剪贴板、分享到其他应用。

#### 4.7.1 Markdown 导出格式

每条笔记导出为以下格式：

```markdown
# 笔记标题

> 标签: tag1, tag2 | 更新于 2026-06-03

---

笔记正文内容...

支持多段落、Markdown 语法。
```

多篇笔记导出时用分隔线 `---` 隔开。

#### 4.7.2 核心实现

```typescript
// src/services/exportMarkdown.ts

import { Note } from '../types/note';

/**
 * 将单条笔记转换为 Markdown 字符串
 */
export function noteToMarkdown(note: Note): string {
  const tagLine = note.tags.length > 0
    ? `标签: ${note.tags.join(', ')} | `
    : '';

  const date = new Date(note.updatedAt);
  const dateStr = Number.isNaN(date.getTime())
    ? '未知'
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // 生成 YAML front matter（可选，便于 Obsidian/Notion 等工具导入）
  const frontMatter = [
    '---',
    `title: "${note.title}"`,
    `tags: [${note.tags.join(', ')}]`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    note.isFavorite ? 'favorite: true' : '',
    '---',
  ].filter(Boolean).join('\n');

  return [
    frontMatter,
    '',
    `# ${note.title}`,
    '',
    `> ${tagLine}更新于 ${dateStr}`,
    '',
    '---',
    '',
    note.content,
    '',
  ].join('\n');
}

/**
 * 将多篇笔记合并为一个 Markdown 文档
 */
export function notesToMarkdown(notes: Note[]): string {
  if (notes.length === 0) return '';

  if (notes.length === 1) {
    return noteToMarkdown(notes[0]);
  }

  // 多篇笔记：添加文档总标题和目录
  const header = [
    '# TidyMind 笔记导出',
    '',
    `> 导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `> 笔记数量: ${notes.length}`,
    '',
    '---',
    '',
    '## 目录',
    '',
    ...notes.map((n, i) => `${i + 1}. [${n.title}](#${slugify(n.title)})`),
    '',
    '---',
    '',
  ].join('\n');

  const body = notes
    .map((note, i) => [
      i > 0 ? '---' : '',
      noteToMarkdown(note).replace(/^---\n.*?\n---/s, ''), // 去掉单篇的 front matter（已在头部）
    ].filter(Boolean).join('\n\n'))
    .join('\n\n');

  return header + body;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 导出 Markdown 文本到系统剪贴板
 */
export async function copyToClipboard(markdown: string): Promise<boolean> {
  const { Clipboard } = require('react-native');
  Clipboard.setString(markdown);
  return true;
}

/**
 * 通过系统分享菜单分享 Markdown 文件
 */
export async function shareMarkdownFile(
  markdown: string,
  fileName = 'tidymind-export.md',
): Promise<void> {
  const { Share } = require('react-native');
  const RNFS = require('react-native-fs');

  // 写入临时文件
  const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(tempPath, markdown, 'utf8');

  // 打开系统分享
  await Share.share({
    title: '导出 TidyMind 笔记',
    message: markdown,
    url: `file://${tempPath}`,
  });
}
```

#### 4.7.3 改造 ExportScreen

```typescript
// ExportScreen.tsx 关键改动

import { noteToMarkdown, notesToMarkdown, copyToClipboard } from '../services/exportMarkdown';

export default function ExportScreen() {
  const { notes } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedNotes = notes.filter(n => selectedIds.includes(n.id));
  const preview = notesToMarkdown(selectedNotes);

  const handleExport = async () => {
    if (!selectedIds.length) {
      Alert.alert('未选择笔记', '请至少选择一篇笔记进行导出。');
      return;
    }

    try {
      await copyToClipboard(preview);
      Alert.alert('导出成功', `已复制 ${selectedIds.length} 篇笔记的 Markdown 到剪贴板。`);
    } catch {
      Alert.alert('导出失败', '复制到剪贴板时出错。');
    }
  };

  const handleShare = async () => {
    if (!selectedIds.length) {
      Alert.alert('未选择笔记', '请至少选择一篇笔记进行导出。');
      return;
    }
    await shareMarkdownFile(preview);
  };

  // ... JSX 新增：
  // 1. 预览区域（ScrollView 显示 Markdown 文本）
  // 2. 双按钮：复制到剪贴板 / 分享
}
```

#### 4.7.4 Markdown 内容增强（可选）

```typescript
/**
 * 增强 Markdown 输出：利用大模型优化笔记格式
 */
export async function enhanceMarkdownWithAI(note: Note): Promise<string> {
  const response = await callLLM({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: `你是一个 Markdown 排版专家。请将用户提供的笔记优化为格式精美的 Markdown。

## 优化规则
- 保留所有原始信息
- 添加合适的 Markdown 排版（标题层级、列表、加粗、引用等）
- 修正明显的中文错别字
- 返回纯 Markdown，不要加任何解释`,
      },
      {
        role: 'user',
        content: `标题: ${note.title}\n标签: ${note.tags.join(', ')}\n\n${note.content}`,
      },
    ],
    stream: false,
    temperature: 0.2,
  });
  return response;
}
```

---

## 5. 流式响应与用户体验

### 5.1 流式 Token 更新策略

```
用户发送消息
    │
    ▼
┌──────────────────┐   每收到 token 就更新 UI    ┌──────────────┐
│ Vivo AIGC API    │ ──────────────────────────► │ FlatList     │
│ (SSE 流)         │   onToken(textChunk)        │ 最后一条消息  │
│ stream: true     │                              │ 实时重渲染    │
└──────────────────┘                              └──────────────┘
```

### 5.2 性能优化

```typescript
// 使用 ref 防抖，避免每秒上百次 setState
const tokenBuffer = useRef('');
const updateTimer = useRef<ReturnType<typeof setTimeout>>();

onToken: (token) => {
  tokenBuffer.current += token;
  clearTimeout(updateTimer.current);
  updateTimer.current = setTimeout(() => {
    onUpdate(tokenBuffer.current, false);
  }, 50); // 每 50ms 刷新一次 UI
},
```

### 5.3 显示"AI 正在输入"动画

```typescript
{isStreaming && !fullText && (
  <View style={styles.typingIndicator}>
    <View style={styles.dot} />
    <View style={[styles.dot, styles.dot2]} />
    <View style={[styles.dot, styles.dot3]} />
  </View>
)}
```

### 5.4 显示思考过程（DeepSeek 模型）

`Volc-DeepSeek-V3.2` 开启深度思考后，流式响应中会包含 `reasoning_content` 字段：

```typescript
onToken: (content, reasoning) => {
  if (reasoning) {
    // 可单独显示思考过程（折叠面板）
    updateThinkingPanel(reasoning);
  }
  if (content) {
    fullText += content;
    onUpdate(fullText, false);
  }
},
```

---

### 4.8 场景八：AI 助手图片识别与生成

**涉及文件**：`src/screens/AssistantScreen.tsx`（改造）、`src/services/llm.ts`、`src/hooks/useChat.ts`

**功能**：
- **图片识别**：用户上传图片 → AI 多模态分析图片内容 → 返回文字描述/关键信息
- **图片生成**：用户输入文字描述 → LLM 优化为绘图 Prompt → 调用 Vivo 图片生成 API → 返回生成的图片

#### 4.8.1 图片识别流程

```
用户点击 📷 → ActionSheet(拍照/相册)
    │
    ▼
┌──────────────────┐
│ 图片 Base64       │  ← camera.ts
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 用户输入区显示    │  缩略图预览 (120×90) + ✕ 删除按钮
│ 图片附件          │
└──────┬───────────┘
       ▼ 用户点发送
┌──────────────────┐
│ callLLMWithImage  │  → Volc-DeepSeek-V3.2 多模态模型
│ llm.ts            │  → IMAGE_ANALYSIS_PROMPT
└──────┬───────────┘
       ▼
    AI 回复分析结果（图片类型 + 主要内容 + 关键信息）
```

#### 4.8.2 图片生成流程

```
用户输入: "帮我画一张图：夕阳下的海滩"
    │
    ▼
┌──────────────────┐
│ generateImage()   │  useChat.ts
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 步骤1: LLM 优化   │  → IMAGE_GENERATION_PROMPT
│ 生成绘图 Prompt   │  返回: "一幅写实风格的夕阳海滩，金色晚霞映照海面..."
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 步骤2: 图片生成   │  → POST /api/v1/image_generation
│ Vivo 图片生成 API │  返回: 图片 URL (Doubao-Seedream-4.5)
└──────┬───────────┘
       ▼
    AI 回复: "图片已生成\n\n绘图提示词: ...\n图片链接: https://..."
```

#### 4.8.3 关键代码

```typescript
// src/services/llm.ts — 多模态图片分析
export async function callLLMWithImage(
  userText: string,
  imageB64: string,
  systemPrompt: string,
): Promise<string> {
  const userContent: any[] = [
    { type: 'text', text: userText || '请分析这张图片' },
    { type: 'image_url', image_url: { url: imageB64 } },
  ];

  const completion = await client.chat.completions.create({
    model: 'Volc-DeepSeek-V3.2',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    stream: false,
    temperature: 0.5,
    max_tokens: 2048,
  });
  // ...
}
```

#### 4.8.4 快速入口

在 AI 助手空状态时，快捷提示区增加了两个带图标的按钮：

| 按钮 | 行为 |
|------|------|
| 📷 **识别图片** | 弹出拍照/相册选择器 → 选图后直接发送多模态分析请求 |
| 🎨 **生成图片** | 在输入框填入 "请帮我生成一张图片：" → 用户补充描述后发送 |

#### 4.8.5 UI 设计一致性

- 图片按钮背景 `Colors.inactive` (#b2b2b2) → 与 Tab 非活跃态同色
- 图片快捷入口 `Colors.active` (#262626) 深色胶囊 → 与活跃 Tab 同色
- 图片预览 `BorderRadius.md` (8px) → 与卡片圆角一致
- 删除按钮 `Colors.textPrimary` (#262626) 圆形 → 与整体暗色系一致
- 输入区附件提示文字 `Colors.textTertiary` (#b2b2b2) → 与占位符同色

#### 4.8.6 图片生成 API 细节

```
POST https://api-ai.vivo.com.cn/api/v1/image_generation
     ?module=aigc&request_id={uuid}&system_time={unix_timestamp}

Header: Authorization: Bearer {AppKey}
        Content-Type: application/json

Body (文生图):
{ "model": "Doubao-Seedream-4.5", "prompt": "...", "parameters": { "size": "2K" } }

Body (图生图):
{ "model": "Doubao-Seedream-4.5", "prompt": "...", "image": "https://...或base64" }

Response:
{
  "code": 0,
  "data": {
    "images": [{ "url": "https://...", "size": "2048x2048" }],
    "usage": { "image_count": 1, "output_tokens": 16384 }
  }
}
```

**限制**：初赛每天 10 次，总计 300 次。生成一张图片需 10-30 秒。

---

### 4.9 场景九：文本翻译

**涉及文件**：新增 `src/services/translate.ts`

**功能**：将文本翻译为中文/英文/日文/韩文。

#### 4.9.1 API 规格

```
POST https://api-ai.vivo.com.cn/translation/query/self?requestId={uuid}

{ "from": "en", "to": "zh-CHS", "text": "Hello", "app": "test", "requestId": "{uuid}" }

Response: { "code": 0, "data": { "translation": "你好" } }
```

支持语言：`zh-CHS`(中) `en`(英) `ja`(日) `ko`(韩)

#### 4.9.2 实现

```typescript
// src/services/translate.ts
export async function translateText(
  text: string, from: Language, to: Language
): Promise<string> {
  const response = await fetch(
    `https://api-ai.vivo.com.cn/translation/query/self?requestId=${requestId}`,
    { method: 'POST', headers: { Authorization: `Bearer ${appKey}` },
      body: JSON.stringify({ from, to, text: text.slice(0, 1200), app: 'test', requestId }) }
  );
  const data = await response.json();
  return data?.data?.translation ?? '';
}
```

**应用场景**：外文笔记翻译、AI 对话中即时翻译、多语言笔记管理。

---

### 4.10 AI 助手多模式系统

**涉及文件**：`src/screens/AssistantScreen.tsx`、`src/hooks/useChat.ts`、`src/services/prompts.ts`

AI 助手现在支持 **5 种工作模式**，通过顶部横向模式选择器一键切换：

| 模式 | 图标 | System Prompt | 快捷提示 |
|------|------|---------------|---------|
| 💬 **对话** | 通用知识助手 | 笔记总结、学习计划、知识问答 | 总结笔记、创建学习计划 |
| 🌐 **翻译** | 多语翻译 | 中英日韩互译 + 术语注释 | 翻译为英文/日文/韩文 |
| ✍️ **写作** | 写作指导 | 润色、改写、结构优化、语法检查 | 润色这段话、帮我写作文 |
| 📷 **识图** | 图片分析 | 多模态视觉理解 | 拍照/相册 |
| 🎨 **绘图** | AI 文生图 | Prompt 优化 + Doubao-Seedream-4.5 | 夕阳海滩、赛博城市 |

#### 4.10.1 模式切换流程

```
顶部模式栏: [💬对话] [🌐翻译] [✍️写作] [📷识图] [🎨绘图]
                                      ↑ 点击切换
                ┌─────────────────────┘
                ▼
┌──────────────────────────────┐
│ 模式横幅更新：图标 + 模式说明  │
│ 快捷提示切换为模式专属建议     │
│ System Prompt 切换            │
│ 输入框 placeholder 变化       │
└──────────────────────────────┘
```

#### 4.10.2 key 设计决策

- 模式切换时**不清空对话历史**——用户可以跨模式对话
- 每个模式有**独立的 System Prompt**——LLM 回复风格随模式变化
- 识图模式自动弹出拍照选择器；绘图模式自动填入提示前缀
- 模式信息通过 `mode` 参数传入 `sendMessage()`，选择对应 System Prompt

---

## 6. Prompt 工程

### 6.1 System Prompt 设计原则

| 原则 | 说明 |
|------|------|
| **角色定义** | 明确 AI 的身份和能力边界 |
| **输出格式** | 指定 JSON/Markdown/纯文本 |
| **上下文限制** | 告知 AI 当前应用的笔记数据格式 |
| **拒绝策略** | 超出范围的问题如何拒绝 |

### 6.2 核心 Prompt 模板

创建 `src/services/prompts.ts`：

```typescript
// src/services/prompts.ts

/** AI 助手默认 System Prompt */
export const ASSISTANT_SYSTEM_PROMPT = `你是 TidyMind 的 AI 学习助手。

## 你的能力
- 帮助用户总结笔记内容
- 制定学习计划和复习安排
- 提取笔记中的关键行动项
- 回答用户关于知识管理的问题
- 根据笔记内容推荐相关学习资源

## 你的限制
- 只基于用户提供的笔记内容回答问题
- 不编造不存在的信息
- 回答使用中文
- 保持简洁，每次回复控制在 300 字以内

## 当前上下文
用户有一组笔记，每条笔记包含：
- title: 标题
- content: 内容
- tags: 标签数组
- updatedAt: 最后更新时间`;

/** 导入解析 Prompt */
export const IMPORT_PARSE_PROMPT = `你是一个知识管理助手。用户会粘贴一段内容（文章链接、文本等）。

请返回 JSON 格式（不要包含其他文字）：
{
  "title": "简洁标题（≤20字）",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "100字以内的摘要"
}`;

/** 搜索 Prompt */
export const SEARCH_SYSTEM_PROMPT = `根据用户的自然语言查询，从笔记列表中找出最相关的笔记。

返回 JSON: { "ids": ["匹配的笔记ID列表"], "reasoning": "简短说明" }`;

/** 标签推荐 Prompt */
export const TAG_SUGGESTION_PROMPT = `根据笔记的标题和内容，推荐 3-5 个标签。

返回 JSON: { "tags": ["标签1", "标签2", ...] }
标签要求：简短（2-4字）、中文、具有分类价值`;
```

### 6.3 messages 格式要求

**⚠️ 重要**：Vivo API 要求 messages 中的 user 和 assistant 必须**成对出现**，最后以 user 消息结尾：

```json
{
  "messages": [
    { "role": "system", "content": "你是AI助手" },
    { "role": "user", "content": "你是谁？" },
    { "role": "assistant", "content": "你好，我是蓝心小V..." },
    { "role": "user", "content": "你会做什么？" }
  ]
}
```

### 6.4 上下文窗口管理

```typescript
/**
 * Token 估算（中文 ≈ 0.5 token/字，英文 ≈ 0.25 token/字）
 * Vivo 平台 max_completion_tokens 最大 65,536
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) ?? []).length;
  const others = text.length - chineseChars;
  return Math.ceil(chineseChars * 0.5 + others * 0.25);
}

function truncateHistory(
  messages: ChatMessage[],
  maxTokens: number,
): ChatMessage[] {
  let total = 0;
  const result: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i].content);
    if (total + tokens > maxTokens) break;
    total += tokens;
    result.unshift(messages[i]);
  }
  return result;
}
```

---

## 7. Function Calling 进阶

### 7.1 概述

Vivo API 支持 OpenAI 兼容的 Function Calling，允许模型调用预定义的工具函数。可用于：
- 让 AI 助手操作笔记（创建/删除/搜索）
- 获取外部信息（天气、日期等）
- 结构化输出

### 7.2 Tools 定义

```typescript
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_notes',
      description: '搜索用户的笔记，按关键词或语义匹配',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词或自然语言查询',
          },
          limit: {
            type: 'number',
            description: '返回结果数量，默认 5',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_note',
      description: '为用户创建一条新笔记',
      parameters: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: '笔记标题' },
          content: { type: 'string', description: '笔记内容' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '标签列表',
          },
        },
        required: ['title', 'content'],
      },
    },
  },
];
```

### 7.3 调用流程

```
用户消息 → LLM (with tools) → function_call 响应
                                    │
            ┌───────────────────────┘
            ▼
    执行 function（搜索笔记/创建笔记等）
            │
            ▼
    将 function 结果回传给 LLM → 最终回复用户
```

```typescript
async function chatWithTools(userMessage: string, history: ChatMessage[]) {
  const response = await callLLM({
    model: PREMIUM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_WITH_TOOLS },
      ...history,
      { role: 'user', content: userMessage },
    ],
    tools: TOOLS,
    stream: false,
  });

  // 检查是否有 function call
  const toolCalls = response.choices?.[0]?.message?.tool_calls;
  if (toolCalls) {
    for (const call of toolCalls) {
      const result = await executeToolCall(call.function.name, call.function.arguments);
      // 将结果追加到 messages 并再次调用 LLM
      messages.push({
        role: 'function',
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
    // 二次调用，让 LLM 基于 function 结果回答
    return callLLM({ model: PREMIUM_MODEL, messages, stream: false });
  }

  return response.choices?.[0]?.message?.content ?? '';
}
```

---

## 8. 可利用的全量 AI 能力

Vivo AIGC 平台为本竞赛提供了以下能力，均可为 TidyMind 扩展功能：

### 8.1 已集成 — 大模型（文本生成）

| 用途 | 状态 |
|------|------|
| AI 助手对话 | 第 4.1 节方案 |
| 导入内容解析 | 第 4.2 节方案 |
| 智能语义搜索 | 第 4.3 节方案 |
| 标签自动推荐 | 第 4.4 节方案 |
| 图片内容理解 | 第 4.5 节方案 |

### 8.2 可扩展 — 语音相关

| 能力 | 应用场景 |
|------|---------|
| **实时短语音识别** | 语音输入笔记、语音搜索 |
| **长语音听写** | 课堂/会议录音 → 笔记 |
| **长语音转写** | 视频/音频素材 → 文字笔记 |
| **方言自由说** | 方言用户语音输入 |
| **同声传译** | 外语内容 → 中文笔记 |
| **音频生成** | AI 朗读笔记内容 |
| **超拟人音色** | 自然语音播报学习内容 |
| **声音复制** | 个性化语音助手 |

### 8.3 可扩展 — 视觉相关

| 能力 | 应用场景 |
|------|---------|
| **通用 OCR** | 拍照识别书本/文档 → 笔记 |
| **图片生成** | 生成知识卡片配图 |
| **视频生成** | 生成学习总结短视频 |

### 8.4 可扩展 — 文本处理

| 能力 | 应用场景 |
|------|---------|
| **文本翻译** | 外文资料 → 中文笔记 |
| **文本向量** | 笔记语义检索（RAG） |
| **文本相似度** | 重复笔记检测 |
| **查询改写** | 搜索查询优化 |
| **地理编码(POI)** | 学习地点标记 |

### 8.5 推荐扩展路线

```
第一阶段（当前）     第二阶段              第三阶段
─────────────────   ─────────────────     ─────────────────
大模型对话           + 语音输入笔记        + OCR 拍照识别
导入解析             + TTS 朗读笔记        + 智能配图
智能搜索                                  + 语义向量检索(RAG)
标签推荐
```

---

## 9. 安全与错误处理

### 9.1 AppKey 安全

```
❌ 错误：AppKey 硬编码在代码中
❌ 错误：AppKey 提交到 Git
✅ 正确：放在 .env 文件中，.gitignore 忽略
✅ 正确：生产环境使用后端代理（不直接暴露 Key）
```

### 9.2 Vivo API 错误码

| HTTP Code | code | 错误信息 | 处理方式 |
|-----------|------|---------|---------|
| 401 | — | `missing required app_id...` | 检查 Authorization Header 格式 |
| 401 | — | `invalid api-key` | 检查 AppKey 是否正确 |
| 401 | — | `not having this ability...` | 联系平台开通对应能力 |
| 400 | 1001 | `param 'requestId' can't be empty` | 确保每个请求携带唯一 requestId |
| 200 | 1007 | `抱歉，xxx` | 触发内容审核，替换输入重试 |
| 403 | 30001 | `no model access permission` | 检查模型访问权限 |
| 429 | 30001 | `hit model rate limit` | 降低请求频率，增加间隔 |
| 429 | 2003 | `today usage limit` | 当日用量耗尽，次日重试 |

### 9.3 错误处理实现

```typescript
// src/services/llm.errors.ts

export class LLMError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export function parseLLMError(status: number, body: string): LLMError {
  try {
    const parsed = JSON.parse(body);
    if (status === 429) {
      return new LLMError('请求过于频繁，请稍后再试', status, 'rate_limit', true);
    }
    if (parsed.code === 1007) {
      return new LLMError('内容触发安全审核，请修改后重试', status, '1007', false);
    }
    if (parsed.code === 30001) {
      return new LLMError('模型访问受限或频率超限', status, '30001', true);
    }
    if (parsed.code === 2003) {
      return new LLMError('今日用量已用完，请明日再试', status, '2003', false);
    }
    return new LLMError(parsed.message ?? '未知错误', status);
  } catch {
    return new LLMError(`请求失败 (${status}): ${body}`, status);
  }
}
```

### 9.4 指数退避重试

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;

      // 仅限流错误（429）和权限临时错误（30001）可重试
      if (
        err instanceof LLMError &&
        err.retryable
      ) {
        const delay = baseDelay * Math.pow(2, i);  // 2s → 4s → 8s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}
```

### 9.5 内容安全

```typescript
const SENSITIVE_PATTERNS = [
  /身份证号|银行卡号|密码|手机号/,
];

function sanitizeOutput(text: string): string {
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, '***');
  }
  return text;
}
```

---

## 10. 测试与评估

### 10.1 单元测试

```typescript
// __tests__/services/llm.test.ts

describe('callLLM', () => {
  it('should call Vivo API with correct OpenAI format', async () => {
    // mock fetch, verify body shape matches OpenAI protocol
  });

  it('should handle streaming tokens correctly', async () => {
    // mock SSE stream with Vivo format chunks
  });

  it('should throw LLMError on 401 invalid api-key', async () => {
    // mock 401 response, expect LLMError
  });

  it('should retry on 429 rate limit', async () => {
    // mock 429 → success, verify retry count
  });
});
```

### 10.2 效果评估

| 维度 | 评估方法 |
|------|---------|
| 回复质量 | 人工抽样 50 条对话，评分 1-5 |
| 响应速度 | 记录首次 Token 时间（TTFT）和总耗时 |
| 流式流畅度 | 检查 Token 间隔是否 ≤ 100ms |
| 错误率 | 监控 4xx/5xx 比率，按错误码分类 |
| 日用量 | 记录 daily usage，接近限额时告警 |

---

## 11. 部署清单

### 11.1 开发阶段检查

- [ ] 在 Vivo AIGC 平台创建应用，获取 AppKey
- [ ] 创建 `.env` 文件，填入 AppKey
- [ ] 安装 `openai` npm 包
- [ ] 实现 `src/services/llm.config.ts`（AppKey、模型配置）
- [ ] 实现 `src/services/llm.ts`（OpenAI 兼容协议调用）
- [ ] 实现 `src/services/prompts.ts`（Prompt 模板）
- [ ] 实现 `src/hooks/useChat.ts`（流式聊天 Hook）
- [ ] 改造 `AssistantScreen.tsx`（接入真实 LLM）
- [ ] 改造 `ImportScreen.tsx`（AI 解析按钮）
- [ ] 添加流式 UI（打字指示器、思考过程展示）
- [ ] 添加错误处理 UI（重试按钮、错误提示）

### 11.2 上线前检查

- [ ] AppKey 移至后端代理（不直接暴露）
- [ ] 添加 requestId 唯一性保证
- [ ] 添加请求频率限制（防 QPS 超限）
- [ ] 添加内容审核（触发 code 1007 时提示用户）
- [ ] 添加日用量监控和告警
- [ ] 用户协议中说明 AI 功能
- [ ] 隐私政策中说明数据处理方式

### 11.3 后端代理（推荐）

```
用户设备 → 你的后端 (/api/chat) → Vivo AIGC API
                ↑
          持有 AppKey
          可做限流、日志、缓存、内容审核
```

```javascript
// server.js — Express 代理示例
const express = require('express');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const client = new OpenAI({
    apiKey: process.env.VIVO_APP_KEY,
    baseURL: 'https://api-ai.vivo.com.cn/v1',
  });

  const completion = await client.chat.completions.create({
    model: req.body.model ?? 'Doubao-Seed-2.0-mini',
    messages: req.body.messages,
    stream: req.body.stream ?? false,
    temperature: req.body.temperature ?? 0.7,
    max_tokens: req.body.max_tokens ?? 4096,
  });

  res.json(completion);
});

app.listen(3000);
```

---

## 附录

### A. Vivo API 关键参数速查

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | String | 是 | Volc-DeepSeek-V3.2 / Doubao-Seed-2.0-mini/lite/pro / qwen3.5-plus |
| `messages` | Array | 是 | system + user/assistant 成对 + 最后一条 user |
| `stream` | Bool | 否 | true=流式, false=非流式（默认） |
| `max_tokens` | Int | 否 | 回答最大长度，默认 4096 |
| `max_completion_tokens` | Int | 否 | 输出总长度（含思维链），最大 65,536 |
| `temperature` | Float | 否 | 0-2，默认 1 |
| `top_p` | Float | 否 | 默认 0.7 |
| `reasoning_effort` | String | 否 | minimal/low/medium/high（DeepSeek） |
| `thinking.type` | String | 否 | "enabled"/"disabled"（Doubao 系列） |
| `enable_thinking` | Bool | 否 | true/false（qwen3.5-plus） |
| `tools` | Array | 否 | Function Calling 工具定义 |
| `frequency_penalty` | Float | 否 | -2.0 ~ 2.0 |
| `presence_penalty` | Float | 否 | -2.0 ~ 2.0 |

### B. 请求头要求

```
Content-Type: application/json; charset=utf-8
Authorization: Bearer {AppKey}
```

查询参数（URL）：
```
?request_id={UUID}
```

### C. 官方 API 文档地址

- Vivo AIGC 平台：https://aigc.vivo.com.cn/#/platform
- 接口文档：平台内「文档中心」→「文本生成」→「大模型」

### D. 响应格式

**非流式**：
```json
{
  "choices": [{
    "finish_reason": "stop",
    "message": {
      "content": "回复内容",
      "reasoning_content": "思考过程（如有）",
      "role": "assistant"
    }
  }],
  "usage": {
    "completion_tokens": 242,
    "prompt_tokens": 55,
    "total_tokens": 297
  }
}
```

**流式（SSE）**：
```
data: {"choices":[{"delta":{"content":"你"},"index":0}],...}
data: {"choices":[{"delta":{"content":"好"},"index":0}],...}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],...}
data: [DONE]
```

---

> **下一步**：从第 4.1 节「AI 助手对话」开始，先使用非流式模式验证 AppKey 连通性，再切换到流式模式优化体验。建议优先选择 `Doubao-Seed-2.0-mini` 作为默认模型（响应快、延迟低）。