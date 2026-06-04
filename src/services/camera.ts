/**
 * 相机/相册封装
 *
 * 使用 react-native-image-picker 实现拍照和相册选择。
 * 返回 Base64 编码的图片数据，可直接传给 OCR / LLM API。
 */

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// ── 权限 ──────────────────────────────────────────────────────────────────

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

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
    return false;
  }

  return true;
}

// ── 拍照 ──────────────────────────────────────────────────────────────────

/**
 * 打开相机拍照，返回 Base64 编码的图片 Data URL
 *
 * @returns data:image/jpeg;base64,... 或 null（用户取消/失败）
 */
export async function capturePhoto(): Promise<string | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

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

// ── 相册选择 ──────────────────────────────────────────────────────────────

/**
 * 从相册选择图片，返回 Base64 编码的图片 Data URL
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

  if (result.errorCode) {
    Alert.alert('选择失败', result.errorMessage ?? '未知错误');
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset?.base64) return null;

  return `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`;
}