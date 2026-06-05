/**
 * 地理编码 (POI 搜索) 服务 — Vivo 地理编码 API
 *
 * API: GET /search/geo?keywords=...&city=...&requestId=...
 * 用途：为笔记关联学习地点（图书馆/教室/自习室等）
 */

import { generateUUID, LLM_API_CONFIG } from './llm.config';

// ── 类型 ──────────────────────────────────────────────────────────────────

export type POIResult = {
  name: string;
  address: string;
  province: string;
  city: string;
  district: string;
  /** 经纬度 (GCJ-02 坐标系): "lng,lat" */
  location: string;
  phone: string;
  distance: number;
};

export type GeoSearchResult = {
  total: number;
  pois: POIResult[];
  district: {
    name: string;
    level: number;
    centerPoint: string;
  };
};

// ── 搜索 ──────────────────────────────────────────────────────────────────

/**
 * 搜索地点
 *
 * @param keywords  搜索关键词（如 "图书馆"、"自习室"）
 * @param city      城市名称或行政区划编码（如 "深圳" 或 "440300"）
 * @param page      页码 1-20
 * @param pageSize  每页条数 1-15
 */
export async function searchPOI(
  keywords: string,
  city: string,
  page = 1,
  pageSize = 10,
): Promise<GeoSearchResult> {
  const appKey = LLM_API_CONFIG.appKey;
  const requestId = generateUUID();

  const params = new URLSearchParams({
    keywords,
    city,
    page_num: String(Math.max(1, Math.min(20, page))),
    page_size: String(Math.max(1, Math.min(15, pageSize))),
    requestId,
  });

  const response = await fetch(
    `https://api-ai.vivo.com.cn/search/geo?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appKey}`,
      },
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`POI Search Error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  return {
    total: data?.totalCount ?? data?.total ?? 0,
    pois: (data?.pois ?? []).map((p: Record<string, unknown>) => ({
      name: (p.name as string) ?? '',
      address: (p.address as string) ?? '',
      province: (p.province as string) ?? '',
      city: (p.city as string) ?? '',
      district: (p.district as string) ?? '',
      location: (p.location as string) ?? '',
      phone: (p.phone as string) ?? '',
      distance: (p.distance as number) ?? 0,
    })),
    district: data?.currentDistrict ?? { name: '', level: 0, centerPoint: '' },
  };
}

// ── 快捷方法 ──────────────────────────────────────────────────────────────

/** 学习场所常用搜索词 */
export const STUDY_PLACE_KEYWORDS = [
  '图书馆',
  '自习室',
  '咖啡厅',
  '书店',
  '大学',
  '书房',
];

/**
 * 搜索附近的学习场所
 */
export async function searchStudyPlaces(
  city: string,
): Promise<POIResult[]> {
  const results: POIResult[] = [];
  for (const kw of STUDY_PLACE_KEYWORDS.slice(0, 3)) {
    try {
      const r = await searchPOI(kw, city, 1, 3);
      results.push(...r.pois);
    } catch {
      // 某个关键词失败不中断整体搜索
    }
  }
  return results;
}
