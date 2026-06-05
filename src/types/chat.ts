export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 单张图片附件 Base64 Data URL（向后兼容） */
  imageBase64?: string;
  /** 多张图片附件 Base64 Data URL 数组 */
  images?: string[];
  /** AI 生成的图片 Base64 URL（助手消息可选） */
  generatedImage?: string;
  createdAt: string;
};
