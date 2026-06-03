/**
 * SSE 流解析器（备用，用于调试）
 *
 * 一般情况下使用 openai SDK 自带流式迭代器（见 llm.ts）。
 * 此模块仅在需要手动构造 HTTP 请求进行调试时使用。
 *
 * NOTE: React Native 的 fetch 对 ReadableStream 支持有限。
 * 生产环境请使用 callLLM() 的 stream 模式（基于 OpenAI SDK）。
 */

// 保留导出类型供其他模块引用
export type StreamToken = {
  text: string;
  reasoning?: string;
};