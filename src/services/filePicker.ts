/**
 * 文件选择器 — 支持图片、文档、任意文件
 *
 * 统一封装：拍照、相册、文档选择，返回 Base64 数据供 AI 分析。
 * 纯 JS 实现，无需原生模块。
 */

import { Platform, Alert } from 'react-native';
import { pick } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// btoa 在 React Native Hermes 运行时可用，补充类型声明
declare function btoa(data: string): string;

export type PickedFile = {
  name: string;
  mimeType: string;
  base64: string; // data:...;base64,... 格式
  /** 文本内容（TXT/MD 等纯文本文件直接读取，供 AI 分析） */
  text?: string;
  size: number;
};

// ── 拍照 ────────────────────────────────────────────────────────────

export async function pickFromCamera(): Promise<PickedFile | null> {
  const result = await launchCamera({
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.5,
    saveToPhotos: false,
  });

  if (result.didCancel || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    name: a.fileName ?? 'camera.jpg',
    mimeType: a.type ?? 'image/jpeg',
    base64: `data:${a.type ?? 'image/jpeg'};base64,${a.base64}`,
    size: a.fileSize ?? 0,
  };
}

// ── 相册 ────────────────────────────────────────────────────────────

export async function pickFromAlbum(): Promise<PickedFile | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.5,
  });

  if (result.didCancel || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    name: a.fileName ?? 'image.jpg',
    mimeType: a.type ?? 'image/jpeg',
    base64: `data:${a.type ?? 'image/jpeg'};base64,${a.base64}`,
    size: a.fileSize ?? 0,
  };
}

// ── 多图选择 ────────────────────────────────────────────────────────

/** 从相册一次选择多张图片 */
export async function pickMultipleImages(): Promise<PickedFile[]> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.5,
    selectionLimit: 0, // 0 = 不限数量
  });

  if (result.didCancel || !result.assets?.length) return [];

  return result.assets.map(a => ({
    name: a.fileName ?? 'image.jpg',
    mimeType: a.type ?? 'image/jpeg',
    base64: `data:${a.type ?? 'image/jpeg'};base64,${a.base64}`,
    size: a.fileSize ?? 0,
  }));
}

// ── 文档选择 ────────────────────────────────────────────────────────

/** 使用 fetch 读取文件 URI 并转为 Base64（纯 JS，无原生依赖） */
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function pickDocument(): Promise<PickedFile | null> {
  try {
    const [result] = await pick({
      allowMultiSelection: false,
    });

    if (!result) return null;

    const mimeType = result.type ?? 'application/octet-stream';
    const base64Content = await uriToBase64(result.uri);
    const base64 = `data:${mimeType};base64,${base64Content}`;

    // 纯文本文件额外读取文本内容
    let text: string | undefined;
    const name = (result.name ?? '').toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.csv') || name.endsWith('.json')) {
      try { text = await (await fetch(result.uri)).text(); } catch {}
    }

    return {
      name: result.name ?? 'document',
      mimeType,
      base64,
      text,
      size: result.size ?? 0,
    };
  } catch (err: any) {
    if (err?.code === 'DOCUMENT_PICKER_CANCELED') return null;
    Alert.alert('文件选择失败', err?.message ?? '请重试');
    return null;
  }
}

// ── 综合选择器 ──────────────────────────────────────────────────────

export async function pickFile(): Promise<PickedFile | null> {
  return new Promise(resolve => {
    if (Platform.OS === 'ios') {
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['取消', '拍照', '从相册选择', '选择多张图片', '选择文件'], cancelButtonIndex: 0 },
        async (idx: number) => {
          if (idx === 1) resolve(await pickFromCamera());
          else if (idx === 2) resolve(await pickFromAlbum());
          else if (idx === 3) {
            // 多图：返回第一张并附带全部图片信息
            const files = await pickMultipleImages();
            if (files.length > 0) {
              // 标记为多图模式
              (files[0] as any).__multi = files;
              resolve(files[0]);
            } else {
              resolve(null);
            }
          }
          else if (idx === 4) resolve(await pickDocument());
          else resolve(null);
        },
      );
    } else {
      Alert.alert('选择来源', '', [
        { text: '取消', style: 'cancel', onPress: () => resolve(null) },
        { text: '拍照', onPress: async () => resolve(await pickFromCamera()) },
        { text: '从相册选择', onPress: async () => resolve(await pickFromAlbum()) },
        { text: '选择多张图片', onPress: async () => {
          const files = await pickMultipleImages();
          if (files.length > 0) {
            (files[0] as any).__multi = files;
            resolve(files[0]);
          } else {
            resolve(null);
          }
        }},
        { text: '选择文件', onPress: async () => resolve(await pickDocument()) },
      ]);
    }
  });
}
