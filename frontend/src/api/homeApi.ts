import { apiRequest } from '@/src/api/apiClient';
import type { CategorySummaryItem, NearbyExpensePlace } from '@/mocks/home';

type CategorySummaryData = {
  categories: CategorySummaryItem[];
};

/** GET /api/v1/home/category-summary — 이번 달 누적 지출 카테고리별 Top N. limit 미전달 시 4개. */
export async function getCategorySummary(limit?: number): Promise<CategorySummaryData> {
  const query = new URLSearchParams();
  if (limit) query.set('limit', String(limit));

  return apiRequest<CategorySummaryData>(`/api/v1/home/category-summary?${query.toString()}`);
}

type RecentExpenseData = {
  totalAmount: number;
  placeList: NearbyExpensePlace[];
};

/** GET /api/v1/home/recent-expenses — 기준 좌표 반경 안 최근 7일 지출. radius 미전달 시 2000m. */
export async function getRecentExpenses(
  latitude: number,
  longitude: number,
  radius?: number
): Promise<RecentExpenseData> {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  if (radius) query.set('radius', String(radius));

  return apiRequest<RecentExpenseData>(`/api/v1/home/recent-expenses?${query.toString()}`);
}
