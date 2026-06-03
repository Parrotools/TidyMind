export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 图片附件 Base64 Data URL（用户消息可选） */
  imageBase64?: string;
  /** AI 生成的图片 Base64 URL（助手消息可选） */
  generatedImage?: string;
  createdAt: string;
};

