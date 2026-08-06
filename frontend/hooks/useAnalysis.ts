import { useQuery } from '@tanstack/react-query';

import {
  fetchCategoryAnalysis,
  fetchMyPlaceAnalysis,
  type AnalysisResult,
} from '@/src/api/analysisApi';

/**
 * 분석 탭용 react-query 훅입니다.
 *
 * 캘린더와 같은 이유로 queryKey를 `['transactions', ...]` 아래에 두어,
 * 거래 등록·수정·삭제 후 useTransactions의 invalidate가 분석 결과까지 갱신하게 합니다.
 *
 * 카테고리 분석과 장소 분석은 응답 모양이 같아서(AnalysisResult) 훅도 같은 값을 돌려줍니다.
 * 탭에서 선택한 모드에 따라 둘 중 하나만 `enabled`로 켜서, 보고 있지 않은 쪽은 요청하지 않습니다.
 */

const EMPTY_ANALYSIS: AnalysisResult = { totalAmount: 0, items: [] };

export const analysisKeys = {
  all: ['transactions', 'analysis'] as const,
  category: (year: number, month: number) => [...analysisKeys.all, 'category', year, month] as const,
  myPlace: (year: number, month: number) => [...analysisKeys.all, 'my-place', year, month] as const,
};

/** GET /api/v1/analysis/category — 그 달의 카테고리별 소비를 조회합니다. */
export function useCategoryAnalysis(year: number, month: number, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: analysisKeys.category(year, month),
    queryFn: () => fetchCategoryAnalysis(year, month),
    enabled,
  });

  return {
    analysis: data ?? EMPTY_ANALYSIS,
    // 요청을 켜지 않은 동안에는 로딩으로 보이지 않아야 합니다(react-query는 이때 pending 상태입니다).
    isLoading: enabled && isLoading,
    error,
    refetch,
  };
}

/** GET /api/v1/analysis/my-place — 그 달의 내 장소별 소비를 조회합니다. */
export function useMyPlaceAnalysis(year: number, month: number, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: analysisKeys.myPlace(year, month),
    queryFn: () => fetchMyPlaceAnalysis(year, month),
    enabled,
  });

  return {
    analysis: data ?? EMPTY_ANALYSIS,
    isLoading: enabled && isLoading,
    error,
    refetch,
  };
}
