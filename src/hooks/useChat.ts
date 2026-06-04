/**
 * AI 聊天 Hook — 流式对话
 *
 * 封装完整的 LLM 聊天流程：
 * 1. 发送用户消息
 * 2. 流式接收 AI 回复
 * 3. 支持取消
 * 4. 错误处理
 */

import { useCallback, useRef, useState } from 'react';
import { callLLM, callLLMWithImage } from '../services/llm';
import { DEFAULT_MODEL, LLM_API_CONFIG, generateUUID } from '../services/llm.config';
import {
  AI_MODES,
  IMAGE_ANALYSIS_PROMPT,
  IMAGE_GENERATION_PROMPT,
  AIMode,
} from '../services/prompts';
import { sanitizeOutput } from '../services/llm.errors';
import { ChatMessage } from '../types/chat';

export type StreamingState = {
  isStreaming: boolean;
  /** 当前流式累积的完整文本 */
  streamingText: string;
};

export function useChat() {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingText: '',
  });
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 发送消息并获取 AI 流式回复
   *
   * @param userMessage 用户输入
   * @param history     完整对话历史
   * @param onUpdate    每次收到新数据时回调
   * @returns 完整回复文本
   */
  const sendMessage = useCallback(
    async (
      userMessage: string,
      history: ChatMessage[],
      onUpdate: (fullText: string, isDone: boolean) => void,
      mode: AIMode = 'chat',
    ): Promise<string> => {
      // 预检查：AppKey 是否已配置
      if (
        !LLM_API_CONFIG.appKey ||
        LLM_API_CONFIG.appKey === 'your_app_key_here'
      ) {
        const errMsg =
          '[错误] 请先配置 AppKey：在 App.tsx 中将 setLLMAppKey("your_app_key_here") 替换为真实 AppKey。获取地址: https://aigc.vivo.com.cn/#/platform';
        onUpdate(errMsg, true);
        return errMsg;
      }

      // 取消上一次请求
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // 构建消息列表（system + user/assistant 成对 + 最新 user）
      const modePrompt = AI_MODES.find(m => m.key === mode)?.prompt ?? AI_MODES[0].prompt;
      const messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }> = [
        { role: 'system', content: modePrompt },
        ...history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      setStreamingState({ isStreaming: true, streamingText: '' });
      let fullText = '';

      try {
        // React Native fetch 不支持 SSE 流式，使用非流式模式
        const response = await callLLM({
          model: DEFAULT_MODEL,
          messages,
          stream: false,
          signal: controller.signal,
        });

        fullText = response;

        const sanitized = sanitizeOutput(fullText);
        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(sanitized, true);
        return sanitized;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          setStreamingState({ isStreaming: false, streamingText: '' });
          return fullText;
        }

        const errorMsg = `[错误] ${(err as Error).message}`;
        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(errorMsg, true);
        return errorMsg;
      }
    },
    [],
  );

  /**
   * 发送图片给 AI 分析
   *
   * @param userText   用户附加的文字（可选）
   * @param imageB64   图片 Base64
   * @param onUpdate   回调
   */
  const sendImageMessage = useCallback(
    async (
      userText: string,
      imageB64: string,
      onUpdate: (fullText: string, isDone: boolean) => void,
    ): Promise<string> => {
      if (
        !LLM_API_CONFIG.appKey ||
        LLM_API_CONFIG.appKey === 'your_app_key_here'
      ) {
        const errMsg =
          '[错误] 请先配置 AppKey：在 App.tsx 中替换为真实 AppKey。';
        onUpdate(errMsg, true);
        return errMsg;
      }

      setStreamingState({ isStreaming: true, streamingText: '' });

      try {
        const response = await callLLMWithImage(
          userText || '请分析这张图片的内容，提取其中的关键信息。',
          imageB64,
          IMAGE_ANALYSIS_PROMPT,
        );

        const sanitized = sanitizeOutput(response);
        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(sanitized, true);
        return sanitized;
      } catch (err: unknown) {
        const errorMsg = `[错误] ${(err as Error).message}`;
        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(errorMsg, true);
        return errorMsg;
      }
    },
    [],
  );

  /**
   * 文生图：根据文字描述生成图片
   *
   * 先由 LLM 将用户需求转化为绘图 Prompt，
   * 再调用 Vivo 图片生成 API。
   */
  const generateImage = useCallback(
    async (
      userText: string,
      onUpdate: (fullText: string, isDone: boolean) => void,
    ): Promise<string> => {
      if (
        !LLM_API_CONFIG.appKey ||
        LLM_API_CONFIG.appKey === 'your_app_key_here'
      ) {
        const errMsg = '[错误] 请先配置 AppKey。';
        onUpdate(errMsg, true);
        return errMsg;
      }

      setStreamingState({ isStreaming: true, streamingText: '' });

      try {
        // 步骤 1：LLM 将用户描述转化为高质量绘图 Prompt
        const promptResponse = await callLLM({
          model: DEFAULT_MODEL,
          messages: [
            { role: 'system', content: IMAGE_GENERATION_PROMPT },
            { role: 'user', content: userText },
          ],
          stream: false,
          temperature: 0.7,
          maxTokens: 500,
        });

        // 步骤 2：调用 Vivo 图片生成 API
        const generatedImage = await callImageGeneration(promptResponse);

        const result = generatedImage
          ? `[🎨 图片已生成]\n\n绘图提示词: ${promptResponse}\n\n图片已保存到笔记中。`
          : `[🎨 绘图 Prompt]\n\n${promptResponse}\n\n(图片生成 API 待接入)`;

        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(result, true);
        return generatedImage ?? promptResponse;
      } catch (err: unknown) {
        const errorMsg = `[错误] ${(err as Error).message}`;
        setStreamingState({ isStreaming: false, streamingText: '' });
        onUpdate(errorMsg, true);
        return errorMsg;
      }
    },
    [],
  );

  /** 取消正在进行的请求 */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    ...streamingState,
    sendMessage,
    sendImageMessage,
    generateImage,
    cancel,
  };
}

// ── 图片生成 API ──────────────────────────────────────────────────────────

/**
 * 调用 Vivo 图片生成 API
 *
 * API: POST /api/v1/image_generation
 * 模型: Doubao-Seedream-4.5
 * 耗时: 10-30秒/张
 * 限制: 10次/天, 300次总计
 *
 * 返回生成的图片 URL（非 Base64）
 */
async function callImageGeneration(prompt: string): Promise<string | null> {
  try {
    const appKey = LLM_API_CONFIG.appKey;
    const requestId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await fetch(
      `https://api-ai.vivo.com.cn/api/v1/image_generation?module=aigc&request_id=${requestId}&system_time=${timestamp}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appKey}`,
        },
        body: JSON.stringify({
          model: 'Doubao-Seedream-4.5',
          prompt,
          parameters: { size: '2K' },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`图片生成失败 ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`图片生成失败 [${data.code}]: ${data.message}`);
    }

    // 返回第一张图片的 URL
    const imageUrl = data?.data?.images?.[0]?.url ?? data?.data?.image;
    return imageUrl ?? null;
  } catch {
    return null;
  }
}