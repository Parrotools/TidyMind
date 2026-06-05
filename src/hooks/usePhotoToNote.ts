/**
 * 拍照 → OCR → 结构化 → 创建笔记 Hook
 *
 * 完整流程：
 * 1. 打开相机拍照（或从相册选择）
 * 2. 调用 Vivo OCR API 识别文字
 * 3. 调用 LLM 将文字结构化为笔记格式
 * 4. 保存到本地笔记库
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { capturePhoto, pickFromGallery } from '../services/camera';
import { recognizeText, structureOCRToNote } from '../services/ocr';
import { useAppState } from '../state/AppState';

export type ProcessingStatus = 'idle' | 'capturing' | 'recognizing' | 'structuring' | 'saving';

const STATUS_TEXT: Record<ProcessingStatus, string> = {
  idle: '',
  capturing: '正在打开相机...',
  recognizing: '正在识别文字...',
  structuring: '正在整理笔记格式...',
  saving: '正在保存笔记...',
};

export function usePhotoToNote(onSuccess?: (noteId: string) => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const { upsertNote } = useAppState();

  const statusText = STATUS_TEXT[status];

  /** 拍照 → 笔记 */
  const processPhoto = useCallback(async (): Promise<string | null> => {
    try {
      setStatus('capturing');
      setIsProcessing(true);

      const imageBase64 = await capturePhoto();
      if (!imageBase64) {
        setIsProcessing(false);
        setStatus('idle');
        return null;
      }

      setStatus('recognizing');
      const ocrResult = await recognizeText(imageBase64);

      if (!ocrResult.fullText.trim()) {
        Alert.alert('未识别到文字', '图片中未检测到可识别的文字内容，请重试。');
        setIsProcessing(false);
        setStatus('idle');
        return null;
      }

      setStatus('structuring');
      const structured = await structureOCRToNote(ocrResult.fullText);

      setStatus('saving');
      const noteId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      upsertNote({
        id: noteId,
        title: structured.title,
        content: structured.content,
        tag: structured.tag || 'OCR',
      });

      setIsProcessing(false);
      setStatus('idle');
      onSuccess?.(noteId);
      return noteId;
    } catch (err: unknown) {
      setIsProcessing(false);
      setStatus('idle');
      Alert.alert(
        '处理失败',
        (err as Error).message ?? '拍照识别过程中出现错误，请重试。',
      );
      return null;
    }
  }, [upsertNote, onSuccess]);

  /** 相册选择 → 笔记 */
  const processGallery = useCallback(async (): Promise<string | null> => {
    try {
      setStatus('capturing');
      setIsProcessing(true);

      const imageBase64 = await pickFromGallery();
      if (!imageBase64) {
        setIsProcessing(false);
        setStatus('idle');
        return null;
      }

      setStatus('recognizing');
      const ocrResult = await recognizeText(imageBase64);

      if (!ocrResult.fullText.trim()) {
        Alert.alert('未识别到文字', '图片中未检测到可识别的文字内容。');
        setIsProcessing(false);
        setStatus('idle');
        return null;
      }

      setStatus('structuring');
      const structured = await structureOCRToNote(ocrResult.fullText);

      setStatus('saving');
      upsertNote({
        title: structured.title,
        content: structured.content,
        tag: structured.tag || 'OCR',
      });

      setIsProcessing(false);
      setStatus('idle');
      onSuccess?.('');
      return null;
    } catch (err: unknown) {
      setIsProcessing(false);
      setStatus('idle');
      Alert.alert(
        '处理失败',
        (err as Error).message ?? '图片识别过程中出现错误，请重试。',
      );
      return null;
    }
  }, [upsertNote, onSuccess]);

  return {
    processPhoto,
    processGallery,
    isProcessing,
    status,
    statusText,
  };
}