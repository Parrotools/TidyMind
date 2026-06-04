/**
 * 内容安全审核服务
 *
 * 三层防护：
 * 1. 客户端关键词/模式过滤（即时，无网络）
 * 2. Vivo LLM API 内置审核（code 1007，已集成）
 * 3. 敏感输出脱敏（sanitizeOutput，已集成）
 */

export type ModerationResult = {
  passed: boolean;
  level: 'pass' | 'suspicious' | 'blocked';
  reason?: string;
};

// ── 客户端关键词/模式过滤 ─────────────────────────────────────────────────

/** 高危模式 — 直接拦截 */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(?:赌博|博彩|赌场|下注|盘口|赔率)/,
    reason: '包含赌博相关内容',
  },
  {
    pattern: /(?:色情|裸体|成人|av|porn)/i,
    reason: '包含色情相关内容',
  },
  {
    pattern: /(?:诈骗|套现|洗钱|刷单|返利骗局)/,
    reason: '包含诈骗相关内容',
  },
  {
    pattern: /(?:代孕|器官买卖|人体交易)/,
    reason: '包含违法交易内容',
  },
  {
    pattern: /(?:身份证号|银行卡号|密码)\s*[:：]\s*\d{6,}/,
    reason: '包含个人敏感信息',
  },
];

/** 疑似模式 — 警告但放行 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(?:自杀|自残|轻生|想死|不想活)/,
    reason: '内容可能涉及心理健康问题，已为您推荐心理援助热线：400-161-9995',
  },
  {
    pattern: /(?:暴力|恐怖|炸弹|枪支|武器制作)/,
    reason: '内容涉及暴力主题，请注意遵守社区规范',
  },
  {
    pattern: /(?:政治敏感|颠覆|煽动|分裂国家)/,
    reason: '内容涉及政治敏感话题',
  },
];

// ── 审核函数 ──────────────────────────────────────────────────────────────

/**
 * 审核文本内容
 *
 * @returns ModerationResult.passed = true 表示通过
 */
export function moderateText(text: string): ModerationResult {
  if (!text.trim()) {
    return { passed: true, level: 'pass' };
  }

  // 阶段 1：高危模式检查
  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(text)) {
      return {
        passed: false,
        level: 'blocked',
        reason: item.reason,
      };
    }
  }

  // 阶段 2：疑似模式检查
  for (const item of SUSPICIOUS_PATTERNS) {
    if (item.pattern.test(text)) {
      return {
        passed: true,
        level: 'suspicious',
        reason: item.reason,
      };
    }
  }

  return { passed: true, level: 'pass' };
}

/**
 * 对 AI 输出做安全脱敏
 */
export function sanitizeOutput(text: string): string {
  const patterns = [
    { pattern: /\b\d{17}[\dXx]\b/g, replacement: '***身份证号***' },
    { pattern: /\b\d{16,19}\b/g, replacement: '***银行卡号***' },
    { pattern: /\b1[3-9]\d{9}\b/g, replacement: '***手机号***' },
  ];

  let result = text;
  for (const p of patterns) {
    result = result.replace(p.pattern, p.replacement);
  }
  return result;
}
