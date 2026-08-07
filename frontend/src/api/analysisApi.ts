import { apiRequest } from '@/src/api/apiClient';
import { toNumber } from '@/src/api/normalize';

/**
 * 분석 탭이 쓰는 조회 API 모듈입니다.
 *
 * 두 API 모두 `?year={year}&month={month}`를 받고, 그 달의 **소비**만 집계해서 돌려줍니다.
 * 응답 모양도 거의 같지만 배열 항목의 키가 서로 다릅니다.
 * - 카테고리 분석: `categoryId` / `categoryName`
 * - 내 장소 분석: `placeId` / `myPlaceName`
 *
 * 화면(PieChart·AnalysisLegend)은 `id`/`name`이라는 공통 이름만 알면 되도록 만들어져 있어서,
 * 여기서 각각을 `AnalysisItem`(id·name·amount·percent) 한 가지 모양으로 맞춰 내보냅니다.
 *
 * ⚠️ `percent`는 서버가 반올림해서 내려주므로 합이 정확히 100이 아닐 수 있습니다.
 * PieChart가 실제 합계로 다시 정규화하므로 화면에서 보정할 필요는 없습니다.
 */

/** 카테고리·장소 분석이 공통으로 쓰는 항목 한 개입니다. */
export type AnalysisItem = {
  /** 카테고리 분석은 categoryId, 장소 분석은 placeId입니다. */
  id: number;
  /** 카테고리 분석은 categoryName, 장소 분석은 myPlaceName입니다. */
  name: string;
  /** 그 항목의 소비 합계(양수) */
  amount: number;
  /** 0~100. 서버가 반올림한 값을 그대로 씁니다. */
  percent: number;
};

export type AnalysisResult = {
  /** 그 달의 총 소비입니다. 소비가 없으면 0입니다. */
  totalAmount: number;
  items: AnalysisItem[];
};

/* ------------------------------------------------------------------ */
/* 서버 응답 원본 타입 (이 파일 밖으로 나가지 않습니다)                    */
/* ------------------------------------------------------------------ */

type RawAnalysisItem = {
  categoryId?: number | string;
  categoryName?: string;
  placeId?: number | string;
  myPlaceName?: string;
  amount?: number | string;
  percent?: number | string;
};

type RawAnalysisResponse = {
  totalAmount?: number | string;
  /** 명세에서는 두 API 모두 `categories`입니다. */
  categories?: RawAnalysisItem[];
  /** 장소 분석이 다른 키로 바뀔 가능성에 대비해 함께 읽습니다. */
  myPlaceList?: RawAnalysisItem[];
  placeList?: RawAnalysisItem[];
};

/* ------------------------------------------------------------------ */
/* 변환 헬퍼                                                            */
/* ------------------------------------------------------------------ */

/**
 * 응답 항목을 공통 `AnalysisItem`으로 맞춥니다.
 * id·name은 카테고리 키를 먼저 보고, 없으면 장소 키를 봅니다.
 */
function toAnalysisItem(raw: RawAnalysisItem): AnalysisItem {
  return {
    id: toNumber(raw.categoryId ?? raw.placeId),
    name: raw.categoryName ?? raw.myPlaceName ?? '',
    amount: toNumber(raw.amount),
    percent: toNumber(raw.percent),
  };
}

function toAnalysisResult(data: RawAnalysisResponse | undefined): AnalysisResult {
  const rawItems = data?.categories ?? data?.myPlaceList ?? data?.placeList ?? [];

  return {
    totalAmount: toNumber(data?.totalAmount),
    // 비중이 큰 항목이 위로 오도록 정렬합니다(차트 색이 비중 순서와 맞아야 해서).
    items: rawItems.map(toAnalysisItem).sort((left, right) => right.amount - left.amount),
  };
}

/* ------------------------------------------------------------------ */
/* API 호출                                                             */
/* ------------------------------------------------------------------ */

/** GET /api/v1/analysis/category — 그 달의 카테고리별 소비를 가져옵니다. */
export async function fetchCategoryAnalysis(
  year: number,
  month: number,
): Promise<AnalysisResult> {
  const data = await apiRequest<RawAnalysisResponse>(
    `/api/v1/analysis/category?year=${year}&month=${month}`,
  );

  return toAnalysisResult(data);
}

/**
 * GET /api/v1/analysis/my-place — 그 달의 "내 장소"별 소비를 가져옵니다.
 * 등록한 장소 반경 밖의 소비는 서버가 `기타`로 묶어서 내려줍니다.
 */
export async function fetchMyPlaceAnalysis(
  year: number,
  month: number,
): Promise<AnalysisResult> {
  const data = await apiRequest<RawAnalysisResponse>(
    `/api/v1/analysis/my-place?year=${year}&month=${month}`,
  );

  return toAnalysisResult(data);
}
