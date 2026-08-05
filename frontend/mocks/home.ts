// 홈 화면 API 응답 형태 기준 목업입니다.
// GET /api/v1/home/category-summary, GET /api/v1/home/recent-expenses는 명세가 확정돼서 그대로 맞췄고,
// "오늘 지출액"과 알림 뱃지 개수는 아직 API가 없어서 화면 확인용 임시 값만 둡니다.

export type CategorySummaryItem = {
  categoryId: number;
  categoryName: string;
  amount: number;
  percent: number;
};

// 이번 달 누적 기준 top 4 (서버가 이미 정렬·계산해서 줌)
const MOCK_CATEGORIES: CategorySummaryItem[] = [
  { categoryId: 1, categoryName: '식비', amount: 182000, percent: 46 },
  { categoryId: 4, categoryName: '쇼핑', amount: 98000, percent: 25 },
  { categoryId: 6, categoryName: '교통', amount: 58000, percent: 15 },
  { categoryId: 5, categoryName: '문화', amount: 56000, percent: 14 },
];

// GET /api/v1/home/category-summary
export function mockCategorySummaryResponse() {
  return {
    success: true as const,
    data: { categories: MOCK_CATEGORIES },
  };
}

export type NearbyExpensePlace = {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  amount: number;
};

// 강남역 부근(더미 페르소나 생활권) 고정 장소 몇 개. 실제로는 latitude/longitude/radius로 서버가 필터링해서 준다.
const MOCK_NEARBY_PLACES: NearbyExpensePlace[] = [
  { address: '서울 강남구 역삼동', latitude: 37.4986, longitude: 127.0264, name: '스타벅스 강남역점', amount: 21500 },
  { address: '서울 강남구 역삼동', latitude: 37.499, longitude: 127.0292, name: 'CU 강남대로점', amount: 14800 },
  { address: '서울 강남구 역삼동', latitude: 37.4965, longitude: 127.0268, name: '역전할머니맥주', amount: 42000 },
  { address: '서울 강남구 역삼동', latitude: 37.497, longitude: 127.0298, name: '올리브영 강남점', amount: 36500 },
];

// GET /api/v1/home/recent-expenses?latitude={}&longitude={}
export function mockRecentExpensesResponse() {
  return {
    success: true as const,
    data: {
      totalAmount: MOCK_NEARBY_PLACES.reduce((sum, place) => sum + place.amount, 0),
      placeList: MOCK_NEARBY_PLACES,
    },
  };
}

// TODO: "오늘 지출액" API 확정되면 교체
export const MOCK_TODAY_EXPENSE = 28500;
