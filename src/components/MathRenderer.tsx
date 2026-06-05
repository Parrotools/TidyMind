/**
 * MathRenderer — LaTeX 公式渲染器
 *
 * 使用 katex.__parse() 将 LaTeX 解析为 AST，递归渲染为 React Native Text 组件。
 * 无需 WebView，零原生依赖。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import katex from 'katex';
import { Colors } from '../theme/designTokens';

// ── Unicode 映射 ─────────────────────────────────────────────────────

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰','1': '¹','2': '²','3': '³','4': '⁴','5': '⁵','6': '⁶','7': '⁷','8': '⁸','9': '⁹',
  '+': '⁺','-': '⁻','=': '⁼','(': '⁽',')': '⁾','i': 'ⁱ','n': 'ⁿ',
  'a': 'ᵃ','b': 'ᵇ','c': 'ᶜ','d': 'ᵈ','e': 'ᵉ','f': 'ᶠ','g': 'ᵍ','h': 'ʰ',
  'j': 'ʲ','k': 'ᵏ','l': 'ˡ','m': 'ᵐ','o': 'ᵒ','p': 'ᵖ','r': 'ʳ','s': 'ˢ',
  't': 'ᵗ','u': 'ᵘ','v': 'ᵛ','w': 'ʷ','x': 'ˣ','y': 'ʸ','z': 'ᶻ',
};
const SUBSCRIPTS: Record<string, string> = {
  '0': '₀','1': '₁','2': '₂','3': '₃','4': '₄','5': '₅','6': '₆','7': '₇','8': '₈','9': '₉',
  '+': '₊','-': '₋','=': '₌','(': '₍',')': '₎','a': 'ₐ','e': 'ₑ','h': 'ₕ',
  'i': 'ᵢ','j': 'ⱼ','k': 'ₖ','l': 'ₗ','m': 'ₘ','n': 'ₙ','o': 'ₒ','p': 'ₚ',
  'r': 'ᵣ','s': 'ₛ','t': 'ₜ','u': 'ᵤ','v': 'ᵥ','x': 'ₓ',
};

function toUnicodeSup(text: string): string {
  return [...text].map(c => SUPERSCRIPTS[c] ?? c).join('');
}
function toUnicodeSub(text: string): string {
  return [...text].map(c => SUBSCRIPTS[c] ?? c).join('');
}

// ── 渲染 ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.value) return extractText(node.value);
  if (node.body) {
    if (Array.isArray(node.body)) return node.body.map(extractText).join('');
    return extractText(node.body);
  }
  return '';
}

/** 递归渲染 AST 节点 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RenderNode({ node, inline }: { node: any; inline: boolean }) {
  if (!node) return null;

  const type = node.type;
  const fontSize = inline ? 15 : 17;

  // ── 原子节点（文本/符号） ────────────────────────────────────────
  if (type === 'textord' || type === 'mathord') {
    return <Text style={{ fontSize, fontStyle: 'italic' }}>{node.text ?? node.value ?? ''}</Text>;
  }
  if (type === 'text') {
    return <Text style={{ fontSize }}>{node.text ?? ''}</Text>;
  }
  if (type === 'punct') {
    return <Text style={{ fontSize }}>{node.value ?? node.text ?? ''}</Text>;
  }
  if (type === 'spacing') {
    return <Text> </Text>;
  }

  // ── 上标/下标 ──────────────────────────────────────────────────
  if (type === 'supsub') {
    const smallSize = fontSize * 0.7;
    return (
      <Text>
        {node.base && <RenderNode node={node.base} inline={inline} />}
        {node.sub && (
          <Text style={{ fontSize: smallSize }}>
            {toUnicodeSub(extractText(node.sub))}
          </Text>
        )}
        {node.sup && (
          <Text style={{ fontSize: smallSize }}>
            {toUnicodeSup(extractText(node.sup))}
          </Text>
        )}
      </Text>
    );
  }

  // ── 分数 ───────────────────────────────────────────────────────
  if (type === 'genfrac') {
    return (
      <Text style={[
        inline ? {} : { fontSize: fontSize * 1.2 },
      ]}>
        <Text style={{ fontSize: fontSize * 0.75 }}>
          {node.numer && <RenderNode node={node.numer} inline={inline} />}
        </Text>
        <Text style={{ fontSize }}> ⁄ </Text>
        <Text style={{ fontSize: fontSize * 0.75 }}>
          {node.denom && <RenderNode node={node.denom} inline={inline} />}
        </Text>
      </Text>
    );
  }

  // ── 根号 ───────────────────────────────────────────────────────
  if (type === 'sqrt') {
    return (
      <Text style={{ fontSize }}>
        √
        <Text style={{ borderTopWidth: 1, borderTopColor: Colors.textPrimary, marginLeft: 1 }}>
          {node.body && <RenderNode node={node.body} inline={inline} />}
        </Text>
      </Text>
    );
  }

  // ── 上标（帽子等） ─────────────────────────────────────────────
  if (type === 'accent') {
    const accentChars: Record<string, string> = {
      'ˆ': '̂', '˜': '̃', 'ˉ': '̄', '˘': '̆', '˙': '̇',
      '¨': '̈', '⃗': '', '→': '',
    };
    const label = node.label ? extractText(node.label) : '';
    const accent = accentChars[label] ?? label;
    return (
      <Text style={{ fontSize }}>
        {accent && <Text style={{ fontSize: fontSize * 0.6, lineHeight: 0 }}>{accent}</Text>}
        {node.base && <RenderNode node={node.base} inline={inline} />}
        {!accent && label && <Text style={{ fontSize: fontSize * 0.6 }}>{label}</Text>}
      </Text>
    );
  }

  // ── 函数名（sin, cos, lim …）────────────────────────────────────
  if (type === 'operatorname') {
    return (
      <Text style={{ fontSize, fontFamily: 'serif' }}>
        {node.text ?? extractText(node.body) ?? ''}
      </Text>
    );
  }

  // ── 括号组 ─────────────────────────────────────────────────────
  if (type === 'leftright' || type === 'left' || type === 'right') {
    return (
      <Text style={{ fontSize }}>
        {node.leftDelim && <Text>{node.leftDelim}</Text>}
        {node.body && <RenderNode node={node.body} inline={inline} />}
        {node.rightDelim && <Text>{node.rightDelim}</Text>}
      </Text>
    );
  }

  // ── 颜色 ───────────────────────────────────────────────────────
  if (type === 'color') {
    return (
      <Text style={{ color: node.color ?? Colors.textPrimary }}>
        {node.body && <RenderNode node={node.body} inline={inline} />}
      </Text>
    );
  }

  // ── 字体 ───────────────────────────────────────────────────────
  if (type === 'font') {
    return (
      <Text style={{ fontSize, fontFamily: 'serif' }}>
        {node.body && <RenderNode node={node.body} inline={inline} />}
      </Text>
    );
  }

  // ── 样式（display/text/script） ────────────────────────────────
  if (type === 'styling') {
    return (
      <Text>
        {node.body && <RenderNode node={node.body} inline={inline} />}
      </Text>
    );
  }

  // ── 普通组 / 数组 ──────────────────────────────────────────────
  if (type === 'ordgroup' || type === 'array' || type === 'group') {
    if (!node.body) return null;
    const children = Array.isArray(node.body) ? node.body : [node.body];
    return (
      <Text>
        {children.map((child: any, i: number) => (
          <RenderNode key={i} node={child} inline={inline} />
        ))}
      </Text>
    );
  }

  // ── 回退 ───────────────────────────────────────────────────────
  return <Text style={{ fontSize }}>{extractText(node)}</Text>;
}

// ── 主组件 ────────────────────────────────────────────────────────────

type Props = {
  latex: string;
  displayMode?: boolean;
};

export default function MathRenderer({ latex, displayMode }: Props) {
  let ast: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast = (katex as any).__parse(latex, { displayMode: !!displayMode });
  } catch {
    // 解析失败时原样显示 LaTeX
    return (
      <Text style={[styles.fallback, displayMode ? styles.displayFallback : null]}>
        {displayMode ? `$${latex}$` : `$${latex}$`}
      </Text>
    );
  }

  const children = Array.isArray(ast) ? ast : [ast];

  if (displayMode) {
    return (
      <View style={styles.displayWrap}>
        <Text style={styles.displayMath}>
          {children.map((child: any, i: number) => (
            <RenderNode key={i} node={child} inline={false} />
          ))}
        </Text>
      </View>
    );
  }

  return (
    <Text style={styles.inlineMath}>
      {children.map((child: any, i: number) => (
        <RenderNode key={i} node={child} inline />
      ))}
    </Text>
  );
}

// ── 样式 ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  inlineMath: {
    fontStyle: 'italic',
    color: Colors.textPrimary,
  },
  displayWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 8,
  },
  displayMath: {
    fontSize: 18,
    fontStyle: 'italic',
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  fallback: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#e03131',
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    paddingHorizontal: 3,
  },
  displayFallback: {
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
