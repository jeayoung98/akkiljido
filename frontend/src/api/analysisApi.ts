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

// 실제 항목과 겹치지 않도록 음수를 씁니다(id는 항상 양수인 categoryId/placeId).
const OTHER_PLACE_ID = -1;
const OTHER_PLACE_LABEL = '기타';

/**
 * 화면 문구("등록한 장소 주변 소비만 묶고, 범위 밖 소비는 기타로 분류했어요")와 달리,
 * 서버가 범위 밖 소비를 "기타" 항목으로 내려주지 않을 때가 있습니다(items 합계가 totalAmount보다
 * 작음). 그 차이를 프론트에서 계산해 "기타" 항목으로 채워 넣어, 문구와 실제 화면이 어긋나지
 * 않게 합니다. 다른 항목들과 달리 비중과 상관없이 항상 맨 뒤에 둡니다("기타"는 관례상 마지막).
 */
function withOtherBucket(result: AnalysisResult): AnalysisResult {
  const itemizedAmount = result.items.reduce((sum, item) => sum + item.amount, 0);
  const otherAmount = result.totalAmount - itemizedAmount;

  if (otherAmount <= 0) return result;

  const otherPercent = result.totalAmount > 0 ? Math.round((otherAmount / result.totalAmount) * 100) : 0;

  return {
    ...result,
    items: [...result.items, { id: OTHER_PLACE_ID, name: OTHER_PLACE_LABEL, amount: otherAmount, percent: otherPercent }],
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
 * 등록한 장소 반경 밖의 소비는 서버가 `기타`로 묶어서 내려줘야 하지만, 그렇지 않고
 * items 합계가 totalAmount보다 작게 내려올 때가 있어 withOtherBucket으로 보정합니다.
 */
export async function fetchMyPlaceAnalysis(
  year: number,
  month: number,
): Promise<AnalysisResult> {
  const data = await apiRequest<RawAnalysisResponse>(
    `/api/v1/analysis/my-place?year=${year}&month=${month}`,
  );

  return withOtherBucket(toAnalysisResult(data));
}
