/** 地点信息（来自 Vivo POI 搜索 API） */
export type NoteLocation = {
  name: string;       // 地点名称
  address: string;    // 地址
  city: string;       // 城市
  district: string;   // 区
  latlng: string;     // "lng,lat" (GCJ-02)
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  /** 关联的学习地点（可选） */
  location?: NoteLocation;
  /** 附件图片（Base64 Data URL 数组） */
  images?: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
};
