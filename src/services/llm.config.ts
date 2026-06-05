/**
 * LLM 配置 — Vivo AIGC 平台
 *
 * 使用运行时配置对象（React Native 没有 process.env）。
 * 在 App 启动时调用 setLLMAppKey() 设置 AppKey。
 */

import OpenAI from 'openai';

// ── 运行时配置 ────────────────────────────────────────────────────────────

/** 可变的运行时配置（替换 process.env） */
export const LLM_API_CONFIG: {
  appKey: string;
  appId: string;
  baseUrl: string;
  model: string;
  premiumModel: string;
  imageModel: string;
} = {
  appKey: 'your_app_key_here',
  appId: '2026482448',
  baseUrl: 'https://api-ai.vivo.com.cn/v1',
  model: 'Doubao-Seed-2.0-mini',
  premiumModel: 'Volc-DeepSeek-V3.2',
  imageModel: 'Doubao-Seedream-4.5',
};

/** 设置 AppKey（App 启动时从 AsyncStorage 或 .env 文件中读取后调用） */
export function setLLMAppKey(key: string): void {
  LLM_API_CONFIG.appKey = key;
  resetLLMClient(); // 强制重建客户端以使用新 Key
}

/** 设置默认模型 */
export function setLLMModel(model: string): void {
  LLM_API_CONFIG.model = model;
}

// ── UUID 生成 ─────────────────────────────────────────────────────────────

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── 客户端 ────────────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (_client) return _client;

  _client = new OpenAI({
    apiKey: LLM_API_CONFIG.appKey,
    baseURL: LLM_API_CONFIG.baseUrl,
    defaultHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
  });

  return _client;
}

export function resetLLMClient(): void {
  _client = null;
}

// ── 模型别名 ──────────────────────────────────────────────────────────────

export const DEFAULT_MODEL = 'Doubao-Seed-2.0-mini';
export const PREMIUM_MODEL = 'Volc-DeepSeek-V3.2';