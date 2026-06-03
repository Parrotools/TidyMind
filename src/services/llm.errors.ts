/**
 * LLM 错误处理 — Vivo AIGC 专属错误码
 *
 * 错误码来源: api.md
 */

// ── 错误类型 ──────────────────────────────────────────────────────────────

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

// ── 错误解析 ──────────────────────────────────────────────────────────────

/**
 * 解析 API 错误响应，返回结构化 LLMError
 */
export function parseLLMError(status: number, body: string): LLMError {
  // 401 — AppKey 无效或缺失
  if (status === 401) {
    return new LLMError(
      'AppKey 无效或未配置。请在 App.tsx 中调用 setLLMAppKey("你的真实AppKey")，\n' +
        'AppKey 获取地址: https://aigc.vivo.com.cn/#/platform',
      status,
      'unauthorized',
      false,
    );
  }

  try {
    const parsed = JSON.parse(body);

    // 429 — 限流
    if (status === 429) {
      return new LLMError(
        '请求过于频繁，请稍后再试',
        status,
        'rate_limit',
        true,
      );
    }

    // code 1007 — 内容审核拦截
    if (parsed.code === 1007) {
      return new LLMError(
        '内容触发安全审核，请修改后重试',
        status,
        '1007',
        false,
      );
    }

    // code 30001 — 权限/限流
    if (parsed.code === 30001) {
      const isRateLimit = parsed.message?.includes('rate limit');
      return new LLMError(
        isRateLimit ? '请求频率超限' : '模型访问受限或权限到期',
        status,
        '30001',
        isRateLimit,
      );
    }

    // code 2003 — 日用量耗尽
    if (parsed.code === 2003) {
      return new LLMError(
        '今日用量已用完，请明日再试',
        status,
        '2003',
        false,
      );
    }

    // code 1001 — 参数异常
    if (parsed.code === 1001) {
      return new LLMError(
        `参数错误: ${parsed.message ?? '请检查请求参数'}`,
        status,
        '1001',
        false,
      );
    }

    return new LLMError(parsed.message ?? '未知错误', status);
  } catch {
    return new LLMError(`请求失败 (${status}): ${body}`, status);
  }
}

// ── 重试逻辑 ──────────────────────────────────────────────────────────────

/**
 * 指数退避重试
 *
 * 仅对可重试错误（429 限流、30001 临时）进行重试。
 *
 * @param fn        要执行的函数
 * @param maxRetries 最大重试次数，默认 3
 * @param baseDelay  基础延迟 ms，默认 2000
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (i === maxRetries - 1) throw err;

      if (err instanceof LLMError && err.retryable) {
        // 指数退避: 2s → 4s → 8s
        const delay = baseDelay * Math.pow(2, i);
        await new Promise<void>(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}

// ── 安全过滤 ──────────────────────────────────────────────────────────────

const SENSITIVE_PATTERNS = [/身份证号|银行卡号|密码|手机号/];

/** 对 AI 输出做安全过滤 */
export function sanitizeOutput(text: string): string {
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, '***');
  }
  return text;
}