/**
 * LLM 调用封装 — Vivo AIGC 平台
 *
 * 基于 OpenAI 兼容协议，支持流式/非流式、深度思考、图片理解。
 */

import OpenAI from 'openai';
import { getLLMClient, DEFAULT_MODEL, generateUUID } from './llm.config';
import { parseLLMError } from './llm.errors';

// ── 类型定义 ──────────────────────────────────────────────────────────────

export type LLMCallOptions = {
  /** 模型名称，默认 Doubao-Seed-2.0-mini */
  model?: string;
  /** 消息列表（system + user/assistant 成对 + 最后一条 user） */
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  /** 是否开启流式响应 */
  stream?: boolean;
  /** 流式 token 回调 */
  onToken?: (content: string, reasoning?: string) => void;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 温度 0-2，默认 0.7 */
  temperature?: number;
  /** 最大输出 token 数，默认 4096 */
  maxTokens?: number;
  /** 开启深度思考（Volc-DeepSeek / Doubao / qwen） */
  enableThinking?: boolean;
};

// ── 核心调用 ──────────────────────────────────────────────────────────────

/**
 * 统一 LLM 调用入口
 *
 * 基于 Vivo AIGC 平台的 OpenAI 兼容协议。
 * 支持流式（SSE）和非流式两种模式。
 *
 * @returns 非流式返回完整文本；流式返回完整文本但同时通过 onToken 回调
 */
// ── 多模态消息类型 ────────────────────────────────────────────────────────

export type MultimodalContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type MultimodalMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | MultimodalContent[];
};

// ── 核心调用 ──────────────────────────────────────────────────────────────

export async function callLLM(options: LLMCallOptions): Promise<string> {
  const client = getLLMClient();
  const model = options.model ?? DEFAULT_MODEL;
  const stream = options.stream ?? false;

  // 深度思考配置（模型特定）
  const extraParams: Record<string, unknown> = {};
  if (options.enableThinking !== undefined) {
    if (model.startsWith('Volc-DeepSeek')) {
      extraParams.thinking = { type: options.enableThinking ? 'enabled' : 'disabled' };
    } else if (model.startsWith('Doubao-Seed')) {
      extraParams.thinking = { type: options.enableThinking ? 'enabled' : 'disabled' };
    } else if (model.startsWith('qwen')) {
      extraParams.enable_thinking = options.enableThinking;
    }
  }

  let completion;
  try {
    completion = await client.chat.completions.create(
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
        query: { request_id: generateUUID() },
      },
    );
  } catch (err: unknown) {
    // OpenAI v4 SDK 抛出 APIError，包含 status 和 error 对象
    const apiErr = err as {
      status?: number;
      error?: { message?: string };
      message?: string;
    };
    if (apiErr.status) {
      const body = apiErr.error?.message ?? apiErr.message ?? '';
      throw parseLLMError(apiErr.status, body);
    }
    throw err;
  }

  // 非流式：直接返回完整结果
  if (!stream) {
    const resp = completion as OpenAI.Chat.Completions.ChatCompletion;
    const content = resp.choices?.[0]?.message?.content ?? '';
    return content;
  }

  // 流式：迭代 SSE chunks（React Native 不支持，保留供 Web 环境使用）
  const streamIter = completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  let fullText = '';

  for await (const chunk of streamIter) {
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    const content = delta.content ?? '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reasoning = (delta as any).reasoning_content as string | undefined;

    if (content) {
      fullText += content;
    }
    options.onToken?.(content, reasoning);
  }

  return fullText;
}

// ── 多模态调用 ────────────────────────────────────────────────────────────

/**
 * 发送含图片的多模态消息给 LLM
 *
 * 用于 AI 助手识别/分析用户上传的图片。
 * 使用 Volc-DeepSeek-V3.2 模型（支持视觉理解）。
 *
 * @param userText   用户附加的文字描述
 * @param imageB64   图片 Base64 Data URL
 * @param systemPrompt 系统提示词
 * @returns AI 的分析回复文本
 */
export async function callLLMWithImage(
  userText: string,
  imageB64: string,
  systemPrompt: string,
): Promise<string> {
  const client = getLLMClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userContent: any[] = [
    { type: 'text', text: userText || '请分析这张图片' },
    { type: 'image_url', image_url: { url: imageB64 } },
  ];

  const completion = await client.chat.completions.create(
    {
      model: 'Volc-DeepSeek-V3.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      stream: false,
      temperature: 0.5,
      max_tokens: 2048,
    },
    {
      query: { request_id: generateUUID() },
    },
  );

  return (completion as OpenAI.Chat.Completions.ChatCompletion).choices?.[0]
    ?.message?.content ?? '';
}